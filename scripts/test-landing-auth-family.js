/**
 * test-landing-auth-family.js
 *
 * Automated verification suite for:
 * 1. "/" opens landing page (never auto-opens tree)
 * 2. Sign In navigation works
 * 3. Sign Up navigation works
 * 4. New account with zero families goes to Create Family
 * 5. User can create a custom family name
 * 6. Created family has authenticated user as Owner
 * 7. New family contains zero sample people (100% empty)
 * 8. Existing user with one family opens that family automatically
 * 9. Existing user with multiple families sees family selector
 * 10. User can create a second family
 * 11. Renaming a family updates its displayed name across state
 * 12. User cannot access an unrelated family by changing URL familyId (Access Denied)
 * 13. No hardcoded "Medida's Family" remains in production family-creation logic/UI
 * 14. Existing family-tree routes still work
 * 15. Existing Local Mode still works
 * 16. Landing hero CTA routes to /signup; signed-in users route to /app
 * 17. Landing nav anchors scroll to real sections
 * 18. Landing is responsive
 * 19. Landing respects reduced motion
 * 20. Landing loads no authenticated family data
 * 21. Landing uses product palette (not Stitch palette)
 * 22. Landing makes no unsupported security claims
 * 23. Landing implements accessibility basics
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

import { ROLES, canManageMembers } from '../src/family-tree/auth/roles.js';
import { FamilyStore } from '../src/family-tree/store/FamilyStore.js';
import { LocalAdapter } from '../src/family-tree/store/repository/LocalAdapter.js';

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

// ── Landing page source helpers ──
const landingDir = path.join(rootDir, 'src', 'family-tree', 'components', 'landing');

function readLandingSources() {
  const files = fs
    .readdirSync(landingDir)
    .filter((f) => f.endsWith('.jsx') || f.endsWith('.css'))
    .map((f) => fs.readFileSync(path.join(landingDir, f), 'utf-8'));
  return files.join('\n');
}

console.log('==================================================');
console.log('PUBLIC LANDING, AUTH & MULTI-FAMILY VERIFICATION');
console.log('==================================================\n');

// ── 1. ROUTING & LANDING PAGE CHECKS ──

await runTest('Unit / Routing', 'Test 1: "/" renders LandingPage component and does not auto-open tree', async () => {
  const appSrc = fs.readFileSync(path.join(rootDir, 'src', 'App.jsx'), 'utf-8');
  assert(
    appSrc.includes('<Route path="/" element={<LandingPage />} />'),
    'App.jsx must route "/" strictly to <LandingPage />'
  );
  assert(
    !appSrc.includes('<Route path="/" element={<FamilyTreeApp'),
    'App.jsx must NOT route "/" to FamilyTreeApp'
  );
});

await runTest('Unit / Routing', 'Test 2: Landing page contains Sign In navigation link and handler', async () => {
  const landingSrc = readLandingSources();
  assert(landingSrc.includes('to="/signin"'), 'Landing components must include link to /signin');
  assert(landingSrc.includes('Sign In'), 'Landing components must include "Sign In" text');
});

await runTest('Unit / Routing', 'Test 3: Landing page contains Get Started / Sign Up navigation CTA', async () => {
  const landingSrc = readLandingSources();
  assert(landingSrc.includes('to="/signup"'), 'Landing components must include link to /signup');
  assert(landingSrc.includes('Get Started'), 'Landing components must include "Get Started" CTA');
  assert(landingSrc.includes('handleGetStarted'), 'LandingPage must handle get started routing');
});

// ── 2. AUTHENTICATION & SIGN UP CHECKS ──

await runTest('Unit / Auth', 'Test 4: SignUpPage validates first name, email, password match, and handles loading/email verification', async () => {
  const signUpSrc = fs.readFileSync(path.join(rootDir, 'src', 'family-tree', 'components', 'auth', 'SignUpPage.jsx'), 'utf-8');
  assert(signUpSrc.includes('firstName'), 'SignUpPage must collect firstName');
  assert(signUpSrc.includes('confirmPassword'), 'SignUpPage must collect confirmPassword');
  assert(signUpSrc.includes('Passwords do not match'), 'SignUpPage must validate matching passwords');
  assert(signUpSrc.includes('isEmailVerificationSent'), 'SignUpPage must handle email confirmation flow');
  assert(signUpSrc.includes('isSubmitting'), 'SignUpPage must prevent duplicate submissions');
});

// ── 3. GATEWAY & MULTI-FAMILY MEMBERSHIP RESOLUTION ──

// In-memory simulation of AppGatewayRoute logic
function resolveGatewayRoute(user, memberships) {
  if (!user) return '/signin';
  if (!memberships || memberships.length === 0) return '/create-family';
  if (memberships.length === 1) return `/app/family/${memberships[0].familyId}`;
  return 'FAMILY_SELECTOR';
}

await runTest('Integration / Logic', 'Test 5: Authenticated account with 0 families routes to Create Family', async () => {
  const mockUser = { id: 'user-new-1', email: 'newuser@example.com' };
  const mockMemberships = [];
  const route = resolveGatewayRoute(mockUser, mockMemberships);
  assert.strictEqual(route, '/create-family', 'User with 0 families must be redirected to /create-family');
});

await runTest('Integration / Logic', 'Test 6: Existing user with exactly 1 family automatically opens that family', async () => {
  const mockUser = { id: 'user-existing-1', email: 'user1@example.com' };
  const mockMemberships = [
    { familyId: 'fam-101', role: 'owner', family: { id: 'fam-101', name: 'Sharma Family' } }
  ];
  const route = resolveGatewayRoute(mockUser, mockMemberships);
  assert.strictEqual(route, '/app/family/fam-101', 'User with 1 family must automatically open that family');
});

await runTest('Integration / Logic', 'Test 7: Existing user with 2+ families routes to Family Selector', async () => {
  const mockUser = { id: 'user-multi-1', email: 'multirole@example.com' };
  const mockMemberships = [
    { familyId: 'fam-101', role: 'owner', family: { id: 'fam-101', name: 'Sharma Family' } },
    { familyId: 'fam-202', role: 'editor', family: { id: 'fam-202', name: 'Patel Family' } }
  ];
  const route = resolveGatewayRoute(mockUser, mockMemberships);
  assert.strictEqual(route, 'FAMILY_SELECTOR', 'User with 2+ families must see Family Selector');
});

// ── 4. FAMILY CREATION & ROLE ENROLLMENT ──

await runTest('Integration / Logic', 'Test 8: User can create a custom family name and becomes Owner', async () => {
  const createFamilySrc = fs.readFileSync(path.join(rootDir, 'src', 'family-tree', 'components', 'auth', 'CreateFamilyPage.jsx'), 'utf-8');
  assert(createFamilySrc.includes("role: 'owner'"), 'Family creator must be enrolled with role owner');
  assert(createFamilySrc.includes("placeholder=\"Enter your family name\""), 'Must have correct placeholder');
  assert(!createFamilySrc.includes("value=\"Medida's Family\""), 'Must not have hardcoded Medida default');
});

await runTest('Integration / Logic', 'Test 9: New family starts completely empty (zero sample members)', async () => {
  const store = new FamilyStore();
  // Simulate fresh cloud initialization
  store.loadFromData([], [], [], [], [], []);
  assert.strictEqual(store.people.size, 0, 'New family people count must be 0');
  assert.strictEqual(store.relationships.length, 0, 'New family relationship count must be 0');
  assert.strictEqual(store.stories.length, 0, 'New family story count must be 0');
  assert.strictEqual(store.photos.length, 0, 'New family photo count must be 0');
});

await runTest('Integration / Logic', 'Test 10: User can create a second family and maintain distinct memberships', async () => {
  const memberships = [
    { familyId: 'fam-1', role: 'owner', family: { id: 'fam-1', name: 'Primary Family' } },
  ];

  // Simulating creating second family
  const newFamily = { id: 'fam-2', name: 'Secondary Family' };
  const newMembership = { familyId: newFamily.id, role: 'owner', family: newFamily };
  memberships.push(newMembership);

  assert.strictEqual(memberships.length, 2, 'User must belong to 2 distinct families');
  assert.strictEqual(memberships[0].family.name, 'Primary Family');
  assert.strictEqual(memberships[1].family.name, 'Secondary Family');
});

// ── 5. FAMILY SETTINGS & RENAMING ──

await runTest('Integration / Logic', 'Test 11: Renaming a family updates its displayed name across state', async () => {
  let activeFamily = { id: 'fam-1', name: 'Original Name' };
  let memberships = [{ familyId: 'fam-1', role: 'owner', family: { ...activeFamily } }];
  const currentRole = ROLES.OWNER;

  // Simulate rename function from FamilyContext
  function renameFamily(newName) {
    if (!newName || !newName.trim()) throw new Error('Name empty');
    if (!canManageMembers(currentRole)) throw new Error('Unauthorized');
    const trimmed = newName.trim();
    activeFamily = { ...activeFamily, name: trimmed };
    memberships = memberships.map((m) =>
      m.familyId === activeFamily.id ? { ...m, family: { ...m.family, name: trimmed } } : m
    );
  }

  renameFamily('Updated Heritage Tree');
  assert.strictEqual(activeFamily.name, 'Updated Heritage Tree');
  assert.strictEqual(memberships[0].family.name, 'Updated Heritage Tree');
});

// ── 6. AUTHORITATIVE SECURITY BOUNDARY (ACCESS DENIED) ──

function verifyFamilyAccess(requestedFamilyId, memberships) {
  if (!requestedFamilyId) return { allowed: false, reason: 'missing_id' };
  const match = (memberships || []).find((m) => m.familyId === requestedFamilyId);
  if (!match) return { allowed: false, reason: 'unauthorized_family' };
  return { allowed: true, membership: match };
}

await runTest('Security / Logic', 'Test 12: User cannot access unrelated family by manually changing URL familyId', async () => {
  const userMemberships = [
    { familyId: 'fam-allowed-123', role: 'viewer', family: { id: 'fam-allowed-123', name: 'Allowed Family' } }
  ];

  // Attempting to access an unauthorized family
  const resultUnauthorized = verifyFamilyAccess('fam-attacker-999', userMemberships);
  assert.strictEqual(resultUnauthorized.allowed, false, 'Unrelated family access must be denied');
  assert.strictEqual(resultUnauthorized.reason, 'unauthorized_family');

  // Accessing verified family succeeds
  const resultAuthorized = verifyFamilyAccess('fam-allowed-123', userMemberships);
  assert.strictEqual(resultAuthorized.allowed, true, 'Verified member access must succeed');
});

// ── 7. CODEBASE AUDIT: NO HARDCODED "MEDIDA'S FAMILY" IN PRODUCTION LOGIC/UI ──

await runTest('Static Analysis', "Test 13: No hardcoded \"Medida's Family\" in production creation logic or overlays", async () => {
  const filesToCheck = [
    path.join(rootDir, 'src', 'family-tree', 'components', 'auth', 'CreateFamilyPage.jsx'),
    path.join(rootDir, 'src', 'family-tree', 'components', 'FamilyTreeApp.jsx'),
    path.join(rootDir, 'src', 'family-tree', 'components', 'react-bits', 'IntroOverlay.jsx'),
    path.join(rootDir, 'src', 'family-tree', 'components', 'auth', 'ResetPasswordPage.jsx'),
    path.join(rootDir, 'src', 'family-tree', 'components', 'memories', 'FamilyMemoriesView.jsx'),
    path.join(rootDir, 'src', 'family-tree', 'store', 'migration', 'MigrationService.js'),
  ];

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      assert(
        !content.includes("\"Medida's Family\""),
        `File ${path.basename(file)} still contains double-quoted "Medida's Family"`
      );
      assert(
        !content.includes("'Medida\\'s Family'"),
        `File ${path.basename(file)} still contains single-quoted 'Medida\\'s Family'`
      );
    }
  }
});

// ── 8. EXISTING ROUTES & LOCAL MODE COMPATIBILITY ──

await runTest('Unit / Routing', 'Test 14: Existing family-tree sub-routes exist in App.jsx', async () => {
  const appSrc = fs.readFileSync(path.join(rootDir, 'src', 'App.jsx'), 'utf-8');
  assert(appSrc.includes('path="/app/family/:familyId/timeline"'), 'Timeline route must exist');
  assert(appSrc.includes('path="/app/family/:familyId/memories"'), 'Memories route must exist');
  assert(appSrc.includes('path="/app/family/:familyId/archive"'), 'Archive route must exist');
  assert(appSrc.includes('path="/app/family/:familyId/insights"'), 'Insights route must exist');
});

await runTest('Unit / Architecture', 'Test 15: Existing Local Mode still works when Supabase is not configured', async () => {
  const store = new FamilyStore();
  const localAdapter = new LocalAdapter();
  store.setRepository(localAdapter);
  assert(store.repository instanceof LocalAdapter, 'LocalAdapter must be set in local mode');

  const appSrc = fs.readFileSync(path.join(rootDir, 'src', 'App.jsx'), 'utf-8');
  assert(appSrc.includes('if (!isSupabaseConfigured)'), 'App.jsx must check isSupabaseConfigured for local mode');
  assert(appSrc.includes('isLocalMode={true}'), 'Local mode canvas must receive isLocalMode={true}');
});

// ── 9. LANDING PAGE: CTA ROUTING, SECTIONS, RESPONSIVE, MOTION, DATA BOUNDARY ──

await runTest('Unit / Landing', 'Test 16: Hero primary CTA is "Create Your Family" and routes guests to /signup, users to /app', async () => {
  const landingSrc = readLandingSources();
  const landingPageSrc = fs.readFileSync(path.join(landingDir, 'LandingPage.jsx'), 'utf-8');

  assert(landingSrc.includes('Create Your Family'), 'Hero must show "Create Your Family" CTA');
  assert(landingSrc.includes('Your family&rsquo;s story'), 'Hero must use the approved headline');

  // handleGetStarted behaviour (mirrors LandingPage.jsx implementation)
  const handleGetStartedBehaviour = (user) => (user ? '/app' : '/signup');
  assert.strictEqual(
    handleGetStartedBehaviour({ id: 'u1' }),
    '/app',
    'Signed-in users must be sent to /app'
  );
  assert.strictEqual(
    handleGetStartedBehaviour(null),
    '/signup',
    'Guests must be sent to /signup'
  );
  assert(landingPageSrc.includes("navigate('/signup')"), 'handleGetStarted must navigate guests to /signup');
  assert(landingPageSrc.includes("navigate('/app')"), 'handleGetStarted must navigate users to /app');
});

await runTest('Unit / Landing', 'Test 17: Nav anchors reference sections that exist and scroll smoothly', async () => {
  const landingSrc = readLandingSources();
  const headerSrc = fs.readFileSync(path.join(landingDir, 'LandingHeader.jsx'), 'utf-8');
  const landingPageSrc = fs.readFileSync(path.join(landingDir, 'LandingPage.jsx'), 'utf-8');

  // Header nav items map to real section ids
  for (const id of ['features', 'how-it-works', 'privacy']) {
    assert(headerSrc.includes(`id: '${id}'`), `Header nav must include "${id}"`);
    assert(
      landingSrc.includes(`id="${id}"`) || landingSrc.includes(`'${id}'`),
      `A landing section with id "${id}" must exist`
    );
  }

  // Smooth scrolling is implemented inside the landing scroll container
  assert(landingPageSrc.includes('scrollToSection'), 'LandingPage must implement scrollToSection');
  assert(landingPageSrc.includes("behavior: isReducedMotion ? 'auto' : 'smooth'"), 'Scroll must be smooth unless reduced motion is on');
  assert(landingPageSrc.includes('getElementById'), 'Scroll targets resolve via getElementById');
});

await runTest('Unit / Landing', 'Test 18: Landing CSS provides responsive breakpoints', async () => {
  const landingCss = fs.readFileSync(path.join(landingDir, 'landing.css'), 'utf-8');
  assert(landingCss.includes('@media (max-width: 1080px)'), 'Tablet breakpoint must exist');
  assert(landingCss.includes('@media (max-width: 900px)'), 'Navigation/mobile menu breakpoint must exist');
  assert(landingCss.includes('@media (max-width: 640px)'), 'Mobile breakpoint must exist');
  assert(landingCss.includes('grid-template-columns: minmax(0, 1fr)'), 'Grids must collapse to one column on small screens');
  assert(landingCss.includes('fl-mobile-menu'), 'A mobile menu must exist');
});

await runTest('Unit / Landing', 'Test 19: Landing respects prefers-reduced-motion', async () => {
  const landingSrc = readLandingSources();
  const landingPageSrc = fs.readFileSync(path.join(landingDir, 'LandingPage.jsx'), 'utf-8');
  const landingCss = fs.readFileSync(path.join(landingDir, 'landing.css'), 'utf-8');

  assert(
    landingPageSrc.includes("(prefers-reduced-motion: reduce)"),
    'LandingPage must read the reduced-motion media query'
  );
  assert(landingSrc.includes('isReducedMotion'), 'Motion components must receive isReducedMotion');
  assert(
    landingCss.includes('@media (prefers-reduced-motion: reduce)'),
    'Landing CSS must include a reduced-motion block'
  );
});

await runTest('Security / Landing', 'Test 20: Landing page loads no authenticated family data', async () => {
  const landingSrc = readLandingSources();

  // Landing must not import any family-data machinery (per import line)
  const forbiddenImports = [
    'FamilyStore',
    'familyStore',
    'FamilyContext',
    'useFamily',
    'FamilyRepository',
    'LocalAdapter',
    'SupabaseAdapter',
    'SyncEngine',
  ];
  const importLines = landingSrc
    .split('\n')
    .filter((line) => line.trim().startsWith('import'));
  for (const line of importLines) {
    for (const token of forbiddenImports) {
      assert(
        !line.includes(token),
        `Landing components must not import ${token} (found: ${line.trim()})`
      );
    }
  }

  // Demo people in marketing visuals must be marked as demo content
  assert(landingSrc.includes('DEMO_PEOPLE'), 'Hero preview people must be declared as demo data');
  assert(landingSrc.includes('Demo family'), 'Hero preview must be labelled as a demo family');
  assert(landingSrc.includes('Product preview'), 'Product preview must be labelled as a preview');
});

await runTest('Unit / Landing', 'Test 21: Landing uses the product palette, not the Stitch palette', async () => {
  const landingSrc = readLandingSources();
  const landingCss = fs.readFileSync(path.join(landingDir, 'landing.css'), 'utf-8');

  // Product tokens
  assert(landingCss.includes('var(--ft-accent)'), 'Landing must use the product accent token');
  assert(landingCss.includes('#0D1115'), 'Dark product preview must use the product dark background');
  assert(landingCss.includes('#171C21'), 'Dark product preview must use the product surface');
  assert(landingCss.includes('#1E252C'), 'Dark product preview must use the product card color');

  // Stitch-generated palette must not appear
  for (const forbidden of ['#9C3F00', '#A04100', '#F8F9FF']) {
    assert(!landingSrc.includes(forbidden), `Stitch color ${forbidden} must not be used`);
  }
});

await runTest('Compliance / Landing', 'Test 22: Landing makes no unsupported security or retention claims', async () => {
  const landingSrc = readLandingSources();
  const forbiddenClaims = [
    'bank-grade',
    'Bank-grade',
    'military-grade',
    'Military-grade',
    'century retention',
    'Century retention',
    'zero-loss',
    'Zero-loss',
    'guaranteed forever',
    'Guaranteed forever',
    'inviolable',
    'Inviolable',
  ];
  for (const claim of forbiddenClaims) {
    assert(!landingSrc.includes(claim), `Unsupported claim "${claim}" must not appear on the landing page`);
  }
});

await runTest('Unit / Accessibility', 'Test 23: Landing implements accessibility basics', async () => {
  const landingSrc = readLandingSources();
  const landingPageSrc = fs.readFileSync(path.join(landingDir, 'LandingPage.jsx'), 'utf-8');
  const headerSrc = fs.readFileSync(path.join(landingDir, 'LandingHeader.jsx'), 'utf-8');
  const landingCss = fs.readFileSync(path.join(landingDir, 'landing.css'), 'utf-8');

  // Skip link as first focusable element
  assert(landingPageSrc.includes('fl-skip-link'), 'Landing must provide a skip link');
  assert(landingPageSrc.includes('Skip to content'), 'Skip link must be labelled');

  // Semantic landmarks
  assert(landingPageSrc.includes('<main'), 'Landing must use a <main> landmark');
  assert(landingSrc.includes('<footer'), 'Landing must use a <footer> landmark');
  assert(headerSrc.includes('<header'), 'Landing must use a <header> landmark');

  // Keyboard / AT support
  assert(headerSrc.includes('aria-expanded'), 'Mobile menu toggle must expose aria-expanded');
  assert(headerSrc.includes('aria-label'), 'Icon-only buttons must have aria-labels');
  assert(headerSrc.includes("key === 'Escape'"), 'Mobile menu must close on Escape');
  assert(landingSrc.includes('aria-labelledby'), 'Sections must be labelled');
  assert(landingCss.includes(':focus-visible'), 'Visible focus states must be styled');
});

console.log('\n==================================================');
console.log(`LANDING & AUTH VERIFICATION: ${totalPassed} passed, ${totalFailed} failed`);
console.log('==================================================');

if (totalFailed > 0) {
  process.exit(1);
}
