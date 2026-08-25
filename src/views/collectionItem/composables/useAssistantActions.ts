import { formatISO } from 'date-fns'
import { editLearningItem } from '@/database'
import { markdownToTiptap } from '@/utils/markdown'
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

  const applyDelete = async (ids: string[]) => {
    if (!collectionItems.collection.value) return
    await collectionItems.deleteItems(ids)
  }

  const applyUpdate = async (id: string, patch: { title?: string; content?: string }) => {
    const item = collectionItems.learningItems.value.find(i => i.id === id)
    if (!item) return
    const lastModified = formatISO(new Date())
    await editLearningItem({
      ...item,
      title: patch.title ?? item.title,
      content: patch.content !== undefined ? markdownToTiptap(patch.content) : item.content,
      lastModified
    })
    await collectionItems.touchCollection(lastModified)
    await collectionItems.load()
  }

  return { applyCreate, applyDelete, applyUpdate }
}
