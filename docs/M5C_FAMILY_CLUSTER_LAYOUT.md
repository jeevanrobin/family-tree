# M5C Family Cluster Layout Architecture

## Overview

M5C implements a premium family cluster tree layout with adaptive subtree-based positioning, ensuring meaningful whitespace between family groups and hierarchical parent centering.

---

## M5C.1 — Spacing Constants (COMPLETE)

### Changes
- **SIBLING_GAP**: 26px → 36px (+38% whitespace)
- **SUBTREE_GAP**: Defined as 72px (reserved for architecture)
- **DESCENDANT_GAP**: Defined as 48px (reserved for architecture)
- **Tree width**: 2182px → 2252px

### Result
- Improved readability for sibling cohorts
- Cards less visually cramped
- All 24 existing layout tests pass

### Documentation
See: `src/family-tree/engine/treeLayout.js` lines 11-35

---

## M5C.2 — Subtree Geometry Engine (COMPLETE)

### Purpose
Build reusable deterministic geometry calculations BEFORE implementing final positioning logic.

### Key Concepts

#### Family Unit
- A couple (spouses) or single person
- Treated as one layout unit

#### Subtree
- A family unit + all descendants
- Has calculated width and height

#### Width Calculation
- **Unit Width**: NODE_WIDTH (230px) for singles, NODE_WIDTH * 2 + SPOUSE_GAP (484px) for couples
- **Subtree Width**: MAX(unitWidth, childSubtreeWidths + gaps)
- **Branch Gap**: SUBTREE_GAP (72px) between sibling family branches

### Architecture

#### Module: `subtreeGeometry.js`

**Core Functions:**
```javascript
// Calculate width for a family unit
calculateUnitWidth(hasSpouse)

// Calculate minimum subtree width
calculateMinSubtreeWidth(hasSpouse, childCount)

// Compute geometry for entire tree
computeSubtreeGeometry(persons, relationships, genMap)
```

**Data Structure: `FamilySubtree`**
```javascript
{
  rootPersonId: string,
  spouseId: string | null,
  childrenIds: string[],
  gen: number,
  width: number,          // Total subtree width in px
  height: number,         // Total subtree height in px
  childSubtrees: FamilySubtree[],
  personCount: number,    // Total persons in subtree
  descendantCount: number,
  branchCount: number,
}
```

### Determinism
- Same input → same output
- No random values
- No DOM measurements
- No browser-dependent values

### Test Coverage

**Unit Tests**: 27 tests
- calculateUnitWidth (3 tests)
- calculateMinSubtreeWidth (3 tests)
- computeSubtreeGeometry (10 tests)
- FamilySubtree class (5 tests)
- Helper functions (2 tests)
- Edge cases (4 tests including 36-person family)

