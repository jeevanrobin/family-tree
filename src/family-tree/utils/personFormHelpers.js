/**
 * Person Form Helpers — Medida's Family
 * Pure data transformation functions for person editing and prefilling.
 */

export function getPersonInitialState(person) {
  if (!person) {
    return {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: 'unspecified',
      livingStatus: 'alive',
      dateOfBirth: '',
      dateOfDeath: '',
      placeOfBirth: '',
      hometown: '',
      currentLocation: '',
      occupation: '',
      photoUrl: '',
      biography: '',
      notes: '',
    };
  }

  // Normalize dates for HTML date input (YYYY-MM-DD)
  const dob = person.dateOfBirth ? String(person.dateOfBirth).split('T')[0] : '';
  const dod = person.dateOfDeath ? String(person.dateOfDeath).split('T')[0] : '';

  // Normalize gender to select options ('male' | 'female' | 'unspecified')
  let normalizedGender = person.gender || 'unspecified';
  if (!['male', 'female', 'unspecified'].includes(normalizedGender)) {
    normalizedGender = 'unspecified';
  }

  // Living status
  const livingStatus = person.livingStatus || (dod ? 'deceased' : 'alive');

  return {
    firstName: person.firstName || '',
    middleName: person.middleName || '',
    lastName: person.lastName || '',
    gender: normalizedGender,
    livingStatus,
    dateOfBirth: dob,
    dateOfDeath: dod,
    placeOfBirth: person.placeOfBirth || person.birthplace || '',
    hometown: person.hometown || '',
    currentLocation: person.currentLocation || '',
    occupation: person.occupation || '',
    photoUrl: person.photo || person.photoUrl || '',
    biography: person.biography || '',
    notes: person.notes || '',
  };
}

export function preparePersonUpdates(formData, existingPerson = {}) {
  const trimmedFirst = (formData.firstName || '').trim();
  if (!trimmedFirst) {
    throw new Error('First name is required.');
  }

  const dob = formData.dateOfBirth || null;
  const dod = formData.dateOfDeath || null;

  if (dob && dod && new Date(dob) > new Date(dod)) {
    throw new Error('Date of birth cannot be after date of death.');
  }

  const trimmedMiddle = (formData.middleName || '').trim();
  const trimmedLast = (formData.lastName || '').trim();
  const displayName =
    [trimmedFirst, trimmedMiddle, trimmedLast].filter(Boolean).join(' ') || 'Unnamed';

  let finalPhoto = existingPerson.photo || existingPerson.photoUrl || '';
  if (formData.isPhotoRemoved) {
    finalPhoto = '';
  } else if (typeof formData.photoUrl !== 'undefined') {
    finalPhoto = (formData.photoUrl || '').trim();
  } else if (typeof formData.photo !== 'undefined') {
    finalPhoto = (formData.photo || '').trim();
  }

  return {
    firstName: trimmedFirst,
    middleName: trimmedMiddle,
    lastName: trimmedLast,
    displayName,
    gender: formData.gender || 'unspecified',
    livingStatus: formData.livingStatus || (dod ? 'deceased' : 'alive'),
    dateOfBirth: dob,
    dateOfDeath: dod,
    placeOfBirth: (formData.placeOfBirth || '').trim(),
    hometown: (formData.hometown || '').trim() || existingPerson.hometown || '',
    currentLocation: (formData.currentLocation || '').trim(),
    occupation: (formData.occupation || '').trim(),
    photoUrl: finalPhoto || null,
    photo: finalPhoto || null,
    biography: (formData.biography || '').trim(),
    notes: (formData.notes || '').trim(),
  };
}
