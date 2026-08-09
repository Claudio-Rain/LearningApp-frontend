// chrome.storage.local keys owned by the content script.
export const DARK_MODE_KEY = 'contentDarkMode';
export const PANEL_POSITION_KEY = 'contentPanelPosition';

// Timer (mirrors Study View: countdown resets on each new item). The duration
// is configurable in Study Options and arrives with each item's meta; this is
// the fallback until the first item is shown.
export const TIMER_DURATION = 180;

// Circumference of the ring (r = 16 in the SVG viewBox).
export const RING_CIRCUMFERENCE = 2 * Math.PI * 16;

// Daily-goal bar (X / goal) — driven by the calendar-day attempt count in meta.
export const DAILY_GOAL = 100;

// Ease scores behind the rating buttons, keyed by their keyboard shortcut.
// Must stay in sync with the data-score attributes in WIDGET_TEMPLATE.
export const RATING_SCORES = {
  1: -0.15,
  2: -0.1,
  3: 0.1,
  4: 0.15,
};