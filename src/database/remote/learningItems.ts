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
  setDoc
} from 'firebase/firestore'
import { db } from './firebase'
import type { ItemLabels, LearningItem } from '../types'

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

export async function updateLearningItemTitle(remoteId: string, title: string): Promise<void> {
  await updateDoc(doc(db, 'learning_items', remoteId), {
    title,
    lastModified: formatISO(new Date())
  })
}

/**
 * Write label fields on one item without sending its `content`. Bulk labeling
 * touches every item in the library, so this stays a partial `updateDoc` rather
 * than a whole-document `setLearningItem` round-trip. Keys absent from `patch`
 * are left alone on the remote document.
 */
export async function updateLearningItemLabels(
  remoteId: string,
  patch: ItemLabels & { lastModified: string },
): Promise<void> {
  await updateDoc(doc(db, 'learning_items', remoteId), patch)
}

export async function setLearningItem(item: LearningItem): Promise<void> {
  const { id, syncStatus, ...data } = item
  await setDoc(doc(db, 'learning_items', id!), data)
}
