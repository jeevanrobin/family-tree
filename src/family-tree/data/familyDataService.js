/**
 * Family Data Service — Architecture Seam
 * 
 * Provides an isolated query and service facade delegating to the centralized FamilyStore.
 */

import familyStore from '../store/FamilyStore.js';
import { getSiblingDisplayLabel, getRelationshipDisplayLabel } from '../utils/familyHelpers.js';

export { getSiblingDisplayLabel, getRelationshipDisplayLabel };

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
  if (!personId) return [];
  const directParents = familyStore.getParents(personId);
  // If only 1 parent is directly linked, check if that parent has a spouse (the other parent)
  if (directParents.length === 1) {
    const spouse = familyStore.getSpouse(directParents[0].id);
    if (spouse && !directParents.some((p) => String(p.id) === String(spouse.id))) {
      return [...directParents, spouse];
    }
  }
  return directParents;
}

export function getChildren(personId) {
  return familyStore.getChildren(personId);
}

export function getSpouse(personId) {
  return familyStore.getSpouse(personId);
}

export function getSpouses(personId) {
  return familyStore.getSpouses(personId);
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
    const role = getSiblingDisplayLabel(s);
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

  const byGender = (person, female, male, neutral) =>
    person.gender === 'female' ? female : person.gender === 'male' ? male : neutral;

  // 2. Immediate Family (every spouse, parents, children)
  const spouses = getSpouses(selectedId);
  spouses.forEach((spouse) => {
    map.set(spouse.id, { tier: 'immediate', role: byGender(spouse, 'Wife', 'Husband', 'Spouse') });
  });

  const parents = getParents(selectedId);
  parents.forEach((p) => {
    map.set(p.id, { tier: 'immediate', role: byGender(p, 'Mother', 'Father', 'Parent') });
  });

  const children = getChildren(selectedId);
  children.forEach((c) => {
    map.set(c.id, { tier: 'immediate', role: byGender(c, 'Daughter', 'Son', 'Child') });
  });

  // 3. Siblings
  const siblings = getSiblings(selectedId);
  siblings.forEach((s) => {
    if (map.has(s.id)) return;
    const role = getSiblingDisplayLabel(s);
    map.set(s.id, { tier: 'sibling', role });
  });

  // 4. Extended Family: the whole direct line up and down, plus in-laws
  const ancestorRole = (person, depth) => {
    if (depth === 2) return byGender(person, 'Grandmother', 'Grandfather', 'Grandparent');
    if (depth === 3) return byGender(person, 'Great-Grandmother', 'Great-Grandfather', 'Great-Grandparent');
    return 'Ancestor';
  };
  let frontier = parents;
  for (let depth = 2; frontier.length > 0 && depth < 50; depth++) {
    const next = [];
    frontier.forEach((p) => {
      getParents(p.id).forEach((gp) => {
        if (map.has(gp.id)) return;
        map.set(gp.id, { tier: 'extended', role: ancestorRole(gp, depth) });
        next.push(gp);
      });
    });
    frontier = next;
  }

  const descendantRole = (person, depth) => {
    if (depth === 2) return byGender(person, 'Granddaughter', 'Grandson', 'Grandchild');
    if (depth === 3) return byGender(person, 'Great-Granddaughter', 'Great-Grandson', 'Great-Grandchild');
    return 'Descendant';
  };
  frontier = children;
  for (let depth = 2; frontier.length > 0 && depth < 50; depth++) {
    const next = [];
    frontier.forEach((c) => {
      getChildren(c.id).forEach((gc) => {
        if (map.has(gc.id)) return;
        map.set(gc.id, { tier: 'extended', role: descendantRole(gc, depth) });
        next.push(gc);
      });
    });
    frontier = next;
  }

  // In-laws: spouse's parents and children's spouses
  spouses.forEach((spouse) => {
    getParents(spouse.id).forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, { tier: 'extended', role: byGender(p, 'Mother-in-law', 'Father-in-law', 'Parent-in-law') });
      }
    });
  });
  children.forEach((c) => {
    getSpouses(c.id).forEach((sp) => {
      if (!map.has(sp.id)) {
        map.set(sp.id, { tier: 'extended', role: byGender(sp, 'Daughter-in-law', 'Son-in-law', 'Child-in-law') });
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

/**
 * Computes complete ancestral lineage from Grandparents & Ancestors down to selectedId.
 * Returns:
 * - ancestorIds: Set of all direct ancestor IDs (parents, grandparents, great-grandparents)
 * - lineageSpouseKeys: Set of canonical couple keys (e.g. 'p1-p2') along the ancestral path
 * - lineageParentChildChildIds: Set of child IDs along the ancestral lineage path
 */
export function getAncestryLineage(selectedId) {
  if (!selectedId) {
    return {
      ancestorIds: new Set(),
      lineageSpouseKeys: new Set(),
      lineageParentChildChildIds: new Set(),
    };
  }

  const ancestorIds = new Set();
  const lineageSpouseKeys = new Set();
  const lineageParentChildChildIds = new Set();

  function addSpouseKey(idA, idB) {
    if (idA && idB) {
      lineageSpouseKeys.add([String(idA), String(idB)].sort().join('-'));
    }
  }

  // Traverse upward from selectedId
  const queue = [String(selectedId)];
  const visited = new Set([String(selectedId)]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const parents = getParents(currentId);

    if (parents && parents.length > 0) {
      // currentId is a child along the lineage path
      lineageParentChildChildIds.add(currentId);

      if (parents.length >= 2) {
        addSpouseKey(parents[0].id, parents[1].id);
      } else if (parents.length === 1) {
        const spouse = getSpouse(parents[0].id);
        if (spouse) {
          addSpouseKey(parents[0].id, spouse.id);
          if (!ancestorIds.has(spouse.id)) {
            ancestorIds.add(spouse.id);
            if (!visited.has(spouse.id)) {
              visited.add(spouse.id);
              queue.push(spouse.id);
            }
          }
        }
      }

      parents.forEach((p) => {
        ancestorIds.add(p.id);
        if (!visited.has(p.id)) {
          visited.add(p.id);
          queue.push(p.id);
        }
      });
    }
  }

  return {
    ancestorIds,
    lineageSpouseKeys,
    lineageParentChildChildIds,
  };
}

// ── Dynamic Generation Calculation (Data-Driven from Graph) ─

export function computeGenerations(people = getAllPersons(), relationships = getAllRelationships()) {
  const genMap = new Map();
  if (!people || people.length === 0) return genMap;

  const childToParents = new Map();
  const parentToChildren = new Map();
  const spouseGraph = new Map();
  const siblingGraph = new Map();

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
    } else if (r.type === 'sibling') {
      const a = r.personAId || r.personId1;
      const b = r.personBId || r.personId2;
      if (!siblingGraph.has(a)) siblingGraph.set(a, []);
      if (!siblingGraph.has(b)) siblingGraph.set(b, []);
      siblingGraph.get(a).push(b);
      siblingGraph.get(b).push(a);
    }
  });

  // Generations are settled by repeated passes:
  //  • a child sits one row below their lowest-placed parent;
  //  • spouses share a row. A spouse with no parents in the tree joins
  //    their partner's row. When both have parents in different rows (e.g.
  //    a man marrying his sister's daughter), the wife joins the husband's
  //    row, matching how couples are placed with the husband's family.
  // A loop in the data (someone recorded as their own ancestor) would keep
  // pushing rows down, so the number of passes and rows is capped.
  const genderOf = new Map(people.map((p) => [p.id, p.gender]));
  const hasParents = (id) => (childToParents.get(id) || []).length > 0;
  // The husband's side: recorded male, or (gender not recorded) married to
  // someone recorded female.
  const isHusbandSide = (x, other) => {
    const gx = genderOf.get(x);
    const go = genderOf.get(other);
    return (gx === 'male' && go !== 'male') || (go === 'female' && gx !== 'female');
  };
  const spousePairs = [];
  relationships.forEach((r) => {
    if (r.type !== 'spouse') return;
    const a = r.personAId || r.personId1;
    const b = r.personBId || r.personId2;
    if (a && b && a !== b) spousePairs.push([a, b]);
  });
  const siblingPairs = [];
  siblingGraph.forEach((list, a) => list.forEach((b) => siblingPairs.push([a, b])));

  // A wife whose husband also has parents in the tree takes his row outright
  // (her own parents would otherwise keep pulling her one row lower).
  const followsSpouse = new Map(); // wifeId -> husbandId
  spousePairs.forEach(([a, b]) => {
    if (!hasParents(a) || !hasParents(b)) return;
    if (isHusbandSide(a, b)) followsSpouse.set(b, a);
    else if (isHusbandSide(b, a)) followsSpouse.set(a, b);
  });

  const cap = people.length + 1;
  people.forEach((p) => genMap.set(p.id, 0));
  for (let pass = 0; pass < cap + 2; pass += 1) {
    let changed = false;
    const set = (id, g) => {
      const v = Math.min(g, cap);
      if (genMap.has(id) && genMap.get(id) !== v) {
        genMap.set(id, v);
        changed = true;
      }
    };

    // Blood rows: one below the lowest-placed parent.
    people.forEach((p) => {
      if (followsSpouse.has(p.id)) {
        set(p.id, genMap.get(followsSpouse.get(p.id)) ?? 0);
        return;
      }
      const parents = (childToParents.get(p.id) || []).filter((id) => genMap.has(id));
      if (parents.length) set(p.id, Math.max(...parents.map((id) => genMap.get(id))) + 1);
    });

    // Spouses share a row.
    spousePairs.forEach(([a, b]) => {
      if (!genMap.has(a) || !genMap.has(b)) return;
      const gA = genMap.get(a);
      const gB = genMap.get(b);
      if (gA === gB) return;
      const aBlood = hasParents(a);
      const bBlood = hasParents(b);
      let target;
      if (aBlood && !bBlood) target = gA;
      else if (bBlood && !aBlood) target = gB;
      else if (aBlood && bBlood && isHusbandSide(a, b)) target = gA;
      else if (aBlood && bBlood && isHusbandSide(b, a)) target = gB;
      else target = Math.max(gA, gB);
      set(a, target);
      set(b, target);
    });

    // Explicit siblings share a row.
    siblingPairs.forEach(([a, b]) => {
      if (!genMap.has(a) || !genMap.has(b)) return;
      const g = Math.max(genMap.get(a), genMap.get(b));
      set(a, g);
      set(b, g);
    });

    if (!changed) break;
  }

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
