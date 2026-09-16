import React from 'react';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';
import SpotlightCard from '../react-bits/SpotlightCard.jsx';

/**
 * FeatureSection
 * Six real product capabilities, in the product's own terminology.
 */

const FEATURES = [
  {
    id: 'tree',
    title: 'Interactive Family Tree',
    lead: 'See your family connected across generations.',
    desc: 'A zoomable canvas that lays out generations, unions and sibling lines automatically as you add people.',
  },
  {
    id: 'timeline',
    title: 'Family Timeline',
    lead: 'Explore the moments that shaped your family.',
    desc: 'Births, weddings, migrations and milestones in one chronological view, filterable by person or branch.',
  },
  {
    id: 'memories',
    title: 'Memories & Stories',
    lead: 'Preserve the stories behind the people.',
    desc: 'Record oral histories and personal memoirs, linked to the people they belong to, in a distraction-free reader.',
  },
  {
    id: 'archive',
    title: 'Private Archive',
    lead: 'Keep photos and documents together.',
    desc: 'Photographs, certificates and records, stored in your family\u2019s private space with person tagging and albums.',
  },
  {
    id: 'insights',
    title: 'Family Insights',
    lead: 'Discover patterns across your family history.',
    desc: 'Generational spans, places and naming patterns, revealed across your whole tree as it grows.',
  },
  {
    id: 'collaboration',
    title: 'Family Collaboration',
    lead: 'Build and preserve your family story together.',
    desc: 'Invite relatives with Owner, Editor, Contributor or Viewer roles to help grow the family record.',
  },
];

function FeatureIcon({ id }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
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
    case 'collaboration':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

export default function FeatureSection({ isReducedMotion = false }) {
  return (
    <section className="fl-features" id="features" aria-labelledby="fl-features-title">
      <div className="fl-container">
        <ScrollReveal duration={500} distance={16} isReducedMotion={isReducedMotion}>
          <div className="fl-section-head fl-section-head--center">
            <span className="fl-eyebrow">Features</span>
            <h2 className="fl-section-title" id="fl-features-title">
              Everything your family&rsquo;s history needs
            </h2>
            <p className="fl-section-sub">
              Purpose-built spaces for every kind of memory — from the big picture of generations
              to a single scanned letter.
            </p>
          </div>
        </ScrollReveal>

        <div className="fl-feature-grid">
          {FEATURES.map((feature, i) => (
            <ScrollReveal
              key={feature.id}
              duration={480}
              distance={22}
              isReducedMotion={isReducedMotion}
              style={{ transitionDelay: isReducedMotion ? undefined : `${(i % 3) * 90}ms` }}
            >
              <SpotlightCard
                spotlightColor="rgba(229, 101, 21, 0.09)"
                spotlightSize={260}
                style={{ height: '100%' }}
              >
                <article className="fl-feature-card">
                  <span className="fl-feature-card__icon">
                    <FeatureIcon id={feature.id} />
                  </span>
                  <h3 className="fl-feature-card__title">{feature.title}</h3>
                  <p className="fl-feature-card__desc">
                    <strong>{feature.lead}</strong> {feature.desc}
                  </p>
                </article>
              </SpotlightCard>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal duration={500} distance={14} isReducedMotion={isReducedMotion}>
          <p className="fl-features__footnote">
            <strong>Offline-first by design</strong> — keep working without a connection; your
            changes sync securely when you&rsquo;re back online.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
