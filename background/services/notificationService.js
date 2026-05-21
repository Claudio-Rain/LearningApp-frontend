import {
  getLearningItems,
  getAllCardProgress
} from '../../src/database/index.ts';
import { getStudySettings, setCurrentItem, clearCurrentItem } from '../utils/storage.js';
import { formatNotificationTitle, formatNotificationMessage } from '../utils/notification.js';
import { NOTIFICATION_TIMEOUT_MS, NOTIFICATION_PRIORITY } from '../constants.js';

export async function sendNotification() {
  const { collectionId } = await getStudySettings();
  console.log('[background] sendNotification: fetching items for collection', collectionId);
  const [items, allProgress] = await Promise.all([
    getLearningItems(collectionId),
    getAllCardProgress()
  ]);
  console.log('[background] sendNotification: items fetched, count =', items?.length ?? 0);

  if (!items || items.length === 0) {
    console.warn('[background] sendNotification: no items found, skipping notification');
    return;
  }

  const progressMap = new Map(allProgress.map(p => [p.learning_item_id, p]));
  const nextItem = selectItemByStrength(items, progressMap);
  const notificationId = `flashcard-${Date.now()}`;

  console.log('[background] sendNotification: selected item (strength:', nextItem.progress?.strength_score ?? 'new', ')', nextItem.title);

  await setCurrentItem({ ...nextItem, _notificationId: notificationId });

  await sendToAllTabs(nextItem, notificationId);
  await createNativeNotification(notificationId, nextItem);
}

function selectItemByStrength(items, progressMap) {
  const withStrength = items.map(item => ({
    item,
    strength: progressMap.get(item.id)?.strength_score ?? 0,
  }));

  const weak = withStrength.filter(x => x.strength < 0.5);
  const good = withStrength.filter(x => x.strength >= 0.5 && x.strength < 0.8);

  // Tier priority: weak → good (only when no weak remain) → weakest (cycle back)
  let candidates;
  if (weak.length > 0) {
    candidates = weak;
  } else if (good.length > 0) {
    candidates = good;
  } else {
    // All items are mastered — cycle back by picking the lowest-strength items
    const sorted = [...withStrength].sort((a, b) => a.strength - b.strength);
    const lowestStrength = sorted[0].strength;
    candidates = sorted.filter(x => x.strength <= lowestStrength + 0.05);
  }

  const weighted = candidates.map(({ item, strength }) => ({
    item,
    weight: (1 - strength) + 0.1,
  }));

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * totalWeight;
  return weighted.find(w => (rand -= w.weight) <= 0)?.item ?? candidates[0].item;
}

async function sendToAllTabs(item, notificationId) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showQuestion',
        item: item,
        notificationId: notificationId
      });
    } catch (err) {
      // Tab might not have content script, ignore
    }
  }
}

async function createNativeNotification(notificationId, item) {
  const tabs = await chrome.tabs.query({});

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.png"),
    title: formatNotificationTitle(item.title),
    message: formatNotificationMessage(item.content),
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
      // Also hide modal
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'hideQuestion' });
        } catch (err) {}
      }
      await clearCurrentItem(notificationId);
    }, NOTIFICATION_TIMEOUT_MS);
  });
}
