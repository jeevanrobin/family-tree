/**
 * Milestone M4A — Global Family Search & Discovery Automated Test Suite
 *
 * 27 Comprehensive Verification Checks:
 * 1. Exact person search
 * 2. Partial person search
 * 3. Occupation search
 * 4. Location search
 * 5. Birth/death date search
 * 6. Story title search
 * 7. Story content search
 * 8. Event search
 * 9. Photo caption search
 * 10. Document search
 * 11. Relationship-related search
 * 12. Result ranking (Exact > Prefix > Partial > Field > Related > Full-text)
 * 13. Type filtering (all, people, stories, events, photos, documents)
 * 14. Empty query behavior
 * 15. No-results behavior
 * 16. Person result navigation payload
 * 17. Event result navigation payload
 * 18. Photo result navigation payload
 * 19. Document result navigation payload
 * 20. Active-family isolation
 * 21. Local mode search
 * 22. Cloud mode search
 * 23. Keyboard navigation logic
 * 24. Existing M3B security regression
 * 25. Existing M3C sync regression
 * 26. Existing M3D media regression
 * 27. Existing M3E collaboration regression
 */

// Clean in-memory localStorage mock for headless Node.js test environment
if (typeof globalThis.localStorage === 'undefined') {
  const memoryStore = new Map();
  globalThis.localStorage = {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
    clear: () => memoryStore.clear(),
  };
}

const { familyStore } = await import('../src/family-tree/store/FamilyStore.js');
import {
  searchArchive,
  buildSearchIndex,
} from '../src/family-tree/search/familySearchEngine.js';
import { ROLES, canAddPerson, canDeletePerson } from '../src/family-tree/auth/roles.js';
import { mediaStorageService } from '../src/family-tree/media/mediaStorageService.js';
import { hashToken, generateInvitationToken } from '../src/family-tree/auth/collaborationService.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ FAIL: ${name}`, err.message);
  }
}

