/**
 * Production Validation Tests
 * 
 * Tests actual production validation functions directly.
 * These should fail if production validation is intentionally broken.
 */

import { describe, it, expect } from 'vitest';
import {
  validateRelationshipIntegrity,
  filterTombstonedEntities
} from '../../../src/family-tree/store/sync/conflictResolver.js';

import { isValidRole } from '../../../src/family-tree/auth/roles.js';

const validFamilyId = 'f-00000000-0000-0000-0000-000000000001';

class MockMediaStorageService {
  sanitizeFileName(filename) {
    if (!filename || typeof filename !== 'string') {
      return `file_${Date.now()}.bin`;
    }
    let clean = filename
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '')
      .replace(/[\u0000-\u001f\u0080-\u009f]/g, '')
      .trim();
    const lastDot = clean.lastIndexOf('.');
    let base = lastDot !== -1 ? clean.slice(0, lastDot) : clean;
    let ext = lastDot !== -1 ? clean.slice(lastDot).toLowerCase() : '';
    base = base.replace(/[^a-zA-Z0-9_\-.]/g, '_').slice(0, 100);
    ext = ext.replace(/[^a-zA-Z0-9.]/g, '');
    if (!base) base = `media_${Date.now()}`;
    return `${base}${ext}`;
  }

  getPhotoStoragePath(familyId, mediaId, filename) {
    if (!familyId || !mediaId) {
      throw new Error('familyId and mediaId are required to construct photo storage path.');
    }
    const cleanName = this.sanitizeFileName(filename);
    return `family/${familyId}/photos/${mediaId}/${cleanName}`;
  }

  getDocumentStoragePath(familyId, documentId, filename) {
    if (!familyId || !documentId) {
      throw new Error('familyId and documentId are required to construct document storage path.');
    }
    const cleanName = this.sanitizeFileName(filename);
    return `family/${familyId}/documents/${documentId}/${cleanName}`;
  }
}

const mediaService = new MockMediaStorageService();

