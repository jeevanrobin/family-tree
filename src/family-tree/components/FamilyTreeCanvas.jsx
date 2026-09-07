/**
 * FamilyTreeCanvas Component — Modern Spatial Lineage Canvas
 * Seamless pan, zoom, smooth camera glide, generational stagger, and active relationship animations.
 */

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import PersonCard from './PersonCard.jsx';
import { useTreeInteraction } from '../hooks/useTreeInteraction.js';

const FamilyTreeCanvas = forwardRef(function FamilyTreeCanvas(
  {
    layout,
    selectedId,
    immediateFamilyMap,
    constellationMap,
    relatedIds,
    onSelectPerson,
    onDeselect,
    isReducedMotion = false,
  },
  ref
) {
  const containerRef = useRef(null);

  const interaction = useTreeInteraction({
    layout,
    containerRef,
    isReducedMotion,
    onDeselect,
  });

  // Expose camera control methods through forwardRef
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: interaction.zoomIn,
      zoomOut: interaction.zoomOut,
      reset: interaction.fitTreeToBounds,
      focusOn: interaction.focusOnPerson,
      focusGeneration: interaction.focusOnGeneration,
      currentScale: interaction.transform.scale,
    }),
    [interaction]
  );

  if (!layout) return null;
  const { nodes, lines, generationTracks, nodeWidth, nodeHeight } = layout;
  const { transform, isPanning } = interaction;

  return (
    <div
      ref={containerRef}
      className={`ft-canvas ${isPanning ? 'ft-canvas--panning' : ''}`}
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
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scale})`,
          transformOrigin: '0 0',
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

        {/* SVG Relationship Connector Lines */}
        <svg className="ft-canvas__svg-layer" aria-hidden="true">
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
            let isLineActive = false;
            let isLineDimmed = false;

            if (selectedId) {
              if (line.type === 'spouse') {
                if (line.personId1 === selectedId || line.personId2 === selectedId) {
                  isLineActive = true;
                } else {
                  isLineDimmed = true;
                }
              } else if (line.type === 'parent-child') {
                if (
                  line.childId === selectedId ||
                  (line.parentIds && line.parentIds.includes(selectedId))
                ) {
                  isLineActive = true;
                } else {
                  isLineDimmed = true;
                }
              }
            }

            if (line.type === 'spouse') {
              return (
                <g key={line.id} className="ft-canvas__spouse-group">
                  <path
                    d={line.path}
                    className={`ft-canvas__line ft-canvas__line--spouse ${
                      isLineActive ? 'ft-canvas__line--active ft-canvas__line--animated' : ''
                    } ${isLineDimmed ? 'ft-canvas__line--dimmed' : ''}`}
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

            return (
              <path
                key={line.id}
                d={line.path}
                className={`ft-canvas__line ft-canvas__line--parent ${
                  isLineActive ? 'ft-canvas__line--active ft-canvas__line--animated' : ''
                } ${isLineDimmed ? 'ft-canvas__line--dimmed' : ''}`}
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
          const relationRole = immediateFamilyMap?.get(id)?.role || null;

          // Generational entrance delay (Gen I -> Gen II -> Gen III -> Gen IV)
          const genDelay = (node.gen || 0) * 80 + (node.x > 0 ? 30 : 0);

          return (
            <div
              key={id}
              className={`ft-canvas__node-wrapper ft-canvas__node-wrapper--${node.rank} ${isSelected ? 'ft-canvas__node-wrapper--selected' : ''}`}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: nodeWidth,
                height: nodeHeight,
              }}
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
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default FamilyTreeCanvas;
