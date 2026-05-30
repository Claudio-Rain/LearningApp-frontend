import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc
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
