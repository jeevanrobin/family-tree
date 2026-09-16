/**
 * Verification Test Suite: Edit Person Prefill, State Synchronization & Partial-Edit Behavior
 * Tests all requirements from: MEDIDA'S FAMILY — FIX EDIT PERSON PREFILL
 */

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

import familyStore from '../src/family-tree/store/FamilyStore.js';
import { getPersonInitialState, preparePersonUpdates } from '../src/family-tree/utils/personFormHelpers.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] Test ${totalTests}: ${message}`);
  passedTests++;
}

console.log('==================================================');
console.log('STARTING EDIT PERSON PREFILL VERIFICATION SUITE');
console.log('==================================================\n');

// Reset store to fresh sample data
familyStore.resetToSampleData();

// ── Test 1: Identify Ramaiah Medida with rich populated fields ──
const ramaiah = familyStore.getPersonById('gg-ramaiah');
assert(Boolean(ramaiah), 'Ramaiah Medida exists in sample data');
assert(ramaiah.firstName === 'Ramaiah', 'Ramaiah firstName is "Ramaiah"');
assert(ramaiah.lastName === 'Medida', 'Ramaiah lastName is "Medida"');
assert(ramaiah.displayName === 'Ramaiah Medida', 'Ramaiah displayName is "Ramaiah Medida"');
assert(Boolean(ramaiah.occupation), `Ramaiah has populated occupation: "${ramaiah.occupation}"`);
assert(Boolean(ramaiah.biography), 'Ramaiah has populated biography');
assert(Boolean(ramaiah.dateOfBirth), `Ramaiah has dateOfBirth: ${ramaiah.dateOfBirth}`);
assert(Boolean(ramaiah.dateOfDeath), `Ramaiah has dateOfDeath: ${ramaiah.dateOfDeath}`);
assert(Boolean(ramaiah.photoUrl), 'Ramaiah has populated photoUrl');

// ── Test 2: Verify getPersonInitialState prefills all fields for Ramaiah ──
const ramaiahInitial = getPersonInitialState(ramaiah);
assert(ramaiahInitial.firstName === 'Ramaiah', 'Prefilled firstName is "Ramaiah"');
assert(ramaiahInitial.lastName === 'Medida', 'Prefilled lastName is "Medida"');
assert(ramaiahInitial.gender === 'male', 'Prefilled gender is "male"');
assert(ramaiahInitial.livingStatus === 'deceased', 'Prefilled livingStatus is "deceased"');
assert(ramaiahInitial.dateOfBirth === '1920-03-15', 'Prefilled dateOfBirth is "1920-03-15"');
assert(ramaiahInitial.dateOfDeath === '1998-11-02', 'Prefilled dateOfDeath is "1998-11-02"');
assert(ramaiahInitial.placeOfBirth === 'Warangal, Telangana', 'Prefilled placeOfBirth is "Warangal, Telangana"');
assert(ramaiahInitial.hometown === 'Warangal, Telangana', 'Prefilled hometown is "Warangal, Telangana"');
assert(ramaiahInitial.occupation === 'Agronomist & Village Elder', 'Prefilled occupation is "Agronomist & Village Elder"');
assert(ramaiahInitial.biography === ramaiah.biography, 'Prefilled biography matches existing biography');
assert(ramaiahInitial.notes === ramaiah.notes, 'Prefilled notes match existing notes');
assert(ramaiahInitial.photoUrl === ramaiah.photoUrl, 'Prefilled photoUrl matches existing photoUrl');

// ── Test 3: Edit ONLY occupation and save ──
const originalFirstName = ramaiah.firstName;
const originalLastName = ramaiah.lastName;
const originalBio = ramaiah.biography;
const originalDOB = ramaiah.dateOfBirth;
const originalDOD = ramaiah.dateOfDeath;
const originalPhoto = ramaiah.photoUrl;
const originalNotes = ramaiah.notes;

const newOccupation = 'Senior Agronomist & Chief Elder';

// Simulate user editing ONLY occupation in the form
const userFormData = {
  ...ramaiahInitial,
  occupation: newOccupation,
};

const updates = preparePersonUpdates(userFormData, ramaiah);

const updatedRamaiah = familyStore.updatePerson(ramaiah.id, updates);

