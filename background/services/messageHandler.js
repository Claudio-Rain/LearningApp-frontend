import {
  getNotificationLearningItemId,
  clearNotificationLearningItemId,
  getContentLearningItemId,
  getContentSession,
  setContentSession,
  removeFromContentSession
} from '../utils/storage.js';
import { recordAttempt, recordContentRating } from './progressService.js';
import { fetchNextContentItem } from './contentService.js';
import { removeLearningItem } from '../../src/database/index.ts';

export function setupMessageListeners() {
  chrome.notifications.onButtonClicked.addListener(handleNotificationButtonClick);
  chrome.notifications.onClosed.addListener(handleNotificationClosed);
  chrome.runtime.onMessage.addListener(handleContentScriptMessage);
}

async function handleNotificationButtonClick(notificationId, buttonIndex) {
  console.log('[background] onButtonClicked: notificationId =', notificationId, '| buttonIndex =', buttonIndex);
  const learningItemId = await getNotificationLearningItemId();
  if (!learningItemId) {
    console.warn('[background] onButtonClicked: no notification_learning_item_id, ignoring');
    return;
  }

  console.log('[background] onButtonClicked: item id =', learningItemId);

  try {
    await recordAttempt(learningItemId, buttonIndex);
  } catch (error) {
    console.error('[background] onButtonClicked: error recording attempt:', error);
  }

  chrome.notifications.clear(notificationId);
  await clearNotificationLearningItemId();
  console.log('[background] onButtonClicked: done, notification cleared');
}

function handleNotificationClosed(notificationId) {
  console.log('[background] onClosed: notification closed, id =', notificationId);
}

function handleContentScriptMessage(request, _sender, sendResponse) {
  if (request.action === 'buttonClicked') {
    console.log('[background] received buttonClicked from content script, buttonIndex =', request.buttonIndex);
    handleButtonClickedFromNotification(request.buttonIndex);
    sendResponse({ success: true });
  } else if (request.action === 'questionClosed') {
    console.log('[background] question closed from content script');
    handleQuestionClosed();
    sendResponse({ success: true });
  } else if (request.action === 'recordRating') {
    console.log('[background] received recordRating from content script, score =', request.score);
    handleContentRating(request.score);
    sendResponse({ success: true });
  } else if (request.action === 'deleteContentItem') {
    console.log('[background] received deleteContentItem from content script');
    handleDeleteContentItem();
    sendResponse({ success: true });
  } else if (request.action === 'navigatePrev') {
    console.log('[background] received navigatePrev from content script');
    handleNavigate(-1);
    sendResponse({ success: true });
  } else if (request.action === 'navigateNext') {
    console.log('[background] received navigateNext from content script');
    handleNavigate(1);
    sendResponse({ success: true });
  } else if (request.action === 'navigateTo') {
    console.log('[background] received navigateTo from content script, index =', request.index);
    handleNavigateTo(request.index);
    sendResponse({ success: true });
  }
}

async function handleButtonClickedFromNotification(buttonIndex) {
  const learningItemId = await getNotificationLearningItemId();
  if (!learningItemId) {
    console.warn('[background] handleButtonClickedFromNotification: no notification_learning_item_id');
    return;
  }

  try {
    await recordAttempt(learningItemId, buttonIndex);
  } catch (error) {
    console.error('[background] handleButtonClickedFromNotification: error recording attempt:', error);
  }

  await clearNotificationLearningItemId();
}

async function handleContentRating(score) {
  const learningItemId = await getContentLearningItemId();
  if (!learningItemId) {
    console.warn('[background] handleContentRating: no content_learning_item_id');
    return;
  }

  try {
    console.log('[background] handleContentRating: recording rating for item', learningItemId, 'score:', score);
    await recordContentRating(learningItemId, score);

    // Automatically advance the session to the next item
    console.log('[background] handleContentRating: fetching next item');
    await fetchNextContentItem(true);
  } catch (error) {
    console.error('[background] handleContentRating: error recording rating:', error);
  }
}

async function handleDeleteContentItem() {
  const learningItemId = await getContentLearningItemId();
  if (!learningItemId) {
    console.warn('[background] handleDeleteContentItem: no content_learning_item_id');
    return;
  }

  try {
    console.log('[background] handleDeleteContentItem: deleting item', learningItemId);
    await removeLearningItem(learningItemId);
    // Drop it from the session queue; the cursor now points at the next item.
    await removeFromContentSession(learningItemId);
    await fetchNextContentItem(false);
  } catch (error) {
    console.error('[background] handleDeleteContentItem: error deleting item:', error);
  }
}

async function handleNavigate(delta) {
  const session = await getContentSession();
  if (!session?.ids?.length) return;
  session.index = Math.max(0, Math.min(session.ids.length - 1, session.index + delta));
  await setContentSession(session);
  await fetchNextContentItem(false);
}

async function handleNavigateTo(targetIndex) {
  const session = await getContentSession();
  if (!session?.ids?.length) return;
  session.index = Math.max(0, Math.min(session.ids.length - 1, targetIndex));
  await setContentSession(session);
  await fetchNextContentItem(false);
}

async function handleQuestionClosed() {
  await clearNotificationLearningItemId();
}
