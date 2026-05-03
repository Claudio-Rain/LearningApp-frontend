import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc
} from 'firebase/firestore'
import { db } from './firebase'
import type { Collection } from '../types'

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

export async function setCollection(col: Collection): Promise<void> {
  const { id, syncStatus, ...data } = col
  await setDoc(doc(db, 'collections', id!), data)
}
