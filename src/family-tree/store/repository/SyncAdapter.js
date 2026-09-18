/**
 * SyncAdapter — Offline-First Repository Adapter (Milestone 3C)
 *
 * Implements FamilyRepository.
 * Bridges FamilyStore to SyncEngine:
 * - Instant local reads/writes via IndexedDB.
 * - Granular mutation enqueuing to durable sync queue.
 * - Observable sync status for responsive UI feedback.
 */

import { FamilyRepository } from './FamilyRepository.js';
import { SyncEngine } from '../sync/SyncEngine.js';
import { indexedDBManager, STORES } from '../local/indexedDBManager.js';
import { ENTITY_TYPES, MUTATION_OP } from '../sync/syncTypes.js';

export class SyncAdapter extends FamilyRepository {
  /**
   * @param {string} familyId
   * @param {import('./SupabaseAdapter.js').SupabaseAdapter} [supabaseAdapter]
   */
  constructor(familyIdOrEngine, supabaseAdapter = null) {
    super();
    if (familyIdOrEngine && typeof familyIdOrEngine.enqueue === 'function') {
      this.syncEngine = familyIdOrEngine;
      this.familyId = String(supabaseAdapter || familyIdOrEngine.familyId || 'default');
      this.supabaseAdapter = null;
    } else {
      this.familyId = String(familyIdOrEngine);
      this.supabaseAdapter = supabaseAdapter;
      this.syncEngine = new SyncEngine(familyIdOrEngine, supabaseAdapter);
    }
  }

  // ── Load ───────────────────────────────────────────────────

  async load() {
    const data = await this.syncEngine.hydrate();
    let siblingOrder = {};
    try {
      const meta = await indexedDBManager.get(STORES.SYNC_META, this.familyId);
      if (meta && meta.siblingOrder) {
        siblingOrder = meta.siblingOrder;
      } else if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem(`family-tree-sibling-order-${this.familyId}`);
        if (local) siblingOrder = JSON.parse(local);
      }
    } catch (_e) {}

