import { ref } from 'vue'
import { getCollections, getCategories, getLearningItems, getAllCardProgress } from '@/database'
import type { Category } from '@/database'

export interface CatalogCollection {
  id: string
  title: string
  categoryId?: string | null
}

/**
 * One learning item as the catalog sees it: enough to filter and pick a study
 * set, never the card's content. The three numeric axes are what a set is built
 * from — how much it matters, how hard it is, and how well it's known.
 */
export interface CatalogItem {
  id: string
  collectionId: string
  title: string
  priority?: number
  difficulty?: number
  /** 0..1, absent when the card has never been studied. */
  strength?: number
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
// Every item across every collection, with its labels and strength resolved.
// Flat rather than grouped: the study-set builder filters across collections
// before it splits by them.
const items = ref<CatalogItem[]>([])

let inFlight: Promise<void> | null = null

async function fetchAll() {
  loadingCollections.value = true
  try {
    const [raw, cats] = await Promise.all([getCollections(), getCategories()])
    collections.value = raw
      .filter((c): c is typeof c & { id: string } => !!c.id)
      .sort((a, b) => a.title.localeCompare(b.title))
    categories.value = cats

    const perCollection = await Promise.all(
      collections.value.map(async c => ({ collectionId: c.id, items: await getLearningItems(c.id) }))
    )
    collectionItemIds.value = new Map(
      perCollection.map(({ collectionId, items }) =>
        [collectionId, new Set(items.map(i => i.id).filter(Boolean) as string[])] as const
      )
    )

    const progress = await getAllCardProgress()
    strengthByItem.value = new Map(progress.map(p => [p.learning_item_id, p.strength_score]))

    // Built last so each item carries its resolved strength alongside its labels.
    items.value = perCollection.flatMap(({ collectionId, items }) =>
      items
        .filter((i): i is typeof i & { id: string } => !!i.id)
        .map(i => ({
          id: i.id,
          collectionId,
          title: i.title,
          priority: i.priority,
          difficulty: i.difficulty,
          strength: strengthByItem.value.get(i.id)
        }))
    )
  } finally {
    loadingCollections.value = false
  }
}

/**
 * The reference data every Study Options section reads from: the user's
 * collections, their categories, which learning items each collection holds,
 * each item's strength score, and a flat `items` list carrying every item's
 * labels and strength — the input the study-set builder filters over.
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

  return { collections, categories, loadingCollections, collectionItemIds, strengthByItem, items, load }
}
