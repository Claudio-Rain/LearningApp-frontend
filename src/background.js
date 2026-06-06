import { initializeAlarms, checkSessionTime, isSessionActive, stopSessionManually } from '../background/services/alarmService.js';
import { sendNotification } from '../background/services/notificationService.js';
import { fetchRandomContent } from '../background/services/contentService.js';
import { setupMessageListeners } from '../background/services/messageHandler.js';

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  initializeAlarms();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  initializeAlarms();
});

// Handle alarms
const ALARM_HANDLERS = {
  sessionAlarm: checkSessionTime,
  notificationAlarm: () => {
    if (isSessionActive()) {
      sendNotification();
    }
  },
  contentAlarm: fetchRandomContent,
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