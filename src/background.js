import { initializeAlarms, checkSessionTime, isSessionActive, stopSessionManually } from '../background/services/alarmService.js';
import { sendNotification } from '../background/services/notificationService.js';
import { fetchNextContentItem } from '../background/services/contentService.js';
import { setupMessageListeners } from '../background/services/messageHandler.js';
import { pullContentWidget } from './database/index.ts';

// Hydrate the content-widget selection from Firestore into chrome.storage.local so a
// fresh device has it before any contentAlarm fires (the worker never runs the SPA pull).
function hydrateContentWidget() {
  pullContentWidget().catch((err) => console.error('[background] pullContentWidget failed:', err));
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  initializeAlarms();
  hydrateContentWidget();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  initializeAlarms();
  hydrateContentWidget();
});

// Handle alarms
const ALARM_HANDLERS = {
  sessionAlarm: checkSessionTime,
  notificationAlarm: () => {
    if (isSessionActive()) {
      sendNotification();
    }
  },
  contentAlarm: () => fetchNextContentItem(true),
};

chrome.alarms.onAlarm.addListener((alarm) => {
  const handler = ALARM_HANDLERS[alarm.name];
  if (handler) {
    handler();
  }
});

// Setup all message listeners
setupMessageListeners();

// Export for external use (if needed)
export { stopSessionManually };