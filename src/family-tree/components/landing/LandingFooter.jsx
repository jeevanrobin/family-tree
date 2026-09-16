import React from 'react';
import { Link } from 'react-router-dom';

/**
 * LandingFooter
 * Minimal closing footer with in-page anchors and auth routes.
 */
export default function LandingFooter({ onNavigate }) {
  return (
    <footer className="fl-footer">
      <div className="fl-container">
        <div className="fl-footer__inner">
          <span className="fl-footer__brand">
            <span className="fl-footer__brand-mark" aria-hidden="true">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="7" r="4" />
                <circle cx="6" cy="17" r="3.5" />
                <circle cx="18" cy="17" r="3.5" />
                <path d="M9.5 9.5L7.5 14M14.5 9.5L16.5 14M9.5 17h5" />
              </svg>
            </span>
            <span className="fl-footer__brand-name">Medida&rsquo;s Family</span>
          </span>

          <nav className="fl-footer__nav" aria-label="Footer">
            <button type="button" className="fl-footer__link" onClick={() => onNavigate('features')}>
              Features
            </button>
            <button type="button" className="fl-footer__link" onClick={() => onNavigate('how-it-works')}>
              How it works
            </button>
            <button type="button" className="fl-footer__link" onClick={() => onNavigate('privacy')}>
              Privacy
            </button>
            <Link to="/signin" className="fl-footer__link">
              Sign In
            </Link>
            <Link to="/signup" className="fl-footer__link">
              Create Account
            </Link>
          </nav>
        </div>

        <div className="fl-footer__copy">
          <span>© {new Date().getFullYear()} Medida&rsquo;s Family — a private place for family history.</span>
          <span>Your family&rsquo;s name is always your own.</span>
        </div>
      </div>
    </footer>
  );
}
