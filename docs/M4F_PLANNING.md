# M4F PLANNING — Release Readiness & Application Cleanup

## M4F OBJECTIVE

Prepare the Family Tree application for production release by addressing technical debt, documentation gaps, and CI quality gates while maintaining stability and avoiding feature creep.

**Scope:**
- Fix duplicate class member declarations in FamilyStore
- Update test-scalable-tree-architecture.js to match current API
- Resolve unused variable lint warnings
- Update SMOKE_TEST_CHECKLIST.md to reflect actual coverage
- Configure live Supabase test environment OR mock appropriately
- Improve CI quality gates (make lint/legacy tests blocking when stable)
- Reduce bundle size through route-level lazy loading
- Clean up documentation

**Non-Goals:**
- Add new features
- Refactor tree layout algorithms
- Change Supabase schema
- Mobile development
- Major architectural changes

---

## M4F CURRENT GAPS

### 1. Duplicate Class Members in FamilyStore.js

**Issue:** Two methods are declared twice:
- `getAllDocuments()` at lines 606 and 1392 (identical implementations)
- `getAllRelationships()` at lines 638 and 860 (identical implementations)

**Impact:** 
- Lint reports 2 errors (duplicate class members)
- JavaScript runtime uses the last declaration (line 1392, 860)
- Previous declarations at line 606, 638 are dead code

**Root Cause:** Likely copy-paste during milestone expansion (M2B → M4E)

**Risk:** LOW - Both pairs are functionally identical
- No runtime behavior change if removed
- No callers depend on specific declaration

**Verification:**
```bash
npm run lint | Select-String "no-dupe-class-members"
npm run test:vitest
```

---

### 2. Legacy Test Failure: test-scalable-tree-architecture.js

**Issue:** Test fails with `TypeError: Cannot read properties of undefined (reading 'size')`

**Root Cause:** Test expects `computeTreeLayout()` to return both `nodes` and `allNodes` properties:
```javascript
// Line 79-81 in test:
const fullLayout = computeTreeLayout(people, relationships);
assert.strictEqual(fullLayout.nodes.size, 7, 'All 7 nodes visible when expanded');
assert.strictEqual(fullLayout.allNodes.size, 7, 'allNodes tracks complete graph');
```

**Current API:** `computeTreeLayout()` only returns `nodes` (no `allNodes` property)

**Impact:**
- 1 test script failing
- CI has `continue-on-error: true` for legacy tests

**Resolution Options:**

| Option | Effort | Risk | Notes |
|--------|--------|------|-------|
| A. Remove assertions for `allNodes` | LOW | LOW | Remove non-existent property checks |
| B. Add `allNodes` to computeTreeLayout return | MEDIUM | MEDIUM | Internal API change, verify callers |
| C. Skip test entirely | LOW | MEDIUM | Loses valuable test coverage |

**Recommendation:** Option A - Test against actual API (M3G.4 philosophy)

**Verification:**
```bash
node scripts/test-scalable-tree-architecture.js
# Expected: All tests pass
```

---

### 3. Legacy Test Failures: test-cloud-sibling-order.js

**Issue:** 9 passed, 3 failed

**Root Cause:** Requires live Supabase credentials:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `TEST_FAMILY_ID`

**Impact:**
- Tests fail in CI without secrets
- Tests would pass with proper environment

**Resolution Options:**

| Option | Effort | Risk | Notes |
|--------|--------|------|-------|
| A. Configure GitHub secrets | LOW | MEDIUM | Creates dependency on live Supabase |
| B. Mock Supabase client | MEDIUM | LOW | More reliable, no external dependency |
| C. Skip in CI, document manual run | LOW | LOW | Tests work for local dev only |

**Recommendation:** Option B (create dedicated test user/family for safe CI testing)

**Test User Setup:**
1. Create dedicated test user in Supabase: `m4f-test@example.com`
2. Create dedicated test family: `m4f-test-family`
3. Add secrets to GitHub repository settings
4. Document cleanup procedure

**Verification:**
```bash
npm run test:vitest -- tests/integration/supabase/rls-live.test.js
# Expected: All tests pass (no skips)
```

---

### 4. Unused Variable Lint Warnings

**Inventory:**

| Category | Count | Severity |
|----------|-------|----------|
| Unused imports | 18 | LOW |
| Unused variables | 12 | LOW |
| Unused catch parameters | 14 | LOW |

