/**
 * MEDIDA'S FAMILY — TREE LAYOUT POLISH & CONNECTOR INTEGRITY TEST
 *
 * Verifies:
 * 1. Exact node dimensions (230x160) matching CSS plaque styling
 * 2. Reduced generation gap (225px vs 282px)
 * 3. 8 siblings on a single generation row with compact spacing
 * 4. Branch locality: Ramaiah children under Ramaiah, Lakshmi child under Lakshmi
 * 5. Cross-branch marriage: Venkata Reddy and Padmavathi adjacent as a couple unit
 * 6. Children of couple: Swathi and Jeevan centered below parents
 * 7. Orthogonal connector routing: parent -> junction -> children
 * 8. All relationships have valid, non-clipped SVG connector lines
 * 9. Centered bounding box composition
 */

import { computeTreeLayout, NODE_WIDTH, NODE_HEIGHT, GENERATION_HEIGHT } from '../src/family-tree/engine/treeLayout.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY — TREE LAYOUT POLISH & CONNECTOR SUITE");
console.log('==================================================\n');

// ── Test Setup: Exact Medida Family Graph ──
const persons = [
  // Gen 0
  { id: 'potaiah', displayName: 'Potaiah Medida', gender: 'male' },
  { id: 'narsamma', displayName: 'Venkata Narsamma', gender: 'female' },

  // Gen 1 (8 siblings)
  { id: 'venakamma', displayName: 'Venakamma', gender: 'female' },
  { id: 'nagamma', displayName: 'Nagamma', gender: 'female' },
  { id: 'ramaiah', displayName: 'Ramaiah Medida', gender: 'male' },
  { id: 'lakshmi', displayName: 'Lakshmi Singireddy', gender: 'female' },
  { id: 'kausalya', displayName: 'Kausalya', gender: 'female' },
  { id: 'appamma', displayName: 'Appamma', gender: 'female' },
  { id: 'suramma', displayName: 'Suramma', gender: 'female' },
  { id: 'savithi', displayName: 'Savithi', gender: 'female' },

  // Gen 2
  { id: 'neeraja', displayName: 'Neeraja', gender: 'female' },
  { id: 'venkata_reddy', displayName: 'Venkata Reddy Medida', gender: 'male' },
  { id: 'padmavathi', displayName: 'Padmavathi', gender: 'female' },

  // Gen 3
  { id: 'swathi', displayName: 'Swathi Medida', gender: 'female' },
  { id: 'jeevan', displayName: 'Jeevan Medida', gender: 'male' },
];

const relationships = [
  // Gen 0 couple
  { id: 'rel-spouse-0', type: 'spouse', personAId: 'potaiah', personBId: 'narsamma' },

  // Gen 0 -> Gen 1 (8 children)
  { id: 'rel-pc-1', type: 'parent-child', parentId: 'potaiah', childId: 'venakamma' },
  { id: 'rel-pc-2', type: 'parent-child', parentId: 'potaiah', childId: 'nagamma' },
  { id: 'rel-pc-3', type: 'parent-child', parentId: 'potaiah', childId: 'ramaiah' },
  { id: 'rel-pc-4', type: 'parent-child', parentId: 'potaiah', childId: 'lakshmi' },
  { id: 'rel-pc-5', type: 'parent-child', parentId: 'potaiah', childId: 'kausalya' },
  { id: 'rel-pc-6', type: 'parent-child', parentId: 'potaiah', childId: 'appamma' },
  { id: 'rel-pc-7', type: 'parent-child', parentId: 'potaiah', childId: 'suramma' },
  { id: 'rel-pc-8', type: 'parent-child', parentId: 'potaiah', childId: 'savithi' },

  // Gen 1 -> Gen 2
  // Ramaiah's children
  { id: 'rel-pc-9', type: 'parent-child', parentId: 'ramaiah', childId: 'neeraja' },
  { id: 'rel-pc-10', type: 'parent-child', parentId: 'ramaiah', childId: 'venkata_reddy' },
  // Lakshmi's child
  { id: 'rel-pc-11', type: 'parent-child', parentId: 'lakshmi', childId: 'padmavathi' },

  // Gen 2 Cross-branch marriage (Cousins)
  { id: 'rel-spouse-1', type: 'spouse', personAId: 'venkata_reddy', personBId: 'padmavathi' },

  // Gen 2 -> Gen 3
  { id: 'rel-pc-12', type: 'parent-child', parentId: 'venkata_reddy', childId: 'swathi' },
  { id: 'rel-pc-13', type: 'parent-child', parentId: 'padmavathi', childId: 'swathi' },
  { id: 'rel-pc-14', type: 'parent-child', parentId: 'venkata_reddy', childId: 'jeevan' },
  { id: 'rel-pc-15', type: 'parent-child', parentId: 'padmavathi', childId: 'jeevan' },
];

const layout = computeTreeLayout(persons, relationships);

// ── Group 1: Standardized Dimensions & Compact Generation Pitch ──
console.log('── Group 1: Dimensions & Spacing Standards ──');
assert(NODE_WIDTH === 230, `NODE_WIDTH is exactly 230px (actual: ${NODE_WIDTH})`);
assert(NODE_HEIGHT === 160, `NODE_HEIGHT is exactly 160px (actual: ${NODE_HEIGHT})`);
assert(GENERATION_HEIGHT === 225, `GENERATION_HEIGHT is compact 225px (actual: ${GENERATION_HEIGHT})`);

