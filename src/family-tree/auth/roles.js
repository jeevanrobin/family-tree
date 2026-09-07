/**
 * Centralized Roles and Permissions Layer — Medida's Family (Milestone 3B)
 *
 * Supported Roles:
 * - OWNER: Full family control, manage members, full data CRUD.
 * - EDITOR: Read family, create/edit/delete all normal family data (no member/family management).
 * - CONTRIBUTOR: Read family, create/edit stories, life events, media, documents (no person/rel edits, no member management).
 * - VIEWER: Read-only access across the entire family tree dossier.
 *
 * Note: UI permission checks provide responsive user guidance.
 * Database Row-Level Security (RLS) remains the authoritative enforcement layer.
 */

export const ROLES = Object.freeze({
  OWNER: 'owner',
  EDITOR: 'editor',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.OWNER]: 'Owner',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.CONTRIBUTOR]: 'Contributor',
  [ROLES.VIEWER]: 'Viewer',
});

export const ROLE_DESCRIPTIONS = Object.freeze({
  [ROLES.OWNER]: 'Full administrative control over family settings, memberships, and tree records.',
  [ROLES.EDITOR]: 'Can add and modify people, relationships, stories, events, and archival media.',
  [ROLES.CONTRIBUTOR]: 'Can contribute family stories, life events, photos, and historical documents.',
  [ROLES.VIEWER]: 'Read-only access to view family members, relationships, and the archival dossier.',
});

/**
 * Validates if a role string is recognized by the platform.
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
  return Object.values(ROLES).includes(role?.toLowerCase());
}

/**
 * Permission: View family tree and records.
 * All verified members (Owner, Editor, Contributor, Viewer) can view.
 * @param {string} role
 * @returns {boolean}
 */
export function canViewFamily(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === ROLES.OWNER || r === ROLES.EDITOR || r === ROLES.CONTRIBUTOR || r === ROLES.VIEWER;
}

/**
 * Permission: Create family data records (people, relationships, stories, events, media, docs).
 * Owner, Editor, and Contributor can create appropriate records.
 * @param {string} role
 * @returns {boolean}
 */
export function canCreateFamilyData(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === ROLES.OWNER || r === ROLES.EDITOR || r === ROLES.CONTRIBUTOR;
}

/**
 * Permission: Edit general family data records.
 * @param {string} role
 * @returns {boolean}
 */
export function canEditFamilyData(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === ROLES.OWNER || r === ROLES.EDITOR || r === ROLES.CONTRIBUTOR;
}

/**
 * Permission: Delete family data records.
 * Only Owner and Editor can delete records.
 * @param {string} role
 * @returns {boolean}
 */
export function canDeleteFamilyData(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === ROLES.OWNER || r === ROLES.EDITOR;
}

/**
 * Permission: Manage family metadata (name, description, deletion).
 * Only the Owner has family management rights.
 * @param {string} role
 * @returns {boolean}
 */
export function canManageFamily(role) {
  if (!role) return false;
  return role.toLowerCase() === ROLES.OWNER;
}

/**
 * Permission: Manage family memberships and assign roles.
 * Only the Owner can invite, update, or remove members.
 * @param {string} role
 * @returns {boolean}
 */
export function canManageMembers(role) {
  if (!role) return false;
  return role.toLowerCase() === ROLES.OWNER;
}

/**
 * Permission: Invite new members to the family.
 * Only the Owner can issue family invitations.
 * @param {string} role
 * @returns {boolean}
 */
export function canInviteMembers(role) {
  return canManageMembers(role);
}

/**
 * Permission: Remove a member from the family.
 * Owner can remove non-owner members (editor, contributor, viewer).
 * @param {string} actorRole
 * @param {string} targetRole
 * @returns {boolean}
 */
export function canRemoveMember(actorRole, targetRole) {
  if (!actorRole || !targetRole) return false;
  if (actorRole.toLowerCase() !== ROLES.OWNER) return false;
  // Cannot remove another owner (or self without transfer)
  return targetRole.toLowerCase() !== ROLES.OWNER;
}

/**
 * Permission: Change a member's role.
 * Owner can assign editor, contributor, or viewer roles.
 * Ownership transfer is a dedicated operation.
 * @param {string} actorRole
 * @param {string} targetRole
 * @param {string} newRole
 * @returns {boolean}
 */
export function canChangeRole(actorRole, targetRole, newRole) {
  if (!actorRole || !targetRole || !newRole) return false;
  if (actorRole.toLowerCase() !== ROLES.OWNER) return false;
  if (targetRole.toLowerCase() === ROLES.OWNER) return false;
  const n = newRole.toLowerCase();
  return n === ROLES.EDITOR || n === ROLES.CONTRIBUTOR || n === ROLES.VIEWER;
}

/**
 * Permission: Transfer family ownership.
 * Only current Owner can initiate ownership transfer.
 * @param {string} role
 * @returns {boolean}
 */
export function canTransferOwnership(role) {
  if (!role) return false;
  return role.toLowerCase() === ROLES.OWNER;
}

// ── Granular Entity Permissions ──────────────────────────────────────────

/**
 * Permission: Add, edit, or delete people and lineage relationships.
 * Restricted to Owner and Editor.
 * @param {string} role
 * @returns {boolean}
 */
export function canManagePeopleAndLineage(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === ROLES.OWNER || r === ROLES.EDITOR;
}

export function canAddPerson(role) {
  return canManagePeopleAndLineage(role);
}

export function canEditPerson(role) {
  return canManagePeopleAndLineage(role);
}

export function canDeletePerson(role) {
  return canManagePeopleAndLineage(role);
}

export function canAddRelationship(role) {
  return canManagePeopleAndLineage(role);
}

export const canAddRelative = canAddRelationship;

export function canDeleteRelationship(role) {
  return canManagePeopleAndLineage(role);
}

export const canDeleteRelative = canDeleteRelationship;

/**
 * Permission: Contribute or manage stories, life events, photos, documents.
 * Owner and Editor can manage all; Contributor can create and contribute.
 * @param {string} role
 * @returns {boolean}
 */
export function canContributeContent(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === ROLES.OWNER || r === ROLES.EDITOR || r === ROLES.CONTRIBUTOR;
}

export function canAddStory(role) {
  return canContributeContent(role);
}

export function canEditStory(role) {
  return canContributeContent(role);
}

export function canDeleteStory(role) {
  return canDeleteFamilyData(role);
}

export function canAddLifeEvent(role) {
  return canContributeContent(role);
}

export function canEditLifeEvent(role) {
  return canContributeContent(role);
}

export function canDeleteLifeEvent(role) {
  return canDeleteFamilyData(role);
}

export function canUploadMedia(role) {
  return canContributeContent(role);
}

export function canDeleteMedia(role) {
  return canDeleteFamilyData(role);
}

export function canUploadDocument(role) {
  return canContributeContent(role);
}

export function canDeleteDocument(role) {
  return canDeleteFamilyData(role);
}
