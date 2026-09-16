/**
 * Verify sibling badges using real app data
 */

// Inline the display logic (same as familyHelpers.js) to avoid ESM path issues
function getSiblingDisplayLabel(person) {
  if (!person) return 'Sibling';
  const g = (person.gender || '').toLowerCase().trim();
  if (g === 'female') return 'Sister';
  if (g === 'male') return 'Brother';
  return 'Sibling';
}

function getRelationshipDisplayLabel(viewer, relatedPerson, relationshipType) {
  if (!relatedPerson) return '';
  const g = (relatedPerson.gender || '').toLowerCase().trim();
  const rel = (relationshipType || '').toLowerCase().trim();
  if (rel === 'sibling' || rel === 'sister' || rel === 'brother' || rel === 'siblings') {
    return getSiblingDisplayLabel(relatedPerson);
  }
  if (rel === 'parent' || rel === 'parent-child' || rel === 'father' || rel === 'mother') {
    if (g === 'female') return 'Mother';
    if (g === 'male') return 'Father';
    return 'Parent';
  }
  if (rel === 'child' || rel === 'son' || rel === 'daughter') {
    if (g === 'female') return 'Daughter';
    if (g === 'male') return 'Son';
    return 'Child';
  }
  if (rel === 'spouse' || rel === 'husband' || rel === 'wife') {
    if (g === 'female') return 'Wife';
    if (g === 'male') return 'Husband';
    return 'Spouse';
  }
  return 'Relative';
}

// Mock localStorage for Node
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
  };
}

const { default: familyStore } = await import('../src/family-tree/store/FamilyStore.js');

const people = Array.from(familyStore.people.values());
const ramaiah = people.find(p => p.firstName?.toLowerCase().includes('ramaiah'));

if (!ramaiah) {
  console.log('❌ Could not find Ramaiah in store. People in store:');
  people.forEach(p => console.log(`  - ${p.firstName} ${p.lastName || ''} (id: ${p.id}, gender: ${p.gender || 'not set'})`));
  process.exit(1);
}

console.log(`\n✅ Found: ${ramaiah.firstName} ${ramaiah.lastName || ''} (gender: ${ramaiah.gender || 'not set'})`);

const rels = familyStore.relationships || [];
const siblingRels = rels.filter(r =>
  (r.type === 'sibling' || r.type === 'sister' || r.type === 'brother' || r.type === 'siblings') &&
  (r.personAId === ramaiah.id || r.personBId === ramaiah.id ||
   r.personId1 === ramaiah.id || r.personId2 === ramaiah.id ||
   r.person1Id === ramaiah.id || r.person2Id === ramaiah.id)
);

console.log(`\n── Ramaiah's Siblings (${siblingRels.length} relationships) ──\n`);

let allConsistent = true;

for (const rel of siblingRels) {
  const otherId = (rel.personAId === ramaiah.id ? rel.personBId : 
                   rel.personBId === ramaiah.id ? rel.personAId :
                   rel.personId1 === ramaiah.id ? rel.personId2 :
                   rel.personId2 === ramaiah.id ? rel.personId1 :
                   rel.person1Id === ramaiah.id ? rel.person2Id : rel.person1Id);
  const other = people.find(p => p.id === otherId);
  if (!other) {
    console.log(`  ⚠️  Relationship points to unknown person: ${otherId}`);
    continue;
  }
  
  const displayLabel = getSiblingDisplayLabel(other);
  const fullLabel = getRelationshipDisplayLabel(ramaiah, other, rel.type);
  
  const expected = other.gender === 'female' ? 'Sister' : other.gender === 'male' ? 'Brother' : 'Sibling';
  const ok = displayLabel === expected && fullLabel === expected;
  
  console.log(`  ${ok ? '✅' : '❌'} ${other.firstName} ${other.lastName || ''} — gender: ${other.gender || 'not set'} → badge: "${displayLabel}" (stored type: "${rel.type}")`);
  
  if (!ok) allConsistent = false;
}

// Reverse check
const lakshmi = people.find(p => 
  p.firstName?.toLowerCase().includes('lakshmi') || 
  p.firstName?.toLowerCase().includes('laxmi')
);

if (lakshmi) {
  console.log(`\n── Reverse: ${lakshmi.firstName} → Ramaiah ──\n`);
  const reverseLabel = getSiblingDisplayLabel(ramaiah);
  const expected = ramaiah.gender === 'male' ? 'Brother' : ramaiah.gender === 'female' ? 'Sister' : 'Sibling';
  const ok = reverseLabel === expected;
  console.log(`  ${ok ? '✅' : '❌'} Ramaiah (gender: ${ramaiah.gender || 'not set'}) → badge from ${lakshmi.firstName}'s view: "${reverseLabel}"`);
  if (!ok) allConsistent = false;
} else {
  console.log('\n  ⚠️  Could not find Lakshmi/Laxmi in store');
}

// Show all people and their genders for reference
console.log(`\n── All People in Store ──\n`);
people.forEach(p => {
  console.log(`  ${p.firstName} ${p.lastName || ''} — gender: ${p.gender || 'not set'}`);
});

// Show all relationships
console.log(`\n── All Relationships ──\n`);
rels.forEach(r => {
  const id1 = r.personAId || r.personId1 || r.person1Id || r.parentId || '?';
  const id2 = r.personBId || r.personId2 || r.person2Id || r.childId || '?';
  const p1 = people.find(p => p.id === id1);
  const p2 = people.find(p => p.id === id2);
  console.log(`  ${p1?.firstName || id1} → ${r.type} → ${p2?.firstName || id2}`);
});

console.log(`\n══════════════════════════════════════`);
console.log(`  RESULT: ${allConsistent ? '✅ ALL BADGES CONSISTENT' : '❌ INCONSISTENCIES FOUND'}`);
console.log(`══════════════════════════════════════\n`);
