/**
 * Date Helpers Tests
 * Tests deterministic date parsing (existing behavior)
 * and Jev AI fallback integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseDateInput,
  formatStoredDate,
  validateBirthDeathDates,
  getDaysInMonth,
  isLeapYear,
  extractDateWithJev,
  shouldUseJevFallback,
  configureJevExtraction,
  getJevStatus,
} from '../../src/family-tree/utils/dateHelpers.js';

describe('dateHelpers', () => {
  describe('parseDateInput - deterministic parser', () => {
    describe('year-only format (YYYY)', () => {
      it('parses valid 4-digit year', () => {
        const result = parseDateInput('1920');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1920);
        expect(result.month).toBeNull();
        expect(result.day).toBeNull();
        expect(result.precision).toBe('year');
        expect(result.value).toBe('1920');
        expect(result.source).toBe('deterministic');
      });

      it('rejects year below 1000', () => {
        const result = parseDateInput('0999');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('1000');
      });

      it('rejects year above 2200', () => {
        const result = parseDateInput('2500');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('2200');
      });

      it('accepts year 1000 (boundary)', () => {
        const result = parseDateInput('1000');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1000);
      });

      it('accepts year 2200 (boundary)', () => {
        const result = parseDateInput('2200');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(2200);
      });
    });

    describe('month-year format (YYYY-MM)', () => {
      it('parses valid YYYY-MM', () => {
        const result = parseDateInput('1985-03');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
        expect(result.month).toBe(3);
        expect(result.day).toBeNull();
        expect(result.precision).toBe('month');
        expect(result.value).toBe('1985-03');
      });

      it('rejects invalid month (0)', () => {
        const result = parseDateInput('1985-00');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('month');
      });

      it('rejects invalid month (13)', () => {
        const result = parseDateInput('1985-13');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('month');
      });

      it('pads single-digit month', () => {
        const result = parseDateInput('1985-3');
        expect(result.isValid).toBe(true);
        expect(result.month).toBe(3);
        expect(result.value).toBe('1985-03');
      });
    });

    describe('full date format (YYYY-MM-DD)', () => {
      it('parses valid YYYY-MM-DD', () => {
        const result = parseDateInput('1985-03-15');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
        expect(result.month).toBe(3);
        expect(result.day).toBe(15);
        expect(result.precision).toBe('day');
        expect(result.value).toBe('1985-03-15');
      });

      it('rejects invalid day for month', () => {
        const result = parseDateInput('1985-02-30');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('day');
      });

      it('handles leap year February 29', () => {
        const result = parseDateInput('2020-02-29');
        expect(result.isValid).toBe(true);
        expect(result.day).toBe(29);
      });

      it('rejects February 29 in non-leap year', () => {
        const result = parseDateInput('2019-02-29');
        expect(result.isValid).toBe(false);
      });

      it('pads single-digit day and month', () => {
        const result = parseDateInput('1985-3-5');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe('1985-03-05');
      });
    });

    describe('day-month-year format (DD-MM-YYYY)', () => {
      it('parses DD-MM-YYYY', () => {
        const result = parseDateInput('15-03-1985');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
        expect(result.month).toBe(3);
        expect(result.day).toBe(15);
        expect(result.precision).toBe('day');
      });

      it('parses DD/MM/YYYY', () => {
        const result = parseDateInput('15/03/1985');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
      });

      it('parses DD.MM.YYYY', () => {
        const result = parseDateInput('15.03.1985');
        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
      });
    });

    describe('empty and invalid inputs', () => {
      it('returns isEmpty for null', () => {
        const result = parseDateInput(null);
        expect(result.isValid).toBe(true);
        expect(result.isEmpty).toBe(true);
      });

      it('returns isEmpty for empty string', () => {
        const result = parseDateInput('');
        expect(result.isValid).toBe(true);
        expect(result.isEmpty).toBe(true);
      });

      it('returns isEmpty for whitespace', () => {
        const result = parseDateInput('   ');
        expect(result.isValid).toBe(true);
        expect(result.isEmpty).toBe(true);
      });

      it('returns error for invalid format', () => {
        const result = parseDateInput('not-a-date');
        expect(result.isValid).toBe(false);
      });

      it('returns error for natural language without AI fallback', () => {
        const result = parseDateInput('March 1985');
        expect(result.isValid).toBe(false);
      });

      it('returns error for approximate date without AI fallback', () => {
        const result = parseDateInput('around 1920');
        expect(result.isValid).toBe(false);
      });
    });

    describe('aiFallback option', () => {
      it('does not call AI for valid deterministic parse', () => {
        const result = parseDateInput('1920', { aiFallback: true });
        expect(result.isValid).toBe(true);
        expect(result.source).toBe('deterministic');
        expect(result.aiFallbackRecommended).toBeUndefined();
      });

      it('marks aiFallbackRecommended for invalid parse', () => {
        const result = parseDateInput('March 1985', { aiFallback: true });
        expect(result.aiFallbackRecommended).toBe(true);
      });
    });
  });

  describe('formatStoredDate', () => {
    it('formats YYYY-MM-DD', () => {
      expect(formatStoredDate('1985-03-15')).toBe('1985-03-15');
    });

    it('formats YYYY-MM', () => {
      expect(formatStoredDate('1985-03')).toBe('1985-03');
    });

    it('formats YYYY', () => {
      expect(formatStoredDate('1985')).toBe('1985');
    });

    it('returns empty for null', () => {
      expect(formatStoredDate(null)).toBe('');
    });

    it('returns input for invalid date', () => {
      expect(formatStoredDate('invalid')).toBe('invalid');
    });
  });

  describe('validateBirthDeathDates', () => {
    it('passes valid dates', () => {
      const result = validateBirthDeathDates('1920-01-01', '1990-12-31');
      expect(result.valid).toBe(true);
    });

    it('rejects birth after death (different years)', () => {
      const result = validateBirthDeathDates('1990', '1920');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('after');
    });

    it('rejects birth after death (same year, different month)', () => {
      const result = validateBirthDeathDates('1990-06', '1990-03');
      expect(result.valid).toBe(false);
    });

    it('rejects birth after death (same year and month)', () => {
      const result = validateBirthDeathDates('1990-03-15', '1990-03-10');
      expect(result.valid).toBe(false);
    });

    it('allows partial dates', () => {
      const result = validateBirthDeathDates('1920', '1990');
      expect(result.valid).toBe(true);
    });
  });

  describe('calendar validation', () => {
    describe('getDaysInMonth', () => {
      it('returns 31 for January', () => {
        expect(getDaysInMonth(2020, 1)).toBe(31);
      });

      it('returns 28 for February (non-leap year)', () => {
        expect(getDaysInMonth(2019, 2)).toBe(28);
      });

      it('returns 29 for February (leap year)', () => {
        expect(getDaysInMonth(2020, 2)).toBe(29);
      });

      it('returns 30 for April', () => {
        expect(getDaysInMonth(2020, 4)).toBe(30);
      });
    });

    describe('isLeapYear', () => {
      it('identifies leap years', () => {
        expect(isLeapYear(2020)).toBe(true);
        expect(isLeapYear(2000)).toBe(true);
      });

      it('identifies non-leap years', () => {
        expect(isLeapYear(2019)).toBe(false);
        expect(isLeapYear(1900)).toBe(false);
      });
    });
  });
});
