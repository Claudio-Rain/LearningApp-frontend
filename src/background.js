import { formatISO, getHours } from 'date-fns'
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
const SESSION_START_HOUR = 12;
const SESSION_END_HOUR = 13;
const SESSION_DURATION_MINUTES = 1;
const COLLECTION_ID = "8366d809-1495-4b6c-a184-330158ad1da0";
const NOTIFICATION_TIMEOUT_MS = 30000;
const NOTIFICATION_PRIORITY = 2;

let sessionActive = false;

async function setCurrentItem(item) {
  await chrome.storage.local.set({ currentNotificationItem: item });
}

async function getCurrentItem() {
  const { currentNotificationItem } = await chrome.storage.local.get('currentNotificationItem');
  return currentNotificationItem ?? null;
}

async function clearCurrentItem(notificationId) {
  const { currentNotificationItem } = await chrome.storage.local.get('currentNotificationItem');
  if (!notificationId || currentNotificationItem?._notificationId === notificationId) {
    await chrome.storage.local.remove('currentNotificationItem');
  }
}

function extractPlainText(node, separator = '\n') {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (!node.content?.length) return '';

  const blockTypes = new Set(['paragraph', 'heading', 'blockquote', 'listItem', 'bulletList', 'orderedList', 'codeBlock']);
  const parts = node.content.map(child => extractPlainText(child, separator));
  return blockTypes.has(node.type)
    ? parts.join('').trim()
    : parts.join(separator);
}

function formatNotificationMessage(content, maxLength = 100) {
  const text = extractPlainText(content).replace(/\n+/g, ' • ').trim();
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}

function formatNotificationTitle(title, maxLength = 50) {
  return title.length > maxLength ? title.slice(0, maxLength - 1) + '…' : title;
}

const initializeAlarms = () => {
  console.log('[background] initializeAlarms called');
  createAlarms();
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('[background] onInstalled fired');
  initializeAlarms();
});
chrome.runtime.onStartup.addListener(() => {
  console.log('[background] onStartup fired');
  initializeAlarms();
});

function createAlarms() {
  console.log('[background] createAlarms: creating sessionAlarm every', SESSION_CHECK_INTERVAL_MINUTES, 'min');
  chrome.alarms.create("sessionAlarm", {
    periodInMinutes: SESSION_CHECK_INTERVAL_MINUTES,
  });

  const endTime = Date.now() + SESSION_DURATION_MINUTES * 60 * 1000;
  console.log('[background] createAlarms: setting storage endTime', formatISO(new Date(endTime)));

  chrome.storage.local.set({
    endTime,
    lastMinutes: SESSION_DURATION_MINUTES,
    intervalSeconds: NOTIFICATION_INTERVAL_SECONDS,
  });

  console.log('[background] createAlarms: creating notificationAlarm every', NOTIFICATION_INTERVAL_MINUTES, 'min');
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
  console.log('[background] alarm fired:', alarm.name);
  const handler = ALARM_HANDLERS[alarm.name];
  if (handler) {
    handler();
  } else {
    console.warn('[background] no handler for alarm:', alarm.name);
  }
});

function checkSessionTime() {
  const hour = getHours(new Date());
  console.log('[background] checkSessionTime: hour =', hour, '| sessionActive =', sessionActive);

  if (hour === SESSION_START_HOUR && !sessionActive) {
    console.log('[background] session STARTED');
    sessionActive = true;
  } else if (hour === SESSION_END_HOUR && sessionActive) {
    console.log('[background] session ENDED');
    sessionActive = false;
  } else {
    console.log('[background] no session state change (START_HOUR:', SESSION_START_HOUR, 'END_HOUR:', SESSION_END_HOUR, ')');
  }
}

