// A learning item's title is stored twice: `title` is always plain text, and
// `titleContent` holds the rich version when there is one. Everything here
// exists to keep those two in step, so no caller has to think about it.
import type { JSONContent } from '@tiptap/vue-3'
import type { LearningItem } from '../database/types'
import { extractText } from './claude/text'
import { markdownToTiptap } from './markdown'

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
 * The blocks a title may hold — the same set LearningItemTitleEditor can edit.
 * Anything else the model writes is flattened to a paragraph rather than
 * stored, so a title can never contain a node the title editor has no way to
 * select, style or delete.
 */
const TITLE_BLOCKS = new Set(['paragraph', 'codeBlock', 'image'])

/**
 * Turn a markdown title written by Claude into a title document. Code — inline
 * or fenced — is what this exists for; a heading, list or table in a title is
 * the model overreaching, so it keeps the words and drops the structure.
 */
export const titleDocFromMarkdown = (markdown: string): JSONContent => {
  const blocks = markdownToTiptap(markdown).content ?? []

  const content = blocks.flatMap((block): JSONContent[] => {
    if (TITLE_BLOCKS.has(block.type ?? '')) {
      // marked hands back one empty paragraph for empty input; drop it so an
      // empty title is an empty document, exactly like plainTitleDoc('').
      const empty = block.type === 'paragraph' && !(block.content ?? []).length
      return empty ? [] : [block]
    }
    const text = extractText(block).replace(/\s+/g, ' ').trim()
    return text ? [{ type: 'paragraph', content: [{ type: 'text', text }] }] : []
  })

  return { type: 'doc', content }
}

/**
 * Both title fields from a markdown title, ready to spread onto a new item.
 * `titleContent` is absent when the markdown turned out to be plain prose,
 * which is the common case.
 */
export const titleFieldsFromMarkdown = (
  markdown: string
): { title: string; titleContent?: JSONContent } =>
  applyTitleDoc({ title: '' }, titleDocFromMarkdown(markdown))

/**
 * One line of plain text for a markdown title the user hasn't approved yet.
 * Approval lists and toasts are one line per card, so they show this rather
 * than raw backticks and fences.
 */
export const titlePreviewFromMarkdown = (markdown: string): string =>
  docToPlainTitle(titleDocFromMarkdown(markdown))

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
