import {
  getLearningItems,
  getAllCardProgress,
  getCollections,
  getAllExcludedItems
} from '../../src/database/index.ts';
import {
  getStudySettings,
  setContentLearningItemId,
  getContentSession,
  setContentSession
} from '../utils/storage.js';
import { parseISO } from 'date-fns';

// advanceSession: when true (after a rating), move the session cursor forward
// before selecting the item to show. The content alarm leaves it false so it
// re-displays the current session item instead of skipping ahead.
export async function fetchRandomContent(advanceSession = false) {
  const { contentCollectionIds } = await getStudySettings();

  let collectionIds = contentCollectionIds;

  if (!collectionIds || collectionIds.length === 0) {
    const collections = await getCollections();
    if (!collections || collections.length === 0) {
      console.warn('[background] fetchRandomContent: no collections found');
      return;
    }
    collectionIds = [collections[Math.floor(Math.random() * collections.length)].id];
    console.log('[background] fetchRandomContent: randomly selected collection', collectionIds);
  }

  console.log('[background] fetchRandomContent: fetching items for collections', collectionIds);

  const [itemArrays, allProgress, excluded] = await Promise.all([
    Promise.all(collectionIds.map(id => getLearningItems(id))),
    getAllCardProgress(),
    getAllExcludedItems()
  ]);

  const rawItems = itemArrays.flat();

  const excludedSet = new Set(excluded.map(e => e.learningItemId));
  const items = (rawItems || []).filter(i => !excludedSet.has(i.id));

  console.log('[background] fetchRandomContent: items fetched, count =', items?.length ?? 0);

  if (!items || items.length === 0) {
    console.warn('[background] fetchRandomContent: no items found, skipping content update');
    return;
  }

  const progressMap = new Map(allProgress.map(p => [p.learning_item_id, p]));
  const sortedItems = sortByWeakness(items, progressMap);
  const availableIds = new Set(sortedItems.map(i => i.id));

  // Resolve the study-session cursor (a stable queue snapshot + index) so the
  // content widget can show "n / total" the way Study View does.
  const session = await resolveSession(sortedItems, availableIds, advanceSession);
  const itemToShow = sortedItems.find(i => i.id === session.ids[session.index]) ?? sortedItems[0];

  await setContentSession(session);
  await setContentLearningItemId(itemToShow.id);

  console.log('[background] fetchRandomContent: selected item', itemToShow.title, '| has content:', !!itemToShow.content);

  const meta = buildMeta(itemToShow, items, progressMap, session);
  await notifyAllTabs(itemToShow, meta);
}

function sortByWeakness(items, progressMap) {
  // Sort by StudyView logic: new items first, then weakest, then least recently reviewed
  return items
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
}

async function resolveSession(sortedItems, availableIds, advanceSession) {
  let session = await getContentSession();

  // Start a fresh session if there is none or none of its items still exist.
  const valid = session && Array.isArray(session.ids) && session.ids.some(id => availableIds.has(id));
  if (!valid) {
    return { ids: sortedItems.map(i => i.id), index: 0 };
  }

  if (advanceSession) session.index += 1;

  // Skip past items that have been deleted/excluded since the snapshot.
  while (session.index < session.ids.length && !availableIds.has(session.ids[session.index])) {
    session.index += 1;
  }

  // Session finished: rebuild with the current weakest-first ordering.
  if (session.index >= session.ids.length) {
    return { ids: sortedItems.map(i => i.id), index: 0 };
  }

  return session;
}

function buildMeta(itemToShow, items, progressMap, session) {
  let newCards = 0;
  let revisedCards = 0;
  for (const item of items) {
    const p = progressMap.get(item.id);
    if (!p || p.total_attempts === 0) newCards++;
    else revisedCards++;
  }

  const progress = progressMap.get(itemToShow.id);
  const isNew = !progress || progress.total_attempts === 0;

  return {
    sessionIndex: session.index,
    sessionTotal: session.ids.length,
    newCards,
    revisedCards,
    isNew,
    strengthScore: isNew ? null : (progress?.strength_score ?? null)
  };
}

async function notifyAllTabs(item, meta) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateContent',
        item: item,
        meta: meta
      });
    } catch (err) {
      // Tab might not have content script, ignore
    }
  }
}
