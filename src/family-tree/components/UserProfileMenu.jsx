/**
 * UserProfileMenu Component — Medida's Family
 * Compact, unified profile & destination navigation dropdown.
 * Replaces the floating bottom dock tabs with a clean menu inside the user profile badge.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFamily } from '../auth/FamilyContext.jsx';
import { ROLE_LABELS } from '../auth/roles.js';

export default function UserProfileMenu({
  activeView = 'tree',
  onNavigateView,
  onOpenSettings,
  onOpenDataModal,
  onOpenPoster,
  onOpenHistory,
  onOpenDuplicates,
  onOpenPlaces,
  onStartTour,
  isReducedMotion = false,
  onToggleReducedMotion,
  isLocalMode = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Safe consumption of FamilyContext
  let familyContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    familyContext = useFamily();
  } catch {
    familyContext = null;
  }

  const user = familyContext?.user;
  const currentRole = familyContext?.currentRole;
  const logout = familyContext?.logout;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    (isLocalMode ? 'Local User' : 'Family Member');

  const roleLabel = currentRole ? ROLE_LABELS[currentRole] || currentRole : isLocalMode ? 'Owner' : 'Member';

  const handleSelectView = (viewKey) => {
    closeMenu();
    onNavigateView?.(viewKey);
  };

  const handleSignOut = () => {
    closeMenu();
    logout?.();
  };

  const VIEWS = [
    {
      key: 'tree',
      label: 'Tree',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="3" />
          <line x1="12" y1="8" x2="12" y2="14" />
          <path d="M5 19a3 3 0 0 1 6 0" />
          <path d="M13 19a3 3 0 0 1 6 0" />
          <line x1="8" y1="16" x2="8" y2="14" />
          <line x1="16" y1="16" x2="16" y2="14" />
        </svg>
      ),
    },
    {
      key: 'timeline',
      label: 'Timeline',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      key: 'memories',
      label: 'Memories',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      key: 'archive',
      label: 'Archive',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      key: 'insights',
      label: 'Insights',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="ft-header__profile" ref={menuRef}>
      <button
        type="button"
        className="ft-header__profile-badge"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title="Profile and destinations"
      >
        <div
          className="ft-header__profile-avatar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.8rem',
          }}
        >
          {userDisplayName.charAt(0).toUpperCase()}
        </div>
        <span className="ft-header__profile-name">{userDisplayName}</span>
        <svg
          className={`ft-header__profile-chevron ${menuOpen ? 'ft-header__profile-chevron--open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {menuOpen && (
        <div className="ft-header__menu" role="menu">
          {/* User profile header card */}
          <div className="ft-header__menu-heading" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{userDisplayName}</span>
            {user?.email && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400 }}>{user.email}</span>}
            <span
              style={{
                display: 'inline-block',
                alignSelf: 'flex-start',
                marginTop: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.675rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: currentRole === 'owner' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: currentRole === 'owner' ? '#f97316' : '#d1d5db',
                border: `1px solid ${currentRole === 'owner' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
              }}
            >
              {roleLabel}
            </span>
          </div>

          {/* Section: Family Settings & Exploration */}
          {onStartTour && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onStartTour();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Explore the family story</span>
            </button>
          )}

          {onOpenPlaces && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onOpenPlaces();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>Family places &amp; migrations</span>
            </button>
          )}

          {onOpenDuplicates && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onOpenDuplicates();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="8" cy="8" r="4" />
                <circle cx="16" cy="16" r="4" />
                <path d="M11 11l2 2" />
              </svg>
              <span>Find duplicates</span>
            </button>
          )}

          {onOpenHistory && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onOpenHistory();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>Change history</span>
            </button>
          )}

          {onOpenPoster && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onOpenPoster();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Print or share tree poster</span>
            </button>
          )}

          {onOpenDataModal && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onOpenDataModal();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              <span>Back up &amp; restore data</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onOpenSettings();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Family Settings &amp; Members</span>
            </button>
          )}

          {/* Section: Main View Navigation */}
          <div className="ft-header__menu-divider" />
          <div
            className="ft-header__menu-heading"
            style={{ paddingBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Go to</span>
          </div>

          {VIEWS.map(({ key, label, icon }) => {
            const isActive = activeView === key;
            return (
              <button
                key={key}
                type="button"
                className={`ft-header__menu-item ${isActive ? 'ft-header__menu-item--active' : ''}`}
                role="menuitem"
                onClick={() => handleSelectView(key)}
              >
                {icon}
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ft-accent, #f97316)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-label="Active view"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}

          {/* Accessibility & Preferences */}
          <div className="ft-header__menu-divider" />
          {onToggleReducedMotion && (
            <button
              type="button"
              className="ft-header__menu-item"
              role="menuitemcheckbox"
              aria-checked={isReducedMotion}
              onClick={() => {
                closeMenu();
                onToggleReducedMotion();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Reduce motion</span>
              <span className={`ft-header__menu-toggle ${isReducedMotion ? 'ft-header__menu-toggle--on' : ''}`} aria-hidden="true">
                {isReducedMotion ? 'On' : 'Off'}
              </span>
            </button>
          )}

          {/* Cloud Mode Sign Out */}
          {!isLocalMode && user && (
            <>
              <div className="ft-header__menu-divider" />
              <button
                type="button"
                className="ft-header__menu-item"
                role="menuitem"
                onClick={handleSignOut}
                style={{ color: '#ef4444' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
