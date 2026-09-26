/**
 * TreeMinimap Component — Scalable Spatial Radar
 * Lightweight, non-intrusive radar overview displaying overall family bounds,
 * generational node markers, and the live camera viewport with click-to-pan.
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { calculateMinimapTransform } from '../engine/treeInteraction.js';

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;

export default function TreeMinimap({
  fullBounds,
  allNodes,
  transform,
  containerRef,
  onPanTo,
  selectedId,
  isReducedMotion = false,
}) {
  const [isMinimized, setIsMinimized] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 720px)').matches);
  const svgRef = useRef(null);

  // Derive container dimensions
  const containerSize = useMemo(() => {
    if (!containerRef?.current) return { width: 1200, height: 800 };
    const rect = containerRef.current.getBoundingClientRect();
    return { width: rect.width || 1200, height: rect.height || 800 };
  }, [containerRef]);

  // Derive radar coordinate mapping
  const radar = useMemo(() => {
    if (!fullBounds || !fullBounds.width || !fullBounds.height) {
      return null;
    }
    return calculateMinimapTransform(fullBounds, MINIMAP_WIDTH, MINIMAP_HEIGHT, 12);
  }, [fullBounds]);

  // Compute live camera viewport box in minimap coordinates
  const viewportBox = useMemo(() => {
    if (!radar || !transform || !transform.scale || !Number.isFinite(transform.scale) || transform.scale <= 0) {
      return null;
    }

    const contW = containerSize.width || 1200;
    const contH = containerSize.height || 800;

    // Viewport extent in world coordinates
    const worldW = contW / transform.scale;
    const worldH = contH / transform.scale;
    const worldX = -(transform.x || 0) / transform.scale;
    const worldY = -(transform.y || 0) / transform.scale;

    // Map to minimap coordinates
    const x = worldX * radar.scale + radar.offsetX;
    const y = worldY * radar.scale + radar.offsetY;
    const w = worldW * radar.scale;
    const h = worldH * radar.scale;

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
      return null;
    }

    return { x, y, w, h };
  }, [radar, transform, containerSize]);

  // Handle click on minimap to pan camera to that area
  const handleMinimapClick = useCallback(
    (e) => {
      if (!radar || !onPanTo || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Inverse map from minimap to world coordinates
      const worldX = (clickX - radar.offsetX) / radar.scale;
      const worldY = (clickY - radar.offsetY) / radar.scale;

      onPanTo(worldX, worldY, isReducedMotion ? 0 : 350);
    },
    [radar, onPanTo, isReducedMotion]
  );

  if (!radar || !allNodes || allNodes.size === 0) return null;

  return (
    <div
      className={`ft-minimap ${isMinimized ? 'ft-minimap--minimized' : ''}`}
      aria-label="Family Tree Minimap Overview"
    >
      <div className="ft-minimap__header">
        <span className="ft-minimap__title">Overview ({allNodes.size})</span>
        <button
          type="button"
          className="ft-minimap__toggle"
          onClick={() => setIsMinimized((prev) => !prev)}
          title={isMinimized ? 'Expand minimap' : 'Collapse minimap'}
          aria-label={isMinimized ? 'Expand minimap' : 'Collapse minimap'}
        >
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>

      {!isMinimized && (
        <svg
          ref={svgRef}
          className="ft-minimap__canvas"
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          onClick={handleMinimapClick}
        >
          {/* Background subtle grid/bounds */}
          <rect
            x={0}
            y={0}
            width={MINIMAP_WIDTH}
            height={MINIMAP_HEIGHT}
            className="ft-minimap__bg"
          />

          {/* Lineage Branch Node Dots */}
          {[...allNodes.entries()].map(([id, node]) => {
            const nx = node.x * radar.scale + radar.offsetX;
            const ny = node.y * radar.scale + radar.offsetY;
            if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
            const nw = Math.max((node.width || 230) * radar.scale, 4);
            const nh = Math.max((node.height || 160) * radar.scale, 3);
            const isSelected = selectedId === id;

            return (
              <circle
                key={`minimap-node-${id}`}
                cx={nx + nw / 2}
                cy={ny + nh / 2}
                r={isSelected ? 3.5 : 2}
                className={`ft-minimap__node ft-minimap__node--gen-${node.gen || 0} ${
                  isSelected ? 'ft-minimap__node--selected' : ''
                }`}
              />
            );
          })}

          {/* Current Camera Viewport Box */}
          {viewportBox && (
            <rect
              x={viewportBox.x}
              y={viewportBox.y}
              width={Math.max(viewportBox.w, 8)}
              height={Math.max(viewportBox.h, 6)}
              rx={2}
              className="ft-minimap__viewport"
            />
          )}
        </svg>
      )}
    </div>
  );
}
