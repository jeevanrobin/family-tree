/**
 * Timeline Engine Tests
 * 
 * Tests familyTimelineEngine pure functions against real production API.
 */

import { describe, it, expect } from 'vitest';
import {
  parseEventDate,
  sortTimelineEvents,
  deriveErasFromEvents,
  getEraForEvent,
  filterTimelineEvents,
  getAvailableTimelineFilters,
} from '../../../src/family-tree/timeline/familyTimelineEngine.js';

describe('parseEventDate', () => {
  describe('valid dates', () => {
    it('parses YYYY format', () => {
      const result = parseEventDate('1990');
      expect(result.year).toBe(1990);
      expect(result.month).toBeNull();
      expect(result.day).toBeNull();
      expect(result.formatted).toBe('1990');
      expect(result.isDated).toBe(true);
    });

    it('parses YYYY-MM-DD format', () => {
      const result = parseEventDate('1990-06-15');
      expect(result.year).toBe(1990);
      expect(result.month).toBe(6);
      expect(result.day).toBe(15);
      expect(result.formatted).toContain('Jun');
      expect(result.formatted).toContain('15');
      expect(result.formatted).toContain('1990');
      expect(result.isDated).toBe(true);
    });

    it('parses YYYY-MM format', () => {
      const result = parseEventDate('1990-06');
      expect(result.year).toBe(1990);
      expect(result.month).toBe(6);
      expect(result.day).toBeNull();
      expect(result.formatted).toContain('Jun');
      expect(result.formatted).toContain('1990');
      expect(result.isDated).toBe(true);
    });

    it('handles month 00 gracefully', () => {
      const result = parseEventDate('1990-00-15');
      expect(result.year).toBe(1990);
      expect(result.month).toBeNull();
      expect(result.isDated).toBe(true);
    });

    it('handles day 00 gracefully', () => {
      const result = parseEventDate('1990-06-00');
      expect(result.year).toBe(1990);
      expect(result.month).toBe(6);
      expect(result.day).toBeNull();
      expect(result.isDated).toBe(true);
    });
  });

  describe('invalid dates', () => {
    it('returns default for null input', () => {
      const result = parseEventDate(null);
      expect(result.year).toBeNull();
      expect(result.formatted).toBe('Date unknown');
      expect(result.isDated).toBe(false);
      expect(result.sortKey).toBe('9999-99-99');
    });

    it('returns default for undefined input', () => {
      const result = parseEventDate(undefined);
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });

    it('returns default for empty string', () => {
      const result = parseEventDate('');
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });

    it('returns default for whitespace-only string', () => {
      const result = parseEventDate('   ');
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });

    it('returns default for non-date string', () => {
      const result = parseEventDate('not-a-date');
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });
  });

  describe('sortKey', () => {
    it('generates correct sortKey for YYYY', () => {
      expect(parseEventDate('1990').sortKey).toBe('1990-01-01');
      expect(parseEventDate('2000').sortKey).toBe('2000-01-01');
    });

    it('generates correct sortKey for YYYY-MM-DD', () => {
      expect(parseEventDate('1990-06-15').sortKey).toBe('1990-06-15');
      expect(parseEventDate('2020-12-31').sortKey).toBe('2020-12-31');
    });

    it('pads month and day in sortKey', () => {
      expect(parseEventDate('1990-1-5').sortKey).toBe('1990-01-05');
    });
  });

  describe('displayYear', () => {
    it('extracts year for display', () => {
      expect(parseEventDate('1990').displayYear).toBe('1990');
      expect(parseEventDate('1990-06-15').displayYear).toBe('1990');
    });

    it('returns Unknown for undated', () => {
      expect(parseEventDate(null).displayYear).toBe('Unknown');
      expect(parseEventDate('').displayYear).toBe('Unknown');
    });
  });
});

describe('sortTimelineEvents', () => {
  it('returns empty array for non-array input', () => {
    expect(sortTimelineEvents(null)).toEqual([]);
    expect(sortTimelineEvents(undefined)).toEqual([]);
    expect(sortTimelineEvents({})).toEqual([]);
  });

  it('sorts dated events before undated events', () => {
    const events = [
      { id: 'e1', date: null, title: 'Undated' },
      { id: 'e2', date: '1990-06-15', title: 'Dated' },
    ];
    const sorted = sortTimelineEvents(events);
    
    expect(sorted[0].id).toBe('e2');
    expect(sorted[1].id).toBe('e1');
  });

  it('sorts by date chronologically', () => {
    const events = [
      { id: 'e3', date: '2000-01-01', title: 'C' },
      { id: 'e1', date: '1990-01-01', title: 'A' },
      { id: 'e2', date: '1995-01-01', title: 'B' },
    ];
    const sorted = sortTimelineEvents(events);
    
    expect(sorted[0].id).toBe('e1');
    expect(sorted[1].id).toBe('e2');
    expect(sorted[2].id).toBe('e3');
  });

  it('sorts by title for same date', () => {
    const events = [
      { id: 'e2', date: '1990-01-01', title: 'Zebra' },
      { id: 'e1', date: '1990-01-01', title: 'Apple' },
    ];
    const sorted = sortTimelineEvents(events);
    
    expect(sorted[0].id).toBe('e1');
    expect(sorted[1].id).toBe('e2');
  });

  it('sorts by ID for same date and title', () => {
    const events = [
      { id: 'e2', date: '1990-01-01', title: 'Event' },
      { id: 'e1', date: '1990-01-01', title: 'Event' },
    ];
    const sorted = sortTimelineEvents(events);
    
    expect(sorted[0].id).toBe('e1');
    expect(sorted[1].id).toBe('e2');
  });

  it('does not mutate original array', () => {
    const events = [
      { id: 'e2', date: '2000-01-01' },
      { id: 'e1', date: '1990-01-01' },
    ];
    const sorted = sortTimelineEvents(events);
    
    expect(events[0].id).toBe('e2');
    expect(sorted[0].id).toBe('e1');
  });

  it('uses cached _parsedDate if available', () => {
    const events = [
      { id: 'e1', date: '1990-01-01', _parsedDate: parseEventDate('1990-01-01') },
    ];
    const sorted = sortTimelineEvents(events);
    expect(sorted[0].id).toBe('e1');
  });
});

