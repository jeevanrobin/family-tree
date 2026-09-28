/**
 * test-recursive-subtree-layout.js
 * Comprehensive regression test suite covering all 11 scenarios:
 * 1. one parent + one child
 * 2. one parent + multiple children
 * 3. couple + multiple children
 * 4. sibling with no descendants
 * 5. sibling with deep descendants
 * 6. 8 siblings
 * 7. multiple descendant branches
 * 8. spouse + children
 * 9. dual-parent child
 * 10. collapsed branch
 * 11. focused branch
 */

import { computeTreeLayout, NODE_WIDTH, NODE_HEIGHT, GENERATION_HEIGHT, STACK_STEP, STACK_INDENT } from '../src/family-tree/engine/treeLayout.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('==================================================');
console.log('RECURSIVE DESCENDANT SUBTREE LAYOUT TEST SUITE');
console.log('==================================================\n');

// ── Scenario 1: One parent + one child ──
console.log('── Scenario 1: One Parent + One Child ──');
{
  const persons = [
    { id: 'p1', displayName: 'Single Parent', gender: 'female' },
    { id: 'c1', displayName: 'Only Child', gender: 'male' },
  ];
  const relationships = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'c1' },
  ];
  const layout = computeTreeLayout(persons, relationships);
  const pNode = layout.nodes.get('p1');
  const cNode = layout.nodes.get('c1');

  assert(pNode.gen === 0 && cNode.gen === 1, 'Parent in Gen 0, Child in Gen 1');
  assert(cNode.y - pNode.y === GENERATION_HEIGHT, 'Child vertically below parent by exactly GENERATION_HEIGHT');
  assert(pNode.centerX === cNode.centerX, 'Parent centerX matches single child centerX');
}

// ── Scenario 2: One parent + multiple children ──
console.log('\n── Scenario 2: One Parent + Multiple Children ──');
{
  const persons = [
    { id: 'p1', displayName: 'Mother', gender: 'female' },
    { id: 'c1', displayName: 'Child A', gender: 'female' },
    { id: 'c2', displayName: 'Child B', gender: 'male' },
    { id: 'c3', displayName: 'Child C', gender: 'female' },
  ];
  const relationships = [
    { id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'c1' },
    { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'c2' },
    { id: 'r3', type: 'parent-child', parentId: 'p1', childId: 'c3' },
  ];
  const layout = computeTreeLayout(persons, relationships);
  const pNode = layout.nodes.get('p1');
  const c1 = layout.nodes.get('c1');
  const c2 = layout.nodes.get('c2');
  const c3 = layout.nodes.get('c3');

  assert(c1.gen === 1 && c2.gen === 1 && c3.gen === 1, 'All 3 children share Generation 1');
  // Childless children are stacked in one column, eldest on top.
  assert(c1.x === c2.x && c2.x === c3.x, 'Childless children share one column');
  assert(c2.y - c1.y === STACK_STEP && c3.y - c2.y === STACK_STEP, 'Children stacked in order, one card apart');
  assert(c1.y - pNode.y === GENERATION_HEIGHT, 'Column starts one generation below the parent');
  const columnCenter = c1.x - STACK_INDENT + (STACK_INDENT + NODE_WIDTH) / 2;
  assert(Math.abs(pNode.centerX - columnCenter) < 2, `Parent is centered over the column (diff: ${Math.abs(pNode.centerX - columnCenter)})`);
}

// ── Scenario 3: Couple + multiple children ──
console.log('\n── Scenario 3: Couple + Multiple Children ──');
{
  const persons = [
    { id: 'f', displayName: 'Father', gender: 'male' },
    { id: 'm', displayName: 'Mother', gender: 'female' },
    { id: 'c1', displayName: 'Child 1', gender: 'male' },
    { id: 'c2', displayName: 'Child 2', gender: 'female' },
  ];
  const relationships = [
    { id: 'r0', type: 'spouse', personAId: 'f', personBId: 'm' },
    { id: 'r1', type: 'parent-child', parentId: 'f', childId: 'c1' },
    { id: 'r2', type: 'parent-child', parentId: 'm', childId: 'c1' },
    { id: 'r3', type: 'parent-child', parentId: 'f', childId: 'c2' },
    { id: 'r4', type: 'parent-child', parentId: 'm', childId: 'c2' },
  ];
  const layout = computeTreeLayout(persons, relationships);
  const fNode = layout.nodes.get('f');
  const mNode = layout.nodes.get('m');
  const c1 = layout.nodes.get('c1');
  const c2 = layout.nodes.get('c2');

  const coupleCenter = (fNode.centerX + mNode.centerX) / 2;
  // Two childless children: one column centred under the couple.
  assert(c1.x === c2.x && c2.y > c1.y, 'Childless children stacked in one column');
  const columnCenter = c1.x - STACK_INDENT + (STACK_INDENT + NODE_WIDTH) / 2;
  assert(Math.abs(coupleCenter - columnCenter) < 2, 'Couple center aligns with the children column');
}

