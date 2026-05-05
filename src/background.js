import {
  getLearningItems,
  getAllCardProgress,
  createAttemptLog,
  createCardProgress,
  updateCardProgress,
  syncCardProgress,
  syncAttemptLogs
} from './database';

const SESSION_CHECK_INTERVAL_MINUTES = 1;
const NOTIFICATION_INTERVAL_SECONDS = 30;
const NOTIFICATION_INTERVAL_MINUTES = NOTIFICATION_INTERVAL_SECONDS / 60;
const SESSION_START_HOUR = 21;
const SESSION_END_HOUR = 22;
const SESSION_DURATION_MINUTES = 1;
const COLLECTION_ID = "8366d809-1495-4b6c-a184-330158ad1da0";
const NOTIFICATION_TIMEOUT_MS = 30000;
const NOTIFICATION_PRIORITY = 2;

let sessionActive = false;
let currentNotificationItem = null;

const initializeAlarms = () => {
  createAlarms();
};

chrome.runtime.onInstalled.addListener(initializeAlarms);
chrome.runtime.onStartup.addListener(initializeAlarms);

function createAlarms() {
  chrome.alarms.create("sessionAlarm", {
    periodInMinutes: SESSION_CHECK_INTERVAL_MINUTES,
  });

  const endTime = Date.now() + SESSION_DURATION_MINUTES * 60 * 1000;

  chrome.storage.local.set({
    endTime,
    lastMinutes: SESSION_DURATION_MINUTES,
    intervalSeconds: NOTIFICATION_INTERVAL_SECONDS,
  });

  chrome.alarms.create("notificationAlarm", {
    periodInMinutes: NOTIFICATION_INTERVAL_MINUTES,
  });
}

const ALARM_HANDLERS = {
  sessionAlarm: checkSessionTime,
  notificationAlarm: () => {
    if (sessionActive) {
      sendNotification();
    }
  },
};

chrome.alarms.onAlarm.addListener((alarm) => {
  const handler = ALARM_HANDLERS[alarm.name];
  if (handler) {
    handler();
  }
});

function checkSessionTime() {
  const hour = new Date().getHours();

  if (hour === SESSION_START_HOUR && !sessionActive) {
    sessionActive = true;
  } else if (hour === SESSION_END_HOUR && sessionActive) {
    sessionActive = false;
  }
}

async function sendNotification() {
  const items = await getLearningItems(COLLECTION_ID);

  if (!items || items.length === 0) {
    return;
  }

  const randomQuestion = items[Math.floor(Math.random() * items.length)];
  const notificationId = `flashcard-${Date.now()}`;

  currentNotificationItem = randomQuestion;

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.png"),
    title: randomQuestion.title,
    message: JSON.stringify(randomQuestion.content ?? {}),
    buttons: [{ title: "Review Later" }, { title: "Answered Correctly" }],
    priority: NOTIFICATION_PRIORITY,
    silent: true,
    requireInteraction: true,
  }, () => {
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
      currentNotificationItem = null;
    }, NOTIFICATION_TIMEOUT_MS);
  });
}

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (!currentNotificationItem?.id) return;

  const now = new Date().toISOString();
  const buttonLabels = ["Review Later", "Answered Correctly"];
  const buttonLabel = buttonLabels[buttonIndex];

  const easeScores = {
    "Review Later": 0.0,
    "Answered Correctly": 1.0
  };

  const easeScore = easeScores[buttonLabel] ?? 0.0;

  try {
    await createAttemptLog({
      learning_item_id: currentNotificationItem.id,
      ease_score: easeScore,
      is_correct: easeScore > 0.3,
      created_at: now
    });
    await syncAttemptLogs();

    const allProgress = await getAllCardProgress();
    const progress = allProgress.find(p => p.learning_item_id === currentNotificationItem.id);

    if (progress) {
      const totalAttempts = progress.total_attempts + 1;
      const weightedSum = progress.weighted_attempts + easeScore;
      const newStrength = weightedSum / totalAttempts;

      await updateCardProgress({
        ...progress,
        strength_score: Math.max(0, Math.min(1, newStrength)),
        last_reviewed_at: now,
        total_attempts: totalAttempts,
        weighted_attempts: weightedSum
      });
    } else {
      await createCardProgress({
        learning_item_id: currentNotificationItem.id,
        strength_score: easeScore,
        last_reviewed_at: now,
        total_attempts: 1,
        weighted_attempts: easeScore
      });
    }

    await syncCardProgress();
  } catch (error) {
    console.error('Error recording attempt from notification:', error);
  }

  chrome.notifications.clear(notificationId);
  currentNotificationItem = null;
});

chrome.notifications.onClosed.addListener((notificationId) => {
  currentNotificationItem = null;
});

function stopSessionManually() {
  sessionActive = false;
  chrome.notifications.clearAll?.();
}