    if (data) {
      data.siblingOrder = siblingOrder;
    }
    return data;
  }

  // ── Batch Persist ──────────────────────────────────────────

  async persist(snapshot) {
    // Write full snapshot to IndexedDB local cache for complete durability
    if (!snapshot) return;
    const fid = this.familyId;

    // Clear stale family records in IndexedDB to prevent deleted or replaced records from lingering
    await indexedDBManager.clearFamilyData(fid);

    const peopleWithFid = (snapshot.people || []).map((p) => ({ ...p, family_id: fid, familyId: fid }));
    const relsWithFid = (snapshot.relationships || []).map((r) => ({ ...r, family_id: fid, familyId: fid }));
    const storiesWithFid = (snapshot.stories || []).map((s) => ({ ...s, family_id: fid, familyId: fid }));
    const eventsWithFid = (snapshot.lifeEvents || []).map((e) => ({ ...e, family_id: fid, familyId: fid }));
    const photosWithFid = (snapshot.photos || []).map((ph) => ({ ...ph, family_id: fid, familyId: fid }));
    const docsWithFid = (snapshot.documents || []).map((d) => ({ ...d, family_id: fid, familyId: fid }));

    const tasks = [
      indexedDBManager.putBatch(STORES.PEOPLE, peopleWithFid),
      indexedDBManager.putBatch(STORES.RELATIONSHIPS, relsWithFid),
      indexedDBManager.putBatch(STORES.STORIES, storiesWithFid),
      indexedDBManager.putBatch(STORES.LIFE_EVENTS, eventsWithFid),
      indexedDBManager.putBatch(STORES.PHOTOS, photosWithFid),
      indexedDBManager.putBatch(STORES.DOCUMENTS, docsWithFid),
    ];

    if (snapshot.siblingOrder) {
      tasks.push(indexedDBManager.put(STORES.SYNC_META, { familyId: fid, siblingOrder: snapshot.siblingOrder }));
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`family-tree-sibling-order-${fid}`, JSON.stringify(snapshot.siblingOrder));
        }
      } catch (_e) {}
    }

    await Promise.all(tasks);
  }

  async clearLocalCache() {
    await indexedDBManager.clearAllFamilyData(this.familyId);
  }

  // ── Granular Entity Mutations (Offline-First Queueing) ─────

  async savePerson(person, { operation = MUTATION_OP.UPDATE } = {}) {
    return this.syncEngine.enqueue(ENTITY_TYPES.PERSON, person.id, operation, person);
  }

  async deletePerson(personId) {
    return this.syncEngine.enqueue(ENTITY_TYPES.PERSON, personId, MUTATION_OP.DELETE);
  }

  async saveRelationship(rel, { operation = MUTATION_OP.CREATE } = {}) {
    return this.syncEngine.enqueue(ENTITY_TYPES.RELATIONSHIP, rel.id, operation, rel);
  }

  async deleteRelationship(relId) {
    return this.syncEngine.enqueue(ENTITY_TYPES.RELATIONSHIP, relId, MUTATION_OP.DELETE);
  }

  async saveStory(story, { operation = MUTATION_OP.CREATE } = {}) {
    return this.syncEngine.enqueue(ENTITY_TYPES.STORY, story.id, operation, story);
  }

  async deleteStory(storyId) {
    return this.syncEngine.enqueue(ENTITY_TYPES.STORY, storyId, MUTATION_OP.DELETE);
  }

  async saveLifeEvent(event, { operation = MUTATION_OP.CREATE } = {}) {
    return this.syncEngine.enqueue(ENTITY_TYPES.LIFE_EVENT, event.id, operation, event);
  }

  async deleteLifeEvent(eventId) {
    return this.syncEngine.enqueue(ENTITY_TYPES.LIFE_EVENT, eventId, MUTATION_OP.DELETE);
  }

  async savePhoto(photo, { operation = MUTATION_OP.CREATE } = {}) {
    return this.syncEngine.enqueue(ENTITY_TYPES.PHOTO, photo.id, operation, photo);
  }

  async deletePhoto(photoId) {
    return this.syncEngine.enqueue(ENTITY_TYPES.PHOTO, photoId, MUTATION_OP.DELETE);
  }

  async saveDocument(doc, { operation = MUTATION_OP.CREATE } = {}) {
    return this.syncEngine.enqueue(ENTITY_TYPES.DOCUMENT, doc.id, operation, doc);
  }

  async deleteDocument(docId) {
    return this.syncEngine.enqueue(ENTITY_TYPES.DOCUMENT, docId, MUTATION_OP.DELETE);
  }

  // ── Sibling Cohort Ordering ────────────────────────────────

  async getSiblingOrders(familyId = this.familyId) {
    const fid = String(familyId || this.familyId);
    try {
      const meta = await indexedDBManager.get(STORES.SYNC_META, fid);
      if (meta && meta.siblingOrder) return { ...meta.siblingOrder };
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem(`family-tree-sibling-order-${fid}`);
        if (local) return JSON.parse(local);
      }
    } catch (_e) {}
    return {};
  }

  async saveSiblingOrder(familyId, cohortKey, orderedPersonIds) {
    const fid = String(familyId || this.familyId);
    const key = String(cohortKey || '').trim();
    if (!key) return;
    const personIds = Array.isArray(orderedPersonIds) ? orderedPersonIds.map(String) : [];

    // 1. Immediately update local storage and IndexedDB
    try {
      const meta = (await indexedDBManager.get(STORES.SYNC_META, fid)) || { familyId: fid, siblingOrder: {} };
      const current = { ...(meta.siblingOrder || {}) };
      current[key] = personIds;
      await indexedDBManager.put(STORES.SYNC_META, { ...meta, familyId: fid, siblingOrder: current });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`family-tree-sibling-order-${fid}`, JSON.stringify(current));
      }
    } catch (_e) {}

    // 2. Queue mutation to syncEngine
    return this.syncEngine.enqueue(ENTITY_TYPES.SIBLING_ORDER, key, MUTATION_OP.UPDATE, {
      cohortKey: key,
      orderedPersonIds: personIds,
    });
  }

  async deleteSiblingOrder(familyId, cohortKey) {
    const fid = String(familyId || this.familyId);
    const key = String(cohortKey || '').trim();
    if (!key) return;

    try {
      const meta = (await indexedDBManager.get(STORES.SYNC_META, fid)) || { familyId: fid, siblingOrder: {} };
      const current = { ...(meta.siblingOrder || {}) };
      delete current[key];
      await indexedDBManager.put(STORES.SYNC_META, { ...meta, familyId: fid, siblingOrder: current });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`family-tree-sibling-order-${fid}`, JSON.stringify(current));
      }
    } catch (_e) {}

    return this.syncEngine.enqueue(ENTITY_TYPES.SIBLING_ORDER, key, MUTATION_OP.DELETE);
  }

  // ── Sync Engine Access ─────────────────────────────────────

  getSyncStatus() {
    return this.syncEngine.getStatus();
  }

  subscribeSyncStatus(listener) {
    return this.syncEngine.subscribe(listener);
  }

  destroy() {
    this.syncEngine.destroy();
  }
}

export default SyncAdapter;