// ── Scenario 4 & 5: Sibling with no descendants vs Sibling with deep descendants ──
console.log('\n── Scenario 4 & 5: Sibling with No Descendants vs Sibling with Deep Descendants ──');
{
  const persons = [
    { id: 'gp', displayName: 'Grandparent', gender: 'male' },
    // Sibling A: no descendants
    { id: 'sibA', displayName: 'Sibling A (No Kids)', gender: 'male' },
    // Sibling B: deep descendants
    { id: 'sibB', displayName: 'Sibling B (Many Kids)', gender: 'female' },
    { id: 'childB1', displayName: 'Child B1', gender: 'male' },
    { id: 'childB2', displayName: 'Child B2', gender: 'female' },
    { id: 'gcB1', displayName: 'Grandchild B1', gender: 'female' },
    { id: 'gcB2', displayName: 'Grandchild B2', gender: 'male' },
  ];
  const relationships = [
    { id: 'r1', type: 'parent-child', parentId: 'gp', childId: 'sibA' },
    { id: 'r2', type: 'parent-child', parentId: 'gp', childId: 'sibB' },
    { id: 'r3', type: 'parent-child', parentId: 'sibB', childId: 'childB1' },
    { id: 'r4', type: 'parent-child', parentId: 'sibB', childId: 'childB2' },
    { id: 'r5', type: 'parent-child', parentId: 'childB1', childId: 'gcB1' },
    { id: 'r6', type: 'parent-child', parentId: 'childB1', childId: 'gcB2' },
  ];
  const layout = computeTreeLayout(persons, relationships);
  const sibANode = layout.nodes.get('sibA');
  const sibBNode = layout.nodes.get('sibB');
  const cB1 = layout.nodes.get('childB1');
  const cB2 = layout.nodes.get('childB2');

  assert(sibANode.gen === 1 && sibBNode.gen === 1, 'Siblings A and B share Generation 1');
  assert(cB1.gen === 2 && cB2.gen === 2, 'Descendants of B are placed in Generation 2');
  assert(cB1.x > sibANode.x + NODE_WIDTH, 'Descendants of B are contained under B and do not overlap Sibling A');
}

// ── Scenario 6: 8 Siblings ──
console.log('\n── Scenario 6: 8 Siblings ──');
{
  const siblingIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
  const persons = [
    { id: 'root', displayName: 'Root Ancestor', gender: 'male' },
    ...siblingIds.map((id, i) => ({ id, displayName: `Sibling ${i + 1}`, gender: i % 2 === 0 ? 'male' : 'female' })),
  ];
  const relationships = siblingIds.map((id, i) => ({
    id: `r-${id}`,
    type: 'parent-child',
    parentId: 'root',
    childId: id,
  }));

  const layout = computeTreeLayout(persons, relationships);
  const rootNode = layout.nodes.get('root');
  const sibNodes = siblingIds.map((id) => layout.nodes.get(id));

  assert(sibNodes.every((n) => n.gen === 1), 'All 8 siblings placed in Generation 1');
  assert(sibNodes.every((n) => n.x === sibNodes[0].x), 'All 8 childless siblings share one column');

  // Verify vertical non-overlap: every sibling sits below the previous one
  let hasNoOverlap = true;
  for (let i = 1; i < sibNodes.length; i++) {
    if (sibNodes[i].y < sibNodes[i - 1].y + NODE_HEIGHT) {
      hasNoOverlap = false;
      break;
    }
  }
  assert(hasNoOverlap, 'All 8 siblings stacked in order without overlapping');
  assert(layout.bounds.width < 3 * NODE_WIDTH, `8 childless siblings stay narrow (width: ${layout.bounds.width})`);
}

// ── Scenario 7: Multiple Descendant Branches ──
console.log('\n── Scenario 7: Multiple Descendant Branches ──');
{
  const persons = [
    { id: 'root', displayName: 'Root', gender: 'male' },
    { id: 'branch1', displayName: 'Branch 1', gender: 'male' },
    { id: 'branch2', displayName: 'Branch 2', gender: 'female' },
    { id: 'b1_c1', displayName: 'B1 Child 1', gender: 'female' },
    { id: 'b1_c2', displayName: 'B1 Child 2', gender: 'male' },
    { id: 'b2_c1', displayName: 'B2 Child 1', gender: 'male' },
    { id: 'b2_c2', displayName: 'B2 Child 2', gender: 'female' },
  ];
  const relationships = [
    { id: 'r1', type: 'parent-child', parentId: 'root', childId: 'branch1' },
    { id: 'r2', type: 'parent-child', parentId: 'root', childId: 'branch2' },
    { id: 'r3', type: 'parent-child', parentId: 'branch1', childId: 'b1_c1' },
    { id: 'r4', type: 'parent-child', parentId: 'branch1', childId: 'b1_c2' },
    { id: 'r5', type: 'parent-child', parentId: 'branch2', childId: 'b2_c1' },
    { id: 'r6', type: 'parent-child', parentId: 'branch2', childId: 'b2_c2' },
  ];

  const layout = computeTreeLayout(persons, relationships);
  const b1Node = layout.nodes.get('branch1');
  const b2Node = layout.nodes.get('branch2');
  const b1_c1 = layout.nodes.get('b1_c1');
  const b1_c2 = layout.nodes.get('b1_c2');
  const b2_c1 = layout.nodes.get('b2_c1');
  const b2_c2 = layout.nodes.get('b2_c2');

  assert(b1_c2.x + NODE_WIDTH <= b2_c1.x, 'Branch 1 descendants strictly to the left of Branch 2 descendants');
  // Each branch's two childless children form a column centred under it.
  const columnCenter = (n) => n.x - STACK_INDENT + (STACK_INDENT + NODE_WIDTH) / 2;
  assert(b1_c1.x === b1_c2.x && b2_c1.x === b2_c2.x, 'Each branch stacks its childless children');
  assert(Math.abs(b1Node.centerX - columnCenter(b1_c1)) < 2, 'Branch 1 parent centered over its children');
  assert(Math.abs(b2Node.centerX - columnCenter(b2_c1)) < 2, 'Branch 2 parent centered over its children');
}

