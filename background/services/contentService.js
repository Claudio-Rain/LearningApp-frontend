import {
  getLearningItems,
  getAllCardProgress,
  getCollections,
  getAllExcludedItems
} from '../../src/database/index.ts';
import { getStudySettings, setContentLearningItemId } from '../utils/storage.js';
import { parseISO } from 'date-fns';

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

  const [rawItems, allProgress, excluded] = await Promise.all([
    getLearningItems(collectionId),
    getAllCardProgress(),
    getAllExcludedItems()
  ]);

  const excludedSet = new Set(excluded.map(e => e.learningItemId));
  const items = (rawItems || []).filter(i => !excludedSet.has(i.id));

  console.log('[background] fetchRandomContent: items fetched, count =', items?.length ?? 0);

  if (!items || items.length === 0) {
    console.warn('[background] fetchRandomContent: no items found, skipping content update');
    return;
  }

  const progressMap = new Map(allProgress.map(p => [p.learning_item_id, p]));
  const itemToShow = selectWeakestContent(items, progressMap);

  console.log('[background] fetchRandomContent: selected item', itemToShow.title, '| has content:', !!itemToShow.content);

  await setContentLearningItemId(itemToShow.id);
  await notifyAllTabs(itemToShow);
}

function selectWeakestContent(items, progressMap) {
  // Sort by StudyView logic: new items first, then weakest, then least recently reviewed
  const sortedItems = items
    .map((item) => ({
      ...item,
      progress: progressMap.get(item.id)
    }))
    .sort((a, b) => {
      const aIsNew = !a.progress || a.progress.total_attempts === 0
      const bIsNew = !b.progress || b.progress.total_attempts === 0

      // Primary: new (never revised) items first
      if (aIsNew !== bIsNew) return aIsNew ? -1 : 1

      const aStrength = a.progress?.strength_score ?? 0
      const bStrength = b.progress?.strength_score ?? 0

      // Secondary: weakest items first
      if (aStrength !== bStrength) return aStrength - bStrength

      // Tertiary: least recently reviewed first
      const aReviewed = a.progress?.last_reviewed_at ? parseISO(a.progress.last_reviewed_at).getTime() : Number.MAX_VALUE
      const bReviewed = b.progress?.last_reviewed_at ? parseISO(b.progress.last_reviewed_at).getTime() : Number.MAX_VALUE
      if (aReviewed !== bReviewed) return aReviewed - bReviewed

      // Quaternary: alphabetically by title
      return a.title.localeCompare(b.title)
    })

  return sortedItems[0]
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