**Top Sources:**

| File | Count | Type |
|------|-------|------|
| scripts/test-m4e-insights.js | 6 | Unused imports |
| scripts/test-m4d-archive.js | 4 | Unused imports |
| src/family-tree/store/repository/SyncAdapter.js | 5 | Unused catch parameters |
| src/family-tree/store/sync/SyncEngine.js | 3 | Unused catch parameters |

**Impact:**
- 44 warnings total
- CI has `continue-on-error: true` for lint

**Risk:** LOW - Unused variables don't affect runtime

**Fix Strategy:**
1. Remove unused imports in test scripts (safe)
2. Prefix unused catch parameters with `_` (convention)
3. Remove truly unused variables

**Verification:**
```bash
npm run lint | Select-String "warning" | Measure-Object
# Expected: Warnings reduced to ~80
```

---

### 5. Production Bundle Size

**Current State:**
- Main chunk: 992 KB (249 KB gzipped)
- CSS: 213 KB (31 KB gzipped)
- Vite warns: "chunks are larger than 500 kB"

**Largest Source Files:**

| File | Lines | Likely Impact |
|------|-------|---------------|
| FamilyStore.js | 1469 | HIGH |
| AddPersonModal.jsx | 1029 | MEDIUM |
| FamilyArchiveView.jsx | 957 | MEDIUM |
| FamilySettingsModal.jsx | 951 | MEDIUM |
| FamilyTreeApp.jsx | 897 | HIGH |
| SupabaseAdapter.js | 771 | MEDIUM |
| sampleData.js | 763 | LOW (dev only) |
| PersonDetails.jsx | 747 | MEDIUM |
| familySearchEngine.js | 630 | MEDIUM |
| SyncEngine.js | 612 | MEDIUM |

**Bundle Composition Analysis:**

The large bundle size is primarily due to:
1. **Monolithic App.jsx** - Single entry point loads entire application
2. **FamilyStore** - Central state management required immediately
3. **Modal components** - All modals bundled in main chunk
4. **sampleData** - Should be tree-shaken in production but may not be

**Resolution Options:**

| Strategy | Savings | Risk | Effort |
|----------|---------|------|--------|
| A. Route-level lazy loading | 300-500 KB | MEDIUM | MEDIUM |
| B. Modal lazy loading | 100-200 KB | LOW | LOW |
| C. Remove sampleData from production | 50-100 KB | LOW | LOW |
| D. Code split large components | 150-300 KB | MEDIUM | MEDIUM |

**Recommendation:** Opportunistic cleanup for M4F, defer major refactor to M5

**Actions:**
1. Verify sampleData is tree-shaken (check bundle analyzer)
2. Lazy load modals (React.lazy + Suspense)
3. Document lazy loading strategy for M5

**Verification:**
```bash
npm run build
# Check dist/assets/*.js sizes
```

---

### 6. Live Supabase Test Environment

**Current State:**
- 8 tests skipped in `tests/integration/supabase/rls-live.test.js`
- CI passes secrets but they're not configured
- Tests are environment-dependent

**Test Coverage:**
- Row-Level Security policy validation
- Real authentication flows
- Actual database constraints

**Setup Requirements:**

| Secret | Type | Purpose |
|--------|------|---------|
| TEST_USER_EMAIL | string | Dedicated test user email |
| TEST_USER_PASSWORD | string | Test user password |
| TEST_FAMILY_ID | UUID | Test family UUID |
| VITE_SUPABASE_URL | URL | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | string | Public anon key |

**Safety Considerations:**

| Concern | Mitigation |
|---------|-----------|
| Test user in production DB | Create isolated test family |
| Secrets in CI logs | Use GitHub secrets (encrypted) |
| Test data cleanup | Add cleanup script |
| Concurrent test runs | Use unique test run IDs |

**Recommendation:** Configure for M4F to achieve full CI coverage

**Verification:**
```bash
npm run test:vitest -- tests/integration/supabase/rls-live.test.js
# Expected: All tests pass (no skips)
```

---

### 7. Documentation Quality

**README.md:**

| Metric | Current | Target |
|--------|---------|--------|
| Setup instructions | ✅ Complete | - |
| Feature list | ✅ Complete | - |
| Testing docs | ✅ Links to TESTING.md | - |
| Supabase setup | ✅ Complete | - |
| CI badge | ✅ Present | - |

**TESTING.md:**

