import { ref } from 'vue'
import {
  getAllExcludedItems,
  createExcludedItem,
  removeExcludedItem
} from '../database'
import type { ExcludedItem } from '../database'

declare const chrome: any

const excludedItemIds = ref<Set<string>>(new Set())
const excludedRecordMap = ref<Map<string, string>>(new Map()) // learningItemId -> excludedItem.id
let loaded = false

function persistToChromeStorage() {
  const ids = [...excludedItemIds.value]
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ excludedItemIds: ids })
  }
}

async function load() {
  const all = await getAllExcludedItems()
  excludedItemIds.value = new Set(all.map((e: ExcludedItem) => e.learningItemId))
  excludedRecordMap.value = new Map(
    all
      .filter((e: ExcludedItem) => e.id)
      .map((e: ExcludedItem) => [e.learningItemId, e.id!])
  )
  loaded = true
  persistToChromeStorage()
}

async function toggleExclusion(learningItemId: string, exclude: boolean) {
  if (exclude) {
    if (excludedItemIds.value.has(learningItemId)) return
    const newId = await createExcludedItem(learningItemId)
    excludedItemIds.value = new Set([...excludedItemIds.value, learningItemId])
    excludedRecordMap.value.set(learningItemId, String(newId))
  } else {
    const recordId = excludedRecordMap.value.get(learningItemId)
    if (!recordId) return
    await removeExcludedItem(recordId)
    const next = new Set(excludedItemIds.value)
    next.delete(learningItemId)
    excludedItemIds.value = next
    excludedRecordMap.value.delete(learningItemId)
  }
  persistToChromeStorage()
}

function isExcluded(learningItemId: string): boolean {
  return excludedItemIds.value.has(learningItemId)
}

export function useExcludedItems() {
  if (!loaded) load()
  return { excludedItemIds, load, toggleExclusion, isExcluded }
}
