/**
 * FamilyArchiveView.jsx — Medida's Family (Milestone M4D)
 * 
 * Premium Global Album & Archive Experience.
 * Unifies Photographs, Archival Documents, Stories, Events, and People
 * into a private, curated digital family archive.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import { PHOTO_BUCKET } from '../../media/mediaStorageService.js';
import UserProfileMenu from '../UserProfileMenu.jsx';
import {
  deriveArchiveEras,
  enrichArchivePhoto,
  enrichArchiveDocument,
  selectFeaturedMedia,
  getRecentArchiveMedia,
  getPersonCollections,
  getEventCollections,
  filterArchivePhotos,
  filterArchiveDocuments,
  getAvailableArchiveFilters,
} from '../../archive/familyArchiveEngine.js';

// Lazy-loaded secure photo thumbnail
function ArchivePhotoCard({
  photo,
  allPhotos,
  index,
  onOpenLightbox,
  onNavigateToPerson,
  onNavigateToEvent,
  onNavigateToStory,
  isFeatured = false,
}) {
  const storagePath = photo?.storage_path || photo?.storagePath || '';
  const resolvedUrl = useMediaUrl(storagePath, photo?.src || '', PHOTO_BUCKET);
  const src = resolvedUrl || photo?.src || '';

  return (
    <article
      className={`ft-archive-photo-card ${isFeatured ? 'ft-archive-photo-card--featured' : ''}`}
      onClick={() => onOpenLightbox && onOpenLightbox(allPhotos, index)}
      role="button"
      tabIndex={0}
      aria-label={`View photo: ${photo.title || 'Family photograph'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onOpenLightbox) onOpenLightbox(allPhotos, index);
        }
      }}
    >
      <div className="ft-archive-photo-card__media-wrap">
        {src ? (
          <img
            src={src}
            alt={photo.title || 'Family photograph'}
            className="ft-archive-photo-card__img"
            loading="lazy"
          />
        ) : (
          <div className="ft-archive-photo-card__placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {photo.year && (
          <span className="ft-archive-badge ft-archive-badge--year">{photo.year}</span>
        )}
        {photo.isPrimary && (
          <span className="ft-archive-badge ft-archive-badge--primary">Primary Portrait</span>
        )}
      </div>

      <div className="ft-archive-photo-card__body">
        <h4 className="ft-archive-photo-card__title">{photo.title || 'Family Photograph'}</h4>
        {photo.caption && (
          <p className="ft-archive-photo-card__caption">{photo.caption}</p>
        )}

        <div className="ft-archive-photo-card__meta">
          {photo.location && (
            <span className="ft-archive-photo-card__loc">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {photo.location}
            </span>
          )}
        </div>

        {/* Relational Context Chips */}
        <div className="ft-archive-context-row" onClick={(e) => e.stopPropagation()}>
          {photo.primaryPerson && (
            <button
              type="button"
              className="ft-archive-chip ft-archive-chip--person"
              onClick={() => onNavigateToPerson && onNavigateToPerson(photo.primaryPerson.id)}
              title={`View ${photo.primaryPerson.displayName} in tree`}
            >
              <span className="ft-archive-chip__avatar">
                {photo.primaryPerson.firstName ? photo.primaryPerson.firstName[0].toUpperCase() : 'P'}
              </span>
              <span>{photo.primaryPerson.displayName}</span>
            </button>
          )}

          {photo.associatedEvent && (
            <button
              type="button"
              className="ft-archive-chip ft-archive-chip--event"
              onClick={() => onNavigateToEvent && onNavigateToEvent(photo.associatedEvent.id)}
              title={`View event: ${photo.associatedEvent.title}`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{photo.associatedEvent.title}</span>
            </button>
          )}

          {photo.associatedStory && (
            <button
              type="button"
              className="ft-archive-chip ft-archive-chip--story"
              onClick={() => onNavigateToStory && onNavigateToStory(photo.associatedStory.id)}
              title={`Read story: ${photo.associatedStory.title}`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>Story</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// Secure document card
function ArchiveDocumentCard({
  document,
  onOpenDocumentViewer,
  onNavigateToPerson,
  onNavigateToEvent,
  onNavigateToStory,
}) {
  const docTypeLabel = document.type || document.docType || 'Historical Record';

  return (
    <article
      className="ft-archive-doc-card"
      onClick={() => onOpenDocumentViewer && onOpenDocumentViewer(document)}
      role="button"
      tabIndex={0}
      aria-label={`View document: ${document.name || 'Archival document'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onOpenDocumentViewer) onOpenDocumentViewer(document);
        }
      }}
    >
      <div className="ft-archive-doc-card__header">
        <div className="ft-archive-doc-card__icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div className="ft-archive-doc-card__type-tags">
          <span className="ft-archive-badge ft-archive-badge--doc">{docTypeLabel}</span>
          {document.year && (
            <span className="ft-archive-badge ft-archive-badge--year">{document.year}</span>
          )}
        </div>
      </div>

      <div className="ft-archive-doc-card__body">
        <h4 className="ft-archive-doc-card__name">{document.name || 'Archival Document'}</h4>
        {document.description && (
          <p className="ft-archive-doc-card__desc">{document.description}</p>
        )}

        <div className="ft-archive-context-row" onClick={(e) => e.stopPropagation()}>
          {document.primaryPerson && (
            <button
              type="button"
              className="ft-archive-chip ft-archive-chip--person"
              onClick={() => onNavigateToPerson && onNavigateToPerson(document.primaryPerson.id)}
              title={`View ${document.primaryPerson.displayName} in tree`}
            >
              <span className="ft-archive-chip__avatar">
                {document.primaryPerson.firstName ? document.primaryPerson.firstName[0].toUpperCase() : 'P'}
              </span>
              <span>{document.primaryPerson.displayName}</span>
            </button>
          )}

          {document.associatedEvent && (
            <button
              type="button"
              className="ft-archive-chip ft-archive-chip--event"
              onClick={() => onNavigateToEvent && onNavigateToEvent(document.associatedEvent.id)}
              title={`View event: ${document.associatedEvent.title}`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{document.associatedEvent.title}</span>
            </button>
          )}

          {document.associatedStory && (
            <button
              type="button"
              className="ft-archive-chip ft-archive-chip--story"
              onClick={() => onNavigateToStory && onNavigateToStory(document.associatedStory.id)}
              title={`Read story: ${document.associatedStory.title}`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>Story</span>
            </button>
          )}
        </div>
      </div>

      <div className="ft-archive-doc-card__footer">
        <span className="ft-archive-doc-card__view-action">
          <span>Inspect Document</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </article>
  );
}

// Person archive collection card
function PersonCollectionCard({ collection, onSelectPerson, onFilterByPerson }) {
  const { person, photos, documents, stories } = collection;
  const avatarUrl = person.photoUrl || person.photo || '';
  const initial = person.firstName ? person.firstName[0].toUpperCase() : '?';

  return (
    <div className="ft-archive-person-card">
      <div className="ft-archive-person-card__header">
        <div className="ft-archive-person-card__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={person.displayName} className="ft-archive-person-card__avatar-img" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="ft-archive-person-card__title-wrap">
          <h4 className="ft-archive-person-card__name">{person.displayName}</h4>
          <span className="ft-archive-person-card__dates">
            {person.dateOfBirth ? person.dateOfBirth.split('-')[0] : '—'}
            {person.isDeceased ? ` – ${person.dateOfDeath ? person.dateOfDeath.split('-')[0] : 'Deceased'}` : ''}
          </span>
        </div>
      </div>

      <div className="ft-archive-person-card__counts">
        <span className="ft-archive-count-pill">
          <strong>{photos.length}</strong> {photos.length === 1 ? 'photo' : 'photos'}
        </span>
        <span className="ft-archive-count-pill">
          <strong>{documents.length}</strong> {documents.length === 1 ? 'record' : 'records'}
        </span>
        <span className="ft-archive-count-pill">
          <strong>{stories.length}</strong> {stories.length === 1 ? 'story' : 'stories'}
        </span>
      </div>

      <div className="ft-archive-person-card__actions">
        <button
          type="button"
          className="ft-archive-btn ft-archive-btn--secondary"
          onClick={() => onFilterByPerson && onFilterByPerson(person.id)}
        >
          Browse Records
        </button>
        <button
          type="button"
          className="ft-archive-btn ft-archive-btn--ghost"
          onClick={() => onSelectPerson && onSelectPerson(person.id)}
        >
          View in Tree
        </button>
      </div>
    </div>
  );
}

// Event archive collection card
function EventCollectionCard({ eventCol, onSelectEvent, onFilterByEvent }) {
  const { event, year, photos, documents, stories } = eventCol;

  return (
    <div className="ft-archive-event-card">
      <div className="ft-archive-event-card__header">
        <span className="ft-archive-badge ft-archive-badge--event">{event.type || 'Milestone'}</span>
        {year && <span className="ft-archive-badge ft-archive-badge--year">{year}</span>}
      </div>

      <h4 className="ft-archive-event-card__title">{event.title}</h4>
      {event.location && (
        <p className="ft-archive-event-card__loc">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {event.location}
        </p>
      )}
      {event.description && (
        <p className="ft-archive-event-card__desc">{event.description}</p>
      )}

      <div className="ft-archive-event-card__counts">
        {photos.length > 0 && <span>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>}
        {documents.length > 0 && <span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>}
        {stories.length > 0 && <span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>}
      </div>

      <div className="ft-archive-event-card__actions">
        <button
          type="button"
          className="ft-archive-btn ft-archive-btn--secondary"
          onClick={() => onFilterByEvent && onFilterByEvent(event.id)}
        >
          View Media
        </button>
        <button
          type="button"
          className="ft-archive-btn ft-archive-btn--ghost"
          onClick={() => onSelectEvent && onSelectEvent(event.id)}
        >
          Timeline
        </button>
      </div>
    </div>
  );
}

export default function FamilyArchiveView({
  store,
  onNavigateToPerson,
  onNavigateToEvent,
  onNavigateToStory,
  onOpenPhoto,
  onOpenDocumentViewer,
  onReturnToTree,
  onOpenSearch,
  onOpenAddPhoto,
  onOpenAddDocument,
  canEdit = true,
  initialSection = 'overview',
  activeView = 'archive',
  onNavigateView,
  isLocalMode = false,
}) {
  const [activeSection, setActiveSection] = useState(initialSection); // 'overview' | 'photos' | 'documents' | 'people' | 'events' | 'eras'
  const [selectedPersonFilter, setSelectedPersonFilter] = useState('all');
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('all');
  const [selectedDocTypeFilter, setSelectedDocTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract raw store collections safely
  const rawPeople = useMemo(() => (store?.getAllPersons ? store.getAllPersons() : []), [store]);
  const rawPhotos = useMemo(() => (store?.getAllPhotos ? store.getAllPhotos() : store?.photos || []), [store]);
  const rawDocs = useMemo(() => (store?.getAllDocuments ? store.getAllDocuments() : store?.documents || []), [store]);
  const rawStories = useMemo(() => (store?.getAllStories ? store.getAllStories() : store?.stories || []), [store]);
  const rawEvents = useMemo(() => (store?.getAllLifeEvents ? store.getAllLifeEvents() : store?.lifeEvents || []), [store]);
  const genMap = useMemo(() => (store?.calculateGenerations ? store.calculateGenerations() : new Map()), [store]);

  // Context bundle for derivations
  const derivationContext = useMemo(() => ({
    people: rawPeople,
    lifeEvents: rawEvents,
    stories: rawStories,
    genMap,
  }), [rawPeople, rawEvents, rawStories, genMap]);

  // Enrich photos & documents dynamically
  const enrichedPhotos = useMemo(() => {
    return rawPhotos.map((p) => enrichArchivePhoto(p, derivationContext));
  }, [rawPhotos, derivationContext]);

  const enrichedDocs = useMemo(() => {
    return rawDocs.map((d) => enrichArchiveDocument(d, derivationContext));
  }, [rawDocs, derivationContext]);

  // Derived collections & metrics
  const featured = useMemo(() => {
    return selectFeaturedMedia(enrichedPhotos, enrichedDocs, 4);
  }, [enrichedPhotos, enrichedDocs]);

  const recentMedia = useMemo(() => {
    return getRecentArchiveMedia(enrichedPhotos, enrichedDocs, 6);
  }, [enrichedPhotos, enrichedDocs]);

  const personCollections = useMemo(() => {
    return getPersonCollections(rawPeople, enrichedPhotos, enrichedDocs, rawStories, rawEvents);
  }, [rawPeople, enrichedPhotos, enrichedDocs, rawStories, rawEvents]);

  const eventCollections = useMemo(() => {
    return getEventCollections(rawEvents, enrichedPhotos, enrichedDocs, rawStories);
  }, [rawEvents, enrichedPhotos, enrichedDocs, rawStories]);

  const allYears = useMemo(() => {
    const years = [];
    enrichedPhotos.forEach((p) => p.year && years.push(p.year));
    enrichedDocs.forEach((d) => d.year && years.push(d.year));
    return years;
  }, [enrichedPhotos, enrichedDocs]);

  const eras = useMemo(() => {
    return deriveArchiveEras(allYears);
  }, [allYears]);

  const availableFilters = useMemo(() => {
    return getAvailableArchiveFilters(enrichedPhotos, enrichedDocs, rawPeople, rawEvents);
  }, [enrichedPhotos, enrichedDocs, rawPeople, rawEvents]);

  // Filtered Photos
  const filteredPhotos = useMemo(() => {
    return filterArchivePhotos(enrichedPhotos, {
      personId: selectedPersonFilter,
      eventId: selectedEventFilter,
      year: selectedYearFilter,
      location: selectedLocationFilter,
      search: searchQuery,
    });
  }, [enrichedPhotos, selectedPersonFilter, selectedEventFilter, selectedYearFilter, selectedLocationFilter, searchQuery]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return filterArchiveDocuments(enrichedDocs, {
      personId: selectedPersonFilter,
      docType: selectedDocTypeFilter,
      year: selectedYearFilter,
      search: searchQuery,
    });
  }, [enrichedDocs, selectedPersonFilter, selectedDocTypeFilter, selectedYearFilter, searchQuery]);

  // Quick filter handlers
  const handleFilterByPerson = useCallback((personId) => {
    setSelectedPersonFilter(String(personId));
    setActiveSection('photos');
  }, []);

  const handleFilterByEvent = useCallback((eventId) => {
    setSelectedEventFilter(String(eventId));
    setActiveSection('photos');
  }, []);

  const handleFilterByEra = useCallback((_era) => {
    // Select year filter or switch to photos
    setActiveSection('photos');
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedPersonFilter('all');
    setSelectedEventFilter('all');
    setSelectedYearFilter('all');
    setSelectedLocationFilter('all');
    setSelectedDocTypeFilter('all');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = selectedPersonFilter !== 'all' ||
    selectedEventFilter !== 'all' ||
    selectedYearFilter !== 'all' ||
    selectedLocationFilter !== 'all' ||
    selectedDocTypeFilter !== 'all' ||
    Boolean(searchQuery.trim());

  return (
    <div className="ft-archive-view" role="region" aria-label="Global Family Album & Archive">
      {/* Editorial Header */}
      <header className="ft-archive-header">
        <div className="ft-archive-header__content">
          <div className="ft-archive-header__top-row">
            <div className="ft-archive-header__badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>FAMILY REPOSITORY</span>
            </div>

            <div className="ft-archive-header__actions">
              <button
                type="button"
                className="ft-archive-header__btn ft-archive-header__btn--search"
                onClick={onOpenSearch}
                title="Search Archive (Ctrl+K)"
                aria-label="Open global search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search</span>
                <kbd>⌘K</kbd>
              </button>

              {canEdit && (
                <>
                  <button
                    type="button"
                    className="ft-archive-header__btn ft-archive-header__btn--add"
                    onClick={onOpenAddPhoto}
                    title="Upload Photograph"
                    aria-label="Upload Photograph"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add Photo</span>
                  </button>
                  <button
                    type="button"
                    className="ft-archive-header__btn ft-archive-header__btn--add"
                    onClick={onOpenAddDocument}
                    title="Add Archival Document"
                    aria-label="Add Archival Document"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add Document</span>
                  </button>
                </>
              )}

              <UserProfileMenu
                activeView={activeView}
                onNavigateView={onNavigateView}
                isLocalMode={isLocalMode}
              />

              <button
                type="button"
                className="ft-archive-header__btn ft-archive-header__btn--close"
                onClick={onReturnToTree}
                title="Return to Tree"
                aria-label="Return to interactive tree"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <h1 className="ft-archive-header__title">MEDIDA'S ARCHIVE</h1>
          <p className="ft-archive-header__tagline">
            Photographs, documents, stories and moments preserved across generations.
          </p>

          <div className="ft-archive-header__stats">
            <span className="ft-archive-header__stat">
              <strong>{enrichedPhotos.length}</strong> Photographs
            </span>
            <span className="ft-archive-header__stat-sep">/</span>
            <span className="ft-archive-header__stat">
              <strong>{enrichedDocs.length}</strong> Archival Documents
            </span>
            <span className="ft-archive-header__stat-sep">/</span>
            <span className="ft-archive-header__stat">
              <strong>{personCollections.length}</strong> Family Members
            </span>
            <span className="ft-archive-header__stat-sep">/</span>
            <span className="ft-archive-header__stat">
              <strong>{eras.length}</strong> Historical Eras
            </span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <nav className="ft-archive-nav" aria-label="Archive sections">
          <div className="ft-archive-nav__tabs">
            <button
              type="button"
              className={`ft-archive-nav__tab ${activeSection === 'overview' ? 'ft-archive-nav__tab--active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className={`ft-archive-nav__tab ${activeSection === 'photos' ? 'ft-archive-nav__tab--active' : ''}`}
              onClick={() => setActiveSection('photos')}
            >
              Photographs ({enrichedPhotos.length})
            </button>
            <button
              type="button"
              className={`ft-archive-nav__tab ${activeSection === 'documents' ? 'ft-archive-nav__tab--active' : ''}`}
              onClick={() => setActiveSection('documents')}
            >
              Documents ({enrichedDocs.length})
            </button>
            <button
              type="button"
              className={`ft-archive-nav__tab ${activeSection === 'people' ? 'ft-archive-nav__tab--active' : ''}`}
              onClick={() => setActiveSection('people')}
            >
              By Person
            </button>
            <button
              type="button"
              className={`ft-archive-nav__tab ${activeSection === 'events' ? 'ft-archive-nav__tab--active' : ''}`}
              onClick={() => setActiveSection('events')}
            >
              By Event
            </button>
            <button
              type="button"
              className={`ft-archive-nav__tab ${activeSection === 'eras' ? 'ft-archive-nav__tab--active' : ''}`}
              onClick={() => setActiveSection('eras')}
            >
              By Era
            </button>
          </div>
        </nav>
      </header>

      {/* Filter Toolbar (Visible when browsing photos or documents) */}
      {(activeSection === 'photos' || activeSection === 'documents') && (
        <section className="ft-archive-toolbar" aria-label="Archive filters">
          <div className="ft-archive-toolbar__search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="ft-archive-toolbar__input"
              placeholder={`Filter ${activeSection === 'photos' ? 'photos' : 'documents'} by title, caption, location...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter archive items"
            />
            {searchQuery && (
              <button
                type="button"
                className="ft-archive-toolbar__clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
              >
                ×
              </button>
            )}
          </div>

          <div className="ft-archive-toolbar__filters">
            {/* Person Filter */}
            <select
              className="ft-archive-select"
              value={selectedPersonFilter}
              onChange={(e) => setSelectedPersonFilter(e.target.value)}
              aria-label="Filter by person"
            >
              <option value="all">All Family Members</option>
              {availableFilters.people.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              className="ft-archive-select"
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              aria-label="Filter by year"
            >
              <option value="all">All Years</option>
              {availableFilters.years.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
              <option value="undated">Undated Archive</option>
            </select>

            {/* Photo-specific: Event & Location */}
            {activeSection === 'photos' && (
              <>
                {availableFilters.events.length > 0 && (
                  <select
                    className="ft-archive-select"
                    value={selectedEventFilter}
                    onChange={(e) => setSelectedEventFilter(e.target.value)}
                    aria-label="Filter by event"
                  >
                    <option value="all">All Events</option>
                    {availableFilters.events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                )}

                {availableFilters.locations.length > 0 && (
                  <select
                    className="ft-archive-select"
                    value={selectedLocationFilter}
                    onChange={(e) => setSelectedLocationFilter(e.target.value)}
                    aria-label="Filter by location"
                  >
                    <option value="all">All Locations</option>
                    {availableFilters.locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              </>
            )}

            {/* Document-specific: Doc Type */}
            {activeSection === 'documents' && availableFilters.docTypes.length > 0 && (
              <select
                className="ft-archive-select"
                value={selectedDocTypeFilter}
                onChange={(e) => setSelectedDocTypeFilter(e.target.value)}
                aria-label="Filter by document type"
              >
                <option value="all">All Document Types</option>
                {availableFilters.docTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                className="ft-archive-toolbar__reset-btn"
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        </section>
      )}

      {/* Main Content Sections */}
      <main className="ft-archive-main">
        {/* ── SECTION 1: OVERVIEW ──────────────────────────────── */}
        {activeSection === 'overview' && (
          <div className="ft-archive-overview">
            {/* Featured Showcase */}
            {featured.heroItem && (
              <section className="ft-archive-featured-hero" aria-label="Featured Archival Treasure">
                <div className="ft-archive-featured-hero__label">
                  <span className="ft-archive-badge ft-archive-badge--primary">FEATURED TREASURE</span>
                </div>
                <div className="ft-archive-featured-hero__card">
                  <ArchivePhotoCard
                    photo={featured.heroItem}
                    allPhotos={enrichedPhotos}
                    index={enrichedPhotos.findIndex((p) => p.id === featured.heroItem.id)}
                    onOpenLightbox={onOpenPhoto}
                    onNavigateToPerson={onNavigateToPerson}
                    onNavigateToEvent={onNavigateToEvent}
                    onNavigateToStory={onNavigateToStory}
                    isFeatured={true}
                  />
                </div>
              </section>
            )}

            {/* Highlights Grid: Recent Acquisitions */}
            <section className="ft-archive-section">
              <div className="ft-archive-section__header">
                <div>
                  <h2 className="ft-archive-section__title">Recent Additions</h2>
                  <p className="ft-archive-section__sub">Recently curated photographs and archival records</p>
                </div>
                <button
                  type="button"
                  className="ft-archive-link-btn"
                  onClick={() => setActiveSection('photos')}
                >
                  View All Photographs →
                </button>
              </div>

              <div className="ft-archive-photo-grid">
                {recentMedia.map((item) => (
                  item.mediaKind === 'document' ? (
                    <ArchiveDocumentCard
                      key={item.id}
                      document={item}
                      onOpenDocumentViewer={onOpenDocumentViewer}
                      onNavigateToPerson={onNavigateToPerson}
                      onNavigateToEvent={onNavigateToEvent}
                      onNavigateToStory={onNavigateToStory}
                    />
                  ) : (
                    <ArchivePhotoCard
                      key={item.id}
                      photo={item}
                      allPhotos={enrichedPhotos}
                      index={enrichedPhotos.findIndex((p) => p.id === item.id)}
                      onOpenLightbox={onOpenPhoto}
                      onNavigateToPerson={onNavigateToPerson}
                      onNavigateToEvent={onNavigateToEvent}
                      onNavigateToStory={onNavigateToStory}
                    />
                  )
                ))}
              </div>
            </section>

            {/* Historical Eras Teaser */}
            <section className="ft-archive-section">
              <div className="ft-archive-section__header">
                <div>
                  <h2 className="ft-archive-section__title">Chronicles Across Time</h2>
                  <p className="ft-archive-section__sub">Discover family history grouped by historical eras</p>
                </div>
                <button
                  type="button"
                  className="ft-archive-link-btn"
                  onClick={() => setActiveSection('eras')}
                >
                  Explore Eras →
                </button>
              </div>

              <div className="ft-archive-eras-grid">
                {eras.map((era) => (
                  <div
                    key={era.id}
                    className="ft-archive-era-card"
                    onClick={() => handleFilterByEra(era)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="ft-archive-badge ft-archive-badge--year">
                      {era.startYear} – {era.endYear}
                    </span>
                    <h3 className="ft-archive-era-card__title">{era.label}</h3>
                    <p className="ft-archive-era-card__desc">{era.description}</p>
                    <span className="ft-archive-era-card__action">Browse Era Media →</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── SECTION 2: PHOTOGRAPHS ───────────────────────────── */}
        {activeSection === 'photos' && (
          <div className="ft-archive-photos-section">
            <div className="ft-archive-results-bar">
              <span className="ft-archive-results-count">
                Showing <strong>{filteredPhotos.length}</strong> of {enrichedPhotos.length} photographs
              </span>
            </div>

            {filteredPhotos.length === 0 ? (
              <div className="ft-archive-empty">
                <p>No photographs match the selected filters.</p>
                {hasActiveFilters && (
                  <button type="button" className="ft-archive-btn ft-archive-btn--secondary" onClick={handleClearFilters}>
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="ft-archive-photo-grid">
                {filteredPhotos.map((photo, idx) => (
                  <ArchivePhotoCard
                    key={photo.id}
                    photo={photo}
                    allPhotos={filteredPhotos}
                    index={idx}
                    onOpenLightbox={onOpenPhoto}
                    onNavigateToPerson={onNavigateToPerson}
                    onNavigateToEvent={onNavigateToEvent}
                    onNavigateToStory={onNavigateToStory}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 3: DOCUMENTS ─────────────────────────────── */}
        {activeSection === 'documents' && (
          <div className="ft-archive-documents-section">
            <div className="ft-archive-results-bar">
              <span className="ft-archive-results-count">
                Showing <strong>{filteredDocuments.length}</strong> of {enrichedDocs.length} archival documents
              </span>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="ft-archive-empty">
                <p>No archival documents match the selected filters.</p>
                {hasActiveFilters && (
                  <button type="button" className="ft-archive-btn ft-archive-btn--secondary" onClick={handleClearFilters}>
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="ft-archive-doc-grid">
                {filteredDocuments.map((doc) => (
                  <ArchiveDocumentCard
                    key={doc.id}
                    document={doc}
                    onOpenDocumentViewer={onOpenDocumentViewer}
                    onNavigateToPerson={onNavigateToPerson}
                    onNavigateToEvent={onNavigateToEvent}
                    onNavigateToStory={onNavigateToStory}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 4: BY PERSON ─────────────────────────────── */}
        {activeSection === 'people' && (
          <div className="ft-archive-people-section">
            <div className="ft-archive-section__header">
              <div>
                <h2 className="ft-archive-section__title">Family Member Repositories</h2>
                <p className="ft-archive-section__sub">Explore archives cataloged for each family member</p>
              </div>
            </div>

            <div className="ft-archive-people-grid">
              {personCollections.map((col) => (
                <PersonCollectionCard
                  key={col.person.id}
                  collection={col}
                  onSelectPerson={onNavigateToPerson}
                  onFilterByPerson={handleFilterByPerson}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 5: BY EVENT ──────────────────────────────── */}
        {activeSection === 'events' && (
          <div className="ft-archive-events-section">
            <div className="ft-archive-section__header">
              <div>
                <h2 className="ft-archive-section__title">Milestone Event Archives</h2>
                <p className="ft-archive-section__sub">Archival memories preserved around life events and family celebrations</p>
              </div>
            </div>

            <div className="ft-archive-events-grid">
              {eventCollections.map((col) => (
                <EventCollectionCard
                  key={col.event.id}
                  eventCol={col}
                  onSelectEvent={onNavigateToEvent}
                  onFilterByEvent={handleFilterByEvent}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 6: BY ERA ────────────────────────────────── */}
        {activeSection === 'eras' && (
          <div className="ft-archive-eras-section">
            <div className="ft-archive-section__header">
              <div>
                <h2 className="ft-archive-section__title">Chronological Eras</h2>
                <p className="ft-archive-section__sub">Dynamically derived eras capturing the evolution of the Medida family</p>
              </div>
            </div>

            <div className="ft-archive-eras-grid">
              {eras.map((era) => (
                <div
                  key={era.id}
                  className="ft-archive-era-card ft-archive-era-card--full"
                  onClick={() => handleFilterByEra(era)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="ft-archive-badge ft-archive-badge--year">
                    {era.startYear} – {era.endYear}
                  </span>
                  <h3 className="ft-archive-era-card__title">{era.label}</h3>
                  <p className="ft-archive-era-card__desc">{era.description}</p>
                  <span className="ft-archive-era-card__action">Browse Media from this Era →</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
