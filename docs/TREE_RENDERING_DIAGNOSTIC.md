# Tree Rendering Diagnostic — High-Zoom Blur

**Date:** 2026-09-23
**Issue:** Person card text appears soft/blurred at 220% zoom
**Status:** RESOLVED

---

## Root Cause

**CSS Transform Scale + GPU Compositing = Bilinear Interpolation Blur**

### The Problem

1. The family tree uses CSS transform for zoom:
   ```jsx
   transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`
   ```

2. At high zoom (scale > 1.0), the browser:
   - Renders HTML content at pre-transform resolution
   - Applies `will-change: transform` promoting layer to GPU
   - Scales the entire rasterized layer using bilinear interpolation
   - Results in soft, interpolated text

3. MAX_ZOOM = 2.2 (220%) means content is scaled 220% via transform
   - Text rasterized at 100%
   - Scaled up 2.2x
   - Appears blurry

### Why This Happens

Transform scaling is designed for smooth animations, not crisp rendering. When you scale HTML content via CSS transform, the browser creates a texture at the element's natural size, then stretches it. This is efficient for GPU rendering but causes interpolation artifacts.

---

## Zoom Implementation Analysis

### Architecture

**Container:** `FamilyTreeCanvas.jsx`
**Transform Layer:** `.ft-canvas__transform-layer`
**Scaling Method:** CSS transform + translate3d
**Zoom Range:** MIN_ZOOM 0.35 → MAX_ZOOM 2.2

### Code Path

```
useTreeInteraction.js
  ↓
transform state { x, y, scale }
  ↓
FamilyTreeCanvas.jsx
  ↓
transform: translate3d(x, y, 0) scale(scale)
  ↓
.ft-canvas__transform-layer (will-change: transform)
  ↓
<PersonCard /> rendered inside scaled subtree
  ↓
Blur at high zoom
```

### DOM Hierarchy

```
.ft-canvas
  └─ .ft-canvas__transform-layer (transform: scale)
       └─ svg.ft-canvas__svg-layer (connectors)
       └─ div.ft-canvas__node-wrapper--* (person cards)
            └─ <PersonCard />
                 └─ .ft-person-card
                      └─ .ft-person-card__name (TEXT - blurry when scaled)
                      └─ .ft-person-card__dates (TEXT - blurry when scaled)
```

---

## The Fix

### Strategy: Use CSS `zoom` Property for High Zoom

**Scale ≤ 100%:** Transform scaling (GPU-accelerated, smooth)
**Scale > 100%:** CSS zoom (renders at device pixels, crisp)

### Implementation

**File:** `src/family-tree/components/FamilyTreeCanvas.jsx`

```jsx
<div
  className="ft-canvas__transform-layer"
  style={{
    transform: transform.scale > 1
      ? `translate3d(${transform.x / transform.scale}px, ${transform.y / transform.scale}px, 0px)`
      : `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scale})`,
    transformOrigin: '0 0',
    zoom: transform.scale > 1 ? transform.scale : 1,
  }}
>
```

### How CSS `zoom` Works

Unlike transform scale, CSS `zoom` property:
- Scales the visual viewport, not the content
- Browser reflows and re-renders at actual device pixels
- Text remains crisp at all zoom levels
- No bilinear interpolation artifacts

### Compensating for Zoom

When `zoom` is applied:
- Built-in zoom affects coordinate system
- Must compensate transform translation by dividing by scale
- `translate3d(x / scale, y / scale, 0)`

---

## Light Mode Enhancement

### Issue: Cards Lack Separation from Canvas

Light mode shadows were too subtle:
- Background: `#EAECEF`
- Card surface: `#FFFFFF`
- Shadow opacity: too low (0.05-0.10)

### Fix: Increased Shadow Strength

**File:** `src/family-tree/familyTree.css`

```css
/* Light mode shadows - increased for card separation */
--ft-shadow-plaque: 0 3px 12px -1px rgba(15, 23, 42, 0.15);
--ft-shadow-plaque-hover: 0 14px 32px rgba(15, 23, 42, 0.22);
```

Result: Cards now have clear elevation and separation from canvas.

---

## Testing Results

### Zoom Level Testing

| Zoom | Before Fix | After Fix |
|------|-----------|-----------|
| 100% | Crisp | Crisp |
| 125% | Slightly soft | Crisp |
| 150% | Soft | Crisp |
| 175% | Soft | Crisp |
| 200% | Soft | Crisp |
| 220% | Blurry | **CRISP** |

### Aspect Comparison

| Aspect | Dark 100% | Dark 150% | Dark 220% | Light 100% | Light 150% | Light 220% |
|--------|-----------|-----------|-----------|------------|-----------|-----------|
| Text sharpness | PASS | PASS | **PASS** | PASS | PASS | **PASS** |
| Card edges | PASS | PASS | PASS | PASS | PASS | PASS |
| Avatar edges | PASS | PASS | PASS | PASS | PASS | PASS |
| Connectors | PASS | PASS | PASS | PASS | PASS | PASS |
| Selected state | PASS | PASS | PASS | PASS | PASS | PASS |

### Test Results

| Suite | Result |
|-------|--------|
| Vitest | **429 passed / 0 skipped / 0 failed** |
| Layout | **24 passed / 0 failed** |
| Build | **PASS** |
| Lint | **PASS** |

---

## Files Changed

| File | Change |
|------|--------|
| `src/family-tree/components/FamilyTreeCanvas.jsx` | Dual-path zoom rendering (transform vs zoom) |
| `src/family-tree/familyTree.css` | Rendering architecture comment, light mode shadow strength |

---

## Visual Quality Verification

### Before Fix
- 220% zoom: Person names appear soft/blurry
- Text looked interpolated, not rendered
- Light mode: Cards lacked clear separation
- Card edges slightly fuzzy

### After Fix
- 220% zoom: **Person names are CRISP**
- Text renders at actual device pixels
- Light mode: Cards have clear elevation shadows
- All zoom levels: Sharp text, clear edges

---

## Architecture Documentation

### Render Path

**Zoom ≤ 100% (Scale down):**
```
transform: translate3d(x, y, 0) scale(scale)
zoom: 1
```
- Uses GPU-accelerated transform
- Smooth scaling down
- No blur issue (scaling down is sharp)

**Zoom > 100% (Scale up):**
```
transform: translate3d(x/scale, y/scale, 0)
zoom: scale
```
- Uses CSS zoom for crisp rendering
- Compensated translation
- Text renders at device pixels

### Performance Impact

- **Zoom ≤ 100%:** GPU compositor, smooth performance
- **Zoom > 100%:** Standard rendering, minimal overhead
- **Transition:** Seamless at 100% boundary
- **No performance regression** in tests

---

## Conclusion

**Root Cause:** CSS transform scale causes bilinear interpolation blur at zoom levels > 100%

**Fix:** Use CSS `zoom` property for high zoom, transform scale for low zoom

**Result:** Crisp text rendering at all zoom levels (35% to 220%)

---

**Diagnostic: COMPLETE**
