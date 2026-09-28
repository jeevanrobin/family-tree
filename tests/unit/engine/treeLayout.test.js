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

describe('computeTreeLayout options: collapse, focus and sibling order', () => {
  // root ─┬─ a (+ spouse as) ── a1
  //       └─ b ── b1
  const persons = [
    { id: 'root', displayName: 'Root' },
    { id: 'a', displayName: 'A' },
    { id: 'as', displayName: 'A Spouse' },
    { id: 'b', displayName: 'B' },
    { id: 'a1', displayName: 'A Child' },
    { id: 'b1', displayName: 'B Child' },
  ];
  const relationships = [
    { id: 'r1', type: 'parent-child', parentId: 'root', childId: 'a' },
    { id: 'r2', type: 'parent-child', parentId: 'root', childId: 'b' },
    { id: 'r3', type: 'spouse', personAId: 'a', personBId: 'as' },
    { id: 'r4', type: 'parent-child', parentId: 'a', childId: 'a1' },
    { id: 'r5', type: 'parent-child', parentId: 'b', childId: 'b1' },
  ];

  it('hides the descendants of a collapsed unit and reports a badge', () => {
    const layout = computeTreeLayout(persons, relationships, { collapsedUnits: new Set(['unit-b']) });

    expect(layout.nodes.has('b')).toBe(true);
    expect(layout.nodes.has('b1')).toBe(false);
    expect(layout.nodes.has('a1')).toBe(true);
    expect(layout.allNodes.has('b1')).toBe(true);
    const badge = layout.branchBadges.find((x) => x.unitKey === 'unit-b');
    expect(badge).toMatchObject({ isCollapsed: true, childCount: 1 });
    expect(layout.lines.some((l) => l.childId === 'b1')).toBe(false);
  });

  it('collapsing a couple by either spouse hides their children', () => {
    const layout = computeTreeLayout(persons, relationships, { collapsedUnits: new Set(['unit-as']) });
    expect(layout.nodes.has('a1')).toBe(false);
  });

  it('collapse all keeps only the root unit', () => {
    const layout = computeTreeLayout(persons, relationships, {
      collapsedUnits: new Set(['unit-root', 'unit-a', 'unit-b']),
    });
    expect([...layout.nodes.keys()]).toEqual(['root']);
  });

  it('packs the remaining branches closer together when a branch is collapsed', () => {
    const wide = [...persons, { id: 'b2', displayName: 'B Child 2' }, { id: 'b3', displayName: 'B Child 3' }];
    const wideRels = [
      ...relationships,
      { id: 'r6', type: 'parent-child', parentId: 'b', childId: 'b2' },
      { id: 'r7', type: 'parent-child', parentId: 'b', childId: 'b3' },
    ];
    const expanded = computeTreeLayout(wide, wideRels);
    const collapsed = computeTreeLayout(wide, wideRels, { collapsedUnits: new Set(['unit-b']) });

    const gap = (layout) => layout.nodes.get('b').x - layout.nodes.get('a').x;
    expect(gap(collapsed)).toBeLessThan(gap(expanded));
  });

  it("focus 'person' keeps the person's line and descendants, collapsing other branches", () => {
    const layout = computeTreeLayout(persons, relationships, { focusPersonId: 'a', focusMode: 'person' });

    expect(layout.nodes.has('a1')).toBe(true);
    expect(layout.nodes.has('b')).toBe(true);
    expect(layout.nodes.has('b1')).toBe(false);
  });

  it("focus 'family' keeps the person's own children but collapses grandchildren", () => {
    const deeper = [...persons, { id: 'a1c', displayName: 'Grandchild' }];
    const deeperRels = [...relationships, { id: 'r8', type: 'parent-child', parentId: 'a1', childId: 'a1c' }];

    const family = computeTreeLayout(deeper, deeperRels, { focusPersonId: 'a', focusMode: 'family' });
    expect(family.nodes.has('a1')).toBe(true);
    expect(family.nodes.has('a1c')).toBe(false);

    const person = computeTreeLayout(deeper, deeperRels, { focusPersonId: 'a', focusMode: 'person' });
    expect(person.nodes.has('a1c')).toBe(true);
  });

  it('shows a collapse badge on the selected person when not collapsed', () => {
    const layout = computeTreeLayout(persons, relationships, { focusPersonId: 'b', focusMode: 'all' });
    const badge = layout.branchBadges.find((x) => x.unitKey === 'unit-b');
    expect(badge).toMatchObject({ isCollapsed: false });
    expect(layout.nodes.has('b1')).toBe(true);
  });

  it('adds sibling cohort metadata used by Arrange Family', () => {
    const layout = computeTreeLayout(persons, relationships);
    const a = layout.nodes.get('a');
    const spouse = layout.nodes.get('as');

    expect(a.cohortKey).toBe('root-children');
    expect(a.bloodChildId).toBe('a');
    expect(spouse.bloodChildId).toBe('a');
    expect(a.cohortSiblingIds).toEqual(['a', 'b']);
    expect(a.canReorder).toBe(true);
    expect(layout.nodes.get('a1').canReorder).toBe(false);
  });

  it('applies custom sibling order passed as options', () => {
    const layout = computeTreeLayout(persons, relationships, {
      customSiblingOrders: { 'root-children': ['b', 'a'] },
    });
    expect(layout.nodes.get('b').x).toBeLessThan(layout.nodes.get('a').x);
    expect(layout.nodes.get('a').cohortSiblingIds).toEqual(['b', 'a']);
  });

  it('orders by the blood child even when they are the spouse in their unit', () => {
    // 'as' is the blood child of root2 but is the spouse in the a+as unit.
    // Both spouses have parents in the tree; as the son, 'as' places the
    // couple under root2's family.
    const p = [
      ...persons.map((x) => (x.id === 'as' ? { ...x, gender: 'male' } : x)),
      { id: 'root2', displayName: 'Root 2' },
      { id: 'c', displayName: 'C' },
    ];
    const r = [
      ...relationships,
      { id: 'r9', type: 'parent-child', parentId: 'root2', childId: 'as' },
      { id: 'r10', type: 'parent-child', parentId: 'root2', childId: 'c' },
    ];
    const layout = computeTreeLayout(p, r, { customSiblingOrders: { 'root2-children': ['c', 'as'] } });
    const cohort = layout.nodes.get('c').cohortSiblingIds;
    expect(cohort).toEqual(['c', 'as']);
  });

  it('keeps accepting a plain sibling-order map as the third argument', () => {
    const layout = computeTreeLayout(persons, relationships, { 'root-children': ['b', 'a'] });
    expect(layout.nodes.get('b').x).toBeLessThan(layout.nodes.get('a').x);
  });
});

