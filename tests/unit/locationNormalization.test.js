/**
 * Location Normalization Tests
 * Tests for Jev fallback location normalization
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
  normalizeLocation,
  isDeterministicConfident,
  configureLocationNormalization,
  getNormalizationStatus,
  resetStats,
  REVIEW_BELOW,
  AMBIGUITY_THRESHOLD,
  MIN_CONFIDENCE,
} from '../../src/family-tree/utils/locationNormalization.js';

describe('locationNormalization', () => {
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
    configureLocationNormalization({ 
      enabled: true,
      supabase: testClient
    });
    
    resetStats();
  });

  describe('isDeterministicConfident', () => {
    it('returns true for exact match (tier 1)', () => {
      const result = { matchTier: 1, isCurated: false, familyCount: 0 };
      expect(isDeterministicConfident(result)).toBe(true);
    });

    it('returns true for curated prefix match (tier 2)', () => {
      const result = { matchTier: 2, isCurated: true, familyCount: 0 };
      expect(isDeterministicConfident(result)).toBe(true);
    });

    it('returns true for high-frequency prefix match', () => {
      const result = { matchTier: 2, isCurated: false, familyCount: 5 };
      expect(isDeterministicConfident(result)).toBe(true);
    });

    it('returns false for low-frequency prefix match', () => {
      const result = { matchTier: 2, isCurated: false, familyCount: 1 };
      expect(isDeterministicConfident(result)).toBe(false);
    });

    it('returns false for contains match (tier 3)', () => {
      const result = { matchTier: 3, isCurated: true, familyCount: 5 };
      expect(isDeterministicConfident(result)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isDeterministicConfident(null)).toBe(false);
      expect(isDeterministicConfident(undefined)).toBe(false);
    });
  });

  describe('normalizeLocation', () => {
    describe('successful normalization', () => {
      it('normalizes abbreviation "Hyd" to "Hyderabad"', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            canonical: 'Hyderabad',
            entityType: 'city',
            hierarchy: { state: 'Telangana', country: 'India' },
            isAbbreviated: true,
            isVariant: false,
            isAmbiguous: false,
            confidence: 0.92,
          },
          error: null
        });

        const result = await normalizeLocation('Hyd');

        expect(result.normalized).toBe('Hyderabad');
        expect(result.canonical).toBe('Hyderabad');
        expect(result.confidence).toBe(0.92);
        expect(result.needsReview).toBe(false);
      });

      it('normalizes variant "Bangalore" to "Bengaluru"', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            canonical: 'Bengaluru',
            entityType: 'city',
            hierarchy: { state: 'Karnataka', country: 'India' },
            isAbbreviated: false,
            isVariant: true,
            isAmbiguous: false,
            confidence: 0.89,
          },
          error: null
        });

        const result = await normalizeLocation('Bangalore');

        expect(result.normalized).toBe('Bengaluru');
        expect(result.confidence).toBeGreaterThan(AMBIGUITY_THRESHOLD);
      });

      it('normalizes village with hierarchy', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            canonical: 'Muthagudem',
            entityType: 'village',
            hierarchy: { state: 'Telangana', country: 'India' },
            isAbbreviated: false,
            isVariant: false,
            isAmbiguous: false,
            confidence: 0.95,
          },
          error: null
        });

        const result = await normalizeLocation('Muthagudem Village');

        expect(result.normalized).toBe('Muthagudem');
        expect(result.entityType).toBe('village');
        expect(result.hierarchy.state).toBe('Telangana');
      });
    });

    describe('deterministic-first', () => {
      it('skips Jev when deterministic is confident', async () => {
        const deterministicResult = {
          value: 'Hyderabad',
          matchTier: 1,
          isCurated: true,
          familyCount: 5,
        };

        const result = await normalizeLocation('Hyderabad', { deterministicResult });

        expect(result.normalized).toBe('Hyderabad');
        expect(result.source).toBe('deterministic');
        expect(result.confidence).toBe(1.0);
        expect(result.skipped).toBe(true);
        expect(mockInvoke).not.toHaveBeenCalled();
      });

      it('invokes Jev when deterministic is not confident', async () => {
        const deterministicResult = {
          value: 'Hyd',
          matchTier: 3,
          isCurated: false,
          familyCount: 0,
        };

        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            canonical: 'Hyderabad',
            entityType: 'city',
            hierarchy: { state: 'Telangana', country: 'India' },
            isAbbreviated: true,
            isVariant: false,
            isAmbiguous: false,
            confidence: 0.92,
          },
          error: null
        });

        const result = await normalizeLocation('Hyd', { deterministicResult });

        expect(result.normalized).toBe('Hyderabad');
        expect(result.source).toBe('jev');
        expect(mockInvoke).toHaveBeenCalled();
      });
    });

    describe('ambiguity handling', () => {
      it('returns multiple candidates for ambiguous locations', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            canonical: 'Kothapalli',
            entityType: 'village',
            hierarchy: { state: 'unknown', country: 'India' },
            isAbbreviated: false,
            isVariant: false,
            isAmbiguous: true,
            confidence: 0.55,
            candidates: [
              { canonical: 'Kothapalli, Khammam District' },
              { canonical: 'Kothapalli, Suryapet District' },
            ],
          },
          error: null
        });

        const result = await normalizeLocation('Kothapalli');

        expect(result.needsReview).toBe(true);
        expect(result.candidates).toBeDefined();
        expect(result.candidates.length).toBeGreaterThan(0);
      });

      it('requires review for medium confidence', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            canonical: 'Hyderabad',
            entityType: 'city',
            hierarchy: { state: 'Telangana', country: 'India' },
            isAbbreviated: false,
            isVariant: false,
            isAmbiguous: false,
            confidence: 0.70,
          },
          error: null
        });

        const result = await normalizeLocation('Hyd');

        expect(result.needsReview).toBe(true);
      });
    });

    describe('error handling', () => {
      it('returns invalid for empty input', async () => {
        const result = await normalizeLocation('');

        expect(result.isEmpty).toBe(true);
        expect(result.skipped).toBe(true);
      });

      it('returns invalid for null input', async () => {
        const result = await normalizeLocation(null);

        expect(result.isEmpty).toBe(true);
        expect(result.skipped).toBe(true);
      });

      it('handles Edge Function error', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: null,
          error: { message: 'Edge Function failed' }
        });

        const result = await normalizeLocation('Hyd');

        expect(result.normalized).toBeNull();
        expect(result.skipped).toBe(true);
        expect(result.source).toBe('edge-function-error');
      });

      it('handles rate limit (429)', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: null,
          error: { message: 'Jev API temporarily unavailable' }
        });

        const result = await normalizeLocation('Hyd');

        expect(result.retryable).toBe(true);
        expect(result.skipped).toBe(true);
      });

      it('handles network error', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('fetch failed'));

        const result = await normalizeLocation('Hyd');

        expect(result.normalized).toBeNull();
        expect(result.retryable).toBe(true);
        expect(result.source).toBe('network-error');
      });

      it('handles malformed response', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: false,
            error: 'Could not parse location',
          },
          error: null
        });

        const result = await normalizeLocation('!!!invalid!!!');

        expect(result.normalized).toBeNull();
        expect(result.skipped).toBe(true);
      });

      it('handles low confidence', async () => {
        mockInvoke.mockResolvedValueOnce({
          data: {
            isValid: true,
            canonical: 'Unknown',
            entityType: 'unknown',
            hierarchy: {},
            isAbbreviated: false,
            isVariant: false,
            isAmbiguous: false,
            confidence: 0.40,
          },
          error: null
        });

        const result = await normalizeLocation('xyzabc123');

        expect(result.normalized).toBeNull();
        expect(result.skipped).toBe(true);
        expect(result.reason).toContain('low');
      });
    });

    describe('disabled mode', () => {
      it('respects disabled configuration', async () => {
        configureLocationNormalization({ enabled: false });

        const result = await normalizeLocation('Hyd');

        expect(result.normalized).toBeNull();
        expect(result.skipped).toBe(true);
        expect(result.reason).toContain('disabled');
      });
    });
  });

  describe('statistics tracking', () => {
    it('tracks deterministic hits', async () => {
      const deterministicResult = { matchTier: 1, isCurated: true, familyCount: 5 };
      
      await normalizeLocation('Hyderabad', { deterministicResult });
      
      const status = getNormalizationStatus();
      expect(status.stats.deterministicHits).toBe(1);
    });

    it('tracks Jev fallbacks', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          isValid: true,
          canonical: 'Hyderabad',
          entityType: 'city',
          hierarchy: {},
          confidence: 0.92,
        },
        error: null
      });

      await normalizeLocation('Hyd');
      
      const status = getNormalizationStatus();
      expect(status.stats.jevFallbacks).toBe(1);
    });

    it('tracks failed cases', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'API error' }
      });

      await normalizeLocation('Hyd');
      
      const status = getNormalizationStatus();
      expect(status.stats.failedCases).toBe(1);
    });

    it('tracks ambiguous cases', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          isValid: true,
          canonical: 'Kothapalli',
          entityType: 'village',
          hierarchy: {},
          isAmbiguous: true,
          confidence: 0.55,
        },
        error: null
      });

      await normalizeLocation('Kothapalli');
      
      const status = getNormalizationStatus();
      expect(status.stats.ambiguousCases).toBe(1);
    });
  });

  describe('thresholds', () => {
    it('defines review threshold below 0.75', () => {
      expect(REVIEW_BELOW).toBe(0.75);
    });

    it('defines ambiguity threshold at 0.60', () => {
      expect(AMBIGUITY_THRESHOLD).toBe(0.60);
    });

    it('defines minimum confidence at 0.50', () => {
      expect(MIN_CONFIDENCE).toBe(0.50);
    });
  });
});
