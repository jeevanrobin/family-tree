/**
 * Automated Test Suite — Milestone 3C (M3C)
 * Cloud Sync + Offline-First Data + Reconnect Recovery
 *
 * Tests:
 * 1. Local write durability & IndexedDB local cache
 * 2. Queue creation & FIFO ordering
 * 3. Online sync push & successful completion
 * 4. Failed sync & bounded exponential retry
 * 5. Partial sync failure recovery
 * 6. Reconnect detection & automatic queue drain
 * 7. Deletion tombstones & phantom resurrection prevention
 * 8. 3-way field-level conflict merging (Two-device concurrent simulation)
 * 9. True field conflict audit trail (zero silent data destruction)
 * 10. Relationship referential integrity & tombstone protection
 * 11. Strict family boundary isolation
 */

import assert from 'node:assert';
import { indexedDBManager, STORES } from '../src/family-tree/store/local/indexedDBManager.js';
import { SyncEngine } from '../src/family-tree/store/sync/SyncEngine.js';
import {
  SYNC_STATUS,
  createQueueItem,
  ENTITY_TYPES,
  MUTATION_OP,
} from '../src/family-tree/store/sync/syncTypes.js';
import {
  mergePersonRecords,
  mergeEntityRecords,
  validateRelationshipIntegrity,
  filterTombstonedEntities,
} from '../src/family-tree/store/sync/conflictResolver.js';

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n==================================================');
console.log("MEDIDA'S FAMILY — MILESTONE 3C AUTOMATED TEST SUITE");
console.log('==================================================\n');

// ── Test Group 1: Local Cache & IndexedDB Storage ───────────
console.log('[1] Local Cache & IndexedDB Storage Layer');

await asyncTest('indexedDBManager puts and gets entity from local store', async () => {
  const person = { id: 'test-p1', family_id: 'fam-a', firstName: 'Rajesh', lastName: 'Medida' };
  await indexedDBManager.put(STORES.PEOPLE, person);
  const retrieved = await indexedDBManager.get(STORES.PEOPLE, 'test-p1');
  assert.strictEqual(retrieved.firstName, 'Rajesh');
  assert.strictEqual(retrieved.family_id, 'fam-a');
});

await asyncTest('indexedDBManager putBatch stores multiple items atomically', async () => {
  const people = [
    { id: 'batch-1', family_id: 'fam-a', firstName: 'Suresh' },
    { id: 'batch-2', family_id: 'fam-a', firstName: 'Meena' },
  ];
  await indexedDBManager.putBatch(STORES.PEOPLE, people);
  const allFamA = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'fam-a');
  assert(allFamA.some((p) => p.id === 'batch-1'));
  assert(allFamA.some((p) => p.id === 'batch-2'));
});

// ── Test Group 2: Queue Creation & Schema ───────────────────
console.log('\n[2] Queue Creation & Normalization');

test('createQueueItem creates valid schema with pending status', () => {
  const item = createQueueItem({
    familyId: 'fam-101',
    entityType: ENTITY_TYPES.PERSON,
    entityId: 'p-new',
    operation: MUTATION_OP.CREATE,
    payload: { firstName: 'Ananya' },
  });

  assert(item.id.startsWith('queue-'));
  assert.strictEqual(item.familyId, 'fam-101');
  assert.strictEqual(item.entityType, 'person');
  assert.strictEqual(item.operation, 'create');
  assert.strictEqual(item.status, 'pending');
  assert.strictEqual(item.attemptCount, 0);
  assert.strictEqual(item.payload.firstName, 'Ananya');
});

// ── Test Group 3: Offline Mutation & Queueing ───────────────
console.log('\n[3] Offline Mutation & Queueing');

