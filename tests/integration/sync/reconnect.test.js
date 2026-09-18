import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from '../../../src/family-tree/store/sync/SyncEngine.js';
import { indexedDBManager, STORES } from '../../../src/family-tree/store/local/indexedDBManager.js';
import { SYNC_STATUS, ENTITY_TYPES, MUTATION_OP } from '../../../src/family-tree/store/sync/syncTypes.js';

describe('Reconnect Integration', () => {
  beforeEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  afterEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  describe('Automatic Reconnect Recovery', () => {
    it('handleOnline automatically drains queued offline mutations', async () => {
      const synced = [];
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async (payload) => {
          synced.push(payload.id);
        }
      };

      const engine = new SyncEngine('family-reconnect-test', mockAdapter);
      engine.isOnline = () => false;

      await engine.enqueue(
        ENTITY_TYPES.PERSON,
        'person-recon-1',
        MUTATION_OP.CREATE,
        { id: 'person-recon-1', firstName: 'OfflinePerson' }
      );

      let queue = await indexedDBManager.getPendingQueue('family-reconnect-test');
      expect(queue.length).toBe(1);

      engine.isOnline = () => true;
      engine.handleOnline();

      await new Promise(resolve => setTimeout(resolve, 150));

      queue = await indexedDBManager.getPendingQueue('family-reconnect-test');
      expect(queue.length).toBe(0);
      expect(synced.includes('person-recon-1')).toBe(true);
      expect(engine.getStatus()).toBe(SYNC_STATUS.SYNCED);

      engine.destroy();
    });

    it('handleOnline triggers sync which flushes entire queue', async () => {
      const syncedOrder = [];
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async (payload) => {
          syncedOrder.push(payload.id);
        }
      };

      const engine = new SyncEngine('family-multi-reconnect', mockAdapter);
      engine.isOnline = () => false;

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-a', MUTATION_OP.CREATE, { id: 'person-a' });
      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-b', MUTATION_OP.CREATE, { id: 'person-b' });
      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-c', MUTATION_OP.CREATE, { id: 'person-c' });

      engine.isOnline = () => true;
      engine.handleOnline();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(syncedOrder).toEqual(['person-a', 'person-b', 'person-c']);

      engine.destroy();
    });
  });

  describe('Tombstone Filtering on Pull', () => {
    it('deleted entities stay deleted after reconnect', async () => {
      const familyId = 'family-tomb-reconnect';
      const engine = new SyncEngine(familyId, null);

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-deleted', MUTATION_OP.DELETE);

      const isTombstoned = await indexedDBManager.isTombstoned('person-deleted');
      expect(isTombstoned).toBe(true);

      const remotePeople = [
        { id: 'person-deleted', firstName: 'Ghost Person' },
        { id: 'person-alive', firstName: 'Living Person' }
      ];

      const tombstones = await indexedDBManager.getTombstones(familyId);
      const tombstoneSet = new Set(tombstones.map(t => t.id));

      const { filterTombstonedEntities } = await import('../../../src/family-tree/store/sync/conflictResolver.js');
      const filtered = filterTombstonedEntities(remotePeople, tombstoneSet);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('person-alive');

      engine.destroy();
    });

    it('tombstone persists across sync cycles', async () => {
      const familyId = 'family-tomb-persist';
      const engine = new SyncEngine(familyId, null);

      await indexedDBManager.put(STORES.PEOPLE, {
        id: 'person-temp',
        family_id: familyId,
        firstName: 'Temporary'
      });

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-temp', MUTATION_OP.DELETE);

      await new Promise(resolve => setTimeout(resolve, 50));

      const isTombstoned = await indexedDBManager.isTombstoned('person-temp');
      expect(isTombstoned).toBe(true);

      const tombstones = await indexedDBManager.getTombstones(familyId);
      expect(tombstones.some(t => t.id === 'person-temp')).toBe(true);

      engine.destroy();
    });
  });

  describe('Cross-Family Isolation', () => {
    it('queued operations for family A do not affect family B', async () => {
      const savedA = [];
      const savedB = [];

      const mockAdapterA = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async (payload) => {
          savedA.push(payload);
        }
      };

      const mockAdapterB = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async (payload) => {
          savedB.push(payload);
        }
      };

      const engineA = new SyncEngine('family-isolate-a', mockAdapterA);
      const engineB = new SyncEngine('family-isolate-b', mockAdapterB);

      engineA.isOnline = () => false;
      engineB.isOnline = () => false;

      await engineA.enqueue(ENTITY_TYPES.PERSON, 'person-a', MUTATION_OP.CREATE, { id: 'person-a', firstName: 'Alpha' });
      await engineB.enqueue(ENTITY_TYPES.PERSON, 'person-b', MUTATION_OP.CREATE, { id: 'person-b', firstName: 'Beta' });

      engineA.isOnline = () => true;
      engineA.handleOnline();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(savedA.some(p => p.id === 'person-a')).toBe(true);
      expect(savedA.some(p => p.id === 'person-b')).toBe(false);

      expect(savedB.length).toBe(0);

      engineA.destroy();
      engineB.destroy();
    });

    it('IndexedDB queries are strictly scoped by familyId', async () => {
      await indexedDBManager.putBatch(STORES.PEOPLE, [
        { id: 'person-f1-1', family_id: 'family-1', firstName: 'F1 Alpha' },
        { id: 'person-f1-2', family_id: 'family-1', firstName: 'F1 Beta' },
        { id: 'person-f2-1', family_id: 'family-2', firstName: 'F2 Gamma' }
      ]);

      const family1People = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'family-1');
      const family2People = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'family-2');

      expect(family1People.length).toBe(2);
      expect(family2People.length).toBe(1);

      expect(family1People.every(p => p.family_id === 'family-1')).toBe(true);
      expect(family2People.every(p => p.family_id === 'family-2')).toBe(true);

      expect(family1People.some(p => p.id === 'person-f2-1')).toBe(false);
      expect(family2People.some(p => p.id === 'person-f1-1')).toBe(false);
    });
  });

  describe('Hydration and Pull', () => {
    it('hydrate returns empty state for new family without cache', async () => {
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] })
      };

      const engine = new SyncEngine('family-new-hydrate', mockAdapter);
      engine.isOnline = () => true;

      const data = await engine.hydrate();

      expect(data.people).toEqual([]);
      expect(data.relationships).toEqual([]);

      engine.destroy();
    });

    it('hydrate returns cached data immediately', async () => {
      await indexedDBManager.putBatch(STORES.PEOPLE, [
        { id: 'person-cached', family_id: 'family-hydrate-cache', firstName: 'Cached' }
      ]);

      const mockAdapter = {
        load: async () => {
          throw new Error('Should not be called');
        }
      };

      const engine = new SyncEngine('family-hydrate-cache', mockAdapter);
      engine.isOnline = () => false;

      const data = await engine.hydrate();

      expect(data.people.length).toBe(1);
      expect(data.people[0].firstName).toBe('Cached');

      engine.destroy();
    });
  });
});
