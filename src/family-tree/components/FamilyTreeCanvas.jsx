/**
 * FamilyTreeCanvas Component — Modern Spatial Lineage Canvas
 * Seamless pan, zoom, smooth camera glide, generational stagger, and active relationship animations.
 */

import React, { useState, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import PersonCard from './PersonCard.jsx';
import TreeMinimap from './TreeMinimap.jsx';
import { useTreeInteraction } from '../hooks/useTreeInteraction.js';
import { computeTreeHighlight } from '../engine/treeHighlight.js';

const FamilyTreeCanvas = forwardRef(function FamilyTreeCanvas(
  {
    layout,
    selectedId,
    immediateFamilyMap,
    constellationMap,
    relatedIds,
    onSelectPerson,
    onDeselect,
    onScaleChange,
    onToggleBranch,
    isReducedMotion = false,
    isArrangeMode = false,
    setSiblingOrder,
  },
  ref
) {
  const containerRef = useRef(null);

  // Arrange Family drag & drop + reorder state - MUST be before conditional return
  const [draggingInfo, setDraggingInfo] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);
  // Hover preview of a person's direct connections (only while nothing is selected)
  const [hoveredId, setHoveredId] = useState(null);

  const highlight = useMemo(
    () =>
      computeTreeHighlight(layout?.lines || [], {
        selectedId,
        constellationMap,
        hoveredId: isArrangeMode ? null : hoveredId,
      }),
    [layout?.lines, selectedId, constellationMap, hoveredId, isArrangeMode]
  );

  const handleShiftSibling = useCallback((node, direction) => {
    if (!node?.cohortSiblingIds || !setSiblingOrder) return;
    const currentList = [...node.cohortSiblingIds];
    const curIdx = currentList.indexOf(node.bloodChildId);
    if (curIdx === -1) return;
    const targetIdx = curIdx + direction;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;
    const temp = currentList[curIdx];
    currentList[curIdx] = currentList[targetIdx];
    currentList[targetIdx] = temp;
    setSiblingOrder(node.cohortKey, currentList);
  }, [setSiblingOrder]);

  const handleDragStart = useCallback((e, node) => {
    if (!isArrangeMode || !node?.canReorder) return;
    e.dataTransfer.setData('text/plain', node.bloodChildId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingInfo({
      personId: node.person.id,
      bloodChildId: node.bloodChildId,
      cohortKey: node.cohortKey,
    });
  }, [isArrangeMode]);

  const handleDragOver = useCallback((e, node) => {
    if (!draggingInfo || draggingInfo.cohortKey !== node?.cohortKey) return;
    if (draggingInfo.bloodChildId === node.bloodChildId) {
      setDropIndicator(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = e.clientX < rect.left + rect.width / 2;
    const side = isLeft ? 'before' : 'after';
    const nodeWidth = layout?.nodeWidth || 230;
    const nodeHeight = layout?.nodeHeight || 160;
    const indicatorX = isLeft ? node.x - 12 : node.x + nodeWidth + 12;
    setDropIndicator({
      cohortKey: node.cohortKey,
      targetBloodChildId: node.bloodChildId,
      side,
      x: indicatorX,
      y: node.y,
      height: nodeHeight,
    });
  }, [draggingInfo, layout?.nodeWidth, layout?.nodeHeight]);

  const handleDrop = useCallback((e, node) => {
    if (!draggingInfo || draggingInfo.cohortKey !== node?.cohortKey || !setSiblingOrder) {
      setDropIndicator(null);
      setDraggingInfo(null);
      return;
    }
    e.preventDefault();
    const sourceId = draggingInfo.bloodChildId;
    const targetId = node.bloodChildId;
    if (sourceId !== targetId) {
      const currentList = [...node.cohortSiblingIds];
      const filtered = currentList.filter((id) => id !== sourceId);
      const targetIdx = filtered.indexOf(targetId);
      if (targetIdx !== -1) {
        if (dropIndicator?.side === 'after') {
          filtered.splice(targetIdx + 1, 0, sourceId);
        } else {
          filtered.splice(targetIdx, 0, sourceId);
        }
        setSiblingOrder(node.cohortKey, filtered);
      }
    }
    setDropIndicator(null);
    setDraggingInfo(null);
  }, [draggingInfo, dropIndicator, setSiblingOrder]);

  const handleDragEnd = useCallback(() => {
    setDropIndicator(null);
    setDraggingInfo(null);
  }, []);

  const interaction = useTreeInteraction({
    layout,
    containerRef,
    isReducedMotion,
    onDeselect,
    onScaleChange,
  });

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: interaction.zoomIn,
      zoomOut: interaction.zoomOut,
      reset: interaction.fitTreeToBounds,
      focusOn: interaction.focusOnPerson,
      focusFamily: interaction.focusOnFamily,
      focusGeneration: interaction.focusOnGeneration,
      fitBranch: interaction.fitBranch,
      panTo: interaction.panToCoordinate,
      currentScale: interaction.transform.scale,
    }),
    [interaction]
  );

  if (!layout) return null;
  const { nodes, allNodes, lines, generationTracks, nodeWidth, nodeHeight, bounds, fullBounds, branchBadges } = layout;
  const { transform, isPanning } = interaction;

  return (
    <div
      ref={containerRef}
      className={`ft-canvas ${isPanning ? 'ft-canvas--panning' : ''} ${transform?.scale < 0.55 ? 'ft-canvas--compact-zoom' : ''}`}
      style={{ '--canvas-scale': transform?.scale || 1 }}
      onMouseDown={interaction.handleMouseDown}
      onMouseMove={interaction.handleMouseMove}
      onMouseUp={interaction.handleMouseUp}
      onTouchStart={interaction.handleTouchStart}
      onTouchMove={interaction.handleTouchMove}
      onTouchEnd={interaction.handleTouchEnd}
      role="region"
      aria-label="Interactive family canvas. Drag to pan, scroll to zoom, click to explore lineage."
      tabIndex={0}
    >
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
        {/* Generation Guide Tracks */}
        <div className="ft-canvas__generation-guides">
          {generationTracks.map((track) => (
            <div
              key={`gen-track-${track.gen}`}
              className="ft-canvas__generation-row"
              style={{
                top: track.y - 25,
                height: track.height + 50,
              }}
            >
              <div
                className="ft-canvas__generation-badge"
                style={{
                  left: track.labelX,
                  top: track.y + 24,
                }}
              >
                <span className="ft-canvas__generation-title" style={{ color: 'var(--ft-emerald)' }}>
                  {track.roman}
                </span>
                <span className="ft-canvas__generation-era">{track.era}</span>
              </div>
            </div>
          ))}
        </div>

        {/* SVG Relationship Connector Lines — Dynamically sized to cover full calculated tree bounds */}
        <svg
          className="ft-canvas__svg-layer"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: bounds?.minX ?? 0,
            top: bounds?.minY ?? 0,
            width: bounds?.width ?? '100%',
            height: bounds?.height ?? '100%',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          viewBox={
            bounds?.width
              ? `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`
              : undefined
          }
        >
          <defs>
            <filter id="active-line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <linearGradient id="activeLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--ft-line-active-start)" />
              <stop offset="100%" stopColor="var(--ft-line-active-end)" />
            </linearGradient>
          </defs>

          {lines.map((line) => {
            const lineState = highlight.lineState.get(line.id);
            const isLineActive = lineState === 'strong';
            const isLineSoft = lineState === 'soft';
            const isLineDimmed = lineState === 'dim' || lineState === 'faint';
            const stateClass = `${isLineSoft ? 'ft-canvas__line--soft' : ''} ${
              lineState === 'faint' ? 'ft-canvas__line--faint' : ''
            }`;

            if (line.type === 'spouse') {
              return (
                <g key={line.id} className="ft-canvas__spouse-group">
                  <path
                    d={line.path}
                    className={`ft-canvas__line ft-canvas__line--spouse ${
                      isLineActive ? 'ft-canvas__line--active ft-canvas__line--animated' : ''
                    } ${isLineDimmed ? 'ft-canvas__line--dimmed' : ''} ${stateClass}`}
                  />
                  {/* Marriage Union Emblem */}
                  <g transform={`translate(${line.midX}, ${line.midY})`}>
                    <circle
                      cx="-3"
                      cy="0"
                      r="4.5"
                      className={`ft-canvas__spouse-ring ${
                        isLineActive ? 'ft-canvas__spouse-ring--active' : ''
                      }`}
                    />
                    <circle
                      cx="3"
                      cy="0"
                      r="4.5"
                      className={`ft-canvas__spouse-ring ${
                        isLineActive ? 'ft-canvas__spouse-ring--active' : ''
                      }`}
                    />
                  </g>
                </g>
              );
            }

            if (line.type === 'sibling') {
              return (
                <g key={line.id} className="ft-canvas__sibling-group">
                  <path
                    d={line.path}
                    className={`ft-canvas__line ft-canvas__line--sibling ${
                      isLineActive ? 'ft-canvas__line--active ft-canvas__line--animated' : ''
                    } ${isLineDimmed ? 'ft-canvas__line--dimmed' : ''} ${stateClass}`}
                  />
                </g>
              );
            }

            return (
              <path
                key={line.id}
                d={line.path}
                className={`ft-canvas__line ft-canvas__line--parent ${
                  line.crossFamily ? 'ft-canvas__line--cross-family' : ''
                } ${
                  isLineActive ? 'ft-canvas__line--active ft-canvas__line--animated' : ''
                } ${isLineDimmed ? 'ft-canvas__line--dimmed' : ''} ${stateClass}`}
              />
            );
          })}
        </svg>

        {/* Person Node Cards with Generational Entrance Stagger */}
        {[...nodes.entries()].map(([id, node]) => {
          const isSelected = selectedId === id;
          const isRelated = relatedIds?.has(id) || false;
          const constellationTier = selectedId
            ? constellationMap?.get(id)?.tier || 'unrelated'
            : 'default';
          const relationRole =
            immediateFamilyMap?.get(id)?.role ||
            constellationMap?.get(id)?.role ||
            null;

          // Generational entrance delay (Gen I -> Gen II -> Gen III -> Gen IV)
          const genDelay = (node.gen || 0) * 80 + (node.x > 0 ? 30 : 0);
          const isReorderable = isArrangeMode && node.canReorder;
          const isBeingDragged =
            draggingInfo?.bloodChildId != null && draggingInfo.bloodChildId === node.bloodChildId;
          const cardState = highlight.cardState.get(String(id)) || (highlight.mode === 'none' ? '' : highlight.mode === 'hover' ? 'faint' : 'dim');

          return (
            <div
              key={id}
              className={`ft-canvas__node-wrapper ft-canvas__node-wrapper--${node.rank} ${isSelected ? 'ft-canvas__node-wrapper--selected' : ''} ${isReorderable ? 'ft-canvas__node-wrapper--arrangeable' : ''} ${isBeingDragged ? 'ft-canvas__node-wrapper--dragging' : ''} ${cardState ? `ft-canvas__node-wrapper--hl-${cardState}` : ''}`}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: nodeWidth,
                height: nodeHeight,
              }}
              onMouseEnter={() => !selectedId && setHoveredId(id)}
              onMouseLeave={() => setHoveredId((current) => (current === id ? null : current))}
              draggable={isReorderable}
              onDragStart={(e) => handleDragStart(e, node)}
              onDragOver={(e) => handleDragOver(e, node)}
              onDrop={(e) => handleDrop(e, node)}
              onDragEnd={handleDragEnd}
            >
              <PersonCard
                person={node.person}
                isSelected={isSelected}
                generationRank={node.rank}
                isRelated={isRelated}
                constellationTier={constellationTier}
                relationshipRole={relationRole}
                onClick={onSelectPerson}
                animationDelay={genDelay}
              />

              {/* Arrange Mode Reordering Micro-Controls */}
              {isReorderable && (
                <div className="ft-arrange-chip" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="ft-arrange-chip__btn"
                    disabled={node.siblingIndex === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShiftSibling(node, -1);
                    }}
                    title="Move left within sibling cohort"
                    aria-label={`Move ${node.person.displayName} left`}
                  >
                    ◀
                  </button>
                  <span className="ft-arrange-chip__idx" title="Current sibling order">
                    {node.siblingIndex + 1}/{node.siblingCount}
                  </span>
                  <button
                    type="button"
                    className="ft-arrange-chip__btn"
                    disabled={node.siblingIndex === node.siblingCount - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShiftSibling(node, 1);
                    }}
                    title="Move right within sibling cohort"
                    aria-label={`Move ${node.person.displayName} right`}
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Arrange Mode Visual Insertion Indicator */}
        {isArrangeMode && dropIndicator && (
          <div
            className="ft-arrange-insertion-indicator"
            style={{
              position: 'absolute',
              left: dropIndicator.x,
              top: dropIndicator.y - 10,
              height: dropIndicator.height + 20,
            }}
          />
        )}

        {/* Branch Collapsing & Expansion Affordance Badges */}
        {branchBadges && branchBadges.length > 0 && branchBadges.map((badge) => (
          <button
            key={badge.id}
            type="button"
            className={`ft-branch-badge ${badge.isCollapsed ? 'ft-branch-badge--collapsed' : 'ft-branch-badge--expanded'}`}
            style={{
              position: 'absolute',
              left: badge.x,
              top: badge.y,
              transform: 'translate(-50%, 0)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBranch?.(badge.unitKeys || badge.unitKey);
            }}
            title={badge.title}
            aria-label={badge.title}
          >
            <span className="ft-branch-badge__icon">
              {badge.isCollapsed ? '+' : '−'}
            </span>
            <span className="ft-branch-badge__label">
              {badge.isCollapsed ? `${badge.childCount} children` : 'Collapse'}
            </span>
          </button>
        ))}
      </div>

      {/* Radar Overview Minimap */}
      <TreeMinimap
        allNodes={allNodes || nodes}
        fullBounds={fullBounds || bounds}
        transform={transform}
        containerRef={containerRef}
        onPanTo={interaction.panToCoordinate}
        selectedId={selectedId}
        isReducedMotion={isReducedMotion}
      />
    </div>
  );
});

export default FamilyTreeCanvas;
