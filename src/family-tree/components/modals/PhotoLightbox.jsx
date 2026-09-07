/**
 * PhotoLightbox Component — Luxury Editorial Lightbox (Milestone 3D)
 * Fullscreen viewer with responsive layout, keyboard navigation, caption display,
 * primary portrait promotion, deletion confirmation, and secure signed URL resolution.
 */

import React, { useEffect, useCallback } from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import { mediaStorageService, PHOTO_BUCKET } from '../../media/mediaStorageService.js';

function LightboxImage({ photo }) {
  const storagePath = photo.storage_path || photo.storagePath || '';
  const resolvedUrl = useMediaUrl(storagePath, photo.src, PHOTO_BUCKET);

  return (
    <img
      src={resolvedUrl || photo.src}
      alt={photo.title || 'Family Photo'}
      className="ft-lightbox__img"
    />
  );
}

export default function PhotoLightbox({
  isOpen,
  photos = [],
  currentIndex = 0,
  onClose,
  onNavigate,
  onSetPrimary,
  onDeletePhoto,
}) {
  const currentPhoto = photos[currentIndex];

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentIndex < photos.length - 1) {
          onNavigate(currentIndex + 1);
        } else {
          onNavigate(0); // loop
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1);
        } else {
          onNavigate(photos.length - 1); // loop
        }
      }
    },
    [isOpen, currentIndex, photos.length, onNavigate, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !currentPhoto) return null;

  const handleDelete = () => {
    if (window.confirm('Delete this photo from the album?')) {
      const storagePath = currentPhoto.storage_path || currentPhoto.storagePath;
      if (storagePath) {
        mediaStorageService.deletePhoto({ storagePath });
      }
      onDeletePhoto?.(currentPhoto.id);
      onClose();
    }
  };

  return (
    <div className="ft-lightbox" role="dialog" aria-label="Photo Lightbox Viewer">
      <div className="ft-lightbox__backdrop" onClick={onClose} />

      <div className="ft-lightbox__container">
        {/* Top bar with count & close */}
        <div className="ft-lightbox__topbar">
          <span className="ft-lightbox__counter">
            {currentIndex + 1} / {photos.length}
          </span>
          <button
            className="ft-lightbox__close-btn"
            onClick={onClose}
            aria-label="Close lightbox"
            title="Close (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Stage with Image and Navigation Arrows */}
        <div className="ft-lightbox__stage">
          {photos.length > 1 && (
            <button
              className="ft-lightbox__nav-btn ft-lightbox__nav-btn--prev"
              onClick={() => onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1)}
              aria-label="Previous photograph"
              title="Previous (Left Arrow)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <div className="ft-lightbox__img-wrap">
            <LightboxImage photo={currentPhoto} />
          </div>

          {photos.length > 1 && (
            <button
              className="ft-lightbox__nav-btn ft-lightbox__nav-btn--next"
              onClick={() => onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0)}
              aria-label="Next photograph"
              title="Next (Right Arrow)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Bottom Details & Actions */}
        <div className="ft-lightbox__info">
          <div className="ft-lightbox__meta">
            <h3 className="ft-lightbox__title">{currentPhoto.title || 'Family Photograph'}</h3>
            <div className="ft-lightbox__submeta">
              {currentPhoto.date && <span>{currentPhoto.date}</span>}
              {currentPhoto.date && currentPhoto.location && <span>&middot;</span>}
              {currentPhoto.location && <span>{currentPhoto.location}</span>}
            </div>
            {currentPhoto.caption && (
              <p className="ft-lightbox__caption">{currentPhoto.caption}</p>
            )}
          </div>

          <div className="ft-lightbox__actions">
            {!currentPhoto.isPrimary && onSetPrimary && (
              <button
                className="ft-lightbox__action-btn"
                onClick={() => onSetPrimary(currentPhoto.personId, currentPhoto.id)}
                title="Set as person's primary portrait"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Set as Primary Portrait</span>
              </button>
            )}

            {currentPhoto.isPrimary && (
              <span className="ft-lightbox__primary-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Primary Portrait</span>
              </span>
            )}

            {onDeletePhoto && (
              <button
                className="ft-lightbox__action-btn ft-lightbox__action-btn--delete"
                onClick={handleDelete}
                title="Delete Photo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
