import { ref } from 'vue'
import { getCollections, getCategories, getLearningItems, getAllCardProgress } from '@/database'
import type { Category } from '@/database'

export interface CatalogCollection {
  id: string
  title: string
  categoryId?: string | null
}

// Module-level so every section of the Study Options page reads the same
// snapshot instead of each re-querying the local DB.
const collections = ref<CatalogCollection[]>([])
const categories = ref<Category[]>([])
// Starts true so the first render (before the async load) already shows the
// loading state instead of a selector with an unresolved value.
const loadingCollections = ref(true)
// collectionId -> ids of the learning items it contains.
const collectionItemIds = ref<Map<string, Set<string>>>(new Map())
// learning_item_id -> strength_score (0..1). Absent = no progress yet ("New").
const strengthByItem = ref<Map<string, number>>(new Map())

let inFlight: Promise<void> | null = null

async function fetchAll() {
  loadingCollections.value = true
  try {
    const [raw, cats] = await Promise.all([getCollections(), getCategories()])
    collections.value = raw
      .filter((c): c is typeof c & { id: string } => !!c.id)
      .sort((a, b) => a.title.localeCompare(b.title))
    categories.value = cats

    const entries = await Promise.all(
      collections.value.map(async c => {
        const items = await getLearningItems(c.id)
        return [c.id, new Set(items.map(i => i.id).filter(Boolean) as string[])] as const
      })
    )
    collectionItemIds.value = new Map(entries)

    const progress = await getAllCardProgress()
    strengthByItem.value = new Map(progress.map(p => [p.learning_item_id, p.strength_score]))
  } finally {
    loadingCollections.value = false
  }
}

/**
 * The reference data every Study Options section reads from: the user's
 * collections, their categories, which learning items each collection holds,
 * and each item's strength score.
 *
 * It is a read-only catalog — nothing here is edited or saved by the page. All
 * of it comes from the local cache (fast); the global sync engine keeps that
 * cache fresh, so the page never blocks on the network for it.
 */
export function useCollectionCatalog() {
  // Concurrent callers (the page shell and its child sections all mount at
  // once) share one fetch rather than each kicking off their own — so a section
  // that needs the catalog before seeding its own state can just await load(),
  // regardless of whether the shell got there first.
  function load() {
    if (!inFlight) inFlight = fetchAll().finally(() => { inFlight = null })
    return inFlight
  }

  return { collections, categories, loadingCollections, collectionItemIds, strengthByItem, load }
}
