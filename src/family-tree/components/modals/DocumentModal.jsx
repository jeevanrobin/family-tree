/**
 * DocumentModal Component — Modern Family Platform (Milestone 3D)
 * Add and record historical documents, certificates, and artifacts.
 * Supports secure private cloud upload (PDF, JPEG, PNG, WEBP), file validation,
 * upload progress, and offline queueing.
 */

import React, { useState, useRef } from 'react';
import { mediaStorageService } from '../../media/mediaStorageService.js';
import { useFamily } from '../../auth/FamilyContext.jsx';

const DOC_TYPES = [
  'Birth Certificate',
  'Marriage Certificate',
  'Death Certificate',
  'Educational Diploma',
  'Land Deed & Ledger',
  'Historical Letter',
  'Newspaper Clipping',
  'National / Civic Award',
  'Technical Journal',
  'Other Document',
];

export default function DocumentModal({
  isOpen,
  person,
  document = null,
  onClose,
  onSaveDocument,
}) {
  const [name, setName] = useState(document?.name || '');
  const [type, setType] = useState(document?.type || 'Birth Certificate');
  const [date, setDate] = useState(document?.date || '');
  const [description, setDescription] = useState(document?.description || '');
  const [src, setSrc] = useState(document?.src || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ state: 'idle', percent: 0 });
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  // Safe family context consumption
  let familyId = 'local-family';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const familyCtx = useFamily();
    if (familyCtx?.activeFamily?.id) {
      familyId = familyCtx.activeFamily.id;
    }
  } catch {
    familyId = 'local-family';
  }

  if (!isOpen || !person) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    // Validate file
    const validation = mediaStorageService.validateFile(file, 'document');
    if (!validation.valid) {
      setErrorMsg(validation.error);
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type || 'Document',
    });

    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Document title is required.');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ state: 'uploading', percent: 20 });

    try {
      if (selectedFile) {
        // Upload via media storage service
        const uploadResult = await mediaStorageService.uploadDocument({
          familyId,
          personId: person.id,
          file: selectedFile,
          name: name.trim(),
          type,
          date: date.trim(),
          description: description.trim(),
          onProgress: (p) => setUploadProgress(p),
        });

        onSaveDocument({
          ...uploadResult.metadata,
          id: document?.id || uploadResult.metadata.id,
          personId: person.id,
        });
      } else {
        // URL/metadata edit
        onSaveDocument({
          id: document?.id,
          personId: person.id,
          name: name.trim(),
          type,
          docType: type,
          date: date.trim(),
          description: description.trim(),
          src: src.trim(),
          storagePath: document?.storagePath || document?.storage_path || '',
          storage_path: document?.storagePath || document?.storage_path || '',
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving document:', err);
      setErrorMsg(err.message || 'Failed to record document.');
      setUploadProgress({ state: 'failed', percent: 0 });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Archival Document Dialog">
      <div className="ft-view-modal__backdrop" onClick={!isUploading ? onClose : undefined} />
      <div className="ft-view-modal__container ft-modal-form-container">
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">ARCHIVAL DOCUMENTS</span>
            <h2 className="ft-view-modal__title">{document ? 'Edit Document' : 'Record Document'}</h2>
            <p className="ft-view-modal__subtitle">Attach historical record to {person.displayName}&apos;s archive</p>
          </div>
          <button
            className="ft-view-modal__close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isUploading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {errorMsg && (
          <div className="ft-form-error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {isUploading && (
          <div style={{
            margin: '0 24px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4ade80', marginBottom: '6px' }}>
              <span>Uploading document to secure storage...</span>
              <span>{uploadProgress.percent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${uploadProgress.percent}%`,
                height: '100%',
                background: '#4ade80',
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ft-modal-form-body">
          <div className="ft-form-grid">
            <div className="ft-form-row ft-form-row--2">
              <div className="ft-form-field">
                <label>Document Category</label>
                <select value={type} onChange={(e) => setType(e.target.value)} disabled={isUploading}>
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ft-form-field">
                <label>Date of Record (Optional or Year)</label>
                <input
                  type="text"
                  placeholder="e.g. August 14, 1947 or 1974"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="ft-form-field">
              <label>Document Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Land Tenancy Deed & Village Ledger"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="ft-form-field">
              <label>Document Description &amp; Archival Notes</label>
              <textarea
                rows="3"
                placeholder="Original language, location of physical copy, historical significance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* Document Digital Scan File Upload */}
            <div className="ft-form-field">
              <label>Attach Digital Scan / File (PDF, JPEG, PNG, WEBP — up to 25MB)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  placeholder="Paste digital scan link or choose file from computer..."
                  value={src}
                  onChange={(e) => {
                    setSrc(e.target.value);
                    setSelectedFile(null);
                    setFileDetails(null);
                  }}
                  disabled={isUploading}
                  style={{ flex: 1 }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload from computer"
                  disabled={isUploading}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Choose File</span>
                </button>
              </div>

              {fileDetails && (
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px', display: 'flex', gap: '12px' }}>
                  <span>Attached: {fileDetails.name}</span>
                  <span>Size: {fileDetails.size}</span>
                </div>
              )}
            </div>
          </div>

          <div className="ft-modal-footer">
            <button
              type="button"
              className="ft-form-btn ft-form-btn--secondary"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ft-form-btn ft-form-btn--primary"
              disabled={isUploading}
            >
              {isUploading ? 'Recording...' : document ? 'Save Changes' : 'Record Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
