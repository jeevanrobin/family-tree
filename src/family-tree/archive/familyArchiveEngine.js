/**
 * familyArchiveEngine.js — M4D Global Album & Archive Engine
 * 
 * Provides deterministic derivations, relationship enrichment, collection
 * grouping, era computation, and filtering for the Medida family archive.
 * Single source of truth: FamilyStore (no secondary database).
 */

/**
 * Extract an integer 4-digit year from any date string or year string
 * @param {string|number} val 
 * @returns {number|null}
 */
export function extractYear(val) {
  if (!val) return null;
  const str = String(val).trim();
  const match = str.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Compute dynamic historical eras from all dated items across the family
 * (people, events, stories, photos, documents).
 * 
 * @param {Array<number>} allYears 
 * @returns {Array<{ id: string, label: string, startYear: number, endYear: number, description: string }>}
 */
export function deriveArchiveEras(allYears) {
  const validYears = allYears
    .filter((y) => typeof y === 'number' && !isNaN(y) && y >= 1800 && y <= 2100)
    .sort((a, b) => a - b);

  if (validYears.length === 0) {
    const currentYear = new Date().getFullYear();
    return [
      { id: 'foundations', label: 'The Foundations', startYear: 1900, endYear: 1969, description: 'Ancestral beginnings, early roots, and heritage.' },
      { id: 'mid-century', label: 'Mid-Century Milestones', startYear: 1970, endYear: 1999, description: 'Education, marriages, and establishing the family homestead.' },
      { id: 'modern', label: 'The Modern Era', startYear: 2000, endYear: currentYear, description: 'Contemporary achievements and new generations.' },
    ];
  }

  const minYear = validYears[0];
  const maxYear = validYears[validYears.length - 1];
  const span = maxYear - minYear;

  if (span <= 25) {
    return [
      {
        id: 'era-all',
        label: `${minYear} – ${maxYear}`,
        startYear: minYear,
        endYear: maxYear,
        description: 'The complete chronicle of family memories and records.',
      },
    ];
  }

  const split1 = Math.round(minYear + span * 0.38);
  const split2 = Math.round(minYear + span * 0.72);

  return [
    {
      id: 'foundations',
      label: 'The Foundations',
      startYear: minYear,
      endYear: split1,
      description: 'Ancestral roots, early life, and formative records.',
    },
    {
      id: 'generation-bridge',
      label: 'The Next Generation',
      startYear: split1 + 1,
      endYear: split2,
      description: 'Expansion, weddings, and professional milestones.',
    },
    {
      id: 'modern-family',
      label: 'The Modern Family',
      startYear: split2 + 1,
      endYear: maxYear,
      description: 'Contemporary family memories, global journeys, and modern chapters.',
    },
  ];
}

/**
 * Deterministically enrich a photo with related entities from FamilyStore
 * @param {Object} photo 
 * @param {Object} storeContext { people, lifeEvents, stories, genMap }
 * @returns {Object} enriched photo
 */
export function enrichArchivePhoto(photo, { people = [], lifeEvents = [], stories = [], genMap = new Map() } = {}) {
  if (!photo) return null;

  const peopleMap = people instanceof Map ? people : new Map(people.map((p) => [String(p.id), p]));
  const primaryPerson = peopleMap.get(String(photo.personId)) || null;

  // Derive related people
  const relatedPersonIds = Array.isArray(photo.relatedPersonIds) ? [...photo.relatedPersonIds] : [];
  if (photo.personId && !relatedPersonIds.includes(String(photo.personId))) {
    relatedPersonIds.unshift(String(photo.personId));
  }

  const relatedPeople = relatedPersonIds
    .map((id) => peopleMap.get(String(id)))
    .filter(Boolean);

  const year = extractYear(photo.date);

  // Associated event
  let associatedEvent = null;
  if (photo.eventId) {
    associatedEvent = lifeEvents.find((e) => String(e.id) === String(photo.eventId)) || null;
  }
  if (!associatedEvent && year && photo.personId) {
    // Match event by person and year if available
    associatedEvent = lifeEvents.find((e) => {
      const eYear = extractYear(e.date);
      return eYear === year && (String(e.personId) === String(photo.personId) || (e.relatedPersonIds || []).includes(String(photo.personId)));
    }) || null;
  }

  // Associated story
  let associatedStory = null;
  if (photo.storyId) {
    associatedStory = stories.find((s) => String(s.id) === String(photo.storyId)) || null;
  }
  if (!associatedStory) {
    associatedStory = stories.find((s) => String(s.photoId) === String(photo.id)) || null;
  }
  if (!associatedStory && year && photo.personId) {
    associatedStory = stories.find((s) => {
      const sYear = extractYear(s.date);
      return sYear === year && String(s.personId) === String(photo.personId);
    }) || null;
  }

  // Generation index
  const generation = primaryPerson ? (genMap.get(primaryPerson.id) ?? 0) : null;

  return {
    ...photo,
    primaryPerson,
    relatedPeople,
    associatedEvent,
    associatedStory,
    year,
    generation,
  };
}

/**
 * Deterministically enrich a document with related entities from FamilyStore
 * @param {Object} document 
 * @param {Object} storeContext { people, lifeEvents, stories, genMap }
 * @returns {Object} enriched document
 */
export function enrichArchiveDocument(document, { people = [], lifeEvents = [], stories = [], genMap = new Map() } = {}) {
  if (!document) return null;

  const peopleMap = people instanceof Map ? people : new Map(people.map((p) => [String(p.id), p]));
  const primaryPerson = peopleMap.get(String(document.personId)) || null;

  const relatedPersonIds = Array.isArray(document.relatedPersonIds) ? [...document.relatedPersonIds] : [];
  if (document.personId && !relatedPersonIds.includes(String(document.personId))) {
    relatedPersonIds.unshift(String(document.personId));
  }

  const relatedPeople = relatedPersonIds
    .map((id) => peopleMap.get(String(id)))
    .filter(Boolean);

  const year = extractYear(document.date);

  let associatedEvent = null;
  if (document.eventId) {
    associatedEvent = lifeEvents.find((e) => String(e.id) === String(document.eventId)) || null;
  }
  if (!associatedEvent && year && document.personId) {
    associatedEvent = lifeEvents.find((e) => {
      const eYear = extractYear(e.date);
      return eYear === year && String(e.personId) === String(document.personId);
    }) || null;
  }

  let associatedStory = null;
  if (document.storyId) {
    associatedStory = stories.find((s) => String(s.id) === String(document.storyId)) || null;
  }
  if (!associatedStory) {
    associatedStory = stories.find((s) => String(s.documentId) === String(document.id)) || null;
  }

  const generation = primaryPerson ? (genMap.get(primaryPerson.id) ?? 0) : null;

  return {
    ...document,
    primaryPerson,
    relatedPeople,
    associatedEvent,
    associatedStory,
    year,
    generation,
  };
}

/**
 * Compute deterministic score for photo
 * @param {Object} p 
 * @returns {number}
 */
export function scorePhoto(p) {
  let score = 0;
  if (p.isPrimary) score += 15;
  if (p.associatedEvent) score += 10;
  if (p.associatedStory) score += 10;
  if (p.year) score += 5;
  if (p.location && p.location.trim()) score += 4;
  if (p.relatedPeople && p.relatedPeople.length > 1) score += p.relatedPeople.length * 3;
  if (p.caption && p.caption.length > 20) score += 4;
  return score;
}

/**
 * Compute deterministic score for document
 * @param {Object} d 
 * @returns {number}
 */
export function scoreDocument(d) {
  let score = 0;
  const docTypeLower = (d.type || d.docType || '').toLowerCase();
  if (docTypeLower.includes('birth') || docTypeLower.includes('marriage') || docTypeLower.includes('degree') || docTypeLower.includes('citation')) {
    score += 15;
  }
  if (d.associatedEvent) score += 10;
  if (d.associatedStory) score += 10;
  if (d.year) score += 6;
  if (d.primaryPerson) score += 5;
  if (d.description && d.description.length > 20) score += 4;
  return score;
}

/**
 * Select featured media items deterministically based on contextual richness
 * @param {Array<Object>} enrichedPhotos 
 * @param {Array<Object>} enrichedDocs 
 * @param {number} limit 
 * @returns {{ featuredPhotos: Array<Object>, featuredDocs: Array<Object>, heroItem: Object|null }}
 */
export function selectFeaturedMedia(enrichedPhotos = [], enrichedDocs = [], limit = 4) {
  const scoredPhotos = [...enrichedPhotos].map((p) => ({
    item: p,
    type: 'photo',
    score: scorePhoto(p),
  }));

  const scoredDocs = [...enrichedDocs].map((d) => ({
    item: d,
    type: 'document',
    score: scoreDocument(d),
  }));

  // Sort descending by score, tie-break by year, then id
  scoredPhotos.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const yA = a.item.year || 0;
    const yB = b.item.year || 0;
    if (yB !== yA) return yB - yA;
    return String(a.item.id).localeCompare(String(b.item.id));
  });

  scoredDocs.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const yA = a.item.year || 0;
    const yB = b.item.year || 0;
    if (yB !== yA) return yB - yA;
    return String(a.item.id).localeCompare(String(b.item.id));
  });

  const featuredPhotos = scoredPhotos.slice(0, limit).map((s) => s.item);
  const featuredDocs = scoredDocs.slice(0, limit).map((s) => s.item);

  // Hero is highest scoring photo (or document if no photos)
  const heroItem = featuredPhotos[0] || featuredDocs[0] || null;

  return {
    featuredPhotos,
    featuredDocs,
    heroItem,
  };
}

