/**
 * Media Storage Service — Medida's Family (Milestone 3D)
 *
 * Encapsulates all cloud media operations:
 * - Deterministic family-scoped object paths
 * - File validation (MIME, extensions, sizes)
 * - Path traversal prevention & filename sanitization
 * - Private Supabase Storage uploads & deletions
 * - Short-lived signed URL generation with client-side caching & pre-expiration refresh
 * - Offline media binary queueing via IndexedDB and reconnect drain
 * - Media consistency diagnostics
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { indexedDBManager } from '../store/local/indexedDBManager.js';

export const PHOTO_BUCKET = 'family-photos';
export const DOCUMENT_BUCKET = 'family-documents';

export const MAX_PHOTO_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export const ALLOWED_PHOTO_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]);

export const ALLOWED_DOCUMENT_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_PHOTO_EXTENSIONS = Object.freeze(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif']);
export const ALLOWED_DOCUMENT_EXTENSIONS = Object.freeze(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

// In-memory Signed URL Cache
// Map<string, { url: string, expiresAt: number }>
const signedUrlCache = new Map();
const SIGNED_URL_DEFAULT_TTL_SEC = 3600; // 1 hour
const SIGNED_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes safety margin

class MediaStorageService {
  constructor() {
    this.urlCache = signedUrlCache;
  }

  // ── Filename & Path Sanitization ───────────────────────────

  /**
   * Sanitizes a filename to prevent directory traversal and injection.
   * Strips .., /, \, null bytes, and non-safe characters.
   * @param {string} filename
   * @returns {string}
   */
  sanitizeFileName(filename) {
    if (!filename || typeof filename !== 'string') {
      return `file_${Date.now()}.bin`;
    }

    // Strip path traversal sequences and separators
    // eslint-disable-next-line no-control-regex
    let clean = filename
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '')
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      .trim();

    // Extract extension
    const lastDot = clean.lastIndexOf('.');
    let base = lastDot !== -1 ? clean.slice(0, lastDot) : clean;
    let ext = lastDot !== -1 ? clean.slice(lastDot).toLowerCase() : '';

    // Sanitize base: allow alphanumeric, underscore, hyphen, dot
    base = base.replace(/[^a-zA-Z0-9_\-.]/g, '_').slice(0, 100);
    ext = ext.replace(/[^a-zA-Z0-9.]/g, '');

    if (!base) base = `media_${Date.now()}`;
    return `${base}${ext}`;
  }

  /**
   * Constructs deterministic family-scoped storage path for photos:
   * family/{familyId}/photos/{mediaId}/{sanitizedFilename}
   */
  getPhotoStoragePath(familyId, mediaId, filename) {
    if (!familyId || !mediaId) {
      throw new Error('familyId and mediaId are required to construct photo storage path.');
    }
    const cleanName = this.sanitizeFileName(filename);
    return `family/${familyId}/photos/${mediaId}/${cleanName}`;
  }

  /**
   * Constructs deterministic family-scoped storage path for documents:
   * family/{familyId}/documents/{documentId}/{sanitizedFilename}
   */
  getDocumentStoragePath(familyId, documentId, filename) {
    if (!familyId || !documentId) {
      throw new Error('familyId and documentId are required to construct document storage path.');
    }
    const cleanName = this.sanitizeFileName(filename);
    return `family/${familyId}/documents/${documentId}/${cleanName}`;
  }

  // ── Validation ─────────────────────────────────────────────

  /**
   * Validates media file MIME type, extension, and size limit.
   */
  validateFile(file, type = 'photo') {
    if (!file) {
      return { valid: false, error: 'No file provided.' };
    }

    const isPhoto = type === 'photo';
    const maxSize = isPhoto ? MAX_PHOTO_SIZE_BYTES : MAX_DOCUMENT_SIZE_BYTES;
    const allowedMimes = isPhoto ? ALLOWED_PHOTO_MIME_TYPES : ALLOWED_DOCUMENT_MIME_TYPES;
    const allowedExts = isPhoto ? ALLOWED_PHOTO_EXTENSIONS : ALLOWED_DOCUMENT_EXTENSIONS;

    if (file.size > maxSize) {
      const mbLimit = Math.round(maxSize / (1024 * 1024));
      return {
        valid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${mbLimit}MB.`,
      };
    }

    let mime = (file.type || '').toLowerCase();
    const fileName = file.name || '';
    const lastDot = fileName.lastIndexOf('.');
    const ext = lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : '';

    if (!mime && isPhoto) {
      if (ext === '.heic') mime = 'image/heic';
      else if (ext === '.heif') mime = 'image/heif';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.png') mime = 'image/png';
      else if (ext === '.webp') mime = 'image/webp';
    }

    if (!allowedMimes.includes(mime)) {
      return {
        valid: false,
        error: `Unsupported file format (${mime || 'unknown'}). Supported formats: ${allowedExts.join(', ').toUpperCase()}.`,
      };
    }

    if (!allowedExts.includes(ext)) {
      return {
        valid: false,
        error: `Invalid file extension (${ext}). Expected one of: ${allowedExts.join(', ')}.`,
      };
    }

    return {
      valid: true,
      mimeType: mime,
      fileSize: file.size,
      sanitizedName: this.sanitizeFileName(fileName),
    };
  }

  // ── Signed URL Caching & Retrieval ─────────────────────────

  /**
   * Generates or returns cached signed URL with pre-expiration refresh.
   */
  async getSignedUrl(bucket, storagePath, expiresIn = SIGNED_URL_DEFAULT_TTL_SEC) {
    if (!storagePath) return null;

    const cacheKey = `${bucket}:${storagePath}`;
    const cached = this.urlCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt - SIGNED_URL_REFRESH_MARGIN_MS) {
      return cached.url;
    }

    if (!isSupabaseConfigured || !supabase) return null;

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresIn);

      if (error || !data?.signedUrl) {
        console.warn(`Failed to create signed URL for ${storagePath}:`, error?.message);
        return null;
      }

      this.urlCache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt: Date.now() + expiresIn * 1000,
      });

      return data.signedUrl;
    } catch (err) {
      console.warn('Error fetching signed URL:', err.message);
      return null;
    }
  }

  /**
   * Resolves media URL: checks for storage_path signed URL first,
   * falls back to local data URL / external URL.
   */
  async resolveMediaUrl(bucket, storagePath, fallbackSrc = '') {
    if (storagePath && isSupabaseConfigured) {
      const signed = await this.getSignedUrl(bucket, storagePath);
      if (signed) return signed;
    }
    return fallbackSrc || '';
  }

  // ── Upload Operations ──────────────────────────────────────

  /**
   * Uploads a photo to private cloud storage or enqueues offline.
   */
  async uploadPhoto({
    familyId,
    personId,
    file,
    title = '',
    caption = '',
    date = '',
    location = '',
    isPrimary = false,
    onProgress,
  }) {
    const validation = this.validateFile(file, 'photo');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const mediaId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const storagePath = this.getPhotoStoragePath(familyId, mediaId, validation.sanitizedName);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Build metadata payload
    const metadata = {
      id: mediaId,
      familyId,
      family_id: familyId,
      personId,
      person_id: personId,
      title: title.trim() || validation.sanitizedName.replace(/\.[^/.]+$/, ''),
      caption: caption.trim(),
      date: date.trim(),
      location: location.trim(),
      isPrimary: Boolean(isPrimary),
      is_primary: Boolean(isPrimary),
      storagePath,
      storage_path: storagePath,
      mimeType: validation.mimeType,
      mime_type: validation.mimeType,
      fileSize: validation.fileSize,
      file_size: validation.fileSize,
      src: '',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isOnline && isSupabaseConfigured && supabase) {
      onProgress?.({ state: 'uploading', percent: 30 });

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(storagePath, file, {
          contentType: validation.mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.warn('Direct photo upload failed, enqueuing offline:', uploadError.message);
        return this._queueOfflineUpload({
          id: mediaId,
          familyId,
          personId,
          entityType: 'photo',
          file,
          storagePath,
          metadata,
        });
      }

      onProgress?.({ state: 'processing', percent: 90 });

      // Pre-warm signed URL cache
      const signedUrl = await this.getSignedUrl(PHOTO_BUCKET, storagePath);
      metadata.src = signedUrl || '';

      onProgress?.({ state: 'complete', percent: 100 });
      return { success: true, metadata, storagePath, isOffline: false };
    }

    // Offline mode: store locally in IndexedDB pending upload queue
    return this._queueOfflineUpload({
      id: mediaId,
      familyId,
      personId,
      entityType: 'photo',
      file,
      storagePath,
      metadata,
    });
  }

  /**
   * Uploads a document to private cloud storage or enqueues offline.
   */
  async uploadDocument({
    familyId,
    personId,
    file,
    name = '',
    type = 'Official Record',
    date = '',
    description = '',
    onProgress,
  }) {
    const validation = this.validateFile(file, 'document');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const storagePath = this.getDocumentStoragePath(familyId, documentId, validation.sanitizedName);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const metadata = {
      id: documentId,
      familyId,
      family_id: familyId,
      personId,
      person_id: personId,
      name: name.trim() || validation.sanitizedName.replace(/\.[^/.]+$/, ''),
      type: type || 'Official Record',
      docType: type || 'Official Record',
      date: date.trim(),
      description: description.trim(),
      storagePath,
      storage_path: storagePath,
      mimeType: validation.mimeType,
      mime_type: validation.mimeType,
      fileSize: validation.fileSize,
      file_size: validation.fileSize,
      src: '',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isOnline && isSupabaseConfigured && supabase) {
      onProgress?.({ state: 'uploading', percent: 30 });

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, file, {
          contentType: validation.mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.warn('Direct document upload failed, enqueuing offline:', uploadError.message);
        return this._queueOfflineUpload({
          id: documentId,
          familyId,
          personId,
          entityType: 'document',
          file,
          storagePath,
          metadata,
        });
      }

      onProgress?.({ state: 'complete', percent: 100 });
      return { success: true, metadata, storagePath, isOffline: false };
    }

    // Offline mode
    return this._queueOfflineUpload({
      id: documentId,
      familyId,
      personId,
      entityType: 'document',
      file,
      storagePath,
      metadata,
    });
  }

  // ── Offline Binary Queueing Helper ─────────────────────────

  async _queueOfflineUpload({ id, familyId, personId, entityType, file, storagePath, metadata }) {
    let localPreviewUrl = '';

    // Create a local preview data URL for images
    if (file && file.type?.startsWith('image/')) {
      try {
        localPreviewUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch {
        localPreviewUrl = '';
      }
    }

    metadata.src = localPreviewUrl;
    metadata._offlinePending = true;

    try {
      await indexedDBManager.enqueueUpload({
        id,
        familyId,
        personId,
        entityType,
        storagePath,
        fileBlob: file,
        fileName: file.name,
        fileType: file.type,
        metadata,
        status: 'pending',
        attemptCount: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to store binary file in IndexedDB:', err);
    }

    return {
      success: true,
      metadata,
      storagePath,
      isOffline: true,
      message: "Saved locally — will upload when you're online.",
    };
  }

  // ── Deletion Operations ────────────────────────────────────

  async deletePhoto({ storagePath }) {
    if (!storagePath) return;

    // Clear from URL cache
    this.urlCache.delete(`${PHOTO_BUCKET}:${storagePath}`);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
        if (error) {
          console.warn('Failed to delete cloud photo binary:', error.message);
        }
      } catch (err) {
        console.warn('Exception deleting photo from storage:', err.message);
      }
    }
  }

  async deleteDocument({ storagePath }) {
    if (!storagePath) return;

    // Clear from URL cache
    this.urlCache.delete(`${DOCUMENT_BUCKET}:${storagePath}`);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
        if (error) {
          console.warn('Failed to delete cloud document binary:', error.message);
        }
      } catch (err) {
        console.warn('Exception deleting document from storage:', err.message);
      }
    }
  }

  // ── Reconnect Drain (Process Pending Uploads) ───────────────

  async processPendingUploads(familyId, onCompleteItem) {
    if (!isSupabaseConfigured || !supabase) return;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) return;

    try {
      const pending = await indexedDBManager.getPendingUploads(familyId);
      if (!pending || pending.length === 0) return;

      for (const item of pending) {
        const bucket = item.entityType === 'photo' ? PHOTO_BUCKET : DOCUMENT_BUCKET;

        try {
          const { error } = await supabase.storage
            .from(bucket)
            .upload(item.storagePath, item.fileBlob, {
              contentType: item.fileType,
              upsert: true,
            });

          if (!error) {
            // Upload successful: dequeue from pending uploads
            await indexedDBManager.dequeueUpload(item.id);

            // Update metadata record in store
            if (onCompleteItem) {
              onCompleteItem(item);
            }
          } else {
            await indexedDBManager.updateUpload(item.id, {
              attemptCount: (item.attemptCount || 0) + 1,
              status: 'failed',
              error: error.message,
            });
          }
        } catch (opErr) {
          console.warn(`Error processing pending upload ${item.id}:`, opErr.message);
        }
      }
    } catch (err) {
      console.warn('Error in processPendingUploads:', err.message);
    }
  }

  // ── Consistency Diagnostics ────────────────────────────────

  async diagnoseMediaConsistency(familyId, localEntities = []) {
    const report = {
      familyId,
      checkedCount: localEntities.length,
      validCount: 0,
      missingPathCount: 0,
      timestamp: new Date().toISOString(),
    };

    localEntities.forEach((item) => {
      const path = item.storage_path || item.storagePath;
      if (path && path.startsWith(`family/${familyId}/`)) {
        report.validCount++;
      } else {
        report.missingPathCount++;
      }
    });

    return report;
  }

  // ── Convenience URL & Replacement Helpers ───────────────────

  async getPhotoUrl(storagePath, expiresIn = SIGNED_URL_DEFAULT_TTL_SEC) {
    return this.getSignedUrl(PHOTO_BUCKET, storagePath, expiresIn);
  }

  async getDocumentUrl(storagePath, expiresIn = SIGNED_URL_DEFAULT_TTL_SEC) {
    return this.getSignedUrl(DOCUMENT_BUCKET, storagePath, expiresIn);
  }

  async replacePhoto({ oldStoragePath, ...uploadParams }) {
    // 1. Upload new photo first to ensure no broken profile state
    const result = await this.uploadPhoto(uploadParams);
    // 2. If new upload succeeded and old storage path exists, clean up old file
    if (result?.success && oldStoragePath && oldStoragePath !== result.storagePath) {
      await this.deletePhoto({ storagePath: oldStoragePath }).catch((err) => {
        console.warn('Non-fatal: failed to remove replaced photo binary:', err);
      });
    }
    return result;
  }

  async replaceDocument({ oldStoragePath, ...uploadParams }) {
    const result = await this.uploadDocument(uploadParams);
    if (result?.success && oldStoragePath && oldStoragePath !== result.storagePath) {
      await this.deleteDocument({ storagePath: oldStoragePath }).catch((err) => {
        console.warn('Non-fatal: failed to remove replaced document binary:', err);
      });
    }
    return result;
  }
}

export const mediaStorageService = new MediaStorageService();
export default mediaStorageService;

export const uploadPhoto = (params) => mediaStorageService.uploadPhoto(params);
export const replacePhoto = (params) => mediaStorageService.replacePhoto(params);
export const deletePhoto = (params) => mediaStorageService.deletePhoto(params);
export const getPhotoUrl = (path, expires) => mediaStorageService.getPhotoUrl(path, expires);
export const uploadDocument = (params) => mediaStorageService.uploadDocument(params);
export const replaceDocument = (params) => mediaStorageService.replaceDocument(params);
export const deleteDocument = (params) => mediaStorageService.deleteDocument(params);
export const getDocumentUrl = (path, expires) => mediaStorageService.getDocumentUrl(path, expires);

