import { getNotificationLearningItemId, clearNotificationLearningItemId, getContentLearningItemId, clearContentLearningItemId } from '../utils/storage.js';
import { recordAttempt, recordContentRating } from './progressService.js';

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
  } catch (error) {
    console.error('[background] handleContentRating: error recording rating:', error);
  }
}

async function handleQuestionClosed() {
  await clearNotificationLearningItemId();
}
