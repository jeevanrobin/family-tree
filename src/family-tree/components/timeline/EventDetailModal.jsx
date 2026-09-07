/**
 * EventDetailModal Component
 * Milestone M4B: Premium editorial event detail surface.
 * Shows large date, category, location, people associations, and archival media.
 */

import React, { useEffect } from 'react';
import { getInitials, getAvatarGradient } from '../../utils/familyHelpers.js';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';

function PhotoThumbnail({ photo, onOpenPhoto }) {
  const rawSrc = photo?.src || photo?.imageUrl || '';
  const isStoragePath = rawSrc.startsWith('family/');
  const resolvedSrc = useMediaUrl(isStoragePath ? rawSrc : '', rawSrc);

  if (!rawSrc) return null;

  return (
    <div className="ft-timeline-detail__photo-wrap" onClick={() => onOpenPhoto(photo)}>
      <img
        src={resolvedSrc || rawSrc}
        alt={photo.title || 'Event photograph'}
        className="ft-timeline-detail__photo"
        loading="lazy"
      />
      <div className="ft-timeline-detail__photo-overlay">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <span>View Full Image</span>
      </div>
    </div>
  );
}

export default function EventDetailModal({
  event,
  onClose,
  onNavigateToPerson,
  onOpenPhoto,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!event) return null;

  const parsed = event._parsedDate || { formatted: event.date || 'Date unknown', displayYear: 'Date unknown' };
  const associatedPeople = event.allAssociatedPeople || [event.primaryPerson].filter(Boolean);

  return (
    <div className="ft-gsearch-overlay" role="dialog" aria-modal="true" aria-label={event.title}>
      <div className="ft-gsearch-backdrop" onClick={onClose} />

      <div className="ft-timeline-detail-card">
        {/* Header Bar */}
        <div className="ft-timeline-detail__header">
          <div className="ft-timeline-detail__badge-row">
            <span className="ft-timeline-card__category">{event.type || 'Milestone'}</span>
            {event.location && (
              <span className="ft-timeline-detail__location">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {event.location}
              </span>
            )}
          </div>
          <button
            className="ft-gsearch-close-btn"
            onClick={onClose}
            aria-label="Close dialog (Esc)"
            title="Close (Esc)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Prominent Editorial Date & Title */}
        <div className="ft-timeline-detail__date-block">
          <span className="ft-timeline-detail__date-hero">{parsed.displayYear}</span>
          {parsed.formatted !== parsed.displayYear && (
            <span className="ft-timeline-detail__date-full">{parsed.formatted}</span>
          )}
        </div>

        <h2 className="ft-timeline-detail__title">{event.title}</h2>

        {/* Narrative Description */}
        {event.description ? (
          <p className="ft-timeline-detail__desc">{event.description}</p>
        ) : (
          <p className="ft-timeline-detail__desc ft-timeline-detail__desc--muted">
            Milestone recorded in the family archive.
          </p>
        )}

        {/* Photographic Media */}
        {event.associatedPhoto && onOpenPhoto && (
          <div className="ft-timeline-detail__media-section">
            <PhotoThumbnail photo={event.associatedPhoto} onOpenPhoto={onOpenPhoto} />
          </div>
        )}

        {/* Associated Family Members */}
        {associatedPeople.length > 0 && (
          <div className="ft-timeline-detail__people-section">
            <h4 className="ft-timeline-detail__section-label">ASSOCIATED FAMILY MEMBERS</h4>
            <div className="ft-timeline-detail__people-grid">
              {associatedPeople.map((person) => {
                const isPrimary = person.id === event.personId;
                const avatarBg = getAvatarGradient(person);
                return (
                  <button
                    key={person.id}
                    type="button"
                    className="ft-timeline-detail__person-btn"
                    onClick={() => {
                      onClose();
                      if (onNavigateToPerson) onNavigateToPerson(person.id);
                    }}
                    title={`View ${person.displayName} in Family Tree`}
                  >
                    <div className="ft-timeline-card__person-avatar" style={{ background: avatarBg }}>
                      {person.photo || person.photoUrl ? (
                        <img
                          src={person.photo || person.photoUrl}
                          alt={person.displayName}
                          className="ft-timeline-card__person-img"
                        />
                      ) : (
                        <span>{getInitials(person)}</span>
                      )}
                    </div>
                    <div className="ft-timeline-detail__person-info">
                      <span className="ft-timeline-detail__person-name">{person.displayName}</span>
                      <span className="ft-timeline-detail__person-role">
                        {isPrimary ? 'Primary Member' : 'Related'}
                      </span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ft-timeline-detail__arrow-icon">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="ft-timeline-detail__footer">
          <span className="ft-timeline-detail__footer-text">
            Clicking any family member glides the canvas directly to their node.
          </span>
        </div>
      </div>
    </div>
  );
}
