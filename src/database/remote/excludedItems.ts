import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import type { ExcludedItem } from '../types'

export async function getExcludedItems(): Promise<ExcludedItem[]> {
  const snapshot = await getDocs(collection(db, 'excluded_items'))
  return snapshot.docs.map(doc => ({ ...doc.data(), remoteId: doc.id } as ExcludedItem))
}

export async function addExcludedItem(item: ExcludedItem): Promise<string> {
  const docRef = await addDoc(collection(db, 'excluded_items'), item)
  return docRef.id
}

export async function deleteExcludedItem(remoteId: string): Promise<void> {
  await deleteDoc(doc(db, 'excluded_items', remoteId))
}

export async function setExcludedItem(item: ExcludedItem): Promise<void> {
  const { id, syncStatus, ...data } = item
  await setDoc(doc(db, 'excluded_items', id!), data)
}

// Firestore commits at most 500 operations per batch.
const BATCH_LIMIT = 500

/**
 * Write many exclusions in as few round trips as possible — one per 500 rows,
 * instead of one per row. This is what makes building a study set (which can
 * exclude hundreds of items at once) a second's work rather than minutes.
 *
 * Each doc is keyed by the item's local id, exactly as setExcludedItem does, so
 * a re-run overwrites rather than duplicating. A batch is all-or-nothing: if a
 * chunk throws, none of its rows were written and the caller should leave them
 * pending for the next sync.
 */
export async function setExcludedItems(items: ExcludedItem[]): Promise<void> {
  for (let start = 0; start < items.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const item of items.slice(start, start + BATCH_LIMIT)) {
      const { id, syncStatus, ...data } = item
      batch.set(doc(db, 'excluded_items', id!), data)
    }
    await batch.commit()
  }
}
