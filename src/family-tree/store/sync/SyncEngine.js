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
  mergeEntityRecords,
  validateRelationshipIntegrity,
  filterTombstonedEntities,
} from './conflictResolver.js';
import { mediaStorageService } from '../../media/mediaStorageService.js';

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

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

    this.status = typeof navigator !== 'undefined' && !navigator.onLine ? SYNC_STATUS.OFFLINE : SYNC_STATUS.SYNCED;
    this.listeners = new Set();
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
    this.setStatus(SYNC_STATUS.SYNCING);
    // Automatic reconnect recovery: trigger queue flush and pull updates
    this.sync();
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
        });

        this.setStatus(SYNC_STATUS.SYNCED);
        return remoteData;
      } catch (err) {
        console.warn('SyncEngine: Initial cloud load failed:', err.message);
        this.setStatus(this.isOnline() ? SYNC_STATUS.ERROR : SYNC_STATUS.OFFLINE);
      }
    }

    return null;
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

      for (const item of pendingItems) {
        if (this.destroyed || !this.isOnline()) break;

        // Bounded retry check
        if (item.attemptCount >= MAX_RETRIES) {
          await indexedDBManager.updateQueueItem(item.id, {
            status: 'failed',
            error: `Max retries (${MAX_RETRIES}) reached.`,
          });
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

          if (!isPermanent) {
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

  async _executeRemoteOperation(item) {
    const { entityType, entityId, operation, payload } = item;
    const adapter = this.supabaseAdapter;
    if (!adapter) throw new Error('SupabaseAdapter unavailable');

    switch (entityType) {
      case ENTITY_TYPES.PERSON:
        if (operation === MUTATION_OP.DELETE) {
          await adapter.deletePerson(entityId);
        } else {
          await adapter.savePerson({ ...payload, _isNew: operation === MUTATION_OP.CREATE });
        }
        break;

      case ENTITY_TYPES.RELATIONSHIP:
        if (operation === MUTATION_OP.DELETE) {
          await adapter.deleteRelationship(entityId);
        } else {
          await adapter.saveRelationship(payload);
        }
        break;

      case ENTITY_TYPES.STORY:
        if (operation === MUTATION_OP.DELETE) {
          await adapter.deleteStory(entityId);
        } else {
          await adapter.saveStory({ ...payload, _isNew: operation === MUTATION_OP.CREATE });
        }
        break;

      case ENTITY_TYPES.LIFE_EVENT:
        if (operation === MUTATION_OP.DELETE) {
          await adapter.deleteLifeEvent(entityId);
        } else {
          await adapter.saveLifeEvent({ ...payload, _isNew: operation === MUTATION_OP.CREATE });
        }
        break;

      case ENTITY_TYPES.PHOTO:
        if (operation === MUTATION_OP.DELETE) {
          await adapter.deletePhoto(entityId);
        } else {
          await adapter.savePhoto({ ...payload, _isNew: operation === MUTATION_OP.CREATE });
        }
        break;

      case ENTITY_TYPES.DOCUMENT:
        if (operation === MUTATION_OP.DELETE) {
          await adapter.deleteDocument(entityId);
        } else {
          await adapter.saveDocument({ ...payload, _isNew: operation === MUTATION_OP.CREATE });
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
      const tombstones = await indexedDBManager.getTombstones(fid);
      const tombstoneSet = new Set(tombstones.map((t) => t.id));

      // Filter out deleted items so cloud doesn't resurrect local tombstones
      const cleanRemotePeople = filterTombstonedEntities(remoteData.people || [], tombstoneSet);
      const cleanRemoteStories = filterTombstonedEntities(remoteData.stories || [], tombstoneSet);
      const cleanRemoteEvents = filterTombstonedEntities(remoteData.lifeEvents || [], tombstoneSet);
      const cleanRemotePhotos = filterTombstonedEntities(remoteData.photos || [], tombstoneSet);
      const cleanRemoteDocs = filterTombstonedEntities(remoteData.documents || [], tombstoneSet);

      // Reconcile people with 3-way field-level merge
      const localPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, fid);
      const localPeopleMap = new Map(localPeople.map((p) => [p.id, p]));
      const mergedPeople = [];

      for (const remotePerson of cleanRemotePeople) {
        const local = localPeopleMap.get(remotePerson.id);
        if (!local) {
          mergedPeople.push(remotePerson);
        } else {
          const { merged } = mergePersonRecords(local, remotePerson);
          mergedPeople.push(merged);
        }
      }

      // Preserve local-only people that have not yet been synced
      for (const [id, localPerson] of localPeopleMap.entries()) {
        if (!cleanRemotePeople.some((p) => p.id === id) && !tombstoneSet.has(id)) {
          mergedPeople.push(localPerson);
        }
      }

      // Validate relationship integrity against merged people
      const personIdSet = new Set(mergedPeople.map((p) => p.id));
      const cleanRelationships = (remoteData.relationships || []).filter((r) => {
        const { valid } = validateRelationshipIntegrity(r, personIdSet, tombstoneSet);
        return valid;
      });

      // Update local IndexedDB with merged state
      await Promise.all([
        indexedDBManager.putBatch(STORES.PEOPLE, mergedPeople),
        indexedDBManager.putBatch(STORES.RELATIONSHIPS, cleanRelationships),
        indexedDBManager.putBatch(STORES.STORIES, cleanRemoteStories),
        indexedDBManager.putBatch(STORES.LIFE_EVENTS, cleanRemoteEvents),
        indexedDBManager.putBatch(STORES.PHOTOS, cleanRemotePhotos),
        indexedDBManager.putBatch(STORES.DOCUMENTS, cleanRemoteDocs),
      ]);

      await indexedDBManager.updateSyncMeta(fid, {
        lastPullAt: new Date().toISOString(),
      });

      return {
        people: mergedPeople,
        relationships: cleanRelationships,
        stories: cleanRemoteStories,
        lifeEvents: cleanRemoteEvents,
        photos: cleanRemotePhotos,
        documents: cleanRemoteDocs,
      };
    } catch (err) {
      console.warn('SyncEngine: Pull remote changes failed:', err.message);
      return null;
    }
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
  }
}

export default SyncEngine;
