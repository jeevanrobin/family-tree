import { describe, it, expect, beforeEach } from 'vitest';
import { FamilyStore } from '../../../src/family-tree/store/FamilyStore.js';

function makeStore() {
  const store = new FamilyStore();
  store.loadFromData(
    [
      { id: 'dad', firstName: 'Ramaiah', lastName: 'Medida', gender: 'male' },
      { id: 'mom', firstName: 'Lalithamma', lastName: 'Medida', gender: 'female' },
      { id: 'kid', firstName: 'Venkata', lastName: 'Medida', gender: 'male', occupation: 'Farmer' },
    ],
    [
      { id: 'm', type: 'spouse', personAId: 'dad', personBId: 'mom' },
      { id: 'pc1', type: 'parent-child', parentId: 'dad', childId: 'kid' },
      { id: 'pc2', type: 'parent-child', parentId: 'mom', childId: 'kid' },
    ],
    [], [], [], []
  );
  store.changeLog = [];
  return store;
}

describe('change history', () => {
  let store;
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* no storage */
    }
    store = makeStore();
    store.setHistoryActor('Lakshmi');
  });

  it('logs edits with who, what changed, before and after', () => {
    store.updatePerson('kid', { occupation: 'Teacher', dateOfBirth: '1969-07-10' });
    const [entry] = store.getChangeLog();
    expect(entry).toMatchObject({ action: 'update', entityType: 'person', entityId: 'kid', actor: 'Lakshmi' });
    expect(entry.fields.sort()).toEqual(['dateOfBirth', 'occupation']);
    expect(entry.before.occupation).toBe('Farmer');
    expect(entry.after.occupation).toBe('Teacher');
  });

  it('does not log saves that change nothing', () => {
    store.updatePerson('kid', { occupation: 'Farmer' });
    expect(store.getChangeLog()).toHaveLength(0);
  });

  it('restores the previous values of an edit', () => {
    store.updatePerson('kid', { occupation: 'Teacher' });
    store.updatePerson('kid', { lastName: 'M' });
    const occupationEdit = store.getChangeLog()[1];
    store.restoreChange(occupationEdit);
    const kid = store.getPersonById('kid');
    expect(kid.occupation).toBe('Farmer');
    expect(kid.lastName).toBe('M'); // later, unrelated edit is kept
    expect(store.getChangeLog()[0].action).toBe('update'); // the restore is itself logged
  });

  it('restores a deleted person together with their relationships', () => {
    store.deletePerson('kid');
    expect(store.getPersonById('kid')).toBeNull();
    const [entry] = store.getChangeLog();
    expect(entry.related.map((r) => r.id).sort()).toEqual(['pc1', 'pc2']);

    store.restoreChange(entry);
    expect(store.getPersonById('kid').firstName).toBe('Venkata');
    expect(store.getParents('kid').map((p) => p.id).sort()).toEqual(['dad', 'mom']);
  });

  it('undoes adding a person and adding or removing a relationship', () => {
    const added = store.addPerson({ id: 'new', firstName: 'Neeraja' });
    store.restoreChange(store.getChangeLog()[0]);
    expect(store.getPersonById(added.id)).toBeNull();

    store.removeRelationship('m');
    store.restoreChange(store.getChangeLog()[0]);
    expect(store.getSpouses('dad').map((p) => p.id)).toEqual(['mom']);
  });

  it('restores a marriage date', () => {
    store.setMarriageDate('dad', 'mom', '1960-05-01');
    store.setMarriageDate('dad', 'mom', '1961-05-01');
    store.restoreChange(store.getChangeLog()[0]);
    expect(store.getMarriage('dad', 'mom').startDate).toBe('1960-05-01');
  });

  it('refuses restores that no longer make sense', () => {
    store.updatePerson('kid', { occupation: 'Teacher' });
    const edit = store.getChangeLog()[0];
    store.deletePerson('kid');
    expect(() => store.restoreChange(edit)).toThrow(/deleted/);
  });
});

import { describeChange, restoreLabel } from '../../../src/family-tree/history/describeChange.js';

describe('describeChange', () => {
  const names = { dad: 'Ramaiah Medida', mom: 'Lalithamma Medida', kid: 'Venkata Medida' };
  const nameOf = (id) => names[id];

  it('describes field edits with before and after', () => {
    const { summary, details } = describeChange(
      {
        actor: 'Lakshmi',
        action: 'update',
        entityType: 'person',
        before: { displayName: 'Venkata Medida', occupation: 'Farmer', dateOfBirth: null },
        after: { displayName: 'Venkata Medida', occupation: 'Teacher', dateOfBirth: '1969-07-10' },
        fields: ['occupation', 'dateOfBirth'],
      },
      nameOf
    );
    expect(summary).toBe('Lakshmi edited Venkata Medida');
    expect(details).toEqual(['Occupation: Farmer → Teacher', 'Birth date: — → 10 Jul 1969']);
  });

  it('describes relationships by the people involved', () => {
    expect(
      describeChange({ actor: 'Ravi', action: 'create', entityType: 'relationship', after: { type: 'parent-child', parentId: 'dad', childId: 'kid' } }, nameOf).summary
    ).toBe('Ravi linked Ramaiah Medida as parent of Venkata Medida');
    expect(
      describeChange({ actor: 'Ravi', action: 'delete', entityType: 'relationship', before: { type: 'spouse', personAId: 'dad', personBId: 'mom' } }, nameOf).summary
    ).toBe('Ravi removed the marriage of Ramaiah Medida and Lalithamma Medida');
  });

  it('mentions relationships removed along with a deleted person', () => {
    const d = describeChange({ actor: 'Ravi', action: 'delete', entityType: 'person', before: { displayName: 'Venkata Medida' }, related: [{}, {}] });
    expect(d.summary).toBe('Ravi deleted Venkata Medida');
    expect(d.details).toEqual(['and 2 relationships with them']);
  });

  it('labels the restore button by action', () => {
    expect(restoreLabel({ action: 'update' })).toBe('Restore previous');
    expect(restoreLabel({ action: 'create' })).toBe('Undo');
    expect(restoreLabel({ action: 'delete' })).toBe('Restore');
  });
});
