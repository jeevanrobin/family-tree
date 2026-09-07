/**
 * IndexedDB Local Storage Manager — Medida's Family (Milestone 3C)
 *
 * Dedicated local storage layer for high-performance offline-first caching,
 * durable sync queueing, and conflict tombstone tracking.
 * Includes graceful in-memory fallback for environments without IndexedDB.
 */

const DB_NAME = 'MedidaFamilyDB';
const DB_VERSION = 2;

export const STORES = Object.freeze({
  PEOPLE: 'people',
  RELATIONSHIPS: 'relationships',
  STORIES: 'stories',
  LIFE_EVENTS: 'lifeEvents',
  PHOTOS: 'photos',
  DOCUMENTS: 'documents',
  SYNC_QUEUE: 'syncQueue',
  SYNC_META: 'syncMeta',
  TOMBSTONES: 'tombstones',
  PENDING_UPLOADS: 'pendingUploads',
});

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.initPromise = null;
    this.useFallback = false;
    // In-memory fallback map for Node/test or private-browsing restrictions
    this.memoryStores = new Map();
    Object.values(STORES).forEach((s) => this.memoryStores.set(s, new Map()));
  }

  /**
   * Initializes or returns the opened IndexedDB database instance
   */
  async getDB() {
    if (this.db) return this.db;
    if (this.useFallback) return null;

    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        this.useFallback = true;
        resolve(null);
        return;
      }

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Entity stores: keyed by id, indexed by family_id
          const entityStores = [
            STORES.PEOPLE,
            STORES.RELATIONSHIPS,
            STORES.STORIES,
            STORES.LIFE_EVENTS,
            STORES.PHOTOS,
            STORES.DOCUMENTS,
          ];

          entityStores.forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              store.createIndex('family_id', 'family_id', { unique: false });
            }
          });

          // Sync Queue: keyed by id
          if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
            const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
            queueStore.createIndex('familyId', 'familyId', { unique: false });
            queueStore.createIndex('status', 'status', { unique: false });
            queueStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          // Sync Metadata: keyed by familyId
          if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
            db.createObjectStore(STORES.SYNC_META, { keyPath: 'familyId' });
          }

          // Tombstones: keyed by id
          if (!db.objectStoreNames.contains(STORES.TOMBSTONES)) {
            const tombStore = db.createObjectStore(STORES.TOMBSTONES, { keyPath: 'id' });
            tombStore.createIndex('familyId', 'familyId', { unique: false });
          }

          // Pending Uploads (Offline Media Queue): keyed by id
          if (!db.objectStoreNames.contains(STORES.PENDING_UPLOADS)) {
            const uploadStore = db.createObjectStore(STORES.PENDING_UPLOADS, { keyPath: 'id' });
            uploadStore.createIndex('familyId', 'familyId', { unique: false });
            uploadStore.createIndex('status', 'status', { unique: false });
            uploadStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.warn('IndexedDB failed to open, falling back to in-memory store:', event.target.error);
          this.useFallback = true;
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB exception, falling back to in-memory store:', err);
        this.useFallback = true;
        resolve(null);
      }
    });

    return this.initPromise;
  }

  // ── Generic Store Operations ───────────────────────────────

  async put(storeName, item) {
    if (!item) return;
    const db = await this.getDB();
    if (!db) {
      const key = item.id || item.familyId;
      this.memoryStores.get(storeName)?.set(String(key), { ...item });
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async putBatch(storeName, items = []) {
    if (!items || items.length === 0) return;
    const db = await this.getDB();
    if (!db) {
      const memStore = this.memoryStores.get(storeName);
      items.forEach((item) => {
        const key = item.id || item.familyId;
        memStore?.set(String(key), { ...item });
      });
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async get(storeName, key) {
    if (!key) return null;
    const db = await this.getDB();
    if (!db) {
      return this.memoryStores.get(storeName)?.get(String(key)) || null;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(String(key));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getAll(storeName) {
    const db = await this.getDB();
    if (!db) {
      return Array.from(this.memoryStores.get(storeName)?.values() || []);
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getAllByFamily(storeName, familyId) {
    if (!familyId) return [];
    const db = await this.getDB();
    if (!db) {
      const all = Array.from(this.memoryStores.get(storeName)?.values() || []);
      return all.filter((item) => (item.family_id || item.familyId) === String(familyId));
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        // Look for family_id or familyId index
        let req;
        if (store.indexNames.contains('family_id')) {
          const index = store.index('family_id');
          req = index.getAll(String(familyId));
        } else if (store.indexNames.contains('familyId')) {
          const index = store.index('familyId');
          req = index.getAll(String(familyId));
        } else {
          req = store.getAll();
        }

        req.onsuccess = () => {
          const results = req.result || [];
          resolve(results.filter((item) => (item.family_id || item.familyId) === String(familyId)));
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async delete(storeName, key) {
    if (!key) return;
    const db = await this.getDB();
    if (!db) {
      this.memoryStores.get(storeName)?.delete(String(key));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(String(key));
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async clearFamilyData(familyId) {
    if (!familyId) return;
    const stores = [
      STORES.PEOPLE,
      STORES.RELATIONSHIPS,
      STORES.STORIES,
      STORES.LIFE_EVENTS,
      STORES.PHOTOS,
      STORES.DOCUMENTS,
    ];

    for (const storeName of stores) {
      const items = await this.getAllByFamily(storeName, familyId);
      for (const item of items) {
        await this.delete(storeName, item.id);
      }
    }
  }

  // ── Sync Queue Helpers ──────────────────────────────────────

  async enqueue(item) {
    return this.put(STORES.SYNC_QUEUE, item);
  }

  async getPendingQueue(familyId) {
    const all = await this.getAllByFamily(STORES.SYNC_QUEUE, familyId);
    return all
      .filter((q) => q.status === 'pending' || q.status === 'failed')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async updateQueueItem(id, updates) {
    const existing = await this.get(STORES.SYNC_QUEUE, id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    await this.put(STORES.SYNC_QUEUE, merged);
    return merged;
  }

  async dequeue(id) {
    return this.delete(STORES.SYNC_QUEUE, id);
  }

  // ── Sync Metadata Helpers ───────────────────────────────────

  async getSyncMeta(familyId) {
    return (await this.get(STORES.SYNC_META, familyId)) || {
      familyId: String(familyId),
      lastSyncedAt: null,
      lastPullAt: null,
      schemaVersion: DB_VERSION,
    };
  }

  async updateSyncMeta(familyId, updates) {
    const current = await this.getSyncMeta(familyId);
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.put(STORES.SYNC_META, updated);
    return updated;
  }

  // ── Tombstones (Safe Deletion Propagation) ──────────────────

  async addTombstone({ id, familyId, entityType }) {
    const record = {
      id: String(id),
      familyId: String(familyId),
      entityType,
      deletedAt: new Date().toISOString(),
    };
    return this.put(STORES.TOMBSTONES, record);
  }

  async isTombstoned(id) {
    const found = await this.get(STORES.TOMBSTONES, id);
    return Boolean(found);
  }

  async getTombstones(familyId) {
    return this.getAllByFamily(STORES.TOMBSTONES, familyId);
  }

  // ── Pending Uploads (Offline Media Queue) ───────────────────

  async enqueueUpload(item) {
    return this.put(STORES.PENDING_UPLOADS, item);
  }

  async getPendingUploads(familyId) {
    const all = await this.getAllByFamily(STORES.PENDING_UPLOADS, familyId);
    return all
      .filter((u) => u.status === 'pending' || u.status === 'failed')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async updateUpload(id, updates) {
    const existing = await this.get(STORES.PENDING_UPLOADS, id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    await this.put(STORES.PENDING_UPLOADS, merged);
    return merged;
  }

  async dequeueUpload(id) {
    return this.delete(STORES.PENDING_UPLOADS, id);
  }
}

export const indexedDBManager = new IndexedDBManager();
export default indexedDBManager;
