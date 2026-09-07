/**
 * familyInsightsEngine.js — Medida's Family (Milestone M4E)
 * 
 * Single-source deterministic insights engine analyzing family data
 * from FamilyStore (people, relationships, stories, events, photos, documents).
 * Zero AI, zero external reporting libraries. 100% explainable & private.
 */

/**
 * Extract 4-digit year from date/year string
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
 * Format Roman numerals for generation indices (0 -> Gen I, 1 -> Gen II, etc.)
 * @param {number} genIndex
 * @returns {string}
 */
export function formatGenerationLabel(genIndex) {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return `Gen ${numerals[genIndex] || genIndex + 1}`;
}

/**
 * Derive reachable family members for a branch rooted at personId
 * @param {string} rootPersonId
 * @param {Array<Object>} people
 * @param {Array<Object>} relationships
 * @returns {Array<Object>}
 */
export function computeBranchMembers(rootPersonId, people, relationships) {
  const peopleMap = new Map(people.map((p) => [String(p.id), p]));
  const branchIds = new Set([String(rootPersonId)]);
  let added = true;

  // Iteratively collect descendants and direct spouses
  while (added) {
    added = false;
    relationships.forEach((r) => {
      const parentId = String(r.parentId || r.personId1 || '');
      const childId = String(r.childId || r.personId2 || '');
      const spouseA = String(r.personAId || r.personId1 || '');
      const spouseB = String(r.personBId || r.personId2 || '');

      if (r.type === 'parent-child' || r.type === 'parent') {
        if (branchIds.has(parentId) && !branchIds.has(childId)) {
          branchIds.add(childId);
          added = true;
        }
      } else if (r.type === 'spouse') {
        if (branchIds.has(spouseA) && !branchIds.has(spouseB)) {
          branchIds.add(spouseB);
          added = true;
        } else if (branchIds.has(spouseB) && !branchIds.has(spouseA)) {
          branchIds.add(spouseA);
          added = true;
        }
      }
    });
  }

  return Array.from(branchIds)
    .map((id) => peopleMap.get(id))
    .filter(Boolean);
}

/**
 * Calculate transparent 8-field completeness score for a person
 * @param {Object} person
 * @param {Object} context { relationships, stories, lifeEvents }
 * @returns {{ score: number, maxScore: number, percentage: number, missingFields: Array<string> }}
 */
export function calculateProfileCompleteness(person, { relationships = [], stories = [], lifeEvents = [] } = {}) {
  if (!person) {
    return { score: 0, maxScore: 8, percentage: 0, missingFields: [] };
  }

  const pId = String(person.id);
  const criteria = [
    { field: 'Name', valid: Boolean(person.firstName && person.firstName.trim()) },
    { field: 'Portrait Photo', valid: Boolean(person.photo || person.photoUrl) },
    { field: 'Date of Birth', valid: Boolean(person.dateOfBirth) },
    { field: 'Location', valid: Boolean(person.placeOfBirth || person.hometown || person.currentLocation) },
    { field: 'Occupation', valid: Boolean(person.occupation && person.occupation.trim()) },
    { field: 'Biography', valid: Boolean(person.biography && person.biography.trim()) },
    {
      field: 'Family Relationships',
      valid: relationships.some(
        (r) =>
          String(r.parentId) === pId ||
          String(r.childId) === pId ||
          String(r.personAId) === pId ||
          String(r.personBId) === pId ||
          String(r.personId1) === pId ||
          String(r.personId2) === pId
      ),
    },
    {
      field: 'Stories or Events',
      valid:
        stories.some((s) => String(s.personId) === pId || (s.relatedPersonIds || []).map(String).includes(pId)) ||
        lifeEvents.some((e) => String(e.personId) === pId || (e.relatedPersonIds || []).map(String).includes(pId)),
    },
  ];

  const score = criteria.filter((c) => c.valid).length;
  const missingFields = criteria.filter((c) => !c.valid).map((c) => c.field);
  const percentage = Math.round((score / criteria.length) * 100);

  return {
    score,
    maxScore: criteria.length,
    percentage,
    missingFields,
  };
}

/**
 * Unified Snapshot Analysis for Medida's Family
 * @param {Object} snapshot Data bundle from FamilyStore
 * @returns {Object} Complete Insights Model
 */
