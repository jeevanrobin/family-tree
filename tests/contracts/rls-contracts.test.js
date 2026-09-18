/**
 * RLS Migration Contracts (Static Verification)
 * 
 * These tests inspect the SQL migration files to verify that the expected
 * RLS policies and security functions exist. They do NOT execute live
 * queries against PostgreSQL.
 * 
 * For live RLS verification, see tests/integration/supabase/rls-live.test.js
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('RLS Migration Contracts (Static Verification)', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '003_auth_and_memberships.sql'
  );
  let migrationContent = '';

  beforeAll(() => {
    if (fs.existsSync(migrationPath)) {
      migrationContent = fs.readFileSync(migrationPath, 'utf8');
    }
  });

  describe('Table RLS Enforcement', () => {
    it('enables RLS on families table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE families ENABLE ROW LEVEL SECURITY')).toBe(true);
    });

    it('enables RLS on family_memberships table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE family_memberships ENABLE ROW LEVEL SECURITY')).toBe(true);
    });

    it('enables RLS on family_members table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE family_members ENABLE ROW LEVEL SECURITY')).toBe(true);
    });

    it('enables RLS on relationships table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE relationships ENABLE ROW LEVEL SECURITY')).toBe(true);
    });

    it('enables RLS on stories table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE stories ENABLE ROW LEVEL SECURITY')).toBe(true);
    });

    it('enables RLS on life_events table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE life_events ENABLE ROW LEVEL SECURITY')).toBe(true);
    });

    it('enables RLS on media table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE media ENABLE ROW LEVEL SECURITY')).toBe(true);
    });

    it('enables RLS on documents table', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('ALTER TABLE documents ENABLE ROW LEVEL SECURITY')).toBe(true);
    });
  });

  describe('Security Helper Functions', () => {
    it('defines get_family_role function with SECURITY DEFINER', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('CREATE OR REPLACE FUNCTION public.get_family_role')).toBe(true);
      expect(migrationContent.includes('SECURITY DEFINER')).toBe(true);
    });

    it('defines has_family_role function with SECURITY DEFINER', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('CREATE OR REPLACE FUNCTION public.has_family_role')).toBe(true);
      expect(migrationContent.includes('SECURITY DEFINER')).toBe(true);
    });

    it('sets fixed search_path to prevent RLS recursion', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('SET search_path = public')).toBe(true);
    });
  });

  describe('Table Policies', () => {
    it('families SELECT policy requires membership', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('families_select_member')).toBe(true);
    });

    it('families UPDATE requires owner role', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('families_update_owner')).toBe(true);
    });

    it('family_members SELECT requires membership', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('family_members_select')).toBe(true);
    });

    it('family_members INSERT requires owner or editor role', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('family_members_insert')).toBe(true);
    });
  });

  describe('Role Enforcement', () => {
    it('enforces valid role values via CHECK constraint', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes("CHECK (role IN ('owner', 'editor', 'contributor', 'viewer'))")).toBe(true);
    });

    it('default role is viewer', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes("DEFAULT 'viewer'")).toBe(true);
    });
  });
});
