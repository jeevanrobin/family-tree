/**
 * useFamilyTree Hook
 * 
 * Subscribes to the central FamilyStore single source of truth.
 * Automatically recalculates dynamic layout, immediate relationships, constellation maps,
 * and exposes full CRUD for people, relationships, stories, life events, photos, and documents.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import familyStore from '../store/FamilyStore.js';
import {
  getImmediateFamilyMap,
  getFamilyConstellationMap,
  getAncestryLineage,
  getAllGenerations,
  getStoriesForPerson,
  getEventsForPerson,
  getPhotosForPerson,
  getDocumentsForPerson,
} from '../data/familyDataService.js';
import { computeTreeLayout } from '../engine/treeLayout.js';

export function useFamilyTree() {
  const [snapshot, setSnapshot] = useState(() => familyStore.getSnapshot());
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [collapsedUnitKeys, setCollapsedUnitKeys] = useState(() => new Set());
  const [focusMode, setFocusMode] = useState('all'); // 'all' | 'person' | 'family'

  // Subscribe to store mutations
  useEffect(() => {
    const unsubscribe = familyStore.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    return unsubscribe;
  }, []);

  const persons = snapshot.people;
  const relationships = snapshot.relationships;
  const stories = snapshot.stories;
  const lifeEvents = snapshot.lifeEvents;
  const photos = snapshot.photos;
  const documents = snapshot.documents;
  const siblingOrder = snapshot.siblingOrder;

  // Compute generation groups
  const generations = useMemo(() => {
    return getAllGenerations();
  }, [persons, relationships]);

  // Compute spatial tree coordinates & connection paths automatically with scalable architecture
  const layout = useMemo(() => {
    return computeTreeLayout(persons, relationships, {
      collapsedUnits: collapsedUnitKeys,
      focusPersonId: selectedId,
      focusMode,
      customSiblingOrders: siblingOrder,
    });
  }, [persons, relationships, collapsedUnitKeys, selectedId, focusMode, siblingOrder]);

  // Selected person entity
  const selectedPerson = useMemo(() => {
    return selectedId ? familyStore.getPersonById(selectedId) : null;
  }, [selectedId, persons]);

  // Immediate family map for currently selected person
  const immediateFamilyMap = useMemo(() => {
    return selectedId ? getImmediateFamilyMap(selectedId) : new Map();
  }, [selectedId, relationships, persons]);

  // Hierarchical constellation map for fine-grained weighting
  const constellationMap = useMemo(() => {
    return selectedId ? getFamilyConstellationMap(selectedId) : new Map();
  }, [selectedId, relationships, persons]);

  // Complete ancestral lineage tracing (Grandparents -> Parents -> Selected Child)
  const ancestryLineage = useMemo(() => {
    return selectedId
      ? getAncestryLineage(selectedId)
      : {
          ancestorIds: new Set(),
          lineageSpouseKeys: new Set(),
          lineageParentChildChildIds: new Set(),
        };
  }, [selectedId, relationships, persons]);

  const relatedIds = useMemo(() => {
    const ids = new Set(immediateFamilyMap.keys());
    if (ancestryLineage?.ancestorIds) {
      ancestryLineage.ancestorIds.forEach((id) => ids.add(id));
    }
    return ids;
  }, [immediateFamilyMap, ancestryLineage]);

  // Profile-specific collections for selected person
  const selectedPersonStories = useMemo(() => {
    return selectedId ? getStoriesForPerson(selectedId) : [];
  }, [selectedId, stories]);

  const selectedPersonEvents = useMemo(() => {
    return selectedId ? getEventsForPerson(selectedId) : [];
  }, [selectedId, lifeEvents]);

  const selectedPersonPhotos = useMemo(() => {
    return selectedId ? getPhotosForPerson(selectedId) : [];
  }, [selectedId, photos]);

  const selectedPersonDocuments = useMemo(() => {
    return selectedId ? getDocumentsForPerson(selectedId) : [];
  }, [selectedId, documents]);

  // Search results
  const searchResults = useMemo(() => {
    return familyStore.searchPersons(searchQuery);
  }, [searchQuery, persons]);

  const selectPerson = useCallback((personId) => {
    setSelectedId(personId ? String(personId) : null);
  }, []);

  const deselectPerson = useCallback(() => {
    setSelectedId(null);
  }, []);

  const toggleBranch = useCallback((unitKey) => {
    if (!unitKey) return;
    setCollapsedUnitKeys((prev) => {
      const next = new Set(prev);
      if (next.has(unitKey)) {
        next.delete(unitKey);
      } else {
        next.add(unitKey);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedUnitKeys(new Set());
    setFocusMode('all');
  }, []);

  const collapseAll = useCallback(() => {
    const parentUnitKeys = new Set();
    relationships.forEach((rel) => {
      if (rel.type === 'parent-child') {
        const pId = String(rel.personId1 ?? rel.parentId);
        parentUnitKeys.add(`unit-${pId}`);
      }
    });
    setCollapsedUnitKeys(parentUnitKeys);
  }, [relationships]);

  const expandAncestorsOf = useCallback(
    (personId) => {
      if (!personId) return;
      const lineage = getAncestryLineage(personId);
      const ancestorIds = lineage?.ancestorIds ? new Set(lineage.ancestorIds) : new Set();
      ancestorIds.add(String(personId));

      setCollapsedUnitKeys((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        // If an ancestor was collapsed, expand that unit
        relationships.forEach((rel) => {
          if (rel.type === 'parent-child') {
            const childId = String(rel.personId2 ?? rel.relatedPersonId ?? rel.childId);
            if (ancestorIds.has(childId)) {
              const parentId = String(rel.personId1 ?? rel.parentId);
              for (const key of next) {
                if (key.includes(parentId)) {
                  next.delete(key);
                }
              }
            }
          }
        });
        return next;
      });
    },
    [relationships]
  );

  // ── Store Mutation Wrappers ─────────────────────────────────

  const addPerson = useCallback((personData) => {
    return familyStore.addPerson(personData);
  }, []);

  const updatePerson = useCallback((id, updates) => {
    return familyStore.updatePerson(id, updates);
  }, []);

  const deletePerson = useCallback((id) => {
    const res = familyStore.deletePerson(id);
    if (selectedId === String(id)) {
      setSelectedId(null);
    }
    return res;
  }, [selectedId]);

  const addRelationship = useCallback((relData) => {
    return familyStore.addRelationship(relData);
  }, []);

  const removeRelationship = useCallback((relId) => {
    return familyStore.removeRelationship(relId);
  }, []);

  // Story mutations
  const addStory = useCallback((storyData) => {
    return familyStore.addStory(storyData);
  }, []);

  const updateStory = useCallback((id, updates) => {
    return familyStore.updateStory(id, updates);
  }, []);

  const deleteStory = useCallback((id) => {
    return familyStore.deleteStory(id);
  }, []);

  // Life Event mutations
  const addLifeEvent = useCallback((eventData) => {
    return familyStore.addLifeEvent(eventData);
  }, []);

  const updateLifeEvent = useCallback((id, updates) => {
    return familyStore.updateLifeEvent(id, updates);
  }, []);

  const deleteLifeEvent = useCallback((id) => {
    return familyStore.deleteLifeEvent(id);
  }, []);

  // Photo mutations
  const addPhoto = useCallback((photoData) => {
    return familyStore.addPhoto(photoData);
  }, []);

  const updatePhoto = useCallback((id, updates) => {
    return familyStore.updatePhoto(id, updates);
  }, []);

  const deletePhoto = useCallback((id) => {
    return familyStore.deletePhoto(id);
  }, []);

  const setPrimaryPhoto = useCallback((personId, photoId) => {
    return familyStore.setPrimaryPhoto(personId, photoId);
  }, []);

  // Document mutations
  const addDocument = useCallback((docData) => {
    return familyStore.addDocument(docData);
  }, []);

  const updateDocument = useCallback((id, updates) => {
    return familyStore.updateDocument(id, updates);
  }, []);

  const deleteDocument = useCallback((id) => {
    return familyStore.deleteDocument(id);
  }, []);

  // Export / Import / Reset
  const resetToSampleData = useCallback(() => {
    familyStore.resetToSampleData();
    setSelectedId(null);
  }, []);

  const exportData = useCallback(() => {
    return familyStore.exportData();
  }, []);

  const importData = useCallback((data) => {
    return familyStore.importData(data);
  }, []);

  const clearAllData = useCallback(() => {
    familyStore.clearAllData();
    setSelectedId(null);
  }, []);

  const setSiblingOrder = useCallback((cohortKey, orderedPersonIds) => {
    familyStore.setSiblingOrder(cohortKey, orderedPersonIds);
  }, []);

  const resetSiblingOrder = useCallback((cohortKey) => {
    familyStore.resetSiblingOrder(cohortKey);
  }, []);

  return {
    persons,
    relationships,
    stories,
    lifeEvents,
    photos,
    documents,
    siblingOrder,
    generations,
    layout,
    selectedId,
    selectedPerson,
    immediateFamilyMap,
    constellationMap,
    ancestryLineage,
    relatedIds,
    selectedPersonStories,
    selectedPersonEvents,
    selectedPersonPhotos,
    selectedPersonDocuments,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectPerson,
    deselectPerson,
    // Scalable Tree Architecture
    collapsedUnitKeys,
    focusMode,
    setFocusMode,
    toggleBranch,
    expandAll,
    collapseAll,
    expandAncestorsOf,
    // Operations
    addPerson,
    updatePerson,
    deletePerson,
    addRelationship,
    removeRelationship,
    setSiblingOrder,
    resetSiblingOrder,
    addStory,
    updateStory,
    deleteStory,
    addLifeEvent,
    updateLifeEvent,
    deleteLifeEvent,
    addPhoto,
    updatePhoto,
    deletePhoto,
    setPrimaryPhoto,
    addDocument,
    updateDocument,
    deleteDocument,
    resetToSampleData,
    clearAllData,
    exportData,
    importData,
  };
}

export default useFamilyTree;
