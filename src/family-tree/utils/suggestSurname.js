/**
 * Surname to pre-fill when adding a relative: children take the father's
 * surname, a wife takes her husband's. Returns null when there is no
 * sensible guess (the field is then left for the user).
 *
 * @param {string} relOption  'child' | 'spouse' | 'sibling' | 'father' | ...
 * @param {object} relative   the person the new member is connected to
 * @param {{ getSpouses: Function, getParents: Function }} family
 * @param {string} [newGender] gender chosen for the new person, if any
 * @returns {{ surname: string, fromName: string } | null}
 */
export function suggestSurname(relOption, relative, family, newGender = null) {
  if (!relative) return null;
  const surname = (p) => (p?.lastName || '').trim();
  const pick = (p) => (surname(p) ? { surname: surname(p), fromName: p.displayName || p.firstName || '' } : null);
  const husbandOf = (p) => (family.getSpouses?.(p.id) || []).find((s) => s.gender === 'male') || null;
  const fatherOf = (p) => (family.getParents?.(p.id) || []).find((s) => s.gender === 'male') || null;

  switch (relOption) {
    case 'child':
      // Added under the father: his surname. Under the mother: her husband's,
      // else hers.
      if (relative.gender === 'female') return pick(husbandOf(relative)) || pick(relative);
      return pick(relative);
    case 'spouse':
      // A wife takes her husband's surname; a husband's is unknown.
      if (relative.gender === 'male' && newGender !== 'male') return pick(relative);
      return null;
    case 'sibling':
      // Siblings share their father's surname (a married sister's own
      // surname may be her husband's).
      return pick(fatherOf(relative)) || (relative.gender === 'male' ? pick(relative) : null);
    case 'father':
    case 'parent':
      // Father of a son: same surname.
      if (relOption === 'father' || newGender === 'male') {
        return relative.gender === 'male' ? pick(relative) : pick(fatherOf(relative));
      }
      return null;
    default:
      return null;
  }
}
