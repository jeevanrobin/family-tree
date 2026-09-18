/**
 * Static contract tests for secure atomic first-family creation.
 * These checks do not connect to Supabase and do not create data.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = path.join(rootDir, 'supabase', 'migrations', '007_secure_family_creation.sql');
const createFamilyPath = path.join(rootDir, 'src', 'family-tree', 'components', 'auth', 'CreateFamilyPage.jsx');

assert(fs.existsSync(migrationPath), 'Migration 007 must exist');

const migration = fs.readFileSync(migrationPath, 'utf8');
const createFamily = fs.readFileSync(createFamilyPath, 'utf8');

assert(migration.includes('CREATE OR REPLACE FUNCTION public.create_family_with_owner'), 'Atomic family creation RPC must exist');
assert(migration.includes('SECURITY DEFINER'), 'RPC must use SECURITY DEFINER');
assert(migration.includes("SET search_path = public"), 'RPC must use a fixed search_path');
assert(migration.includes('auth.uid()'), 'RPC must derive identity from auth.uid()');
assert(migration.includes("VALUES (new_family.id, caller_id, 'owner')"), 'RPC must assign the owner role itself');
assert(migration.includes('created_by'), 'RPC must set created_by from the authenticated user');
assert(migration.includes('REVOKE ALL ON FUNCTION public.create_family_with_owner'), 'RPC must revoke public/anonymous execution');
assert(migration.includes('GRANT EXECUTE ON FUNCTION public.create_family_with_owner'), 'RPC must grant authenticated execution');
assert(migration.includes('memberships_insert_owner_or_initial_secure'), 'Migration must replace the bootstrap membership policy');
assert(!migration.includes('family_memberships_1.family_id = family_memberships_1.family_id'), 'Bootstrap policy must not use the defective self-comparison');
assert(migration.includes('existing_membership.family_id = family_memberships.family_id'), 'Bootstrap policy must correlate existing memberships to the candidate family');

assert(createFamily.includes("supabase.rpc('create_family_with_owner'"), 'CreateFamilyPage must call the atomic RPC');
assert(createFamily.includes('family_name: trimmedName'), 'RPC must receive the trimmed family name');
assert(createFamily.includes('family_description:'), 'RPC must receive the optional description');
assert(!createFamily.includes(".from('families')"), 'CreateFamilyPage must not insert families directly');
assert(!createFamily.includes(".from('family_memberships')"), 'CreateFamilyPage must not insert memberships directly');
assert(!createFamily.includes('user_id:'), 'CreateFamilyPage must not pass user_id to the RPC');
assert(!createFamily.includes("role: 'owner'"), 'CreateFamilyPage must not pass role to the RPC');
assert(!createFamily.includes('created_by:'), 'CreateFamilyPage must not pass created_by to the RPC');

console.log('M3F atomic family creation contract: 14 passed, 0 failed');
