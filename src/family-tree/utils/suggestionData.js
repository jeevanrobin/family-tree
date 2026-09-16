/**
 * suggestionData.js — Curated & Family-Scoped Suggestions
 * Medida's Family Platform
 *
 * Provides curated family occupations and locations, plus dynamic learning
 * from active family records with frequency ranking and custom value support.
 */

import familyStore from '../store/FamilyStore.js';

export const CURATED_OCCUPATIONS = Object.freeze([
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
]);

export const CURATED_LOCATIONS = Object.freeze([
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
]);

/**
 * Extracts distinct locations used within the ACTIVE family,
 * counting frequency for ranking.
 *
 * @param {string|null} activeFamilyId
 * @param {object} storeInstance
 * @returns {Map<string, { label: string, count: number }>}
 */
export function getActiveFamilyLocations(activeFamilyId = null, storeInstance = familyStore) {
  const frequencyMap = new Map();

  if (!storeInstance) return frequencyMap;

  const people = storeInstance.getAllPersons?.() || Array.from(storeInstance.people?.values?.() || []);
  const events = storeInstance.getAllLifeEvents?.() || storeInstance.lifeEvents || [];
  const stories = storeInstance.getAllStories?.() || storeInstance.stories || [];

  const addLocation = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const lowerKey = trimmed.toLowerCase();
    const existing = frequencyMap.get(lowerKey);
    if (existing) {
      existing.count += 1;
    } else {
      frequencyMap.set(lowerKey, { label: trimmed, count: 1 });
    }
  };

  // 1. People records in active family
  people.forEach((p) => {
    const pFid = p.family_id || p.familyId;
    if (activeFamilyId && pFid && pFid !== activeFamilyId) return;

    addLocation(p.placeOfBirth);
    addLocation(p.hometown);
    addLocation(p.currentLocation);
  });

  // 2. Life Event records in active family
  events.forEach((ev) => {
    const eFid = ev.family_id || ev.familyId;
    if (activeFamilyId && eFid && eFid !== activeFamilyId) return;

    addLocation(ev.location);
  });

  // 3. Story records in active family
  stories.forEach((st) => {
    const sFid = st.family_id || st.familyId;
    if (activeFamilyId && sFid && sFid !== activeFamilyId) return;

    addLocation(st.location);
  });

  return frequencyMap;
}

/**
 * Extracts distinct occupations used within the ACTIVE family.
 *
 * @param {string|null} activeFamilyId
 * @param {object} storeInstance
 * @returns {Map<string, { label: string, count: number }>}
 */
export function getActiveFamilyOccupations(activeFamilyId = null, storeInstance = familyStore) {
  const frequencyMap = new Map();

  if (!storeInstance) return frequencyMap;

  const people = storeInstance.getAllPersons?.() || Array.from(storeInstance.people?.values?.() || []);

  const addOccupation = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const lowerKey = trimmed.toLowerCase();
    const existing = frequencyMap.get(lowerKey);
    if (existing) {
      existing.count += 1;
    } else {
      frequencyMap.set(lowerKey, { label: trimmed, count: 1 });
    }
  };

  people.forEach((p) => {
    const pFid = p.family_id || p.familyId;
    if (activeFamilyId && pFid && pFid !== activeFamilyId) return;

    addOccupation(p.occupation);
  });

  return frequencyMap;
}

/**
 * Suggestion priority ranking:
 * 1. Exact match
 * 2. Prefix match
 * 3. Contains match
 * 4. Frequently used family value
 * 5. Curated suggestion
 *
 * @param {object} options
 * @param {string} options.query - search query
 * @param {'location'|'occupation'} options.type
 * @param {string|null} [options.activeFamilyId]
 * @param {object} [options.storeInstance]
 * @param {number} [options.limit=12]
 * @returns {Array<{ value: string, isCurated: boolean, familyCount: number }>}
 */
export function getRankedSuggestions({
  query = '',
  type = 'location',
  activeFamilyId = null,
  storeInstance = familyStore,
  limit = 12,
} = {}) {
  const isLocation = type === 'location';
  const curatedList = isLocation ? CURATED_LOCATIONS : CURATED_OCCUPATIONS;

  const familyFreqMap = isLocation
    ? getActiveFamilyLocations(activeFamilyId, storeInstance)
    : getActiveFamilyOccupations(activeFamilyId, storeInstance);

  // Build master candidate pool: Curated + Family
  // Keyed by lowercase string to prevent duplicate case variations while preserving exact casing
  const candidateMap = new Map();

  // 1. Add curated list
  curatedList.forEach((item, idx) => {
    const lower = item.toLowerCase();
    candidateMap.set(lower, {
      value: item,
      isCurated: true,
      curatedOrder: idx,
      familyCount: 0,
    });
  });

  // 2. Add / augment with family values
  familyFreqMap.forEach(({ label, count }, lower) => {
    const existing = candidateMap.get(lower);
    if (existing) {
      existing.familyCount = count;
      // Prefer family casing if it's already curated or keep curated
    } else {
      candidateMap.set(lower, {
        value: label,
        isCurated: false,
        curatedOrder: 999,
        familyCount: count,
      });
    }
  });

  const allCandidates = Array.from(candidateMap.values());
  const q = (query || '').trim().toLowerCase();

  // EMPTY QUERY: return curated + frequently used family values
  if (!q) {
    const sorted = [...allCandidates].sort((a, b) => {
      // For locations, prioritize frequently used active-family values first
      if (isLocation) {
        if (b.familyCount !== a.familyCount) {
          return b.familyCount - a.familyCount;
        }
      }
      // Then curated order
      if (a.isCurated && b.isCurated) {
        return a.curatedOrder - b.curatedOrder;
      }
      if (a.isCurated !== b.isCurated) {
        return a.isCurated ? -1 : 1;
      }
      if (b.familyCount !== a.familyCount) {
        return b.familyCount - a.familyCount;
      }
      return a.value.localeCompare(b.value);
    });

    return sorted.slice(0, limit);
  }

  // NON-EMPTY QUERY: Filter and Rank
  const matched = [];

  for (const cand of allCandidates) {
    const valLower = cand.value.toLowerCase();
    let matchTier = 0; // 1 = exact, 2 = prefix, 3 = contains

    if (valLower === q) {
      matchTier = 1;
    } else if (valLower.startsWith(q)) {
      matchTier = 2;
    } else if (valLower.includes(q)) {
      matchTier = 3;
    }

    if (matchTier > 0) {
      matched.push({
        ...cand,
        matchTier,
      });
    }
  }

  // Sort by priority:
  // 1. matchTier (Exact > Prefix > Contains)
  // 2. Curated suggestions before custom/non-curated suggestions
  // 3. Family frequency among curated or among non-curated
  // 4. Curated order
  // 5. Length & Alphabetical
  matched.sort((a, b) => {
    if (a.matchTier !== b.matchTier) {
      return a.matchTier - b.matchTier;
    }

    // Curated suggestions rank before non-curated (e.g. Suryapet before Sur... family locations)
    if (a.isCurated !== b.isCurated) {
      return a.isCurated ? -1 : 1;
    }

    // Among candidates of the same curation status, higher family frequency ranks first
    if (b.familyCount !== a.familyCount) {
      return b.familyCount - a.familyCount;
    }

    // Then curated suggestions predefined order
    if (a.isCurated && b.isCurated) {
      return a.curatedOrder - b.curatedOrder;
    }

    // Shorter closer matches before longer matches
    if (a.value.length !== b.value.length) {
      return a.value.length - b.value.length;
    }

    return a.value.localeCompare(b.value);
  });

  return matched.slice(0, limit);
}
