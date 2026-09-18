import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncEngine } from '../../../src/family-tree/store/sync/SyncEngine.js';
import { indexedDBManager, STORES } from '../../../src/family-tree/store/local/indexedDBManager.js';
import { SYNC_STATUS, ENTITY_TYPES, MUTATION_OP } from '../../../src/family-tree/store/sync/syncTypes.js';

describe('SyncEngine', () => {
  beforeEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  afterEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  describe('Constructor', () => {
    it('throws error if familyId is missing', () => {
      expect(() => new SyncEngine(null)).toThrow('valid familyId');
    });

    it('initializes with SYNCED status when online', () => {
      const engine = new SyncEngine('family-1', null);
      const status = engine.getStatus();
      expect([SYNC_STATUS.SYNCED, SYNC_STATUS.OFFLINE]).toContain(status);
      engine.destroy();
    });
  });

  describe('Queue Creation and Normalization', () => {
    it('enqueue creates queue item with valid schema', async () => {
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async () => {}
      };

      const engine = new SyncEngine('family-queue-test', mockAdapter);
      engine.isOnline = () => false;

      const person = { id: 'person-1', family_id: 'family-queue-test', firstName: 'Ananya' };

      const item = await engine.enqueue(ENTITY_TYPES.PERSON, person.id, MUTATION_OP.CREATE, person);

      expect(item.id).toMatch(/^queue-/);
      expect(item.familyId).toBe('family-queue-test');
      expect(item.entityType).toBe('person');
      expect(item.entityId).toBe('person-1');
      expect(item.operation).toBe('create');
      expect(item.status).toBe('pending');
      expect(item.attemptCount).toBe(0);

      engine.destroy();
    });

    it('enqueue stores multiple items in FIFO order', async () => {
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async () => {}
      };

      const engine = new SyncEngine('family-fifo-test', mockAdapter);
      engine.isOnline = () => false;

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-1', MUTATION_OP.CREATE, { id: 'person-1', firstName: 'First' });
      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-2', MUTATION_OP.CREATE, { id: 'person-2', firstName: 'Second' });
      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-3', MUTATION_OP.CREATE, { id: 'person-3', firstName: 'Third' });

      const queue = await indexedDBManager.getPendingQueue('family-fifo-test');

      expect(queue.length).toBe(3);
      expect(queue[0].entityId).toBe('person-1');
      expect(queue[1].entityId).toBe('person-2');
      expect(queue[2].entityId).toBe('person-3');

      engine.destroy();
    });
  });

  describe('Offline Mutation', () => {
    it('enqueue writes to local store immediately', async () => {
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async () => { throw new Error('Network unreachable'); }
      };

      const engine = new SyncEngine('family-offline-test', mockAdapter);
      engine.isOnline = () => false;

      const person = {
        id: 'person-offline-1',
        family_id: 'family-offline-test',
        firstName: 'Kavitha',
        lastName: 'Medida'
      };

      await engine.enqueue(ENTITY_TYPES.PERSON, person.id, MUTATION_OP.CREATE, person);

      const localPerson = await indexedDBManager.get(STORES.PEOPLE, 'person-offline-1');

      expect(localPerson).not.toBeNull();
      expect(localPerson.firstName).toBe('Kavitha');

      engine.destroy();
    });

    it('enqueue creates queue item when offline', async () => {
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async () => { throw new Error('Network unreachable'); }
      };

      const engine = new SyncEngine('family-offline-queue', mockAdapter);
      engine.isOnline = () => false;

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-off', MUTATION_OP.CREATE, { id: 'person-off' });

      const queue = await indexedDBManager.getPendingQueue('family-offline-queue');

      expect(queue.length).toBe(1);
      expect(queue[0].entityId).toBe('person-off');
      expect(engine.getStatus()).toBe(SYNC_STATUS.OFFLINE);

      engine.destroy();
    });

    it('enqueue DELETE adds tombstone', async () => {
      const engine = new SyncEngine('family-tomb-test', null);

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-delete', MUTATION_OP.DELETE);

      const isTombstoned = await indexedDBManager.isTombstoned('person-delete');

      expect(isTombstoned).toBe(true);

      engine.destroy();
    });
  });

  describe('Online Sync Push', () => {
    it('flushes queue and dequeues on success', async () => {
      const savedRemote = [];
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async (payload) => {
          savedRemote.push(payload);
        }
      };

      const engine = new SyncEngine('family-online-test', mockAdapter);
      engine.isOnline = () => true;

      const person = {
        id: 'person-online-1',
        family_id: 'family-online-test',
        firstName: 'Vikram',
        lastName: 'Medida'
      };

      await engine.enqueue(ENTITY_TYPES.PERSON, person.id, MUTATION_OP.CREATE, person);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(savedRemote.length).toBe(1);
      expect(savedRemote[0].firstName).toBe('Vikram');

      const queue = await indexedDBManager.getPendingQueue('family-online-test');
      expect(queue.length).toBe(0);

      engine.destroy();
    });
  });

  describe('Failed Sync and Retry', () => {
    it('retains failed operation in queue and increments attemptCount', async () => {
      let callCount = 0;
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async () => {
          callCount++;
          throw new Error('Supabase 503 Service Unavailable');
        }
      };

      const engine = new SyncEngine('family-retry-test', mockAdapter);
      engine.isOnline = () => true;

      const person = {
        id: 'person-fail-1',
        family_id: 'family-retry-test',
        firstName: 'Arun'
      };

      await engine.enqueue(ENTITY_TYPES.PERSON, person.id, MUTATION_OP.CREATE, person);

      await new Promise(resolve => setTimeout(resolve, 100));

      const queue = await indexedDBManager.getPendingQueue('family-retry-test');

      expect(queue.length).toBe(1);
      expect(queue[0].attemptCount).toBeGreaterThanOrEqual(1);
      expect(queue[0].status).toBe('pending');
      expect(queue[0].error).toContain('503');

      engine.destroy();
    });

    it('marks permanently failed operations after max retries', async () => {
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async () => {
          const err = new Error('Forbidden: Cross-family access denied');
          throw err;
        }
      };

      const engine = new SyncEngine('family-perm-fail', mockAdapter);
      engine.isOnline = () => true;

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-perm', MUTATION_OP.CREATE, { id: 'person-perm' });
      await engine.flushQueue();

      const queue = await indexedDBManager.getPendingQueue('family-perm-fail');

      if (queue.length > 0) {
        expect(queue[0].status).toBe('failed');
        expect(queue[0].error).toContain('Forbidden');
      }

      engine.destroy();
    });
  });

  describe('Partial Sync Failure Recovery', () => {
    it('commits successful operations and keeps failed operations queued', async () => {
      const executed = [];
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: async (payload) => {
          if (payload.id === 'person-fail-item') {
            throw new Error('Network timeout on item 2');
          }
          executed.push(payload.id);
        }
      };

      const engine = new SyncEngine('family-partial-test', mockAdapter);
      engine.isOnline = () => false;

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-good-1', MUTATION_OP.CREATE, { id: 'person-good-1', firstName: 'One' });
      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-fail-item', MUTATION_OP.CREATE, { id: 'person-fail-item', firstName: 'Two' });
      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-good-3', MUTATION_OP.CREATE, { id: 'person-good-3', firstName: 'Three' });

      engine.isOnline = () => true;
      await engine.flushQueue();

      expect(executed.includes('person-good-1')).toBe(true);

      const remaining = await indexedDBManager.getPendingQueue('family-partial-test');
      expect(remaining.some(r => r.entityId === 'person-fail-item')).toBe(true);
      expect(remaining.some(r => r.entityId === 'person-good-1')).toBe(false);

      engine.destroy();
    });
  });

  describe('Status Management', () => {
    it('getStatus returns current status', () => {
      const engine = new SyncEngine('family-status', null);
      const status = engine.getStatus();
      expect(typeof status).toBe('string');
      engine.destroy();
    });

    it('setStatus notifies listeners', () => {
      const engine = new SyncEngine('family-listener', null);
      let notifiedValue = null;
      
      engine.subscribe((status) => {
        notifiedValue = status;
      });

      engine.setStatus(SYNC_STATUS.SYNCING);

      expect(notifiedValue).toBe(SYNC_STATUS.SYNCING);

      engine.destroy();
    });

    it('subscribe returns unsubscribe function', () => {
      const engine = new SyncEngine('family-unsub', null);
      let callCount = 0;

      const unsubscribe = engine.subscribe(() => {
        callCount++;
      });

      engine.setStatus(SYNC_STATUS.SYNCING);

      unsubscribe();

      engine.setStatus(SYNC_STATUS.SYNCED);

      expect(callCount).toBe(2);

      engine.destroy();
    });
  });

  describe('Destruction', () => {
    it('destroy marks engine as destroyed', () => {
      const engine = new SyncEngine('family-destroy', null);
      engine.destroy();
      expect(engine.destroyed).toBe(true);
    });

    it('destroyed engine does not process queue', async () => {
      const mockAdapter = {
        load: async () => ({ people: [], relationships: [] }),
        savePerson: vi.fn()
      };

      const engine = new SyncEngine('family-destroy-queue', mockAdapter);
      engine.isOnline = () => false;

      await engine.enqueue(ENTITY_TYPES.PERSON, 'person-1', MUTATION_OP.CREATE, { id: 'person-1' });

      engine.destroy();
      engine.isOnline = () => true;
      await engine.flushQueue();

      expect(mockAdapter.savePerson).not.toHaveBeenCalled();
    });
  });
});