/**
 * Get recent media items (sorted by createdAt or date descending)
 * @param {Array<Object>} enrichedPhotos 
 * @param {Array<Object>} enrichedDocs 
 * @param {number} limit 
 * @returns {Array<Object>}
 */
export function getRecentArchiveMedia(enrichedPhotos = [], enrichedDocs = [], limit = 6) {
  const combined = [
    ...enrichedPhotos.map((p) => ({ ...p, mediaKind: 'photo' })),
    ...enrichedDocs.map((d) => ({ ...d, mediaKind: 'document' })),
  ];

  combined.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.year ? a.year * 10000000 : 0);
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.year ? b.year * 10000000 : 0);
    if (timeB !== timeA) return timeB - timeA;
    return String(a.id).localeCompare(String(b.id));
  });

  return combined.slice(0, limit);
}

/**
 * Group archive by person
 * @param {Array<Object>} people 
 * @param {Array<Object>} enrichedPhotos 
 * @param {Array<Object>} enrichedDocs 
 * @param {Array<Object>} stories 
 * @param {Array<Object>} lifeEvents 
 * @returns {Array<{ person: Object, photos: Array<Object>, documents: Array<Object>, stories: Array<Object>, events: Array<Object>, totalCount: number }>}
 */
export function getPersonCollections(people = [], enrichedPhotos = [], enrichedDocs = [], stories = [], lifeEvents = []) {
  return people.map((person) => {
    const pId = String(person.id);
    const personPhotos = enrichedPhotos.filter(
      (ph) => String(ph.personId) === pId || (ph.relatedPersonIds || []).includes(pId)
    );
    const personDocs = enrichedDocs.filter(
      (d) => String(d.personId) === pId || (d.relatedPersonIds || []).includes(pId)
    );
    const personStories = stories.filter(
      (s) => String(s.personId) === pId || (s.relatedPersonIds || []).includes(pId)
    );
    const personEvents = lifeEvents.filter(
      (e) => String(e.personId) === pId || (e.relatedPersonIds || []).includes(pId)
    );

    return {
      person,
      photos: personPhotos,
      documents: personDocs,
      stories: personStories,
      events: personEvents,
      totalCount: personPhotos.length + personDocs.length + personStories.length + personEvents.length,
    };
  }).filter((col) => col.totalCount > 0);
}