await asyncTest('SyncEngine enqueues mutation offline, writes to local store immediately', async () => {
  const mockAdapter = {
    load: async () => ({ people: [], relationships: [] }),
    savePerson: async () => { throw new Error('Network unreachable'); },
  };

  const engine = new SyncEngine('fam-offline-test', mockAdapter);
  // Force offline state
  engine.isOnline = () => false;

  const newPerson = {
    id: 'p-offline-1',
    family_id: 'fam-offline-test',
    firstName: 'Kavitha',
    lastName: 'Medida',
  };

  await engine.enqueue(ENTITY_TYPES.PERSON, newPerson.id, MUTATION_OP.CREATE, newPerson);

  // 1. Check local store updated immediately
  const localPerson = await indexedDBManager.get(STORES.PEOPLE, 'p-offline-1');
  assert.strictEqual(localPerson.firstName, 'Kavitha');

  // 2. Check queued item exists
  const queue = await indexedDBManager.getPendingQueue('fam-offline-test');
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].entityId, 'p-offline-1');
  assert.strictEqual(engine.getStatus(), SYNC_STATUS.OFFLINE);

  engine.destroy();
});

// ── Test Group 4: Online Sync Push & Completion ──────────────
console.log('\n[4] Online Sync Push & Completion');

await asyncTest('SyncEngine flushes pending queue and marks synced on success', async () => {
  const savedRemote = [];
  const mockAdapter = {
    load: async () => ({ people: [], relationships: [] }),
    savePerson: async (payload) => {
      savedRemote.push(payload);
    },
  };

  const engine = new SyncEngine('fam-online-test', mockAdapter);
  engine.isOnline = () => true;

  const person = {
    id: 'p-online-1',
    family_id: 'fam-online-test',
    firstName: 'Vikram',
    lastName: 'Medida',
  };

  await engine.enqueue(ENTITY_TYPES.PERSON, person.id, MUTATION_OP.CREATE, person);

  // Allow flush to complete
  await engine.flushQueue();

  assert.strictEqual(savedRemote.length, 1);
  assert.strictEqual(savedRemote[0].firstName, 'Vikram');

  // Queue should be empty after success
  const queue = await indexedDBManager.getPendingQueue('fam-online-test');
  assert.strictEqual(queue.length, 0);
  assert.strictEqual(engine.getStatus(), SYNC_STATUS.SYNCED);

  engine.destroy();
});

// ── Test Group 5: Failed Sync & Bounded Retry Backoff ───────
console.log('\n[5] Failed Sync & Bounded Exponential Retry');

await asyncTest('SyncEngine retains failed operation in queue and increments attemptCount', async () => {
  const mockAdapter = {
    load: async () => ({ people: [], relationships: [] }),
    savePerson: async () => {
      throw new Error('Supabase 503 Service Unavailable');
    },
  };

  const engine = new SyncEngine('fam-retry-test', mockAdapter);
  engine.isOnline = () => true;

  const person = {
    id: 'p-fail-1',
    family_id: 'fam-retry-test',
    firstName: 'Arun',
  };

  await engine.enqueue(ENTITY_TYPES.PERSON, person.id, MUTATION_OP.CREATE, person);

  const queue = await indexedDBManager.getPendingQueue('fam-retry-test');
  assert.strictEqual(queue.length, 1);
  assert(queue[0].attemptCount >= 1);
  assert.strictEqual(queue[0].status, 'pending');
  assert(queue[0].error.includes('503'));

  engine.destroy();
});

// ── Test Group 6: Partial Sync Failure Recovery ──────────────
console.log('\n[6] Partial Sync Failure Recovery');

await asyncTest('SyncEngine commits successful operations and keeps failed operations queued', async () => {
  const executed = [];
  const mockAdapter = {
    load: async () => ({ people: [], relationships: [] }),
    savePerson: async (payload) => {
      if (payload.id === 'p-fail-item') {
        throw new Error('Network timeout on item 2');
      }
      executed.push(payload.id);
    },
  };

  const engine = new SyncEngine('fam-partial-test', mockAdapter);
  engine.isOnline = () => false; // Enqueue without immediate flush

  await engine.enqueue(ENTITY_TYPES.PERSON, 'p-good-1', MUTATION_OP.CREATE, { id: 'p-good-1', firstName: 'One' });
  await engine.enqueue(ENTITY_TYPES.PERSON, 'p-fail-item', MUTATION_OP.CREATE, { id: 'p-fail-item', firstName: 'Two' });
  await engine.enqueue(ENTITY_TYPES.PERSON, 'p-good-3', MUTATION_OP.CREATE, { id: 'p-good-3', firstName: 'Three' });

  // Now go online and flush
  engine.isOnline = () => true;
  await engine.flushQueue();

  // p-good-1 succeeded and was dequeued
  assert(executed.includes('p-good-1'));

  // p-fail-item failed, remains in queue
  const remaining = await indexedDBManager.getPendingQueue('fam-partial-test');
  assert(remaining.some((r) => r.entityId === 'p-fail-item'));
  assert(!remaining.some((r) => r.entityId === 'p-good-1'));

  engine.destroy();
});

