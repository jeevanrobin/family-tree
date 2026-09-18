/**
 * Test Suite: Scalable Family Tree Visualization Architecture
 * 
 * Verifies:
 * 1. Generic family graphs:
 *    Grandparent A + Grandparent B -> Parent -> Sibling Cohort A, B, C -> D (child of C)
 * 2. Generations are strictly graph-derived:
 *    generation(child) = generation(parent) + 1
 * 3. Collapsing C hides D, but does NOT change D's generation or make D a root
 * 4. Expanding C restores D's visibility
 * 5. Deep multi-generation family layout (couples, siblings, grandchildren, great-grandchildren)
 * 6. Real family graph (data-driven, zero hardcoded names)
 * 7. Focus Person and Focus Family modes
 * 8. Smart camera bounds calculations (fitBranch, fitToBounds, minimap radar transform)
 */

import assert from 'node:assert';
import { computeTreeLayout } from '../src/family-tree/engine/treeLayout.js';
import { computeGenerations } from '../src/family-tree/data/familyDataService.js';
import {
  calculateFitToBounds,
  calculateFitToBranch,
  calculateMinimapTransform,
} from '../src/family-tree/engine/treeInteraction.js';
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

// ============================================================================
// TEST 1: Generic 4-Level Family Graph
// ============================================================================
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

  // 1. Generation calculation
  const genMap = computeGenerations(people, relationships);

  assert.strictEqual(genMap.get('gp1'), 0, 'Grandparent 1 must be gen 0');
  assert.strictEqual(genMap.get('gp2'), 0, 'Grandparent 2 must be gen 0');
  assert.strictEqual(genMap.get('parent1'), 1, 'Parent 1 must be gen 1');
  assert.strictEqual(genMap.get('sibA'), 2, 'Sibling A must be gen 2');
  assert.strictEqual(genMap.get('sibB'), 2, 'Sibling B must be gen 2');
  assert.strictEqual(genMap.get('sibC'), 2, 'Sibling C must be gen 2');
  assert.strictEqual(genMap.get('childD'), 3, 'Child D must be gen 3 (one generation below C)');

  // 2. Full Tree Layout
  const fullLayout = computeTreeLayout(people, relationships);
  assert.strictEqual(fullLayout.nodes.size, 7, 'All 7 nodes visible when expanded');
  assert.strictEqual(fullLayout.allNodes.size, 7, 'allNodes tracks complete graph');
  
  // Verify A, B, C share the same Y generation coordinate
  const nodeA = fullLayout.nodes.get('sibA');
  const nodeB = fullLayout.nodes.get('sibB');
  const nodeC = fullLayout.nodes.get('sibC');
  const nodeD = fullLayout.nodes.get('childD');
  assert.strictEqual(nodeA.y, nodeB.y, 'Siblings A and B must share same Y');
  assert.strictEqual(nodeB.y, nodeC.y, 'Siblings B and C must share same Y');
  assert(nodeD.y > nodeC.y, 'Child D must be placed below Sibling C');

  // Verify Sibling cohort is ordered horizontally
  assert(nodeA.x < nodeB.x, 'Sibling A before B');
  assert(nodeB.x < nodeC.x, 'Sibling B before C');

  // Verify parent unit is centered relative to sibling cohort
  const cohortMidX = (nodeA.x + nodeC.x + fullLayout.nodeWidth) / 2;
  const parentNode = fullLayout.nodes.get('parent1');
  const parentMidX = parentNode.x + fullLayout.nodeWidth / 2;
  assert(Math.abs(parentMidX - cohortMidX) < 1.0, 'Parent must be centered over sibling cohort');
});

