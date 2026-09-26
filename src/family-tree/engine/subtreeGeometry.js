/**
 * Subtree Geometry Engine — M5C.2
 * 
 * Deterministic geometry calculations for family cluster layouts.
 * This module calculates subtree metadata (widths, heights, branch counts)
 * WITHOUT positioning any nodes. Positioning happens in the next stage.
 * 
 * KEY CONCEPTS:
 * - Family Unit: A couple (spouses) or single person
 * - Subtree: A family unit + all descendants
 * - Width: Horizontal space needed for a subtree
 * - Height: Vertical depth of a subtree (generations)
 * 
 * ALL CALCULATIONS ARE DETERMINISTIC:
 * - Same input → same output
 * - No random values
 * - No DOM measurements
 * - No browser-dependent values
 */

import {
  NODE_WIDTH,
  NODE_HEIGHT,
  SPOUSE_GAP,
  SIBLING_GAP,
  SUBTREE_GAP,
  DESCENDANT_GAP,
  GENERATION_HEIGHT,
} from './treeLayout.js';

/**
 * Calculate the width needed for a family unit (couple or single)
 */
export function calculateUnitWidth(hasSpouse) {
  return hasSpouse ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH;
}

/**
 * Calculate the minimum width for a subtree
 * Ensures small branches don't collapse
 */
export function calculateMinSubtreeWidth(hasSpouse, childCount) {
  const unitWidth = calculateUnitWidth(hasSpouse);
  
  if (childCount === 0) {
    return unitWidth;
  }
  
  // Children need at least unit width + spacing
  const minChildWidth = NODE_WIDTH;
  const minChildrenWidth = childCount * minChildWidth + (childCount - 1) * SIBLING_GAP;
  
  return Math.max(unitWidth, minChildrenWidth);
}

/**
 * FamilySubtree: Immutable data structure representing a family branch
 */
export class FamilySubtree {
  constructor({
    rootPersonId,
    spouseId = null,
    childrenIds = [],
    gen = 0,
    width = NODE_WIDTH,
    height = GENERATION_HEIGHT,
    childSubtrees = [],
    personCount = 1,
    descendantCount = 0,
    branchCount = 1,
  }) {
    this.rootPersonId = rootPersonId;
    this.spouseId = spouseId;
    this.childrenIds = Object.freeze([...childrenIds]);
    this.gen = gen;
    this.width = width;
    this.height = height;
    this.childSubtrees = Object.freeze([...childSubtrees]);
    this.personCount = personCount;
    this.descendantCount = descendantCount;
    this.branchCount = branchCount;
    
    // Freeze to ensure immutability
    Object.freeze(this);
  }
  
  get hasSpouse() {
    return this.spouseId !== null;
  }
  
  get unitWidth() {
    return calculateUnitWidth(this.hasSpouse);
  }
  
  get childCount() {
    return this.childrenIds.length;
  }
  
  /**
   * Get the center X position relative to subtree left edge
   */
  getRelativeCenterX() {
    return this.width / 2;
  }
  
  /**
   * Get total footprint including all descendants
   */
  getTotalFootprint() {
    return {
      width: this.width,
      height: this.height,
      personCount: this.personCount,
      descendantCount: this.descendantCount,
      branchCount: this.branchCount,
    };
  }
}

/**
 * Compute subtree geometry for all family units
 * 
 * @param {Array} persons - All people in the tree
 * @param {Array} relationships - All relationships
 * @param {Map} genMap - Generation map (personId -> gen)
 * @returns {Map} - personId -> FamilySubtree
 */
