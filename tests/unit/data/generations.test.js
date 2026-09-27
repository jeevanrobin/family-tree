import { describe, it, expect } from 'vitest';
import { computeGenerations } from '../../../src/family-tree/data/familyDataService.js';
import { computeTreeLayout } from '../../../src/family-tree/engine/treeLayout.js';

// Venkamma → Mallamma (daughter), Yakareddy (son); Mallamma → Pullamma.
// Yakareddy marries his sister's daughter Pullamma.
const P = (id, gender) => ({ id, firstName: id, displayName: id, gender });
const pc = (parentId, childId) => ({ id: `${parentId}>${childId}`, type: 'parent-child', parentId, childId });
const sp = (a, b) => ({ id: `${a}=${b}`, type: 'spouse', personAId: a, personBId: b });

function family(yakGender) {
  return {
    people: [P('venkamma', 'female'), P('mallamma', 'female'), P('yakareddy', yakGender), P('pullamma', 'female'), P('kid', 'male'), P('inlaw', 'male')],
    rels: [pc('venkamma', 'mallamma'), pc('venkamma', 'yakareddy'), pc('mallamma', 'pullamma'), sp('yakareddy', 'pullamma'), pc('yakareddy', 'kid'), pc('pullamma', 'kid'), sp('mallamma', 'inlaw')],
  };
}

describe('generations when spouses come from different rows', () => {
  it.each(['male', 'unspecified'])('keeps the husband (%s) in his row; the wife joins it', (g) => {
    const { people, rels } = family(g);
    const gen = computeGenerations(people, rels);
    expect(gen.get('yakareddy')).toBe(gen.get('mallamma')); // with his sister
    expect(gen.get('pullamma')).toBe(gen.get('yakareddy'));
    expect(gen.get('kid')).toBe(gen.get('yakareddy') + 1);
  });

  it('puts a spouse without parents in the tree in their partner’s row', () => {
    const { people, rels } = family('male');
    const gen = computeGenerations(people, rels);
    expect(gen.get('inlaw')).toBe(gen.get('mallamma'));
  });

  it('places the couple with his family and links her mother as a cross-family link', () => {
    const { people, rels } = family('unspecified');
    const layout = computeTreeLayout(people, rels, {});
    const y = (id) => layout.nodes.get(id).y;
    expect(y('pullamma')).toBe(y('yakareddy'));
    const cross = layout.lines.filter((l) => l.crossFamily);
    expect(cross.map((l) => l.childId)).toEqual(['pullamma']);
    // Same-row link runs under the cards, not up through them.
    expect(cross[0].junctionY).toBeGreaterThan(y('pullamma'));
  });
});
