/**
 * MemoriesView Component — Modern Digital Family Platform
 * Storytelling journal entries with ScrollReveal, isolated smooth scrolling,
 * and audio narrative player simulator.
 */

import React, { useState } from 'react';
import { sampleMemories } from '../../data/sampleData.js';
import SmoothScrollContainer from '../react-bits/SmoothScrollContainer.jsx';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';

export default function MemoriesView({ onClose }) {
  const [playingId, setPlayingId] = useState(null);

  const togglePlay = (id) => {
    setPlayingId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Family Memories & Oral Histories">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container">
        {/* Header */}
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">ORAL TRADITION &amp; MEMOIRS</span>
            <h2 className="ft-view-modal__title">Family Memories</h2>
            <p className="ft-view-modal__subtitle">Spoken legacies, oral histories, and firsthand recollections</p>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close memories">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        {/* Memories List with Smooth Scroll & ScrollReveal */}
        <SmoothScrollContainer className="ft-memories-list">
          {sampleMemories.map((mem) => {
            const isPlaying = playingId === mem.id;

            return (
              <ScrollReveal key={mem.id} duration={400} distance={14}>
                <article className="ft-memory-entry">
                  <div className="ft-memory-entry__header">
                    <span className="ft-memory-entry__loc-year">{mem.location} &bull; {mem.year}</span>
                    <button
                      className="ft-memory-entry__audio-pill"
                      onClick={() => togglePlay(mem.id)}
                      aria-label={isPlaying ? 'Pause audio memoir' : 'Play audio memoir'}
                    >
                      {isPlaying ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                          <span>Playing ({mem.audioDuration})</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Listen ({mem.audioDuration})</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="ft-memory-entry__title">{mem.title}</h3>

                  <blockquote className="ft-memory-entry__story">
                    <p>&ldquo;{mem.story}&rdquo;</p>
                  </blockquote>

                  <div className="ft-memory-entry__footer">
                    <div className="ft-memory-entry__narrator">
                      {mem.avatarUrl && (
                        <img
                          src={mem.avatarUrl}
                          alt={mem.narrator}
                          className="ft-memory-entry__avatar"
                        />
                      )}
                      <span className="ft-memory-entry__narrator-name">Recounted by {mem.narrator}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ft-text-muted)', fontWeight: '600' }}>
                      {mem.category}
                    </span>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </SmoothScrollContainer>
      </div>
    </div>
  );
}
