/**
 * Tree Layout Engine Tests
 * 
 * Tests computeTreeLayout against the real production API.
 * Focuses on observable behaviors: generation calculation, sibling ordering,
 * spouse positioning, parent-child centering, and bounds computation.
 */

import { describe, it, expect } from 'vitest';
import { computeTreeLayout, NODE_WIDTH, NODE_HEIGHT, SPOUSE_GAP, SIBLING_GAP, GENERATION_HEIGHT } from '../../../src/family-tree/engine/treeLayout.js';

describe('computeTreeLayout', () => {
  describe('empty input handling', () => {
    it('returns empty layout for null persons', () => {
      const result = computeTreeLayout(null, []);
      expect(result.nodes.size).toBe(0);
      expect(result.lines).toEqual([]);
      expect(result.bounds).toBeDefined();
    });

    it('returns empty layout for empty persons array', () => {
      const result = computeTreeLayout([], []);
      expect(result.nodes.size).toBe(0);
    });
  });

  describe('single person layout', () => {
    it('positions single person at origin horizontally centered', () => {
      const persons = [{ id: 'p1', name: 'Alice' }];
      const relationships = [];
      const result = computeTreeLayout(persons, relationships);
      
      expect(result.nodes.size).toBe(1);
      const node = result.nodes.get('p1');
      expect(node).toBeDefined();
      expect(node.x).toBeCloseTo(-NODE_WIDTH / 2, 0);
      expect(node.y).toBe(0);
    });

    it('assigns generation 0 to single person', () => {
      const persons = [{ id: 'p1', name: 'Alice' }];
      const result = computeTreeLayout(persons, []);
      
      const node = result.nodes.get('p1');
      expect(node.gen).toBe(0);
    });

    it('includes node dimensions', () => {
      const persons = [{ id: 'p1', name: 'Alice' }];
      const result = computeTreeLayout(persons, []);
      
      const node = result.nodes.get('p1');
      expect(node.width).toBe(NODE_WIDTH);
      expect(node.height).toBe(NODE_HEIGHT);
    });
  });

  describe('couple/spouse positioning', () => {
    it('positions spouses side by side', () => {
      const persons = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];
      const relationships = [
        { id: 'r1', type: 'spouse', personId1: 'p1', personId2: 'p2' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const node1 = result.nodes.get('p1');
      const node2 = result.nodes.get('p2');
      
      expect(Math.abs(node1.y - node2.y)).toBeLessThan(2);
      expect(Math.abs(Math.abs(node2.x - node1.x) - (NODE_WIDTH + SPOUSE_GAP))).toBeLessThan(10);
    });

    it('creates spouse connection line', () => {
      const persons = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];
      const relationships = [
        { id: 'r1', type: 'spouse', personId1: 'p1', personId2: 'p2' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const spouseLines = result.lines.filter((l) => l.type === 'spouse');
      expect(spouseLines.length).toBeGreaterThanOrEqual(1);
    });

    it('assigns same generation to spouses', () => {
      const persons = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];
      const relationships = [
        { id: 'r1', type: 'spouse', personId1: 'p1', personId2: 'p2' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const node1 = result.nodes.get('p1');
      const node2 = result.nodes.get('p2');
      expect(node1.gen).toBe(node2.gen);
    });
  });

  describe('generation calculation', () => {
    it('places child below parent', () => {
      const persons = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'parent', childId: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const parentNode = result.nodes.get('parent');
      const childNode = result.nodes.get('child');
      
      expect(childNode.y).toBeGreaterThan(parentNode.y);
      expect(childNode.gen).toBeGreaterThan(parentNode.gen);
    });

    it('grandparent -> parent -> child forms three generations', () => {
      const persons = [
        { id: 'gp', name: 'Grandparent' },
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'gp', childId: 'parent' },
        { id: 'r2', type: 'parent-child', parentId: 'parent', childId: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const gpNode = result.nodes.get('gp');
      const parentNode = result.nodes.get('parent');
      const childNode = result.nodes.get('child');
      
      expect(parentNode.y - gpNode.y).toBeCloseTo(GENERATION_HEIGHT, 0);
      expect(childNode.y - parentNode.y).toBeCloseTo(GENERATION_HEIGHT, 0);
    });
  });

  describe('sibling ordering', () => {
    it('positions siblings horizontally in same generation', () => {
      const persons = [
        { id: 'parent', name: 'Parent' },
        { id: 'child1', name: 'Child One' },
        { id: 'child2', name: 'Child Two' },
        { id: 'child3', name: 'Child Three' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'parent', childId: 'child1' },
        { id: 'r2', type: 'parent-child', parentId: 'parent', childId: 'child2' },
        { id: 'r3', type: 'parent-child', parentId: 'parent', childId: 'child3' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const c1 = result.nodes.get('child1');
      const c2 = result.nodes.get('child2');
      const c3 = result.nodes.get('child3');
      
      expect(c1.y).toBe(c2.y);
      expect(c2.y).toBe(c3.y);
      
      expect(c2.x).toBeGreaterThan(c1.x);
      expect(c3.x).toBeGreaterThan(c2.x);
    });

    it('applies sibling gap between children', () => {
      const persons = [
        { id: 'parent', name: 'Parent' },
        { id: 'child1', name: 'Child One' },
        { id: 'child2', name: 'Child Two' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'parent', childId: 'child1' },
        { id: 'r2', type: 'parent-child', parentId: 'parent', childId: 'child2' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const c1 = result.nodes.get('child1');
      const c2 = result.nodes.get('child2');
      
      const actualGap = c2.x - (c1.x + NODE_WIDTH);
      expect(actualGap).toBeGreaterThanOrEqual(SIBLING_GAP - 10);
    });
  });

  describe('parent-child centering', () => {
    it('centers parent above single child', () => {
      const persons = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'parent', childId: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const parentNode = result.nodes.get('parent');
      const childNode = result.nodes.get('child');
      
      const parentCenter = parentNode.x + NODE_WIDTH / 2;
      const childCenter = childNode.x + NODE_WIDTH / 2;
      
      expect(Math.abs(parentCenter - childCenter)).toBeLessThan(20);
    });

    it('centers parent above multiple children', () => {
      const persons = [
        { id: 'parent', name: 'Parent' },
        { id: 'child1', name: 'Child One' },
        { id: 'child2', name: 'Child Two' },
        { id: 'child3', name: 'Child Three' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'parent', childId: 'child1' },
        { id: 'r2', type: 'parent-child', parentId: 'parent', childId: 'child2' },
        { id: 'r3', type: 'parent-child', parentId: 'parent', childId: 'child3' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const parentNode = result.nodes.get('parent');
      const c1 = result.nodes.get('child1');
      const c3 = result.nodes.get('child3');
      
      const childrenMidX = (c1.x + c3.x + NODE_WIDTH) / 2;
      const parentMidX = parentNode.x + NODE_WIDTH / 2;
      
      expect(Math.abs(parentMidX - childrenMidX)).toBeLessThan(30);
    });
  });

  describe('bounds calculation', () => {
    it('calculates valid bounds for tree', () => {
      const persons = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];
      const relationships = [
        { id: 'r1', type: 'spouse', personId1: 'p1', personId2: 'p2' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      expect(result.bounds.minX).toBeDefined();
      expect(result.bounds.maxX).toBeDefined();
      expect(result.bounds.minY).toBeDefined();
      expect(result.bounds.maxY).toBeDefined();
      expect(result.bounds.width).toBeGreaterThan(0);
      expect(result.bounds.height).toBeGreaterThan(0);
    });

    it('includes padding in bounds', () => {
      const persons = [{ id: 'p1', name: 'Alice' }];
      const result = computeTreeLayout(persons, []);
      
      const node = result.nodes.get('p1');
      expect(result.bounds.minX).toBeLessThan(node.x);
      expect(result.bounds.maxX).toBeGreaterThan(node.x + NODE_WIDTH);
    });
  });

  describe('generation tracks', () => {
    it('creates generation tracks for single generation', () => {
      const persons = [{ id: 'p1', name: 'Alice' }];
      const result = computeTreeLayout(persons, []);
      
      expect(result.generationTracks.length).toBe(1);
      expect(result.generationTracks[0].gen).toBe(0);
    });

    it('creates track for each generation', () => {
      const persons = [
        { id: 'gp', name: 'Grandparent' },
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'gp', childId: 'parent' },
        { id: 'r2', type: 'parent-child', parentId: 'parent', childId: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      expect(result.generationTracks.length).toBe(3);
    });
  });

  describe('rank assignment', () => {
    it('assigns ancestor rank to earliest generation', () => {
      const persons = [
        { id: 'gp', name: 'Grandparent' },
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'gp', childId: 'parent' },
        { id: 'r2', type: 'parent-child', parentId: 'parent', childId: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const gp = result.nodes.get('gp');
      expect(gp.rank).toBe('ancestor');
    });

    it('assigns child rank to latest generation', () => {
      const persons = [
        { id: 'gp', name: 'Grandparent' },
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'gp', childId: 'parent' },
        { id: 'r2', type: 'parent-child', parentId: 'parent', childId: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const child = result.nodes.get('child');
      expect(child.rank).toBe('child');
    });
  });

  describe('connector lines', () => {
    it('creates parent-child connection lines', () => {
      const persons = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent-child', parentId: 'parent', childId: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const parentChildLines = result.lines.filter((l) => l.type === 'parent-child');
      expect(parentChildLines.length).toBeGreaterThanOrEqual(1);
    });

    it('creates sibling connection lines for sibling relationships', () => {
      const persons = [
        { id: 'sib1', name: 'Sibling One' },
        { id: 'sib2', name: 'Sibling Two' },
      ];
      const relationships = [
        { id: 'r1', type: 'sibling', personId1: 'sib1', personId2: 'sib2' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      const siblingLines = result.lines.filter((l) => l.type === 'sibling');
      expect(siblingLines.length).toBe(1);
    });
  });

  describe('flexible relationship field names', () => {
    it('accepts personAId/personBId for spouse relationships', () => {
      const persons = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];
      const relationships = [
        { id: 'r1', type: 'spouse', personAId: 'p1', personBId: 'p2' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      expect(result.nodes.size).toBe(2);
      const spouseLines = result.lines.filter((l) => l.type === 'spouse');
      expect(spouseLines.length).toBeGreaterThanOrEqual(1);
    });

    it('accepts childId without parentId field name variation', () => {
      const persons = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const relationships = [
        { id: 'r1', type: 'parent', personId1: 'parent', personId2: 'child' },
      ];
      const result = computeTreeLayout(persons, relationships);
      
      expect(result.nodes.size).toBe(2);
    });
  });

  describe('node structure', () => {
    it('includes centerX and centerY for each node', () => {
      const persons = [{ id: 'p1', name: 'Alice' }];
      const result = computeTreeLayout(persons, []);
      
      const node = result.nodes.get('p1');
      expect(node.centerX).toBe(node.x + NODE_WIDTH / 2);
      expect(node.centerY).toBe(node.y + NODE_HEIGHT / 2);
    });

    it('includes person reference in node', () => {
      const persons = [{ id: 'p1', name: 'Alice', birthDate: '1990-01-01' }];
      const result = computeTreeLayout(persons, []);
      
      const node = result.nodes.get('p1');
      expect(node.person).toBe(persons[0]);
    });
  });
});
