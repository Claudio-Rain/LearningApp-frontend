import { getHours } from 'date-fns';
import { SESSION_CHECK_INTERVAL_MINUTES } from '../constants.js';
import { getStudySettings } from '../utils/storage.js';

let sessionActive = false;

export function isSessionActive() {
  return sessionActive;
}

export function setSessionActive(active) {
  sessionActive = active;
}

export async function createAlarms() {
  const { intervalSeconds } = await getStudySettings();
  const intervalMinutes = intervalSeconds / 60;

  console.log('[background] createAlarms: creating sessionAlarm every', SESSION_CHECK_INTERVAL_MINUTES, 'min');
  chrome.alarms.create("sessionAlarm", {
    periodInMinutes: SESSION_CHECK_INTERVAL_MINUTES,
  });

  console.log('[background] createAlarms: creating notificationAlarm every', intervalMinutes, 'min');
  chrome.alarms.create("notificationAlarm", {
    periodInMinutes: intervalMinutes,
  });

  console.log('[background] createAlarms: creating contentAlarm every 1 min');
  chrome.alarms.create("contentAlarm", {
    periodInMinutes: 1,
  });
}

export async function checkSessionTime() {
  const { startHour, endHour } = await getStudySettings();
  const hour = getHours(new Date());
  console.log('[background] checkSessionTime: hour =', hour, '| sessionActive =', sessionActive);

  const shouldBeActive = hour >= startHour && hour < endHour;
  if (shouldBeActive && !sessionActive) {
    console.log('[background] session STARTED');
    sessionActive = true;
  } else if (!shouldBeActive && sessionActive) {
    console.log('[background] session ENDED');
    sessionActive = false;
  } else {
    console.log('[background] no session state change (START_HOUR:', startHour, 'END_HOUR:', endHour, ')');
  }
}

export function initializeAlarms() {
  console.log('[background] initializeAlarms called');
  createAlarms();
}

export function stopSessionManually() {
  sessionActive = false;
  chrome.notifications.clearAll?.();
}
