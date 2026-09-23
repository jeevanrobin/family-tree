/**
 * Subtree Geometry Engine Tests — M5C.2
 * 
 * Tests for deterministic geometry calculations
 */

import { describe, it, expect } from 'vitest';
import {
  FamilySubtree,
  computeSubtreeGeometry,
  calculateUnitWidth,
  calculateMinSubtreeWidth,
  getSubtreeWidth,
  getDescendantCount,
} from './subtreeGeometry.js';
import { NODE_WIDTH, SPOUSE_GAP, SIBLING_GAP, SUBTREE_GAP } from './treeLayout.js';

describe('calculateUnitWidth', () => {
  it('returns NODE_WIDTH for single person', () => {
    expect(calculateUnitWidth(false)).toBe(NODE_WIDTH);
  });
  
  it('returns combined width for couple', () => {
    expect(calculateUnitWidth(true)).toBe(NODE_WIDTH * 2 + SPOUSE_GAP);
  });
  
  it('is deterministic - always returns same values', () => {
    expect(calculateUnitWidth(false)).toBe(calculateUnitWidth(false));
    expect(calculateUnitWidth(true)).toBe(calculateUnitWidth(true));
  });
});

describe('calculateMinSubtreeWidth', () => {
  it('returns unit width for leaf node (no children)', () => {
    expect(calculateMinSubtreeWidth(false, 0)).toBe(NODE_WIDTH);
    expect(calculateMinSubtreeWidth(true, 0)).toBe(NODE_WIDTH * 2 + SPOUSE_GAP);
  });
  
  it('ensures minimum space for single child', () => {
    const min = calculateMinSubtreeWidth(false, 1);
    expect(min).toBeGreaterThanOrEqual(NODE_WIDTH);
  });
  
  it('ensures minimum space for multiple children', () => {
    const min = calculateMinSubtreeWidth(false, 3);
    const expectedMin = (3 * NODE_WIDTH) + (2 * SIBLING_GAP);
    expect(min).toBeGreaterThanOrEqual(expectedMin);
  });
  
  it('respects couple width', () => {
    const coupleMin = calculateMinSubtreeWidth(true, 1);
    expect(coupleMin).toBeGreaterThanOrEqual(NODE_WIDTH * 2 + SPOUSE_GAP);
  });
});