export function computeSubtreeGeometry(persons, relationships, genMap) {
  if (!persons || persons.length === 0) {
    return new Map();
  }
  
  // Build relationship maps
  const spouseMap = new Map();
  const parentToChildren = new Map();
  const childToParents = new Map();
  
  relationships.forEach(r => {
    if (r.type === 'spouse') {
      const a = String(r.personAId || r.personId1);
      const b = String(r.personBId || r.personId2);
      spouseMap.set(a, b);
      spouseMap.set(b, a);
    } else if (r.type === 'parent-child' || r.type === 'parent') {
      const parentId = String(r.parentId || r.personId1);
      const childId = String(r.childId || r.personId2);
      
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, []);
      }
      if (!parentToChildren.get(parentId).includes(childId)) {
        parentToChildren.get(parentId).push(childId);
      }
      
      if (!childToParents.has(childId)) {
        childToParents.set(childId, []);
      }
      if (!childToParents.get(childId).includes(parentId)) {
        childToParents.get(childId).push(parentId);
      }
    }
  });
  
  // Build person map
  const personMap = new Map();
  persons.forEach(p => personMap.set(String(p.id), p));
  
  // Track processed units (avoid duplicates for spouses)
  const processedUnits = new Set();
  const subtreeMap = new Map();
  
  // Find all ROOT units - people without parents OR in earliest generation
  const minGen = Math.min(...Array.from(genMap.values()));
  
  // Only process people who are roots (no parents or in minGen)
  const rootPersons = persons.filter(person => {
    const personId = String(person.id);
    const parents = childToParents.get(personId) || [];
    const gen = genMap.get(personId) ?? 0;
    // Root if no parents OR in minimum generation
    return parents.length === 0 || gen === minGen;
  });
  
  // Process all ROOT family units recursively
  rootPersons.forEach(person => {
    const personId = String(person.id);
    
    // Skip if already processed as spouse
    if (processedUnits.has(personId)) return;
    
    // Skip if this person has a spouse who appears earlier
    const spouseId = spouseMap.get(personId);
    if (spouseId && processedUnits.has(spouseId)) return;
    
    // Build subtree for this unit
    const subtree = buildSubtree(
      personId,
      spouseId,
      spouseMap,
      parentToChildren,
      childToParents,
      genMap,
      processedUnits
    );
    
    // Map ALL persons in the subtree to this subtree object
    mapSubtreeToPersons(subtree, subtreeMap);
  });
  
  return subtreeMap;
}

/**
 * Recursively map all persons in a subtree to the subtree object
 */
function mapSubtreeToPersons(subtree, subtreeMap) {
  // Map root person
  subtreeMap.set(subtree.rootPersonId, subtree);
  
  // Map spouse if exists
  if (subtree.spouseId) {
    subtreeMap.set(subtree.spouseId, subtree);
  }
  
  // Recursively map all persons in child subtrees
  subtree.childSubtrees.forEach(childSubtree => {
    mapSubtreeToPersons(childSubtree, subtreeMap);
  });
}

/**
 * Recursively build a FamilySubtree for a unit and all descendants
 */
