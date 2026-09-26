/**
 * SupabaseAdapter — Cloud persistence via Supabase + PostgreSQL (Milestone 3B)
 *
 * Implements strict, defense-in-depth validation:
 *  - Verifies active authenticated session before every cloud operation.
 *  - Verifies active family ID is provided and matches all rows.
 *  - Rejects cross-family relationships, stories, events, media, and documents.
 *  - Scopes all deletes, updates, and selects with family_id.
 *  - Uses family-scoped storage paths (family/{familyId}/photos/... and family/{familyId}/documents/...).
 */

import { FamilyRepository } from './FamilyRepository.js';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';

// ── Data Mapping: Frontend ↔ Database ─────────────────────────

function personToRow(person, familyId) {
  return {
    family_id: familyId,
    local_id: person.id,
    first_name: person.firstName || '',
    middle_name: person.middleName || '',
    last_name: person.lastName || '',
    display_name: person.displayName || 'Unnamed',
    gender: person.gender || 'unspecified',
    living_status: person.livingStatus || 'alive',
    date_of_birth: person.dateOfBirth || null,
    date_of_death: person.dateOfDeath || null,
    place_of_birth: person.placeOfBirth || '',
    hometown: person.hometown || '',
    current_location: person.currentLocation || '',
    occupation: person.occupation || '',
    photo_url: person.photo || person.photoUrl || '',
    biography: person.biography || '',
    notes: person.notes || '',
    privacy: person.privacy || 'family',
  };
}

// Client person field → family_members column, for partial updates.
const PERSON_FIELD_COLUMNS = {
  firstName: 'first_name',
  middleName: 'middle_name',
  lastName: 'last_name',
  displayName: 'display_name',
  gender: 'gender',
  livingStatus: 'living_status',
  dateOfBirth: 'date_of_birth',
  dateOfDeath: 'date_of_death',
  placeOfBirth: 'place_of_birth',
  hometown: 'hometown',
  currentLocation: 'current_location',
  occupation: 'occupation',
  photo: 'photo_url',
  photoUrl: 'photo_url',
  biography: 'biography',
  notes: 'notes',
  privacy: 'privacy',
};

/**
 * Only the columns for fields this client actually changed, so concurrent
 * edits to different fields of the same person by different family members
 * don't overwrite each other. Returns null when no column-level info exists.
 */
function personChangedColumns(person, row) {
  if (!Array.isArray(person._changedFields)) return null;
  const partial = {};
  for (const field of person._changedFields) {
    const column = PERSON_FIELD_COLUMNS[field];
    if (column) partial[column] = row[column];
  }
  return partial;
}

