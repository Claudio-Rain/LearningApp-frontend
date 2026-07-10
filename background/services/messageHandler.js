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
import {
  removeLearningItem,
  createExcludedItem,
  createLearningItem,
  editLearningItem,
  syncLearningItems,
  getCollections,
  editCollection,
  syncCollections
} from '../../src/database/index.ts';
import { formatISO } from 'date-fns';
import { generateAnswerMarkdown, cardChatMarkdown, hasApiKey, setApiKey } from '../../src/utils/claude.ts';
import { markdownToTiptap } from '../../src/utils/markdown.ts';

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
  } else if (request.action === 'excludeContentItem') {
    console.log('[background] received excludeContentItem from content script');
    handleExcludeContentItem();
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
  } else if (request.action === 'requestContent') {
    console.log('[background] received requestContent from content script');
    // false = re-show the current session item; don't advance the cursor.
    fetchNextContentItem(false);
    sendResponse({ success: true });
  } else if (request.action === 'openEditTab') {
    const url = chrome.runtime.getURL(`index.html#/collections/${request.collectionId}/${request.itemId}`);
    chrome.tabs.create({ url });
    sendResponse({ success: true });
  } else if (request.action === 'getCollections') {
    getCollections()
      .then((cols) => sendResponse({
        success: true,
        collections: cols.map((c) => ({ id: c.id, title: c.title }))
      }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  } else if (request.action === 'createItem') {
    handleCreateItem(request, _sender)
      .then((res) => sendResponse(res))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  } else if (request.action === 'hasApiKey') {
    hasApiKey()
      .then((has) => sendResponse({ success: true, hasKey: has }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  } else if (request.action === 'setApiKey') {
    setApiKey(request.key)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  } else if (request.action === 'cardChat') {
    // Answer as TipTap JSON so the content script can reuse its existing renderer.
    cardChatMarkdown(request.title, request.body || '', request.messages)
      .then((markdown) => sendResponse({ success: true, markdown, content: markdownToTiptap(markdown) }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  }
}

// Send a toast back to the content script that initiated the request.
function notifyTab(tabId, message, isError = false) {
  if (typeof tabId !== 'number') return;
  chrome.tabs.sendMessage(tabId, { action: 'notify', message, isError }).catch(() => {});
}

async function handleCreateItem({ title, collectionId, autoAnswer }, sender) {
  const now = formatISO(new Date());
  const id = String(await createLearningItem({ collectionId, title, dateCreated: now, lastModified: now }));

  // Keep the collection's item count in step with the SPA's "Add" behavior.
  const collection = (await getCollections()).find((c) => c.id === collectionId);
  if (collection) {
    await editCollection({ ...collection, numberOfItems: (collection.numberOfItems || 0) + 1, lastModified: now });
    await syncCollections();
  }
  await syncLearningItems();

  // The card already exists; let Claude fill the answer in the background so the
  // UI doesn't block. It re-syncs once the content is ready, and reports back to
  // the originating tab on success or failure.
  if (autoAnswer) {
    const tabId = sender?.tab?.id;
    generateAutoAnswer(id, collectionId, title, now)
      .then(() => notifyTab(tabId, `Claude answered "${title}"`))
      .catch((error) => {
        console.error('[background] auto-answer failed:', error);
        notifyTab(tabId, `Auto-answer failed: ${error.message}`, true);
      });
  }
  return { success: true, id };
}

async function generateAutoAnswer(id, collectionId, title, dateCreated) {
  const markdown = await generateAnswerMarkdown(title);
  const content = markdownToTiptap(markdown);
  await editLearningItem({ id, collectionId, title, content, dateCreated, lastModified: formatISO(new Date()) });
  await syncLearningItems();
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

async function handleExcludeContentItem() {
  const learningItemId = await getContentLearningItemId();
  if (!learningItemId) {
    console.warn('[background] handleExcludeContentItem: no content_learning_item_id');
    return;
  }

  try {
    console.log('[background] handleExcludeContentItem: excluding item', learningItemId);
    await createExcludedItem(learningItemId);
    await removeFromContentSession(learningItemId);
    await fetchNextContentItem(false);
  } catch (error) {
    console.error('[background] handleExcludeContentItem: error excluding item:', error);
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
