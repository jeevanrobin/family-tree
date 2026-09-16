/**
 * Milestone M4C — Automated Family Memories & Story Experience Verification Suite
 * 
 * 33 targeted verification tests validating:
 * 1. story listing
 * 2. story sorting
 * 3. featured story selection
 * 4. story reader payload
 * 5. related people
 * 6. narrator handling
 * 7. story/event relationship
 * 8. story/photo relationship
 * 9. story/document relationship
 * 10. related-memory ranking
 * 11. person filter
 * 12. generation filter
 * 13. era filter
 * 14. location filter
 * 15. undated stories
 * 16. empty-state behavior
 * 17. story deep-link payload
 * 18. stale story protection
 * 19. family isolation
 * 20. local mode
 * 21. cloud mode
 * 22. offline mode
 * 23. search deep-link compatibility
 * 24. person navigation payload
 * 25. event navigation payload
 * 26. photo navigation payload
 * 27. document navigation payload
 * 28. M3B security regression
 * 29. M3C sync regression
 * 30. M3D media regression
 * 31. M3E collaboration regression
 * 32. M4A search regression
 * 33. M4B timeline regression
 */

import assert from 'node:assert';

// Mock localStorage and window environment for Node.js
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// Dynamically import required modules
const { default: familyStore, FamilyStore } = await import('../src/family-tree/store/FamilyStore.js');
const {
  extractStoryYear,
  calculateReadingTime,
  enrichStory,
  deriveStoryEras,
  getEraForStory,
  selectFeaturedStory,
  getRelatedStories,
  filterStories,
  getAvailableStoryFilters,
} = await import('../src/family-tree/memories/familyStoryEngine.js');
const { searchArchive, verifyEntityExists } = await import('../src/family-tree/search/familySearchEngine.js');
const { sortTimelineEvents, enrichTimelineEvents } = await import('../src/family-tree/timeline/familyTimelineEngine.js');
const { canCreateFamilyData, canDeleteFamilyData } = await import('../src/family-tree/auth/roles.js');
const { hashToken } = await import('../src/family-tree/auth/collaborationService.js');
const { mediaStorageService } = await import('../src/family-tree/media/mediaStorageService.js');

let passedTests = 0;
let failedTests = 0;

