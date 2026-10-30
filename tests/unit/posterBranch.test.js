import { describe, it, expect } from 'vitest';
import { branchOf } from '../../src/family-tree/components/modals/TreePosterModal.jsx';

const people = ['gp', 'p', 'sp', 'c', 'uncle', 'cousin'].map((id) => ({ id, firstName: id }));
const pc = (a, b) => ({ type: 'parent-child', parentId: a, childId: b });
const relationships = [
  pc('gp', 'p'), pc('gp', 'uncle'), pc('p', 'c'), pc('uncle', 'cousin'),
  { type: 'spouse', personAId: 'p', personBId: 'sp' },
];

describe('branchOf', () => {
  it('keeps the person, their spouse and descendants only', () => {
    const b = branchOf({ people, relationships }, 'p');
    expect(b.people.map((x) => x.id).sort()).toEqual(['c', 'p', 'sp']);
    expect(b.relationships).toHaveLength(2);
  });

  it('returns everything for the whole family', () => {
    expect(branchOf({ people, relationships }, '').people).toHaveLength(6);
  });
});
