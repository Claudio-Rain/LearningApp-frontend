// db/remote/firestore.ts
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
import type { Collection, LearningItem } from '../types'

// Collections
export async function getCollections(): Promise<Collection[]> {
  const snapshot = await getDocs(collection(db, 'collections'))
  return snapshot.docs.map(doc => ({ ...doc.data(), remoteId: doc.id } as Collection))
}

export async function addCollection(col: Collection): Promise<string> {
  const docRef = await addDoc(collection(db, 'collections'), col)
  return docRef.id
}

export async function deleteCollection(remoteId: string): Promise<void> {
  await deleteDoc(doc(db, 'collections', remoteId))
}

export async function updateCollection(col: Collection): Promise<void> {
  const { remoteId, ...data } = col
  await updateDoc(doc(db, 'collections', remoteId!), data)
}

export async function setCollection(col: Collection) {
  const { id, syncStatus, ...data } = col
  await setDoc(doc(db, 'collections', id!), data)
}

// Learning Items
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
    lastModified: new Date().toISOString()
  })
}

export async function setLearningItem(item: LearningItem) {
  const { id, syncStatus, ...data } = item
  await setDoc(doc(db, 'learning_items', id!), data)
}