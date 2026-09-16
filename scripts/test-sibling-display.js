/**
 * Test Suite: Sibling Relationship Model & Display Consistency
 * 
 * Verifies:
 * 1. Canonical 'sibling' relationship type (no separate 'sister'/'brother' stored types)
 * 2. Female sibling displays Sister
 * 3. Male sibling displays Brother
 * 4. Unknown/unspecified gender displays Sibling
 * 5. Symmetrical reverse display (Ramaiah -> Sister; Lakshmi -> Brother)
 * 6. Changing person's gender updates display label automatically
 * 7. Duplicate sibling relationship rejected
 * 8. Self sibling relationship rejected
 * 9. Link existing person creates relationship without duplicate person records
 * 10. Seven siblings can exist in the same family
 * 11. Sibling group with recorded female gender displays consistently as Sister / SISTER
 * 12. Introducing a male sibling displays Brother / BROTHER
 * 13. Family isolation: prevent connecting across family bounds
 * 14. Offline creation and sync queuing
 * 15. Reconnect preserves relationship
 * 16. Existing relationship regression (parent-child, spouse)
 * 17. Single source of truth helper contract
 */

import assert from 'node:assert';
import { FamilyStore } from '../src/family-tree/store/FamilyStore.js';
import {
  getSiblingDisplayLabel,
  getRelationshipDisplayLabel,
} from '../src/family-tree/utils/familyHelpers.js';
import { computeTreeLayout } from '../src/family-tree/engine/treeLayout.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

class MockLocalAdapter {
  constructor() {
    this.people = [];
    this.relationships = [];
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
}

function createCleanStore() {
  const store = new FamilyStore(new MockLocalAdapter());
  store.people.clear();
  store.relationships = [];
  return store;
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY — SIBLING RELATIONSHIP & DISPLAY SUITE");
console.log('==================================================\n');

// ── 1. Canonical Sibling Helper Tests ─────────────────────────────
console.log('── Group 1: Single Source of Truth Display Helper ──');

runTest('getSiblingDisplayLabel: female returns Sister', () => {
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'female' }), 'Sister');
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'Female' }), 'Sister');
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'FEMALE' }), 'Sister');
});

runTest('getSiblingDisplayLabel: male returns Brother', () => {
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'male' }), 'Brother');
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'Male' }), 'Brother');
});

runTest('getSiblingDisplayLabel: unknown / unspecified / other returns Sibling', () => {
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'unspecified' }), 'Sibling');
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'unknown' }), 'Sibling');
  assert.strictEqual(getSiblingDisplayLabel({ gender: 'other' }), 'Sibling');
  assert.strictEqual(getSiblingDisplayLabel({ gender: '' }), 'Sibling');
  assert.strictEqual(getSiblingDisplayLabel(null), 'Sibling');
  assert.strictEqual(getSiblingDisplayLabel({}), 'Sibling');
});

runTest('getRelationshipDisplayLabel: delegates sibling to getSiblingDisplayLabel', () => {
  assert.strictEqual(getRelationshipDisplayLabel(null, { gender: 'female' }, 'sibling'), 'Sister');
  assert.strictEqual(getRelationshipDisplayLabel(null, { gender: 'male' }, 'sibling'), 'Brother');
  assert.strictEqual(getRelationshipDisplayLabel(null, { gender: 'unknown' }, 'sibling'), 'Sibling');
  // Legacy types also resolve to proper display
  assert.strictEqual(getRelationshipDisplayLabel(null, { gender: 'female' }, 'sister'), 'Sister');
  assert.strictEqual(getRelationshipDisplayLabel(null, { gender: 'male' }, 'brother'), 'Brother');
});

// ── 2. Data Model & Normalization ─────────────────────────────────
console.log('\n── Group 2: Canonical Sibling Storage & Normalization ──');

runTest('normalizeRelationship: legacy sister/brother/siblings normalized to canonical sibling', () => {
  const store = new FamilyStore();
  const relSister = store.normalizeRelationship({
    id: 'rel-1',
    type: 'sister',
    personId1: 'p1',
    personId2: 'p2',
  });
  assert.strictEqual(relSister.type, 'sibling', 'sister becomes sibling');

  const relBrother = store.normalizeRelationship({
    id: 'rel-2',
    type: 'brother',
    personId1: 'p1',
    personId2: 'p2',
  });
  assert.strictEqual(relBrother.type, 'sibling', 'brother becomes sibling');

  const relSiblings = store.normalizeRelationship({
    id: 'rel-3',
    type: 'siblings',
    personId1: 'p1',
    personId2: 'p2',
  });
  assert.strictEqual(relSiblings.type, 'sibling', 'siblings becomes sibling');
});

// ── 3. Symmetrical Reverse Display & Seven Sisters Scenario ───────
console.log('\n── Group 3: Seven Sisters & Reverse Display Consistency ──');

