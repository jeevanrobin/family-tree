/**
 * Centralized Motion Tokens & Physics Constants — Medida Family Platform
 * Calibrated for a 3-tier, smooth, responsive, and human physical motion language:
 *
 * FAST:     80–140ms  — button press, icon feedback, micro-spark burst
 * STANDARD: 160–240ms — modals, popovers, card entrance, filter transitions
 * EMPHASIS: 250–400ms — dossier drawer, photo lightbox, view transitions
 */

export const MOTION_TIERS = {
  fast: {
    duration: 110,
    pressScale: 0.98,
    hoverScale: 1.06,
  },
  standard: {
    duration: 200,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  emphasis: {
    duration: 260,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    drawerOffset: 24,
  },
};

export const MOTION_DURATIONS = {
  fast: 110,      // button presses, icon feedback, active states
  standard: 200,  // modal entrance, filters, popovers
  emphasis: 260,  // dossier slide-in, photo lightbox, major view reveals
  micro: 120,     // button presses, spark bursts, icon toggles
  small: 200,     // relation pills, status indicators, badges
  card: 220,      // person card hover lift, selection highlight
  panel: 260,     // dossier slide-in, modal transitions
  camera: 500,    // tree canvas pan & focus glide
  tourStep: 580,  // guided exploration camera travel
  intro: 1200,    // cinematic entrance overlay
};

export const MOTION_EASINGS = {
  // Ultra-smooth deceleration (ease-out cubic / soft spring)
  standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Natural glide for camera motion
  cameraGlide: 'cubic-bezier(0.22, 1, 0.36, 1)',
  // Snappy spring for role pills & badges
  springPop: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  // Subtle soft enter
  softEnter: 'cubic-bezier(0, 0, 0.2, 1)',
};

export const CONSTELLATION_WEIGHTS = {
  selected: { opacity: 1.0, scale: 1.02, zIndex: 20 },
  immediate: { opacity: 0.92, scale: 1.0, zIndex: 12 },   // Parents, Spouse, Children
  sibling: { opacity: 0.84, scale: 1.0, zIndex: 10 },     // Siblings
  extended: { opacity: 0.72, scale: 1.0, zIndex: 8 },     // Grandparents, Grandchildren
  unrelated: { opacity: 0.50, scale: 0.99, zIndex: 4 },   // Unrelated branches
  default: { opacity: 1.0, scale: 1.0, zIndex: 5 },       // No selection active
};
