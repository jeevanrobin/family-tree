/**
 * MigrationService — Controlled migration from local V2 data to Supabase.
 *
 * Steps (ordered by FK dependencies):
 *  1. Validate local data
 *  2. Create family record
 *  3. Upload family_members (build ID map)
 *  4. Upload relationships (remap IDs)
 *  5. Upload stories + junction rows
 *  6. Upload life_events + junction rows
 *  7. Upload media + junction rows
 *  8. Upload documents
 *  9. Verify counts
 * 10. Store family_id → enables SupabaseAdapter on next load
 *
 * Non-destructive: local data (family-tree-data-v2) is never modified.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { IdMapper } from './idMapper.js';

const MIGRATION_STATE_KEY = 'family-tree-migration-state';
const FAMILY_ID_KEY = 'family-tree-active-family-id';

function throwIfError(result, context) {
  if (result.error) {
    throw new Error(`Migration ${context}: ${result.error.message}`);
  }
  return result.data;
}

export class MigrationService {

  canMigrate() {
    if (!isSupabaseConfigured || !supabase) return false;
    const raw = localStorage.getItem('family-tree-data-v2');
    return Boolean(raw);
  }

  getMigrationStatus() {
    try {
      const raw = localStorage.getItem(MIGRATION_STATE_KEY);
      return raw ? JSON.parse(raw) : { status: 'idle' };
    } catch {
      return { status: 'idle' };
    }
  }

  async migrate(familyName, progressCallback = () => {}) {
    if (!supabase) throw new Error('Supabase is not configured');

    const totalSteps = 10;
    const report = (step, description, status = 'in-progress') => {
      const state = { status, step, totalSteps, description, updatedAt: new Date().toISOString() };
      localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(state));
      progressCallback(state);
    };

    try {
      // Step 1: Validate local data
      report(1, 'Validating local data');
      const localData = this._loadLocalData();
      if (!localData) throw new Error('No local data found to migrate');

      // Step 2: Create family record
      report(2, 'Creating family record');
      const family = throwIfError(
        await supabase.from('families')
          .insert({ name: familyName || 'Family Tree', description: '' })
          .select()
          .single(),
        'create family'
      );
      const familyId = family.id;

      const idMapper = new IdMapper();

      // Step 3: Upload family members
      report(3, `Uploading ${localData.people.length} family members`);
      for (const person of localData.people) {
        const row = {
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

        const inserted = throwIfError(
          await supabase.from('family_members').insert(row).select().single(),
          `insert person ${person.id}`
        );
        idMapper.set(person.id, inserted.id);
      }

      // Step 4: Upload relationships
      report(4, `Uploading ${localData.relationships.length} relationships`);
      for (const rel of localData.relationships) {
        const type = rel.type === 'parent' ? 'parent-child' : rel.type;
        let personId1, personId2;

        if (type === 'parent-child') {
          personId1 = idMapper.resolve(rel.parentId || rel.personId1);
          personId2 = idMapper.resolve(rel.childId || rel.personId2);
        } else {
          personId1 = idMapper.resolve(rel.personAId || rel.personId1);
          personId2 = idMapper.resolve(rel.personBId || rel.personId2);
        }

        throwIfError(
          await supabase.from('relationships').insert({
            family_id: familyId,
            local_id: rel.id,
            type,
            person_id_1: personId1,
            person_id_2: personId2,
            start_date: rel.startDate || null,
          }).select().single(),
          `insert relationship ${rel.id}`
        );
      }

      // Step 5: Upload stories + junction
      report(5, `Uploading ${localData.stories.length} stories`);
      for (const story of localData.stories) {
        const inserted = throwIfError(
          await supabase.from('stories').insert({
            family_id: familyId,
            local_id: story.id,
            person_id: idMapper.resolve(story.personId),
            title: story.title || 'Untitled Memory',
            content: story.content || '',
            date: story.date || null,
            location: story.location || '',
            narrator: story.narrator || '',
          }).select().single(),
          `insert story ${story.id}`
        );

        const relatedIds = idMapper.resolveArray(story.relatedPersonIds);
        if (relatedIds.length > 0) {
          throwIfError(
            await supabase.from('story_persons').insert(
              relatedIds.map((pid) => ({ story_id: inserted.id, person_id: pid }))
            ),
            `insert story_persons for ${story.id}`
          );
        }
      }

      // Step 6: Upload life events + junction
      report(6, `Uploading ${localData.lifeEvents.length} life events`);
      for (const event of localData.lifeEvents) {
        const inserted = throwIfError(
          await supabase.from('life_events').insert({
            family_id: familyId,
            local_id: event.id,
            person_id: idMapper.resolve(event.personId),
            type: event.type || 'Other',
            title: event.title || 'Life Event',
            date: event.date || null,
            location: event.location || '',
            description: event.description || '',
          }).select().single(),
          `insert life_event ${event.id}`
        );

        const relatedIds = idMapper.resolveArray(event.relatedPersonIds);
        if (relatedIds.length > 0) {
          throwIfError(
            await supabase.from('life_event_persons').insert(
              relatedIds.map((pid) => ({ life_event_id: inserted.id, person_id: pid }))
            ),
            `insert life_event_persons for ${event.id}`
          );
        }
      }

      // Step 7: Upload media (photos) + junction
      report(7, `Uploading ${localData.photos.length} photos`);
      for (const photo of localData.photos) {
        let src = photo.src || '';
        let storagePath = '';

        if (src.startsWith('data:') || src.startsWith('blob:')) {
          try {
            const response = await fetch(src);
            const blob = await response.blob();
            const ext = blob.type.split('/')[1] || 'bin';
            const fileName = `${familyId}/${photo.personId}/${Date.now()}-${Math.random().toString(36).substr(2, 4)}.${ext}`;

            const uploadResult = await supabase.storage.from('family-photos').upload(fileName, blob, {
              contentType: blob.type,
              upsert: false,
            });

            if (!uploadResult.error) {
              storagePath = fileName;
              const { data: urlData } = supabase.storage.from('family-photos').getPublicUrl(fileName);
              src = urlData?.publicUrl || src;
            }
          } catch (err) {
            console.warn(`Migration: Failed to upload photo ${photo.id}:`, err);
          }
        }

        const inserted = throwIfError(
          await supabase.from('media').insert({
            family_id: familyId,
            local_id: photo.id,
            person_id: idMapper.resolve(photo.personId),
            src,
            storage_path: storagePath,
            title: photo.title || 'Family Photograph',
            caption: photo.caption || '',
            date: photo.date || '',
            location: photo.location || '',
            is_primary: Boolean(photo.isPrimary),
          }).select().single(),
          `insert media ${photo.id}`
        );

        const relatedIds = idMapper.resolveArray(photo.relatedPersonIds);
        if (relatedIds.length > 0) {
          throwIfError(
            await supabase.from('media_persons').insert(
              relatedIds.map((pid) => ({ media_id: inserted.id, person_id: pid }))
            ),
            `insert media_persons for ${photo.id}`
          );
        }
      }

      // Step 8: Upload documents
      report(8, `Uploading ${localData.documents.length} documents`);
      for (const doc of localData.documents) {
        throwIfError(
          await supabase.from('documents').insert({
            family_id: familyId,
            local_id: doc.id,
            person_id: idMapper.resolve(doc.personId),
            name: doc.name || 'Archival Document',
            type: doc.type || 'Official Record',
            doc_type: doc.docType || 'Document',
            src: doc.src || '',
            storage_path: '',
            date: doc.date || '',
            description: doc.description || '',
          }).select().single(),
          `insert document ${doc.id}`
        );
      }

      // Step 9: Verify counts
      report(9, 'Verifying migration');
      const verification = await this._verify(familyId, localData);
      if (!verification.success) {
        throw new Error(`Verification failed: ${verification.message}`);
      }

      // Step 10: Activate cloud mode
      report(10, 'Migration complete', 'completed');
      localStorage.setItem(FAMILY_ID_KEY, familyId);
      localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify({
        status: 'completed',
        familyId,
        idMap: idMapper.toJSON(),
        completedAt: new Date().toISOString(),
      }));

      return { familyId, idMap: idMapper.toJSON(), verification };

    } catch (err) {
      report(0, err.message, 'failed');
      throw err;
    }
  }

  async verify() {
    const state = this.getMigrationStatus();
    if (state.status !== 'completed' || !state.familyId) {
      return { success: false, message: 'No completed migration found' };
    }
    const localData = this._loadLocalData();
    if (!localData) return { success: false, message: 'No local data found' };
    return this._verify(state.familyId, localData);
  }

  async rollback() {
    if (!supabase) throw new Error('Supabase is not configured');

    const state = this.getMigrationStatus();
    if (state.familyId) {
      await supabase.from('documents').delete().eq('family_id', state.familyId);
      await supabase.from('media').delete().eq('family_id', state.familyId);
      await supabase.from('life_events').delete().eq('family_id', state.familyId);
      await supabase.from('stories').delete().eq('family_id', state.familyId);
      await supabase.from('relationships').delete().eq('family_id', state.familyId);
      await supabase.from('family_members').delete().eq('family_id', state.familyId);
      await supabase.from('families').delete().eq('id', state.familyId);
    }

    localStorage.removeItem(FAMILY_ID_KEY);
    localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify({ status: 'idle' }));
  }

  // ── Internal Helpers ───────────────────────────────

  _loadLocalData() {
    try {
      const raw = localStorage.getItem('family-tree-data-v2');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        people: parsed.people || [],
        relationships: parsed.relationships || [],
        stories: parsed.stories || [],
        lifeEvents: parsed.lifeEvents || [],
        photos: parsed.photos || [],
        documents: parsed.documents || [],
      };
    } catch {
      return null;
    }
  }

  async _verify(familyId, localData) {
    if (!supabase) return { success: false, message: 'Supabase not configured' };

    const counts = await Promise.all([
      supabase.from('family_members').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
      supabase.from('relationships').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
      supabase.from('stories').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
      supabase.from('life_events').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
      supabase.from('media').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
    ]);

    const [members, rels, stories, events, media, docs] = counts;

    const expected = {
      people: localData.people.length,
      relationships: localData.relationships.length,
      stories: localData.stories.length,
      lifeEvents: localData.lifeEvents.length,
      photos: localData.photos.length,
      documents: localData.documents.length,
    };

    const actual = {
      people: members.count || 0,
      relationships: rels.count || 0,
      stories: stories.count || 0,
      lifeEvents: events.count || 0,
      photos: media.count || 0,
      documents: docs.count || 0,
    };

    const mismatches = [];
    for (const key of Object.keys(expected)) {
      if (expected[key] !== actual[key]) {
        mismatches.push(`${key}: expected ${expected[key]}, got ${actual[key]}`);
      }
    }

    if (mismatches.length > 0) {
      return { success: false, message: mismatches.join('; '), expected, actual };
    }

    return { success: true, expected, actual };
  }
}
