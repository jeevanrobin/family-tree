/**
 * Idempotent cloud writes: a retried create must not duplicate rows, and
 * person links (junction rows) are replaced by the row UUID.
 *
 * Uses a tiny in-memory fake of the Supabase query builder.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = {};

function makeQuery(table) {
  const state = { table, filters: [], op: 'select', payload: null, limit: null, order: null };
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
    if (state.order) {
      const { col, ascending } = state.order;
      found.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (ascending ? 1 : -1));
    }
    return { data: state.limit ? found.slice(0, state.limit) : found, error: null };
  };

  const q = {
    select: () => q,
    insert: (payload) => { state.op = 'insert'; state.payload = payload; return q; },
    update: (payload) => { state.op = 'update'; state.payload = payload; return q; },
    delete: () => { state.op = 'delete'; return q; },
    eq: (col, val) => { state.filters.push([col, val]); return q; },
    limit: (n) => { state.limit = n; return q; },
    order: (col, opts = {}) => { state.order = { col, ascending: opts.ascending !== false }; return q; },
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

describe('SupabaseAdapter partial person updates', () => {
  let adapter;

  beforeEach(() => {
    for (const key of Object.keys(db)) delete db[key];
    adapter = new SupabaseAdapter(FID);
    adapter._validateSessionAndScope = vi.fn().mockResolvedValue({ userId: 'u1', role: 'owner' });
  });

  it('updates only the changed columns, preserving a concurrent edit to another field', async () => {
    await adapter.savePerson({ id: 'p1', firstName: 'Ravi', occupation: 'Teacher', hometown: 'Warangal', _isNew: true });
    // Another family member changes the hometown in the cloud.
    db.family_members[0].hometown = 'Hyderabad';

    // This client edited only the occupation, from a stale copy.
    await adapter.savePerson({
      id: 'p1', firstName: 'Ravi', occupation: 'Principal', hometown: 'Warangal', _changedFields: ['occupation'],
    });

    expect(db.family_members[0].occupation).toBe('Principal');
    expect(db.family_members[0].hometown).toBe('Hyderabad');
  });

  it('writes the full row when no field information is given', async () => {
    await adapter.savePerson({ id: 'p1', firstName: 'Ravi', hometown: 'Warangal', _isNew: true });
    db.family_members[0].hometown = 'Hyderabad';

    await adapter.savePerson({ id: 'p1', firstName: 'Ravi', hometown: 'Warangal' });

    expect(db.family_members[0].hometown).toBe('Warangal');
  });

  it('skips the cloud write when nothing stored in the cloud changed', async () => {
    await adapter.savePerson({ id: 'p1', firstName: 'Ravi', _isNew: true });

    const saved = await adapter.savePerson({ id: 'p1', firstName: 'Ravi', _changedFields: [] });

    expect(saved.firstName).toBe('Ravi');
  });
});

describe('SupabaseAdapter voice stories', () => {
  let adapter;

  beforeEach(() => {
    for (const key of Object.keys(db)) delete db[key];
    adapter = new SupabaseAdapter(FID);
    adapter._validateSessionAndScope = vi.fn().mockResolvedValue({ userId: 'u1', role: 'owner' });
    adapter._verifyPersonsBelongToFamily = vi.fn().mockResolvedValue(true);
  });

  it('saves and reads back the recording fields', async () => {
    const saved = await adapter.saveStory({
      id: 'story-v', personId: 'uuid-p1', title: 'Floods', content: '(Voice recording)', relatedPersonIds: [],
      audioPath: `family/${FID}/audio/voice-1.webm`, audioMimeType: 'audio/webm', audioDurationSec: 95, transcriptLanguage: 'te-IN',
      _isNew: true,
    });
    expect(db.stories[0]).toMatchObject({ audio_path: `family/${FID}/audio/voice-1.webm`, audio_duration_sec: 95 });
    expect(saved).toMatchObject({ audioPath: `family/${FID}/audio/voice-1.webm`, audioDurationSec: 95, transcriptLanguage: 'te-IN' });
  });

  it('does not send audio columns for text stories (works before migration 010)', async () => {
    await adapter.saveStory({ id: 'story-t', personId: 'uuid-p1', title: 'Text', content: 'Hello', relatedPersonIds: [], _isNew: true });
    expect(Object.keys(db.stories[0]).some((k) => k.startsWith('audio_') || k === 'transcript_language')).toBe(false);
  });
});

describe('SupabaseAdapter relationship loading', () => {
  it('keeps the relationship type so a fresh device can draw the tree', async () => {
    for (const key of Object.keys(db)) delete db[key];
    const adapter = new SupabaseAdapter(FID);
    adapter._validateSessionAndScope = vi.fn().mockResolvedValue({ userId: 'u1', role: 'owner' });
    adapter._verifyPersonsBelongToFamily = vi.fn().mockResolvedValue(true);
    const saved = await adapter.saveRelationship({ id: 'rel-1', type: 'spouse', personAId: 'uuid-a', personBId: 'uuid-b', _isNew: true });
    expect(saved.type).toBe('spouse');
    const child = await adapter.saveRelationship({ id: 'rel-2', type: 'parent-child', parentId: 'uuid-a', childId: 'uuid-c', _isNew: true });
    expect(child).toMatchObject({ type: 'parent-child', parentId: 'uuid-a', childId: 'uuid-c' });
  });
});

describe('SupabaseAdapter change log', () => {
  it('converts server log rows into history entries with local ids', async () => {
    for (const key of Object.keys(db)) delete db[key];
    const adapter = new SupabaseAdapter(FID);
    adapter._validateSessionAndScope = vi.fn().mockResolvedValue({ userId: 'u1', role: 'owner' });
    db.family_members = [{ id: 'uuid-a', local_id: 'person-a', family_id: FID }];
    const person = (extra) => ({ id: 'uuid-a', local_id: 'person-a', family_id: FID, first_name: 'Ravi', display_name: 'Ravi', occupation: 'Farmer', ...extra });
    db.family_change_log = [
      { id: 1, family_id: FID, table_name: 'family_members', action: 'INSERT', row_id: 'uuid-a', old_data: null, new_data: person(), changed_by_name: 'Lakshmi', changed_at: '2026-09-01T10:00:00Z' },
      { id: 2, family_id: FID, table_name: 'family_members', action: 'UPDATE', row_id: 'uuid-a', old_data: person(), new_data: person({ occupation: 'Teacher' }), changed_by_name: 'Suresh', changed_at: '2026-09-02T10:00:00Z' },
      { id: 3, family_id: FID, table_name: 'relationships', action: 'DELETE', row_id: 'uuid-r', old_data: { id: 'uuid-r', local_id: 'rel-1', family_id: FID, type: 'spouse', person_id_1: 'uuid-a', person_id_2: 'uuid-gone' }, new_data: null, changed_by_name: null, changed_at: '2026-09-03T10:00:00Z' },
    ];

    const entries = await adapter.loadChangeLog();
    expect(entries.map((e) => e.id)).toEqual(['srv-3', 'srv-2', 'srv-1']); // newest first
    expect(entries[1]).toMatchObject({ action: 'update', entityType: 'person', entityId: 'person-a', actor: 'Suresh', fields: ['occupation'] });
    expect(entries[1].before.occupation).toBe('Farmer');
    expect(entries[0]).toMatchObject({ action: 'delete', entityType: 'relationship', actor: 'A family member' });
    expect(entries[0].before).toMatchObject({ type: 'spouse', personAId: 'person-a' });
  });
});