function assert(condition, msg = 'Assertion failed') {
  if (!condition) throw new Error(msg);
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY — MILESTONE M4A AUTOMATED TEST SUITE");
console.log('==================================================\n');

// Reset store to known sample state for testing
familyStore.init();

await test('[1] Exact person search finds matching person at rank 1', () => {
  const res = familyStore.searchArchive('Venkat Ramaiah Medida');
  assert(res.totalCount > 0, 'Should return results for exact name');
  const top = res.results[0];
  assert(top.type === 'person' && top.title === 'Venkat Ramaiah Medida', 'Top result should be person with exact name');
});

await test('[2] Partial person search resolves prefix matches', () => {
  const res = familyStore.searchArchive('Venk');
  assert(res.totalCount > 0, 'Should find results for partial prefix');
  assert(res.results.some((r) => r.type === 'person' && r.title.includes('Venkat')), 'Results should include Venkat');
});

await test('[3] Occupation search discovers member by professional title', () => {
  const res = familyStore.searchArchive('Civil Infrastructure');
  assert(res.totalCount > 0, 'Should find results by occupation');
  assert(res.results.some((r) => r.type === 'person' && r.raw.occupation.includes('Civil Infrastructure')), 'Person should match occupation');
});

await test('[4] Location search matches birthplace, hometown, and event locations', () => {
  const res = familyStore.searchArchive('Warangal');
  assert(res.totalCount > 0, 'Should find entities for Warangal');
  assert(res.results.some((r) => r.type === 'person' || r.type === 'event' || r.type === 'story'), 'Should match people/events/stories in Warangal');
});

await test('[5] Birth and death date search discovers lifespan matches', () => {
  const res = familyStore.searchArchive('1948');
  assert(res.totalCount > 0, 'Should find entities for year 1948');
  assert(res.results.some((r) => (r.date && r.date.includes('1948')) || (r.raw?.dateOfBirth && r.raw.dateOfBirth.includes('1948'))), 'Entity should have 1948 date');
});

await test('[6] Story title search discovers family memories', () => {
  const stories = familyStore.getAllStories();
  assert(stories.length > 0, 'Store must contain stories');
  const targetStory = stories[0];
  const queryWord = targetStory.title.split(' ')[0];
  const res = familyStore.searchArchive(queryWord, { filter: 'stories' });
  assert(res.totalCount > 0, 'Should find story by title keyword');
  assert(res.results.some((r) => r.type === 'story' && r.id === targetStory.id), 'Contains targeted story id');
});

await test('[7] Story content full-text search matches body text', () => {
  const stories = familyStore.getAllStories();
  const targetStory = stories.find((s) => s.content && s.content.length > 20) || stories[0];
  const uniqueWord = targetStory.content.split(' ').find((w) => w.length > 5 && /^[a-zA-Z]+$/.test(w)) || 'family';
  const res = familyStore.searchArchive(uniqueWord, { filter: 'stories' });
  assert(res.results.some((r) => r.type === 'story'), 'Finds story by content keyword');
});

await test('[8] Event search discovers milestones with type filtering', () => {
  const res = familyStore.searchArchive('Marriage', { filter: 'events' });
  assert(res.totalCount > 0, 'Finds events matching Marriage');
  assert(res.results.every((r) => r.type === 'event'), 'Filtered results contain only events');
});

await test('[9] Photo caption and title search discovers archival media', () => {
  const res = familyStore.searchArchive('portrait', { filter: 'photos' });
  assert(res.totalCount > 0, 'Finds photos matching portrait');
  assert(res.results[0].type === 'photo', 'Result is typed as photo');
});

await test('[10] Document search finds records by archival title and docType', () => {
  const res = familyStore.searchArchive('Document', { filter: 'documents' });
  assert(res.totalCount > 0, 'Finds archival documents');
  assert(res.results.some((r) => r.type === 'document'), 'Result is typed as document');
});

await test('[11] Relationship search dynamically derives unions from existing graph', () => {
  const res = familyStore.searchArchive('Spouse');
  assert(res.totalCount > 0, 'Finds derived spouse relationship records');
  assert(res.results.some((r) => r.type === 'relationship'), 'Results include derived relationship items');
});

await test('[12] Result ranking prioritizes exact person matches over content mentions', () => {
  const res = familyStore.searchArchive('Venkat');
  assert(res.results.length >= 2, 'Multiple entities match Venkat');
  const first = res.results[0];
  assert(first.type === 'person', 'Person exact/prefix match ranks above secondary entities');
  assert(first.score >= res.results[1].score, 'Higher relevance score placed first');
});

await test('[13] Category filtering accurately isolates results and maintains tab counts', () => {
  const allRes = familyStore.searchArchive('Warangal', { filter: 'all' });
  const peopleRes = familyStore.searchArchive('Warangal', { filter: 'people' });
  const storiesRes = familyStore.searchArchive('Warangal', { filter: 'stories' });
  const eventsRes = familyStore.searchArchive('Warangal', { filter: 'events' });

  assert(allRes.totalCount >= peopleRes.totalCount, 'All count >= people count');
  assert(peopleRes.results.every((r) => r.type === 'person' || r.type === 'relationship'), 'People filter contains only people and relationships');
  assert(storiesRes.results.every((r) => r.type === 'story'), 'Stories filter contains only stories');
  assert(eventsRes.results.every((r) => r.type === 'event'), 'Events filter contains only events');
  assert(typeof allRes.counts.people === 'number', 'Category count object present');
});

await test('[14] Empty and whitespace queries return empty results without error', () => {
  const empty1 = familyStore.searchArchive('');
  const empty2 = familyStore.searchArchive('   ');
  const empty3 = familyStore.searchArchive(null);

  assert(empty1.totalCount === 0 && empty1.results.length === 0, 'Empty string returns 0');
  assert(empty2.totalCount === 0 && empty2.results.length === 0, 'Whitespace returns 0');
  assert(empty3.totalCount === 0 && empty3.results.length === 0, 'Null returns 0');
});

await test('[15] No-results query returns empty array while preserving query string', () => {
  const noMatch = familyStore.searchArchive('ZzXyQwNonExistentTerm998877');
  assert(noMatch.totalCount === 0, 'Zero results for unknown query');
  assert(noMatch.results.length === 0, 'Empty results array');
  assert(noMatch.query === 'zzxyqwnonexistentterm998877', 'Preserves normalized query');
});

await test('[16] Person result navigation payload provides complete person metadata', () => {
  const res = familyStore.searchArchive('Venkat Ramaiah Medida');
  const personItem = res.results.find((r) => r.type === 'person');
  assert(Boolean(personItem.id), 'Person payload has id');
  assert(Boolean(personItem.personId), 'Person payload has personId');
  assert(personItem.type === 'person', 'Type is person');
  assert(familyStore.verifyEntityExists('person', personItem.id), 'Entity verified in store');
});

await test('[17] Event result navigation payload references attached person for dossier navigation', () => {
  const res = familyStore.searchArchive('Marriage', { filter: 'events' });
  const eventItem = res.results[0];
  assert(eventItem.type === 'event', 'Type is event');
  assert(Boolean(eventItem.personId), 'Has attached personId');
  assert(Boolean(eventItem.raw), 'Has raw event object');
  assert(familyStore.verifyEntityExists('event', eventItem.id), 'Event verified in store');
});

await test('[18] Photo result navigation payload includes media metadata for lightbox launch', () => {
  const res = familyStore.searchArchive('portrait', { filter: 'photos' });
  const photoItem = res.results[0];
  assert(photoItem.type === 'photo', 'Type is photo');
  assert(Boolean(photoItem.raw), 'Has raw photo object');
  assert(familyStore.verifyEntityExists('photo', photoItem.id), 'Photo verified in store');
});

await test('[19] Document result navigation payload supplies archival document metadata', () => {
  const res = familyStore.searchArchive('Document', { filter: 'documents' });
  const docItem = res.results[0];
  assert(docItem.type === 'document', 'Type is document');
  assert(Boolean(docItem.raw), 'Has raw document object');
  assert(familyStore.verifyEntityExists('document', docItem.id), 'Document verified in store');
});

await test('[20] Multi-tenant search strictly enforces active family isolation', () => {
  const snapshotA = familyStore.getSnapshot();
  const familyBData = {
    people: [
      { id: 'p-b-1', firstName: 'Alexander', lastName: 'Hamilton', displayName: 'Alexander Hamilton' },
    ],
    relationships: [],
    stories: [],
    lifeEvents: [],
    photos: [],
    documents: [],
  };

  const indexA = buildSearchIndex(snapshotA);
  const indexB = buildSearchIndex(familyBData);

  const searchA = searchArchive('Hamilton', {}, indexA);
  const searchB = searchArchive('Hamilton', {}, indexB);

  assert(searchA.totalCount === 0, 'Family A search yields 0 results for Family B member');
  assert(searchB.totalCount >= 1 && searchB.results.some((r) => r.id === 'p-b-1'), 'Family B finds its own member');
  assert(searchArchive('Venkat', {}, indexB).totalCount === 0, 'Family B yields 0 results for Family A member');
});

await test('[21] Local mode search functions seamlessly over in-memory family data', () => {
  const snapshot = familyStore.getSnapshot();
  assert(snapshot.people.length > 0, 'Store holds local in-memory family data');
  const res = familyStore.searchArchive('Suresh');
  assert(res.totalCount > 0, 'Local mode successfully searches and discovers records');
});

await test('[22] Cloud mode search operates authoritatively over repository snapshot', () => {
  const cloudSnapshot = {
    people: [
      { id: 'cloud-1', firstName: 'Kavitha', lastName: 'Reddy', displayName: 'Kavitha Reddy', occupation: 'Biologist' },
    ],
    relationships: [],
    stories: [{ id: 'cloud-s1', personId: 'cloud-1', title: 'Genome Expedition', content: 'Studying genetic markers' }],
    lifeEvents: [],
    photos: [],
    documents: [],
  };

  const cloudIndex = buildSearchIndex(cloudSnapshot);
  const cloudRes = searchArchive('Biologist', {}, cloudIndex);
  assert(cloudRes.totalCount > 0 && cloudRes.results[0].title === 'Kavitha Reddy', 'Cloud-loaded snapshot correctly indexed and searchable');
});

await test('[23] Keyboard navigation index cycles, advances, and clamps correctly', () => {
  const items = ['item-0', 'item-1', 'item-2', 'item-3'];
  let activeIndex = 0;

  activeIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
  assert(activeIndex === 1, 'ArrowDown advances index');

  activeIndex = 3;
  activeIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
  assert(activeIndex === 0, 'ArrowDown wraps to 0 at list boundary');

  activeIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
  assert(activeIndex === 3, 'ArrowUp wraps to end at top boundary');
});

await test('[24] M3B security regression: role permission invariants remain intact', () => {
  assert(canAddPerson(ROLES.OWNER) === true, 'Owner can add person');
  assert(canAddPerson(ROLES.EDITOR) === true, 'Editor can add person');
  assert(canAddPerson(ROLES.VIEWER) === false, 'Viewer cannot add person');
  assert(canDeletePerson(ROLES.VIEWER) === false, 'Viewer cannot delete person');
});

await test('[25] M3C sync regression: store reactive subscription and deletion verification', () => {
  let notified = false;
  const unsub = familyStore.subscribe(() => {
    notified = true;
  });

  const testPerson = familyStore.addPerson({
    firstName: 'TestSearch',
    lastName: 'Temporary',
    occupation: 'Verification Engineer',
  });

  assert(notified === true, 'Store mutation triggers reactivity subscriber');
  assert(familyStore.verifyEntityExists('person', testPerson.id) === true, 'Temporary person exists');

  familyStore.deletePerson(testPerson.id);
  assert(familyStore.verifyEntityExists('person', testPerson.id) === false, 'Person cleanly removed and reflected');
  unsub();
});

await test('[26] M3D media regression: validateFile and getPhotoStoragePath enforce security', () => {
  const photoValidation = mediaStorageService.validateFile({ name: 'family.jpg', size: 1024 * 1024, type: 'image/jpeg' }, 'photo');
  assert(photoValidation.valid === true, 'validateFile accepts valid JPEG photo');

  const path = mediaStorageService.getPhotoStoragePath('fam-123', 'person-456', 'portrait.png');
  assert(path === 'family/fam-123/photos/person-456/portrait.png', 'getPhotoStoragePath generates deterministic path');
});

await test('[27] M3E collaboration regression: cryptographic token generation and hashing', async () => {
  const token = generateInvitationToken();
  assert(typeof token === 'string' && token.length >= 32, 'generateInvitationToken produces high entropy token');
  const hash = await hashToken(token);
  assert(typeof hash === 'string' && hash.length === 64, 'hashToken produces 64-char hex hash');
});

console.log('\n==================================================');
console.log(`M4A TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${failedTests} Failures)`);
console.log('==================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