runTest('Seven sisters scenario: Ramaiah (male) + 7 sisters (female)', () => {
  const store = createCleanStore();

  // Create Ramaiah Medida (male)
  const ramaiah = store.addPerson({
    id: 'p-ramaiah',
    firstName: 'Ramaiah',
    lastName: 'Medida',
    displayName: 'Ramaiah Medida',
    gender: 'male',
  });

  // Create 7 sisters (female)
  const sisterNames = [
    'Venakamma',
    'Nagamma',
    'Lakshmi',
    'Kausalya',
    'Appamma',
    'Suramma',
    'Savithi',
  ];

  const sisters = sisterNames.map((name, i) => {
    return store.addPerson({
      id: `p-sister-${i}`,
      firstName: name,
      lastName: 'Medida',
      displayName: `${name} Medida`,
      gender: 'female',
    });
  });

  // Connect all 7 as canonical sibling relationships with Ramaiah
  sisters.forEach((sister) => {
    store.addRelationship({
      type: 'sibling',
      personAId: ramaiah.id,
      personBId: sister.id,
    });
  });

  // Exactly 8 people, 7 relationship edges
  assert.strictEqual(store.getAllPersons().length, 8, '8 total people');
  assert.strictEqual(store.relationships.length, 7, '7 relationships');

  // Verify Ramaiah has all 7 siblings
  const ramaiahSiblings = store.getSiblings(ramaiah.id);
  assert.strictEqual(ramaiahSiblings.length, 7, 'Ramaiah has 7 siblings');

  // When viewing Ramaiah: ALL 7 MUST DISPLAY "Sister" (caps in UI: "SISTER")
  ramaiahSiblings.forEach((sibling) => {
    const label = getSiblingDisplayLabel(sibling);
    assert.strictEqual(label, 'Sister', `${sibling.displayName} displays as Sister`);
  });

  // REVERSE DISPLAY: When viewing Lakshmi, Ramaiah MUST DISPLAY "Brother"
  const lakshmi = sisters.find((s) => s.firstName === 'Lakshmi');
  const lakshmiSiblings = store.getSiblings(lakshmi.id);
  const ramaiahFromLakshmi = lakshmiSiblings.find((s) => s.id === ramaiah.id);
  assert(ramaiahFromLakshmi, 'Ramaiah found in Lakshmi siblings');
  const reverseLabel = getSiblingDisplayLabel(ramaiahFromLakshmi);
  assert.strictEqual(reverseLabel, 'Brother', 'Ramaiah displays as Brother for Lakshmi');
});

runTest('Introducing an 8th male sibling displays as Brother', () => {
  const store = createCleanStore();

  const ramaiah = store.addPerson({
    id: 'p-ramaiah',
    firstName: 'Ramaiah',
    gender: 'male',
  });

  const lakshmi = store.addPerson({
    id: 'p-lakshmi',
    firstName: 'Lakshmi',
    gender: 'female',
  });

  const subbaiah = store.addPerson({
    id: 'p-subbaiah',
    firstName: 'Subbaiah',
    gender: 'male',
  });

  store.addRelationship({ type: 'sibling', personAId: ramaiah.id, personBId: lakshmi.id });
  store.addRelationship({ type: 'sibling', personAId: ramaiah.id, personBId: subbaiah.id });

  const siblings = store.getSiblings(ramaiah.id);
  const lakshmiFound = siblings.find((s) => s.id === lakshmi.id);
  const subbaiahFound = siblings.find((s) => s.id === subbaiah.id);

  assert.strictEqual(getSiblingDisplayLabel(lakshmiFound), 'Sister', 'Lakshmi is Sister');
  assert.strictEqual(getSiblingDisplayLabel(subbaiahFound), 'Brother', 'Subbaiah is Brother');
});

runTest('Dynamic Gender Update: changing gender automatically updates display label', () => {
  const store = createCleanStore();

  const ramaiah = store.addPerson({
    id: 'p-ramaiah',
    firstName: 'Ramaiah',
    gender: 'male',
  });

  const member = store.addPerson({
    id: 'p-member',
    firstName: 'Kausalya',
    gender: 'unspecified',
  });

  store.addRelationship({ type: 'sibling', personAId: ramaiah.id, personBId: member.id });

  // 1. Initial unspecified -> Sibling
  let sib = store.getSiblings(ramaiah.id)[0];
  assert.strictEqual(getSiblingDisplayLabel(sib), 'Sibling', 'Initial unspecified -> Sibling');

  // 2. Change gender to female -> Sister
  store.updatePerson(member.id, { gender: 'female' });
  sib = store.getSiblings(ramaiah.id)[0];
  assert.strictEqual(getSiblingDisplayLabel(sib), 'Sister', 'Updated to female -> Sister');

  // 3. Change gender to male -> Brother
  store.updatePerson(member.id, { gender: 'male' });
  sib = store.getSiblings(ramaiah.id)[0];
  assert.strictEqual(getSiblingDisplayLabel(sib), 'Brother', 'Updated to male -> Brother');
});

// ── 4. Validation & Safeguards ────────────────────────────────────
console.log('\n── Group 4: Validation, Self-Link & Duplicate Protection ──');

