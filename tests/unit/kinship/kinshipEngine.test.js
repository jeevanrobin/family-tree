import { describe, it, expect } from 'vitest';
import { describeRelationship, findRelationshipPath } from '../../../src/family-tree/kinship/kinshipEngine.js';

//                 thatha ═ nanamma                       ammamma-side: tata2 ═ ammamma
//        ┌──────────┬─────────┴───────┐                        ┌──────────┴─────────┐
//  pedananna(1955) nanna(1960) chinnanna(1965) atta(1962)   amma(1965)       mamayya(1968) pinni(1970)
//     ═ peddamma      ═ amma      ═ pinni2       ═ mamaByMarriage              ═ attaByMarriage
//        │              │                          │                            │
//   cousinPar(1990)  me(1992), anna(1988), chelli(1995)   cousinCross(1993)   mamaKid(1991)
//                    me ═ wife → kid; wife's parents mamagaru ═ attagaru; wife's brother bil(1994)
const P = (id, gender, dateOfBirth = null) => ({ id, displayName: id, gender, dateOfBirth });
const persons = [
  P('thatha', 'male'), P('nanamma', 'female'), P('tata2', 'male'), P('ammamma', 'female'),
  P('pedananna', 'male', '1955-01-01'), P('peddamma', 'female'),
  P('nanna', 'male', '1960-01-01'), P('amma', 'female', '1965-01-01'),
  P('chinnanna', 'male', '1965-06-01'), P('pinni2', 'female'),
  P('atta', 'female', '1962-01-01'), P('mamaByMarriage', 'male'),
  P('mamayya', 'male', '1968-01-01'), P('attaByMarriage', 'female'),
  P('pinni', 'female', '1970-01-01'),
  P('me', 'male', '1992-01-01'), P('anna', 'male', '1988-01-01'), P('chelli', 'female', '1995-01-01'),
  P('cousinPar', 'male', '1990-01-01'), P('cousinCross', 'female', '1993-01-01'), P('mamaKid', 'male', '1991-01-01'),
  P('wife', 'female', '1994-06-01'), P('kid', 'male', '2020-01-01'),
  P('mamagaru', 'male'), P('attagaru', 'female'), P('bil', 'male', '1996-01-01'),
  P('unknown', 'unspecified'),
];
const pc = (parentId, childId) => ({ id: `${parentId}>${childId}`, type: 'parent-child', parentId, childId });
const sp = (a, b) => ({ id: `${a}=${b}`, type: 'spouse', personAId: a, personBId: b });
const relationships = [
  sp('thatha', 'nanamma'), sp('tata2', 'ammamma'),
  ...['pedananna', 'nanna', 'chinnanna', 'atta'].flatMap((c) => [pc('thatha', c), pc('nanamma', c)]),
  ...['amma', 'mamayya', 'pinni'].flatMap((c) => [pc('tata2', c), pc('ammamma', c)]),
  sp('pedananna', 'peddamma'), sp('nanna', 'amma'), sp('chinnanna', 'pinni2'), sp('atta', 'mamaByMarriage'),
  sp('mamayya', 'attaByMarriage'),
  ...['me', 'anna', 'chelli'].flatMap((c) => [pc('nanna', c), pc('amma', c)]),
  pc('pedananna', 'cousinPar'), pc('atta', 'cousinCross'), pc('mamayya', 'mamaKid'),
  sp('me', 'wife'), pc('me', 'kid'), pc('wife', 'kid'),
  sp('mamagaru', 'attagaru'), pc('mamagaru', 'wife'), pc('attagaru', 'wife'), pc('mamagaru', 'bil'), pc('attagaru', 'bil'),
  pc('nanna', 'unknown'),
];

const rel = (to, from = 'me') => describeRelationship(persons, relationships, from, to);
const romans = (r) => r.telugu.map((t) => t.term.roman);

