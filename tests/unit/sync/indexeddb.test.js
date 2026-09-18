import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { indexedDBManager, STORES } from '../../../src/family-tree/store/local/indexedDBManager.js';

describe('IndexedDB Manager', () => {
  beforeEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  afterEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  describe('Entity CRUD Operations', () => {
    it('puts and gets entity from local store', async () => {
      const person = { id: 'person-1', family_id: 'family-a', firstName: 'Rajesh', lastName: 'Medida' };
      
      await indexedDBManager.put(STORES.PEOPLE, person);
      const retrieved = await indexedDBManager.get(STORES.PEOPLE, 'person-1');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.firstName).toBe('Rajesh');
      expect(retrieved.family_id).toBe('family-a');
    });

    it('returns null for non-existent key', async () => {
      const result = await indexedDBManager.get(STORES.PEOPLE, 'non-existent-id');
      expect(result).toBeNull();
    });

    it('putBatch stores multiple items atomically', async () => {
      const people = [
        { id: 'person-2', family_id: 'family-a', firstName: 'Suresh' },
        { id: 'person-3', family_id: 'family-a', firstName: 'Meena' }
      ];

      await indexedDBManager.putBatch(STORES.PEOPLE, people);

      const r1 = await indexedDBManager.get(STORES.PEOPLE, 'person-2');
      const r2 = await indexedDBManager.get(STORES.PEOPLE, 'person-3');

      expect(r1.firstName).toBe('Suresh');
      expect(r2.firstName).toBe('Meena');
    });

    it('delete removes entity from store', async () => {
      const person = { id: 'person-4', family_id: 'family-a' };
      await indexedDBManager.put(STORES.PEOPLE, person);

      await indexedDBManager.delete(STORES.PEOPLE, 'person-4');

      const result = await indexedDBManager.get(STORES.PEOPLE, 'person-4');
      expect(result).toBeNull();
    });
  });

  describe('Family Scoping', () => {
    it('getAllByFamily filters entities by family_id strictly', async () => {
      await indexedDBManager.putBatch(STORES.PEOPLE, [
        { id: 'person-5', family_id: 'family-alpha', firstName: 'Alpha' },
        { id: 'person-6', family_id: 'family-alpha', firstName: 'Alpha2' },
        { id: 'person-7', family_id: 'family-beta', firstName: 'Beta' }
      ]);

      const alphaPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'family-alpha');
      const betaPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'family-beta');

      expect(alphaPeople.length).toBe(2);
      expect(betaPeople.length).toBe(1);
      expect(alphaPeople.every(p => p.family_id === 'family-alpha')).toBe(true);
      expect(betaPeople[0].family_id).toBe('family-beta');
    });

    it('queries are strictly scoped by familyId (cross-family isolation)', async () => {
      await indexedDBManager.putBatch(STORES.PEOPLE, [
        { id: 'person-8', family_id: 'family-alpha', name: 'Alpha Member' },
        { id: 'person-9', family_id: 'family-beta', name: 'Beta Member' }
      ]);

      const alphaPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'family-alpha');
      const betaPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'family-beta');

      expect(alphaPeople.every(p => p.family_id === 'family-alpha')).toBe(true);
      expect(betaPeople.every(p => p.family_id === 'family-beta')).toBe(true);
      expect(alphaPeople.some(p => p.id === 'person-9')).toBe(false);
      expect(betaPeople.some(p => p.id === 'person-8')).toBe(false);
    });
  });

  describe('Tombstones', () => {
    it('registers and checks tombstoned entities', async () => {
      await indexedDBManager.addTombstone({
        id: 'person-deleted',
        familyId: 'family-tomb',
        entityType: 'person'
      });

      const isTombstoned = await indexedDBManager.isTombstoned('person-deleted');
      expect(isTombstoned).toBe(true);

      const notDeleted = await indexedDBManager.isTombstoned('person-active');
      expect(notDeleted).toBe(false);
    });

    it('retrieves all tombstones for a family', async () => {
      const familyId = 'family-tombstones';
      
      await indexedDBManager.addTombstone({
        id: 'deleted-1',
        familyId,
        entityType: 'person'
      });
      await indexedDBManager.addTombstone({
        id: 'deleted-2',
        familyId,
        entityType: 'relationship'
      });

      const tombstones = await indexedDBManager.getTombstones(familyId);
      expect(tombstones.length).toBe(2);
    });
  });

  describe('Sync Queue Operations', () => {
    it('enqueue adds item to queue', async () => {
      const item = {
        id: 'queue-1',
        familyId: 'family-queue',
        entityType: 'person',
        entityId: 'person-10',
        operation: 'create',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      await indexedDBManager.enqueue(item);
      const queue = await indexedDBManager.getPendingQueue('family-queue');
      
      expect(queue.length).toBe(1);
      expect(queue[0].entityId).toBe('person-10');
    });

    it('getPendingQueue returns pending and failed items sorted by createdAt', async () => {
      await indexedDBManager.enqueue({
        id: 'queue-2',
        familyId: 'family-queue-sort',
        entityType: 'person',
        entityId: 'person-11',
        operation: 'create',
        status: 'pending',
        createdAt: '2026-01-01T00:00:02.000Z'
      });
      await indexedDBManager.enqueue({
        id: 'queue-3',
        familyId: 'family-queue-sort',
        entityType: 'person',
        entityId: 'person-12',
        operation: 'create',
        status: 'pending',
        createdAt: '2026-01-01T00:00:01.000Z'
      });

      const queue = await indexedDBManager.getPendingQueue('family-queue-sort');
      
      expect(queue.length).toBe(2);
      expect(queue[0].id).toBe('queue-3');
      expect(queue[1].id).toBe('queue-2');
    });

    it('updateQueueItem updates existing queue item', async () => {
      await indexedDBManager.enqueue({
        id: 'queue-4',
        familyId: 'family-queue-update',
        entityType: 'person',
        entityId: 'person-13',
        operation: 'create',
        status: 'pending',
        attemptCount: 0
      });

      await indexedDBManager.updateQueueItem('queue-4', {
        attemptCount: 2,
        status: 'failed',
        error: 'Network timeout'
      });

      const queue = await indexedDBManager.getPendingQueue('family-queue-update');
      expect(queue[0].attemptCount).toBe(2);
      expect(queue[0].status).toBe('failed');
      expect(queue[0].error).toBe('Network timeout');
    });

    it('dequeue removes item from queue', async () => {
      await indexedDBManager.enqueue({
        id: 'queue-5',
        familyId: 'family-queue-dequeue',
        entityType: 'person',
        entityId: 'person-14',
        operation: 'create',
        status: 'pending'
      });

      await indexedDBManager.dequeue('queue-5');
      const queue = await indexedDBManager.getPendingQueue('family-queue-dequeue');
      
      expect(queue.length).toBe(0);
    });
  });

  describe('Sync Metadata', () => {
    it('getSyncMeta returns default for new family', async () => {
      const meta = await indexedDBManager.getSyncMeta('family-new');
      
      expect(meta.familyId).toBe('family-new');
      expect(meta.lastSyncedAt).toBeNull();
      expect(meta.lastPullAt).toBeNull();
    });

    it('updateSyncMeta updates metadata', async () => {
      const familyId = 'family-meta';
      await indexedDBManager.updateSyncMeta(familyId, {
        lastSyncedAt: '2026-01-01T01:00:00.000Z',
        lastPullAt: '2026-01-01T00:00:00.000Z'
      });

      const meta = await indexedDBManager.getSyncMeta(familyId);
      
      expect(meta.lastSyncedAt).toBe('2026-01-01T01:00:00.000Z');
      expect(meta.lastPullAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('Clear Operations', () => {
    it('clearFamilyData removes all entities for family', async () => {
      await indexedDBManager.putBatch(STORES.PEOPLE, [
        { id: 'person-clear-1', family_id: 'family-clear', firstName: 'A' },
        { id: 'person-clear-2', family_id: 'family-clear', firstName: 'B' }
      ]);

      await indexedDBManager.clearFamilyData('family-clear');

      const people = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'family-clear');
      expect(people.length).toBe(0);
    });

    it('clearAllDatabases removes all data across all families', async () => {
      await indexedDBManager.putBatch(STORES.PEOPLE, [
        { id: 'person-clear-3', family_id: 'family-a' },
        { id: 'person-clear-4', family_id: 'family-b' }
      ]);

      await indexedDBManager.clearAllDatabases();

      const allPeople = await indexedDBManager.getAll(STORES.PEOPLE);
      expect(allPeople.length).toBe(0);
    });
  });
});
