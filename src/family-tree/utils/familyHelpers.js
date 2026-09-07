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
    'linear-gradient(135deg, #4A5568 0%, #2D3748 100%)',
    'linear-gradient(135deg, #516175 0%, #344050 100%)',
    'linear-gradient(135deg, #475569 0%, #2C3A4A 100%)',
    'linear-gradient(135deg, #4A5E72 0%, #30404F 100%)',
  ];

  const femaleGradients = [
    'linear-gradient(135deg, #C4664E 0%, #8B3A28 100%)',
    'linear-gradient(135deg, #B8724A 0%, #7A4830 100%)',
    'linear-gradient(135deg, #A85C42 0%, #6E3828 100%)',
    'linear-gradient(135deg, #C07050 0%, #844432 100%)',
  ];

  const list = person?.gender === 'female' ? femaleGradients : maleGradients;
  let hash = 0;
  const str = person?.id || person?.displayName || 'avatar';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return list[Math.abs(hash) % list.length];
}