describe('computeTreeLayout remarriages', () => {
  const W = NODE_WIDTH;
  const H = NODE_HEIGHT;
  const overlaps = (layout) => {
    const list = [...layout.nodes.values()];
    const hits = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.x < b.x + W && b.x < a.x + W && a.y < b.y + H && b.y < a.y + H) {
          hits.push([a.person.id, b.person.id]);
        }
      }
    }
    return hits;
  };

  // gp ─┬─ a ═ s1 (c1), a ═ s2 (c2, c3)
  //     └─ b
  const persons = ['gp', 'a', 's1', 's2', 'c1', 'c2', 'c3', 'b'].map((id) => ({ id, displayName: id }));
  const relationships = [
    { id: 'r0', type: 'parent-child', parentId: 'gp', childId: 'a' },
    { id: 'r0b', type: 'parent-child', parentId: 'gp', childId: 'b' },
    { id: 'r1', type: 'spouse', personAId: 'a', personBId: 's1', startDate: '1970-01-01' },
    { id: 'r2', type: 'spouse', personAId: 'a', personBId: 's2', startDate: '1980-01-01' },
    { id: 'r3', type: 'parent-child', parentId: 'a', childId: 'c1' },
    { id: 'r4', type: 'parent-child', parentId: 's1', childId: 'c1' },
    { id: 'r5', type: 'parent-child', parentId: 'a', childId: 'c2' },
    { id: 'r6', type: 'parent-child', parentId: 's2', childId: 'c2' },
    { id: 'r7', type: 'parent-child', parentId: 'a', childId: 'c3' },
    { id: 'r8', type: 'parent-child', parentId: 's2', childId: 'c3' },
  ];

  it('places every spouse beside the person: earlier marriage left, later right', () => {
    const layout = computeTreeLayout(persons, relationships);
    const { a, s1, s2 } = Object.fromEntries(['a', 's1', 's2'].map((id) => [id, layout.nodes.get(id)]));

    expect(s1.y).toBe(a.y);
    expect(s2.y).toBe(a.y);
    expect(s1.x).toBeLessThan(a.x);
    expect(s2.x).toBeGreaterThan(a.x);
    expect(overlaps(layout)).toEqual([]);
  });

  it('keeps the spouse order when the first spouse is listed before the person', () => {
    const reordered = [persons[2], ...persons.filter((p) => p.id !== 's1')];
    const layout = computeTreeLayout(reordered, relationships);

    expect(layout.nodes.get('s1').x).toBeLessThan(layout.nodes.get('a').x);
    expect(layout.nodes.get('s2').x).toBeGreaterThan(layout.nodes.get('a').x);
    expect(overlaps(layout)).toEqual([]);
  });

  it('puts each marriage\'s children under that couple', () => {
    const layout = computeTreeLayout(persons, relationships);
    const center = (id) => layout.nodes.get(id).centerX;

    expect(center('c1')).toBeLessThan(center('c2'));
    expect(center('c2')).toBeLessThan(center('c3'));
    const stem = (childId) => layout.lines.find((l) => l.type === 'parent-child' && l.childId === childId).sourceX;
    expect(stem('c1')).toBeCloseTo((center('s1') + center('a')) / 2);
    expect(stem('c2')).toBeCloseTo((center('a') + center('s2')) / 2);
  });

  it('gives each marriage its own sibling group for Arrange Family', () => {
    const layout = computeTreeLayout(persons, relationships);

    expect(layout.nodes.get('c1')).toMatchObject({ cohortKey: 'a-s1-children', cohortSiblingIds: ['c1'], canReorder: false });
    expect(layout.nodes.get('c2')).toMatchObject({ cohortKey: 'a-s2-children', cohortSiblingIds: ['c2', 'c3'], canReorder: true });

    const reordered = computeTreeLayout(persons, relationships, { customSiblingOrders: { 'a-s2-children': ['c3', 'c2'] } });
    expect(reordered.nodes.get('c3').x).toBeLessThan(reordered.nodes.get('c2').x);
  });

  it('draws a spouse line for each marriage', () => {
    const layout = computeTreeLayout(persons, relationships);
    const spouseLines = layout.lines.filter((l) => l.type === 'spouse').map((l) => l.id).sort();
    expect(spouseLines).toEqual(['spouse-a-s1', 'spouse-a-s2']);
  });

  it('a child with only the remarried parent recorded hangs from that parent', () => {
    const layout = computeTreeLayout(
      [...persons, { id: 'c4', displayName: 'c4' }],
      [...relationships, { id: 'r9', type: 'parent-child', parentId: 'a', childId: 'c4' }]
    );
    const line = layout.lines.find((l) => l.type === 'parent-child' && l.childId === 'c4');
    expect(line.sourceX).toBeCloseTo(layout.nodes.get('a').centerX);
    expect(overlaps(layout)).toEqual([]);
  });

  it('collapsing a remarried person hides the children of every marriage', () => {
    const layout = computeTreeLayout(persons, relationships, { collapsedUnits: new Set(['unit-a']) });
    for (const id of ['c1', 'c2', 'c3']) expect(layout.nodes.has(id)).toBe(false);
    expect(layout.nodes.has('s1')).toBe(true);
  });

  it('handles three marriages without overlapping cards', () => {
    const p = [...persons, { id: 's3', displayName: 's3' }, { id: 'c5', displayName: 'c5' }];
    const r = [
      ...relationships,
      { id: 'r10', type: 'spouse', personAId: 'a', personBId: 's3', startDate: '1990-01-01' },
      { id: 'r11', type: 'parent-child', parentId: 'a', childId: 'c5' },
      { id: 'r12', type: 'parent-child', parentId: 's3', childId: 'c5' },
    ];
    const layout = computeTreeLayout(p, r);
    expect(overlaps(layout)).toEqual([]);
    expect(layout.nodes.get('s3').x).toBeGreaterThan(layout.nodes.get('s2').x);
  });
});

