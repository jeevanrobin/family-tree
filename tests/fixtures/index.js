let idCounter = 0;

export function resetCounter() {
  idCounter = 0;
}

export function createPerson(overrides = {}) {
  const id = overrides.id || `person-${++idCounter}`;
  return {
    id,
    family_id: 'test-family-001',
    firstName: 'Test',
    lastName: 'Person',
    gender: 'male',
    dateOfBirth: '1980-01-01',
    ...overrides
  };
}

export function createRelationship(overrides = {}) {
  const id = overrides.id || `rel-${++idCounter}`;
  return {
    id,
    family_id: 'test-family-001',
    type: 'parent-child',
    ...overrides
  };
}

export function createFamily(id = 'test-family-001', overrides = {}) {
  return {
    id,
    name: 'Test Family',
    ...overrides
  };
}

export function createStory(overrides = {}) {
  const id = overrides.id || `story-${++idCounter}`;
  return {
    id,
    family_id: 'test-family-001',
    title: 'Test Story',
    content: 'Test content',
    ...overrides
  };
}

export function createLifeEvent(overrides = {}) {
  const id = overrides.id || `event-${++idCounter}`;
  return {
    id,
    family_id: 'test-family-001',
    type: 'Birth',
    title: 'Test Event',
    ...overrides
  };
}