| Metric | Current | Target |
|--------|---------|--------|
| Directory structure | ✅ Complete | - |
| Test categories | ✅ Complete | - |
| Vitest counts | ⚠️ Outdated (235 → 311) | Update |
| CI documentation | ⚠️ Outdated | Add quality gates section |

**SMOKE_TEST_CHECKLIST.md:**

| Metric | Current | Target |
|--------|---------|--------|
| Critical workflows | ✅ Listed | - |
| Test counts | ⚠️ Outdated (235 → 311) | Update |
| Bundle size | ⚠️ Outdated (976 → 992) | Update |

**Updates Required:**
1. Update test counts in TESTING.md and SMOKE_TEST_CHECKLIST.md
2. Add quality gates section to TESTING.md
3. Document CI non-blocking configuration

---

### 8. CI Quality Gates

**Current State:**

| Gate | Status | Blocking |
|------|--------|----------|
| Legacy tests | Passing | ❌ (continue-on-error) |
| Vitest tests | 311 passed | ✅ Blocking |
| Build | Success | ✅ Blocking |
| Lint | 0 errors, 124 warnings | ❌ (continue-on-error) |

**Blocking Path to Quality:**

| Phase | Requirement | Action |
|-------|-------------|--------|
| 1. FamilyStore duplicates | Remove duplicate declarations | Fix lint errors |
| 2. Unused variables | Clean up warnings | Reduce to <50 warnings |
| 3. Legacy test failure | Fix test-scalable-tree-architecture.js | All legacy tests pass |
| 4. Live Supabase | Configure secrets or mock | All tests pass (no skips) |
| 5. Make lint blocking | Remove continue-on-error | CI fails on warnings |
| 6. Make legacy blocking | Remove continue-on-error | CI fails on any failure |

**Recommendation:** Remove `continue-on-error` AFTER fixes are verified

---

## M4F PRIORITY ORDER

### Priority 1: Critical Fixes (Must Complete)

| # | Task | Why | Risk | Files | Verification |
|---|------|-----|------|-------|--------------|
| 1.1 | Remove duplicate class members | Lint errors (2) | LOW | FamilyStore.js | `npm run lint` → 0 duplicate errors |
| 1.2 | Fix test-scalable-tree-architecture.js | Legacy test failing | LOW | test-scalable-tree-architecture.js | `node scripts/test-scalable-tree-architecture.js` → pass |
| 1.3 | Update test counts in docs | Documentation accuracy | NONE | TESTING.md, SMOKE_TEST_CHECKLIST.md | Review |

### Priority 2: Quality Improvements (Should Complete)

| # | Task | Why | Risk | Files | Verification |
|---|------|-----|------|-------|--------------|
| 2.1 | Clean unused variables | Lint warnings (44) | LOW | Multiple | Warnings < 100 |
| 2.2 | Lazy load modals | Bundle size | LOW | FamilyTreeApp.jsx, modals | Bundle < 800 KB |
| 2.3 | Configure live Supabase tests | CI coverage | MEDIUM | GitHub secrets, rls-live.test.js | All tests pass |
| 2.4 | Add quality gates section to TESTING.md | Documentation | NONE | TESTING.md | Review |

### Priority 3: Future Preparation (Best Effort)

| # | Task | Why | Risk | Files | Verification |
|---|------|-----|------|-------|--------------|
| 3.1 | Bundle analyzer report | Baseline for M5 | LOW | package.json, Vite config | `npm run analyze` |
| 3.2 | Document lazy loading strategy | M5 planning | NONE | New doc or TESTING.md | Review |
| 3.3 | Create test user cleanup script | Production safety | LOW | scripts/ | Script exists |

---

## M4F DEFINITION OF DONE

### 1. Lint Quality Gates
- [ ] Zero duplicate class member errors
- [ ] Zero unused variable warnings in production code (scripts can have unused)
- [ ] Total warnings < 80 (excluding test-specific files)
- [ ] Lint is blocking in CI (no `continue-on-error`)

### 2. Legacy Tests Quality Gates
- [ ] test-scalable-tree-architecture.js passes all tests
- [ ] All legacy tests pass OR documented why skipped
- [ ] Legacy tests are blocking in CI

### 3. Vitest Tests Quality Gates
- [ ] All 311 tests pass
- [ ] Zero tests skipped (OR documented why)
- [ ] Coverage > 20% overall
- [ ] treeLayout coverage > 85%
- [ ] timeline coverage > 70%

