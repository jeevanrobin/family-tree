/**
 * useTreeInteraction Hook
 * Coordinates canvas gestures, mousewheel zoom, drag-panning,
 * and smooth camera animation loops.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  calculateZoom,
  calculateFitToBounds,
  calculateFitToBranch,
  calculateFocusOnNode,
} from '../engine/treeInteraction.js';
import { easeOutCubic } from '../utils/animationHelpers.js';

export function useTreeInteraction({
  layout,
  containerRef,
  isReducedMotion = false,
  onDeselect,
  onScaleChange,
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);

  const isDragging = useRef(false);
  const startDragPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const lastTouchDist = useRef(null);
  const animFrameId = useRef(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Fit on first layout measurement as well as after the intro overlay. This
  // prevents a fresh session from starting at the raw origin with half the
  // family off-screen.
  const hasInitialFit = useRef(false);

  // Notify parent of scale changes (for ZoomControls percentage badge)
  useEffect(() => {
    onScaleChange?.(transform.scale);
  }, [transform.scale, onScaleChange]);

  // Smooth camera animation function — stable ref prevents re-renders on drag
  const animateCameraTo = useCallback(
    (targetX, targetY, targetScale, duration = 450) => {
      if (isReducedMotion) {
        setTransform({ x: targetX, y: targetY, scale: targetScale });
        return;
      }

      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }

      const startX = transformRef.current.x;
      const startY = transformRef.current.y;
      const startScale = transformRef.current.scale;
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        setTransform({
          x: startX + (targetX - startX) * eased,
          y: startY + (targetY - startY) * eased,
          scale: startScale + (targetScale - startScale) * eased,
        });

        if (progress < 1) {
          animFrameId.current = requestAnimationFrame(step);
        } else {
          animFrameId.current = null;
        }
      }

      animFrameId.current = requestAnimationFrame(step);
    },
    [isReducedMotion]
  );

  // Fit to screen / reset view
  const fitTreeToBounds = useCallback(
    (duration = 550) => {
      if (!layout || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const target = calculateFitToBounds(layout.bounds, rect.width, rect.height, 40, 45);
      animateCameraTo(target.x, target.y, target.scale, duration);
    },
    [layout, containerRef, animateCameraTo]
  );

  const fitTreeToBoundsRef = useRef(fitTreeToBounds);
  fitTreeToBoundsRef.current = fitTreeToBounds;

  useEffect(() => {
    if (!hasInitialFit.current && layout?.bounds?.width && containerRef.current) {
      hasInitialFit.current = true;
      requestAnimationFrame(() => fitTreeToBounds(0));
    }
  }, [layout, containerRef, fitTreeToBounds]);

  // Maintain proper centering ONLY when the actual browser viewport/container changes size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let resizeTimer;
    let prevWidth = el.clientWidth;
    let prevHeight = el.clientHeight;

    const observer = new ResizeObserver((entries) => {
      // NEVER auto-reset view while the user is actively dragging or panning
      if (isDragging.current) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Only trigger if container dimensions actually changed (e.g. window resize, drawer toggle)
        if (Math.abs(width - prevWidth) > 8 || Math.abs(height - prevHeight) > 8) {
          prevWidth = width;
          prevHeight = height;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (!isDragging.current) {
              fitTreeToBoundsRef.current?.(0);
            }
          }, 150);
        }
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [containerRef]);

  // Focus on a specific person node
  const focusOnPerson = useCallback(
    (personId, duration = 450) => {
      const node = layout?.nodes.get(personId);
      if (!node || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // On desktop, offset slightly to the left so the side drawer doesn't obscure the card
      const isDesktop = rect.width > 900;
      const horizontalOffset = isDesktop ? -150 : 0;

      const target = calculateFocusOnNode(
        node,
        rect.width,
        rect.height,
        transform.scale,
        horizontalOffset
      );

      animateCameraTo(target.x, target.y, target.scale, duration);
    },
    [layout, containerRef, transform.scale, animateCameraTo]
  );

  // Focus on generation row
  const focusOnGeneration = useCallback(
    (genNumber, duration = 450) => {
      if (!layout || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const genTrack = layout.generationTracks.find((g) => g.gen === genNumber);
      if (!genTrack) return;

      const targetScale = Math.max(transform.scale, 0.85);
      const targetY = rect.height / 2 - (genTrack.y + layout.nodeHeight / 2) * targetScale;

      animateCameraTo(transform.x, targetY, targetScale, duration);
    },
    [layout, containerRef, transform.x, transform.scale, animateCameraTo]
  );

  // Fit a specific branch (person, spouse, children) into view
  const fitBranch = useCallback(
    (personId, duration = 480) => {
      if (!layout || !containerRef.current || !personId) return;
      const primaryNode = layout.nodes.get(personId);
      if (!primaryNode) return;

      const rect = containerRef.current.getBoundingClientRect();
      const branchNodes = [primaryNode];

      // Include spouse
      layout.lines.forEach((l) => {
        if (l.type === 'spouse' && (l.personId1 === personId || l.personId2 === personId)) {
          const spouseId = l.personId1 === personId ? l.personId2 : l.personId1;
          const sNode = layout.nodes.get(spouseId);
          if (sNode) branchNodes.push(sNode);
        }
      });

      // Include visible children
      layout.lines.forEach((l) => {
        if (l.type === 'parent-child' && l.parentIds && l.parentIds.includes(personId)) {
          const cNode = layout.nodes.get(l.childId);
          if (cNode) branchNodes.push(cNode);
        }
      });

      const target = calculateFitToBranch(branchNodes, rect.width, rect.height, 60, 60);
      animateCameraTo(target.x, target.y, target.scale, duration);
    },
    [layout, containerRef, animateCameraTo]
  );

  // Pan to an arbitrary world coordinate (used by Minimap)
  const panToCoordinate = useCallback(
    (worldX, worldY, duration = 350) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const targetX = rect.width / 2 - worldX * transform.scale;
      const targetY = rect.height / 2 - worldY * transform.scale;
      animateCameraTo(targetX, targetY, transform.scale, duration);
    },
    [containerRef, transform.scale, animateCameraTo]
  );

  // Zoom In
  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerPoint = { x: rect.width / 2, y: rect.height / 2 };
    setTransform((t) => calculateZoom(t, t.scale + ZOOM_STEP, centerPoint));
  }, [containerRef]);

  // Zoom Out
  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerPoint = { x: rect.width / 2, y: rect.height / 2 };
    setTransform((t) => calculateZoom(t, t.scale - ZOOM_STEP, centerPoint));
  }, [containerRef]);

  // Mouse wheel zoom to cursor
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const centerPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;

      setTransform((t) => calculateZoom(t, t.scale + delta, centerPoint));
    },
    [containerRef]
  );

  // Mouse drag panning
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasMoved.current = false;
    startDragPos.current = { x: e.clientX, y: e.clientY };
    lastPos.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;

    if (
      Math.abs(e.clientX - startDragPos.current.x) > 4 ||
      Math.abs(e.clientY - startDragPos.current.y) > 4
    ) {
      hasMoved.current = true;
    }

    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setIsPanning(false);
      if (!hasMoved.current && onDeselect) {
        onDeselect();
      }
    }
  }, [onDeselect]);

  // Touch handling
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      hasMoved.current = false;
      startDragPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsPanning(true);
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;

      if (
        Math.abs(e.touches[0].clientX - startDragPos.current.x) > 6 ||
        Math.abs(e.touches[0].clientY - startDragPos.current.y) > 6
      ) {
        hasMoved.current = true;
      }

      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - lastTouchDist.current) * 0.004;
      lastTouchDist.current = dist;

      setTransform((t) => ({
        ...t,
        scale: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.scale + delta)),
      }));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isDragging.current && !hasMoved.current && onDeselect) {
      onDeselect();
    }
    isDragging.current = false;
    lastTouchDist.current = null;
    setIsPanning(false);
  }, [onDeselect]);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, containerRef]);

  return {
    transform,
    isPanning,
    zoomIn,
    zoomOut,
    fitTreeToBounds,
    focusOnPerson,
    focusOnGeneration,
    fitBranch,
    panToCoordinate,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
