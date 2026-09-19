// A learning item's title is stored twice: `title` is always plain text, and
// `titleContent` holds the rich version when there is one. Everything here
// exists to keep those two in step, so no caller has to think about it.
import type { JSONContent } from '@tiptap/vue-3'
import type { LearningItem } from '../database/types'
import { extractText } from './claude/text'

/** The shape these helpers need — so the content script's plainer item objects fit too. */
type TitledItem = Pick<LearningItem, 'title'> & { titleContent?: JSONContent }

export const emptyTitleDoc = (): JSONContent => ({ type: 'doc', content: [] })

/** Wrap plain text as the one-paragraph document an editor can open. */
export const plainTitleDoc = (title: string): JSONContent => ({
  type: 'doc',
  content: title ? [{ type: 'paragraph', content: [{ type: 'text', text: title }] }] : [],
})

/** The document to edit or render for an item's title, rich or not. */
export const titleDoc = (item: TitledItem): JSONContent =>
  item.titleContent ?? plainTitleDoc(item.title)

/**
 * Flatten a title document to the plain `title` field. Line breaks inside a
 * code block are real content, but `title` feeds one-line surfaces — table
 * cells, notification bodies, `<option>` labels — so they collapse to spaces.
 */
export const docToPlainTitle = (doc: JSONContent): string =>
  extractText(doc).replace(/\s+/g, ' ').trim()

/**
 * True when the document carries nothing a plain string would lose: one
 * paragraph (or nothing at all) of unmarked text. Those titles stay plain, so
 * only the items that actually use a code block or an image grow the extra
 * field.
 */
export const isPlainTitleDoc = (doc: JSONContent): boolean => {
  const blocks = doc.content ?? []
  if (blocks.length === 0) return true
  if (blocks.length > 1) return false

  const [block] = blocks
  if (block!.type !== 'paragraph') return false
  return (block!.content ?? []).every(node => node.type === 'text' && !node.marks?.length)
}

/**
 * Write a title document onto an item, returning a new object. A plain title
 * drops `titleContent` rather than setting it to `undefined`, which Firestore
 * would reject on the way out.
 */
export const applyTitleDoc = <T extends TitledItem>(item: T, doc: JSONContent): T => {
  const next: T = { ...item, title: docToPlainTitle(doc) }
  if (isPlainTitleDoc(doc)) delete (next as TitledItem).titleContent
  else next.titleContent = doc
  return next
}
