import React from 'react';
import FadeContent from '../react-bits/FadeContent.jsx';

/**
 * LineagePreview
 * Hero marketing visual — an interactive-looking family tree preview.
 * IMPORTANT: all people below are SYNTHETIC DEMO CONTENT used only for this
 * product preview. It never connects to, loads, or modifies real family data.
 */

// Synthetic demo people (marketing visual only)
const DEMO_PEOPLE = [
  {
    id: 'ravi',
    name: 'Ravi Sharma',
    meta: 'b. 1948 · Hyderabad',
    initials: 'RS',
    color: '#8A9099',
    x: 28,
    y: 15,
  },
  {
    id: 'lakshmi',
    name: 'Lakshmi Sharma',
    meta: 'b. 1952 · Warangal',
    tag: '2 stories',
    initials: 'LS',
    color: '#C98467',
    x: 72,
    y: 15,
  },
  {
    id: 'anita',
    name: 'Anita Sharma',
    meta: 'b. 1975 · Hyderabad',
    initials: 'AS',
    color: '#B4472F',
    x: 14,
    y: 50,
  },
  {
    id: 'vikram',
    name: 'Vikram Sharma',
    meta: 'b. 1978 · Hyderabad',
    tag: '12 photos',
    initials: 'VS',
    color: '#E56515',
    x: 50,
    y: 50,
    selected: true,
  },
  {
    id: 'priya',
    name: 'Priya Sharma',
    meta: 'b. 1982 · Secunderabad',
    initials: 'PS',
    color: '#6D747C',
    x: 86,
    y: 50,
  },
  {
    id: 'aarav',
    name: 'Aarav Sharma',
    meta: 'b. 2008',
    initials: 'AS',
    color: '#7C858E',
    x: 28,
    y: 85,
  },
  {
    id: 'diya',
    name: 'Diya Sharma',
    meta: 'b. 2012',
    initials: 'DS',
    color: '#C98467',
    x: 72,
    y: 85,
  },
];

// Connector paths in the 0–100 coordinate space (spouse = orange, lineage = neutral)
const CONNECTORS = [
  { type: 'spouse', d: 'M 28 15 H 72' },
  { type: 'lineage', d: 'M 50 15 V 32 M 14 32 H 86 M 14 32 V 50 M 50 32 V 50 M 86 32 V 50' },
  { type: 'spouse', d: 'M 50 50 H 86' },
  { type: 'lineage', d: 'M 68 50 V 68 M 28 68 H 72 M 28 68 V 85 M 72 68 V 85' },
];

export default function LineagePreview({ isReducedMotion = false }) {
  return (
    <FadeContent duration={650} delay={250} distance={20} isReducedMotion={isReducedMotion}>
      <div className="fl-lineage" role="img" aria-label="Interactive family tree preview showing three generations of a demo family connected by relationship lines">
        <div className="fl-lineage__bar">
          <div className="fl-lineage__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="fl-lineage__label">Interactive Family Tree</span>
          <span className="fl-lineage__badge">Demo family</span>
        </div>

        <div className="fl-lineage__canvas">
          <svg
            className="fl-lineage__svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {CONNECTORS.map((connector, i) => (
              <path
                key={i}
                d={connector.d}
                pathLength="1"
                fill="none"
                stroke={connector.type === 'spouse' ? 'var(--ft-line-spouse)' : 'var(--ft-line-connected)'}
                strokeWidth={connector.type === 'spouse' ? 2 : 1.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="fl-connector"
                style={{ animationDelay: `${500 + i * 180}ms` }}
              />
            ))}
          </svg>

          {DEMO_PEOPLE.map((person, i) => (
            <div
              key={person.id}
              className={`fl-node ${person.selected ? 'fl-node--selected' : ''} ${isReducedMotion ? '' : 'fl-node--animate'}`}
              style={{
                left: `${person.x}%`,
                top: `${person.y}%`,
                animationDelay: `${320 + i * 90}ms`,
              }}
            >
              <div className="fl-node__top">
                <span className="fl-node__avatar" style={{ background: person.color }} aria-hidden="true">
                  {person.initials}
                </span>
                <div>
                  <div className="fl-node__name">{person.name}</div>
                  <div className="fl-node__meta">{person.meta}</div>
                </div>
              </div>
              {person.tag && <span className="fl-node__tag">{person.tag}</span>}
            </div>
          ))}
        </div>
      </div>
    </FadeContent>
  );
}
