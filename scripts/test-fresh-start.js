/**
 * test-fresh-start.js — Fresh Start & Cross-Family Contamination Verification
 *
 * Comprehensive verification of:
 * 1. Empty initial cloud family (starts with 0 people, 0 relationships).
 * 2. Zero sample-data auto-seed contamination on cloud/sync repositories.
 * 3. In-memory state clearing immediately on repository switch.
 * 4. In-flight race condition invalidation (stale load tokens discarded).
 * 5. IndexedDB family cache isolation (Family A data never returned for Family B).
 * 6. Empty family snapshot persistence in IndexedDB (clears old records instead of no-op).
 * 7. Logout cleanup (in-memory private state wiped).
 * 8. Clear Local Cache (purges IndexedDB family cache safely).
 * 9. Explicit sample data isolation (only loaded when resetToSampleData is invoked).
 * 10. Accurate member count check: adding Potaiah, Venkata Narsamma + 8 children
 *     results in exactly 10 people (not 20, 30, or ghost relatives).
 */

import assert from 'node:assert';

// Mock localStorage for Node test runner if missing
if (typeof globalThis.localStorage === 'undefined') {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => mem.get(String(k)) || null,
    setItem: (k, v) => mem.set(String(k), String(v)),
    removeItem: (k) => mem.delete(String(k)),
    clear: () => mem.clear(),
  };
}

