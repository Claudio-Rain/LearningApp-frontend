import { formatISO } from 'date-fns'
import type { JSONContent } from '@tiptap/vue-3'
import type { ItemLabelPatch, LearningItem } from '../types'
import { dbPromise, LEARNING_ITEMS_STORE } from './db'

export async function getLearningItems(collectionId: string): Promise<LearningItem[]> {
  const db = await dbPromise
  const all = await db.getAll(LEARNING_ITEMS_STORE)
  return all.filter(item => item.collectionId === collectionId)
}

export async function getAllLearningItems(): Promise<LearningItem[]> {
  return (await dbPromise).getAll(LEARNING_ITEMS_STORE)
}

export async function addLearningItem(item: LearningItem): Promise<IDBValidKey> {
  const newItem = JSON.parse(JSON.stringify({ ...item, id: crypto.randomUUID() }))
  return (await dbPromise).add(LEARNING_ITEMS_STORE, newItem)
}

export async function deleteLearningItem(id: string): Promise<void> {
  await (await dbPromise).delete(LEARNING_ITEMS_STORE, id)
}

export async function updateLearningItem(item: LearningItem): Promise<void> {
  await (await dbPromise).put(LEARNING_ITEMS_STORE, JSON.parse(JSON.stringify(item)))
}

/**
 * Apply a pull in a single readwrite transaction. `plan` gets the whole store
 * read inside that same transaction, so a local edit can't slip in between the
 * read and the writes and be overwritten. `plan` must be synchronous: awaiting
 * anything but this transaction's requests would let it auto-commit.
 */
export async function reconcileLearningItems(
  plan: (localItems: LearningItem[]) => { puts: LearningItem[]; deletes: string[] },
): Promise<void> {
  const tx = (await dbPromise).transaction(LEARNING_ITEMS_STORE, 'readwrite')
  const { puts, deletes } = plan(await tx.store.getAll())
  for (const item of puts) tx.store.put(JSON.parse(JSON.stringify(item)))
  for (const id of deletes) tx.store.delete(id)
  await tx.done
}

/**
 * Write both halves of a title at once. Pass `titleContent` only for a rich
 * title; leaving it out drops the field, so the item goes back to plain text
 * rather than keeping a stale document that contradicts `title`.
 */
export async function updateLearningItemTitle(
  id: string,
  title: string,
  titleContent?: JSONContent,
): Promise<void> {
  const db = await dbPromise
  const item = await db.get(LEARNING_ITEMS_STORE, id)
  if (!item) return

  const next = { ...item, title, titleContent, lastModified: formatISO(new Date()) }
  if (!titleContent) delete next.titleContent
  await db.put(LEARNING_ITEMS_STORE, next)
}

/**
 * Merge label fields into one item, leaving `content` untouched. Every key in
 * `patch` is written as given, so the caller drops the ones it isn't setting
 * rather than passing `undefined` (which would erase an existing label).
 * A `null` label is an explicit clear: the key is removed from the record, so a
 * re-read reports the item as unlabeled rather than labeled `null`.
 * No-ops if the item is gone.
 */
export async function updateLearningItemLabels(
  id: string,
  patch: ItemLabelPatch & Partial<Pick<LearningItem, 'lastModified' | 'syncStatus'>>,
): Promise<void> {
  const db = await dbPromise
  const item = await db.get(LEARNING_ITEMS_STORE, id)
  if (!item) return

  const merged = { ...item, ...patch } as LearningItem & Record<string, unknown>
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key]
  }
  await db.put(LEARNING_ITEMS_STORE, merged)
}

/** Set one item's list position (see utils/itemOrder.ts) without touching the rest. */
export async function updateLearningItemPosition(
  id: string,
  patch: Partial<Pick<LearningItem, 'position' | 'lastModified' | 'syncStatus'>>,
): Promise<void> {
  const db = await dbPromise
  const item = await db.get(LEARNING_ITEMS_STORE, id)
  if (!item) return
  await db.put(LEARNING_ITEMS_STORE, { ...item, ...patch })
}
