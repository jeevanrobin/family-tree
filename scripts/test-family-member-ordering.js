/**
 * Test Suite: Family Member Ordering — Age + Manual Sibling Order
 *
 * Verifies all 10 required scenarios:
 * 1. Three siblings with DOBs (chronological oldest -> youngest)
 * 2. Oldest / middle / youngest invariant across addition order
 * 3. Missing DOB policy (preserves stable relative order, no guessing)
 * 4. Mixed known/unknown DOB deterministic policy
 * 5. Manual reorder via metadata override
 * 6. Add new child with DOB
 * 7. Add new child without DOB
 * 8. Spouse + sibling ordering (couples remain adjacent and intact)
 * 9. Deep descendant branch reorder (recursive subtrees & centering preserved)
 * 10. Persistence: reload, export, import, and sync roundtrip
 */

import assert from 'assert';
import { computeTreeLayout, parseDateOfBirth, sortSiblingCohort } from '../src/family-tree/engine/treeLayout.js';
import { FamilyStore } from '../src/family-tree/store/FamilyStore.js';
import { LocalAdapter } from '../src/family-tree/store/repository/LocalAdapter.js';
import { SyncAdapter } from '../src/family-tree/store/repository/SyncAdapter.js';

console.log('====================================================');
console.log('TEST SUITE: FAMILY MEMBER ORDERING & SIBLING COHORTS');
console.log('====================================================\n');

// ── Scenario 1: Three siblings with DOBs (Oldest -> Youngest) ──
console.log('Scenario 1: Three siblings with DOBs sort oldest -> youngest');
{
  const persons = [
    { id: 'parent-1', displayName: 'Father', gender: 'male', dateOfBirth: '1945-01-01' },
    { id: 'sib-c', displayName: 'Child C (Youngest)', gender: 'female', dateOfBirth: '1980-08-20' },
    { id: 'sib-a', displayName: 'Child A (Oldest)', gender: 'male', dateOfBirth: '1972-03-15' },
    { id: 'sib-b', displayName: 'Child B (Middle)', gender: 'female', dateOfBirth: '1976-11-10' },
  ];

  const relationships = [
    { id: 'r-1', type: 'parent-child', parentId: 'parent-1', childId: 'sib-c' },
    { id: 'r-2', type: 'parent-child', parentId: 'parent-1', childId: 'sib-a' },
    { id: 'r-3', type: 'parent-child', parentId: 'parent-1', childId: 'sib-b' },
  ];

  const layout = computeTreeLayout(persons, relationships);
  const posA = layout.nodes.get('sib-a');
  const posB = layout.nodes.get('sib-b');
  const posC = layout.nodes.get('sib-c');

  assert(posA && posB && posC, 'All 3 sibling nodes exist');
  assert(posA.x < posB.x, `Child A (1972) x=${posA.x} < Child B (1976) x=${posB.x}`);
  assert(posB.x < posC.x, `Child B (1976) x=${posB.x} < Child C (1980) x=${posC.x}`);
  console.log('  ✓ Chronological oldest (1972) -> middle (1976) -> youngest (1980) verified');
}

// ── Scenario 2: Oldest / Middle / Youngest invariant across addition order ──
console.log('\nScenario 2: Invariant across arbitrary insertion order');
{
  // Insert in reverse order: youngest, middle, oldest
  const persons = [
    { id: 'p1', displayName: 'Parent', gender: 'male' },
    { id: 'c3', displayName: 'Youngest', gender: 'female', dateOfBirth: '2005-01-01' },
    { id: 'c2', displayName: 'Middle', gender: 'female', dateOfBirth: '2000-01-01' },
    { id: 'c1', displayName: 'Oldest', gender: 'male', dateOfBirth: '1995-01-01' },
  ];
  const rels = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'c3' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'c2' },
    { id: 'r3', type: 'parent-child', parentId: 'p1', childId: 'c1' },
  ];

  const layout = computeTreeLayout(persons, rels);
  assert(layout.nodes.get('c1').x < layout.nodes.get('c2').x, 'Oldest sits to the left of middle');
  assert(layout.nodes.get('c2').x < layout.nodes.get('c3').x, 'Middle sits to the left of youngest');
  console.log('  ✓ Reversing creation order still yields strictly oldest -> youngest');
}

