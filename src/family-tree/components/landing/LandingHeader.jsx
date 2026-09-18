import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ClickSpark from '../react-bits/ClickSpark.jsx';

/**
 * LandingHeader
 * Minimal premium navigation: brand, in-page anchors, theme toggle and auth CTAs.
 * Mobile collapses into an accessible hamburger panel.
 */
const NAV_ITEMS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'privacy', label: 'Privacy' },
];

function BrandMark({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="4" />
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="M9.5 9.5L7.5 14M14.5 9.5L16.5 14M9.5 17h5" />
    </svg>
  );
}

export default function LandingHeader({
  theme,
  onToggleTheme,
  onNavigate,
  onScrollToTop,
  onGetStarted,
  user,
  scrollProgress = 0,
  activeSection = '',
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);

  // Close the mobile menu on Escape and return focus to the toggle.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const handleNavClick = (id) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="fl-header">
      {/* Scroll depth indicator bar */}
      <div
        className="fl-header__progress"
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />

      <div className="fl-container">
        <div className="fl-header__inner">
          <button
            type="button"
            className="fl-header__brand"
            onClick={onScrollToTop}
            aria-label="Anvaya FamilyTree — back to top"
          >
            <span className="fl-header__brand-mark" aria-hidden="true">
              <BrandMark />
            </span>
            <span className="fl-header__brand-name">Anvaya FamilyTree</span>
          </button>

          <nav className="fl-header__nav" aria-label="Landing page sections">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`fl-header__link ${activeSection === item.id ? 'fl-header__link--active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="fl-header__actions">
            <button
              type="button"
              className="fl-header__theme-btn"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {user ? (
              <Link to="/app" className="fl-btn fl-btn--primary fl-header__cta">
                Open Your Family
              </Link>
            ) : (
              <>
                <Link to="/signin" className="fl-header__signin">
                  Sign In
                </Link>
                <ClickSpark sparkColor="var(--ft-accent)" sparkSize={6} sparkCount={6}>
                  <button type="button" className="fl-btn fl-btn--primary fl-header__cta" onClick={onGetStarted}>
                    Get Started
                  </button>
                </ClickSpark>
              </>
            )}

            <button
              ref={menuButtonRef}
              type="button"
              className="fl-header__menu-btn"
              aria-expanded={menuOpen}
              aria-controls="fl-mobile-menu"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation panel */}
      <div className="fl-mobile-menu" id="fl-mobile-menu" ref={menuRef} hidden={!menuOpen}>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} type="button" className="fl-mobile-menu__link" onClick={() => handleNavClick(item.id)}>
            {item.label}
          </button>
        ))}
        <div className="fl-mobile-menu__actions">
          {user ? (
            <Link to="/app" className="fl-btn fl-btn--primary" onClick={() => setMenuOpen(false)}>
              Open Your Family
            </Link>
          ) : (
            <>
              <Link to="/signin" className="fl-btn fl-btn--secondary" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              <button
                type="button"
                className="fl-btn fl-btn--primary"
                onClick={() => {
                  setMenuOpen(false);
                  onGetStarted();
                }}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