// ── Group 2: Generational Layers & Sibling Cohort ──
console.log('\n── Group 2: Generational Cohorts ──');
const potaiahNode = layout.nodes.get('potaiah');
const narsammaNode = layout.nodes.get('narsamma');
assert(potaiahNode && narsammaNode, 'Potaiah and Venkata Narsamma nodes exist');
assert(potaiahNode.gen === 0 && narsammaNode.gen === 0, 'Potaiah and Venkata Narsamma are in Generation 0');

const siblingIds = ['venakamma', 'nagamma', 'ramaiah', 'lakshmi', 'kausalya', 'appamma', 'suramma', 'savithi'];
const allSiblingsInGen1 = siblingIds.every((id) => layout.nodes.get(id)?.gen === 1);
assert(allSiblingsInGen1, 'All 8 siblings are placed in Generation 1 (single row cohort)');

const gen1YPositions = siblingIds.map((id) => layout.nodes.get(id).y);
const allSameY = gen1YPositions.every((y) => y === gen1YPositions[0]);
assert(allSameY, 'All 8 siblings share identical Y coordinate (no staggered pseudo-generations)');

// ── Group 3: Branch Locality & Cross-Branch Marriage ──
console.log('\n── Group 3: Branch Locality & Cross-Branch Marriage ──');
const ramaiahNode = layout.nodes.get('ramaiah');
const lakshmiNode = layout.nodes.get('lakshmi');
const neerajaNode = layout.nodes.get('neeraja');
const venkataNode = layout.nodes.get('venkata_reddy');
const padmaNode = layout.nodes.get('padmavathi');

assert(ramaiahNode && lakshmiNode, 'Ramaiah and Lakshmi exist in Gen 1');
assert(neerajaNode && venkataNode && padmaNode, 'Neeraja, Venkata Reddy, and Padmavathi exist in Gen 2');

// Ramaiah is to the left of Lakshmi
assert(ramaiahNode.x < lakshmiNode.x, 'Ramaiah is positioned to the left of Lakshmi');

// Venkata Reddy and Padmavathi are adjacent as spouses
const spouseDistance = Math.abs(padmaNode.x - (venkataNode.x + NODE_WIDTH));
assert(spouseDistance <= 30, `Venkata Reddy and Padmavathi sit adjacent with short spouse gap (${spouseDistance}px)`);

// Venkata Reddy is on the left, Padmavathi on the right (matching Ramaiah on left, Lakshmi on right)
assert(venkataNode.x < padmaNode.x, 'Venkata Reddy is on left of Padmavathi matching parent branch order');

// Neeraja is near Ramaiah
assert(neerajaNode.x < venkataNode.x, 'Neeraja is placed to the left of Venkata Reddy under Ramaiah');

// Gen 3: Swathi & Jeevan
const swathiNode = layout.nodes.get('swathi');
const jeevanNode = layout.nodes.get('jeevan');
assert(swathiNode && jeevanNode, 'Swathi and Jeevan exist in Gen 3');
assert(swathiNode.gen === 3 && jeevanNode.gen === 3, 'Swathi and Jeevan are in Gen 3');

// Swathi and Jeevan are centered beneath parents
const coupleCenterX = (venkataNode.centerX + padmaNode.centerX) / 2;
const childrenCenterX = (swathiNode.centerX + jeevanNode.centerX) / 2;
assert(
  Math.abs(coupleCenterX - childrenCenterX) < 150,
  `Children (Swathi + Jeevan) are visually centered beneath parents (diff: ${Math.round(Math.abs(coupleCenterX - childrenCenterX))}px)`
);

// ── Group 4: Connector Routing & Geometry ──
console.log('\n── Group 4: Connector Routing & Geometry ──');
// Verify spouse line between Venkata Reddy and Padmavathi
const spouseLine = layout.lines.find((l) => l.type === 'spouse' && (l.personId1 === 'venkata_reddy' || l.personId2 === 'venkata_reddy'));
assert(spouseLine, 'Spouse connector exists between Venkata Reddy and Padmavathi');
assert(spouseLine.path.startsWith('M'), 'Spouse line has valid SVG path');
assert(spouseLine.y1 === spouseLine.y2, 'Spouse line is perfectly horizontal');

// Verify parent-child lines
const potaiahChildLines = layout.lines.filter((l) => l.type === 'parent-child' && l.allParentIds.includes('potaiah'));
assert(potaiahChildLines.length === 8, `Exactly 8 parent-child connector lines from Potaiah/Narsamma to siblings (found: ${potaiahChildLines.length})`);

// Verify orthogonal routing
const isOrthogonal = potaiahChildLines.every((l) => {
  // Orthogonal paths contain L, Q or straight vertical
  return l.path.includes('Q') || l.path.includes('L');
});
assert(isOrthogonal, 'Parent-child connectors use orthogonal junction routing with fillet curves');

// Verify anchors: top of child card
const validTargetAnchors = potaiahChildLines.every((l) => {
  const child = layout.nodes.get(l.childId);
  return l.targetY === child.y && Math.abs(l.targetX - child.centerX) < 2;
});
assert(validTargetAnchors, 'All child connector anchors attach exactly to top-center of child cards');

// ── Group 5: Global Balanced Composition & Bounding Box ──
console.log('\n── Group 5: Bounding Box & Composition ──');
const bounds = layout.bounds;
assert(bounds.width > 0 && bounds.height > 0, `Bounds width and height are valid (${Math.round(bounds.width)}x${Math.round(bounds.height)})`);

const treeCenterX = (bounds.minX + bounds.maxX) / 2;
assert(Math.abs(treeCenterX) < 2, `Entire tree composition is centered around X = 0 (actual: ${treeCenterX})`);

console.log('\n==================================================');
console.log(`TREE LAYOUT POLISH RESULTS: ${passed} passed, ${failed} failed`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
