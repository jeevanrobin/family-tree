/**
 * Family Data Service — Architecture Seam
 * 
 * Provides an isolated query and service facade delegating to the centralized FamilyStore.
 */

import familyStore from '../store/FamilyStore.js';

export const GENERATION_CONFIG = [
  {
    gen: 0,
    title: 'Generation I',
    subtitle: 'Ancestors, Elders & Pioneers',
    era: '1918 – 2005',
    color: '#8b5e34',
  },
  {
    gen: 1,
    title: 'Generation II',
    subtitle: 'Grandparents & Matriarchs',
    era: '1945 – Present',
    color: '#3d6e5a',
  },
  {
    gen: 2,
    title: 'Generation III',
    subtitle: 'Parents & Core Family',
    era: '1972 – Present',
    color: '#3e5c76',
  },
  {
    gen: 3,
    title: 'Generation IV',
    subtitle: 'Children & Next Generation',
    era: '2000 – Present',
    color: '#6d4c7d',
  },
  {
    gen: 4,
    title: 'Generation V',
    subtitle: 'Descendants & Future Legacy',
    era: '2020 – Present',
    color: '#0F6B5B',
  },
];

// ── Delegated Store Queries ─────────────────────────────────

export function getAllPersons() {
  return familyStore.getAllPersons();
}

export function getPersonById(id) {
  return familyStore.getPersonById(id);
}

export function searchPersons(query) {
  return familyStore.searchPersons(query);
}

export function searchArchive(query, options) {
  return familyStore.searchArchive(query, options);
}

export function verifyEntityExists(type, id) {
  return familyStore.verifyEntityExists(type, id);
}

export function getAllRelationships() {
  return familyStore.getAllRelationships();
}

export function getParents(personId) {
  return familyStore.getParents(personId);
}

export function getChildren(personId) {
  return familyStore.getChildren(personId);
}

export function getSpouse(personId) {
  return familyStore.getSpouse(personId);
}

export function getSiblings(personId) {
  return familyStore.getSiblings(personId);
}

// ── Milestone 2B Entities Queries ────────────────────────────

export function getAllStories() {
  return familyStore.getAllStories();
}

export function getAllLifeEvents() {
  return familyStore.getAllLifeEvents();
}

export function getAllPhotos() {
  return familyStore.getAllPhotos();
}

export function getAllDocuments() {
  return familyStore.getAllDocuments();
}

export function getStoriesForPerson(personId) {
  return familyStore.getStoriesForPerson(personId);
}

export function getEventsForPerson(personId) {
  return familyStore.getEventsForPerson(personId);
}

export function getPhotosForPerson(personId) {
  return familyStore.getPhotosForPerson(personId);
}

export function getDocumentsForPerson(personId) {
  return familyStore.getDocumentsForPerson(personId);
}

// ── Immediate Family & Constellation Helpers ────────────────

export function getImmediateFamilyMap(personId) {
  if (!personId) return new Map();
  const map = new Map();

  const spouse = getSpouse(personId);
  if (spouse) {
    map.set(spouse.id, { role: 'Spouse', relation: 'spouse' });
  }

  const parents = getParents(personId);
  parents.forEach((p) => {
    const role = p.gender === 'female' ? 'Mother' : p.gender === 'male' ? 'Father' : 'Parent';
    map.set(p.id, { role, relation: 'parent' });
  });

  const siblings = getSiblings(personId);
  siblings.forEach((s) => {
    const role = s.gender === 'female' ? 'Sister' : s.gender === 'male' ? 'Brother' : 'Sibling';
    map.set(s.id, { role, relation: 'sibling' });
  });

  const children = getChildren(personId);
  children.forEach((c) => {
    const role = c.gender === 'female' ? 'Daughter' : c.gender === 'male' ? 'Son' : 'Child';
    map.set(c.id, { role, relation: 'child' });
  });

  return map;
}

export function getImmediateFamilyIds(personId) {
  if (!personId) return new Set();
  return new Set(getImmediateFamilyMap(personId).keys());
}

