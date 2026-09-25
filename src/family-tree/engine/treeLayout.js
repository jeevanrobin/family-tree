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

const LAYOUT_OPTION_KEYS = ['collapsedUnits', 'focusPersonId', 'focusMode', 'customSiblingOrders'];

/**
 * The third argument is either a layout options object or (legacy) a plain
 * sibling-order map { cohortKey: [personId, ...] }.
 */
function normalizeLayoutOptions(arg) {
  const value = arg || {};
  const isOptions = LAYOUT_OPTION_KEYS.some((key) => key in value);
  if (!isOptions) {
    return { collapsedUnits: new Set(), focusPersonId: null, focusMode: 'all', siblingOrders: value };
  }
  return {
    collapsedUnits: value.collapsedUnits instanceof Set ? value.collapsedUnits : new Set(value.collapsedUnits || []),
    focusPersonId: value.focusPersonId != null ? String(value.focusPersonId) : null,
    focusMode: value.focusMode || 'all',
    siblingOrders: value.customSiblingOrders || {},
  };
}

/** Collapse key for a family unit, as used by the UI (`unit-<personId>`). */
export function getUnitKey(personId) {
  return `unit-${personId}`;
}

/**
 * Computes a completely data-driven spatial tree layout with subtree geometry.
 *
 * @param {Array} persons
 * @param {Array} relationships
 * @param {Object} [options]
 * @param {Set<string>} [options.collapsedUnits] unit keys (`unit-<personId>`) whose descendants are hidden
 * @param {string} [options.focusPersonId] selected person
 * @param {'all'|'person'|'family'} [options.focusMode] 'person' keeps the person's ancestors and all
 *   descendants expanded; 'family' keeps their ancestors and their own children. Other branches collapse.
 * @param {Object} [options.customSiblingOrders] { cohortKey: [bloodChildId, ...] }
 */
