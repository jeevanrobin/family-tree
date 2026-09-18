import { describe, it, expect } from 'vitest';
import {
  mergePersonRecords,
  mergeEntityRecords,
  validateRelationshipIntegrity,
  filterTombstonedEntities
} from '../../../src/family-tree/store/sync/conflictResolver.js';

describe('Conflict Resolver', () => {
  describe('mergePersonRecords - Non-Conflicting Edits', () => {
    it('concurrent non-conflicting field edits from Device A and Device B both survive', () => {
      const base = {
        id: 'rajesh-1',
        firstName: 'Rajesh',
        lastName: 'Medida',
        occupation: 'Civil Engineer',
        biography: 'Born in Hyderabad.',
        updatedAt: '2026-09-01T10:00:00.000Z'
      };

      const deviceA = {
        ...base,
        occupation: 'Chief Hydraulic Consultant',
        updatedAt: '2026-09-03T11:00:00.000Z'
      };

      const deviceB = {
        ...base,
        biography: 'Pioneered hydraulic canal network designs across South India.',
        updatedAt: '2026-09-03T11:05:00.000Z'
      };

      const { merged, hasConflict } = mergePersonRecords(deviceA, deviceB, base);

      expect(merged.occupation).toBe('Chief Hydraulic Consultant');
      expect(merged.biography).toBe('Pioneered hydraulic canal network designs across South India.');
      expect(merged.firstName).toBe('Rajesh');
      expect(hasConflict).toBe(false);
    });

    it('only local changed from base preserves local value', () => {
      const base = { id: 'person-1', occupation: 'Engineer', updatedAt: '2026-01-01T00:00:00.000Z' };
      const local = { ...base, occupation: 'Senior Engineer', updatedAt: '2026-01-02T00:00:00.000Z' };
      const remote = { ...base };

      const { merged, hasConflict } = mergePersonRecords(local, remote, base);

      expect(merged.occupation).toBe('Senior Engineer');
      expect(hasConflict).toBe(false);
    });

    it('only remote changed from base preserves remote value', () => {
      const base = { id: 'person-2', occupation: 'Engineer', updatedAt: '2026-01-01T00:00:00.000Z' };
      const local = { ...base };
      const remote = { ...base, occupation: 'Chief Engineer', updatedAt: '2026-01-02T00:00:00.000Z' };

      const { merged, hasConflict } = mergePersonRecords(local, remote, base);

      expect(merged.occupation).toBe('Chief Engineer');
      expect(hasConflict).toBe(false);
    });
  });

  describe('mergePersonRecords - Same-Field Conflicts', () => {
    it('same-field conflict resolves deterministically by timestamp (remote newer)', () => {
      const deviceA = {
        id: 'rajesh-1',
        occupation: 'Professor of Hydraulics',
        updatedAt: '2026-09-03T12:00:00.000Z'
      };

      const deviceB = {
        id: 'rajesh-1',
        occupation: 'Director of Irrigation Works',
        updatedAt: '2026-09-03T12:05:00.000Z'
      };

      const { merged, hasConflict, conflicts } = mergePersonRecords(deviceA, deviceB);

      expect(hasConflict).toBe(true);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].field).toBe('occupation');
      expect(conflicts[0].winner).toBe('remote');
      expect(merged.occupation).toBe('Director of Irrigation Works');
    });

    it('same-field conflict with local newer timestamp resolves to local', () => {
      const deviceA = {
        id: 'person-3',
        occupation: 'New Local Occupation',
        updatedAt: '2026-09-03T13:00:00.000Z'
      };

      const deviceB = {
        id: 'person-3',
        occupation: 'Old Remote Occupation',
        updatedAt: '2026-09-03T12:00:00.000Z'
      };

      const { merged, hasConflict, conflicts } = mergePersonRecords(deviceA, deviceB);

      expect(hasConflict).toBe(true);
      expect(merged.occupation).toBe('New Local Occupation');
      expect(conflicts[0].winner).toBe('local');
    });

    it('conflict audit trail attached to merged record', () => {
      const deviceA = {
        id: 'rajesh-1',
        occupation: 'Professor of Hydraulics',
        updatedAt: '2026-09-03T12:00:00.000Z'
      };

      const deviceB = {
        id: 'rajesh-1',
        occupation: 'Director of Irrigation Works',
        updatedAt: '2026-09-03T12:05:00.000Z'
      };

      const { merged } = mergePersonRecords(deviceA, deviceB);

      expect(merged._conflictDetails).toBeDefined();
      expect(merged._conflictDetails.length).toBe(1);
      expect(merged._conflictDetails[0].localVal).toBe('Professor of Hydraulics');
      expect(merged._conflictDetails[0].remoteVal).toBe('Director of Irrigation Works');
    });

    it('no silent data destruction for conflicting values', () => {
      const deviceA = {
        id: 'person-4',
        biography: 'Local biography text',
        updatedAt: '2026-09-03T10:00:00.000Z'
      };

      const deviceB = {
        id: 'person-4',
        biography: 'Remote biography text',
        updatedAt: '2026-09-03T10:05:00.000Z'
      };

      const { merged, conflicts } = mergePersonRecords(deviceA, deviceB);

      expect(merged._conflictDetails).toBeDefined();
      expect(conflicts[0].field).toBe('biography');
      expect(conflicts[0].localVal).toBe('Local biography text');
      expect(conflicts[0].remoteVal).toBe('Remote biography text');
    });
  });

  describe('mergePersonRecords - Edge Cases', () => {
    it('null local returns remote', () => {
      const remote = { id: 'person-5', firstName: 'Remote' };
      const { merged } = mergePersonRecords(null, remote);
      expect(merged).toEqual(remote);
    });

    it('null remote returns local', () => {
      const local = { id: 'person-6', firstName: 'Local' };
      const { merged } = mergePersonRecords(local, null);
      expect(merged).toEqual(local);
    });

    it('merges updatedAt to latest', () => {
      const local = {
        id: 'person-7',
        firstName: 'A',
        updatedAt: '2026-01-01T12:00:00.000Z'
      };

      const remote = {
        id: 'person-7',
        firstName: 'A',
        updatedAt: '2026-01-01T11:00:00.000Z'
      };

      const { merged } = mergePersonRecords(local, remote);

      expect(merged.updatedAt).toBe('2026-01-01T12:00:00.000Z');
    });
  });

  describe('mergeEntityRecords', () => {
    it('preserves union of tagged people and latest content', () => {
      const localStory = {
        id: 'story-1',
        content: 'Local story draft.',
        relatedPersonIds: ['person-1', 'person-2'],
        updatedAt: '2026-09-03T10:00:00.000Z'
      };

      const remoteStory = {
        id: 'story-1',
        content: 'Remote story addition.',
        relatedPersonIds: ['person-2', 'person-3'],
        updatedAt: '2026-09-03T10:05:00.000Z'
      };

      const { merged } = mergeEntityRecords(localStory, remoteStory);

      expect(merged.content).toBe('Remote story addition.');
      expect(merged.relatedPersonIds.includes('person-1')).toBe(true);
      expect(merged.relatedPersonIds.includes('person-2')).toBe(true);
      expect(merged.relatedPersonIds.includes('person-3')).toBe(true);
    });

    it('takes union of relatedPersonIds even with different order', () => {
      const local = {
        id: 'entity-1',
        relatedPersonIds: ['a', 'b', 'c']
      };

      const remote = {
        id: 'entity-1',
        relatedPersonIds: ['d', 'b', 'e']
      };

      const { merged } = mergeEntityRecords(local, remote);

      expect(merged.relatedPersonIds.sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('null local returns remote', () => {
      const remote = { id: 'entity-2', title: 'Remote' };
      const { merged } = mergeEntityRecords(null, remote);
      expect(merged).toEqual(remote);
    });

    it('null remote returns local', () => {
      const local = { id: 'entity-3', title: 'Local' };
      const { merged } = mergeEntityRecords(local, null);
      expect(merged).toEqual(local);
    });
  });

  describe('validateRelationshipIntegrity', () => {
    it('accepts valid relationship', () => {
      const rel = { id: 'rel-1', parentId: 'person-1', childId: 'person-2', type: 'parent-child' };
      const livingPeople = new Set(['person-1', 'person-2']);

      const { valid } = validateRelationshipIntegrity(rel, livingPeople);

      expect(valid).toBe(true);
    });

    it('rejects relationship referencing tombstoned person', () => {
      const rel = { id: 'rel-2', parentId: 'person-alive', childId: 'person-deleted', type: 'parent-child' };
      const livingPeople = new Set(['person-alive']);
      const tombstones = new Set(['person-deleted']);

      const { valid, reason } = validateRelationshipIntegrity(rel, livingPeople, tombstones);

      expect(valid).toBe(false);
      expect(reason.toLowerCase()).toContain('tombstone');
    });

    it('rejects self-referential relationship', () => {
      const rel = { id: 'rel-self', personAId: 'person-1', personBId: 'person-1', type: 'spouse' };
      const livingPeople = new Set(['person-1']);

      const { valid, reason } = validateRelationshipIntegrity(rel, livingPeople);

      expect(valid).toBe(false);
      expect(reason).toContain('Self-referential');
    });

    it('rejects relationship with missing participant', () => {
      const rel = { id: 'rel-missing', parentId: 'person-1', childId: 'person-missing', type: 'parent-child' };
      const livingPeople = new Set(['person-1']);

      const { valid } = validateRelationshipIntegrity(rel, livingPeople);

      expect(valid).toBe(false);
    });

    it('rejects relationship with empty participant IDs', () => {
      const rel = { id: 'rel-empty', parentId: '', childId: 'person-1', type: 'parent-child' };
      const livingPeople = new Set(['person-1']);

      const { valid } = validateRelationshipIntegrity(rel, livingPeople);

      expect(valid).toBe(false);
    });
  });

  describe('filterTombstonedEntities', () => {
    it('filters out tombstoned entities from results', () => {
      const entities = [
        { id: 'person-1', firstName: 'Alive' },
        { id: 'person-2', firstName: 'Deleted' },
        { id: 'person-3', firstName: 'Alive2' }
      ];
      const tombstoneSet = new Set(['person-2']);

      const filtered = filterTombstonedEntities(entities, tombstoneSet);

      expect(filtered.length).toBe(2);
      expect(filtered.some(e => e.id === 'person-2')).toBe(false);
    });

    it('returns all entities if tombstoneSet is empty', () => {
      const entities = [
        { id: 'person-1', firstName: 'A' },
        { id: 'person-2', firstName: 'B' }
      ];

      const filtered = filterTombstonedEntities(entities, new Set());

      expect(filtered.length).toBe(2);
    });

    it('returns all entities if tombstoneSet is null', () => {
      const entities = [
        { id: 'person-1', firstName: 'A' }
      ];

      const filtered = filterTombstonedEntities(entities, null);

      expect(filtered.length).toBe(1);
    });
  });
});