describe('computeTreeLayout remarriage child placement', () => {
  it('centers an only-marriage-with-children under that couple when there is room', () => {
    // a ═ s1 (kids k1, k2), a ═ s2 (no kids)
    const persons = ['a', 's1', 's2', 'k1', 'k2'].map((id) => ({ id, displayName: id }));
    const relationships = [
      { id: 'm1', type: 'spouse', personAId: 'a', personBId: 's1', startDate: '1970-01-01' },
      { id: 'm2', type: 'spouse', personAId: 'a', personBId: 's2', startDate: '1990-01-01' },
      { id: 'k1a', type: 'parent-child', parentId: 'a', childId: 'k1' },
      { id: 'k1s', type: 'parent-child', parentId: 's1', childId: 'k1' },
      { id: 'k2a', type: 'parent-child', parentId: 'a', childId: 'k2' },
      { id: 'k2s', type: 'parent-child', parentId: 's1', childId: 'k2' },
    ];
    const layout = computeTreeLayout(persons, relationships);
    const n = (id) => layout.nodes.get(id);
    const rowCenter = (n('k1').centerX + n('k2').centerX) / 2;
    const coupleCenter = (n('s1').centerX + n('a').centerX) / 2;
    const unitCenter = (n('s1').centerX + n('s2').centerX) / 2;

    expect(Math.abs(rowCenter - coupleCenter)).toBeLessThan(Math.abs(rowCenter - unitCenter));
    // Row stays inside the family's footprint.
    expect(n('k1').x).toBeGreaterThanOrEqual(n('s1').x - 1);
    expect(n('k2').x + NODE_WIDTH).toBeLessThanOrEqual(n('s2').x + NODE_WIDTH + 1);
  });
});

