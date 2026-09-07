/**
 * DeletePersonModal Component — Safe Deletion Confirmation
 * Detaches associated relationships without deleting relatives.
 */

import React from 'react';
import { getParents, getSpouse, getChildren } from '../../data/familyDataService.js';

export default function DeletePersonModal({
  isOpen,
  person,
  onClose,
  onConfirmDelete,
}) {
  if (!isOpen || !person) return null;

  const parents = getParents(person.id);
  const spouse = getSpouse(person.id);
  const children = getChildren(person.id);

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Confirm Deletion">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container" style={{ maxWidth: '480px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow" style={{ color: 'var(--ft-coral)' }}>
              SAFE DELETION
            </span>
            <h2 className="ft-view-modal__title">Delete Person?</h2>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: '0.92rem', color: 'var(--ft-text-primary)', lineHeight: '1.5' }}>
            Are you sure you want to delete <strong>{person.displayName}</strong>?
          </p>

          {/* Relationships to be safely detached */}
          <div style={{
            marginTop: '16px',
            padding: '14px',
            background: 'var(--ft-surface-soft)',
            borderRadius: '12px',
            border: '1px solid var(--ft-border)',
            fontSize: '0.84rem',
          }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: 'var(--ft-text-primary)' }}>
              Connected Relationships to Detach:
            </div>
            <ul style={{ paddingLeft: '20px', color: 'var(--ft-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>{parents.length}</strong> parent connection{parents.length !== 1 ? 's' : ''}</li>
              <li><strong>{spouse ? 1 : 0}</strong> spouse connection</li>
              <li><strong>{children.length}</strong> child connection{children.length !== 1 ? 's' : ''}</li>
            </ul>
            <div style={{ marginTop: '10px', fontSize: '0.76rem', color: 'var(--ft-text-muted)' }}>
              &bull; Related family members will remain safely in the tree.
            </div>
          </div>
        </div>

        <div className="ft-modal-footer">
          <button
            type="button"
            className="ft-form-btn ft-form-btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ft-form-btn"
            style={{
              background: 'var(--ft-coral)',
              color: '#ffffff',
              border: 'none',
            }}
            onClick={() => {
              onConfirmDelete(person.id);
              onClose();
            }}
          >
            Delete Person &amp; Detach Relationships
          </button>
        </div>
      </div>
    </div>
  );
}