export function analyzeFamily(snapshot = {}) {
  const store = snapshot.store || null;

  const people = snapshot.people || (store?.getAllPersons ? store.getAllPersons() : []);
  const relationships = snapshot.relationships || (store?.getAllRelationships ? store.getAllRelationships() : store?.relationships || []);
  const stories = snapshot.stories || (store?.getAllStories ? store.getAllStories() : store?.stories || []);
  const lifeEvents = snapshot.lifeEvents || (store?.getAllLifeEvents ? store.getAllLifeEvents() : store?.lifeEvents || []);
  const photos = snapshot.photos || (store?.getAllPhotos ? store.getAllPhotos() : store?.photos || []);
  const documents = snapshot.documents || (store?.getAllDocuments ? store.getAllDocuments() : store?.documents || []);
  const genMap = snapshot.genMap || (store?.calculateGenerations ? store.calculateGenerations() : new Map());

  // ── 1. Overview Metrics ──────────────────────────────────────
  const totalPeople = people.length;
  const livingMembers = people.filter((p) => !p.isDeceased).length;
  const deceasedMembers = people.filter((p) => p.isDeceased).length;
  const photoCount = photos.length;
  const documentCount = documents.length;
  const storyCount = stories.length;
  const eventCount = lifeEvents.length;

  let totalGenerations = 0;
  if (genMap && genMap.size > 0) {
    const genValues = Array.from(genMap.values());
    totalGenerations = Math.max(...genValues) + 1;
  }

  // ── 2. Generation Distribution ──────────────────────────────
  const generationDistribution = [];
  for (let g = 0; g < totalGenerations; g++) {
    const members = people.filter((p) => (genMap.get(p.id) ?? 0) === g);
    generationDistribution.push({
      generationIndex: g,
      label: formatGenerationLabel(g),
      count: members.length,
      people: members,
    });
  }

  // ── 3. Family Branches ──────────────────────────────────────
  // Detect primary branches starting at Generation 1 (or roots if only 1 gen)
  const branches = [];
  const branchRoots = people.filter((p) => (genMap.get(p.id) ?? 0) === 1);
  const candidates = branchRoots.length > 0 ? branchRoots : people.filter((p) => (genMap.get(p.id) ?? 0) === 0);

  candidates.forEach((root) => {
    const branchMembers = computeBranchMembers(root.id, people, relationships);
    const memberGens = branchMembers
      .map((m) => genMap.get(m.id))
      .filter((val) => typeof val === 'number');

    const minGen = memberGens.length > 0 ? Math.min(...memberGens) : 0;
    const maxGen = memberGens.length > 0 ? Math.max(...memberGens) : 0;

    branches.push({
      id: `branch-${root.id}`,
      rootPerson: root,
      name: `${root.displayName || root.firstName}'s Branch`,
      memberCount: branchMembers.length,
      generationSpan: `${formatGenerationLabel(minGen)} – ${formatGenerationLabel(maxGen)}`,
      members: branchMembers,
    });
  });

  // ── 4. Network & Relationship Structure ─────────────────────
  const totalRelationships = relationships.length;
  const parentChildCount = relationships.filter((r) => r.type === 'parent-child' || r.type === 'parent').length;
  const spouseCount = relationships.filter((r) => r.type === 'spouse').length;
  const densityRatio = totalPeople > 1 ? (totalRelationships / ((totalPeople * (totalPeople - 1)) / 2)).toFixed(3) : '0';

  const isolatedPeople = people.filter((p) => {
    const pId = String(p.id);
    return !relationships.some(
      (r) =>
        String(r.parentId) === pId ||
        String(r.childId) === pId ||
        String(r.personAId) === pId ||
        String(r.personBId) === pId ||
        String(r.personId1) === pId ||
        String(r.personId2) === pId
    );
  });

  // ── 5. Milestones & Historical Span ─────────────────────────
  const datedEvents = [...lifeEvents]
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const allYears = [];
  people.forEach((p) => {
    if (p.dateOfBirth) allYears.push(extractYear(p.dateOfBirth));
    if (p.dateOfDeath) allYears.push(extractYear(p.dateOfDeath));
  });
  lifeEvents.forEach((e) => {
    if (e.date) allYears.push(extractYear(e.date));
  });
  stories.forEach((s) => {
    if (s.date) allYears.push(extractYear(s.date));
  });
  photos.forEach((ph) => {
    if (ph.date) allYears.push(extractYear(ph.date));
  });
  documents.forEach((d) => {
    if (d.date) allYears.push(extractYear(d.date));
  });

  const validYears = allYears.filter((y) => typeof y === 'number' && !isNaN(y) && y >= 1800 && y <= 2100).sort((a, b) => a - b);
  const startYear = validYears.length > 0 ? validYears[0] : null;
  const endYear = validYears.length > 0 ? validYears[validYears.length - 1] : new Date().getFullYear();
  const historySpanText = startYear ? `${startYear} → Present (${endYear})` : 'Heritage Chronicle';

  const earliestEvent = datedEvents[0] || null;
  const latestEvent = datedEvents[datedEvents.length - 1] || null;

  // Milestone categories
  const milestonesByType = {};
  datedEvents.forEach((e) => {
    const t = e.type || 'Milestone';
    if (!milestonesByType[t]) milestonesByType[t] = [];
    milestonesByType[t].push(e);
  });

  // Notable top milestones
  const notableMilestones = datedEvents.slice(0, 6);

  // ── 6. Archive Composition ──────────────────────────────────
  const totalArchiveCount = photoCount + documentCount + storyCount + eventCount;
  const archiveComposition = {
    total: totalArchiveCount,
    photos: { count: photoCount, percentage: totalArchiveCount > 0 ? Math.round((photoCount / totalArchiveCount) * 100) : 0 },
    documents: { count: documentCount, percentage: totalArchiveCount > 0 ? Math.round((documentCount / totalArchiveCount) * 100) : 0 },
    stories: { count: storyCount, percentage: totalArchiveCount > 0 ? Math.round((storyCount / totalArchiveCount) * 100) : 0 },
    events: { count: eventCount, percentage: totalArchiveCount > 0 ? Math.round((eventCount / totalArchiveCount) * 100) : 0 },
  };

  // ── 7. Geographical Locations ───────────────────────────────
  const locationMap = new Map(); // location -> { location, count, people: Set }

  function addLocation(rawLoc, personId) {
    if (!rawLoc || typeof rawLoc !== 'string') return;
    const clean = rawLoc.trim();
    if (!clean) return;

    // Split primary city if composite
    const parts = clean.split(',').map((p) => p.trim());
    const primary = parts[0];

    if (!locationMap.has(primary)) {
      locationMap.set(primary, { location: clean, city: primary, count: 0, personIds: new Set() });
    }
    const entry = locationMap.get(primary);
    entry.count += 1;
    if (personId) entry.personIds.add(String(personId));
  }

  people.forEach((p) => {
    addLocation(p.placeOfBirth, p.id);
    addLocation(p.hometown, p.id);
    addLocation(p.currentLocation, p.id);
  });
  lifeEvents.forEach((e) => addLocation(e.location, e.personId));
  stories.forEach((s) => addLocation(s.location, s.personId));
  photos.forEach((ph) => addLocation(ph.location, ph.personId));

  const peopleLookup = new Map(people.map((p) => [String(p.id), p]));
  const topLocations = Array.from(locationMap.values())
    .map((item) => ({
      ...item,
      people: Array.from(item.personIds).map((id) => peopleLookup.get(id)).filter(Boolean),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── 8. Profile Completeness & Diagnostics ────────────────────
  const completenessDetails = people.map((p) => {
    const comp = calculateProfileCompleteness(p, { relationships, stories, lifeEvents });
    return {
      person: p,
      ...comp,
    };
  });

  const totalScoreSum = completenessDetails.reduce((acc, c) => acc + c.percentage, 0);
  const averageCompleteness = totalPeople > 0 ? Math.round(totalScoreSum / totalPeople) : 0;

  // Archive Health ("Complete the Family Story")
  const profilesMissingPhotos = people.filter((p) => !p.photo && !p.photoUrl);
  const profilesMissingBirthDates = people.filter((p) => !p.dateOfBirth);
  const profilesMissingOccupations = people.filter((p) => !p.occupation || !p.occupation.trim());
  const profilesMissingBio = people.filter((p) => !p.biography || !p.biography.trim());
  const storiesWithoutDates = stories.filter((s) => !s.date);
  const eventsWithoutLocations = lifeEvents.filter((e) => !e.location || !e.location.trim());
  const photosWithoutCaptions = photos.filter((ph) => !ph.caption || !ph.caption.trim());
  const documentsMissingMetadata = documents.filter((d) => !d.description || !d.description.trim());

  const archiveHealthItems = [
    {
      id: 'health-photos',
      title: 'Profiles Awaiting Photographs',
      count: profilesMissingPhotos.length,
      items: profilesMissingPhotos,
      type: 'person',
      description: 'Preserve portraits for family members currently represented by initials.',
      actionLabel: 'View Profiles',
    },
    {
      id: 'health-births',
      title: 'Missing Birth Dates',
      count: profilesMissingBirthDates.length,
      items: profilesMissingBirthDates,
      type: 'person',
      description: 'Record birth dates to place each relative accurately on the historical timeline.',
      actionLabel: 'Update Records',
    },
    {
      id: 'health-stories',
      title: 'Oral Stories Without Dates',
      count: storiesWithoutDates.length,
      items: storiesWithoutDates,
      type: 'story',
      description: 'Attach years or dates to oral stories so they appear in chronologic chapters.',
      actionLabel: 'Edit Stories',
    },
    {
      id: 'health-captions',
      title: 'Photographs Without Captions',
      count: photosWithoutCaptions.length,
      items: photosWithoutCaptions,
      type: 'photo',
      description: 'Add historical notes or descriptions to photographs to preserve their context.',
      actionLabel: 'Review Album',
    },
    {
      id: 'health-relations',
      title: 'Members Without Direct Connections',
      count: isolatedPeople.length,
      items: isolatedPeople,
      type: 'person',
      description: 'Connect unlinked family members to parents or spouses in the interactive tree.',
      actionLabel: 'Connect in Tree',
    },
  ].filter((h) => h.count > 0);

  // ── 9. Coverage Signals ──────────────────────────────────────
  const peopleWithPhotos = people.filter((p) => p.photo || p.photoUrl || photos.some((ph) => String(ph.personId) === String(p.id)));
  const peopleWithStories = people.filter((p) => stories.some((s) => String(s.personId) === String(p.id) || (s.relatedPersonIds || []).map(String).includes(String(p.id))));
  const peopleWithEvents = people.filter((p) => lifeEvents.some((e) => String(e.personId) === String(p.id) || (e.relatedPersonIds || []).map(String).includes(String(p.id))));

  const historyCoverage = {
    historySpanText,
    startYear,
    endYear,
    photoCoveragePercent: totalPeople > 0 ? Math.round((peopleWithPhotos.length / totalPeople) * 100) : 0,
    storyCoveragePercent: totalPeople > 0 ? Math.round((peopleWithStories.length / totalPeople) * 100) : 0,
    eventCoveragePercent: totalPeople > 0 ? Math.round((peopleWithEvents.length / totalPeople) * 100) : 0,
    peopleWithPhotosCount: peopleWithPhotos.length,
    peopleWithStoriesCount: peopleWithStories.length,
    peopleWithEventsCount: peopleWithEvents.length,
  };

  // ── 10. Memory & Photo & Document Coverage ───────────────────
  // People with most stories
  const storyCountsByPerson = people.map((p) => {
    const count = stories.filter((s) => String(s.personId) === String(p.id)).length;
    return { person: p, count };
  }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);

  const peopleWithoutStories = people.filter((p) => !stories.some((s) => String(s.personId) === String(p.id)));

  // Photos by generation
  const photosByGen = generationDistribution.map((gen) => {
    const genPersonIds = new Set(gen.people.map((p) => String(p.id)));
    const genPhotos = photos.filter((ph) => genPersonIds.has(String(ph.personId)));
    return {
      label: gen.label,
      count: genPhotos.length,
    };
  });

  // Documents by type
  const docTypeCounts = {};
  documents.forEach((d) => {
    const t = d.type || d.docType || 'Historical Record';
    docTypeCounts[t] = (docTypeCounts[t] || 0) + 1;
  });
  const documentTypes = Object.entries(docTypeCounts).map(([type, count]) => ({ type, count }));

  // ── 11. Recent Activity ──────────────────────────────────────
  const recentActivities = [
    ...stories.map((s) => ({ id: s.id, type: 'story', title: s.title, timestamp: s.updatedAt || s.createdAt || s.date, personId: s.personId })),
    ...lifeEvents.map((e) => ({ id: e.id, type: 'event', title: e.title, timestamp: e.createdAt || e.date, personId: e.personId })),
    ...photos.map((ph) => ({ id: ph.id, type: 'photo', title: ph.title || 'Photograph', timestamp: ph.createdAt || ph.date, personId: ph.personId })),
    ...documents.map((d) => ({ id: d.id, type: 'document', title: d.name || 'Document', timestamp: d.createdAt || d.date, personId: d.personId })),
  ];

  recentActivities.sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tB - tA;
  });

  const topRecent = recentActivities.slice(0, 6).map((act) => ({
    ...act,
    person: peopleLookup.get(String(act.personId)) || null,
  }));

  return {
    overview: {
      totalPeople,
      totalGenerations,
      livingMembers,
      deceasedMembers,
      photoCount,
      documentCount,
      storyCount,
      eventCount,
    },
    generationDistribution,
    branches,
    network: {
      totalRelationships,
      parentChildCount,
      spouseCount,
      densityRatio,
      isolatedPeople,
    },
    milestones: {
      earliestEvent,
      latestEvent,
      notableMilestones,
      milestonesByType,
    },
    archiveComposition,
    topLocations,
    archiveHealth: {
      items: archiveHealthItems,
      profilesMissingPhotos,
      profilesMissingBirthDates,
      profilesMissingOccupations,
      profilesMissingBio,
      isolatedPeople,
      storiesWithoutDates,
      eventsWithoutLocations,
      photosWithoutCaptions,
      documentsMissingMetadata,
    },
    completeness: {
      averageCompleteness,
      details: completenessDetails,
    },
    coverage: {
      ...historyCoverage,
      storyCountsByPerson,
      peopleWithoutStories,
      photosByGen,
      documentTypes,
    },
    recentActivity: topRecent,
  };
}
