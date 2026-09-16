import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../../auth/FamilyContext.jsx';
import { ROLE_LABELS } from '../../auth/roles.js';
import AuthShell from './AuthShell.jsx';
import FadeContent from '../react-bits/FadeContent.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';

/**
 * FamilySelectorView Component
 * Displayed when an authenticated user belongs to multiple families.
 * Shows verified family memberships, roles, creation dates, and actions
 * to open an existing family tree or create a new one.
 */
export default function FamilySelectorView() {
  const { memberships, switchFamily, logout, user } = useFamily();
  const navigate = useNavigate();
  const isReducedMotion = useReducedMotion();

  const handleSelectFamily = (familyId) => {
    switchFamily(familyId);
    navigate(`/app/family/${familyId}`);
  };

  const handleCreateNew = () => {
    navigate('/app/create-family');
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <AuthShell>
      <div className="fa-card fa-selector-card">
        <FadeContent duration={500} delay={90} distance={12} isReducedMotion={isReducedMotion}>
          <span className="fa-create-card__eyebrow">Your family spaces</span>
          <h1 className="fa-card__title">Your Families</h1>
          <p className="fa-card__sub">Choose a family to continue.</p>
        </FadeContent>

        <div className="fa-selector-userbar">
          <span>Signed in as <strong>{user?.email}</strong></span>
          <button type="button" className="fa-link fa-selector-signout" onClick={logout}>Sign Out</button>
        </div>

        <div className="fa-family-list" aria-label="Your family spaces">
          {memberships.map((m, index) => {
            const roleLabel = ROLE_LABELS[m.role] || m.role;
            const createdDate = formatDate(m.family?.created_at);

            return (
              <div
                key={m.familyId}
                className="fa-family-card"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <div className="fa-family-card__content">
                  <div className="fa-family-card__heading">
                    <span className="fa-family-card__name">
                      {m.family?.name || 'Untitled Family'}
                    </span>
                    <span className={`fa-family-card__role ${m.role === 'owner' ? 'fa-family-card__role--owner' : ''}`}>
                      {roleLabel}
                    </span>
                  </div>

                  {m.family?.description && (
                    <p className="fa-family-card__description">
                      {m.family.description}
                    </p>
                  )}

                  {createdDate && (
                    <span className="fa-family-card__date">
                      Created {createdDate}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectFamily(m.familyId)}
                  className="fa-btn fa-btn--primary fa-family-card__action"
                >
                  Open Family &rarr;
                </button>
              </div>
            );
          })}
        </div>

        <div className="fa-selector-create">
          <button
            type="button"
            onClick={handleCreateNew}
            className="fa-btn fa-btn--secondary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create New Family</span>
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
