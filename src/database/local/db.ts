import { openDB } from 'idb'

const DB_NAME = 'collections-db'
const COLLECTIONS_STORE = 'collections'
const LEARNING_ITEMS_STORE = 'learning_items'
const CARD_PROGRESS_STORE = 'card_progress'
const ATTEMPT_LOG_STORE = 'attempt_log'

export const dbPromise = openDB(DB_NAME, 4, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
        db.createObjectStore(COLLECTIONS_STORE, {
          keyPath: 'id',
        })
      }
    }
    if (oldVersion < 2) {
      if (!db.objectStoreNames.contains(LEARNING_ITEMS_STORE)) {
        db.createObjectStore(LEARNING_ITEMS_STORE, {
          keyPath: 'id',
        })
      }
    }
    if (oldVersion < 3) {
      if (!db.objectStoreNames.contains(CARD_PROGRESS_STORE)) {
        db.createObjectStore(CARD_PROGRESS_STORE, {
          keyPath: 'id',
        })
      }
    }
    if (oldVersion < 4) {
      if (!db.objectStoreNames.contains(ATTEMPT_LOG_STORE)) {
        db.createObjectStore(ATTEMPT_LOG_STORE, {
          keyPath: 'id',
        })
      }
    }
  }
})

export { COLLECTIONS_STORE, LEARNING_ITEMS_STORE, CARD_PROGRESS_STORE, ATTEMPT_LOG_STORE }