describe('kinship engine', () => {
  it('finds a path and returns null when unconnected', () => {
    expect(findRelationshipPath(persons, relationships, 'me', 'nanna')).toEqual([{ type: 'P', id: 'nanna' }]);
    expect(findRelationshipPath([...persons, P('island', 'male')], relationships, 'me', 'island')).toBeNull();
  });

  it('names parents, children and spouse', () => {
    expect(romans(rel('nanna'))).toEqual(['Nanna']);
    expect(romans(rel('amma'))).toEqual(['Amma']);
    expect(romans(rel('kid'))).toEqual(['Koduku']);
    expect(romans(rel('wife'))).toEqual(['Bharya']);
    expect(rel('wife').english).toBe('Wife');
  });

  it('distinguishes elder and younger siblings', () => {
    expect(romans(rel('anna'))).toEqual(['Annayya']);
    expect(romans(rel('chelli'))).toEqual(['Chelli']);
    expect(rel('anna').description).toBe('elder brother');
  });

  it('distinguishes paternal and maternal grandmothers', () => {
    expect(romans(rel('nanamma'))).toEqual(['Nanamma']);
    expect(romans(rel('ammamma'))).toEqual(['Ammamma']);
    expect(romans(rel('thatha'))).toEqual(['Thatha']);
    expect(rel('thatha').english).toBe('Grandfather');
  });

  it("names the father's and mother's siblings by side and age", () => {
    expect(romans(rel('pedananna'))).toEqual(['Pedananna']);
    expect(romans(rel('chinnanna'))).toEqual(['Chinnanna / Babai']);
    expect(romans(rel('atta'))).toEqual(['Atta']);
    expect(romans(rel('mamayya'))).toEqual(['Mamayya']);
    expect(romans(rel('pinni'))).toEqual(['Pinni']);
    expect(rel('pedananna').english).toBe('Uncle');
    expect(rel('pedananna').description).toBe("father's elder brother");
  });

  it("names parents' siblings' spouses", () => {
    expect(romans(rel('peddamma'))).toEqual(['Peddamma']);
    expect(romans(rel('pinni2'))).toEqual(['Pinni']);
    expect(romans(rel('mamaByMarriage'))).toEqual(['Mamayya']);
    expect(romans(rel('attaByMarriage'))).toEqual(['Atta']);
  });

  it('calls parallel cousins brother/sister and cross cousins Bava/Maradalu', () => {
    expect(romans(rel('cousinPar'))).toEqual(['Annayya']); // father's brother's son, elder
    expect(romans(rel('cousinCross'))).toEqual(['Maradalu']); // father's sister's daughter, younger
    expect(romans(rel('mamaKid'))).toEqual(['Bava']); // mother's brother's son, elder
    expect(rel('cousinPar').english).toBe('First cousin');
  });

  it('names in-laws', () => {
    expect(romans(rel('mamagaru'))).toEqual(['Mamagaru']);
    expect(romans(rel('attagaru'))).toEqual(['Attagaru']);
    expect(romans(rel('bil'))).toEqual(['Bavamaridi']); // wife's younger brother
    expect(romans(rel('me', 'mamagaru'))).toEqual(['Alludu']);
    expect(romans(rel('wife', 'nanna'))).toEqual(['Kodalu']);
    expect(romans(rel('wife', 'anna'))).toEqual(['Maradalu']); // younger brother's wife
  });

  it("names a sibling's children by the sibling's gender", () => {
    // From atta (female): her brother's son is Menalludu.
    expect(romans(rel('me', 'atta'))).toEqual(['Menalludu']);
    // From pedananna (male): his brother's son is called son.
    expect(romans(rel('me', 'pedananna'))).toEqual(['Koduku']);
  });

  it('lists every possible term and what is missing when data is incomplete', () => {
    const r = rel('unknown');
    expect(romans(r)).toEqual(['Annayya', 'Thammudu', 'Akka', 'Chelli']);
    expect(r.missing.join()).toMatch(/gender of unknown/);

    const noDates = persons.map((p) => (p.id === 'chinnanna' ? { ...p, dateOfBirth: null } : p));
    const r2 = describeRelationship(noDates, relationships, 'me', 'chinnanna');
    expect(r2.telugu.map((t) => t.when)).toEqual(['if elder', 'if younger']);
    expect(r2.missing.join()).toMatch(/birth dates/);
  });

  it('describes deep blood relations in English', () => {
    expect(rel('kid', 'thatha').english).toBe('Great-grandson');
    expect(rel('cousinPar', 'kid').english).toBe('First cousin, once removed');
  });

  it('returns the path for display', () => {
    expect(rel('cousinCross').path.map((s) => s.id)).toEqual(['me', 'nanna', 'atta', 'cousinCross']);
  });
});

import { describeRelationshipsFrom } from '../../../src/family-tree/kinship/kinshipEngine.js';

describe('describeRelationshipsFrom', () => {
  it('matches the one-to-one finder for everyone, from a single search', () => {
    const all = describeRelationshipsFrom(persons, relationships, 'me');
    expect(all.has('me')).toBe(false);
    for (const id of ['nanna', 'pedananna', 'mamayya', 'cousinCross', 'bil', 'kid', 'unknown']) {
      const single = describeRelationship(persons, relationships, 'me', id);
      expect(all.get(id)).toEqual(single);
    }
    expect(all.get('amma').telugu.map((t) => t.term.roman)).toEqual(['Amma']);
  });

  it('returns nothing for an unknown person', () => {
    expect(describeRelationshipsFrom(persons, relationships, 'nobody').size).toBe(0);
  });
});