/**
 * Group archive by event
 * @param {Array<Object>} lifeEvents 
 * @param {Array<Object>} enrichedPhotos 
 * @param {Array<Object>} enrichedDocs 
 * @param {Array<Object>} stories 
 * @returns {Array<{ event: Object, photos: Array<Object>, documents: Array<Object>, stories: Array<Object>, totalCount: number }>}
 */
export function getEventCollections(lifeEvents = [], enrichedPhotos = [], enrichedDocs = [], stories = []) {
  return lifeEvents.map((event) => {
    const eId = String(event.id);
    const eventYear = extractYear(event.date);

    const eventPhotos = enrichedPhotos.filter((ph) => {
      if (ph.associatedEvent && String(ph.associatedEvent.id) === eId) return true;
      if (ph.eventId && String(ph.eventId) === eId) return true;
      return false;
    });

    const eventDocs = enrichedDocs.filter((d) => {
      if (d.associatedEvent && String(d.associatedEvent.id) === eId) return true;
      if (d.eventId && String(d.eventId) === eId) return true;
      return false;
    });

    const eventStories = stories.filter((s) => {
      if (s.eventId && String(s.eventId) === eId) return true;
      return false;
    });

    return {
      event,
      year: eventYear,
      photos: eventPhotos,
      documents: eventDocs,
      stories: eventStories,
      totalCount: eventPhotos.length + eventDocs.length + eventStories.length,
    };
  }).filter((col) => col.totalCount > 0);
}

/**
 * Filter archive photos by active criteria
 * @param {Array<Object>} photos 
 * @param {Object} filters { personId, eventId, year, location, generation, search }
 * @returns {Array<Object>}
 */
