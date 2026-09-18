/**
 * Tree Interaction Engine — Camera Framing & Canvas Transform Mathematics
 * Intelligently scales and fits the family tree to occupy 72-82% of the usable viewport.
 */

import { clamp } from '../utils/animationHelpers.js';

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.2;
export const ZOOM_STEP = 0.16;

/**
 * Calculate new scale and origin-adjusted offset for zoom centered at a point
 */
export function calculateZoom(currentTransform, targetScale, centerPoint) {
  const newScale = clamp(targetScale, MIN_ZOOM, MAX_ZOOM);
  const ratio = newScale / currentTransform.scale;

  return {
    x: centerPoint.x - (centerPoint.x - currentTransform.x) * ratio,
    y: centerPoint.y - (centerPoint.y - currentTransform.y) * ratio,
    scale: newScale,
  };
}

/**
 * Calculate camera transform to fit the tree bounding box tightly into container
 * Target: Occupy 75-85% of usable canvas, avoiding excessive empty space.
 * @param {object} bounds
 * @param {number} containerWidth
 * @param {number} containerHeight
 * @param {number} paddingX
 * @param {number} paddingY
 * @param {number} minScale - soft minimum scale to preserve card readability
 */
export function calculateFitToBounds(
  bounds,
  containerWidth,
  containerHeight,
  paddingX = 40,
  paddingY = 45,
  minScale = 0.45
) {
  const availableW = Math.max(containerWidth - paddingX * 2, 200);
  const availableH = Math.max(containerHeight - paddingY * 2, 200);

  const scaleX = availableW / (bounds.width || 1);
  const scaleY = availableH / (bounds.height || 1);
  
  // Choose scale so the tree fills the available viewport comfortably
  const scale = clamp(Math.min(scaleX, scaleY), minScale, 1.25);

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    x: containerWidth / 2 - centerX * scale,
    y: containerHeight / 2 - centerY * scale,
    scale,
  };
}

/**
 * Calculate camera transform to fit a specific branch/cohort into view at a comfortable, readable scale
 */
export function calculateFitToBranch(
  branchNodes,
  containerWidth,
  containerHeight,
  paddingX = 60,
  paddingY = 60
) {
  if (!branchNodes || branchNodes.length === 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  branchNodes.forEach((node) => {
    if (node.x < minX) minX = node.x;
    if (node.x + (node.width || 230) > maxX) maxX = node.x + (node.width || 230);
    if (node.y < minY) minY = node.y;
    if (node.y + (node.height || 160) > maxY) maxY = node.y + (node.height || 160);
  });

  const width = Math.max(maxX - minX, 100);
  const height = Math.max(maxY - minY, 100);

  return calculateFitToBounds(
    { minX, maxX, minY, maxY, width, height },
    containerWidth,
    containerHeight,
    paddingX,
    paddingY,
    0.75 // Branch fit guarantees readable scale >= 0.75
  );
}

/**
 * Calculate radar transform for the interactive Minimap
 */
export function calculateMinimapTransform(
  bounds,
  minimapWidth,
  minimapHeight,
  padding = 10
) {
  const availW = Math.max(minimapWidth - padding * 2, 20);
  const availH = Math.max(minimapHeight - padding * 2, 20);

  const scale = Math.min(availW / (bounds.width || 1), availH / (bounds.height || 1));
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    scale,
    offsetX: minimapWidth / 2 - centerX * scale,
    offsetY: minimapHeight / 2 - centerY * scale,
  };
}

/**
 * Calculate camera transform to focus on a specific node with drawer offset
 */
export function calculateFocusOnNode(node, containerWidth, containerHeight, currentScale, horizontalOffset = 0) {
  const scale = clamp(Math.max(currentScale, 1.0), 0.9, 1.35);

  return {
    x: containerWidth / 2 - node.centerX * scale + horizontalOffset,
    y: containerHeight / 2 - node.centerY * scale,
    scale,
  };
}
