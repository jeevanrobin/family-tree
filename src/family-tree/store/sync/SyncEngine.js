/**
 * SyncEngine — Offline-First Cloud Synchronization & Reconnect Recovery (Milestone 3C)
 *
 * Responsibilities:
 * - Local cache hydration from IndexedDB
 * - Durable FIFO mutation queueing
 * - Online push to Supabase with bounded exponential backoff
 * - Conflict detection & non-destructive 3-way field merging
 * - Deletion tombstones to prevent phantom resurrects
 * - Network detection & automatic reconnect recovery
 * - Observable synchronization state for UI feedback
 */

import { SYNC_STATUS, createQueueItem, ENTITY_TYPES, MUTATION_OP } from './syncTypes.js';
import { indexedDBManager, STORES } from '../local/indexedDBManager.js';
import {
  mergePersonRecords,
  validateRelationshipIntegrity,
  filterTombstonedEntities,
} from './conflictResolver.js';
import { mediaStorageService } from '../../media/mediaStorageService.js';
import { IdMapper } from '../repository/IdMapper.js';

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

const PERSON_REF_FIELDS = ['personId', 'personId1', 'personId2', 'parentId', 'childId', 'personAId', 'personBId'];

/** True when a queued mutation's payload references the given entity ID. */
function queueItemReferences(item, entityId) {
  const payload = item.payload || {};
  if (PERSON_REF_FIELDS.some((field) => payload[field] != null && String(payload[field]) === entityId)) {
    return true;
  }
  const lists = [payload.relatedPersonIds, payload.orderedPersonIds];
  return lists.some((list) => Array.isArray(list) && list.some((id) => String(id) === entityId));
}

