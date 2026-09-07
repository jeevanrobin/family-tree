/**
 * GlobalSearchModal Component — Milestone M4A
 *
 * Unified Global Family Search & Discovery Command Palette.
 * Centers on the viewport with backdrop blur, keyboard navigation (Cmd+K, ↑, ↓, ↵, Esc),
 * category filtering, family-scoped search history, lazy signed-URL media resolution,
 * and stale-record protection before navigation.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import familyStore from '../store/FamilyStore.js';
import { useMediaUrl } from '../hooks/useMediaUrl.js';
import { PHOTO_BUCKET } from '../media/mediaStorageService.js';
import { getInitials, getAvatarGradient } from '../utils/familyHelpers.js';

// Lazy avatar thumbnail for people
function PersonSearchAvatar({ person }) {
  const rawPhoto = person?.photo || person?.photoUrl || '';
  const isStoragePath = rawPhoto.startsWith('family/');
  const resolvedPhoto = useMediaUrl(isStoragePath ? rawPhoto : '', rawPhoto, PHOTO_BUCKET);
  const avatarBg = getAvatarGradient(person || {});

  return (
    <div className="ft-gsearch__avatar" style={{ background: avatarBg }}>
      {resolvedPhoto ? (
        <img src={resolvedPhoto} alt={person.displayName} className="ft-gsearch__avatar-img" />
      ) : (
        <span>{getInitials(person || {})}</span>
      )}
    </div>
  );
}

// Lazy photo thumbnail: ONLY resolves signed URL when thumbnail actually renders
function PhotoSearchThumbnail({ photo }) {
  const storagePath = photo?.storage_path || photo?.storagePath || '';
  const resolvedUrl = useMediaUrl(storagePath, photo?.src || '', PHOTO_BUCKET);

  return (
    <div className="ft-gsearch__thumb-wrap">
      {resolvedUrl || photo?.src ? (
        <img src={resolvedUrl || photo?.src} alt={photo?.title || 'Photo'} className="ft-gsearch__thumb-img" />
      ) : (
        <div className="ft-gsearch__thumb-fallback">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Subtle match token highlighter
function HighlightText({ text = '', query = '' }) {
  if (!text || !query.trim()) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = String(text).split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="ft-gsearch__mark">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onNavigatePerson,
  onNavigateStory,
  onNavigateEvent,
  onNavigatePhoto,
  onNavigateDocument,
  onNavigateRelationship,
  familyId = 'local',
}) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'people' | 'stories' | 'events' | 'photos' | 'documents'
  const [activeIndex, setActiveIndex] = useState(0);
  const [staleNotice, setStaleNotice] = useState(null);

  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  // Scoped Recent Searches Storage Key
  const historyStorageKey = useMemo(() => {
    return `family-search-history:${familyId || 'local'}`;
  }, [familyId]);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem(historyStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Reload recent searches if familyId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(historyStorageKey);
      setRecentSearches(saved ? JSON.parse(saved) : []);
    } catch {
      setRecentSearches([]);
    }
  }, [historyStorageKey]);

  const saveRecentSearch = useCallback(
    (term) => {
      const trimmed = term.trim();
      if (!trimmed || trimmed.length < 2) return;
      setRecentSearches((prev) => {
        const next = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
        try {
          localStorage.setItem(historyStorageKey, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    },
    [historyStorageKey]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(historyStorageKey);
    } catch {
      // ignore
    }
  }, [historyStorageKey]);

  // Execute query via FamilyStore searchArchive
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return { totalCount: 0, counts: { all: 0, people: 0, stories: 0, events: 0, photos: 0, documents: 0 }, results: [] };
    }
    return familyStore.searchArchive(query, { filter: activeFilter, limit: 60 });
  }, [query, activeFilter]);

  // Group results by category adhering to the requested hierarchy
  const groupedResults = useMemo(() => {
    const rawResults = searchResults.results || [];
    const groups = [];

    const peopleList = rawResults.filter((r) => r.type === 'person');
    const storiesList = rawResults.filter((r) => r.type === 'story');
    const eventsList = rawResults.filter((r) => r.type === 'event');
    const photosList = rawResults.filter((r) => r.type === 'photo');
    const docsList = rawResults.filter((r) => r.type === 'document');
    const relsList = rawResults.filter((r) => r.type === 'relationship');

    if (peopleList.length > 0) groups.push({ title: 'People', items: peopleList });
    if (storiesList.length > 0) groups.push({ title: 'Stories', items: storiesList });
    if (eventsList.length > 0) groups.push({ title: 'Events', items: eventsList });
    if (photosList.length > 0) groups.push({ title: 'Photos', items: photosList });
    if (docsList.length > 0) groups.push({ title: 'Documents', items: docsList });
    if (relsList.length > 0) groups.push({ title: 'Relationships', items: relsList });

    return groups;
  }, [searchResults]);

  // Flattened array of items for keyboard navigation index calculation
  const flatItems = useMemo(() => {
    return groupedResults.flatMap((g) => g.items);
  }, [groupedResults]);

  // Reset active index when query, filter, or flatItems changes
  useEffect(() => {
    setActiveIndex(0);
    setStaleNotice(null);
  }, [query, activeFilter]);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setActiveFilter('all');
      setStaleNotice(null);
    }
  }, [isOpen]);

  // Execute selection with Stale-Result Protection
  const handleExecuteResult = useCallback(
    (item) => {
      if (!item) return;

      // 1. Verify entity still exists in FamilyStore
      const exists = familyStore.verifyEntityExists(item.type, item.id);
      if (!exists) {
        setStaleNotice(`This ${item.type} was recently removed from the family archive.`);
        return;
      }

      // 2. Record recent search query
      if (query.trim()) {
        saveRecentSearch(query);
      }

      // 3. Close search palette
      onClose();

      // 4. Dispatch specific navigation action
      if (item.type === 'person') {
        onNavigatePerson?.(item.personId || item.id, 'overview');
      } else if (item.type === 'story') {
        onNavigateStory?.(item.raw);
      } else if (item.type === 'event') {
        onNavigateEvent?.(item.raw);
      } else if (item.type === 'photo') {
        onNavigatePhoto?.(item.raw);
      } else if (item.type === 'document') {
        onNavigateDocument?.(item.raw);
      } else if (item.type === 'relationship') {
        onNavigateRelationship?.(item.raw);
      }
    },
    [query, saveRecentSearch, onClose, onNavigatePerson, onNavigateStory, onNavigateEvent, onNavigatePhoto, onNavigateDocument, onNavigateRelationship]
  );

  // Keyboard navigation listener inside modal
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (flatItems.length > 0) {
          setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (flatItems.length > 0) {
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems.length > 0 && flatItems[activeIndex]) {
          handleExecuteResult(flatItems[activeIndex]);
        }
      }
    },
    [isOpen, flatItems, activeIndex, handleExecuteResult, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current && flatItems.length > 0) {
      const activeEl = resultsContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, flatItems.length]);

  if (!isOpen) return null;

  const counts = searchResults.counts;
  let runningIndex = -1;

  return (
    <div className="ft-gsearch-overlay" role="dialog" aria-modal="true" aria-label="Global Family Search & Discovery">
      {/* Dimmed backdrop */}
      <div className="ft-gsearch-backdrop" onClick={onClose} />

      {/* Centered Command Palette */}
      <div className="ft-gsearch-card" onKeyDown={handleKeyDown}>
        {/* Search Input Bar */}
        <div className="ft-gsearch-bar">
          <svg className="ft-gsearch-bar__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            className="ft-gsearch-bar__input"
            placeholder="Search your family (people, stories, events, photos, documents)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
            aria-label="Search family archive"
          />

          {query && (
            <button
              className="ft-gsearch-bar__clear"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}

          <kbd className="ft-gsearch-bar__esc-hint" onClick={onClose}>
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="ft-gsearch-filters" role="tablist" aria-label="Filter results by category">
          <button
            className={`ft-gsearch-filter-btn ${activeFilter === 'all' ? 'ft-gsearch-filter-btn--active' : ''}`}
            onClick={() => setActiveFilter('all')}
            role="tab"
            aria-selected={activeFilter === 'all'}
          >
            All {query.trim() ? `(${counts.all})` : ''}
          </button>
          <button
            className={`ft-gsearch-filter-btn ${activeFilter === 'people' ? 'ft-gsearch-filter-btn--active' : ''}`}
            onClick={() => setActiveFilter('people')}
            role="tab"
            aria-selected={activeFilter === 'people'}
          >
            People {query.trim() ? `(${counts.people})` : ''}
          </button>
          <button
            className={`ft-gsearch-filter-btn ${activeFilter === 'stories' ? 'ft-gsearch-filter-btn--active' : ''}`}
            onClick={() => setActiveFilter('stories')}
            role="tab"
            aria-selected={activeFilter === 'stories'}
          >
            Stories {query.trim() ? `(${counts.stories})` : ''}
          </button>
          <button
            className={`ft-gsearch-filter-btn ${activeFilter === 'events' ? 'ft-gsearch-filter-btn--active' : ''}`}
            onClick={() => setActiveFilter('events')}
            role="tab"
            aria-selected={activeFilter === 'events'}
          >
            Events {query.trim() ? `(${counts.events})` : ''}
          </button>
          <button
            className={`ft-gsearch-filter-btn ${activeFilter === 'photos' ? 'ft-gsearch-filter-btn--active' : ''}`}
            onClick={() => setActiveFilter('photos')}
            role="tab"
            aria-selected={activeFilter === 'photos'}
          >
            Photos {query.trim() ? `(${counts.photos})` : ''}
          </button>
          <button
            className={`ft-gsearch-filter-btn ${activeFilter === 'documents' ? 'ft-gsearch-filter-btn--active' : ''}`}
            onClick={() => setActiveFilter('documents')}
            role="tab"
            aria-selected={activeFilter === 'documents'}
          >
            Documents {query.trim() ? `(${counts.documents})` : ''}
          </button>
        </div>

        {/* Stale Result Alert Notice */}
        {staleNotice && (
          <div className="ft-gsearch-notice" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{staleNotice}</span>
          </div>
        )}

        {/* Body Area */}
        <div className="ft-gsearch-body" ref={resultsContainerRef}>
          {/* State 1: Empty Query — Recent Searches & Quick Suggestions */}
          {!query.trim() && (
            <div className="ft-gsearch-empty-prompt">
              {recentSearches.length > 0 && (
                <div className="ft-gsearch-recent-section">
                  <div className="ft-gsearch-recent-header">
                    <span className="ft-gsearch-recent-title">Recent Searches</span>
                    <button className="ft-gsearch-recent-clear" onClick={clearRecentSearches}>
                      Clear
                    </button>
                  </div>
                  <div className="ft-gsearch-chips">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        className="ft-gsearch-chip"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ft-gsearch-suggestions-section">
                <span className="ft-gsearch-section-label">Quick Suggestions</span>
                <div className="ft-gsearch-chips">
                  {['Venkat', 'Warangal', 'Wedding', 'Engineer', 'Osmania', 'Homestead'].map((term) => (
                    <button
                      key={term}
                      className="ft-gsearch-chip ft-gsearch-chip--suggestion"
                      onClick={() => {
                        setQuery(term);
                        inputRef.current?.focus();
                      }}
                    >
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="ft-gsearch-hint-text">
                Search across family members, life stories, milestone events, archival photos, documents, and relationships.
              </p>
            </div>
          )}

          {/* State 2: No Results Found */}
          {query.trim() && flatItems.length === 0 && (
            <div className="ft-gsearch-no-results">
              <div className="ft-gsearch-no-results__icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h3 className="ft-gsearch-no-results__title">No matches for &ldquo;{query}&rdquo;</h3>
              <div className="ft-gsearch-no-results__tips">
                <span>Try searching for:</span>
                <ul>
                  <li>Another family member name or nickname</li>
                  <li>A hometown, birthplace, or milestone location</li>
                  <li>An event like a wedding, graduation, or birth</li>
                  <li>A life story memory or family occupation</li>
                </ul>
              </div>
            </div>
          )}

          {/* State 3: Categorized Search Results */}
          {query.trim() && flatItems.length > 0 && (
            <div className="ft-gsearch-groups">
              {groupedResults.map((group) => (
                <div key={group.title} className="ft-gsearch-group">
                  <div className="ft-gsearch-group__header">
                    <span className="ft-gsearch-group__title">{group.title}</span>
                    <span className="ft-gsearch-group__line" />
                  </div>

                  <div className="ft-gsearch-group__list">
                    {group.items.map((item) => {
                      runningIndex += 1;
                      const itemIdx = runningIndex;
                      const isSelected = itemIdx === activeIndex;

                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          data-index={itemIdx}
                          className={`ft-gsearch-item ${isSelected ? 'ft-gsearch-item--active' : ''}`}
                          onClick={() => handleExecuteResult(item)}
                          onMouseEnter={() => setActiveIndex(itemIdx)}
                          role="option"
                          aria-selected={isSelected}
                        >
                          {/* Item Cameo / Icon */}
                          <div className="ft-gsearch-item__media">
                            {item.type === 'person' && <PersonSearchAvatar person={item.raw} />}
                            {item.type === 'photo' && <PhotoSearchThumbnail photo={item.raw} />}
                            {item.type === 'story' && (
                              <div className="ft-gsearch-item__icon ft-gsearch-item__icon--story">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                              </div>
                            )}
                            {item.type === 'event' && (
                              <div className="ft-gsearch-item__icon ft-gsearch-item__icon--event">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              </div>
                            )}
                            {item.type === 'document' && (
                              <div className="ft-gsearch-item__icon ft-gsearch-item__icon--document">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <line x1="16" y1="13" x2="8" y2="13" />
                                  <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                              </div>
                            )}
                            {item.type === 'relationship' && (
                              <div className="ft-gsearch-item__icon ft-gsearch-item__icon--rel">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="9" cy="12" r="6" />
                                  <circle cx="15" cy="12" r="6" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Item Meta & Content */}
                          <div className="ft-gsearch-item__info">
                            <div className="ft-gsearch-item__title-row">
                              <span className="ft-gsearch-item__title">
                                <HighlightText text={item.title} query={query} />
                              </span>
                              {item.date && <span className="ft-gsearch-item__date">{item.date}</span>}
                            </div>

                            {item.subtitle && (
                              <div className="ft-gsearch-item__subtitle">
                                <HighlightText text={item.subtitle} query={query} />
                              </div>
                            )}

                            {/* Snippet for stories/events */}
                            {item.type === 'story' && item.raw?.content && (
                              <div className="ft-gsearch-item__snippet">
                                &ldquo;<HighlightText text={item.raw.content.slice(0, 110)} query={query} />&hellip;&rdquo;
                              </div>
                            )}
                            {item.type === 'event' && item.raw?.description && (
                              <div className="ft-gsearch-item__snippet">
                                <HighlightText text={item.raw.description.slice(0, 110)} query={query} />
                              </div>
                            )}
                          </div>

                          {/* Subtle arrow indicator on active */}
                          <div className="ft-gsearch-item__arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with keyboard navigation guidance */}
        <div className="ft-gsearch-footer">
          <div className="ft-gsearch-footer__item">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="ft-gsearch-footer__item">
            <kbd>↵</kbd>
            <span>Select</span>
          </div>
          <div className="ft-gsearch-footer__item">
            <kbd>ESC</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
