import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { indexedDBManager, STORES } from '../../src/family-tree/store/local/indexedDBManager.js';
import { createPerson, resetCounter } from '../fixtures/index.js';

describe('IndexedDB Manager', () => {
  beforeEach(async () => {
    resetCounter();
    await indexedDBManager.clearAllDatabases();
  });

  afterEach(async () => {
    await indexedDBManager.clearAllDatabases();
  });

  describe('put and get', () => {
    it('stores and retrieves a person entity', async () => {
      const person = createPerson({ id: 'test-person-1', firstName: 'Rajesh' });
      
      await indexedDBManager.put(STORES.PEOPLE, person);
      const retrieved = await indexedDBManager.get(STORES.PEOPLE, 'test-person-1');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe('test-person-1');
      expect(retrieved.firstName).toBe('Rajesh');
    });

    it('returns null for non-existent key', async () => {
      const result = await indexedDBManager.get(STORES.PEOPLE, 'non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('putBatch', () => {
    it('stores multiple items atomically', async () => {
      const people = [
        createPerson({ id: 'batch-1', firstName: 'Alpha' }),
        createPerson({ id: 'batch-2', firstName: 'Beta' }),
        createPerson({ id: 'batch-3', firstName: 'Gamma' })
      ];

      await indexedDBManager.putBatch(STORES.PEOPLE, people);

      const r1 = await indexedDBManager.get(STORES.PEOPLE, 'batch-1');
      const r2 = await indexedDBManager.get(STORES.PEOPLE, 'batch-2');
      const r3 = await indexedDBManager.get(STORES.PEOPLE, 'batch-3');

      expect(r1.firstName).toBe('Alpha');
      expect(r2.firstName).toBe('Beta');
      expect(r3.firstName).toBe('Gamma');
    });
  });

  describe('getAllByFamily', () => {
    it('filters entities by family_id strictly', async () => {
      const famA = 'family-alpha';
      const famB = 'family-beta';

      await indexedDBManager.putBatch(STORES.PEOPLE, [
        createPerson({ id: 'p-a1', family_id: famA, firstName: 'Alpha1' }),
        createPerson({ id: 'p-a2', family_id: famA, firstName: 'Alpha2' }),
        createPerson({ id: 'p-b1', family_id: famB, firstName: 'Beta1' })
      ]);

      const famAPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, famA);
      const famBPeople = await indexedDBManager.getAllByFamily(STORES.PEOPLE, famB);

      expect(famAPeople.length).toBe(2);
      expect(famBPeople.length).toBe(1);
      expect(famAPeople.every(p => p.family_id === famA)).toBe(true);
      expect(famBPeople[0].family_id).toBe(famB);
    });
  });

  describe('delete', () => {
    it('removes entity from store', async () => {
      const person = createPerson({ id: 'to-delete' });
      await indexedDBManager.put(STORES.PEOPLE, person);

      await indexedDBManager.delete(STORES.PEOPLE, 'to-delete');

      const result = await indexedDBManager.get(STORES.PEOPLE, 'to-delete');
      expect(result).toBeNull();
    });
  });

  describe('tombstones', () => {
    it('registers and checks tombstoned entities', async () => {
      const familyId = 'test-family-tomb';
      
      await indexedDBManager.addTombstone({
        id: 'deleted-person',
        familyId,
        entityType: 'person'
      });

      const isTombstoned = await indexedDBManager.isTombstoned('deleted-person');
      expect(isTombstoned).toBe(true);

      const notDeleted = await indexedDBManager.isTombstoned('active-person');
      expect(notDeleted).toBe(false);
    });

    it('retrieves all tombstones for a family', async () => {
      const familyId = 'tomb-family';
      
      await indexedDBManager.addTombstone({
        id: 'tomb-1',
        familyId,
        entityType: 'person'
      });
      await indexedDBManager.addTombstone({
        id: 'tomb-2',
        familyId,
        entityType: 'relationship'
      });

      const tombstones = await indexedDBManager.getTombstones(familyId);
      expect(tombstones.length).toBe(2);
    });
  });
});
