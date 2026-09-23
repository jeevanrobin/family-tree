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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Try to get current session status via health check
const { data: health, error: healthError } = await supabase.auth.getSession();

console.log('Session check:', health ? 'Has session' : 'No session');

// Check admin API availability
try {
  const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
    headers: { 'apikey': supabaseAnonKey }
  });
  const text = await response.text();
  console.log('Auth health:', response.status, text.substring(0, 100));
} catch (e) {
  console.error('Health check failed:', e.message);
}

// List users via signup (which should fail for existing user)
const { data: signupData, error: signupError } = await supabase.auth.signUp({
  email: 'test-does-not-exist-123456@example.com',
  password: 'TestPass123!',
},);

console.log('SignUp test:', signupError ? signupError.message : 'Created (rate limited)');
