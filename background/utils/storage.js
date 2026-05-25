import {
  DEFAULT_NOTIFICATION_COLLECTION_ID,
  DEFAULT_CONTENT_COLLECTION_ID,
  DEFAULT_SESSION_START_HOUR,
  DEFAULT_SESSION_END_HOUR,
  DEFAULT_NOTIFICATION_INTERVAL_SECONDS
} from '../constants.js';

export async function getStudySettings() {
  const stored = await chrome.storage.local.get([
    'notificationCollectionId',
    'contentCollectionId',
    'sessionStartHour',
    'sessionEndHour',
    'notificationIntervalSeconds',
  ]);
  return {
    collectionId: stored.notificationCollectionId ?? DEFAULT_NOTIFICATION_COLLECTION_ID,
    contentCollectionId: stored.contentCollectionId ?? DEFAULT_CONTENT_COLLECTION_ID,
    startHour: stored.sessionStartHour ?? DEFAULT_SESSION_START_HOUR,
    endHour: stored.sessionEndHour ?? DEFAULT_SESSION_END_HOUR,
    intervalSeconds: stored.notificationIntervalSeconds ?? DEFAULT_NOTIFICATION_INTERVAL_SECONDS,
  };
}

export async function setNotificationLearningItemId(itemId) {
  await chrome.storage.local.set({ notification_learning_item_id: itemId });
}

export async function getNotificationLearningItemId() {
  const { notification_learning_item_id } = await chrome.storage.local.get('notification_learning_item_id');
  return notification_learning_item_id ?? null;
}

export async function clearNotificationLearningItemId() {
  await chrome.storage.local.remove('notification_learning_item_id');
}

export async function setContentLearningItemId(itemId) {
  await chrome.storage.local.set({ content_learning_item_id: itemId });
}

export async function getContentLearningItemId() {
  const { content_learning_item_id } = await chrome.storage.local.get('content_learning_item_id');
  return content_learning_item_id ?? null;
}

export async function clearContentLearningItemId() {
  await chrome.storage.local.remove('content_learning_item_id');
}
