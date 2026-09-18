/**
 * IntroOverlay Component — Modern Digital Family Platform
 * Minimal opening sequence that introduces Anvaya FamilyTree.
 */

import React, { useState, useEffect, useCallback } from 'react';

export default function IntroOverlay({
  title = "FAMILY TREE",
  tagline = "Generations. Stories. Memories.",
  metadata = "PRIVATE DIGITAL FAMILY PLATFORM",
  onComplete,
  isReducedMotion = false,
}) {
  const [phase, setPhase] = useState('entering'); // 'entering' -> 'visible' -> 'dissolving' -> 'hidden'

  const dismiss = useCallback(() => {
    setPhase('dissolving');
    setTimeout(() => {
      setPhase('hidden');
      onComplete?.();
    }, 450);
  }, [onComplete]);

  useEffect(() => {
    if (isReducedMotion) {
      setPhase('hidden');
      onComplete?.();
      return;
    }

    const t1 = setTimeout(() => setPhase('visible'), 50);
    const t2 = setTimeout(() => setPhase('dissolving'), 1500);
    const t3 = setTimeout(() => {
      setPhase('hidden');
      onComplete?.();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isReducedMotion, onComplete]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`ft-intro-overlay ft-intro-overlay--${phase}`}
      onClick={dismiss}
      role="banner"
       aria-label="Anvaya FamilyTree digital platform introduction"
    >
      <div className="ft-intro-overlay__content">
        {/* Modern Geometric Family Emblem */}
        <div className="ft-intro-overlay__crest">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7" r="4" />
            <circle cx="6" cy="17" r="3.5" />
            <circle cx="18" cy="17" r="3.5" />
            <path d="M9.5 9.5L7.5 14M14.5 9.5L16.5 14M9.5 17h5" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="ft-intro-overlay__title">{title}</h1>

        {/* Tagline */}
        <p className="ft-intro-overlay__subtitle">&ldquo;{tagline}&rdquo;</p>

        {/* Metadata Badges */}
        <div className="ft-intro-overlay__meta">
          <span>{metadata}</span>
        </div>

        <div className="ft-intro-overlay__hint">Click anywhere to explore platform</div>
      </div>
    </div>
  );
}
