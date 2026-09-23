/**
 * Location Normalization — Medida's Family
 * Optional Jev fallback for normalizing family location inputs.
 * 
 * ARCHITECTURE:
 * User input → deterministic matching → if confident, use result
 *            → otherwise optionally invoke Jev → normalize/classify
 *            → validate → return canonical value
 * 
 * PRIVACY:
 * - Logs minimal metadata only (no raw inputs in production logs)
 * - Never exposes TypeSafe API key in browser
 * - Uses existing secure Edge Function boundary
 * 
 * PILOT MODE:
 * - Not replacing deterministic system
 * - Measures fallback rates
 * - Never auto-merges ambiguous locations
 * - Requires user confirmation for canonical values
 */

import { createClient } from '@supabase/supabase-js';

const REVIEW_BELOW = 0.75;
const AMBIGUITY_THRESHOLD = 0.60;
const MIN_CONFIDENCE = 0.50;

let isEnabled = false; // Disabled by default in pilot
let lastError = null;
let supabaseClient = null;
let stats = {
  deterministicHits: 0,
  jevFallbacks: 0,
  ambiguousCases: 0,
  failedCases: 0,
  totalRequests: 0,
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function configureLocationNormalization(config = {}) {
  if (config.enabled !== undefined) isEnabled = config.enabled;
  if (config.supabase) {
    supabaseClient = config.supabase;
  }
}

function getSupabaseClient() {
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

export function getNormalizationStatus() {
  return {
    enabled: isEnabled,
    available: supabaseUrl && supabaseAnonKey,
    lastError,
    mode: 'pilot',
    stats: { ...stats },
  };
}

export function resetStats() {
  stats = {
    deterministicHits: 0,
    jevFallbacks: 0,
    ambiguousCases: 0,
    failedCases: 0,
    totalRequests: 0,
  };
}

/**
 * Check if deterministic matching has high confidence.
 * @param {object} deterministicResult - Result from suggestionData.js
 * @returns {boolean} - True if confident, no Jev needed
 */
export function isDeterministicConfident(deterministicResult) {
  if (!deterministicResult) return false;
  
  const { matchTier, isCurated, familyCount } = deterministicResult;
  
  if (matchTier === 1) return true;
  if (matchTier === 2 && isCurated) return true;
  if (matchTier === 2 && familyCount >= 3) return true;
  
  return false;
}

/**
 * Normalize a location using Jev fallback.
 * @param {string} input - Raw user input
 * @param {object} options
 * @param {object} [options.deterministicResult] - Result from deterministic matching
 * @param {string} [options.familyId] - Family context for logging
 * @returns {Promise<object>} - Normalization result
 */
export async function normalizeLocation(input, options = {}) {
  stats.totalRequests++;
  
  if (!isEnabled) {
    return {
      normalized: null,
      original: input,
      skipped: true,
      reason: 'Location normalization disabled',
      source: 'disabled',
    };
  }
  
  const client = getSupabaseClient();
  if (!client) {
    return {
      normalized: null,
      original: input,
      skipped: true,
      reason: 'Supabase client not configured',
      source: 'unavailable',
    };
  }
  
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return {
      normalized: null,
      original: input,
      skipped: true,
      isEmpty: true,
      source: 'empty',
    };
  }
  
  if (options.deterministicResult && isDeterministicConfident(options.deterministicResult)) {
    stats.deterministicHits++;
    return {
      normalized: options.deterministicResult.value,
      original: input,
      skipped: true,
      reason: 'Deterministic match confident',
      source: 'deterministic',
      confidence: 1.0,
    };
  }
  
  try {
    const { data, error } = await client.functions.invoke('jev-location-normalize', {
      body: {
        input: trimmed,
        familyId: options.familyId,
        session: 'pilot',
      }
    });
    
    if (error) {
      lastError = error.message;
      stats.failedCases++;
      
      return {
        normalized: null,
        original: input,
        skipped: true,
        reason: error.message,
        source: 'edge-function-error',
        retryable: error.message?.includes('temporarily unavailable'),
      };
    }
    
    if (!data || !data.isValid) {
      stats.failedCases++;
      return {
        normalized: null,
        original: input,
        skipped: true,
        reason: data?.error || 'Invalid response',
        source: 'invalid',
      };
    }
    
    const confidence = data.confidence || 0;
    
    if (confidence < MIN_CONFIDENCE) {
      stats.ambiguousCases++;
      return {
        normalized: null,
        original: input,
        skipped: true,
        reason: 'Confidence too low',
        confidence,
        candidates: data.candidates || [],
        source: 'low-confidence',
        needsReview: true,
      };
    }
    
    if (data.isAmbiguous || confidence < AMBIGUITY_THRESHOLD) {
      stats.ambiguousCases++;
      return {
        normalized: null,
        original: input,
        skipped: false,
        reason: 'Ambiguous location - requires confirmation',
        confidence,
        candidates: data.candidates || [data],
        canonical: data.canonical,
        source: 'ambiguous',
        needsReview: true,
      };
    }
    
    stats.jevFallbacks++;
    
    return {
      normalized: data.canonical,
      original: input,
      skipped: false,
      confidence,
      canonical: data.canonical,
      hierarchy: data.hierarchy,
      entityType: data.entityType,
      needsReview: confidence < REVIEW_BELOW,
      source: 'jev',
    };
    
  } catch (err) {
    lastError = err.message;
    stats.failedCases++;
    
    if (err.message?.includes('fetch')) {
      return {
        normalized: null,
        original: input,
        skipped: true,
        reason: 'Network error',
        source: 'network-error',
        retryable: true,
      };
    }
    
    return {
      normalized: null,
      original: input,
      skipped: true,
      reason: err.message,
      source: 'exception',
    };
  }
}

export { REVIEW_BELOW, AMBIGUITY_THRESHOLD, MIN_CONFIDENCE };
