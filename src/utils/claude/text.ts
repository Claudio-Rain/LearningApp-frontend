import type { JSONContent } from '@tiptap/vue-3'
import { plotSpecToText, type PlotSpec } from '../plotSpec'

type Attrs = Record<string, unknown>

// Nodes whose meaning lives in attrs rather than text. Formulas go out as
// LaTeX and plots as the ```plot form Claude is asked to write, so plain
// titles and prompts don't silently lose them.
const ATTR_NODES: Record<string, (attrs: Attrs) => string> = {
  mathInline: attrs => `$${attrs.latex ?? ''}$`,
  mathBlock: attrs => `$$${attrs.latex ?? ''}$$\n`,
  functionPlot: attrs =>
    '```plot\n' + plotSpecToText({ functions: [], ...attrs } as PlotSpec) + '\n```\n',
}

const calloutHead = (attrs: Attrs): string =>
  `> [!${String(attrs.variant ?? 'note').toUpperCase()}]${attrs.title ? ` ${attrs.title}` : ''}\n`

/** Flatten TipTap JSONContent (or a plain string) into text for a prompt. */
export const extractText = (node?: JSONContent | string): string => {
  if (!node) return ''
  if (typeof node === 'string') return node
  const fromAttrs = node.type ? ATTR_NODES[node.type] : undefined
  if (fromAttrs) return fromAttrs(node.attrs ?? {})
  // A callout goes out in the "> [!TAG] title" form Claude writes them in.
  let text = node.type === 'callout' ? calloutHead(node.attrs ?? {}) : ''
  text += node.text ?? ''
  if (node.content) text += node.content.map(extractText).join('')
  // Treat block-level nodes as line breaks so structure survives flattening.
  if (node.type && node.type !== 'text' && text) text += '\n'
  return text
}
