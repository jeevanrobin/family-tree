import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
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
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

console.log('URL:', supabaseUrl);
console.log('Email:', testEmail);
console.log('Password length:', testPassword?.length);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data, error } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
});

if (error) {
  console.error('Auth error:', error.message);
  console.error('Full error:', JSON.stringify(error, null, 2));
  process.exit(1);
}

console.log('Success!');
console.log('User ID:', data.session.user.id);
console.log('Email confirmed:', data.session.user.email_confirmed_at);

await supabase.auth.signOut();
process.exit(0);
