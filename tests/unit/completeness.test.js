import { describe, it, expect } from 'vitest';
import { findTreeGaps, knownPlaces, missingFields } from '../../src/family-tree/completeness/treeGaps.js';

const people = [
  { id: 'f', displayName: 'Father', gender: 'male', placeOfBirth: 'Muthagudem', currentLocation: 'Khammam', livingStatus: 'alive' },
  { id: 'm', displayName: 'Mother', gender: 'female', placeOfBirth: '', livingStatus: 'deceased' },
  { id: 'k', displayName: 'Kid', gender: 'unspecified', placeOfBirth: 'Muthagudem', livingStatus: 'alive' },
];
const rels = [
  { id: 's', type: 'spouse', personId1: 'f', personId2: 'm' },
  { id: 'a', type: 'parent-child', parentId: 'f', childId: 'k' },
  { id: 'b', type: 'parent-child', parentId: 'm', childId: 'k' },
];

describe('treeGaps', () => {
  it('lists only missing fields; no current place asked for the deceased', () => {
    expect(missingFields(people[0])).toEqual([]);
    expect(missingFields(people[1])).toEqual(['placeOfBirth']);
    expect(missingFields(people[2])).toEqual(['gender', 'currentLocation']);
  });

  it('puts missing gender first and explains who each person is', () => {
    const gaps = findTreeGaps(people, rels);
    expect(gaps.map((g) => g.person.id)).toEqual(['k', 'm']);
    expect(gaps[0].context).toBe('Child of Father & Mother');
    expect(gaps[1].context).toBe('Wife of Father');
  });

  it('suggests places already used, most common first', () => {
    expect(knownPlaces(people)).toEqual(['Muthagudem', 'Khammam']);
  });
});
