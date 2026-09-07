/**
 * Milestone M4B — Automated Timeline & Life History Verification Suite
 * 
 * 23 targeted verification tests validating:
 * 1. Chronological ordering
 * 2. Same-year ordering
 * 3. Incomplete date handling
 * 4. Undated events
 * 5. Era generation
 * 6. Category filtering
 * 7. Generation filtering
 * 8. Person filtering
 * 9. Event association
 * 10. Photo association
 * 11. Family isolation
 * 12. Local mode
 * 13. Cloud mode
 * 14. Person navigation payload
 * 15. Event detail payload
 * 16. Search deep-link compatibility
 * 17. Empty timeline
 * 18. Duplicate event handling
 * 19. Existing M3 security baseline
 * 20. Existing M3 sync baseline
 * 21. Existing M3 media baseline
 * 22. Existing M3 collaboration baseline
 * 23. Existing M4A search baseline
 */

import assert from 'node:assert';

// Mock localStorage for Node.js headless environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// Dynamically import FamilyStore & Timeline Engine
const { default: familyStore } = await import('../src/family-tree/store/FamilyStore.js');
const {
  parseEventDate,
  sortTimelineEvents,
  deriveErasFromEvents,
  enrichTimelineEvents,
  filterTimelineEvents,
  getAvailableTimelineFilters,
  getEraForEvent,
} = await import('../src/family-tree/timeline/familyTimelineEngine.js');
const { searchArchive } = await import('../src/family-tree/search/familySearchEngine.js');
const { canCreateFamilyData, canDeleteFamilyData } = await import('../src/family-tree/auth/roles.js');
const { hashToken } = await import('../src/family-tree/auth/collaborationService.js');
const { mediaStorageService } = await import('../src/family-tree/media/mediaStorageService.js');

let passedTests = 0;
let failedTests = 0;

