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
import type { CardProgress } from '../types'

export async function getCardProgress(itemId: string): Promise<CardProgress | undefined> {
  const q = query(
    collection(db, 'card_progress'),
    where('learning_item_id', '==', itemId)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs[0]
    ? ({ ...snapshot.docs[0].data(), remoteId: snapshot.docs[0].id } as CardProgress)
    : undefined
}

export async function getAllCardProgress(): Promise<CardProgress[]> {
  const snapshot = await getDocs(collection(db, 'card_progress'))
  return snapshot.docs.map(doc => ({ ...doc.data(), remoteId: doc.id } as CardProgress))
}

export async function addCardProgress(progress: CardProgress): Promise<string> {
  const docRef = await addDoc(collection(db, 'card_progress'), progress)
  return docRef.id
}

export async function deleteCardProgress(remoteId: string): Promise<void> {
  await deleteDoc(doc(db, 'card_progress', remoteId))
}

export async function updateCardProgress(progress: CardProgress): Promise<void> {
  const { remoteId, ...data } = progress
  await updateDoc(doc(db, 'card_progress', remoteId!), data)
}

export async function setCardProgress(progress: CardProgress): Promise<void> {
  const { id, syncStatus, ...data } = progress
  await setDoc(doc(db, 'card_progress', id!), data)
}