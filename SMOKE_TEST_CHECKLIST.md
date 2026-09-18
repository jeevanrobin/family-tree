# Production Smoke Test Checklist

## M3I Production Quality Hardening

### Critical Workflows Verified

#### Authentication & Family Management
- [x] Landing page renders correctly
- [x] Sign up flow validates input
- [x] Sign in authenticates users
- [x] Create family creates new family
- [x] Family selection loads family data
- [x] Add person creates new family member
- [x] Add relationship links people correctly

#### Tree Visualization
- [x] Tree renders with correct layout
- [x] Arrange family mode allows reordering
- [x] Sibling order persists after reload
- [x] Refresh persistence maintains state
- [x] Offline behavior queues operations
- [x] Reconnect syncs queued changes

#### Data Management
- [x] Backup/export generates valid JSON
- [x] Restore/import restores family tree
- [x] Search finds people by name
- [x] Timeline displays events chronologically
- [x] Memories stores and displays stories
- [x] Archive organizes photos and documents
- [x] Insights provides family statistics

### Verification Methods

1. **Automated Tests:**
   - Legacy scripts: ~280 tests passing (4 in test-scalable-tree-architecture.js)
   - Vitest: 311 tests passing, 8 skipped (env-dependent)

2. **Production Build:**
   - Build completes successfully
    - Bundle size: 992 KB (main chunk)
   - All assets load correctly

3. **Lint:**
   - 0 errors
   - Warnings: 124 (pre-existing, not blocking)

4. **Manual Verification:**
   - `npm run dev` starts development server
   - Application loads without errors
   - Navigation works as expected

### Notes

- Live Supabase tests require GitHub secrets configuration
- 8 tests skipped pending environment setup
- Bundle size investigation recommended for future optimization
- Consider route-level lazy loading to reduce initial bundle size

### Live Supabase Tests

**Status:** Skipped (environment-pending)

**Required Secrets:**
- TEST_USER_EMAIL
- TEST_USER_PASSWORD
- TEST_FAMILY_ID
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

**Verification:** When secrets are configured, run:
```bash
npm run test:vitest -- tests/integration/supabase/rls-live.test.js
```
