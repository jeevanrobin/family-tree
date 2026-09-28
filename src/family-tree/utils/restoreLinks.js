/**
 * restoreLinks — relationships in a backup that the current tree has lost,
 * for putting back without replacing anything else. Only links between people
 * who are still in the tree are offered, and a link already present (in
 * either direction for spouses and siblings) is never offered again.
 */

const str = (v) => (v === null || v === undefined ? '' : String(v));

function ends(rel) {
  const type = rel.type === 'parent' ? 'parent-child' : rel.type;
  if (type === 'parent-child') return { type, a: str(rel.parentId || rel.personId1), b: str(rel.childId || rel.personId2) };
  return { type, a: str(rel.personAId || rel.personId1), b: str(rel.personBId || rel.personId2) };
}

function linkKey(rel) {
  const { type, a, b } = ends(rel);
  if (type === 'parent-child') return `${type}:${a}>${b}`;
  return `${type}:${[a, b].sort().join('|')}`;
}

/**
 * @param {object} backup - parsed backup file ({ family: { people, relationships } } or the family itself)
 * @param {Array} people - current people
 * @param {Array} relationships - current relationships
 * @returns {{ rel: object, type: string, fromId: string, toId: string, label: string }[]}
 */
export function findMissingLinks(backup, people, relationships) {
  const family = backup?.family || backup || {};
  const backupRels = Array.isArray(family.relationships) ? family.relationships : [];
  const byId = new Map((people || []).map((p) => [str(p.id), p]));
  const name = (id) => byId.get(id)?.displayName || [byId.get(id)?.firstName, byId.get(id)?.lastName].filter(Boolean).join(' ') || id;
  const present = new Set((relationships || []).map(linkKey));
  const presentIds = new Set((relationships || []).map((r) => str(r.id)));

  const seen = new Set();
  const missing = [];
  backupRels.forEach((rel) => {
    const { type, a, b } = ends(rel);
    if (!['parent-child', 'spouse', 'sibling'].includes(type)) return;
    if (!a || !b || a === b || !byId.has(a) || !byId.has(b)) return;
    const key = linkKey(rel);
    if (present.has(key) || seen.has(key)) return;
    seen.add(key);
    const label =
      type === 'parent-child'
        ? `${name(a)} → parent of ${name(b)}`
        : `${name(a)} ${type === 'spouse' ? '♥ married to' : '↔ sibling of'} ${name(b)}`;
    // Keep the backup's id unless the tree already uses it for another link.
    const id = rel.id && !presentIds.has(str(rel.id)) ? rel.id : undefined;
    missing.push({ rel: { ...rel, type, id }, type, fromId: a, toId: b, label });
  });

  // Parents before marriages, so couples are rebuilt in a sensible order.
  const order = { 'parent-child': 0, spouse: 1, sibling: 2 };
  return missing.sort((x, y) => order[x.type] - order[y.type]);
}
