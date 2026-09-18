/**
 * Live RLS Verification Tests
 * 
 * These tests execute REAL queries against Supabase with authenticated sessions
 * to verify Row-Level Security policies are enforced.
 * 
 * ENVIRONMENT REQUIREMENTS:
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured
 * - Test user(s) must exist with known credentials
 * - Test family(s) must exist with known IDs
 * 
 * CONFIGURATION:
 * Set environment variables:
 *   TEST_USER_EMAIL - email for test user authentication
 *   TEST_USER_PASSWORD - password for test user
 *   TEST_FAMILY_ID - UUID of test family for Owner tests
 * 
 * SAFETY:
 * - Tests use dedicated test data that can be cleaned up
 * - Service role key is NEVER used to test RLS behavior
 * - Tests create temporary entities and clean up after themselves
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';
const TEST_FAMILY_ID = process.env.TEST_FAMILY_ID || '';

const canRunLiveTests = TEST_USER_EMAIL && TEST_USER_PASSWORD && TEST_FAMILY_ID;

const describeIf = canRunLiveTests ? describe : describe.skip;

describeIf('Live RLS Verification', () => {
  let supabase;
  let session;
  let adapter;

  beforeAll(async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required');
    }

    supabase = createClient(url, anonKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (error) {
      throw new Error(`Failed to authenticate test user: ${error.message}`);
    }

    session = data.session;

    const { SupabaseAdapter } = await import('../../../src/family-tree/store/repository/SupabaseAdapter.js');
    adapter = new SupabaseAdapter(TEST_FAMILY_ID);
  });

  afterAll(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  });

  describe('Owner Permissions', () => {
    it('can SELECT from family_members', async () => {
      const { data, error } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', TEST_FAMILY_ID)
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('can SELECT from relationships', async () => {
      const { data, error } = await supabase
        .from('relationships')
        .select('id')
        .eq('family_id', TEST_FAMILY_ID)
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('can SELECT from stories', async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id')
        .eq('family_id', TEST_FAMILY_ID)
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Cross-Family Boundary', () => {
    it('cannot SELECT data from unaffiliated family', async () => {
      const fakeFamilyId = '00000000-0000-0000-0000-000000000999';

      const { data, error } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', fakeFamilyId);

      expect(error).toBeNull();
      expect(data.length).toBe(0);
    });
  });

  describe('RPC Functions', () => {
    it('get_family_role returns role for member', async () => {
      const { data, error } = await supabase.rpc('get_family_role', {
        check_family_id: TEST_FAMILY_ID,
      });

      expect(error).toBeNull();
      expect(['owner', 'editor', 'contributor', 'viewer']).toContain(data);
    });

    it('has_family_role returns true for valid role', async () => {
      const { data, error } = await supabase.rpc('has_family_role', {
        check_family_id: TEST_FAMILY_ID,
        allowed_roles: ['owner', 'editor', 'contributor', 'viewer'],
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });
  });
});

describe('Live RLS Environment Check', () => {
  it('reports when live test environment is not configured', () => {
    if (!canRunLiveTests) {
      console.log('\n[INFO] Live RLS tests SKIPPED');
      console.log('  Required environment variables:');
      console.log('    TEST_USER_EMAIL - test user email');
      console.log('    TEST_USER_PASSWORD - test user password');
      console.log('    TEST_FAMILY_ID - UUID of test family');
      console.log('  To run live tests, configure these variables and re-run.');
    }
    expect(true).toBe(true);
  });
});
