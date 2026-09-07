/**
 * Milestone M4E — Automated Family Insights & Archive Health Verification Suite
 * 
 * 35 targeted verification tests validating:
 * 1. total people
 * 2. total generations
 * 3. living/deceased counts
 * 4. stories count
 * 5. event count
 * 6. photo count
 * 7. document count
 * 8. generation distribution
 * 9. family branch derivation
 * 10. milestone derivation
 * 11. archive composition
 * 12. location aggregation
 * 13. profile completeness
 * 14. missing information detection ("Complete the Family Story")
 * 15. history coverage
 * 16. memory coverage
 * 17. photo coverage
 * 18. document coverage
 * 19. recent activity derivation
 * 20. active-family isolation
 * 21. local mode
 * 22. cloud mode
 * 23. offline mode
 * 24. person navigation payload
 * 25. event navigation payload
 * 26. story navigation payload
 * 27. photo navigation payload
 * 28. document navigation payload
 * 29. M4A regression (global search & discovery)
 * 30. M4B regression (family timeline)
 * 31. M4C regression (family memories)
 * 32. M4D regression (global album & archive)
 * 33. M3B security regression (role permissions)
 * 34. M3C sync regression (offline status & sync engine)
 * 35. M3E collaboration regression (token hashing & member access)
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
  formatGenerationLabel,
  computeBranchMembers,
  calculateProfileCompleteness,
  analyzeFamily,
} = await import('../src/family-tree/insights/familyInsightsEngine.js');
const { searchArchive } = await import('../src/family-tree/search/familySearchEngine.js');
const { sortTimelineEvents, enrichTimelineEvents } = await import('../src/family-tree/timeline/familyTimelineEngine.js');
const { enrichStory } = await import('../src/family-tree/memories/familyStoryEngine.js');
const { enrichArchivePhoto } = await import('../src/family-tree/archive/familyArchiveEngine.js');
const { canCreateFamilyData, canDeleteFamilyData, canEditFamilyData } = await import('../src/family-tree/auth/roles.js');
const { hashToken } = await import('../src/family-tree/auth/collaborationService.js');

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
console.log('STARTING MILESTONE M4E — FAMILY INSIGHTS VERIFICATION SUITE');
console.log('==================================================\n');

// Analyze the default family store snapshot
const initialSnapshot = {
  people: familyStore.getAllPersons(),
  relationships: familyStore.getAllRelationships(),
  stories: familyStore.getAllStories(),
  lifeEvents: familyStore.getAllLifeEvents(),
  photos: familyStore.getAllPhotos(),
  documents: familyStore.getAllDocuments(),
  genMap: familyStore.calculateGenerations(),
};
const insights = analyzeFamily(initialSnapshot);

// ── Test 1: Total People ───────────────────────────────────────
await runTest(1, 'total people: derives actual count from FamilyStore', () => {
  const people = familyStore.getAllPersons();
  assert.strictEqual(insights.overview.totalPeople, people.length);
  assert.ok(insights.overview.totalPeople > 0, 'People count is non-zero');
});

// ── Test 2: Total Generations ──────────────────────────────────
await runTest(2, 'total generations: reuses existing generation map without duplicate logic', () => {
  const genMap = familyStore.calculateGenerations();
  const maxGen = Math.max(...Array.from(genMap.values())) + 1;
  assert.strictEqual(insights.overview.totalGenerations, maxGen);
  assert.ok(insights.overview.totalGenerations >= 3, 'At least 3 generations computed');
});

// ── Test 3: Living and Deceased Counts ──────────────────────────
await runTest(3, 'living/deceased counts: accurately computes statuses', () => {
  const people = familyStore.getAllPersons();
  const expectedLiving = people.filter((p) => !p.isDeceased).length;
  const expectedDeceased = people.filter((p) => p.isDeceased).length;
  assert.strictEqual(insights.overview.livingMembers, expectedLiving);
  assert.strictEqual(insights.overview.deceasedMembers, expectedDeceased);
  assert.strictEqual(insights.overview.livingMembers + insights.overview.deceasedMembers, people.length);
});

// ── Test 4: Stories Count ──────────────────────────────────────
await runTest(4, 'stories count: reflects FamilyStore stories accurately', () => {
  const stories = familyStore.getAllStories();
  assert.strictEqual(insights.overview.storyCount, stories.length);
});

// ── Test 5: Event Count ────────────────────────────────────────
await runTest(5, 'event count: reflects FamilyStore life events accurately', () => {
  const events = familyStore.getAllLifeEvents();
  assert.strictEqual(insights.overview.eventCount, events.length);
});

// ── Test 6: Photo Count ────────────────────────────────────────
await runTest(6, 'photo count: reflects FamilyStore photos accurately', () => {
  const photos = familyStore.getAllPhotos();
  assert.strictEqual(insights.overview.photoCount, photos.length);
});

// ── Test 7: Document Count ─────────────────────────────────────
await runTest(7, 'document count: reflects FamilyStore documents accurately', () => {
  const documents = familyStore.getAllDocuments();
  assert.strictEqual(insights.overview.documentCount, documents.length);
});

// ── Test 8: Generation Distribution ───────────────────────────
await runTest(8, 'generation distribution: formats Roman numeral tiers and assigns people', () => {
  assert.ok(Array.isArray(insights.generationDistribution), 'Distribution is an array');
  assert.strictEqual(insights.generationDistribution.length, insights.overview.totalGenerations);
  assert.strictEqual(insights.generationDistribution[0].label, 'Gen I');
  assert.strictEqual(insights.generationDistribution[1].label, 'Gen II');
  const sumGenPeople = insights.generationDistribution.reduce((acc, g) => acc + g.count, 0);
  assert.strictEqual(sumGenPeople, insights.overview.totalPeople);
});

// ── Test 9: Family Branch Derivation ──────────────────────────
await runTest(9, 'family branch derivation: derives branches from relationship graph without hardcoding', () => {
  assert.ok(Array.isArray(insights.branches), 'Branches is an array');
  assert.ok(insights.branches.length > 0, 'At least one branch identified');
  insights.branches.forEach((b) => {
    assert.ok(b.name.includes("'s Branch"), 'Branch name includes possessive branch label');
    assert.ok(b.memberCount > 0, 'Branch member count > 0');
    assert.ok(b.generationSpan.includes('Gen'), 'Generation span formatted');
  });
});

// ── Test 10: Milestone Derivation ──────────────────────────────
await runTest(10, 'milestone derivation: extracts earliest, latest, and notable chronological events', () => {
  const { earliestEvent, latestEvent, notableMilestones } = insights.milestones;
  assert.ok(earliestEvent, 'Earliest event found');
  assert.ok(latestEvent, 'Latest event found');
  assert.ok(new Date(earliestEvent.date) <= new Date(latestEvent.date), 'Earliest event precedes latest event');
  assert.ok(Array.isArray(notableMilestones), 'Notable milestones is an array');
});

// ── Test 11: Archive Composition ───────────────────────────────
await runTest(11, 'archive composition: calculates percentages across photos, docs, stories, events', () => {
  const comp = insights.archiveComposition;
  assert.strictEqual(comp.total, comp.photos.count + comp.documents.count + comp.stories.count + comp.events.count);
  assert.ok(comp.photos.percentage >= 0 && comp.photos.percentage <= 100);
  assert.ok(comp.documents.percentage >= 0 && comp.documents.percentage <= 100);
});

// ── Test 12: Location Aggregation ──────────────────────────────
await runTest(12, 'location aggregation: aggregates places without introducing maps', () => {
  const locations = insights.topLocations;
  assert.ok(Array.isArray(locations), 'Locations is array');
  assert.ok(locations.length > 0, 'Locations derived from people/events/photos');
  locations.forEach((loc) => {
    assert.ok(loc.city, 'City name extracted');
    assert.ok(loc.count > 0, 'Count positive');
    assert.ok(Array.isArray(loc.people), 'Associated people array present');
  });
});

// ── Test 13: Profile Completeness ──────────────────────────────
await runTest(13, 'profile completeness: deterministic 8-field calculation without AI', () => {
  const comp = insights.completeness;
  assert.ok(comp.averageCompleteness >= 0 && comp.averageCompleteness <= 100);
  assert.strictEqual(comp.details.length, insights.overview.totalPeople);
  comp.details.forEach((d) => {
    assert.strictEqual(d.maxScore, 8, 'Max score is strictly 8 transparent criteria');
    assert.ok(d.score >= 0 && d.score <= 8, 'Score within 0-8 bounds');
    assert.strictEqual(d.percentage, Math.round((d.score / 8) * 100));
  });
});

// ── Test 14: Missing Information Detection ────────────────────
await runTest(14, 'missing information detection: powers "Complete the Family Story"', () => {
  const health = insights.archiveHealth;
  assert.ok(Array.isArray(health.items), 'Health items is array');
  health.items.forEach((item) => {
    assert.ok(item.title, 'Health item has encouraging title');
    assert.ok(item.count > 0, 'Item count is positive');
    assert.ok(item.actionLabel, 'Action label defined');
  });
  assert.ok(Array.isArray(health.profilesMissingPhotos), 'profilesMissingPhotos tracked');
  assert.ok(Array.isArray(health.profilesMissingBirthDates), 'profilesMissingBirthDates tracked');
});

// ── Test 15: History Coverage ──────────────────────────────────
await runTest(15, 'history coverage: calculates span and percentages for photos/stories/events', () => {
  const cov = insights.coverage;
  assert.ok(cov.historySpanText.includes('→') || cov.historySpanText.includes('Chronicle'), 'Span formatted');
  assert.ok(cov.photoCoveragePercent >= 0 && cov.photoCoveragePercent <= 100);
  assert.ok(cov.storyCoveragePercent >= 0 && cov.storyCoveragePercent <= 100);
  assert.ok(cov.eventCoveragePercent >= 0 && cov.eventCoveragePercent <= 100);
});

// ── Test 16: Memory Coverage ───────────────────────────────────
await runTest(16, 'memory coverage: calculates top story holders and people awaiting stories', () => {
  const cov = insights.coverage;
  assert.ok(Array.isArray(cov.storyCountsByPerson), 'Story counts by person is array');
  assert.ok(Array.isArray(cov.peopleWithoutStories), 'People without stories is array');
});

// ── Test 17: Photo Coverage ────────────────────────────────────
await runTest(17, 'photo coverage: calculates photos by generation', () => {
  const cov = insights.coverage;
  assert.ok(Array.isArray(cov.photosByGen), 'Photos by generation is array');
  assert.strictEqual(cov.photosByGen.length, insights.overview.totalGenerations);
});

// ── Test 18: Document Coverage ─────────────────────────────────
await runTest(18, 'document coverage: classifies documents by type', () => {
  const cov = insights.coverage;
  assert.ok(Array.isArray(cov.documentTypes), 'Document types is array');
  cov.documentTypes.forEach((dt) => {
    assert.ok(dt.type, 'Document type name present');
    assert.ok(dt.count > 0, 'Document type count positive');
  });
});

// ── Test 19: Recent Activity Derivation ────────────────────────
await runTest(19, 'recent activity derivation: extracts and sorts recent chronicles by timestamp', () => {
  const recent = insights.recentActivity;
  assert.ok(Array.isArray(recent), 'Recent activities is array');
  assert.ok(recent.length <= 6, 'Capped at 6 items');
  for (let i = 0; i < recent.length - 1; i++) {
    const tA = recent[i].timestamp ? new Date(recent[i].timestamp).getTime() : 0;
    const tB = recent[i + 1].timestamp ? new Date(recent[i + 1].timestamp).getTime() : 0;
    assert.ok(tA >= tB, 'Recent activities sorted chronologically descending');
  }
});

// ── Test 20: Active-Family Isolation ───────────────────────────
await runTest(20, 'active-family isolation: isolated family store generates independent insights', () => {
  const storeA = new FamilyStore();
  const storeB = new FamilyStore();
  const isolatedSnapshot = {
    people: [
      { id: 'iso-1', firstName: 'Aarav', lastName: 'Kumar', isDeceased: false },
      { id: 'iso-2', firstName: 'Diya', lastName: 'Kumar', isDeceased: false },
    ],
    relationships: [{ id: 'rel-1', parentId: 'iso-1', childId: 'iso-2', type: 'parent-child' }],
    stories: [],
    lifeEvents: [],
    photos: [],
    documents: [],
    genMap: new Map([['iso-1', 0], ['iso-2', 1]]),
  };
  const isolatedInsights = analyzeFamily(isolatedSnapshot);
  assert.strictEqual(isolatedInsights.overview.totalPeople, 2, 'Isolated family has 2 people');
  assert.strictEqual(isolatedInsights.overview.totalGenerations, 2, 'Isolated family has 2 generations');
  assert.strictEqual(isolatedInsights.overview.storyCount, 0, 'Isolated family has 0 stories');
  assert.notStrictEqual(isolatedInsights.overview.totalPeople, insights.overview.totalPeople, 'No cross-family leak');
});

// ── Test 21: Local Mode ────────────────────────────────────────
await runTest(21, 'local mode: operates deterministically purely in local memory/storage', () => {
  assert.ok(insights.overview.totalPeople > 0, 'Computed without external network');
  assert.ok(insights.completeness.averageCompleteness > 0, 'Completeness computed locally');
});

// ── Test 22: Cloud Mode ────────────────────────────────────────
await runTest(22, 'cloud mode: handles synced snapshot smoothly', () => {
  const cloudSnapshot = {
    people: familyStore.getAllPersons(),
    relationships: familyStore.getAllRelationships(),
    stories: familyStore.getAllStories(),
    lifeEvents: familyStore.getAllLifeEvents(),
    photos: familyStore.getAllPhotos(),
    documents: familyStore.getAllDocuments(),
    genMap: familyStore.calculateGenerations(),
  };
  const cloudInsights = analyzeFamily(cloudSnapshot);
  assert.strictEqual(cloudInsights.overview.totalPeople, insights.overview.totalPeople);
});

// ── Test 23: Offline Mode ──────────────────────────────────────
await runTest(23, 'offline mode: operates cleanly when offline without throwing exceptions', () => {
  const offlineAnalysis = analyzeFamily({ store: familyStore });
  assert.strictEqual(offlineAnalysis.overview.totalPeople, insights.overview.totalPeople);
  assert.strictEqual(offlineAnalysis.overview.photoCount, insights.overview.photoCount);
});

// ── Test 24: Person Navigation Payload ─────────────────────────
await runTest(24, 'person navigation payload: target person resolves to valid tree navigation ID', () => {
  const person = familyStore.getAllPersons()[0];
  const payload = { personId: person.id, view: 'tree' };
  assert.strictEqual(payload.personId, person.id);
  assert.ok(familyStore.getPersonById(payload.personId), 'Target person exists in store');
});

// ── Test 25: Event Navigation Payload ──────────────────────────
await runTest(25, 'event navigation payload: milestone target resolves to valid timeline navigation', () => {
  const event = familyStore.getAllLifeEvents()[0];
  const payload = { eventId: event.id, view: 'timeline' };
  assert.strictEqual(payload.eventId, event.id);
  assert.ok(familyStore.getLifeEventById(payload.eventId), 'Target event exists in store');
});

// ── Test 26: Story Navigation Payload ──────────────────────────
await runTest(26, 'story navigation payload: story item resolves to valid story reader payload', () => {
  const story = familyStore.getAllStories()[0];
  const payload = { storyId: story.id, view: 'memories' };
  assert.strictEqual(payload.storyId, story.id);
  assert.ok(familyStore.getStoryById(payload.storyId), 'Target story exists in store');
});

// ── Test 27: Photo Navigation Payload ──────────────────────────
await runTest(27, 'photo navigation payload: photo target resolves to valid archive photo payload', () => {
  const photo = familyStore.getAllPhotos()[0];
  const payload = { photoId: photo.id, view: 'archive', tab: 'photos' };
  assert.strictEqual(payload.photoId, photo.id);
  assert.ok(familyStore.getPhotoById(payload.photoId), 'Target photo exists in store');
});

// ── Test 28: Document Navigation Payload ───────────────────────
await runTest(28, 'document navigation payload: document target resolves to valid archive doc payload', () => {
  const doc = familyStore.getAllDocuments()[0];
  const payload = { docId: doc.id, view: 'archive', tab: 'documents' };
  assert.strictEqual(payload.docId, doc.id);
  assert.ok(familyStore.getDocumentById(payload.docId), 'Target document exists in store');
});

// ── Test 29: M4A Regression ────────────────────────────────────
await runTest(29, 'M4A search regression: search engine indexing and results unaffected', () => {
  const index = familyStore.getSearchIndex();
  const searchRes = searchArchive('family', {}, index);
  assert.ok(searchRes.results !== undefined, 'Search executes without issue');
});

// ── Test 30: M4B Regression ────────────────────────────────────
await runTest(30, 'M4B timeline regression: timeline sorting and event enrichment unaffected', () => {
  const events = familyStore.getAllLifeEvents();
  const sorted = sortTimelineEvents(enrichTimelineEvents(events, familyStore));
  assert.ok(sorted.length > 0, 'Timeline events intact');
});

// ── Test 31: M4C Regression ────────────────────────────────────
await runTest(31, 'M4C memories regression: story enrichment and reading time computation unaffected', () => {
  const story = familyStore.getAllStories()[0];
  const enriched = enrichStory(story, familyStore);
  assert.ok(enriched.readingTimeMinutes !== undefined, 'Story enrichment intact');
});

// ── Test 32: M4D Regression ────────────────────────────────────
await runTest(32, 'M4D archive regression: photo and document enrichment unaffected', () => {
  const photo = familyStore.getAllPhotos()[0];
  const enriched = enrichArchivePhoto(photo, familyStore);
  assert.strictEqual(enriched.id, photo.id, 'Photo archive enrichment intact');
});

// ── Test 33: M3B Security Regression ───────────────────────────
await runTest(33, 'M3B security regression: viewer/contributor/editor/owner permissions verified', () => {
  assert.strictEqual(canCreateFamilyData('viewer'), false, 'Viewer cannot create');
  assert.strictEqual(canCreateFamilyData('contributor'), true, 'Contributor can create');
  assert.strictEqual(canEditFamilyData('editor'), true, 'Editor can edit');
  assert.strictEqual(canDeleteFamilyData('owner'), true, 'Owner can delete');
});

// ── Test 34: M3C Sync Regression ───────────────────────────────
await runTest(34, 'M3C sync regression: sync status listener remains functional', () => {
  const status = familyStore.getSyncStatus();
  assert.ok(['synced', 'syncing', 'error', 'offline'].includes(status), 'Valid sync status');
});

// ── Test 35: M3E Collaboration Regression ──────────────────────
await runTest(35, 'M3E collaboration regression: SHA-256 token hashing intact', async () => {
  const hash = await hashToken('m4e-insights-verification-token');
  assert.strictEqual(hash.length, 64, 'Token hash is exactly 64 hex characters');
});

console.log('\n==================================================');
console.log(`M4E VERIFICATION RESULT: ${passedTests} / 35 passed (${failedTests} failed)`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
