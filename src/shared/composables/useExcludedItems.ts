import { ref } from 'vue'
import {
  getAllExcludedItems,
  createExcludedItem,
  createExcludedItems,
  removeExcludedItem,
  removeExcludedItems,
  syncExcludedItems
} from '@/database'
import type { ExcludedItem } from '@/database'

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

/**
 * Exclude many items in one write — what building a study set does to
 * everything the set filtered out. Returns how many were newly excluded (ids
 * already excluded are skipped, so re-running a set is not a duplicate).
 */
async function excludeMany(learningItemIds: string[]): Promise<number> {
  const rows = await createExcludedItems(learningItemIds)
  if (rows.length === 0) return 0

  const nextIds = new Set(excludedItemIds.value)
  const nextRecords = new Map(excludedRecordMap.value)
  for (const row of rows) {
    nextIds.add(row.learningItemId)
    if (row.id) nextRecords.set(row.learningItemId, row.id)
  }
  excludedItemIds.value = nextIds
  excludedRecordMap.value = nextRecords

  persistToChromeStorage()
  return rows.length
}

/** Drop many exclusions in one go — clearing a set before building the next. */
async function includeMany(learningItemIds: string[]): Promise<number> {
  const recordIds = learningItemIds
    .map(id => excludedRecordMap.value.get(id))
    .filter((id): id is string => !!id)
  if (recordIds.length === 0) return 0

  await removeExcludedItems(recordIds)

  const nextIds = new Set(excludedItemIds.value)
  const nextRecords = new Map(excludedRecordMap.value)
  for (const id of learningItemIds) {
    nextIds.delete(id)
    nextRecords.delete(id)
  }
  excludedItemIds.value = nextIds
  excludedRecordMap.value = nextRecords

  persistToChromeStorage()
  return recordIds.length
}

// Pull a fresh set from Firestore into the local DB, then re-hydrate the
// reactive set that load() populated at setup from the stale cache.
async function sync() {
  await syncExcludedItems()
  await load()
}

export function useExcludedItems() {
  if (!loaded) load()
  return { excludedItemIds, load, sync, toggleExclusion, excludeMany, includeMany, isExcluded }
}