### 4. Build Quality Gates
- [ ] Build passes
- [ ] Bundle size < 900 KB (main chunk)
- [ ] No Vite warnings about chunk size
- [ ] All assets load correctly

### 5. Documentation Quality Gates
- [ ] README.md reflects current state
- [ ] TESTING.md has accurate test counts
- [ ] SMOKE_TEST_CHECKLIST.md has accurate metrics
- [ ] CI workflow documented in TESTING.md

### 6. CI Quality Gates
- [ ] GitHub Actions shows green check
- [ ] All quality gates are blocking
- [ ] No `continue-on-error` needed
- [ ] Live Supabase tests pass OR properly mocked

---

## M4F IMPLEMENTATION PHASES

### Phase 1: Critical Fixes (Day 1)

**Task 1.1: Remove Duplicate Class Members**

Why: Lint reports 2 errors for duplicate declarations. The second declarations shadow the first, making lines 606 and 638 dead code.

Risk: LOW - Both pairs are identical implementations. Removing the first of each pair has zero runtime impact.

Affected Files:
- `src/family-tree/store/FamilyStore.js` (lines 606-608, 638-640)

Changes:
```javascript
// REMOVE these blocks:
// Lines 606-608
getAllDocuments() {
  return [...this.documents];
}

// Lines 638-640
getAllRelationships() {
  return [...this.relationships];
}

// KEEP these blocks:
// Lines 1392-1394 (getAllDocuments)
// Lines 860-862 (getAllRelationships)
```

Verification:
```bash
npm run lint | Select-String "no-dupe-class-members"
# Expected: No output (0 errors)

npm run test:vitest
# Expected: 311 passed, 8 skipped

npm run build
# Expected: Success
```

---

**Task 1.2: Fix test-scalable-tree-architecture.js**

Why: Test expects `allNodes` property that doesn't exist in current API. This causes test failure.

Risk: LOW - Just removing assertions for non-existent properties.

Affected Files:
- `scripts/test-scalable-tree-architecture.js`

Changes:
```javascript
// Line 79-81 - REMOVE:
assert.strictEqual(fullLayout.nodes.size, 7, 'All 7 nodes visible when expanded');
assert.strictEqual(fullLayout.allNodes.size, 7, 'allNodes tracks complete graph');

// REPLACE WITH:
assert.strictEqual(fullLayout.nodes.size, 7, 'All 7 nodes visible when expanded');
// Note: allNodes removed from API - nodes Map contains all visible nodes

// Lines 128-130 - REMOVE:
assert.strictEqual(collapsedLayout.nodes.size, 4, 'Only 4 visible nodes when sibC branch is collapsed');
assert.strictEqual(collapsedLayout.nodes.has('childD'), false, 'Child D must be hidden');
assert.strictEqual(collapsedLayout.allNodes.size, 5, 'allNodes still retains full 5 nodes');

// REPLACE WITH:
assert.strictEqual(collapsedLayout.nodes.size, 4, 'Only 4 visible nodes when sibC branch is collapsed');
assert.strictEqual(collapsedLayout.nodes.has('childD'), false, 'Child D must be hidden');

// Lines 148-150 - SIMILAR REMOVALS
```

Verification:
```bash
node scripts/test-scalable-tree-architecture.js
# Expected: All tests pass

npm test
# Expected: All legacy tests pass
```

---

**Task 1.3: Update Test Counts**

Why: Documentation shows outdated test counts (235 instead of 311).

Risk: NONE - Documentation only.

Affected Files:
- `TESTING.md`
- `SMOKE_TEST_CHECKLIST.md`

Changes:
```markdown
// TESTING.md updates:
- Total: ~280 tests across M3B-M4E
+ Total: ~311 tests across M3B-M4E

// SMOKE_TEST_CHECKLIST.md updates:
- Legacy scripts: 267 tests passing
- Vitest: 235 tests passing, 8 skipped (env-dependent)
+ Legacy scripts: ~280 tests passing
+ Vitest: 311 tests passing, 8 skipped (env-dependent)
```

Verification:
```bash
# Manual review
git diff TESTING.md SMOKE_TEST_CHECKLIST.md
```

---

### Phase 2: Quality Improvements (Day 2)

**Task 2.1: Clean Unused Variables**

Why: 44 warnings for unused variables reduce lint signal-to-noise.