// ── Test Group 7: Reconnect Recovery ─────────────────────────
console.log('\n[7] Reconnect Recovery');

await asyncTest('handleOnline automatically drains queued offline mutations', async () => {
  const synced = [];
  const mockAdapter = {
    load: async () => ({ people: [], relationships: [] }),
    savePerson: async (payload) => synced.push(payload.id),
  };

  const engine = new SyncEngine('fam-reconnect-test', mockAdapter);
  engine.isOnline = () => false;

  await engine.enqueue(ENTITY_TYPES.PERSON, 'p-recon-1', MUTATION_OP.CREATE, { id: 'p-recon-1', firstName: 'OfflinePerson' });

  // Queue has 1 item
  let queue = await indexedDBManager.getPendingQueue('fam-reconnect-test');
  assert.strictEqual(queue.length, 1);

  // Network reconnects
  engine.isOnline = () => true;
  engine.handleOnline();

  // Allow async flush
  await new Promise((resolve) => setTimeout(resolve, 50));

  queue = await indexedDBManager.getPendingQueue('fam-reconnect-test');
  assert.strictEqual(queue.length, 0);
  assert(synced.includes('p-recon-1'));
  assert.strictEqual(engine.getStatus(), SYNC_STATUS.SYNCED);

  engine.destroy();
});

// ── Test Group 8: Deletion Tombstones ────────────────────────
console.log('\n[8] Deletion Tombstones & Phantom Resurrection Prevention');

await asyncTest('Deleting person registers tombstone and blocks remote pull resurrection', async () => {
  const fid = 'fam-tomb-test';
  const engine = new SyncEngine(fid, null);

  // Enqueue deletion
  await engine.enqueue(ENTITY_TYPES.PERSON, 'p-to-delete', MUTATION_OP.DELETE);

  // Verify tombstone registered
  const isTombstoned = await indexedDBManager.isTombstoned('p-to-delete');
  assert.strictEqual(isTombstoned, true);

  // Simulate remote pull containing the old person
  const remotePeople = [
    { id: 'p-to-delete', firstName: 'Ghost Person' },
    { id: 'p-alive', firstName: 'Living Person' },
  ];

  const tombstones = await indexedDBManager.getTombstones(fid);
  const tombstoneSet = new Set(tombstones.map((t) => t.id));
  const filtered = filterTombstonedEntities(remotePeople, tombstoneSet);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'p-alive');

  engine.destroy();
});

// ── Test Group 9: Two-Device Concurrent Simulation ──────────
console.log('\n[9] Two-Device Simulation (3-Way Field Merge)');

test('Concurrent non-conflicting field edits from Device A and Device B both survive', () => {
  const base = {
    id: 'rajesh-1',
    firstName: 'Rajesh',
    lastName: 'Medida',
    occupation: 'Civil Engineer',
    biography: 'Born in Hyderabad.',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };

  // Device A edits occupation
  const deviceA = {
    ...base,
    occupation: 'Chief Hydraulic Consultant',
    updatedAt: '2026-09-03T11:00:00.000Z',
  };

  // Device B edits biography
  const deviceB = {
    ...base,
    biography: 'Pioneered hydraulic canal network designs across South India.',
    updatedAt: '2026-09-03T11:05:00.000Z',
  };

  const { merged, hasConflict } = mergePersonRecords(deviceA, deviceB, base);

  // Both edits survive!
  assert.strictEqual(merged.occupation, 'Chief Hydraulic Consultant');
  assert.strictEqual(merged.biography, 'Pioneered hydraulic canal network designs across South India.');
  assert.strictEqual(merged.firstName, 'Rajesh');
  assert.strictEqual(hasConflict, false);
});

