/**
 * Duplicate Finder — people who were probably entered twice (e.g. two
 * relatives each adding the same grandparent).
 *
 * Names are compared after normalizing common English spellings of Telugu
 * names (Venkata Reddy / Venkatreddy, Penthala / Penathala, Anasuya /
 * Anasurya), then scored with Jaro-Winkler similarity. Pairs are ruled out
 * when their recorded details contradict each other (different gender,
 * birth years more than 2 apart) or when they are already directly related
 * (a grandson named after his grandfather is not a duplicate).
 */

/** Normalize a name for comparison: lowercase letters only, common transliteration variants folded. */
export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z]/g, '')
    .replace(/x/g, 'ks') // Laxmi / Lakshmi
    .replace(/(th|dh|bh|ph|kh|gh|ch|sh)/g, (m) => m[0]) // aspirated consonants
    .replace(/w/g, 'v')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1'); // double letters (Reddy / Redy, Lakshmi / Laksmi)
}

/** Jaro-Winkler similarity in [0, 1]. */
export function jaroWinkler(a, b) {
  if (a === b) return a ? 1 : 0;
  if (!a || !b) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (!bMatch[j] && a[i] === b[j]) {
        aMatch[i] = true;
        bMatch[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

// Given names and surname are compared separately: two people who share a
// common first name (Venkatreddy) but have different surnames are different people.
const givenName = (p) => [p.firstName, p.middleName].filter(Boolean).join(' ') || p.displayName || '';
const surname = (p) => p.lastName || '';

function nameSimilarity(A, B) {
  const given = jaroWinkler(A.given, B.given);
  if (given < 0.9) return 0;
  if (A.surname && B.surname) {
    const sur = jaroWinkler(A.surname, B.surname);
    if (sur < 0.9) return 0;
    return given * 0.6 + sur * 0.4;
  }
  // One surname missing: rely on the given name alone, strictly.
  return given >= 0.95 ? given : 0;
}
const birthYear = (p) => (p.dateOfBirth ? Number(String(p.dateOfBirth).slice(0, 4)) : null);
const knownGender = (p) => (p.gender === 'male' || p.gender === 'female' ? p.gender : null);

function buildRelations(relationships) {
  const parents = new Map();
  const spouses = new Map();
  const push = (map, k, v) => {
    if (!map.has(k)) map.set(k, new Set());
    map.get(k).add(v);
  };
  relationships.forEach((r) => {
    if (r.type === 'parent-child' || r.type === 'parent') {
      push(parents, String(r.childId ?? r.personId2), String(r.parentId ?? r.personId1));
    } else if (r.type === 'spouse') {
      const a = String(r.personAId ?? r.personId1);
      const b = String(r.personBId ?? r.personId2);
      push(spouses, a, b);
      push(spouses, b, a);
    }
  });
  const ancestorsOf = (id) => {
    const out = new Set();
    const stack = [...(parents.get(id) || [])];
    while (stack.length) {
      const x = stack.pop();
      if (out.has(x)) continue;
      out.add(x);
      stack.push(...(parents.get(x) || []));
    }
    return out;
  };
  return { parents, spouses, ancestorsOf };
}

/** A stable key for a pair, independent of order. */
export const pairKey = (a, b) => [String(a), String(b)].sort().join('|');

/**
 * @param {Array} people
 * @param {Array} relationships
 * @param {{ dismissed?: Set<string>|string[], threshold?: number }} [options]
 * @returns {Array<{ a: object, b: object, score: number, reasons: string[] }>} best matches first
 */
export function findDuplicateCandidates(people, relationships, { dismissed = [], threshold = 0.9 } = {}) {
  const dismissedSet = dismissed instanceof Set ? dismissed : new Set(dismissed);
  const { parents, spouses, ancestorsOf } = buildRelations(relationships);
  const ancestorCache = new Map();
  const ancestors = (id) => {
    if (!ancestorCache.has(id)) ancestorCache.set(id, ancestorsOf(id));
    return ancestorCache.get(id);
  };
  const prepared = people.map((p) => ({
    p,
    id: String(p.id),
    given: normalizeName(givenName(p)),
    surname: normalizeName(surname(p)),
  }));
  const candidates = [];

  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      const A = prepared[i];
      const B = prepared[j];
      if (!A.given || !B.given || dismissedSet.has(pairKey(A.id, B.id))) continue;

      const similarity = nameSimilarity(A, B);
      if (similarity < threshold) continue;

      // Contradictions rule a pair out.
      const ga = knownGender(A.p);
      const gb = knownGender(B.p);
      if (ga && gb && ga !== gb) continue;
      const ya = birthYear(A.p);
      const yb = birthYear(B.p);
      if (ya && yb && Math.abs(ya - yb) > 2) continue;
      if (ancestors(A.id).has(B.id) || ancestors(B.id).has(A.id)) continue;
      if (spouses.get(A.id)?.has(B.id)) continue;
      const pa = parents.get(A.id) || new Set();
      const pb = parents.get(B.id) || new Set();
      const sharedParents = [...pa].filter((x) => pb.has(x)).length;
      // Two different children of the same parents with the same name is unusual,
      // but siblings with near-identical names (Venkatesh / Venkatesham) are not.
      if (sharedParents > 0 && similarity < 0.97) continue;

      let score = similarity;
      const reasons = [similarity >= 0.999 ? 'Same name' : 'Very similar name'];
      if (ya && yb) {
        score += 0.05;
        reasons.push(ya === yb ? `Both born ${ya}` : `Born ${ya} and ${yb}`);
      }
      if (sharedParents) {
        score += 0.05;
        reasons.push('Same parents');
      }
      const sa = spouses.get(A.id) || new Set();
      const sb = spouses.get(B.id) || new Set();
      if ([...sa].some((x) => sb.has(x))) {
        score += 0.05;
        reasons.push('Same spouse');
      }
      const placeA = (A.p.placeOfBirth || '').trim().toLowerCase();
      if (placeA && placeA === (B.p.placeOfBirth || '').trim().toLowerCase()) {
        score += 0.02;
        reasons.push(`Both born in ${A.p.placeOfBirth}`);
      }
      candidates.push({ a: A.p, b: B.p, score: Math.min(1, score), reasons });
    }
  }
  return candidates.sort((x, y) => y.score - x.score);
}
