/**
 * Idempotent cloud writes: a retried create must not duplicate rows, and
 * person links (junction rows) are replaced by the row UUID.
 *
 * Uses a tiny in-memory fake of the Supabase query builder.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = {};

function makeQuery(table) {
  const state = { table, filters: [], op: 'select', payload: null, limit: null };
  const rows = () => (db[table] ||= []);
  const matches = (row) => state.filters.every(([col, val]) => String(row[col]) === String(val));

  const run = () => {
    if (state.op === 'insert') {
      const items = (Array.isArray(state.payload) ? state.payload : [state.payload]).map((r) => ({
        id: r.id || `uuid-${table}-${rows().length + 1}`,
        ...r,
      }));
      for (const item of items) {
        const pk = table.endsWith('_persons') ? Object.values(item).slice(1).join('|') : null;
        if (pk && rows().some((r) => Object.values(r).slice(1).join('|') === pk)) {
          return { data: null, error: { message: 'duplicate key value violates unique constraint' } };
        }
        rows().push(item);
      }
      return { data: items, error: null };
    }
    if (state.op === 'update') {
      const updated = rows().filter(matches).map((r) => Object.assign(r, state.payload));
      return { data: updated, error: null };
    }
    if (state.op === 'delete') {
      db[table] = rows().filter((r) => !matches(r));
      return { data: null, error: null };
    }
    const found = rows().filter(matches);
    return { data: state.limit ? found.slice(0, state.limit) : found, error: null };
  };

  const q = {
    select: () => q,
    insert: (payload) => { state.op = 'insert'; state.payload = payload; return q; },
    update: (payload) => { state.op = 'update'; state.payload = payload; return q; },
    delete: () => { state.op = 'delete'; return q; },
    eq: (col, val) => { state.filters.push([col, val]); return q; },
    limit: (n) => { state.limit = n; return q; },
    single: async () => {
      const res = run();
      return res.error ? res : { data: res.data[0] ?? null, error: null };
    },
    then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
  };
  return q;
}

vi.mock('../../../src/family-tree/lib/supabaseClient.js', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn((table) => makeQuery(table)),
    rpc: vi.fn(),
  },
}));

const { SupabaseAdapter } = await import('../../../src/family-tree/store/repository/SupabaseAdapter.js');

const FID = 'family-1';

describe('SupabaseAdapter idempotent writes', () => {
  let adapter;

  beforeEach(() => {
    for (const key of Object.keys(db)) delete db[key];
    adapter = new SupabaseAdapter(FID);
    adapter._validateSessionAndScope = vi.fn().mockResolvedValue({ userId: 'u1', role: 'owner' });
    adapter._verifyPersonsBelongToFamily = vi.fn().mockResolvedValue(true);
  });

  it('a retried person create updates the existing row instead of duplicating it', async () => {
    const person = { id: 'person-1', firstName: 'Ananya', _isNew: true };

    const first = await adapter.savePerson(person);
    const retry = await adapter.savePerson({ ...person, firstName: 'Ananya R' });

    expect(db.family_members).toHaveLength(1);
    expect(retry.uuid).toBe(first.uuid);
    expect(db.family_members[0].first_name).toBe('Ananya R');
  });

  it('creates separate rows for different local IDs', async () => {
    await adapter.savePerson({ id: 'person-1', firstName: 'A', _isNew: true });
    await adapter.savePerson({ id: 'person-2', firstName: 'B', _isNew: true });

    expect(db.family_members).toHaveLength(2);
  });

  it('updating a story replaces its person links instead of failing on duplicates', async () => {
    const story = { id: 'story-1', personId: 'uuid-p1', title: 'Wedding', relatedPersonIds: ['uuid-p1', 'uuid-p2'] };

    await adapter.saveStory({ ...story, _isNew: true });
    await expect(adapter.saveStory({ ...story, title: 'Wedding day' })).resolves.toBeTruthy();

    expect(db.stories).toHaveLength(1);
    expect(db.story_persons).toHaveLength(2);
  });

  it('a retried story create does not duplicate the story or its links', async () => {
    const story = { id: 'story-1', personId: 'uuid-p1', title: 'Wedding', relatedPersonIds: ['uuid-p1'], _isNew: true };

    await adapter.saveStory(story);
    await adapter.saveStory(story);

    expect(db.stories).toHaveLength(1);
    expect(db.story_persons).toHaveLength(1);
  });

  it('ignores repeated person IDs in related people', async () => {
    await adapter.saveStory({
      id: 'story-1', personId: 'uuid-p1', title: 'T', relatedPersonIds: ['uuid-p1', 'uuid-p1'], _isNew: true,
    });

    expect(db.story_persons).toHaveLength(1);
  });
});
