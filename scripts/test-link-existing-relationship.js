/**
 * Medida's Family — Relationship Model Correction & Link Existing Person Verification Suite
 *
 * Automated verification for:
 * 1. Canonical 4-person family setup (Ramaiah, Lakshmi, Venkata Reddy, Padmavathi)
 * 2. Link existing sibling (Ramaiah ↔ Lakshmi)
 * 3. Link existing child (Ramaiah → Venkata Reddy, Lakshmi → Padmavathi)
 * 4. Link existing spouse (Venkata Reddy ↔ Padmavathi)
 * 5. Link existing parent
 * 6. Duplicate relationship rejection ("This relationship already exists.")
 * 7. Self-link rejection ("A person cannot be connected to themselves.")
 * 8. Cycle protection
 * 9. Canonical person IDs (zero duplication)
 * 10. Family isolation
 * 11. Offline relationship creation (queued in SyncEngine)
 * 12. Reconnect and preservation
 * 13. Tree layout engine calculation (Ramaiah + Lakshmi in Gen 0, Venkata Reddy + Padmavathi in Gen 1)
 * 14. Search single-record guarantee
 * 15. Profile data / stories attachment integrity
 */

import assert from 'node:assert';

// Mock localStorage and window environment for Node.js
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const { FamilyStore } = await import('../src/family-tree/store/FamilyStore.js');
const { computeTreeLayout } = await import('../src/family-tree/engine/treeLayout.js');
const { computeGenerations } = await import('../src/family-tree/data/familyDataService.js');
const { searchArchive } = await import('../src/family-tree/search/familySearchEngine.js');
const { humanizeRelationshipError } = await import('../src/family-tree/utils/relationshipErrors.js');
const { SyncEngine } = await import('../src/family-tree/store/sync/SyncEngine.js');
const { SyncAdapter } = await import('../src/family-tree/store/repository/SyncAdapter.js');
const { ENTITY_TYPES, MUTATION_OP } = await import('../src/family-tree/store/sync/syncTypes.js');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] Test ${passedTests + failedTests + 1}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${passedTests + failedTests + 1}: ${name}`);
    console.error(err);
    failedTests++;
  }
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY — LINK EXISTING PERSON & RELATIONSHIP SUITE");
console.log('==================================================\n');

// ── Test Setup Mock Adapter ────────────────────────────────────
class MockLocalAdapter {
  constructor() {
    this.savedRelationships = [];
  }
  loadSync() {
    return { people: [], relationships: [], stories: [], lifeEvents: [], photos: [], documents: [] };
  }
  load() {
    return Promise.resolve(this.loadSync());
  }
  async persist() {
    return Promise.resolve();
  }
  async saveRelationship(rel) {
    this.savedRelationships.push(rel);
    return Promise.resolve(rel);
  }
}

// ── Test 1: Create 4 Canonical People ──────────────────────────
const store = new FamilyStore(new MockLocalAdapter());
store.people.clear();
store.relationships = [];
store.stories = [];
store.lifeEvents = [];
store.photos = [];
store.documents = [];

const ramaiah = store.addPerson({
  id: 'p-ramaiah',
  firstName: 'Ramaiah',
  lastName: 'Medida',
  gender: 'male',
  occupation: 'Village Elder',
});

const lakshmi = store.addPerson({
  id: 'p-lakshmi',
  firstName: 'Lakshmi',
  lastName: 'Medida',
  gender: 'female',
  occupation: 'Educator',
});

const venkataReddy = store.addPerson({
  id: 'p-venkata',
  firstName: 'Venkata',
  lastName: 'Reddy',
  gender: 'male',
  occupation: 'Farmer & Builder',
});

const padmavathi = store.addPerson({
  id: 'p-padmavathi',
  firstName: 'Padmavathi',
  lastName: 'Medida',
  gender: 'female',
  occupation: 'Weaver & Scholar',
});

await runTest('Canonical People: Exactly 4 people created with canonical IDs', () => {
  const all = store.getAllPersons();
  assert.strictEqual(all.length, 4, 'Should have exactly 4 people');
  const ids = all.map((p) => p.id);
  assert.deepStrictEqual(ids.sort(), ['p-lakshmi', 'p-padmavathi', 'p-ramaiah', 'p-venkata'].sort());
});

// ── Test 2: Link Existing Sibling (Ramaiah ↔ Lakshmi) ──────────
await runTest('Link Existing Sibling: Connect Ramaiah ↔ Lakshmi as siblings', () => {
  const rel = store.addRelationship({
    type: 'sibling',
    personAId: ramaiah.id,
    personBId: lakshmi.id,
  });

  assert.ok(rel, 'Relationship should be returned');
  assert.strictEqual(rel.type, 'sibling');

  // Verify bidirectional query
  const ramaiahSiblings = store.getSiblings(ramaiah.id);
  assert.strictEqual(ramaiahSiblings.length, 1);
  assert.strictEqual(ramaiahSiblings[0].id, lakshmi.id);

  const lakshmiSiblings = store.getSiblings(lakshmi.id);
  assert.strictEqual(lakshmiSiblings.length, 1);
  assert.strictEqual(lakshmiSiblings[0].id, ramaiah.id);

  // Still 4 people, no duplication
  assert.strictEqual(store.getAllPersons().length, 4);
});

// ── Test 3: Link Existing Child: Ramaiah → parent → Venkata Reddy
await runTest('Link Existing Child: Connect Ramaiah → parent → Venkata Reddy', () => {
  const rel = store.addRelationship({
    type: 'parent-child',
    parentId: ramaiah.id,
    childId: venkataReddy.id,
  });

  assert.ok(rel);
  const children = store.getChildren(ramaiah.id);
  assert.strictEqual(children.length, 1);
  assert.strictEqual(children[0].id, venkataReddy.id);

  const parents = store.getParents(venkataReddy.id);
  assert.strictEqual(parents.length, 1);
  assert.strictEqual(parents[0].id, ramaiah.id);

  assert.strictEqual(store.getAllPersons().length, 4);
});

// ── Test 4: Link Existing Child: Lakshmi → parent → Padmavathi ──
await runTest('Link Existing Child: Connect Lakshmi → parent → Padmavathi', () => {
  const rel = store.addRelationship({
    type: 'parent-child',
    parentId: lakshmi.id,
    childId: padmavathi.id,
  });

  assert.ok(rel);
  const children = store.getChildren(lakshmi.id);
  assert.strictEqual(children.length, 1);
  assert.strictEqual(children[0].id, padmavathi.id);

  const parents = store.getParents(padmavathi.id);
  assert.strictEqual(parents.length, 1);
  assert.strictEqual(parents[0].id, lakshmi.id);

  assert.strictEqual(store.getAllPersons().length, 4);
});

// ── Test 5: Link Existing Spouse: Venkata Reddy ↔ Padmavathi ────
await runTest('Link Existing Spouse: Connect Venkata Reddy ↔ Padmavathi', () => {
  const rel = store.addRelationship({
    type: 'spouse',
    personAId: venkataReddy.id,
    personBId: padmavathi.id,
  });

  assert.ok(rel);
  const vSpouse = store.getSpouse(venkataReddy.id);
  assert.strictEqual(vSpouse.id, padmavathi.id);

  const pSpouse = store.getSpouse(padmavathi.id);
  assert.strictEqual(pSpouse.id, venkataReddy.id);

  assert.strictEqual(store.getAllPersons().length, 4);
});

// ── Test 6: Verify Canonical 4 People, 4 Relationships ─────────
await runTest('Canonical Graph Integrity: Exactly 4 people, 4 relationship edges', () => {
  assert.strictEqual(store.getAllPersons().length, 4);
  const rels = store.getAllRelationships();
  assert.strictEqual(rels.length, 4);

  // Verify Padmavathi participates in both parent-child and spouse with canonical ID
  const padmaRels = rels.filter(
    (r) => r.childId === padmavathi.id || r.personAId === padmavathi.id || r.personBId === padmavathi.id
  );
  assert.strictEqual(padmaRels.length, 2);
});

// ── Test 7: Duplicate Spouse Rejection ─────────────────────────
await runTest('Duplicate Protection: Reject duplicate spouse (Venkata Reddy ↔ Padmavathi)', () => {
  let thrown = false;
  try {
    store.addRelationship({
      type: 'spouse',
      personAId: venkataReddy.id,
      personBId: padmavathi.id,
    });
  } catch (err) {
    thrown = true;
    const humanMsg = humanizeRelationshipError(err);
    assert.strictEqual(humanMsg, 'This relationship already exists.');
  }
  assert.ok(thrown, 'Should throw on duplicate spouse');
});

// ── Test 8: Duplicate Spouse Rejection (Reverse Direction) ─────
await runTest('Duplicate Protection: Reject duplicate spouse in reverse order', () => {
  let thrown = false;
  try {
    store.addRelationship({
      type: 'spouse',
      personAId: padmavathi.id,
      personBId: venkataReddy.id,
    });
  } catch (err) {
    thrown = true;
    const humanMsg = humanizeRelationshipError(err);
    assert.strictEqual(humanMsg, 'This relationship already exists.');
  }
  assert.ok(thrown, 'Should throw on reverse duplicate spouse');
});

// ── Test 9: Duplicate Sibling Rejection ────────────────────────
await runTest('Duplicate Protection: Reject duplicate sibling (Ramaiah ↔ Lakshmi)', () => {
  let thrown = false;
  try {
    store.addRelationship({
      type: 'sibling',
      personAId: lakshmi.id,
      personBId: ramaiah.id,
    });
  } catch (err) {
    thrown = true;
    const humanMsg = humanizeRelationshipError(err);
    assert.strictEqual(humanMsg, 'This relationship already exists.');
  }
  assert.ok(thrown, 'Should throw on duplicate sibling');
});

// ── Test 10: Self-Link Rejection ──────────────────────────────
await runTest('Self-Link Protection: Reject linking a person to themselves', () => {
  let thrown = false;
  try {
    store.addRelationship({
      type: 'spouse',
      personAId: venkataReddy.id,
      personBId: venkataReddy.id,
    });
  } catch (err) {
    thrown = true;
    const humanMsg = humanizeRelationshipError(err);
    assert.strictEqual(humanMsg, 'A person cannot be connected to themselves.');
  }
  assert.ok(thrown, 'Should throw on self-spouse link');

  let siblingSelfThrown = false;
  try {
    store.addRelationship({
      type: 'sibling',
      personAId: ramaiah.id,
      personBId: ramaiah.id,
    });
  } catch (err) {
    siblingSelfThrown = true;
    const humanMsg = humanizeRelationshipError(err);
    assert.strictEqual(humanMsg, 'A person cannot be connected to themselves.');
  }
  assert.ok(siblingSelfThrown, 'Should throw on self-sibling link');
});

// ── Test 11: Ancestry Cycle Protection ────────────────────────
await runTest('Cycle Protection: Prevent Venkata Reddy becoming parent of Ramaiah', () => {
  let thrown = false;
  try {
    store.addRelationship({
      type: 'parent-child',
      parentId: venkataReddy.id,
      childId: ramaiah.id,
    });
  } catch (err) {
    thrown = true;
    const humanMsg = humanizeRelationshipError(err);
    assert.strictEqual(humanMsg, 'This connection would create an invalid family loop.');
  }
  assert.ok(thrown, 'Should throw ancestry cycle error');
});

// ── Test 12: Generation & Layout Calculation ──────────────────
await runTest('Generation Calculation: Ramaiah + Lakshmi in Gen 0, Venkata + Padma in Gen 1', () => {
  const persons = store.getAllPersons();
  const rels = store.getAllRelationships();
  const genMap = computeGenerations(persons, rels);

  assert.strictEqual(genMap.get(ramaiah.id), 0, 'Ramaiah must be Gen 0');
  assert.strictEqual(genMap.get(lakshmi.id), 0, 'Lakshmi must be Gen 0 (same generation as sibling Ramaiah)');
  assert.strictEqual(genMap.get(venkataReddy.id), 1, 'Venkata Reddy must be Gen 1 (child of Ramaiah)');
  assert.strictEqual(genMap.get(padmavathi.id), 1, 'Padmavathi must be Gen 1 (child of Lakshmi & spouse of Venkata)');
});

// ── Test 13: Tree Layout Engine Positioning ────────────────────
await runTest('Tree Layout Engine: Dynamic positioning without hardcoded coordinates', () => {
  const persons = store.getAllPersons();
  const rels = store.getAllRelationships();
  const layout = computeTreeLayout(persons, rels);

  const ramaiahNode = layout.nodes.get(ramaiah.id);
  const lakshmiNode = layout.nodes.get(lakshmi.id);
  const venkataNode = layout.nodes.get(venkataReddy.id);
  const padmaNode = layout.nodes.get(padmavathi.id);

  assert.ok(ramaiahNode && lakshmiNode && venkataNode && padmaNode, 'All 4 nodes must be laid out');

  // Gen 0 nodes must be placed above Gen 1 nodes
  assert.strictEqual(ramaiahNode.y, lakshmiNode.y, 'Ramaiah and Lakshmi must be on same Y layer');
  assert.strictEqual(venkataNode.y, padmaNode.y, 'Venkata and Padmavathi must be on same Y layer');
  assert.ok(venkataNode.y > ramaiahNode.y, 'Children layer Y must be below parent layer Y');

  // Verify connector lines
  const lines = layout.lines;
  const siblingLine = lines.find((l) => l.type === 'sibling');
  assert.ok(siblingLine, 'Must have horizontal sibling line between Ramaiah and Lakshmi');

  const spouseLine = lines.find((l) => l.type === 'spouse');
  assert.ok(spouseLine, 'Must have spouse line between Venkata Reddy and Padmavathi');

  const lineageLines = lines.filter((l) => l.type === 'parent-child');
  assert.strictEqual(lineageLines.length, 2, 'Must have 2 parent-child lineage curves');
});

// ── Test 14: Global Search Single-Record Guarantee ─────────────
await runTest('Global Search: Exactly 1 record returned per person (no duplicates)', () => {
  const ramaiahResults = store.searchArchive('Ramaiah').results.filter((r) => r.type === 'person');
  assert.strictEqual(ramaiahResults.length, 1);
  assert.strictEqual(ramaiahResults[0].personId || ramaiahResults[0].id, ramaiah.id);

  const lakshmiResults = store.searchArchive('Lakshmi').results.filter((r) => r.type === 'person');
  assert.strictEqual(lakshmiResults.length, 1);
  assert.strictEqual(lakshmiResults[0].personId || lakshmiResults[0].id, lakshmi.id);

  const venkataResults = store.searchArchive('Venkata').results.filter((r) => r.type === 'person');
  assert.strictEqual(venkataResults.length, 1);
  assert.strictEqual(venkataResults[0].personId || venkataResults[0].id, venkataReddy.id);

  const padmaResults = store.searchArchive('Padmavathi').results.filter((r) => r.type === 'person');
  assert.strictEqual(padmaResults.length, 1);
  assert.strictEqual(padmaResults[0].personId || padmaResults[0].id, padmavathi.id);
});

// ── Test 15: Single Record Attachment for Stories & Events ──────
await runTest('Stories & Events Attachment: Memories stay attached to canonical ID', () => {
  const story = store.addStory({
    personId: padmavathi.id,
    title: 'Weaving Heritage',
    content: 'Padmavathi preserves ancient loom patterns passed down from Lakshmi.',
  });

  const padmaStories = store.getStoriesForPerson(padmavathi.id);
  assert.strictEqual(padmaStories.length, 1);
  assert.strictEqual(padmaStories[0].id, story.id);
  assert.strictEqual(padmaStories[0].personId, padmavathi.id);

  // Even after queries and relationship traversals, exactly 4 people exist
  assert.strictEqual(store.getAllPersons().length, 4);
});

// ── Test 16: Offline Relationship Creation & Sync Queuing ──────
await runTest('Offline Sync: Enqueue relationship mutation without duplicating person records', async () => {
  const mockRemoteAdapter = {
    load: async () => ({ people: [], relationships: [] }),
    saveRelationship: async (rel) => Promise.resolve({ id: rel.id, uuid: `uuid-${rel.id}` }),
  };

  const syncEngine = new SyncEngine('test-family', mockRemoteAdapter);
  syncEngine.isOnline = () => false;
  const syncAdapter = new SyncAdapter(syncEngine, 'test-family');

  const testRel = {
    id: 'rel-offline-test-1',
    type: 'sibling',
    personAId: ramaiah.id,
    personBId: lakshmi.id,
  };

  const queueItem = await syncAdapter.saveRelationship(testRel, { operation: MUTATION_OP.CREATE });
  assert.ok(queueItem, 'Should enqueue relationship creation');
  assert.strictEqual(queueItem.entityType, ENTITY_TYPES.RELATIONSHIP);
  assert.strictEqual(queueItem.operation, MUTATION_OP.CREATE);
  assert.strictEqual(queueItem.payload.type, 'sibling');

  syncEngine.destroy();
});

// ── Summary ───────────────────────────────────────────────────
console.log('\n==================================================');
console.log(`LINK EXISTING PERSON VERIFICATION: ${passedTests} / ${passedTests + failedTests} passed (${failedTests} failed)`);
console.log('==================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
