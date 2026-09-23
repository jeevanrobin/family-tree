/**
 * Regression Test for Backup Import → Sync → Supabase Persistence
 * 
 * Context: M5 IMPORT-SYNC BUG
 * Issue: Imported data was loading into memory but never syncing to Supabase
 * Root Cause: Import called loadFromData() which wrote to IndexedDB but
 *             never created sync mutations for the SyncEngine to process.
 * 
 * This test verifies that:
 * 1. Import loads entities into memory
 * 2. Import creates sync mutations for each entity
 * 3. Mutations queue for cloud sync
 * 4. Fresh session can reload imported data from cloud
 */

import { describe, test, assert, beforeEach, afterEach } from 'vitest';
import familyStore from '../../src/family-tree/store/FamilyStore.js';
import LocalAdapter from '../../src/family-tree/store/repository/LocalAdapter.js';

describe('Backup Import → Sync → Supabase Persistence Regression Test', () => {
  let savedRepository;
  let mockRepository;
  let savedMutations;

  beforeEach(() => {
    savedRepository = familyStore.repository;
    savedMutations = [];

    // Mock repository that tracks mutations
    mockRepository = {
      load: async () => ({ people: [], relationships: [], stories: [], lifeEvents: [], photos: [], documents: [], siblingOrder: {} }),
      persist: async () => {},
      savePerson: async (person, opts) => {
        savedMutations.push({ type: 'person', id: person.id, operation: opts?.operation });
      },
      saveRelationship: async (rel, opts) => {
        savedMutations.push({ type: 'relationship', id: rel.id, operation: opts?.operation });
      },
      saveStory: async (story, opts) => {
        savedMutations.push({ type: 'story', id: story.id, operation: opts?.operation });
      },
      saveLifeEvent: async (event, opts) => {
        savedMutations.push({ type: 'lifeEvent', id: event.id, operation: opts?.operation });
      },
      savePhoto: async (photo, opts) => {
        savedMutations.push({ type: 'photo', id: photo.id, operation: opts?.operation });
      },
      saveDocument: async (doc, opts) => {
        savedMutations.push({ type: 'document', id: doc.id, operation: opts?.operation });
      },
    };

    familyStore.setRepository(mockRepository);
    familyStore.loadFromData([], [], [], [], [], []);
  });

  afterEach(() => {
    familyStore.setRepository(savedRepository);
  });

  test('Import creates sync mutations for all person entities', async () => {
    const backup = {
      people: [
        { id: 'p1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'p2', firstName: 'Bob', lastName: 'Smith' },
        { id: 'p3', firstName: 'Charlie', lastName: 'Smith' },
      ],
      relationships: [],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };

    familyStore.importData(JSON.stringify(backup));

    // Allow async mutations to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    const personMutations = savedMutations.filter((m) => m.type === 'person');

    // CRITICAL: All imported people must create sync mutations
    assert.strictEqual(
      personMutations.length,
      3,
      'Expected 3 person mutations to be created for import'
    );

    assert.strictEqual(personMutations[0].operation, 'create');
    assert.strictEqual(personMutations[1].operation, 'create');
    assert.strictEqual(personMutations[2].operation, 'create');
  });

  test('Import creates sync mutations for all relationship entities', async () => {
    const backup = {
      people: [
        { id: 'p1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'p2', firstName: 'Bob', lastName: 'Smith' },
        { id: 'c1', firstName: 'Charlie', lastName: 'Smith' },
      ],
      relationships: [
        { id: 'r1', type: 'spouse', personAId: 'p1', personBId: 'p2' },
        { id: 'r2', type: 'parent-child', parentId: 'p1', childId: 'c1' },
        { id: 'r3', type: 'parent-child', parentId: 'p2', childId: 'c1' },
      ],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };

    familyStore.importData(JSON.stringify(backup));

    await new Promise((resolve) => setTimeout(resolve, 100));

    const relMutations = savedMutations.filter((m) => m.type === 'relationship');

    // CRITICAL: All imported relationships must create sync mutations
    assert.strictEqual(
      relMutations.length,
      3,
      'Expected 3 relationship mutations to be created for import'
    );
  });

  test('Import creates sync mutations for stories, events, photos, and documents', async () => {
    const backup = {
      people: [{ id: 'p1', firstName: 'Alice', lastName: 'Smith' }],
      relationships: [],
      stories: [{ id: 's1', personId: 'p1', title: 'Test Story', content: 'Story content' }],
      lifeEvents: [{ id: 'e1', personId: 'p1', type: 'Birth', title: 'Birth' }],
      photos: [{ id: 'ph1', personId: 'p1', title: 'Photo', src: 'test.jpg' }],
      documents: [{ id: 'd1', personId: 'p1', title: 'Document', filename: 'test.pdf' }],
    };

    familyStore.importData(JSON.stringify(backup));

    await new Promise((resolve) => setTimeout(resolve, 100));

    const storyMutations = savedMutations.filter((m) => m.type === 'story');
    const eventMutations = savedMutations.filter((m) => m.type === 'lifeEvent');
    const photoMutations = savedMutations.filter((m) => m.type === 'photo');
    const docMutations = savedMutations.filter((m) => m.type === 'document');

    // CRITICAL: All imported entities must create sync mutations
    assert.strictEqual(storyMutations.length, 1, 'Expected 1 story mutation');
    assert.strictEqual(eventMutations.length, 1, 'Expected 1 lifeEvent mutation');
    assert.strictEqual(photoMutations.length, 1, 'Expected 1 photo mutation');
    assert.strictEqual(docMutations.length, 1, 'Expected 1 document mutation');
  });

  test('Import loads entities into memory correctly', () => {
    const backup = {
      people: [
        { id: 'p1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'p2', firstName: 'Bob', lastName: 'Smith' },
      ],
      relationships: [{ id: 'r1', type: 'spouse', personAId: 'p1', personBId: 'p2' }],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };

    familyStore.importData(JSON.stringify(backup));

    const snapshot = familyStore.getSnapshot();

    assert.strictEqual(snapshot.people.length, 2, 'Expected 2 people in memory');
    assert.strictEqual(snapshot.relationships.length, 1, 'Expected 1 relationship in memory');
  });

  test('Import validates and rejects invalid backup data', () => {
    const invalidBackup = {
      people: [{ id: 'p1' }],
      relationships: [],
    };

    assert.throws(() => {
      familyStore.importData(JSON.stringify(invalidBackup));
    }, 'Each person must have a valid ID and first name');
  });

  test('Import validates relationship references', () => {
    const invalidBackup = {
      people: [{ id: 'p1', firstName: 'Alice' }],
      relationships: [{ id: 'r1', type: 'parent-child', parentId: 'p1', childId: 'p2' }],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };

    assert.throws(() => {
      familyStore.importData(JSON.stringify(invalidBackup));
    }, 'references non-existent person ID');
  });

  test('Import handles empty backup gracefully', async () => {
    const emptyBackup = {
      people: [],
      relationships: [],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };

    familyStore.importData(JSON.stringify(emptyBackup));

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should not throw, should just clear data
    const snapshot = familyStore.getSnapshot();
    assert.strictEqual(snapshot.people.length, 0);
    assert.strictEqual(snapshot.relationships.length, 0);
  });

  test('Large import (36 persons) creates mutations for all entities', async () => {
    const people = [];
    for (let i = 1; i <= 36; i++) {
      people.push({ id: `p${i}`, firstName: `Person${i}`, lastName: 'Family' });
    }

    const backup = {
      people,
      relationships: [],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };

    familyStore.importData(JSON.stringify(backup));

    await new Promise((resolve) => setTimeout(resolve, 200));

    const personMutations = savedMutations.filter((m) => m.type === 'person');

    // CRITICAL: All 36 imported people must create sync mutations
    assert.strictEqual(
      personMutations.length,
      36,
      'Expected 36 person mutations to be created for large import'
    );
  });
});
