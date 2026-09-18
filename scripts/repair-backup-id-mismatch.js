/**
 * Standalone Deterministic Repair Utility for Legacy Corrupted Backups
 * 
 * Background:
 * When the queue/person ID mismatch bug was active, FamilyStore.savePerson() mutated
 * in-memory person.id to internal sync queue IDs (queue-*).
 * Relationships added initially referenced canonical person-* IDs, while relationships
 * re-added later referenced queue-* IDs.
 * 
 * This script:
 * 1. Reads the corrupt backup WITHOUT mutating or overwriting it.
 * 2. Maps queue-* IDs back to their canonical person-* IDs.
 * 3. Normalizes relationship references.
 * 4. Deduplicates duplicate relationships resulting from re-adding during severed state.
 * 5. Runs strict graph validation (parent-child, spouse, sibling, max 2 biological parents).
 * 6. Writes a verified clean backup to a new file (default: <name>-repaired.json).
 */

import fs from 'fs';
import path from 'path';

// Proven 1-to-1 mapping discovered from relationship and sync timeline analysis
export const KNOWN_QUEUE_TO_PERSON_MAP = {
  'queue-1789559529009-4och0tt': 'person-1788863843862-xgzji4', // Appaiah Mamindla
  'queue-1789559574068-ex36hhi': 'person-1789559574016-fne1rv', // Venkatreddy Mamilla
  'queue-1789559586616-17tpi8h': 'person-1789559586565-vm8hg6', // Ramireddy Mamilla
  'queue-1789559596016-ykpvt3f': 'person-1789559595960-qe3l6q', // Pullareddy Mamilla
  'queue-1789559608152-5sdvfqv': 'person-1789559608099-p2c77t', // Satyanarayanareddy Mamilla
  'queue-1789559753159-760tiob': 'person-1789559753114-vec4h8', // Laxmi Gone
  'queue-1789559776728-geroajq': 'person-1789559776677-spvzq7', // Bramhaiah Penthala
  'queue-1789559895233-l3i38hf': 'person-1789559895177-xu9znh', // Padma Thanakam
};

