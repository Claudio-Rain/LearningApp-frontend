import { computed, ref } from 'vue'
import {
  getAllAttemptLogs,
  getAllCardProgress,
  getCategories,
  getCollections,
  getLearningItems
} from '@/database'
import type { AttemptLog, CardProgress, Category, Collection, LearningItem } from '@/database/types'
import { computeProgressStats } from '../aggregation'
import type { ProgressChartData } from '../charts/chartRegistry'

const STORAGE_KEY = 'studyProgress_selectedCollections'

/**
 * Everything the progress view draws from: the raw tables, the collection
 * filter applied on top of them, and the headline stats derived from the
 * result. Charts receive the filtered data as plain arrays.
 */
export function useProgressData() {
  const allAttemptLogs = ref<AttemptLog[]>([])
  const allCardProgress = ref<CardProgress[]>([])
  const allLearningItems = ref<LearningItem[]>([])
  const collections = ref<Collection[]>([])
  const categories = ref<Category[]>([])
  const selectedCollectionIds = ref<string[]>([])

  // CollectionMultiSelect requires a resolved id on every entry.
  const selectableCollections = computed(() =>
    collections.value.filter((c): c is Collection & { id: string } => !!c.id)
  )

  const isAllSelected = computed(() =>
    selectedCollectionIds.value.length === 0 ||
    selectedCollectionIds.value.length === collections.value.length
  )

  const filteredItemIds = computed(() => {
    if (isAllSelected.value) return new Set(allLearningItems.value.map(i => i.id!))
    return new Set(
      allLearningItems.value
        .filter(i => selectedCollectionIds.value.includes(i.collectionId))
        .map(i => i.id!)
    )
  })

  const chartData = computed<ProgressChartData>(() => ({
    logs: allAttemptLogs.value.filter(l => filteredItemIds.value.has(l.learning_item_id)),
    progress: allCardProgress.value.filter(p => filteredItemIds.value.has(p.learning_item_id)),
    items: allLearningItems.value.filter(i => filteredItemIds.value.has(i.id!))
  }))

  const selectedCollections = computed(() =>
    isAllSelected.value
      ? collections.value
      : collections.value.filter(c => selectedCollectionIds.value.includes(c.id!))
  )

  const stats = computed(() => computeProgressStats(chartData.value))

  const saveSelection = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCollectionIds.value))
  }

  // Drops ids for collections that no longer exist, so a stale selection cannot
  // filter everything away.
  const restoreSelection = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const ids: unknown = JSON.parse(saved)
      if (!Array.isArray(ids)) return
      selectedCollectionIds.value = ids.filter(id => collections.value.some(c => c.id === id))
    } catch {
      /* ignore a corrupt entry */
    }
  }

  const loadData = async () => {
    allAttemptLogs.value = await getAllAttemptLogs()
    allCardProgress.value = await getAllCardProgress()
    collections.value = await getCollections()
    categories.value = await getCategories()

    const itemsPerCollection = await Promise.all(
      collections.value.filter(c => c.id).map(c => getLearningItems(c.id!))
    )
    allLearningItems.value = itemsPerCollection.flat()

    restoreSelection()
  }

  return {
    collections,
    categories,
    selectableCollections,
    selectedCollectionIds,
    selectedCollections,
    chartData,
    stats,
    loadData,
    saveSelection
  }
}
