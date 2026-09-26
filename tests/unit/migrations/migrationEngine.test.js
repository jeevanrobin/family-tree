import { describe, it, expect, vi } from 'vitest';
import { buildMigrationSummary, geocodePlaces, placeKey } from '../../../src/family-tree/migrations/migrationEngine.js';

const people = [
  { id: 'a', placeOfBirth: 'Muthagudem', currentLocation: 'Muthagudem' },
  { id: 'b', placeOfBirth: 'Muthagudem', currentLocation: 'Ameenapuram' },
  { id: 'c', placeOfBirth: 'Muthagudem, Telangana', currentLocation: 'Ameenapuram' },
  { id: 'd', placeOfBirth: 'Kothapalli', currentLocation: 'Suryapet' },
  { id: 'e', placeOfBirth: '', hometown: 'Khammam' },
  { id: 'f' },
];
const gens = new Map([['a', 2], ['b', 3], ['c', 3], ['d', 4]]);

describe('buildMigrationSummary', () => {
  const summary = buildMigrationSummary(people, gens);

  it('groups places by their first part, case-insensitively', () => {
    expect(placeKey('Hyderabad, Telangana')).toBe('hyderabad');
    const muth = summary.places.find((p) => p.key === 'muthagudem');
    expect(muth.born.sort()).toEqual(['a', 'b', 'c']);
    expect(muth.living).toEqual(['a']);
    expect(summary.places[0].key).toBe('muthagudem'); // most people first
  });

  it('counts moves from birthplace to current home with generations', () => {
    expect(summary.moves[0]).toMatchObject({ from: 'muthagudem', to: 'ameenapuram', people: ['b', 'c'], generations: [3] });
    expect(summary.moves.map((m) => `${m.from}→${m.to}`)).toEqual(['muthagudem→ameenapuram', 'kothapalli→suryapet']);
  });

  it('uses hometown when there is no current location and lists people without places', () => {
    expect(summary.places.find((p) => p.key === 'khammam').living).toEqual(['e']);
    expect(summary.unplaced).toEqual(['f']);
  });
});

describe('geocodePlaces', () => {
  const memoryStorage = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  };

  it('looks places up once, prefers the country hint, and caches results', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () => (url.includes('Muthagudem') ? [{ lat: '17.1', lon: '80.2', display_name: 'Muthagudem, Telangana, India' }] : []),
    }));
    const storage = memoryStorage();
    const out = await geocodePlaces(['Muthagudem', 'muthagudem, Telangana', 'Atlantis'], { fetchImpl, storage, delayMs: 0 });
    expect(out.muthagudem).toMatchObject({ lat: 17.1, lng: 80.2 });
    expect(out.atlantis).toBeNull();
    expect(fetchImpl.mock.calls[0][0]).toContain('countrycodes=in');
    // Atlantis: once with the hint, once without.
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    const again = await geocodePlaces(['Muthagudem', 'Atlantis'], { fetchImpl, storage, delayMs: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(again.muthagudem.lat).toBe(17.1);
  });

  it('does not cache network failures', async () => {
    const storage = memoryStorage();
    const failing = vi.fn(async () => { throw new Error('offline'); });
    const out = await geocodePlaces(['Suryapet'], { fetchImpl: failing, storage, delayMs: 0 });
    expect(out).toEqual({});
    const ok = vi.fn(async () => ({ ok: true, json: async () => [{ lat: '17.14', lon: '79.62', display_name: 'Suryapet' }] }));
    const out2 = await geocodePlaces(['Suryapet'], { fetchImpl: ok, storage, delayMs: 0 });
    expect(out2.suryapet.lat).toBe(17.14);
  });
});