import { FamilyStore } from '../src/family-tree/store/FamilyStore.js';
import { FamilyRepository } from '../src/family-tree/store/repository/FamilyRepository.js';
import { indexedDBManager, STORES } from '../src/family-tree/store/local/indexedDBManager.js';
import { SyncAdapter } from '../src/family-tree/store/repository/SyncAdapter.js';
import { LocalAdapter } from '../src/family-tree/store/repository/LocalAdapter.js';

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] Test ${passed + failed + 1}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${passed + failed + 1}: ${name}`);
    console.error(err);
    failed++;
  }
}

// Mock Cloud Adapter for testing
class MockCloudAdapter extends FamilyRepository {
  constructor(familyId, initialData = null) {
    super();
    this.familyId = String(familyId);
    this.data = initialData || {
      people: [],
      relationships: [],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };
  }

  async load() {
    return {
      people: [...this.data.people],
      relationships: [...this.data.relationships],
      stories: [...this.data.stories],
      lifeEvents: [...this.data.lifeEvents],
      photos: [...this.data.photos],
      documents: [...this.data.documents],
    };
  }

  async persist() {}
  async savePerson() {}
  async deletePerson() {}
  async saveRelationship() {}
  async deleteRelationship() {}
  async saveStory() {}
  async deleteStory() {}
  async saveLifeEvent() {}
  async deleteLifeEvent() {}
  async savePhoto() {}
  async deletePhoto() {}
  async saveDocument() {}
  async deleteDocument() {}
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY: FRESH START & CONTAMINATION VERIFICATION");
console.log('==================================================');

// ── Test 1: Fresh Cloud Family starts completely empty ──────────────────────
await runTest('Fresh cloud family initializes with exactly 0 people and 0 relationships', async () => {
  const mockCloud = new MockCloudAdapter('fam-fresh-01');
  const store = new FamilyStore(mockCloud);

  // Wait a tick for async load()
  await new Promise((r) => setTimeout(r, 50));

  assert.strictEqual(store.getPeopleCount(), 0, 'People count should be 0');
  assert.strictEqual(store.getAllRelationships().length, 0, 'Relationships should be 0');
  assert.strictEqual(store.stories.length, 0, 'Stories should be 0');
});

// ── Test 2: Zero sample auto-seed contamination ─────────────────────────────
await runTest('Cloud repository never receives automatic sample/seed people', async () => {
  const mockCloud = new MockCloudAdapter('fam-fresh-02');
  const store = new FamilyStore(mockCloud);
  await new Promise((r) => setTimeout(r, 50));

  // Verify none of the 20 sample people exist
  assert.strictEqual(store.getPersonById('gg-ramaiah'), null, 'Sample person gg-ramaiah must not exist');
  assert.strictEqual(store.getPersonById('g-venkat'), null, 'Sample person g-venkat must not exist');
  assert.strictEqual(store.getPersonById('p-suresh'), null, 'Sample person p-suresh must not exist');
  assert.strictEqual(store.getPeopleCount(), 0);
});

// ── Test 3: In-memory state cleared immediately on repository switch ─────────
await runTest('Switching repository clears in-memory state immediately (zero lingering state)', async () => {
  const store = new FamilyStore(new MockCloudAdapter('fam-switch-01'));
  await new Promise((r) => setTimeout(r, 20));

  // Add a person to the first family
  store.addPerson({ id: 'p-initial', firstName: 'Temporary', lastName: 'Member' });
  assert.strictEqual(store.getPeopleCount(), 1);

  // Now switch repository to a second family with delayed async load
  class DelayedEmptyRepo extends FamilyRepository {
    async load() {
      await new Promise((r) => setTimeout(r, 80));
      return { people: [], relationships: [], stories: [], lifeEvents: [], photos: [], documents: [] };
    }
    async persist() {}
    async savePerson() {}
    async deletePerson() {}
  }

  store.setRepository(new DelayedEmptyRepo());

  // IMMEDIATELY after setRepository (before load finishes), memory MUST be wiped
  assert.strictEqual(store.getPeopleCount(), 0, 'People count must be 0 immediately after setRepository');
  assert.strictEqual(store.getPersonById('p-initial'), null, 'Old person must not be accessible');

  await new Promise((r) => setTimeout(r, 100));
  assert.strictEqual(store.getPeopleCount(), 0);
});

// ── Test 4: In-flight async race conditions are discarded ───────────────────
await runTest('In-flight async loads from previous repository are discarded via load tokens', async () => {
  const store = new FamilyStore(new MockCloudAdapter('fam-race-base'));
  await new Promise((r) => setTimeout(r, 20));

  // Repo 1 is slow and returns old data after 100ms
  class SlowOldRepo extends FamilyRepository {
    async load() {
      await new Promise((r) => setTimeout(r, 100));
      return {
        people: [{ id: 'p-stale', firstName: 'StaleOld', lastName: 'Person' }],
        relationships: [],
        stories: [],
        lifeEvents: [],
        photos: [],
        documents: [],
      };
    }
    async persist() {}
    async savePerson() {}
  }

  // Repo 2 is fast and returns fresh empty data after 30ms
  class FastNewRepo extends FamilyRepository {
    async load() {
      await new Promise((r) => setTimeout(r, 30));
      return {
        people: [{ id: 'p-new', firstName: 'FreshNew', lastName: 'Person' }],
        relationships: [],
        stories: [],
        lifeEvents: [],
        photos: [],
        documents: [],
      };
    }
    async persist() {}
    async savePerson() {}
  }

  store.setRepository(new SlowOldRepo());
  // User rapidly switches to FastNewRepo before SlowOldRepo completes
  store.setRepository(new FastNewRepo());

  // Wait for both to complete
  await new Promise((r) => setTimeout(r, 150));

  // The store MUST contain p-new, and NEVER p-stale
  assert.strictEqual(store.getPeopleCount(), 1);
  assert.strictEqual(store.getPersonById('p-stale'), null, 'Stale slow data must not contaminate new repo');
  assert.notStrictEqual(store.getPersonById('p-new'), null, 'Fresh data must be authoritative');
});

// ── Test 5: IndexedDB family cache boundary isolation ───────────────────────
await runTest('IndexedDB isolates cache between Family A and Family B', async () => {
  const fidA = 'fam-iso-A';
  const fidB = 'fam-iso-B';

  await indexedDBManager.clearAllFamilyData(fidA);
  await indexedDBManager.clearAllFamilyData(fidB);

  // Put records for Family A
  await indexedDBManager.putBatch(STORES.PEOPLE, [
    { id: 'person-A1', family_id: fidA, displayName: 'Member A1' },
    { id: 'person-A2', family_id: fidA, displayName: 'Member A2' },
  ]);

  // Put records for Family B
  await indexedDBManager.putBatch(STORES.PEOPLE, [
    { id: 'person-B1', family_id: fidB, displayName: 'Member B1' },
  ]);

  const cachedA = await indexedDBManager.getAllByFamily(STORES.PEOPLE, fidA);
  const cachedB = await indexedDBManager.getAllByFamily(STORES.PEOPLE, fidB);

  assert.strictEqual(cachedA.length, 2, 'Family A should have 2 members');
  assert.strictEqual(cachedB.length, 1, 'Family B should have 1 member');
  assert.strictEqual(cachedA.every((p) => (p.family_id || p.familyId) === fidA), true);
  assert.strictEqual(cachedB.every((p) => (p.family_id || p.familyId) === fidB), true);
});

// ── Test 6: Empty family snapshot clears old IndexedDB records ──────────────
await runTest('Empty family snapshot properly clears cached records in IndexedDB', async () => {
  const fid = 'fam-empty-clear-test';
  await indexedDBManager.clearAllFamilyData(fid);

  const syncAdapter = new SyncAdapter(fid, null);

  // Persist snapshot with 2 people
  await syncAdapter.persist({
    people: [
      { id: 'p1', displayName: 'P1' },
      { id: 'p2', displayName: 'P2' },
    ],
    relationships: [],
    stories: [],
    lifeEvents: [],
    photos: [],
    documents: [],
  });

  let cached = await indexedDBManager.getAllByFamily(STORES.PEOPLE, fid);
  assert.strictEqual(cached.length, 2, 'Should cache 2 people initially');

  // Now persist empty snapshot
  await syncAdapter.persist({
    people: [],
    relationships: [],
    stories: [],
    lifeEvents: [],
    photos: [],
    documents: [],
  });

  cached = await indexedDBManager.getAllByFamily(STORES.PEOPLE, fid);
  assert.strictEqual(cached.length, 0, 'Cached people must be 0 after empty persist');
});

// ── Test 7: Clear Local Cache purges all stores for family ──────────────────
await runTest('clearAllFamilyData purges entity caches, queues, and metadata for family', async () => {
  const fid = 'fam-cache-purge-test';

  await indexedDBManager.put(STORES.PEOPLE, { id: 'p-test', family_id: fid });
  await indexedDBManager.put(STORES.SYNC_QUEUE, { id: 'q-test', familyId: fid });
  await indexedDBManager.put(STORES.TOMBSTONES, { id: 't-test', familyId: fid });

  await indexedDBManager.clearAllFamilyData(fid);

  const people = await indexedDBManager.getAllByFamily(STORES.PEOPLE, fid);
  const queue = await indexedDBManager.getAllByFamily(STORES.SYNC_QUEUE, fid);
  const tombstones = await indexedDBManager.getAllByFamily(STORES.TOMBSTONES, fid);

  assert.strictEqual(people.length, 0, 'People should be cleared');
  assert.strictEqual(queue.length, 0, 'Queue should be cleared');
  assert.strictEqual(tombstones.length, 0, 'Tombstones should be cleared');
});

// ── Test 8: Logout clean-up wipes in-memory private family data ──────────────
await runTest('Logout clean-up ensures private family data is completely wiped from store', async () => {
  const mockCloud = new MockCloudAdapter('fam-logout-test', {
    people: [{ id: 'secret-1', firstName: 'Private', lastName: 'Member' }],
    relationships: [],
    stories: [],
    lifeEvents: [],
    photos: [],
    documents: [],
  });

  const store = new FamilyStore(mockCloud);
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(store.getPeopleCount(), 1);

  // Simulate logout cleanup as performed in FamilyContext
  store.loadFromData([], [], [], [], [], []);
  store.setRepository(new LocalAdapter());

  assert.strictEqual(store.getPersonById('secret-1'), null, 'Private member must not exist after logout');
});

// ── Test 9: Explicit sample data only on explicit reset ─────────────────────
await runTest('Sample data only loads when explicitly requested via resetToSampleData', async () => {
  const store = new FamilyStore(new MockCloudAdapter('fam-explicit-sample'));
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(store.getPeopleCount(), 0);

  // User explicitly chooses to reset to sample data
  store.resetToSampleData();
  assert.strictEqual(store.getPeopleCount(), 20, 'Explicit reset should populate 20 sample members');
  assert.notStrictEqual(store.getPersonById('gg-ramaiah'), null);
});

// ── Test 10: Accurate Count Check (Potaiah + Venkata Narsamma + 8 Children) ──
await runTest('Adding Potaiah + Venkata Narsamma + 8 children yields EXACTLY 10 people', async () => {
  const fid = 'fam-medida-real-entry';
  await indexedDBManager.clearAllFamilyData(fid);

  const mockCloud = new MockCloudAdapter(fid);
  const store = new FamilyStore(mockCloud);
  await new Promise((r) => setTimeout(r, 50));

  assert.strictEqual(store.getPeopleCount(), 0, 'Starts with exactly 0 people');

  // 1. Add Parents
  const potaiah = store.addPerson({
    id: 'potaiah',
    firstName: 'Potaiah',
    lastName: 'Medida',
    gender: 'male',
  });

  const venkataNarsamma = store.addPerson({
    id: 'venkata-narsamma',
    firstName: 'Venkata Narsamma',
    lastName: 'Medida',
    gender: 'female',
  });

  store.addRelationship({
    type: 'spouse',
    personAId: potaiah.id,
    personBId: venkataNarsamma.id,
  });

  assert.strictEqual(store.getPeopleCount(), 2, 'Exactly 2 people after adding parents');

  // 2. Add the 8 Children
  const childrenNames = [
    'Venakamma',
    'Nagamma',
    'Ramaiah',
    'Lakshmi Singireddy',
    'Kausalya',
    'Appamma',
    'Suramma',
    'Savithi',
  ];

  childrenNames.forEach((childName, idx) => {
    const child = store.addPerson({
      id: `child-${idx + 1}`,
      firstName: childName,
      lastName: 'Medida',
      gender: idx === 2 ? 'male' : 'female',
    });

    // Link child to father
    store.addRelationship({
      type: 'parent-child',
      parentId: potaiah.id,
      childId: child.id,
    });

    // Link child to mother
    store.addRelationship({
      type: 'parent-child',
      parentId: venkataNarsamma.id,
      childId: child.id,
    });
  });

  // Strict Count Check: Exactly 10 people (2 parents + 8 children)
  assert.strictEqual(store.getPeopleCount(), 10, 'Must have EXACTLY 10 people, NOT 20, 30, or ghost records');

  // Verify none of the old sample records exist
  assert.strictEqual(store.getPersonById('gg-ramaiah'), null);
  assert.strictEqual(store.getPersonById('g-venkat'), null);
  assert.strictEqual(store.getPersonById('p-suresh'), null);
  assert.strictEqual(store.getPersonById('c-priya'), null);

  // Verify all 10 added members are intact
  assert.strictEqual(store.getPersonById('potaiah').firstName, 'Potaiah');
  assert.strictEqual(store.getPersonById('venkata-narsamma').firstName, 'Venkata Narsamma');
  childrenNames.forEach((childName, idx) => {
    assert.strictEqual(store.getPersonById(`child-${idx + 1}`).firstName, childName);
  });
});

console.log('==================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} tests passed`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
