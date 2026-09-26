import { describe, it, expect, beforeEach } from 'vitest';
import { FamilyStore } from '../../../src/family-tree/store/FamilyStore.js';

function makeStore() {
  const store = new FamilyStore();
  store.loadFromData(
    [
      { id: 'dad', firstName: 'Ramaiah', lastName: 'Medida', gender: 'male' },
      { id: 'mom', firstName: 'Lalithamma', lastName: 'Medida', gender: 'female' },
      { id: 'kid', firstName: 'Venkata', lastName: 'Medida', gender: 'male' },
      { id: 'cousin', firstName: 'Ravi', lastName: 'Ponnala', gender: 'male' },
    ],
    [
      { id: 'm', type: 'spouse', personAId: 'dad', personBId: 'mom' },
      { id: 'pc1', type: 'parent-child', parentId: 'dad', childId: 'kid' },
      { id: 'pc2', type: 'parent-child', parentId: 'mom', childId: 'kid' },
      { id: 'sib', type: 'sibling', personAId: 'cousin', personBId: 'kid' },
    ],
    [], [], [], []
  );
  store.changeLog = [];
  return store;
}

describe('unlinking relatives', () => {
  let store;
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* no storage */
    }
    store = makeStore();
  });

  it('finds the link in the right direction', () => {
    expect(store.findLinksBetween('kid', 'mom', 'parent')).toEqual(['pc2']);
    expect(store.findLinksBetween('mom', 'kid', 'child')).toEqual(['pc2']);
    expect(store.findLinksBetween('mom', 'kid', 'parent')).toEqual([]);
    expect(store.findLinksBetween('mom', 'dad', 'spouse')).toEqual(['m']);
    expect(store.findLinksBetween('kid', 'cousin', 'sibling')).toEqual(['sib']);
  });

  it('removes only that link and keeps both people', () => {
    expect(store.unlinkPeople('kid', 'mom', 'parent')).toBe(1);
    expect(store.getParents('kid').map((p) => p.id)).toEqual(['dad']);
    expect(store.getPersonById('mom')).toBeTruthy();
    expect(store.getSpouses('dad').map((p) => p.id)).toEqual(['mom']);
  });

  it('is recorded in change history so it can be undone', () => {
    store.unlinkPeople('dad', 'mom', 'spouse');
    const [entry] = store.getChangeLog();
    expect(entry).toMatchObject({ action: 'delete', entityType: 'relationship', entityId: 'm' });
    store.restoreChange(entry);
    expect(store.getSpouses('dad').map((p) => p.id)).toEqual(['mom']);
  });
});
