import { openDB } from 'idb'

const DB_NAME = 'collections-db'
const COLLECTIONS_STORE = 'collections'
const LEARNING_ITEMS_STORE = 'learning_items'

export const dbPromise = openDB(DB_NAME, 2, {
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
  }
})

export { COLLECTIONS_STORE, LEARNING_ITEMS_STORE }
