# Testing — Family Tree Application

## Test Architecture

This project uses a **dual-test system** with automated CI/CD:

### CI/CD Pipeline

GitHub Actions workflow runs on every push and pull request to `main`:

- **Runtime:** Node.js 22.x
- **Install:** `npm ci`
- **Legacy tests:** `npm test` (26 scripts, run in sequence)
- **Vitest tests:** `npm run test:vitest` (488 passed, 8 skipped)
- **Coverage:** `npm run test:vitest -- --coverage` (artifact uploaded)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (oxlint)

**Quality Gates:** CI fails if any test suite fails or lint reports errors.

`scripts/test-backup-id-integrity.js` includes a regression step against a real family backup that is not in the repository. It is skipped unless `BACKUP_REGRESSION_FILE` points at the backup JSON.

**Live Supabase Tests:** 8 tests are skipped by default. They require GitHub secrets to be configured:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `TEST_FAMILY_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

When secrets are absent, CI passes with those tests skipped.

### 1. Legacy Custom Scripts
- Location: `scripts/test-*.js`
- Framework: Node.js assertions + custom test harness
- Total: ~320 tests across M3B-M4E
- Run: `npm test`
- Status: Preserved until full Vitest parity is demonstrated

### 2. Vitest Tests
- Location: `tests/`
- Framework: Vitest + coverage via v8
- Total: 496 tests (488 passed, 8 skipped)
- Run: `npm run test:vitest`
- Coverage: `npm run test:vitest -- --coverage`

## Directory Structure

```
tests/
├── contracts/              # Static migration/schema assertions
│   ├── rls-contracts.test.js    # RLS policy verification from SQL
│   └── rpc-contracts.test.js   # RPC function signatures from SQL
│
├── integration/
│   ├── supabase/
│   │   └── rls-live.test.js    # Live RLS (requires env)
│   └── sync/
│       ├── reconnect.test.js           # SyncEngine integration (7 tests)
│       └── concurrent-sibling-order.test.js  # Concurrency (2 tests)
│
├── unit/
│   ├── auth/
│   │   └── roles.test.js           # Role permissions (99 tests)
│   ├── engine/
│   │   └── treeLayout.test.js      # Layout algorithms (39 tests)
│   ├── repository/
│   │   └── supabase-adapter.test.js # Adapter with mocks (12 tests)
│   ├── security/
│   │   ├── static-audit.test.js    # Code scanning (12 tests)
│   │   └── validation.test.js      # Production validation (28 tests)
│   ├── sync/
│   │   ├── conflict-resolver.test.js  # 3-way merge (20 tests)
│   │   ├── indexeddb.test.js           # IndexedDB (22 tests)
│   │   └── sync-engine.test.js        # Sync queue (15 tests)
│   ├── timeline/
│   │   └── timelineEngine.test.js  # Timeline functions (38 tests)
│   └── indexedDBManager.test.js    # Core IndexedDB (6 tests)
│
└── fixtures/
    └── index.js              # Shared test data factories
```

## Test Categories

### Unit Tests (`tests/unit/`)
Pure application logic with mocked dependencies.

**Focus:**
- Pure functions with deterministic inputs/outputs
- Data transformation logic
- Validation algorithms
- Sorting/filtering
- Permission checks

**Guidelines:**
- Mock external dependencies (Supabase, IndexedDB)
- No network calls
- Fast execution (< 5 seconds total)

### Integration Tests (`tests/integration/`)
System-level behavior with real dependencies.

**Focus:**
- Supabase client interactions
- Sync engine workflow
- IndexedDB persistence
- Cross-component behavior

**Guidelines:**
- Use real Supabase client only when environment configured
- Can use in-memory IndexedDB
- Longer execution time acceptable

### Contract Tests (`tests/contracts/`)
Static verification of database schema/security.

**Focus:**
- Migration file contents
- RLS policy existence
- RPC function signatures
- Security definer properties

**Important:**
- These inspect SQL files, NOT live database behavior
- Do NOT call them "live RLS tests"
- For live verification, use `tests/integration/supabase/rls-live.test.js`

## Commands

### Quick Verification
```bash
# Legacy tests (fast sanity check)
npm test

# Vitest tests (comprehensive)
npm run test:vitest

# Both
npm run test:all
```

### Coverage
```bash
npm run test:vitest -- --coverage
```

Coverage reports saved to `coverage/` directory.

### Specific Test Files
```bash
npm run test:vitest -- tests/unit/engine
npm run test:vitest -- tests/unit/auth/roles.test.js
```

### Legacy Scripts (Specific)
```bash
node scripts/test-cloud-sibling-order.js
```

## Environment Configuration

### Live Supabase Tests

Required environment variables:

```bash
TEST_USER_EMAIL=user@example.com
TEST_USER_PASSWORD=secure-password
TEST_FAMILY_ID=uuid-of-test-family
```

Set in `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Safety:**
- Never commit service role keys to source control
- Use anon key + real auth to test RLS behavior
- Tests automatically skip when env vars not configured

## Coverage Targets

Current baseline (M3G.4):

| Subsystem | Statements | Lines |
|-----------|------------|-------|
| Overall | 13.23% | 13.89% |
| auth/roles.js | 64.7% | 74.07% |
| store/repository/SupabaseAdapter.js | 16.21% | 16.8% |
| store/sync/SyncEngine.js | 52.73% | 53.74% |
| store/sync/conflictResolver.js | 94.36% | 93.84% |
| engine/treeLayout.js | ~5% | ~5% |
| timeline/familyTimelineEngine.js | ~15% | ~15% |

**Note:** No arbitrary thresholds imposed. Coverage measured for visibility, not gates.

## Fixture Rules

Located in `tests/fixtures/index.js`:

1. Factories create minimum valid entities
2. IDs are deterministic (no Date.now(), no Math.random())
3. All state is new per test (no shared mutable state)
4. Constants for valid family IDs, timestamps, etc.

## Legacy Test Policy

Legacy scripts in `scripts/` are **preserved** until:

1. Equivalent Vitest coverage achieved
2. All assertions migrated
3. Original script verified still passing
4. Coverage comparison documented

**Do NOT delete legacy scripts prematurely.**

## Test File Naming

- `*.test.js` - Test files (required)
- `*.spec.js` - Not used (prefer `.test.js`)
- Test directories match source structure

## Adding New Tests

1. Identify test category (unit/integration/contract)
2. Place in appropriate `tests/` subdirectory
3. Use existing fixtures from `tests/fixtures/`
4. Import production functions directly
5. Mock at boundaries (Supabase client, IndexedDB)
6. Document any environment requirements

## Regression Testing

Each major feature milestone includes regression tests:
- M3B security (roles)
- M3C sync (offline queue)
- M3D media (storage paths)
- M3E collaboration (tokens)
- M3F family creation
- M3G sibling orders
- M4A search
- M4B timeline
- M4C memories
- M4D archive
- M4E insights

Run full suite before merging: `npm run test:all`

## Troubleshooting

### Live tests skipped
- Check environment variables are set
- Verify Supabase project is active
- Confirm test user credentials are valid

### Coverage not updating
- Clear Vitest cache: `rm -rf node_modules/.vitest`
- Re-run with fresh transform

### IndexedDB errors in tests
- Normal in Node environment (uses in-memory fallback)
- If errors persist, check fixture initialization