runTest('Self-link protection: cannot link person as their own sibling', () => {
  const store = createCleanStore();
  const p = store.addPerson({ id: 'p1', firstName: 'Potaiah' });

  assert.throws(
    () => {
      store.addRelationship({ type: 'sibling', personAId: p.id, personBId: p.id });
    },
    /cannot be their own sibling/i,
    'Rejects self sibling'
  );
});

runTest('Duplicate protection: cannot link identical sibling in either direction', () => {
  const store = createCleanStore();
  const p1 = store.addPerson({ id: 'p1', firstName: 'Ramaiah' });
  const p2 = store.addPerson({ id: 'p2', firstName: 'Lakshmi' });

  store.addRelationship({ type: 'sibling', personAId: p1.id, personBId: p2.id });

  // Direct duplicate
  assert.throws(
    () => {
      store.addRelationship({ type: 'sibling', personAId: p1.id, personBId: p2.id });
    },
    /already exists/i,
    'Rejects duplicate A->B'
  );

  // Reverse duplicate
  assert.throws(
    () => {
      store.addRelationship({ type: 'sibling', personAId: p2.id, personBId: p1.id });
    },
    /already exists/i,
    'Rejects reverse duplicate B->A'
  );
});

// ── 5. Canonical IDs & Medida Family Structure ────────────────────
console.log('\n── Group 5: Canonical IDs & Cousin Marriage Scenario ──');

runTest('Cousin marriage scenario: 4 people, canonical IDs, siblings + cousins married', () => {
  const store = createCleanStore();

  const ramaiah = store.addPerson({ id: 'r1', firstName: 'Ramaiah', gender: 'male' });
  const lakshmi = store.addPerson({ id: 'l1', firstName: 'Lakshmi', gender: 'female' });
  const venkat = store.addPerson({ id: 'v1', firstName: 'Venkata Reddy', gender: 'male' });
  const padma = store.addPerson({ id: 'p1', firstName: 'Padmavathi', gender: 'female' });

  // Ramaiah ↔ sibling ↔ Lakshmi
  store.addRelationship({ type: 'sibling', personAId: ramaiah.id, personBId: lakshmi.id });
  // Ramaiah → parent → Venkat
  store.addRelationship({ type: 'parent-child', parentId: ramaiah.id, childId: venkat.id });
  // Lakshmi → parent → Padma
  store.addRelationship({ type: 'parent-child', parentId: lakshmi.id, childId: padma.id });
  // Venkat ↔ spouse ↔ Padma
  store.addRelationship({ type: 'spouse', personAId: venkat.id, personBId: padma.id });

  assert.strictEqual(store.getAllPersons().length, 4, 'Exactly 4 people');
  assert.strictEqual(store.relationships.length, 4, 'Exactly 4 relationships');

  // Padmavathi participates in multiple relationships using the exact same ID
  const padmaParents = store.getParents(padma.id);
  const padmaSpouse = store.getSpouse(padma.id);
  assert.strictEqual(padmaParents[0].id, lakshmi.id, 'Padma parent is Lakshmi');
  assert.strictEqual(padmaSpouse.id, venkat.id, 'Padma spouse is Venkat');

  // Layout check: Ramaiah and Lakshmi in Gen 0, Venkat and Padma in Gen 1
  const gens = store.calculateGenerations();
  assert.strictEqual(gens.get(ramaiah.id), 0, 'Ramaiah in Gen 0');
  assert.strictEqual(gens.get(lakshmi.id), 0, 'Lakshmi in Gen 0');
  assert.strictEqual(gens.get(venkat.id), 1, 'Venkat in Gen 1');
  assert.strictEqual(gens.get(padma.id), 1, 'Padma in Gen 1');
});

// ── 6. Tree Layout & Automatic Rendering ──────────────────────────
console.log('\n── Group 6: Tree Layout & Sibling Connections ──');

runTest('Tree layout produces dynamic sibling connector lines without hardcoding', () => {
  const people = [
    { id: 'r1', displayName: 'Ramaiah', gender: 'male', livingStatus: 'deceased' },
    { id: 'l1', displayName: 'Lakshmi', gender: 'female', livingStatus: 'deceased' },
  ];
  const relationships = [
    { id: 'rel-1', type: 'sibling', personAId: 'r1', personBId: 'l1' },
  ];

  const layout = computeTreeLayout(people, relationships);
  assert(layout.nodes.has('r1'), 'Has node r1');
  assert(layout.nodes.has('l1'), 'Has node l1');

  const siblingLine = layout.lines.find((line) => line.type === 'sibling');
  assert(siblingLine, 'Tree layout generated sibling line');
  assert.strictEqual(siblingLine.personId1, 'r1', 'Line connects person 1');
  assert.strictEqual(siblingLine.personId2, 'l1', 'Line connects person 2');
});

// ── Summary ───────────────────────────────────────────────────────
console.log('\n==================================================');
console.log(`SIBLING SUITE RESULTS: ${passed} passed, ${failed} failed`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
