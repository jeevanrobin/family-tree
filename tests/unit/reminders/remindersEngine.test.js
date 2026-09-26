import { describe, it, expect } from 'vitest';
import { getUpcomingOccasions, describeWhen } from '../../../src/family-tree/reminders/remindersEngine.js';

const today = new Date(2026, 8, 26); // 26 Sep 2026, local time

const people = [
  { id: 'a', firstName: 'Venkata', displayName: 'Venkata Reddy', dateOfBirth: '1969-09-26', livingStatus: 'alive' },
  { id: 'b', firstName: 'Padmavathi', displayName: 'Padmavathi', dateOfBirth: '1975-10-03', livingStatus: 'alive' },
  { id: 'c', firstName: 'Venkatanarsamma', displayName: 'Venkatanarsamma', dateOfBirth: '1930-09-28', dateOfDeath: '2009-09-30', livingStatus: 'deceased' },
  { id: 'd', firstName: 'Leap', displayName: 'Leap Baby', dateOfBirth: '2004-02-29', livingStatus: 'alive' },
  { id: 'e', firstName: 'Far', displayName: 'Far Away', dateOfBirth: '1990-12-25', livingStatus: 'alive' },
  { id: 'f', firstName: 'NoDate', displayName: 'No Date', livingStatus: 'alive' },
];
const relationships = [{ id: 'm', type: 'spouse', personAId: 'a', personBId: 'b', startDate: '1995-10-01' }];

describe('getUpcomingOccasions', () => {
  const list = getUpcomingOccasions({ people, relationships }, { today, days: 30 });

  it('lists birthdays, anniversaries and death anniversaries in date order', () => {
    expect(list.map((o) => [o.type, o.daysAway])).toEqual([
      ['birthday', 0],
      ['death-anniversary', 4],
      ['anniversary', 5],
      ['birthday', 7],
    ]);
  });

  it('computes ages and years', () => {
    expect(list[0].title).toBe('Venkata Reddy turns 57');
    expect(list[1].title).toBe('17th death anniversary of Venkatanarsamma');
    expect(list[2].title).toBe('Venkata & Padmavathi: 31st wedding anniversary');
  });

  it('skips birthdays of people who have died', () => {
    expect(list.some((o) => o.type === 'birthday' && o.personIds[0] === 'c')).toBe(false);
  });

  it('respects the look-ahead window', () => {
    expect(list.some((o) => o.personIds.includes('e'))).toBe(false);
    const year = getUpcomingOccasions({ people, relationships }, { today, days: 366 });
    expect(year.some((o) => o.personIds.includes('e'))).toBe(true);
  });

  it('observes 29 February birthdays on 28 February in non-leap years', () => {
    const feb = getUpcomingOccasions({ people, relationships }, { today: new Date(2027, 1, 20), days: 10 });
    const leap = feb.find((o) => o.personIds[0] === 'd');
    expect(leap.date).toBe('2027-02-28');
  });

  it('wraps around the new year', () => {
    const dec = getUpcomingOccasions(
      { people: [{ id: 'x', displayName: 'X', dateOfBirth: '2000-01-02', livingStatus: 'alive' }], relationships: [] },
      { today: new Date(2026, 11, 30), days: 7 }
    );
    expect(dec[0]).toMatchObject({ date: '2027-01-02', daysAway: 3, years: 27 });
  });

  it('skips anniversaries once a spouse has died', () => {
    const widowed = people.map((p) => (p.id === 'b' ? { ...p, livingStatus: 'deceased' } : p));
    const out = getUpcomingOccasions({ people: widowed, relationships }, { today, days: 30 });
    expect(out.some((o) => o.type === 'anniversary')).toBe(false);
  });
});

describe('describeWhen', () => {
  it('reads naturally', () => {
    expect(describeWhen(0)).toBe('Today');
    expect(describeWhen(1)).toBe('Tomorrow');
    expect(describeWhen(6)).toBe('In 6 days');
  });
});

describe('FamilyStore.setMarriageDate', () => {
  it('records a marriage date that then produces an anniversary reminder', async () => {
    const { FamilyStore } = await import('../../../src/family-tree/store/FamilyStore.js');
    const store = new FamilyStore();
    store.loadFromData(
      [
        { id: 'h', firstName: 'Ravi', displayName: 'Ravi', livingStatus: 'alive' },
        { id: 'w', firstName: 'Lakshmi', displayName: 'Lakshmi', livingStatus: 'alive' },
      ],
      [{ id: 'm', type: 'spouse', personAId: 'h', personBId: 'w' }],
      [], [], [], []
    );
    store.setMarriageDate('w', 'h', '2000-09-28');
    expect(store.getMarriage('h', 'w').startDate).toBe('2000-09-28');

    const snap = store.getSnapshot();
    const list = getUpcomingOccasions({ people: snap.people, relationships: snap.relationships }, { today: new Date(2026, 8, 26), days: 7 });
    expect(list.map((o) => o.title)).toEqual(['Ravi & Lakshmi: 26th wedding anniversary']);
    expect(() => store.setMarriageDate('h', 'w', '2000')).toThrow(/full date/);
  });
});
