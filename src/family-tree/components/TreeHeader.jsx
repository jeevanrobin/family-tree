/**
 * TreeHeader Component — Anvaya FamilyTree
 * Minimal header: brand identity, generation filters, family selector (if multiple),
 * and primary controls — Search, Add Member, Theme, Profile & Sign Out.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Magnet from './react-bits/Magnet.jsx';
import ClickSpark from './react-bits/ClickSpark.jsx';
import SearchOverlay from './SearchOverlay.jsx';
import { GENERATION_CONFIG } from '../data/familyDataService.js';
import { useFamily } from '../auth/FamilyContext.jsx';
import { ROLE_LABELS, canAddPerson } from '../auth/roles.js';
import FamilySettingsModal from './modals/FamilySettingsModal.jsx';
import UserProfileMenu from './UserProfileMenu.jsx';

export default function TreeHeader({
  totalPersons,
  totalGenerations,
  onSelectPerson,
  selectedId,
  onDeselect,
  onOpenAddModal,
  onOpenDataModal,
  onStartTour,
  theme,
  onToggleTheme,
  isReducedMotion,
  onToggleReducedMotion,
  activeGenFilter,
  onSelectGenFilter,
  onOpenSearch,
  isLocalMode = false,
  activeView = 'tree',
  onNavigateView,
  isArrangeMode = false,
  onToggleArrangeMode,
}) {
  const [familySelectorOpen, setFamilySelectorOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const selectorRef = useRef(null);
  const navigate = useNavigate();

  // Safe consumption of FamilyContext (available in Cloud mode)
  let familyContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    familyContext = useFamily();
  } catch {
    // Local mode fallback when outside FamilyProvider
    familyContext = null;
  }

  const user = familyContext?.user;
  const memberships = familyContext?.memberships || [];
  const activeFamily = familyContext?.activeFamily;
  const currentRole = familyContext?.currentRole;
  const switchFamily = familyContext?.switchFamily;
  const syncStatus = familyContext?.syncStatus || 'synced';

  const hasMultipleFamilies = memberships.length > 1;
  const canAdd = isLocalMode || canAddPerson(currentRole);

  const closeSelector = useCallback(() => setFamilySelectorOpen(false), []);

  // Dismiss family selector on outside click or Escape
  useEffect(() => {
    if (!familySelectorOpen) return;

    function handlePointerDown(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        closeSelector();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeSelector();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [familySelectorOpen, closeSelector]);

  const handleFamilySwitch = (newFamilyId) => {
    closeSelector();
    if (newFamilyId === activeFamily?.id) return;
    // Clear selected person and close dossier
    onDeselect?.();
    // Authoritatively switch active family
    switchFamily?.(newFamilyId);
    if (!isLocalMode) {
      navigate(`/app/family/${newFamilyId}`);
    }
  };

  const familyDisplayName = activeFamily?.name || (isLocalMode ? 'FAMILY TREE' : 'FAMILY ARCHIVE');

  return (
    <header className="ft-header">
      {/* Left: Brand Identity & Dynamic Family Selector */}
      <div className="ft-header__brand-group">
        <div className="ft-header__crest-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7" r="4" />
            <circle cx="6" cy="17" r="3.5" />
            <circle cx="18" cy="17" r="3.5" />
            <path d="M9.5 9.5L7.5 14M14.5 9.5L16.5 14M9.5 17h5" />
          </svg>
        </div>

        <div className="ft-header__titles">
          <span className="ft-header__product-brand">ANVAYA FAMILYTREE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="ft-header__title">{familyDisplayName.toUpperCase()}</h1>

            {/* Minimal Family Selector — ONLY displayed if multiple memberships exist */}
            {hasMultipleFamilies && (
              <div className="ft-family-selector-wrap" ref={selectorRef} style={{ position: 'relative' }}>
                <button
                  className="ft-family-selector-btn"
                  onClick={() => setFamilySelectorOpen((o) => !o)}
                  aria-expanded={familySelectorOpen}
                  aria-label="Switch Family"
                  title="Switch Family Archive"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f97316',
                    cursor: 'pointer',
                  }}
                >
                  <span>Switch</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {familySelectorOpen && (
                  <div
                    className="ft-family-selector-dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '6px',
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '4px',
                      minWidth: '180px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '6px 8px', fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Select Family
                    </div>
                    {memberships.map((m) => {
                      const isCurrent = m.familyId === activeFamily?.id;
                      return (
                        <button
                          key={m.familyId}
                          onClick={() => handleFamilySwitch(m.familyId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '8px 10px',
                            textAlign: 'left',
                            fontSize: '0.825rem',
                            color: isCurrent ? '#f97316' : '#e4e4e7',
                            background: isCurrent ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <span>{m.family.name}</span>
                          {isCurrent && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                    <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                    <button
                      type="button"
                      onClick={() => {
                        closeSelector();
                        navigate('/app');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '6px 10px',
                        textAlign: 'left',
                        fontSize: '0.78rem',
                        color: '#9ca3af',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <span>View All Families</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeSelector();
                        navigate('/app/create-family');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '6px 10px',
                        textAlign: 'left',
                        fontSize: '0.78rem',
                        color: '#f97316',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      <span>+ Create New Family</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="ft-header__subtitle">Generations. Stories. Memories.</span>
            {!isLocalMode && (
              <span
                className={`ft-sync-badge ft-sync-badge--${syncStatus}`}
                title={
                  syncStatus === 'synced'
                    ? 'All changes saved to cloud'
                    : syncStatus === 'syncing'
                    ? 'Syncing changes with cloud...'
                    : syncStatus === 'offline'
                    ? 'Offline — changes safely saved in local cache'
                    : syncStatus === 'pending'
                    ? 'Changes saved locally, pending cloud sync'
                    : 'Sync alert — changes safely preserved in local cache'
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background:
                    syncStatus === 'synced'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : syncStatus === 'syncing'
                      ? 'rgba(249, 115, 22, 0.15)'
                      : syncStatus === 'offline'
                      ? 'rgba(234, 179, 8, 0.12)'
                      : syncStatus === 'pending'
                      ? 'rgba(249, 115, 22, 0.12)'
                      : 'rgba(239, 68, 68, 0.15)',
                  color:
                    syncStatus === 'synced'
                      ? '#4ade80'
                      : syncStatus === 'syncing'
                      ? '#fb923c'
                      : syncStatus === 'offline'
                      ? '#facc15'
                      : syncStatus === 'pending'
                      ? '#fb923c'
                      : '#f87171',
                  border: `1px solid ${
                    syncStatus === 'synced'
                      ? 'rgba(34, 197, 94, 0.25)'
                      : syncStatus === 'syncing'
                      ? 'rgba(249, 115, 22, 0.3)'
                      : syncStatus === 'offline'
                      ? 'rgba(234, 179, 8, 0.25)'
                      : syncStatus === 'pending'
                      ? 'rgba(249, 115, 22, 0.25)'
                      : 'rgba(239, 68, 68, 0.3)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'currentColor',
                    display: 'inline-block',
                  }}
                />
                <span>
                  {syncStatus === 'synced'
                    ? 'Synced'
                    : syncStatus === 'syncing'
                    ? 'Syncing'
                    : syncStatus === 'offline'
                    ? 'Saved locally'
                    : syncStatus === 'pending'
                    ? 'Saving...'
                    : 'Offline cache'}
                </span>
              </span>
            )}
            {isLocalMode && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Local Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Generation Filters */}
      {onSelectGenFilter && (
        <div className="ft-header__gen-filters" role="group" aria-label="Generation filters">
          <button
            className={`ft-gen-filter-btn ${activeGenFilter === null ? 'ft-gen-filter-btn--active' : ''}`}
            onClick={() => onSelectGenFilter(null)}
            title="Show all generations"
          >
            ALL
          </button>
          {GENERATION_CONFIG.slice(0, 4).map((g) => (
            <button
              key={g.gen}
              className={`ft-gen-filter-btn ${activeGenFilter === g.gen ? 'ft-gen-filter-btn--active' : ''}`}
              onClick={() => onSelectGenFilter(g.gen)}
              title={`Show ${g.title}`}
            >
              {g.title.replace('Generation ', 'GEN ')}
            </button>
          ))}
        </div>
      )}

      {/* Right: Search · Add Member · Theme · Profile */}
      <div className="ft-header__actions">
        <div className="ft-header__search-wrap">
          <SearchOverlay onSelectPerson={onSelectPerson} onOpenSearch={onOpenSearch} />
          {selectedId && (
            <button
              className="ft-header__clear-sel-btn"
              onClick={onDeselect}
              title="Clear selection"
            >
              Clear
            </button>
          )}
        </div>

        {/* Arrange Family Mode Toggle */}
        {onToggleArrangeMode && activeView === 'tree' && canAdd && (
          <button
            type="button"
            className={`ft-header__arrange-btn ${isArrangeMode ? 'ft-header__arrange-btn--active' : ''}`}
            onClick={onToggleArrangeMode}
            title={isArrangeMode ? 'Save and exit Arrange Family mode' : 'Arrange family sibling display order'}
            aria-pressed={isArrangeMode}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 16 4 4 4-4" />
              <path d="M7 20V4" />
              <path d="m21 8-4-4-4 4" />
              <path d="M17 4v16" />
            </svg>
            <span>{isArrangeMode ? 'Done' : 'Arrange Family'}</span>
          </button>
        )}

        {/* Add Member — Hidden for Viewers */}
        {onOpenAddModal && canAdd && (
          <Magnet strength={3} active={!isReducedMotion}>
            <ClickSpark
              sparkColor="var(--ft-accent)"
              sparkCount={5}
              sparkSize={4}
              duration={240}
            >
              <button
                className="ft-header__add-btn"
                onClick={() => onOpenAddModal()}
                title="Add a family member"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Member</span>
              </button>
            </ClickSpark>
          </Magnet>
        )}

        <Magnet strength={3} active={!isReducedMotion}>
          <button
            className="ft-header__icon-btn ft-header__theme-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </Magnet>

        {/* Profile & Settings Menu with Destination Navigation */}
        <UserProfileMenu
          activeView={activeView}
          onNavigateView={onNavigateView}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onOpenDataModal={onOpenDataModal}
          onStartTour={onStartTour}
          isReducedMotion={isReducedMotion}
          onToggleReducedMotion={onToggleReducedMotion}
          isLocalMode={isLocalMode}
        />
      </div>

      {/* Family Settings & Collaboration Modal */}
      <FamilySettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        family={activeFamily || { id: 'local', name: (isLocalMode ? 'Family Tree' : 'Family Archive') }}
        currentRole={currentRole || 'owner'}
        currentUser={user || { id: 'local-user', email: 'family.admin@medida.org', display_name: 'Local User' }}
        onMembersUpdated={familyContext?.refreshMemberships}
      />
    </header>
  );
}
