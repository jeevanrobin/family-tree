import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import LandingHeader from './LandingHeader.jsx';
import HeroSection from './HeroSection.jsx';
import ProductPreviewSection from './ProductPreviewSection.jsx';
import FeatureSection from './FeatureSection.jsx';
import HowItWorksSection from './HowItWorksSection.jsx';
import PrivacySection from './PrivacySection.jsx';
import FinalCTA from './FinalCTA.jsx';
import LandingFooter from './LandingFooter.jsx';
import './landing.css';

/**
 * Public Landing Page — "Anvaya FamilyTree"
 *
 * A public marketing surface for the product. It deliberately has NO access to
 * family data: it does not import FamilyStore, FamilyContext or any repository,
 * and renders fully while unauthenticated. All preview visuals use synthetic
 * demo content declared inside the landing components themselves.
 *
 * "Anvaya FamilyTree" is the PRODUCT brand — every customer names their own family.
 */
export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('medida_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  });

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const scrollRef = useRef(null);

  // Apply theme to the document root (shared with the app's theme system).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('medida_theme', theme);
    } catch {
      /* storage unavailable — theme still applies for this visit */
    }
  }, [theme]);

  // Track the user's reduced-motion preference live.
  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return undefined;

    const handleChange = (event) => setIsReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  // Smooth in-page anchor scrolling inside the landing scroll container.
  const scrollToSection = useCallback(
    (id) => {
      const container = scrollRef.current;
      const element = document.getElementById(id);
      if (!container || !element) return;

      const headerOffset = 76;
      const top =
        element.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        headerOffset;

      container.scrollTo({ top: Math.max(0, top), behavior: isReducedMotion ? 'auto' : 'smooth' });
    },
    [isReducedMotion]
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: isReducedMotion ? 'auto' : 'smooth' });
  }, [isReducedMotion]);

  const handleScroll = useCallback((event) => {
    const el = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowScrollTop(scrollTop > 320);

    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0;
    setScrollProgress(progress);

    // Track active section for navbar highlighting
    const sections = [
      { id: 'privacy', threshold: 140 },
      { id: 'how-it-works', threshold: 140 },
      { id: 'features', threshold: 140 },
      { id: 'product-preview', threshold: 180 },
      { id: 'hero', threshold: 180 },
    ];

    for (const section of sections) {
      const sectionEl = document.getElementById(section.id);
      if (sectionEl) {
        const rect = sectionEl.getBoundingClientRect();
        if (rect.top <= section.threshold && rect.bottom > 80) {
          setActiveSection(section.id);
          break;
        }
      }
    }
  }, []);

  // Primary CTA behaviour: signed-in users continue into the app,
  // new visitors start creating their family.
  const handleGetStarted = useCallback(() => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/signup');
    }
  }, [user, navigate]);

  return (
    <div className="ft-landing" ref={scrollRef} onScroll={handleScroll}>
      <a className="fl-skip-link" href="#fl-main">
        Skip to content
      </a>

      <div className="ft-landing__inner">
        <LandingHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigate={scrollToSection}
          onScrollToTop={scrollToTop}
          onGetStarted={handleGetStarted}
          user={user}
          scrollProgress={scrollProgress}
          activeSection={activeSection}
        />

        <main id="fl-main">
          <HeroSection
            user={user}
            onGetStarted={handleGetStarted}
            onNavigate={scrollToSection}
            isReducedMotion={isReducedMotion}
            showLocalMode={!isSupabaseConfigured}
          />
          <ProductPreviewSection isReducedMotion={isReducedMotion} />
          <FeatureSection isReducedMotion={isReducedMotion} />
          <HowItWorksSection isReducedMotion={isReducedMotion} />
          <PrivacySection isReducedMotion={isReducedMotion} />
          <FinalCTA user={user} onGetStarted={handleGetStarted} isReducedMotion={isReducedMotion} />
        </main>

        <LandingFooter onNavigate={scrollToSection} />
      </div>

      {/* Scroll-to-top — sticky within the landing scroll container */}
      <button
        type="button"
        className="fl-top-btn"
        onClick={scrollToTop}
        aria-label="Scroll back to top"
        title="Scroll back to top"
        style={{
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
