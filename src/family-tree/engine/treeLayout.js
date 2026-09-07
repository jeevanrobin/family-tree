/**
 * Family Tree Automatic Layout Engine — Data-Driven Hierarchy
 * 
 * Dynamically computes spatial coordinates, couple groupings, sibling distribution,
 * descendant subtrees, and connection routes from pure people & relationship data.
 * ZERO HARDCODED IDS OR FIXED COORDINATES.
 */

import { computeGenerations, GENERATION_CONFIG } from '../data/familyDataService.js';

/* Portrait plaques: tall archival objects rather than wide list rows.
   Couples sit close enough to read as one household; sibling groups get
   more air so branches stay legible. */
export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 202;
export const SPOUSE_GAP = 18;
export const SIBLING_GAP = 34;
export const FAMILY_UNIT_GAP = 60;
export const COMPONENT_GAP = 96;
export const GENERATION_HEIGHT = 282;

/* Roman numerals for generation marks — generations are genuinely ordinal,
   so the numbering carries real information. */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/* Vertical offset of the portrait centre inside a plaque. Union lines meet
   spouses at eye level rather than across the middle of their text. */
export const PORTRAIT_BAND_Y = 56;

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
      childToParents.get(childId).push(parentId);

      if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
      parentToChildren.get(parentId).push(childId);
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

  // 1. Identify Connected Components & Root Units
  // A family unit is either a married couple [personA, personB] or an individual [personA]
  const processedPersons = new Set();
  const familyUnits = []; // { id, primary, spouse, children, gen, width }

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

  // Build units layer by layer
  const layerUnits = new Map();
  for (let g = minGen; g <= maxGen; g++) {
    const list = genLayers.get(g) || [];
    const units = [];
    list.forEach((p) => {
      const u = getOrBuildUnit(p.id);
      if (u) units.push(u);
    });
    layerUnits.set(g, units);
  }

  // 2. Compute Subtree Widths & Sibling Offsets
  // To avoid overlap, compute bounding width needed for each family unit and its descendants
  const calculatedPositions = new Map(); // personId -> { x, y }

  // Assign X offsets layer by layer
  let globalLeft = 0;

  for (let g = minGen; g <= maxGen; g++) {
    const units = layerUnits.get(g) || [];
    let currentX = 0;

    // Separate into parent-connected groups vs unparented units
    units.forEach((unit, idx) => {
      const y = (g - minGen) * GENERATION_HEIGHT;

      // Check if this unit is children of a parent unit in the previous generation
      const parentsOfUnit = childToParents.get(unit.primary.id) || [];
      let targetCenterX = null;

      if (parentsOfUnit.length > 0) {
        const p1Pos = calculatedPositions.get(parentsOfUnit[0]);
        const p2Pos = parentsOfUnit[1] ? calculatedPositions.get(parentsOfUnit[1]) : null;
        if (p1Pos && p2Pos) {
          targetCenterX = (p1Pos.x + p2Pos.x + NODE_WIDTH) / 2;
        } else if (p1Pos) {
          targetCenterX = p1Pos.x + NODE_WIDTH / 2;
        }
      }

      let unitStartX = currentX;
      if (targetCenterX !== null) {
        // Softly align beneath parent while preventing collision with previous unit
        const desiredStartX = targetCenterX - unit.width / 2;
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
  }

  // 3. Center the entire layout around X = 0
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
      /* Rank drives the subtle portrait/typography weighting per generation.
         Derived from position in the lineage, never hardcoded. */
      rank: resolveRank(gen, minGen, maxGen),
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      centerX: pos.x + NODE_WIDTH / 2,
      centerY: pos.y + NODE_HEIGHT / 2,
    });
  });

  // 5. Construct Relationship SVG Connector Paths
  const lines = [];

  // A. Spouse Connections — a short union line drawn at portrait height
  relationships.forEach((r) => {
    if (r.type === 'spouse') {
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
          id: `spouse-${a}-${b}`,
          type: 'spouse',
          personId1: a,
          personId2: b,
          x1,
          y1: y,
          x2,
          y2: y,
          midX,
          midY: y,
          startDate: r.startDate,
          path: `M ${x1} ${y} L ${x2} ${y}`,
        });
      }
    }
  });

  // B. Parent-to-Child Lineage Connections
  childToParents.forEach((parentIds, childId) => {
    const childNode = nodes.get(childId);
    if (!childNode) return;

    let sourceX, sourceY;
    const p1 = nodes.get(parentIds[0]);
    const p2 = parentIds[1] ? nodes.get(parentIds[1]) : null;

    if (p1 && p2) {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x + NODE_WIDTH, p2.x + NODE_WIDTH);
      sourceX = (minX + maxX) / 2;
      sourceY = Math.max(p1.y, p2.y) + NODE_HEIGHT;
    } else if (p1) {
      sourceX = p1.x + NODE_WIDTH / 2;
      sourceY = p1.y + NODE_HEIGHT;
    } else {
      return;
    }

    const targetX = childNode.x + NODE_WIDTH / 2;
    const targetY = childNode.y;

    /* Smooth vertical S-curve instead of right-angle elbows. Control points
       sit on the vertical through each endpoint, so the line leaves the parent
       and meets the child straight-on and eases sideways in between. */
    const dy = targetY - sourceY;
    const bend = Math.max(28, Math.min(dy * 0.55, 120));
    const path =
      Math.abs(sourceX - targetX) < 2
        ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
        : `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + bend}, ${targetX} ${targetY - bend}, ${targetX} ${targetY}`;

    lines.push({
      id: `lineage-${parentIds.join('-')}-${childId}`,
      type: 'parent-child',
      parentIds,
      childId,
      sourceX,
      sourceY,
      targetX,
      targetY,
      path: path.trim().replace(/\s+/g, ' '),
    });
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
    minX = -400; maxX = 400; minY = 0; maxY = 600;
  }

  // Padding — kept tight so the larger cards do not force the camera to
  // zoom further out than before.
  const padX = 110;
  const padY = 88;
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
