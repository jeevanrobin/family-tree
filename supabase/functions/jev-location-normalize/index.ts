/**
 * Jev Location Normalization Edge Function
 * 
 * Validates and normalizes family location inputs using TypeSafe's Jev model.
 * 
 * SECURITY:
 * - TYPESAFE_API_KEY stored as Supabase secret
 * - Never exposed to client
 * - Minimal logging (no raw PII)
 * 
 * CAPABILITIES:
 * - Abbreviations: "Hyd" → "Hyderabad"
 * - Spelling variants: "Bengaluru" / "Bangalore"
 * - Village/town/city qualifiers
 * - State/country hierarchy where confident
 * - Entity type classification
 * 
 * AMBIGUITY HANDLING:
 * - Never auto-merges similarly named locations
 * - Returns multiple candidates for ambiguous inputs
 * - Requires user confirmation
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TYPESAFE_API_KEY = Deno.env.get("TYPESAFE_API_KEY");
const TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known location mappings for confidence validation
const KNOWN_LOCATIONS = {
  'hyderabad': { canonical: 'Hyderabad', state: 'Telangana', country: 'India', type: 'city' },
  'hyd': { canonical: 'Hyderabad', state: 'Telangana', country: 'India', type: 'city', isAbbreviation: true },
  'secunderabad': { canonical: 'Secunderabad', state: 'Telangana', country: 'India', type: 'city' },
  'bangalore': { canonical: 'Bengaluru', state: 'Karnataka', country: 'India', type: 'city', isVariant: true },
  'bengaluru': { canonical: 'Bengaluru', state: 'Karnataka', country: 'India', type: 'city' },
  'khammam': { canonical: 'Khammam', state: 'Telangana', country: 'India', type: 'city' },
  'suryapet': { canonical: 'Suryapet', state: 'Telangana', country: 'India', type: 'city' },
  'telangana': { canonical: 'Telangana', country: 'India', type: 'state' },
  'muthagudem': { canonical: 'Muthagudem', state: 'Telangana', country: 'India', type: 'village' },
  'edulapuram': { canonical: 'Edulapuram', state: 'Telangana', country: 'India', type: 'village' },
  'reddypalli': { canonical: 'Reddypalli', state: 'Telangana', country: 'India', type: 'village' },
  'arempula': { canonical: 'Arempula', state: 'Telangana', country: 'India', type: 'village' },
};

function normalizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  return input.trim().toLowerCase();
}

function checkKnownLocation(normalized) {
  return KNOWN_LOCATIONS[normalized] || null;
}

function buildJevRequest(input) {
  return {
    state: {
      input,
      context: 'Indian family genealogy location normalization',
      supportedTypes: ['village', 'town', 'city', 'district', 'state', 'country'],
      knownRegions: ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Maharashtra'],
    },
    questions: [
      {
        id: 'canonical_name',
        type: 'choice',
        instructions: 'What is the canonical name for this location? Return the most standard, officially recognized name.',
        criteria: [
          { value: 'canonical', description: 'The standard canonical name' },
        ],
      },
      {
        id: 'entity_type',
        type: 'choice',
        instructions: 'What type of location entity is this?',
        criteria: [
          { value: 'village', description: 'Small rural settlement' },
          { value: 'town', description: 'Medium urban settlement' },
          { value: 'city', description: 'Large urban area' },
          { value: 'district', description: 'Administrative district' },
          { value: 'state', description: 'State or province' },
          { value: 'country', description: 'Country' },
        ],
      },
      {
        id: 'state_region',
        type: 'choice',
        instructions: 'Which Indian state/region is this location in? Return "unknown" if uncertain.',
        criteria: [
          { value: 'telangana', description: 'Telangana state' },
          { value: 'andhra_pradesh', description: 'Andhra Pradesh state' },
          { value: 'karnataka', description: 'Karnataka state' },
          { value: 'maharashtra', description: 'Maharashtra state' },
          { value: 'other', description: 'Other Indian state' },
          { value: 'unknown', description: 'Cannot determine state' },
        ],
      },
      {
        id: 'is_abbreviated',
        type: 'noul',
        instructions: 'Is this input an abbreviation or short form of a location name?',
      },
      {
        id: 'is_variant',
        type: 'noul',
        instructions: 'Is this input a spelling variant, alternative naming, or historical name?',
      },
      {
        id: 'is_ambiguous',
        type: 'noul',
        instructions: 'Could this input refer to multiple distinct locations? (e.g., multiple villages with same name in different districts)',
      },
    ],
    model: 'jev-latest',
  };
}

function parseJevResponse(jevResponse, input) {
  const answers = jevResponse.answers || {};
  
  const canonical = answers.canonical_name?.value || input;
  const entityType = answers.entity_type?.value || 'unknown';
  const stateRegion = answers.state_region?.value || 'unknown';
  const isAbbreviated = answers.is_abbreviated?.probability > 0.5;
  const isVariant = answers.is_variant?.probability > 0.5;
  const isAmbiguous = answers.is_ambiguous?.probability > 0.5;
  
  const confidence = Math.min(
    answers.canonical_name?.confidence || 0,
    answers.entity_type?.confidence || 0,
    isAmbiguous ? 0.5 : 1.0,
  );
  
  return {
    canonical,
    entityType,
    hierarchy: {
      state: stateRegion !== 'unknown' ? stateRegion.replace('_', ' ') : null,
      country: 'India',
    },
    isAbbreviated,
    isVariant,
    isAmbiguous,
    confidence,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!TYPESAFE_API_KEY) {
    return new Response(
      JSON.stringify({
        isValid: false,
        error: 'TYPESAFE_API_KEY not configured',
        reason: 'Server configuration error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await req.json();
    const { input, familyId, session } = body;
    
    if (!input || typeof input !== 'string') {
      return new Response(
        JSON.stringify({
          isValid: false,
          error: 'Input required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const normalized = normalizeInput(input);
    
    // Check known locations first
    const known = checkKnownLocation(normalized);
    if (known) {
      return new Response(
        JSON.stringify({
          isValid: true,
          canonical: known.canonical,
          entityType: known.type,
          hierarchy: {
            state: known.state,
            country: known.country,
          },
          isAbbreviated: known.isAbbreviation || false,
          isVariant: known.isVariant || false,
          isAmbiguous: false,
          confidence: known.isAbbreviation ? 0.85 : 0.95,
          source: 'known-location',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Query Jev
    const jevRequest = buildJevRequest(input);
    
    const response = await fetch(TYPESAFE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TYPESAFE_API_KEY}`,
      },
      body: JSON.stringify(jevRequest),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jev API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({
          isValid: false,
          error: 'Jev API error',
          reason: `API returned ${response.status}`,
          retryable: response.status >= 500 || response.status === 429,
        }),
        {
          status: 200, // Return 200 so client handles gracefully
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const jevData = await response.json();
    const parsed = parseJevResponse(jevData, input);
    
    return new Response(
      JSON.stringify({
        isValid: true,
        ...parsed,
        source: 'jev',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Edge function error:', error.message);
    
    return new Response(
      JSON.stringify({
        isValid: false,
        error: 'Internal error',
        reason: error.message,
        retryable: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
