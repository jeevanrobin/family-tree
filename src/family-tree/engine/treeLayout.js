/**
 * Family Tree Automatic Layout Engine — Data-Driven Hierarchy
 * 
 * Dynamically computes spatial coordinates, couple groupings, sibling distribution,
 * descendant subtrees, and connection routes from pure people & relationship data.
 * ZERO HARDCODED IDS OR FIXED COORDINATES.
 * 
 * M5C.3: Subtree Geometry Applied to Actual Positioning
 * - Uses FamilySubtree metadata from subtreeGeometry.js
 * - Positions child branches based on calculated subtree widths
 * - Centers parents over complete descendant footprint
 * - SUBTREE_GAP (72px) between sibling family branches
 */

import { computeGenerations, GENERATION_CONFIG } from '../data/familyDataService.js';
import { computeSubtreeGeometry, FamilySubtree } from './subtreeGeometry.js';
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
 * Computes a completely data-driven spatial tree layout with subtree geometry
 */
export function computeTreeLayout(persons, relationships, siblingOrders = {}) {
  if (!persons || persons.length === 0) {
    return {
      nodes: new Map(),
      lines: [],
      generationTracks: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
      fullBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      branchBadges: [],
      allNodes: new Map(),
    };
  }

  const personMap = new Map();
  persons.forEach((p) => personMap.set(String(p.id), p));

  // Compute dynamic generations from graph
  const genMap = computeGenerations(persons, relationships);

  // M5C.3: Build subtree geometry FIRST
  const subtreeMap = computeSubtreeGeometry(persons, relationships, genMap);

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

  // Build family units with proper spouse orientation
  const processedPersons = new Set();
  const layerUnits = new Map();
  
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

  // Build units by generation
  for (let g = minGen; g <= maxGen; g++) {
    const list = genLayers.get(g) || [];
    const units = [];
    list.forEach(p => {
      const u = getOrBuildUnit(p.id);
      if (u) units.push(u);
    });
    layerUnits.set(g, units);
  }

  // M5C.3: Position using subtree widths
  const calculatedPositions = new Map();
  
  // Position recursively - top-down with width-based centering
  function positionUnitAndDescendants(unit, startX, y) {
    // Get subtree for this unit
    const subtree = subtreeMap.get(unit.primary.id);
    const reservedWidth = subtree ? subtree.width : unit.width;
    
    // Center the unit within its reserved subtree width
    const unitCenterX = startX + reservedWidth / 2;
    const unitStartX = unitCenterX - unit.width / 2;
    
    calculatedPositions.set(unit.primary.id, { x: unitStartX, y });
    
    if (unit.spouse) {
      calculatedPositions.set(unit.spouse.id, {
        x: unitStartX + NODE_WIDTH + SPOUSE_GAP,
        y
      });
    }
    
    // Position children using their subtree widths
    const childIds = unit.childrenIds || [];
    if (childIds.length === 0) return;
    
    const childGen = unit.gen + 1;
    const childY = (childGen - minGen) * GENERATION_HEIGHT;
    const childUnits = layerUnits.get(childGen) || [];
    
    // Find child units (avoid duplicates for couples)
    const myChildUnits = [];
    const seen = new Set();
    
    childIds.forEach(childId => {
      if (seen.has(childId)) return;
      seen.add(childId);
      
      const childUnit = childUnits.find(u => 
        u.primary.id === childId || u.spouse?.id === childId
      );
      
      if (childUnit) {
        if (childUnit.spouse) {
          seen.add(childUnit.spouse.id);
        }
        myChildUnits.push(childUnit);
      }
    });
    
    // Apply sibling ordering if available
    const cohortKey = `${unit.primary.id}-children`;
    if (siblingOrders[cohortKey]) {
      const order = siblingOrders[cohortKey];
      myChildUnits.sort((a, b) => {
        const aIdx = order.indexOf(a.primary.id);
        const bIdx = order.indexOf(b.primary.id);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }
    
    // Calculate total width needed for all children
    let totalChildWidth = 0;
    myChildUnits.forEach((cu, idx) => {
      const childSubtree = subtreeMap.get(cu.primary.id);
      totalChildWidth += childSubtree ? childSubtree.width : cu.width;
      if (idx < myChildUnits.length - 1) {
        totalChildWidth += SUBTREE_GAP;
      }
    });
    
    // Position children sequentially within the parent's reserved width
    let childX = unitCenterX - totalChildWidth / 2;
    
    myChildUnits.forEach((child, idx) => {
      const childSubtree = subtreeMap.get(child.primary.id);
      const childWidth = childSubtree ? childSubtree.width : child.width;
      
      positionUnitAndDescendants(child, childX, childY);
      
      childX += childWidth + (idx < myChildUnits.length - 1 ? SUBTREE_GAP : 0);
    });
  }

  // Position root generation
  const rootUnits = layerUnits.get(minGen) || [];
  if (rootUnits.length > 0) {
    // Calculate total width needed
    let totalWidth = 0;
    rootUnits.forEach((unit, idx) => {
      const subtree = subtreeMap.get(unit.primary.id);
      totalWidth += subtree ? subtree.width : unit.width;
      if (idx < rootUnits.length - 1) {
        totalWidth += SUBTREE_GAP;
      }
    });
    
    const rootY = 0;
    let currentX = -totalWidth / 2;
    
    rootUnits.forEach((unit, idx) => {
      const subtree = subtreeMap.get(unit.primary.id);
      const width = subtree ? subtree.width : unit.width;
      
      positionUnitAndDescendants(unit, currentX, rootY);
      
      currentX += width + (idx < rootUnits.length - 1 ? SUBTREE_GAP : 0);
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