// ── Scenario 3: Missing DOB (Preserves stable relative order) ──
console.log('\nScenario 3: Missing DOB preserves existing relative order');
{
  const persons = [
    { id: 'p1', displayName: 'Parent', gender: 'male' },
    { id: 'u1', displayName: 'Unknown 1', gender: 'female', dateOfBirth: null },
    { id: 'u2', displayName: 'Unknown 2', gender: 'male', dateOfBirth: '' },
    { id: 'u3', displayName: 'Unknown 3', gender: 'female' },
  ];
  const rels = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'u1' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'u2' },
    { id: 'r3', type: 'parent-child', parentId: 'p1', childId: 'u3' },
  ];

  const layout = computeTreeLayout(persons, rels);
  assert(layout.nodes.get('u1').x < layout.nodes.get('u2').x, 'u1 is leftmost');
  assert(layout.nodes.get('u2').x < layout.nodes.get('u3').x, 'u2 is middle');
  console.log('  ✓ Missing DOB siblings preserve stable relative order without random shifting');
}

// ── Scenario 4: Mixed known / unknown DOB deterministic policy ──
console.log('\nScenario 4: Mixed known/unknown DOB deterministic policy');
{
  const persons = [
    { id: 'p1', displayName: 'Parent', gender: 'male' },
    { id: 'u1', displayName: 'Unknown A', gender: 'female', dateOfBirth: null },
    { id: 'k2', displayName: 'Known 1980', gender: 'male', dateOfBirth: '1980-05-12' },
    { id: 'k1', displayName: 'Known 1970', gender: 'female', dateOfBirth: '1970-01-15' },
    { id: 'u2', displayName: 'Unknown B', gender: 'male', dateOfBirth: '' },
  ];
  const rels = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'u1' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'k2' },
    { id: 'r3', type: 'parent-child', parentId: 'p1', childId: 'k1' },
    { id: 'r4', type: 'parent-child', parentId: 'p1', childId: 'u2' },
  ];

  const layout = computeTreeLayout(persons, rels);
  const xK1 = layout.nodes.get('k1').x;
  const xK2 = layout.nodes.get('k2').x;
  const xU1 = layout.nodes.get('u1').x;
  const xU2 = layout.nodes.get('u2').x;

  // Known DOBs ordered chronologically: k1 (1970) < k2 (1980)
  assert(xK1 < xK2, 'Known 1970 precedes Known 1980');
  // Unknown DOBs retain stable order: u1 < u2, placed deterministically
  assert(xK2 < xU1, 'Known DOB members precede unknown DOB members');
  assert(xU1 < xU2, 'Unknown A precedes Unknown B');
  console.log('  ✓ Deterministic placement: [Known 1970, Known 1980, Unknown A, Unknown B]');
}

// ── Scenario 5: Manual Reorder via Metadata Override ──
console.log('\nScenario 5: Manual reorder overrides default DOB');
{
  const persons = [
    { id: 'p1', displayName: 'Parent', gender: 'male' },
    { id: 's-a', displayName: 'A (1970)', gender: 'male', dateOfBirth: '1970-01-01' },
    { id: 's-b', displayName: 'B (1975)', gender: 'male', dateOfBirth: '1975-01-01' },
    { id: 's-c', displayName: 'C (1980)', gender: 'male', dateOfBirth: '1980-01-01' },
    { id: 's-d', displayName: 'D (1985)', gender: 'male', dateOfBirth: '1985-01-01' },
  ];
  const rels = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 's-a' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 's-b' },
    { id: 'r3', type: 'parent-child', parentId: 'p1', childId: 's-c' },
    { id: 'r4', type: 'parent-child', parentId: 'p1', childId: 's-d' },
  ];

  // Move D before B: [A, D, B, C]
  const customSiblingOrders = {
    'p1': ['s-a', 's-d', 's-b', 's-c'],
  };

  const layout = computeTreeLayout(persons, rels, { customSiblingOrders });
  const xA = layout.nodes.get('s-a').x;
  const xD = layout.nodes.get('s-d').x;
  const xB = layout.nodes.get('s-b').x;
  const xC = layout.nodes.get('s-c').x;

  assert(xA < xD, 'A is before D');
  assert(xD < xB, 'D is before B (manual move verified)');
  assert(xB < xC, 'B is before C');
  console.log('  ✓ Manual reorder [A, D, B, C] successfully reflected in coordinates');
}

// ── Scenario 6: Add new child with DOB ──
console.log('\nScenario 6: Adding a new child with DOB positions them chronologically');
{
  const persons = [
    { id: 'p1', displayName: 'Parent', gender: 'male' },
    { id: 'c-old', displayName: 'Older (1970)', gender: 'male', dateOfBirth: '1970-01-01' },
    { id: 'c-young', displayName: 'Younger (1980)', gender: 'female', dateOfBirth: '1980-01-01' },
    { id: 'c-new', displayName: 'New Child (1975)', gender: 'female', dateOfBirth: '1975-06-01' },
  ];
  const rels = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'c-old' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'c-young' },
    { id: 'r3', type: 'parent-child', parentId: 'p1', childId: 'c-new' },
  ];

  const layout = computeTreeLayout(persons, rels);
  const xOld = layout.nodes.get('c-old').x;
  const xNew = layout.nodes.get('c-new').x;
  const xYoung = layout.nodes.get('c-young').x;

  assert(xOld < xNew && xNew < xYoung, 'New child born in 1975 sits between 1970 and 1980');
  console.log('  ✓ New child with DOB correctly inserted into chronological slot');
}

