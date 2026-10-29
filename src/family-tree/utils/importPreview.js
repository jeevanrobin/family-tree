/**
 * importPreview — what importing a backup would change in the current tree,
 * so the user can confirm before everything is replaced.
 */

const str = (v) => (v === null || v === undefined ? '' : String(v));
const name = (p) => p?.displayName || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || str(p?.id);

const DETAIL_FIELDS = [
  'firstName', 'middleName', 'lastName', 'displayName', 'gender', 'livingStatus',
  'dateOfBirth', 'dateOfDeath', 'placeOfBirth', 'hometown', 'currentLocation',
  'occupation', 'biography', 'notes', 'privacy',
];
const same = (a, b) => str(a ?? '') === str(b ?? '');

function linkKey(r) {
  const type = r.type === 'parent' ? 'parent-child' : r.type;
  if (type === 'parent-child') return `pc:${str(r.parentId || r.personId1)}>${str(r.childId || r.personId2)}`;
  return `${type}:${[str(r.personAId || r.personId1), str(r.personBId || r.personId2)].sort().join('|')}`;
}

/**
 * @returns {{ added: string[], removed: string[], changed: string[], linksAdded: number, linksRemoved: number }}
 *   names of people added / removed / with different details, and link counts.
 */
export function previewImport(backup, people, relationships) {
  const family = backup?.family || backup || {};
  const incoming = Array.isArray(family.people) ? family.people : [];
  const incomingRels = Array.isArray(family.relationships) ? family.relationships : [];
  const current = new Map((people || []).map((p) => [str(p.id), p]));
  const next = new Map(incoming.map((p) => [str(p.id), p]));

  const added = incoming.filter((p) => !current.has(str(p.id))).map(name);
  const removed = (people || []).filter((p) => !next.has(str(p.id))).map(name);
  const changed = incoming
    .filter((p) => current.has(str(p.id)))
    .filter((p) => DETAIL_FIELDS.some((f) => !same(p[f], current.get(str(p.id))[f])))
    .map(name);

  const now = new Set((relationships || []).map(linkKey));
  const then = new Set(incomingRels.map(linkKey));
  const linksAdded = [...then].filter((k) => !now.has(k)).length;
  const linksRemoved = [...now].filter((k) => !then.has(k)).length;

  return { added, removed, changed, linksAdded, linksRemoved };
}

/** True when importing would lose something the tree has now. */
export function importLosesData(preview) {
  return preview.removed.length > 0 || preview.changed.length > 0 || preview.linksRemoved > 0;
}