import { siblingOrderFromLayout } from '../../../src/family-tree/kinship/kinshipEngine.js';
import { computeTreeLayout } from '../../../src/family-tree/engine/treeLayout.js';

describe('elder/younger from card order', () => {
  // Parents with four children, no birth dates recorded.
  const people = [
    P('dad', 'male'), P('mom', 'female'),
    P('b1', 'male'), P('s1', 'female'), P('ego', 'male'), P('b2', 'male'),
    P('b1wife', 'female'),
  ];
  const rels = [
    sp('dad', 'mom'),
    ...['b1', 's1', 'ego', 'b2'].flatMap((c) => [pc('dad', c), pc('mom', c)]),
    sp('b1', 'b1wife'),
  ];
  const termsFor = (order) => {
    const layout = computeTreeLayout(people, rels, { customSiblingOrders: order ? { 'dad-children': order } : {} });
    const all = describeRelationshipsFrom(people, rels, 'ego', { siblingOrder: siblingOrderFromLayout(layout) });
    return (id) => all.get(id).telugu.map((t) => t.term.roman);
  };

  it('treats siblings to the left as elder and to the right as younger', () => {
    const t = termsFor(['b1', 's1', 'ego', 'b2']);
    expect(t('b1')).toEqual(['Annayya']);
    expect(t('s1')).toEqual(['Akka']);
    expect(t('b2')).toEqual(['Thammudu']);
    expect(t('b1wife')).toEqual(['Vadina']); // elder brother's wife
  });

  it('follows the new order after siblings are rearranged', () => {
    const t = termsFor(['ego', 'b2', 's1', 'b1']);
    expect(t('b1')).toEqual(['Thammudu']);
    expect(t('s1')).toEqual(['Chelli']);
    expect(t('b1wife')).toEqual(['Maradalu']); // younger brother's wife
  });

  it('lets recorded birth dates win over card order', () => {
    const dated = people.map((p) => (p.id === 'b2' ? { ...p, dateOfBirth: '1960-01-01' } : p.id === 'ego' ? { ...p, dateOfBirth: '1970-01-01' } : p));
    const layout = computeTreeLayout(dated, rels, { customSiblingOrders: { 'dad-children': ['b1', 's1', 'ego', 'b2'] } });
    const all = describeRelationshipsFrom(dated, rels, 'ego', { siblingOrder: siblingOrderFromLayout(layout) });
    expect(all.get('b2').telugu.map((t) => t.term.roman)).toEqual(['Annayya']);
  });

  it("uses the parent's position for their siblings (Pedananna / Chinnanna)", () => {
    const kid = P('kid', 'male');
    const layout = computeTreeLayout([...people, kid], [...rels, pc('ego', 'kid')], { customSiblingOrders: { 'dad-children': ['b1', 's1', 'ego', 'b2'] } });
    const all = describeRelationshipsFrom([...people, kid], [...rels, pc('ego', 'kid')], 'kid', { siblingOrder: siblingOrderFromLayout(layout) });
    expect(all.get('b1').telugu.map((t) => t.term.roman)).toEqual(['Pedananna']);
    expect(all.get('b2').telugu.map((t) => t.term.roman)).toEqual(['Chinnanna / Babai']);
  });
});

describe('elder/younger for a sibling shown in another family row', () => {
  it('falls back to the order the children were added', () => {
    // 'sis' marries into another family in the tree, so her card is not in her parents' row.
    const people = [
      P('dad', 'male'), P('mom', 'female'), P('sis', 'female'), P('ego', 'male'),
      P('inlawDad', 'male'), P('husband', 'male'),
    ];
    const rels = [
      sp('dad', 'mom'), pc('dad', 'sis'), pc('mom', 'sis'), pc('dad', 'ego'), pc('mom', 'ego'),
      pc('inlawDad', 'husband'), sp('husband', 'sis'),
    ];
    const layout = computeTreeLayout(people, rels);
    expect(layout.nodes.get('sis').cohortKey).not.toBe(layout.nodes.get('ego').cohortKey);
    const all = describeRelationshipsFrom(people, rels, 'ego', { siblingOrder: siblingOrderFromLayout(layout, rels) });
    expect(all.get('sis').telugu.map((t) => t.term.roman)).toEqual(['Akka']); // added before ego
  });
});