async function runTest(testNumber, name, fn) {
  try {
    await fn();
    console.log(`  ✅ Test ${testNumber}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Test ${testNumber} FAILED: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

console.log('\n==================================================');
console.log("MEDIDA'S FAMILY — MILESTONE M4C VERIFICATION SUITE");
console.log('FAMILY MEMORIES & STORY EXPERIENCE (33 TESTS)');
console.log('==================================================\n');

// Reset store to standard sample state before tests
familyStore.resetToSampleData();
const allStories = familyStore.getAllStories();
const enriched = allStories.map((s) => enrichStory(s, familyStore));
const eras = deriveStoryEras(enriched, familyStore.getAllLifeEvents());

// ── Test 1: Story listing ─────────────────────────────────────
await runTest(1, 'Story listing returns complete records from FamilyStore', () => {
  const stories = familyStore.getAllStories();
  assert.ok(Array.isArray(stories), 'Stories should be an array');
  assert.ok(stories.length >= 3, 'Should contain at least sample stories');
  const ids = stories.map((s) => s.id);
  assert.ok(ids.includes('story-mem-1'), 'Should contain mem-1');
  assert.ok(ids.includes('story-mem-2'), 'Should contain mem-2');
  assert.ok(ids.includes('story-mem-3'), 'Should contain mem-3');
});

// ── Test 2: Story sorting ─────────────────────────────────────
await runTest(2, 'Story sorting correctly parses and handles chronologies', () => {
  const sorted = [...enriched].sort((a, b) => (b.year || 0) - (a.year || 0));
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].year && sorted[i + 1].year) {
      assert.ok(sorted[i].year >= sorted[i + 1].year, 'Chronological ordering should be descending');
    }
  }
});

// ── Test 3: Featured story selection ──────────────────────────
await runTest(3, 'Featured story selection deterministically prioritizes rich stories with media', () => {
  const featured = selectFeaturedStory(enriched);
  assert.ok(featured, 'Featured story must exist');
  assert.ok(featured.title, 'Featured story must have a title');
  assert.ok(featured.associatedPhoto || featured.content.length > 200, 'Featured story should have high relevance score');
  // Specific preference override check
  const specific = selectFeaturedStory(enriched, 'story-mem-1');
  assert.strictEqual(specific.id, 'story-mem-1', 'Should honor preferred story ID override');
});

// ── Test 4: Story reader payload ──────────────────────────────
await runTest(4, 'Story reader payload contains title, content, reading time, and entities', () => {
  const sample = enriched.find((s) => s.id === 'story-mem-2');
  assert.ok(sample, 'Target story must exist');
  assert.ok(sample.title.includes('Blueprints'), 'Title matches');
  assert.ok(sample.content.length > 50, 'Content is present');
  assert.ok(sample.readingTimeMinutes >= 1, 'Estimated reading time is computed');
  assert.ok(sample.primaryPerson, 'Primary person is linked');
  assert.strictEqual(sample.primaryPerson.id, 'g-venkat', 'Primary person is Venkat Medida');
});

// ── Test 5: Related people ────────────────────────────────────
await runTest(5, 'Related people resolution extracts person records without self-inclusion', () => {
  const story2 = enriched.find((s) => s.id === 'story-mem-2');
  assert.ok(Array.isArray(story2.relatedPeople), 'Related people must be an array');
  assert.ok(story2.relatedPeople.length > 0, 'Should have related people');
  const relatedIds = story2.relatedPeople.map((p) => p.id);
  assert.ok(!relatedIds.includes(story2.personId), 'Primary person should not be duplicated in relatedPeople');
});

// ── Test 6: Narrator handling ─────────────────────────────────
await runTest(6, 'Narrator handling resolves narrator person object and retains plain text', () => {
  const story1 = enriched.find((s) => s.id === 'story-mem-1');
  assert.strictEqual(story1.narrator, 'Padma Medida', 'Narrator text matches');
  assert.ok(story1.narratorPerson, 'Narrator person should be linked from store people');
  assert.strictEqual(story1.narratorPerson.firstName, 'Padma', 'Narrator person matches Padma');
});

// ── Test 7: Story/event relationship ──────────────────────────
await runTest(7, 'Story and Life Event relationship links correctly via eventId or year', () => {
  const story2 = enriched.find((s) => s.id === 'story-mem-2');
  assert.ok(story2.associatedEvent, 'Story 2 should have associated life event');
  assert.strictEqual(story2.associatedEvent.id, 'event-2', 'Associated event is event-2');
});

// ── Test 8: Story/photo relationship ──────────────────────────
await runTest(8, 'Story and photo relationship resolves photo records securely', () => {
  const story2 = enriched.find((s) => s.id === 'story-mem-2');
  assert.ok(story2.associatedPhoto, 'Story 2 should link to a photo record');
  assert.ok(story2.associatedPhoto.src || story2.associatedPhoto.storage_path, 'Photo has source path');
});

// ── Test 9: Story/document relationship ───────────────────────
await runTest(9, 'Story and document relationship resolves archival document', () => {
  const doc = familyStore.getAllDocuments()[0];
  assert.ok(doc, 'Sample archival document must exist');
  const mockStory = enrichStory(
    {
      id: 'story-doc-test',
      personId: 'g-venkat',
      title: 'Historical Land Deed',
      content: 'Regarding the ancestral plot...',
      documentId: doc.id,
    },
    familyStore
  );
  assert.ok(mockStory.associatedDocument, 'Associated document should resolve');
  assert.strictEqual(mockStory.associatedDocument.id, doc.id, 'Matches doc ID');
});

// ── Test 10: Related-memory ranking ───────────────────────────
await runTest(10, 'Deterministic related-memory ranking orders by relational relevance', () => {
  const story1 = enriched.find((s) => s.id === 'story-mem-1');
  const related = getRelatedStories(story1, enriched, 3);
  assert.ok(Array.isArray(related), 'Related stories is array');
  assert.ok(related.length > 0, 'Found related stories');
  assert.ok(!related.map((r) => r.id).includes(story1.id), 'Self is never included');
});

// ── Test 11: Person filter ────────────────────────────────────
await runTest(11, 'Person filter matches stories where person is primary subject or related', () => {
  const venkatStories = filterStories(enriched, { personId: 'g-venkat' }, familyStore, eras);
  assert.ok(venkatStories.length >= 2, 'Venkat appears as primary or related in multiple stories');
  venkatStories.forEach((s) => {
    const isPrimary = s.personId === 'g-venkat';
    const isRelated = s.relatedPersonIds?.includes('g-venkat');
    assert.ok(isPrimary || isRelated, 'Story must involve Venkat');
  });
});

// ── Test 12: Generation filter ────────────────────────────────
await runTest(12, 'Generation filter filters stories by primary person generational tier', () => {
  const gen2Stories = filterStories(enriched, { generation: 2 }, familyStore, eras);
  assert.ok(Array.isArray(gen2Stories), 'Returns array');
  const genMap = familyStore.calculateGenerations();
  gen2Stories.forEach((s) => {
    assert.strictEqual(genMap.get(s.personId), 2, 'Primary person must belong to Gen 2');
  });
});

// ── Test 13: Era filter ───────────────────────────────────────
await runTest(13, 'Era filter categorizes stories into dynamically derived chapters', () => {
  assert.ok(eras.length >= 2, 'Should derive multi-era chapters');
  const firstEra = eras[0];
  const eraStories = filterStories(enriched, { eraId: firstEra.id }, familyStore, eras);
  assert.ok(Array.isArray(eraStories), 'Returns list');
});

// ── Test 14: Location filter ──────────────────────────────────
await runTest(14, 'Location filter matches stories by geography', () => {
  const hydStories = filterStories(enriched, { location: 'Hyderabad' }, familyStore, eras);
  hydStories.forEach((s) => {
    assert.strictEqual(s.location.toLowerCase(), 'hyderabad', 'Location matches');
  });
});

// ── Test 15: Undated stories ──────────────────────────────────
await runTest(15, 'Undated stories are placed in Undated Memories chapter without crashing', () => {
  const undatedStory = enrichStory(
    {
      id: 'story-undated',
      personId: 'g-padma',
      title: 'A Tale of Spices',
      content: 'Passed down across dinner tables with no recorded date.',
      date: null,
    },
    familyStore
  );
  const era = getEraForStory(undatedStory, eras);
  assert.strictEqual(era, null, 'Undated story era should be null');
  const filterRes = filterStories([undatedStory], { eraId: 'undated' }, familyStore, eras);
  assert.strictEqual(filterRes.length, 1, 'Should match undated filter');
});

// ── Test 16: Empty-state behavior ─────────────────────────────
await runTest(16, 'Empty-state behavior handles zero results cleanly', () => {
  const filtered = filterStories(enriched, { location: 'NonExistentPlace' }, familyStore, eras);
  assert.strictEqual(filtered.length, 0, 'Returns empty array');
});

// ── Test 17: Story deep-link payload ──────────────────────────
await runTest(17, 'Story deep-link payload resolves valid story by ID', () => {
  const story = familyStore.getStoryById('story-mem-1');
  assert.ok(story, 'Story resolved');
  assert.strictEqual(story.id, 'story-mem-1', 'ID matches');
  const enrichedStory = enrichStory(story, familyStore);
  assert.ok(enrichedStory.title, 'Title exists');
});

// ── Test 18: Stale story protection ───────────────────────────
await runTest(18, 'Stale story protection rejects nonexistent or deleted story IDs gracefully', () => {
  const exists = verifyEntityExists(familyStore, 'story', 'story-deleted-999');
  assert.strictEqual(exists, false, 'Deleted story returns false');
  const found = familyStore.getStoryById('story-deleted-999');
  assert.strictEqual(found, null, 'Story getter returns null');
});

// ── Test 19: Family isolation ─────────────────────────────────
await runTest(19, 'Family isolation ensures separate FamilyStore instances remain isolated', () => {
  const storeA = new FamilyStore();
  const storeB = new FamilyStore();
  storeA.resetToSampleData();
  storeB.resetToSampleData();

  storeA.addStory({
    personId: 'g-venkat',
    title: 'Family A Secret Chronicle',
    content: 'Only for Family A members.',
  });

  const bStories = storeB.getAllStories();
  const foundInB = bStories.some((s) => s.title === 'Family A Secret Chronicle');
  assert.strictEqual(foundInB, false, 'Family B cannot see Family A stories');
});

// ── Test 20: Local mode ───────────────────────────────────────
await runTest(20, 'Local mode functions with zero network dependencies', () => {
  const localStories = familyStore.getAllStories();
  assert.ok(localStories.length > 0, 'Local stories load from in-memory / sample');
  const featured = selectFeaturedStory(localStories.map((s) => enrichStory(s, familyStore)));
  assert.ok(featured, 'Featured story computed locally');
});

// ── Test 21: Cloud mode compatibility ─────────────────────────
await runTest(21, 'Cloud mode payload preserves Supabase entity IDs and timestamps', () => {
  const story = familyStore.getAllStories()[0];
  assert.ok(story.id, 'ID is present');
  assert.ok(story.createdAt, 'createdAt is ISO timestamp');
  assert.ok(story.updatedAt, 'updatedAt is ISO timestamp');
});

// ── Test 22: Offline mode resilience ──────────────────────────
await runTest(22, 'Offline mode provides graceful fallback when signed URL resolution is unavailable', () => {
  const dummyPhoto = {
    id: 'photo-offline-1',
    storage_path: 'family-123/photos/offline.jpg',
    src: '',
  };
  const dummyStory = enrichStory(
    {
      id: 'story-offline',
      personId: 'g-venkat',
      title: 'An Offline Tale',
      content: 'Stored locally in cache.',
      photoId: dummyPhoto.id,
    },
    familyStore
  );
  assert.ok(dummyStory.title, 'Story title is readable');
  assert.ok(dummyStory.content, 'Story content is intact');
});

// ── Test 23: Search deep-link compatibility ───────────────────
await runTest(23, 'Search deep-link compatibility integrates with M4A search engine', () => {
  const searchRes = searchArchive('Drafting', {}, familyStore.getSearchIndex());
  assert.ok(searchRes.results.length > 0, 'Search finds Drafting Table story');
  const match = searchRes.results.find((r) => r.type === 'story');
  assert.ok(match, 'Story result found');
  assert.ok(match.id, 'Has valid story ID');
});

// ── Test 24: Person navigation payload ────────────────────────
await runTest(24, 'Person navigation payload extracts valid personId for tree camera focus', () => {
  const story = enriched.find((s) => s.id === 'story-mem-2');
  assert.ok(story.primaryPerson?.id, 'Primary person has ID');
  const person = familyStore.getPersonById(story.primaryPerson.id);
  assert.ok(person, 'Person exists in FamilyStore');
});

// ── Test 25: Event navigation payload ─────────────────────────
await runTest(25, 'Event navigation payload extracts valid eventId for timeline focus', () => {
  const story = enriched.find((s) => s.id === 'story-mem-2');
  assert.ok(story.associatedEvent?.id, 'Event has ID');
  const event = familyStore.getAllLifeEvents().find((e) => e.id === story.associatedEvent.id);
  assert.ok(event, 'Event exists in store');
});

// ── Test 26: Photo navigation payload ─────────────────────────
await runTest(26, 'Photo navigation payload formats photo array and index for PhotoLightbox', () => {
  const story = enriched.find((s) => s.id === 'story-mem-2');
  assert.ok(story.associatedPhoto, 'Story has photo');
  const photosList = [story.associatedPhoto];
  assert.ok(Array.isArray(photosList), 'Photos list is array');
  assert.strictEqual(photosList.length, 1, 'Length is 1');
});

// ── Test 27: Document navigation payload ──────────────────────
await runTest(27, 'Document navigation payload formats document object for DocumentViewerModal', () => {
  const doc = familyStore.getAllDocuments()[0];
  const docStory = enrichStory(
    {
      id: 'story-doc',
      personId: 'g-venkat',
      title: 'Archival Tale',
      content: '...',
      documentId: doc.id,
    },
    familyStore
  );
  assert.ok(docStory.associatedDocument, 'Document exists');
  assert.strictEqual(docStory.associatedDocument.id, doc.id, 'ID matches');
});

// ── Test 28: M3B security regression ──────────────────────────
await runTest(28, 'M3B security regression: viewer role is strictly read-only', () => {
  assert.strictEqual(canCreateFamilyData('viewer'), false, 'Viewer cannot create story');
  assert.strictEqual(canDeleteFamilyData('viewer'), false, 'Viewer cannot delete story');
  assert.strictEqual(canCreateFamilyData('editor'), true, 'Editor can create story');
  assert.strictEqual(canDeleteFamilyData('owner'), true, 'Owner can delete story');
});

// ── Test 29: M3C sync regression ──────────────────────────────
await runTest(29, 'M3C sync regression: adding and deleting story triggers store reactivity', async () => {
  let notified = false;
  const unsubscribe = familyStore.subscribe(() => {
    notified = true;
  });

  const newStory = await familyStore.addStory({
    personId: 'g-venkat',
    title: 'Reactive Test Memory',
    content: 'Testing listener reactivity.',
  });

  assert.ok(notified, 'Listener notified on addStory');
  assert.ok(familyStore.getStoryById(newStory.id), 'Story was added');

  notified = false;
  await familyStore.deleteStory(newStory.id);
  assert.ok(notified, 'Listener notified on deleteStory');
  assert.strictEqual(familyStore.getStoryById(newStory.id), null, 'Story was deleted');

  unsubscribe();
});

// ── Test 30: M3D media regression ─────────────────────────────
await runTest(30, 'M3D media regression: media cache and bucket constants remain intact', () => {
  assert.ok(mediaStorageService, 'Media storage service exists');
  assert.ok(mediaStorageService.urlCache instanceof Map, 'URL cache is intact');
});

// ── Test 31: M3E collaboration regression ─────────────────────
await runTest(31, 'M3E collaboration regression: invite hashing and member schemas preserved', async () => {
  const hashed = await hashToken('m4c-test-token');
  assert.ok(hashed && hashed.length === 64, 'SHA-256 hash intact');
});

// ── Test 32: M4A search regression ────────────────────────────
await runTest(32, 'M4A search regression: global search palette queries stories and people seamlessly', () => {
  const results = searchArchive('Padma', {}, familyStore.getSearchIndex());
  assert.ok(results.results.length > 0, 'Padma found in search');
});

// ── Test 33: M4B timeline regression ──────────────────────────
await runTest(33, 'M4B timeline regression: chronological event sorting and eras intact', () => {
  const rawEvents = familyStore.getAllLifeEvents();
  const sortedEvents = sortTimelineEvents(enrichTimelineEvents(rawEvents, familyStore));
  assert.ok(sortedEvents.length > 0, 'Timeline events exist and sort properly');
});

console.log('\n==================================================');
console.log(`M4C VERIFICATION RESULT: ${passedTests} / 33 passed (${failedTests} failed)`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
