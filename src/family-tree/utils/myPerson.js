/**
 * myPerson — which card in this family is "me", remembered on this device
 * for the signed-in account.
 */

const keyFor = (userId, familyId) => `anvaya-me-${userId || 'local'}-${familyId || 'default'}`;

export function getMyPersonId(userId, familyId) {
  try {
    return localStorage.getItem(keyFor(userId, familyId)) || null;
  } catch {
    return null;
  }
}

export function setMyPersonId(userId, familyId, personId) {
  try {
    if (personId) localStorage.setItem(keyFor(userId, familyId), String(personId));
    else localStorage.removeItem(keyFor(userId, familyId));
  } catch {
    // Storage unavailable: "me" lasts for this visit only.
  }
}
