import React from 'react';
import FadeContent from '../react-bits/FadeContent.jsx';

/**
 * AuthBrandVisual
 * Decorative left column for the auth pages: product voice + a quiet,
 * abstract connected-family visual. Purely presentational (aria-hidden
 * where decorative) — loads no family data.
 */

// Abstract, decorative nodes — initials only, no real people
const MINI_NODES = [
  { id: 'n1', initials: 'A', color: '#8A9099', meta: 'Gen 1', x: 28, y: 22 },
  { id: 'n2', initials: 'M', color: '#C98467', meta: 'Gen 1', x: 72, y: 22 },
  { id: 'n3', initials: 'S', color: '#B4472F', meta: 'Gen 2', x: 15, y: 72 },
  { id: 'n4', initials: 'R', color: '#E56515', meta: 'Gen 2', x: 50, y: 72, accent: true },
  { id: 'n5', initials: 'P', color: '#6D747C', meta: 'Gen 2', x: 85, y: 72 },
];

const MINI_CONNECTORS = [
  { type: 'spouse', d: 'M 28 22 H 72' },
  { type: 'lineage', d: 'M 50 22 V 47 M 15 47 H 85 M 15 47 V 72 M 50 47 V 72 M 85 47 V 72' },
];

const TRUST_ITEMS = ['Private by design', 'Family-based access', 'Secure storage'];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function AuthBrandVisual({ isReducedMotion = false }) {
  return (
    <aside className="fa-visual" aria-hidden="true">
      <FadeContent duration={550} delay={100} distance={14} isReducedMotion={isReducedMotion}>
        <span className="fa-visual__eyebrow">Medida&rsquo;s Family</span>
        <h2 className="fa-visual__title">Your family&rsquo;s story, connected.</h2>
        <p className="fa-visual__sub">
          A private place to build your family tree, preserve memories and stories, and keep
          your family&rsquo;s history together — under your family&rsquo;s own name.
        </p>

        <ul className="fa-visual__trust">
          {TRUST_ITEMS.map((item) => (
            <li key={item} className="fa-visual__trust-item">
              <CheckIcon />
              {item}
            </li>
          ))}
        </ul>
      </FadeContent>

      {/* Quiet abstract lineage preview — decorative only */}
      <FadeContent duration={650} delay={240} distance={18} isReducedMotion={isReducedMotion}>
        <div className="fa-mini">
          <div className="fa-mini__bar">
            <div className="fa-mini__dots">
              <span />
              <span />
              <span />
            </div>
            <span className="fa-mini__label">Family Tree</span>
            <span className="fa-mini__badge">Preview</span>
          </div>

          <div className="fa-mini__canvas">
            <svg className="fa-mini__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {MINI_CONNECTORS.map((connector, i) => (
                <path
                  key={i}
                  d={connector.d}
                  pathLength="1"
                  fill="none"
                  stroke={connector.type === 'spouse' ? 'var(--ft-line-spouse)' : 'var(--ft-line-connected)'}
                  strokeWidth={connector.type === 'spouse' ? 2 : 1.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="fa-connector"
                  style={{ animationDelay: `${480 + i * 160}ms` }}
                />
              ))}
            </svg>

            {MINI_NODES.map((node, i) => (
              <div
                key={node.id}
                className={`fa-node ${node.accent ? 'fa-node--accent' : ''} ${isReducedMotion ? '' : 'fa-node--animate'}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  animationDelay: `${320 + i * 90}ms`,
                }}
              >
                <div className="fa-node__top">
                  <span className="fa-node__avatar" style={{ background: node.color }}>
                    {node.initials}
                  </span>
                  <span className="fa-node__meta">{node.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeContent>
    </aside>
  );
}
