import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from '../../../src/family-tree/store/sync/SyncEngine.js';
import { indexedDBManager } from '../../../src/family-tree/store/local/indexedDBManager.js';
import { ENTITY_TYPES, MUTATION_OP, SYNC_STATUS } from '../../../src/family-tree/store/sync/syncTypes.js';

const FID = 'family-failed';

function makeEngine({ failPersonIds = [] } = {}) {
  const calls = [];
  const adapter = {
    load: async () => ({ people: [], relationships: [] }),
    savePerson: async (p) => {
      calls.push(['person', p.id]);
      if (failPersonIds.includes(p.id)) throw new Error('Forbidden: validation failed');
      return { ...p, uuid: `uuid-${p.id}` };
    },
    saveRelationship: async (r) => {
      calls.push(['relationship', r.id]);
      return r;
    },
    saveStory: async (s) => {
      calls.push(['story', s.id]);
      return s;
    },
  };
  const engine = new SyncEngine(FID, adapter);
  engine.isOnline = () => false; // queue without flushing until we say so
  return { engine, calls, adapter };
}

describe('SyncEngine failed mutations', () => {
  beforeEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  afterEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  it('holds back mutations that reference a person whose create failed', async () => {
    const { engine, calls } = makeEngine({ failPersonIds: ['p-bad'] });
    await engine.enqueue(ENTITY_TYPES.PERSON, 'p-bad', MUTATION_OP.CREATE, { id: 'p-bad' });
    await engine.enqueue(ENTITY_TYPES.PERSON, 'p-ok', MUTATION_OP.CREATE, { id: 'p-ok' });
    await engine.enqueue(ENTITY_TYPES.RELATIONSHIP, 'r1', MUTATION_OP.CREATE, {
      id: 'r1', type: 'parent', parentId: 'p-bad', childId: 'p-ok',
    });
    await engine.enqueue(ENTITY_TYPES.STORY, 's1', MUTATION_OP.CREATE, {
      id: 's1', personId: 'p-ok', relatedPersonIds: ['p-ok'],
    });

    engine.isOnline = () => true;
    await engine.flushQueue();

    expect(calls).toEqual([['person', 'p-bad'], ['person', 'p-ok'], ['story', 's1']]);
    const failed = await engine.getFailedMutations();
    expect(failed.map((f) => f.entityId).sort()).toEqual(['p-bad', 'r1']);
    expect(failed.find((f) => f.entityId === 'r1').error).toMatch(/Waiting on p-bad/);
    expect(engine.getStatus()).toBe(SYNC_STATUS.ERROR);
    engine.destroy();
  });

  it('does not re-run a failed mutation on later flushes', async () => {
    const { engine, calls } = makeEngine({ failPersonIds: ['p-bad'] });
    await engine.enqueue(ENTITY_TYPES.PERSON, 'p-bad', MUTATION_OP.CREATE, { id: 'p-bad' });
    engine.isOnline = () => true;
    await engine.flushQueue();
    await engine.flushQueue();

    expect(calls.filter(([, id]) => id === 'p-bad')).toHaveLength(1);
    engine.destroy();
  });

  it('retryFailed re-queues failed mutations and their dependents', async () => {
    const failing = ['p-bad'];
    const { engine, calls, adapter } = makeEngine({ failPersonIds: failing });
    await engine.enqueue(ENTITY_TYPES.PERSON, 'p-bad', MUTATION_OP.CREATE, { id: 'p-bad' });
    await engine.enqueue(ENTITY_TYPES.RELATIONSHIP, 'r1', MUTATION_OP.CREATE, {
      id: 'r1', type: 'spouse', personAId: 'p-bad', personBId: 'p-x',
    });
    engine.isOnline = () => true;
    await engine.flushQueue();
    expect(await engine.getFailedMutations()).toHaveLength(2);

    // The problem gets fixed (e.g. permissions granted); retry.
    adapter.savePerson = async (p) => {
      calls.push(['person', p.id]);
      return { ...p, uuid: `uuid-${p.id}` };
    };
    await engine.retryFailed();

    expect(await engine.getFailedMutations()).toHaveLength(0);
    expect(calls.slice(-2)).toEqual([['person', 'p-bad'], ['relationship', 'r1']]);
    expect(engine.getStatus()).toBe(SYNC_STATUS.SYNCED);
    engine.destroy();
  });

  it('a failed update does not hold back other entities that reference the person', async () => {
    const { engine, calls } = makeEngine({ failPersonIds: ['p1'] });
    await engine.enqueue(ENTITY_TYPES.PERSON, 'p1', MUTATION_OP.UPDATE, { id: 'p1' });
    await engine.enqueue(ENTITY_TYPES.STORY, 's1', MUTATION_OP.CREATE, { id: 's1', personId: 'p1' });
    engine.isOnline = () => true;
    await engine.flushQueue();

    expect(calls).toEqual([['person', 'p1'], ['story', 's1']]);
    engine.destroy();
  });
});
