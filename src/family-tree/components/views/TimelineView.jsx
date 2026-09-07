/**
 * TimelineView Component — Modern Digital Family Platform
 * Clean editorial timeline with ScrollReveal cards, large typography dates,
 * high-res photography, and isolated smooth scrolling.
 */

import React from 'react';
import { sampleTimelineEvents } from '../../data/sampleData.js';
import SmoothScrollContainer from '../react-bits/SmoothScrollContainer.jsx';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';

export default function TimelineView({ onClose, onSelectPerson }) {
  return (
    <div className="ft-view-modal" role="dialog" aria-label="Family Modern Editorial Timeline">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-view-modal__container--wide">
        {/* Header */}
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">CHRONOLOGICAL MILESTONES</span>
            <h2 className="ft-view-modal__title">Timeline in Motion</h2>
            <p className="ft-view-modal__subtitle">Key family eras, movements, and milestones (1918 — Present)</p>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close timeline">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        {/* Timeline Content with Smooth Scroll & ScrollReveal */}
        <SmoothScrollContainer className="ft-timeline-content">
          {sampleTimelineEvents.map((evt) => (
            <ScrollReveal key={evt.year} duration={400} distance={16}>
              <div className="ft-timeline-card">
                <div className="ft-timeline-year-badge">{evt.year}</div>
                <div className="ft-timeline-card__body">
                  <div className="ft-timeline-card__era">
                    {evt.era} &bull; {evt.subtitle}
                  </div>
                  <h3 className="ft-timeline-card__title">{evt.title}</h3>
                  <p className="ft-timeline-card__desc">{evt.description}</p>

                  {evt.imageUrl && (
                    <div className="ft-timeline-card__photo-frame">
                      <img
                        src={evt.imageUrl}
                        alt={evt.title}
                        className="ft-timeline-card__img"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {evt.tags && evt.tags.length > 0 && (
                    <div className="ft-timeline-card__tags">
                      {evt.tags.map((tag) => (
                        <span key={tag} className="ft-timeline-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </SmoothScrollContainer>
      </div>
    </div>
  );
}
