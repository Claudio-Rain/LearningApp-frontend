import { ref, computed, watch } from 'vue'
import { getLearningItems } from '@/database'
import type { LearningItem } from '@/database'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'
import { useCollectionCatalog } from './useCollectionCatalog'

export type ExclusionItem = LearningItem & { collectionTitle: string; strengthScore: number }

export type SortSpec = { key: string; order: 'asc' | 'desc' }

/**
 * Backing state for the Excluded Items table: which collections it draws from,
 * the merged item list, its filter/sort order, and click-to-toggle (including
 * shift-click ranges).
 *
 * Note this is *not* a form like the page's other three composables — toggling
 * an exclusion persists immediately via useExcludedItems, so there is no save()
 * and the page's Save Settings button does not touch it.
 */
export function useExclusionTable() {
  const { collections, collectionItemIds, strengthByItem } = useCollectionCatalog()
  const { excludedItemIds, isExcluded, toggleExclusion } = useExcludedItems()

  const selectedCollectionIds = ref<string[]>([])
  const items = ref<ExclusionItem[]>([])
  const loadingItems = ref(false)
  const titleSearch = ref('')
  const sortBy = ref<SortSpec[]>([{ key: 'title', order: 'asc' }])
  const anchorIndex = ref<number | null>(null)

  // Collection filter options, annotated with how many of each collection's
  // items are currently excluded.
  const collectionOptions = computed(() => {
    const excluded = excludedItemIds.value // always track as dependency
    return collections.value.map(c => {
      const ids = collectionItemIds.value.get(c.id)
      if (!ids) return { id: c.id, title: c.title, categoryId: c.categoryId }
      const excludedCount = [...ids].filter(id => excluded.has(id)).length
      const label = excludedCount > 0 ? `${c.title} (${excludedCount} excluded)` : c.title
      return { id: c.id, title: label, categoryId: c.categoryId }
    })
  })

  // Prefix match on title (case-insensitive): typing "L1" shows titles starting with "L1".
  const filteredItems = computed(() => {
    const q = titleSearch.value.trim().toLowerCase()
    if (!q) return items.value
    return items.value.filter(i => i.title.toLowerCase().startsWith(q))
  })

  // Mirror the data-table's display order so shift-click ranges follow what the
  // user actually sees after filtering and sorting.
  const sortedItems = computed(() => {
    const sorts = sortBy.value
    const arr = [...filteredItems.value]
    if (!sorts.length) return arr
    return arr.sort((a, b) => {
      for (const sort of sorts) {
        const av = (a as Record<string, unknown>)[sort.key]
        const bv = (b as Record<string, unknown>)[sort.key]
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''))
        if (cmp !== 0) return cmp * (sort.order === 'desc' ? -1 : 1)
      }
      return 0
    })
  })

  const excludedCount = computed(
    () => items.value.filter(i => i.id && excludedItemIds.value.has(i.id)).length
  )

  watch(selectedCollectionIds, async (ids) => {
    anchorIndex.value = null
    if (!ids.length) {
      items.value = []
      return
    }
    loadingItems.value = true
    try {
      // Merge items across the selected collections, deduping by id. An item that
      // lives in several selected collections lists them all in collectionTitle.
      const merged = new Map<string, ExclusionItem>()
      for (const id of ids) {
        const title = collections.value.find(c => c.id === id)?.title ?? ''
        const collectionItems = await getLearningItems(id)
        for (const item of collectionItems) {
          if (!item.id) continue
          const existing = merged.get(item.id)
          if (existing) {
            existing.collectionTitle += `, ${title}`
          } else {
            merged.set(item.id, {
              ...item,
              collectionTitle: title,
              strengthScore: strengthByItem.value.get(item.id) ?? -1,
            })
          }
        }
      }
      items.value = [...merged.values()].sort((a, b) => a.title.localeCompare(b.title))
    } finally {
      loadingItems.value = false
    }
  })

  function handleRowClick(item: ExclusionItem, event: MouseEvent) {
    const itemId = item.id!
    // Index within the currently sorted/displayed order, so ranges match the view.
    const index = sortedItems.value.findIndex(i => i.id === itemId)
    if (event.shiftKey && anchorIndex.value !== null) {
      const start = Math.min(anchorIndex.value, index)
      const end = Math.max(anchorIndex.value, index)
      const targetState = !isExcluded(itemId)
      for (let i = start; i <= end; i++) {
        const id = sortedItems.value[i]?.id
        if (id) toggleExclusion(id, targetState)
      }
    } else {
      toggleExclusion(itemId, !isExcluded(itemId))
      anchorIndex.value = index
    }
  }

  return {
    selectedCollectionIds,
    collectionOptions,
    items,
    loadingItems,
    titleSearch,
    sortBy,
    sortedItems,
    excludedItemIds,
    excludedCount,
    isExcluded,
    handleRowClick,
  }
}
