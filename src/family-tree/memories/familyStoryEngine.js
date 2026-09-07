/**
 * familyStoryEngine.js — Pure Story & Memory Engine (Milestone M4C)
 * 
 * Provides deterministic ranking, dynamic era derivation, story enrichment,
 * filtering, and relationship resolutions without modifying or duplicating FamilyStore.
 */

/**
 * Parses numeric year from a date string or year number.
 * Returns null if invalid or missing.
 */
export function extractStoryYear(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'number' && Number.isFinite(dateValue)) {
    return dateValue;
  }
  const str = String(dateValue).trim();
  const match = str.match(/\b(\d{4})\b/);
  if (match) {
    const y = parseInt(match[1], 10);
    if (y >= 1000 && y <= 2100) return y;
  }
  return null;
}

/**
 * Calculates estimated reading time in minutes.
 */
export function calculateReadingTime(text = '') {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

/**
 * Enriches a raw story record with connected entity objects from FamilyStore.
 * Safe for null/missing store or entities.
 */
export function enrichStory(story, store) {
  if (!story) return null;

  const year = extractStoryYear(story.date);
  const readingTimeMinutes = calculateReadingTime(story.content);

  if (!store) {
    return {
      ...story,
      year,
      readingTimeMinutes,
      primaryPerson: null,
      relatedPeople: [],
      associatedPhoto: null,
      associatedEvent: null,
      associatedDocument: null,
      narratorPerson: null,
    };
  }

  // 1. Resolve Primary Person
  const primaryPerson = story.personId ? store.getPersonById(story.personId) || null : null;

  // 2. Resolve Related People
  const relatedPeople = [];
  const seenIds = new Set();
  if (Array.isArray(story.relatedPersonIds)) {
    story.relatedPersonIds.forEach((id) => {
      const pId = String(id);
      if (!seenIds.has(pId) && pId !== String(story.personId)) {
        seenIds.add(pId);
        const p = store.getPersonById(pId);
        if (p) relatedPeople.push(p);
      }
    });
  }

  // 3. Resolve Associated Photo
  let associatedPhoto = null;
  if (story.photoId) {
    associatedPhoto = store.photos?.find((ph) => ph.id === String(story.photoId)) || null;
  }
  if (!associatedPhoto && story.personId) {
    // Fallback to primary photo or first photo of primary person
    const personPhotos = store.getPhotosForPerson ? store.getPhotosForPerson(story.personId) : [];
    associatedPhoto = personPhotos.find((ph) => ph.isPrimary) || personPhotos[0] || null;
  }
  if (!associatedPhoto && primaryPerson?.photo) {
    // Synthesize fallback photo record if person has photo url
    associatedPhoto = {
      id: `photo-person-${primaryPerson.id}`,
      personId: primaryPerson.id,
      src: primaryPerson.photo,
      title: `${primaryPerson.displayName} portrait`,
    };
  }

  // 4. Resolve Associated Life Event
  let associatedEvent = null;
  if (story.eventId) {
    associatedEvent = store.lifeEvents?.find((ev) => ev.id === String(story.eventId)) || null;
  } else if (story.personId && year) {
    // Best effort: find event for this person in the exact same year
    const personEvents = store.getEventsForPerson ? store.getEventsForPerson(story.personId) : [];
    associatedEvent = personEvents.find((ev) => extractStoryYear(ev.date) === year) || null;
  }

  // 5. Resolve Associated Document
  let associatedDocument = null;
  if (story.documentId) {
    associatedDocument = store.documents?.find((d) => d.id === String(story.documentId)) || null;
  }

  // 6. Resolve Narrator Person if matching an existing family member
  let narratorPerson = null;
  if (story.narrator && store.people) {
    const narratorTrimmed = story.narrator.trim().toLowerCase();
    for (const p of store.people.values()) {
      if (
        p.displayName?.toLowerCase() === narratorTrimmed ||
        `${p.firstName} ${p.lastName}`.toLowerCase() === narratorTrimmed
      ) {
        narratorPerson = p;
        break;
      }
    }
  }

  return {
    ...story,
    year,
    readingTimeMinutes,
    primaryPerson,
    relatedPeople,
    associatedPhoto,
    associatedEvent,
    associatedDocument,
    narratorPerson,
  };
}

/**
 * Dynamically derives family historical eras/chapters from actual story and event dates.
 * Never hardcodes date ranges.
 */
export function deriveStoryEras(stories = [], lifeEvents = []) {
  const allYears = [];

  stories.forEach((s) => {
    const y = extractStoryYear(s.date);
    if (y) allYears.push(y);
  });

  lifeEvents.forEach((e) => {
    const y = extractStoryYear(e.date);
    if (y) allYears.push(y);
  });

  // Default baseline era if insufficient date data exists
  if (allYears.length === 0) {
    return [
      {
        id: 'era-archive',
        name: 'FAMILY MEMORIES',
        subtitle: 'The Collected Stories',
        displayRange: 'Timeless',
        startYear: -Infinity,
        endYear: Infinity,
      },
    ];
  }

  allYears.sort((a, b) => a - b);
  const minYear = allYears[0];
  const maxYear = allYears[allYears.length - 1];
  const span = maxYear - minYear;

  // Single era if timespan is short
  if (span <= 15) {
    return [
      {
        id: 'era-continuous',
        name: 'OUR LIVING ARCHIVE',
        subtitle: 'Spoken Legacies and Memories',
        displayRange: `${minYear} — ${maxYear}`,
        startYear: minYear,
        endYear: maxYear,
      },
    ];
  }

  // Two eras for modest timespan
  if (span <= 35) {
    const mid = Math.round(minYear + span / 2);
    return [
      {
        id: 'era-foundations',
        name: 'THE FOUNDATIONS',
        subtitle: 'Early Roots & Heritage',
        displayRange: `${minYear} — ${mid}`,
        startYear: minYear,
        endYear: mid,
      },
      {
        id: 'era-contemporary',
        name: 'THE NEXT GENERATION',
        subtitle: 'Growth & Modern Chapters',
        displayRange: `${mid + 1} — ${maxYear}`,
        startYear: mid + 1,
        endYear: maxYear,
      },
    ];
  }

  // Three to four eras for multi-generational span (> 35 years)
  const step = Math.ceil(span / 4);
  const y1 = minYear + step;
  const y2 = y1 + step;
  const y3 = y2 + step;

  return [
    {
      id: 'era-roots',
      name: 'THE FOUNDATIONS',
      subtitle: 'Origins, Ancestral Lands & First Steps',
      displayRange: `${minYear} — ${y1}`,
      startYear: minYear,
      endYear: y1,
    },
    {
      id: 'era-growth',
      name: 'BUILDING THE FAMILY',
      subtitle: 'Marriages, Milestones & Migrations',
      displayRange: `${y1 + 1} — ${y2}`,
      startYear: y1 + 1,
      endYear: y2,
    },
    {
      id: 'era-expansion',
      name: 'THE NEXT GENERATION',
      subtitle: 'New Horizons, Careers & Global Pathways',
      displayRange: `${y2 + 1} — ${y3}`,
      startYear: y2 + 1,
      endYear: y3,
    },
    {
      id: 'era-today',
      name: 'TODAY',
      subtitle: 'Living Memory & Continuing Traditions',
      displayRange: `${y3 + 1} — Present`,
      startYear: y3 + 1,
      endYear: Infinity,
    },
  ];
}

/**
 * Finds which era a given story belongs to.
 * Returns null if story has no year (placed in Undated).
 */
export function getEraForStory(story, eras = []) {
  const y = story.year || extractStoryYear(story.date);
  if (!y) return null;

  for (const era of eras) {
    if (y >= era.startYear && y <= era.endYear) {
      return era;
    }
  }

  return eras[eras.length - 1] || null;
}

/**
 * Selects a featured story with deterministic scoring:
 * Prioritizes story with photos, rich narrative length, linked events, and recency.
 */
export function selectFeaturedStory(stories = [], preferredStoryId = null) {
  if (!stories || stories.length === 0) return null;

  if (preferredStoryId) {
    const found = stories.find((s) => s.id === String(preferredStoryId));
    if (found) return found;
  }

  let bestStory = stories[0];
  let bestScore = -1;

  stories.forEach((s) => {
    let score = 0;
    if (s.associatedPhoto || s.photoId) score += 40;
    if (s.content && s.content.length > 200) score += 20;
    if (s.year) score += 10;
    if (Array.isArray(s.relatedPersonIds) && s.relatedPersonIds.length > 0) score += 10;
    if (s.associatedEvent || s.eventId) score += 10;
    if (s.narrator) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestStory = s;
    }
  });

  return bestStory;
}

