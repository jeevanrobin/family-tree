# M5B.2 — Jev Location Normalization Pilot Evaluation

**Date:** 2026-09-23
**Repository:** D:\Projects\family-tree
**Status:** PILOT - Not Enabled in Production

---

## Executive Summary

This pilot evaluates Jev (TypeSafe System One model) as an optional fallback for normalizing family location inputs. The existing deterministic suggestion system remains the primary authority.

**Recommendation:** Proceed to controlled beta testing with family-level opt-in.

---

## Architecture

### Flow

```
User Input
    ↓
Deterministic Matching (suggestionData.js)
    ↓
Confident Match?
    ├─ YES → Use deterministic result (no Jev call)
    └─ NO  → Optionally invoke Jev
                ↓
         Normalize/Classify
                ↓
         Validate structure
                ↓
         Ambiguous?
             ├─ YES → Return candidates, require user confirmation
             └─ NO  → Return canonical value
                ↓
         User confirms
                ↓
         Save canonical value
```

### Key Principles

1. **Deterministic-First**: Jev is only invoked when the existing system lacks confidence
2. **User Confirmation Required**: Never silently overwrite or auto-merge locations
3. **Privacy-Respecting**: Minimal logging, server-only API keys
4. **Graceful Degradation**: Application works without Jev

---

## Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/family-tree/utils/locationNormalization.js` | Client-side Jev integration |
| `supabase/functions/jev-location-normalize/index.ts` | Edge Function for secure API boundary |
| `tests/unit/locationNormalization.test.js` | Test suite (28 tests) |

### Configuration

```javascript
// Enable/disable Jev fallback
configureLocationNormalization({ enabled: true });

// Check status
const status = getNormalizationStatus();
// {
//   enabled: true,
//   available: true,
//   mode: 'pilot',
//   stats: {
//     deterministicHits: 0,
//     jevFallbacks: 0,
//     ambiguousCases: 0,
//     failedCases: 0,
//     totalRequests: 0
//   }
// }
```

---

## Evaluation Dataset

### Location Types Tested

| Category | Examples | Source |
|----------|----------|--------|
| Curated (Known) | Hyderabad, Muthagudem, Khammam | `CURATED_LOCATIONS` |
| Abbreviations | Hyd → Hyderabad | Jev |
| Spelling Variants | Bangalore → Bengaluru | Jev |
| Village with Qualifier | Muthagudem Village → Muthagudem | Jev |
| Ambiguous Locations | Kothapalli (multiple villages) | Jev |
| State References | Telangana | Jev |
| Invalid Inputs | !!!invalid!!!, null, empty | Edge cases |

### Known Location Mappings (Edge Function)

```javascript
{
  'hyderabad': { canonical: 'Hyderabad', state: 'Telangana', type: 'city' },
  'hyd': { canonical: 'Hyderabad', state: 'Telangana', type: 'city', isAbbreviation: true },
  'secunderabad': { canonical: 'Secunderabad', state: 'Telangana', type: 'city' },
  'bangalore': { canonical: 'Bengaluru', state: 'Karnataka', type: 'city', isVariant: true },
  'bengaluru': { canonical: 'Bengaluru', state: 'Karnataka', type: 'city' },
  'khammam': { canonical: 'Khammam', state: 'Telangana', type: 'city' },
  'suryapet': { canonical: 'Suryapet', state: 'Telangana', type: 'city' },
  'muthagudem': { canonical: 'Muthagudem', state: 'Telangana', type: 'village' },
}
```

---

## Results

### Test Suite Summary

| Metric | Value |
|--------|-------|
| Test Files | 19 passed |
| Tests | **421 passed** |
| Duration | 4.37s |

**New Tests Added:** 28 location normalization tests

### Deterministic Hit Rate

**Expected:** ~70-80% of family location inputs

**Reasoning:**
- Exact matches (tier 1) are confident
- Curated prefix matches (tier 2) are confident
- High-frequency family locations (≥3 uses) are confident

Only ~20-30% of inputs should require Jev fallback.

### Jev Fallback Conditions

Jev is invoked when:
- Deterministic system returns `matchTier: 3` (contains match)
- Deterministic system returns low-frequency prefix match (`familyCount < 3`)
- Input is not in curated list AND not in family history

### Confidence Thresholds

| Threshold | Value | Behavior |
|-----------|-------|----------|
| REVIEW_BELOW | 0.75 | Flag for user review |
| AMBIGUITY_THRESHOLD | 0.60 | Return multiple candidates |
| MIN_CONFIDENCE | 0.50 | Reject normalization |

---

## Example Normalizations

### Successful Cases

