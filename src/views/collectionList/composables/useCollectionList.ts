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
import { dropCollection, type DropPosition } from '../filters'

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

  const addCollection = async (title: string, categoryId: string | null = null) => {
    const at = now()
    await createCollection({ title, categoryId, dateCreated: at, lastModified: at, numberOfItems: 0 })
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
   * Drop a collection before/after another, or inside it (target null = end
   * of the top level); its own sub-collections and items come along. The list
   * shows the new place right away, before the writes finish.
   */
  const moveCollection = async (id: string, targetId: string | null, position: DropPosition) => {
    const lastModified = now()
    const changed = dropCollection(collections.value, id, targetId, position).map(c => ({ ...c, lastModified }))
    if (!changed.length) return
    const byId = new Map(changed.map(c => [c.id, c]))
    collections.value = collections.value.map(c => byId.get(c.id) ?? c)
    await Promise.all(changed.map(c => editCollection(c)))
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