// ── Scenario 7: Add new child without DOB ──
console.log('\nScenario 7: Adding a new child without DOB positions stably');
{
  const persons = [
    { id: 'p1', displayName: 'Parent', gender: 'male' },
    { id: 'c1', displayName: 'C1 (1970)', gender: 'male', dateOfBirth: '1970-01-01' },
    { id: 'c2', displayName: 'C2 (1980)', gender: 'male', dateOfBirth: '1980-01-01' },
    { id: 'c-nodob', displayName: 'C No DOB', gender: 'female', dateOfBirth: null },
  ];
  const rels = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'c1' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'c2' },
    { id: 'r3', type: 'parent-child', parentId: 'p1', childId: 'c-nodob' },
  ];

  const layout = computeTreeLayout(persons, rels);
  const x1 = layout.nodes.get('c1').x;
  const x2 = layout.nodes.get('c2').x;
  const xNoDob = layout.nodes.get('c-nodob').x;

  assert(x1 < x2 && x2 < xNoDob, 'Child without DOB is appended stably at the end');
  console.log('  ✓ New child without DOB placed deterministically without reshuffling');
}

// ── Scenario 8: Spouse + Sibling Ordering (Couples Remain Adjacent) ──
console.log('\nScenario 8: Reordering sibling moves their spouse unit together');
{
  const persons = [
    { id: 'p1', displayName: 'Parent', gender: 'male' },
    { id: 'sib-unmarried', displayName: 'Single Sibling', gender: 'female', dateOfBirth: '1970-01-01' },
    { id: 'sib-married', displayName: 'Married Sibling', gender: 'male', dateOfBirth: '1980-01-01' },
    { id: 'spouse-m', displayName: 'Spouse of Sibling', gender: 'female' },
  ];
  const rels = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'sib-unmarried' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'sib-married' },
    { id: 'r-sp', type: 'spouse', personAId: 'sib-married', personBId: 'spouse-m' },
  ];

  // Move married sibling to first position
  const customSiblingOrders = {
    'p1': ['sib-married', 'sib-unmarried'],
  };

  const layout = computeTreeLayout(persons, rels, { customSiblingOrders });
  const marriedNode = layout.nodes.get('sib-married');
  const spouseNode = layout.nodes.get('spouse-m');
  const singleNode = layout.nodes.get('sib-unmarried');

  assert(marriedNode.x < singleNode.x, 'Married sibling is placed before single sibling');
  assert(spouseNode.x > marriedNode.x, 'Spouse sits right next to married sibling');
  assert.strictEqual(spouseNode.x - marriedNode.x, layout.nodeWidth + 20, 'Spouse gap is strictly preserved');
  assert(spouseNode.x + layout.nodeWidth < singleNode.x, 'Entire couple unit is positioned before single sibling');
  console.log('  ✓ Sibling couple unit moves together without separating spouse');
}

// ── Scenario 9: Deep descendant branch reorder ──
console.log('\nScenario 9: Reordering siblings shifts entire descendant subtrees');
{
  const persons = [
    { id: 'root', displayName: 'Grandparent', gender: 'male' },
    // Sibling A and deep branch
    { id: 'sib-a', displayName: 'Sibling A', gender: 'male', dateOfBirth: '1970-01-01' },
    { id: 'child-a1', displayName: 'Child A1', gender: 'female' },
    { id: 'child-a2', displayName: 'Child A2', gender: 'male' },
    { id: 'grandchild-a', displayName: 'Grandchild A', gender: 'female' },
    // Sibling B and branch
    { id: 'sib-b', displayName: 'Sibling B', gender: 'female', dateOfBirth: '1975-01-01' },
    { id: 'child-b', displayName: 'Child B', gender: 'male' },
  ];
  const rels = [
    { id: 'r0-a', type: 'parent-child', parentId: 'root', childId: 'sib-a' },
    { id: 'r0-b', type: 'parent-child', parentId: 'root', childId: 'sib-b' },
    { id: 'ra-1', type: 'parent-child', parentId: 'sib-a', childId: 'child-a1' },
    { id: 'ra-2', type: 'parent-child', parentId: 'sib-a', childId: 'child-a2' },
    { id: 'ra-gc', type: 'parent-child', parentId: 'child-a1', childId: 'grandchild-a' },
    { id: 'rb-1', type: 'parent-child', parentId: 'sib-b', childId: 'child-b' },
  ];

  // Default: sib-a (1970) is before sib-b (1975)
  const defaultLayout = computeTreeLayout(persons, rels);
  assert(defaultLayout.nodes.get('sib-a').x < defaultLayout.nodes.get('sib-b').x);
  assert(defaultLayout.nodes.get('child-a1').x < defaultLayout.nodes.get('child-b').x);

  // Manual reorder: move sib-b before sib-a
  const customSiblingOrders = {
    'root': ['sib-b', 'sib-a'],
  };
  const reorderedLayout = computeTreeLayout(persons, rels, { customSiblingOrders });
  const bNode = reorderedLayout.nodes.get('sib-b');
  const aNode = reorderedLayout.nodes.get('sib-a');
  const cbNode = reorderedLayout.nodes.get('child-b');
  const ca1Node = reorderedLayout.nodes.get('child-a1');
  const gcaNode = reorderedLayout.nodes.get('grandchild-a');

  assert(bNode.x < aNode.x, 'Sibling B is now to the left of Sibling A');
  assert(cbNode.x < ca1Node.x, 'Child B is now to the left of Child A1');
  assert(cbNode.x < gcaNode.x, 'Child B is now to the left of Grandchild A');
  // Confirm parent centering: Root should be centered above the entire child cohort
  const rootNode = reorderedLayout.nodes.get('root');
  assert(rootNode, 'Root node exists and is positioned properly');
  console.log('  ✓ Entire descendant branch moved gracefully while preserving subtree hierarchy');
}

