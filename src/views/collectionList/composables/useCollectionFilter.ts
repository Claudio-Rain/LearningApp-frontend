import { ref, computed, watch, type Ref } from 'vue'
import type { Category, Collection } from '@/database/types'
import { filterCollections, filterOptions, isValidFilter, type CollectionFilter } from '../filters'

// Persisted so the last-used filter is pre-selected on re-entry.
const FILTER_KEY = 'collectionsCategoryFilter'

/** The chip filter above the collections table. */
export function useCollectionFilter(collections: Ref<Collection[]>, categories: Ref<Category[]>) {
  const selected = ref<CollectionFilter>(localStorage.getItem(FILTER_KEY) || 'all')
  watch(selected, id => localStorage.setItem(FILTER_KEY, id))

  const options = computed(() => filterOptions(categories.value))
  const filtered = computed(() => filterCollections(collections.value, selected.value))

  /** The active filter's label, or undefined when showing everything. */
  const scopeLabel = computed(() =>
    selected.value === 'all' ? undefined : options.value.find(o => o.value === selected.value)?.label
  )

  /** Fall back to 'all' when the stored filter's category is gone. */
  const validate = () => {
    if (!isValidFilter(selected.value, categories.value)) selected.value = 'all'
  }

  return { selected, options, filtered, scopeLabel, validate }
}
