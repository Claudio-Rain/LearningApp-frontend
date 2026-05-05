import type { CardProgress } from '../types'
import { dbPromise, CARD_PROGRESS_STORE } from './db'

export async function getCardProgress(itemId: string): Promise<CardProgress | undefined> {
  const db = await dbPromise
  const all = await db.getAll(CARD_PROGRESS_STORE)
  return all.find(progress => progress.learning_item_id === itemId)
}

export async function getAllCardProgress(): Promise<CardProgress[]> {
  return (await dbPromise).getAll(CARD_PROGRESS_STORE)
}

export async function addCardProgress(progress: CardProgress): Promise<IDBValidKey> {
  const newProgress = { ...progress, id: crypto.randomUUID() }
  return (await dbPromise).add(CARD_PROGRESS_STORE, newProgress)
}

export async function deleteCardProgress(id: string): Promise<void> {
  await (await dbPromise).delete(CARD_PROGRESS_STORE, id)
}

export async function updateCardProgress(progress: CardProgress): Promise<void> {
  await (await dbPromise).put(CARD_PROGRESS_STORE, progress)
}