async function sendNotification() {
  console.log('[background] sendNotification: fetching items for collection', COLLECTION_ID);
  const [items, allProgress] = await Promise.all([
    getLearningItems(COLLECTION_ID),
    getAllCardProgress()
  ]);
  console.log('[background] sendNotification: items fetched, count =', items?.length ?? 0);

  if (!items || items.length === 0) {
    console.warn('[background] sendNotification: no items found, skipping notification');
    return;
  }

  const progressMap = new Map(allProgress.map(p => [p.learning_item_id, p]));

  const weighted = items.map(item => {
    const strength = progressMap.get(item.id)?.strength_score ?? 0;
    return { item, weight: (1 - strength) + 0.1 };
  });

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * totalWeight;
  const nextItem = weighted.find(w => (rand -= w.weight) <= 0)?.item ?? items[0];

  const notificationId = `flashcard-${Date.now()}`;
  console.log('[background] sendNotification: selected item (strength:', nextItem.progress?.strength_score ?? 'new', ')', nextItem.title);

  await setCurrentItem({ ...nextItem, _notificationId: notificationId });
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.png"),
    title: formatNotificationTitle(nextItem.title),
    message: formatNotificationMessage(nextItem.content),
    buttons: [{ title: "Review Later" }, { title: "Answered Correctly" }],
    priority: NOTIFICATION_PRIORITY,
    silent: true,
    requireInteraction: true,
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[background] sendNotification: failed to create notification:', chrome.runtime.lastError.message);
    } else {
      console.log('[background] sendNotification: notification created, id =', notificationId);
    }
    setTimeout(async () => {
      console.log('[background] sendNotification: auto-clearing notification after timeout', notificationId);
      chrome.notifications.clear(notificationId);
      await clearCurrentItem(notificationId);
    }, NOTIFICATION_TIMEOUT_MS);
  });
}

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  console.log('[background] onButtonClicked: notificationId =', notificationId, '| buttonIndex =', buttonIndex);
  const currentNotificationItem = await getCurrentItem();
  if (!currentNotificationItem?.id) {
    console.warn('[background] onButtonClicked: no currentNotificationItem, ignoring');
    return;
  }

  const now = formatISO(new Date());
  const buttonLabels = ["Review Later", "Answered Correctly"];
  const buttonLabel = buttonLabels[buttonIndex];
  console.log('[background] onButtonClicked: button =', buttonLabel, '| item id =', currentNotificationItem.id);

  const easeScores = {
    "Review Later": -0.3,
    "Answered Correctly": 1.0
  };

  const easeScore = easeScores[buttonLabel] ?? 0.0;
  console.log('[background] onButtonClicked: easeScore =', easeScore);

  try {
    console.log('[background] onButtonClicked: creating attempt log');
    await createAttemptLog({
      learning_item_id: currentNotificationItem.id,
      ease_score: easeScore,
      is_correct: easeScore > 0.3,
      created_at: now
    });
    console.log('[background] onButtonClicked: attempt log created, syncing');
    await syncAttemptLogs();
    console.log('[background] onButtonClicked: attempt logs synced');

    const allProgress = await getAllCardProgress();
    console.log('[background] onButtonClicked: allProgress count =', allProgress?.length ?? 0);
    const progress = allProgress.find(p => p.learning_item_id === currentNotificationItem.id);

    if (progress) {
      const totalAttempts = progress.total_attempts + 1;
      const weightedSum = progress.weighted_attempts + easeScore;
      const newStrength = weightedSum / totalAttempts;
      console.log('[background] onButtonClicked: updating card progress, newStrength =', newStrength);

      await updateCardProgress({
        ...progress,
        strength_score: Math.max(0, Math.min(1, newStrength)),
        last_reviewed_at: now,
        total_attempts: totalAttempts,
        weighted_attempts: weightedSum
      });
      console.log('[background] onButtonClicked: card progress updated');
    } else {
      console.log('[background] onButtonClicked: no existing progress, creating new card progress');
      await createCardProgress({
        learning_item_id: currentNotificationItem.id,
        strength_score: easeScore,
        last_reviewed_at: now,
        total_attempts: 1,
        weighted_attempts: easeScore
      });
      console.log('[background] onButtonClicked: card progress created');
    }

    console.log('[background] onButtonClicked: syncing card progress');
    await syncCardProgress();
    console.log('[background] onButtonClicked: card progress synced');
  } catch (error) {
    console.error('[background] onButtonClicked: error recording attempt:', error);
  }

  chrome.notifications.clear(notificationId);
  await clearCurrentItem(notificationId);
  console.log('[background] onButtonClicked: done, notification cleared');
});

chrome.notifications.onClosed.addListener((notificationId) => {
  console.log('[background] onClosed: notification closed, id =', notificationId);
});

function stopSessionManually() {
  sessionActive = false;
  chrome.notifications.clearAll?.();
}