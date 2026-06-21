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
import type { Category } from '../types'

export async function getCategories(): Promise<Category[]> {
  const snapshot = await getDocs(collection(db, 'categories'))
  return snapshot.docs.map(doc => ({ ...doc.data(), remoteId: doc.id } as Category))
}

export async function addCategory(cat: Category): Promise<string> {
  const docRef = await addDoc(collection(db, 'categories'), cat)
  return docRef.id
}

export async function deleteCategory(remoteId: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', remoteId))
}

export async function updateCategory(cat: Category): Promise<void> {
  const { remoteId, ...data } = cat
  await updateDoc(doc(db, 'categories', remoteId!), data)
}

export async function setCategory(cat: Category): Promise<void> {
  const { id, syncStatus, ...data } = cat
  await setDoc(doc(db, 'categories', id!), data)
}