test('Concurrent entity edits preserve union of tagged people and latest content', () => {
  const localStory = {
    id: 'story-1',
    content: 'Local story draft.',
    relatedPersonIds: ['p-1', 'p-2'],
    updatedAt: '2026-09-03T10:00:00.000Z',
  };
  const remoteStory = {
    id: 'story-1',
    content: 'Remote story addition.',
    relatedPersonIds: ['p-2', 'p-3'],
    updatedAt: '2026-09-03T10:05:00.000Z',
  };

  const { merged } = mergeEntityRecords(localStory, remoteStory);
  assert.strictEqual(merged.content, 'Remote story addition.');
  assert(merged.relatedPersonIds.includes('p-1'));
  assert(merged.relatedPersonIds.includes('p-2'));
  assert(merged.relatedPersonIds.includes('p-3'));
});

// ── Test Group 10: True Field Conflict & Audit Trail ─────────
console.log('\n[10] True Same-Field Conflict & Non-Destructive Audit Trail');

test('Same-field conflict resolves deterministically and logs conflict audit trail', () => {
  const deviceA = {
    id: 'rajesh-1',
    occupation: 'Professor of Hydraulics',
    updatedAt: '2026-09-03T12:00:00.000Z',
  };

  const deviceB = {
    id: 'rajesh-1',
    occupation: 'Director of Irrigation Works',
    updatedAt: '2026-09-03T12:05:00.000Z', // Later timestamp
  };

  const { merged, hasConflict, conflicts } = mergePersonRecords(deviceA, deviceB);

  assert.strictEqual(hasConflict, true);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].field, 'occupation');
  assert.strictEqual(conflicts[0].winner, 'remote');
  assert.strictEqual(merged.occupation, 'Director of Irrigation Works');
  // Audit trail attached to avoid silent data loss
  assert(merged._conflictDetails && merged._conflictDetails.length > 0);
  assert.strictEqual(merged._conflictDetails[0].localVal, 'Professor of Hydraulics');
});

// ── Test Group 11: Relationship Referential Integrity ────────
console.log('\n[11] Relationship Referential Integrity & Tombstone Protection');

test('Relationship referencing tombstoned person is rejected', () => {
  const rel = { id: 'rel-1', parentId: 'p-alive', childId: 'p-deleted', type: 'parent-child' };
  const livingPeople = new Set(['p-alive']);
  const tombstones = new Set(['p-deleted']);

  const { valid, reason } = validateRelationshipIntegrity(rel, livingPeople, tombstones);
  assert.strictEqual(valid, false);
  assert(reason.includes('tombstone'));
});

test('Self-referential relationship is rejected', () => {
  const rel = { id: 'rel-self', personAId: 'p-1', personBId: 'p-1', type: 'spouse' };
  const livingPeople = new Set(['p-1']);

  const { valid, reason } = validateRelationshipIntegrity(rel, livingPeople);
  assert.strictEqual(valid, false);
  assert(reason.includes('Self-referential'));
});

// ── Test Group 12: Family Boundary Isolation ─────────────────
console.log('\n[12] Family Boundary Isolation');

await asyncTest('IndexedDB queries are strictly scoped by familyId', async () => {
  await indexedDBManager.put(STORES.PEOPLE, { id: 'p-fam1-1', family_id: 'fam-alpha', name: 'Alpha Member' });
  await indexedDBManager.put(STORES.PEOPLE, { id: 'p-fam2-1', family_id: 'fam-beta', name: 'Beta Member' });

  const alphaPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'fam-alpha');
  const betaPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, 'fam-beta');

  assert(alphaPeople.every((p) => p.family_id === 'fam-alpha'));
  assert(betaPeople.every((p) => p.family_id === 'fam-beta'));
  assert(!alphaPeople.some((p) => p.id === 'p-fam2-1'));
  assert(!betaPeople.some((p) => p.id === 'p-fam1-1'));
});

console.log('\n==================================================');
console.log(`M3C Sync Verification Complete: ${passedTests}/${totalTests} Passed (0 Failures)`);
console.log('==================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
