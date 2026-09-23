/**
 * Supabase Edge Function: jev-date-extract
 * Secure server-side boundary for TypeSafe Jev date extraction.
 * 
 * SECURITY:
 * - TypeSafe API key stored as Supabase secret (TYPESAFE_API_KEY)
 * - Never exposed to client
 * - No logging of raw family date inputs
 * - Returns minimal structured response
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TYPESAFE_API_KEY = Deno.env.get("TYPESAFE_API_KEY");
const TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS: Record<string, number> = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12
};

const SEASONS: Record<string, { month: number; label: string }> = {
  'spring': { month: 3, label: 'Spring' },
  'summer': { month: 6, label: 'Summer' },
  'autumn': { month: 9, label: 'Autumn' },
  'fall': { month: 9, label: 'Fall' },
  'winter': { month: 12, label: 'Winter' }
};

interface TypeSafeResponse {
  model: string;
  answers: {
    precision?: { choice: string; confidence: number };
    year?: { choice: string; confidence: number };
    month?: { choice: string; confidence: number };
    day?: { choice: string; confidence: number };
    season?: { choice: string; confidence: number };
    is_approximate?: { noul: number; confidence: number };
  };
  usage: { input_tokens: number; output_tokens: number };
}

function getDaysInMonth(year: number, month: number): number {
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (month === 2) return isLeapYear ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function validateDateComponents(year: number, month: number | null, day: number | null): { valid: boolean; error?: string } {
  if (year < 1000 || year > 2200) {
    return { valid: false, error: `Year must be between 1000 and 2200` };
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

function buildDateQuestions(input: string): object {
  const yearCriteria: Record<string, null> = {};
  for (let y = 1000; y <= 2200; y++) {
    yearCriteria[String(y)] = null;
  }
  yearCriteria['none'] = null;
  yearCriteria['out_of_range'] = null;

  return {
    precision: {
      type: 'choice',
      instructions: 'What precision level is this date?',
      criteria: {
        'exact': null,
        'month_year': null,
        'year_only': null,
        'season_year': null,
        'approximate': null,
        'none': null
      }
    },
    year: {
      type: 'choice',
      instructions: 'Which year is stated?',
      criteria: yearCriteria
    },
    month: {
      type: 'choice',
      instructions: 'Which month is stated?',
      criteria: {
        ...Object.fromEntries(Object.keys(MONTHS).map(m => [m, null])),
        'none': null
      }
    },
    day: {
      type: 'choice',
      instructions: 'Which day of the month is stated?',
      criteria: {
        ...Object.fromEntries(Array.from({ length: 31 }, (_, i) => [String(i + 1), null])),
        'none': null
      }
    },
    season: {
      type: 'choice',
      instructions: 'Is a season mentioned?',
      criteria: {
        'none': null,
        ...Object.fromEntries(Object.keys(SEASONS).map(s => [s, null]))
      }
    },
    is_approximate: {
      type: 'noul',
      instructions: 'Is this an approximate or uncertain date?',
      criteria: {
        'true': 'Contains words like "about", "around", "circa"',
        'false': 'Precise, definite date'
      }
    }
  };
}

function assembleResult(answers: TypeSafeResponse['answers']): object {
  const precision = answers.precision?.choice || 'none';
  const yearStr = answers.year?.choice;
  const monthStr = answers.month?.choice;
  const dayStr = answers.day?.choice;
  const seasonStr = answers.season?.choice;
  const isApproximate = answers.is_approximate?.noul || 0;

  const confidences = [
    answers.precision?.confidence,
    answers.year?.confidence,
    answers.month?.confidence,
    answers.day?.confidence,
    answers.season?.confidence,
    answers.is_approximate?.confidence
  ].filter((c): c is number => c !== undefined && c !== null);

  const minConfidence = confidences.length > 0 ? Math.min(...confidences) : 0;

  if (precision === 'none') {
    return {
      isValid: false,
      error: 'Could not parse date',
      needsReview: true,
      confidence: minConfidence
    };
  }

  const year = yearStr && yearStr !== 'none' && yearStr !== 'out_of_range'
    ? parseInt(yearStr, 10)
    : null;

  const month = monthStr && monthStr !== 'none'
    ? MONTHS[monthStr.toLowerCase()] || null
    : null;

  const day = dayStr && dayStr !== 'none'
    ? parseInt(dayStr, 10)
    : null;

  const season = seasonStr && seasonStr !== 'none'
    ? SEASONS[seasonStr] || null
    : null;

  if (!year || yearStr === 'out_of_range') {
    return {
      isValid: false,
      error: !year ? 'No year could be determined' : `Year ${yearStr} is outside valid range`,
      needsReview: true,
      confidence: minConfidence
    };
  }

  const validation = validateDateComponents(year, month, day);
  if (!validation.valid) {
    return {
      isValid: false,
      error: validation.error,
      needsReview: true,
      confidence: minConfidence
    };
  }

  const isApprox = isApproximate > 0.5;
  const finalPrecision = season ? 'season' : precision === 'year_only' ? 'year' : month ? (day ? 'day' : 'month') : 'year';

  let value = String(year);
  if (month && !season) {
    value += `-${String(month).padStart(2, '0')}`;
    if (day) {
      value += `-${String(day).padStart(2, '0')}`;
    }
  }

  const needsReview = minConfidence < 0.70 || isApprox;

  const result: Record<string, unknown> = {
    isValid: true,
    isEmpty: false,
    value,
    year,
    month: month || null,
    day: day || null,
    precision: finalPrecision,
    isApproximate: isApprox,
    season: season ? season.label : null,
    needsReview,
    confidence: minConfidence,
    source: 'jev'
  };

  if (isApprox) {
    result.approximation = true;
    if (season) {
      result.displayNote = `${season.label} ${year}`;
    }
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!TYPESAFE_API_KEY) {
      return new Response(
        JSON.stringify({
          isValid: false,
          error: "Jev API not configured",
          skipped: true,
          reason: "TYPESAFE_API_KEY not set in Supabase secrets"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { input } = await req.json();

    if (!input || typeof input !== 'string' || !input.trim()) {
      return new Response(
        JSON.stringify({
          isValid: true,
          isEmpty: true,
          skipped: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(TYPESAFE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TYPESAFE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state: input.trim(),
        questions: buildDateQuestions(input)
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({
            isValid: false,
            error: "Jev API authentication failed",
            skipped: true,
            reason: "Invalid API key"
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 429 || response.status === 529) {
        return new Response(
          JSON.stringify({
            isValid: false,
            error: "Jev API temporarily unavailable",
            skipped: true,
            retryable: true,
            reason: response.status === 429 ? "Rate limited" : "Overloaded"
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          isValid: false,
          error: "Jev API request failed",
          skipped: true,
          reason: `HTTP ${response.status}`
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: TypeSafeResponse = await response.json();
    const result = assembleResult(data.answers);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        isValid: false,
        error: "Jev API request failed",
        skipped: true,
        reason: errorMessage.includes('fetch') ? 'Network error' : errorMessage
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
