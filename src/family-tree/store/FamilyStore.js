/**
 * FamilyStore — Centralized Single Source of Truth
 * 
 * Milestone 2B: Expanded profile archive supporting People, Relationships,
 * Stories/Memories, Life Events, Photos Gallery, and Archival Documents.
 * Versioned storage with migration support.
 */

import {
  samplePersons,
  sampleRelationships,
  sampleMemories,
  sampleAlbumPhotos,
  sampleArchivalArtifacts,
} from '../data/sampleData.js';
import { LocalAdapter } from './repository/LocalAdapter.js';
import {
  searchArchive,
  buildSearchIndex,
  verifyEntityExists,
} from '../search/familySearchEngine.js';

export const SCHEMA_VERSION = '2.0.0';

/**
 * Initial sample seed generator for M2B entities
 */
function createInitialSampleEntities(peopleArray) {
  // Sample Stories/Memories
  const stories = sampleMemories.map((m, idx) => ({
    id: `story-${m.id || idx + 1}`,
    personId: m.id === 'mem-1' ? 'g-padma' : m.id === 'mem-2' ? 'g-venkat' : 'gg-saraswathi',
    title: m.title,
    content: m.story,
    date: m.year ? `${m.year}-01-01` : null,
    location: m.location || '',
    narrator: m.narrator || '',
    relatedPersonIds: m.id === 'mem-1' ? ['gg-ramaiah', 'gg-saraswathi', 'g-venkat'] : m.id === 'mem-2' ? ['p-suresh', 'p-rajesh'] : ['gg-ramaiah', 'g-venkat'],
    eventId: m.id === 'mem-2' ? 'event-2' : m.id === 'mem-1' ? 'event-4' : null,
    photoId: m.id === 'mem-2' ? 'photo-primary-g-venkat' : m.id === 'mem-1' ? 'photo-primary-g-padma' : 'photo-primary-gg-saraswathi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Sample Life Events
  const lifeEvents = [
    {
      id: 'event-1',
      personId: 'g-venkat',
      type: 'Birth',
      title: 'Born in Warangal Homestead',
      date: '1948-05-20',
      location: 'Warangal, Telangana',
      description: 'First son born to Ramaiah and Saraswathi Medida.',
      relatedPersonIds: ['gg-ramaiah', 'gg-saraswathi'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-2',
      personId: 'g-venkat',
      type: 'Education',
      title: 'Graduated from Osmania University',
      date: '1970-06-15',
      location: 'Hyderabad, Telangana',
      description: 'Awarded First Class Honors in Civil & Hydraulic Engineering.',
      relatedPersonIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-3',
      personId: 'g-venkat',
      type: 'Marriage',
      title: 'Marriage to Padma Reddy',
      date: '1972-04-10',
      location: 'Hyderabad, Telangana',
      description: 'Grand family wedding celebration uniting the Medida and Reddy families.',
      relatedPersonIds: ['g-padma'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-4',
      personId: 'g-venkat',
      type: 'Career',
      title: 'Chief Engineer on Nagarjuna Sagar Dam',
      date: '1975-09-01',
      location: 'Nalgonda, Telangana',
      description: 'Led technical design team for primary canal diversion systems.',
      relatedPersonIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-5',
      personId: 'p-rajesh',
      type: 'Birth',
      title: 'Born in Hyderabad',
      date: '1975-03-12',
      location: 'Hyderabad, Telangana',
      description: 'Born to Venkat Ramaiah Medida and Padma Medida.',
      relatedPersonIds: ['g-venkat', 'g-padma'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-6',
      personId: 'p-rajesh',
      type: 'Marriage',
      title: 'Marriage to Meena Kumar',
      date: '2000-02-14',
      location: 'Hyderabad, Telangana',
      description: 'Celebration attended by extended family across three generations.',
      relatedPersonIds: ['p-meena'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-7',
      personId: 'p-rajesh',
      type: 'Relocation',
      title: 'Established Architectural Workshop',
      date: '2010-08-20',
      location: 'Bangalore & Hyderabad',
      description: 'Expanded sustainable cloud architecture practice.',
      relatedPersonIds: ['p-meena'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-8',
      personId: 'c-priya',
      type: 'Education',
      title: 'Entered Stanford University PhD Program',
      date: '2022-09-01',
      location: 'Stanford, California',
      description: 'Doctoral research in computational genomics and foundation AI biology.',
      relatedPersonIds: ['p-suresh', 'p-kavitha'],
      createdAt: new Date().toISOString(),
    },
  ];

  // Sample Photos Gallery
  const photos = [];
  // 1. Profile photos for all people
  peopleArray.forEach((p, idx) => {
    if (p.photo || p.photoUrl) {
      photos.push({
        id: `photo-primary-${p.id}`,
        personId: p.id,
        src: p.photo || p.photoUrl,
        title: `${p.displayName} — Portrait`,
        caption: `Official archival portrait of ${p.displayName}.`,
        date: p.dateOfBirth ? `${p.dateOfBirth.split('-')[0]}` : 'Heritage Archive',
        location: p.currentLocation || p.placeOfBirth || 'Telangana, India',
        isPrimary: true,
        relatedPersonIds: [p.id],
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 2. Extra album photos distributed to members
  sampleAlbumPhotos.forEach((ap, idx) => {
    const targetPersonId = idx % 2 === 0 ? 'p-rajesh' : idx % 3 === 0 ? 'g-venkat' : 'c-priya';
    photos.push({
      id: `photo-extra-${ap.id || idx + 1}`,
      personId: targetPersonId,
      src: ap.imageUrl,
      title: ap.title,
      caption: ap.caption,
      date: ap.year || '',
      location: ap.location || '',
      isPrimary: false,
      relatedPersonIds: [targetPersonId],
      createdAt: new Date().toISOString(),
    });
  });

  // Sample Archival Documents
  const documents = sampleArchivalArtifacts.map((art, idx) => ({
    id: `doc-${art.id || idx + 1}`,
    personId: art.personId || 'g-venkat',
    name: art.title,
    type: art.category || 'Official Document',
    docType: art.docType || 'Certificate',
    date: art.date || '',
    description: art.description || '',
    src: '', // Metadata record
    createdAt: new Date().toISOString(),
  }));

  return { stories, lifeEvents, photos, documents };
}

export class FamilyStore {
  constructor(repository = null) {
    this.people = new Map();
    this.relationships = [];
    this.stories = [];
    this.lifeEvents = [];
    this.photos = [];
    this.documents = [];
    this.listeners = new Set();
    this.repository = repository || new LocalAdapter();
    this._searchIndex = null;
    this.init();
  }

  /**
   * Initializes the store via the repository adapter.
   * Uses synchronous path (loadSync) when available to preserve
   * the existing data-available-on-first-frame behavior.
   * Falls back to async load() for cloud adapters.
   */
  init() {
    this._loadToken = (this._loadToken || 0) + 1;
    const currentToken = this._loadToken;

    if (typeof this.repository.loadSync === 'function') {
      try {
        const data = this.repository.loadSync();
        this._processLoadedData(data, currentToken);
        this.persist();
        return;
      } catch (err) {
        console.warn('FamilyStore: Sync load failed:', err);
      }
    }

    if (this.repository && typeof this.repository.onRemoteUpdate === 'function') {
      this.repository.onRemoteUpdate((remoteData) => {
        if (currentToken !== this._loadToken) return;
        if (remoteData) {
          this._processLoadedData(remoteData, currentToken);
          this.notify();
        }
      });
    }

    this.repository.load().then((data) => {
      if (currentToken !== this._loadToken) return;
      this._processLoadedData(data, currentToken);
      this.persist();
      this.notify();
    }).catch((err) => {
      if (currentToken !== this._loadToken) return;
      console.warn('FamilyStore: Async load failed:', err);
      // For cloud/sync repositories, NEVER silently inject sample data
      if (this.repository instanceof LocalAdapter) {
        this._loadSampleData();
      } else {
        this.loadFromData([], [], [], [], [], []);
      }
      this.persist();
      this.notify();
    });
  }

  _processLoadedData(data, token) {
    if (token && token !== this._loadToken) return;
    if (data) {
      if (data._isV1Migration) {
        const sampleEntities = createInitialSampleEntities(data.people);
        this.loadFromData(
          data.people, data.relationships,
          sampleEntities.stories, sampleEntities.lifeEvents,
          sampleEntities.photos, sampleEntities.documents
        );
      } else {
        this.loadFromData(
          data.people, data.relationships,
          data.stories, data.lifeEvents,
          data.photos, data.documents
        );
      }
    } else {
      // Cloud adapters and sync adapters must start completely clean (0 members).
      // Only LocalAdapter with no data falls back to sample data.
      if (this.repository instanceof LocalAdapter) {
        this._loadSampleData();
      } else {
        this.loadFromData([], [], [], [], [], []);
      }
    }
  }

  _loadSampleData() {
    const sampleEntities = createInitialSampleEntities(samplePersons);
    this.loadFromData(
      samplePersons, sampleRelationships,
      sampleEntities.stories, sampleEntities.lifeEvents,
      sampleEntities.photos, sampleEntities.documents
    );
  }

  /**
   * Loads entities into memory
   */
  loadFromData(peopleArray = [], relationshipsArray = [], storiesArray = [], eventsArray = [], photosArray = [], docsArray = []) {
    this._searchIndex = null;
    this.people.clear();
    peopleArray.forEach((p) => {
      const normalized = this.normalizePerson(p);
      this.people.set(normalized.id, normalized);
    });

    this.relationships = relationshipsArray.map((r) => this.normalizeRelationship(r));
    this.stories = storiesArray.map((s) => this.normalizeStory(s));
    this.lifeEvents = eventsArray.map((e) => this.normalizeLifeEvent(e));
    this.photos = photosArray.map((ph) => this.normalizePhoto(ph));
    this.documents = docsArray.map((d) => this.normalizeDocument(d));
  }

  // ── Normalizers ────────────────────────────────────────────

  normalizePerson(p) {
    const firstName = p.firstName || '';
    const middleName = p.middleName || '';
    const lastName = p.lastName || '';
    const displayName = p.displayName || [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Unnamed';

    return {
      id: String(p.id || `person-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`),
      firstName,
      middleName,
      lastName,
      displayName,
      gender: p.gender || 'unspecified',
      livingStatus: p.livingStatus || (p.dateOfDeath ? 'deceased' : 'alive'),
      dateOfBirth: p.dateOfBirth || null,
      dateOfDeath: p.dateOfDeath || null,
      placeOfBirth: p.placeOfBirth || '',
      hometown: p.hometown || '',
      currentLocation: p.currentLocation || '',
      occupation: p.occupation || '',
      photo: p.photo || p.photoUrl || '',
      photoUrl: p.photoUrl || p.photo || '',
      biography: p.biography || '',
      notes: p.notes || '',
      privacy: p.privacy || 'family',
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    };
  }

  normalizeRelationship(r) {
    const id = r.id || `rel-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    if (r.type === 'parent-child' || r.type === 'parent') {
      const parentId = String(r.parentId || r.personId1);
      const childId = String(r.childId || r.personId2);
      return {
        id,
        type: 'parent-child',
        parentId,
        childId,
        personId1: parentId,
        personId2: childId,
      };
    }

    if (r.type === 'spouse') {
      const personAId = String(r.personAId || r.personId1);
      const personBId = String(r.personBId || r.personId2);
      return {
        id,
        type: 'spouse',
        personAId,
        personBId,
        personId1: personAId,
        personId2: personBId,
        startDate: r.startDate || null,
      };
    }

    if (
      r.type === 'sibling' ||
      r.type === 'sister' ||
      r.type === 'brother' ||
      r.type === 'siblings'
    ) {
      const personAId = String(r.personAId || r.personId1);
      const personBId = String(r.personBId || r.personId2);
      return {
        id,
        type: 'sibling',
        personAId,
        personBId,
        personId1: personAId,
        personId2: personBId,
      };
    }

    return r;
  }

  normalizeStory(s) {
    return {
      id: String(s.id || `story-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`),
      personId: String(s.personId || ''),
      title: s.title || 'Untitled Memory',
      content: s.content || s.story || '',
      date: s.date || s.year || null,
      location: s.location || '',
      narrator: s.narrator || '',
      relatedPersonIds: Array.isArray(s.relatedPersonIds) ? s.relatedPersonIds.map(String) : [],
      eventId: s.eventId ? String(s.eventId) : (s.lifeEventId ? String(s.lifeEventId) : null),
      photoId: s.photoId ? String(s.photoId) : null,
      documentId: s.documentId ? String(s.documentId) : null,
      tags: Array.isArray(s.tags) ? s.tags : [],
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt || new Date().toISOString(),
    };
  }

  normalizeLifeEvent(e) {
    return {
      id: String(e.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`),
      personId: String(e.personId || ''),
      type: e.type || 'Other',
      title: e.title || 'Life Event',
      date: e.date || null,
      location: e.location || '',
      description: e.description || '',
      relatedPersonIds: Array.isArray(e.relatedPersonIds) ? e.relatedPersonIds.map(String) : [],
      createdAt: e.createdAt || new Date().toISOString(),
      updatedAt: e.updatedAt || new Date().toISOString(),
    };
  }

  normalizePhoto(ph) {
    return {
      id: String(ph.id || `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`),
      personId: String(ph.personId || ''),
      src: ph.src || ph.imageUrl || '',
      storagePath: ph.storagePath || ph.storage_path || '',
      storage_path: ph.storagePath || ph.storage_path || '',
      title: ph.title || 'Family Photograph',
      caption: ph.caption || '',
      date: ph.date || ph.year || '',
      location: ph.location || '',
      isPrimary: Boolean(ph.isPrimary),
      relatedPersonIds: Array.isArray(ph.relatedPersonIds) ? ph.relatedPersonIds.map(String) : [],
      createdAt: ph.createdAt || new Date().toISOString(),
    };
  }

  normalizeDocument(d) {
    return {
      id: String(d.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`),
      personId: String(d.personId || ''),
      name: d.name || d.title || 'Archival Document',
      type: d.type || d.category || 'Official Record',
      docType: d.docType || 'Document',
      src: d.src || '',
      date: d.date || '',
      description: d.description || '',
      createdAt: d.createdAt || new Date().toISOString(),
    };
  }

  // ── Persistence & Reactivity ───────────────────────────────

  persist() {
    const snapshot = {
      people: Array.from(this.people.values()),
      relationships: this.relationships,
      stories: this.stories,
      lifeEvents: this.lifeEvents,
      photos: this.photos,
      documents: this.documents,
    };
    this.repository.persist(snapshot).catch((err) => {
      console.error('FamilyStore: Persistence failed:', err);
    });
  }

  notify() {
    this._searchIndex = null;
    this.persist();
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('FamilyStore: Error in listener:', err);
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return {
      people: Array.from(this.people.values()),
      relationships: [...this.relationships],
      stories: [...this.stories],
      lifeEvents: [...this.lifeEvents],
      photos: [...this.photos],
      documents: [...this.documents],
    };
  }

  // ── Entity Collections Getters ─────────────────────────────

  getAllStories() {
    return [...this.stories];
  }

  getAllLifeEvents() {
    return [...this.lifeEvents];
  }

  getLifeEventById(id) {
    if (!id) return null;
    return this.lifeEvents.find((e) => e.id === String(id)) || null;
  }

  getAllPhotos() {
    return [...this.photos];
  }

  getAllDocuments() {
    return [...this.documents];
  }

  // ── Global Search & Discovery (M4A) ─────────────────────────

  getSearchIndex() {
    if (!this._searchIndex) {
      this._searchIndex = buildSearchIndex(this.getSnapshot());
    }
    return this._searchIndex;
  }

  searchArchive(query, options = {}) {
    const index = this.getSearchIndex();
    return searchArchive(query, options, index);
  }

  verifyEntityExists(type, id) {
    return verifyEntityExists(this, type, id);
  }

  // ── Person Operations ──────────────────────────────────────

  getAllPersons() {
    return Array.from(this.people.values());
  }

  getPeopleCount() {
    return this.people.size;
  }

  getAllRelationships() {
    return [...this.relationships];
  }

  getPersonById(id) {
    if (!id) return null;
    return this.people.get(String(id)) || null;
  }

  searchPersons(query) {
    if (!query || !query.trim()) return [];
    // Enhanced with deterministic relevance ranking while preserving return signature
    const searchRes = this.searchArchive(query, { filter: 'people' });
    const seen = new Set();
    const result = [];
    searchRes.results.forEach((r) => {
      if (r.type === 'person') {
        const p = this.getPersonById(r.id);
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
      }
    });
    return result;
  }

  calculateGenerations() {
    const genMap = new Map();
    const people = Array.from(this.people.values());
    if (people.length === 0) return genMap;

    const childToParents = new Map();
    const parentToChildren = new Map();
    const spouseGraph = new Map();
    const siblingGraph = new Map();

    this.relationships.forEach((r) => {
      if (r.type === 'parent-child' || r.type === 'parent') {
        const parentId = r.parentId || r.personId1;
        const childId = r.childId || r.personId2;
        if (!childToParents.has(childId)) childToParents.set(childId, []);
        childToParents.get(childId).push(parentId);

        if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
        parentToChildren.get(parentId).push(childId);
      } else if (r.type === 'spouse') {
        const a = r.personAId || r.personId1;
        const b = r.personBId || r.personId2;
        if (!spouseGraph.has(a)) spouseGraph.set(a, []);
        if (!spouseGraph.has(b)) spouseGraph.set(b, []);
        spouseGraph.get(a).push(b);
        spouseGraph.get(b).push(a);
      } else if (r.type === 'sibling') {
        const a = r.personAId || r.personId1;
        const b = r.personBId || r.personId2;
        if (!siblingGraph.has(a)) siblingGraph.set(a, []);
        if (!siblingGraph.has(b)) siblingGraph.set(b, []);
        siblingGraph.get(a).push(b);
        siblingGraph.get(b).push(a);
      }
    });

    const roots = people.filter((p) => !childToParents.has(p.id) || childToParents.get(p.id).length === 0);
    const processed = new Set();

    function assignGen(personId, currentGen) {
      if (processed.has(personId)) {
        if (currentGen > (genMap.get(personId) ?? 0)) {
          genMap.set(personId, currentGen);
        } else {
          return;
        }
      } else {
        genMap.set(personId, currentGen);
        processed.add(personId);
      }

      const spouses = spouseGraph.get(personId) || [];
      spouses.forEach((sId) => {
        if (genMap.get(sId) !== currentGen) {
          genMap.set(sId, currentGen);
          processed.add(sId);
        }
      });

      const siblings = siblingGraph.get(personId) || [];
      siblings.forEach((sId) => {
        if (genMap.get(sId) !== currentGen) {
          genMap.set(sId, currentGen);
          processed.add(sId);
        }
      });

      const children = parentToChildren.get(personId) || [];
      children.forEach((cId) => {
        assignGen(cId, currentGen + 1);
      });
    }

    roots.forEach((root) => assignGen(root.id, 0));
    people.forEach((p) => {
      if (!processed.has(p.id)) assignGen(p.id, 0);
    });

    return genMap;
  }

  addPerson(personData) {
    const person = this.normalizePerson(personData);
    if (!person.firstName.trim()) {
      throw new Error('First name is required.');
    }
    if (person.dateOfBirth && person.dateOfDeath && new Date(person.dateOfBirth) > new Date(person.dateOfDeath)) {
      throw new Error('Date of birth cannot be after date of death.');
    }

    this.people.set(person.id, person);

    // If person has photo, also register a primary photo record
    if (person.photo) {
      this.photos.push(
        this.normalizePhoto({
          id: `photo-primary-${person.id}`,
          personId: person.id,
          src: person.photo,
          title: `${person.displayName} — Portrait`,
          caption: 'Primary portrait',
          isPrimary: true,
          relatedPersonIds: [person.id],
        })
      );
    }

    this.notify();

    if (this.repository && typeof this.repository.savePerson === 'function') {
      Promise.resolve(this.repository.savePerson(person, { operation: 'create' }))
        .then((savedPerson) => {
          if (savedPerson) Object.assign(person, savedPerson);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.savePerson failed:', err);
        });
    }

    return person;
  }

  updatePerson(id, updates) {
    const existing = this.getPersonById(id);
    if (!existing) {
      throw new Error(`Person with id ${id} not found.`);
    }

    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const validated = this.normalizePerson(merged);
    if (!validated.firstName.trim()) {
      throw new Error('First name is required.');
    }
    if (validated.dateOfBirth && validated.dateOfDeath && new Date(validated.dateOfBirth) > new Date(validated.dateOfDeath)) {
      throw new Error('Date of birth cannot be after date of death.');
    }

    this.people.set(validated.id, validated);
    this.notify();

    if (this.repository && typeof this.repository.savePerson === 'function') {
      Promise.resolve(this.repository.savePerson(validated, { operation: 'update' }))
        .then((savedPerson) => {
          if (savedPerson) Object.assign(validated, savedPerson);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.savePerson failed:', err);
        });
    }

    return validated;
  }

  deletePerson(id) {
    const personId = String(id);
    if (!this.people.has(personId)) return false;

    // Delete person
    this.people.delete(personId);

    // Detach relationships
    this.relationships = this.relationships.filter((r) => {
      if (r.type === 'parent-child') {
        return r.parentId !== personId && r.childId !== personId;
      }
      if (r.type === 'spouse' || r.type === 'sibling') {
        return r.personAId !== personId && r.personBId !== personId;
      }
      return true;
    });

    // Clean up associated stories, events, photos, documents
    this.stories = this.stories.filter((s) => s.personId !== personId);
    this.lifeEvents = this.lifeEvents.filter((e) => e.personId !== personId);
    this.photos = this.photos.filter((ph) => ph.personId !== personId);
    this.documents = this.documents.filter((d) => d.personId !== personId);

    this.notify();

    if (this.repository && typeof this.repository.deletePerson === 'function') {
      Promise.resolve(this.repository.deletePerson(personId)).catch((err) => {
        console.warn('FamilyStore: repository.deletePerson failed:', err);
      });
    }

    return true;
  }

  // ── Relationship Operations ────────────────────────────────

  getAllRelationships() {
    return [...this.relationships];
  }

  getParents(personId) {
    if (!personId) return [];
    const id = String(personId);
    return this.relationships
      .filter((r) => r.type === 'parent-child' && r.childId === id)
      .map((r) => this.getPersonById(r.parentId))
      .filter(Boolean);
  }

  getChildren(personId) {
    if (!personId) return [];
    const id = String(personId);
    return this.relationships
      .filter((r) => r.type === 'parent-child' && r.parentId === id)
      .map((r) => this.getPersonById(r.childId))
      .filter(Boolean);
  }

  getSpouse(personId) {
    if (!personId) return null;
    const id = String(personId);
    const rel = this.relationships.find(
      (r) => r.type === 'spouse' && (r.personAId === id || r.personBId === id)
    );
    if (!rel) return null;
    const spouseId = rel.personAId === id ? rel.personBId : rel.personAId;
    return this.getPersonById(spouseId);
  }

  getSiblings(personId) {
    if (!personId) return [];
    const id = String(personId);
    const siblingIds = new Set();

    // 1. Explicit direct sibling relationships
    this.relationships.forEach((r) => {
      if (r.type === 'sibling') {
        if (r.personAId === id && r.personBId !== id) {
          siblingIds.add(r.personBId);
        } else if (r.personBId === id && r.personAId !== id) {
          siblingIds.add(r.personAId);
        }
      }
    });

    // 2. Siblings derived through shared parents
    const parents = this.getParents(id);
    parents.forEach((parent) => {
      const children = this.getChildren(parent.id);
      children.forEach((child) => {
        if (child.id !== id) siblingIds.add(child.id);
      });
    });

    return Array.from(siblingIds)
      .map((sid) => this.getPersonById(sid))
      .filter(Boolean);
  }

  addRelationship(relData) {
    const norm = this.normalizeRelationship(relData);

    if (norm.type === 'parent-child') {
      const { parentId, childId } = norm;
      if (!parentId || !childId) {
        throw new Error('Both parent and child must be selected.');
      }
      if (parentId === childId) {
        throw new Error('A person cannot be their own parent or child.');
      }
      if (!this.people.has(parentId) || !this.people.has(childId)) {
        throw new Error('Referenced family member does not exist.');
      }

      // Check duplicate
      const exists = this.relationships.some(
        (r) => r.type === 'parent-child' && r.parentId === parentId && r.childId === childId
      );
      if (exists) {
        throw new Error('This parent-child relationship already exists.');
      }

      // Check max 2 biological parents
      const currentParents = this.getParents(childId);
      if (currentParents.length >= 2) {
        throw new Error('A person cannot have more than 2 biological parents.');
      }

      // Cycle detection
      if (this.isAncestor(childId, parentId)) {
        throw new Error('Cannot add relationship: This creates an ancestry cycle where a person is their own descendant.');
      }
    } else if (norm.type === 'spouse') {
      const { personAId, personBId } = norm;
      if (!personAId || !personBId) {
        throw new Error('Both spouses must be selected.');
      }
      if (personAId === personBId) {
        throw new Error('A person cannot be married to themselves.');
      }
      if (!this.people.has(personAId) || !this.people.has(personBId)) {
        throw new Error('Referenced family member does not exist.');
      }

      const exists = this.relationships.some(
        (r) =>
          r.type === 'spouse' &&
          ((r.personAId === personAId && r.personBId === personBId) ||
           (r.personAId === personBId && r.personBId === personAId))
      );
      if (exists) {
        throw new Error('This spouse relationship already exists.');
      }
    } else if (norm.type === 'sibling') {
      const { personAId, personBId } = norm;
      if (!personAId || !personBId) {
        throw new Error('Both siblings must be selected.');
      }
      if (personAId === personBId) {
        throw new Error('A person cannot be their own sibling.');
      }
      if (!this.people.has(personAId) || !this.people.has(personBId)) {
        throw new Error('Referenced family member does not exist.');
      }

      const exists = this.relationships.some(
        (r) =>
          r.type === 'sibling' &&
          ((r.personAId === personAId && r.personBId === personBId) ||
           (r.personAId === personBId && r.personBId === personAId))
      );
      if (exists) {
        throw new Error('This sibling relationship already exists.');
      }
    }

    this.relationships.push(norm);
    this.notify();

    if (this.repository && typeof this.repository.saveRelationship === 'function') {
      this.repository.saveRelationship(norm, { operation: 'create' }).catch((err) => {
        console.warn('FamilyStore: repository.saveRelationship failed:', err);
      });
    }

    return norm;
  }

  removeRelationship(relId) {
    const id = String(relId);
    const initialLen = this.relationships.length;
    this.relationships = this.relationships.filter((r) => r.id !== id);
    if (this.relationships.length !== initialLen) {
      this.notify();

      if (this.repository && typeof this.repository.deleteRelationship === 'function') {
        this.repository.deleteRelationship(id).catch((err) => {
          console.warn('FamilyStore: repository.deleteRelationship failed:', err);
        });
      }

      return true;
    }
    return false;
  }

  deleteRelationship(relId) {
    return this.removeRelationship(relId);
  }

  isAncestor(targetAncestorId, targetPersonId) {
    if (targetAncestorId === targetPersonId) return true;
    const visited = new Set();
    const queue = [targetPersonId];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr === targetAncestorId) return true;
      if (!visited.has(curr)) {
        visited.add(curr);
        const parents = this.getParents(curr);
        parents.forEach((p) => {
          if (!visited.has(p.id)) queue.push(p.id);
        });
      }
    }
    return false;
  }

  // ── Stories & Memories ─────────────────────────────────────

  getStoryById(id) {
    const sId = String(id);
    return this.stories.find((s) => s.id === sId) || null;
  }

  getStoriesForPerson(personId) {
    const pId = String(personId);
    return this.stories.filter((s) => s.personId === pId || s.relatedPersonIds.includes(pId));
  }

  addStory(storyData) {
    if (!storyData.personId || !this.people.has(String(storyData.personId))) {
      throw new Error('Story must be attached to a valid family member.');
    }
    if (!storyData.content?.trim()) {
      throw new Error('Story content is required.');
    }

    const norm = this.normalizeStory(storyData);
    this.stories.unshift(norm);
    this.notify();

    if (this.repository && typeof this.repository.saveStory === 'function') {
      Promise.resolve(this.repository.saveStory(norm, { operation: 'create' }))
        .then((savedStory) => {
          if (savedStory) Object.assign(norm, savedStory);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.saveStory failed:', err);
        });
    }

    return norm;
  }

  updateStory(id, updates) {
    const idx = this.stories.findIndex((s) => s.id === String(id));
    if (idx === -1) throw new Error('Story not found.');

    const updated = this.normalizeStory({
      ...this.stories[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    this.stories[idx] = updated;
    this.notify();

    if (this.repository && typeof this.repository.saveStory === 'function') {
      Promise.resolve(this.repository.saveStory(updated, { operation: 'update' }))
        .then((savedStory) => {
          if (savedStory) Object.assign(updated, savedStory);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.saveStory failed:', err);
        });
    }

    return updated;
  }

  deleteStory(id) {
    const storyId = String(id);
    const initialLen = this.stories.length;
    this.stories = this.stories.filter((s) => s.id !== storyId);
    if (this.stories.length !== initialLen) {
      this.notify();

      if (this.repository && typeof this.repository.deleteStory === 'function') {
        Promise.resolve(this.repository.deleteStory(storyId)).catch((err) => {
          console.warn('FamilyStore: repository.deleteStory failed:', err);
        });
      }

      return true;
    }
    return false;
  }

  // ── Life Events ────────────────────────────────────────────

  getEventsForPerson(personId) {
    const pId = String(personId);
    return this.lifeEvents
      .filter((e) => e.personId === pId || e.relatedPersonIds.includes(pId))
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      });
  }

  addLifeEvent(eventData) {
    if (!eventData.personId || !this.people.has(String(eventData.personId))) {
      throw new Error('Life event must be attached to a valid family member.');
    }
    if (!eventData.title?.trim()) {
      throw new Error('Event title is required.');
    }

    const norm = this.normalizeLifeEvent(eventData);
    this.lifeEvents.push(norm);
    this.notify();

    if (this.repository && typeof this.repository.saveLifeEvent === 'function') {
      Promise.resolve(this.repository.saveLifeEvent(norm, { operation: 'create' }))
        .then((savedEvent) => {
          if (savedEvent) Object.assign(norm, savedEvent);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.saveLifeEvent failed:', err);
        });
    }

    return norm;
  }

  updateLifeEvent(id, updates) {
    const idx = this.lifeEvents.findIndex((e) => e.id === String(id));
    if (idx === -1) throw new Error('Life event not found.');

    const updated = this.normalizeLifeEvent({
      ...this.lifeEvents[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    this.lifeEvents[idx] = updated;
    this.notify();

    if (this.repository && typeof this.repository.saveLifeEvent === 'function') {
      Promise.resolve(this.repository.saveLifeEvent(updated, { operation: 'update' }))
        .then((savedEvent) => {
          if (savedEvent) Object.assign(updated, savedEvent);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.saveLifeEvent failed:', err);
        });
    }

    return updated;
  }

  deleteLifeEvent(id) {
    const eventId = String(id);
    const initialLen = this.lifeEvents.length;
    this.lifeEvents = this.lifeEvents.filter((e) => e.id !== eventId);
    if (this.lifeEvents.length !== initialLen) {
      this.notify();

      if (this.repository && typeof this.repository.deleteLifeEvent === 'function') {
        Promise.resolve(this.repository.deleteLifeEvent(eventId)).catch((err) => {
          console.warn('FamilyStore: repository.deleteLifeEvent failed:', err);
        });
      }

      return true;
    }
    return false;
  }

  // ── Photos Gallery & Primary Portrait ──────────────────────
  
  getPhotoById(id) {
    if (!id) return null;
    return this.photos.find((ph) => ph.id === String(id)) || null;
  }

  getPhotosForPerson(personId) {
    const pId = String(personId);
    return this.photos.filter((ph) => ph.personId === pId || ph.relatedPersonIds.includes(pId));
  }

  addPhoto(photoData) {
    if (!photoData.personId || !this.people.has(String(photoData.personId))) {
      throw new Error('Photo must be attached to a valid family member.');
    }
    if (!photoData.src?.trim()) {
      throw new Error('Image source URL or data is required.');
    }

    const norm = this.normalizePhoto(photoData);

    // If marked as primary, update other photos for this person and person portrait
    if (norm.isPrimary) {
      this.photos.forEach((ph) => {
        if (ph.personId === norm.personId) ph.isPrimary = false;
      });
      const person = this.people.get(norm.personId);
      if (person) {
        const photoRef = norm.storagePath || norm.storage_path || norm.src;
        person.photo = photoRef;
        person.photoUrl = photoRef;
        if (this.repository && typeof this.repository.savePerson === 'function') {
          Promise.resolve(this.repository.savePerson(person, { operation: 'update' }))
            .then((savedPerson) => {
              if (savedPerson) Object.assign(person, savedPerson);
            })
            .catch(() => {});
        }
      }
    }

    this.photos.unshift(norm);
    this.notify();

    if (this.repository && typeof this.repository.savePhoto === 'function') {
      Promise.resolve(this.repository.savePhoto(norm, { operation: 'create' }))
        .then((savedPhoto) => {
          if (savedPhoto) Object.assign(norm, savedPhoto);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.savePhoto failed:', err);
        });
    }

    return norm;
  }

  updatePhoto(id, updates) {
    const idx = this.photos.findIndex((ph) => ph.id === String(id));
    if (idx === -1) throw new Error('Photo not found.');

    const updated = this.normalizePhoto({
      ...this.photos[idx],
      ...updates,
    });

    if (updated.isPrimary) {
      this.photos.forEach((ph) => {
        if (ph.personId === updated.personId && ph.id !== updated.id) ph.isPrimary = false;
      });
      const person = this.people.get(updated.personId);
      if (person) {
        const photoRef = updated.storagePath || updated.storage_path || updated.src;
        person.photo = photoRef;
        person.photoUrl = photoRef;
        if (this.repository && typeof this.repository.savePerson === 'function') {
          Promise.resolve(this.repository.savePerson(person, { operation: 'update' }))
            .then((savedPerson) => {
              if (savedPerson) Object.assign(person, savedPerson);
            })
            .catch(() => {});
        }
      }
    }

    this.photos[idx] = updated;
    this.notify();

    if (this.repository && typeof this.repository.savePhoto === 'function') {
      Promise.resolve(this.repository.savePhoto(updated, { operation: 'update' }))
        .then((savedPhoto) => {
          if (savedPhoto) Object.assign(updated, savedPhoto);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.savePhoto failed:', err);
        });
    }

    return updated;
  }

  setPrimaryPhoto(personId, photoId) {
    const pId = String(personId);
    const phId = String(photoId);

    const targetPhoto = this.photos.find((ph) => ph.id === phId && ph.personId === pId);
    if (!targetPhoto) throw new Error('Photo not found for this person.');

    this.photos.forEach((ph) => {
      if (ph.personId === pId) {
        ph.isPrimary = ph.id === phId;
      }
    });

    const person = this.people.get(pId);
    if (person) {
      const photoRef = targetPhoto.storagePath || targetPhoto.storage_path || targetPhoto.src;
      person.photo = photoRef;
      person.photoUrl = photoRef;
      if (this.repository && typeof this.repository.savePerson === 'function') {
        Promise.resolve(this.repository.savePerson(person, { operation: 'update' }))
          .then((savedPerson) => {
            if (savedPerson) Object.assign(person, savedPerson);
          })
          .catch(() => {});
      }
    }

    this.notify();

    if (this.repository && typeof this.repository.savePhoto === 'function') {
      this.repository.savePhoto(targetPhoto, { operation: 'update' }).catch((err) => {
        console.warn('FamilyStore: repository.savePhoto failed:', err);
      });
    }

    return targetPhoto;
  }

  deletePhoto(id) {
    const photoId = String(id);
    const initialLen = this.photos.length;
    const target = this.photos.find((ph) => ph.id === photoId);
    this.photos = this.photos.filter((ph) => ph.id !== photoId);

    if (target && target.isPrimary) {
      // Find another photo for this person to become primary
      const nextPrimary = this.photos.find((ph) => ph.personId === target.personId);
      const person = this.people.get(target.personId);
      if (nextPrimary) {
        nextPrimary.isPrimary = true;
        if (person) {
          person.photo = nextPrimary.src;
          person.photoUrl = nextPrimary.src;
        }
      } else if (person) {
        person.photo = '';
        person.photoUrl = '';
      }
    }

    if (this.photos.length !== initialLen) {
      this.notify();

      if (this.repository && typeof this.repository.deletePhoto === 'function') {
        Promise.resolve(this.repository.deletePhoto(photoId)).catch((err) => {
          console.warn('FamilyStore: repository.deletePhoto failed:', err);
        });
      }

      return true;
    }
    return false;
  }

  // ── Documents ──────────────────────────────────────────────

  getAllDocuments() {
    return [...this.documents];
  }

  getDocumentById(id) {
    if (!id) return null;
    return this.documents.find((d) => d.id === String(id)) || null;
  }

  getDocumentsForPerson(personId) {
    const pId = String(personId);
    return this.documents.filter((d) => d.personId === pId);
  }

  addDocument(docData) {
    if (!docData.personId || !this.people.has(String(docData.personId))) {
      throw new Error('Document must be attached to a valid family member.');
    }
    if (!docData.name?.trim()) {
      throw new Error('Document title is required.');
    }

    const norm = this.normalizeDocument(docData);
    this.documents.unshift(norm);
    this.notify();

    if (this.repository && typeof this.repository.saveDocument === 'function') {
      Promise.resolve(this.repository.saveDocument(norm, { operation: 'create' }))
        .then((savedDoc) => {
          if (savedDoc) Object.assign(norm, savedDoc);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.saveDocument failed:', err);
        });
    }

    return norm;
  }

  updateDocument(id, updates) {
    const idx = this.documents.findIndex((d) => d.id === String(id));
    if (idx === -1) throw new Error('Document not found.');

    const updated = this.normalizeDocument({
      ...this.documents[idx],
      ...updates,
    });
    this.documents[idx] = updated;
    this.notify();

    if (this.repository && typeof this.repository.saveDocument === 'function') {
      Promise.resolve(this.repository.saveDocument(updated, { operation: 'update' }))
        .then((savedDoc) => {
          if (savedDoc) Object.assign(updated, savedDoc);
        })
        .catch((err) => {
          console.warn('FamilyStore: repository.saveDocument failed:', err);
        });
    }

    return updated;
  }

  deleteDocument(id) {
    const docId = String(id);
    const initialLen = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== docId);
    if (this.documents.length !== initialLen) {
      this.notify();

      if (this.repository && typeof this.repository.deleteDocument === 'function') {
        Promise.resolve(this.repository.deleteDocument(docId)).catch((err) => {
          console.warn('FamilyStore: repository.deleteDocument failed:', err);
        });
      }

      return true;
    }
    return false;
  }

  // ── Sync Status Accessors ──────────────────────────────────

  getSyncStatus() {
    if (this.repository && typeof this.repository.getSyncStatus === 'function') {
      return this.repository.getSyncStatus();
    }
    return 'synced';
  }

  subscribeSyncStatus(listener) {
    if (this.repository && typeof this.repository.subscribeSyncStatus === 'function') {
      return this.repository.subscribeSyncStatus(listener);
    }
    listener('synced');
    return () => {};
  }

  // ── Export / Import / Reset ────────────────────────────────

  exportData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      family: {
        people: Array.from(this.people.values()),
        relationships: this.relationships,
        stories: this.stories,
        lifeEvents: this.lifeEvents,
        photos: this.photos,
        documents: this.documents,
      },
    };
  }

  importData(data) {
    let parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch {
        throw new Error('Invalid JSON format.');
      }
    }

    if (!this.validateSchema(parsed)) {
      throw new Error('Invalid family data backup format. Missing people or relationship arrays.');
    }

    const peopleArray = parsed.family?.people || parsed.people;
    const relsArray = parsed.family?.relationships || parsed.relationships;
    const storiesArray = parsed.family?.stories || parsed.stories || [];
    const eventsArray = parsed.family?.lifeEvents || parsed.lifeEvents || [];
    const photosArray = parsed.family?.photos || parsed.photos || [];
    const docsArray = parsed.family?.documents || parsed.documents || [];

    // Validate people
    const peopleIds = new Set();
    peopleArray.forEach((p) => {
      if (!p.id || !p.firstName) {
        throw new Error('Import validation failed: Each person must have a valid ID and first name.');
      }
      if (peopleIds.has(p.id)) {
        throw new Error(`Import validation failed: Duplicate person ID found (${p.id}).`);
      }
      peopleIds.add(p.id);
    });

    // Validate relationships
    const parentCountMap = new Map();
    relsArray.forEach((r) => {
      if (r.type === 'parent-child' || r.type === 'parent') {
        const pId = r.parentId || r.personId1;
        const cId = r.childId || r.personId2;
        if (!peopleIds.has(pId) || !peopleIds.has(cId)) {
          throw new Error('Import validation failed: Relationship references non-existent person ID.');
        }
        if (pId === cId) {
          throw new Error('Import validation failed: Self-parenting relationship detected.');
        }
        const currentCount = (parentCountMap.get(cId) || 0) + 1;
        if (currentCount > 2) {
          throw new Error(`Import validation failed: Person ${cId} has more than 2 biological parents.`);
        }
        parentCountMap.set(cId, currentCount);
      } else if (r.type === 'spouse') {
        const aId = r.personAId || r.personId1;
        const bId = r.personBId || r.personId2;
        if (!peopleIds.has(aId) || !peopleIds.has(bId)) {
          throw new Error('Import validation failed: Spouse relationship references non-existent person ID.');
        }
        if (aId === bId) {
          throw new Error('Import validation failed: Self-spouse relationship detected.');
        }
      }
    });

    // Safely load verified data
    this.loadFromData(peopleArray, relsArray, storiesArray, eventsArray, photosArray, docsArray);
    this.notify();
    return true;
  }

  resetToSampleData() {
    const sampleEntities = createInitialSampleEntities(samplePersons);
    this.loadFromData(
      samplePersons,
      sampleRelationships,
      sampleEntities.stories,
      sampleEntities.lifeEvents,
      sampleEntities.photos,
      sampleEntities.documents
    );
    this.notify();
  }

  clearAllData() {
    this.loadFromData([], [], [], [], [], []);
    this.persist();
    this.notify();
  }

  setRepository(repository) {
    if (this.repository && typeof this.repository.destroy === 'function') {
      try {
        this.repository.destroy();
      } catch (err) {
        console.warn('FamilyStore: Error destroying old repository:', err);
      }
    }
    // Wipe previous in-memory state immediately so stale family data does not bleed into the new repository
    this._searchIndex = null;
    this.people.clear();
    this.relationships = [];
    this.stories = [];
    this.lifeEvents = [];
    this.photos = [];
    this.documents = [];
    this.repository = repository;
    this.notify(); // Inform listeners immediately of cleared state
    this.init();
  }

  async clearLocalCache(familyId) {
    if (this.repository && typeof this.repository.clearLocalCache === 'function') {
      await this.repository.clearLocalCache(familyId);
    }
    this.loadFromData([], [], [], [], [], []);
    this.notify();
  }

  validateSchema(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    const people = parsed.family?.people || parsed.people;
    const rels = parsed.family?.relationships || parsed.relationships;
    return Array.isArray(people) && Array.isArray(rels);
  }
}

// Global Singleton Instance
export const familyStore = new FamilyStore();
export default familyStore;
