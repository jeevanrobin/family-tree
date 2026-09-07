/**
 * LocalAdapter — localStorage persistence.
 *
 * Extracted from FamilyStore's init() and persist() methods.
 * Preserves exact v2 schema format and v1→v2 migration behavior.
 */
import { FamilyRepository } from './FamilyRepository.js';

const STORAGE_KEY_V2 = 'family-tree-data-v2';
const STORAGE_KEY_V1 = 'family-tree-data-v1';
const SCHEMA_VERSION = 2;

export class LocalAdapter extends FamilyRepository {

  loadSync() {
    try {
      const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (this._validateSchema(parsed)) {
          return {
            people: parsed.people || parsed.family?.people || [],
            relationships: parsed.relationships || parsed.family?.relationships || [],
            stories: parsed.stories || [],
            lifeEvents: parsed.lifeEvents || [],
            photos: parsed.photos || [],
            documents: parsed.documents || [],
          };
        }
      }

      const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
      if (rawV1) {
        const parsedV1 = JSON.parse(rawV1);
        if (Array.isArray(parsedV1.people) && Array.isArray(parsedV1.relationships)) {
          return {
            people: parsedV1.people,
            relationships: parsedV1.relationships,
            stories: [],
            lifeEvents: [],
            photos: [],
            documents: [],
            _isV1Migration: true,
          };
        }
      }
    } catch (err) {
      console.warn('LocalAdapter: Failed to load from localStorage:', err);
    }

    return null;
  }

  async load() {
    return this.loadSync();
  }

  async persist(snapshot) {
    try {
      const payload = {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        people: snapshot.people,
        relationships: snapshot.relationships,
        stories: snapshot.stories,
        lifeEvents: snapshot.lifeEvents,
        photos: snapshot.photos,
        documents: snapshot.documents,
      };
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(payload));
    } catch (err) {
      console.error('LocalAdapter: Failed to persist to localStorage:', err);
    }
  }

  async savePerson() { /* handled by persist() */ }
  async deletePerson() { /* handled by persist() */ }
  async saveRelationship() { /* handled by persist() */ }
  async deleteRelationship() { /* handled by persist() */ }
  async saveStory() { /* handled by persist() */ }
  async deleteStory() { /* handled by persist() */ }
  async saveLifeEvent() { /* handled by persist() */ }
  async deleteLifeEvent() { /* handled by persist() */ }
  async savePhoto() { /* handled by persist() */ }
  async deletePhoto() { /* handled by persist() */ }
  async saveDocument() { /* handled by persist() */ }
  async deleteDocument() { /* handled by persist() */ }

  async importAll(data) {
    await this.persist(data);
  }

  async reset(seedData) {
    await this.persist(seedData);
  }

  _validateSchema(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    const people = parsed.family?.people || parsed.people;
    const rels = parsed.family?.relationships || parsed.relationships;
    return Array.isArray(people) && Array.isArray(rels);
  }
}
