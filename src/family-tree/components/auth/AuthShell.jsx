import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FadeContent from '../react-bits/FadeContent.jsx';
import AuthBrandVisual from './AuthBrandVisual.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import './auth.css';

/**
 * AuthShell
 * Shared premium layout for the authentication pages:
 * topbar (brand + theme), decorative product visual (left),
 * and the form card (right). Public — loads no family data.
 */

export function AuthMark({ size = 18 }) {
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

export default function AuthShell({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('medida_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const isReducedMotion = useReducedMotion();

  // Share the app's theme system (same key + attribute as landing & app).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('medida_theme', theme);
    } catch {
      /* storage unavailable — theme still applies for this visit */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="fa-shell">
      <a className="fa-skip-link" href="#fa-main">
        Skip to form
      </a>

      <div className="fa-shell__inner">
        <header className="fa-topbar">
          <Link to="/" className="fa-topbar__brand" aria-label="Anvaya FamilyTree — home">
            <span className="fa-topbar__brand-mark" aria-hidden="true">
              <AuthMark />
            </span>
            <span className="fa-topbar__brand-name">Anvaya FamilyTree</span>
          </Link>

          <button
            type="button"
            className="fa-topbar__theme-btn"
            onClick={toggleTheme}
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
        </header>

        <div className="fa-layout">
          <AuthBrandVisual isReducedMotion={isReducedMotion} />

          <main id="fa-main">
            <FadeContent duration={550} distance={18} isReducedMotion={isReducedMotion}>
              <Link to="/" className="fa-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Anvaya FamilyTree
              </Link>

              {children}
            </FadeContent>
          </main>
        </div>
      </div>
    </div>
  );
}