**Edge Cases Tested:**
- 1 person (single node)
- Couple (2 persons)
- Couple + 1 child (3 persons)
- Couple + multiple children (5+ persons)
- Child with descendants (multi-level)
- Uneven child branches (different widths)
- 36-person real family (Medida's family)
- Disconnected persons (no relationships)
- Cross-branch marriage

### Branch Reservation
Before positioning, geometry calculation ensures:
- Large branches don't collide with neighbors
- Each child subtree gets reserved horizontal space
- Width is calculated bottom-up (descendants → ancestors)

### Example: Uneven Branches

```
Parent (width: 758px)
├── Child A (width: 602px, has 3 grandchildren)
└── Child B (width: 230px, leaf node)

Parent width = MAX(
  unitWidth: 484px,
  Child A (602px) + SUBTREE_GAP (72px) + Child B (230px) = 904px
)
Result: 904px
```

### Immuntability
`FamilySubtree` objects are frozen:
- Prevents accidental mutation
- Ensures deterministic behavior
- Arrays (`childrenIds`, `childSubtrees`) are also frozen

---

## M5C.3 — Hierarchical Parent Centering (FUTURE)

### Objective
Position parents at the center of their descendant footprint.

### Requirements
1. Calculate descendant subtree width (✓ M5C.2)
2. Position parent unit at centerX of subtree
3. Cascade positioning down to children

### Algorithm (Proposed)
```
for each generation g from minGen to maxGen:
  for each unit in generation g:
    if unit has children:
      center unit over child subtrees
```

### Challenges
- Avoiding collisions between unrelated branches
- Handling cross-branch marriages
- Ensuring parents remain connected to ancestors

---

## M5C.4 — Animation Choreography (FUTURE)

### Objective
Animated entrance when tree loads:
1. Ancestors fade in first
2. Each generation fades in sequentially
3. Connectors draw after cards positioned

### Technical Approach
- Use React-Bits `fadeSlideIn` for entrance
- Use GSAP for connector path drawing
- Stagger animations by 50-100ms

---

## Visual Quality Standards

### Dark Mode (Reference)
- Strong visual hierarchy
- Cards clearly separated from canvas
- Text immediately readable
- Connectors visible but subordinate

### Light Mode (Balanced)
- Canvas: #E0E4E8 (darker slate)
- Cards: #FFFFFF with strong shadows
- Text: Primary #0F172A, Secondary #1E293B
- Connectors: #475569 (visible)

### Selected State
- Subtle orange accent (border-top: 2px)
- Elevated surface
- Premium shadow
- No thick orange borders

---

## Layout Constants

```javascript
NODE_WIDTH = 230px
NODE_HEIGHT = 160px
SPOUSE_GAP = 24px
SIBLING_GAP = 36px
SUBTREE_GAP = 72px
DESCENDANT_GAP = 48px
GENERATION_GAP = 65px
GENERATION_HEIGHT = 225px
```

---

## Files Modified

### M5C.1
- `src/family-tree/engine/treeLayout.js` - Spacing constants
- `src/family-tree/familyTree.css` - Light theme balance

### M5C.2
- `src/family-tree/engine/subtreeGeometry.js` - Geometry engine (NEW)
- `src/family-tree/engine/subtreeGeometry.test.js` - Unit tests (NEW)

### M5C.3 (Future)
- `src/family-tree/engine/treeLayout.js` - Positioning algorithm
- `src/family-tree/components/FamilyTreeCanvas.jsx` - Animation integration

---

## Performance Considerations

### Subtree Width Calculation
- O(n) where n = number of persons
- Each person processed once
- Memoization not needed (pure functional)

### Memory
- FamilySubtree objects are small (~200 bytes each)
- For 1000-person tree: ~200KB overhead

### Rendering
- Geometry calculation happens once per tree render
- No DOM measurements (pure calculation)
- Can be computed in Web Worker if needed

---

## Testing Strategy

### Unit Tests (Vitest)
- Deterministic geometry calculations
- Edge cases (1, 2, 36+ persons)
- Immuntability verification

### Layout Tests (Custom)
- 24 polish tests for existing layout
- Must pass after each change

### Browser Tests (Playwright)
- Full QA suite (99 tests)
- Visual regression (manual review)

---

## Backward Compatibility

### Preserved
- `computeTreeLayout` public API
- All existing node properties
- All existing connector properties
- Sibling ordering behavior
- Generation assignment

### Extended (Future)
- Subtree metadata attached to nodes
- Width calculations available for UI hints
- Branch labels based on subtree size

---

## Summary

**M5C.1**: ✅ COMPLETE
- Spacing improved
- Light theme balanced

**M5C.2**: ✅ COMPLETE
- Subtree geometry engine
- 27 unit tests
- Deterministic calculations
- Immutable data structures
- Ready for M5C.3 positioning

**M5C.3**: ⏳ FUTURE
- Parent centering
- Branch collision prevention

**M5C.4**: ⏳ FUTURE
- Animation choreography

---

Last Updated: 2026-09-24
Author: M5C Family Cluster Layout Team
