/**
 * Migration Engine — where the family was born and where they live now.
 *
 * A "move" is a person whose place of birth differs from where they live
 * (current location, else hometown). Places are matched on their first
 * comma-separated part, case-insensitively, so "Hyderabad" and
 * "Hyderabad, Telangana" are the same place.
 */

export const placeKey = (name) =>
  String(name || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const livesIn = (p) => p.currentLocation || p.hometown || '';

/**
 * @param {Array} people
 * @param {Map<string, number>} [generationOf] personId -> generation index (0 = oldest)
 * @returns {{
 *   places: Array<{ key, name, born: string[], living: string[] }>,
 *   moves: Array<{ from, to, fromName, toName, people: string[], generations: number[] }>,
 *   unplaced: string[],
 * }} places sorted by number of people, moves by number of people
 */
export function buildMigrationSummary(people, generationOf = new Map()) {
  const places = new Map();
  const place = (name) => {
    const key = placeKey(name);
    if (!key) return null;
    if (!places.has(key)) places.set(key, { key, name: String(name).trim(), born: [], living: [] });
    return places.get(key);
  };
  const moves = new Map();
  const unplaced = [];

  people.forEach((p) => {
    const id = String(p.id);
    const birth = place(p.placeOfBirth);
    const home = place(livesIn(p));
    if (birth) birth.born.push(id);
    if (home) home.living.push(id);
    if (!birth && !home) unplaced.push(id);

    if (birth && home && birth.key !== home.key) {
      const key = `${birth.key}→${home.key}`;
      if (!moves.has(key)) {
        moves.set(key, { from: birth.key, to: home.key, fromName: birth.name, toName: home.name, people: [], generations: [] });
      }
      const move = moves.get(key);
      move.people.push(id);
      const gen = generationOf.get(id) ?? generationOf.get(p.id);
      if (gen !== undefined && !move.generations.includes(gen)) move.generations.push(gen);
    }
  });

  const count = (pl) => new Set([...pl.born, ...pl.living]).size;
  return {
    places: [...places.values()].sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name)),
    moves: [...moves.values()]
      .map((m) => ({ ...m, generations: m.generations.sort((a, b) => a - b) }))
      .sort((a, b) => b.people.length - a.people.length || a.fromName.localeCompare(b.fromName)),
    unplaced,
  };
}

// ── Geocoding (OpenStreetMap Nominatim) ──────────────────────
// Only place names are sent. Results are cached on the device, and requests
// are spaced to respect Nominatim's usage policy (max 1 per second).

const CACHE_KEY = 'family-tree-geocode-cache-v1';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export function loadGeocodeCache(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    return JSON.parse(storage?.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveGeocodeCache(cache, storage) {
  try {
    storage?.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or unavailable */
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Look up coordinates for place names.
 * @param {string[]} names
 * @param {{ fetchImpl?: Function, storage?: Storage, delayMs?: number, countryHint?: string, onProgress?: Function }} [options]
 * @returns {Promise<Record<string, {lat: number, lng: number, label: string} | null>>} by placeKey
 */
export async function geocodePlaces(names, options = {}) {
  const {
    fetchImpl = typeof fetch !== 'undefined' ? fetch : null,
    storage = typeof localStorage !== 'undefined' ? localStorage : null,
    delayMs = 1100,
    countryHint = 'in',
    onProgress,
  } = options;
  const cache = loadGeocodeCache(storage);
  const result = {};
  const pending = [];
  [...new Set(names.filter(Boolean))].forEach((name) => {
    const key = placeKey(name);
    if (!key) return;
    if (key in cache) result[key] = cache[key];
    else if (!pending.some((p) => p.key === key)) pending.push({ key, name });
  });

  for (let i = 0; i < pending.length; i++) {
    const { key, name } = pending[i];
    onProgress?.({ done: i, total: pending.length, name });
    if (i > 0) await sleep(delayMs);
    let hit = null;
    for (const country of countryHint ? [countryHint, null] : [null]) {
      const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(name)}${country ? `&countrycodes=${country}` : ''}`;
      try {
        const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const [first] = await res.json();
        if (first) {
          hit = { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name };
          break;
        }
      } catch (err) {
        onProgress?.({ done: i, total: pending.length, name, error: err.message });
        hit = undefined; // network problem: don't cache, try again next time
        break;
      }
    }
    if (hit !== undefined) {
      cache[key] = hit;
      result[key] = hit;
    }
  }
  saveGeocodeCache(cache, storage);
  onProgress?.({ done: pending.length, total: pending.length });
  return result;
}
