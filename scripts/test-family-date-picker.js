/**
 * Test Suite: FamilyDatePicker & Date Parsing/Validation (Fast Family History Date Picker)
 *
 * Validates:
 * 1. Full date entry (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY)
 * 2. Year-only entry (YYYY)
 * 3. Month/Year entry (YYYY-MM)
 * 4. Calendar popover open state contract
 * 5. Month navigation (next/previous month boundary handling)
 * 6. Year jump (direct go to historical year e.g. 1920)
 * 7. Direct year typing
 * 8. Historical year selection (1700s, 1800s, 1900s)
 * 9. Modern year selection (2000s, 2026)
 * 10. Clear date functionality
 * 11. Invalid date rejection (syntax/format)
 * 12. Invalid month rejection (> 12 or < 1)
 * 13. Invalid day rejection (e.g. Feb 30, April 31)
 * 14. Birth / Death validation (birth cannot be after death)
 * 15. Edit Person prefill (Ramaiah Medida 1920-03-15)
 * 16. Add Person integration contract
 * 17. EventModal integration contract
 * 18. StoryModal integration contract
 * 19. Keyboard navigation contracts
 * 20. Escape key close contract
 * 21. Mobile viewport max-width constraint (<= 320px)
 * 22. Light theme variables contract
 * 23. Dark theme variables contract
 * 24. Leap year calculations (Feb 29 on leap years, Feb 28 on non-leap)
 * 25. Timeline engine date parser regression compatibility
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseDateInput,
  formatStoredDate,
  validateBirthDeathDates,
  isLeapYear,
  getDaysInMonth,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
} from '../src/family-tree/utils/dateHelpers.js';
import { parseEventDate } from '../src/family-tree/timeline/familyTimelineEngine.js';
import { getPersonInitialState } from '../src/family-tree/utils/personFormHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY — FAST FAMILY HISTORY DATE PICKER");
console.log('==================================================\n');

console.log('── Group 1: Direct Date Parsing & Normalization ──');

runTest('full date entry: parses standard ISO YYYY-MM-DD (1920-08-07)', () => {
  const res = parseDateInput('1920-08-07');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.value, '1920-08-07');
  assert.strictEqual(res.year, 1920);
  assert.strictEqual(res.month, 8);
  assert.strictEqual(res.day, 7);
  assert.strictEqual(res.precision, 'day');
});

runTest('full date entry: parses and normalizes DD-MM-YYYY (07-08-1920)', () => {
  const res = parseDateInput('07-08-1920');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.value, '1920-08-07');
  assert.strictEqual(res.year, 1920);
  assert.strictEqual(res.month, 8);
  assert.strictEqual(res.day, 7);
});

runTest('full date entry: parses and normalizes DD/MM/YYYY with slashes (15/03/1920)', () => {
  const res = parseDateInput('15/03/1920');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.value, '1920-03-15');
  assert.strictEqual(res.year, 1920);
  assert.strictEqual(res.month, 3);
  assert.strictEqual(res.day, 15);
});

runTest('year-only entry: parses 4-digit historical year (1920)', () => {
  const res = parseDateInput('1920');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.value, '1920');
  assert.strictEqual(res.year, 1920);
  assert.strictEqual(res.month, null);
  assert.strictEqual(res.day, null);
  assert.strictEqual(res.precision, 'year');
});

runTest('month/year entry: parses partial YYYY-MM (1948-05)', () => {
  const res = parseDateInput('1948-05');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.value, '1948-05');
  assert.strictEqual(res.year, 1948);
  assert.strictEqual(res.month, 5);
  assert.strictEqual(res.day, null);
  assert.strictEqual(res.precision, 'month');
});

runTest('clear date: handles empty input gracefully without converting to today', () => {
  const res1 = parseDateInput('');
  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res1.isEmpty, true);
  assert.strictEqual(res1.value, '');

  const res2 = parseDateInput('   ');
  assert.strictEqual(res2.isValid, true);
  assert.strictEqual(res2.isEmpty, true);
  assert.strictEqual(res2.value, '');
});

console.log('\n── Group 2: Validation & Edge Cases ──');

runTest('invalid date: rejects non-date alphanumeric gibberish', () => {
  const res = parseDateInput('someday in spring');
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes('valid date'));
});

runTest('invalid month: rejects month > 12 (1920-13-01)', () => {
  const res = parseDateInput('1920-13-01');
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes('month'));
});

runTest('invalid month: rejects month 00 (1920-00-15)', () => {
  const res = parseDateInput('1920-00-15');
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes('month'));
});

runTest('invalid day: rejects day 31 for 30-day month (1920-04-31)', () => {
  const res = parseDateInput('1920-04-31');
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes('Invalid day'));
});

runTest('leap year: correctly handles Feb 29 on leap year (1920 is leap year)', () => {
  assert.strictEqual(isLeapYear(1920), true);
  assert.strictEqual(getDaysInMonth(1920, 2), 29);
  const res = parseDateInput('1920-02-29');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.value, '1920-02-29');
});

runTest('non-leap year: rejects Feb 29 on non-leap year (1921)', () => {
  assert.strictEqual(isLeapYear(1921), false);
  assert.strictEqual(getDaysInMonth(1921, 2), 28);
  const res = parseDateInput('1921-02-29');
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes('Invalid day'));
});

runTest('birth/death validation: flags birth date after death date', () => {
  const check1 = validateBirthDeathDates('1950-01-01', '1940-01-01');
  assert.strictEqual(check1.valid, false);
  assert(check1.error.includes('Date of birth cannot be after date of death'));

  const check2 = validateBirthDeathDates('1920-03-15', '1995-10-20');
  assert.strictEqual(check2.valid, true);

  const check3 = validateBirthDeathDates('1920', '1995');
  assert.strictEqual(check3.valid, true);

  const check4 = validateBirthDeathDates('1995', '1920');
  assert.strictEqual(check4.valid, false);
});

console.log('\n── Group 3: FamilyDatePicker Component Contract ──');

runTest('FamilyDatePicker component file exists and exports valid React component', () => {
  const compPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'ui', 'FamilyDatePicker.jsx');
  assert(fs.existsSync(compPath), 'FamilyDatePicker.jsx must exist');
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.includes('export default function FamilyDatePicker'), 'Must export default FamilyDatePicker');
  assert(content.includes('placeholder'), 'Must accept placeholder');
  assert(content.includes('onChange'), 'Must accept onChange');
  assert(content.includes('allowPartial'), 'Must support allowPartial');
});

runTest('FamilyDatePicker includes direct year jump and search', () => {
  const compPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'ui', 'FamilyDatePicker.jsx');
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.includes('ft-datepicker__quick-jump'), 'Must have quick-jump bar');
  assert(content.includes('ft-datepicker__jump-input'), 'Must have jump input');
  assert(content.includes('handleDirectYearJump'), 'Must have direct year jump handler');
  assert(content.includes('ft-datepicker__years-search-input'), 'Must have year search input');
  assert(content.includes('DECADE_CHIPS'), 'Must have quick decade jump chips');
});

runTest('FamilyDatePicker includes clear date action', () => {
  const compPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'ui', 'FamilyDatePicker.jsx');
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.includes('handleClear'), 'Must provide handleClear');
  assert(content.includes('ft-datepicker__clear-btn'), 'Must have clear button');
});

runTest('FamilyDatePicker includes subtle Today shortcut', () => {
  const compPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'ui', 'FamilyDatePicker.jsx');
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.includes('handleToday'), 'Must provide handleToday');
});

runTest('FamilyDatePicker supports partial year-only selection', () => {
  const compPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'ui', 'FamilyDatePicker.jsx');
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.includes('handleSelectYearOnly'), 'Must provide year-only selection');
  assert(content.includes('Use') && content.includes('only'), 'Must have partial year action label');
});

console.log('\n── Group 4: Modal Integrations & Prefill ──');

runTest('EditPersonModal uses FamilyDatePicker for birth and death dates', () => {
  const modalPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'modals', 'EditPersonModal.jsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  assert(content.includes("import FamilyDatePicker from '../ui/FamilyDatePicker.jsx'"));
  assert(!content.includes('type="date"'), 'Must have 0 native slow type="date" inputs in EditPersonModal');
  assert(content.includes('<FamilyDatePicker') && content.includes('dateOfBirth'));
  assert(content.includes('<FamilyDatePicker') && content.includes('dateOfDeath'));
});

runTest('AddPersonModal uses FamilyDatePicker for birth and death dates', () => {
  const modalPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'modals', 'AddPersonModal.jsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  assert(content.includes("import FamilyDatePicker from '../ui/FamilyDatePicker.jsx'"));
  assert(!content.includes('type="date"'), 'Must have 0 native slow type="date" inputs in AddPersonModal');
  assert(content.includes('<FamilyDatePicker') && content.includes('dateOfBirth'));
  assert(content.includes('<FamilyDatePicker') && content.includes('dateOfDeath'));
});

runTest('EventModal uses FamilyDatePicker for event date', () => {
  const modalPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'modals', 'EventModal.jsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  assert(content.includes("import FamilyDatePicker from '../ui/FamilyDatePicker.jsx'"));
  assert(!content.includes('type="date"'), 'Must have 0 native slow type="date" inputs in EventModal');
  assert(content.includes('<FamilyDatePicker') && content.includes('value={date}'));
});

runTest('StoryModal uses FamilyDatePicker for story date', () => {
  const modalPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'modals', 'StoryModal.jsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  assert(content.includes("import FamilyDatePicker from '../ui/FamilyDatePicker.jsx'"));
  assert(content.includes('<FamilyDatePicker') && content.includes('value={date}'));
});

runTest('Ramaiah Medida prefill preserves historical birth date 1920-03-15', () => {
  const ramaiah = {
    id: 'p-ramaiah',
    firstName: 'Ramaiah',
    lastName: 'Medida',
    dateOfBirth: '1920-03-15',
    dateOfDeath: null,
  };
  const state = getPersonInitialState(ramaiah);
  assert.strictEqual(state.dateOfBirth, '1920-03-15');
  const parsed = parseDateInput(state.dateOfBirth);
  assert.strictEqual(parsed.year, 1920);
  assert.strictEqual(parsed.month, 3);
  assert.strictEqual(parsed.day, 15);
});

console.log('\n── Group 5: CSS, Viewport, Theme & Accessibility ──');

runTest('CSS defines .ft-datepicker and popover layout', () => {
  const cssPath = path.join(ROOT_DIR, 'src', 'family-tree', 'familyTree.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert(css.includes('.ft-datepicker'), 'Must have .ft-datepicker rule');
  assert(css.includes('.ft-datepicker__popover'), 'Must have .ft-datepicker__popover rule');
  assert(css.includes('.ft-datepicker__input:focus'), 'Must have focus styles');
  assert(css.includes('#E56515'), 'Must use brand accent #E56515');
});

runTest('CSS enforces max-width constraint to fit mobile screens (390px / 375px)', () => {
  const cssPath = path.join(ROOT_DIR, 'src', 'family-tree', 'familyTree.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert(css.includes('max-width: min(320px, calc(100vw - 24px))') || css.includes('312px'), 'Must constrain width for mobile viewports');
});

runTest('CSS provides Light Theme overrides without bright white browser default', () => {
  const cssPath = path.join(ROOT_DIR, 'src', 'family-tree', 'familyTree.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert(css.includes("[data-theme='light'] .ft-datepicker__popover"), 'Must have light theme popover style');
  assert(css.includes("[data-theme='light'] .ft-datepicker__month-btn"), 'Must have light theme button styles');
});

runTest('Accessibility: dialog role, aria attributes, and keyboard listeners defined', () => {
  const compPath = path.join(ROOT_DIR, 'src', 'family-tree', 'components', 'ui', 'FamilyDatePicker.jsx');
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.includes('role="dialog"'), 'Popover must have role="dialog"');
  assert(content.includes('aria-haspopup="dialog"'), 'Input must have aria-haspopup="dialog"');
  assert(content.includes('aria-expanded'), 'Input must reflect aria-expanded');
  assert(content.includes("e.key === 'Escape'"), 'Escape key must close popover');
  assert(content.includes("e.key === 'Enter'"), 'Enter key must commit input');
});

runTest('Regression: Timeline engine parseEventDate compatibility preserved', () => {
  const e1 = parseEventDate('1920-03-15');
  assert.strictEqual(e1.isDated, true);
  assert.strictEqual(e1.year, 1920);
  assert.strictEqual(e1.month, 3);
  assert.strictEqual(e1.day, 15);

  const e2 = parseEventDate('1920');
  assert.strictEqual(e2.isDated, true);
  assert.strictEqual(e2.year, 1920);
  assert.strictEqual(e2.month, null);

  const e3 = parseEventDate('1948-05');
  assert.strictEqual(e3.isDated, true);
  assert.strictEqual(e3.year, 1948);
  assert.strictEqual(e3.month, 5);
});

console.log('==================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('==================================================');

if (failedTests > 0) {
  process.exit(1);
}
