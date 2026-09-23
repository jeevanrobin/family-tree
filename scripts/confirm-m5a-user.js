/**
 * Confirm M5A Test User Email
 * 
 * This script manually confirms the test user email using the service role key.
 * Run this once after setup-m5a-test-env.js creates the user but before tests run.
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/confirm-m5a-user.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return;
  }
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      process.env[key] = value;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_EMAIL = 'm5a.test.family@gmail.com';
const TEST_USER_ID = '362d1b13-2d1e-490a-b8c9-3d0000243fb4';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  console.error('\nGet service role key from:');
  console.error('  Supabase Dashboard > Project Settings > API > service_role');
  console.error('\nRun:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/confirm-m5a-user.js');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function confirm() {
  console.log('=== Confirming M5A Test User ===\n');

  // First, try to find the user
  console.log('1. Listing users...');
  const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers();
  
  if (listError) {
    console.error('   ✗ Failed to list users:', listError.message);
    process.exit(1);
  }

  const testUser = usersList.users.find(u => u.email === TEST_EMAIL);
  
  if (!testUser) {
    console.error('   ✗ Test user not found');
    console.error('   Run setup-m5a-test-env.js first');
    process.exit(1);
  }

  console.log('   ✓ Found test user');
  console.log(`   User ID: ${testUser.id}`);
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Email confirmed: ${testUser.email_confirmed_at || 'NO'}`);

  if (testUser.email_confirmed_at) {
    console.log('\n   ✓ Email already confirmed');
    process.exit(0);
  }

  // Confirm the email
  console.log('\n2. Confirming email...');
  const { error: confirmError } = await adminClient.auth.admin.updateUserById(
    testUser.id,
    { email_confirm: true }
  );

  if (confirmError) {
    console.error('   ✗ Failed to confirm:', confirmError.message);
    process.exit(1);
  }

  console.log('   ✓ Email confirmed!');

  // Verify authentication works
  console.log('\n3. Verifying authentication...');
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: session, error: authError } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: 'M5ATestFamily2026!',
  });

  if (authError) {
    console.error('   ✗ Authentication failed:', authError.message);
    process.exit(1);
  }

  console.log('   ✓ Authentication successful');
  console.log(`   User ID: ${session.session.user.id}`);
  
  await anonClient.auth.signOut();

  console.log('\n=== SUCCESS ===');
  console.log('\nTest user is ready for M5A tests');
}

confirm().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
