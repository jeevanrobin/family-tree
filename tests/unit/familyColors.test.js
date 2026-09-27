import { describe, it, expect } from 'vitest';
import { buildFamilyColors, familyKey, FAMILY_PALETTE } from '../../src/family-tree/utils/familyColors.js';

describe('family colours', () => {
  const people = [
    { id: 1, displayName: 'Potaiah Medida', lastName: 'Medida' },
    { id: 2, displayName: 'Ramaiah Medida', lastName: ' medida ' },
    { id: 3, displayName: 'Laxmi Singireddy', lastName: 'Singireddy' },
    { id: 4, displayName: 'Anusha' },
    { id: 5, displayName: 'Kausalya Anumula', lastName: '' },
  ];

  it('groups by surname, ignoring case and spaces; falls back to the last word', () => {
    expect(familyKey(people[1])).toBe('medida');
    expect(familyKey(people[4])).toBe('anumula');
    expect(familyKey(people[3])).toBe('');
  });

  it('gives the most common family the first colour', () => {
    const { colorOf, families } = buildFamilyColors(people);
    expect(families[0]).toMatchObject({ key: 'medida', count: 2, color: FAMILY_PALETTE[0] });
    expect(colorOf(people[0])).toBe(colorOf(people[1]));
    expect(colorOf(people[2])).not.toBe(colorOf(people[0]));
    expect(colorOf(people[3])).toBeNull();
  });
});

describe('primary family', () => {
  it('gives the tree’s own family the first colour even if another surname is more common', () => {
    const people = [
      { displayName: 'Potaiah Medida', lastName: 'Medida' },
      { displayName: 'A Anumula', lastName: 'Anumula' },
      { displayName: 'B Anumula', lastName: 'Anumula' },
    ];
    const { families } = buildFamilyColors(people, { primaryKey: 'medida' });
    expect(families[0].key).toBe('medida');
    expect(families[0].color).toBe(FAMILY_PALETTE[0]);
  });
});
