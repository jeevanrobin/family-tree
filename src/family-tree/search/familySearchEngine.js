/**
 * Global Family Search & Discovery Engine — Milestone M4A
 *
 * Deterministic, client-side, zero-dependency in-memory search and ranking engine.
 * Indexes and discovers across:
 * - People (names, nicknames, locations, occupations, bio, notes, dates)
 * - Stories (titles, story content, locations, dates, attached persons)
 * - Life Events (titles, descriptions, locations, dates, event types, attached persons)
 * - Photos (titles, captions, dates, locations, attached persons)
 * - Documents (titles, descriptions, dates, doc types, attached persons)
 * - Relationships (dynamically derived from existing relationship graph)
 *
 * Ranking Algorithm:
 * 1. Exact match on primary name/title (score 100)
 * 2. Prefix match on primary name/title (score 80)
 * 3. Word-boundary / partial match on name/title (score 60)
 * 4. Exact field match (occupation, location, year) (score 45)
 * 5. Attached person entity match (score 35)
 * 6. Full-text / content match (story body, event description, bio) (score 20)
 *
 * People results receive a calibrated priority tier for person queries so people
 * rank before archival mentions of that person.
 */

/**
 * Normalizes query string: trims, lowercases, collapses extra whitespaces.
 */
export function normalizeQuery(query) {
  if (!query || typeof query !== 'string') return '';
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Derives relationship pairs directly from existing relationships and people map.
 * Does NOT create a separate persistent store.
 */
export function deriveRelationshipItems(relationships = [], peopleMap = new Map()) {
  const items = [];
  if (!relationships || !Array.isArray(relationships)) return items;

  relationships.forEach((rel) => {
    if (rel.type === 'spouse') {
      const p1Id = String(rel.personAId || rel.personId1 || '');
      const p2Id = String(rel.personBId || rel.personId2 || '');
      const p1 = peopleMap.get(p1Id);
      const p2 = peopleMap.get(p2Id);
      if (p1 && p2) {
        items.push({
          id: rel.id || `rel-spouse-${p1Id}-${p2Id}`,
          type: 'relationship',
          subType: 'spouse',
          title: `${p1.displayName} & ${p2.displayName}`,
          subtitle: 'Spouse / Marriage Union',
          personId: p1Id,
          secondaryPersonId: p2Id,
          attachedPersonNames: [p1.displayName, p2.displayName],
          date: rel.startDate || '',
          raw: rel,
        });
      }
    } else if (rel.type === 'parent-child' || rel.type === 'parent') {
      const parentId = String(rel.parentId || rel.personId1 || '');
      const childId = String(rel.childId || rel.personId2 || '');
      const parent = peopleMap.get(parentId);
      const child = peopleMap.get(childId);
      if (parent && child) {
        const parentRole = parent.gender === 'female' ? 'Mother' : parent.gender === 'male' ? 'Father' : 'Parent';
        const childRole = child.gender === 'female' ? 'Daughter' : child.gender === 'male' ? 'Son' : 'Child';
        items.push({
          id: rel.id || `rel-pc-${parentId}-${childId}`,
          type: 'relationship',
          subType: 'parent-child',
          title: `${parent.displayName} & ${child.displayName}`,
          subtitle: `${parentRole} & ${childRole}`,
          personId: parentId,
          secondaryPersonId: childId,
          attachedPersonNames: [parent.displayName, child.displayName],
          date: '',
          raw: rel,
        });
      }
    } else if (rel.type === 'sibling') {
      const p1Id = String(rel.personAId || rel.personId1 || '');
      const p2Id = String(rel.personBId || rel.personId2 || '');
      const p1 = peopleMap.get(p1Id);
      const p2 = peopleMap.get(p2Id);
      if (p1 && p2) {
        items.push({
          id: rel.id || `rel-sibling-${p1Id}-${p2Id}`,
          type: 'relationship',
          subType: 'sibling',
          title: `${p1.displayName} & ${p2.displayName}`,
          subtitle: 'Siblings',
          personId: p1Id,
          secondaryPersonId: p2Id,
          attachedPersonNames: [p1.displayName, p2.displayName],
          date: '',
          raw: rel,
        });
      }
    }
  });

  return items;
}

/**
 * Builds a fast in-memory searchable index from a snapshot of the family archive.
 */
export function buildSearchIndex(snapshot = {}) {
  const peopleArray = snapshot.people || [];
  const relationshipsArray = snapshot.relationships || [];
  const storiesArray = snapshot.stories || [];
  const eventsArray = snapshot.lifeEvents || [];
  const photosArray = snapshot.photos || [];
  const documentsArray = snapshot.documents || [];

  // Map for fast person lookup by ID
  const peopleMap = new Map();
  peopleArray.forEach((p) => {
    peopleMap.set(String(p.id), p);
  });

  const getNamesForIds = (ids) => {
    if (!ids || !Array.isArray(ids)) return [];
    return ids
      .map((id) => peopleMap.get(String(id))?.displayName)
      .filter(Boolean);
  };

  // 1. Index People
  const indexedPeople = peopleArray.map((p) => {
    const names = [
      p.displayName,
      p.firstName,
      p.middleName,
      p.lastName,
      p.nickname,
    ].filter(Boolean);

    const locations = [
      p.placeOfBirth,
      p.hometown,
      p.currentLocation,
    ].filter(Boolean);

    const birthYear = p.dateOfBirth ? String(p.dateOfBirth).split('-')[0] : '';
    const deathYear = p.dateOfDeath ? String(p.dateOfDeath).split('-')[0] : '';
    const lifespan = birthYear && deathYear
      ? `${birthYear} — ${deathYear}`
      : birthYear
      ? `${birthYear} — Present`
      : '';

    return {
      id: String(p.id),
      type: 'person',
      title: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed',
      subtitle: [lifespan, p.occupation, p.currentLocation || p.placeOfBirth].filter(Boolean).join(' · '),
      names,
      occupation: p.occupation || '',
      locations,
      birthYear,
      deathYear,
      lifespan,
      biography: p.biography || '',
      notes: p.notes || '',
      dateOfBirth: p.dateOfBirth || '',
      dateOfDeath: p.dateOfDeath || '',
      personId: String(p.id),
      attachedPersonNames: [],
      raw: p,
    };
  });

  // 2. Index Stories
  const indexedStories = storiesArray.map((s) => {
    const mainPerson = peopleMap.get(String(s.personId));
    const attachedNames = Array.from(new Set([
      mainPerson?.displayName,
      ...getNamesForIds(s.relatedPersonIds),
    ].filter(Boolean)));

    const snippet = (s.content || s.story || '').replace(/\s+/g, ' ').trim();
    const dateStr = s.date || (s.year ? String(s.year) : '');

    return {
      id: String(s.id),
      type: 'story',
      title: s.title || 'Untitled Story',
      subtitle: [attachedNames.join(', '), s.location, dateStr].filter(Boolean).join(' · '),
      content: snippet,
      narrator: s.narrator || '',
      location: s.location || '',
      date: dateStr,
      personId: String(s.personId || ''),
      attachedPersonNames: attachedNames,
      raw: s,
    };
  });

  // 3. Index Life Events
  const indexedEvents = eventsArray.map((e) => {
    const mainPerson = peopleMap.get(String(e.personId));
    const attachedNames = Array.from(new Set([
      mainPerson?.displayName,
      ...getNamesForIds(e.relatedPersonIds),
    ].filter(Boolean)));

    const dateStr = e.date || '';
    const formattedYear = dateStr ? dateStr.split('-')[0] : '';

    return {
      id: String(e.id),
      type: 'event',
      title: e.title || 'Life Event',
      subtitle: [e.type, formattedYear || dateStr, e.location].filter(Boolean).join(' · '),
      description: e.description || '',
      eventType: e.type || 'Milestone',
      date: dateStr,
      location: e.location || '',
      personId: String(e.personId || ''),
      attachedPersonNames: attachedNames,
      raw: e,
    };
  });

  // 4. Index Photos
  const indexedPhotos = photosArray.map((ph) => {
    const mainPerson = peopleMap.get(String(ph.personId));
    const attachedNames = Array.from(new Set([
      mainPerson?.displayName,
      ...getNamesForIds(ph.relatedPersonIds),
    ].filter(Boolean)));

    const dateStr = ph.date || (ph.year ? String(ph.year) : '');
    const filename = (ph.storagePath || ph.storage_path || ph.src || '').split('/').pop() || '';

    return {
      id: String(ph.id),
      type: 'photo',
      title: ph.title || ph.caption || 'Family Photograph',
      subtitle: [dateStr, ph.location, attachedNames[0]].filter(Boolean).join(' · '),
      caption: ph.caption || '',
      date: dateStr,
      location: ph.location || '',
      filename,
      personId: String(ph.personId || ''),
      attachedPersonNames: attachedNames,
      raw: ph,
    };
  });

  // 5. Index Archival Documents
  const indexedDocuments = documentsArray.map((d) => {
    const mainPerson = peopleMap.get(String(d.personId));
    const attachedNames = Array.from(new Set([mainPerson?.displayName].filter(Boolean)));
    const filename = (d.src || d.storagePath || d.storage_path || '').split('/').pop() || '';

    return {
      id: String(d.id),
      type: 'document',
      title: d.name || d.title || 'Archival Document',
      subtitle: [d.docType || d.type, d.date, attachedNames[0]].filter(Boolean).join(' · '),
      description: d.description || '',
      docType: d.docType || d.type || 'Document',
      date: d.date || '',
      filename,
      personId: String(d.personId || ''),
      attachedPersonNames: attachedNames,
      raw: d,
    };
  });

  // 6. Index Derived Relationships
  const indexedRelationships = deriveRelationshipItems(relationshipsArray, peopleMap);

  return {
    people: indexedPeople,
    stories: indexedStories,
    events: indexedEvents,
    photos: indexedPhotos,
    documents: indexedDocuments,
    relationships: indexedRelationships,
    peopleMap,
  };
}

/**
 * Calculates score for a single indexed entity against normalized query terms.
 */
function scoreEntity(item, q, qTokens) {
  let score = 0;
  const matches = [];

  const titleLower = (item.title || '').toLowerCase();

  // 1. Exact title / primary name match
  if (titleLower === q) {
    score += (item.type === 'person' ? 250 : 100);
    matches.push({ field: 'title', type: 'exact' });
  } else if (titleLower.startsWith(q)) {
    // 2. Prefix match
    score += (item.type === 'person' ? 140 : 80);
    matches.push({ field: 'title', type: 'prefix' });
  } else if (titleLower.includes(q)) {
    // 3. Partial substring match in title
    score += (item.type === 'person' ? 80 : 60);
    matches.push({ field: 'title', type: 'partial' });
  } else {
    // Word-boundary token matches in title
    const allTokensInTitle = qTokens.every((t) => titleLower.includes(t));
    if (allTokensInTitle) {
      score += (item.type === 'person' ? 75 : 55);
      matches.push({ field: 'title', type: 'tokens' });
    }
  }

  // Type-specific field matching
  if (item.type === 'person') {
    // Check aliases, first/middle/last name
    for (const name of item.names) {
      const nl = name.toLowerCase();
      if (nl === q) {
        score = Math.max(score, 200);
        matches.push({ field: 'name', type: 'exact' });
      } else if (nl.startsWith(q)) {
        score = Math.max(score, 120);
        matches.push({ field: 'name', type: 'prefix' });
      } else if (nl.includes(q)) {
        score = Math.max(score, 70);
        matches.push({ field: 'name', type: 'partial' });
      }
    }

    // Occupation
    const occLower = (item.occupation || '').toLowerCase();
    if (occLower === q) {
      score += 55;
      matches.push({ field: 'occupation', type: 'exact' });
    } else if (occLower.includes(q)) {
      score += 40;
      matches.push({ field: 'occupation', type: 'partial' });
    }

    // Location
    for (const loc of item.locations) {
      const locLower = loc.toLowerCase();
      if (locLower.includes(q)) {
        score += 35;
        matches.push({ field: 'location', type: 'partial' });
        break;
      }
    }

    // Dates / Years
    if (
      (item.birthYear && item.birthYear.includes(q)) ||
      (item.deathYear && item.deathYear.includes(q)) ||
      (item.dateOfBirth && item.dateOfBirth.includes(q)) ||
      (item.dateOfDeath && item.dateOfDeath.includes(q))
    ) {
      score += 30;
      matches.push({ field: 'date', type: 'partial' });
    }

    // Biography & Notes
    const bioLower = (item.biography || '').toLowerCase();
    const notesLower = (item.notes || '').toLowerCase();
    if (bioLower.includes(q) || notesLower.includes(q)) {
      score += 20;
      matches.push({ field: 'biography', type: 'content' });
    }

    // Calibrated boost: A person matching on name should rank above an entity mentioning that name
    if (matches.some((m) => m.field === 'title' || m.field === 'name')) {
      score += 75;
    } else if (score > 0) {
      score += 15;
    }
  } else if (item.type === 'story') {
    // Content / body text
    const contentLower = (item.content || '').toLowerCase();
    if (contentLower.includes(q)) {
      score += 25;
      matches.push({ field: 'content', type: 'content' });
    }

    // Location & Date
    if (item.location && item.location.toLowerCase().includes(q)) {
      score += 25;
      matches.push({ field: 'location', type: 'partial' });
    }
    if (item.date && item.date.toLowerCase().includes(q)) {
      score += 20;
      matches.push({ field: 'date', type: 'partial' });
    }

    // Attached person names
    for (const name of item.attachedPersonNames) {
      const nl = name.toLowerCase();
      if (nl === q) {
        score += 35;
        matches.push({ field: 'attachedPerson', type: 'exact' });
      } else if (nl.includes(q)) {
        score += 25;
        matches.push({ field: 'attachedPerson', type: 'partial' });
      }
    }
  } else if (item.type === 'event') {
    // Description
    const descLower = (item.description || '').toLowerCase();
    if (descLower.includes(q)) {
      score += 25;
      matches.push({ field: 'description', type: 'content' });
    }

    // Event type
    const typeLower = (item.eventType || '').toLowerCase();
    if (typeLower.includes(q)) {
      score += 30;
      matches.push({ field: 'eventType', type: 'partial' });
    }

    // Location & Date
    if (item.location && item.location.toLowerCase().includes(q)) {
      score += 30;
      matches.push({ field: 'location', type: 'partial' });
    }
    if (item.date && item.date.toLowerCase().includes(q)) {
      score += 25;
      matches.push({ field: 'date', type: 'partial' });
    }

    // Attached person names
    for (const name of item.attachedPersonNames) {
      const nl = name.toLowerCase();
      if (nl === q) {
        score += 35;
        matches.push({ field: 'attachedPerson', type: 'exact' });
      } else if (nl.includes(q)) {
        score += 25;
        matches.push({ field: 'attachedPerson', type: 'partial' });
      }
    }
  } else if (item.type === 'photo') {
    // Caption
    const capLower = (item.caption || '').toLowerCase();
    if (capLower.includes(q)) {
      score += 30;
      matches.push({ field: 'caption', type: 'content' });
    }

    // Filename
    if (item.filename && item.filename.toLowerCase().includes(q)) {
      score += 25;
      matches.push({ field: 'filename', type: 'partial' });
    }

    // Location & Date
    if (item.location && item.location.toLowerCase().includes(q)) {
      score += 25;
      matches.push({ field: 'location', type: 'partial' });
    }
    if (item.date && item.date.toLowerCase().includes(q)) {
      score += 20;
      matches.push({ field: 'date', type: 'partial' });
    }

    // Attached person names
    for (const name of item.attachedPersonNames) {
      const nl = name.toLowerCase();
      if (nl === q) {
        score += 35;
        matches.push({ field: 'attachedPerson', type: 'exact' });
      } else if (nl.includes(q)) {
        score += 25;
        matches.push({ field: 'attachedPerson', type: 'partial' });
      }
    }
  } else if (item.type === 'document') {
    // Description
    const descLower = (item.description || '').toLowerCase();
    if (descLower.includes(q)) {
      score += 25;
      matches.push({ field: 'description', type: 'content' });
    }

    // Doc type
    const docTypeLower = (item.docType || '').toLowerCase();
    if (docTypeLower.includes(q)) {
      score += 30;
      matches.push({ field: 'docType', type: 'partial' });
    }

    // Filename
    if (item.filename && item.filename.toLowerCase().includes(q)) {
      score += 25;
      matches.push({ field: 'filename', type: 'partial' });
    }

    // Date
    if (item.date && item.date.toLowerCase().includes(q)) {
      score += 20;
      matches.push({ field: 'date', type: 'partial' });
    }

    // Attached person names
    for (const name of item.attachedPersonNames) {
      const nl = name.toLowerCase();
      if (nl === q) {
        score += 35;
        matches.push({ field: 'attachedPerson', type: 'exact' });
      } else if (nl.includes(q)) {
        score += 25;
        matches.push({ field: 'attachedPerson', type: 'partial' });
      }
    }
  } else if (item.type === 'relationship') {
    // Relationship type matching (e.g. "spouse", "marriage", "father", "mother", "parent")
    const subLower = (item.subtitle || '').toLowerCase();
    if (subLower.includes(q)) {
      score += 40;
      matches.push({ field: 'relationType', type: 'partial' });
    }

    // Partner names
    for (const name of item.attachedPersonNames) {
      const nl = name.toLowerCase();
      if (nl.includes(q)) {
        score += 35;
        matches.push({ field: 'partnerName', type: 'partial' });
      }
    }
  }

  return { score, matches };
}

/**
 * Searches the family archive with deterministic relevance ranking and category filtering.
 *
 * @param {string} rawQuery - The user input search query
 * @param {object} options - Search options:
 *   - filter: 'all' | 'people' | 'stories' | 'events' | 'photos' | 'documents'
 *   - limit: max number of results (default 50)
 * @param {object} indexOrSnapshot - Pre-built search index OR raw store snapshot
 * @returns {object} Search result containing categorized counts and ranked items
 */
export function searchArchive(rawQuery, options = {}, indexOrSnapshot = {}) {
  const query = normalizeQuery(rawQuery);
  const filter = options.filter || 'all';
  const limit = options.limit || 50;

  // If index is already built, reuse it; otherwise build on the fly
  const index = indexOrSnapshot.people && indexOrSnapshot.peopleMap
    ? indexOrSnapshot
    : buildSearchIndex(indexOrSnapshot);

  const counts = {
    all: 0,
    people: 0,
    stories: 0,
    events: 0,
    photos: 0,
    documents: 0,
  };

  if (!query) {
    return {
      query: '',
      totalCount: 0,
      counts,
      results: [],
    };
  }

  const qTokens = query.split(' ').filter(Boolean);

  const allScored = [];

  const checkCollection = (collection, categoryKey) => {
    collection.forEach((item) => {
      const { score, matches } = scoreEntity(item, query, qTokens);
      if (score > 0) {
        counts[categoryKey] = (counts[categoryKey] || 0) + 1;
        counts.all += 1;

        allScored.push({
          id: item.id,
          type: item.type,
          title: item.title,
          subtitle: item.subtitle,
          score,
          matches,
          date: item.date || item.lifespan || '',
          personId: item.personId,
          attachedPersonNames: item.attachedPersonNames,
          raw: item.raw,
        });
      }
    });
  };

  checkCollection(index.people, 'people');
  checkCollection(index.stories, 'stories');
  checkCollection(index.events, 'events');
  checkCollection(index.photos, 'photos');
  checkCollection(index.documents, 'documents');
  checkCollection(index.relationships, 'people'); // Relationships included in people/all

  // Filter results if specific category requested
  let filtered = allScored;
  if (filter === 'people') {
    filtered = allScored.filter((r) => r.type === 'person' || r.type === 'relationship');
  } else if (filter === 'stories') {
    filtered = allScored.filter((r) => r.type === 'story');
  } else if (filter === 'events') {
    filtered = allScored.filter((r) => r.type === 'event');
  } else if (filter === 'photos') {
    filtered = allScored.filter((r) => r.type === 'photo');
  } else if (filter === 'documents') {
    filtered = allScored.filter((r) => r.type === 'document');
  }

  // Deterministic sorting:
  // Primary: Score descending
  // Secondary: Type hierarchy (person > story > event > photo > document > relationship)
  // Tertiary: Title alphabetical
  const typeRank = {
    person: 1,
    story: 2,
    event: 3,
    photo: 4,
    document: 5,
    relationship: 6,
  };

  filtered.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const rankA = typeRank[a.type] || 99;
    const rankB = typeRank[b.type] || 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.title.localeCompare(b.title);
  });

  return {
    query,
    filter,
    totalCount: filtered.length,
    counts,
    results: filtered.slice(0, limit),
  };
}

/**
 * Validates that an entity still exists in the store before executing navigation action.
 * Prevents stale result navigation if an item was deleted while search was open.
 */
export function verifyEntityExists(store, type, id) {
  if (!store || !id) return false;
  const strId = String(id);

  if (type === 'person') {
    return Boolean(store.getPersonById(strId));
  }
  if (type === 'story') {
    const stories = store.stories || [];
    return stories.some((s) => String(s.id) === strId);
  }
  if (type === 'event') {
    const events = store.lifeEvents || [];
    return events.some((e) => String(e.id) === strId);
  }
  if (type === 'photo') {
    const photos = store.photos || [];
    return photos.some((ph) => String(ph.id) === strId);
  }
  if (type === 'document') {
    const documents = store.documents || [];
    return documents.some((d) => String(d.id) === strId);
  }
  if (type === 'relationship') {
    const rels = store.relationships || [];
    return rels.some((r) => String(r.id) === strId);
  }

  return true;
}
