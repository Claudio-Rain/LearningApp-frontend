import { ref, toRaw } from 'vue'
import { formatISO } from 'date-fns'
import type { JSONContent } from '@tiptap/vue-3'
import {
  getCollections,
  getLearningItems,
  createLearningItem,
  editLearningItem,
  removeLearningItem,
  createCollection,
  editCollection,
  syncLearningItems,
  syncCollections,
  pullLearningItems,
  setLearningItemLabels,
  setLearningItemPositions
} from '@/database'
import type { Collection, ItemEditPatch, ItemLabelPatch, LearningItem } from '@/database/types'
import { toLabelPatch } from '@/utils/itemLabels'
import { planAppend, planInsertAfter, planMove, planOrder, sortByPosition, type PositionWrite } from '@/utils/itemOrder'

export type CollectionItems = ReturnType<typeof useCollectionItems>

/**
 * Owns the collection + its learning items for one CollectionItemView instance.
 * Every write goes through here so the collection's item count, its
 * lastModified stamp and the remote sync stay in step.
 */
export function useCollectionItems(collectionId: string, options: { onMissing: () => void } = { onMissing: () => {} }) {
  const collection = ref<Collection | null>(null)
  const allCollections = ref<Collection[]>([])
  const learningItems = ref<LearningItem[]>([])
  const selectedItem = ref<LearningItem | null>(null)
  const isPulling = ref(false)

  /** Reloads from the local DB, keeping the selection stable where possible. */
  const load = async (preferItemId?: string) => {
    allCollections.value = await getCollections()
    collection.value = allCollections.value.find(c => c.id === collectionId) ?? null
    if (!collection.value) {
      alert('Collection not found')
      options.onMissing()
      return
    }

    learningItems.value = sortByPosition(await getLearningItems(collectionId))
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

  /**
   * Add a batch in the order it was given (the assistant's proposal), right
   * after `afterId` when given and still in the list, otherwise at the end —
   * never sorted alphabetically among the rest.
   */
  const addItems = async (
    items: { title: string; titleContent?: JSONContent; content?: JSONContent }[],
    afterId?: string
  ) => {
    if (!collection.value || items.length === 0) return
    const now = formatISO(new Date())
    const sorted = sortByPosition(learningItems.value)
    const { writes, positions } = afterId
      ? planInsertAfter(sorted, afterId, items.length)
      : planAppend(sorted, items.length)
    if (writes.length > 0) await setLearningItemPositions(writes)
    for (const [k, item] of items.entries()) {
      await createLearningItem({
        collectionId: collection.value.id!,
        title: item.title,
        titleContent: item.titleContent,
        content: item.content,
        position: positions[k],
        dateCreated: now,
        lastModified: now
      })
    }
    await commitCollectionChange(items.length, now)
    await load()
  }

  const moveItems = async (ids: string[], target: { id: string } | { newTitle: string }) => {
    if (!collection.value) return
    const moving = learningItems.value.filter(i => i.id && ids.includes(i.id))
    if (moving.length === 0) return
    const now = formatISO(new Date())
    const targetId = 'id' in target
      ? target.id
      : await createCollection({
        title: target.newTitle,
        categoryId: collection.value.categoryId ?? null,
        // Next to the current collection, not at the top level.
        parentId: collection.value.parentId ?? null,
        dateCreated: now,
        lastModified: now,
        numberOfItems: 0
      })

    for (const item of moving) {
      await editLearningItem({ ...toRaw(item), collectionId: targetId, lastModified: now })
    }

    const destination = (await getCollections()).find(c => c.id === targetId)
    if (destination) {
      await editCollection({ ...destination, numberOfItems: destination.numberOfItems + moving.length, lastModified: now })
    }
    await commitCollectionChange(-moving.length, now)
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
    patch: ItemEditPatch,
    lastModified: string
  ) => {
    mergeLocalItem(id, patch, lastModified)
    await touchCollection(lastModified)
  }

  const mergeLocalItem = (
    id: string,
    patch: ItemEditPatch,
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

  /**
   * Move one item to `toIndex` in the list. The list updates at once; the
   * positions are then saved, and anything the remote write couldn't take is
   * pushed by the sync that follows. Like labels, the collection's own
   * timestamp is left alone — the order lives on the items.
   */
  const reorderItem = async (id: string, toIndex: number) =>
    savePositions(planMove(sortByPosition(learningItems.value), id, toIndex))

  /** Put the whole list in exactly this order (the assistant's reorder). */
  const setOrder = async (orderedIds: string[]) =>
    savePositions(planOrder(sortByPosition(learningItems.value), orderedIds))

  const savePositions = async (writes: PositionWrite[]) => {
    if (writes.length === 0) return
    const byId = new Map(learningItems.value.map(i => [i.id, i]))
    for (const { id: itemId, position } of writes) {
      const item = byId.get(itemId)
      if (item) item.position = position
    }
    learningItems.value = sortByPosition(learningItems.value)

    const lastModified = await setLearningItemPositions(writes)
    for (const { id: itemId } of writes) {
      const item = byId.get(itemId)
      if (item) item.lastModified = lastModified
    }
    await syncLearningItems()
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
    allCollections,
    learningItems,
    selectedItem,
    isPulling,
    load,
    addItem,
    addItems,
    moveItems,
    deleteItems,
    applyLocalEdit,
    setLabels,
    reorderItem,
    setOrder,
    touchCollection,
    pull
  }
}
