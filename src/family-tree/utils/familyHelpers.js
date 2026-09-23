/**
 * Family Helpers Utility
 */

export function getInitials(person) {
  if (!person) return '';
  const first = person.firstName?.[0] || '';
  const last = person.lastName?.[0] || '';
  return (first + last).toUpperCase();
}

export function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getLifespanInfo(person) {
  if (!person) return { age: null, birthYear: '', deathYear: '', formatted: '' };

  const birthDate = person.dateOfBirth ? new Date(person.dateOfBirth) : null;
  const deathDate = person.dateOfDeath ? new Date(person.dateOfDeath) : null;

  const birthYear = birthDate && !isNaN(birthDate.getTime()) ? birthDate.getFullYear() : '';
  const deathYear = deathDate && !isNaN(deathDate.getTime()) ? deathDate.getFullYear() : '';

  let age = null;
  if (birthDate && !isNaN(birthDate.getTime())) {
    const end = deathDate && !isNaN(deathDate.getTime()) ? deathDate : new Date();
    age = end.getFullYear() - birthDate.getFullYear();
    const m = end.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  let formatted = '';
  if (birthYear && deathYear) {
    formatted = `${birthYear} – ${deathYear} (Aged ${age})`;
  } else if (birthYear) {
    formatted = `b. ${birthYear} (${age} years old)`;
  }

  return { age, birthYear, deathYear, formatted };
}

export function getAvatarGradient(person) {
  const maleGradients = [
    'linear-gradient(135deg, #334155 0%, #1E293B 60%, #0F172A 100%)',
    'linear-gradient(135deg, #384A62 0%, #223147 60%, #121D2C 100%)',
    'linear-gradient(135deg, #2D434E 0%, #1E2E36 60%, #101B20 100%)',
    'linear-gradient(135deg, #475569 0%, #334155 60%, #1E293B 100%)',
  ];

  const femaleGradients = [
    'linear-gradient(135deg, #784A3B 0%, #543328 60%, #2E1B15 100%)',
    'linear-gradient(135deg, #6E444E 0%, #4D2D37 60%, #2A171E 100%)',
    'linear-gradient(135deg, #5C4556 0%, #412E3C 60%, #241821 100%)',
    'linear-gradient(135deg, #6C3E2F 0%, #4B2A1E 60%, #2B160E 100%)',
  ];

  const list = person?.gender === 'female' ? femaleGradients : maleGradients;
  let hash = 0;
  const str = person?.id || person?.displayName || 'avatar';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return list[Math.abs(hash) % list.length];
}

/**
 * Canonical Sibling Display Label — Single Source of Truth
 * 
 * Rules:
 * - If related person's gender === 'female' -> 'Sister'
 * - If related person's gender === 'male'   -> 'Brother'
 * - If gender is unknown/unspecified/other  -> 'Sibling'
 * 
 * Never guesses or infers gender from name.
 * 
 * @param {Object} person - The related person
 * @returns {'Sister' | 'Brother' | 'Sibling'}
 */
export function getSiblingDisplayLabel(person) {
  if (!person) return 'Sibling';
  const g = (person.gender || '').toLowerCase().trim();
  if (g === 'female') return 'Sister';
  if (g === 'male') return 'Brother';
  return 'Sibling';
}

/**
 * Single source of truth for relationship display labels across the application.
 * Symmetrical and contextual based on related person's recorded gender.
 * 
 * @param {Object} viewer - The person being viewed
 * @param {Object} relatedPerson - The related person
 * @param {string} relationshipType - Canonical or legacy relationship type
 * @returns {string} Human-friendly display label
 */
export function getRelationshipDisplayLabel(viewer, relatedPerson, relationshipType) {
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

