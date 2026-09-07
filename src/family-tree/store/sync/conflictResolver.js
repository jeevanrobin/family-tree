/**
 * Conflict Resolver & Referential Integrity — Medida's Family (Milestone 3C)
 *
 * Implements:
 * 1. 3-way field-level merging for independent concurrent edits.
 * 2. Deterministic conflict logging so unresolvable conflicts are never silently destroyed.
 * 3. Relationship referential integrity checks (dead-link / tombstone protection).
 * 4. Tombstone filtering to prevent phantom resurrects of deleted entities.
 */

/**
 * 3-way field-level merge for Person records.
 * If Device A edits 'occupation' and Device B edits 'biography', both changes survive.
 *
 * @param {object} local - Local cached/edited person record
 * @param {object} remote - Remote cloud person record
 * @param {object} [base] - Base record before local changes (if available)
 * @returns {{ merged: object, hasConflict: boolean, conflicts: object[] }}
 */
export function mergePersonRecords(local, remote, base = null) {
  if (!local) return { merged: remote, hasConflict: false, conflicts: [] };
  if (!remote) return { merged: local, hasConflict: false, conflicts: [] };

  const merged = { ...remote, ...local };
  const conflicts = [];

  const fields = [
    'firstName',
    'middleName',
    'lastName',
    'displayName',
    'gender',
    'livingStatus',
    'dateOfBirth',
    'dateOfDeath',
    'placeOfBirth',
    'hometown',
    'currentLocation',
    'occupation',
    'photo',
    'photoUrl',
    'biography',
    'notes',
    'privacy',
  ];

  for (const field of fields) {
    const localVal = local[field];
    const remoteVal = remote[field];
    const baseVal = base ? base[field] : undefined;

    // Both values identical
    if (localVal === remoteVal) {
      merged[field] = localVal;
      continue;
    }

    // Only local changed from base
    if (baseVal !== undefined && localVal !== baseVal && remoteVal === baseVal) {
      merged[field] = localVal;
      continue;
    }

    // Only remote changed from base
    if (baseVal !== undefined && remoteVal !== baseVal && localVal === baseVal) {
      merged[field] = remoteVal;
      continue;
    }

    // Both changed or no base available
    const localTime = new Date(local.updatedAt || 0).getTime();
    const remoteTime = new Date(remote.updatedAt || 0).getTime();

    if (localVal && !remoteVal) {
      merged[field] = localVal;
    } else if (remoteVal && !localVal) {
      merged[field] = remoteVal;
    } else if (localTime >= remoteTime) {
      merged[field] = localVal;
      conflicts.push({
        field,
        localVal,
        remoteVal,
        winner: 'local',
        reason: 'local edit has newer or equal timestamp',
      });
    } else {
      merged[field] = remoteVal;
      conflicts.push({
        field,
        localVal,
        remoteVal,
        winner: 'remote',
        reason: 'remote edit has newer timestamp',
      });
    }
  }

  // Choose the latest updatedAt
  const localTime = new Date(local.updatedAt || 0).getTime();
  const remoteTime = new Date(remote.updatedAt || 0).getTime();
  merged.updatedAt = localTime >= remoteTime ? local.updatedAt : remote.updatedAt;

  if (conflicts.length > 0) {
    merged._conflictDetails = conflicts;
  }

  return {
    merged,
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * 3-way field-level merge for generic entities (stories, events, photos, documents)
 */
export function mergeEntityRecords(local, remote, base = null) {
  if (!local) return { merged: remote, hasConflict: false };
  if (!remote) return { merged: local, hasConflict: false };

  const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
  const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();

  // Field-level union of properties
  const merged = { ...remote, ...local };

  // For relatedPersonIds, take union so tagged people from both sides are preserved
  if (Array.isArray(local.relatedPersonIds) || Array.isArray(remote.relatedPersonIds)) {
    const localTags = local.relatedPersonIds || [];
    const remoteTags = remote.relatedPersonIds || [];
    merged.relatedPersonIds = [...new Set([...localTags, ...remoteTags])];
  }

  // Use the newer timestamp for updated text content if there's a difference
  if (local.content && remote.content && local.content !== remote.content) {
    merged.content = localTime >= remoteTime ? local.content : remote.content;
  }
  if (local.description && remote.description && local.description !== remote.description) {
    merged.description = localTime >= remoteTime ? local.description : remote.description;
  }
  if (local.title && remote.title && local.title !== remote.title) {
    merged.title = localTime >= remoteTime ? local.title : remote.title;
  }

  merged.updatedAt = localTime >= remoteTime ? (local.updatedAt || new Date().toISOString()) : (remote.updatedAt || new Date().toISOString());

  return { merged, hasConflict: false };
}

/**
 * Validates relationship integrity against existing people and deletion tombstones.
 * Prevents resurrecting links to deleted people or invalid loops.
 *
 * @param {object} rel - Relationship record
 * @param {Set<string>} existingPersonIds - Active living/known person IDs
 * @param {Set<string>} [tombstoneSet] - IDs of deleted people/records
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateRelationshipIntegrity(rel, existingPersonIds, tombstoneSet = new Set()) {
  const p1 = String(rel.parentId || rel.personAId || rel.personId1 || '');
  const p2 = String(rel.childId || rel.personBId || rel.personId2 || '');

  if (!p1 || !p2) {
    return { valid: false, reason: 'Missing participant IDs in relationship.' };
  }

  if (p1 === p2) {
    return { valid: false, reason: 'Self-referential relationships are not permitted.' };
  }

  if (tombstoneSet.has(p1) || tombstoneSet.has(p2)) {
    return { valid: false, reason: 'Relationship references a deleted person tombstone.' };
  }

  if (existingPersonIds && (!existingPersonIds.has(p1) || !existingPersonIds.has(p2))) {
    return { valid: false, reason: 'Referenced person ID does not exist in the active family.' };
  }

  return { valid: true };
}

/**
 * Filters out records whose IDs are recorded in deletion tombstones
 * @param {Array} entities
 * @param {Set<string>} tombstoneSet
 * @returns {Array}
 */
export function filterTombstonedEntities(entities = [], tombstoneSet = new Set()) {
  if (!tombstoneSet || tombstoneSet.size === 0) return entities;
  return entities.filter((e) => !tombstoneSet.has(String(e.id)));
}
