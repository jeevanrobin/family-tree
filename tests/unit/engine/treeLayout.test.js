/**
 * Tree Layout Engine Unit Tests
 * 
 * Tests pure functions from treeLayout.js that handle:
 * - Date parsing and validation
 * - Sibling cohort sorting
 * - Blood child identification
 */

import { describe, it, expect } from 'vitest';
import {
  parseDateOfBirth,
  getBloodChildId,
  sortSiblingCohort,
  NODE_WIDTH,
  NODE_HEIGHT,
  SPOUSE_GAP,
  SIBLING_GAP,
} from '../../../src/family-tree/engine/treeLayout.js';

describe('Tree Layout Constants', () => {
  it('exports NODE_WIDTH', () => {
    expect(NODE_WIDTH).toBe(230);
  });

  it('exports NODE_HEIGHT', () => {
    expect(NODE_HEIGHT).toBe(160);
  });

  it('exports SPOUSE_GAP', () => {
    expect(SPOUSE_GAP).toBe(20);
  });

  it('exports SIBLING_GAP', () => {
    expect(SIBLING_GAP).toBe(72);
  });
});

describe('parseDateOfBirth', () => {
  describe('valid dates', () => {
    it('parses ISO 8601 date', () => {
      const timestamp = parseDateOfBirth('1990-05-15');
      expect(timestamp).toBe(642729600000);
    });

    it('parses date with time component', () => {
      const timestamp = parseDateOfBirth('1985-03-20T00:00:00.000Z');
      expect(typeof timestamp).toBe('number');
      expect(Number.isNaN(timestamp)).toBe(false);
    });

    it('parses partial date (year)', () => {
      const timestamp = parseDateOfBirth('2000-01');
      expect(timestamp).toBeDefined();
      expect(typeof timestamp).toBe('number');
    });

    it('parses American date format', () => {
      const timestamp = parseDateOfBirth('12/25/1990');
      expect(typeof timestamp).toBe('number');
    });

    it('returns number for valid leap year date', () => {
      const timestamp = parseDateOfBirth('2000-02-29');
      expect(typeof timestamp).toBe('number');
      expect(Number.isNaN(timestamp)).toBe(false);
    });
  });

  describe('invalid dates', () => {
    it('returns null for null input', () => {
      expect(parseDateOfBirth(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseDateOfBirth(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseDateOfBirth('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(parseDateOfBirth('   ')).toBeNull();
    });

    it('returns null for number input', () => {
      expect(parseDateOfBirth(12345)).toBeNull();
    });

    it('returns null for object input', () => {
      expect(parseDateOfBirth({})).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(parseDateOfBirth('not-a-date')).toBeNull();
    });

    it('returns null for malformed date', () => {
      expect(parseDateOfBirth('1990-13-45')).toBeNull();
    });

    it('returns number for invalid leap year (Feb 29 on non-leap year)', () => {
      const timestamp = parseDateOfBirth('2001-02-29');
      expect(typeof timestamp).toBe('number');
    });
  });

  describe('determinism', () => {
    it('returns same result for same input', () => {
      const input = '1980-07-04';
      const result1 = parseDateOfBirth(input);
      const result2 = parseDateOfBirth(input);
      expect(result1).toBe(result2);
    });
  });
});

describe('getBloodChildId', () => {
  const makeUnit = (primary, spouse = null, childrenIds = null) => ({
    primary: { id: primary },
    spouse: spouse ? { id: spouse } : null,
  });

  const makeParentUnit = (...childrenIds) => ({
    childrenIds: childrenIds.map(String),
  });

  describe('standard cases', () => {
    it('returns primary.id when primary is blood child', () => {
      const childUnit = makeUnit('child-1');
      const parentUnit = makeParentUnit('child-1', 'child-2');

      const result = getBloodChildId(childUnit, parentUnit);

      expect(result).toBe('child-1');
    });

    it('returns spouse.id when spouse is blood child', () => {
      const childUnit = makeUnit('spouse-in-law', 'blood-child');
      const parentUnit = makeParentUnit('blood-child');

      const result = getBloodChildId(childUnit, parentUnit);

      expect(result).toBe('blood-child');
    });

    it('returns primary.id when both are children', () => {
      const childUnit = makeUnit('child-a', 'child-b');
      const parentUnit = makeParentUnit('child-a', 'child-b');

      const result = getBloodChildId(childUnit, parentUnit);

      expect(result).toBe('child-a');
    });
  });

  describe('edge cases', () => {
    it('returns primary.id when parentUnit is null', () => {
      const childUnit = makeUnit('orphan');

      const result = getBloodChildId(childUnit, null);

      expect(result).toBe('orphan');
    });

    it('returns primary.id when parentUnit.childrenIds is undefined', () => {
      const childUnit = makeUnit('child');
      const parentUnit = {};

      const result = getBloodChildId(childUnit, parentUnit);

      expect(result).toBe('child');
    });

    it('returns primary.id when child not in parent children list', () => {
      const childUnit = makeUnit('adopted', 'also-adopted');
      const parentUnit = makeParentUnit('other-child');

      const result = getBloodChildId(childUnit, parentUnit);

      expect(result).toBe('adopted');
    });

    it('handles string-numeric IDs', () => {
      const childUnit = makeUnit('123', '456');
      const parentUnit = makeParentUnit('123');

      const result = getBloodChildId(childUnit, parentUnit);

      expect(result).toBe('123');
    });
  });
});

describe('sortSiblingCohort', () => {
  const makePerson = (id, dob) => ({
    id,
    dateOfBirth: dob,
  });

  const makeUnit = (primary, spouse = null) => ({
    primary: { id: primary },
    spouse: spouse ? { id: spouse } : null,
  });

  const makePersonMap = (...people) => {
    const map = new Map();
    people.forEach((p) => map.set(String(p.id), p));
    return map;
  };

  describe('empty and single cases', () => {
    it('returns empty array for null input', () => {
      expect(sortSiblingCohort(null, 'cohort-1', {}, new Map(), null)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      expect(sortSiblingCohort([], 'cohort-1', {}, new Map(), null)).toEqual([]);
    });

    it('returns single unit unchanged', () => {
      const units = [makeUnit('only-child')];
      const personMap = makePersonMap(makePerson('only-child', '2000-01-01'));

      const result = sortSiblingCohort(units, 'cohort-1', {}, personMap, null);

      expect(result).toEqual(units);
    });
  });

  describe('DOB-based ordering', () => {
    it('sorts oldest to youngest (left to right)', () => {
      const units = [
        makeUnit('youngest'),
        makeUnit('oldest'),
        makeUnit('middle'),
      ];
      const personMap = makePersonMap(
        makePerson('oldest', '1980-01-01'),
        makePerson('middle', '1985-06-15'),
        makePerson('youngest', '1990-12-31')
      );

      const result = sortSiblingCohort(units, 'family-children', {}, personMap, null);

      expect(result[0].primary.id).toBe('oldest');
      expect(result[1].primary.id).toBe('middle');
      expect(result[2].primary.id).toBe('youngest');
    });

    it('handles missing DOB (unknown placed after known)', () => {
      const units = [
        makeUnit('unknown'),
        makeUnit('known'),
      ];
      const personMap = makePersonMap(
        makePerson('known', '1985-01-01'),
        makePerson('unknown', null)
      );

      const result = sortSiblingCohort(units, 'cohort', {}, personMap, null);

      expect(result[0].primary.id).toBe('known');
      expect(result[1].primary.id).toBe('unknown');
    });

    it('preserves original order for ties (same DOB)', () => {
      const units = [
        makeUnit('first'),
        makeUnit('second'),
      ];
      const personMap = makePersonMap(
        makePerson('first', '1985-01-01'),
        makePerson('second', '1985-01-01')
      );

      const result = sortSiblingCohort(units, 'cohort', {}, personMap, null);

      expect(result[0].primary.id).toBe('first');
      expect(result[1].primary.id).toBe('second');
    });

    it('preserves original order for all unknown DOB', () => {
      const units = [
        makeUnit('a'),
        makeUnit('b'),
        makeUnit('c'),
      ];
      const personMap = makePersonMap(
        makePerson('a', null),
        makePerson('b', null),
        makePerson('c', null)
      );

      const result = sortSiblingCohort(units, 'cohort', {}, personMap, null);

      expect(result[0].primary.id).toBe('a');
      expect(result[1].primary.id).toBe('b');
      expect(result[2].primary.id).toBe('c');
    });
  });

  describe('manual order override', () => {
    it('honors manual override order', () => {
      const units = [
        makeUnit('a'),
        makeUnit('b'),
        makeUnit('c'),
      ];
      const personMap = makePersonMap(
        makePerson('a', '2020-01-01'),
        makePerson('b', '2010-01-01'),
        makePerson('c', '2000-01-01')
      );
      const customOrders = { 'family-1': ['c', 'a', 'b'] };

      const result = sortSiblingCohort(units, 'family-1', customOrders, personMap, null);

      expect(result.map((u) => u.primary.id)).toEqual(['c', 'a', 'b']);
    });

    it('unlisted items sorted by DOB relative to listed items', () => {
      const units = [
        makeUnit('new-older'),
        makeUnit('ordered-1'),
        makeUnit('new-middle'),
        makeUnit('ordered-2'),
      ];
      const personMap = makePersonMap(
        makePerson('ordered-1', '1980-01-01'),
        makePerson('ordered-2', '1985-01-01'),
        makePerson('new-older', '1979-01-01'),
        makePerson('new-middle', '1982-01-01')
      );
      const customOrders = { 'family-1': ['ordered-1', 'ordered-2'] };

      const result = sortSiblingCohort(units, 'family-1', customOrders, personMap, null);

      expect(result[0].primary.id).toBe('new-older');
      expect(result[1].primary.id).toBe('ordered-1');
      expect(result[2].primary.id).toBe('new-middle');
      expect(result[3].primary.id).toBe('ordered-2');
    });

    it('uses parentUnit.id as fallback for cohortKey lookup', () => {
      const units = [
        makeUnit('x'),
        makeUnit('y'),
      ];
      const personMap = makePersonMap(
        makePerson('x', '1980-01-01'),
        makePerson('y', '1990-01-01')
      );
      const parentUnit = {
        id: 'parent-unit-1',
        childrenIds: ['x', 'y'],
      };
      const customOrders = { 'parent-unit-1': ['y', 'x'] };

      const result = sortSiblingCohort(units, 'different-cohort', customOrders, personMap, parentUnit);

      expect(result[0].primary.id).toBe('y');
      expect(result[1].primary.id).toBe('x');
    });
  });

  describe('couples stay together', () => {
    it('couple moves together in DOB-based ordering', () => {
      const units = [
        makeUnit('a'),
        makeUnit('b', 'spouse-b'),
      ];
      const personMap = makePersonMap(
        makePerson('a', '1985-01-01'),
        makePerson('b', '1980-01-01'),
        makePerson('spouse-b', '1980-01-01')
      );

      const result = sortSiblingCohort(units, 'family-1', {}, personMap, null);

      expect(result[0].primary.id).toBe('b');
      expect(result[0].spouse.id).toBe('spouse-b');
      expect(result[1].primary.id).toBe('a');
    });

    it('couple with unknown DOB placed after known DOB', () => {
      const units = [
        makeUnit('with-dob', 'spouse-unknown'),
        makeUnit('without-dob'),
      ];
      const personMap = makePersonMap(
        makePerson('with-dob', '1985-01-01'),
        makePerson('spouse-unknown', null),
        makePerson('without-dob', null)
      );

      const result = sortSiblingCohort(units, 'family-1', {}, personMap, null);

      expect(result[0].primary.id).toBe('with-dob');
      expect(result[1].primary.id).toBe('without-dob');
    });
  });

  describe('determinism', () => {
    it('produces same result for same inputs', () => {
      const units = [
        makeUnit('a'),
        makeUnit('b'),
        makeUnit('c'),
      ];
      const personMap = makePersonMap(
        makePerson('a', '1980-01-01'),
        makePerson('b', '1985-01-01'),
        makePerson('c', '1990-01-01')
      );

      const result1 = sortSiblingCohort(units, 'fam', {}, personMap, null);
      const result2 = sortSiblingCohort(units, 'fam', {}, personMap, null);

      expect(result1).toEqual(result2);
    });
  });
});
