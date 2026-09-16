/**
 * test-auth-pages.js
 *
 * Verification suite for the premium /signin, /signup and /reset-password pages:
 * 1.  /signin and /signup routes render the auth components
 * 2.  Sign In uses the existing useAuth() authentication abstraction
 * 3.  Sign Up uses the existing useAuth() authentication abstraction
 * 4.  All original sign-up validations preserved (order + strings)
 * 5.  Loading state: disabled button + spinner + double-submit guards
 * 6.  Supabase/auth errors display in accessible banners
 * 7.  Email verification state renders "Check your email" + safe email + Back to Sign In
 * 8.  Forgot-password flow preserved (form switch + resetPassword + generic response)
 * 9.  Create Your Family CTA -> /signup
 * 10. Already have an account CTA -> /signin
 * 11. Back to Medida's Family -> /
 * 12. Password visibility toggle is accessible and never submits the form
 * 13. Auth pages load no family data (no FamilyStore/FamilyContext imports)
 * 14. Theme support via the shared data-theme system (light + dark)
 * 15. Reduced-motion support
 * 16. Responsive breakpoints for tablet/mobile
 * 17. No client-side fake sessions, no password storage, no Supabase bypass
 * 18. Branding: auth pages treat "Medida's Family" as the product, not the user's family
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalPassed = 0;
let totalFailed = 0;

async function runTest(category, name, fn) {
  try {
    await fn();
    console.log(`[PASS] [${category}] ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`[FAIL] [${category}] ${name}`);
    console.error(err);
    totalFailed++;
  }
}

// Mock browser globals for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(String(k)) || null,
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(String(k)),
    clear: () => store.clear(),
  };
}

const authDir = path.join(rootDir, 'src', 'family-tree', 'components', 'auth');
const read = (file) => fs.readFileSync(path.join(authDir, file), 'utf-8');

const signInSrc = read('SignInPage.jsx');
const signUpSrc = read('SignUpPage.jsx');
const resetSrc = read('ResetPasswordPage.jsx');
const shellSrc = read('AuthShell.jsx');
const inputSrc = read('AuthInput.jsx');
const authCss = read('auth.css');

console.log('==================================================');
console.log('PREMIUM AUTH PAGES VERIFICATION');
console.log('==================================================\n');

// ── 1. ROUTING ──

await runTest('Unit / Routing', 'Test 1: /signin, /signup and /reset-password routes exist', async () => {
  const appSrc = fs.readFileSync(path.join(rootDir, 'src', 'App.jsx'), 'utf-8');
  assert(appSrc.includes('path="/signin"'), 'App.jsx must route /signin');
  assert(appSrc.includes('path="/signup"'), 'App.jsx must route /signup');
  assert(appSrc.includes('path="/reset-password"'), 'App.jsx must route /reset-password');
  assert(appSrc.includes('<SignInPage />'), '/signin must render SignInPage');
  assert(appSrc.includes('<SignUpPage />'), '/signup must render SignUpPage');
});

// ── 2. EXISTING AUTH IMPLEMENTATION ──

await runTest('Unit / Auth', 'Test 2: Sign In uses the existing useAuth() implementation', async () => {
  assert(signInSrc.includes("from '../../hooks/useAuth.js'"), 'SignInPage must import the useAuth hook');
  assert(signInSrc.includes('useAuth()'), 'SignInPage must use useAuth()');
  assert(signInSrc.includes('await signIn({ email, password })'), 'Must call the existing signIn with email + password');
  assert(signInSrc.includes('await resetPassword({ email })'), 'Must delegate password reset through useAuth()');
  assert(signInSrc.includes("navigate('/app')"), 'Must navigate to /app after success');
  assert(signInSrc.includes('isSupabaseConfigured'), 'Configuration state may be read by the page');
  assert(!/createClient\s*\(/.test(signInSrc), 'SignInPage must not create a Supabase client');
  assert(!/\.auth\.(signInWithPassword|signUp|resetPasswordForEmail)\s*\(/.test(signInSrc), 'SignInPage must not call Supabase auth methods directly');
  assert(!/authService\s*\./.test(signInSrc), 'SignInPage must not bypass useAuth() with authService');
});

await runTest('Unit / Auth', 'Test 3: Sign Up uses the existing useAuth() implementation', async () => {
  assert(signUpSrc.includes("from '../../hooks/useAuth.js'"), 'SignUpPage must import the useAuth hook');
  assert(signUpSrc.includes('useAuth()'), 'SignUpPage must use useAuth()');
  assert(signUpSrc.includes('await signUp({'), 'Must call the existing signUp');
  assert(signUpSrc.includes('firstName: cleanFirstName'), 'Must pass firstName metadata as before');
  assert(signUpSrc.includes("navigate('/app')"), 'Must navigate to /app when directly authenticated');
  assert(signUpSrc.includes('isSupabaseConfigured'), 'Configuration state may be read by the page');
  assert(!/createClient\s*\(/.test(signUpSrc), 'SignUpPage must not create a Supabase client');
  assert(!/\.auth\.(signInWithPassword|signUp|resetPasswordForEmail)\s*\(/.test(signUpSrc), 'SignUpPage must not call Supabase auth methods directly');
  assert(!/authService\s*\./.test(signUpSrc), 'SignUpPage must not bypass useAuth() with authService');
});

await runTest('Unit / Auth', 'Test 4: All original sign-up validations preserved (order + strings)', async () => {
  const firstNameCheck = signUpSrc.indexOf('Please enter your first name.');
  const emailCheck = signUpSrc.indexOf('Please enter a valid email address.');
  const lengthCheck = signUpSrc.indexOf('Password must be at least 6 characters long.');
  const matchCheck = signUpSrc.indexOf('Passwords do not match.');
  assert(firstNameCheck !== -1, 'First name validation must exist');
  assert(emailCheck !== -1, 'Email validation must exist');
  assert(lengthCheck !== -1, 'Password length validation must exist');
  assert(matchCheck !== -1, 'Password match validation must exist');
  assert(
    firstNameCheck < emailCheck && emailCheck < lengthCheck && lengthCheck < matchCheck,
    'Validation order must be preserved: firstName -> email -> length -> match'
  );
  assert(signUpSrc.includes('trim().toLowerCase()'), 'Email normalization preserved');
});

await runTest('Unit / Auth', 'Test 5: Email verification state preserved', async () => {
  assert(signUpSrc.includes('isEmailVerificationSent'), 'Verification state flag must exist');
  assert(signUpSrc.includes('res?.user && !res?.session'), 'Must detect verification-required from session absence');
  assert(signUpSrc.includes('Check your email'), 'Verification state must show "Check your email"');
  assert(signUpSrc.includes('We sent a verification link to your email address.'), 'Verification state must show supporting text');
  assert(signUpSrc.includes('{email}'), 'Verification state must show the email address');
  assert(signUpSrc.includes('to="/signin"'), 'Verification state must link back to sign in');
  assert(!signUpSrc.toLowerCase().includes('resend'), 'Must not invent unsupported resend behavior');
});

await runTest('Unit / Auth', 'Test 6: Forgot-password flow preserved', async () => {
  assert(signInSrc.includes("'forgot-password'"), 'Forgot-password form mode must exist');
  assert(signInSrc.includes('await resetPassword({ email })'), 'Must call the existing resetPassword');
  assert(
    signInSrc.includes('If an account exists with that email address'),
    'Anti-enumeration generic response preserved'
  );
  assert(resetSrc.includes('await updateUser({ data: {}, password })'), 'Reset page must use updateUser');
  assert(resetSrc.includes("navigate('/signin')"), 'Reset page must return to sign in');
});

// ── 3. STATES ──

await runTest('Unit / States', 'Test 7: Loading and double-submit protection', async () => {
  assert(signInSrc.includes('if (loading) return;'), 'Sign In must guard double-submit');
  assert(signUpSrc.includes('if (isSubmitting) return;'), 'Sign Up must guard double-submit');
  assert(signInSrc.includes('disabled={loading}'), 'Sign In button disabled while loading');
  assert(signUpSrc.includes('disabled={isSubmitting}'), 'Sign Up button disabled while submitting');
  assert(signInSrc.includes('fa-btn__spinner'), 'Sign In shows a loading spinner');
  assert(signUpSrc.includes('fa-btn__spinner'), 'Sign Up shows a loading spinner');
  assert(signUpSrc.includes('finally'), 'Sign Up must clear submitting state in finally');
});

await runTest('Unit / States', 'Test 8: Auth and Supabase errors display in accessible banners', async () => {
  assert(signInSrc.includes('fa-banner--error'), 'Sign In renders error banners');
  assert(signInSrc.includes('role="alert"'), 'Banners must be role=alert');
  assert(signInSrc.includes('authError && !statusMessage'), 'useAuth error fallback preserved');
  assert(signUpSrc.includes('err.message'), 'Sign Up surfaces error messages');
  assert(signUpSrc.includes('fa-banner--error'), 'Sign Up renders error banners');
  assert(
    resetSrc.includes('fa-banner--${statusMessage.type}') && resetSrc.includes("type: 'error'"),
    'Reset page renders error banners'
  );
});

// ── 4. NAVIGATION / CTAs ──

await runTest('Unit / Navigation', 'Test 9: Cross-page CTAs wired to the right routes', async () => {
  assert(signInSrc.includes('to="/signup"'), 'Sign In page links to /signup');
  assert(signInSrc.includes('Create Your Family'), 'Sign In page shows Create Your Family CTA');
  assert(signUpSrc.includes('to="/signin"'), 'Sign Up page links to /signin');
  assert(signUpSrc.includes('Sign In') && signUpSrc.includes('Already have an account?'), 'Sign Up page shows Sign In link');
  assert(shellSrc.includes('to="/"'), 'AuthShell brand links back to /');
  assert(shellSrc.includes('Back to Medida&rsquo;s Family') || shellSrc.includes("Back to Medida's Family"), 'Back to product link must exist');
});

// ── 5. INPUTS / ACCESSIBILITY ──

await runTest('Unit / Accessibility', 'Test 10: Password visibility toggle is accessible and safe', async () => {
  assert(inputSrc.includes('type="button"'), 'Toggle must be type=button (never submits form)');
  assert(inputSrc.includes("aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}") ||
    inputSrc.includes('aria-label='), 'Toggle must have a dynamic aria-label');
  assert(inputSrc.includes('aria-pressed={visible}'), 'Toggle must expose aria-pressed');
  assert(signUpSrc.includes('passwordToggle'), 'Sign Up uses password toggles');
  assert(signInSrc.includes('passwordToggle'), 'Sign In uses a password toggle');
});

await runTest('Unit / Accessibility', 'Test 11: Labels, errors and focus are accessible', async () => {
  assert(inputSrc.includes('htmlFor={id}'), 'Labels must be associated with inputs');
  assert(inputSrc.includes('aria-invalid'), 'Invalid state must expose aria-invalid');
  assert(inputSrc.includes('aria-describedby'), 'Errors must be linked via aria-describedby');
  assert(inputSrc.includes('id={errorId}'), 'Error messages must have ids');
  assert(authCss.includes('.fa-input:focus'), 'Inputs must have a styled focus treatment');
  assert(authCss.includes('.fa-skip-link'), 'Skip link must exist');
  assert(shellSrc.includes('Skip to form'), 'Skip link must be labelled');
});

// ── 6. DATA BOUNDARY / SECURITY ──

await runTest('Security / Boundary', 'Test 12: Auth pages load no family data and create no fake sessions', async () => {
  const allAuth = signInSrc + signUpSrc + resetSrc + shellSrc + read('AuthBrandVisual.jsx') + inputSrc;
  const forbidden = ['FamilyStore', 'familyStore', 'FamilyContext', 'useFamily', 'LocalAdapter', 'SupabaseAdapter'];
  const importLines = allAuth.split('\n').filter((line) => line.trim().startsWith('import'));
  for (const line of importLines) {
    for (const token of forbidden) {
      assert(!line.includes(token), `Auth pages must not import ${token} (found: ${line.trim()})`);
    }
  }
  assert(!allAuth.includes('sessionStorage'), 'No client-side session faking');
  assert(!allAuth.includes('localStorage.setItem(\'password'), 'No password storage');
});

// ── 7. THEME / MOTION / RESPONSIVE ──

await runTest('Unit / Theme', 'Test 13: Light/dark theme via the shared system', async () => {
  assert(shellSrc.includes("localStorage.getItem('medida_theme')"), 'Must read the shared theme key');
  assert(shellSrc.includes("setAttribute('data-theme'"), 'Must apply data-theme');
  assert(shellSrc.includes('toggleTheme'), 'Must offer a theme toggle');
  assert(authCss.includes('var(--ft-bg)'), 'Colors must come from product tokens');
  assert(authCss.includes('var(--ft-accent)'), 'Accent must be the product orange token');
  assert(!authCss.includes('#9C3F00') && !authCss.includes('#A04100') && !authCss.includes('#F8F9FF'), 'Stitch palette must not appear');
});

await runTest('Unit / Motion', 'Test 14: Reduced-motion support', async () => {
  const hookSrc = fs.readFileSync(
    path.join(rootDir, 'src', 'family-tree', 'hooks', 'useReducedMotion.js'),
    'utf-8'
  );
  assert(hookSrc.includes('prefers-reduced-motion'), 'useReducedMotion must read the media query');
  assert(shellSrc.includes('useReducedMotion'), 'AuthShell must respect reduced motion');
  assert(signInSrc.includes('isReducedMotion'), 'Sign In must pass reduced-motion through');
  assert(signUpSrc.includes('isReducedMotion'), 'Sign Up must pass reduced-motion through');
  assert(authCss.includes('@media (prefers-reduced-motion: reduce)'), 'CSS must disable decorative motion');
});

await runTest('Unit / Responsive', 'Test 15: Responsive breakpoints for tablet and mobile', async () => {
  assert(authCss.includes('@media (max-width: 980px)'), 'Tablet breakpoint must exist');
  assert(authCss.includes('@media (max-width: 640px)'), 'Mobile breakpoint must exist');
  assert(authCss.includes('@media (max-width: 400px)'), 'Small-phone breakpoint must exist');
  assert(
    authCss.includes('.fa-visual') && authCss.includes('display: none'),
    'Decorative visual must be hidden on small screens'
  );
});

// ── 8. BRAND RULE ──

await runTest('Compliance / Brand', "Test 16: \"Medida's Family\" is the product, not the user's family", async () => {
  // Auth pages must not hardcode the product name as a family name or
  // imply the user belongs to a family called Medida's Family.
  assert(signUpSrc.includes('Create your family space'), 'Sign Up heading must be product-neutral');
  assert(signUpSrc.includes('your family&rsquo;s own name') || read('AuthBrandVisual.jsx').includes('your family&rsquo;s own name'), 'Visual copy must reinforce user-defined family names');
  const allAuth = signInSrc + signUpSrc + resetSrc;
  assert(!allAuth.includes('"Medida\'s Family"'), 'No hardcoded product name as a family string');
  assert(!allAuth.includes("'Medida\\'s Family'"), 'No hardcoded product name as a family string');
});

// ── 9. SHARED DESIGN LANGUAGE WITH LANDING ──

await runTest('Unit / Design', 'Test 17: Auth shares the landing design language', async () => {
  assert(authCss.includes('var(--ft-font-display)'), 'Display typography matches the landing');
  assert(authCss.includes('var(--ft-font-mono)'), 'Mono labels match the landing');
  assert(authCss.includes('var(--ft-shadow-lg)'), 'Card elevation uses product shadows');
  assert(shellSrc.includes('FadeContent'), 'Entrance motion uses the shared React Bits component');
  assert(signInSrc.includes('ClickSpark') && signUpSrc.includes('ClickSpark'), 'Primary actions use ClickSpark');
});

console.log('\n==================================================');
console.log(`AUTH PAGES VERIFICATION: ${totalPassed} passed, ${totalFailed} failed`);
console.log('==================================================');

if (totalFailed > 0) {
  process.exit(1);
}
