/**
 * Date Helpers — Medida's Family
 * Robust parsing, formatting, and validation utilities for family history dates.
 * Supports exact dates (YYYY-MM-DD), month-year (YYYY-MM), and year-only (YYYY)
 * as well as common user input formats (DD-MM-YYYY, DD/MM/YYYY).
 * 
 * M5B: Optional Jev AI fallback for natural language dates.
 * Deterministic parser remains authoritative.
 */

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAYS_OF_WEEK_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Checks if a year is a leap year.
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Gets days in a specific month (1-indexed month: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year, month) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Formats a stored value (e.g. "1920-03-15", "1920", "1920-03") for display.
 */
export function formatStoredDate(value) {
  if (!value) return '';
  const parsed = parseDateInput(String(value));
  if (!parsed.isValid || parsed.isEmpty) return value;
  return parsed.value;
}

import { 
  extractDateWithJev, 
  shouldUseJevFallback, 
  configureJevExtraction,
  getJevStatus,
  REVIEW_BELOW 
} from './jevDateExtraction.js';

export { 
  extractDateWithJev, 
  shouldUseJevFallback, 
  configureJevExtraction,
  getJevStatus,
  REVIEW_BELOW 
};

/**
 * Parses user input string into a standardized date object or null.
 * Handles:
 * - YYYY
 * - YYYY-MM
 * - YYYY-MM-DD
 * - DD-MM-YYYY
 * - DD/MM/YYYY
 * - D-M-YYYY or D/M/YYYY
 * 
 * @param {string} raw - Raw user input
 * @param {Object} options - Parsing options
 * @param {boolean} options.aiFallback - Enable Jev AI fallback (default: false)
 * @returns {Object} Parsed date object or error
 */
export function parseDateInput(raw, options = {}) {
  const { aiFallback = false } = options;
  
  // Try deterministic parser first
  const deterministicResult = parseDateInputDeterministic(raw);
  
  // If deterministic parsing succeeded with confidence, return it
  if (deterministicResult.isValid && !deterministicResult.isEmpty) {
    return deterministicResult;
  }
  
  // If AI fallback is disabled or not needed, return deterministic result
  if (!aiFallback) {
    return deterministicResult;
  }
  
  // Mark that we attempted AI fallback (actual API call should be async)
  // For now, return deterministic result and let caller invoke Jev if needed
  return {
    ...deterministicResult,
    aiFallbackRecommended: shouldUseJevFallback(deterministicResult)
  };
}

/**
 * Deterministic date parser (original implementation).
 * Handles structured date formats only.
 */
function parseDateInputDeterministic(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { isValid: true, isEmpty: true, value: '', year: null, month: null, day: null, precision: 'empty' };
  }

  const clean = raw.trim();

  // Pattern 1: Year only (e.g. "1920")
  if (/^\d{4}$/.test(clean)) {
    const yr = parseInt(clean, 10);
    if (yr < 1000 || yr > 2200) {
      return { isValid: false, error: 'Please enter a reasonable year (1000–2200).' };
    }
    return {
      isValid: true,
      isEmpty: false,
      value: String(yr),
      year: yr,
      month: null,
      day: null,
      precision: 'year',
      source: 'deterministic'
    };
  }

  // Pattern 2: YYYY-MM
  if (/^\d{4}-\d{1,2}$/.test(clean)) {
    const [yStr, mStr] = clean.split('-');
    const yr = parseInt(yStr, 10);
    const mo = parseInt(mStr, 10);
    if (mo < 1 || mo > 12) {
      return { isValid: false, error: 'Invalid month (must be 1–12).' };
    }
    const padMo = String(mo).padStart(2, '0');
    return {
      isValid: true,
      isEmpty: false,
      value: `${yr}-${padMo}`,
      year: yr,
      month: mo,
      day: null,
      precision: 'month',
      source: 'deterministic'
    };
  }

  // Pattern 3: YYYY-MM-DD (ISO format)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const [yStr, mStr, dStr] = clean.split('-');
    const yr = parseInt(yStr, 10);
    const mo = parseInt(mStr, 10);
    const dy = parseInt(dStr, 10);

    if (mo < 1 || mo > 12) {
      return { isValid: false, error: 'Invalid month (must be 1–12).' };
    }
    const maxDays = getDaysInMonth(yr, mo);
    if (dy < 1 || dy > maxDays) {
      return { isValid: false, error: `Invalid day for ${MONTH_NAMES_SHORT[mo - 1]} ${yr} (1–${maxDays}).` };
    }

    const padMo = String(mo).padStart(2, '0');
    const padDy = String(dy).padStart(2, '0');
    return {
      isValid: true,
      isEmpty: false,
      value: `${yr}-${padMo}-${padDy}`,
      year: yr,
      month: mo,
      day: dy,
      precision: 'day',
      source: 'deterministic'
    };
  }

  // Pattern 4: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const partsMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (partsMatch) {
    const dy = parseInt(partsMatch[1], 10);
    const mo = parseInt(partsMatch[2], 10);
    const yr = parseInt(partsMatch[3], 10);

    if (mo < 1 || mo > 12) {
      return { isValid: false, error: 'Invalid month (must be 1–12).' };
    }
    const maxDays = getDaysInMonth(yr, mo);
    if (dy < 1 || dy > maxDays) {
      return { isValid: false, error: `Invalid day for ${MONTH_NAMES_SHORT[mo - 1]} ${yr} (1–${maxDays}).` };
    }

    const padMo = String(mo).padStart(2, '0');
    const padDy = String(dy).padStart(2, '0');
    return {
      isValid: true,
      isEmpty: false,
      value: `${yr}-${padMo}-${padDy}`,
      year: yr,
      month: mo,
      day: dy,
      precision: 'day',
      source: 'deterministic'
    };
  }

  return {
    isValid: false,
    error: 'Please enter a valid date (YYYY, YYYY-MM, or DD-MM-YYYY).',
    source: 'deterministic'
  };
}

/**
 * @deprecated Use parseDateInput instead
 */
export function parseDateInputLegacy(raw) {
  return parseDateInputDeterministic(raw);
}

/**
 * Validates birth date against death date.
 */
export function validateBirthDeathDates(birthDate, deathDate) {
  if (!birthDate || !deathDate) return { valid: true };

  const parsedBirth = parseDateInput(birthDate);
  const parsedDeath = parseDateInput(deathDate);

  if (!parsedBirth.isValid || !parsedDeath.isValid) {
    return { valid: true }; // individual validation handles syntax
  }

  if (parsedBirth.year !== null && parsedDeath.year !== null) {
    if (parsedBirth.year > parsedDeath.year) {
      return { valid: false, error: 'Date of birth cannot be after date of death.' };
    }
    if (parsedBirth.year === parsedDeath.year) {
      if (parsedBirth.month !== null && parsedDeath.month !== null) {
        if (parsedBirth.month > parsedDeath.month) {
          return { valid: false, error: 'Date of birth cannot be after date of death.' };
        }
        if (parsedBirth.month === parsedDeath.month) {
          if (parsedBirth.day !== null && parsedDeath.day !== null && parsedBirth.day > parsedDeath.day) {
            return { valid: false, error: 'Date of birth cannot be after date of death.' };
          }
        }
      }
    }
  }

  return { valid: true };
}