describe('deriveErasFromEvents', () => {
  it('returns empty array for empty input', () => {
    expect(deriveErasFromEvents([])).toEqual([]);
    expect(deriveErasFromEvents(null)).toEqual([]);
    expect(deriveErasFromEvents({})).toEqual([]);
  });

  it('returns empty array when no events have dates', () => {
    const events = [
      { date: null },
      { date: 'invalid' },
    ];
    expect(deriveErasFromEvents(events)).toEqual([]);
  });

  it('creates single era for short timespan (<20 years)', () => {
    const events = [
      { date: '2010-01-01' },
      { date: '2015-01-01' },
    ];
    const eras = deriveErasFromEvents(events);
    
    expect(eras.length).toBe(1);
    expect(eras[0].name).toBe('FAMILY JOURNEY');
    expect(eras[0].startYear).toBe(2010);
    expect(eras[0].endYear).toBeGreaterThanOrEqual(2015);
  });

  it('creates two eras for medium timespan (20-45 years)', () => {
    const events = [
      { date: '1990-01-01' },
      { date: '2010-01-01' },
    ];
    const eras = deriveErasFromEvents(events);
    
    expect(eras.length).toBe(2);
    expect(eras[0].name).toBe('EARLY YEARS');
    expect(eras[1].name).toBe('CONTEMPORARY GENERATION');
  });

  it('creates four eras for long timespan (>45 years)', () => {
    const events = [
      { date: '1900-01-01' },
      { date: '2000-01-01' },
    ];
    const eras = deriveErasFromEvents(events);
    
    expect(eras.length).toBe(4);
    expect(eras[0].name).toBe('THE FOUNDATIONS');
    expect(eras[1].name).toBe('THE NEXT GENERATION');
    expect(eras[2].name).toBe('THE MODERN FAMILY');
    expect(eras[3].name).toBe('TODAY & BEYOND');
  });

  it('includes displayRange for each era', () => {
    const events = [
      { date: '2010-01-01' },
      { date: '2015-01-01' },
    ];
    const eras = deriveErasFromEvents(events);
    
    expect(eras[0].displayRange).toBeDefined();
    expect(eras[0].displayRange).toContain('2010');
  });

  it('uses "Present" for current year in displayRange', () => {
    const currentYear = new Date().getFullYear();
    const events = [
      { date: '2020-01-01' },
      { date: `${currentYear}-01-01` },
    ];
    const eras = deriveErasFromEvents(events);
    
    const era = eras.find((e) => e.endYear >= currentYear);
    expect(era.displayRange).toContain('Present');
  });
});

describe('getEraForEvent', () => {
  it('returns null for undated event', () => {
    const event = { date: null };
    const eras = [{ startYear: 1990, endYear: 2000 }];
    
    expect(getEraForEvent(event, eras)).toBeNull();
  });

  it('returns matching era for event year', () => {
    const event = { date: '1995-01-01' };
    const eras = [
      { id: 'era1', startYear: 1990, endYear: 2000 },
      { id: 'era2', startYear: 2001, endYear: 2010 },
    ];
    
    const result = getEraForEvent(event, eras);
    expect(result.id).toBe('era1');
  });

  it('returns first era for year before all eras', () => {
    const event = { date: '1980-01-01' };
    const eras = [
      { id: 'era1', startYear: 1990, endYear: 2000 },
    ];
    
    const result = getEraForEvent(event, eras);
    expect(result.id).toBe('era1');
  });

  it('returns last era for year after all eras', () => {
    const event = { date: '2010-01-01' };
    const eras = [
      { id: 'era1', startYear: 1990, endYear: 2000 },
    ];
    
    const result = getEraForEvent(event, eras);
    expect(result.id).toBe('era1');
  });

  it('uses _parsedDate if available', () => {
    const event = { _parsedDate: parseEventDate('1995-01-01') };
    const eras = [
      { id: 'era1', startYear: 1990, endYear: 2000 },
    ];
    
    const result = getEraForEvent(event, eras);
    expect(result).toBeDefined();
  });
});

