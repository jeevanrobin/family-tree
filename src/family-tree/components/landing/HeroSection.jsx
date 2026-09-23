import React from 'react';
import { Link } from 'react-router-dom';
import FadeContent from '../react-bits/FadeContent.jsx';
import ClickSpark from '../react-bits/ClickSpark.jsx';
import LineagePreview from './LineagePreview.jsx';
import FluidOrb from '../rare-ui/FluidOrb.jsx';

/**
 * HeroSection
 * The first three seconds: what this is, why it matters, what to do next.
 */
const TRUST_SIGNALS = [
  { label: 'Private by design' },
  { label: 'Family-based access' },
  { label: 'Secure storage' },
];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function HeroSection({
  user,
  onGetStarted,
  onNavigate,
  isReducedMotion = false,
  showLocalMode = false,
}) {
  return (
    <section className="fl-hero" id="hero" aria-labelledby="fl-hero-title" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Ambient Rare UI Fluid Orb background glow */}
      <div style={{ position: 'absolute', top: '-60px', right: '-40px', zIndex: 0, opacity: 0.55, pointerEvents: 'none' }}>
        <FluidOrb size={380} color="#E56515" isReducedMotion={isReducedMotion} />
      </div>

      <div className="fl-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="fl-hero__grid">

          <div>
            <FadeContent duration={500} delay={80} isReducedMotion={isReducedMotion}>
              <span className="fl-eyebrow">Private family history platform</span>
            </FadeContent>

            <FadeContent duration={600} delay={160} isReducedMotion={isReducedMotion}>
              <h1 className="fl-hero__title" id="fl-hero-title">
                Your family&rsquo;s story, <em>connected.</em>
              </h1>
            </FadeContent>

            <FadeContent duration={600} delay={260} isReducedMotion={isReducedMotion}>
              <p className="fl-hero__sub">
                Build a living family tree, preserve memories and stories, and keep your family&rsquo;s
                history together in one private place.
              </p>
            </FadeContent>

            <FadeContent duration={600} delay={340} isReducedMotion={isReducedMotion}>
              <div className="fl-hero__ctas">
                {user ? (
                  <Link to="/app" className="fl-btn fl-btn--primary fl-btn--lg">
                    Open Your Family
                  </Link>
                ) : (
                  <ClickSpark sparkColor="var(--ft-accent)" sparkSize={7} sparkCount={8}>
                    <button
                      type="button"
                      className="fl-btn fl-btn--primary fl-btn--lg"
                      onClick={onGetStarted}
                    >
                      Create Your Family
                    </button>
                  </ClickSpark>
                )}
                {!user && (
                  <Link to="/signin" className="fl-btn fl-btn--secondary fl-btn--lg">
                    Sign In
                  </Link>
                )}
              </div>
              {showLocalMode && (
                <Link
                  to="/app"
                  className="fl-hero__local-link"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--ft-text-secondary)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--ft-border-hover)',
                    paddingBottom: '2px',
                    transition: 'color 0.18s ease, border-color 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--ft-accent)';
                    e.currentTarget.style.borderColor = 'var(--ft-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--ft-text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--ft-border-hover)';
                  }}
                >
                  or explore a local demo tree &rarr;
                </Link>
              )}
            </FadeContent>

            <FadeContent duration={600} delay={430} isReducedMotion={isReducedMotion}>
              <ul className="fl-hero__trust" aria-label="Trust signals">
                {TRUST_SIGNALS.map((signal) => (
                  <li key={signal.label} className="fl-hero__trust-item">
                    <CheckIcon />
                    {signal.label}
                  </li>
                ))}
              </ul>
            </FadeContent>
          </div>

          <LineagePreview isReducedMotion={isReducedMotion} />
        </div>

        {/* Scroll cue button to discover features */}
        <FadeContent duration={600} delay={520} isReducedMotion={isReducedMotion}>
          <div className="fl-hero__scroll-cue">
            <button
              type="button"
              className="fl-hero__scroll-btn"
              onClick={() => onNavigate?.('product-preview')}
              aria-label="Scroll down to explore features and demo"
            >
              <span>Explore Features</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
              </svg>
            </button>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
