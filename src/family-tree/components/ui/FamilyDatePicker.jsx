/**
 * FamilyDatePicker Component — Medida's Family
 * High-performance, accessible date picker designed for family history research.
 * Supports direct typing (DD-MM-YYYY, YYYY-MM-DD, YYYY), fast year jumping/searching,
 * partial date recording, and responsive calendar popovers.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
  DAYS_OF_WEEK_SHORT,
  getDaysInMonth,
  parseDateInput,
  formatStoredDate,
} from '../../utils/dateHelpers.js';

const DEFAULT_MIN_YEAR = 1700;
const DEFAULT_MAX_YEAR = new Date().getFullYear() + 5;

// Common historical eras for one-click jumping
const DECADE_CHIPS = [1850, 1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020];

export default function FamilyDatePicker({
  value = '',
  onChange,
  placeholder = 'YYYY-MM-DD or Year',
  disabled = false,
  allowPartial = true,
  minYear = DEFAULT_MIN_YEAR,
  maxYear = DEFAULT_MAX_YEAR,
  id,
  name,
  ariaLabel,
  className = '',
  required = false,
}) {
  // Parsed initial state
  const initialParsed = useMemo(() => parseDateInput(value), [value]);

  const [inputText, setInputText] = useState(formatStoredDate(value));
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const [yearSearchQuery, setYearSearchQuery] = useState('');
  const [jumpYearInput, setJumpYearInput] = useState('');
  const [inputError, setInputError] = useState('');

  // Current calendar view cursor (year and month 1-12)
  const [viewYear, setViewYear] = useState(() => {
    if (initialParsed.isValid && initialParsed.year) return initialParsed.year;
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (initialParsed.isValid && initialParsed.month) return initialParsed.month;
    return new Date().getMonth() + 1;
  });

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);
  const yearListRef = useRef(null);

  // Synchronize when external value changes
  useEffect(() => {
    const formatted = formatStoredDate(value);
    setInputText(formatted);
    setInputError('');

    const parsed = parseDateInput(value);
    if (parsed.isValid && parsed.year) {
      setViewYear(parsed.year);
      if (parsed.month) setViewMonth(parsed.month);
    }
  }, [value]);

  // Close popover on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setViewMode('days');
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setViewMode('days');
        inputRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Scroll to active year when year view opens
  useEffect(() => {
    if (viewMode === 'years' && yearListRef.current) {
      const activeEl = yearListRef.current.querySelector('.ft-datepicker__year-btn--active');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [viewMode]);

  // Direct keyboard input change
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    if (!text.trim()) {
      setInputError('');
      onChange?.('');
      return;
    }

    const parsed = parseDateInput(text);
    if (parsed.isValid) {
      setInputError('');
      // Sync calendar cursor
      if (parsed.year) setViewYear(parsed.year);
      if (parsed.month) setViewMonth(parsed.month);
      onChange?.(parsed.value);
    } else {
      // Do not block typing, but show helpful warning
      setInputError(parsed.error || 'Invalid date format');
    }
  };

  const handleInputBlur = () => {
    if (!inputText.trim()) {
      setInputError('');
      onChange?.('');
      return;
    }
    const parsed = parseDateInput(inputText);
    if (parsed.isValid) {
      setInputError('');
      setInputText(parsed.value);
      onChange?.(parsed.value);
    } else {
      setInputError(parsed.error || 'Invalid date format');
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // Quick Clear
  const handleClear = (e) => {
    e.stopPropagation();
    setInputText('');
    setInputError('');
    onChange?.('');
    inputRef.current?.focus();
  };

  // Month navigation
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => Math.max(minYear, y - 1));
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => Math.min(maxYear, y + 1));
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Direct year jump from the Jump input
  const handleDirectYearJump = (targetYear) => {
    const yr = parseInt(targetYear, 10);
    if (!isNaN(yr) && yr >= minYear && yr <= maxYear) {
      setViewYear(yr);
      setJumpYearInput('');
      setViewMode('days');
    }
  };

  // Day selection
  const handleSelectDay = (day) => {
    const padM = String(viewMonth).padStart(2, '0');
    const padD = String(day).padStart(2, '0');
    const isoDate = `${viewYear}-${padM}-${padD}`;
    setInputText(isoDate);
    setInputError('');
    onChange?.(isoDate);
    setIsOpen(false);
    setViewMode('days');
    inputRef.current?.focus();
  };

  // Year-only selection
  const handleSelectYearOnly = (yearToSet = viewYear) => {
    const yrStr = String(yearToSet);
    setInputText(yrStr);
    setInputError('');
    onChange?.(yrStr);
    setIsOpen(false);
    setViewMode('days');
    inputRef.current?.focus();
  };

  // Month selection
  const handleSelectMonth = (monthIndex) => {
    setViewMonth(monthIndex);
    setViewMode('days');
  };

  // Year selection from grid
  const handleSelectYearGrid = (year) => {
    setViewYear(year);
    setViewMode('days');
  };

  // Today shortcut
  const handleToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    const padM = String(m).padStart(2, '0');
    const padD = String(d).padStart(2, '0');
    const isoDate = `${y}-${padM}-${padD}`;

    setViewYear(y);
    setViewMonth(m);
    setInputText(isoDate);
    setInputError('');
    onChange?.(isoDate);
    setIsOpen(false);
    setViewMode('days');
    inputRef.current?.focus();
  };

  // Calendar days grid computation
  const { calendarCells, selectedDay } = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    // 0 = Sunday, 1 = Monday, etc.
    const firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();

    const cells = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, key: `pad-prev-${i}` });
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, key: `day-${d}` });
    }

    const currentParsed = parseDateInput(value);
    let selDay = null;
    if (
      currentParsed.isValid &&
      currentParsed.precision === 'day' &&
      currentParsed.year === viewYear &&
      currentParsed.month === viewMonth
    ) {
      selDay = currentParsed.day;
    }

    return { calendarCells: cells, selectedDay: selDay };
  }, [viewYear, viewMonth, value]);

  // Year list computation with search filter
  const yearsList = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    if (!yearSearchQuery.trim()) return list;

    const q = yearSearchQuery.trim();
    return list.filter((y) => String(y).includes(q));
  }, [minYear, maxYear, yearSearchQuery]);

  const today = new Date();
  const isCurrentMonthToday =
    today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth;
  const todayDate = today.getDate();

  return (
    <div
      ref={containerRef}
      className={`ft-datepicker ${className} ${disabled ? 'ft-datepicker--disabled' : ''}`}
    >
      <div className="ft-datepicker__input-wrap">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          className={`ft-datepicker__input ${inputError ? 'ft-datepicker__input--error' : ''}`}
          placeholder={placeholder}
          value={inputText}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel || placeholder}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />

        <div className="ft-datepicker__actions">
          {inputText && !disabled && (
            <button
              type="button"
              className="ft-datepicker__clear-btn"
              onClick={handleClear}
              aria-label="Clear date"
              tabIndex={-1}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          <button
            type="button"
            className="ft-datepicker__toggle-btn"
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            aria-label="Open date picker calendar"
            disabled={disabled}
            tabIndex={-1}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      {inputError && <div className="ft-datepicker__error-msg">{inputError}</div>}

      {/* Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="ft-datepicker__popover"
          role="dialog"
          aria-label="Calendar date picker"
        >
          {/* Header Bar */}
          <div className="ft-datepicker__header">
            <button
              type="button"
              className="ft-datepicker__nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              title="Previous month"
            >
              ‹
            </button>

            <div className="ft-datepicker__header-title">
              <button
                type="button"
                className={`ft-datepicker__header-btn ${viewMode === 'months' ? 'ft-datepicker__header-btn--active' : ''}`}
                onClick={() => setViewMode((m) => (m === 'months' ? 'days' : 'months'))}
                title="Select month"
              >
                {MONTH_NAMES_FULL[viewMonth - 1]}
              </button>

              <button
                type="button"
                className={`ft-datepicker__header-btn ft-datepicker__header-btn--year ${viewMode === 'years' ? 'ft-datepicker__header-btn--active' : ''}`}
                onClick={() => setViewMode((m) => (m === 'years' ? 'days' : 'years'))}
                title="Fast year selector"
              >
                {viewYear}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              className="ft-datepicker__nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
              title="Next month"
            >
              ›
            </button>
          </div>

          {/* VIEW: DAYS (DEFAULT) */}
          {viewMode === 'days' && (
            <>
              {/* Day of Week Labels */}
              <div className="ft-datepicker__weekdays">
                {DAYS_OF_WEEK_SHORT.map((dw) => (
                  <span key={dw} className="ft-datepicker__weekday">
                    {dw}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="ft-datepicker__days-grid">
                {calendarCells.map((cell) => {
                  if (!cell.day) {
                    return <div key={cell.key} className="ft-datepicker__day-cell ft-datepicker__day-cell--empty" />;
                  }

                  const isSelected = cell.day === selectedDay;
                  const isToday = isCurrentMonthToday && cell.day === todayDate;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={`ft-datepicker__day-btn ${isSelected ? 'ft-datepicker__day-btn--selected' : ''} ${isToday ? 'ft-datepicker__day-btn--today' : ''}`}
                      onClick={() => handleSelectDay(cell.day)}
                      aria-label={`${cell.day} ${MONTH_NAMES_FULL[viewMonth - 1]} ${viewYear}`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Quick Year Jump Input Bar */}
              <div className="ft-datepicker__quick-jump">
                <span className="ft-datepicker__jump-label">Jump year:</span>
                <input
                  type="number"
                  min={minYear}
                  max={maxYear}
                  placeholder={String(viewYear)}
                  className="ft-datepicker__jump-input"
                  value={jumpYearInput}
                  onChange={(e) => setJumpYearInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDirectYearJump(jumpYearInput);
                    }
                  }}
                />
                <button
                  type="button"
                  className="ft-datepicker__jump-btn"
                  onClick={() => handleDirectYearJump(jumpYearInput)}
                  disabled={!jumpYearInput.trim()}
                >
                  Go
                </button>
              </div>
            </>
          )}

          {/* VIEW: MONTHS */}
          {viewMode === 'months' && (
            <div className="ft-datepicker__months-grid">
              {MONTH_NAMES_SHORT.map((name, idx) => {
                const mNum = idx + 1;
                const isSelected = mNum === viewMonth;
                return (
                  <button
                    key={name}
                    type="button"
                    className={`ft-datepicker__month-btn ${isSelected ? 'ft-datepicker__month-btn--selected' : ''}`}
                    onClick={() => handleSelectMonth(mNum)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: YEARS (FAST SEARCH & HISTORICAL SELECTOR) */}
          {viewMode === 'years' && (
            <div className="ft-datepicker__years-view">
              <div className="ft-datepicker__years-search-wrap">
                <input
                  type="number"
                  placeholder="Search year (e.g. 1920)..."
                  className="ft-datepicker__years-search-input"
                  value={yearSearchQuery}
                  autoFocus
                  onChange={(e) => setYearSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const yr = parseInt(yearSearchQuery, 10);
                      if (!isNaN(yr) && yr >= minYear && yr <= maxYear) {
                        handleSelectYearGrid(yr);
                      }
                    }
                  }}
                />
                {yearSearchQuery && (
                  <button
                    type="button"
                    className="ft-datepicker__clear-search-btn"
                    onClick={() => setYearSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Quick Decade Chips */}
              <div className="ft-datepicker__decade-chips">
                {DECADE_CHIPS.map((dec) => (
                  <button
                    key={dec}
                    type="button"
                    className={`ft-datepicker__decade-chip ${viewYear >= dec && viewYear < dec + 10 ? 'ft-datepicker__decade-chip--active' : ''}`}
                    onClick={() => {
                      handleSelectYearGrid(dec);
                    }}
                  >
                    {dec}s
                  </button>
                ))}
              </div>

              {/* Scrollable Year Grid */}
              <div ref={yearListRef} className="ft-datepicker__years-list">
                {yearsList.length === 0 ? (
                  <div className="ft-datepicker__years-empty">No matching years found</div>
                ) : (
                  yearsList.map((y) => (
                    <button
                      key={y}
                      type="button"
                      className={`ft-datepicker__year-btn ${y === viewYear ? 'ft-datepicker__year-btn--active' : ''}`}
                      onClick={() => handleSelectYearGrid(y)}
                    >
                      {y}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Popover Footer: Partial date & shortcuts */}
          <div className="ft-datepicker__footer">
            {allowPartial && (
              <button
                type="button"
                className="ft-datepicker__footer-action ft-datepicker__footer-action--partial"
                onClick={() => handleSelectYearOnly(viewYear)}
                title={`Select just the year ${viewYear}`}
              >
                Use {viewYear} only
              </button>
            )}

            <div className="ft-datepicker__footer-right">
              <button
                type="button"
                className="ft-datepicker__footer-action"
                onClick={handleToday}
                title="Jump to today"
              >
                Today
              </button>

              <button
                type="button"
                className="ft-datepicker__footer-action ft-datepicker__footer-action--clear"
                onClick={(e) => {
                  handleClear(e);
                  setIsOpen(false);
                }}
                title="Clear date"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
