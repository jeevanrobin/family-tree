import { describe, it, expect } from 'vitest';
import { findDuplicateCandidates, normalizeName, jaroWinkler, pairKey } from '../../../src/family-tree/duplicates/duplicateFinder.js';

const P = (id, firstName, lastName, extra = {}) => ({ id, firstName, lastName, displayName: `${firstName} ${lastName}`, ...extra });

describe('name normalization', () => {
  it('folds common English spellings of Telugu names', () => {
    expect(normalizeName('Penthala')).toBe(normalizeName('Pentala'));
    expect(normalizeName('Venkata Reddy')).toBe(normalizeName('VenkataReddy'));
    expect(normalizeName('Lakshmi')).toBe(normalizeName('Laxmi'));
    expect(normalizeName('Sreenivas')).toBe(normalizeName('Srinivas'));
  });

  it('scores similar names highly and different names low', () => {
    expect(jaroWinkler(normalizeName('Penthala'), normalizeName('Penathala'))).toBeGreaterThan(0.9);
    expect(jaroWinkler(normalizeName('Mamilla'), normalizeName('Marepalli'))).toBeLessThan(0.9);
  });
});

describe('findDuplicateCandidates', () => {
  it('finds the same person entered twice with a spelling variant', () => {
    const people = [
      P('a', 'Venkata Reddy', 'Medida', { dateOfBirth: '1969-07-10', gender: 'male' }),
      P('b', 'Venkatreddy', 'Medida', { dateOfBirth: '1969-01-01', gender: 'male' }),
      P('c', 'Sudhakar', 'Singireddy'),
    ];
    const [top, ...rest] = findDuplicateCandidates(people, []);
    expect([top.a.id, top.b.id].sort()).toEqual(['a', 'b']);
    expect(top.reasons).toContain('Both born 1969');
    expect(rest).toHaveLength(0);
  });

  it('does not flag people with the same first name but different surnames', () => {
    const people = [P('a', 'Venkatreddy', 'Mamilla'), P('b', 'Venkatreddy', 'Marepalli')];
    expect(findDuplicateCandidates(people, [])).toEqual([]);
  });

  it('does not flag a grandson named after his grandfather', () => {
    const people = [P('gf', 'Ramaiah', 'Medida'), P('f', 'Potaiah', 'Medida'), P('gs', 'Ramaiah', 'Medida')];
    const relationships = [
      { type: 'parent-child', parentId: 'gf', childId: 'f' },
      { type: 'parent-child', parentId: 'f', childId: 'gs' },
    ];
    expect(findDuplicateCandidates(people, relationships)).toEqual([]);
  });

  it('rules out contradicting genders and birth years', () => {
    expect(findDuplicateCandidates([P('a', 'Satya', 'Kusu', { gender: 'male' }), P('b', 'Satya', 'Kusu', { gender: 'female' })], [])).toEqual([]);
    expect(findDuplicateCandidates([P('a', 'Ravi', 'Kumar', { dateOfBirth: '1950-01-01' }), P('b', 'Ravi', 'Kumar', { dateOfBirth: '1980-01-01' })], [])).toEqual([]);
  });

  it('boosts pairs with the same parents or spouse and skips dismissed pairs', () => {
    const people = [P('a', 'Laxmi', 'Gone'), P('b', 'Lakshmi', 'Gone'), P('mom', 'Nagamma', 'Penthala')];
    const relationships = [
      { type: 'parent-child', parentId: 'mom', childId: 'a' },
      { type: 'parent-child', parentId: 'mom', childId: 'b' },
    ];
    const [top] = findDuplicateCandidates(people, relationships);
    expect(top.reasons).toContain('Same parents');
    expect(findDuplicateCandidates(people, relationships, { dismissed: [pairKey('b', 'a')] })).toEqual([]);
  });

});

describe('FamilyStore.mergePeople', () => {
  async function makeStore() {
    const { FamilyStore } = await import('../../../src/family-tree/store/FamilyStore.js');
    const store = new FamilyStore();
    store.loadFromData(
      [
        { id: 'mom', firstName: 'Nagamma', lastName: 'Penthala', gender: 'female' },
        { id: 'dad', firstName: 'Venkaiah', lastName: 'Penthala', gender: 'male' },
        { id: 'a', firstName: 'Laxmi', lastName: 'Gone', gender: 'female', dateOfBirth: '1970-02-02' },
        { id: 'b', firstName: 'Lakshmi', lastName: 'Gone', placeOfBirth: 'Muthagudem', occupation: 'Teacher' },
        { id: 'h', firstName: 'Ravi', lastName: 'Gone', gender: 'male' },
        { id: 'kid', firstName: 'Anil', lastName: 'Gone' },
      ],
      [
        { id: 'r1', type: 'parent-child', parentId: 'mom', childId: 'a' },
        { id: 'r2', type: 'parent-child', parentId: 'mom', childId: 'b' }, // duplicate link after merge
        { id: 'r3', type: 'parent-child', parentId: 'dad', childId: 'b' },
        { id: 'r4', type: 'spouse', personAId: 'b', personBId: 'h' },
        { id: 'r5', type: 'parent-child', parentId: 'b', childId: 'kid' },
      ],
      [{ id: 's1', personId: 'b', title: 'Wedding', content: 'x', relatedPersonIds: ['b', 'h'] }],
      [], [], []
    );
    return store;
  }

  it('fills missing details, moves relationships and records, and removes the duplicate', async () => {
    const store = await makeStore();
    store.mergePeople('a', 'b');
    const kept = store.getPersonById('a');
    expect(store.getPersonById('b')).toBeNull();
    expect(kept).toMatchObject({ firstName: 'Laxmi', dateOfBirth: '1970-02-02', placeOfBirth: 'Muthagudem', occupation: 'Teacher' });
    expect(store.getParents('a').map((p) => p.id).sort()).toEqual(['dad', 'mom']);
    expect(store.getSpouses('a').map((p) => p.id)).toEqual(['h']);
    expect(store.getChildren('a').map((p) => p.id)).toEqual(['kid']);
    const momLinks = store.relationships.filter((r) => r.type === 'parent-child' && r.parentId === 'mom');
    expect(momLinks).toHaveLength(1);
    expect(store.stories[0]).toMatchObject({ personId: 'a', relatedPersonIds: ['a', 'h'] });
  });

  it("can take the duplicate's value for chosen fields", async () => {
    const store = await makeStore();
    store.mergePeople('a', 'b', { fieldChoices: { firstName: 'duplicate' } });
    expect(store.getPersonById('a')).toMatchObject({ firstName: 'Lakshmi', displayName: 'Lakshmi Gone' });
  });

  it('is recorded in the change history and can be undone step by step', async () => {
    const store = await makeStore();
    store.changeLog = [];
    store.mergePeople('a', 'b');
    const actions = store.getChangeLog().map((e) => `${e.entityType}:${e.action}`);
    expect(actions[0]).toBe('person:delete');
    expect(actions).toContain('person:update');
  });

  it('refuses to merge a person with themselves', async () => {
    const store = await makeStore();
    expect(() => store.mergePeople('a', 'a')).toThrow();
  });
});