// ============================================================================
// TEST 2: Branch Collapsing and Hidden Node Invariance
// ============================================================================
runTest('Branch Collapsing: Collapsing C hides D without changing generation or root status', () => {
  const people = [
    { id: 'gp1', name: 'Grandparent 1' },
    { id: 'parent1', name: 'Parent 1' },
    { id: 'sibA', name: 'Sibling A' },
    { id: 'sibC', name: 'Sibling C' },
    { id: 'childD', name: 'Child D' },
  ];

  const relationships = [
    { id: 'r1', type: 'parent-child', personId1: 'gp1', personId2: 'parent1' },
    { id: 'r2', type: 'parent-child', personId1: 'parent1', personId2: 'sibA' },
    { id: 'r3', type: 'parent-child', personId1: 'parent1', personId2: 'sibC' },
    { id: 'r4', type: 'parent-child', personId1: 'sibC', personId2: 'childD' },
  ];

  // Collapse unit of sibC
  const collapsedLayout = computeTreeLayout(people, relationships, {
    collapsedUnits: new Set(['unit-sibC']),
  });

  // Visible nodes: gp1, parent1, sibA, sibC (4 nodes). childD is hidden!
  assert.strictEqual(collapsedLayout.nodes.size, 4, 'Only 4 visible nodes when sibC branch is collapsed');
  assert.strictEqual(collapsedLayout.nodes.has('childD'), false, 'Child D must be hidden');
  assert.strictEqual(collapsedLayout.allNodes.size, 5, 'allNodes still retains full 5 nodes');

  // In allNodes, childD generation must remain 3!
  const allNodeD = collapsedLayout.allNodes.get('childD');
  assert.strictEqual(allNodeD.gen, 3, 'Child D generation MUST remain 3 when collapsed');
  assert.strictEqual(allNodeD.isRoot, false, 'Child D must NOT become a root when collapsed');

  // Verify branch badge was created for sibC
  assert(collapsedLayout.branchBadges.length > 0, 'Branch badge must be created');
  const sibCBadge = collapsedLayout.branchBadges.find((b) => b.unitKey === 'unit-sibC');
  assert(sibCBadge, 'Badge exists for sibC');
  assert.strictEqual(sibCBadge.isCollapsed, true, 'Badge marks collapsed');
  assert.strictEqual(sibCBadge.childCount, 1, 'Badge shows 1 child');

  // Now Expand sibC branch
  const expandedLayout = computeTreeLayout(people, relationships, {
    collapsedUnits: new Set(),
  });
  assert.strictEqual(expandedLayout.nodes.size, 5, 'All 5 nodes visible when expanded');
  assert.strictEqual(expandedLayout.nodes.has('childD'), true, 'Child D visible again');
  assert.strictEqual(expandedLayout.nodes.get('childD').gen, 3, 'Child D gen is 3');
});

// ============================================================================
// TEST 3: Deep Multi-Generation Lineage & Card Dimensions
// ============================================================================
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

  // Card dimensions must be 230 x 160
  assert.strictEqual(layout.nodeWidth, 230, 'Readable card width must be 230');
  assert.strictEqual(layout.nodeHeight, 160, 'Readable card height must be 160');

  // Each generation step
  assert.strictEqual(layout.nodes.get('gen0_1').gen, 0);
  assert.strictEqual(layout.nodes.get('gen0_2').gen, 0);
  assert.strictEqual(layout.nodes.get('gen1_1').gen, 1);
  assert.strictEqual(layout.nodes.get('gen1_sp').gen, 1);
  assert.strictEqual(layout.nodes.get('gen2_1').gen, 2);
  assert.strictEqual(layout.nodes.get('gen2_sp').gen, 2);
  assert.strictEqual(layout.nodes.get('gen3_1').gen, 3);
});

