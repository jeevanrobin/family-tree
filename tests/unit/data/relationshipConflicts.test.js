import { describe, it, expect } from 'vitest';
import { findRelationshipConflicts } from '../../../src/family-tree/data/relationshipConflicts.js';
import { computeTreeLayout } from '../../../src/family-tree/engine/treeLayout.js';

const people = ['a', 'b', 'c', 'd'].map((id) => ({ id, displayName: id.toUpperCase(), gender: 'male' }));
const pc = (parentId, childId) => ({ id: `${parentId}-${childId}`, type: 'parent-child', parentId, childId });
const sp = (a, b) => ({ id: `s-${a}-${b}`, type: 'spouse', personId1: a, personId2: b });
const base = [sp('a', 'b'), pc('a', 'c'), pc('b', 'c'), pc('c', 'd')];

describe('findRelationshipConflicts', () => {
  it('finds nothing in a clean tree', () => {
    expect(findRelationshipConflicts(people, base)).toEqual([]);
  });

  it('flags spouses also saved as parent/child', () => {
    const c = findRelationshipConflicts(people, [...base, pc('a', 'b')]);
    expect(c.map((x) => x.kind)).toContain('spouse-and-parent');
    expect(c[0].message).toMatch(/A and B/);
  });

  it('flags own-parent and ancestor loops', () => {
    const kinds = findRelationshipConflicts(people, [...base, pc('d', 'd'), pc('d', 'a')]).map((x) => x.kind);
    expect(kinds).toContain('own-parent');
    expect(kinds).toContain('ancestor-loop');
  });
});

describe('layout with contradictory data', () => {
  it.each([
    ['spouse also child', [pc('a', 'b')]],
    ['own parent', [pc('c', 'c')]],
    ['grandchild is parent of grandparent', [pc('d', 'a')]],
  ])('does not overflow the stack: %s', (_, extra) => {
    const layout = computeTreeLayout(people, [...base, ...extra], {});
    expect(layout).toBeTruthy();
  });
});
