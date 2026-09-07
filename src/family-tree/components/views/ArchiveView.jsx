/**
 * ArchiveView Component — Modern Digital Family Platform
 * Modern document catalog with search filtering, ScrollReveal, and isolated smooth scrolling.
 */

import React, { useState, useMemo } from 'react';
import { sampleArchivalArtifacts } from '../../data/sampleData.js';
import SmoothScrollContainer from '../react-bits/SmoothScrollContainer.jsx';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';

export default function ArchiveView({ onClose }) {
  const [query, setQuery] = useState('');

  const filteredArtifacts = useMemo(() => {
    if (!query.trim()) return sampleArchivalArtifacts;
    const q = query.toLowerCase();
    return sampleArchivalArtifacts.filter(
      (a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Digital Documents Archive">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container">
        {/* Header */}
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">DIGITAL RECORDS</span>
            <h2 className="ft-view-modal__title">Document Archive</h2>
            <p className="ft-view-modal__subtitle">Official deeds, citations, manuscripts, and certificates</p>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close archive">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        {/* Search Bar */}
        <div style={{ padding: '16px 28px 0', borderBottom: '1px solid var(--ft-border-subtle)', background: 'var(--ft-surface-soft)' }}>
          <input
            type="text"
            placeholder="Search documents by keyword, title, category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--ft-border)',
              background: 'var(--ft-surface)',
              color: 'var(--ft-text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
              marginBottom: '16px',
            }}
          />
        </div>

        {/* Artifacts Grid with Smooth Scroll & ScrollReveal */}
        <SmoothScrollContainer className="ft-archive-grid">
          {filteredArtifacts.map((art) => (
            <ScrollReveal key={art.id} duration={350} distance={12}>
              <div className="ft-archive-card">
                <span className="ft-archive-card__type-tag">{art.category}</span>
                <h3 className="ft-archive-card__title">{art.title}</h3>
                <p className="ft-archive-card__desc">{art.description}</p>
                <div className="ft-archive-card__date">
                  <span>{art.date}</span> &bull; <span>Ref: {art.id.toUpperCase()}</span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </SmoothScrollContainer>
      </div>
    </div>
  );
}