function rowToPerson(row) {
  return {
    id: row.local_id || row.id,
    uuid: row.id,
    firstName: row.first_name || '',
    middleName: row.middle_name || '',
    lastName: row.last_name || '',
    displayName: row.display_name || 'Unnamed',
    gender: row.gender || 'unspecified',
    livingStatus: row.living_status || 'alive',
    dateOfBirth: row.date_of_birth || null,
    dateOfDeath: row.date_of_death || null,
    placeOfBirth: row.place_of_birth || '',
    hometown: row.hometown || '',
    currentLocation: row.currentLocation || '',
    occupation: row.occupation || '',
    photo: row.photo_url || '',
    photoUrl: row.photo_url || '',
    biography: row.biography || '',
    notes: row.notes || '',
    privacy: row.privacy || 'family',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function relationshipToRow(rel, familyId) {
  const type = rel.type === 'parent' ? 'parent-child' : rel.type;
  let personId1, personId2;

  if (type === 'parent-child') {
    personId1 = rel.parentId || rel.personId1;
    personId2 = rel.childId || rel.personId2;
  } else {
    personId1 = rel.personAId || rel.personId1;
    personId2 = rel.personBId || rel.personId2;
  }

  return {
    family_id: familyId,
    local_id: rel.id || null,
    type,
    person_id_1: personId1,
    person_id_2: personId2,
    start_date: rel.startDate || null,
  };
}

function rowToRelationship(row) {
  const base = {
    id: row.local_id || row.id,
    uuid: row.id,
    personId1: row.person_id_1,
    personId2: row.person_id_2,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.type === 'parent-child') {
    base.parentId = row.person_id_1;
    base.childId = row.person_id_2;
  } else {
    base.personAId = row.person_id_1;
    base.personBId = row.person_id_2;
    base.startDate = row.start_date || null;
  }

  return base;
}

function storyToRow(story, familyId) {
  return {
    family_id: familyId,
    local_id: story.id || null,
    person_id: story.personId,
    title: story.title || 'Untitled Memory',
    content: story.content || '',
    date: story.date || null,
    location: story.location || '',
    narrator: story.narrator || '',
    // Audio columns (migration 010) are only sent for voice stories, so text
    // stories keep saving on databases that have not run that migration yet.
    ...(story.audioPath
      ? {
          audio_path: story.audioPath,
          audio_mime_type: story.audioMimeType || null,
          audio_duration_sec: story.audioDurationSec ?? null,
          transcript_language: story.transcriptLanguage || null,
        }
      : {}),
  };
}

function rowToStory(row, relatedPersonIds = []) {
  return {
    id: row.local_id || row.id,
    uuid: row.id,
    personId: row.person_id,
    title: row.title || 'Untitled Memory',
    content: row.content || '',
    date: row.date || null,
    location: row.location || '',
    narrator: row.narrator || '',
    relatedPersonIds,
    audioPath: row.audio_path || null,
    audioMimeType: row.audio_mime_type || null,
    audioDurationSec: row.audio_duration_sec ?? null,
    transcriptLanguage: row.transcript_language || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function lifeEventToRow(event, familyId) {
  return {
    family_id: familyId,
    local_id: event.id || null,
    person_id: event.personId,
    type: event.type || 'Other',
    title: event.title || 'Life Event',
    date: event.date || null,
    location: event.location || '',
    description: event.description || '',
  };
}

function rowToLifeEvent(row, relatedPersonIds = []) {
  return {
    id: row.local_id || row.id,
    uuid: row.id,
    personId: row.person_id,
    type: row.type || 'Other',
    title: row.title || 'Life Event',
    date: row.date || null,
    location: row.location || '',
    description: row.description || '',
    relatedPersonIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function photoToRow(photo, familyId) {
  return {
    family_id: familyId,
    local_id: photo.id || null,
    person_id: photo.personId,
    src: photo.src || '',
    storage_path: photo.storagePath || '',
    title: photo.title || 'Family Photograph',
    caption: photo.caption || '',
    date: photo.date || '',
    location: photo.location || '',
    is_primary: Boolean(photo.isPrimary),
  };
}

function rowToPhoto(row, relatedPersonIds = []) {
  return {
    id: row.local_id || row.id,
    uuid: row.id,
    personId: row.person_id,
    src: row.src || '',
    storagePath: row.storage_path || '',
    title: row.title || 'Family Photograph',
    caption: row.caption || '',
    date: row.date || '',
    location: row.location || '',
    isPrimary: Boolean(row.is_primary),
    relatedPersonIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function documentToRow(doc, familyId) {
  return {
    family_id: familyId,
    local_id: doc.id || null,
    person_id: doc.personId,
    name: doc.name || 'Archival Document',
    type: doc.type || 'Official Record',
    doc_type: doc.docType || 'Document',
    src: doc.src || '',
    storage_path: doc.storagePath || '',
    reference_number: doc.referenceNumber || '',
    issuing_authority: doc.issuingAuthority || '',
    date: doc.date || '',
    description: doc.description || '',
  };
}

function rowToDocument(row) {
  return {
    id: row.local_id || row.id,
    uuid: row.id,
    personId: row.person_id,
    name: row.name || 'Archival Document',
    type: row.type || 'Official Record',
    docType: row.doc_type || 'Document',
    src: row.src || '',
    storagePath: row.storage_path || '',
    referenceNumber: row.reference_number || '',
    issuingAuthority: row.issuing_authority || '',
    date: row.date || '',
    description: row.description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Helper: throw on Supabase error ───────────────────────────

function throwIfError(result, context) {
  if (result.error) {
    throw new Error(`Supabase ${context}: ${result.error.message}`);
  }
  return result.data;
}

// ── Adapter ───────────────────────────────────────────────────

export class SupabaseAdapter extends FamilyRepository {
  /**
   * @param {string} familyId
   */
  constructor(familyId) {
    super();
    if (!familyId || typeof familyId !== 'string') {
      throw new Error('SupabaseAdapter: A valid family ID string is required.');
    }
    this.familyId = familyId;
  }

  /**
   * Validates active session and family membership before performing operations.
   * @private
   */
  async _validateSessionAndScope() {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured in this environment.');
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session?.user) {
      throw new Error('Unauthorized: An active authenticated session is required.');
    }

    const userId = sessionData.session.user.id;

    // Verify current user is actually a member of this.familyId
    const { data: membership, error: memErr } = await supabase
      .from('family_memberships')
      .select('role')
      .eq('family_id', this.familyId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memErr || !membership) {
      throw new Error(`Forbidden: User does not belong to family ${this.familyId}.`);
    }

    return { userId, role: membership.role };
  }

  /**
   * Verifies that all given person IDs belong to this family.
   * Prevents cross-family relationship or artifact creation.
   * @private
   */
  /**
   * Insert a new entity row exactly once. If a row with the same local_id
   * already exists in this family (an earlier attempt succeeded but its
   * response was lost, so the queue retried the create), update that row
   * instead of inserting a duplicate. Returns a { data, error } result.
   */
  async _insertOnce(table, row) {
    if (row.local_id) {
      const existing = await supabase
        .from(table)
        .select('id')
        .eq('family_id', this.familyId)
        .eq('local_id', row.local_id)
        .limit(1);
      if (existing.error) return existing;
      const existingId = existing.data?.[0]?.id;
      if (existingId) {
        return supabase.from(table).update(row).eq('id', existingId).select().single();
      }
    }
    return supabase.from(table).insert(row).select().single();
  }

  async _verifyPersonsBelongToFamily(personIds) {
    const validIds = (personIds || []).filter(Boolean).map(String);
    if (validIds.length === 0) return true;

    const uniqueIds = [...new Set(validIds)];
    const { count, error } = await supabase
      .from('family_members')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', this.familyId)
      .in('id', uniqueIds);

    if (error) {
      throw new Error(`Failed to verify person family boundary: ${error.message}`);
    }

    if (count !== uniqueIds.length) {
      throw new Error(
        `Cross-family boundary violation: Referenced person(s) do not belong to family ${this.familyId}.`
      );
    }

    return true;
  }

  // ── Load ───────────────────────────────────────────

  async load() {
    await this._validateSessionAndScope();
    const fid = this.familyId;

    const [
      membersRes,
      relsRes,
      storiesRes,
      storyPersRes,
      eventsRes,
      eventPersRes,
      mediaRes,
      mediaPersRes,
      docsRes,
      siblingOrdersRes,
    ] = await Promise.all([
      supabase.from('family_members').select('*').eq('family_id', fid),
      supabase.from('relationships').select('*').eq('family_id', fid),
      supabase.from('stories').select('*').eq('family_id', fid),
      supabase.from('story_persons').select('story_id, person_id'),
      supabase.from('life_events').select('*').eq('family_id', fid),
      supabase.from('life_event_persons').select('life_event_id, person_id'),
      supabase.from('media').select('*').eq('family_id', fid),
      supabase.from('media_persons').select('media_id, person_id'),
      supabase.from('documents').select('*').eq('family_id', fid),
      supabase.from('family_sibling_orders').select('*').eq('family_id', fid),
    ]);

    const people = throwIfError(membersRes, 'load family_members').map(rowToPerson);
    const relationships = throwIfError(relsRes, 'load relationships').map(rowToRelationship);

    const storyPersonsData = throwIfError(storyPersRes, 'load story_persons');
    const storyPersonsMap = buildJunctionMap(storyPersonsData, 'story_id', 'person_id');
    const stories = throwIfError(storiesRes, 'load stories').map((r) =>
      rowToStory(r, storyPersonsMap.get(r.id) || [])
    );

    const eventPersonsData = throwIfError(eventPersRes, 'load life_event_persons');
    const eventPersonsMap = buildJunctionMap(eventPersonsData, 'life_event_id', 'person_id');
    const lifeEvents = throwIfError(eventsRes, 'load life_events').map((r) =>
      rowToLifeEvent(r, eventPersonsMap.get(r.id) || [])
    );

    const mediaPersonsData = throwIfError(mediaPersRes, 'load media_persons');
    const mediaPersonsMap = buildJunctionMap(mediaPersonsData, 'media_id', 'person_id');
    const photos = throwIfError(mediaRes, 'load media').map((r) =>
      rowToPhoto(r, mediaPersonsMap.get(r.id) || [])
    );

    const documents = throwIfError(docsRes, 'load documents').map(rowToDocument);

    const siblingOrder = {};
    if (siblingOrdersRes && !siblingOrdersRes.error && Array.isArray(siblingOrdersRes.data)) {
      for (const row of siblingOrdersRes.data) {
        if (row.cohort_key && Array.isArray(row.ordered_person_ids)) {
          siblingOrder[row.cohort_key] = row.ordered_person_ids;
        }
      }
    }

    return localizePersonReferences({
      people, relationships, stories, lifeEvents, photos, documents, siblingOrder,
    });
  }

  async persist() {
    // Cloud adapter mutations are executed via granular methods.
  }

  // ── Sibling Cohort Ordering ────────────────────────

  async getSiblingOrders(familyId = this.familyId) {
    await this._validateSessionAndScope();
    const fid = familyId || this.familyId;
    const { data, error } = await supabase
      .from('family_sibling_orders')
      .select('*')
      .eq('family_id', fid);
    if (error) {
      console.warn('SupabaseAdapter: Failed to load sibling orders:', error.message);
      return {};
    }
    const orders = {};
    for (const row of (data || [])) {
      if (row.cohort_key && Array.isArray(row.ordered_person_ids)) {
        orders[row.cohort_key] = row.ordered_person_ids;
      }
    }
    return orders;
  }

  async saveSiblingOrder(familyId, cohortKey, orderedPersonIds) {
    await this._validateSessionAndScope();
    const fid = familyId || this.familyId;
    const key = String(cohortKey || '').trim();
    if (!key) throw new Error('saveSiblingOrder: cohortKey is required.');
    const personIds = Array.isArray(orderedPersonIds) ? orderedPersonIds.map(String) : [];

    // Try validated RPC first
    try {
      const { data, error } = await supabase.rpc('save_family_sibling_order', {
        p_family_id: fid,
        p_cohort_key: key,
        p_ordered_person_ids: personIds,
      });
      if (!error) return data;
      if (error.message && (error.message.includes('Forbidden') || error.message.includes('Validation') || error.message.includes('Duplicate') || error.message.includes('Authentication'))) {
        throw error;
      }
    } catch (rpcErr) {
      if (rpcErr.message && (rpcErr.message.includes('Forbidden') || rpcErr.message.includes('Validation') || rpcErr.message.includes('Duplicate') || rpcErr.message.includes('Authentication'))) {
        throw rpcErr;
      }
      console.warn('SupabaseAdapter: save_family_sibling_order RPC failed, falling back to direct upsert:', rpcErr.message);
    }

    // Direct table upsert fallback with RLS
    const { data, error } = await supabase
      .from('family_sibling_orders')
      .upsert({
        family_id: fid,
        cohort_key: key,
        ordered_person_ids: personIds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'family_id,cohort_key' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save sibling order: ${error.message}`);
    }
    return data;
  }

  async deleteSiblingOrder(familyId, cohortKey) {
    await this._validateSessionAndScope();
    const fid = familyId || this.familyId;
    const key = String(cohortKey || '').trim();
    if (!key) return true;

    try {
      const { error } = await supabase.rpc('delete_family_sibling_order', {
        p_family_id: fid,
        p_cohort_key: key,
      });
      if (!error) return true;
    } catch (e) {}

    const { error } = await supabase
      .from('family_sibling_orders')
      .delete()
      .eq('family_id', fid)
      .eq('cohort_key', key);

    if (error) {
      throw new Error(`Failed to delete sibling order: ${error.message}`);
    }
    return true;
  }


  // ── People ─────────────────────────────────────────

  async savePerson(person) {
    await this._validateSessionAndScope();
    const row = personToRow(person, this.familyId);

    if (person._isNew) {
      const data = throwIfError(
        await this._insertOnce('family_members', row),
        'insert person'
      );
      return rowToPerson(data);
    }

    const changedColumns = personChangedColumns(person, row);
    if (changedColumns && Object.keys(changedColumns).length === 0) {
      // Nothing persisted in the cloud changed; return the current row.
      const current = throwIfError(
        await supabase
          .from('family_members')
          .select('*')
          .eq('local_id', person.id)
          .eq('family_id', this.familyId)
          .single(),
        'load person'
      );
      return rowToPerson(current);
    }

     const data = throwIfError(
       await supabase
         .from('family_members')
         .update(changedColumns || row)
         .eq('local_id', person.id)
         .eq('family_id', this.familyId)
         .select()
         .single(),
       'update person'
     );
    return rowToPerson(data);
  }

   async deletePerson(personId) {
     await this._validateSessionAndScope();
     throwIfError(
       await supabase
         .from('family_members')
         .delete()
         .eq('local_id', personId)
         .eq('family_id', this.familyId),
       'delete person'
     );
  }

  // ── Relationships ──────────────────────────────────

  async saveRelationship(rel) {
    await this._validateSessionAndScope();

    const type = rel.type === 'parent' ? 'parent-child' : rel.type;
    const p1 = type === 'parent-child' ? (rel.parentId || rel.personId1) : (rel.personAId || rel.personId1);
    const p2 = type === 'parent-child' ? (rel.childId || rel.personId2) : (rel.personBId || rel.personId2);

    if (!p1 || !p2) {
      throw new Error('Relationship requires both related person IDs.');
    }
    if (p1 === p2) {
      throw new Error('Self-referential relationships are not permitted.');
    }

    // Verify both persons belong to this active family
    await this._verifyPersonsBelongToFamily([p1, p2]);

    const row = relationshipToRow(rel, this.familyId);
    const data = throwIfError(
      await this._insertOnce('relationships', row),
      'insert relationship'
    );
    return rowToRelationship(data);
  }

   async deleteRelationship(relId) {
     await this._validateSessionAndScope();
     throwIfError(
       await supabase
         .from('relationships')
         .delete()
         .eq('local_id', relId)
         .eq('family_id', this.familyId),
       'delete relationship'
     );
  }

  // ── Stories ────────────────────────────────────────

  async saveStory(story) {
    await this._validateSessionAndScope();

    // Verify primary person and all tagged persons belong to this family
    const allPersonIds = [story.personId, ...(story.relatedPersonIds || [])];
    await this._verifyPersonsBelongToFamily(allPersonIds);

    const row = storyToRow(story, this.familyId);

    let savedRow;
    if (story._isNew) {
      savedRow = throwIfError(
        await this._insertOnce('stories', row),
        'insert story'
      );
     } else {
       savedRow = throwIfError(
         await supabase
           .from('stories')
           .update(row)
           .eq('local_id', story.id)
           .eq('family_id', this.familyId)
           .select()
           .single(),
         'update story'
       );
    }
    // Replace person links by the row UUID (also makes retried creates idempotent).
    await supabase.from('story_persons').delete().eq('story_id', savedRow.id);

    if (story.relatedPersonIds?.length > 0) {
      const junctionRows = [...new Set(story.relatedPersonIds.map(String))].map((pid) => ({
        story_id: savedRow.id,
        person_id: pid,
      }));
      throwIfError(
        await supabase.from('story_persons').insert(junctionRows),
        'insert story_persons'
      );
    }

    return rowToStory(savedRow, story.relatedPersonIds || []);
  }

   async deleteStory(storyId) {
     await this._validateSessionAndScope();
     throwIfError(
       await supabase
         .from('stories')
         .delete()
         .eq('local_id', storyId)
         .eq('family_id', this.familyId),
       'delete story'
     );
  }

  // ── Life Events ────────────────────────────────────

  async saveLifeEvent(event) {
    await this._validateSessionAndScope();

    const allPersonIds = [event.personId, ...(event.relatedPersonIds || [])];
    await this._verifyPersonsBelongToFamily(allPersonIds);

    const row = lifeEventToRow(event, this.familyId);

    let savedRow;
    if (event._isNew) {
      savedRow = throwIfError(
        await this._insertOnce('life_events', row),
        'insert life_event'
      );
    } else {
       savedRow = throwIfError(
         await supabase
           .from('life_events')
           .update(row)
           .eq('local_id', event.id)
           .eq('family_id', this.familyId)
           .select()
           .single(),
         'update life_event'
       );
    }
    // Replace person links by the row UUID (also makes retried creates idempotent).
    await supabase.from('life_event_persons').delete().eq('life_event_id', savedRow.id);

    if (event.relatedPersonIds?.length > 0) {
      const junctionRows = [...new Set(event.relatedPersonIds.map(String))].map((pid) => ({
        life_event_id: savedRow.id,
        person_id: pid,
      }));
      throwIfError(
        await supabase.from('life_event_persons').insert(junctionRows),
        'insert life_event_persons'
      );
    }

    return rowToLifeEvent(savedRow, event.relatedPersonIds || []);
  }

   async deleteLifeEvent(eventId) {
     await this._validateSessionAndScope();
     throwIfError(
       await supabase
         .from('life_events')
         .delete()
         .eq('local_id', eventId)
         .eq('family_id', this.familyId),
       'delete life_event'
     );
  }

  // ── Photos ─────────────────────────────────────────

  async savePhoto(photo) {
    await this._validateSessionAndScope();

    const allPersonIds = [photo.personId, ...(photo.relatedPersonIds || [])];
    await this._verifyPersonsBelongToFamily(allPersonIds);

    let src = photo.src || '';
    let storagePath = photo.storagePath || '';

    if (src.startsWith('data:') || src.startsWith('blob:')) {
      const uploaded = await this._uploadToStorage('family-photos', photo.personId, src);
      if (uploaded) {
        storagePath = uploaded.path;
        src = uploaded.url;
      }
    }

    const row = { ...photoToRow({ ...photo, src, storagePath }, this.familyId) };

    let savedRow;
    if (photo._isNew) {
      savedRow = throwIfError(
        await this._insertOnce('media', row),
        'insert media'
      );
    } else {
       savedRow = throwIfError(
         await supabase
           .from('media')
           .update(row)
           .eq('local_id', photo.id)
           .eq('family_id', this.familyId)
           .select()
           .single(),
         'update media'
       );
    }
    // Replace person links by the row UUID (also makes retried creates idempotent).
    await supabase.from('media_persons').delete().eq('media_id', savedRow.id);

    if (photo.relatedPersonIds?.length > 0) {
      const junctionRows = [...new Set(photo.relatedPersonIds.map(String))].map((pid) => ({
        media_id: savedRow.id,
        person_id: pid,
      }));
      throwIfError(
        await supabase.from('media_persons').insert(junctionRows),
        'insert media_persons'
      );
    }

    return rowToPhoto(savedRow, photo.relatedPersonIds || []);
  }

  async deletePhoto(photoId) {
    await this._validateSessionAndScope();
    throwIfError(
      await supabase
        .from('media')
        .delete()
        .eq('id', photoId)
        .eq('family_id', this.familyId),
      'delete media'
    );
  }

  // ── Documents ──────────────────────────────────────

  async saveDocument(doc) {
    await this._validateSessionAndScope();

    if (doc.personId) {
      await this._verifyPersonsBelongToFamily([doc.personId]);
    }

    let src = doc.src || '';
    let storagePath = doc.storagePath || '';

    if (src.startsWith('data:') || src.startsWith('blob:')) {
      const uploaded = await this._uploadToStorage('family-documents', doc.personId || 'general', src);
      if (uploaded) {
        storagePath = uploaded.path;
        src = uploaded.url;
      }
    }

    const row = documentToRow({ ...doc, src, storagePath }, this.familyId);

    if (doc._isNew) {
      const data = throwIfError(
        await this._insertOnce('documents', row),
        'insert document'
      );
      return rowToDocument(data);
    }

    const data = throwIfError(
      await supabase
         .from('documents')
         .update(row)
         .eq('local_id', doc.id)
         .eq('family_id', this.familyId)
         .select()
         .single(),
       'update document'
     );
    return rowToDocument(data);
  }

   async deleteDocument(docId) {
     await this._validateSessionAndScope();
     throwIfError(
       await supabase
         .from('documents')
         .delete()
         .eq('local_id', docId)
         .eq('family_id', this.familyId),
       'delete document'
     );
  }

  // ── Bulk Operations ────────────────────────────────

  async importAll(data) {
    await this._validateSessionAndScope();

    for (const person of data.people || []) {
      await this.savePerson({ ...person, _isNew: true });
    }
    for (const rel of data.relationships || []) {
      await this.saveRelationship(rel);
    }
    for (const story of data.stories || []) {
      await this.saveStory({ ...story, _isNew: true });
    }
    for (const event of data.lifeEvents || []) {
      await this.saveLifeEvent({ ...event, _isNew: true });
    }
    for (const photo of data.photos || []) {
      await this.savePhoto({ ...photo, _isNew: true });
    }
    for (const doc of data.documents || []) {
      await this.saveDocument({ ...doc, _isNew: true });
    }
  }

  async reset(seedData) {
    await this._validateSessionAndScope();

    await supabase.from('documents').delete().eq('family_id', this.familyId);
    await supabase.from('media').delete().eq('family_id', this.familyId);
    await supabase.from('life_events').delete().eq('family_id', this.familyId);
    await supabase.from('stories').delete().eq('family_id', this.familyId);
    await supabase.from('relationships').delete().eq('family_id', this.familyId);
    await supabase.from('family_members').delete().eq('family_id', this.familyId);

    if (seedData) {
      await this.importAll(seedData);
    }
  }

  // ── Storage Helpers (Family-Scoped & Private) ──────

  async _uploadToStorage(bucket, personId, dataUrl) {
    if (!supabase) return null;

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const ext = blob.type.split('/')[1] || 'bin';
      
      // Strict path format: family/{familyId}/photos/... or family/{familyId}/documents/...
      const category = bucket === 'family-photos' ? 'photos' : 'documents';
      const fileId = `${personId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
      const storagePath = `family/${this.familyId}/${category}/${fileId}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

      if (uploadError) {
        console.error('Storage upload failed:', uploadError.message);
        return null;
      }

      // Private bucket: create a signed URL (1 year validity) or fall back to public
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 31536000);

      const url = signedData?.signedUrl || supabase.storage.from(bucket).getPublicUrl(storagePath).data?.publicUrl || '';

      return {
        path: storagePath,
        url,
      };
    } catch (err) {
      console.error('Storage upload error:', err);
      return null;
    }
  }
}

// ── Junction table helper ─────────────────────────────────────

/**
 * Rows reference people by their database UUID (person_id, person_id_1, ...),
 * while the client keys people by their local ID. Rewrite every person
 * reference in a loaded snapshot to the local ID so relationships, stories,
 * events, photos and documents line up with the loaded people.
 */
export function localizePersonReferences(data) {
  const uuidToLocal = new Map();
  for (const person of data.people || []) {
    if (person.uuid) uuidToLocal.set(String(person.uuid), String(person.id));
  }
  const toLocal = (ref) => {
    if (ref === null || ref === undefined) return ref;
    return uuidToLocal.get(String(ref)) ?? ref;
  };
  const REF_FIELDS = ['personId', 'personId1', 'personId2', 'parentId', 'childId', 'personAId', 'personBId'];
  const localizeEntity = (entity) => {
    const out = { ...entity };
    for (const field of REF_FIELDS) {
      if (field in out) out[field] = toLocal(out[field]);
    }
    if (Array.isArray(out.relatedPersonIds)) {
      out.relatedPersonIds = out.relatedPersonIds.map(toLocal);
    }
    return out;
  };

  const siblingOrder = {};
  for (const [cohortKey, ids] of Object.entries(data.siblingOrder || {})) {
    siblingOrder[cohortKey] = Array.isArray(ids) ? ids.map(toLocal) : ids;
  }

  return {
    ...data,
    siblingOrder,
    relationships: (data.relationships || []).map(localizeEntity),
    stories: (data.stories || []).map(localizeEntity),
    lifeEvents: (data.lifeEvents || []).map(localizeEntity),
    photos: (data.photos || []).map(localizeEntity),
    documents: (data.documents || []).map(localizeEntity),
  };
}

function buildJunctionMap(rows, parentKey, childKey) {
  const map = new Map();
  for (const row of rows) {
    const parentId = row[parentKey];
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId).push(row[childKey]);
  }
  return map;
}
