/**
 * FamilyMemoriesView.jsx — Medida's Family (Milestone M4C)
 * 
 * Editorial Landing Experience for Family Memories & Story Experience.
 * Organizes stories into magazine-quality features, dynamic eras/chapters,
 * light discovery filters, and seamless story reader navigation.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import { PHOTO_BUCKET } from '../../media/mediaStorageService.js';
import {
  enrichStory,
  deriveStoryEras,
  getEraForStory,
  selectFeaturedStory,
  filterStories,
  getAvailableStoryFilters,
} from '../../memories/familyStoryEngine.js';
import StoryReaderView from './StoryReaderView.jsx';
import UserProfileMenu from '../UserProfileMenu.jsx';

// Lazy-loaded story card thumbnail
function StoryCardPhoto({ photo, onOpenLightbox }) {
  const storagePath = photo?.storage_path || photo?.storagePath || '';
  const resolvedUrl = useMediaUrl(storagePath, photo?.src || '', PHOTO_BUCKET);

  if (!resolvedUrl && !photo?.src) return null;

  return (
    <div
      className="ft-story-card__media-wrap"
      onClick={(e) => {
        e.stopPropagation();
        onOpenLightbox && onOpenLightbox([photo], 0);
      }}
      role="button"
      tabIndex={0}
      aria-label="View photo in lightbox"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          onOpenLightbox && onOpenLightbox([photo], 0);
        }
      }}
    >
      <img
        src={resolvedUrl || photo?.src}
        alt={photo?.title || 'Story photo'}
        className="ft-story-card__img"
        loading="lazy"
      />
    </div>
  );
}

// Story Card component
function StoryCard({ story, onSelectStory, onNavigateToPerson, onOpenLightbox }) {
  const initial = story.primaryPerson?.firstName ? story.primaryPerson.firstName[0].toUpperCase() : '?';
  const relatedCount = story.relatedPeople?.length || 0;

  return (
    <article
      className="ft-story-card"
      onClick={() => onSelectStory(story.id)}
      role="button"
      tabIndex={0}
      aria-label={`Open story: ${story.title}`}
      onKeyDown={(e) => e.key === 'Enter' && onSelectStory(story.id)}
    >
      {/* Optional Photo Header */}
      {story.associatedPhoto && (
        <StoryCardPhoto photo={story.associatedPhoto} onOpenLightbox={onOpenLightbox} />
      )}

      <div className="ft-story-card__content">
        {/* Card Metadata */}
        <div className="ft-story-card__meta">
          {story.year && <span className="ft-story-card__year">{story.year}</span>}
          {story.location && <span className="ft-story-card__loc">&bull; {story.location}</span>}
          <span className="ft-story-card__reading-time">{story.readingTimeMinutes || 1}m read</span>
        </div>

        {/* Card Title */}
        <h3 className="ft-story-card__title">{story.title}</h3>

        {/* Card Narrator */}
        {story.narrator && (
          <p className="ft-story-card__narrator">Told by {story.narrator}</p>
        )}

        {/* Card Excerpt */}
        <p className="ft-story-card__excerpt">
          {story.content?.length > 150 ? `${story.content.slice(0, 150)}...` : story.content}
        </p>

        {/* Card Footer with Person & Relatives */}
        <div className="ft-story-card__footer">
          {story.primaryPerson && (
            <div
              className="ft-story-card__person-chip"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToPerson && onNavigateToPerson(story.primaryPerson.id);
              }}
              role="button"
              tabIndex={0}
              title={`Focus ${story.primaryPerson.displayName} in Tree`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onNavigateToPerson && onNavigateToPerson(story.primaryPerson.id);
                }
              }}
            >
              <div className="ft-story-card__avatar">
                {story.primaryPerson.photo ? (
                  <img src={story.primaryPerson.photo} alt="" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <span className="ft-story-card__person-name">{story.primaryPerson.displayName}</span>
            </div>
          )}

          {relatedCount > 0 && (
            <span className="ft-story-card__related-badge">
              +{relatedCount} {relatedCount === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FamilyMemoriesView({
  store,
  activeStoryId = null,
  onSelectStoryId,
  onNavigateToPerson,
  onNavigateToEvent,
  onOpenPhoto,
  onOpenDocumentViewer,
  onReturnToTree,
  onOpenSearch,
  onOpenAddStory,
  onEditStory,
  onDeleteStory,
  canEdit = true,
  activeView = 'memories',
  onNavigateView,
  isLocalMode = false,
}) {
  const [storeVersion, setStoreVersion] = useState(0);

  // Subscribe to FamilyStore updates
  useEffect(() => {
    if (store && typeof store.subscribe === 'function') {
      return store.subscribe(() => setStoreVersion((v) => v + 1));
    }
  }, [store]);

  // Load and enrich all stories
  const enrichedStories = useMemo(() => {
    const rawStories = store?.getAllStories ? store.getAllStories() : (store?.stories || []);
    return rawStories.map((s) => enrichStory(s, store));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, storeVersion]);

  // Derive dynamic eras from actual event and story dates
  const eras = useMemo(() => {
    const events = store?.getAllLifeEvents ? store.getAllLifeEvents() : (store?.lifeEvents || []);
    return deriveStoryEras(enrichedStories, events);
  }, [store, enrichedStories]);

  // Extract available filter choices
  const filterOptions = useMemo(() => {
    return getAvailableStoryFilters(enrichedStories, store, eras);
  }, [enrichedStories, store, eras]);

  // Active filters state
  const [selectedPersonId, setSelectedPersonId] = useState('all');
  const [selectedGen, setSelectedGen] = useState('all');
  const [selectedEra, setSelectedEra] = useState('all');
  const [selectedLoc, setSelectedLoc] = useState('all');

  // Filtered stories list
  const filteredStories = useMemo(() => {
    return filterStories(
      enrichedStories,
      {
        personId: selectedPersonId,
        generation: selectedGen,
        eraId: selectedEra,
        location: selectedLoc,
      },
      store,
      eras
    );
  }, [enrichedStories, selectedPersonId, selectedGen, selectedEra, selectedLoc, store, eras]);

  // Featured story selection
  const featuredStory = useMemo(() => {
    return selectFeaturedStory(enrichedStories);
  }, [enrichedStories]);

  // Group filtered stories by dynamic Era / Chapter
  const groupedStoriesByEra = useMemo(() => {
    const map = new Map();
    eras.forEach((era) => {
      map.set(era.id, { era, stories: [] });
    });
    const undatedGroup = {
      era: {
        id: 'undated',
        name: 'UNDATED MEMORIES',
        subtitle: 'Oral recollections and timeless family lore',
        displayRange: 'Timeless',
      },
      stories: [],
    };

    filteredStories.forEach((story) => {
      const era = getEraForStory(story, eras);
      if (era && map.has(era.id)) {
        map.get(era.id).stories.push(story);
      } else {
        undatedGroup.stories.push(story);
      }
    });

    const list = Array.from(map.values()).filter((g) => g.stories.length > 0);
    if (undatedGroup.stories.length > 0) {
      list.push(undatedGroup);
    }
    return list;
  }, [eras, filteredStories]);

  const hasActiveFilters =
    selectedPersonId !== 'all' ||
    selectedGen !== 'all' ||
    selectedEra !== 'all' ||
    selectedLoc !== 'all';

  const handleResetFilters = useCallback(() => {
    setSelectedPersonId('all');
    setSelectedGen('all');
    setSelectedEra('all');
    setSelectedLoc('all');
  }, []);

  // Active reader story resolution
  const activeStory = useMemo(() => {
    if (!activeStoryId) return null;
    return enrichedStories.find((s) => String(s.id) === String(activeStoryId)) || null;
  }, [activeStoryId, enrichedStories]);

  // If a story is currently being read, render dedicated reader view
  if (activeStoryId) {
    return (
      <StoryReaderView
        story={activeStory}
        allStories={enrichedStories}
        onClose={() => onSelectStoryId && onSelectStoryId(null)}
        onSelectStory={(id) => onSelectStoryId && onSelectStoryId(id)}
        onNavigateToPerson={onNavigateToPerson}
        onNavigateToEvent={onNavigateToEvent}
        onOpenLightbox={onOpenPhoto}
        onOpenDocumentViewer={onOpenDocumentViewer}
        onEditStory={onEditStory}
        onDeleteStory={onDeleteStory}
        canEdit={canEdit}
      />
    );
  }

  return (
    <div className="ft-memories-container" role="main" aria-label="Family Memories">
      {/* Top Header Bar */}
      <header className="ft-memories-header">
        <div className="ft-memories-header__left">
          <button
            type="button"
            className="ft-memories-back-btn"
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

          <div className="ft-memories-header__title-group">
            <h1 className="ft-memories-header__title">Family Memories</h1>
            <span className="ft-memories-header__count-badge">
              {filteredStories.length} {filteredStories.length === 1 ? 'Story' : 'Stories'}
            </span>
          </div>
        </div>

        <div className="ft-memories-header__actions">
          {onOpenSearch && (
            <button
              type="button"
              className="ft-memories-search-trigger"
              onClick={onOpenSearch}
              aria-label="Search memories (Ctrl+K)"
              title="Search memories (Ctrl+K)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search...</span>
              <kbd>⌘K</kbd>
            </button>
          )}

          {canEdit && onOpenAddStory && (
            <button
              type="button"
              className="ft-memories-add-btn"
              onClick={() => onOpenAddStory()}
              aria-label="Record a family memory"
              title="Record a memory"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Record Memory</span>
            </button>
          )}

          <UserProfileMenu
            activeView={activeView}
            onNavigateView={onNavigateView}
            isLocalMode={isLocalMode}
          />
        </div>
      </header>

      {/* Editorial Masthead Hero Banner */}
      <section className="ft-memories-masthead">
        <span className="ft-memories-masthead__eyebrow">MEDIDA'S ARCHIVE</span>
        <h2 className="ft-memories-masthead__title">Medida's Memories</h2>
        <p className="ft-memories-masthead__subtitle">
          Stories, people, places, and moments that shaped our family.
        </p>
      </section>

      {/* Featured Story Hero (if stories exist and not filtered down to 0) */}
      {featuredStory && !hasActiveFilters && (
        <section className="ft-memories-featured" aria-label="Featured family story">
          <div
            className="ft-memories-featured__card"
            onClick={() => onSelectStoryId && onSelectStoryId(featuredStory.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectStoryId && onSelectStoryId(featuredStory.id)}
          >
            {/* Featured Image Col */}
            {featuredStory.associatedPhoto && (
              <div className="ft-memories-featured__media-col">
                <StoryCardPhoto photo={featuredStory.associatedPhoto} onOpenLightbox={onOpenPhoto} />
              </div>
            )}

            {/* Featured Info Col */}
            <div className="ft-memories-featured__info-col">
              <div className="ft-memories-featured__tag">FEATURED MEMORY</div>

              <h3 className="ft-memories-featured__title">{featuredStory.title}</h3>

              <div className="ft-memories-featured__byline">
                {featuredStory.narrator && <span>Told by {featuredStory.narrator}</span>}
                {featuredStory.year && <span>&bull; {featuredStory.year}</span>}
                {featuredStory.location && <span>&bull; {featuredStory.location}</span>}
              </div>

              <p className="ft-memories-featured__excerpt">
                {featuredStory.content?.slice(0, 260)}...
              </p>

              <div className="ft-memories-featured__cta">
                <span className="ft-memories-featured__read-btn">
                  Read the full story &rarr;
                </span>
                {featuredStory.primaryPerson && (
                  <span className="ft-memories-featured__person-tag">
                    {featuredStory.primaryPerson.displayName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lightweight Filter Bar */}
      <nav className="ft-memories-filter-bar" aria-label="Filter memories">
        <div className="ft-memories-filter-group">
          {/* Person Filter */}
          {filterOptions.people.length > 0 && (
            <div className="ft-memories-filter-control">
              <label htmlFor="ft-filter-person">Person:</label>
              <select
                id="ft-filter-person"
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="ft-memories-select"
              >
                <option value="all">All Family Members</option>
                {filterOptions.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Generation Filter */}
          {filterOptions.generations.length > 0 && (
            <div className="ft-memories-filter-control">
              <label htmlFor="ft-filter-gen">Generation:</label>
              <select
                id="ft-filter-gen"
                value={selectedGen}
                onChange={(e) => setSelectedGen(e.target.value)}
                className="ft-memories-select"
              >
                <option value="all">All Generations</option>
                {filterOptions.generations.map((g) => (
                  <option key={g} value={g}>
                    Gen {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Era Filter */}
          {filterOptions.eras.length > 0 && (
            <div className="ft-memories-filter-control">
              <label htmlFor="ft-filter-era">Era:</label>
              <select
                id="ft-filter-era"
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value)}
                className="ft-memories-select"
              >
                <option value="all">All Eras &amp; Chapters</option>
                {filterOptions.eras.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.name} ({era.displayRange})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location Filter */}
          {filterOptions.locations.length > 0 && (
            <div className="ft-memories-filter-control">
              <label htmlFor="ft-filter-loc">Location:</label>
              <select
                id="ft-filter-loc"
                value={selectedLoc}
                onChange={(e) => setSelectedLoc(e.target.value)}
                className="ft-memories-select"
              >
                <option value="all">All Locations</option>
                {filterOptions.locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              className="ft-memories-reset-btn"
              onClick={handleResetFilters}
              aria-label="Clear active filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Stream */}
      <main className="ft-memories-stream">
        {filteredStories.length === 0 ? (
          <div className="ft-memories-empty" role="status">
            <div className="ft-memories-empty__icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            {enrichedStories.length === 0 ? (
              <>
                <h2 className="ft-memories-empty__title">YOUR FAMILY'S STORY IS JUST BEGINNING.</h2>
                <p className="ft-memories-empty__desc">
                  Preserve the voices, journeys, and defining moments of your ancestors.
                </p>
                {canEdit && onOpenAddStory && (
                  <button
                    type="button"
                    className="ft-memories-btn ft-memories-btn--primary"
                    onClick={() => onOpenAddStory()}
                  >
                    + Record a Memory
                  </button>
                )}
              </>
            ) : (
              <>
                <h2 className="ft-memories-empty__title">No memories found for this selection.</h2>
                <p className="ft-memories-empty__desc">
                  Try clearing your filters or selecting a different family member.
                </p>
                <button
                  type="button"
                  className="ft-memories-btn ft-memories-btn--secondary"
                  onClick={handleResetFilters}
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          groupedStoriesByEra.map((group) => (
            <section key={group.era.id} className="ft-memories-era-section" aria-label={group.era.name}>
              {/* Era Chapter Divider */}
              <div className="ft-memories-era-divider">
                <div className="ft-memories-era-divider__left">
                  <span className="ft-memories-era-divider__range">{group.era.displayRange}</span>
                  <h2 className="ft-memories-era-divider__title">{group.era.name}</h2>
                  {group.era.subtitle && (
                    <p className="ft-memories-era-divider__subtitle">{group.era.subtitle}</p>
                  )}
                </div>
                <span className="ft-memories-era-divider__count">
                  {group.stories.length} {group.stories.length === 1 ? 'Memory' : 'Memories'}
                </span>
              </div>

              {/* Story Cards Grid */}
              <div className="ft-memories-cards-grid">
                {group.stories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onSelectStory={(id) => onSelectStoryId && onSelectStoryId(id)}
                    onNavigateToPerson={onNavigateToPerson}
                    onOpenLightbox={onOpenPhoto}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
