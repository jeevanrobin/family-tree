/**
 * Test Suite: Scalable Family Tree Visualization Architecture
 * 
 * Verifies core layout behaviors against current production API.
 * Note: Collapse/Focus features not yet implemented (M4F).
 */

import assert from 'node:assert';
import { computeTreeLayout } from '../src/family-tree/engine/treeLayout.js';
import { computeGenerations } from '../src/family-tree/data/familyDataService.js';
import { samplePersons, sampleRelationships } from '../src/family-tree/data/sampleData.js';

let testsPassed = 0;

function runTest(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('\n--- SCALABLE FAMILY TREE VISUALIZATION ARCHITECTURE TESTS ---');

// TEST 1: Generic 4-Level Family Graph with Generation Calculation
runTest('Generic Graph: Grandparents -> Parent -> Siblings A, B, C -> Child D', () => {
  const people = [
    { id: 'gp1', name: 'Grandparent 1', gender: 'male' },
    { id: 'gp2', name: 'Grandparent 2', gender: 'female' },
    { id: 'parent1', name: 'Parent 1', gender: 'male' },
    { id: 'sibA', name: 'Sibling A', gender: 'female' },
    { id: 'sibB', name: 'Sibling B', gender: 'male' },
    { id: 'sibC', name: 'Sibling C', gender: 'female' },
    { id: 'childD', name: 'Child D', gender: 'female' },
  ];

  const relationships = [
    { id: 'r1', type: 'spouse', personId1: 'gp1', personId2: 'gp2' },
    { id: 'r2', type: 'parent-child', personId1: 'gp1', personId2: 'parent1' },
    { id: 'r3', type: 'parent-child', personId1: 'gp2', personId2: 'parent1' },
    { id: 'r4', type: 'parent-child', personId1: 'parent1', personId2: 'sibA' },
    { id: 'r5', type: 'parent-child', personId1: 'parent1', personId2: 'sibB' },
    { id: 'r6', type: 'parent-child', personId1: 'parent1', personId2: 'sibC' },
    { id: 'r7', type: 'parent-child', personId1: 'sibC', personId2: 'childD' },
  ];

  const genMap = computeGenerations(people, relationships);

  assert.strictEqual(genMap.get('gp1'), 0, 'Grandparent 1 must be gen 0');
  assert.strictEqual(genMap.get('gp2'), 0, 'Grandparent 2 must be gen 0');
  assert.strictEqual(genMap.get('parent1'), 1, 'Parent 1 must be gen 1');
  assert.strictEqual(genMap.get('sibA'), 2, 'Sibling A must be gen 2');
  assert.strictEqual(genMap.get('sibB'), 2, 'Sibling B must be gen 2');
  assert.strictEqual(genMap.get('sibC'), 2, 'Sibling C must be gen 2');
  assert.strictEqual(genMap.get('childD'), 3, 'Child D must be gen 3');

  const fullLayout = computeTreeLayout(people, relationships);
  assert.strictEqual(fullLayout.nodes.size, 7, 'All 7 nodes visible');

  const nodeA = fullLayout.nodes.get('sibA');
  const nodeB = fullLayout.nodes.get('sibB');
  const nodeC = fullLayout.nodes.get('sibC');
  const nodeD = fullLayout.nodes.get('childD');
  
  assert.strictEqual(nodeA.y, nodeB.y, 'Siblings A and B must share same Y');
  assert.strictEqual(nodeB.y, nodeC.y, 'Siblings B and C must share same Y');
  assert(nodeD.y > nodeC.y, 'Child D must be below Sibling C');

  assert(nodeA.x < nodeB.x, 'Sibling A before B');
  assert(nodeB.x < nodeC.x, 'Sibling B before C');

  const cohortMidX = (nodeA.x + nodeC.x + fullLayout.nodeWidth) / 2;
  const parentNode = fullLayout.nodes.get('parent1');
  const parentMidX = parentNode.x + fullLayout.nodeWidth / 2;
  assert(Math.abs(parentMidX - cohortMidX) < 2.0, 'Parent must be centered over sibling cohort');
});

// TEST 2: Deep Multi-Generation Lineage & Card Dimensions
runTest('Deep Multi-Generation Lineage: Card dimensions strictly preserved', () => {
  const people = [
    { id: 'gen0_1', name: 'G0 Mother' },
    { id: 'gen0_2', name: 'G0 Father' },
    { id: 'gen1_1', name: 'G1 Child' },
    { id: 'gen1_sp', name: 'G1 Spouse' },
    { id: 'gen2_1', name: 'G2 Grandchild' },
    { id: 'gen2_sp', name: 'G2 Spouse' },
    { id: 'gen3_1', name: 'G3 Great-Grandchild' },
  ];

  const relationships = [
    { id: 'r0', type: 'spouse', personId1: 'gen0_1', personId2: 'gen0_2' },
    { id: 'r1', type: 'parent-child', personId1: 'gen0_1', personId2: 'gen1_1' },
    { id: 'r2', type: 'spouse', personId1: 'gen1_1', personId2: 'gen1_sp' },
    { id: 'r3', type: 'parent-child', personId1: 'gen1_1', personId2: 'gen2_1' },
    { id: 'r4', type: 'spouse', personId1: 'gen2_1', personId2: 'gen2_sp' },
    { id: 'r5', type: 'parent-child', personId1: 'gen2_1', personId2: 'gen3_1' },
  ];

  const layout = computeTreeLayout(people, relationships);

  assert.strictEqual(layout.nodeWidth, 230, 'Card width must be 230');
  assert.strictEqual(layout.nodeHeight, 160, 'Card height must be 160');

  assert.strictEqual(layout.nodes.get('gen0_1').gen, 0);
  assert.strictEqual(layout.nodes.get('gen0_2').gen, 0);
  assert.strictEqual(layout.nodes.get('gen1_1').gen, 1);
  assert.strictEqual(layout.nodes.get('gen1_sp').gen, 1);
  assert.strictEqual(layout.nodes.get('gen2_1').gen, 2);
  assert.strictEqual(layout.nodes.get('gen2_sp').gen, 2);
  assert.strictEqual(layout.nodes.get('gen3_1').gen, 3);
});

// TEST 3: Real Family Data Graph Test
runTest('Real Family Graph: Layout derived dynamically from relationships', () => {
  assert(samplePersons.length >= 10, 'Sample data has rich family');
  assert(sampleRelationships.length >= 10, 'Sample data has relationships');

  const layout = computeTreeLayout(samplePersons, sampleRelationships);

  assert(layout.nodes.size > 0, 'Nodes produced');
  assert(layout.lines.length > 0, 'Lines produced');
  assert(layout.generationTracks.length >= 3, 'Generational tracks produced');

  sampleRelationships.filter((r) => r.type === 'spouse').forEach((rel) => {
    const node1 = layout.nodes.get(rel.personId1);
    const node2 = layout.nodes.get(rel.personId2);
    if (node1 && node2) {
      assert.strictEqual(node1.y, node2.y, `Spouses ${rel.personId1} and ${rel.personId2} must be on same Y`);
      assert.strictEqual(node1.gen, node2.gen, `Spouses must be same generation`);
    }
  });
});

// TEST 4: Layout Structure Validation
runTest('Layout Structure: All required properties present', () => {
  const people = [{ id: 'p1', name: 'Test' }];
  const relationships = [];
  
  const layout = computeTreeLayout(people, relationships);

  assert(layout.nodes instanceof Map, 'nodes must be a Map');
  assert(Array.isArray(layout.lines), 'lines must be an array');
  assert(Array.isArray(layout.generationTracks), 'generationTracks must be an array');
  assert(layout.bounds, 'bounds must exist');
  assert(typeof layout.nodeWidth === 'number', 'nodeWidth must be number');
  assert(typeof layout.nodeHeight === 'number', 'nodeHeight must be number');
});

console.log(`\n=== ALL SCALABLE TREE ARCHITECTURE TESTS PASSED (${testsPassed}) ===\n`);
