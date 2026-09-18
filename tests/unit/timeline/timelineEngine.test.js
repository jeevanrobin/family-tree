/**
 * Timeline Engine Unit Tests
 * 
 * Tests pure functions from familyTimelineEngine.js
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
  describe('valid date formats', () => {
    it('parses YYYY format', () => {
      const result = parseEventDate('1990');
      expect(result.year).toBe(1990);
      expect(result.month).toBeNull();
      expect(result.day).toBeNull();
      expect(result.isDated).toBe(true);
      expect(result.sortKey).toBe('1990-01-01');
    });

    it('parses YYYY-MM format', () => {
      const result = parseEventDate('1990-05');
      expect(result.year).toBe(1990);
      expect(result.month).toBe(5);
      expect(result.day).toBeNull();
      expect(result.sortKey).toBe('1990-05-01');
    });

    it('parses YYYY-MM-DD format', () => {
      const result = parseEventDate('1990-05-15');
      expect(result.year).toBe(1990);
      expect(result.month).toBe(5);
      expect(result.day).toBe(15);
      expect(result.sortKey).toBe('1990-05-15');
    });

    it('formats display year correctly', () => {
      const result = parseEventDate('1990');
      expect(result.displayYear).toBe('1990');
    });

    it('formats full date correctly', () => {
      const result = parseEventDate('1990-05-15');
      expect(result.formatted).toContain('1990');
    });
  });

  describe('invalid inputs', () => {
    it('returns unknown for null', () => {
      const result = parseEventDate(null);
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
      expect(result.displayYear).toBe('Unknown');
      expect(result.sortKey).toBe('9999-99-99');
    });

    it('returns unknown for undefined', () => {
      const result = parseEventDate(undefined);
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });

    it('returns unknown for empty string', () => {
      const result = parseEventDate('');
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });

    it('returns unknown for invalid date string', () => {
      const result = parseEventDate('not-a-date');
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });

    it('returns unknown for whitespace', () => {
      const result = parseEventDate('   ');
      expect(result.year).toBeNull();
      expect(result.isDated).toBe(false);
    });
  });

  describe('determinism', () => {
    it('returns same result for same input', () => {
      const result1 = parseEventDate('1985-03-20');
      const result2 = parseEventDate('1985-03-20');
      expect(result1).toEqual(result2);
    });
  });
});

describe('sortTimelineEvents', () => {
  const makeEvent = (id, date, title) => ({
    id,
    date,
    _parsedDate: parseEventDate(date),
    title: title || `Event ${id}`,
  });

  it('sorts events chronologically', () => {
    const events = [
      makeEvent(1, '1995'),
      makeEvent(2, '1985'),
      makeEvent(3, '1990'),
    ];

    const sorted = sortTimelineEvents(events);

    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(1);
  });

  it('places undated events after dated', () => {
    const events = [
      makeEvent(1, null),
      makeEvent(2, '1990'),
    ];

    const sorted = sortTimelineEvents(events);

    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });

  it('sorts by title for same date', () => {
    const events = [
      makeEvent(1, '1990', 'Zebra'),
      makeEvent(2, '1990', 'Alpha'),
    ];

    const sorted = sortTimelineEvents(events);

    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });

  it('returns empty array for null input', () => {
    expect(sortTimelineEvents(null)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(sortTimelineEvents([])).toEqual([]);
  });

  it('does not mutate original array', () => {
    const events = [makeEvent(1, '1990'), makeEvent(2, '1980')];
    const original = [...events];

    sortTimelineEvents(events);

    expect(events).toEqual(original);
  });
});

describe('deriveErasFromEvents', () => {
  const makeEvent = (date) => ({ date, _parsedDate: parseEventDate(date) });

  it('returns empty array for empty input', () => {
    expect(deriveErasFromEvents([])).toEqual([]);
  });

  it('returns eras for short span', () => {
    const events = [
      makeEvent('2010'),
      makeEvent('2015'),
    ];

    const eras = deriveErasFromEvents(events);

    expect(eras.length).toBeGreaterThanOrEqual(1);
    expect(eras[0].startYear).toBeDefined();
    expect(eras[0].endYear).toBeDefined();
  });

  it('returns multiple eras for longer spans', () => {
    const events = [
      makeEvent('1980'),
      makeEvent('2010'),
    ];

    const eras = deriveErasFromEvents(events);

    expect(eras.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 4 eras for long span (> 45 years)', () => {
    const events = [
      makeEvent('1950'),
      makeEvent('2020'),
    ];

    const eras = deriveErasFromEvents(events);

    expect(eras.length).toBe(4);
  });

  it('returns empty array for all invalid events', () => {
    const events = [
      makeEvent('invalid'),
      makeEvent(null),
    ];

    const eras = deriveErasFromEvents(events);

    expect(eras).toEqual([]);
  });

  it('calculates era bounds correctly', () => {
    const events = [
      makeEvent('1985'),
      makeEvent('2015'),
    ];

    const eras = deriveErasFromEvents(events);
    const firstEra = eras[0];

    expect(firstEra.startYear).toBeLessThanOrEqual(firstEra.endYear);
    expect(typeof firstEra.displayRange).toBe('string');
  });
});

describe('getEraForEvent', () => {
  const makeEra = (start, end, id) => ({
    startYear: start,
    endYear: end,
    id,
  });

  const makeEvent = (date) => ({
    date,
    _parsedDate: parseEventDate(date),
  });

  it('returns matching era for dated event', () => {
    const eras = [makeEra(1980, 2000, 'era-1')];
    const event = makeEvent('1990');

    const era = getEraForEvent(event, eras);

    expect(era.id).toBe('era-1');
  });

  it('returns null for undated event', () => {
    const eras = [makeEra(1980, 2000, 'era-1')];
    const event = makeEvent(null);

    const era = getEraForEvent(event, eras);

    expect(era).toBeNull();
  });

  it('returns first era if event before all eras', () => {
    const eras = [makeEra(1990, 2000, 'era-1')];
    const event = makeEvent('1980');

    const era = getEraForEvent(event, eras);

    expect(era.id).toBe('era-1');
  });

  it('returns last era if event after all eras', () => {
    const eras = [
      makeEra(1980, 1990, 'era-1'),
      makeEra(1990, 2000, 'era-2'),
    ];
    const event = makeEvent('2010');

    const era = getEraForEvent(event, eras);

    expect(era.id).toBe('era-2');
  });

  it('returns null for empty eras', () => {
    const event = makeEvent('1990');

    const era = getEraForEvent(event, []);

    expect(era).toBeNull();
  });
});

describe('filterTimelineEvents', () => {
  const makeEvent = (overrides) => ({
    id: 'event-1',
    type: 'birth',
    generation: 1,
    eraId: 'era-1',
    primaryPerson: { id: 'person-1' },
    _parsedDate: parseEventDate('1990'),
    ...overrides,
  });

  it('filters by eventType', () => {
    const events = [
      makeEvent({ type: 'birth' }),
      makeEvent({ id: 'event-2', type: 'wedding' }),
    ];

    const filtered = filterTimelineEvents(events, { category: 'wedding' });

    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe('wedding');
  });

  it('filters by generation', () => {
    const events = [
      makeEvent({ generation: 1 }),
      makeEvent({ id: 'event-2', generation: 2 }),
    ];

    const filtered = filterTimelineEvents(events, { generation: 2 });

    expect(filtered.length).toBe(1);
    expect(filtered[0].generation).toBe(2);
  });

  it('filters by category', () => {
    const events = [
      makeEvent({ type: 'birth' }),
      makeEvent({ id: 'event-2', type: 'wedding' }),
    ];

    const filtered = filterTimelineEvents(events, { category: 'wedding' });

    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe('wedding');
  });

  it('filters by category', () => {
    const events = [
      makeEvent({ type: 'birth' }),
      makeEvent({ id: 'event-2', type: 'wedding' }),
    ];

    const filtered = filterTimelineEvents(events, { category: 'wedding' });

    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe('wedding');
  });

  it('returns all events when no filters', () => {
    const events = [makeEvent({}), makeEvent({ id: 'event-2' })];

    const filtered = filterTimelineEvents(events, {});

    expect(filtered.length).toBe(2);
  });

  it('returns empty array for null input', () => {
    expect(filterTimelineEvents(null, {})).toEqual([]);
  });
});

describe('getAvailableTimelineFilters', () => {
  const makeEvent = (type, generation, displayName) => ({
    type,
    generation,
    primaryPerson: { id: `person-${displayName}`, displayName },
  });

  it('extracts unique categories', () => {
    const events = [
      makeEvent('birth', 1, 'Alice'),
      makeEvent('birth', 1, 'Bob'),
      makeEvent('wedding', 2, 'Carol'),
    ];

    const filters = getAvailableTimelineFilters(events);

    expect(filters.categories).toEqual(['birth', 'wedding']);
  });

  it('extracts unique generations', () => {
    const events = [
      makeEvent('birth', 1, 'Alice'),
      makeEvent('birth', 2, 'Bob'),
      makeEvent('wedding', 1, 'Carol'),
    ];

    const filters = getAvailableTimelineFilters(events);

    expect(filters.generations).toContain(1);
    expect(filters.generations).toContain(2);
  });

  it('extracts unique people', () => {
    const events = [
      makeEvent('birth', 1, 'Alice'),
      makeEvent('birth', 1, 'Bob'),
    ];

    const filters = getAvailableTimelineFilters(events);

    expect(filters.people.length).toBe(2);
  });

  it('returns empty arrays for empty input', () => {
    const filters = getAvailableTimelineFilters([]);

    expect(filters.categories).toEqual([]);
    expect(filters.generations).toEqual([]);
    expect(filters.people).toEqual([]);
  });
});
