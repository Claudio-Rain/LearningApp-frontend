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
    'contentCollectionIds',
    'sessionStartHour',
    'sessionEndHour',
    'notificationIntervalSeconds',
  ]);
  return {
    collectionId: stored.notificationCollectionId ?? DEFAULT_NOTIFICATION_COLLECTION_ID,
    contentCollectionIds: stored.contentCollectionIds?.length
      ? stored.contentCollectionIds
      : DEFAULT_CONTENT_COLLECTION_ID
        ? [DEFAULT_CONTENT_COLLECTION_ID]
        : [],
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

export async function getContentSession() {
  const { content_session } = await chrome.storage.local.get('content_session');
  return content_session ?? null;
}

export async function setContentSession(session) {
  await chrome.storage.local.set({ content_session: session });
}

export async function clearContentSession() {
  await chrome.storage.local.remove('content_session');
}

export async function removeFromContentSession(itemId) {
  const session = await getContentSession();
  if (!session?.ids) return;
  const idx = session.ids.indexOf(itemId);
  if (idx === -1) return;
  session.ids.splice(idx, 1);
  // Shifting items left: if the removed item was before the cursor, decrement.
  // If it was the current item, the cursor now points at the next item.
  if (idx < session.index) session.index -= 1;
  await setContentSession(session);
}
