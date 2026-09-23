/**
 * DocumentViewerModal Component — Archival Document Focus Viewer (Milestone 3D)
 * Displays historical records, resolves short-lived signed URLs for private files,
 * supports in-modal image previews, secure download links, and storage cleanup.
 */

import React from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import { mediaStorageService, DOCUMENT_BUCKET } from '../../media/mediaStorageService.js';
import DeleteButton from '../rare-ui/DeleteButton.jsx';


export default function DocumentViewerModal({
  isOpen,
  document,
  onClose,
  onEdit,
  onDelete,
}) {
  const storagePath = document?.storage_path || document?.storagePath || '';
  const resolvedUrl = useMediaUrl(storagePath, document?.src || '', DOCUMENT_BUCKET);

  if (!isOpen || !document) return null;

  const isImage =
    document.mime_type?.startsWith('image/') ||
    document.mimeType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp)$/i.test(document.name || '') ||
    /\.(jpg|jpeg|png|webp)/i.test(resolvedUrl);

  const isPdf =
    document.mime_type === 'application/pdf' ||
    document.mimeType === 'application/pdf' ||
    /\.pdf$/i.test(document.name || '') ||
    /\.pdf/i.test(resolvedUrl);

  const handleDelete = () => {
    if (storagePath) {
      mediaStorageService.deleteDocument({ storagePath });
    }
    onDelete?.(document.id);
    onClose();
  };


  return (
    <div className="ft-view-modal" role="dialog" aria-label="Archival Document Record">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container" style={{ maxWidth: '640px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow" style={{ color: 'var(--ft-emerald)' }}>
              {document.type || 'ARCHIVAL RECORD'}
            </span>
            <h2 className="ft-view-modal__title">{document.name}</h2>
            {document.date && (
              <p className="ft-view-modal__subtitle">Recorded on: {document.date}</p>
            )}
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ft-modal-form-body" style={{ gap: '16px' }}>
          {/* Document Content / Notes */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--ft-surface-soft)',
            borderRadius: '12px',
            border: '1px solid var(--ft-border-subtle)',
            fontSize: '0.88rem',
            lineHeight: '1.6',
            color: 'var(--ft-text-primary)',
          }}>
            <p>{document.description || 'Archival document catalog record preserved in the Medida family heritage collection.'}</p>
          </div>

          {/* In-Modal Image Preview for visual certificates & records */}
          {isImage && resolvedUrl && (
            <div style={{
              borderRadius: '12px',
              overflow: 'hidden',
              maxHeight: '320px',
              background: '#09090b',
              border: '1px solid var(--ft-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={resolvedUrl}
                alt={document.name}
                style={{ maxHeight: '320px', maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Document Action Button */}
          {resolvedUrl && (
            <div style={{ marginTop: '4px' }}>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ft-form-btn ft-form-btn--primary"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>{isPdf ? 'Open PDF Record in Secure Viewer' : 'Open Full Digital Scan'}</span>
              </a>
            </div>
          )}
        </div>

        <div className="ft-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onDelete && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <DeleteButton
                  onConfirm={handleDelete}
                  title="Delete Record"
                  confirmTitle="Confirm delete archival record"
                  size={32}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--ft-coral)' }}>Delete</span>
              </div>
            )}
            {onEdit && (
              <button
                type="button"
                className="ft-form-btn ft-form-btn--secondary"
                onClick={() => {
                  onEdit(document);
                  onClose();
                }}
              >
                Edit Record
              </button>
            )}
          </div>

          <button
            type="button"
            className="ft-form-btn ft-form-btn--primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
