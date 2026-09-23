/**
 * AlbumView Component — Modern Digital Family Platform
 * High-end photography gallery with SmoothScrollContainer, ScrollReveal,
 * category filters, and keyboard-navigated lightbox modal.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { sampleAlbumPhotos } from '../../data/sampleData.js';
import SmoothScrollContainer from '../react-bits/SmoothScrollContainer.jsx';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';
import FolderComponent from '../rare-ui/FolderComponent.jsx';

export default function AlbumView({ onClose }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedIndex, setSelectedIndex] = useState(null);

  const categories = ['All', 'Gatherings', 'Portraits', 'Historic', 'Places'];

  const folderCollections = useMemo(() => {
    return ['Gatherings', 'Portraits', 'Historic', 'Places'].map((cat) => {
      const photos = sampleAlbumPhotos.filter((p) => p.category === cat);
      return {
        category: cat,
        count: photos.length,
        previews: photos.slice(0, 3),
      };
    });
  }, []);


  const filteredPhotos = useMemo(() => {
    if (activeCategory === 'All') return sampleAlbumPhotos;
    return sampleAlbumPhotos.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const selectedPhoto = selectedIndex !== null ? filteredPhotos[selectedIndex] : null;

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback(
    (e) => {
      if (selectedIndex === null) return;

      if (e.key === 'Escape') {
        setSelectedIndex(null);
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev < filteredPhotos.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredPhotos.length - 1));
      }
    },
    [selectedIndex, filteredPhotos]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Family Photographic Gallery">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-view-modal__container--wide">
        {/* Header */}
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">PHOTOGRAPHIC ARCHIVE</span>
            <h2 className="ft-view-modal__title">Family Album</h2>
            <p className="ft-view-modal__subtitle">Curated visual chronicle across four living generations</p>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close album">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        {/* Filter Tabs */}
        <div className="ft-album-filter-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`ft-album-tab-btn ${activeCategory === cat ? 'ft-album-tab-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Rare UI 3D Archival Folders Shelf */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
            padding: '4px 0',
          }}
          role="region"
          aria-label="Tactile Archival Folders"
        >
          {folderCollections.map((col) => {
            const isSelected = activeCategory === col.category;
            return (
              <div
                key={col.category}
                className="ft-archival-folder-wrap"
                style={{
                  borderColor: isSelected ? 'var(--ft-accent)' : undefined,
                  background: isSelected ? 'var(--ft-emerald-soft, rgba(229, 101, 21, 0.08))' : undefined,
                }}
                onClick={() => setActiveCategory(isSelected ? 'All' : col.category)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveCategory(col.category)}
                aria-pressed={isSelected}
                aria-label={`${col.category} Archival Folder containing ${col.count} photos`}
              >
                <FolderComponent
                  size="sm"
                  color={isSelected ? 'amber' : 'black'}
                  previews={col.previews}
                />
                <h4 className="ft-archival-folder-wrap__title">{col.category}</h4>
                <span className="ft-archival-folder-wrap__meta">
                  <span>{col.count} photos</span>
                  <span>&bull;</span>
                  <span>{isSelected ? 'Viewing' : 'Hover to preview'}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Photo Grid with Smooth Scroll & ScrollReveal */}
        <SmoothScrollContainer className="ft-album-grid">
          {filteredPhotos.map((photo, idx) => (
            <ScrollReveal key={photo.id} duration={350} distance={14}>
              <div
                className="ft-album-card"
                onClick={() => setSelectedIndex(idx)}
                role="button"
                tabIndex={0}
              >
                <div className="ft-album-card__frame">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="ft-album-card__img"
                    loading="lazy"
                  />
                  <span className="ft-album-card__tag">{photo.era}</span>
                </div>
                <div className="ft-album-card__info">
                  <div className="ft-album-card__meta">
                    <span>{photo.year}</span> &bull; <span>{photo.location}</span>
                  </div>
                  <h3 className="ft-album-card__title">{photo.title}</h3>
                  <p className="ft-album-card__caption">{photo.caption}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </SmoothScrollContainer>
      </div>

      {/* Lightbox Preview Modal with Navigation */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'ftFadeIn 0.2s ease',
          }}
          onClick={() => setSelectedIndex(null)}
        >
          <div
            style={{
              maxWidth: '900px',
              width: '100%',
              background: 'var(--ft-surface)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: 'var(--ft-shadow-lg)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.title}
              style={{ width: '100%', maxHeight: '65vh', objectFit: 'cover' }}
            />
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--ft-emerald)', fontWeight: '700' }}>
                  {selectedPhoto.era} &bull; {selectedPhoto.year} &bull; {selectedPhoto.location}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--ft-text-muted)' }}>
                  {selectedIndex + 1} of {filteredPhotos.length} (Use &larr; &rarr; keys)
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '4px' }}>
                {selectedPhoto.title}
              </h3>
              <p style={{ color: 'var(--ft-text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
                {selectedPhoto.caption}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