export function getFamilyConstellationMap(selectedId) {
  if (!selectedId) return new Map();
  const map = new Map();

  // 1. Selected Person
  map.set(selectedId, { tier: 'selected', role: 'Self' });

  // 2. Immediate Family
  const spouse = getSpouse(selectedId);
  if (spouse) {
    map.set(spouse.id, { tier: 'immediate', role: 'Spouse' });
  }

  const parents = getParents(selectedId);
  parents.forEach((p) => {
    const role = p.gender === 'female' ? 'Mother' : p.gender === 'male' ? 'Father' : 'Parent';
    map.set(p.id, { tier: 'immediate', role });
  });

  const children = getChildren(selectedId);
  children.forEach((c) => {
    const role = c.gender === 'female' ? 'Daughter' : c.gender === 'male' ? 'Son' : 'Child';
    map.set(c.id, { tier: 'immediate', role });
  });

  // 3. Siblings
  const siblings = getSiblings(selectedId);
  siblings.forEach((s) => {
    const role = s.gender === 'female' ? 'Sister' : s.gender === 'male' ? 'Brother' : 'Sibling';
    map.set(s.id, { tier: 'sibling', role });
  });

  // 4. Extended Family (Grandparents & Grandchildren)
  parents.forEach((p) => {
    const grandparents = getParents(p.id);
    grandparents.forEach((gp) => {
      if (!map.has(gp.id)) {
        const role = gp.gender === 'female' ? 'Grandmother' : gp.gender === 'male' ? 'Grandfather' : 'Grandparent';
        map.set(gp.id, { tier: 'extended', role });
      }
    });
  });

  children.forEach((c) => {
    const grandchildren = getChildren(c.id);
    grandchildren.forEach((gc) => {
      if (!map.has(gc.id)) {
        const role = gc.gender === 'female' ? 'Granddaughter' : gc.gender === 'male' ? 'Grandson' : 'Grandchild';
        map.set(gc.id, { tier: 'extended', role });
      }
    });
  });

  // 5. Unrelated
  getAllPersons().forEach((person) => {
    if (!map.has(person.id)) {
      map.set(person.id, { tier: 'unrelated', role: null });
    }
  });

  return map;
}

// ── Dynamic Generation Calculation (Data-Driven from Graph) ─

export function computeGenerations(people = getAllPersons(), relationships = getAllRelationships()) {
  const genMap = new Map();
  if (!people || people.length === 0) return genMap;

  const childToParents = new Map();
  const parentToChildren = new Map();
  const spouseGraph = new Map();

  relationships.forEach((r) => {
    if (r.type === 'parent-child' || r.type === 'parent') {
      const parentId = r.parentId || r.personId1;
      const childId = r.childId || r.personId2;
      if (!childToParents.has(childId)) childToParents.set(childId, []);
      childToParents.get(childId).push(parentId);

      if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
      parentToChildren.get(parentId).push(childId);
    } else if (r.type === 'spouse') {
      const a = r.personAId || r.personId1;
      const b = r.personBId || r.personId2;
      if (!spouseGraph.has(a)) spouseGraph.set(a, []);
      if (!spouseGraph.has(b)) spouseGraph.set(b, []);
      spouseGraph.get(a).push(b);
      spouseGraph.get(b).push(a);
    }
  });

  // Find root ancestors (nodes with 0 known parents)
  const roots = people.filter((p) => !childToParents.has(p.id) || childToParents.get(p.id).length === 0);

  // If entire component has loops or no clean root, take any node
  const processed = new Set();

  function assignGen(personId, currentGen) {
    if (processed.has(personId)) {
      if (currentGen > (genMap.get(personId) ?? 0)) {
        genMap.set(personId, currentGen);
      } else {
        return;
      }
    } else {
      genMap.set(personId, currentGen);
      processed.add(personId);
    }

    // Propagate to spouses (must be in same generation)
    const spouses = spouseGraph.get(personId) || [];
    spouses.forEach((sId) => {
      if (genMap.get(sId) !== currentGen) {
        genMap.set(sId, currentGen);
        processed.add(sId);
      }
    });

    // Propagate to children (must be gen + 1)
    const children = parentToChildren.get(personId) || [];
    children.forEach((cId) => {
      assignGen(cId, currentGen + 1);
    });
  }

  roots.forEach((root) => {
    assignGen(root.id, 0);
  });

  // Handle any disconnected or unvisited people
  people.forEach((p) => {
    if (!processed.has(p.id)) {
      assignGen(p.id, 0);
    }
  });

  // Ensure spouses have matching generation
  relationships.forEach((r) => {
    if (r.type === 'spouse') {
      const a = r.personAId || r.personId1;
      const b = r.personBId || r.personId2;
      const gA = genMap.get(a) ?? 0;
      const gB = genMap.get(b) ?? 0;
      const maxG = Math.max(gA, gB);
      genMap.set(a, maxG);
      genMap.set(b, maxG);
    }
  });

  // Normalize minimum generation to 0
  let minGen = Infinity;
  genMap.forEach((g) => {
    if (g < minGen) minGen = g;
  });
  if (minGen !== Infinity && minGen !== 0) {
    genMap.forEach((g, id) => {
      genMap.set(id, g - minGen);
    });
  }

  return genMap;
}

export function getGeneration(personId) {
  const gens = computeGenerations();
  return gens.get(String(personId)) ?? 0;
}

export function getAllGenerations() {
  const people = getAllPersons();
  const genMap = computeGenerations(people, getAllRelationships());
  const result = new Map();
  people.forEach((p) => {
    const gen = genMap.get(p.id) ?? 0;
    if (!result.has(gen)) result.set(gen, []);
    result.get(gen).push(p);
  });
  return result;
}
