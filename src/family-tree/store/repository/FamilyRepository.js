/**
 * FamilyRepository — Abstract persistence interface.
 *
 * Adapters (LocalAdapter, SupabaseAdapter) implement these methods.
 * FamilyStore delegates all persistence through this interface.
 */
export class FamilyRepository {
  async load() { throw new Error('Not implemented'); }
  async persist(_snapshot) { throw new Error('Not implemented'); }

  async savePerson(_person) { throw new Error('Not implemented'); }
  async deletePerson(_personId) { throw new Error('Not implemented'); }

  async saveRelationship(_relationship) { throw new Error('Not implemented'); }
  async deleteRelationship(_relationshipId) { throw new Error('Not implemented'); }

  async saveStory(_story) { throw new Error('Not implemented'); }
  async deleteStory(_storyId) { throw new Error('Not implemented'); }

  async saveLifeEvent(_event) { throw new Error('Not implemented'); }
  async deleteLifeEvent(_eventId) { throw new Error('Not implemented'); }

  async savePhoto(_photo) { throw new Error('Not implemented'); }
  async deletePhoto(_photoId) { throw new Error('Not implemented'); }

  async saveDocument(_doc) { throw new Error('Not implemented'); }
  async deleteDocument(_docId) { throw new Error('Not implemented'); }

  async importAll(_data) { throw new Error('Not implemented'); }
  async reset(_seedData) { throw new Error('Not implemented'); }

  async getSiblingOrders(_familyId) { throw new Error('Not implemented'); }
  async saveSiblingOrder(_familyId, _cohortKey, _orderedPersonIds) { throw new Error('Not implemented'); }
  async deleteSiblingOrder(_familyId, _cohortKey) { throw new Error('Not implemented'); }
}
