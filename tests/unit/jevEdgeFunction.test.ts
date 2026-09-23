/**
 * Jev Edge Function Tests
 * Tests server-side date extraction logic
 */

import { describe, it, expect } from 'vitest';

describe('Jev Edge Function Logic', () => {
  describe('Calendar Validation', () => {
    function getDaysInMonth(year: number, month: number): number {
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (month === 2) return isLeapYear ? 29 : 28;
      if ([4, 6, 9, 11].includes(month)) return 30;
      return 31;
    }

    function validateDateComponents(year: number, month: number | null, day: number | null) {
      if (year < 1000 || year > 2200) {
        return { valid: false, error: 'Year must be between 1000 and 2200' };
      }

      if (month !== null) {
        if (month < 1 || month > 12) {
          return { valid: false, error: 'Invalid month (must be 1-12)' };
        }

        if (day !== null) {
          const maxDays = getDaysInMonth(year, month);
          if (day < 1 || day > maxDays) {
            return { valid: false, error: `Invalid day for month ${month} in year ${year}` };
          }
        }
      }

      return { valid: true };
    }

    it('validates normal dates', () => {
      expect(validateDateComponents(2020, 3, 15)).toEqual({ valid: true });
      expect(validateDateComponents(1920, null, null)).toEqual({ valid: true });
      expect(validateDateComponents(1985, 6, null)).toEqual({ valid: true });
    });

    it('rejects year below range', () => {
      const result = validateDateComponents(999, 1, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Year');
    });

    it('rejects year above range', () => {
      const result = validateDateComponents(2201, 1, 1);
      expect(result.valid).toBe(false);
    });

    it('rejects invalid month', () => {
      const result = validateDateComponents(2020, 13, 1);
      expect(result.valid).toBe(false);
    });

    it('rejects invalid day for month', () => {
      const result = validateDateComponents(2019, 2, 30);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid day');
    });

    it('accepts leap year Feb 29', () => {
      expect(validateDateComponents(2020, 2, 29)).toEqual({ valid: true });
    });

    it('rejects non-leap year Feb 29', () => {
      const result = validateDateComponents(2019, 2, 29);
      expect(result.valid).toBe(false);
    });

    it('handles month 00 gracefully', () => {
      const result = validateDateComponents(2020, 0, 15);
      expect(result.valid).toBe(false);
    });

    it('handles day 00 gracefully', () => {
      const result = validateDateComponents(2020, 3, 0);
      expect(result.valid).toBe(false);
    });
  });

  describe('Precision Preservation', () => {
    function assemblePrecision(precision: string, month: number | null, day: number | null, season: string | null) {
      if (season) return 'season';
      if (precision === 'year_only') return 'year';
      if (month) return day ? 'day' : 'month';
      return 'year';
    }

    it('preserves year-only precision', () => {
      expect(assemblePrecision('year_only', null, null, null)).toBe('year');
    });

    it('preserves month-year precision', () => {
      expect(assemblePrecision('month_year', 3, null, null)).toBe('month');
    });

    it('preserves day precision', () => {
      expect(assemblePrecision('exact', 3, 15, null)).toBe('day');
    });

    it('preserves season precision', () => {
      expect(assemblePrecision('season_year', null, null, 'Spring')).toBe('season');
    });
  });

  describe('Value Assembly', () => {
    function assembleValue(year: number, month: number | null, day: number | null, season: string | null) {
      let value = String(year);
      if (month && !season) {
        value += `-${String(month).padStart(2, '0')}`;
        if (day) {
          value += `-${String(day).padStart(2, '0')}`;
        }
      }
      return value;
    }

    it('assembles year-only value', () => {
      expect(assembleValue(1920, null, null, null)).toBe('1920');
    });

    it('assembles month-year value', () => {
      expect(assembleValue(1985, 3, null, null)).toBe('1985-03');
    });

    it('assembles full date value', () => {
      expect(assembleValue(1985, 3, 15, null)).toBe('1985-03-15');
    });

    it('season does not include month in value', () => {
      expect(assembleValue(1985, 3, null, 'Spring')).toBe('1985');
    });
  });

  describe('Confidence Calculation', () => {
    function calculateMinConfidence(confidences: (number | undefined)[]) {
      const valid = confidences.filter((c): c is number => c !== undefined && c !== null);
      return valid.length > 0 ? Math.min(...valid) : 0;
    }

    it('calculates minimum confidence', () => {
      expect(calculateMinConfidence([0.95, 0.90, 0.92])).toBe(0.90);
      expect(calculateMinConfidence([0.40, 0.98])).toBe(0.40);
    });

    it('handles undefined values', () => {
      expect(calculateMinConfidence([0.95, undefined, 0.90])).toBe(0.90);
    });

    it('returns 0 for empty array', () => {
      expect(calculateMinConfidence([])).toBe(0);
      expect(calculateMinConfidence([undefined, undefined])).toBe(0);
    });
  });

  describe('Approximation Detection', () => {
    function detectApproximation(isApproximate: number) {
      return isApproximate > 0.5;
    }

    it('detects approximate dates', () => {
      expect(detectApproximation(0.85)).toBe(true);
      expect(detectApproximation(0.6)).toBe(true);
    });

    it('detects precise dates', () => {
      expect(detectApproximation(0.45)).toBe(false);
      expect(detectApproximation(0.1)).toBe(false);
    });

    it('boundary case at 0.5', () => {
      expect(detectApproximation(0.51)).toBe(true);
      expect(detectApproximation(0.50)).toBe(false);
    });
  });

  describe('Review Flag Logic', () => {
    function shouldReview(minConfidence: number, isApprox: boolean) {
      return minConfidence < 0.70 || isApprox;
    }

    it('flags low confidence for review', () => {
      expect(shouldReview(0.45, false)).toBe(true);
    });

    it('flags approximate for review', () => {
      expect(shouldReview(0.95, true)).toBe(true);
    });

    it('accepts high confidence precise dates', () => {
      expect(shouldReview(0.95, false)).toBe(false);
    });

    it('reviews both low confidence and approximate', () => {
      expect(shouldReview(0.45, true)).toBe(true);
    });
  });
});