Risk: LOW - These are dead code or naming convention issues.

Affected Files:
- `scripts/test-m4e-insights.js`
- `scripts/test-m4d-archive.js`
- `scripts/test-m4c-memories.js`
- `src/family-tree/store/repository/SyncAdapter.js`
- `src/family-tree/store/sync/SyncEngine.js`

Changes:
```javascript
// Test files - remove unused imports:
// scripts/test-m4e-insights.js:
- import { unusedFunction } from '../src/...';

// Production files - prefix unused catch params:
// src/family-tree/store/repository/SyncAdapter.js:
- } catch (e) {
+ } catch (_e) {
  // Error intentionally not logged
}
```

Verification:
```bash
npm run lint | Select-String "warning" | Measure-Object
# Expected: < 100 warnings

npm run test:vitest
# Expected: 311 passed
```

---

**Task 2.2: Lazy Load Modals**

Why: Bundle is 992 KB. Modal components contribute ~100-200 KB and are only needed when opened.

Risk: LOW - Standard React.lazy pattern, well-tested.

Affected Files:
- `src/family-tree/components/FamilyTreeApp.jsx`

Changes:
```javascript
// Current:
import AddPersonModal from './modals/AddPersonModal.jsx';
import FamilySettingsModal from './modals/FamilySettingsModal.jsx';
// ... more modal imports

// Change to:
import { lazy, Suspense } from 'react';

const AddPersonModal = lazy(() => import('./modals/AddPersonModal.jsx'));
const FamilySettingsModal = lazy(() => import('./modals/FamilySettingsModal.jsx'));
// ... more lazy imports

// Wrap in Suspense:
<Suspense fallback={<LoadingSpinner />}>
  {showAddPerson && <AddPersonModal {...props} />}
</Suspense>
```

Verification:
```bash
npm run build
# Check bundle size
ls -lh dist/assets/*.js
# Expected: Main chunk < 900 KB

npm run test:vitest
# Expected: 311 passed
```

---

**Task 2.3: Configure Live Supabase Tests**

Why: 8 tests are skipped due to missing environment. Full CI coverage requires these.

Risk: MEDIUM - Creates dependency on live Supabase, requires careful setup.

Affected Files:
- GitHub repository secrets (not in repo)
- `tests/integration/supabase/rls-live.test.js` (no changes if secrets configured)

Setup Steps:
1. Create test user in Supabase:
   ```sql
   -- Run in Supabase SQL editor
   INSERT INTO auth.users (email, encrypted_password, ...)
   VALUES ('m4f-test-family@example.com', '[bcrypt_hash]', ...);
   ```

2. Create test family:
   ```sql
   INSERT INTO families (id, name, created_by)
   VALUES (gen_random_uuid(), 'M4F Test Family', '[test_user_id]');
   ```

3. Add GitHub secrets:
   - Navigate to: https://github.com/jeevanrobin/family-tree/settings/secrets/actions
   - Add: `TEST_USER_EMAIL` = `m4f-test-family@example.com`
   - Add: `TEST_USER_PASSWORD` = `[secure_password]`
   - Add: `TEST_FAMILY_ID` = `[uuid_from_step_2]`
   - Add: `VITE_SUPABASE_URL` = `https://[project].supabase.co`
   - Add: `VITE_SUPABASE_ANON_KEY` = `[anon_key]`

4. Verify CI passes

Alternative (Option B - Mock): If live Supabase is not desired, create mock tests instead.

Verification:
```bash
npm run test:vitest -- tests/integration/supabase/rls-live.test.js
# Expected: All tests pass (0 skipped)

# Or check CI:
gh run list --workflow=ci.yml --limit 1
```

---

**Task 2.4: Add Quality Gates Section to TESTING.md**

Why: TESTING.md lacks documentation about CI quality gates and when to make tests blocking.

Risk: NONE - Documentation only.

Affected Files:
- `TESTING.md`