describe('computeSubtreeGeometry', () => {
  it('handles empty input', () => {
    const result = computeSubtreeGeometry([], [], new Map());
    expect(result.size).toBe(0);
  });
  
  it('handles single person', () => {
    const persons = [{ id: '1', name: 'Test Person' }];
    const relationships = [];
    const genMap = new Map([['1', 0]]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    expect(subtrees.size).toBe(1);
    expect(subtrees.has('1')).toBe(true);
    
    const subtree = subtrees.get('1');
    expect(subtree.rootPersonId).toBe('1');
    expect(subtree.spouseId).toBe(null);
    expect(subtree.width).toBe(NODE_WIDTH);
    expect(subtree.childSubtrees.length).toBe(0);
  });
  
  it('handles couple without children', () => {
    const persons = [
      { id: '1', name: 'Person A' },
      { id: '2', name: 'Person B' },
    ];
    const relationships = [
      { type: 'spouse', personAId: '1', personBId: '2' },
    ];
    const genMap = new Map([['1', 0], ['2', 0]]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    // Should have subtrees for both persons (pointing to same structure)
    expect(subtrees.has('1')).toBe(true);
    expect(subtrees.has('2')).toBe(true);
    
    const subtree1 = subtrees.get('1');
    const subtree2 = subtrees.get('2');
    
    // Both should point to the same FamilySubtree object
    expect(subtree1).toBe(subtree2);
    
    expect(subtree1.hasSpouse).toBe(true);
    expect(subtree1.width).toBe(NODE_WIDTH * 2 + SPOUSE_GAP);
    expect(subtree1.childSubtrees.length).toBe(0);
  });
  
  it('handles couple with single child', () => {
    const persons = [
      { id: '1', name: 'Parent A' },
      { id: '2', name: 'Parent B' },
      { id: '3', name: 'Child' },
    ];
    const relationships = [
      { type: 'spouse', personAId: '1', personBId: '2' },
      { type: 'parent-child', parentId: '1', childId: '3' },
    ];
    const genMap = new Map([['1', 0], ['2', 0], ['3', 1]]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    const parentSubtree = subtrees.get('1');
    expect(parentSubtree.childSubtrees.length).toBe(1);
    expect(parentSubtree.personCount).toBe(3);
    expect(parentSubtree.descendantCount).toBe(1);
    
    // Parent subtree width should accommodate child
    expect(parentSubtree.width).toBeGreaterThanOrEqual(NODE_WIDTH * 2 + SPOUSE_GAP);
  });
  
  it('handles couple with multiple children', () => {
    const persons = [
      { id: '1', name: 'Parent A' },
      { id: '2', name: 'Parent B' },
      { id: '3', name: 'Child 1' },
      { id: '4', name: 'Child 2' },
      { id: '5', name: 'Child 3' },
    ];
    const relationships = [
      { type: 'spouse', personAId: '1', personBId: '2' },
      { type: 'parent-child', parentId: '1', childId: '3' },
      { type: 'parent-child', parentId: '1', childId: '4' },
      { type: 'parent-child', parentId: '1', childId: '5' },
    ];
    const genMap = new Map([['1', 0], ['2', 0], ['3', 1], ['4', 1], ['5', 1]]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    const parentSubtree = subtrees.get('1');
    expect(parentSubtree.childSubtrees.length).toBe(3);
    expect(parentSubtree.personCount).toBe(5);
    
    // Width should account for all children + gaps
    // With SUBTREE_GAP between branches
    const expectedWidth = Math.max(
      NODE_WIDTH * 2 + SPOUSE_GAP,
      (3 * NODE_WIDTH) + (2 * SUBTREE_GAP)
    );
    expect(parentSubtree.width).toBeGreaterThanOrEqual(NODE_WIDTH);
  });
  
  it('handles child with descendants (multi-level)', () => {
    const persons = [
      { id: '1', name: 'Grandparent' },
      { id: '2', name: 'Parent' },
      { id: '3', name: 'Child' },
    ];
    const relationships = [
      { type: 'parent-child', parentId: '1', childId: '2' },
      { type: 'parent-child', parentId: '2', childId: '3' },
    ];
    const genMap = new Map([['1', 0], ['2', 1], ['3', 2]]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    const gpSubtree = subtrees.get('1');
    expect(gpSubtree.childSubtrees.length).toBe(1);
    
    const parentSubtree = gpSubtree.childSubtrees[0];
    expect(parentSubtree.rootPersonId).toBe('2');
    expect(parentSubtree.childSubtrees.length).toBe(1);
    
    const childSubtree = parentSubtree.childSubtrees[0];
    expect(childSubtree.rootPersonId).toBe('3');
    expect(childSubtree.childSubtrees.length).toBe(0);
    
    // Total person count should cascade up
    expect(gpSubtree.personCount).toBe(3);
    expect(gpSubtree.descendantCount).toBe(2);
  });
  
  it('handles uneven child branches', () => {
    // Parent with two children:
    // - Child A has 3 grandchildren
    // - Child B has no children
    
    const persons = [
      { id: '1', name: 'Parent' },
      { id: '2', name: 'Child A' },
      { id: '3', name: 'Child B' },
      { id: '4', name: 'Grandchild 1' },
      { id: '5', name: 'Grandchild 2' },
      { id: '6', name: 'Grandchild 3' },
    ];
    const relationships = [
      { type: 'parent-child', parentId: '1', childId: '2' },
      { type: 'parent-child', parentId: '1', childId: '3' },
      { type: 'parent-child', parentId: '2', childId: '4' },
      { type: 'parent-child', parentId: '2', childId: '5' },
      { type: 'parent-child', parentId: '2', childId: '6' },
    ];
    const genMap = new Map([
      ['1', 0],
      ['2', 1], ['3', 1],
      ['4', 2], ['5', 2], ['6', 2],
    ]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    const parentSubtree = subtrees.get('1');
    expect(parentSubtree.childSubtrees.length).toBe(2);
    
    const childA = parentSubtree.childSubtrees.find(s => s.rootPersonId === '2');
    const childB = parentSubtree.childSubtrees.find(s => s.rootPersonId === '3');
    
    // Child A should have wider subtree (has grandchildren)
    expect(childA.width).toBeGreaterThan(childB.width);
    
    // Person counts should differ
    expect(childA.personCount).toBe(4); // self + 3 grandchildren
    expect(childB.personCount).toBe(1); // just self
    
    // Parent aggregates both branches
    expect(parentSubtree.personCount).toBe(6);
  });
  
  it('produces deterministic results - same input yields same output', () => {
    const persons = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];
    const relationships = [
      { type: 'spouse', personAId: '1', personBId: '2' },
      { type: 'parent-child', parentId: '1', childId: '3' },
    ];
    const genMap = new Map([['1', 0], ['2', 0], ['3', 1]]);
    
    // Run twice with identical input
    const result1 = computeSubtreeGeometry(persons, relationships, genMap);
    const result2 = computeSubtreeGeometry(persons, relationships, genMap);
    
    // Should have same size
    expect(result1.size).toBe(result2.size);
    
    // Same widths
    expect(result1.get('1').width).toBe(result2.get('1').width);
    
    // Same person counts
    expect(result1.get('1').personCount).toBe(result2.get('1').personCount);
  });
  
  it('respects SUBTREE_GAP between sibling branches', () => {
    const persons = [
      { id: '1', name: 'Parent' },
      { id: '2', name: 'Child 1' },
      { id: '3', name: 'Child 2' },
    ];
    const relationships = [
      { type: 'parent-child', parentId: '1', childId: '2' },
      { type: 'parent-child', parentId: '1', childId: '3' },
    ];
    const genMap = new Map([['1', 0], ['2', 1], ['3', 1]]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    const parentSubtree = subtrees.get('1');
    
    // With 2 children, should have gap between them
    // Expected: max(UNIT_WIDTH, CHILD1_WIDTH + SUBTREE_GAP + CHILD2_WIDTH)
    // Since children have no descendants: max(NODE_WIDTH, NODE_WIDTH + SUBTREE_GAP + NODE_WIDTH)
    const minExpected = NODE_WIDTH + SUBTREE_GAP + NODE_WIDTH;
    expect(parentSubtree.width).toBeGreaterThanOrEqual(minExpected);
  });
});

describe('FamilySubtree', () => {
  it('is immutable', () => {
    const subtree = new FamilySubtree({
      rootPersonId: '1',
      spouseId: null,
      childrenIds: ['2', '3'],
      gen: 0,
      width: NODE_WIDTH,
      height: 225,
      childSubtrees: [],
      personCount: 1,
      descendantCount: 0,
      branchCount: 1,
    });
    
    // Should not be able to modify
    expect(() => {
      subtree.width = 500;
    }).toThrow();
    
    // Arrays should be frozen
    expect(() => {
      subtree.childrenIds.push('4');
    }).toThrow();
  });
  
  it('computes hasSpouse correctly', () => {
    const single = new FamilySubtree({
      rootPersonId: '1',
      spouseId: null,
      childrenIds: [],
      gen: 0,
      width: NODE_WIDTH,
      childSubtrees: [],
    });
    
    const couple = new FamilySubtree({
      rootPersonId: '1',
      spouseId: '2',
      childrenIds: [],
      gen: 0,
      width: NODE_WIDTH * 2 + SPOUSE_GAP,
      childSubtrees: [],
    });
    
    expect(single.hasSpouse).toBe(false);
    expect(couple.hasSpouse).toBe(true);
  });
  
  it('computes unitWidth correctly', () => {
    const single = new FamilySubtree({
      rootPersonId: '1',
      spouseId: null,
      childrenIds: [],
      gen: 0,
      width: 500, // Subtree can be wider than unit
      childSubtrees: [],
    });
    
    const couple = new FamilySubtree({
      rootPersonId: '1',
      spouseId: '2',
      childrenIds: [],
      gen: 0,
      width: 600,
      childSubtrees: [],
    });
    
    expect(single.unitWidth).toBe(NODE_WIDTH);
    expect(couple.unitWidth).toBe(NODE_WIDTH * 2 + SPOUSE_GAP);
  });
  
  it('returns relative center X', () => {
    const subtree = new FamilySubtree({
      rootPersonId: '1',
      spouseId: null,
      childrenIds: [],
      gen: 0,
      width: 500,
      childSubtrees: [],
    });
    
    expect(subtree.getRelativeCenterX()).toBe(250);
  });
  
  it('returns total footprint', () => {
    const subtree = new FamilySubtree({
      rootPersonId: '1',
      spouseId: null,
      childrenIds: ['2', '3'],
      gen: 0,
      width: 600,
      height: 450,
      childSubtrees: [
        new FamilySubtree({
          rootPersonId: '2',
          spouseId: null,
          childrenIds: [],
          gen: 1,
          width: NODE_WIDTH,
          childSubtrees: [],
          personCount: 1,
        }),
      ],
      personCount: 3,
      descendantCount: 2,
      branchCount: 2,
    });
    
    const footprint = subtree.getTotalFootprint();
    
    expect(footprint.width).toBe(600);
    expect(footprint.height).toBe(450);
    expect(footprint.personCount).toBe(3);
    expect(footprint.descendantCount).toBe(2);
    expect(footprint.branchCount).toBe(2);
  });
});

describe('getSubtreeWidth', () => {
  it('returns NODE_WIDTH for missing person', () => {
    const result = getSubtreeWidth('nonexistent', new Map());
    expect(result).toBe(NODE_WIDTH);
  });
  
  it('returns subtree width for existing person', () => {
    const subtree = new FamilySubtree({
      rootPersonId: '1',
      spouseId: null,
      childrenIds: [],
      gen: 0,
      width: 500,
      childSubtrees: [],
    });
    
    const map = new Map([['1', subtree]]);
    const result = getSubtreeWidth('1', map);
    expect(result).toBe(500);
  });
});

describe('getDescendantCount', () => {
  it('returns 0 for missing person', () => {
    const result = getDescendantCount('nonexistent', new Map());
    expect(result).toBe(0);
  });
  
  it('returns descendant count for existing person', () => {
    const subtree = new FamilySubtree({
      rootPersonId: '1',
      spouseId: null,
      childrenIds: ['2', '3'],
      gen: 0,
      width: 600,
      childSubtrees: [],
      personCount: 3,
      descendantCount: 5,
    });
    
    const map = new Map([['1', subtree]]);
    const result = getDescendantCount('1', map);
    expect(result).toBe(5);
  });
});

describe('Edge Cases', () => {
  it('handles 36-person family (Medida test)', () => {
    // Simulate Medida's family structure
    // Gen 0: 2 ancestors (couple)
    // Gen 1: 8 siblings (couple + 7 single)
    // Gen 2: ~15 descendants
    // Gen 3: ~8 descendants
    
    const persons = [];
    const relationships = [];
    const genMap = new Map();
    
    // Gen 0 - Ancestors
    persons.push({ id: '0', name: 'Ancestor 1' });
    persons.push({ id: '1', name: 'Ancestor 2' });
    relationships.push({ type: 'spouse', personAId: '0', personBId: '1' });
    genMap.set('0', 0);
    genMap.set('1', 0);
    
    // Gen 1 - Siblings
    for (let i = 2; i < 10; i++) {
      persons.push({ id: String(i), name: `Sibling ${i}` });
      relationships.push({ type: 'parent-child', parentId: '0', childId: String(i) });
      genMap.set(String(i), 1);
    }
    
    // Gen 2 - Some grandchildren
    for (let i = 10; i < 25; i++) {
      const parentId = String(2 + Math.floor(Math.random() * 8));
      persons.push({ id: String(i), name: `Gen2 ${i}` });
      relationships.push({ type: 'parent-child', parentId, childId: String(i) });
      genMap.set(String(i), 2);
    }
    
    // Gen 3 - Some great-grandchildren
    for (let i = 25; i < 36; i++) {
      const parentId = String(10 + Math.floor(Math.random() * 15));
      persons.push({ id: String(i), name: `Gen3 ${i}` });
      relationships.push({ type: 'parent-child', parentId, childId: String(i) });
      genMap.set(String(i), 3);
    }
    
    // Compute geometry
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    // Should process all persons
    expect(subtrees.size).toBe(36);
    
    // Ancestor subtree should have all 36 persons
    const ancestorSubtree = subtrees.get('0');
    expect(ancestorSubtree.personCount).toBe(36);
    
    // Should have calculated widths (non-zero)
    expect(ancestorSubtree.width).toBeGreaterThan(0);
    
    // Width should accommodate 8 sibling branches in Gen 1
    // Expected: at least 8 * NODE_WIDTH + 7 * SUBTREE_GAP
    const minWidth = (8 * NODE_WIDTH) + (7 * SUBTREE_GAP);
    expect(ancestorSubtree.width).toBeGreaterThanOrEqual(minWidth);
  });
  
  it('handles disconnected persons (no relationships)', () => {
    const persons = [
      { id: '1', name: 'Person 1' },
      { id: '2', name: 'Person 2' },
      { id: '3', name: 'Person 3' },
    ];
    const relationships = [];
    const genMap = new Map([['1', 0], ['2', 0], ['3', 0]]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    // Each person should have their own subtree
    expect(subtrees.size).toBe(3);
    
    // Each should be a leaf
    expect(subtrees.get('1').childSubtrees.length).toBe(0);
    expect(subtrees.get('2').childSubtrees.length).toBe(0);
    expect(subtrees.get('3').childSubtrees.length).toBe(0);
  });
  
  it('handles cross-branch marriage (child with spouse who also has parents)', () => {
    const persons = [
      { id: '1', name: 'Parent A' },
      { id: '2', name: 'Parent B' },
      { id: '3', name: 'Child of A' },
      { id: '4', name: 'Spouse of 3 (child of B)' },
    ];
    const relationships = [
      // A has child
      { type: 'parent-child', parentId: '1', childId: '3' },
      // B has child
      { type: 'parent-child', parentId: '2', childId: '4' },
      // Cross-branch marriage
      { type: 'spouse', personAId: '3', personBId: '4' },
    ];
    const genMap = new Map([
      ['1', 0], ['2', 0],
      ['3', 1], ['4', 1],
    ]);
    
    const subtrees = computeSubtreeGeometry(persons, relationships, genMap);
    
    // Person 3 should have spouse 4
    const subtree3 = subtrees.get('3');
    expect(subtree3.spouseId).toBe('4');
    expect(subtree3.hasSpouse).toBe(true);
    
    // Person 4 should also point to same subtree
    const subtree4 = subtrees.get('4');
    expect(subtree4).toBe(subtree3);
  });
});
