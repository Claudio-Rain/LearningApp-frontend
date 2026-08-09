import { DARK_MODE_KEY } from '../constants.js';

function getWidget() {
  return document.querySelector('.learning-content-widget');
}

export function isDarkMode() {
  return !!getWidget()?.classList.contains('dark');
}

// Mirror the widget's theme so a floating panel matches light/dark.
export function syncPanelTheme(panel) {
  panel?.classList.toggle('dark', isDarkMode());
}

export function restoreDarkMode(widget) {
  if (!widget || typeof chrome === 'undefined' || !chrome.storage) return;
  chrome.storage.local.get(DARK_MODE_KEY, (data) => {
    widget.classList.toggle('dark', !!data?.[DARK_MODE_KEY]);
  });
}

export function toggleDarkMode() {
  const widget = getWidget();
  if (!widget) return;
  const enabled = widget.classList.toggle('dark');
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ [DARK_MODE_KEY]: enabled });
  }
}