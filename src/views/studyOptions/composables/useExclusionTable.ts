import { ref, computed, watch } from 'vue'
import { getLearningItems } from '@/database'
import type { LearningItem } from '@/database'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'
import { ITEM_LABEL_DEFS, LABEL_LEVELS, toLabelLevel } from '@/utils/itemLabels'
import type { ItemLabelKind } from '@/utils/itemLabels'
import { STRENGTH_TIERS, STRENGTH_TIER_META, strengthTier } from '@/utils/strength'
import type { StrengthTier } from '@/utils/strength'
import { useCollectionCatalog } from './useCollectionCatalog'

export type ExclusionItem = LearningItem & { collectionTitle: string; strengthScore: number }

export type SortSpec = { key: string; order: 'asc' | 'desc' }

/** Filter value standing in for "this item has never been labeled". */
export const UNLABELED = 0

/** Options for a label filter: every level, plus the unlabeled bucket. */
export function labelFilterOptions(kind: ItemLabelKind) {
  const def = ITEM_LABEL_DEFS[kind]
  return [
    ...LABEL_LEVELS.map(level => ({ value: level as number, title: `${level} · ${def.levels[level].label}` })),
    { value: UNLABELED, title: def.unsetLabel }
  ]
}

/**
 * Options for the strength filter — the whole ladder, 'new' included, since an
 * unstudied card is a thing you'd want to filter *to*, not an absent value.
 */
export function strengthFilterOptions() {
  return STRENGTH_TIERS.map(tier => ({ value: tier, title: STRENGTH_TIER_META[tier].label }))
}

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

  // A label matches when its level is selected, or when it is unlabeled and the
  // unlabeled bucket is selected.
  const matchesLabel = (value: number | undefined, selected: number[]) => {
    if (!selected.length) return true
    const level = toLabelLevel(value)
    return selected.includes(level ?? UNLABELED)
  }

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
