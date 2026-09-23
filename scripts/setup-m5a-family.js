/**
 * Complete M5A Test Family Setup
 * 
 * Requires that the test user already exists and email is confirmed.
 * This script assumes:
 *   1. Test user exists in Supabase Auth
 *   2. Email is confirmed (manually or via service role)
 *   3. TEST_USER_EMAIL and TEST_USER_PASSWORD are in .env.local
 * 
 * This script:
 *   1. Authenticates as the test user
 *   2. Creates the test family if needed
 *   3. Seeds 3+ family members, relationships, and stories
 *   4. Outputs the TEST_FAMILY_ID to add to .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const testUserEmail = process.env.TEST_USER_EMAIL || 'm5a.test.family@gmail.com';
const testUserPassword = process.env.TEST_USER_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be in .env.local');
  process.exit(1);
}

if (!testUserPassword) {
  console.error('ERROR: TEST_USER_PASSWORD must be in .env.local');
  process.exit(1);
}

const TEST_FAMILY_NAME = 'M5A Test Family';

async function setup() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('=== M5A Test Family Setup ===\n');

  // Authenticate
  console.log('1. Authenticating as test user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testUserEmail,
    password: testUserPassword,
  });

  if (authError) {
    console.error('   ✗ Authentication failed:', authError.message);
    console.error('\n   Ensure TEST_USER_EMAIL and TEST_USER_PASSWORD are correctly set in .env.local');
    console.error('   Ensure the test user email is confirmed in Supabase Dashboard');
    process.exit(1);
  }

  const userId = authData.session.user.id;
  console.log('   ✓ Authenticated');
  console.log(`   User ID: ${userId}`);
  console.log(`   Email: ${authData.session.user.email}`);

  // Check for existing test family
  console.log('\n2. Checking for existing test family...');
  const { data: existingFamilies, error: famError } = await supabase
    .from('families')
    .select('id, name')
    .eq('name', TEST_FAMILY_NAME);

  let familyId;

  if (existingFamilies && existingFamilies.length > 0) {
    familyId = existingFamilies[0].id;
    console.log('   ✓ Test family exists');
    console.log(`   Family ID: ${familyId}`);

    // Verify membership
    const { data: membership } = await supabase
      .from('family_memberships')
      .select('role')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'owner') {
      console.log('   ! User is not owner of this family');
      // Try to delete and recreate
      console.log('   Creating new family...');
      const { data: newFamily, error: createError } = await supabase.rpc('create_family_with_owner', {
        family_name: `${TEST_FAMILY_NAME} ${Date.now()}`,
        family_description: 'M5A automated test family',
      });

      if (createError) {
        console.error('   ✗ Failed to create family:', createError.message);
        await supabase.auth.signOut();
        process.exit(1);
      }

      familyId = newFamily[0].id;
      console.log('   ✓ Created new family');
      console.log(`   Family ID: ${familyId}`);
    }
  } else {
    console.log('   Creating test family...');
    const { data: newFamily, error: createError } = await supabase.rpc('create_family_with_owner', {
      family_name: TEST_FAMILY_NAME,
      family_description: 'M5A automated test family',
    });

    if (createError) {
      console.error('   ✗ Failed to create family:', createError.message);
      await supabase.auth.signOut();
      process.exit(1);
    }

    familyId = newFamily[0].id;
    console.log('   ✓ Test family created');
    console.log(`   Family ID: ${familyId}`);
  }

  // Check existing data
  const { data: existingMembers } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', familyId);

  const { data: existingRelationships } = await supabase
    .from('relationships')
    .select('id')
    .eq('family_id', familyId);

  const { data: existingStories } = await supabase
    .from('stories')
    .select('id')
    .eq('family_id', familyId);

  console.log(`\n3. Checking test data...`);
  console.log(`   Members: ${existingMembers?.length || 0}`);
  console.log(`   Relationships: ${existingRelationships?.length || 0}`);
  console.log(`   Stories: ${existingStories?.length || 0}`);

  // Seed if needed
  if (!existingMembers || existingMembers.length < 3) {
    console.log('\n   Seeding test data...');
    await seedData(supabase, familyId);
  } else {
    console.log('   ✓ Test data exists (need 3+ members, 1+ relationship, 1+ story)');
  }

  // Verify final state
  console.log('\n4. Verifying final state...');
  const { data: finalMembers } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', familyId);

  const { data: finalRelationships } = await supabase
    .from('relationships')
    .select('id')
    .eq('family_id', familyId);

  const { data: finalStories } = await supabase
    .from('stories')
    .select('id')
    .eq('family_id', familyId);

  console.log(`   Members: ${finalMembers?.length || 0}`);
  console.log(`   Relationships: ${finalRelationships?.length || 0}`);
  console.log(`   Stories: ${finalStories?.length || 0}`);

  // Test RPC functions
  console.log('\n5. Testing RPC functions...');
  const { data: roleData, error: roleError } = await supabase.rpc('get_family_role', {
    check_family_id: familyId,
  });

  if (roleError) {
    console.error('   ✗ get_family_role failed:', roleError.message);
  } else {
    console.log(`   ✓ get_family_role: ${roleData}`);
  }

  await supabase.auth.signOut();

  console.log('\n=== SETUP COMPLETE ===');
  console.log('\nEnvironment variables for .env.local:');
  console.log(`TEST_USER_EMAIL=${testUserEmail}`);
  console.log('TEST_USER_PASSWORD=(already set)');
  console.log(`TEST_FAMILY_ID=${familyId}`);
}

async function seedData(supabase, familyId) {
  const members = [
    { first_name: 'Test', last_name: 'Ancestor', display_name: 'Test Ancestor', gender: 'male' },
    { first_name: 'Test', last_name: 'Partner', display_name: 'Test Partner', gender: 'female' },
    { first_name: 'Test', last_name: 'Child', display_name: 'Test Child', gender: 'male' },
    { first_name: 'Test', last_name: 'Daughter', display_name: 'Test Daughter', gender: 'female' },
  ];

  const createdMembers = [];

  for (let i = 0; i < members.length; i++) {
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        ...members[i],
        living_status: 'alive',
        privacy: 'family',
      })
      .select()
      .single();

    if (memberError) {
      console.error(`   ✗ Failed to create member ${i + 1}:`, memberError.message);
    } else {
      console.log(`   ✓ Created member: ${member.display_name}`);
      createdMembers.push(member);
    }
  }

  if (createdMembers.length >= 2) {
    const { error: spouseError } = await supabase
      .from('relationships')
      .insert({
        family_id: familyId,
        type: 'spouse',
        person_id_1: createdMembers[0].id,
        person_id_2: createdMembers[1].id,
      });

    if (spouseError) {
      console.error('   ✗ Failed to create spouse relationship:', spouseError.message);
    } else {
      console.log('   ✓ Created spouse relationship');
    }

    // Parent-child relationship
    if (createdMembers.length >= 3) {
      const { error: parentChildError } = await supabase
        .from('relationships')
        .insert({
          family_id: familyId,
          type: 'parent-child',
          person_id_1: createdMembers[0].id,
          person_id_2: createdMembers[2].id,
        });

      if (parentChildError) {
        console.error('   ✗ Failed to create parent-child relationship:', parentChildError.message);
      } else {
        console.log('   ✓ Created parent-child relationship');
      }
    }
  }

  // Create story
  const { error: storyError } = await supabase
    .from('stories')
    .insert({
      family_id: familyId,
      person_id: createdMembers[0].id,
      title: 'Test Family Origin',
      content: 'This is a test story for M5A automated testing. It documents the origins of the test family.',
      date: '2000',
    });

  if (storyError) {
    console.error('   ✗ Failed to create story:', storyError.message);
  } else {
    console.log('   ✓ Created story');
  }
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
