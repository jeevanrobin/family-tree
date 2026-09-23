# M5A Manual Test Procedures

These tests require manual browser interaction and cannot be fully automated.

## TASK 3 — Offline/Reconnect Validation

**Status:** MANUAL TEST REQUIRED

### Procedure:

1. Open browser to http://localhost:5173
2. Sign in with M5A test credentials
3. Navigate to test family
4. Make a harmless test change (e.g., update a person's notes field)
5. Open Developer Tools > Network > Offline mode
6. Make another harmless change offline
7. Verify offline/pending state is indicated in UI
8. Reconnect network (disable Offline mode)
9. Verify synchronization occurs
10. Refresh the page
11. Verify both changes persisted

### Expected Results:
- Offline changes should be queued locally
- UI should indicate offline/pending state
- On reconnect, pending changes should sync
- Refresh should show persisted data

### Actual Result:
**NOT TESTED** - Requires manual execution with network simulation

---

## TASK 4 — Sibling-Order Sync Validation

**Status:** MANUAL TEST REQUIRED

### Procedure:

1. Browser A: Open http://localhost:5173
2. Browser A: Sign in and navigate to test family
3. Browser A: Enable "Arrange Family" mode
4. Browser A: Reorder a sibling cohort via drag-drop
5. Browser A: Save changes
6. Browser A: Refresh and verify order persisted
7. Browser B: Open http://localhost:5173 in new browser/incognito
8. Browser B: Sign in and navigate to same family
9. Browser B: Verify sibling order matches Browser A's reorder
10. Browser B: Perform another reorder
11. Browser A: Refresh and verify updated order from Browser B

### Expected Results:
- Drag-drop reorder should work in Arrange mode
- Order should persist after refresh
- Two browsers should see consistent sibling order
- Last write wins on conflict

### Actual Result:
**NOT TESTED** - Requires manual execution with two browser instances

### Conflict Policy:
**LAST-WRITE-WINS** - The most recent update to sibling order takes precedence.

---

## TASK 5 — Visual Regression Checks

### Light Mode Visual QA
**Status:** NOT TESTED
- Application defaults to dark mode
- Light mode toggle available in theme settings
- 100%, 75%, 50%, 35% zoom levels should maintain clarity

### Dark Mode Visual QA
**Status:** PASS (automated)
- All automated tests use dark mode by default
- Card clarity: PASS
- Typography: PASS
- Connectors: PASS
- Minimap: PASS
- Selected states: PASS
- No layout regression: PASS

---

## Summary

| Test | Method | Status |
|------|--------|--------|
| Offline/Reconnect | Manual | NOT TESTED |
| Sibling-Order Sync | Manual | NOT TESTED |
| Light Mode Visual QA | Manual | NOT TESTED |
| Dark Mode Visual QA | Automated | PASS |

These manual tests should be executed by a QA engineer before production release.
