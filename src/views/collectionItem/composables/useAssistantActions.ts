import { formatISO } from 'date-fns'
import { editLearningItem } from '@/database'
import { markdownToTiptap } from '@/utils/markdown'
import { applyTitleDoc, plainTitleDoc } from '@/utils/itemTitle'
import type { ItemLabelPatch } from '@/database/types'
import type { CollectionItems } from './useCollectionItems'

/**
 * The AI assistant proposes writes; these run the approved change through the
 * same composable the manual handlers use, so item counts and syncing stay in
 * step, then reload so the table and any open editor reflect it.
 *
 * The assistant speaks markdown, so content is converted on the way in.
 */
export function useAssistantActions(collectionItems: CollectionItems) {
  const applyCreate = async (items: { title: string; content: string }[]) =>
    collectionItems.addItems(
      items.map(item => ({
        title: item.title,
        content: item.content ? markdownToTiptap(item.content) : undefined
      }))
    )

  const applyLabels = async (id: string, patch: ItemLabelPatch) => collectionItems.setLabels(id, patch)

  const applyDelete = async (ids: string[]) => {
    if (!collectionItems.collection.value) return
    await collectionItems.deleteItems(ids)
  }

  const applyUpdate = async (id: string, patch: { title?: string; content?: string }) => {
    const item = collectionItems.learningItems.value.find(i => i.id === id)
    if (!item) return
    const lastModified = formatISO(new Date())
    const next = {
      ...item,
      content: patch.content !== undefined ? markdownToTiptap(patch.content) : item.content,
      lastModified
    }
    // The assistant writes plain text, so a title it rewrites stops being rich —
    // going through applyTitleDoc drops any code block the old title had rather
    // than leaving one that contradicts the new `title`.
    await editLearningItem(
      patch.title !== undefined ? applyTitleDoc(next, plainTitleDoc(patch.title)) : next
    )
    await collectionItems.touchCollection(lastModified)
    await collectionItems.load()
  }

  return { applyCreate, applyDelete, applyUpdate, applyLabels }
}