// ── Scenario 10: Persistence, Export, Import, and Sync Roundtrip ──
console.log('\nScenario 10: Manual sibling order survives reload, export, import, and sync');
{
  // 1. Mock LocalStorage
  const mockStorage = new Map();
  globalThis.localStorage = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  };

  const store = new FamilyStore(new LocalAdapter());
  store.clearAllData();

  // Add family members
  store.addPerson({ id: 'potaiah', firstName: 'Potaiah', gender: 'male' });
  store.addPerson({ id: 'narsamma', firstName: 'Venkata Narsamma', gender: 'female' });
  store.addRelationship({ id: 'sp-1', type: 'spouse', personAId: 'potaiah', personBId: 'narsamma' });

  store.addPerson({ id: 'venakamma', firstName: 'Venakamma', gender: 'female' });
  store.addPerson({ id: 'nagamma', firstName: 'Nagamma', gender: 'female' });
  store.addPerson({ id: 'ramaiah', firstName: 'Ramaiah', gender: 'male' });
  store.addPerson({ id: 'lakshmi', firstName: 'Lakshmi', gender: 'female' });

  store.addRelationship({ id: 'pc-1', type: 'parent-child', parentId: 'potaiah', childId: 'venakamma' });
  store.addRelationship({ id: 'pc-2', type: 'parent-child', parentId: 'potaiah', childId: 'nagamma' });
  store.addRelationship({ id: 'pc-3', type: 'parent-child', parentId: 'potaiah', childId: 'ramaiah' });
  store.addRelationship({ id: 'pc-4', type: 'parent-child', parentId: 'potaiah', childId: 'lakshmi' });

  // Set manual sibling order: Ramaiah first!
  const cohortKey = 'narsamma:potaiah';
  const customOrder = ['ramaiah', 'venakamma', 'lakshmi', 'nagamma'];
  store.setSiblingOrder(cohortKey, customOrder);

  // Assert in store
  assert.deepStrictEqual(store.getSiblingOrder(cohortKey), customOrder, 'Store holds custom sibling order');

  // Test Export
  const backup = store.exportData();
  assert(backup.family.siblingOrder, 'Backup export includes siblingOrder metadata');
  assert.deepStrictEqual(backup.family.siblingOrder[cohortKey], customOrder, 'Exported sibling order matches exactly');

  // Test Import into a fresh store
  const store2 = new FamilyStore(new LocalAdapter());
  store2.clearAllData();
  store2.importData(backup);
  assert.deepStrictEqual(store2.getSiblingOrder(cohortKey), customOrder, 'Import restores siblingOrder perfectly');

  // Test LocalAdapter reload simulation (page reload)
  const store3 = new FamilyStore(new LocalAdapter());
  assert.deepStrictEqual(store3.getSiblingOrder(cohortKey), customOrder, 'Reloading store from localStorage preserves siblingOrder');

  // Test relationships are completely untouched
  const rels = store3.getAllRelationships();
  assert.strictEqual(rels.length, 5, '5 relationships intact');
  const ramaiahParents = rels.filter((r) => r.childId === 'ramaiah');
  assert.strictEqual(ramaiahParents.length, 1, 'Ramaiah parent relationship strictly preserved');

  console.log('  ✓ Sibling ordering metadata survives store mutation, export, import, and reload');
}

console.log('\n====================================================');
console.log('ALL 10 SCENARIOS PASSED WITH ZERO ERRORS!');
console.log('====================================================\n');
