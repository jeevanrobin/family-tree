/**
 * SearchOverlay Component
 * Autocomplete search across family members with keyboard navigation,
 * thumbnail previews, and generation tags.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchPersons, getGeneration, GENERATION_CONFIG } from '../data/familyDataService.js';
import { getInitials, getLifespanInfo, getAvatarGradient } from '../utils/familyHelpers.js';
import AnimatedList from './react-bits/AnimatedList.jsx';
import { useMediaUrl } from '../hooks/useMediaUrl.js';

function SearchResultItem({ person, isSelected, onSelect }) {
  const gen = getGeneration(person.id);
  const genTitle = GENERATION_CONFIG[gen]?.title?.replace('Generation ', 'GEN ') || `GEN ${gen + 1}`;
  const lifespan = getLifespanInfo(person);
  const dateText = lifespan.birthYear && lifespan.deathYear
    ? `${lifespan.birthYear} — ${lifespan.deathYear}`
    : lifespan.birthYear
    ? `b. ${lifespan.birthYear}`
    : lifespan.formatted || '';
  const avatarBg = getAvatarGradient(person);

  const rawPhoto = person.photo || person.photoUrl || '';
  const isStoragePath = rawPhoto.startsWith('family/');
  const resolvedPhoto = useMediaUrl(isStoragePath ? rawPhoto : '', rawPhoto);

  return (
    <div
      className={`ft-search__item ${isSelected ? 'ft-search__item--active' : ''}`}
      onClick={() => onSelect(person.id)}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
    >
      <div className="ft-search__item-avatar" style={{ background: avatarBg }}>
        {resolvedPhoto ? (
          <img src={resolvedPhoto} alt={person.displayName} className="ft-search__item-photo" />
        ) : (
          <span>{getInitials(person)}</span>
        )}
      </div>
      <div className="ft-search__item-info">
        <div className="ft-search__item-title-row">
          <span className="ft-search__item-name">{person.displayName}</span>
          <span className="ft-search__item-gen">{genTitle}</span>
        </div>
        <div className="ft-search__item-meta">
          {dateText && <span className="ft-search__item-dates">{dateText}</span>}
          {dateText && person.occupation && <span className="ft-search__item-sep"> &middot; </span>}
          {person.occupation && <span className="ft-search__item-occ">{person.occupation}</span>}
        </div>
      </div>
    </div>
  );
}

function LegacySearchDropdown({ onSelectPerson }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Keyboard shortcut listener
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Search query effect
  useEffect(() => {
    if (query.trim().length > 0) {
      const matches = searchPersons(query);
      setResults(matches);
      setIsOpen(true);
      setActiveIndex(-1);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  // Select item
  const handleSelect = useCallback(
    (personId) => {
      onSelectPerson(personId);
      setQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onSelectPerson]
  );

  // Keyboard navigation inside dropdown
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        handleSelect(results[activeIndex].id);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    },
    [isOpen, activeIndex, results, handleSelect]
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const listEl = dropdownRef.current.querySelector('.rb-animated-list');
      const activeEl = listEl?.children[activeIndex];
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="ft-search">
      <div className="ft-search__field">
        <svg
          className="ft-search__icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          className="ft-search__input"
          placeholder="Search by name, occupation, location... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          aria-label="Search family tree members"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          autoComplete="off"
          spellCheck="false"
        />

        {query ? (
          <button
            className="ft-search__clear-btn"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search input"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <kbd className="ft-search__shortcut-hint" aria-hidden="true">
            /
          </kbd>
        )}
      </div>

      {/* Animated Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="ft-search__dropdown"
          role="listbox"
          id="search-results-list"
        >
          {results.length > 0 ? (
            <AnimatedList stagger={25}>
              {results.map((person, idx) => (
                <SearchResultItem
                  key={person.id}
                  person={person}
                  isSelected={idx === activeIndex}
                  onSelect={handleSelect}
                />
              ))}
            </AnimatedList>
          ) : (
            <div className="ft-search__empty-state">
              <span>No family members found matching &ldquo;{query}&rdquo;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchOverlay({ onSelectPerson, onOpenSearch }) {
  if (onOpenSearch) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent || '');
    return (
      <div className="ft-search">
        <button
          type="button"
          className="ft-search__trigger-btn"
          onClick={onOpenSearch}
          aria-label={`Search family archive (${isMac ? '⌘K' : 'Ctrl+K'})`}
          title={`Search family archive (${isMac ? '⌘K' : 'Ctrl+K'})`}
        >
          <svg
            className="ft-search__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="ft-search__placeholder">Search family...</span>
          <kbd className="ft-search__shortcut-hint" aria-hidden="true">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>
      </div>
    );
  }

  return <LegacySearchDropdown onSelectPerson={onSelectPerson} />;
}

