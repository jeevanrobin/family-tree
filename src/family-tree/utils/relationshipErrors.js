/**
 * Relationship Errors Helper — Medida's Family Platform
 *
 * Maps technical validation errors into warm, human-friendly messages for the UI.
 */

export function humanizeRelationshipError(err) {
  const msg = (err?.message || String(err || '')).toLowerCase();
  if (msg.includes('already exists') || msg.includes('duplicate')) {
    return 'This relationship already exists.';
  }
  if (msg.includes('cycle') || msg.includes('descendant') || msg.includes('ancestor')) {
    return 'This connection would create an invalid family loop.';
  }
  if (msg.includes('not exist') || msg.includes('not found') || msg.includes('referenced')) {
    return 'That family member is no longer available.';
  }
  if (msg.includes('more than 2 biological parents') || msg.includes('2 biological parents')) {
    return 'This person already has 2 parents connected.';
  }
  if (msg.includes('own parent') || msg.includes('own sibling') || msg.includes('own child') || msg.includes('themselves') || msg.includes('married to themselves')) {
    return 'A person cannot be connected to themselves.';
  }
  if (msg.includes('date of birth cannot be after date of death')) {
    return 'Date of birth cannot be after date of death.';
  }
  if (msg.includes('first name is required')) {
    return 'First name is required.';
  }
  return err?.message || 'Unable to add family member. Please check details.';
}
