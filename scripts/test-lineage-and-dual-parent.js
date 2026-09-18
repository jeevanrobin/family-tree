/**
 * test-lineage-and-dual-parent.js — Verification Suite
 *
 * Verifies:
 * 1. Selecting a person links both father and mother.
 * 2. Selecting a child traces full ancestral lineage up through parents to grandparents.
 * 3. Lineage spouse keys and parent-child keys are populated correctly.
 * 4. Lineage connectors originate at the marriage union bar.
 */

import assert from 'node:assert';
import familyStore from '../src/family-tree/store/FamilyStore.js';
import {
  getParents,
  getAncestryLineage,
  getFamilyConstellationMap,
  getImmediateFamilyMap,
} from '../src/family-tree/data/familyDataService.js';
import { computeGenerations } from '../src/family-tree/data/familyDataService.js';
import { computeTreeLayout, PORTRAIT_BAND_Y } from '../src/family-tree/engine/treeLayout.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] Test ${passed + failed + 1}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${passed + failed + 1}: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('==================================================');
console.log("DUAL PARENT LINKS & ANCESTRAL LINEAGE TRACING");
console.log('==================================================');

function setupScenario() {
  familyStore.clearAllData();

  // Create 3-generation lineage:
  // Gen I: Ramaiah (grandfather) + Venkamma (grandmother)
  // Gen II: Potaiah (father) + Venkatanarsamma (mother)
  // Gen III: Venkata Reddy (child)

  familyStore.addPerson({ id: 'gp-1', firstName: 'Ramaiah', gender: 'male' });
  familyStore.addPerson({ id: 'gp-2', firstName: 'Venkamma', gender: 'female' });
  familyStore.addPerson({ id: 'p-1', firstName: 'Potaiah', gender: 'male' });
  familyStore.addPerson({ id: 'p-2', firstName: 'Venkatanarsamma', gender: 'female' });
  familyStore.addPerson({ id: 'c-1', firstName: 'Venkata Reddy', gender: 'male' });

  // Relationships:
  // gp-1 <-> gp-2 (spouse)
  familyStore.addRelationship({ type: 'spouse', personAId: 'gp-1', personBId: 'gp-2' });
  // gp-1 -> p-1 (father to child)
  familyStore.addRelationship({ type: 'parent-child', parentId: 'gp-1', childId: 'p-1' });

  // p-1 <-> p-2 (spouse)
  familyStore.addRelationship({ type: 'spouse', personAId: 'p-1', personBId: 'p-2' });
  // p-1 -> c-1 (father to child)
  familyStore.addRelationship({ type: 'parent-child', parentId: 'p-1', childId: 'c-1' });
}

runTest('Resolves both father and mother when spouse exists', () => {
  setupScenario();
  const parents = getParents('c-1');
  assert.strictEqual(parents.length, 2, 'Should return both parents');
  const names = parents.map((p) => p.firstName);
  assert(names.includes('Potaiah'), 'Should include father');
  assert(names.includes('Venkatanarsamma'), 'Should include mother');
});

runTest('Immediate family map assigns Father and Mother roles', () => {
  setupScenario();
  const immediateMap = getImmediateFamilyMap('c-1');
  assert(immediateMap.has('p-1'), 'Has p-1');
  assert(immediateMap.has('p-2'), 'Has p-2');
  assert.strictEqual(immediateMap.get('p-1').role, 'Father');
  assert.strictEqual(immediateMap.get('p-2').role, 'Mother');
});

runTest('Traces entire ancestral lineage from grandparents to child', () => {
  setupScenario();
  const lineage = getAncestryLineage('c-1');

  // Ancestors set must include parents and grandparents
  assert(lineage.ancestorIds.has('p-1'), 'Has father in ancestorIds');
  assert(lineage.ancestorIds.has('p-2'), 'Has mother in ancestorIds');
  assert(lineage.ancestorIds.has('gp-1'), 'Has grandfather in ancestorIds');
  assert(lineage.ancestorIds.has('gp-2'), 'Has grandmother in ancestorIds');

  // Child IDs along lineage
  assert(lineage.lineageParentChildChildIds.has('c-1'), 'Includes c-1');
  assert(lineage.lineageParentChildChildIds.has('p-1'), 'Includes p-1');

  // Both parent couple and grandparent couple spouse keys
  const parentsCoupleKey = ['p-1', 'p-2'].sort().join('-');
  const gpCoupleKey = ['gp-1', 'gp-2'].sort().join('-');
  assert(lineage.lineageSpouseKeys.has(parentsCoupleKey), 'Includes parents couple key');
  assert(lineage.lineageSpouseKeys.has(gpCoupleKey), 'Includes grandparents couple key');
});

