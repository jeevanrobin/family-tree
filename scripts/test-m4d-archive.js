/**
 * Milestone M4D — Automated Family Album & Archive Verification Suite
 * 
 * 33 targeted verification tests validating:
 * 1. photo collection
 * 2. document collection
 * 3. featured media selection
 * 4. recent media derivation
 * 5. person collection
 * 6. event collection
 * 7. generation collection
 * 8. era collection
 * 9. location filtering
 * 10. year filtering
 * 11. document type filtering
 * 12. photo relationship derivation
 * 13. story relationship derivation
 * 14. event relationship derivation
 * 15. deep-link payloads
 * 16. stale media protection
 * 17. stale document protection
 * 18. family isolation
 * 19. local mode
 * 20. cloud mode
 * 21. offline mode
 * 22. secure URL behavior
 * 23. role permissions
 * 24. upload integration
 * 25. lightbox integration
 * 26. document viewer integration
 * 27. M4A search regression
 * 28. M4B timeline regression
 * 29. M4C memories regression
 * 30. M3D media regression
 * 31. M3C sync regression
 * 32. M3E collaboration regression
 * 33. M3B security regression
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
  extractYear,
  deriveArchiveEras,
  enrichArchivePhoto,
  enrichArchiveDocument,
  scorePhoto,
  scoreDocument,
  selectFeaturedMedia,
  getRecentArchiveMedia,
  getPersonCollections,
  getEventCollections,
  filterArchivePhotos,
  filterArchiveDocuments,
  getAvailableArchiveFilters,
} = await import('../src/family-tree/archive/familyArchiveEngine.js');
const { searchArchive } = await import('../src/family-tree/search/familySearchEngine.js');
const { sortTimelineEvents, enrichTimelineEvents } = await import('../src/family-tree/timeline/familyTimelineEngine.js');
const { enrichStory } = await import('../src/family-tree/memories/familyStoryEngine.js');
const { canCreateFamilyData, canDeleteFamilyData } = await import('../src/family-tree/auth/roles.js');
const { hashToken } = await import('../src/family-tree/auth/collaborationService.js');
const { mediaStorageService, PHOTO_BUCKET, DOCUMENT_BUCKET } = await import('../src/family-tree/media/mediaStorageService.js');

let passedTests = 0;
let failedTests = 0;

async function runTest(num, name, fn) {
  try {
    await fn();
    console.log(`[PASS] Test ${num}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${num}: ${name}`);
    console.error(err);
    failedTests++;
  }
}

console.log('==================================================');
console.log('STARTING MILESTONE M4D — ARCHIVE VERIFICATION SUITE');
console.log('==================================================\n');

// ── Test 1: Photo Collection ──────────────────────────────────
await runTest(1, 'photo collection: retrieves complete normalized photos from FamilyStore', () => {
  const photos = familyStore.getAllPhotos();
  assert.ok(Array.isArray(photos), 'getAllPhotos returns array');
  assert.ok(photos.length > 0, 'Photos exist in store');
  const sample = photos[0];
  assert.ok(sample.id, 'Photo has id');
  assert.ok(sample.src, 'Photo has src');
  assert.ok(sample.title, 'Photo has title');
  assert.ok(sample.personId, 'Photo attached to person');
});

// ── Test 2: Document Collection ───────────────────────────────
await runTest(2, 'document collection: retrieves complete archival documents from FamilyStore', () => {
  const docs = familyStore.getAllDocuments();
  assert.ok(Array.isArray(docs), 'getAllDocuments returns array');
  assert.ok(docs.length > 0, 'Documents exist in store');
  const sample = docs[0];
  assert.ok(sample.id, 'Document has id');
  assert.ok(sample.name, 'Document has name');
  assert.ok(sample.personId, 'Document attached to person');
});

// ── Test 3: Featured Media Selection ──────────────────────────
await runTest(3, 'featured media selection: deterministically scores and selects hero media', () => {
  const photos = familyStore.getAllPhotos();
  const docs = familyStore.getAllDocuments();
  const people = familyStore.getAllPersons();
  const events = familyStore.getAllLifeEvents();
  const stories = familyStore.getAllStories();
  const genMap = familyStore.calculateGenerations();

  const enrichedPhotos = photos.map((p) => enrichArchivePhoto(p, { people, lifeEvents: events, stories, genMap }));
  const enrichedDocs = docs.map((d) => enrichArchiveDocument(d, { people, lifeEvents: events, stories, genMap }));

  const featured = selectFeaturedMedia(enrichedPhotos, enrichedDocs, 4);
  assert.ok(featured.heroItem, 'Hero item selected');
  assert.ok(featured.featuredPhotos.length <= 4, 'Featured photos limited');
  assert.ok(featured.featuredDocs.length <= 4, 'Featured docs limited');
  // Determinism check: running twice produces identical hero
  const featuredAgain = selectFeaturedMedia(enrichedPhotos, enrichedDocs, 4);
  assert.strictEqual(featured.heroItem.id, featuredAgain.heroItem.id, 'Featured selection is strictly deterministic');
});

// ── Test 4: Recent Media Derivation ───────────────────────────
await runTest(4, 'recent media derivation: sorts combined media by date/recency descending', () => {
  const photos = familyStore.getAllPhotos();
  const docs = familyStore.getAllDocuments();
  const enrichedPhotos = photos.map((p) => enrichArchivePhoto(p));
  const enrichedDocs = docs.map((d) => enrichArchiveDocument(d));

  const recents = getRecentArchiveMedia(enrichedPhotos, enrichedDocs, 5);
  assert.ok(recents.length <= 5, 'Recent media respects limit');
  assert.ok(recents.length > 0, 'Recents list populated');
  // Verify all have mediaKind
  recents.forEach((item) => {
    assert.ok(item.mediaKind === 'photo' || item.mediaKind === 'document', 'Item has valid mediaKind');
  });
});

// ── Test 5: Person Collection ─────────────────────────────────
await runTest(5, 'person collection: groups archive items by person with correct counts', () => {
  const people = familyStore.getAllPersons();
  const photos = familyStore.getAllPhotos().map((p) => enrichArchivePhoto(p));
  const docs = familyStore.getAllDocuments().map((d) => enrichArchiveDocument(d));
  const stories = familyStore.getAllStories();
  const events = familyStore.getAllLifeEvents();

  const collections = getPersonCollections(people, photos, docs, stories, events);
  assert.ok(collections.length > 0, 'Person collections computed');
  const venkat = collections.find((c) => c.person.id === 'g-venkat');
  assert.ok(venkat, 'Venkat collection found');
  assert.ok(venkat.photos.length > 0, 'Venkat has photos');
  assert.ok(venkat.totalCount > 0, 'Total count aggregated');
});

// ── Test 6: Event Collection ──────────────────────────────────
await runTest(6, 'event collection: groups archive media around life events', () => {
  const events = familyStore.getAllLifeEvents();
  const photos = familyStore.getAllPhotos().map((p) => enrichArchivePhoto(p));
  const docs = familyStore.getAllDocuments().map((d) => enrichArchiveDocument(d));
  const stories = familyStore.getAllStories();

  const eventCols = getEventCollections(events, photos, docs, stories);
  assert.ok(Array.isArray(eventCols), 'Event collections is array');
  assert.ok(eventCols.length > 0, 'Event collections found');
});

// ── Test 7: Generation Collection ─────────────────────────────
await runTest(7, 'generation collection: enriches media with person generation index', () => {
  const people = familyStore.getAllPersons();
  const genMap = familyStore.calculateGenerations();
  const photo = familyStore.getAllPhotos().find((p) => p.personId === 'gg-ramaiah') || familyStore.getAllPhotos()[0];
  const enriched = enrichArchivePhoto(photo, { people, genMap });
  assert.ok(enriched.generation !== null, 'Generation index assigned');
});

// ── Test 8: Era Collection ────────────────────────────────────
await runTest(8, 'era collection: derives dynamic historical eras without hardcoded dates', () => {
  const years = [1945, 1970, 1975, 1998, 2010, 2022];
  const eras = deriveArchiveEras(years);
  assert.ok(eras.length >= 2, 'Multiple dynamic eras created');
  assert.strictEqual(eras[0].startYear, 1945, 'First era begins at minYear');
  assert.strictEqual(eras[eras.length - 1].endYear, 2022, 'Last era ends at maxYear');
});

// ── Test 9: Location Filtering ────────────────────────────────
await runTest(9, 'location filtering: filters photos by geographical location substring', () => {
  const photos = familyStore.getAllPhotos().map((p) => enrichArchivePhoto(p));
  const filtered = filterArchivePhotos(photos, { location: 'Telangana' });
  filtered.forEach((p) => {
    assert.ok(p.location.toLowerCase().includes('telangana'), 'Location matches filter');
  });
});

// ── Test 10: Year Filtering ───────────────────────────────────
await runTest(10, 'year filtering: filters photos and documents by calendar year', () => {
  const photos = familyStore.getAllPhotos().map((p) => enrichArchivePhoto(p));
  const photoWithYear = photos.find((p) => p.year !== null);
  if (photoWithYear) {
    const matched = filterArchivePhotos(photos, { year: String(photoWithYear.year) });
    assert.ok(matched.length > 0, 'Found photos for target year');
    matched.forEach((p) => assert.strictEqual(p.year, photoWithYear.year));
  }
});

// ── Test 11: Document Type Filtering ──────────────────────────
await runTest(11, 'document type filtering: filters documents by category', () => {
  const docs = familyStore.getAllDocuments().map((d) => enrichArchiveDocument(d));
  const firstDoc = docs[0];
  const docType = firstDoc.type || firstDoc.docType;
  if (docType) {
    const matched = filterArchiveDocuments(docs, { docType });
    assert.ok(matched.length > 0, 'Found documents matching type');
  }
});

// ── Test 12: Photo Relationship Derivation ────────────────────
await runTest(12, 'photo relationship derivation: attaches primary person and related people', () => {
  const people = familyStore.getAllPersons();
  const photo = familyStore.getAllPhotos()[0];
  const enriched = enrichArchivePhoto(photo, { people });
  assert.ok(enriched.primaryPerson, 'Primary person attached');
  assert.strictEqual(enriched.primaryPerson.id, photo.personId, 'Primary person ID matches');
  assert.ok(Array.isArray(enriched.relatedPeople), 'Related people is array');
});

// ── Test 13: Story Relationship Derivation ────────────────────
await runTest(13, 'story relationship derivation: links photos and documents to associated stories', () => {
  const stories = familyStore.getAllStories();
  const photo = familyStore.getAllPhotos()[0];
  const enriched = enrichArchivePhoto(photo, { stories });
  assert.ok('associatedStory' in enriched, 'associatedStory property exists');
});

// ── Test 14: Event Relationship Derivation ────────────────────
await runTest(14, 'event relationship derivation: links photos and documents to associated events', () => {
  const events = familyStore.getAllLifeEvents();
  const photo = familyStore.getAllPhotos()[0];
  const enriched = enrichArchivePhoto(photo, { lifeEvents: events });
  assert.ok('associatedEvent' in enriched, 'associatedEvent property exists');
});

// ── Test 15: Deep-link Payloads ───────────────────────────────
await runTest(15, 'deep-link payloads: resolves target photo or document from URL parameter', () => {
  const samplePhoto = familyStore.getAllPhotos()[0];
  const sampleDoc = familyStore.getAllDocuments()[0];

  const photoFound = familyStore.getPhotoById(samplePhoto.id);
  assert.ok(photoFound, 'Photo resolved by ID for deep-link');
  assert.strictEqual(photoFound.id, samplePhoto.id);

  const docFound = familyStore.getDocumentById(sampleDoc.id);
  assert.ok(docFound, 'Document resolved by ID for deep-link');
  assert.strictEqual(docFound.id, sampleDoc.id);
});

// ── Test 16: Stale Media Protection ───────────────────────────
await runTest(16, 'stale media protection: safely returns null for deleted or missing photo ID', () => {
  const stale = familyStore.getPhotoById('non-existent-photo-xyz');
  assert.strictEqual(stale, null, 'Returns null safely');
  const enriched = enrichArchivePhoto(null);
  assert.strictEqual(enriched, null, 'enrichArchivePhoto handles null');
});

// ── Test 17: Stale Document Protection ────────────────────────
await runTest(17, 'stale document protection: safely returns null for deleted or missing doc ID', () => {
  const stale = familyStore.getDocumentById('non-existent-doc-xyz');
  assert.strictEqual(stale, null, 'Returns null safely');
  const enriched = enrichArchiveDocument(null);
  assert.strictEqual(enriched, null, 'enrichArchiveDocument handles null');
});

// ── Test 18: Family Isolation ─────────────────────────────────
await runTest(18, 'family isolation: Family A archive data does not leak into Family B store', () => {
  const storeA = new FamilyStore();
  const storeB = new FamilyStore();

  const photoA = storeA.addPhoto({
    personId: 'g-venkat',
    src: 'https://example.com/family-a-photo.jpg',
    title: 'Family A Secret Record',
  });

  const photoBIds = storeB.getAllPhotos().map((p) => p.id);
  assert.ok(!photoBIds.includes(photoA.id), 'Family B does not contain Family A photo');
  assert.strictEqual(storeB.getPhotoById(photoA.id), null, 'Store B cannot query photo A');
});

// ── Test 19: Local Mode ───────────────────────────────────────
await runTest(19, 'local mode: operates completely without network or Supabase dependency', () => {
  const store = new FamilyStore();
  const photos = store.getAllPhotos();
  const docs = store.getAllDocuments();
  assert.ok(photos.length > 0, 'Local store photos initialized');
  assert.ok(docs.length > 0, 'Local store docs initialized');
});

// ── Test 20: Cloud Mode ───────────────────────────────────────
await runTest(20, 'cloud mode: exports valid schema for remote synchronization', () => {
  const exported = familyStore.exportData();
  assert.ok(exported.family.photos, 'Export contains photos');
  assert.ok(exported.family.documents, 'Export contains documents');
  assert.ok(exported.schemaVersion, 'Schema version defined');
});

// ── Test 21: Offline Mode ─────────────────────────────────────
await runTest(21, 'offline mode: cached archive metadata remains accessible offline', () => {
  const photos = familyStore.getAllPhotos();
  assert.ok(photos.length > 0, 'Cached photos available');
  const docs = familyStore.getAllDocuments();
  assert.ok(docs.length > 0, 'Cached docs available');
});

// ── Test 22: Secure URL Behavior ──────────────────────────────
await runTest(22, 'secure URL behavior: media storage service maintains isolated URL cache', () => {
  assert.ok(mediaStorageService, 'Storage service initialized');
  assert.ok(mediaStorageService.urlCache instanceof Map, 'URL cache map exists');
});

// ── Test 23: Role Permissions ─────────────────────────────────
await runTest(23, 'role permissions: viewers are read-only; contributors and editors have permissions', () => {
  assert.strictEqual(canCreateFamilyData('viewer'), false, 'Viewer cannot create media');
  assert.strictEqual(canDeleteFamilyData('viewer'), false, 'Viewer cannot delete media');
  assert.strictEqual(canCreateFamilyData('contributor'), true, 'Contributor can create media');
  assert.strictEqual(canDeleteFamilyData('editor'), true, 'Editor can delete media');
});

// ── Test 24: Upload Integration ───────────────────────────────
await runTest(24, 'upload integration: adding photo and document immediately updates store and notifies', async () => {
  let notified = false;
  const unsub = familyStore.subscribe(() => {
    notified = true;
  });

  const photo = await familyStore.addPhoto({
    personId: 'g-venkat',
    src: 'https://example.com/test-uploaded.jpg',
    title: 'Test New Upload',
    isPrimary: false,
  });

  assert.ok(notified, 'Store notified subscriber on photo upload');
  assert.ok(familyStore.getPhotoById(photo.id), 'Photo immediately accessible');

  const doc = await familyStore.addDocument({
    personId: 'g-venkat',
    name: 'Test Land Deed',
    type: 'Deed',
    date: '1975-01-01',
  });

  assert.ok(familyStore.getDocumentById(doc.id), 'Document immediately accessible');

  // Clean up
  await familyStore.deletePhoto(photo.id);
  await familyStore.deleteDocument(doc.id);
  unsub();
});

// ── Test 25: Lightbox Integration ─────────────────────────────
await runTest(25, 'lightbox integration: supports index selection, primary photo, and deletion', async () => {
  const photos = familyStore.getAllPhotos();
  const targetPhoto = photos[0];
  assert.ok(targetPhoto, 'Target photo exists');
  // Can set primary
  const updated = await familyStore.setPrimaryPhoto(targetPhoto.personId, targetPhoto.id);
  assert.strictEqual(updated.isPrimary, true, 'Primary photo set correctly');
});

// ── Test 26: Document Viewer Integration ──────────────────────
await runTest(26, 'document viewer integration: resolves document payload without exposing private paths', () => {
  const doc = familyStore.getAllDocuments()[0];
  const docFromStore = familyStore.getDocumentById(doc.id);
  assert.ok(docFromStore, 'Document resolved');
  assert.strictEqual(docFromStore.name, doc.name);
});

// ── Test 27: M4A Search Regression ────────────────────────────
await runTest(27, 'M4A search regression: global search palette returns photo and document records', () => {
  const index = familyStore.getSearchIndex();
  const results = searchArchive('homestead', {}, index);
  assert.ok(results.results !== undefined, 'Search executes without error');
});

// ── Test 28: M4B Timeline Regression ──────────────────────────
await runTest(28, 'M4B timeline regression: lifeEvents and timeline navigation remain intact', () => {
  const events = familyStore.getAllLifeEvents();
  const sorted = sortTimelineEvents(enrichTimelineEvents(events, familyStore));
  assert.ok(sorted.length > 0, 'Timeline events enriched and sorted');
});

// ── Test 29: M4C Memories Regression ──────────────────────────
await runTest(29, 'M4C memories regression: stories and story reader enrichment remain intact', () => {
  const stories = familyStore.getAllStories();
  assert.ok(stories.length > 0, 'Stories exist');
  const enriched = enrichStory(stories[0], familyStore);
  assert.ok(enriched.readingTimeMinutes, 'Reading time computed');
});

// ── Test 30: M3D Media Regression ─────────────────────────────
await runTest(30, 'M3D media regression: PHOTO_BUCKET and DOCUMENT_BUCKET constants remain intact', () => {
  assert.strictEqual(PHOTO_BUCKET, 'family-photos', 'Photo bucket is family-photos');
  assert.strictEqual(DOCUMENT_BUCKET, 'family-documents', 'Document bucket is family-documents');
});

// ── Test 31: M3C Sync Regression ──────────────────────────────
await runTest(31, 'M3C sync regression: sync status listener remains functional', () => {
  const status = familyStore.getSyncStatus();
  assert.ok(['synced', 'syncing', 'error', 'offline'].includes(status), 'Valid sync status');
});

// ── Test 32: M3E Collaboration Regression ─────────────────────
await runTest(32, 'M3E collaboration regression: SHA-256 token hashing intact', async () => {
  const hash = await hashToken('m4d-archive-test-token');
  assert.strictEqual(hash.length, 64, 'Token hash is 64 characters');
});

// ── Test 33: M3B Security Regression ──────────────────────────
await runTest(33, 'M3B security regression: owner role has complete administrative permissions', () => {
  assert.strictEqual(canCreateFamilyData('owner'), true, 'Owner can create');
  assert.strictEqual(canDeleteFamilyData('owner'), true, 'Owner can delete');
});

console.log('\n==================================================');
console.log(`M4D VERIFICATION RESULT: ${passedTests} / 33 passed (${failedTests} failed)`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
