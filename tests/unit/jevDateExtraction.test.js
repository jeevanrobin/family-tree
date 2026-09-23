/**
 * Jev Date Extraction Tests
 * Tests secure Edge Function integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    functions: {
      invoke: vi.fn()
    }
  }))
}));

import {
  extractDateWithJev,
  shouldUseJevFallback,
  configureJevExtraction,
  getJevStatus,
  REVIEW_BELOW,
} from '../../src/family-tree/utils/jevDateExtraction.js';

describe('jevDateExtraction', () => {
  let mockInvoke;
  let mockCreateClient;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    const supabaseModule = await import('@supabase/supabase-js');
    mockCreateClient = supabaseModule.createClient;
    mockCreateClient.mockImplementation(() => {
      const client = {
        functions: {
          invoke: vi.fn()
        }
      };
      mockInvoke = client.functions.invoke;
      return client;
    });
    
    const testClient = mockCreateClient();
    configureJevExtraction({ 
      enabled: true,
      supabase: testClient
    });
  });

  describe('extractDateWithJev', () => {
    describe('successful extraction', () => {
      it('extracts year-only date', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            year: 1920,
            month: null,
            day: null,
            precision: 'year',
            value: '1920',
            confidence: 0.92,
            isApproximate: false,
            needsReview: false
          },
          error: null
        });

        const result = await extractDateWithJev('1920');

        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1920);
        expect(result.month).toBeNull();
        expect(result.precision).toBe('year');
        expect(result.value).toBe('1920');
        expect(result.confidence).toBeCloseTo(0.92, 2);
        expect(result.isApproximate).toBe(false);
      });

      it('extracts month-year date', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            year: 1985,
            month: 3,
            day: null,
            precision: 'month',
            value: '1985-03',
            confidence: 0.94,
            isApproximate: false,
            needsReview: false
          },
          error: null
        });

        const result = await extractDateWithJev('March 1985');

        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
        expect(result.month).toBe(3);
        expect(result.precision).toBe('month');
        expect(result.value).toBe('1985-03');
      });

      it('extracts full date', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            year: 1985,
            month: 3,
            day: 15,
            precision: 'day',
            value: '1985-03-15',
            confidence: 0.97,
            isApproximate: false,
            needsReview: false
          },
          error: null
        });

        const result = await extractDateWithJev('15 March 1985');

        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
        expect(result.month).toBe(3);
        expect(result.day).toBe(15);
        expect(result.precision).toBe('day');
        expect(result.value).toBe('1985-03-15');
      });

      it('extracts approximate date', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            year: 1920,
            month: null,
            day: null,
            precision: 'year',
            value: '1920',
            confidence: 0.92,
            isApproximate: true,
            needsReview: true
          },
          error: null
        });

        const result = await extractDateWithJev('around 1920');

        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1920);
        expect(result.isApproximate).toBe(true);
        expect(result.needsReview).toBe(true);
      });

      it('extracts season and year', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            year: 1985,
            month: null,
            day: null,
            precision: 'season',
            value: '1985',
            season: 'Spring',
            confidence: 0.90,
            isApproximate: true,
            needsReview: true
          },
          error: null
        });

        const result = await extractDateWithJev('spring 1985');

        expect(result.isValid).toBe(true);
        expect(result.year).toBe(1985);
        expect(result.season).toBe('Spring');
        expect(result.precision).toBe('season');
      });
    });

    describe('error handling', () => {
      it('returns invalid for empty input', async () => {
        const result = await extractDateWithJev('');

        expect(result.isValid).toBe(true);
        expect(result.isEmpty).toBe(true);
        expect(result.skipped).toBe(true);
      });

      it('returns invalid for null input', async () => {
        const result = await extractDateWithJev(null);

        expect(result.isEmpty).toBe(true);
        expect(result.skipped).toBe(true);
      });

      it('handles Edge Function error', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: null,
          error: { message: 'Edge Function failed' }
        });

        const result = await extractDateWithJev('March 1985');

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Edge Function');
        expect(result.skipped).toBe(true);
      });

      it('handles rate limit', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: null,
          error: { message: 'Jev API temporarily unavailable' }
        });

        const result = await extractDateWithJev('March 1985');

        expect(result.retryable).toBe(true);
        expect(result.skipped).toBe(true);
      });

      it('handles network error', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('fetch failed'));

        const result = await extractDateWithJev('March 1985');

        expect(result.isValid).toBe(false);
        expect(result.retryable).toBe(true);
        expect(result.reason).toContain('Network');
      });
    });

    describe('calendar validation', () => {
      it('rejects invalid day for month', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: false,
            error: 'Invalid day for month 2 in year 2019',
            needsReview: true,
            confidence: 0.50
          },
          error: null
        });

        const result = await extractDateWithJev('30 Feb 2019');

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid day');
      });

      it('rejects year out of range', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: false,
            error: 'Year 500 is outside valid range',
            needsReview: true,
            confidence: 0.50
          },
          error: null
        });

        const result = await extractDateWithJev('500');

        expect(result.isValid).toBe(false);
      });
    });

    describe('confidence thresholds', () => {
      it('flags low confidence for review', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            year: 1920,
            month: null,
            day: null,
            precision: 'year',
            value: '1920',
            confidence: 0.45,
            isApproximate: false,
            needsReview: true
          },
          error: null
        });

        const result = await extractDateWithJev('maybe 1920?');

        expect(result.needsReview).toBe(true);
        expect(result.confidence).toBeLessThan(REVIEW_BELOW);
      });

      it('accepts high confidence without review', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            year: 1920,
            month: null,
            day: null,
            precision: 'year',
            value: '1920',
            confidence: 0.95,
            isApproximate: false,
            needsReview: false
          },
          error: null
        });

        const result = await extractDateWithJev('1920');

        expect(result.needsReview).toBe(false);
        expect(result.confidence).toBeGreaterThanOrEqual(REVIEW_BELOW);
      });
    });

    describe('malformed responses', () => {
      it('handles missing data gracefully', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: false,
            error: 'Could not parse date',
            needsReview: true
          },
          error: null
        });

        const result = await extractDateWithJev('test');

        expect(result.isValid).toBe(false);
        expect(result.needsReview).toBe(true);
      });

      it('handles empty year gracefully', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: false,
            error: 'No year could be determined',
            needsReview: true,
            confidence: 0.90
          },
          error: null
        });

        const result = await extractDateWithJev('unknown year');

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('No year');
      });
    });
  });

  describe('shouldUseJevFallback', () => {
    it('returns false for valid deterministic parse', () => {
      const parsed = { isValid: true, isEmpty: false, precision: 'year' };
      expect(shouldUseJevFallback(parsed)).toBe(false);
    });

    it('returns true for invalid parse', () => {
      const parsed = { isValid: false, error: 'Invalid' };
      expect(shouldUseJevFallback(parsed)).toBe(true);
    });

    it('returns false for empty input', () => {
      const parsed = { isValid: true, isEmpty: true };
      expect(shouldUseJevFallback(parsed)).toBe(false);
    });
  });

  describe('configuration', () => {
    it('can disable Jev extraction', async () => {
      configureJevExtraction({ enabled: false });

      const result = await extractDateWithJev('March 1985');

      expect(result.skipped).toBe(true);
      expect(result.error).toContain('disabled');
    });

    it('reports status', () => {
      configureJevExtraction({ enabled: true });
      
      const status = getJevStatus();
      expect(status.enabled).toBeDefined();
      expect(status.mode).toBe('edge-function');
    });
  });
});
