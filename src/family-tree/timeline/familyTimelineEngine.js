/**
 * Family Timeline Engine
 * Milestone M4B: Pure chronological storytelling logic derived from FamilyStore.
 * 
 * Strict architectural rule: DO NOT duplicate data or create a second event store.
 * Derives timelines, eras, person associations, and media dynamically.
 */

import { getGeneration } from '../data/familyDataService.js';

/**
 * Standard date formatter helper
 */
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function parseEventDate(dateString) {
  if (!dateString || typeof dateString !== 'string' || !dateString.trim()) {
    return {
      year: null,
      month: null,
      day: null,
      formatted: 'Date unknown',
      displayYear: 'Unknown',
      sortKey: '9999-99-99',
      isDated: false,
    };
  }

  const clean = dateString.trim();

  // Pattern 1: YYYY
  if (/^\d{4}$/.test(clean)) {
    const yr = parseInt(clean, 10);
    return {
      year: yr,
      month: null,
      day: null,
      formatted: `${yr}`,
      displayYear: `${yr}`,
      sortKey: `${yr}-01-01`,
      isDated: true,
    };
  }

  // Pattern 2: YYYY-MM-DD or YYYY-MM
  const parts = clean.split('-');
  if (parts.length >= 1 && /^\d{4}$/.test(parts[0])) {
    const yr = parseInt(parts[0], 10);
    const mo = parts[1] && parts[1] !== '00' ? parseInt(parts[1], 10) : null;
    const dy = parts[2] && parts[2] !== '00' ? parseInt(parts[2], 10) : null;

    let formatted = `${yr}`;
    if (mo && mo >= 1 && mo <= 12) {
      const moName = MONTH_NAMES[mo - 1];
      formatted = dy ? `${moName} ${dy}, ${yr}` : `${moName} ${yr}`;
    }

    const sortMo = mo ? String(mo).padStart(2, '0') : '01';
    const sortDy = dy ? String(dy).padStart(2, '0') : '01';

    return {
      year: yr,
      month: mo,
      day: dy,
      formatted,
      displayYear: `${yr}`,
      sortKey: `${yr}-${sortMo}-${sortDy}`,
      isDated: true,
    };
  }

  // Fallback: Date parse attempt
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const yr = parsed.getFullYear();
    const mo = parsed.getMonth() + 1;
    const dy = parsed.getDate();
    return {
      year: yr,
      month: mo,
      day: dy,
      formatted: `${MONTH_NAMES[mo - 1]} ${dy}, ${yr}`,
      displayYear: `${yr}`,
      sortKey: `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`,
      isDated: true,
    };
  }

  return {
    year: null,
    month: null,
    day: null,
    formatted: clean,
    displayYear: 'Unknown',
    sortKey: '9999-99-99',
    isDated: false,
  };
}

/**
 * Deterministic chronological sorting
 * Dated events first (sorted by sortKey, then title, then ID).
 * Undated events after dated events.
 */
