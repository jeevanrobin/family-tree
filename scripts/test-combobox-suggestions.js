/**
 * test-combobox-suggestions.js — Verification Suite
 * Medida's Family: Curated Location & Occupation Comboboxes
 */

import assert from 'node:assert';
import {
  CURATED_OCCUPATIONS,
  CURATED_LOCATIONS,
  getActiveFamilyLocations,
  getActiveFamilyOccupations,
  getRankedSuggestions,
} from '../src/family-tree/utils/suggestionData.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] Test ${passed + failed + 1}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${passed + failed + 1}: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY — LOCATION & OCCUPATION SUGGESTIONS");
console.log('==================================================');

// ── Group 1: Curated Vocabulary Preservation ──
console.log('\n── Group 1: Curated Vocabulary Exact Preservation ──');

runTest('Curated Occupations contains all required family occupations', () => {
  const expected = [
    'Farmer',
    'Driver',
    'Software Engineer',
    'Software Developer',
    'Software Architect',
    'Business Owner',
    'Business / Entrepreneur',
    'Government Employee',
    'Retired Government Employee',
    'Retired Employee',
    'Teacher',
    'Student',
  ];

  expected.forEach((occ) => {
    assert(CURATED_OCCUPATIONS.includes(occ), `Missing curated occupation: ${occ}`);
  });
  assert.strictEqual(CURATED_OCCUPATIONS.length, 12, 'Curated occupations should have exactly 12 items');
});

runTest('Curated Locations contains all required family locations with exact spelling', () => {
  const expected = [
    'Muthagudem',
    'Edulapuram',
    'Reddypalli',
    'M Venkatayapalem',
    'Kasirajugudem',
    'Kothapalli',
    'Satyanarayanapuram',
    'Suryapet',
    'Khammam',
    'Hyderabad',
    'Arempula',
    'Morampalli Banjara',
  ];

  expected.forEach((loc) => {
    assert(CURATED_LOCATIONS.includes(loc), `Missing curated location: ${loc}`);
  });
  assert.strictEqual(CURATED_LOCATIONS.length, 12, 'Curated locations should have exactly 12 items');
});

// ── Group 2: Search Matching & Tier Ranking ──
console.log('\n── Group 2: Search Matching & Tier Ranking ──');

runTest('Occupation search: "farm" yields "Farmer" first', () => {
  const res = getRankedSuggestions({ query: 'farm', type: 'occupation' });
  assert(res.length > 0, 'Should return matches');
  assert.strictEqual(res[0].value, 'Farmer', 'Farmer should rank first for "farm"');
});

runTest('Occupation search: "gov" yields "Government Employee" before "Retired Government Employee"', () => {
  const res = getRankedSuggestions({ query: 'gov', type: 'occupation' });
  const labels = res.map((r) => r.value);
  const govIdx = labels.indexOf('Government Employee');
  const retGovIdx = labels.indexOf('Retired Government Employee');

  assert(govIdx !== -1, 'Must include Government Employee');
  assert(retGovIdx !== -1, 'Must include Retired Government Employee');
  assert(govIdx < retGovIdx, 'Prefix match (Government Employee) must precede contains match (Retired Government Employee)');
});

runTest('Occupation search: "teach" yields "Teacher"', () => {
  const res = getRankedSuggestions({ query: 'teach', type: 'occupation' });
  assert(res.some((r) => r.value === 'Teacher'), 'Teacher must match "teach"');
});

runTest('Location search: "muth" yields "Muthagudem"', () => {
  const res = getRankedSuggestions({ query: 'muth', type: 'location' });
  assert(res.length > 0);
  assert.strictEqual(res[0].value, 'Muthagudem');
});

runTest('Location search: "hyd" yields "Hyderabad"', () => {
  const res = getRankedSuggestions({ query: 'hyd', type: 'location' });
  assert(res.length > 0);
  assert.strictEqual(res[0].value, 'Hyderabad');
});

runTest('Location search: "sur" yields "Suryapet"', () => {
  const res = getRankedSuggestions({ query: 'sur', type: 'location' });
  assert(res.some((r) => r.value === 'Suryapet'));
  assert.strictEqual(res[0].value, 'Suryapet', 'Suryapet prefix match ranks at top');
});

