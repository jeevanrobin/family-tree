/**
 * Family Tree Automatic Layout Engine — Data-Driven Hierarchy
 * 
 * Dynamically computes spatial coordinates, couple groupings, sibling distribution,
 * descendant subtrees, and connection routes from pure people & relationship data.
 * ZERO HARDCODED IDS OR FIXED COORDINATES.
 */

import { computeGenerations, GENERATION_CONFIG } from '../data/familyDataService.js';

/* Portrait plaques: standardized dimensions matching CSS .ft-person-card exactly.
   Couples sit close enough to read as one household; sibling groups get
   more air so branches stay legible.
   
   M5C.1 NOTE: Premium Family Cluster Layout Architecture
   
   Recommended future enhancement:
   - Implement subtree-based width calculation (calculateSubtreeWidth())
   - Position each child based on its descendant subtree width
   - Use SUBTREE_GAP between sibling family branches
   - Center parents over their descendant clusters recursively
   
   Current implementation uses cursor-based positioning but with improved spacing.
   Full subtree architecture would require:
   1. Recursive descendant width calculation
   2. Hierarchical parent centering
   3. Branch reservation for future descendants
   4. Collision prevention between unrelated branches
*/
export const NODE_WIDTH = 230;
export const NODE_HEIGHT = 160;
export const SPOUSE_GAP = 24;        // Tight couple spacing
export const SIBLING_GAP = 36;       // Sibling cohort spacing (increased for readability)
export const SUBTREE_GAP = 72;      // Large gap between family clusters/branches (for future use)
export const DESCENDANT_GAP = 48;    // Gap between immediate descendant subtrees (for future use)
export const FAMILY_UNIT_GAP = 48;
export const COMPONENT_GAP = 72;

/* Vertical spacing between generations:
   NODE_HEIGHT (160px) + GENERATION_GAP (65px) = 225px generation height.
   This provides a compact 65px gap between generation cards without overlap,
   leaving ideal space for orthogonal junction routing. */
export const GENERATION_GAP = 65;
export const GENERATION_HEIGHT = NODE_HEIGHT + GENERATION_GAP; // 225px

/* Roman numerals for generation marks — generations are genuinely ordinal,
   so the numbering carries real information. */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/* Vertical anchor offset for spouse connections (side center of card). */
export const PORTRAIT_BAND_Y = Math.round(NODE_HEIGHT / 2); // 80px

function resolveRank(gen, minGen, maxGen) {
  const span = Math.max(maxGen - minGen, 1);
  const progress = (gen - minGen) / span;
  if (progress <= 0.15) return 'ancestor';
  if (progress <= 0.45) return 'parent';
  if (progress <= 0.75) return 'current';
  return 'child';
}

/**
 * Computes a completely data-driven spatial tree layout
 */
