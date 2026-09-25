# M5C.5b Navigation UI Regression — Root Cause Analysis

**Date:** 2026-09-24
**Status:** ROLLED BACK
**Severity:** BLOCKING

---

## Visual Symptoms

1. **Vertical Bullet List**: Navigation items (Tree/Timeline/Memories/Archive/Insights) displayed as vertical bullet list
2. **Bullet Points Visible**: `<ul>` element showed default browser bullets
3. **Massive Blank Space**: Header expanded to extreme height
4. **Layout Broken**: Existing header controls pushed/misaligned
5. **Tree Pushed Down**: Family tree canvas displaced vertically

---

## Root Cause Investigation

### What Was Rendered

```html
<nav data-slot="gooey-nav" className="inline-block">
  <ul className="flex items-center">
    <motion.li data-slot="gooey-nav-segment" className="relative">
      <!-- NavLabel component -->
    </motion.li>
    <!-- ... more items ... -->
  </ul>
</nav>
```

### CSS Rules Applied (from GooeyNav)

```css
[data-slot="gooey-nav"] {
  font-family: var(--ft-font-body);
  /* NO LIST-STYLE RESET HERE */
}

.ft-gooey-surface {
  background: var(--ft-surface, #141C26);
}

.ft-gooey-nav-inactive {
  color: var(--ft-text-muted, #64748B);
}
```

### Missing CSS Rules

GooeyNav CSS file (`rareUi.css`) did **NOT** include:

```css
/* MISSING */
[data-slot="gooey-nav"] ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

[data-slot="gooey-nav"] li {
  list-style: none;
}
```

### Why Bullets Appeared

1. GooeyNav renders a `<ul>` element
2. Browser default UA stylesheet applies:
   ```css
   ul {
     list-style-type: disc;
     padding-left: 40px;
   }
   li {
     display: list-item;
   }
   ```
3. Tailwind utility `flex items-center` was applied to `<ul>` (line 117)
4. However, `list-style: none` was **NOT** applied
5. Result: Bullets visible even though items were flex children

### Why Vertical Layout

1. Tailwind's `flex items-center` on `<ul>` should create horizontal layout
2. However, because `list-style: disc` was active, each `<li>` retained `display: list-item`
3. The `motion.li` component doesn't automatically reset `display`
4. Result: `<li>` rendered with `display: list-item` which is block-level, causing vertical stacking

### Why Huge Header Height

1. `<nav>` container used `inline-block` (GooeyNav line 115)
2. `<ul>` had default `padding-left: 40px` from browser
3. Each `<li>` with `list-style` added vertical spacing
4. SVG neck elements inside `<li>` had `height: 100%` and `NECK_H = 100`
5. The parent `<motion.li>` had `position: relative`, causing children to flow
6. Neck SVG positioned with `top: 0; bottom: 0` created 100px height per item
7. With 5 items stacked vertically: ~500px+ total height
8. Result: Header expanded to accommodate vertical stack

---

## CSS Specificity Analysis

### Applied Rules (Priority Order)

1. **Browser UA Stylesheet** (lowest specificity, but applies by default):
   ```css
   ul { list-style-type: disc; padding-left: 40px; }
   li { display: list-item; list-style-position: outside; }
   ```

2. **Tailwind Utilities** (applied via className):
   ```css
   .flex { display: flex; }
   .items-center { align-items: center; }
   .inline-block { display: inline-block; }
   .relative { position: relative; }
   ```

3. **GooeyNav CSS** (`rareUi.css`):
   ```css
   [data-slot="gooey-nav"] { font-family: var(--ft-font-body); }
   .ft-gooey-nav-inactive { color: var(--ft-text-muted); }
   ```

4. **familyTree.css** (application-wide):
   - No rules targeting `[data-slot="gooey-nav"]`
   - No global `ul` resets
   - `.ft-header` uses flexbox, but GooeyNav doesn't inherit

### Missing Reset Cascade

GooeyNav expected Tailwind base styles to reset list-style, but:

1. Tailwind's `preflight` (base reset) **IS** likely included
2. However, Tailwind preflight resets:
   ```css
   ul { list-style: none; padding: 0; }
   ```
3. But if Tailwind config scope excludes `rare-ui/` or if CSS build order is wrong, reset may not apply

---

## Integration Context

### TreeHeader.jsx Structure

```jsx
<header class="ft-header">
  <div class="ft-header__brand-group">...</div>
  
  {/* M5C.5b Insertion */}
  {activeFamily && (
    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '12px' }}>
      <GooeyNav familyId={activeFamily.id} size="sm" />
    </div>
  )}
  
  {/* Existing Generation Filters */}
  <div class="ft-header__gen-filters">...</div>
  
  {/* Right Controls */}
  <div class="ft-header__actions">...</div>
</header>
```