// ── Scenario 8 & 9: Spouse + Children and Dual-Parent Child ──
console.log('\n── Scenario 8 & 9: Spouse + Children & Dual-Parent Child ──');
{
  const persons = [
    { id: 'dad', displayName: 'Dad', gender: 'male' },
    { id: 'mom', displayName: 'Mom', gender: 'female' },
    { id: 'kid', displayName: 'Kid', gender: 'female' },
  ];
  const relationships = [
    { id: 'r0', type: 'spouse', personAId: 'dad', personBId: 'mom' },
    { id: 'r1', type: 'parent-child', parentId: 'dad', childId: 'kid' },
    { id: 'r2', type: 'parent-child', parentId: 'mom', childId: 'kid' },
  ];

  const layout = computeTreeLayout(persons, relationships);
  const dadNode = layout.nodes.get('dad');
  const momNode = layout.nodes.get('mom');
  const kidNode = layout.nodes.get('kid');

  const coupleCenter = (dadNode.centerX + momNode.centerX) / 2;
  assert(Math.abs(coupleCenter - kidNode.centerX) < 2, 'Dual-parent child centered beneath couple');
  assert(dadNode.gen === 0 && momNode.gen === 0 && kidNode.gen === 1, 'Parents in Gen 0, Child in Gen 1');
}

// ── Scenario 10: Collapsed Branch ──
console.log('\n── Scenario 10: Collapsed Branch ──');
{
  const persons = [
    { id: 'p', displayName: 'Parent', gender: 'male' },
    { id: 'c1', displayName: 'Child 1', gender: 'male' },
    { id: 'gc1', displayName: 'Grandchild 1', gender: 'female' },
  ];
  const relationships = [
    { id: 'r1', type: 'parent-child', parentId: 'p', childId: 'c1' },
    { id: 'r2', type: 'parent-child', parentId: 'c1', childId: 'gc1' },
  ];

  const expandedLayout = computeTreeLayout(persons, relationships);
  assert(expandedLayout.nodes.has('gc1'), 'Grandchild visible when branch expanded');

  // Collapse Child 1's unit
  const collapsedLayout = computeTreeLayout(persons, relationships, {
    collapsedUnits: new Set(['unit-c1']),
  });
  assert(collapsedLayout.nodes.has('c1'), 'Child 1 still visible when collapsed');
  assert(!collapsedLayout.nodes.has('gc1'), 'Grandchild hidden when branch collapsed');
  assert(collapsedLayout.allNodes.has('gc1'), 'allNodes still retains grandchild for minimap radar');
}

// ── Scenario 11: Focused Branch ──
console.log('\n── Scenario 11: Focused Branch ──');
{
  const persons = [
    { id: 'root', displayName: 'Root', gender: 'male' },
    { id: 'b1', displayName: 'Branch 1 (Focused)', gender: 'male' },
    { id: 'b2', displayName: 'Branch 2 (Unfocused)', gender: 'female' },
    { id: 'b1_c', displayName: 'B1 Child', gender: 'female' },
    { id: 'b2_c', displayName: 'B2 Child', gender: 'male' },
  ];
  const relationships = [
    { id: 'r1', type: 'parent-child', parentId: 'root', childId: 'b1' },
    { id: 'r2', type: 'parent-child', parentId: 'root', childId: 'b2' },
    { id: 'r3', type: 'parent-child', parentId: 'b1', childId: 'b1_c' },
    { id: 'r4', type: 'parent-child', parentId: 'b2', childId: 'b2_c' },
  ];

  const focusLayout = computeTreeLayout(persons, relationships, {
    focusPersonId: 'b1',
    focusMode: 'person',
  });

  assert(focusLayout.nodes.has('b1'), 'Focused person is visible');
  assert(focusLayout.nodes.has('b1_c'), 'Focused branch child is visible');
  assert(focusLayout.nodes.has('b2'), 'Sibling unit is visible');
  assert(!focusLayout.nodes.has('b2_c'), 'Unfocused secondary branch is auto-collapsed');
}

console.log('\n==================================================');
console.log('ALL 11 REGRESSION SCENARIOS PASSED SUCCESSFULLY!');
console.log('==================================================');
