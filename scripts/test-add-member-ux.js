/**
 * Medida's Family — Add Family Member UX Simplification Verification Suite
 *
 * 25 targeted verification tests validating:
 * 1. first person quick add
 * 2. first person without relationship
 * 3. existing-family quick add
 * 4. parent connection
 * 5. spouse connection
 * 6. child connection
 * 7. sibling connection
 * 8. invalid connection
 * 9. duplicate relationship
 * 10. self-link
 * 11. cycle prevention
 * 12. More Details expansion
 * 13. optional photo
 * 14. Add & Continue
 * 15. Add Relative preselection
 * 16. permissions
 * 17. immediate tree update
 * 18. immediate search availability
 * 19. local mode
 * 20. cloud mode
 * 21. offline compatibility
 * 22. mobile form behavior
 * 23. existing M2A relationship validation regression
 * 24. M3B permission regression
 * 25. M3C sync regression
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
const { FamilyStore } = await import('../src/family-tree/store/FamilyStore.js');
const { computeTreeLayout } = await import('../src/family-tree/engine/treeLayout.js');
const { searchArchive } = await import('../src/family-tree/search/familySearchEngine.js');
const { canAddPerson, canAddRelationship, canAddRelative } = await import('../src/family-tree/auth/roles.js');
const { humanizeRelationshipError } = await import('../src/family-tree/utils/relationshipErrors.js');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] Test ${passedTests + failedTests + 1}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${passedTests + failedTests + 1}: ${name}`);
    console.error(err);
    failedTests++;
  }
}

console.log('==================================================');
console.log('STARTING ADD FAMILY MEMBER UX VERIFICATION SUITE');
console.log('==================================================\n');

// 1. first person quick add
runTest('first person quick add: creates person with only first name', () => {
  const store = new FamilyStore();
  store.loadFromData([]);
  const person = store.addPerson({ firstName: 'Rajesh' });
  assert.ok(person.id, 'Person must have an ID');
  assert.strictEqual(person.firstName, 'Rajesh');
  assert.strictEqual(person.displayName, 'Rajesh');
  assert.strictEqual(store.getAllPersons().length, 1);
});

// 2. first person without relationship
runTest('first person without relationship: single person has 0 relationships and acts as tree root', () => {
  const store = new FamilyStore();
  store.loadFromData([]);
  const person = store.addPerson({ firstName: 'Rajesh', lastName: 'Medida' });
  assert.strictEqual(store.getAllRelationships().length, 0);
  assert.strictEqual(store.getParents(person.id).length, 0);
  assert.strictEqual(store.getChildren(person.id).length, 0);
  assert.strictEqual(store.getSpouse(person.id), null);
});

// 3. existing-family quick add
runTest('existing-family quick add: creates second person and associates properly', () => {
  const store = new FamilyStore();
  store.loadFromData([]);
  const p1 = store.addPerson({ firstName: 'Rajesh', lastName: 'Medida' });
  const p2 = store.addPerson({ firstName: 'Meena', lastName: 'Medida' });
  assert.strictEqual(store.getAllPersons().length, 2);
  assert.ok(p1.id && p2.id);
});

// 4. parent connection
runTest('parent connection: links new person as parent of existing person', () => {
  const store = new FamilyStore();
  const child = store.addPerson({ firstName: 'Rajesh' });
  const father = store.addPerson({ firstName: 'Venkateswara' });
  const rel = store.addRelationship({
    type: 'parent-child',
    parentId: father.id,
    childId: child.id,
  });
  assert.strictEqual(rel.type, 'parent-child');
  const parents = store.getParents(child.id);
  assert.strictEqual(parents.length, 1);
  assert.strictEqual(parents[0].id, father.id);
});

// 5. spouse connection
runTest('spouse connection: links new person as spouse of existing person', () => {
  const store = new FamilyStore();
  const rajesh = store.addPerson({ firstName: 'Rajesh' });
  const meena = store.addPerson({ firstName: 'Meena' });
  const rel = store.addRelationship({
    type: 'spouse',
    personAId: rajesh.id,
    personBId: meena.id,
  });
  assert.strictEqual(rel.type, 'spouse');
  const spouse = store.getSpouse(rajesh.id);
  assert.strictEqual(spouse.id, meena.id);
});

// 6. child connection
runTest('child connection: links new person as child of existing person', () => {
  const store = new FamilyStore();
  const parent = store.addPerson({ firstName: 'Rajesh' });
  const child = store.addPerson({ firstName: 'Arjun' });
  const rel = store.addRelationship({
    type: 'parent-child',
    parentId: parent.id,
    childId: child.id,
  });
  assert.strictEqual(rel.type, 'parent-child');
  const children = store.getChildren(parent.id);
  assert.strictEqual(children.length, 1);
  assert.strictEqual(children[0].id, child.id);
});

// 7. sibling connection
runTest('sibling connection: connects new person to parents of existing relative', () => {
  const store = new FamilyStore();
  const father = store.addPerson({ firstName: 'Venkateswara' });
  const mother = store.addPerson({ firstName: 'Saraswathi' });
  const rajesh = store.addPerson({ firstName: 'Rajesh' });

  store.addRelationship({ type: 'parent-child', parentId: father.id, childId: rajesh.id });
  store.addRelationship({ type: 'parent-child', parentId: mother.id, childId: rajesh.id });

  // Adding sibling Suresh to Rajesh
  const suresh = store.addPerson({ firstName: 'Suresh' });
  const rajeshParents = store.getParents(rajesh.id);
  assert.strictEqual(rajeshParents.length, 2);

  rajeshParents.forEach((p) => {
    store.addRelationship({ type: 'parent-child', parentId: p.id, childId: suresh.id });
  });

  const sureshSiblings = store.getSiblings(suresh.id);
  assert.strictEqual(sureshSiblings.length, 1);
  assert.strictEqual(sureshSiblings[0].id, rajesh.id);
});

// 8. invalid connection
runTest('invalid connection: missing referenced person throws error', () => {
  const store = new FamilyStore();
  const rajesh = store.addPerson({ firstName: 'Rajesh' });
  assert.throws(
    () => {
      store.addRelationship({ type: 'parent-child', parentId: 'nonexistent-id', childId: rajesh.id });
    },
    (err) => {
      const human = humanizeRelationshipError(err);
      assert.strictEqual(human, 'That family member is no longer available.');
      return true;
    }
  );
});

// 9. duplicate relationship
runTest('duplicate relationship: friendly error when relationship already exists', () => {
  const store = new FamilyStore();
  const p1 = store.addPerson({ firstName: 'Rajesh' });
  const p2 = store.addPerson({ firstName: 'Arjun' });
  store.addRelationship({ type: 'parent-child', parentId: p1.id, childId: p2.id });

  assert.throws(
    () => {
      store.addRelationship({ type: 'parent-child', parentId: p1.id, childId: p2.id });
    },
    (err) => {
      const human = humanizeRelationshipError(err);
      assert.strictEqual(human, 'This relationship already exists.');
      return true;
    }
  );
});

// 10. self-link
runTest('self-link: friendly error when connecting person to themselves', () => {
  const store = new FamilyStore();
  const p1 = store.addPerson({ firstName: 'Rajesh' });
  assert.throws(
    () => {
      store.addRelationship({ type: 'parent-child', parentId: p1.id, childId: p1.id });
    },
    (err) => {
      const human = humanizeRelationshipError(err);
      assert.strictEqual(human, 'A person cannot be connected to themselves.');
      return true;
    }
  );
});

// 11. cycle prevention
runTest('cycle prevention: friendly error when connection creates an ancestry loop', () => {
  const store = new FamilyStore();
  const p1 = store.addPerson({ firstName: 'Grandfather' });
  const p2 = store.addPerson({ firstName: 'Father' });
  const p3 = store.addPerson({ firstName: 'Son' });

  store.addRelationship({ type: 'parent-child', parentId: p1.id, childId: p2.id });
  store.addRelationship({ type: 'parent-child', parentId: p2.id, childId: p3.id });

  // Attempting to make Grandfather a child of Son (cycle!)
  assert.throws(
    () => {
      store.addRelationship({ type: 'parent-child', parentId: p3.id, childId: p1.id });
    },
    (err) => {
      const human = humanizeRelationshipError(err);
      assert.strictEqual(human, 'This connection would create an invalid family loop.');
      return true;
    }
  );
});

// 12. More Details expansion
runTest('More Details expansion: secondary vitals preserved in data model', () => {
  const store = new FamilyStore();
  const enriched = store.addPerson({
    firstName: 'Saraswathi',
    lastName: 'Medida',
    middleName: 'Devi',
    gender: 'female',
    livingStatus: 'alive',
    dateOfBirth: '1952-04-12',
    placeOfBirth: 'Rajahmundry',
    currentLocation: 'Hyderabad',
    occupation: 'Homemaker & Matriarch',
    biography: 'Preserver of ancestral recipes and cultural heritage.',
  });

  assert.strictEqual(enriched.gender, 'female');
  assert.strictEqual(enriched.middleName, 'Devi');
  assert.strictEqual(enriched.placeOfBirth, 'Rajahmundry');
  assert.strictEqual(enriched.occupation, 'Homemaker & Matriarch');
  assert.strictEqual(enriched.biography, 'Preserver of ancestral recipes and cultural heritage.');
});

// 13. optional photo
runTest('optional photo: saves portrait URL and preserves avatar display', () => {
  const store = new FamilyStore();
  const photoUrl = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2';
  const person = store.addPerson({
    firstName: 'Meena',
    lastName: 'Medida',
    photoUrl,
    photo: photoUrl,
  });

  assert.strictEqual(person.photo, photoUrl);
  assert.strictEqual(person.photoUrl, photoUrl);
});

// 14. Add & Continue
runTest('Add & Continue: multiple sequential additions without data corruption', () => {
  const store = new FamilyStore();
  store.loadFromData([]);
  const p1 = store.addPerson({ firstName: 'Person1' });
  const p2 = store.addPerson({ firstName: 'Person2' });
  const p3 = store.addPerson({ firstName: 'Person3' });

  assert.strictEqual(store.getAllPersons().length, 3);
  assert.strictEqual(store.getPersonById(p1.id).firstName, 'Person1');
  assert.strictEqual(store.getPersonById(p2.id).firstName, 'Person2');
  assert.strictEqual(store.getPersonById(p3.id).firstName, 'Person3');
});

// 15. Add Relative preselection
runTest('Add Relative preselection: target person is correctly identified and linked', () => {
  const store = new FamilyStore();
  const rajesh = store.addPerson({ firstName: 'Rajesh', lastName: 'Medida' });

  // Preselected relative ID is rajesh.id, rel is child
  const child = store.addPerson({ firstName: 'Arjun', lastName: 'Medida' });
  store.addRelationship({
    type: 'parent-child',
    parentId: rajesh.id,
    childId: child.id,
  });

  const children = store.getChildren(rajesh.id);
  assert.strictEqual(children.length, 1);
  assert.strictEqual(children[0].id, child.id);
});

// 16. permissions
runTest('permissions: role permissions allow owner/editor, disallow viewer', () => {
  assert.strictEqual(canAddPerson('owner'), true);
  assert.strictEqual(canAddPerson('editor'), true);
  assert.strictEqual(canAddPerson('contributor'), false);
  assert.strictEqual(canAddPerson('viewer'), false);

  assert.strictEqual(canAddRelationship('owner'), true);
  assert.strictEqual(canAddRelationship('editor'), true);
  assert.strictEqual(canAddRelationship('contributor'), false);
  assert.strictEqual(canAddRelationship('viewer'), false);

  assert.strictEqual(canAddRelative('owner'), true);
});

// 17. immediate tree update
runTest('immediate tree update: treeLayout recalculates coordinates upon adding member', () => {
  const store = new FamilyStore();
  store.loadFromData([]);
  const p1 = store.addPerson({ firstName: 'Root' });
  let layout = computeTreeLayout(store.getAllPersons(), store.getAllRelationships());
  assert.strictEqual(layout.nodes.size, 1);

  const p2 = store.addPerson({ firstName: 'Child' });
  store.addRelationship({ type: 'parent-child', parentId: p1.id, childId: p2.id });
  layout = computeTreeLayout(store.getAllPersons(), store.getAllRelationships());
  assert.strictEqual(layout.nodes.size, 2);
  assert.ok(layout.lines.length >= 1);
});

// 18. immediate search availability
runTest('immediate search availability: newly added member is indexed and discoverable in global search', () => {
  const store = new FamilyStore();
  const person = store.addPerson({ firstName: 'Aarav', lastName: 'Medida', occupation: 'Astronomer' });

  const results = store.searchArchive('Aarav');
  assert.ok(results.totalCount >= 1);
  const found = results.results.find((r) => r.id === person.id);
  assert.ok(found, 'Person should be found in global search');
  assert.strictEqual(found.title, 'Aarav Medida');
});

// 19. local mode
runTest('local mode: all CRUD actions function synchronously without remote dependencies', () => {
  const store = new FamilyStore();
  const p = store.addPerson({ firstName: 'LocalUser' });
  assert.ok(p.id);
  const fetched = store.getPersonById(p.id);
  assert.strictEqual(fetched.firstName, 'LocalUser');
});

// 20. cloud mode
runTest('cloud mode: payload satisfies cloud entity schema requirements', () => {
  const store = new FamilyStore();
  const p = store.addPerson({ firstName: 'CloudUser', lastName: 'Test' });
  assert.ok(p.id);
  assert.ok(p.createdAt);
  assert.ok(p.updatedAt);
  assert.strictEqual(typeof p.firstName, 'string');
});

// 21. offline compatibility
runTest('offline compatibility: repository errors do not crash synchronous operations', () => {
  const store = new FamilyStore();
  store.loadFromData([]);
  // Mock failing repository with valid load function
  store.repository = {
    savePerson: async () => { throw new Error('Offline'); },
    saveRelationship: async () => { throw new Error('Offline'); },
    persist: async () => { throw new Error('Offline persist'); },
    load: async () => ({ people: [], relationships: [] }),
    loadSync: () => ({ people: [], relationships: [] }),
  };

  const p = store.addPerson({ firstName: 'OfflinePerson' });
  assert.ok(p.id);
  assert.strictEqual(store.getAllPersons().length, 1);
});

// 22. mobile form behavior
runTest('mobile form contract: minimal payload handles missing optional fields gracefully', () => {
  const store = new FamilyStore();
  const minimal = store.addPerson({
    firstName: 'MobileUser',
    lastName: '',
    middleName: '',
    gender: 'unspecified',
    livingStatus: 'alive',
  });

  assert.strictEqual(minimal.firstName, 'MobileUser');
  assert.strictEqual(minimal.displayName, 'MobileUser');
  assert.strictEqual(minimal.gender, 'unspecified');
  assert.strictEqual(minimal.livingStatus, 'alive');
});

// 23. existing M2A relationship validation regression
runTest('M2A relationship validation regression: parent limit of 2 is strictly enforced', () => {
  const store = new FamilyStore();
  const child = store.addPerson({ firstName: 'Child' });
  const p1 = store.addPerson({ firstName: 'Parent1' });
  const p2 = store.addPerson({ firstName: 'Parent2' });
  const p3 = store.addPerson({ firstName: 'Parent3' });

  store.addRelationship({ type: 'parent-child', parentId: p1.id, childId: child.id });
  store.addRelationship({ type: 'parent-child', parentId: p2.id, childId: child.id });

  assert.throws(
    () => {
      store.addRelationship({ type: 'parent-child', parentId: p3.id, childId: child.id });
    },
    (err) => {
      const human = humanizeRelationshipError(err);
      assert.strictEqual(human, 'This person already has 2 parents connected.');
      return true;
    }
  );
});

// 24. M3B permission regression
runTest('M3B permission regression: roles matrix remains intact', () => {
  assert.strictEqual(canAddPerson('owner'), true);
  assert.strictEqual(canAddPerson('editor'), true);
  assert.strictEqual(canAddPerson('contributor'), false);
  assert.strictEqual(canAddPerson('viewer'), false);
});

// 25. M3C sync regression
runTest('M3C sync regression: store notifies subscribers upon person and relationship addition', () => {
  const store = new FamilyStore();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications++;
  });

  const p1 = store.addPerson({ firstName: 'P1' });
  const p2 = store.addPerson({ firstName: 'P2' });
  store.addRelationship({ type: 'parent-child', parentId: p1.id, childId: p2.id });

  unsubscribe();
  assert.strictEqual(notifications, 3);
});

console.log('\n==================================================');
console.log(`VERIFICATION RESULT: ${passedTests} / ${passedTests + failedTests} passed (${failedTests} failed)`);
console.log('==================================================');

if (failedTests > 0) {
  process.exit(1);
}