export function filterArchivePhotos(photos = [], filters = {}) {
  const { personId, eventId, year, location, generation, search } = filters;
  const searchLower = (search || '').trim().toLowerCase();

  return photos.filter((ph) => {
    if (personId && personId !== 'all') {
      const pIdStr = String(personId);
      const matchesPerson = String(ph.personId) === pIdStr || (ph.relatedPersonIds || []).includes(pIdStr);
      if (!matchesPerson) return false;
    }

    if (eventId && eventId !== 'all') {
      const eIdStr = String(eventId);
      const matchesEvent = (ph.associatedEvent && String(ph.associatedEvent.id) === eIdStr) || String(ph.eventId) === eIdStr;
      if (!matchesEvent) return false;
    }

    if (year && year !== 'all') {
      if (year === 'undated') {
        if (ph.year !== null) return false;
      } else {
        if (ph.year !== parseInt(year, 10)) return false;
      }
    }

    if (location && location !== 'all') {
      const locMatch = ph.location && ph.location.toLowerCase().includes(location.toLowerCase());
      if (!locMatch) return false;
    }

    if (generation !== undefined && generation !== null && generation !== 'all') {
      if (ph.generation !== parseInt(generation, 10)) return false;
    }

    if (searchLower) {
      const matchTitle = (ph.title || '').toLowerCase().includes(searchLower);
      const matchCaption = (ph.caption || '').toLowerCase().includes(searchLower);
      const matchLoc = (ph.location || '').toLowerCase().includes(searchLower);
      const matchPerson = (ph.primaryPerson?.displayName || '').toLowerCase().includes(searchLower);
      if (!matchTitle && !matchCaption && !matchLoc && !matchPerson) return false;
    }

    return true;
  });
}

/**
 * Filter archive documents by active criteria
 * @param {Array<Object>} documents 
 * @param {Object} filters { personId, docType, year, generation, search }
 * @returns {Array<Object>}
 */
export function filterArchiveDocuments(documents = [], filters = {}) {
  const { personId, docType, year, generation, search } = filters;
  const searchLower = (search || '').trim().toLowerCase();

  return documents.filter((doc) => {
    if (personId && personId !== 'all') {
      const pIdStr = String(personId);
      const matchesPerson = String(doc.personId) === pIdStr || (doc.relatedPersonIds || []).includes(pIdStr);
      if (!matchesPerson) return false;
    }

    if (docType && docType !== 'all') {
      const typeStr = (doc.type || doc.docType || '').toLowerCase();
      if (!typeStr.includes(docType.toLowerCase())) return false;
    }

    if (year && year !== 'all') {
      if (year === 'undated') {
        if (doc.year !== null) return false;
      } else {
        if (doc.year !== parseInt(year, 10)) return false;
      }
    }

    if (generation !== undefined && generation !== null && generation !== 'all') {
      if (doc.generation !== parseInt(generation, 10)) return false;
    }

    if (searchLower) {
      const matchName = (doc.name || '').toLowerCase().includes(searchLower);
      const matchDesc = (doc.description || '').toLowerCase().includes(searchLower);
      const matchType = (doc.type || doc.docType || '').toLowerCase().includes(searchLower);
      const matchPerson = (doc.primaryPerson?.displayName || '').toLowerCase().includes(searchLower);
      if (!matchName && !matchDesc && !matchType && !matchPerson) return false;
    }

    return true;
  });
}

/**
 * Extract available filter options with non-zero counts
 * @param {Array<Object>} photos 
 * @param {Array<Object>} documents 
 * @param {Array<Object>} people 
 * @param {Array<Object>} events 
 * @returns {Object}
 */
export function getAvailableArchiveFilters(photos = [], documents = [], people = [], events = []) {
  const yearsSet = new Set();
  const locationsSet = new Set();
  const docTypesSet = new Set();
  const personIdsWithMedia = new Set();
  const eventIdsWithMedia = new Set();

  photos.forEach((p) => {
    if (p.year) yearsSet.add(p.year);
    if (p.location && p.location.trim()) {
      // Shorten to primary city/district if comma separated
      const city = p.location.split(',')[0].trim();
      if (city) locationsSet.add(city);
    }
    if (p.personId) personIdsWithMedia.add(String(p.personId));
    (p.relatedPersonIds || []).forEach((id) => personIdsWithMedia.add(String(id)));
    if (p.associatedEvent) eventIdsWithMedia.add(String(p.associatedEvent.id));
    if (p.eventId) eventIdsWithMedia.add(String(p.eventId));
  });

  documents.forEach((d) => {
    if (d.year) yearsSet.add(d.year);
    const type = d.type || d.docType;
    if (type && type.trim()) docTypesSet.add(type.trim());
    if (d.personId) personIdsWithMedia.add(String(d.personId));
    (d.relatedPersonIds || []).forEach((id) => personIdsWithMedia.add(String(id)));
    if (d.associatedEvent) eventIdsWithMedia.add(String(d.associatedEvent.id));
    if (d.eventId) eventIdsWithMedia.add(String(d.eventId));
  });

  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);
  const availableLocations = Array.from(locationsSet).sort();
  const availableDocTypes = Array.from(docTypesSet).sort();
  const availablePeople = people.filter((p) => personIdsWithMedia.has(String(p.id)));
  const availableEvents = events.filter((e) => eventIdsWithMedia.has(String(e.id)));

  return {
    years: availableYears,
    locations: availableLocations,
    docTypes: availableDocTypes,
    people: availablePeople,
    events: availableEvents,
  };
}
