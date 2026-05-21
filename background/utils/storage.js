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

export async function setCurrentItem(item) {
  await chrome.storage.local.set({ currentNotificationItem: item });
}

export async function getCurrentItem() {
  const { currentNotificationItem } = await chrome.storage.local.get('currentNotificationItem');
  return currentNotificationItem ?? null;
}

export async function clearCurrentItem(notificationId) {
  const { currentNotificationItem } = await chrome.storage.local.get('currentNotificationItem');
  if (!notificationId || currentNotificationItem?._notificationId === notificationId) {
    await chrome.storage.local.remove('currentNotificationItem');
  }
}

export async function setCurrentContent(item) {
  await chrome.storage.local.set({ currentContent: item });
}

export async function getCurrentContent() {
  const { currentContent } = await chrome.storage.local.get('currentContent');
  return currentContent ?? null;
}

export async function clearCurrentContent() {
  await chrome.storage.local.remove('currentContent');
}