function buildSubtree(
  personId,
  spouseId,
  spouseMap,
  parentToChildren,
  childToParents,
  genMap,
  processedUnits,
  ancestry = new Set()
) {
  // Mark as processed
  processedUnits.add(personId);
  if (spouseId) {
    processedUnits.add(spouseId);
  }

  // People on the path from the root down to this unit. Bad data (someone
  // recorded as their own ancestor, or a spouse also recorded as a parent)
  // would otherwise recurse forever.
  const path = new Set(ancestry);
  path.add(personId);
  if (spouseId) path.add(spouseId);
  
  const gen = genMap.get(personId) ?? 0;
  const hasSpouse = spouseId !== null && spouseId !== undefined;
  
  // Collect children (from both spouses if applicable)
  const childrenIds = new Set();
  
  (parentToChildren.get(personId) || []).forEach(c => childrenIds.add(c));
  if (hasSpouse) {
    (parentToChildren.get(spouseId) || []).forEach(c => childrenIds.add(c));
  }
  
  // Filter out children that have other recorded parents (already processed)
  const directChildren = Array.from(childrenIds).filter(childId => {
    if (path.has(childId)) return false;
    const parents = childToParents.get(childId) || [];
    // Include if this is one of their parents
    return parents.includes(personId) || (hasSpouse && parents.includes(spouseId));
  });
  
  // Recursively build child subtrees
  const childSubtrees = [];
  const processedChildren = new Set();
  
  directChildren.forEach(childId => {
    if (processedChildren.has(childId)) return;
    
    const childSpouseId = spouseMap.get(childId);
    if (childSpouseId && directChildren.includes(childSpouseId)) {
      // This child has a spouse who is also a direct child - process as couple
      if (!processedChildren.has(childSpouseId)) {
        processedChildren.add(childId);
        processedChildren.add(childSpouseId);
        
        const childSubtree = buildSubtree(
          childId,
          childSpouseId,
          spouseMap,
          parentToChildren,
          childToParents,
          genMap,
          processedUnits,
          path
        );
        
        childSubtrees.push(childSubtree);
      }
    } else {
      // Single child
      processedChildren.add(childId);
      
      const childSubtree = buildSubtree(
        childId,
        path.has(childSpouseId) ? null : childSpouseId,
        spouseMap,
        parentToChildren,
        childToParents,
        genMap,
        processedUnits,
        path
      );
      
      childSubtrees.push(childSubtree);
    }
  });
  
  // Calculate widths and counts
  const unitWidth = calculateUnitWidth(hasSpouse);
  
  let subtreeWidth;
  let subtreeHeight = GENERATION_HEIGHT;
  let personCount = hasSpouse ? 2 : 1;
  let descendantCount = 0;
  let branchCount = childSubtrees.length > 0 ? childSubtrees.length : 1;
  
  if (childSubtrees.length === 0) {
    // Leaf node
    subtreeWidth = unitWidth;
  } else {
    // Calculate total width for children
    // Use SUBTREE_GAP between sibling family branches
    let totalChildWidth = 0;
    let maxChildHeight = 0;
    
    childSubtrees.forEach((child, idx) => {
      totalChildWidth += child.width;
      if (idx < childSubtrees.length - 1) {
        totalChildWidth += SUBTREE_GAP;
      }
      
      maxChildHeight = Math.max(maxChildHeight, child.height);
      
      // Aggregate counts
      personCount += child.personCount;
      descendantCount += child.personCount; // All persons in child subtree are descendants
      branchCount = Math.max(branchCount, child.branchCount);
    });
    
    // Subtree width is MAX of unit width and total children width
    subtreeWidth = Math.max(unitWidth, totalChildWidth);
    
    // Subtree height includes descendant generations
    subtreeHeight = GENERATION_HEIGHT + maxChildHeight;
  }
  
  return new FamilySubtree({
    rootPersonId: personId,
    spouseId: hasSpouse ? spouseId : null,
    childrenIds: directChildren,
    gen,
    width: subtreeWidth,
    height: subtreeHeight,
    childSubtrees,
    personCount,
    descendantCount,
    branchCount,
  });
}

/**
 * Get subtree width for a person
 * Useful for layout planning
 */
export function getSubtreeWidth(personId, subtreeMap) {
  const subtree = subtreeMap.get(String(personId));
  return subtree ? subtree.width : NODE_WIDTH;
}

/**
 * Get total descendant count for a person
 */
export function getDescendantCount(personId, subtreeMap) {
  const subtree = subtreeMap.get(String(personId));
  return subtree ? subtree.descendantCount : 0;
}

/**
 * Debug: Print subtree structure
 */
export function printSubtree(subtree, indent = 0) {
  const pad = '  '.repeat(indent);
  console.log(`${pad}Unit: ${subtree.rootPersonId}${subtree.spouseId ? ` + ${subtree.spouseId}` : ''}`);
  console.log(`${pad}  Width: ${subtree.width}px`);
  console.log(`${pad}  Height: ${subtree.height}px`);
  console.log(`${pad}  Persons: ${subtree.personCount}`);
  console.log(`${pad}  Descendants: ${subtree.descendantCount}`);
  console.log(`${pad}  Branches: ${subtree.branchCount}`);
  
  subtree.childSubtrees.forEach(child => {
    printSubtree(child, indent + 1);
  });
}

export default {
  FamilySubtree,
  computeSubtreeGeometry,
  calculateUnitWidth,
  calculateMinSubtreeWidth,
  getSubtreeWidth,
  getDescendantCount,
  printSubtree,
};
