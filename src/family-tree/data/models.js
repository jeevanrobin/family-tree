/**
 * Person and Relationship Data Models
 * Clean, scalable schemas designed for future REST/GraphQL API & database migration.
 */

let _personIdCounter = 0;
let _relIdCounter = 0;

export function generatePersonId(prefix = 'person') {
  _personIdCounter += 1;
  return `${prefix}-${_personIdCounter}`;
}

export function generateRelId(prefix = 'rel') {
  _relIdCounter += 1;
  return `${prefix}-${_relIdCounter}`;
}

export function resetModelCounters() {
  _personIdCounter = 0;
  _relIdCounter = 0;
}

/**
 * Person Entity Factory
 * @param {Object} data
 * @returns {Person}
 */
export function createPerson(data) {
  const now = new Date().toISOString();
  const firstName = (data.firstName || '').trim();
  const middleName = (data.middleName || '').trim();
  const lastName = (data.lastName || '').trim();

  const displayName =
    data.displayName ||
    [firstName, middleName, lastName].filter(Boolean).join(' ');

  const livingStatus =
    data.livingStatus || (data.dateOfDeath ? 'deceased' : 'alive');

  return {
    id: data.id || generatePersonId(),
    firstName,
    middleName,
    lastName,
    displayName,
    gender: data.gender || 'unknown', // 'male' | 'female' | 'other' | 'unknown'
    dateOfBirth: data.dateOfBirth || null, // ISO 'YYYY-MM-DD'
    dateOfDeath: data.dateOfDeath || null, // ISO 'YYYY-MM-DD'
    livingStatus, // 'alive' | 'deceased' | 'unknown'
    placeOfBirth: data.placeOfBirth || '',
    hometown: data.hometown || data.placeOfBirth || '',
    currentLocation: data.currentLocation || '',
    occupation: data.occupation || '',
    photo: data.photo || data.photoUrl || null,
    photoUrl: data.photoUrl || data.photo || null,
    biography: data.biography || '',
    notes: data.notes || '',
    privacy: data.privacy || 'public', // 'public' | 'family' | 'private'
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
  };
}

/**
 * Relationship Entity Factory
 * Separate entity representing a directed parent-child link or bidirectional spouse link.
 * @param {Object} data
 * @returns {Relationship}
 */
export function createRelationship(data) {
  const now = new Date().toISOString();
  return {
    id: data.id || generateRelId(),
    type: data.type, // 'parent' | 'spouse'
    personId1: data.personId1, // If parent: personId1 is parent of personId2
    personId2: data.personId2, // If parent: personId2 is child
    startDate: data.startDate || null, // e.g. Marriage date 'YYYY-MM-DD'
    endDate: data.endDate || null, // e.g. Divorce date or null
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
  };
}
