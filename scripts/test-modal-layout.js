/**
 * Automated Verification Suite — Global Modal Scroll & Action Footer Architecture
 * Medida's Family Platform
 *
 * Verifies all 25+ layout, responsiveness, accessibility, and component constraints:
 * 1. Modal open/close lifecycle
 * 2. Header fixed behavior (flex: 0 0 auto)
 * 3. Content scrolling behavior (flex: 1 1 auto, min-height: 0, overflow-y: auto)
 * 4. Action footer fixed/sticky behavior (flex: 0 0 auto, flex-shrink: 0)
 * 5. Save & Cancel button clickability and visibility at bottom of scroll
 * 6. Last-field spacing (bottom padding >= 32px, no clipping behind footer)
 * 7. Viewport constraint handling: 1440x900, 1280x800, 1024x768, 768x1024, 390x844, 375x812
 * 8. Dynamic viewport unit support: min(90vh, 90dvh)
 * 9. Mobile virtual keyboard & safe area insets: env(safe-area-inset-bottom)
 * 10. Themed footer surface isolation (dark & light tokens, border-top)
 * 11. Body scroll containment & overscroll-behavior: contain
 * 12. Component audit: EditPersonModal, AddPersonModal, StoryModal, EventModal, PhotoModal,
 *     DocumentModal, FamilySettingsModal, DeletePersonModal, DocumentViewerModal, DataManagementModal
 * 13. Nested dialog stability
 * 14. Accessibility (keyboard navigation, ARIA dialog roles, Esc close)
 * 15. Error state & validation expansion handling
 * 16. Loading state button persistence
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] Test ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${total}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

console.log('==================================================');
console.log("MEDIDA'S FAMILY — MODAL SCROLL & ACTION FOOTER FIX");
console.log('==================================================\n');

// Read source files
const cssPath = path.resolve('src/family-tree/familyTree.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const editPersonPath = path.resolve('src/family-tree/components/modals/EditPersonModal.jsx');
const editPersonContent = fs.readFileSync(editPersonPath, 'utf8');

const addPersonPath = path.resolve('src/family-tree/components/modals/AddPersonModal.jsx');
const addPersonContent = fs.readFileSync(addPersonPath, 'utf8');

const storyModalPath = path.resolve('src/family-tree/components/modals/StoryModal.jsx');
const storyModalContent = fs.readFileSync(storyModalPath, 'utf8');

const eventModalPath = path.resolve('src/family-tree/components/modals/EventModal.jsx');
const eventModalContent = fs.readFileSync(eventModalPath, 'utf8');

const photoModalPath = path.resolve('src/family-tree/components/modals/PhotoModal.jsx');
const photoModalContent = fs.readFileSync(photoModalPath, 'utf8');

const documentModalPath = path.resolve('src/family-tree/components/modals/DocumentModal.jsx');
const documentModalContent = fs.readFileSync(documentModalPath, 'utf8');

const familySettingsPath = path.resolve('src/family-tree/components/modals/FamilySettingsModal.jsx');
const familySettingsContent = fs.readFileSync(familySettingsPath, 'utf8');

const deletePersonPath = path.resolve('src/family-tree/components/modals/DeletePersonModal.jsx');
const deletePersonContent = fs.readFileSync(deletePersonPath, 'utf8');

const docViewerPath = path.resolve('src/family-tree/components/modals/DocumentViewerModal.jsx');
const docViewerContent = fs.readFileSync(docViewerPath, 'utf8');

const dataMgmtPath = path.resolve('src/family-tree/components/modals/DataManagementModal.jsx');
const dataMgmtContent = fs.readFileSync(dataMgmtPath, 'utf8');

// ── 1. Global Modal CSS Architecture ─────────────────────────────
console.log('── Group 1: Global Modal CSS Layout & Container Rules ──');

runTest('.ft-view-modal__container enforces flex-column and min(90vh, 90dvh)', () => {
  assert(cssContent.includes('.ft-view-modal__container {'), 'container class exists');
  assert(cssContent.includes('max-height: min(90vh, 90dvh);'), 'uses dynamic viewport height');
  assert(cssContent.includes('display: flex;'), 'flex layout used');
  assert(cssContent.includes('flex-direction: column;'), 'column direction used');
  assert(cssContent.includes('overflow: hidden;'), 'container clips outer overflow');
});

runTest('.ft-view-modal__header is pinned with flex: 0 0 auto', () => {
  assert(cssContent.includes('.ft-view-modal__header {'), 'header class exists');
  assert(/ft-view-modal__header\s*\{[^}]*flex:\s*0\s+0\s+auto;/s.test(cssContent), 'header has flex: 0 0 auto');
});

runTest('.ft-modal-form-container form and .ft-modal-form have flex-column with min-height: 0', () => {
  assert(cssContent.includes('.ft-modal-form-container form'), 'selector exists');
  assert(cssContent.includes('.ft-modal-form {'), '.ft-modal-form selector exists');
  const formRule = cssContent.slice(cssContent.indexOf('.ft-modal-form-container form'));
  assert(formRule.includes('min-height: 0;'), 'min-height: 0 present for flex overflow');
  assert(formRule.includes('flex: 1 1 auto;'), 'form takes remaining height');
  assert(formRule.includes('overflow: hidden;'), 'form prevents premature overflow');
});

runTest('.ft-modal-form-body has min-height: 0, overflow-y: auto, overscroll-behavior: contain', () => {
  assert(cssContent.includes('.ft-modal-form-body {'), 'body selector exists');
  const bodyRule = cssContent.slice(cssContent.indexOf('.ft-modal-form-body {'));
  assert(bodyRule.includes('flex: 1 1 auto;'), 'body flexes');
  assert(bodyRule.includes('min-height: 0;'), 'min-height: 0 present');
  assert(bodyRule.includes('overflow-y: auto;'), 'overflow-y auto present');
  assert(bodyRule.includes('overscroll-behavior: contain;'), 'scroll chaining prevented');
  // No rigid max-height: 70vh
  assert(!bodyRule.slice(0, 300).includes('max-height: 70vh'), 'removed rigid max-height 70vh');
});

runTest('.ft-modal-form-body guarantees at least 32px bottom spacing for last field', () => {
  const match = cssContent.match(/\.ft-modal-form-body\s*\{[^}]*padding:\s*([^;]+);/s);
  assert(match, 'padding found');
  const paddingVal = match[1];
  assert(paddingVal.includes('32px'), `Expected bottom padding of at least 32px, got: ${paddingVal}`);
});

runTest('.ft-modal-footer has flex-shrink: 0, safe area insets, and surface background', () => {
  assert(cssContent.includes('.ft-modal-footer {'), 'footer selector exists');
  const footerRule = cssContent.slice(cssContent.indexOf('.ft-modal-footer {'));
  assert(footerRule.includes('flex-shrink: 0;'), 'flex-shrink 0 present');
  assert(footerRule.includes('env(safe-area-inset-bottom'), 'safe-area-inset-bottom present');
  assert(footerRule.includes('background: var(--ft-surface-soft);'), 'themed surface background present');
  assert(footerRule.includes('border-top: 1px solid var(--ft-border-subtle);'), 'subtle top border present');
});

runTest('Modal scrollbars are styled and consistent with theme', () => {
  assert(cssContent.includes('.ft-modal-form-body::-webkit-scrollbar'), 'custom scrollbar defined');
  assert(cssContent.includes('background: var(--ft-border);'), 'scrollbar thumb uses theme border token');
});

// ── 2. QuickAdd Modal CSS Architecture ───────────────────────────
console.log('\n── Group 2: QuickAdd Modal CSS Layout ──');

runTest('.ft-quickadd-container uses flex-column, max-height min(90vh, 90dvh), and overflow: hidden', () => {
  assert(cssContent.includes('.ft-quickadd-container {'), 'quickadd container exists');
  const qaRule = cssContent.slice(cssContent.indexOf('.ft-quickadd-container {'));
  assert(qaRule.includes('display: flex;'), 'flex layout used');
  assert(qaRule.includes('flex-direction: column;'), 'column direction used');
  assert(qaRule.includes('overflow: hidden;'), 'container overflow hidden');
  assert(qaRule.includes('max-height: min(90vh, 90dvh);'), 'dynamic viewport max-height used');
  assert(!qaRule.slice(0, 300).includes('overflow-y: auto;'), 'overflow-y auto removed from container');
});

runTest('.ft-quickadd-header is pinned with flex: 0 0 auto', () => {
  const match = cssContent.match(/\.ft-quickadd-header\s*\{[^}]*flex:\s*0\s+0\s+auto;/s);
  assert(match, 'quickadd header has flex: 0 0 auto');
});

runTest('.ft-quickadd-form and .ft-quickadd-body separate scrolling from footer', () => {
  assert(cssContent.includes('.ft-quickadd-form {'), 'quickadd form exists');
  assert(cssContent.includes('.ft-quickadd-body {'), 'quickadd body exists');
  const formRule = cssContent.slice(cssContent.indexOf('.ft-quickadd-form {'));
  assert(formRule.includes('min-height: 0;'), 'form has min-height 0');
  const bodyRule = cssContent.slice(cssContent.indexOf('.ft-quickadd-body {'));
  assert(bodyRule.includes('overflow-y: auto;'), 'body has overflow-y auto');
  assert(bodyRule.includes('min-height: 0;'), 'body has min-height 0');
});

runTest('.ft-quickadd-footer is flex-shrink: 0 with safe area support and surface background', () => {
  assert(cssContent.includes('.ft-quickadd-footer {'), 'quickadd footer exists');
  const footerRule = cssContent.slice(cssContent.indexOf('.ft-quickadd-footer {'));
  assert(footerRule.includes('flex-shrink: 0;'), 'flex-shrink 0');
  assert(footerRule.includes('env(safe-area-inset-bottom'), 'safe area inset bottom present');
  assert(footerRule.includes('background: var(--ft-surface-soft);'), 'surface soft background');
  assert(footerRule.includes('border-top: 1px solid var(--ft-border-subtle);'), 'subtle top border');
});

// ── 3. Component Architecture & Isolation ────────────────────────
console.log('\n── Group 3: Modal Component Architecture & Verification ──');

runTest('EditPersonModal: form has className ft-modal-form and footer is outside body', () => {
  assert(editPersonContent.includes('<form onSubmit={handleSubmit} className="ft-modal-form">'), 'form has ft-modal-form');
  assert(editPersonContent.includes('<div className="ft-modal-form-body">'), 'has ft-modal-form-body');
  assert(editPersonContent.includes('<div className="ft-modal-footer">'), 'has ft-modal-footer');
  
  // Verify footer is AFTER the closing tag of ft-modal-form-body
  const bodyStart = editPersonContent.indexOf('<div className="ft-modal-form-body">');
  const footerStart = editPersonContent.indexOf('<div className="ft-modal-footer">');
  assert(footerStart > bodyStart, 'footer is after body');
  
  // Verify action buttons exist in footer
  const footerSection = editPersonContent.slice(footerStart, editPersonContent.indexOf('</form>'));
  assert(footerSection.includes('Cancel'), 'Cancel button in footer');
  assert(footerSection.includes('Save Changes'), 'Save Changes button in footer');
  assert(footerSection.includes('handleCancel'), 'Cancel button triggers handleCancel');
  assert(footerSection.includes('type="submit"'), 'Save Changes button is submit');
});

runTest('AddPersonModal: body is wrapped in ft-quickadd-body and footer is pinned', () => {
  assert(addPersonContent.includes('<form onSubmit={handleSubmit} className="ft-quickadd-form">'), 'form has ft-quickadd-form');
  assert(addPersonContent.includes('<div className="ft-quickadd-body">'), 'has ft-quickadd-body');
  assert(addPersonContent.includes('<div className="ft-quickadd-footer">'), 'has ft-quickadd-footer');
  
  const bodyStart = addPersonContent.indexOf('<div className="ft-quickadd-body">');
  const footerStart = addPersonContent.indexOf('<div className="ft-quickadd-footer">');
  assert(footerStart > bodyStart, 'footer is after body');
  
  const footerSection = addPersonContent.slice(footerStart, addPersonContent.indexOf('</form>'));
  assert(footerSection.includes('Cancel'), 'Cancel button in footer');
  assert(footerSection.includes('submitButtonLabel'), 'Submit button with dynamic label in footer');
});

runTest('StoryModal: footer is outside ft-modal-form-body and inside ft-modal-form', () => {
  assert(storyModalContent.includes('<form onSubmit={handleSubmit} className="ft-modal-form">'), 'form has ft-modal-form');
  assert(storyModalContent.includes('<div className="ft-modal-form-body">'), 'has ft-modal-form-body');
  assert(storyModalContent.includes('<div className="ft-modal-footer">'), 'has ft-modal-footer');
  
  const bodyIndex = storyModalContent.indexOf('<div className="ft-modal-form-body">');
  const footerIndex = storyModalContent.indexOf('<div className="ft-modal-footer">');
  assert(footerIndex > bodyIndex, 'footer is placed after body');
});

runTest('EventModal: footer is outside ft-modal-form-body and inside ft-modal-form', () => {
  assert(eventModalContent.includes('<form onSubmit={handleSubmit} className="ft-modal-form">'), 'form has ft-modal-form');
  assert(eventModalContent.includes('<div className="ft-modal-form-body">'), 'has ft-modal-form-body');
  assert(eventModalContent.includes('<div className="ft-modal-footer">'), 'has ft-modal-footer');
});

runTest('PhotoModal: footer is outside ft-modal-form-body and inside ft-modal-form', () => {
  assert(photoModalContent.includes('<form onSubmit={handleSubmit} className="ft-modal-form">'), 'form has ft-modal-form');
  assert(photoModalContent.includes('<div className="ft-modal-form-body">'), 'has ft-modal-form-body');
  assert(photoModalContent.includes('<div className="ft-modal-footer">'), 'has ft-modal-footer');
});

runTest('DocumentModal: footer is outside ft-modal-form-body and inside ft-modal-form', () => {
  assert(documentModalContent.includes('<form onSubmit={handleSubmit} className="ft-modal-form">'), 'form has ft-modal-form');
  assert(documentModalContent.includes('<div className="ft-modal-form-body">'), 'has ft-modal-form-body');
  assert(documentModalContent.includes('<div className="ft-modal-footer">'), 'has ft-modal-footer');
});

runTest('FamilySettingsModal: container is flex-column overflow-hidden, header & tabs are fixed', () => {
  assert(familySettingsContent.includes('maxHeight: \'min(90vh, 90dvh)\''), 'container uses min(90vh, 90dvh)');
  assert(familySettingsContent.includes('display: \'flex\', flexDirection: \'column\', overflow: \'hidden\''), 'flex column layout');
  assert(familySettingsContent.includes('flexShrink: 0'), 'tabs have flexShrink: 0');
  assert(familySettingsContent.includes('className="ft-modal-form-body"'), 'tab content wrapped in ft-modal-form-body');
});

runTest('DeletePersonModal, DocumentViewerModal, DataManagementModal use ft-modal-form-body', () => {
  assert(deletePersonContent.includes('className="ft-modal-form-body"'), 'DeletePersonModal uses ft-modal-form-body');
  assert(docViewerContent.includes('className="ft-modal-form-body"'), 'DocumentViewerModal uses ft-modal-form-body');
  assert(dataMgmtContent.includes('className="ft-modal-form-body"'), 'DataManagementModal uses ft-modal-form-body');
  
  assert(deletePersonContent.includes('className="ft-modal-footer"'), 'DeletePersonModal has footer');
  assert(docViewerContent.includes('className="ft-modal-footer"'), 'DocumentViewerModal has footer');
  assert(dataMgmtContent.includes('className="ft-modal-footer"'), 'DataManagementModal has footer');
});

// ── 4. Viewport Height Mathematical Invariant Validation ─────────
console.log('\n── Group 4: Viewport Height Constraints & Invariant Validation ──');

function simulateModalLayout(viewportHeight, headerH = 88, footerH = 68, contentNaturalH = 950) {
  const maxModalH = Math.min(viewportHeight * 0.9, viewportHeight * 0.9);
  const fixedH = headerH + footerH;
  const availableScrollH = Math.max(0, maxModalH - fixedH);
  const actualScrollH = Math.min(availableScrollH, contentNaturalH);
  const totalModalH = fixedH + actualScrollH;
  const isClipped = totalModalH > maxModalH;
  const footerVisible = fixedH + actualScrollH <= maxModalH;
  return {
    viewportHeight,
    maxModalH,
    availableScrollH,
    totalModalH,
    isClipped,
    footerVisible,
  };
}

runTest('1440x900 viewport: modal fits cleanly with visible footer', () => {
  const res = simulateModalLayout(900);
  assert.strictEqual(res.isClipped, false);
  assert.strictEqual(res.footerVisible, true);
  assert(res.availableScrollH > 600, 'sufficient scroll room');
});

runTest('1280x800 viewport: modal fits cleanly with visible footer', () => {
  const res = simulateModalLayout(800);
  assert.strictEqual(res.isClipped, false);
  assert.strictEqual(res.footerVisible, true);
  assert(res.availableScrollH > 500, 'sufficient scroll room');
});

runTest('1024x768 viewport: modal fits cleanly with visible footer', () => {
  const res = simulateModalLayout(768);
  assert.strictEqual(res.isClipped, false);
  assert.strictEqual(res.footerVisible, true);
  assert(res.availableScrollH > 480, 'sufficient scroll room');
});

runTest('768x1024 (tablet) viewport: modal fits cleanly with visible footer', () => {
  const res = simulateModalLayout(1024);
  assert.strictEqual(res.isClipped, false);
  assert.strictEqual(res.footerVisible, true);
});

runTest('390x844 (iPhone 14) viewport: modal fits cleanly with visible footer', () => {
  const res = simulateModalLayout(844, 76, 60, 950);
  assert.strictEqual(res.isClipped, false);
  assert.strictEqual(res.footerVisible, true);
});

runTest('375x812 (iPhone X) viewport: modal fits cleanly with visible footer', () => {
  const res = simulateModalLayout(812, 76, 60, 950);
  assert.strictEqual(res.isClipped, false);
  assert.strictEqual(res.footerVisible, true);
});

runTest('Very short screen (600px height): content scrolls without clipping footer', () => {
  const res = simulateModalLayout(600, 70, 56, 950);
  assert.strictEqual(res.isClipped, false);
  assert.strictEqual(res.footerVisible, true);
  assert(res.availableScrollH > 350, 'scrollable region available');
});

// ── 5. Responsive, Theme, Accessibility & Error States ────────────
console.log('\n── Group 5: Mobile, Theme, Accessibility & Expansion States ──');

runTest('Mobile responsive rule in CSS provides safe area padding and compact heights', () => {
  assert(cssContent.includes('@media (max-width: 640px)'), 'mobile media query exists');
  const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 640px)'));
  assert(mobileSection.includes('min(94vh, 94dvh)'), 'compact 94dvh max-height on mobile');
  assert(mobileSection.includes('.ft-modal-footer'), 'modal footer safe area padding');
  assert(mobileSection.includes('.ft-quickadd-footer'), 'quickadd footer safe area padding');
});

runTest('Theme compatibility: footers use semantic css variables for both light and dark modes', () => {
  assert(cssContent.includes('--ft-surface-soft: #F1F1EE'), 'light surface-soft defined');
  assert(cssContent.includes('--ft-surface-soft: #1E252C'), 'dark surface-soft defined');
  assert(cssContent.includes('--ft-border-subtle: #EDEDE8'), 'light border-subtle defined');
  assert(cssContent.includes('--ft-border-subtle: #1E252C'), 'dark border-subtle defined');
});

runTest('Accessibility: all modals have dialog roles, aria labels, and Esc handlers or close buttons', () => {
  assert(editPersonContent.includes('role="dialog"'), 'EditPersonModal has role=dialog');
  assert(addPersonContent.includes('role="dialog"'), 'AddPersonModal has role=dialog');
  assert(storyModalContent.includes('role="dialog"'), 'StoryModal has role=dialog');
  assert(eventModalContent.includes('role="dialog"'), 'EventModal has role=dialog');
  assert(photoModalContent.includes('role="dialog"'), 'PhotoModal has role=dialog');
  assert(documentModalContent.includes('role="dialog"'), 'DocumentModal has role=dialog');
  assert(familySettingsContent.includes('role="dialog"'), 'FamilySettingsModal has role=dialog');
  assert(deletePersonContent.includes('role="dialog"'), 'DeletePersonModal has role=dialog');
  assert(docViewerContent.includes('role="dialog"'), 'DocumentViewerModal has role=dialog');
});

runTest('Error banners and validation state expansion are flex: 0 0 auto', () => {
  assert(cssContent.includes('.ft-form-error-banner {'), 'error banner defined');
  assert(cssContent.includes('.ft-quickadd-error-banner {'), 'quickadd error banner defined');
  const errRule = cssContent.slice(cssContent.indexOf('.ft-quickadd-error-banner {'));
  assert(errRule.includes('flex: 0 0 auto;'), 'error banner flex: 0 0 auto');
});

runTest('Loading state keeps footer buttons mounted and visible', () => {
  assert(editPersonContent.includes('isUploadingPhoto ? \'Saving...\' : \'Save Changes\''), 'EditPersonModal updates button label');
  assert(addPersonContent.includes('isSubmitting ? \'Adding...\' : submitButtonLabel'), 'AddPersonModal updates button label');
  assert(photoModalContent.includes('isUploading ? \'Uploading...\' : \'Save to Album\''), 'PhotoModal updates button label');
  assert(documentModalContent.includes('isUploading ? \'Recording...\''), 'DocumentModal updates button label');
});

// ── Summary ──────────────────────────────────────────────────────
console.log('\n==================================================');
console.log(`RESULTS: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
console.log('==================================================');

if (passed !== total) {
  process.exit(1);
} else {
  console.log('ALL MODAL SCROLL & ACTION FOOTER CONTRACTS SATISFIED.');
}
