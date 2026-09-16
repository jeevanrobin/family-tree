/**
 * IdMapper — Durable local ID ↔ cloud UUID mapping store.
 *
 * Persists mapping between application/local IDs (used by FamilyStore)
 * and Supabase UUIDs (used by database) to ensure identity stability
 * across reloads, offline mode, reconnects, and family switches.
 *
 * Stored in IndexedDB under STORES.ID_MAP (to be defined).
 */

import { indexedDBManager } from '../local/indexedDBManager.js';

const ID_MAP_STORE = 'idMap';

export class IdMapper {
  /**
   * @param {string} familyId - Active family UUID
   */
  constructor(familyId) {
    if (!familyId) {
      throw new Error('IdMapper requires a valid familyId.');
    }
    this.familyId = String(familyId);
  }

  /**
   * Store mapping: localId -> remoteUuid
   * @param {string} localId
   * @param {string} remoteUuid
   */
  async setMapping(localId, remoteUuid) {
    const record = {
      id: `${this.familyId}:${localId}`, // composite key: familyId:localId
      familyId: this.familyId,
      localId: String(localId),
      remoteUuid: String(remoteUuid),
      updatedAt: new Date().toISOString(),
    };
    await indexedDBManager.put(ID_MAP_STORE, record);
  }

  /**
   * Get remote UUID by local ID
   * @param {string} localId
   * @returns {Promise<string|null>} remote UUID or null if not mapped
   */
  async getRemoteUuid(localId) {
    const record = await indexedDBManager.get(ID_MAP_STORE, `${this.familyId}:${localId}`);
    return record ? record.remoteUuid : null;
  }

  /**
   * Get local ID by remote UUID
   * @param {string} remoteUuid
   * @returns {Promise<string|null>} local ID or null if not mapped
   */
  async getLocalId(remoteUuid) {
    const all = await indexedDBManager.getAllByFamily(ID_MAP_STORE, this.familyId);
    const match = all.find((r) => r.remoteUuid === remoteUuid);
    return match ? match.localId : null;
  }

   /**
    * Remove mapping (e.g., on deletion)
    * @param {string} localId
    */
   async removeMapping(localId) {
     await indexedDBManager.delete(ID_MAP_STORE, `${this.familyId}:${localId}`);
   }

   /**
    * Convert local ID to UUID if mapping exists; otherwise return local ID (to be used as local_id column).
    * @param {string} localId
    * @returns {Promise<string>} UUID or local ID
    */
   async toUuid(localId) {
     const uuid = await this.getRemoteUuid(localId);
     return uuid !== null ? uuid : localId;
   }

  /**
   * Clear all mappings for this family (e.g., on family switch or reset)
   */
  async clearAll() {
    const all = await indexedDBManager.getAllByFamily(ID_MAP_STORE, this.familyId);
    for (const record of all) {
      await indexedDBManager.delete(ID_MAP_STORE, record.id);
    }
  }
}

/**
 * Ensure the ID_MAP store exists in IndexedDB.
 * This should be called during IndexedDB initialization.
 */
export async function ensureIdMapStore() {
  // This function is a placeholder; actual store creation should be in indexedDBManager.js
  // For now, we rely on the put/get operations to create the store implicitly.
  // In a production implementation, this would modify indexedDBManager.js to add the store.
  return true;
}