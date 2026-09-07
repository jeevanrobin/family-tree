/**
 * Animation and Camera Physics Helpers
 */

/**
 * Easing Functions for Natural Transitions
 */
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Clamp a numeric value between min and max bounds
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear Interpolation
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Convert screen coordinates (clientX, clientY) to tree canvas coordinate space
 */
export function screenToTreeCoordinates(screenX, screenY, containerRect, transform) {
  const relX = screenX - containerRect.left;
  const relY = screenY - containerRect.top;
  return {
    x: (relX - transform.x) / transform.scale,
    y: (relY - transform.y) / transform.scale,
  };
}

/**
 * Convert tree canvas coordinates to screen coordinates
 */
export function treeToScreenCoordinates(treeX, treeY, containerRect, transform) {
  return {
    x: containerRect.left + transform.x + treeX * transform.scale,
    y: containerRect.top + transform.y + treeY * transform.scale,
  };
}