export function computeTreeLayout(persons, relationships, layoutOptions = {}) {
  const { collapsedUnits, focusPersonId, focusMode, siblingOrders } = normalizeLayoutOptions(layoutOptions);
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
  const spouseMap = new Map(); // personId -> spouse (the only one, when there is exactly one)
  const spouseLists = new Map(); // personId -> [{ id, startDate, order }]

  relationships.forEach((r, order) => {
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
      for (const [x, y] of [[a, b], [b, a]]) {
        if (!spouseLists.has(x)) spouseLists.set(x, []);
        if (!spouseLists.get(x).some((s) => s.id === y)) {
          spouseLists.get(x).push({ id: y, startDate: r.startDate || null, order });
        }
      }
    }
  });

  // Earlier marriages first (by start date, then by record order).
  const spousesOf = (personId) =>
    (spouseLists.get(String(personId)) || [])
      .slice()
      .sort((x, y) => {
        if (x.startDate && y.startDate && x.startDate !== y.startDate) return x.startDate < y.startDate ? -1 : 1;
        return x.order - y.order;
      })
      .map((s) => s.id);
  // A person with several spouses is laid out as one family unit.
  const hasMultiSpouse = [...spouseLists.values()].some((list) => list.length > 1);

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
    if (!personMap.has(pId)) return null;

    // Build the unit around the person with several spouses (if any), so a
    // remarried person and all their spouses stay together.
    let hubId = String(pId);
    const directSpouses = spousesOf(hubId).filter((id) => personMap.has(id) && !processedPersons.has(id));
    if (directSpouses.length === 1 && spousesOf(directSpouses[0]).length > 1) {
      hubId = directSpouses[0];
    }
    const person = personMap.get(hubId);
    processedPersons.add(String(pId));
    processedPersons.add(hubId);

    const spouseIds = spousesOf(hubId).filter(
      (id) => personMap.has(id) && (!processedPersons.has(id) || id === String(pId))
    );
    spouseIds.forEach((id) => processedPersons.add(id));
    const spouses = spouseIds.map((id) => personMap.get(id));

    // Left-to-right order: [spouse] [person] [later spouses...] for remarriages,
    // [person] [spouse] for a single marriage.
    const memberIds = spouses.length > 1
      ? [spouseIds[0], hubId, ...spouseIds.slice(1)]
      : [hubId, ...spouseIds];

    // Children are the combined children of the person and every spouse
    const childrenIds = new Set();
    [hubId, ...spouseIds].forEach((id) => {
      (parentToChildren.get(id) || []).forEach((c) => childrenIds.add(c));
    });

    const gen = genMap.get(pId) ?? 0;
    const unitWidth = memberIds.length * NODE_WIDTH + (memberIds.length - 1) * SPOUSE_GAP;

    let id = `unit-${hubId}`;
    if (spouses.length === 1) id = `couple-${hubId}-${spouses[0].id}`;
    else if (spouses.length > 1) id = `family-${hubId}`;

    return {
      id,
      primary: person,
      spouse: spouses[0] || null,
      spouses,
      memberIds,
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

  // ── Collapse & focus ─────────────────────────────────────────
  const focusActive =
    focusMode !== 'all' && focusPersonId !== null && personMap.has(focusPersonId);
  const constrained = focusActive || collapsedUnits.size > 0;
  // The M5C.2 subtree geometry models one spouse per person, so remarriages
  // are measured with the recursive unit measure below instead.
  const useSubtreeGeometry = !constrained && !hasMultiSpouse;

  const collectRelatives = (startId, edges) => {
    const found = new Set();
    const stack = [...(edges.get(startId) || [])];
    while (stack.length > 0) {
      const id = String(stack.pop());
      if (found.has(id)) continue;
      found.add(id);
      stack.push(...(edges.get(id) || []));
    }
    return found;
  };
  const focusAncestors = focusActive ? collectRelatives(focusPersonId, childToParents) : new Set();
  const focusDescendants = focusActive ? collectRelatives(focusPersonId, parentToChildren) : new Set();

  const unitMemberIds = (unit) => unit.memberIds.map(String);

  function isUnitCollapsed(unit) {
    const members = unitMemberIds(unit);
    if (collapsedUnits.has(unit.id) || members.some((id) => collapsedUnits.has(getUnitKey(id)))) {
      return true;
    }
    if (!focusActive) return false;
    if (members.includes(focusPersonId)) return false;
    if (members.some((id) => focusAncestors.has(id))) return false;
    if (focusMode === 'person' && members.some((id) => focusDescendants.has(id))) return false;
    return true;
  }

  // Child family units of a unit, in display order, with the blood child of each.
  const childUnitCache = new Map();
  function getChildUnits(unit) {
    if (childUnitCache.has(unit.id)) return childUnitCache.get(unit.id);

    const childIds = unit.childrenIds || [];
    const childUnits = layerUnits.get(unit.gen + 1) || [];
    const result = [];
    const seen = new Set();

    childIds.forEach((childId) => {
      if (seen.has(childId)) return;
      seen.add(childId);

      const childUnit = childUnits.find((u) => u.memberIds.includes(String(childId)));
      if (childUnit) {
        childUnit.memberIds.forEach((id) => seen.add(id));
        result.push({ unit: childUnit, bloodChildId: String(childId) });
      }
    });

    const applyCustomOrder = (list, key) => {
      const order = siblingOrders[key];
      if (!Array.isArray(order)) return list;
      const orderIds = order.map(String);
      return list.slice().sort((a, b) => {
        const aIdx = orderIds.indexOf(a.bloodChildId);
        const bIdx = orderIds.indexOf(b.bloodChildId);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    };

    const primaryId = String(unit.primary.id);
    const cohortKey = `${primaryId}-children`;
    let entry;

    if (unit.spouses.length <= 1) {
      // Apply sibling ordering if available
      const ordered = applyCustomOrder(result, cohortKey);
      entry = { cohortKey, children: ordered.map((c) => ({ ...c, cohortKey })) };
    } else {
      // Remarriage: each marriage's children form their own sibling group, laid
      // out under that marriage, left to right in the same order as the spouses.
      const groupOf = (bloodChildId) => {
        const parents = (childToParents.get(bloodChildId) || []).map(String);
        return unit.spouses.find((sp) => parents.includes(String(sp.id)))?.id ?? null;
      };
      const groupKeys = unit.memberIds.map((id) => (id === primaryId ? null : id));
      const children = [];
      groupKeys.forEach((spouseId) => {
        const key = spouseId ? `${primaryId}-${spouseId}-children` : cohortKey;
        const group = result.filter((c) => String(groupOf(c.bloodChildId)) === String(spouseId));
        applyCustomOrder(group, key).forEach((c) => children.push({ ...c, cohortKey: key }));
      });
      entry = { cohortKey, children };
    }

    childUnitCache.set(unit.id, entry);
    return entry;
  }

  // Horizontal space a unit reserves for itself and its visible descendants.
  // Without collapse/focus this is the M5C.2 subtree geometry width.
  const measureCache = new Map();
  function measureUnit(unit) {
    if (useSubtreeGeometry) {
      const subtree = subtreeMap.get(unit.primary.id);
      return subtree ? subtree.width : unit.width;
    }
    if (measureCache.has(unit.id)) return measureCache.get(unit.id);
    measureCache.set(unit.id, unit.width); // guards against malformed cyclic data

    const children = isUnitCollapsed(unit) ? [] : getChildUnits(unit).children;
    let width = unit.width;
    if (children.length > 0) {
      const childrenWidth = children.reduce((sum, c) => sum + measureUnit(c.unit), 0)
        + SUBTREE_GAP * (children.length - 1);
      width = Math.max(unit.width, childrenWidth);
    }
    measureCache.set(unit.id, width);
    return width;
  }

  // M5C.3: Position using subtree widths
  const calculatedPositions = new Map();
  const cohortMeta = new Map(); // personId -> sibling cohort info for Arrange mode
  const hiddenIds = new Set();
  // Keyed by unit: a couple reachable through both spouses' parents is placed
  // twice and the later placement wins, so its badge must follow the same rule.
  const branchBadges = new Map();

  function hideDescendants(unit) {
    getChildUnits(unit).children.forEach(({ unit: child }) => {
      const members = unitMemberIds(child);
      if (members.every((id) => hiddenIds.has(id))) return;
      members.forEach((id) => hiddenIds.add(id));
      hideDescendants(child);
    });
  }

  // Position recursively - top-down with width-based centering
  function positionUnitAndDescendants(unit, startX, y) {
    const reservedWidth = measureUnit(unit);
    
    // Center the unit within its reserved subtree width
    const unitCenterX = startX + reservedWidth / 2;
    const unitStartX = unitCenterX - unit.width / 2;
    
    unit.memberIds.forEach((memberId, index) => {
      calculatedPositions.set(memberId, { x: unitStartX + index * (NODE_WIDTH + SPOUSE_GAP), y });
    });

    const { children } = getChildUnits(unit);
    if (children.length === 0) return;

    const collapsed = isUnitCollapsed(unit);
    const showBadge = collapsed || unitMemberIds(unit).includes(focusPersonId);
    if (showBadge) {
      const name = unit.primary.displayName || unit.primary.firstName || 'this family';
      branchBadges.set(unit.id, {
        id: `badge-${unit.id}`,
        unitKey: getUnitKey(unit.primary.id),
        // Either spouse's key collapses the couple; toggling must handle both.
        unitKeys: unitMemberIds(unit).map(getUnitKey),
        x: unitCenterX,
        y: y + NODE_HEIGHT + 10,
        isCollapsed: collapsed,
        childCount: children.length,
        title: collapsed
          ? `Show ${children.length} ${children.length === 1 ? 'child' : 'children'} of ${name}`
          : `Collapse ${name}'s branch`,
      });
    }

    if (collapsed) {
      hideDescendants(unit);
      return;
    }

    // Sibling cohort metadata for drag-to-reorder (Arrange Family mode)
    children.forEach(({ unit: child, bloodChildId, cohortKey }) => {
      const cohortSiblingIds = children.filter((c) => c.cohortKey === cohortKey).map((c) => c.bloodChildId);
      unitMemberIds(child).forEach((memberId) => {
        cohortMeta.set(memberId, {
          cohortKey,
          bloodChildId,
          cohortSiblingIds,
          siblingIndex: cohortSiblingIds.indexOf(bloodChildId),
          siblingCount: cohortSiblingIds.length,
          canReorder: cohortSiblingIds.length > 1,
        });
      });
    });

    const childGen = unit.gen + 1;
    const childY = (childGen - minGen) * GENERATION_HEIGHT;

    // Calculate total width needed for all children
    const totalChildWidth = children.reduce((sum, c) => sum + measureUnit(c.unit), 0)
      + SUBTREE_GAP * (children.length - 1);

    // Position children sequentially within the parent's reserved width.
    // For remarriages, pull the row toward the couples that actually have
    // children, staying inside the reserved width so branches never collide.
    let rowCenterX = unitCenterX;
    if (unit.spouses.length > 1) {
      const memberCenter = (id) => unitStartX + unit.memberIds.indexOf(id) * (NODE_WIDTH + SPOUSE_GAP) + NODE_WIDTH / 2;
      const hubCenter = memberCenter(String(unit.primary.id));
      const anchors = [...new Set(children.map((c) => c.cohortKey))].map((key) => {
        const spouse = unit.spouses.find((sp) => key === `${unit.primary.id}-${sp.id}-children`);
        return spouse ? (hubCenter + memberCenter(String(spouse.id))) / 2 : hubCenter;
      });
      const target = anchors.reduce((sum, x) => sum + x, 0) / anchors.length;
      const slack = Math.max(0, (reservedWidth - totalChildWidth) / 2);
      rowCenterX = unitCenterX + Math.max(-slack, Math.min(slack, target - unitCenterX));
    }
    let childX = rowCenterX - totalChildWidth / 2;

    children.forEach(({ unit: child }, idx) => {
      const childWidth = measureUnit(child);

      positionUnitAndDescendants(child, childX, childY);

      childX += childWidth + (idx < children.length - 1 ? SUBTREE_GAP : 0);
    });
  }

  // Position root generation
  const rootUnits = layerUnits.get(minGen) || [];
  if (rootUnits.length > 0) {
    // Calculate total width needed
    let totalWidth = 0;
    rootUnits.forEach((unit, idx) => {
      totalWidth += measureUnit(unit);
      if (idx < rootUnits.length - 1) {
        totalWidth += SUBTREE_GAP;
      }
    });
    
    const rootY = 0;
    let currentX = -totalWidth / 2;
    
    rootUnits.forEach((unit, idx) => {
      const width = measureUnit(unit);
      
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
  const badges = [...branchBadges.values()];
  badges.forEach((badge) => {
    badge.x -= centerShift;
  });

  // 4. Construct Nodes Map
  const nodes = new Map();
  persons.forEach((person) => {
    // Hidden behind a collapsed branch (unless also placed through another line)
    if (hiddenIds.has(String(person.id)) && !calculatedPositions.has(person.id)) return;
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
      ...(cohortMeta.get(String(person.id)) || {}),
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
    if (!p2 && p1 && spousesOf(p1.person.id).length === 1) {
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

  // Full (uncollapsed) layout for the minimap overview.
  let allNodes = nodes;
  let fullBounds = bounds;
  if (constrained) {
    const full = computeTreeLayout(persons, relationships, { customSiblingOrders: siblingOrders });
    allNodes = full.nodes;
    fullBounds = full.bounds;
  }

  return {
    nodes,
    allNodes,
    lines,
    generationTracks,
    bounds,
    fullBounds,
    branchBadges: badges,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
  };
}
