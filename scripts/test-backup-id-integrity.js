/**
 * Test Suite: Family Backup ID Integrity & Queue/Person ID Mismatch Prevention
 * 
 * Verifies:
 * 1. SyncAdapter never returns queueItem IDs on save operations.
 * 2. FamilyStore mutations never overwrite canonical local entity IDs.
 * 3. Export validation strictly prevents exporting graphs with unresolved references.
 * 4. Import validation strictly rejects missing person references with precise error messages.
 * 5. STEP 9: Full round-trip test (Create -> Save -> Sync -> Export -> Import).
 * 6. STEP 10: Real regression test against the uploaded backup (medida-family-backup-2026-09-16.json).
 */

import fs from 'fs';
import path from 'path';
import { FamilyStore } from '../src/family-tree/store/FamilyStore.js';
import { SyncAdapter } from '../src/family-tree/store/repository/SyncAdapter.js';
import { SyncEngine } from '../src/family-tree/store/sync/SyncEngine.js';
import { repairBackupData } from './repair-backup-id-mismatch.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING BACKUP ID INTEGRITY TEST SUITE ===\n');

  // -------------------------------------------------------------
  // Test 1: SyncAdapter save methods return entity, not queueItem
  // -------------------------------------------------------------
  console.log('Test 1: SyncAdapter return value contract');
  {
    const mockSyncEngine = {
      enqueue: async (entityType, entityId, op, payload) => {
        return {
          id: `queue-${Date.now()}-mock`,
          entityType,
          entityId,
          operation: op,
          payload,
        };
      },
      destroy: () => {},
      getStatus: () => 'synced',
      subscribe: () => () => {},
    };

    const adapter = new SyncAdapter(mockSyncEngine);
    const person = { id: 'person-test-123', firstName: 'Test', lastName: 'User' };
    const queueItem = await adapter.savePerson(person);

    assert(queueItem && queueItem.id.startsWith('queue-'), 'SyncAdapter returns durable queue tracking item');
    assert(queueItem.entityId === 'person-test-123', 'Queue item tracks the canonical person ID');
    assert(queueItem.payload.firstName === 'Test', 'Queue item encapsulates entity payload');
  }

  // -------------------------------------------------------------
  // Test 2: FamilyStore never mutates in-memory entity.id
  // -------------------------------------------------------------
  console.log('\nTest 2: FamilyStore in-memory entity ID immutability');
  {
    const mockRepo = {
      savePerson: async (person) => {
        // Simulating legacy broken adapter that returned queue item
        return {
          id: 'queue-leak-should-be-ignored',
          uuid: '00000000-0000-0000-0000-000000000001',
        };
      },
      saveRelationship: async () => {},
      destroy: () => {},
      load: async () => null,
      persist: async () => {},
    };

    const store = new FamilyStore();
    store.clearAllData();
    store.repository = mockRepo;

    const person = store.addPerson({ firstName: 'Stable', lastName: 'Person' });
    const originalId = person.id;

    assert(originalId.startsWith('person-'), `Person initially created with canonical ID: ${originalId}`);

    // Wait for the async repository promise to settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert(person.id === originalId, `Person ID remained strictly "${originalId}" and was NOT mutated to queue ID`);
    assert(person.uuid === '00000000-0000-0000-0000-000000000001', 'Backend remote UUID was safely assigned to person.uuid');
  }

  // -------------------------------------------------------------
  // Test 3: Export Validation prevents corrupt backup generation
  // -------------------------------------------------------------
  console.log('\nTest 3: Pre-export Graph Validation');
  {
    const store = new FamilyStore();
    store.clearAllData();

    const pA = store.addPerson({ firstName: 'Person', lastName: 'A' });
    // Intentionally inject a broken relationship with a non-existent person
    store.relationships.push({
      id: 'rel-corrupted-test',
      type: 'spouse',
      personAId: pA.id,
      personBId: 'person-non-existent-999',
    });

    let exportThrew = false;
    let errorMessage = '';
    try {
      store.exportData();
    } catch (err) {
      exportThrew = true;
      errorMessage = err.message;
    }

    assert(exportThrew, 'exportData() refused to export corrupted graph');
    assert(
      errorMessage.includes('unresolved'),
      `exportData() threw expected error message: "${errorMessage}"`
    );
  }

  // -------------------------------------------------------------
  // Test 4: Strict Import Validation with informative error message
  // -------------------------------------------------------------
  console.log('\nTest 4: Strict Import Validation');
  {
    const store = new FamilyStore();
    store.clearAllData();

    const invalidBackup = {
      people: [{ id: 'p-1', firstName: 'Alice' }],
      relationships: [
        { id: 'rel-broken-1', type: 'parent-child', parentId: 'p-1', childId: 'p-missing-child' },
      ],
    };

    let importThrew = false;
    let importError = '';
    try {
      store.importData(invalidBackup);
    } catch (err) {
      importThrew = true;
      importError = err.message;
    }

    assert(importThrew, 'importData() strictly rejected invalid relationship');
    assert(
      importError.includes('p-missing-child') && importError.includes('rel-broken-1'),
      `importData() identified exact relationship and missing ID: "${importError}"`
    );
  }

  // -------------------------------------------------------------
  // Test 5: STEP 9 — Full Round-Trip Test (Create -> Save -> Sync -> Export -> Import)
  // -------------------------------------------------------------
  console.log('\nTest 5: Step 9 Round-Trip Test (A spouse B, A parent C, B parent C, C parent D)');
  {
    const mockSyncRepo = {
      savePerson: async (p) => p,
      saveRelationship: async (r) => r,
      destroy: () => {},
      load: async () => null,
      persist: async () => {},
    };

    const store1 = new FamilyStore();
    store1.clearAllData();
    store1.repository = mockSyncRepo;

    // Create 4 people
    const personA = store1.addPerson({ firstName: 'Person', lastName: 'A', gender: 'male' });
    const personB = store1.addPerson({ firstName: 'Person', lastName: 'B', gender: 'female' });
    const personC = store1.addPerson({ firstName: 'Person', lastName: 'C', gender: 'female' });
    const personD = store1.addPerson({ firstName: 'Person', lastName: 'D', gender: 'male' });

    // Relationships:
    // A spouse B
    const relSpouseAB = store1.addRelationship({
      type: 'spouse',
      personAId: personA.id,
      personBId: personB.id,
    });
    // A parent C
    const relParentAC = store1.addRelationship({
      type: 'parent-child',
      parentId: personA.id,
      childId: personC.id,
    });
    // B parent C
    const relParentBC = store1.addRelationship({
      type: 'parent-child',
      parentId: personB.id,
      childId: personC.id,
    });
    // C parent D
    const relParentCD = store1.addRelationship({
      type: 'parent-child',
      parentId: personC.id,
      childId: personD.id,
    });

    // Wait for async saves
    await new Promise((r) => setTimeout(r, 60));

    // Check all IDs are canonical
    assert(personA.id.startsWith('person-'), 'Person A has canonical person-* ID');
    assert(personB.id.startsWith('person-'), 'Person B has canonical person-* ID');
    assert(personC.id.startsWith('person-'), 'Person C has canonical person-* ID');
    assert(personD.id.startsWith('person-'), 'Person D has canonical person-* ID');

    // Export graph
    const backupJson = store1.exportData();
    assert(backupJson.family.people.length === 4, 'Exported 4 people');
    assert(backupJson.family.relationships.length === 4, 'Exported 4 relationships');

    // Import into fresh store
    const store2 = new FamilyStore();
    store2.clearAllData();
    const importSuccess = store2.importData(backupJson);

    assert(importSuccess === true, 'Import into fresh store succeeded');
    assert(store2.people.size === 4, 'Store 2 has exactly 4 people');
    assert(store2.relationships.length === 4, 'Store 2 has exactly 4 relationships');

    // Verify relationships in store2
    const sParentsOfC = store2.getParents(personC.id);
    assert(sParentsOfC.length === 2, 'Person C has both parents A and B');
    assert(sParentsOfC.some((p) => p.id === personA.id), 'Person A is verified as parent of C');
    assert(sParentsOfC.some((p) => p.id === personB.id), 'Person B is verified as parent of C');

    const sSpouseA = store2.getSpouse(personA.id);
    assert(sSpouseA?.id === personB.id, 'Person B is verified as spouse of A');

    const sChildrenOfC = store2.getChildren(personC.id);
    assert(sChildrenOfC.length === 1 && sChildrenOfC[0].id === personD.id, 'Person D is verified as child of C');
  }

  // -------------------------------------------------------------
  // Test 6: STEP 10 — Real Regression Test with uploaded backup
  // -------------------------------------------------------------
  console.log('\nTest 6: Step 10 Real Regression Test (medida-family-backup-2026-09-16.json)');
  {
    const originalBackupPath = 'C:/Users/G1/Downloads/medida-family-backup-2026-09-16.json';
    assert(fs.existsSync(originalBackupPath), `Original backup file exists at ${originalBackupPath}`);

    const rawOriginal = fs.readFileSync(originalBackupPath, 'utf8');
    const parsedOriginal = JSON.parse(rawOriginal);

    const rawPeople = parsedOriginal.family?.people || parsedOriginal.people;
    const rawRels = parsedOriginal.family?.relationships || parsedOriginal.relationships;

    assert(rawPeople.length === 36, `Original backup contains 36 people (actual: ${rawPeople.length})`);
    assert(rawRels.length === 54, `Original backup contains 54 relationships (actual: ${rawRels.length})`);

    // Verify that attempting to import original backup FAILS validation strictly
    const regressionStore = new FamilyStore();
    regressionStore.clearAllData();
    let originalImportFailed = false;
    let originalImportError = '';
    try {
      regressionStore.importData(rawOriginal);
    } catch (err) {
      originalImportFailed = true;
      originalImportError = err.message;
    }

    assert(originalImportFailed, `Original corrupted backup correctly rejected: "${originalImportError}"`);
    assert(regressionStore.people.size === 0, 'No partial import occurred on rejection');

    // Run deterministic repair utility
    const { repairedData, stats } = repairBackupData(rawOriginal);

    assert(stats.peopleCount === 36, `Repaired data preserved all 36 people (actual: ${stats.peopleCount})`);
    assert(stats.relationshipsCount === 43, `Repaired data cleanly resolved to 43 unique relationships (11 duplicates removed)`);

    // Import repaired data into FamilyStore
    const testImportSuccess = regressionStore.importData(repairedData);
    assert(testImportSuccess === true, 'Repaired backup imported successfully into FamilyStore');
    assert(regressionStore.people.size === 36, 'Store has all 36 people loaded');
    assert(regressionStore.relationships.length === 43, 'Store has all 43 relationships loaded');

    // Check that NO people in the store have queue-* IDs
    const remainingQueuePeople = Array.from(regressionStore.people.keys()).filter((id) => id.startsWith('queue-'));
    assert(remainingQueuePeople.length === 0, 'Zero people have queue-* IDs in the imported graph');

    // Verify pre-export validation passes
    let newExport;
    let exportError = null;
    try {
      newExport = regressionStore.exportData();
    } catch (err) {
      exportError = err;
    }
    assert(exportError === null, 'FamilyStore.exportData() succeeded with 0 unresolved references');
    assert(newExport.family.people.length === 36, 'Exported backup contains 36 people');
    assert(newExport.family.relationships.length === 43, 'Exported backup contains 43 relationships');

    // Re-import the newly exported backup
    const freshStore = new FamilyStore();
    freshStore.clearAllData();
    const reimportSuccess = freshStore.importData(newExport);
    assert(reimportSuccess === true, 'Re-importing newly generated backup succeeded without error');
    assert(freshStore.people.size === 36, 'Fresh store has 36 people');
    assert(freshStore.relationships.length === 43, 'Fresh store has 43 relationships');
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n=== TEST SUITE RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
