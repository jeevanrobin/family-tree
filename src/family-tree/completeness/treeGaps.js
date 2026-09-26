/**
 * treeGaps — which people are missing the details that make the tree work
 * well (gender for relationship names, places for the map), with a short
 * "who is this" line so relatives can recognise them.
 */

const has = (v) => typeof v === 'string' ? v.trim() !== '' : v !== null && v !== undefined;

export function missingFields(person) {
  const missing = [];
  if (!['male', 'female'].includes(person.gender)) missing.push('gender');
  if (!has(person.placeOfBirth)) missing.push('placeOfBirth');
  if (person.livingStatus !== 'deceased' && !has(person.currentLocation)) missing.push('currentLocation');
  return missing;
}

function describeContext(person, persons, relationships) {
  const byId = new Map(persons.map((p) => [String(p.id), p]));
  const id = String(person.id);
  const name = (x) => byId.get(x)?.displayName || byId.get(x)?.firstName;
  const parents = [];
  const spouses = [];
  (relationships || []).forEach((r) => {
    if (r.type === 'parent-child' && String(r.childId ?? r.personId2) === id) parents.push(String(r.parentId ?? r.personId1));
    if (r.type === 'spouse') {
      const a = String(r.personAId ?? r.personId1);
      const b = String(r.personBId ?? r.personId2);
      if (a === id) spouses.push(b);
      else if (b === id) spouses.push(a);
    }
  });
  const g = person.gender;
  const parts = [];
  const parentNames = parents.map(name).filter(Boolean);
  if (parentNames.length) {
    const word = g === 'male' ? 'Son' : g === 'female' ? 'Daughter' : 'Child';
    parts.push(`${word} of ${parentNames.join(' & ')}`);
  }
  const spouseNames = spouses.map(name).filter(Boolean);
  if (spouseNames.length) {
    const word = g === 'male' ? 'husband' : g === 'female' ? 'wife' : 'spouse';
    parts.push(`${parts.length ? word : word[0].toUpperCase() + word.slice(1)} of ${spouseNames.join(', ')}`);
  }
  return parts.join(' · ');
}

/**
 * @returns {{ person: object, missing: string[], context: string }[]}
 *   People with gaps; missing gender first (it changes relationship names).
 */
export function findTreeGaps(persons, relationships) {
  return (persons || [])
    .map((person) => ({ person, missing: missingFields(person), context: describeContext(person, persons, relationships) }))
    .filter((g) => g.missing.length > 0)
    .sort((a, b) => Number(b.missing.includes('gender')) - Number(a.missing.includes('gender')));
}

/** Places already used in the tree, most common first (for suggestions). */
export function knownPlaces(persons) {
  const counts = new Map();
  (persons || []).forEach((p) =>
    [p.placeOfBirth, p.currentLocation, p.hometown].forEach((v) => {
      if (!has(v)) return;
      const k = v.trim();
      counts.set(k, (counts.get(k) || 0) + 1);
    })
  );
  return [...counts].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}