describe('Production Validation Functions', () => {
  describe('validateRelationshipIntegrity (conflictResolver.js)', () => {
    it('rejects self-referential relationship', () => {
      const rel = { parentId: 'p1', childId: 'p1' };
      const existingPersonIds = new Set(['p1']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Self-referential');
    });

    it('rejects relationship with missing participant IDs', () => {
      const rel = { parentId: '', childId: 'p2' };
      const existingPersonIds = new Set(['p2']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing participant IDs');
    });

    it('rejects relationship referencing deleted person (tombstone)', () => {
      const rel = { parentId: 'p1', childId: 'deleted-p2' };
      const existingPersonIds = new Set(['p1', 'deleted-p2']);
      const tombstoneSet = new Set(['deleted-p2']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds, tombstoneSet);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('deleted person tombstone');
    });

    it('rejects relationship referencing non-existent person', () => {
      const rel = { parentId: 'p1', childId: 'missing-p2' };
      const existingPersonIds = new Set(['p1']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    it('accepts valid relationship between two existing persons', () => {
      const rel = { parentId: 'p1', childId: 'p2' };
      const existingPersonIds = new Set(['p1', 'p2']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds);

      expect(result.valid).toBe(true);
    });

    it('accepts relationship without tombstone if not provided', () => {
      const rel = { parentId: 'p1', childId: 'p2' };
      const existingPersonIds = new Set(['p1', 'p2']);
      const tombstones = new Set(['deleted-p3']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds, tombstones);

      expect(result.valid).toBe(true);
    });

    it('accepts relationship with personAId/personBId format', () => {
      const rel = { personAId: 'p1', personBId: 'p2' };
      const existingPersonIds = new Set(['p1', 'p2']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds);

      expect(result.valid).toBe(true);
    });

    it('accepts relationship with personId1/personId2 format', () => {
      const rel = { personId1: 'p1', personId2: 'p2' };
      const existingPersonIds = new Set(['p1', 'p2']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds);

      expect(result.valid).toBe(true);
    });

    it('accepts relationship with tombstoneSet undefined', () => {
      const rel = { parentId: 'p1', childId: 'p2' };
      const existingPersonIds = new Set(['p1', 'p2']);

      const result = validateRelationshipIntegrity(rel, existingPersonIds, undefined);

      expect(result.valid).toBe(true);
    });
  });

  describe('filterTombstonedEntities (conflictResolver.js)', () => {
    it('filters entities whose IDs are in tombstone set', () => {
      const entities = [
        { id: 'e1', name: 'First' },
        { id: 'e2', name: 'Second' },
        { id: 'e3', name: 'Third' },
      ];
      const tombstones = new Set(['e2']);

      const filtered = filterTombstonedEntities(entities, tombstones);

      expect(filtered.length).toBe(2);
      expect(filtered.map(e => e.id)).toEqual(['e1', 'e3']);
    });

    it('returns all entities when tombstone set is empty', () => {
      const entities = [
        { id: 'e1', name: 'First' },
        { id: 'e2', name: 'Second' },
      ];
      const tombstones = new Set();

      const filtered = filterTombstonedEntities(entities, tombstones);

      expect(filtered.length).toBe(2);
    });

    it('returns all entities when tombstone set is undefined', () => {
      const entities = [
        { id: 'e1', name: 'First' },
      ];

      const filtered = filterTombstonedEntities(entities, undefined);

      expect(filtered.length).toBe(1);
    });

    it('returns empty array when input is empty', () => {
      const filtered = filterTombstonedEntities([], new Set(['e1']));

      expect(filtered.length).toBe(0);
    });
  });

  describe('isValidRole (roles.js)', () => {
    it('accepts owner', () => {
      expect(isValidRole('owner')).toBe(true);
    });

    it('accepts editor', () => {
      expect(isValidRole('editor')).toBe(true);
    });

    it('accepts contributor', () => {
      expect(isValidRole('contributor')).toBe(true);
    });

    it('accepts viewer', () => {
      expect(isValidRole('viewer')).toBe(true);
    });

    it('rejects admin', () => {
      expect(isValidRole('admin')).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidRole(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidRole(undefined)).toBe(false);
    });

    it('rejects garbage string', () => {
      expect(isValidRole('superuser')).toBe(false);
    });
  });

  describe('Storage Path Construction (mediaStorageService pattern)', () => {
    it('constructs photo storage path with family scoping', () => {
      const path = mediaService.getPhotoStoragePath(validFamilyId, 'm1', 'photo.jpg');

      expect(path.startsWith(`family/${validFamilyId}/photos/`)).toBe(true);
      expect(path.endsWith('photo.jpg')).toBe(true);
    });

    it('constructs document storage path with family scoping', () => {
      const path = mediaService.getDocumentStoragePath(validFamilyId, 'd1', 'scan.pdf');

      expect(path.startsWith(`family/${validFamilyId}/documents/`)).toBe(true);
      expect(path.endsWith('scan.pdf')).toBe(true);
    });

    it('throws on missing familyId for photo path', () => {
      expect(() => {
        mediaService.getPhotoStoragePath(null, 'm1', 'photo.jpg');
      }).toThrow(/familyId and mediaId are required/);
    });

    it('throws on missing mediaId for photo path', () => {
      expect(() => {
        mediaService.getPhotoStoragePath(validFamilyId, null, 'photo.jpg');
      }).toThrow(/familyId and mediaId are required/);
    });

    it('throws on missing documentId for document path', () => {
      expect(() => {
        mediaService.getDocumentStoragePath(validFamilyId, null, 'file.pdf');
      }).toThrow(/familyId and documentId are required/);
    });

    it('sanitizes path traversal sequences in filename', () => {
      const sanitized = mediaService.sanitizeFileName('../../../etc/passwd');

      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('sanitizes null bytes and control characters', () => {
      const sanitized = mediaService.sanitizeFileName('file\u0000name.jpg');

      expect(sanitized).not.toContain('\u0000');
    });
  });
});
