/**
 * M5A Test Environment Setup
 * 
 * Creates a dedicated test user and test family for M5A browser QA.
 * Run this script ONCE to set up the test environment.
 * 
 * Usage:
 *   node scripts/setup-m5a-test-env.js
 * 
 * Requirements:
 *   - VITE_SUPABASE_URL in .env.local
 *   - VITE_SUPABASE_ANON_KEY in .env.local (anon key)
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local (for auto email confirmation)
 * 
 * If SUPABASE_SERVICE_ROLE_KEY is not provided, you'll need to manually
 * confirm the test user's email via Supabase Dashboard.
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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
}) : null;

const TEST_EMAIL = 'm5a.test.family@gmail.com';
const TEST_PASSWORD = 'M5ATestFamily2026!';
const TEST_FAMILY_NAME = 'M5A Test Family';

async function setup() {
  console.log('=== M5A Test Environment Setup ===\n');

  let userId;
  let userEmailConfirmed = false;

  // First try to list users with admin client to find existing test user
  if (adminClient) {
    console.log('1. Checking for existing test user with admin API...');
    try {
      const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers();
      if (!listError && usersList?.users) {
        const existingUser = usersList.users.find(u => u.email === TEST_EMAIL);
        if (existingUser) {
          userId = existingUser.id;
          userEmailConfirmed = existingUser.email_confirmed_at != null;
          console.log('   ✓ Found existing test user');
          console.log(`   User ID: ${userId}`);
          console.log(`   Email confirmed: ${userEmailConfirmed}`);

          if (!userEmailConfirmed) {
            console.log('   Auto-confirming email...');
            const { error: confirmError } = await adminClient.auth.admin.updateUserById(
              userId,
              { email_confirm: true }
            );
            if (!confirmError) {
              console.log('   ✓ Email confirmed');
              userEmailConfirmed = true;
            }
          }
        }
      }
    } catch (e) {
      console.log('   Admin API not available:', e.message);
    }
  }

  // Try to authenticate with the test credentials if we haven't found the user yet
  if (!userId) {
    console.log('1. Checking if test user already exists...');
    const { data: existingSession, error: existingError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (existingSession?.session) {
      console.log('   ✓ Test user exists and credentials are valid');
      userId = existingSession.session.user.id;
      userEmailConfirmed = existingSession.session.user.email_confirmed_at != null;
      console.log(`   User ID: ${userId}`);
      console.log(`   Email confirmed: ${userEmailConfirmed}`);
      await supabase.auth.signOut();
    } else {
      console.log('   Test user does not exist or credentials invalid');
      console.log('   Attempting to create test user...');
      
      // Create test user
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: {
          emailRedirectTo: undefined,
          data: {
            role: 'test',
          }
        }
      });

      if (signupError) {
        console.error('   ✗ Failed to create test user:', signupError.message);
        console.error('\n   MANUAL ACTION REQUIRED:');
        console.error('   1. Go to Supabase Dashboard > Authentication > Users');
        console.error('   2. Create user with:');
        console.error(`      Email: ${TEST_EMAIL}`);
        console.error(`      Password: ${TEST_PASSWORD}`);
        console.error('   3. Mark email as confirmed');
        console.error('   4. Add SUPABASE_SERVICE_ROLE_KEY to .env.local for auto-confirm');
        console.error('   5. Re-run this script');
        process.exit(1);
      }

      userId = signupData.user?.id;
      userEmailConfirmed = signupData.user?.email_confirmed_at != null;
      console.log('   ✓ Test user created');
      console.log(`   User ID: ${userId}`);
      console.log(`   Email confirmed: ${userEmailConfirmed}`);

      if (!userEmailConfirmed && adminClient) {
        console.log('\n   Auto-confirming email with service role...');
        try {
          const { data: confirmData, error: confirmError } = await adminClient.auth.admin.updateUserById(
            userId,
            { email_confirm: true }
          );
          if (confirmError) {
            console.log('   ! Could not auto-confirm:', confirmError.message);
          } else {
            console.log('   ✓ Email auto-confirmed');
            userEmailConfirmed = true;
          }
        } catch (e) {
          console.log('   ! Auto-confirm failed:', e.message);
        }
      }

      if (!userEmailConfirmed) {
        console.log('\n   WARNING: Email not auto-confirmed');
        console.log('   MANUAL ACTION MAY BE REQUIRED:');
        console.log('   1. Go to Supabase Dashboard > Authentication > Users');
        console.log('   2. Find the test user and manually confirm the email');
        console.log('   3. OR add SUPABASE_SERVICE_ROLE_KEY to .env.local');
        console.log('   4. Re-run this script');
      }
    }
  }

  // Check if test family exists
  console.log('\n2. Checking test family...');
  
  // Sign in to check data
  const { data: session } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!session.session) {
    console.error('   ✗ Cannot authenticate with test user');
    console.error('   Please confirm the email and re-run this script');
    process.exit(1);
  }

  // Check for existing test families
  const { data: existingFamilies, error: familyError } = await supabase
    .from('families')
    .select('id, name')
    .eq('name', TEST_FAMILY_NAME);

  if (familyError) {
    console.error('   ✗ Error querying families:', familyError.message);
    await supabase.auth.signOut();
    process.exit(1);
  }

  if (existingFamilies && existingFamilies.length > 0) {
    const familyId = existingFamilies[0].id;
    console.log('   ✓ Test family already exists');
    console.log(`   Family ID: ${familyId}`);

    // Verify membership
    const { data: membership } = await supabase
      .from('family_memberships')
      .select('role')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single();

    if (membership?.role === 'owner') {
      console.log('   ✓ Test user is owner');
    } else {
      console.log('   ! Test user is not owner, updating...');
      // This may fail if not owner - would need service role key
      const { error: updateError } = await supabase
        .from('family_memberships')
        .upsert({ family_id: familyId, user_id: userId, role: 'owner' });
      
      if (updateError) {
        console.log('   ✗ Could not set owner role:', updateError.message);
      } else {
        console.log('   ✓ Set owner role');
      }
    }

    // Check family members count
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId);

    console.log(`   Family members: ${members?.length || 0}`);

    // Check relationships count
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .eq('family_id', familyId);

    console.log(`   Relationships: ${relationships?.length || 0}`);

    // Check stories count
    const { data: stories, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('family_id', familyId);

    console.log(`   Stories: ${stories?.length || 0}`);

    // Check if we need more data
    const needsSetup = !members || members.length < 3 || !relationships || relationships.length < 1 || !stories || stories.length < 1;
    
    if (!needsSetup) {
      console.log('\n   ✓ Test family data is complete');
      await supabase.auth.signOut();
      
      console.log('\n=== SETUP COMPLETE ===');
      console.log('\nAdd to .env.local:');
      console.log(`TEST_USER_EMAIL=${TEST_EMAIL}`);
      console.log('TEST_USER_PASSWORD=<password>');
      console.log(`TEST_FAMILY_ID=${familyId}`);
      console.log('\n(Password shown above - do not commit this file)');
    } else {
      console.log('\n   Test family needs more data (need 3+ members, 1+ relationship, 1+ story)');
      await seedTestData(familyId, userId);
    }

    await supabase.auth.signOut();
    return;
  }

  // Create test family using RPC
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

  if (!newFamily || newFamily.length === 0) {
    console.error('   ✗ No family returned from RPC');
    await supabase.auth.signOut();
    process.exit(1);
  }

  const familyId = newFamily[0].id;
  console.log('   ✓ Test family created');
  console.log(`   Family ID: ${familyId}`);

  // Seed test data
  await seedTestData(familyId, userId);

  await supabase.auth.signOut();

  console.log('\n=== SETUP COMPLETE ===');
  console.log('\nAdd to .env.local:');
  console.log(`TEST_USER_EMAIL=${TEST_EMAIL}`);
  console.log('TEST_USER_PASSWORD=<password>');
  console.log(`TEST_FAMILY_ID=${familyId}`);
  console.log('\n(Password shown above - do not commit this file)');
}

async function seedTestData(familyId, userId) {
  console.log('\n3. Seeding test data...');

  // Create 3 family members
  const members = [
    { first_name: 'Test', last_name: 'Ancestor', display_name: 'Test Ancestor', gender: 'male' },
    { first_name: 'Test', last_name: 'Partner', display_name: 'Test Partner', gender: 'female' },
    { first_name: 'Test', last_name: 'Child', display_name: 'Test Child', gender: 'male' },
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

  if (createdMembers.length < 3) {
    console.error('   ✗ Insufficient members created (need 3)');
    return;
  }

  // Create relationship (spouse between first two)
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
  }

  // Create parent-child relationship
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

  // Create a story
  const { error: storyError } = await supabase
    .from('stories')
    .insert({
      family_id: familyId,
      person_id: createdMembers[0].id,
      title: 'Test Family Origin',
      content: 'This is a test story for M5A automated testing.',
      date: '2000',
    });

  if (storyError) {
    console.error('   ✗ Failed to create story:', storyError.message);
  } else {
    console.log('   ✓ Created story');
  }

  console.log(`\n   ✓ Test data seeded`);
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
