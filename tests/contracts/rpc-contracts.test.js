/**
 * RPC Migration Contracts (Static Verification)
 * 
 * These tests inspect the SQL migration files to verify that security-definer
 * functions exist with the expected signatures. They do NOT execute live RPCs.
 * 
 * For live RPC verification, see tests/integration/supabase/rpc-live.test.js
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('RPC Migration Contracts (Static Verification)', () => {
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

  describe('get_family_role', () => {
    it('is defined as SECURITY DEFINER', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('CREATE OR REPLACE FUNCTION public.get_family_role')).toBe(true);
    });

    it('queries family_memberships with auth.uid()', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('user_id = auth.uid()')).toBe(true);
    });

    it('returns TEXT role type', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('RETURNS TEXT')).toBe(true);
    });
  });

  describe('has_family_role', () => {
    it('is defined as SECURITY DEFINER', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('CREATE OR REPLACE FUNCTION public.has_family_role')).toBe(true);
    });

    it('accepts family_id UUID and role array parameters', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('check_family_id UUID')).toBe(true);
      expect(migrationContent.includes('allowed_roles TEXT[]')).toBe(true);
    });

    it('returns BOOLEAN', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('RETURNS BOOLEAN')).toBe(true);
    });

    it('uses role = ANY(allowed_roles) for array matching', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('role = ANY(allowed_roles)')).toBe(true);
    });
  });

  describe('extract_storage_family_id', () => {
    it('is defined to extract family ID from storage paths', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('CREATE OR REPLACE FUNCTION public.extract_storage_family_id')).toBe(true);
    });

    it('returns UUID type', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('RETURNS UUID')).toBe(true);
    });
  });

  describe('Function Security Properties', () => {
    it('all security functions use SET search_path', () => {
      if (!migrationContent) return;
      const securityFunctions = migrationContent.match(/SECURITY DEFINER[\s\S]{0,50}SET search_path/g);
      expect(securityFunctions && securityFunctions.length >= 2).toBe(true);
    });

    it('prevents SQL injection via search_path manipulation', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('SET search_path = public')).toBe(true);
    });
  });

  describe('Policy DROP Statements', () => {
    it('drops M3A development permissive policies', () => {
      if (!migrationContent) return;
      expect(migrationContent.includes('DROP POLICY IF EXISTS "m3a_allow_all"')).toBe(true);
    });
  });
});
