import { ref } from 'vue'
import { formatISO } from 'date-fns'
import {
  getCollections,
  createCollection,
  editCollection,
  removeCollection,
  syncCollections,
  getCategories,
  createCategory,
  editCategory,
  removeCategory,
  syncCategories,
  syncAll
} from '@/database'
import type { Category, Collection } from '@/database/types'
import { canMoveInto } from '@/utils/subCollections'

const now = () => formatISO(new Date())

/**
 * Collections and categories for the collections list. Every write goes to the
 * local store, syncs, then reloads, so the list always shows what was stored.
 * Asking the user (prompts, confirms) is left to the caller.
 */
export function useCollectionList() {
  const collections = ref<Collection[]>([])
  const categories = ref<Category[]>([])
  const isSyncing = ref(false)

  const loadCollections = async () => {
    collections.value = await getCollections()
  }

  const loadCategories = async () => {
    categories.value = await getCategories()
  }

  const afterCollectionWrite = async () => {
    await syncCollections()
    await loadCollections()
  }

  const afterCategoryWrite = async () => {
    await syncCategories()
    await loadCategories()
  }

  // --- Collections ---------------------------------------------------------

  const addCollection = async (title: string) => {
    const at = now()
    await createCollection({ title, dateCreated: at, lastModified: at, numberOfItems: 0 })
    await afterCollectionWrite()
  }

  /** Change some fields of a collection (title, description, star, category). */
  const updateCollection = async (collection: Collection, changes: Partial<Collection>) => {
    await editCollection({ ...collection, ...changes, lastModified: now() })
    await afterCollectionWrite()
  }

  /** Rename several collections with a single sync, as the assistant proposes. */
  const renameCollections = async (renames: { id: string; title: string }[]) => {
    const lastModified = now()
    for (const { id, title } of renames) {
      const collection = collections.value.find(c => c.id === id)
      if (collection) await editCollection({ ...collection, title, lastModified })
    }
    await afterCollectionWrite()
  }

  /**
   * Put a collection inside another (null = back to the top level); its own
   * sub-collections and items come along. Categories only apply at the top
   * level, so one moved inside another loses its own.
   */
  const moveCollection = async (id: string, parentId: string | null) => {
    const collection = collections.value.find(c => c.id === id)
    if (!collection || !canMoveInto(id, parentId, collections.value)) return
    const categoryId = parentId ? null : (collection.categoryId ?? null)
    await editCollection({ ...collection, parentId, categoryId, lastModified: now() })
    await afterCollectionWrite()
  }

  const deleteCollection = async (id: string) => {
    await removeCollection(id)
    await afterCollectionWrite()
  }

  // --- Categories ----------------------------------------------------------

  const addCategory = async (title: string, color: string) => {
    const at = now()
    await createCategory({ title, color, parentId: null, dateCreated: at, lastModified: at })
    await afterCategoryWrite()
  }

  const renameCategory = async (category: Category, title: string) => {
    await editCategory({ ...category, title, lastModified: now() })
    await afterCategoryWrite()
  }

  // Its collections become uncategorized, so they are reloaded too.
  const deleteCategory = async (id: string) => {
    await removeCategory(id)
    await afterCategoryWrite()
    await loadCollections()
  }

  // --- Sync ----------------------------------------------------------------

  /** Pull everything from the server, then reload. `beforeCollections` runs in between. */
  const pull = async (beforeCollections?: () => void) => {
    isSyncing.value = true
    try {
      await syncAll()
      await loadCategories()
      beforeCollections?.()
      await loadCollections()
    } finally {
      isSyncing.value = false
    }
  }

  return {
    collections,
    categories,
    isSyncing,
    loadCollections,
    loadCategories,
    addCollection,
    updateCollection,
    renameCollections,
    moveCollection,
    deleteCollection,
    addCategory,
    renameCategory,
    deleteCategory,
    pull
  }
}
