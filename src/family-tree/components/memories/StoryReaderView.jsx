/**
 * StoryReaderView.jsx — Medida's Family (Milestone M4C)
 * 
 * Dedicated editorial story reading experience prioritizing typography,
 * photography, narrative immersion, and relational context.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import { PHOTO_BUCKET } from '../../media/mediaStorageService.js';
import { getRelatedStories } from '../../memories/familyStoryEngine.js';

// Lazy-loaded story hero image with private signed URL support
function StoryHeroImage({ photo, onOpenLightbox }) {
  const storagePath = photo?.storage_path || photo?.storagePath || '';
  const resolvedUrl = useMediaUrl(storagePath, photo?.src || '', PHOTO_BUCKET);

  if (!resolvedUrl && !photo?.src) return null;

  return (
    <figure className="ft-story-reader__hero-figure">
      <div
        className="ft-story-reader__hero-image-wrap"
        onClick={() => onOpenLightbox && onOpenLightbox([photo], 0)}
        role="button"
        tabIndex={0}
        aria-label="View photo in lightbox"
        onKeyDown={(e) => e.key === 'Enter' && onOpenLightbox && onOpenLightbox([photo], 0)}
      >
        <img
          src={resolvedUrl || photo?.src}
          alt={photo?.title || 'Story photograph'}
          className="ft-story-reader__hero-img"
          loading="lazy"
        />
        <div className="ft-story-reader__hero-zoom-badge" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>Enlarge</span>
        </div>
      </div>
      {photo?.caption && (
        <figcaption className="ft-story-reader__hero-caption">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}

// Person avatar thumbnail
function PersonAvatar({ person, onClick, roleLabel }) {
  if (!person) return null;
  const initial = person.firstName ? person.firstName[0].toUpperCase() : '?';

  return (
    <div
      className="ft-story-reader__person-card"
      onClick={() => onClick && onClick(person.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(person.id)}
      title={`Focus ${person.displayName} in Family Tree`}
    >
      <div className="ft-story-reader__person-avatar">
        {person.photo ? (
          <img src={person.photo} alt={person.displayName} className="ft-story-reader__person-img" />
        ) : (
          <span className="ft-story-reader__person-initial">{initial}</span>
        )}
      </div>
      <div className="ft-story-reader__person-meta">
        <span className="ft-story-reader__person-name">{person.displayName}</span>
        {roleLabel && <span className="ft-story-reader__person-role">{roleLabel}</span>}
      </div>
      <div className="ft-story-reader__person-arrow" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}

export default function StoryReaderView({
  story,
  allStories = [],
  onClose,
  onSelectStory,
  onNavigateToPerson,
  onNavigateToEvent,
  onOpenLightbox,
  onOpenDocumentViewer,
  onEditStory,
  onDeleteStory,
  canEdit = true,
}) {
  const containerRef = useRef(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll listener for subtle reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const totalHeight = el.scrollHeight - el.clientHeight;
      if (totalHeight <= 0) {
        setReadingProgress(100);
        return;
      }
      const progress = Math.min(100, Math.max(0, Math.round((el.scrollTop / totalHeight) * 100)));
      setReadingProgress(progress);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [story]);

  // Scroll to top on story change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [story?.id]);

  // Compute related stories deterministically
  const relatedStories = useMemo(() => {
    if (!story || !allStories.length) return [];
    return getRelatedStories(story, allStories, 3);
  }, [story, allStories]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && story?.id) {
      const url = `${window.location.origin}/app/memories/${story.id}`;
      navigator.clipboard?.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2200);
      });
    }
  };

  // Stale or deleted story fallback
  if (!story) {
    return (
      <div className="ft-story-reader-container ft-story-reader-container--stale" role="main">
        <div className="ft-story-reader__stale-card">
          <div className="ft-story-reader__stale-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h2 className="ft-story-reader__stale-title">Memory Not Found</h2>
          <p className="ft-story-reader__stale-desc">
            This family memory is no longer available or may have been archived.
          </p>
          <button type="button" className="ft-story-reader__btn ft-story-reader__btn--primary" onClick={onClose}>
            Return to Family Memories
          </button>
        </div>
      </div>
    );
  }

  // Format paragraphs nicely
  const paragraphs = (story.content || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="ft-story-reader-container" role="main" aria-label={`Reading story: ${story.title}`}>
      {/* Reading Progress Indicator */}
      <div
        className="ft-story-reader__progress-bar"
        style={{ width: `${readingProgress}%` }}
        role="progressbar"
        aria-valuenow={readingProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Story reading progress"
      />

      {/* Reader Sticky Header Bar */}
      <header className="ft-story-reader__top-bar">
        <div className="ft-story-reader__top-left">
          <button
            type="button"
            className="ft-story-reader__back-btn"
            onClick={onClose}
            aria-label="Back to family memories index"
            title="Back to Memories"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>All Memories</span>
          </button>
        </div>

        <div className="ft-story-reader__top-center">
          <span className="ft-story-reader__top-reading-time">
            {story.readingTimeMinutes || 1} min read &bull; {readingProgress}% read
          </span>
        </div>

        <div className="ft-story-reader__top-actions">
          <button
            type="button"
            className="ft-story-reader__action-btn"
            onClick={handleCopyLink}
            aria-label="Copy shareable story link"
            title="Copy story link"
          >
            {copiedLink ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>Share</span>
              </>
            )}
          </button>

          {canEdit && onEditStory && (
            <button
              type="button"
              className="ft-story-reader__action-btn"
              onClick={() => onEditStory(story)}
              aria-label="Edit this story"
              title="Edit story"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Edit</span>
            </button>
          )}

          {canEdit && onDeleteStory && (
            <button
              type="button"
              className="ft-story-reader__action-btn ft-story-reader__action-btn--delete"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this memory?')) {
                  onDeleteStory(story.id);
                  onClose();
                }
              }}
              aria-label="Delete this story"
              title="Delete memory"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Reader Scrollable Content */}
      <article className="ft-story-reader__scroll-body" ref={containerRef}>
        <div className="ft-story-reader__article-inner">
          {/* Eyebrow & Chapter Header */}
          <div className="ft-story-reader__header-meta">
            <span className="ft-story-reader__eyebrow">FAMILY MEMOIR</span>
            {story.year && <span className="ft-story-reader__year-badge">{story.year}</span>}
          </div>

          {/* Story Title */}
          <h1 className="ft-story-reader__title">{story.title}</h1>

          {/* Story Attribution Subtitle */}
          <div className="ft-story-reader__byline">
            {story.narrator && (
              <div
                className="ft-story-reader__narrator"
                onClick={() => {
                  if (story.narratorPerson && onNavigateToPerson) {
                    onNavigateToPerson(story.narratorPerson.id);
                  }
                }}
                role={story.narratorPerson ? 'button' : undefined}
                tabIndex={story.narratorPerson ? 0 : undefined}
                title={story.narratorPerson ? `View ${story.narrator} in family tree` : undefined}
              >
                <span className="ft-story-reader__narrator-label">Told by</span>
                <span className="ft-story-reader__narrator-name">{story.narrator}</span>
              </div>
            )}

            <div className="ft-story-reader__meta-items">
              {story.location && (
                <span className="ft-story-reader__meta-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {story.location}
                </span>
              )}
              {story.date && (
                <span className="ft-story-reader__meta-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {story.date}
                </span>
              )}
            </div>
          </div>

          {/* Large Hero Photography */}
          {story.associatedPhoto && (
            <StoryHeroImage photo={story.associatedPhoto} onOpenLightbox={onOpenLightbox} />
          )}

          {/* Story Narrative Content */}
          <section className="ft-story-reader__body">
            {paragraphs.map((para, index) => (
              <p
                key={index}
                className={`ft-story-reader__p ${index === 0 ? 'ft-story-reader__p--lead' : ''}`}
              >
                {para}
              </p>
            ))}
          </section>

          {/* Section: Within This Story (People) */}
          {(story.primaryPerson || (story.relatedPeople && story.relatedPeople.length > 0)) && (
            <section className="ft-story-reader__section" aria-label="People in this story">
              <div className="ft-story-reader__section-header">
                <h2 className="ft-story-reader__section-title">Within this Story</h2>
                <span className="ft-story-reader__section-hint">Click a family member to focus in tree</span>
              </div>
              <div className="ft-story-reader__people-grid">
                {story.primaryPerson && (
                  <PersonAvatar
                    person={story.primaryPerson}
                    roleLabel="Primary Subject"
                    onClick={onNavigateToPerson}
                  />
                )}
                {story.relatedPeople?.map((person) => (
                  <PersonAvatar
                    key={person.id}
                    person={person}
                    roleLabel="Related Member"
                    onClick={onNavigateToPerson}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section: The Moment (Linked Life Event) */}
          {story.associatedEvent && (
            <section className="ft-story-reader__section" aria-label="Related life event">
              <div className="ft-story-reader__section-header">
                <h2 className="ft-story-reader__section-title">The Moment</h2>
                <span className="ft-story-reader__section-hint">Chronological milestone</span>
              </div>
              <div
                className="ft-story-reader__event-card"
                onClick={() => onNavigateToEvent && onNavigateToEvent(story.associatedEvent)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigateToEvent && onNavigateToEvent(story.associatedEvent)}
                title="View life event milestone"
              >
                <div className="ft-story-reader__event-badge">
                  {story.associatedEvent.type || 'Event'}
                </div>
                <div className="ft-story-reader__event-content">
                  <h3 className="ft-story-reader__event-title">{story.associatedEvent.title}</h3>
                  <div className="ft-story-reader__event-meta">
                    {story.associatedEvent.date && <span>{story.associatedEvent.date}</span>}
                    {story.associatedEvent.location && <span>&bull; {story.associatedEvent.location}</span>}
                  </div>
                  {story.associatedEvent.description && (
                    <p className="ft-story-reader__event-desc">{story.associatedEvent.description}</p>
                  )}
                </div>
                <div className="ft-story-reader__event-action" aria-hidden="true">
                  <span>Explore &rarr;</span>
                </div>
              </div>
            </section>
          )}

          {/* Section: Archival Document */}
          {story.associatedDocument && (
            <section className="ft-story-reader__section" aria-label="Archival document">
              <div className="ft-story-reader__section-header">
                <h2 className="ft-story-reader__section-title">Archival Record</h2>
                <span className="ft-story-reader__section-hint">Historical document artifact</span>
              </div>
              <div
                className="ft-story-reader__doc-card"
                onClick={() => onOpenDocumentViewer && onOpenDocumentViewer(story.associatedDocument)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpenDocumentViewer && onOpenDocumentViewer(story.associatedDocument)}
                title="Open archival document"
              >
                <div className="ft-story-reader__doc-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="ft-story-reader__doc-info">
                  <span className="ft-story-reader__doc-name">
                    {story.associatedDocument.name || 'Archival Document'}
                  </span>
                  <span className="ft-story-reader__doc-meta">
                    {story.associatedDocument.type || 'Official Record'} &bull; Click to inspect
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Section: More From This Family (Related Stories) */}
          {relatedStories.length > 0 && (
            <section className="ft-story-reader__section ft-story-reader__section--related" aria-label="Related family stories">
              <div className="ft-story-reader__section-header">
                <h2 className="ft-story-reader__section-title">More from this Family</h2>
                <span className="ft-story-reader__section-hint">Connected oral legacies</span>
              </div>
              <div className="ft-story-reader__related-grid">
                {relatedStories.map((relStory) => (
                  <div
                    key={relStory.id}
                    className="ft-story-reader__related-card"
                    onClick={() => onSelectStory && onSelectStory(relStory.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectStory && onSelectStory(relStory.id)}
                  >
                    <div className="ft-story-reader__related-meta">
                      {relStory.year && <span className="ft-story-reader__related-year">{relStory.year}</span>}
                      {relStory.location && <span>&bull; {relStory.location}</span>}
                    </div>
                    <h3 className="ft-story-reader__related-title">{relStory.title}</h3>
                    {relStory.narrator && (
                      <span className="ft-story-reader__related-narrator">Told by {relStory.narrator}</span>
                    )}
                    <p className="ft-story-reader__related-excerpt">
                      {relStory.content?.slice(0, 110)}...
                    </p>
                    <span className="ft-story-reader__related-link">Read Story &rarr;</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer Back Button */}
          <div className="ft-story-reader__footer">
            <button
              type="button"
              className="ft-story-reader__btn ft-story-reader__btn--secondary"
              onClick={onClose}
            >
              &larr; Back to Family Memories
            </button>
            <button
              type="button"
              className="ft-story-reader__btn ft-story-reader__btn--ghost"
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              Back to Top &uarr;
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
