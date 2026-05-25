import {
  getLearningItems,
  getAllCardProgress,
  getCollections
} from '../../src/database/index.ts';
import { getStudySettings, setContentLearningItemId } from '../utils/storage.js';

export async function fetchRandomContent() {
  const { contentCollectionId } = await getStudySettings();

  let collectionId = contentCollectionId;

  if (!collectionId) {
    const collections = await getCollections();
    if (!collections || collections.length === 0) {
      console.warn('[background] fetchRandomContent: no collections found');
      return;
    }
    collectionId = collections[Math.floor(Math.random() * collections.length)].id;
    console.log('[background] fetchRandomContent: randomly selected collection', collectionId);
  }

  console.log('[background] fetchRandomContent: fetching items for collection', collectionId);

  const [items, allProgress] = await Promise.all([
    getLearningItems(collectionId),
    getAllCardProgress()
  ]);

  console.log('[background] fetchRandomContent: items fetched, count =', items?.length ?? 0);

  if (!items || items.length === 0) {
    console.warn('[background] fetchRandomContent: no items found, skipping content update');
    return;
  }

  const progressMap = new Map(allProgress.map(p => [p.learning_item_id, p]));
  const randomItem = selectRandomContent(items, progressMap);

  console.log('[background] fetchRandomContent: selected item', randomItem.title, '| has content:', !!randomItem.content);

  await setContentLearningItemId(randomItem.id);
  await notifyAllTabs(randomItem);
}

function selectRandomContent(items, progressMap) {
  const withStrength = items.map(item => ({
    item,
    strength: progressMap.get(item.id)?.strength_score ?? 0,
  }));

  const weak = withStrength.filter(x => x.strength < 0.5);
  const good = withStrength.filter(x => x.strength >= 0.5 && x.strength < 0.8);

  let candidates;
  if (weak.length > 0) {
    candidates = weak;
  } else if (good.length > 0) {
    candidates = good;
  } else {
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

async function notifyAllTabs(item) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateContent',
        item: item
      });
    } catch (err) {
      // Tab might not have content script, ignore
    }
  }
}
