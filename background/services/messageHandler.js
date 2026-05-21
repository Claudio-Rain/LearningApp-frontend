import { getCurrentItem, clearCurrentItem } from '../utils/storage.js';
import { recordAttempt } from './progressService.js';

export function setupMessageListeners() {
  chrome.notifications.onButtonClicked.addListener(handleNotificationButtonClick);
  chrome.notifications.onClosed.addListener(handleNotificationClosed);
  chrome.runtime.onMessage.addListener(handleContentScriptMessage);
}

async function handleNotificationButtonClick(notificationId, buttonIndex) {
  console.log('[background] onButtonClicked: notificationId =', notificationId, '| buttonIndex =', buttonIndex);
  const currentNotificationItem = await getCurrentItem();
  if (!currentNotificationItem?.id) {
    console.warn('[background] onButtonClicked: no currentNotificationItem, ignoring');
    return;
  }

  console.log('[background] onButtonClicked: item id =', currentNotificationItem.id);

  try {
    await recordAttempt(currentNotificationItem.id, buttonIndex);
  } catch (error) {
    console.error('[background] onButtonClicked: error recording attempt:', error);
  }

  chrome.notifications.clear(notificationId);
  await clearCurrentItem(notificationId);
  console.log('[background] onButtonClicked: done, notification cleared');
}

function handleNotificationClosed(notificationId) {
  console.log('[background] onClosed: notification closed, id =', notificationId);
}

function handleContentScriptMessage(request, _sender, sendResponse) {
  if (request.action === 'buttonClicked') {
    console.log('[background] received buttonClicked from content script, buttonIndex =', request.buttonIndex);
    handleButtonClickedFromContent(request.buttonIndex, request.notificationId);
    sendResponse({ success: true });
  } else if (request.action === 'questionClosed') {
    console.log('[background] question closed from content script');
    handleQuestionClosed(request.notificationId);
    sendResponse({ success: true });
  }
}

async function handleButtonClickedFromContent(buttonIndex, notificationId) {
  const currentNotificationItem = await getCurrentItem();
  if (!currentNotificationItem?.id) {
    console.warn('[background] onMessage: no currentNotificationItem');
    return;
  }

  try {
    await recordAttempt(currentNotificationItem.id, buttonIndex);
  } catch (error) {
    console.error('[background] onMessage: error recording attempt:', error);
  }

  await clearCurrentItem(notificationId);
}

async function handleQuestionClosed(notificationId) {
  await clearCurrentItem(notificationId);
}
