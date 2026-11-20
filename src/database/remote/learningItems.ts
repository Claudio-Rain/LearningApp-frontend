import { formatISO } from 'date-fns'
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  setDoc,
  deleteField,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import type { JSONContent } from '@tiptap/vue-3'
import type { ItemLabelPatch, LearningItem } from '../types'

export async function getLearningItems(collectionRemoteId: string): Promise<LearningItem[]> {
  const q = query(
    collection(db, 'learning_items'),
    where('collectionId', '==', collectionRemoteId)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ ...doc.data(), remoteId: doc.id } as LearningItem))
}

export async function addLearningItem(item: LearningItem): Promise<string> {
  const docRef = await addDoc(collection(db, 'learning_items'), item)
  return docRef.id
}

export async function deleteLearningItem(remoteId: string): Promise<void> {
  await deleteDoc(doc(db, 'learning_items', remoteId))
}

export async function updateLearningItem(item: LearningItem): Promise<void> {
  const { remoteId, ...data } = item
  await updateDoc(doc(db, 'learning_items', remoteId!), data)
}

/**
 * Write both halves of a title at once. Omitting `titleContent` removes the
 * field, so an item edited back down to plain text doesn't keep a stale rich
 * title that a later pull would restore.
 */
export async function updateLearningItemTitle(
  remoteId: string,
  title: string,
  titleContent?: JSONContent,
): Promise<void> {
  await updateDoc(doc(db, 'learning_items', remoteId), {
    title,
    titleContent: titleContent ?? deleteField(),
    lastModified: formatISO(new Date())
  })
}

/**
 * Write label fields on one item without sending its `content`. Bulk labeling
 * touches every item in the library, so this stays a partial `updateDoc` rather
 * than a whole-document `setLearningItem` round-trip. Keys absent from `patch`
 * are left alone on the remote document; a `null` label is an explicit clear
 * and removes the field, so a later pull reports the item as unlabeled.
 */
export async function updateLearningItemLabels(
  remoteId: string,
  patch: ItemLabelPatch & { lastModified: string },
): Promise<void> {
  const data = Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, value === null ? deleteField() : value])
  )
  await updateDoc(doc(db, 'learning_items', remoteId), data)
}

/**
 * Write list positions (see utils/itemOrder.ts) without sending content. The
 * first reorder of a collection numbers every item, so these go out in
 * batches (Firestore allows 500 writes per batch) instead of one by one.
 */
export async function updateLearningItemPositions(
  writes: { id: string; position: number }[],
  lastModified: string,
): Promise<void> {
  for (let start = 0; start < writes.length; start += 500) {
    const batch = writeBatch(db)
    for (const { id, position } of writes.slice(start, start + 500)) {
      batch.update(doc(db, 'learning_items', id), { position, lastModified })
    }
    await batch.commit()
  }
}

export async function setLearningItem(item: LearningItem): Promise<void> {
  const { id, syncStatus, ...data } = item
  await setDoc(doc(db, 'learning_items', id!), data)
}