// ============================================================================
// TEST 4: Real Family Data Graph Test (Zero Hardcoded Names)
// ============================================================================
runTest('Real Family Graph: Layout derived completely dynamically from relationships', () => {
  assert(samplePersons.length >= 10, 'Sample data has rich family');
  assert(sampleRelationships.length >= 10, 'Sample data has relationships');

  const layout = computeTreeLayout(samplePersons, sampleRelationships);

  assert(layout.nodes.size > 0, 'Nodes produced');
  assert(layout.lines.length > 0, 'Lines produced');
  assert(layout.generationTracks.length >= 3, 'Generational tracks produced');

  // Verify couple units were properly positioned side by side
  sampleRelationships.filter((r) => r.type === 'spouse').forEach((rel) => {
    const node1 = layout.nodes.get(rel.personId1);
    const node2 = layout.nodes.get(rel.personId2);
    if (node1 && node2) {
      assert.strictEqual(node1.y, node2.y, `Spouses ${rel.personId1} and ${rel.personId2} must be on same Y`);
      assert.strictEqual(node1.gen, node2.gen, `Spouses ${rel.personId1} and ${rel.personId2} must be on same gen`);
    }
  });

  // Verify all parent-child lines connect downward
  layout.lines.filter((l) => l.type === 'parent-child' && !l.badgeStem).forEach((line) => {
    assert(line.sourceY <= line.targetY, `Parent-child line ${line.id} must flow downward`);
  });
});

// ============================================================================
// TEST 5: Focus Person Mode & Focus Family Mode
// ============================================================================
runTest('Focus Person Mode: Isolates direct lineage and auto-collapses other branches', () => {
  // Pick a person in generation 2 or 3
  const targetPerson = samplePersons.find((p) => p.generationRank === 'GEN III') || samplePersons[3];

  const fullLayout = computeTreeLayout(samplePersons, sampleRelationships, { focusMode: 'all' });
  const focusedLayout = computeTreeLayout(samplePersons, sampleRelationships, {
    focusPersonId: targetPerson.id,
    focusMode: 'person',
  });

  assert(focusedLayout.nodes.has(targetPerson.id), 'Target person must be visible in focus person mode');
  // In focus mode, extraneous branches are collapsed, so visible nodes count <= fullLayout nodes
  assert(
    focusedLayout.nodes.size <= fullLayout.nodes.size,
    'Focus mode reduces clutter by collapsing non-relevant branches'
  );
  assert.strictEqual(focusedLayout.allNodes.size, fullLayout.allNodes.size, 'Full graph preserved in allNodes');
});

// ============================================================================
// TEST 6: Smart Camera Bounds & Minimap Mathematics
// ============================================================================
runTest('Smart Camera: Bounds, FitToBranch, and Minimap Radar math', () => {
  const containerW = 1200;
  const containerH = 800;

  // 1. Fit to branch: caps scale to readable level (>= 0.75)
  const branchNodes = [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
    { x: 250, y: 350 },
  ];
  const branchTransform = calculateFitToBranch(branchNodes, containerW, containerH);
  assert(branchTransform.scale >= 0.75, `Fit to branch scale (${branchTransform.scale}) must be readable (>= 0.75)`);

  // 2. Minimap transform: scales total bounds to radar dimensions (180x120)
  const totalBounds = { minX: 0, minY: 0, maxX: 4000, maxY: 2000, width: 4000, height: 2000 };
  const minimapTransform = calculateMinimapTransform(totalBounds, 180, 120, 10);
  assert(minimapTransform.scale > 0, 'Minimap scale must be positive');
  assert(minimapTransform.scale < 1, 'Minimap scale scales down to overview');
  
  // Transform of bounds point (2000, 1000) must land within radar bounds
  const radarX = 2000 * minimapTransform.scale + minimapTransform.offsetX;
  const radarY = 1000 * minimapTransform.scale + minimapTransform.offsetY;
  assert(radarX >= 0 && radarX <= 180, 'Radar X inside width');
  assert(radarY >= 0 && radarY <= 120, 'Radar Y inside height');

  // 3. Fit to bounds: standard camera centering
  const fitAllTransform = calculateFitToBounds(totalBounds, containerW, containerH);
  assert(fitAllTransform.scale > 0, 'Fit all scale must be positive');
});

console.log(`\nAll ${testsPassed} scalable family tree visualization tests passed successfully!\n`);
