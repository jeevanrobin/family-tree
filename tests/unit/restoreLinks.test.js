import { describe, it, expect } from 'vitest';
import { findMissingLinks } from '../../src/family-tree/utils/restoreLinks.js';

const people = ['gp', 'p', 'm', 'c', 'x'].map((id) => ({ id, firstName: id.toUpperCase() }));
const pc = (id, parentId, childId) => ({ id, type: 'parent-child', parentId, childId, personId1: parentId, personId2: childId });
const sp = (id, a, b) => ({ id, type: 'spouse', personAId: a, personBId: b, personId1: a, personId2: b });

describe('findMissingLinks', () => {
  const backup = {
    family: {
      people,
      relationships: [sp('r1', 'p', 'm'), pc('r2', 'gp', 'p'), pc('r3', 'p', 'c'), pc('r4', 'ghost', 'c')],
    },
  };

  it('offers links the tree has lost, parents first, keeping their ids', () => {
    const found = findMissingLinks(backup, people, [pc('r3', 'p', 'c')]);
    expect(found.map((f) => f.rel.id)).toEqual(['r2', 'r1']);
    expect(found[0].label).toBe('GP → parent of P');
    expect(found[1].label).toBe('P ♥ married to M');
  });

  it('never offers a link that is already there, in either direction', () => {
    const current = [sp('other', 'm', 'p'), pc('r2', 'gp', 'p'), pc('r3', 'p', 'c')];
    expect(findMissingLinks(backup, people, current)).toEqual([]);
  });

  it('skips links to people no longer in the tree', () => {
    const found = findMissingLinks(backup, people.filter((p) => p.id !== 'gp'), []);
    expect(found.map((f) => f.rel.id)).toEqual(['r3', 'r1']);
  });

  it('gives a new id when the backup id is used by another link now', () => {
    const current = [{ ...sp('r2', 'x', 'c') }];
    const found = findMissingLinks(backup, people, current);
    const restored = found.find((f) => f.fromId === 'gp');
    expect(restored.rel.id).toBeUndefined();
  });

  it('accepts a backup without the family wrapper, or garbage', () => {
    expect(findMissingLinks(backup.family, people, []).length).toBe(3);
    expect(findMissingLinks(null, people, [])).toEqual([]);
  });
});
