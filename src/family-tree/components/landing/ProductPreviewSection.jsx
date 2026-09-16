import React from 'react';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';

/**
 * ProductPreviewSection
 * Large dark marketing preview of the actual product experience
 * (family tree, navigation, timeline, memories, archive, insights).
 *
 * IMPORTANT: this is a static marketing mockup with SYNTHETIC DEMO content.
 * It never connects to or modifies real family data.
 */

// Synthetic demo people for the mockup canvas (marketing visual only)
const MOCK_PEOPLE = [
  { id: 'ravi', name: 'Ravi Sharma', meta: 'b. 1948', initials: 'RS', color: '#8A9099', x: 28, y: 13 },
  { id: 'lakshmi', name: 'Lakshmi Sharma', meta: 'b. 1952', initials: 'LS', color: '#C98467', x: 52, y: 13 },
  { id: 'anita', name: 'Anita Sharma', meta: 'b. 1975', initials: 'AS', color: '#B4472F', x: 13, y: 47 },
  { id: 'vikram', name: 'Vikram Sharma', meta: 'b. 1978', initials: 'VS', color: '#E56515', x: 40, y: 47, selected: true },
  { id: 'priya', name: 'Priya Sharma', meta: 'b. 1982', initials: 'PS', color: '#6D747C', x: 66, y: 47 },
  { id: 'arjun', name: 'Arjun Sharma', meta: 'b. 1984', initials: 'ArS', color: '#7C858E', x: 89, y: 47 },
  { id: 'aarav', name: 'Aarav Sharma', meta: 'b. 2008', initials: 'AS', color: '#7C858E', x: 31, y: 82 },
  { id: 'diya', name: 'Diya Sharma', meta: 'b. 2012', initials: 'DS', color: '#C98467', x: 50, y: 82 },
];

const MOCK_CONNECTORS = [
  { type: 'spouse', d: 'M 28 13 H 52' },
  { type: 'lineage', d: 'M 40 13 V 30 M 13 30 H 89 M 13 30 V 47 M 40 30 V 47 M 89 30 V 47' },
  { type: 'spouse', d: 'M 40 47 H 66' },
  { type: 'lineage', d: 'M 53 47 V 65 M 31 65 H 50 M 31 65 V 82 M 50 65 V 82' },
];

const NAV_ITEMS = [
  { id: 'tree', label: 'Family Tree', count: '23', active: true },
  { id: 'timeline', label: 'Timeline', count: '57' },
  { id: 'memories', label: 'Memories', count: '12' },
  { id: 'archive', label: 'Archive', count: '148' },
  { id: 'insights', label: 'Insights' },
];

function NavIcon({ id }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (id) {
    case 'tree':
      return (
        <svg {...common}>
          <circle cx="12" cy="6" r="3" />
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M10 8.5L8 14.5M14 8.5l2 6M9 17h6" />
        </svg>
      );
    case 'timeline':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    case 'memories':
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'archive':
      return (
        <svg {...common}>
          <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
        </svg>
      );
    case 'insights':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ProductPreviewSection({ isReducedMotion = false }) {
  return (
    <section className="fl-preview" id="product-preview" aria-labelledby="fl-preview-title">
      <div className="fl-container">
        <div className="fl-section-head fl-section-head--center">
          <span className="fl-eyebrow">Inside the product</span>
          <h2 className="fl-section-title" id="fl-preview-title">
            One private place for your whole family history
          </h2>
          <p className="fl-section-sub">
            A calm, focused workspace for your tree, timeline, memories, archive and insights —
            built for families, not folders.
          </p>
        </div>

        <ScrollReveal duration={600} distance={26} scale={0.985} isReducedMotion={isReducedMotion}>
          <div
            className="fl-app-window"
            role="img"
            aria-label="Product preview of the family workspace: a family tree canvas with generations of connected profile cards, sidebar navigation for timeline, memories, archive and insights, and family insight cards"
          >
            <div className="fl-app-window__bar">
              <div className="fl-app-window__dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="fl-app-window__title">Sharma Family — Family Tree</span>
              <span className="fl-app-window__badge">Product preview</span>
            </div>

            <div className="fl-app-window__body">
              <div className="fl-app-sidebar" aria-hidden="true">
                <div className="fl-app-sidebar__family">
                  <span className="fl-app-sidebar__family-avatar">S</span>
                  <div>
                    <div className="fl-app-sidebar__family-name">Sharma Family</div>
                    <div className="fl-app-sidebar__family-role">Owner</div>
                  </div>
                </div>
                {NAV_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className={`fl-app-nav-item ${item.active ? 'fl-app-nav-item--active' : ''}`}
                  >
                    <NavIcon id={item.id} />
                    <span>{item.label}</span>
                    {item.count && <span className="fl-app-nav-count">{item.count}</span>}
                  </div>
                ))}
              </div>

              <div className="fl-app-canvas">
                <div className="fl-app-canvas__toolbar" aria-hidden="true">
                  <span className="fl-app-canvas__tool">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                  <span className="fl-app-canvas__tool">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M5 12h14" />
                    </svg>
                  </span>
                  <span className="fl-app-canvas__tool fl-app-canvas__tool--active">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
                    </svg>
                  </span>
                </div>

                <div className="fl-app-tree">
                  <svg className="fl-app-tree__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {MOCK_CONNECTORS.map((connector, i) => (
                      <path
                        key={i}
                        d={connector.d}
                        pathLength="1"
                        fill="none"
                        stroke={connector.type === 'spouse' ? 'rgba(229, 101, 21, 0.55)' : '#46515C'}
                        strokeWidth={connector.type === 'spouse' ? 2 : 1.5}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </svg>

                  {MOCK_PEOPLE.map((person) => (
                    <div
                      key={person.id}
                      className={`fl-person ${person.selected ? 'fl-person--selected' : ''}`}
                      style={{ left: `${person.x}%`, top: `${person.y}%` }}
                    >
                      <div className="fl-person__top">
                        <span className="fl-person__avatar" style={{ background: person.color }} aria-hidden="true">
                          {person.initials}
                        </span>
                        <div>
                          <div className="fl-person__name">{person.name}</div>
                        </div>
                      </div>
                      <div className="fl-person__meta">{person.meta} · Sharma Family</div>
                    </div>
                  ))}
                </div>

                {/* Floating insight card (demo content) */}
                <div className="fl-float-card fl-float-card--insights" style={{ left: 18, bottom: 18 }} aria-hidden="true">
                  <div className="fl-float-card__label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="M7 14l4-4 3 3 5-6" />
                    </svg>
                    Family Insights
                  </div>
                  <div className="fl-float-card__row">
                    <span>Generations</span>
                    <span>4</span>
                  </div>
                  <div className="fl-float-card__row">
                    <span>Family members</span>
                    <span>23</span>
                  </div>
                  <div className="fl-float-card__row">
                    <span>Photos &amp; documents</span>
                    <span>148</span>
                  </div>
                </div>

                {/* Floating memory card (demo content) */}
                <div className="fl-float-card fl-float-card--memory" style={{ right: 18, top: 66 }} aria-hidden="true">
                  <div className="fl-float-card__label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Memory
                  </div>
                  <div className="fl-float-card__row">
                    <span>&ldquo;The 1985 reunion under the banyan tree&rdquo;</span>
                  </div>
                  <div className="fl-float-card__row">
                    <span>Told by Lakshmi</span>
                    <span>1985</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <p className="fl-preview__caption">
          Product preview · demo content — your family starts as a completely empty canvas.
        </p>
      </div>
    </section>
  );
}
