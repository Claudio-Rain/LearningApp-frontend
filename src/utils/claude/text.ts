import type { JSONContent } from '@tiptap/vue-3'

/** Flatten TipTap JSONContent (or a plain string) into text for a prompt. */
export const extractText = (node?: JSONContent | string): string => {
  if (!node) return ''
  if (typeof node === 'string') return node
  let text = node.text ?? ''
  if (node.content) text += node.content.map(extractText).join('')
  // Treat block-level nodes as line breaks so structure survives flattening.
  if (node.type && node.type !== 'text' && text) text += '\n'
  return text
}
