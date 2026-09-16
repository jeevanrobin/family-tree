import React from 'react';
import { Link } from 'react-router-dom';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';
import ClickSpark from '../react-bits/ClickSpark.jsx';

/**
 * FinalCTA
 * Large, clean, emotional close. Primary: Create Your Family → /signup.
 */
export default function FinalCTA({ user, onGetStarted, isReducedMotion = false }) {
  return (
    <section className="fl-cta" id="get-started" aria-labelledby="fl-cta-title">
      <div className="fl-container">
        <div className="fl-cta__inner">
          <ScrollReveal duration={550} distance={22} isReducedMotion={isReducedMotion}>
            <span className="fl-eyebrow" style={{ justifyContent: 'center', display: 'inline-flex' }}>
              Begin today
            </span>
            <h2 className="fl-cta__title" id="fl-cta-title">
              Start preserving your family&rsquo;s story.
            </h2>
            <p className="fl-cta__sub">
              Create a private space for your family&rsquo;s tree, memories and archive — under
              your family&rsquo;s own name, for the generations ahead.
            </p>
            <div className="fl-cta__actions">
              {user ? (
                <Link to="/app" className="fl-btn fl-btn--primary fl-btn--lg">
                  Open Your Family
                </Link>
              ) : (
                <ClickSpark sparkColor="var(--ft-accent)" sparkSize={7} sparkCount={8}>
                  <button type="button" className="fl-btn fl-btn--primary fl-btn--lg" onClick={onGetStarted}>
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
            <p className="fl-cta__meta">Private by design · Family-based access · Your name, your story</p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
