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
  const { intervalSeconds, contentAutoAdvanceSeconds } = await getStudySettings();
  const intervalMinutes = intervalSeconds / 60;

  console.log('[background] createAlarms: creating sessionAlarm every', SESSION_CHECK_INTERVAL_MINUTES, 'min');
  chrome.alarms.create("sessionAlarm", {
    periodInMinutes: SESSION_CHECK_INTERVAL_MINUTES,
  });

  console.log('[background] createAlarms: creating notificationAlarm every', intervalMinutes, 'min');
  chrome.alarms.create("notificationAlarm", {
    periodInMinutes: intervalMinutes,
  });

  const contentMinutes = contentAutoAdvanceSeconds / 60;
  console.log('[background] createAlarms: creating contentAlarm every', contentMinutes, 'min');
  chrome.alarms.create("contentAlarm", {
    periodInMinutes: contentMinutes,
  });
}

// Re-arm the auto-advance alarm so its clock restarts from now, using the
// currently-configured interval. Called whenever a new content item is shown
// (rating, navigation, or the tick itself) so the background never pushes a
// fresh item while the user is mid-read — it keeps the alarm in sync with the
// widget's visible per-item countdown.
export async function resetContentAlarm() {
  const { contentAutoAdvanceSeconds } = await getStudySettings();
  chrome.alarms.create("contentAlarm", {
    periodInMinutes: contentAutoAdvanceSeconds / 60,
  });
}

// Suspend auto-advance while the user is busy with the card (e.g. the widget's
// AI chat is open). The widget keeps its own countdown paused in parallel and
// calls resumeContentAlarm with the seconds it had left.
export function pauseContentAlarm() {
  chrome.alarms.clear("contentAlarm");
}

// Re-arm auto-advance after a pause: fire once after the remaining time, then
// fall back to the regular interval. Chrome clamps sub-30s alarms, so treat a
// nearly-expired countdown as "advance as soon as allowed".
export async function resumeContentAlarm(secondsLeft) {
  const { contentAutoAdvanceSeconds } = await getStudySettings();
  const remaining = Number.isFinite(secondsLeft) && secondsLeft > 0
    ? Math.min(secondsLeft, contentAutoAdvanceSeconds)
    : contentAutoAdvanceSeconds;
  chrome.alarms.create("contentAlarm", {
    delayInMinutes: remaining / 60,
    periodInMinutes: contentAutoAdvanceSeconds / 60,
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