// ── Group 3: Custom Value Support & Zero Silently Altering ──
console.log('\n── Group 3: Custom Value Support & Zero Silently Altering ──');

runTest('Custom location "Chintur" returns zero exact curated matches but allows custom handling', () => {
  const res = getRankedSuggestions({ query: 'Chintur', type: 'location' });
  const exact = res.find((r) => r.value.toLowerCase() === 'chintur');
  assert(!exact, 'Chintur should not be in curated list');
});

runTest('Custom occupation "Handloom Weaver" returns zero exact curated matches', () => {
  const res = getRankedSuggestions({ query: 'Handloom Weaver', type: 'occupation' });
  const exact = res.find((r) => r.value.toLowerCase() === 'handloom weaver');
  assert(!exact, 'Handloom Weaver should not be in curated list');
});

// ── Group 4: Family-Scoped Learning & Frequency Prioritization ──
console.log('\n── Group 4: Family-Scoped Learning & Prioritization ──');

runTest('Derives locations from active family and prioritizes frequent values', () => {
  const mockStore = {
    getAllPersons: () => [
      { id: '1', familyId: 'fam-medida', placeOfBirth: 'Hyderabad', hometown: 'Muthagudem', currentLocation: 'Hyderabad' },
      { id: '2', familyId: 'fam-medida', placeOfBirth: 'Hyderabad', hometown: 'Muthagudem', currentLocation: 'Chintur' },
      { id: '3', familyId: 'fam-other', placeOfBirth: 'Delhi', hometown: 'Mumbai', currentLocation: 'Kolkata' }, // Other family
    ],
    getAllLifeEvents: () => [
      { id: 'e1', familyId: 'fam-medida', location: 'Hyderabad' },
    ],
    getAllStories: () => [
      { id: 's1', familyId: 'fam-medida', location: 'Edulapuram' },
    ],
  };

  // Active family "fam-medida"
  const locationsMap = getActiveFamilyLocations('fam-medida', mockStore);
  assert.strictEqual(locationsMap.get('hyderabad')?.count, 4, 'Hyderabad frequency should be 4');
  assert.strictEqual(locationsMap.get('muthagudem')?.count, 2, 'Muthagudem frequency should be 2');
  assert.strictEqual(locationsMap.get('chintur')?.count, 1, 'Learned custom location Chintur should be 1');
  assert(!locationsMap.has('delhi'), 'Other family locations (Delhi) must NOT be exposed');

  // Ranked suggestions with empty query should prioritize frequent active-family locations
  const ranked = getRankedSuggestions({
    query: '',
    type: 'location',
    activeFamilyId: 'fam-medida',
    storeInstance: mockStore,
  });

  assert.strictEqual(ranked[0].value, 'Hyderabad', 'Most frequent location (Hyderabad, count 4) should rank #1 on empty query');
});

runTest('Derives occupations from active family without exposing other families', () => {
  const mockStore = {
    getAllPersons: () => [
      { id: '1', familyId: 'fam-medida', occupation: 'Farmer' },
      { id: '2', familyId: 'fam-medida', occupation: 'Farmer' },
      { id: '3', familyId: 'fam-medida', occupation: 'Handloom Weaver' },
      { id: '4', familyId: 'fam-other', occupation: 'Astronaut' },
    ],
  };

  const occupationsMap = getActiveFamilyOccupations('fam-medida', mockStore);
  assert.strictEqual(occupationsMap.get('farmer')?.count, 2);
  assert.strictEqual(occupationsMap.get('handloom weaver')?.count, 1);
  assert(!occupationsMap.has('astronaut'), 'Other family occupations must NOT be exposed');
});

// ── Group 5: Empty Query Limits ──
console.log('\n── Group 5: Empty Query Limits & Clean Display ──');

runTest('Empty query returns concise list without displaying hundreds of generic items', () => {
  const resLocations = getRankedSuggestions({ query: '', type: 'location', limit: 10 });
  const resOccupations = getRankedSuggestions({ query: '', type: 'occupation', limit: 12 });

  assert(resLocations.length <= 10, 'Locations list should respect limit');
  assert(resOccupations.length <= 12, 'Occupations list should respect limit');
});

console.log('\n==================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} tests passed`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
