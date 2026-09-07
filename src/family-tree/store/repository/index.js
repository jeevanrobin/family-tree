import { LocalAdapter } from './LocalAdapter.js';
import { SupabaseAdapter } from './SupabaseAdapter.js';
import { SyncAdapter } from './SyncAdapter.js';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';

export const FAMILY_ID_KEY = 'family-tree-active-family-id';

/**
 * Factory to create a repository instance.
 *
 * In cloud mode: returns SyncAdapter (combining IndexedDB local cache + SupabaseAdapter).
 * In local mode: returns LocalAdapter (pure localStorage/memory with zero cloud dependencies).
 *
 * @param {string} [activeFamilyId] - Verified active family ID for cloud mode
 * @returns {import('./FamilyRepository.js').FamilyRepository}
 */
export function createRepository(activeFamilyId) {
  if (isSupabaseConfigured && activeFamilyId) {
    const cloudAdapter = new SupabaseAdapter(activeFamilyId);
    return new SyncAdapter(activeFamilyId, cloudAdapter);
  }

  // Local fallback: runs LocalAdapter with zero Supabase dependencies
  return new LocalAdapter();
}

export { FamilyRepository } from './FamilyRepository.js';
export { LocalAdapter } from './LocalAdapter.js';
export { SupabaseAdapter } from './SupabaseAdapter.js';
export { SyncAdapter } from './SyncAdapter.js';
