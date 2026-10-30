import { describe, it, expect } from 'vitest';
import {
  panchangOf,
  describePanchang,
  nextThithiDay,
  APARAHNA_IST,
} from '../../../src/family-tree/reminders/panchang.js';
import { getUpcomingOccasions } from '../../../src/family-tree/reminders/remindersEngine.js';

describe('panchangOf (checked against festival days)', () => {
  it.each([
    ['Ugadi 2024', 2024, 4, 9, 'Chaitra Shukla Padyami'],
    ['Sri Rama Navami 2024', 2024, 4, 17, 'Chaitra Shukla Navami'],
    ['Ugadi 2025', 2025, 3, 30, 'Chaitra Shukla Padyami'],
    ['Vinayaka Chavithi 2025', 2025, 8, 27, 'Bhadrapada Shukla Chavithi'],
    ['Deepavali 2025', 2025, 10, 21, 'Ashvayuja Bahula Amavasya'],
  ])('%s at sunrise', (_name, y, m, d, expected) => {
    expect(describePanchang(panchangOf(y, m, d))).toBe(expected);
  });

  it('Vijayadashami by the afternoon thithi', () => {
    expect(describePanchang(panchangOf(2024, 10, 12, APARAHNA_IST))).toBe('Ashvayuja Shukla Dashami');
    expect(describePanchang(panchangOf(2025, 10, 2, APARAHNA_IST))).toBe('Ashvayuja Shukla Dashami');
  });
});

describe('nextThithiDay', () => {
  it('finds the same masam and thithi in a later year', () => {
    const next = nextThithiDay('2025-10-02', new Date(2026, 0, 1));
    const p = panchangOf(next.date.getFullYear(), next.date.getMonth() + 1, next.date.getDate(), APARAHNA_IST);
    expect(describePanchang(p)).toBe('Ashvayuja Shukla Dashami');
    expect(next.date.getFullYear()).toBe(2026);
    expect(next.date.getMonth()).toBeGreaterThanOrEqual(8); // September-October
    expect(next.date.getMonth()).toBeLessThanOrEqual(9);
  });

  it('returns null for a missing date', () => {
    expect(nextThithiDay('')).toBeNull();
  });
});

describe('thithi reminders', () => {
  const people = [{ id: 'g', firstName: 'Grandfather', livingStatus: 'deceased', dateOfDeath: '2025-10-02' }];

  it('are added only when asked for', () => {
    const today = new Date(2026, 8, 1);
    expect(getUpcomingOccasions({ people }, { today, days: 60 }).some((o) => o.type === 'thithi')).toBe(false);
    const withThithi = getUpcomingOccasions({ people }, { today, days: 60, thithi: true });
    const t = withThithi.find((o) => o.type === 'thithi');
    expect(t).toMatchObject({ years: 1, lunarDate: 'Ashvayuja Shukla Dashami', personIds: ['g'] });
    expect(t.title).toContain('Thithi of Grandfather');
  });
});
