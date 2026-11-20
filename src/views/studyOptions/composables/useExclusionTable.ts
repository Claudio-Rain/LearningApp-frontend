import { ref, computed, watch } from 'vue'
import { getAllLearningItems } from '@/database'
import type { LearningItem } from '@/database'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'
import { withSubCollections } from '@/utils/subCollections'
import { toLabelLevel } from '@/utils/itemLabels'
import { strengthTier } from '@/utils/strength'
import type { StrengthTier } from '@/utils/strength'
import { matchesLabel } from '@/utils/itemFilters'
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
  // Empty = no filter. UNLABELED selects items that carry no value for the kind.
  const priorityFilter = ref<number[]>([])
  const difficultyFilter = ref<number[]>([])
  const strengthFilter = ref<StrengthTier[]>([])
  const sortBy = ref<SortSpec[]>([{ key: 'title', order: 'asc' }])
  const anchorIndex = ref<number | null>(null)

  // Collection filter options, annotated with how many of each collection's
  // items (sub-collections included) are currently excluded.
  const collectionOptions = computed(() => {
    const excluded = excludedItemIds.value // always track as dependency
    return collections.value.map(c => {
      const ids = [...withSubCollections([c.id], collections.value)]
        .flatMap(id => [...(collectionItemIds.value.get(id) ?? [])])
      if (!ids.length) return { id: c.id, title: c.title, categoryId: c.categoryId, parentId: c.parentId }
      const excludedCount = ids.filter(id => excluded.has(id)).length
      const label = excludedCount > 0 ? `${c.title} (${excludedCount} excluded)` : c.title
      return { id: c.id, title: label, categoryId: c.categoryId, parentId: c.parentId }
    })
  })

  // Prefix match on title (case-insensitive): typing "L1" shows titles starting
  // with "L1". Combined with the label filters, which are ANDed with it.
  const filteredItems = computed(() => {
    const q = titleSearch.value.trim().toLowerCase()
    return items.value.filter(i =>
      (!q || i.title.toLowerCase().startsWith(q)) &&
      matchesLabel(i.priority, priorityFilter.value) &&
      matchesLabel(i.difficulty, difficultyFilter.value) &&
      (!strengthFilter.value.length || strengthFilter.value.includes(strengthTier(i.strengthScore)))
    )
  })

  // Unlabeled sorts below level 1 rather than falling through to a string
  // compare on "undefined".
  const sortValue = (item: ExclusionItem, key: string): string | number => {
    if (key === 'priority' || key === 'difficulty') return toLabelLevel(item[key]) ?? 0
    const raw = (item as unknown as Record<string, unknown>)[key]
    return typeof raw === 'number' ? raw : String(raw ?? '')
  }

  // The table's only sort: it renders this order as given (see the server-table
  // note in ExcludedItemsSection), so shift-click ranges follow what the user
  // actually sees.
  const sortedItems = computed(() => {
    const sort = sortBy.value[0]
    const arr = [...filteredItems.value]
    if (!sort) return arr
    return arr.sort((a, b) => {
      const av = sortValue(a, sort.key)
      const bv = sortValue(b, sort.key)
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return cmp * (sort.order === 'desc' ? -1 : 1)
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
      // Merge items across the selected collections and their sub-collections,
      // deduping by id. An item that lives in several of them lists them all in
      // collectionTitle.
      const merged = new Map<string, ExclusionItem>()
      const allItems = await getAllLearningItems()
      for (const id of withSubCollections(ids, collections.value)) {
        const title = collections.value.find(c => c.id === id)?.title ?? ''
        const collectionItems = allItems.filter(i => i.collectionId === id)
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
    priorityFilter,
    difficultyFilter,
    strengthFilter,
    sortBy,
    sortedItems,
    excludedItemIds,
    excludedCount,
    isExcluded,
    handleRowClick,
  }
}