| Input | Output | Confidence | Notes |
|-------|--------|-----------|-------|
| Hyd | Hyderabad | 0.92 | Abbreviation detected |
| Bangalore | Bengaluru | 0.89 | Spelling variant |
| Muthagudem Village | Muthagudem | 0.95 | Qualifier removed |
| Telangana | Telangana | 0.95 | State validated |

### Ambiguous Cases

| Input | Behavior | Reason |
|-------|----------|--------|
| Kothapalli | Return candidates, require confirmation | Multiple villages with same name in different districts |

### Failed Cases

| Input | Behavior | Reason |
|-------|----------|--------|
| xyzabc123 | Return null, confidence < 0.50 | Unrecognizable input |
| null | Skip, isEmpty: true | Empty input |
| (network error) | Return retryable: true | Graceful degradation |

---

## Latency

| Stage | Expected Latency |
|-------|------------------|
| Deterministic match | < 1ms (in-memory) |
| Known location (Edge Function) | ~50-100ms |
| Jev API call | ~200-500ms |

**Note:** Total latency for Jev fallback: ~250-600ms (Edge Function + Jev API)

---

## Cost Estimation

### TypeSafe Jev Pricing

- Per API call: ~$0.003-0.01 (depending on volume)
- Monthly active family using normalization: ~1000 locations
- Estimated monthly cost: **$3-10/month**

**Mitigation:**
- Deterministic-first significantly reduces API calls
- Known locations cached in Edge Function (no Jev call needed)
- Rate limiting prevents runaway costs

---

## Privacy Behavior

### What is Logged

- **Client-side:** Minimal metadata (request count, no raw inputs)
- **Server-side:** Session ID, normalized result (no raw PII in production logs)

### What is NOT Logged

- Raw user inputs (not stored, not logged)
- Full Jev responses (only canonical value extracted)
- Family identifiers (only session ID for debugging)

### API Key Security

- TypeSafe API key stored as Supabase secret
- Never exposed to browser
- Accessed only via Edge Function
- No `VITE_TYPESAFE_API_KEY` (prevented by security tests)

---

## Failure Behavior

| Failure Mode | Handling |
|--------------|----------|
| API unavailable | Return `retryable: true`, graceful degradation |
| 429 Rate Limit | Return `retryable: true`, application continues |
| 401 Unauthorized | Return error (configuration issue) |
| 5xx Server Error | Return `retryable: true` |
| Timeout | Return `retryable: true`, user can retry |
| Malformed Response | Return null, log error locally |

**Application continues working without Jev** - users can still enter custom locations.

---

## Test Coverage

### Deterministic Tests (existing)

- Exact match
- Prefix match
- Contains match
- Family frequency ranking
- Curated vs custom prioritization

### Jev Fallback Tests (new)

- Abbreviation normalization
- Spelling variant normalization
- Village/town/city qualifiers
- State/country hierarchy
- Deterministic-first logic
- Ambiguity handling
- Low confidence handling
- Malformed response handling
- API errors (401, 429, 5xx)
- Network errors
- Graceful degradation
- Statistics tracking

---

## Recommendations

### Proceed to Beta Rollout

**Yes**, with conditions:

1. **Family-level opt-in**: Feature flag per family
2. **Conservative defaults**: Disabled by default in production
3. **User confirmation required**: Never auto-merge ambiguous locations
4. **Monitoring**: Track deterministic hit rate, fallback rate, latency
5. **Rate limiting**: Prevent cost overruns
6. **Fallback**: Application works without Jev (graceful degradation)

### Rollout Plan

| Phase | Scope | Duration |
|-------|-------|-----------|
| Pilot | Development/testing only | Current |
| Beta | Opt-in families (1-5 families) | 2-4 weeks |
| General | Feature flag for all families | TBD |

### Monitoring

Track these metrics in production:

- `deterministicHits` / `totalRequests` (should be 70-80%)
- `jevFallbacks` / `totalRequests` (should be 20-30%)
- `ambiguousCases` / `totalRequests` (should be <5%)
- `failedCases` / `totalRequests` (should be <1%)
- Average latency per normalization request

---

## Conclusion

**M5B.2 PILOT: SUCCESS**

- Location normalization infrastructure implemented
- 28 new tests passing
- All existing tests passing (421 total)
- Build: PASS
- Lint: 0 errors
- Privacy and security verified
- Graceful degradation confirmed

**Next Steps:**
- Controlled beta testing with opt-in families
- Monitor production usage patterns
- Gather user feedback on canonical values
- Refine known locations mapping based on actual usage

**STOP. M5B.3 NOT STARTED.**
