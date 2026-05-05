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
import type { AttemptLog } from '../types'

export async function getAttemptLogs(itemId: string): Promise<AttemptLog[]> {
  const q = query(
    collection(db, 'attempt_log'),
    where('learning_item_id', '==', itemId)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ ...doc.data(), remoteId: doc.id } as AttemptLog))
}

export async function addAttemptLog(log: AttemptLog): Promise<string> {
  const docRef = await addDoc(collection(db, 'attempt_log'), log)
  return docRef.id
}

export async function deleteAttemptLog(remoteId: string): Promise<void> {
  await deleteDoc(doc(db, 'attempt_log', remoteId))
}

export async function updateAttemptLog(log: AttemptLog): Promise<void> {
  const { remoteId, ...data } = log
  await updateDoc(doc(db, 'attempt_log', remoteId!), data)
}

export async function setAttemptLog(log: AttemptLog): Promise<void> {
  const { id, syncStatus, ...data } = log
  await setDoc(doc(db, 'attempt_log', id!), data)
}

export async function deleteAttemptLogsByItemId(itemId: string): Promise<void> {
  const logs = await getAttemptLogs(itemId)
  for (const log of logs) {
    if (log.remoteId) {
      await deleteDoc(doc(db, 'attempt_log', log.remoteId))
    }
  }
}