runTest('Assigns Grandfather and Grandmother roles in constellation map', () => {
  setupScenario();
  const constMap = getFamilyConstellationMap('c-1');
  assert.strictEqual(constMap.get('gp-1').role, 'Grandfather');
  assert.strictEqual(constMap.get('gp-2').role, 'Grandmother');
  assert.strictEqual(constMap.get('gp-1').tier, 'extended');
  assert.strictEqual(constMap.get('gp-2').tier, 'extended');
});

runTest('Couple parent-child connector originates at marriage union bar', () => {
  setupScenario();
  const persons = familyStore.getAllPersons();
  const relationships = familyStore.getAllRelationships();
  const layout = computeTreeLayout(persons, relationships);

  const childLine = layout.lines.find((l) => l.type === 'parent-child' && l.childId === 'c-1');
  assert(childLine, 'Parent-child line exists');

  const p1Node = layout.nodes.get('p-1');
  const p2Node = layout.nodes.get('p-2');
  const expectedSourceY = Math.round((p1Node.y + p2Node.y) / 2 + PORTRAIT_BAND_Y);

  assert.strictEqual(childLine.sourceY, expectedSourceY, 'Stem originates at marriage union line');
  assert(childLine.allParentIds.includes('p-1'), 'Has p-1 in allParentIds');
  assert(childLine.allParentIds.includes('p-2'), 'Has p-2 in allParentIds');
});

runTest('New children stay in the parent cohort and grandchildren advance one generation', () => {
  const people = [
    { id: 'grandparent-a', firstName: 'Grandparent A' },
    { id: 'grandparent-b', firstName: 'Grandparent B' },
    { id: 'parent-x', firstName: 'Parent X' },
    { id: 'child-a', firstName: 'Child A' },
    { id: 'child-b', firstName: 'Child B' },
    { id: 'child-c', firstName: 'Child C' },
    { id: 'grandchild-b', firstName: 'Grandchild B' },
  ];
  const relationships = [
    { type: 'parent-child', parentId: 'grandparent-a', childId: 'parent-x' },
    { type: 'parent-child', parentId: 'parent-x', childId: 'child-a' },
    { type: 'parent-child', parentId: 'parent-x', childId: 'child-b' },
    { type: 'parent-child', parentId: 'parent-x', childId: 'child-c' },
    { type: 'parent-child', parentId: 'child-b', childId: 'grandchild-b' },
  ];

  const generations = computeGenerations(people, relationships);
  assert.strictEqual(generations.get('parent-x'), 1, 'Parent X should be one generation below the root');
  assert.strictEqual(generations.get('child-a'), 2, 'Child A should be one generation below Parent X');
  assert.strictEqual(generations.get('child-b'), 2, 'Child B should be one generation below Parent X');
  assert.strictEqual(generations.get('child-c'), 2, 'New Child C should be one generation below Parent X');
  assert.strictEqual(generations.get('grandchild-b'), 3, 'Grandchild B should be one generation below Child B');

  const layout = computeTreeLayout(people, relationships);
  assert.strictEqual(layout.nodes.get('child-c').y, layout.nodes.get('child-a').y, 'New Child C should share the sibling row');
  assert.strictEqual(layout.nodes.get('child-c').y, layout.nodes.get('child-b').y, 'New Child C should share the sibling cohort');
  assert(layout.nodes.get('child-c').y > layout.nodes.get('parent-x').y, 'New Child C should not be in the root/parent row');
  assert(layout.nodes.get('grandchild-b').y > layout.nodes.get('child-b').y, 'Grandchild B should be below Child B');
});

console.log('==================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} tests passed`);
console.log('==================================================');

if (failed > 0) process.exit(1);