export function sortTimelineEvents(events) {
  if (!Array.isArray(events)) return [];

  return [...events].sort((a, b) => {
    const dateA = a._parsedDate || parseEventDate(a.date);
    const dateB = b._parsedDate || parseEventDate(b.date);

    if (dateA.isDated && !dateB.isDated) return -1;
    if (!dateA.isDated && dateB.isDated) return 1;

    if (dateA.isDated && dateB.isDated) {
      if (dateA.sortKey !== dateB.sortKey) {
        return dateA.sortKey.localeCompare(dateB.sortKey);
      }
    }

    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();
    if (titleA !== titleB) {
      return titleA.localeCompare(titleB);
    }

    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

/**
 * Dynamically derive broad family eras from actual event dates.
 * Does NOT hardcode dates; calculates spans from minYear and maxYear.
 */
export function deriveErasFromEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const datedYears = [];
  events.forEach((e) => {
    const parsed = e._parsedDate || parseEventDate(e.date);
    if (parsed.isDated && parsed.year !== null) {
      datedYears.push(parsed.year);
    }
  });

  if (datedYears.length === 0) {
    return [];
  }

  const minYear = Math.min(...datedYears);
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(...datedYears, currentYear);
  const span = maxYear - minYear;

  // Single era if timespan is under 20 years
  if (span < 20) {
    return [
      {
        id: 'era-all',
        name: 'FAMILY JOURNEY',
        startYear: minYear,
        endYear: maxYear,
        displayRange: `${minYear} – ${maxYear >= currentYear ? 'Present' : maxYear}`,
      },
    ];
  }

  // 2 Eras if timespan is between 20 and 45 years
  if (span <= 45) {
    const mid = Math.floor(minYear + span / 2);
    return [
      {
        id: 'era-foundations',
        name: 'EARLY YEARS',
        startYear: minYear,
        endYear: mid,
        displayRange: `${minYear} – ${mid}`,
      },
      {
        id: 'era-modern',
        name: 'CONTEMPORARY GENERATION',
        startYear: mid + 1,
        endYear: maxYear,
        displayRange: `${mid + 1} – ${maxYear >= currentYear ? 'Present' : maxYear}`,
      },
    ];
  }

  // 4 Broad Eras for comprehensive multigenerational family trees (~100+ years)
  // Approximate standard generational phases derived dynamically:
  const quarter1 = Math.round(minYear + span * 0.28);
  const quarter2 = Math.round(minYear + span * 0.55);
  const quarter3 = Math.round(minYear + span * 0.80);

  return [
    {
      id: 'era-1',
      name: 'THE FOUNDATIONS',
      subtitle: 'Ancestors, Origins & Early Roots',
      startYear: minYear,
      endYear: quarter1,
      displayRange: `${minYear} – ${quarter1}`,
    },
    {
      id: 'era-2',
      name: 'THE NEXT GENERATION',
      subtitle: 'Growth, Education & Maturing Lines',
      startYear: quarter1 + 1,
      endYear: quarter2,
      displayRange: `${quarter1 + 1} – ${quarter2}`,
    },
    {
      id: 'era-3',
      name: 'THE MODERN FAMILY',
      subtitle: 'Milestones, Expansion & Careers',
      startYear: quarter2 + 1,
      endYear: quarter3,
      displayRange: `${quarter2 + 1} – ${quarter3}`,
    },
    {
      id: 'era-4',
      name: 'TODAY & BEYOND',
      subtitle: 'Current Generations & Future Legacy',
      startYear: quarter3 + 1,
      endYear: maxYear,
      displayRange: `${quarter3 + 1} – Present`,
    },
  ];
}

/**
 * Assigns an event to its matching era
 */
export function getEraForEvent(event, eras) {
  const parsed = event._parsedDate || parseEventDate(event.date);
  if (!parsed.isDated || parsed.year === null) {
    return null; // Undated
  }

  const yr = parsed.year;
  for (const era of eras) {
    if (yr >= era.startYear && yr <= era.endYear) {
      return era;
    }
  }

  // Fallback to nearest era
  if (eras.length > 0) {
    if (yr < eras[0].startYear) return eras[0];
    return eras[eras.length - 1];
  }

  return null;
}

/**
 * Enriches lifeEvents with associated people, photos, generations, and parsed dates
 * Operates purely over FamilyStore / snapshot
 */
export function enrichTimelineEvents(lifeEvents, store) {
  if (!Array.isArray(lifeEvents) || !store) return [];

  return lifeEvents.map((event) => {
    const parsedDate = parseEventDate(event.date);

    // Primary attached person
    const primaryPerson = store.getPersonById(event.personId) || null;

    // Related people
    const relatedPersons = (event.relatedPersonIds || [])
      .map((id) => store.getPersonById(id))
      .filter(Boolean);

    // Combined unique persons associated with this event
    const allAssociatedPeople = [];
    const seenIds = new Set();
    if (primaryPerson) {
      allAssociatedPeople.push(primaryPerson);
      seenIds.add(primaryPerson.id);
    }
    relatedPersons.forEach((rp) => {
      if (!seenIds.has(rp.id)) {
        seenIds.add(rp.id);
        allAssociatedPeople.push(rp);
      }
    });

    // Primary person's generation
    const gen = primaryPerson ? getGeneration(primaryPerson.id) : 0;

    // Check for associated photo in person's photo album if event mentions it
    let associatedPhoto = null;
    if (primaryPerson) {
      const photos = typeof store.getPhotosForPerson === 'function'
        ? store.getPhotosForPerson(primaryPerson.id)
        : [];
      
      // Look for a photo taken near this event date or matching title
      if (photos.length > 0) {
        if (event.photoId) {
          associatedPhoto = photos.find((p) => p.id === event.photoId) || null;
        }
        if (!associatedPhoto && parsedDate.year) {
          associatedPhoto = photos.find((p) => {
            const py = p.date ? String(p.date) : '';
            return py.includes(String(parsedDate.year));
          }) || null;
        }
        // Fallback to primary person portrait if no specific album photo matched
        if (!associatedPhoto && (primaryPerson.photo || primaryPerson.photoUrl)) {
          associatedPhoto = {
            id: `photo-primary-${primaryPerson.id}`,
            personId: primaryPerson.id,
            src: primaryPerson.photo || primaryPerson.photoUrl,
            title: primaryPerson.displayName,
            isPrimary: true,
          };
        }
      }
    }

    return {
      ...event,
      _parsedDate: parsedDate,
      primaryPerson,
      relatedPersons,
      allAssociatedPeople,
      generation: gen,
      associatedPhoto,
    };
  });
}

/**
 * Filters enriched timeline events
 */
export function filterTimelineEvents(events, { eraId = 'all', generation = 'all', personId = 'all', category = 'all' } = {}) {
  if (!Array.isArray(events)) return [];

  return events.filter((e) => {
    // Era Filter
    if (eraId && eraId !== 'all') {
      if (eraId === 'undated') {
        if (e._parsedDate?.isDated) return false;
      } else {
        if (e._eraId !== eraId) return false;
      }
    }

    // Generation Filter
    if (generation !== 'all') {
      const genNum = typeof generation === 'string' ? parseInt(generation, 10) : generation;
      if (e.generation !== genNum) return false;
    }

    // Person Filter
    if (personId && personId !== 'all') {
      const targetId = String(personId);
      const hasPerson = e.personId === targetId || (e.relatedPersonIds || []).includes(targetId);
      if (!hasPerson) return false;
    }

    // Category / Event Type Filter
    if (category && category !== 'all') {
      if ((e.type || '').toLowerCase() !== category.toLowerCase()) return false;
    }

    return true;
  });
}

/**
 * Collects distinct categories, generations, and people who have events
 */
export function getAvailableTimelineFilters(enrichedEvents) {
  const categories = new Set();
  const generations = new Set();
  const personMap = new Map();

  enrichedEvents.forEach((e) => {
    if (e.type) categories.add(e.type);
    if (e.generation !== undefined && e.generation !== null) {
      generations.add(e.generation);
    }
    if (e.primaryPerson) {
      personMap.set(e.primaryPerson.id, e.primaryPerson);
    }
    (e.relatedPersons || []).forEach((rp) => {
      personMap.set(rp.id, rp);
    });
  });

  return {
    categories: Array.from(categories).sort(),
    generations: Array.from(generations).sort((a, b) => a - b),
    people: Array.from(personMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName)),
  };
}
