/**
 * Synchronization Types and Constants — Medida's Family (Milestone 3C)
 */

export const SYNC_STATUS = Object.freeze({
  SYNCED: 'synced',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  PENDING: 'pending',
  ERROR: 'error',
});

export const SYNC_STATUS_LABELS = Object.freeze({
  [SYNC_STATUS.SYNCED]: 'Synced',
  [SYNC_STATUS.SYNCING]: 'Syncing...',
  [SYNC_STATUS.OFFLINE]: 'Offline — saved locally',
  [SYNC_STATUS.PENDING]: 'Pending sync',
  [SYNC_STATUS.ERROR]: 'Needs attention',
});

export const MUTATION_OP = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
});

export const ENTITY_TYPES = Object.freeze({
  PERSON: 'person',
  RELATIONSHIP: 'relationship',
  STORY: 'story',
  LIFE_EVENT: 'lifeEvent',
  PHOTO: 'photo',
  DOCUMENT: 'document',
});

/**
 * Creates a normalized sync queue item
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.operation - 'create' | 'update' | 'delete'
 * @param {object} [params.payload]
 * @param {number} [params.baseVersion]
 * @returns {object}
 */
export function createQueueItem({
  familyId,
  entityType,
  entityId,
  operation,
  payload = null,
  baseVersion = 1,
}) {
  return {
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
    familyId: String(familyId),
    entityType,
    entityId: String(entityId),
    operation,
    payload,
    baseVersion,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    lastAttemptAt: null,
    status: 'pending', // 'pending' | 'syncing' | 'failed'
    error: null,
  };
}
