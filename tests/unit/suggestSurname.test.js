import { describe, it, expect } from 'vitest';
import { suggestSurname } from '../../src/family-tree/utils/suggestSurname.js';

const ramaiah = { id: 'r', displayName: 'Ramaiah Medida', lastName: 'Medida', gender: 'male' };
const lalitha = { id: 'l', displayName: 'Lalithamma Medida', lastName: 'Medida', gender: 'female' };
const laxmi = { id: 'x', displayName: 'Laxmi Singireddy', lastName: 'Singireddy', gender: 'female' };
const potaiah = { id: 'p', displayName: 'Potaiah Medida', lastName: 'Medida', gender: 'male' };
const kalinga = { id: 'k', displayName: 'Kalinga Singireddy', lastName: 'Singireddy', gender: 'male' };
const family = {
  getSpouses: (id) => ({ r: [lalitha], l: [ramaiah], x: [kalinga] }[id] || []),
  getParents: (id) => ({ r: [potaiah], x: [{ id: 'mf', displayName: 'Venkaiah Penthala', lastName: 'Penthala', gender: 'male' }] }[id] || []),
};
const s = (...a) => suggestSurname(...a)?.surname ?? null;

describe('suggestSurname', () => {
  it('child takes the father’s surname', () => {
    expect(s('child', ramaiah, family)).toBe('Medida');
    expect(suggestSurname('child', ramaiah, family).fromName).toBe('Ramaiah Medida');
  });
  it('child added under the mother takes her husband’s surname', () => {
    expect(s('child', laxmi, family)).toBe('Singireddy');
  });
  it('wife takes the husband’s surname; husband is left empty', () => {
    expect(s('spouse', ramaiah, family)).toBe('Medida');
    expect(s('spouse', laxmi, family)).toBeNull();
  });
  it('sibling takes their father’s surname, not a married sister’s', () => {
    expect(s('sibling', laxmi, family)).toBe('Penthala');
    expect(s('sibling', ramaiah, family)).toBe('Medida');
  });
  it('father of a son shares his surname', () => {
    expect(s('father', ramaiah, family)).toBe('Medida');
  });
  it('no guess without a surname', () => {
    expect(s('child', { id: 'z', gender: 'male', lastName: '' }, family)).toBeNull();
  });
});
