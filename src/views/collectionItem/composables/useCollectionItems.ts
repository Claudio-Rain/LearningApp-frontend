import { ref } from 'vue'
import { formatISO } from 'date-fns'
import type { JSONContent } from '@tiptap/vue-3'
import {
  getCollections,
  getLearningItems,
  createLearningItem,
  removeLearningItem,
  editCollection,
  syncLearningItems,
  syncCollections,
  pullLearningItems,
  setLearningItemLabels
} from '@/database'
import type { Collection, ItemLabelPatch, LearningItem } from '@/database/types'
import { toLabelPatch } from '@/utils/itemLabels'

export type CollectionItems = ReturnType<typeof useCollectionItems>

/**
 * Owns the collection + its learning items for one CollectionItemView instance.
 * Every write goes through here so the collection's item count, its
 * lastModified stamp and the remote sync stay in step.
 */
export function useCollectionItems(collectionId: string, options: { onMissing: () => void } = { onMissing: () => {} }) {
  const collection = ref<Collection | null>(null)
  const learningItems = ref<LearningItem[]>([])
  const selectedItem = ref<LearningItem | null>(null)
  const isPulling = ref(false)

  /** Reloads from the local DB, keeping the selection stable where possible. */
  const load = async (preferItemId?: string) => {
    const allCollections = await getCollections()
    collection.value = allCollections.find(c => c.id === collectionId) ?? null
    if (!collection.value) {
      alert('Collection not found')
      options.onMissing()
      return
    }

    learningItems.value = await getLearningItems(collectionId)
    if (learningItems.value.length === 0) {
      selectedItem.value = null
      return
    }

    const fromUrl = preferItemId ? learningItems.value.find(i => i.id === preferItemId) : undefined
    const stillExists = learningItems.value.find(i => i.id === selectedItem.value?.id)
    selectedItem.value = fromUrl ?? stillExists ?? (learningItems.value[0] as LearningItem)
  }

  /** Applies a change to the item count (and the timestamp), then syncs items + collections. */
  const commitCollectionChange = async (countDelta: number, lastModified: string) => {
    if (!collection.value) return
    await editCollection({
      ...collection.value,
      numberOfItems: Math.max(0, collection.value.numberOfItems + countDelta),
      lastModified
    })
    await syncLearningItems()
    await syncCollections()
  }

  /** Timestamp-only touch, for edits that don't change how many items exist. */
  const touchCollection = async (lastModified: string) => {
    if (!collection.value) return
    collection.value.lastModified = lastModified
    await editCollection(collection.value)
    await syncCollections()
  }

  const addItem = async (title: string) => {
    if (!title || !collection.value) return
    const now = formatISO(new Date())
    await createLearningItem({
      collectionId: collection.value.id!,
      title,
      dateCreated: now,
      lastModified: now
    })
    await commitCollectionChange(1, now)
    await load()
  }

  const addItems = async (items: { title: string; content?: JSONContent }[]) => {
    if (!collection.value || items.length === 0) return
    const now = formatISO(new Date())
    for (const item of items) {
      await createLearningItem({
        collectionId: collection.value.id!,
        title: item.title,
        content: item.content,
        dateCreated: now,
        lastModified: now
      })
    }
    await commitCollectionChange(items.length, now)
    await load()
  }

  const deleteItems = async (ids: string[]) => {
    if (ids.length === 0) return
    for (const id of ids) {
      await removeLearningItem(id)
    }
    await commitCollectionChange(-ids.length, formatISO(new Date()))
    await load()
  }

  /**
   * Patches an item that the editor already saved: the local copy is updated in
   * place (so the table reflects it without a reload) and only the collection's
   * timestamp needs persisting.
   *
   * A `null` label means "cleared", which in memory is the absence of the key —
   * same shape a fresh read from the DB would produce.
   */
  const applyLocalEdit = async (
    id: string,
    patch: Omit<Partial<LearningItem>, keyof ItemLabelPatch> & ItemLabelPatch,
    lastModified: string
  ) => {
    mergeLocalItem(id, patch, lastModified)
    await touchCollection(lastModified)
  }

  const mergeLocalItem = (
    id: string,
    patch: Omit<Partial<LearningItem>, keyof ItemLabelPatch> & ItemLabelPatch,
    lastModified: string
  ) => {
    const item = learningItems.value.find(i => i.id === id)
    if (!item) return
    Object.assign(item, patch, { lastModified })
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete item[key as keyof LearningItem]
    }
  }

  /**
   * Write one item's labels. Unlike a title or content edit this leaves the
   * collection's own timestamp alone: labels are item-level, and a labeling run
   * covers many items at once, so touching (and re-syncing) the collection per
   * item would be a write storm for nothing.
   */
  const setLabels = async (id: string, patch: ItemLabelPatch) => {
    const clean = toLabelPatch(patch)
    if (Object.keys(clean).length === 0) return
    const lastModified = await setLearningItemLabels(id, clean)
    mergeLocalItem(id, clean, lastModified)
  }

  const pull = async () => {
    if (!navigator.onLine) return
    isPulling.value = true
    try {
      await pullLearningItems(collectionId)
      await load()
    } catch (error) {
      console.error('Failed to pull items:', error)
      alert('Failed to pull items from Firebase')
    } finally {
      isPulling.value = false
    }
  }

  return {
    collection,
    learningItems,
    selectedItem,
    isPulling,
    load,
    addItem,
    addItems,
    deleteItems,
    applyLocalEdit,
    setLabels,
    touchCollection,
    pull
  }
}
