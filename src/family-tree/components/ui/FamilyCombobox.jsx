/**
 * FamilyCombobox.jsx — Accessible, Curated & Family-Scoped Combobox
 * Medida's Family Platform
 *
 * Implements searchable dropdowns for Location and Occupation with:
 * - Instant filtering (exact > prefix > contains > family frequency > curated)
 * - Seamless custom entry (e.g. Use "Chintur", Use "Handloom Weaver")
 * - Full ARIA combobox accessibility (ArrowUp/Down, Enter, Escape, Tab)
 * - Mobile responsive 390px support
 * - Zero automatic normalization (preserves exact user wording)
 */

import React, { useState, useEffect, useRef, useId, useMemo, useCallback } from 'react';
import { getRankedSuggestions } from '../../utils/suggestionData.js';
import familyStore from '../../store/FamilyStore.js';

export function FamilyCombobox({
  value = '',
  onChange,
  type = 'location', // 'location' | 'occupation'
  placeholder = '',
  id,
  name,
  ariaLabel,
  disabled = false,
  required = false,
  className = '',
  activeFamilyId = null,
  maxSuggestions = 10,
  allowCustom = true,
  storeInstance = familyStore,
}) {
  const generatedId = useId();
  const inputId = id || `ft-combo-input-${generatedId}`;
  const listboxId = `ft-combo-list-${generatedId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxRef = useRef(null);

  const trimmedValue = (value || '').trim();

  // Compute suggestions based on current value
  const suggestions = useMemo(() => {
    return getRankedSuggestions({
      query: value,
      type,
      activeFamilyId,
      storeInstance,
      limit: maxSuggestions,
    });
  }, [value, type, activeFamilyId, storeInstance, maxSuggestions]);

  // Check if an exact match exists in the suggestions
  const hasExactMatch = useMemo(() => {
    if (!trimmedValue) return false;
    const lower = trimmedValue.toLowerCase();
    return suggestions.some((s) => s.value.toLowerCase() === lower);
  }, [trimmedValue, suggestions]);

  // Combined options: suggestions + custom "Use <value>" option if no exact match
  const options = useMemo(() => {
    const list = suggestions.map((s) => ({
      key: `sugg-${s.value}`,
      value: s.value,
      isCurated: s.isCurated,
      familyCount: s.familyCount,
      isCustom: false,
    }));

    if (allowCustom && trimmedValue && !hasExactMatch) {
      list.push({
        key: `custom-${trimmedValue}`,
        value: trimmedValue,
        isCurated: false,
        familyCount: 0,
        isCustom: true,
      });
    }

    return list;
  }, [suggestions, allowCustom, trimmedValue, hasExactMatch]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  // Ensure highlighted item scrolls into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelectOption = useCallback(
    (optionValue) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (options.length > 0 ? (prev + 1) % options.length : -1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(options.length - 1);
      } else {
        setHighlightedIndex((prev) => (options.length > 0 ? (prev - 1 + options.length) % options.length : -1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < options.length) {
        e.preventDefault();
        handleSelectOption(options[highlightedIndex].value);
      }
      // If no option highlighted, let enter naturally handle form submit or close
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === 'Tab') {
      // Allow tab to naturally proceed to next field, just close dropdown
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleInputChange = (e) => {
    onChange?.(e.target.value);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const activeDescendantId =
    isOpen && highlightedIndex >= 0 && highlightedIndex < options.length
      ? `${listboxId}-opt-${highlightedIndex}`
      : undefined;

  return (
    <div
      ref={containerRef}
      className={`ft-combobox ${className} ${disabled ? 'ft-combobox--disabled' : ''} ${isOpen ? 'ft-combobox--open' : ''}`}
    >
      <div className="ft-combobox__input-wrapper">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendantId}
          aria-label={ariaLabel || placeholder}
          className="ft-combobox__input"
          placeholder={placeholder}
          value={value || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Action icons: clear or dropdown indicator */}
        <div className="ft-combobox__actions">
          {value && !disabled && (
            <button
              type="button"
              className="ft-combobox__clear-btn"
              tabIndex={-1}
              aria-label="Clear input"
              onClick={() => {
                onChange?.('');
                setIsOpen(true);
                setHighlightedIndex(-1);
                inputRef.current?.focus();
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          <button
            type="button"
            className="ft-combobox__toggle-btn"
            tabIndex={-1}
            aria-label={isOpen ? 'Close suggestions' : 'Open suggestions'}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Suggestion Dropdown Listbox */}
      {isOpen && options.length > 0 && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={`${type === 'location' ? 'Location' : 'Occupation'} suggestions`}
          className="ft-combobox__dropdown"
        >
          {options.map((opt, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const isSelected = trimmedValue.toLowerCase() === opt.value.toLowerCase() && !opt.isCustom;

            if (opt.isCustom) {
              return (
                <div
                  key={opt.key}
                  id={`${listboxId}-opt-${idx}`}
                  data-index={idx}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`ft-combobox__option ft-combobox__option--custom ${
                    isHighlighted ? 'ft-combobox__option--highlighted' : ''
                  }`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    // Prevent blur before selection
                    e.preventDefault();
                    handleSelectOption(opt.value);
                  }}
                >
                  <div className="ft-combobox__custom-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Use &ldquo;<strong>{opt.value}</strong>&rdquo;</span>
                  </div>
                  <span className="ft-combobox__custom-hint">Custom</span>
                </div>
              );
            }

            return (
              <div
                key={opt.key}
                id={`${listboxId}-opt-${idx}`}
                data-index={idx}
                role="option"
                aria-selected={isSelected || isHighlighted}
                className={`ft-combobox__option ${isHighlighted ? 'ft-combobox__option--highlighted' : ''} ${
                  isSelected ? 'ft-combobox__option--selected' : ''
                }`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectOption(opt.value);
                }}
              >
                <div className="ft-combobox__option-content">
                  <span className="ft-combobox__option-text">{opt.value}</span>
                  {opt.familyCount > 0 && (
                    <span className="ft-combobox__badge ft-combobox__badge--family" title="Used in active family">
                      Family
                    </span>
                  )}
                </div>

                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ft-orange-primary, #e56515)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LocationCombobox(props) {
  return (
    <FamilyCombobox
      type="location"
      placeholder="e.g. Muthagudem, Hyderabad"
      {...props}
    />
  );
}

export function OccupationCombobox(props) {
  return (
    <FamilyCombobox
      type="occupation"
      placeholder="e.g. Farmer, Software Engineer"
      {...props}
    />
  );
}

export default FamilyCombobox;