export class SyncEngine {
  /**
   * @param {string} familyId - Active family UUID
   * @param {import('../repository/SupabaseAdapter.js').SupabaseAdapter} [supabaseAdapter] - Cloud adapter
   * @param {object} [options]
   */
  constructor(familyId, supabaseAdapter = null, options = {}) {
    if (!familyId) {
      throw new Error('SyncEngine requires a valid familyId.');
    }
     this.familyId = String(familyId);
     this.supabaseAdapter = supabaseAdapter;
     this.options = options;

     // Durable ID mapper: local ID <-> cloud UUID
     this.idMapper = new IdMapper(this.familyId);

    this.status = typeof navigator !== 'undefined' && !navigator.onLine ? SYNC_STATUS.OFFLINE : SYNC_STATUS.SYNCED;
    this.listeners = new Set();
    this.remoteListeners = new Set();
    this.isFlushing = false;
    this.retryTimeout = null;
    this.destroyed = false;

    // Network listeners
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // ── Observable Status ──────────────────────────────────────

  getStatus() {
    return this.status;
  }

  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notifyListeners();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l(this.status);
      } catch (err) {
        console.error('Error in sync engine listener:', err);
      }
    });
  }

  // ── Network Detection & Reconnect Recovery ─────────────────

  isOnline() {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  handleOnline() {
    if (this.destroyed) return;
    // Only trigger sync if we were actually offline
    // This prevents unnecessary sync when browser fires spurious 'online' events on tab focus
    if (this.status === SYNC_STATUS.OFFLINE) {
      this.setStatus(SYNC_STATUS.SYNCING);
      // Automatic reconnect recovery: trigger queue flush and pull updates
      this.sync();
    }
  }

  handleOffline() {
    if (this.destroyed) return;
    this.setStatus(SYNC_STATUS.OFFLINE);
  }

  // ── Hydration Flow (Instant First Frame) ───────────────────

  /**
   * Hydrates family data.
   * 1. Returns IndexedDB local cache immediately if available.
   * 2. Triggers cloud pull & sync in the background.
   */
  async hydrate() {
    const fid = this.familyId;

    // 1. Read from IndexedDB local cache
    const [cachedPeople, cachedRels, cachedStories, cachedEvents, cachedPhotos, cachedDocs] = await Promise.all([
      indexedDBManager.getAllByFamily(STORES.PEOPLE, fid),
      indexedDBManager.getAllByFamily(STORES.RELATIONSHIPS, fid),
      indexedDBManager.getAllByFamily(STORES.STORIES, fid),
      indexedDBManager.getAllByFamily(STORES.LIFE_EVENTS, fid),
      indexedDBManager.getAllByFamily(STORES.PHOTOS, fid),
      indexedDBManager.getAllByFamily(STORES.DOCUMENTS, fid),
    ]);

     const hasCache = (cachedPeople && cachedPeople.length > 0) || (cachedRels && cachedRels.length > 0);

     // Populate ID mappings from cached data
     await this.populateIdMappings(cachedPeople || []);
     await this.populateIdMappings(cachedRels || []);
     await this.populateIdMappings(cachedStories || []);
     await this.populateIdMappings(cachedEvents || []);
     await this.populateIdMappings(cachedPhotos || []);
     await this.populateIdMappings(cachedDocs || []);

     if (hasCache) {
       // Background sync with cloud
       if (this.isOnline() && this.supabaseAdapter) {
         setTimeout(() => this.sync(), 50);
       }
       return {
         people: cachedPeople,
         relationships: cachedRels,
         stories: cachedStories,
         lifeEvents: cachedEvents,
         photos: cachedPhotos,
         documents: cachedDocs,
       };
     }

    // 2. Empty local cache: fetch from Supabase if available
    if (this.isOnline() && this.supabaseAdapter) {
       try {
         this.setStatus(SYNC_STATUS.SYNCING);
         const remoteData = await this.supabaseAdapter.load();

         // Populate ID mappings from remote data
         await this.populateIdMappings(remoteData.people || []);
         await this.populateIdMappings(remoteData.relationships || []);
         await this.populateIdMappings(remoteData.stories || []);
         await this.populateIdMappings(remoteData.lifeEvents || []);
         await this.populateIdMappings(remoteData.photos || []);
         await this.populateIdMappings(remoteData.documents || []);

         // Populate local cache in IndexedDB
         await Promise.all([
           indexedDBManager.putBatch(STORES.PEOPLE, remoteData.people || []),
           indexedDBManager.putBatch(STORES.RELATIONSHIPS, remoteData.relationships || []),
           indexedDBManager.putBatch(STORES.STORIES, remoteData.stories || []),
           indexedDBManager.putBatch(STORES.LIFE_EVENTS, remoteData.lifeEvents || []),
           indexedDBManager.putBatch(STORES.PHOTOS, remoteData.photos || []),
           indexedDBManager.putBatch(STORES.DOCUMENTS, remoteData.documents || []),
         ]);

        await indexedDBManager.updateSyncMeta(fid, {
          lastSyncedAt: new Date().toISOString(),
          lastPullAt: new Date().toISOString(),
          ...(remoteData.siblingOrder ? { siblingOrder: remoteData.siblingOrder } : {}),
        });

        if (remoteData.siblingOrder && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`family-tree-sibling-order-${fid}`, JSON.stringify(remoteData.siblingOrder));
          } catch (_e) {}
        }

        this.setStatus(SYNC_STATUS.SYNCED);
        return remoteData || {
          people: [],
          relationships: [],
          stories: [],
          lifeEvents: [],
          photos: [],
          documents: [],
          siblingOrder: {},
        };
      } catch (err) {
        console.warn('SyncEngine: Initial cloud load failed:', err.message);
        this.setStatus(this.isOnline() ? SYNC_STATUS.ERROR : SYNC_STATUS.OFFLINE);
      }
    }

    // Default clean empty state for fresh cloud family without cache
    return {
      people: [],
      relationships: [],
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
    };
  }

  // ── Mutation Enqueueing ────────────────────────────────────

  /**
   * Enqueues an offline-first mutation and updates local IndexedDB cache immediately.
   */
  async enqueue(entityType, entityId, operation, payload = null) {
    const fid = this.familyId;
    const storeMap = {
      [ENTITY_TYPES.PERSON]: STORES.PEOPLE,
      [ENTITY_TYPES.RELATIONSHIP]: STORES.RELATIONSHIPS,
      [ENTITY_TYPES.STORY]: STORES.STORIES,
      [ENTITY_TYPES.LIFE_EVENT]: STORES.LIFE_EVENTS,
      [ENTITY_TYPES.PHOTO]: STORES.PHOTOS,
      [ENTITY_TYPES.DOCUMENT]: STORES.DOCUMENTS,
    };

    const targetStore = storeMap[entityType];

    // 1. Write to local IndexedDB cache immediately
    if (targetStore) {
      if (operation === MUTATION_OP.DELETE) {
        await indexedDBManager.delete(targetStore, entityId);
        // Record deletion tombstone
        await indexedDBManager.addTombstone({ id: entityId, familyId: fid, entityType });
      } else if (payload) {
        await indexedDBManager.put(targetStore, { ...payload, family_id: fid, familyId: fid });
      }
    } else if (entityType === ENTITY_TYPES.SIBLING_ORDER) {
      try {
        const meta = (await indexedDBManager.get(STORES.SYNC_META, fid)) || { familyId: fid, siblingOrder: {} };
        const currentOrder = { ...(meta.siblingOrder || {}) };
        if (operation === MUTATION_OP.DELETE) {
          delete currentOrder[entityId];
        } else if (payload?.orderedPersonIds) {
          currentOrder[entityId] = payload.orderedPersonIds;
        }
        await indexedDBManager.put(STORES.SYNC_META, { ...meta, familyId: fid, siblingOrder: currentOrder });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`family-tree-sibling-order-${fid}`, JSON.stringify(currentOrder));
        }
      } catch (_e) {}
    }

    // 2. Enqueue in durable sync queue
    const queueItem = createQueueItem({
      familyId: fid,
      entityType,
      entityId,
      operation,
      payload,
    });
    await indexedDBManager.enqueue(queueItem);

    // 3. Update status and attempt push
    if (!this.isOnline() || !this.supabaseAdapter) {
      this.setStatus(SYNC_STATUS.OFFLINE);
    } else {
      this.setStatus(SYNC_STATUS.PENDING);
      await this.flushQueue();
    }

    return queueItem;
  }

  // ── Push Pending Queue ─────────────────────────────────────

  async flushQueue() {
    if (this.flushPromise) return this.flushPromise;
    if (this.destroyed) return;
    if (!this.isOnline() || !this.supabaseAdapter) {
      this.setStatus(SYNC_STATUS.OFFLINE);
      return;
    }

    this.isFlushing = true;
    this.setStatus(SYNC_STATUS.SYNCING);

    this.flushPromise = (async () => {
      try {
        const pendingItems = await indexedDBManager.getPendingQueue(this.familyId);

      if (pendingItems.length === 0) {
        this.setStatus(SYNC_STATUS.SYNCED);
        this.isFlushing = false;
        return;
      }

      // Entities whose mutations failed for good. Later mutations of the same
      // entity, and anything referencing an entity whose create failed, are
      // held back instead of being pushed against missing or stale rows.
      const blockedIds = new Map(); // entityId -> whether its create failed
      const block = (item) => {
        const id = String(item.entityId);
        blockedIds.set(id, blockedIds.get(id) || item.operation === MUTATION_OP.CREATE);
      };
      const findBlocker = (item) => {
        for (const [id, createFailed] of blockedIds) {
          if (String(item.entityId) === id) return id;
          if (createFailed && queueItemReferences(item, id)) return id;
        }
        return null;
      };

      for (const item of pendingItems) {
        if (this.destroyed || !this.isOnline()) break;

        const blocker = findBlocker(item);
        if (blocker) {
          await indexedDBManager.updateQueueItem(item.id, {
            status: 'failed',
            error: `Waiting on ${blocker}, which failed to sync.`,
          });
          block(item);
          continue;
        }

        // Failed earlier: keep it (and its dependents) parked until retryFailed().
        if (item.status === 'failed') {
          block(item);
          continue;
        }

        // Bounded retry check
        if (item.attemptCount >= MAX_RETRIES) {
          await indexedDBManager.updateQueueItem(item.id, {
            status: 'failed',
            error: `Max retries (${MAX_RETRIES}) reached.`,
          });
          block(item);
          continue;
        }

        try {
          await this._executeRemoteOperation(item);
          // Operation succeeded: dequeue
          await indexedDBManager.dequeue(item.id);
        } catch (opErr) {
          console.warn(`SyncEngine operation error (${item.operation} ${item.entityType}):`, opErr.message);

          const isPermanent =
            opErr.message?.includes('Forbidden') ||
            opErr.message?.includes('Cross-family') ||
            opErr.message?.includes('Self-referential') ||
            opErr.message?.includes('validation failed');

          const newAttemptCount = item.attemptCount + 1;
          await indexedDBManager.updateQueueItem(item.id, {
            attemptCount: newAttemptCount,
            lastAttemptAt: new Date().toISOString(),
            status: isPermanent ? 'failed' : 'pending',
            error: opErr.message,
          });

          if (isPermanent) {
            block(item);
          } else {
            // Schedule bounded exponential backoff retry
            const delay = Math.min(
              BASE_RETRY_DELAY_MS * Math.pow(2, newAttemptCount - 1),
              MAX_RETRY_DELAY_MS
            );
            this.scheduleRetry(delay);
            break; // Stop FIFO processing of remaining dependent items for now
          }
        }
      }

      // Recheck pending queue count
      const remaining = await indexedDBManager.getPendingQueue(this.familyId);
      if (remaining.length === 0) {
        this.setStatus(SYNC_STATUS.SYNCED);
        await indexedDBManager.updateSyncMeta(this.familyId, {
          lastSyncedAt: new Date().toISOString(),
        });
      } else {
        const hasActivePending = remaining.some((r) => r.status === 'pending');
        this.setStatus(hasActivePending ? SYNC_STATUS.PENDING : SYNC_STATUS.ERROR);
      }
    } catch (err) {
      console.error('SyncEngine flush error:', err);
      this.setStatus(SYNC_STATUS.ERROR);
    } finally {
      this.isFlushing = false;
      this.flushPromise = null;
    }
  })();

  return this.flushPromise;
}

  /**
   * Mutations that failed for good (or are held behind one), for showing the
   * user what did not reach the cloud.
   */
  async getFailedMutations() {
    const queue = await indexedDBManager.getPendingQueue(this.familyId);
    return queue.filter((item) => item.status === 'failed');
  }

  /**
   * Put failed mutations back in the queue (fresh retry budget) and flush.
   */
  async retryFailed() {
    const failed = await this.getFailedMutations();
    for (const item of failed) {
      await indexedDBManager.updateQueueItem(item.id, { status: 'pending', attemptCount: 0, error: null });
    }
    return this.flushQueue();
  }

   /**
    * Convert frontend ID to UUID if mapping exists; otherwise return frontend ID
    * (to be used as local_id column).
    */
   async translateId(frontendId) {
     const uuid = await this.idMapper.getRemoteUuid(frontendId);
     return uuid !== null ? uuid : frontendId;
   }

   /**
    * Populate ID mappings from an array of entities that have id (frontend ID) and uuid fields.
    */
   async populateIdMappings(entities) {
     for (const entity of entities) {
       if (entity.id !== undefined && entity.uuid !== null && entity.uuid !== undefined) {
         await this.idMapper.setMapping(entity.id, entity.uuid);
       }
     }
   }

   async _executeRemoteOperation(item) {
    const { entityType, entityId, operation, payload } = item;
    const adapter = this.supabaseAdapter;
    if (!adapter) throw new Error('SupabaseAdapter unavailable');

    switch (entityType) {
       case ENTITY_TYPES.PERSON:
         if (operation === MUTATION_OP.DELETE) {
           await adapter.deletePerson(entityId);
         } else {
           const savedPerson = await adapter.savePerson({ ...payload, _isNew: operation === MUTATION_OP.CREATE });
           if (operation === MUTATION_OP.CREATE && savedPerson?.uuid) {
             // Store mapping from frontend ID to UUID
             await this.idMapper.setMapping(entityId, savedPerson.uuid);
           }
         }
         break;

       case ENTITY_TYPES.RELATIONSHIP:
         if (operation === MUTATION_OP.DELETE) {
           await adapter.deleteRelationship(entityId);
         } else {
           // Translate ID fields in payload to UUIDs if mapped
           const translatedPayload = { ...payload };
           if (translatedPayload.parentId !== undefined) {
             translatedPayload.parentId = await this.translateId(translatedPayload.parentId);
           }
           if (translatedPayload.personId1 !== undefined) {
             translatedPayload.personId1 = await this.translateId(translatedPayload.personId1);
           }
           if (translatedPayload.childId !== undefined) {
             translatedPayload.childId = await this.translateId(translatedPayload.childId);
           }
           if (translatedPayload.personId2 !== undefined) {
             translatedPayload.personId2 = await this.translateId(translatedPayload.personId2);
           }
           if (translatedPayload.personAId !== undefined) {
             translatedPayload.personAId = await this.translateId(translatedPayload.personAId);
           }
           if (translatedPayload.personBId !== undefined) {
             translatedPayload.personBId = await this.translateId(translatedPayload.personBId);
           }
           await adapter.saveRelationship(translatedPayload);
         }
         break;

       case ENTITY_TYPES.STORY:
         if (operation === MUTATION_OP.DELETE) {
           await adapter.deleteStory(entityId);
         } else {
           // Translate ID fields in payload to UUIDs if mapped
           const translatedPayload = { ...payload };
           if (translatedPayload.personId !== undefined) {
             translatedPayload.personId = await this.translateId(translatedPayload.personId);
           }
           if (Array.isArray(translatedPayload.relatedPersonIds)) {
             translatedPayload.relatedPersonIds = await Promise.all(
               translatedPayload.relatedPersonIds.map(id => this.translateId(id))
             );
           }
           const savedStory = await adapter.saveStory({ ...translatedPayload, _isNew: operation === MUTATION_OP.CREATE });
           if (operation === MUTATION_OP.CREATE && savedStory?.uuid) {
             // Store mapping from frontend ID to UUID
             await this.idMapper.setMapping(entityId, savedStory.uuid);
           }
         }
         break;

       case ENTITY_TYPES.LIFE_EVENT:
         if (operation === MUTATION_OP.DELETE) {
           await adapter.deleteLifeEvent(entityId);
         } else {
           // Translate ID fields in payload to UUIDs if mapped
           const translatedPayload = { ...payload };
           if (translatedPayload.personId !== undefined) {
             translatedPayload.personId = await this.translateId(translatedPayload.personId);
           }
           if (Array.isArray(translatedPayload.relatedPersonIds)) {
             translatedPayload.relatedPersonIds = await Promise.all(
               translatedPayload.relatedPersonIds.map(id => this.translateId(id))
             );
           }
           const savedEvent = await adapter.saveLifeEvent({ ...translatedPayload, _isNew: operation === MUTATION_OP.CREATE });
           if (operation === MUTATION_OP.CREATE && savedEvent?.uuid) {
             // Store mapping from frontend ID to UUID
             await this.idMapper.setMapping(entityId, savedEvent.uuid);
           }
         }
         break;

       case ENTITY_TYPES.PHOTO:
         if (operation === MUTATION_OP.DELETE) {
           await adapter.deletePhoto(entityId);
         } else {
           // Translate ID fields in payload to UUIDs if mapped
           const translatedPayload = { ...payload };
           if (translatedPayload.personId !== undefined) {
             translatedPayload.personId = await this.translateId(translatedPayload.personId);
           }
           if (Array.isArray(translatedPayload.relatedPersonIds)) {
             translatedPayload.relatedPersonIds = await Promise.all(
               translatedPayload.relatedPersonIds.map(id => this.translateId(id))
             );
           }
           const savedPhoto = await adapter.savePhoto({ ...translatedPayload, _isNew: operation === MUTATION_OP.CREATE });
           if (operation === MUTATION_OP.CREATE && savedPhoto?.uuid) {
             // Store mapping from frontend ID to UUID
             await this.idMapper.setMapping(entityId, savedPhoto.uuid);
           }
         }
         break;

       case ENTITY_TYPES.DOCUMENT:
         if (operation === MUTATION_OP.DELETE) {
           await adapter.deleteDocument(entityId);
         } else {
           // Translate ID fields in payload to UUIDs if mapped
           const translatedPayload = { ...payload };
           if (translatedPayload.personId !== undefined) {
             translatedPayload.personId = await this.translateId(translatedPayload.personId);
           }
           const savedDocument = await adapter.saveDocument({ ...translatedPayload, _isNew: operation === MUTATION_OP.CREATE });
           if (operation === MUTATION_OP.CREATE && savedDocument?.uuid) {
             // Store mapping from frontend ID to UUID
             await this.idMapper.setMapping(entityId, savedDocument.uuid);
           }
         }
         break;

        case ENTITY_TYPES.SIBLING_ORDER:
          if (operation === MUTATION_OP.DELETE) {
            await adapter.deleteSiblingOrder(this.familyId, entityId);
          } else {
            const rawCohortKey = payload?.cohortKey || entityId;
            const rawOrderedIds = Array.isArray(payload?.orderedPersonIds) ? payload.orderedPersonIds : [];
            const translatedIds = await Promise.all(
              rawOrderedIds.map((id) => this.translateId(id))
            );
            await adapter.saveSiblingOrder(this.familyId, rawCohortKey, translatedIds);
          }
          break;

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  scheduleRetry(delayMs) {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = setTimeout(() => {
      if (!this.destroyed && this.isOnline()) {
        this.flushQueue();
      }
    }, delayMs);
  }

  // ── Pull Remote Changes & Reconcile ────────────────────────

  async pullRemoteChanges() {
    if (!this.isOnline() || !this.supabaseAdapter || this.destroyed) return null;

    try {
      const fid = this.familyId;
      const remoteData = await this.supabaseAdapter.load();

      for (const list of [
        remoteData.people, remoteData.relationships, remoteData.stories,
        remoteData.lifeEvents, remoteData.photos, remoteData.documents,
      ]) {
        await this.populateIdMappings(list || []);
      }

      const tombstones = await indexedDBManager.getTombstones(fid);
      const tombstoneSet = new Set(tombstones.map((t) => String(t.id)));

      // Entities with a queued (not yet pushed) mutation keep their local state;
      // everything else follows the cloud, which is authoritative.
      const pendingQueue = await indexedDBManager.getPendingQueue(fid);
      const pendingIds = new Set(pendingQueue.map((item) => String(item.entityId)));

      // For pending person updates we know exactly which fields were edited
      // locally: overlay only those on the cloud version. Pending creates (or
      // updates without field info) fall back to the field-level merge.
      const pendingPersonFields = new Map();
      for (const item of pendingQueue) {
        if (item.entityType !== ENTITY_TYPES.PERSON) continue;
        const id = String(item.entityId);
        const fields = item.operation === MUTATION_OP.UPDATE ? item.payload?._changedFields : null;
        const known = pendingPersonFields.get(id);
        if (!Array.isArray(fields) || known === 'all') {
          pendingPersonFields.set(id, 'all');
        } else {
          pendingPersonFields.set(id, new Set([...(known || []), ...fields]));
        }
      }

      const people = await this._reconcileStore(STORES.PEOPLE, remoteData.people, {
        tombstoneSet,
        pendingIds,
        mergeLocal: (local, remote) => {
          const fields = pendingPersonFields.get(String(local.id));
          if (!fields || fields === 'all') return mergePersonRecords(local, remote).merged;
          const merged = { ...remote };
          for (const field of fields) merged[field] = local[field];
          return merged;
        },
      });

      const personIdSet = new Set(people.map((p) => String(p.id)));
      const remoteRelationships = (remoteData.relationships || []).filter(
        (r) => validateRelationshipIntegrity(r, personIdSet, tombstoneSet).valid
      );
      const relationships = await this._reconcileStore(STORES.RELATIONSHIPS, remoteRelationships, {
        tombstoneSet,
        pendingIds,
      });
      const stories = await this._reconcileStore(STORES.STORIES, remoteData.stories, { tombstoneSet, pendingIds });
      const lifeEvents = await this._reconcileStore(STORES.LIFE_EVENTS, remoteData.lifeEvents, { tombstoneSet, pendingIds });
      const photos = await this._reconcileStore(STORES.PHOTOS, remoteData.photos, { tombstoneSet, pendingIds });
      const documents = await this._reconcileStore(STORES.DOCUMENTS, remoteData.documents, { tombstoneSet, pendingIds });

      let reconciledOrder = null;
      if (remoteData.siblingOrder) {
        const meta = (await indexedDBManager.get(STORES.SYNC_META, fid)) || { familyId: fid };
        const pendingCohortKeys = new Set(
          pendingQueue
            .filter((item) => item.entityType === ENTITY_TYPES.SIBLING_ORDER)
            .map((item) => item.entityId)
        );

        reconciledOrder = { ...remoteData.siblingOrder };
        const localOrder = meta.siblingOrder || {};
        for (const [key, order] of Object.entries(localOrder)) {
          if (pendingCohortKeys.has(key)) {
            reconciledOrder[key] = order;
          }
        }

        await indexedDBManager.put(STORES.SYNC_META, {
          ...meta,
          familyId: fid,
          siblingOrder: reconciledOrder,
          lastPullAt: new Date().toISOString(),
        });
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`family-tree-sibling-order-${fid}`, JSON.stringify(reconciledOrder));
          } catch (_e) {}
        }
      } else {
        await indexedDBManager.updateSyncMeta(fid, {
          lastPullAt: new Date().toISOString(),
        });
      }

      const result = {
        people,
        relationships,
        stories,
        lifeEvents,
        photos,
        documents,
        siblingOrder: reconciledOrder || {},
      };
      this.notifyRemoteData(result);
      return result;
    } catch (err) {
      console.warn('SyncEngine: Pull remote changes failed:', err.message);
      return null;
    }
  }

  /**
   * Replaces the family's cached records in one store with the reconciled set:
   * - remote records win, unless the entity has a pending local mutation
   *   (then the local version is kept, merged over remote when mergeLocal is given);
   * - local-only records survive only while they still have a pending mutation
   *   (created offline, not yet pushed). Otherwise they were deleted in the
   *   cloud and are removed here;
   * - tombstoned (locally deleted) records never come back.
   */
  async _reconcileStore(storeName, remoteList, { tombstoneSet, pendingIds, mergeLocal = null }) {
    const fid = this.familyId;
    const localList = await indexedDBManager.getAllByFamily(storeName, fid);
    const localMap = new Map(localList.map((item) => [String(item.id), item]));
    const reconciled = new Map();

    for (const remote of filterTombstonedEntities(remoteList || [], tombstoneSet)) {
      const id = String(remote.id);
      const local = localMap.get(id);
      if (local && pendingIds.has(id)) {
        reconciled.set(id, mergeLocal ? mergeLocal(local, remote) : { ...remote, ...local });
      } else {
        reconciled.set(id, remote);
      }
    }

    for (const [id, local] of localMap) {
      if (!reconciled.has(id) && pendingIds.has(id) && !tombstoneSet.has(id)) {
        reconciled.set(id, local);
      }
    }

    const staleIds = [...localMap.keys()].filter((id) => !reconciled.has(id));
    for (const id of staleIds) {
      await indexedDBManager.delete(storeName, id);
    }

    const records = [...reconciled.values()].map((item) => ({ ...item, family_id: fid, familyId: fid }));
    await indexedDBManager.putBatch(storeName, records);
    return records;
  }

  // ── Remote Data Observers ──────────────────────────────────

  /**
   * Subscribe to reconciled snapshots produced by each successful pull, so the
   * in-memory store can pick up collaborators' changes without a reload.
   */
  onRemoteData(listener) {
    this.remoteListeners.add(listener);
    return () => this.remoteListeners.delete(listener);
  }

  notifyRemoteData(data) {
    this.remoteListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in sync engine remote data listener:', err);
      }
    });
  }

  async sync() {
    // 1. Push any local queued mutations
    await this.flushQueue();
    // 2. Process any pending binary uploads (photos/documents queued offline)
    try {
      await mediaStorageService.processPendingUploads(this.familyId);
    } catch (uploadErr) {
      console.warn('SyncEngine: Pending binary uploads processing warning:', uploadErr.message);
    }
    // 3. Pull latest remote state and reconcile
    return this.pullRemoteChanges();
  }

  // ── Lifecycle / Cleanup ────────────────────────────────────

  destroy() {
    this.destroyed = true;
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
    this.remoteListeners.clear();
  }
}

export default SyncEngine;
