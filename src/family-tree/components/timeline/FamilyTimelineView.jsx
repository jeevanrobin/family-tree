/**
 * FamilyTimelineView Component
 * Milestone M4B: Premium editorial family history & chronological storytelling.
 * 
 * Strict architectural rule: Reuses existing FamilyStore and lifeEvents data.
 * Zero redundant event store. Fully responsive (desktop, tablet, mobile).
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  deriveErasFromEvents,
  enrichTimelineEvents,
  sortTimelineEvents,
  filterTimelineEvents,
  getAvailableTimelineFilters,
  getEraForEvent,
} from '../../timeline/familyTimelineEngine.js';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';
import EventDetailModal from './EventDetailModal.jsx';
import UserProfileMenu from '../UserProfileMenu.jsx';

/**
 * Lazy-loaded photo thumbnail for timeline cards
 */
function TimelineEventPhoto({ photo, onOpenPhoto }) {
  const rawSrc = photo?.src || photo?.imageUrl || '';
  const isStoragePath = rawSrc.startsWith('family/');
  const resolvedSrc = useMediaUrl(isStoragePath ? rawSrc : '', rawSrc);

  if (!rawSrc) return null;

  return (
    <div
      className="ft-timeline-card__thumb-container"
      onClick={(e) => {
        e.stopPropagation();
        onOpenPhoto(photo);
      }}
      title={`View ${photo.title || 'photo'}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          onOpenPhoto(photo);
        }
      }}
    >
      <img
        src={resolvedSrc || rawSrc}
        alt={photo.title || 'Event photograph'}
        className="ft-timeline-card__thumb"
        loading="lazy"
      />
      <div className="ft-timeline-card__thumb-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Individual Editorial Event Card
 */
function TimelineEventCard({
  event,
  onSelectEvent,
  onNavigateToPerson,
  onOpenPhoto,
}) {
  const parsed = event._parsedDate || { displayYear: 'Unknown', formatted: 'Date unknown' };
  const people = event.allAssociatedPeople || [event.primaryPerson].filter(Boolean);

  return (
    <article
      className="ft-timeline-card"
      onClick={() => onSelectEvent(event)}
      tabIndex={0}
      role="button"
      aria-label={`${event.title}, ${parsed.formatted}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectEvent(event);
        }
      }}
    >
      {/* Date & Category Sidebar */}
      <div className="ft-timeline-card__time-col">
        <div className="ft-timeline-card__year">{parsed.displayYear}</div>
        {parsed.formatted !== parsed.displayYear && (
          <div className="ft-timeline-card__date-sub">{parsed.formatted}</div>
        )}
        <span className="ft-timeline-card__category">{event.type || 'Milestone'}</span>
      </div>

      {/* Main Narrative Content */}
      <div className="ft-timeline-card__content">
        <div className="ft-timeline-card__header-row">
          <h3 className="ft-timeline-card__title">{event.title}</h3>
          {event.location && (
            <div className="ft-timeline-card__location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="ft-timeline-card__description">{event.description}</p>
        )}

        {/* Associated Family Members */}
        {people.length > 0 && (
          <div className="ft-timeline-card__people-row">
            {people.map((person) => {
              const avatarBg = getAvatarGradient(person);
              return (
                <button
                  key={person.id}
                  type="button"
                  className="ft-timeline-card__person-chip"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToPerson(person.id);
                  }}
                  title={`Focus ${person.displayName} in Family Tree`}
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
                  <span className="ft-timeline-card__person-name">{person.displayName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Optional Photo Thumbnail */}
      {event.associatedPhoto && onOpenPhoto && (
        <div className="ft-timeline-card__media-col">
          <TimelineEventPhoto photo={event.associatedPhoto} onOpenPhoto={onOpenPhoto} />
        </div>
      )}
    </article>
  );
}

export default function FamilyTimelineView({
  store,
  onNavigateToPerson,
  onOpenPhoto,
  onReturnToTree,
  onOpenSearch,
  onOpenAddEvent,
  activeView = 'timeline',
  onNavigateView,
  isLocalMode = false,
  isReducedMotion = false,
}) {
  const [eventsVersion, setEventsVersion] = useState(0);

  useEffect(() => {
    if (store && typeof store.subscribe === 'function') {
      return store.subscribe(() => setEventsVersion((v) => v + 1));
    }
  }, [store]);

  const sortedEvents = useMemo(() => {
    const raw = store?.getAllLifeEvents() || [];
    const enriched = enrichTimelineEvents(raw, store);
    return sortTimelineEvents(enriched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, eventsVersion]);

  const eras = useMemo(() => {
    return deriveErasFromEvents(sortedEvents);
  }, [sortedEvents]);

  // Available filter options
  const filterOptions = useMemo(() => {
    return getAvailableTimelineFilters(sortedEvents);
  }, [sortedEvents]);

  // Active filters state
  const [selectedEra, setSelectedEra] = useState('all');
  const [selectedGen, setSelectedGen] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPersonId, setSelectedPersonId] = useState('all');

  // Selected event modal state
  const [activeDetailEvent, setActiveDetailEvent] = useState(null);

  // Filtered event list
  const filteredEvents = useMemo(() => {
    return filterTimelineEvents(sortedEvents, {
      eraId: selectedEra,
      generation: selectedGen,
      category: selectedCategory,
      personId: selectedPersonId,
    });
  }, [sortedEvents, selectedEra, selectedGen, selectedCategory, selectedPersonId]);

  // Group events by Era for editorial presentation
  const groupedEventsByEra = useMemo(() => {
    const map = new Map();
    eras.forEach((era) => {
      map.set(era.id, {
        era,
        events: [],
      });
    });

    const undatedGroup = {
      era: {
        id: 'undated',
        name: 'UNDATED MILESTONES',
        subtitle: 'Timeless Family Milestones & Records',
        displayRange: 'Historical Archive',
      },
      events: [],
    };

    filteredEvents.forEach((event) => {
      const era = getEraForEvent(event, eras);
      if (era && map.has(era.id)) {
        map.get(era.id).events.push(event);
      } else {
        undatedGroup.events.push(event);
      }
    });

    const result = Array.from(map.values()).filter((g) => g.events.length > 0);
    if (undatedGroup.events.length > 0) {
      result.push(undatedGroup);
    }
    return result;
  }, [eras, filteredEvents]);

  // Quick reset filters
  const handleResetFilters = useCallback(() => {
    setSelectedEra('all');
    setSelectedGen('all');
    setSelectedCategory('all');
    setSelectedPersonId('all');
  }, []);

  const hasActiveFilters =
    selectedEra !== 'all' ||
    selectedGen !== 'all' ||
    selectedCategory !== 'all' ||
    selectedPersonId !== 'all';

  return (
    <div className="ft-timeline-container" role="main" aria-label="Family Life History and Chronology">
      {/* Top Header Bar */}
      <header className="ft-timeline-header">
        <div className="ft-timeline-header__left">
          <button
            type="button"
            className="ft-timeline-back-btn"
            onClick={onReturnToTree}
            aria-label="Return to Family Tree"
            title="Return to Family Tree"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Family Tree</span>
          </button>

          <div className="ft-timeline-header__title-group">
            <h1 className="ft-timeline-header__title">Family Life History</h1>
            <span className="ft-timeline-header__count-badge">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'Milestone' : 'Milestones'}
            </span>
          </div>
        </div>

        <div className="ft-timeline-header__actions">
          {onOpenSearch && (
            <button
              type="button"
              className="ft-timeline-search-trigger"
              onClick={onOpenSearch}
              aria-label="Search archive (Ctrl+K)"
              title="Search archive (Ctrl+K)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search...</span>
              <kbd>⌘K</kbd>
            </button>
          )}

          {onOpenAddEvent && (
            <button
              type="button"
              className="ft-timeline-add-btn"
              onClick={() => onOpenAddEvent()}
              aria-label="Add Life Event"
              title="Add Life Event"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Event</span>
            </button>
          )}

          <UserProfileMenu
            activeView={activeView}
            onNavigateView={onNavigateView}
            isLocalMode={isLocalMode}
          />
        </div>
      </header>

      {/* Filter Control Bar */}
      <nav className="ft-timeline-filters" aria-label="Timeline Filters">
        <div className="ft-timeline-filters__row">
          {/* Category Tabs */}
          <div className="ft-timeline-filters__group" role="tablist" aria-label="Categories">
            <span className="ft-timeline-filters__label">TYPE:</span>
            <button
              type="button"
              className={`ft-timeline-filter-pill ${selectedCategory === 'all' ? 'ft-timeline-filter-pill--active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {filterOptions.categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`ft-timeline-filter-pill ${selectedCategory === cat ? 'ft-timeline-filter-pill--active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Person Selector Dropdown */}
          <div className="ft-timeline-filters__group">
            <span className="ft-timeline-filters__label">MEMBER:</span>
            <select
              className="ft-timeline-select"
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              aria-label="Filter by family member"
            >
              <option value="all">Entire Family ({filterOptions.people.length} Members)</option>
              {filterOptions.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Generation Filter */}
          {filterOptions.generations.length > 1 && (
            <div className="ft-timeline-filters__group">
              <span className="ft-timeline-filters__label">GEN:</span>
              <select
                className="ft-timeline-select"
                value={selectedGen}
                onChange={(e) => setSelectedGen(e.target.value)}
                aria-label="Filter by generation"
              >
                <option value="all">All Generations</option>
                {filterOptions.generations.map((g) => (
                  <option key={g} value={g}>
                    GEN {g + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="ft-timeline-filters__reset-btn"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Dynamic Era Navigation Jump Rail */}
        {eras.length > 1 && (
          <div className="ft-timeline-era-rail" aria-label="Era Navigation">
            <span className="ft-timeline-era-rail__label">ERAS:</span>
            <button
              type="button"
              className={`ft-timeline-era-chip ${selectedEra === 'all' ? 'ft-timeline-era-chip--active' : ''}`}
              onClick={() => setSelectedEra('all')}
            >
              All Eras
            </button>
            {eras.map((era) => (
              <button
                key={era.id}
                type="button"
                className={`ft-timeline-era-chip ${selectedEra === era.id ? 'ft-timeline-era-chip--active' : ''}`}
                onClick={() => setSelectedEra(era.id)}
                title={`${era.name} (${era.displayRange})`}
              >
                <span>{era.name}</span>
                <small>{era.displayRange}</small>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Main Timeline Stream */}
      <main className="ft-timeline-body">
        {filteredEvents.length === 0 ? (
          <div className="ft-timeline-empty">
            <div className="ft-timeline-empty__icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className="ft-timeline-empty__title">Your family&apos;s story is just beginning.</h2>
            <p className="ft-timeline-empty__desc">
              {hasActiveFilters
                ? 'No life events match the selected filters. Try clearing or expanding your selection.'
                : 'Document births, weddings, careers, travels, and key milestones to build your living chronological archive.'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className="ft-timeline-empty__btn"
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            ) : (
              onOpenAddEvent && (
                <button
                  type="button"
                  className="ft-timeline-empty__btn"
                  onClick={() => onOpenAddEvent()}
                >
                  + Add First Life Event
                </button>
              )
            )}
          </div>
        ) : (
          <div className="ft-timeline-stream">
            {groupedEventsByEra.map((group) => (
              <section key={group.era.id} className="ft-timeline-era-section" aria-label={group.era.name}>
                {/* Era Divider Banner */}
                <ScrollReveal duration={240} distance={10} isReducedMotion={isReducedMotion}>
                  <div className="ft-timeline-era-banner">
                    <div className="ft-timeline-era-banner__marker" />
                    <div className="ft-timeline-era-banner__info">
                      <span className="ft-timeline-era-banner__range">{group.era.displayRange}</span>
                      <h2 className="ft-timeline-era-banner__title">{group.era.name}</h2>
                      {group.era.subtitle && (
                        <p className="ft-timeline-era-banner__subtitle">{group.era.subtitle}</p>
                      )}
                    </div>
                    <span className="ft-timeline-era-banner__count">
                      {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>
                </ScrollReveal>

                {/* Event Cards in Era */}
                <div className="ft-timeline-era-cards">
                  {group.events.map((event) => (
                    <ScrollReveal key={event.id} duration={260} distance={12} isReducedMotion={isReducedMotion}>
                      <TimelineEventCard
                        event={event}
                        onSelectEvent={setActiveDetailEvent}
                        onNavigateToPerson={onNavigateToPerson}
                        onOpenPhoto={onOpenPhoto}
                      />
                    </ScrollReveal>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Event Detail Modal */}
      {activeDetailEvent && (
        <EventDetailModal
          event={activeDetailEvent}
          onClose={() => setActiveDetailEvent(null)}
          onNavigateToPerson={onNavigateToPerson}
          onOpenPhoto={onOpenPhoto}
        />
      )}
    </div>
  );
}
