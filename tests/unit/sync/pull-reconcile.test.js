import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from '../../../src/family-tree/store/sync/SyncEngine.js';
import { indexedDBManager, STORES } from '../../../src/family-tree/store/local/indexedDBManager.js';
import { ENTITY_TYPES, MUTATION_OP, createQueueItem } from '../../../src/family-tree/store/sync/syncTypes.js';
import { localizePersonReferences } from '../../../src/family-tree/store/repository/SupabaseAdapter.js';

const FID = 'family-pull';

function person(id, extra = {}) {
  return { id, uuid: `uuid-${id}`, firstName: id, familyId: FID, family_id: FID, updatedAt: '2026-01-01T00:00:00Z', ...extra };
}

function makeEngine(remote) {
  const adapter = {
    load: async () => ({
      people: [],
      relationships: [],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
      ...remote,
    }),
  };
  const engine = new SyncEngine(FID, adapter);
  engine.isOnline = () => true;
  return engine;
}

async function queuePending(entityType, entityId, operation) {
  await indexedDBManager.enqueue(createQueueItem({ familyId: FID, entityType, entityId, operation, payload: {} }));
}

describe('SyncEngine pull reconciliation', () => {
  beforeEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  afterEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  it('removes a cached person that a collaborator deleted in the cloud', async () => {
    await indexedDBManager.putBatch(STORES.PEOPLE, [person('p1'), person('p2')]);
    const engine = makeEngine({ people: [person('p1')] });

    const result = await engine.pullRemoteChanges();

    expect(result.people.map((p) => p.id)).toEqual(['p1']);
    const cached = await indexedDBManager.getAllByFamily(STORES.PEOPLE, FID);
    expect(cached.map((p) => p.id)).toEqual(['p1']);
    engine.destroy();
  });

  it('removes deleted relationships, stories and photos too', async () => {
    await indexedDBManager.putBatch(STORES.PEOPLE, [person('p1'), person('p2')]);
    await indexedDBManager.putBatch(STORES.RELATIONSHIPS, [
      { id: 'r1', type: 'spouse', personAId: 'p1', personBId: 'p2', familyId: FID },
    ]);
    await indexedDBManager.putBatch(STORES.STORIES, [{ id: 's1', personId: 'p1', familyId: FID }]);
    await indexedDBManager.putBatch(STORES.PHOTOS, [{ id: 'ph1', personId: 'p1', familyId: FID }]);
    const engine = makeEngine({ people: [person('p1'), person('p2')] });

    const result = await engine.pullRemoteChanges();

    expect(result.relationships).toEqual([]);
    expect(result.stories).toEqual([]);
    expect(result.photos).toEqual([]);
    expect(await indexedDBManager.getAllByFamily(STORES.STORIES, FID)).toEqual([]);
    engine.destroy();
  });

  it('keeps a person created offline whose create is still queued', async () => {
    await indexedDBManager.putBatch(STORES.PEOPLE, [person('p1'), person('offline-new')]);
    await queuePending(ENTITY_TYPES.PERSON, 'offline-new', MUTATION_OP.CREATE);
    const engine = makeEngine({ people: [person('p1')] });

    const result = await engine.pullRemoteChanges();

    expect(result.people.map((p) => p.id).sort()).toEqual(['offline-new', 'p1']);
    engine.destroy();
  });

  it('does not resurrect a person deleted locally but not yet pushed', async () => {
    await indexedDBManager.putBatch(STORES.PEOPLE, [person('p1')]);
    await indexedDBManager.addTombstone({ id: 'p2', familyId: FID, entityType: ENTITY_TYPES.PERSON });
    const engine = makeEngine({ people: [person('p1'), person('p2')] });

    const result = await engine.pullRemoteChanges();

    expect(result.people.map((p) => p.id)).toEqual(['p1']);
    engine.destroy();
  });

  it('takes the cloud version when there is no pending local edit', async () => {
    await indexedDBManager.putBatch(STORES.PEOPLE, [person('p1', { occupation: 'Old', updatedAt: '2030-01-01T00:00:00Z' })]);
    const engine = makeEngine({ people: [person('p1', { occupation: 'New' })] });

    const result = await engine.pullRemoteChanges();

    expect(result.people[0].occupation).toBe('New');
    engine.destroy();
  });

  it('keeps a pending local edit over the cloud version', async () => {
    await indexedDBManager.putBatch(STORES.PEOPLE, [person('p1', { occupation: 'Local', updatedAt: '2026-02-01T00:00:00Z' })]);
    await queuePending(ENTITY_TYPES.PERSON, 'p1', MUTATION_OP.UPDATE);
    const engine = makeEngine({ people: [person('p1', { occupation: 'Remote' })] });

    const result = await engine.pullRemoteChanges();

    expect(result.people[0].occupation).toBe('Local');
    engine.destroy();
  });

  it('notifies remote-data listeners with the reconciled snapshot', async () => {
    const engine = makeEngine({ people: [person('p1')] });
    const received = [];
    engine.onRemoteData((data) => received.push(data));

    await engine.pullRemoteChanges();

    expect(received).toHaveLength(1);
    expect(received[0].people.map((p) => p.id)).toEqual(['p1']);
    engine.destroy();
  });
});

describe('localizePersonReferences', () => {
  it('rewrites person UUID references to local IDs', () => {
    const data = localizePersonReferences({
      people: [
        { id: 'person-a', uuid: 'uuid-a' },
        { id: 'person-b', uuid: 'uuid-b' },
      ],
      relationships: [
        { id: 'rel-1', type: 'parent-child', parentId: 'uuid-a', childId: 'uuid-b', personId1: 'uuid-a', personId2: 'uuid-b' },
        { id: 'rel-2', type: 'spouse', personAId: 'uuid-a', personBId: 'uuid-b' },
      ],
      stories: [{ id: 'story-1', personId: 'uuid-a', relatedPersonIds: ['uuid-a', 'uuid-b'] }],
      lifeEvents: [{ id: 'event-1', personId: 'uuid-b', relatedPersonIds: [] }],
      photos: [{ id: 'photo-1', personId: 'uuid-a', relatedPersonIds: ['uuid-b'] }],
      documents: [{ id: 'doc-1', personId: 'uuid-b' }],
      siblingOrder: { cohort: ['uuid-b', 'uuid-a'] },
    });

    expect(data.relationships[0]).toMatchObject({ parentId: 'person-a', childId: 'person-b', personId1: 'person-a', personId2: 'person-b' });
    expect(data.relationships[1]).toMatchObject({ personAId: 'person-a', personBId: 'person-b' });
    expect(data.stories[0]).toMatchObject({ personId: 'person-a', relatedPersonIds: ['person-a', 'person-b'] });
    expect(data.lifeEvents[0].personId).toBe('person-b');
    expect(data.photos[0].relatedPersonIds).toEqual(['person-b']);
    expect(data.documents[0].personId).toBe('person-b');
    expect(data.siblingOrder.cohort).toEqual(['person-b', 'person-a']);
  });

  it('leaves unknown references unchanged', () => {
    const data = localizePersonReferences({
      people: [],
      relationships: [{ id: 'rel-1', parentId: 'uuid-x', childId: 'uuid-y' }],
    });
    expect(data.relationships[0]).toMatchObject({ parentId: 'uuid-x', childId: 'uuid-y' });
  });
});