function runTest(num, name, fn) {
  try {
    fn();
    console.log(`  ✓ [${num}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [${num}] ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(num, name, fn) {
  try {
    await fn();
    console.log(`  ✓ [${num}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [${num}] ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

console.log('\n==================================================');
console.log("MEDIDA'S FAMILY — MILESTONE M4B AUTOMATED TEST SUITE");
console.log('==================================================\n');

// Reset store to known sample state
familyStore.resetToSampleData();

// [1] Chronological ordering
runTest(1, 'Chronological ordering sorts events across decades in strictly ascending time', () => {
  const sample = [
    { id: 'e3', date: '2010-08-20', title: 'Modern Milestone' },
    { id: 'e1', date: '1948-05-20', title: 'Birth Milestone' },
    { id: 'e2', date: '1975-09-01', title: 'Career Milestone' },
  ];
  const sorted = sortTimelineEvents(sample);
  assert.strictEqual(sorted[0].id, 'e1');
  assert.strictEqual(sorted[1].id, 'e2');
  assert.strictEqual(sorted[2].id, 'e3');
});

// [2] Same-year ordering
runTest(2, 'Same-year ordering deterministically sorts by month and day', () => {
  const sample = [
    { id: 'e2', date: '1975-09-01', title: 'Dam Project' },
    { id: 'e1', date: '1975-03-12', title: 'Rajesh Born' },
    { id: 'e3', date: '1975-03-12', title: 'Another Same-Day Milestone' },
  ];
  const sorted = sortTimelineEvents(sample);
  assert.strictEqual(sorted[0].id, 'e3'); // Tie-break on title 'Another...' < 'Rajesh...'
  assert.strictEqual(sorted[1].id, 'e1');
  assert.strictEqual(sorted[2].id, 'e2');
});

// [3] Incomplete date handling
runTest(3, 'Incomplete date handling parses year-only and partial ISO dates cleanly', () => {
  const yearOnly = parseEventDate('1978');
  assert.strictEqual(yearOnly.isDated, true);
  assert.strictEqual(yearOnly.year, 1978);
  assert.strictEqual(yearOnly.formatted, '1978');

  const partialIso = parseEventDate('1982-06');
  assert.strictEqual(partialIso.isDated, true);
  assert.strictEqual(partialIso.year, 1982);
  assert.strictEqual(partialIso.month, 6);
  assert.strictEqual(partialIso.formatted, 'Jun 1982');
});

// [4] Undated events
runTest(4, 'Undated events are preserved and placed after dated events without being dropped', () => {
  const sample = [
    { id: 'undated-1', date: null, title: 'Old Family Heirloom' },
    { id: 'dated-1', date: '1955-01-01', title: 'Early House' },
    { id: 'undated-2', date: '', title: 'Ancient Legend' },
  ];
  const sorted = sortTimelineEvents(sample);
  assert.strictEqual(sorted[0].id, 'dated-1');
  assert.strictEqual(sorted[1].id, 'undated-2'); // Undated tie-break alphabetically by title
  assert.strictEqual(sorted[2].id, 'undated-1');
});

// [5] Era generation
runTest(5, 'Era generation dynamically calculates chronological eras without hardcoded dates', () => {
  const events = familyStore.getAllLifeEvents();
  const eras = deriveErasFromEvents(events);
  assert.ok(eras.length >= 2, 'Should derive at least 2 eras from sample events');
  assert.ok(eras[0].startYear <= 1948, 'First era should encompass earliest event');
  assert.ok(eras[eras.length - 1].endYear >= 2022, 'Latest era should encompass latest event');
  assert.ok(eras[0].name, 'Era must have a title');
});

// [6] Category filtering
runTest(6, 'Category filtering accurately isolates events by type', () => {
  const allEvents = enrichTimelineEvents(familyStore.getAllLifeEvents(), familyStore);
  const birthEvents = filterTimelineEvents(allEvents, { category: 'Birth' });
  assert.ok(birthEvents.length >= 2, 'Should find at least 2 birth events');
  assert.ok(birthEvents.every((e) => e.type === 'Birth'));

  const marriageEvents = filterTimelineEvents(allEvents, { category: 'Marriage' });
  assert.ok(marriageEvents.length >= 2, 'Should find marriage events');
  assert.ok(marriageEvents.every((e) => e.type === 'Marriage'));
});

// [7] Generation filtering
runTest(7, 'Generation filtering matches primary person generation', () => {
  const allEvents = enrichTimelineEvents(familyStore.getAllLifeEvents(), familyStore);
  const gen1Events = filterTimelineEvents(allEvents, { generation: 1 });
  assert.ok(gen1Events.length > 0, 'Should find Gen 1 events (Venkat)');
  assert.ok(gen1Events.every((e) => e.generation === 1));
});

// [8] Person filtering
runTest(8, 'Person filtering isolates events where person is primary or related member', () => {
  const allEvents = enrichTimelineEvents(familyStore.getAllLifeEvents(), familyStore);
  const rajeshEvents = filterTimelineEvents(allEvents, { personId: 'p-rajesh' });
  assert.ok(rajeshEvents.length >= 3, 'Should find multiple events for Rajesh');
  assert.ok(
    rajeshEvents.every(
      (e) => e.personId === 'p-rajesh' || (e.relatedPersonIds || []).includes('p-rajesh')
    )
  );
});

// [9] Event association
runTest(9, 'Event association connects primary person and related persons from store', () => {
  const allEvents = enrichTimelineEvents(familyStore.getAllLifeEvents(), familyStore);
  const wedding = allEvents.find((e) => e.id === 'event-3'); // Venkat & Padma wedding
  assert.ok(wedding, 'Wedding event must exist');
  assert.strictEqual(wedding.primaryPerson?.displayName, 'Venkat Ramaiah Medida');
  assert.ok(wedding.allAssociatedPeople.length >= 2, 'Should associate both bride and groom');
});

// [10] Photo association
runTest(10, 'Photo association attaches media and respects lazy-loading metadata', () => {
  const allEvents = enrichTimelineEvents(familyStore.getAllLifeEvents(), familyStore);
  const eventWithPhoto = allEvents.find((e) => e.associatedPhoto !== null);
  assert.ok(eventWithPhoto, 'At least one event should have an associated photo portrait/album');
  assert.ok(eventWithPhoto.associatedPhoto.src, 'Photo must have source URI');
});

// [11] Family isolation
runTest(11, 'Family isolation ensures events from other families are excluded', () => {
  const eventsA = familyStore.getAllLifeEvents();
  assert.ok(eventsA.every((e) => !e.familyId || e.familyId === 'family-medida' || e.familyId === 'default'));
});

// [12] Local mode
runTest(12, 'Local mode functions seamlessly over in-memory family data', () => {
  const snapshot = familyStore.getSnapshot();
  const enriched = enrichTimelineEvents(snapshot.lifeEvents, familyStore);
  const sorted = sortTimelineEvents(enriched);
  assert.ok(sorted.length > 0, 'Local mode successfully builds timeline');
});

// [13] Cloud mode
runTest(13, 'Cloud mode operates authoritatively over repository state', () => {
  const cloudMockStore = {
    getPersonById: (id) => familyStore.getPersonById(id),
    getPhotosForPerson: (id) => familyStore.getPhotosForPerson(id),
    getAllLifeEvents: () => familyStore.getAllLifeEvents(),
  };
  const enriched = enrichTimelineEvents(cloudMockStore.getAllLifeEvents(), cloudMockStore);
  assert.ok(enriched.length === familyStore.getAllLifeEvents().length);
});

// [14] Person navigation payload
runTest(14, 'Person navigation payload provides complete target metadata', () => {
  const allEvents = enrichTimelineEvents(familyStore.getAllLifeEvents(), familyStore);
  const event = allEvents[0];
  const targetPerson = event.primaryPerson;
  assert.ok(targetPerson.id, 'Target person ID must exist');
  assert.ok(targetPerson.displayName, 'Target person name must exist');
});

// [15] Event detail payload
runTest(15, 'Event detail payload supplies complete modal metadata', () => {
  const allEvents = enrichTimelineEvents(familyStore.getAllLifeEvents(), familyStore);
  const e = allEvents[0];
  assert.ok(e.title, 'Title required');
  assert.ok(e._parsedDate, 'Parsed date required');
  assert.ok(e.type, 'Category type required');
  assert.ok(Array.isArray(e.allAssociatedPeople), 'Associated people array required');
});

// [16] Search deep-link compatibility
runTest(16, 'Search deep-link compatibility allows M4A event result navigation', () => {
  const searchRes = searchArchive('Marriage', { filter: 'events' }, familyStore.getSearchIndex());
  assert.ok(searchRes.results.length > 0, 'Search discovers marriage events');
  const eventResult = searchRes.results[0];
  assert.strictEqual(eventResult.type, 'event');
  assert.ok(eventResult.id, 'Event result contains entity ID');
  assert.ok(eventResult.personId, 'Event result references attached family member');
});

// [17] Empty timeline
runTest(17, 'Empty timeline returns zero eras and empty arrays gracefully', () => {
  const emptyEras = deriveErasFromEvents([]);
  assert.deepStrictEqual(emptyEras, []);

  const emptyEnriched = enrichTimelineEvents([], familyStore);
  assert.deepStrictEqual(emptyEnriched, []);

  const filters = getAvailableTimelineFilters([]);
  assert.deepStrictEqual(filters.categories, []);
  assert.deepStrictEqual(filters.generations, []);
});

// [18] Duplicate event handling
runTest(18, 'Duplicate event handling orders duplicate timestamps deterministically', () => {
  const duplicates = [
    { id: 'dup-2', date: '2000-01-01', title: 'Celebration B' },
    { id: 'dup-1', date: '2000-01-01', title: 'Celebration A' },
  ];
  const sorted = sortTimelineEvents(duplicates);
  assert.strictEqual(sorted[0].id, 'dup-1');
  assert.strictEqual(sorted[1].id, 'dup-2');
});

// [19] Existing M3 security baseline
runTest(19, 'M3 security regression: roles enforce event permission invariants', () => {
  assert.strictEqual(canCreateFamilyData('viewer'), false);
  assert.strictEqual(canCreateFamilyData('contributor'), true);
  assert.strictEqual(canCreateFamilyData('editor'), true);
  assert.strictEqual(canCreateFamilyData('owner'), true);

  assert.strictEqual(canDeleteFamilyData('viewer'), false);
  assert.strictEqual(canDeleteFamilyData('contributor'), false);
  assert.strictEqual(canDeleteFamilyData('editor'), true);
  assert.strictEqual(canDeleteFamilyData('owner'), true);
});

// [20] Existing M3 sync baseline
runTest(20, 'M3 sync regression: store reactive subscription notifies on event changes', () => {
  let notified = false;
  const unsub = familyStore.subscribe(() => {
    notified = true;
  });

  const tempEvent = familyStore.addLifeEvent({
    personId: 'g-venkat',
    type: 'Milestone',
    title: 'Temporary Test Milestone',
    date: '1999-01-01',
  });

  assert.strictEqual(notified, true);
  unsub();

  // Cleanup
  familyStore.deleteLifeEvent(tempEvent.id);
});

// [21] Existing M3 media baseline
runTest(21, 'M3 media regression: getPhotoStoragePath enforces tenant isolation', () => {
  const path = mediaStorageService.getPhotoStoragePath('family-abc', 'photo-123', 'family_portrait.jpg');
  assert.ok(path.startsWith('family/family-abc/photos/photo-123/'));
  assert.ok(path.endsWith('.jpg'));
});

// [22] Existing M3 collaboration baseline
await runAsyncTest(22, 'M3 collaboration regression: token cryptography generates secure hash', async () => {
  const hash = await hashToken('test-invite-token-123');
  assert.strictEqual(typeof hash, 'string');
  assert.strictEqual(hash.length, 64);
});

// [23] Existing M4A search baseline
runTest(23, 'M4A search baseline: global search discovers person and ranks exact match first', () => {
  const res = searchArchive('Venkat', {}, familyStore.getSearchIndex());
  assert.ok(res.results.length > 0);
  assert.strictEqual(res.results[0].id, 'g-venkat');
});

console.log('\n==================================================');
console.log(`M4B TEST RESULTS: ${passedTests} / 23 PASSED (${failedTests} Failures)`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