/**
 * Deterministic related memories ranking:
 * 1. Same primary person: +50
 * 2. Shared related people: +25 each
 * 3. Same linked event: +20
 * 4. Same location: +15
 * 5. Same decade / era: +10
 * 6. Same narrator: +5
 */
export function getRelatedStories(targetStory, allStories = [], limit = 3) {
  if (!targetStory || !allStories || allStories.length === 0) return [];

  const targetId = String(targetStory.id);
  const targetYear = targetStory.year || extractStoryYear(targetStory.date);
  const targetRelatedSet = new Set(
    Array.isArray(targetStory.relatedPersonIds) ? targetStory.relatedPersonIds.map(String) : []
  );

  const scored = [];

  allStories.forEach((candidate) => {
    if (String(candidate.id) === targetId) return;

    let score = 0;

    // 1. Same primary person
    if (candidate.personId && candidate.personId === targetStory.personId) {
      score += 50;
    }

    // 2. Shared related people
    if (Array.isArray(candidate.relatedPersonIds)) {
      candidate.relatedPersonIds.forEach((pId) => {
        if (targetRelatedSet.has(String(pId))) {
          score += 25;
        }
        if (String(pId) === String(targetStory.personId)) {
          score += 20;
        }
      });
    }
    if (targetRelatedSet.has(String(candidate.personId))) {
      score += 20;
    }

    // 3. Same event
    if (
      candidate.eventId &&
      targetStory.eventId &&
      String(candidate.eventId) === String(targetStory.eventId)
    ) {
      score += 20;
    }

    // 4. Same location
    if (
      candidate.location &&
      targetStory.location &&
      candidate.location.trim().toLowerCase() === targetStory.location.trim().toLowerCase()
    ) {
      score += 15;
    }

    // 5. Same era / decade
    const candYear = candidate.year || extractStoryYear(candidate.date);
    if (candYear && targetYear) {
      if (Math.abs(candYear - targetYear) <= 5) {
        score += 10;
      } else if (Math.abs(candYear - targetYear) <= 12) {
        score += 5;
      }
    }

    // 6. Same narrator
    if (
      candidate.narrator &&
      targetStory.narrator &&
      candidate.narrator.trim().toLowerCase() === targetStory.narrator.trim().toLowerCase()
    ) {
      score += 5;
    }

    if (score > 0) {
      scored.push({ story: candidate, score });
    }
  });

  // Sort by score descending; tiebreaker: year descending, then title
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const yA = a.story.year || extractStoryYear(a.story.date) || 0;
    const yB = b.story.year || extractStoryYear(b.story.date) || 0;
    if (yB !== yA) return yB - yA;
    return String(a.story.title || '').localeCompare(String(b.story.title || ''));
  });

  return scored.slice(0, limit).map((item) => item.story);
}