export function computeTreeLayout(persons, relationships) {
  if (!persons || persons.length === 0) {
    return {
      nodes: new Map(),
      lines: [],
      generationTracks: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
    };
  }

  const personMap = new Map();
  persons.forEach((p) => personMap.set(String(p.id), p));

  // Compute dynamic generations from graph
  const genMap = computeGenerations(persons, relationships);

  // Build graph relationships
  const childToParents = new Map();
  const parentToChildren = new Map();
  const spouseMap = new Map();

  relationships.forEach((r) => {
    if (r.type === 'parent-child' || r.type === 'parent') {
      const parentId = String(r.parentId || r.personId1);
      const childId = String(r.childId || r.personId2);
      if (!childToParents.has(childId)) childToParents.set(childId, []);
      if (!childToParents.get(childId).includes(parentId)) {
        childToParents.get(childId).push(parentId);
      }

      if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
      if (!parentToChildren.get(parentId).includes(childId)) {
        parentToChildren.get(parentId).push(childId);
      }
    } else if (r.type === 'spouse') {
      const a = String(r.personAId || r.personId1);
      const b = String(r.personBId || r.personId2);
      spouseMap.set(a, b);
      spouseMap.set(b, a);
    }
  });

  // Group persons into generational layers
  const genLayers = new Map();
  persons.forEach((p) => {
    const g = genMap.get(p.id) ?? 0;
    if (!genLayers.has(g)) genLayers.set(g, []);
    genLayers.get(g).push(p);
  });

  const minGen = Math.min(...Array.from(genLayers.keys()));
  const maxGen = Math.max(...Array.from(genLayers.keys()));

  // 1. Identify Connected Units layer by layer
  // A family unit is either a married couple [personA, personB] or an individual [personA]
  const processedPersons = new Set();

  function getOrBuildUnit(pId) {
    if (processedPersons.has(pId)) return null;
    const person = personMap.get(pId);
    if (!person) return null;

    processedPersons.add(pId);
    const spouseId = spouseMap.get(pId);
    let spouse = null;
    if (spouseId && personMap.has(spouseId)) {
      processedPersons.add(spouseId);
      spouse = personMap.get(spouseId);
    }

    // Children are combined children of either spouse
    const childrenIds = new Set();
    (parentToChildren.get(pId) || []).forEach((c) => childrenIds.add(c));
    if (spouseId) {
      (parentToChildren.get(spouseId) || []).forEach((c) => childrenIds.add(c));
    }

    const gen = genMap.get(pId) ?? 0;
    const unitWidth = spouse ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH;

    return {
      id: spouse ? `couple-${pId}-${spouse.id}` : `unit-${pId}`,
      primary: person,
      spouse,
      childrenIds: Array.from(childrenIds),
      gen,
      width: unitWidth,
    };
  }

  // 2. Build and position units generation by generation
  const calculatedPositions = new Map(); // personId -> { x, y }
  const layerUnits = new Map();

  for (let g = minGen; g <= maxGen; g++) {
    const list = genLayers.get(g) || [];
    const units = [];
    list.forEach((p) => {
      const u = getOrBuildUnit(p.id);
      if (u) units.push(u);
    });

    // Sort units in generation g to preserve branch locality:
    // If units have parents in earlier generations, align them by their parents' visual X positions!
    units.forEach((unit) => {
      const p1Parents = childToParents.get(unit.primary.id) || [];
      const p2Parents = unit.spouse ? (childToParents.get(unit.spouse.id) || []) : [];

      let parentXSum = 0;
      let parentCount = 0;

      p1Parents.forEach((parentId) => {
        const pos = calculatedPositions.get(parentId);
        if (pos) {
          parentXSum += pos.x + NODE_WIDTH / 2;
          parentCount++;
        }
      });

      p2Parents.forEach((parentId) => {
        const pos = calculatedPositions.get(parentId);
        if (pos) {
          parentXSum += pos.x + NODE_WIDTH / 2;
          parentCount++;
        }
      });

      unit.avgParentX = parentCount > 0 ? parentXSum / parentCount : null;

      // In a couple with parents in earlier generations (e.g. cross-branch marriage):
      // Orient the spouses so that the spouse whose parent is further left sits on the left!
      if (unit.spouse && p1Parents.length > 0 && p2Parents.length > 0) {
        const pos1 = calculatedPositions.get(p1Parents[0]);
        const pos2 = calculatedPositions.get(p2Parents[0]);
        if (pos1 && pos2 && pos1.x > pos2.x) {
          // Swap primary and spouse so the spouse on the left corresponds to the leftmost parent branch
          const temp = unit.primary;
          unit.primary = unit.spouse;
          unit.spouse = temp;
        }
      }
    });

    // Sort units by average parent X (falling back to initial order)
    units.sort((a, b) => {
      if (a.avgParentX !== null && b.avgParentX !== null) {
        return a.avgParentX - b.avgParentX;
      }
      if (a.avgParentX !== null) return -1;
      if (b.avgParentX !== null) return 1;
      return 0;
    });

    // Position units with compact sibling spacing
    const y = (g - minGen) * GENERATION_HEIGHT;
    let currentX = 0;

    units.forEach((unit) => {
      let unitStartX = currentX;
      if (unit.avgParentX !== null) {
        const desiredStartX = unit.avgParentX - unit.width / 2;
        unitStartX = Math.max(currentX, desiredStartX);
      }

      // Assign position to primary person
      calculatedPositions.set(unit.primary.id, { x: unitStartX, y });

      // Assign position to spouse (right of primary)
      if (unit.spouse) {
        calculatedPositions.set(unit.spouse.id, {
          x: unitStartX + NODE_WIDTH + SPOUSE_GAP,
          y,
        });
      }

      currentX = unitStartX + unit.width + SIBLING_GAP;
    });

    layerUnits.set(g, units);
  }

  // 2B. Bottom-Up Pass: Center parent units directly above their children
  for (let g = maxGen - 1; g >= minGen; g--) {
    const units = layerUnits.get(g) || [];
    units.forEach((unit) => {
      const childIds = unit.childrenIds || [];
      const childCenters = [];
      childIds.forEach((cId) => {
        const p = calculatedPositions.get(cId);
        if (p) {
          childCenters.push(p.x + NODE_WIDTH / 2);
        }
      });

      if (childCenters.length > 0) {
        const minChildCenter = Math.min(...childCenters);
        const maxChildCenter = Math.max(...childCenters);
        const childrenCenter = (minChildCenter + maxChildCenter) / 2;

        if (units.length === 1) {
          const newStartX = childrenCenter - unit.width / 2;
          const curY = calculatedPositions.get(unit.primary.id).y;
          calculatedPositions.set(unit.primary.id, { x: newStartX, y: curY });
          if (unit.spouse) {
            calculatedPositions.set(unit.spouse.id, {
              x: newStartX + NODE_WIDTH + SPOUSE_GAP,
              y: curY,
            });
          }
        }
      }
    });

    // Ensure no overlapping units in generation g
    let curX = -Infinity;
    units.forEach((unit) => {
      const pos = calculatedPositions.get(unit.primary.id);
      if (pos.x < curX) {
        calculatedPositions.set(unit.primary.id, { x: curX, y: pos.y });
        if (unit.spouse) {
          calculatedPositions.set(unit.spouse.id, {
            x: curX + NODE_WIDTH + SPOUSE_GAP,
            y: pos.y,
          });
        }
      }
      curX = calculatedPositions.get(unit.primary.id).x + unit.width + SIBLING_GAP;
    });
  }

  // 3. Center the entire connected family component around X = 0
  let allMinX = Infinity;
  let allMaxX = -Infinity;
  calculatedPositions.forEach((pos) => {
    if (pos.x < allMinX) allMinX = pos.x;
    if (pos.x + NODE_WIDTH > allMaxX) allMaxX = pos.x + NODE_WIDTH;
  });

  const totalWidth = allMaxX - allMinX;
  const centerShift = allMinX + totalWidth / 2;

  calculatedPositions.forEach((pos, id) => {
    calculatedPositions.set(id, {
      x: pos.x - centerShift,
      y: pos.y,
    });
  });

  // 4. Construct Nodes Map
  const nodes = new Map();
  persons.forEach((person) => {
    const pos = calculatedPositions.get(person.id) || { x: 0, y: 0 };
    const gen = genMap.get(person.id) ?? 0;
    nodes.set(person.id, {
      ...pos,
      person,
      gen,
      rank: resolveRank(gen, minGen, maxGen),
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      centerX: pos.x + NODE_WIDTH / 2,
      centerY: pos.y + NODE_HEIGHT / 2,
    });
  });

  // 5. Construct Relationship SVG Connector Paths with Clean Orthogonal Routing
  const lines = [];

  // A. Spouse Connections — side-to-side horizontal connector at card side center
  relationships.forEach((r) => {
    if (r.type === 'spouse') {
      const a = String(r.personAId || r.personId1);
      const b = String(r.personBId || r.personId2);
      const n1 = nodes.get(a);
      const n2 = nodes.get(b);
      if (n1 && n2) {
        const leftNode = n1.x < n2.x ? n1 : n2;
        const rightNode = n1.x < n2.x ? n2 : n1;
        const y1 = leftNode.y + PORTRAIT_BAND_Y;
        const y2 = rightNode.y + PORTRAIT_BAND_Y;
        const x1 = leftNode.x + NODE_WIDTH;
        const x2 = rightNode.x;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const path =
          Math.abs(y1 - y2) < 2
            ? `M ${x1} ${y1} L ${x2} ${y2}`
            : `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;

        lines.push({
          id: `spouse-${a}-${b}`,
          type: 'spouse',
          personId1: a,
          personId2: b,
          x1,
          y1,
          x2,
          y2,
          midX,
          midY,
          startDate: r.startDate,
          path,
        });
      }
    }
  });

  // B. Parent-to-Child Lineage Connections with Orthogonal Junction Routing:
  // parent(s) -> vertical stem -> junction bus -> vertical drop -> child
  // Group children by their shared parent unit
  const parentUnitChildren = new Map(); // parentUnitKey -> { p1, p2, children: [] }

  childToParents.forEach((pIds, childId) => {
    const childNode = nodes.get(childId);
    if (!childNode || pIds.length === 0) return;

    // Resolve primary parent and check if married to spouse in same generation
    const p1 = nodes.get(pIds[0]);
    let p2 = pIds[1] ? nodes.get(pIds[1]) : null;
    if (!p2 && p1) {
      const spId = spouseMap.get(p1.person.id);
      if (spId && nodes.has(spId)) {
        p2 = nodes.get(spId);
      }
    }

    if (!p1 && !p2) return;

    const parentUnitKey = p2
      ? [p1.person.id, p2.person.id].sort().join('-')
      : (p1 ? p1.person.id : p2.person.id);

    if (!parentUnitChildren.has(parentUnitKey)) {
      parentUnitChildren.set(parentUnitKey, {
        p1: p1 || p2,
        p2: p1 ? p2 : null,
        children: [],
      });
    }

    parentUnitChildren.get(parentUnitKey).children.push({
      childId,
      childNode,
      directParentIds: pIds,
    });
  });

  parentUnitChildren.forEach(({ p1, p2, children }) => {
    // Determine source anchor point:
    // If a couple, stem drops from between the couple at bottom center
    // If single parent, stem drops from parent card bottom center
    let sourceX, sourceY;
    if (p1 && p2) {
      sourceX = (p1.centerX + p2.centerX) / 2;
      // Originate lineage stem directly at the marriage union line between parents
      sourceY = Math.round((p1.y + p2.y) / 2 + PORTRAIT_BAND_Y);
    } else {
      sourceX = p1.centerX;
      sourceY = p1.y + NODE_HEIGHT;
    }

    // Children top anchor
    const minChildY = Math.min(...children.map((c) => c.childNode.y));
    // Junction bar runs halfway through the vertical generation gap below parent cards
    const parentBottomY = Math.max(p1.y, p2 ? p2.y : p1.y) + NODE_HEIGHT;
    const junctionY = parentBottomY + Math.max((minChildY - parentBottomY) * 0.5, 20);

    children.forEach(({ childId, childNode, directParentIds }) => {
      const targetX = childNode.centerX;
      const targetY = childNode.y;

      let path;
      if (Math.abs(sourceX - targetX) < 2) {
        // Direct vertical drop from marriage union/parent down to child
        path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
      } else {
        // Orthogonal routing with smooth rounded corner fillets (radius r)
        const r = Math.min(8, Math.abs(targetX - sourceX) * 0.5, Math.max((junctionY - parentBottomY) * 0.4, 6));
        const goRight = targetX > sourceX;

        if (goRight) {
          path = `M ${sourceX} ${sourceY} L ${sourceX} ${junctionY - r} Q ${sourceX} ${junctionY} ${sourceX + r} ${junctionY} L ${targetX - r} ${junctionY} Q ${targetX} ${junctionY} ${targetX} ${junctionY + r} L ${targetX} ${targetY}`;
        } else {
          path = `M ${sourceX} ${sourceY} L ${sourceX} ${junctionY - r} Q ${sourceX} ${junctionY} ${sourceX - r} ${junctionY} L ${targetX + r} ${junctionY} Q ${targetX} ${junctionY} ${targetX} ${junctionY + r} L ${targetX} ${targetY}`;
        }
      }

      lines.push({
        id: `lineage-${directParentIds.join('-')}-${childId}`,
        type: 'parent-child',
        parentIds: directParentIds,
        allParentIds: p2 ? [p1.person.id, p2.person.id] : [p1.person.id],
        childId,
        sourceX,
        sourceY,
        junctionY,
        targetX,
        targetY,
        path: path.trim().replace(/\s+/g, ' '),
      });
    });
  });

  // C. Sibling Connections — direct horizontal connector between siblings
  relationships.forEach((r) => {
    if (r.type === 'sibling') {
      const a = String(r.personAId || r.personId1);
      const b = String(r.personBId || r.personId2);
      const n1 = nodes.get(a);
      const n2 = nodes.get(b);
      if (n1 && n2) {
        const leftNode = n1.x < n2.x ? n1 : n2;
        const rightNode = n1.x < n2.x ? n2 : n1;
        const y = leftNode.y + PORTRAIT_BAND_Y;
        const x1 = leftNode.x + NODE_WIDTH;
        const x2 = rightNode.x;
        const midX = (x1 + x2) / 2;

        lines.push({
          id: `sibling-${a}-${b}`,
          type: 'sibling',
          personId1: a,
          personId2: b,
          x1,
          y1: y,
          x2,
          y2: y,
          midX,
          midY: y,
          path: `M ${x1} ${y} L ${x2} ${y}`,
        });
      }
    }
  });

  // 6. Dynamic Bounds & Generation Guide Tracks
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    if (node.x < minX) minX = node.x;
    if (node.x + NODE_WIDTH > maxX) maxX = node.x + NODE_WIDTH;
    if (node.y < minY) minY = node.y;
    if (node.y + NODE_HEIGHT > maxY) maxY = node.y + NODE_HEIGHT;
  });

  if (minX === Infinity) {
    minX = -400; maxX = 400; minY = 0; maxY = 500;
  }

  // Generous padding so SVG lines, rings, and halos never clip
  const padX = 80;
  const padY = 60;
  const bounds = {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
    width: maxX - minX + padX * 2,
    height: maxY - minY + padY * 2,
  };

  const generationTracks = [];
  for (let g = minGen; g <= maxGen; g++) {
    const config = GENERATION_CONFIG[g] || {
      title: `Generation ${g + 1}`,
      era: 'Lineage Era',
      color: '#0F6B5B',
    };
    generationTracks.push({
      gen: g,
      y: (g - minGen) * GENERATION_HEIGHT,
      height: NODE_HEIGHT,
      roman: ROMAN[g - minGen] || String(g - minGen + 1),
      title: config.title,
      era: config.era,
      color: config.color,
      labelX: bounds.minX + 30,
    });
  }

  return {
    nodes,
    lines,
    generationTracks,
    bounds,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
  };
}
