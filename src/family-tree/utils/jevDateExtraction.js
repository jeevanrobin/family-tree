/**
 * Jev Date Extraction — Medida's Family
 * AI-enhanced date parsing via secure server boundary.
 * Fallback-only: deterministic parser remains authoritative.
 * 
 * SECURITY: TypeSafe API key never exposed to client.
 * All Jev calls go through Supabase Edge Function.
 * 
 * Supports: natural language dates, approximate dates, partial dates
 * Validates: calendar correctness, precision preservation
 * Never: silently converts uncertain dates to falsely precise dates
 */

import { getDaysInMonth, MONTH_NAMES_FULL } from './dateHelpers.js';
import { createClient } from '@supabase/supabase-js';

const REVIEW_BELOW = 0.70;
const MIN_YEAR = 1000;
const MAX_YEAR = 2200;

let isEnabled = true;
let lastError = null;
let supabaseClient = null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function configureJevExtraction(config = {}) {
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

export function getJevStatus() {
  return {
    enabled: isEnabled,
    available: supabaseUrl && supabaseAnonKey,
    lastError,
    mode: 'edge-function'
  };
}

export async function extractDateWithJev(input, options = {}) {
  if (!isEnabled) {
    return { 
      isValid: false, 
      error: 'Jev extraction is disabled',
      skipped: true 
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { 
      isValid: false, 
      error: 'Jev API not available',
      skipped: true,
      reason: 'Supabase client not configured'
    };
  }

  if (!input || typeof input !== 'string' || !input.trim()) {
    return { 
      isValid: true, 
      isEmpty: true,
      value: '',
      year: null,
      month: null,
      day: null,
      precision: 'empty',
      skipped: true 
    };
  }

  try {
    const { data, error } = await client.functions.invoke('jev-date-extract', {
      body: { input: input.trim() }
    });

    if (error) {
      lastError = error.message;
      
      return {
        isValid: false,
        error: 'Jev Edge Function error',
        skipped: true,
        reason: error.message,
        retryable: error.message?.includes('temporarily unavailable')
      };
    }

    return {
      ...data,
      input,
      source: 'jev-edge-function'
    };

  } catch (err) {
    lastError = err.message;
    
    if (err.message?.includes('fetch')) {
      return {
        isValid: false,
        error: 'Jev Edge Function unavailable',
        skipped: true,
        retryable: true,
        reason: 'Network error'
      };
    }

    return {
      isValid: false,
      error: 'Jev request failed',
      skipped: true,
      reason: err.message
    };
  }
}

export function shouldUseJevFallback(parsedDeterministic) {
  if (!isEnabled) return false;
  
  if (parsedDeterministic.isEmpty) return false;
  
  if (parsedDeterministic.isValid && parsedDeterministic.precision !== 'empty') {
    return false;
  }

  return true;
}

export { REVIEW_BELOW };