/**
 * Filters stories by person, generation, era, and location.
 */
export function filterStories(stories = [], filters = {}, store = null, eras = []) {
  if (!stories || stories.length === 0) return [];

  const { personId = 'all', generation = 'all', eraId = 'all', location = 'all' } = filters;

  return stories.filter((story) => {
    // 1. Person filter (matches primary or related person)
    if (personId !== 'all') {
      const pId = String(personId);
      const isPrimary = String(story.personId) === pId;
      const isRelated = Array.isArray(story.relatedPersonIds) && story.relatedPersonIds.map(String).includes(pId);
      if (!isPrimary && !isRelated) return false;
    }

    // 2. Generation filter
    if (generation !== 'all' && store && store.calculateGenerations) {
      const genMap = store.calculateGenerations();
      const primaryGen = genMap.get(String(story.personId));
      if (String(primaryGen) !== String(generation)) {
        return false;
      }
    }

    // 3. Era filter
    if (eraId !== 'all') {
      const era = getEraForStory(story, eras);
      if (eraId === 'undated') {
        if (era !== null) return false;
      } else {
        if (!era || era.id !== eraId) return false;
      }
    }

    // 4. Location filter
    if (location !== 'all') {
      const loc = String(story.location || '').trim().toLowerCase();
      if (loc !== String(location).trim().toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extracts available filter choices from current story list.
 * Only returns options that have actual records.
 */
export function getAvailableStoryFilters(stories = [], store = null, eras = []) {
  const peopleMap = new Map();
  const generationSet = new Set();
  const locationSet = new Set();
  const eraIdSet = new Set();
  let hasUndated = false;

  const genMap = store && typeof store.calculateGenerations === 'function'
    ? store.calculateGenerations()
    : new Map();

  stories.forEach((story) => {
    // People
    if (story.primaryPerson) {
      peopleMap.set(story.primaryPerson.id, story.primaryPerson);
    } else if (story.personId && store) {
      const p = store.getPersonById(story.personId);
      if (p) peopleMap.set(p.id, p);
    }
    if (Array.isArray(story.relatedPeople)) {
      story.relatedPeople.forEach((p) => peopleMap.set(p.id, p));
    }

    // Generation
    if (story.personId && genMap.has(String(story.personId))) {
      generationSet.add(genMap.get(String(story.personId)));
    }

    // Location
    if (story.location && story.location.trim()) {
      locationSet.add(story.location.trim());
    }

    // Era
    const era = getEraForStory(story, eras);
    if (era) {
      eraIdSet.add(era.id);
    } else {
      hasUndated = true;
    }
  });

  const availableEras = eras.filter((era) => eraIdSet.has(era.id));
  if (hasUndated) {
    availableEras.push({
      id: 'undated',
      name: 'UNDATED MEMORIES',
      subtitle: 'Stories without a specific recorded date',
      displayRange: 'Timeless',
    });
  }

  const sortedPeople = Array.from(peopleMap.values()).sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '')
  );

  const sortedGens = Array.from(generationSet).sort((a, b) => a - b);
  const sortedLocations = Array.from(locationSet).sort((a, b) => a.localeCompare(b));

  return {
    people: sortedPeople,
    generations: sortedGens,
    eras: availableEras,
    locations: sortedLocations,
  };
}