export function repairBackupData(backupData, customMapping = {}) {
  const mapping = { ...KNOWN_QUEUE_TO_PERSON_MAP, ...customMapping };
  const parsed = typeof backupData === 'string' ? JSON.parse(backupData) : JSON.parse(JSON.stringify(backupData));

  const isNested = Boolean(parsed.family && Array.isArray(parsed.family.people));
  const rawPeople = isNested ? parsed.family.people : parsed.people;
  const rawRels = isNested ? parsed.family.relationships : parsed.relationships;
  const rawStories = (isNested ? parsed.family.stories : parsed.stories) || [];
  const rawEvents = (isNested ? parsed.family.lifeEvents : parsed.lifeEvents) || [];
  const rawPhotos = (isNested ? parsed.family.photos : parsed.photos) || [];
  const rawDocs = (isNested ? parsed.family.documents : parsed.documents) || [];

  // 1. Map person IDs
  const repairedPeople = rawPeople.map((p) => {
    const canonicalId = mapping[p.id] || p.id;
    return { ...p, id: canonicalId };
  });

  const peopleIds = new Set(repairedPeople.map((p) => p.id));

  // 2. Normalize and remap relationships
  const normalizedRels = rawRels.map((r) => {
    const updated = { ...r };
    if (updated.type === 'parent-child' || updated.type === 'parent') {
      const pId = updated.parentId || updated.personId1;
      const cId = updated.childId || updated.personId2;
      updated.parentId = mapping[pId] || pId;
      updated.childId = mapping[cId] || cId;
      updated.personId1 = updated.parentId;
      updated.personId2 = updated.childId;
    } else if (updated.type === 'spouse' || updated.type === 'sibling') {
      const aId = updated.personAId || updated.personId1;
      const bId = updated.personBId || updated.personId2;
      updated.personAId = mapping[aId] || aId;
      updated.personBId = mapping[bId] || bId;
      updated.personId1 = updated.personAId;
      updated.personId2 = updated.personBId;
    }
    return updated;
  });

  // 3. Deduplicate relationships created as a result of UI re-additions
  const seenRelKeys = new Set();
  const dedupedRels = [];
  let duplicateCount = 0;

  normalizedRels.forEach((r) => {
    let key = '';
    if (r.type === 'parent-child' || r.type === 'parent') {
      key = `parent-child:${r.parentId}->${r.childId}`;
    } else if (r.type === 'spouse') {
      const pair = [r.personAId, r.personBId].sort().join('<->');
      key = `spouse:${pair}`;
    } else if (r.type === 'sibling') {
      const pair = [r.personAId, r.personBId].sort().join('<->');
      key = `sibling:${pair}`;
    }

    if (key && !seenRelKeys.has(key)) {
      seenRelKeys.add(key);
      dedupedRels.push(r);
    } else if (key) {
      duplicateCount++;
    } else {
      dedupedRels.push(r);
    }
  });

  // 4. Update stories, life events, photos, documents references if needed
  const mapPersonRef = (id) => mapping[id] || id;
  const mapPersonArray = (ids) => (Array.isArray(ids) ? ids.map(mapPersonRef) : ids);

  const repairedStories = rawStories.map((s) => ({
    ...s,
    personId: mapPersonRef(s.personId),
    relatedPersonIds: mapPersonArray(s.relatedPersonIds),
  }));

  const repairedEvents = rawEvents.map((e) => ({
    ...e,
    personId: mapPersonRef(e.personId),
    relatedPersonIds: mapPersonArray(e.relatedPersonIds),
  }));

  const repairedPhotos = rawPhotos.map((ph) => ({
    ...ph,
    personId: mapPersonRef(ph.personId),
    relatedPersonIds: mapPersonArray(ph.relatedPersonIds),
  }));

  const repairedDocs = rawDocs.map((d) => ({
    ...d,
    personId: mapPersonRef(d.personId),
    relatedPersonIds: mapPersonArray(d.relatedPersonIds),
  }));

  // 5. Strict Validation
  const parentCounts = new Map();
  dedupedRels.forEach((r) => {
    if (r.type === 'parent-child' || r.type === 'parent') {
      if (!peopleIds.has(r.parentId)) {
        throw new Error(`Repaired validation failed: Parent-child relationship ${r.id} references missing parent ${r.parentId}`);
      }
      if (!peopleIds.has(r.childId)) {
        throw new Error(`Repaired validation failed: Parent-child relationship ${r.id} references missing child ${r.childId}`);
      }
      const count = (parentCounts.get(r.childId) || 0) + 1;
      if (count > 2) {
        throw new Error(`Repaired validation failed: Child ${r.childId} has more than 2 biological parents`);
      }
      parentCounts.set(r.childId, count);
    } else if (r.type === 'spouse' || r.type === 'sibling') {
      if (!peopleIds.has(r.personAId)) {
        throw new Error(`Repaired validation failed: ${r.type} relationship ${r.id} references missing personA ${r.personAId}`);
      }
      if (!peopleIds.has(r.personBId)) {
        throw new Error(`Repaired validation failed: ${r.type} relationship ${r.id} references missing personB ${r.personBId}`);
      }
    }
  });

  const repairedData = {
    ...parsed,
    repairedAt: new Date().toISOString(),
    repairMeta: {
      mappedQueuePeopleCount: Object.keys(mapping).length,
      deduplicatedRelationshipsCount: duplicateCount,
    },
  };

  if (isNested) {
    repairedData.family = {
      ...parsed.family,
      people: repairedPeople,
      relationships: dedupedRels,
      stories: repairedStories,
      lifeEvents: repairedEvents,
      photos: repairedPhotos,
      documents: repairedDocs,
    };
  } else {
    repairedData.people = repairedPeople;
    repairedData.relationships = dedupedRels;
    repairedData.stories = repairedStories;
    repairedData.lifeEvents = repairedEvents;
    repairedData.photos = repairedPhotos;
    repairedData.documents = repairedDocs;
  }

  return {
    repairedData,
    stats: {
      peopleCount: repairedPeople.length,
      relationshipsCount: dedupedRels.length,
      duplicateRelationshipsRemoved: duplicateCount,
    },
  };
}

// CLI Execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/repair-backup-id-mismatch.js')) {
  const defaultInput = 'C:/Users/G1/Downloads/medida-family-backup-2026-09-16.json';
  const inputPath = process.argv[2] || defaultInput;
  const defaultOutput = inputPath.replace(/\.json$/i, '-repaired.json');
  const outputPath = process.argv[3] || defaultOutput;

  if (path.resolve(inputPath) === path.resolve(outputPath)) {
    console.error('ERROR: Output path must not be identical to input path. Original backup must remain untouched.');
    process.exit(1);
  }

  console.log(`Reading original backup from: ${inputPath}`);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const { repairedData, stats } = repairBackupData(raw);

  fs.writeFileSync(outputPath, JSON.stringify(repairedData, null, 2), 'utf8');
  console.log(`Successfully repaired backup written to: ${outputPath}`);
  console.log(`People count: ${stats.peopleCount}`);
  console.log(`Relationships count: ${stats.relationshipsCount}`);
  console.log(`Duplicate relationships removed: ${stats.duplicateRelationshipsRemoved}`);
}