import intermarried from '../../fixtures/intermarried-family.json';

describe('computeTreeLayout with marriages between two families in the tree', () => {
  const { people, relationships } = intermarried;
  const layout = computeTreeLayout(people, relationships);
  const node = (id) => layout.nodes.get(id);

  it('places every person exactly once with no overlapping cards', () => {
    expect(layout.nodes.size).toBe(people.length);
    const list = [...layout.nodes.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const overlap = a.x < b.x + NODE_WIDTH && b.x < a.x + NODE_WIDTH && a.y < b.y + NODE_HEIGHT && b.y < a.y + NODE_HEIGHT;
        expect(overlap, `${a.person.id} overlaps ${b.person.id}`).toBe(false);
      }
    }
  });

  it("places a cousin couple under the husband's parents", () => {
    // p33 (son of p19 + p27) married p35 (daughter of p20).
    const coupleCenter = (node('p33').centerX + node('p35').centerX) / 2;
    const husbandsParents = (node('p19').centerX + node('p27').centerX) / 2;
    const wifesMother = node('p20').centerX;
    expect(Math.abs(coupleCenter - husbandsParents)).toBeLessThan(Math.abs(coupleCenter - wifesMother));
  });

  it("links the wife's parents with a dashed cross-family connector", () => {
    const link = layout.lines.find((l) => l.type === 'parent-child' && l.childId === 'p35');
    expect(link.crossFamily).toBe(true);
    const own = layout.lines.find((l) => l.type === 'parent-child' && l.childId === 'p33');
    expect(own.crossFamily).toBe(false);
  });

  it('never lets two connector buses in the same gap overlap at the same height', () => {
    // Always-drawn family buses; cross-family links are only drawn while one
    // of their ends is selected (see the next test).
    const buses = new Map();
    layout.lines
      .filter((l) => l.type === 'parent-child' && !l.crossFamily && Math.abs(l.sourceX - l.targetX) >= 2)
      .forEach((l) => {
        const key = `${l.allParentIds.join('+')}:${l.crossFamily}`;
        const bus = buses.get(key) || { y: l.junctionY, left: l.sourceX, right: l.sourceX };
        bus.left = Math.min(bus.left, l.targetX);
        bus.right = Math.max(bus.right, l.targetX);
        buses.set(key, bus);
      });
    const list = [...buses.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.y !== b.y) continue;
        const overlap = a.left <= b.right && b.left <= a.right;
        expect(overlap).toBe(false);
      }
    }
  });

  it('keeps cross-family links (drawn on selection) just above the child row', () => {
    const cross = layout.lines.filter((l) => l.crossFamily);
    expect(cross.length).toBeGreaterThan(0);
    cross.forEach((l) => expect(l.junctionY).toBe(l.targetY - 10));
  });
});