Changes:
```markdown
## CI Quality Gates

### Current Gates

The CI workflow enforces the following quality gates:

| Gate | Status | Blocking | Notes |
|------|--------|----------|-------|
| Legacy tests | All pass | Yes (M4F) | Previously non-blocking due to known failures |
| Vitest tests | All pass | Yes | Must pass for merge |
| Build | Success | Yes | Must pass for merge |
| Lint | 0 errors | Yes (M4F) | Previously non-blocking due to warnings |
| Coverage | Reported | No | Artifact uploaded, not enforced |

### Making Gates Blocking

Gates were made blocking after:

1. **Lint errors resolved:**
   - Duplicate class members removed (M4F.1.1)
   - Unused variables cleaned (M4F.2.1)

2. **Legacy tests fixed:**
   - test-scalable-tree-architecture.js updated (M4F.1.2)
   - All tests pass

3. **Live Supabase configured:**
   - GitHub secrets added (M4F.2.3)
   - All tests pass (no skips)
```

Verification:
```bash
# Manual review
git diff TESTING.md
```

---

### Phase 3: Future Preparation (Day 3)

**Task 3.1: Bundle Analyzer Report**

Why: Establish baseline for M5 bundle optimization work.

Risk: LOW - Just adding a tool.

Affected Files:
- `package.json`

Changes:
```json
{
  "scripts": {
    "analyze": "vite-bundle-visualizer"
  },
  "devDependencies": {
    "vite-bundle-visualizer": "^1.0.0"
  }
}
```

Verification:
```bash
npm run analyze
# Opens browser with bundle visualization
```

---

**Task 3.2: Document Lazy Loading Strategy**

Why: M5 will focus on bundle optimization. Document strategy now.

Risk: NONE - Documentation only.

Affected Files:
- New file: `docs/BUNDLE_OPTIMIZATION.md` OR section in TESTING.md

Content:
```markdown
# Bundle Optimization Strategy

## Current State (M4F)
- Main chunk: ~900 KB (gzip: ~230 KB)
- CSS: ~213 KB (gzip: ~31 KB)

## Optimization Strategies

### 1. Route-Level Lazy Loading
Split by application views:
- Family tree view (main)
- Timeline view
- Archive view
- Settings view

Expected savings: 300-500 KB per route

### 2. Modal Lazy Loading
Implemented in M4F:
- AddPersonModal
- FamilySettingsModal
- Other modals

Expected savings: 100-200 KB

### 3. Library Code Splitting
- Lucide icons: Import only used icons
- Large libraries: Consider alternatives or tree-shaking

Expected savings: 50-100 KB

### 4. Component Splitting
- FamilyStore remains in main chunk (required immediately)
- Large components (PersonDetails, FamilyArchiveView): Lazy load

Expected savings: 100-200 KB

## M5 Targets
- Main chunk: < 400 KB
- Total initial load: < 600 KB (gzipped)
```

---

**Task 3.3: Create Test User Cleanup Script**

Why: Live Supabase tests create data that should be cleaned up.

Risk: LOW - Maintenance script.

Affected Files:
- `scripts/cleanup-test-data.js`

Content:
```javascript
#!/usr/bin/env node
/**
 * Cleanup script for M4F test data
 * Removes test user, test family, and associated data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Admin key

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  const testEmail = 'm4f-test-family@example.com';
  
  // 1. Find test user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', testEmail)
    .single();
  
  if (!user) {
    console.log('No test user found');
    return;
  }
  
  // 2. Delete test family members
  await supabase.from('family_members').delete().eq('family_id', process.env.TEST_FAMILY_ID);
  
  // 3. Delete test people
  await supabase.from('people').delete().eq('family_id', process.env.TEST_FAMILY_ID);
  
  // 4. Delete test family
  await supabase.from('families').delete().eq('id', process.env.TEST_FAMILY_ID);
  
  // 5. Delete test user
  await supabase.auth.admin.deleteUser(user.id);
  
  console.log('Cleanup complete');
}

cleanup();
```

---

## Summary

| Phase | Tasks | Files | Risk | Duration |
|-------|-------|-------|------|----------|
| Phase 1 | 3 critical fixes | ~3 files | LOW | 1 day |
| Phase 2 | 4 quality improvements | ~10 files | LOW-MEDIUM | 1 day |
| Phase 3 | 3 future prep | ~3 files | LOW | 1 day |

**Total Duration:** 3 days

**Key Metrics After M4F:**

| Metric | Current | After M4F | Target |
|--------|---------|-----------|--------|
| Lint errors | 2 | 0 | 0 |
| Lint warnings | 124 | <80 | <80 |
| Legacy tests passing | Failing | 100% | 100% |
| Vitest tests | 311 | 311 | 311 |
| Bundle size | 992 KB | <900 KB | <900 KB |
| CI blocking | Partial | Full | Full |