describe('filterTimelineEvents', () => {
  it('returns empty array for non-array input', () => {
    expect(filterTimelineEvents(null)).toEqual([]);
    expect(filterTimelineEvents(undefined)).toEqual([]);
    expect(filterTimelineEvents({})).toEqual([]);
  });

  it('returns all events when no filters specified', () => {
    const events = [
      { id: 'e1', _parsedDate: { isDated: true } },
      { id: 'e2', _parsedDate: { isDated: false } },
    ];
    
    expect(filterTimelineEvents(events)).toEqual(events);
  });

  it('filters by eraId', () => {
    const events = [
      { id: 'e1', _eraId: 'era1', _parsedDate: { isDated: true } },
      { id: 'e2', _eraId: 'era2', _parsedDate: { isDated: true } },
    ];
    
    const filtered = filterTimelineEvents(events, { eraId: 'era1' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('e1');
  });

  it('filters by undated eraId', () => {
    const events = [
      { id: 'e1', _parsedDate: { isDated: true } },
      { id: 'e2', _parsedDate: { isDated: false } },
    ];
    
    const filtered = filterTimelineEvents(events, { eraId: 'undated' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('e2');
  });

  it('filters by generation', () => {
    const events = [
      { id: 'e1', generation: 2 },
      { id: 'e2', generation: 3 },
    ];
    
    const filtered = filterTimelineEvents(events, { generation: 2 });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('e1');
  });

  it('filters by personId', () => {
    const events = [
      { id: 'e1', personId: 'p1' },
      { id: 'e2', personId: 'p2' },
      { id: 'e3', personId: 'p1', relatedPersonIds: ['p3'] },
    ];
    
    const filtered = filterTimelineEvents(events, { personId: 'p1' });
    expect(filtered.length).toBe(2);
  });

  it('filters by category', () => {
    const events = [
      { id: 'e1', type: 'birth' },
      { id: 'e2', type: 'marriage' },
    ];
    
    const filtered = filterTimelineEvents(events, { category: 'birth' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('e1');
  });

  it('applies multiple filters', () => {
    const events = [
      { id: 'e1', generation: 2, type: 'birth', _parsedDate: { isDated: true } },
      { id: 'e2', generation: 2, type: 'marriage', _parsedDate: { isDated: true } },
      { id: 'e3', generation: 3, type: 'birth', _parsedDate: { isDated: true } },
    ];
    
    const filtered = filterTimelineEvents(events, { generation: 2, category: 'birth' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('e1');
  });
});

describe('getAvailableTimelineFilters', () => {
  it('returns empty arrays for empty input', () => {
    const result = getAvailableTimelineFilters([]);
    expect(result.categories).toEqual([]);
    expect(result.generations).toEqual([]);
    expect(result.people).toEqual([]);
  });

  it('extracts unique categories', () => {
    const events = [
      { type: 'birth' },
      { type: 'marriage' },
      { type: 'birth' },
    ];
    
    const result = getAvailableTimelineFilters(events);
    expect(result.categories).toEqual(['birth', 'marriage']);
  });

  it('extracts unique generations', () => {
    const events = [
      { generation: 2 },
      { generation: 3 },
      { generation: 2 },
    ];
    
    const result = getAvailableTimelineFilters(events);
    expect(result.generations).toEqual([2, 3]);
  });

  it('extracts unique people', () => {
    const events = [
      { primaryPerson: { id: 'p1', displayName: 'Alice' } },
      { primaryPerson: { id: 'p2', displayName: 'Bob' } },
    ];
    
    const result = getAvailableTimelineFilters(events);
    expect(result.people.length).toBe(2);
    expect(result.people[0].displayName).toBe('Alice');
    expect(result.people[1].displayName).toBe('Bob');
  });

  it('includes related persons', () => {
    const events = [
      {
        primaryPerson: { id: 'p1', displayName: 'Alice' },
        relatedPersons: [{ id: 'p2', displayName: 'Bob' }],
      },
    ];
    
    const result = getAvailableTimelineFilters(events);
    expect(result.people.length).toBe(2);
  });

  it('sorts categories alphabetically', () => {
    const events = [
      { type: 'zeta' },
      { type: 'alpha' },
    ];
    
    const result = getAvailableTimelineFilters(events);
    expect(result.categories[0]).toBe('alpha');
    expect(result.categories[1]).toBe('zeta');
  });

  it('sorts generations numerically', () => {
    const events = [
      { generation: 3 },
      { generation: 1 },
    ];
    
    const result = getAvailableTimelineFilters(events);
    expect(result.generations[0]).toBe(1);
    expect(result.generations[1]).toBe(3);
  });

  it('sorts people by displayName', () => {
    const events = [
      { primaryPerson: { id: 'p2', displayName: 'Zoe' } },
      { primaryPerson: { id: 'p1', displayName: 'Alice' } },
    ];
    
    const result = getAvailableTimelineFilters(events);
    expect(result.people[0].displayName).toBe('Alice');
    expect(result.people[1].displayName).toBe('Zoe');
  });
});