### Header Flex Layout

```css
.ft-header {
  display: flex;
  align-items: center;        /* vertical center */
  justify-content: space-between;
  gap: 20px;                  /* child spacing */
  height: auto;                /* height from content */
}
```

When GooeyNav rendered with 500px+ height, header flex container expanded to fit, pushing tree down.

---

## Why Tests Passed

1. **Vitest/Unit Tests**: Test JavaScript logic, not CSS rendering
2. **Layout Tests**: Test tree positioning, not header layout
3. **Build**: Bundles CSS but doesn't validate visual output
4. **Playwright**: No tests specifically checked header height or list-style

The regression was **visual only** in the rendered browser UI.

---

## Correct Fix Approach

### Option 1: Add List Reset to rareUi.css

```css
[data-slot="gooey-nav"],
[data-slot="gooey-nav"] ul,
[data-slot="gooey-nav"] li {
  list-style: none;
  padding: 0;
  margin: 0;
}

[data-slot="gooey-nav"] ul {
  display: flex;
  align-items: center;
}
```

### Option 2: Use Semantic Elements Without List

```jsx
// Instead of <ul>/<li>, use <div> with role="list"
<nav data-slot="gooey-nav">
  <div role="list" className="flex items-center">
    <div role="listitem" className="relative">
      {children}
    </div>
  </div>
</nav>
```

### Option 3: Apply Tailwind List Reset Utility

```jsx
<ul className="flex items-center list-none p-0 m-0">
  {/* items */}
</ul>
```

### Option 4: Ensure Tailwind Preflight Loads

Check `tailwind.config.js` and Vite build order to ensure Tailwind base styles apply to all components.

---

## CSS Build Order Hypothesis

### Possible Issue

If `rareUi.css` is imported **AFTER** Tailwind's preflight:

1. Tailwind preflight resets `ul { list-style: none; }`
2. `rareUi.css` imported later
3. GooeyNav uses Tailwind utilities via className
4. BUT: `list-none` utility may not be applied correctly if:
   - Parsed as plain CSS (not processed by Tailwind)
   - Or if build order causes specificity issues

### Verification Needed

Check Vite build output to see:
1. Order of CSS injection
2. Whether `list-none` utility generates correct CSS
3. Whether Tailwind scans `rare-ui/*.jsx` for class extraction

---

## Lessons Learned

1. **Always Reset List Styles**: When using `<ul>/<li>` outside normal list context, explicitly reset `list-style: none`

2. **Test Visual Output**: Unit tests don't catch CSS rendering issues. Need:
   - Visual regression tests (Percy, Chromatic)
   - Screenshot comparison
   - Manual QA in multiple browsers

3. **Tailwind Utilities in JSX**: When using Tailwind classes in JSX, ensure:
   - Tailwind processes the file
   - OR use inline styles as fallback
   - Don't assume preflight will apply

4. **CSS Isolation**: Custom components in isolated files need complete self-contained styles, including resets.

5. **Motion Components Confusion**: `motion.li` doesn't automatically apply list-reset. It's just a motion-enabled `<li>`.

---

## Files Changed in Rollback

| File | Action | Lines Changed |
|------|--------|---------------|
| `TreeHeader.jsx` | Removed GooeyNav import and usage | -9 lines |
| `GooeyNav.jsx` | Deleted file | -193 lines |
| `HookSidebar.jsx` | Deleted file | -193 lines |
| `rareUi.css` | Reverted GooeyNav CSS section | -73 lines |

---

## Verification of Rollback

| Check | Result |
|-------|--------|
| Build | PASS |
| Layout Tests | 24/24 PASS |
| Vitest | 462/462 PASS |
| Header Height | NORMAL (expected: ~68px) |
| Bullet Points | NONE |
| Tree Position | NORMAL |
| SPA Routing | INTACT |
| Generation Filter | WORKS |

---

## Next Steps

1. **Do NOT re-attempt M5C.5b** until:
   - Root cause fully understood
   - Fix approach decided (list reset vs. semantic change)
   - Visual regression tests added

2. **Add Visual Tests**:
   - Screenshot baseline for header
   - Playwright visual comparison
   - Percy/Chromatic integration

3. **GooeyNav Redesign**:
   - Add explicit list-style reset
   - Consider using `<div role="list">` instead of `<ul>`
   - Test in isolation before header integration

4. **CSS Architecture Review**:
   - Ensure Tailwind processes all component files
   - Check preflight application scope
   - Add explicit resets to isolated components

---

## M5C.5b Status

**STATUS: BLOCKED / ROLLED BACK**

- Rollback commit: cbe881c
- Files reverted: 4
- Tests restored: 462 passing
- UI restored: YES

**DO NOT RE-ATTEMPT** until visual regression tests in place.

---

*Analysis completed: 2026-09-24*