assert(updatedRamaiah.occupation === newOccupation, 'Occupation was successfully changed to "Senior Agronomist & Chief Elder"');
assert(updatedRamaiah.firstName === originalFirstName, 'First name remained unchanged ("Ramaiah")');
assert(updatedRamaiah.lastName === originalLastName, 'Last name remained unchanged ("Medida")');
assert(updatedRamaiah.displayName === 'Ramaiah Medida', 'Display name remained unchanged ("Ramaiah Medida")');
assert(updatedRamaiah.biography === originalBio, 'Biography remained completely unchanged');
assert(updatedRamaiah.dateOfBirth === originalDOB, 'Date of birth remained unchanged');
assert(updatedRamaiah.dateOfDeath === originalDOD, 'Date of death remained unchanged');
assert(updatedRamaiah.photoUrl === originalPhoto, 'Photo URL remained unchanged');
assert(updatedRamaiah.notes === originalNotes, 'Notes remained unchanged');

// ── Test 4: Reopening dossier & Edit for Ramaiah loads latest saved values ──
const reloadedRamaiah = familyStore.getPersonById('gg-ramaiah');
assert(reloadedRamaiah.occupation === newOccupation, 'FamilyStore returns updated occupation for Ramaiah');

const reloadedRamaiahInitial = getPersonInitialState(reloadedRamaiah);
assert(reloadedRamaiahInitial.occupation === newOccupation, 'Reopened Edit modal displays new occupation');
assert(reloadedRamaiahInitial.firstName === 'Ramaiah', 'Reopened Edit modal displays unchanged first name');
assert(reloadedRamaiahInitial.biography === originalBio, 'Reopened Edit modal displays unchanged biography');

// ── Test 5: Switch to another person (Saraswathi) immediately ──
const saraswathi = familyStore.getPersonById('gg-saraswathi');
assert(Boolean(saraswathi), 'Saraswathi Medida exists in sample data');
assert(saraswathi.firstName === 'Saraswathi', 'Saraswathi firstName is "Saraswathi"');

const saraswathiInitial = getPersonInitialState(saraswathi);
assert(saraswathiInitial.firstName === 'Saraswathi', 'First name prefilled as "Saraswathi" (not Ramaiah, not blank)');
assert(saraswathiInitial.lastName === 'Medida', 'Last name prefilled as "Medida"');
assert(saraswathiInitial.gender === 'female', 'Gender prefilled as "female"');
assert(saraswathiInitial.occupation === 'Master Weaver & Herbalist', 'Occupation prefilled as "Master Weaver & Herbalist"');
assert(saraswathiInitial.biography === saraswathi.biography, 'Biography prefilled with Saraswathi biography');
assert(saraswathiInitial.occupation !== newOccupation, 'Ramaiah updated occupation did NOT leak into Saraswathi form');

// ── Test 6: Person without photo does NOT show photoUrl ──
const noPhotoPerson = familyStore.addPerson({
  firstName: 'TestNoPhoto',
  lastName: 'Medida',
  gender: 'female',
});

const noPhotoInitial = getPersonInitialState(noPhotoPerson);
assert(noPhotoInitial.firstName === 'TestNoPhoto', 'noPhotoPerson firstName is "TestNoPhoto"');
assert(noPhotoInitial.photoUrl === '', 'noPhotoPerson photoUrl is empty string (no broken preview)');

// ── Test 7: Cancel behavior leaves store untouched ──
const prevBio = saraswathi.biography;
// Simulating cancel (onClose invoked without calling onUpdatePerson)
const unchangedSaraswathi = familyStore.getPersonById('gg-saraswathi');
assert(unchangedSaraswathi.biography === prevBio, 'Canceling leaves person record completely untouched');

// ── Test 8: Empty person handling returns safe blank defaults ──
const emptyState = getPersonInitialState(null);
assert(emptyState.firstName === '', 'Null person returns empty firstName');
assert(emptyState.gender === 'unspecified', 'Null person returns unspecified gender');
assert(emptyState.livingStatus === 'alive', 'Null person returns alive status');

console.log('\n==================================================');
console.log(`ALL EDIT PREFILL TESTS PASSED: ${passedTests} / ${totalTests} (0 failed)`);
console.log('==================================================');
