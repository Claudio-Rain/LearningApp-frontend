// Convert Claude's markdown answer into TipTap JSONContent so it renders as
// rich text (headings, code blocks, tables, lists, bold) in the editor and the
// content widget.
//
// This walks marked's token tree directly instead of using TipTap's
// generateJSON, because generateJSON needs a DOM (window/DOMParser) which the
// extension's background service worker doesn't have. Doing it token-by-token
// works identically in the worker and the browser.

import type { JSONContent } from '@tiptap/vue-3'
import { marked, type Token, type Tokens } from 'marked'

const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')

const textNode = (text: string, marks: JSONContent['marks']): JSONContent | null => {
  if (!text) return null
  const node: JSONContent = { type: 'text', text }
  if (marks && marks.length) node.marks = marks
  return node
}

const withMark = (marks: JSONContent['marks'], type: string): JSONContent['marks'] =>
  [...(marks ?? []), { type }]

// Inline tokens -> array of text/hardBreak nodes carrying the active marks.
const inlineTokens = (tokens: Token[] = [], marks: JSONContent['marks'] = []): JSONContent[] => {
  const out: JSONContent[] = []
  for (const t of tokens) {
    switch (t.type) {
      case 'text': {
        const sub = (t as Tokens.Text).tokens
        if (sub && sub.length) out.push(...inlineTokens(sub, marks))
        else { const n = textNode(decodeEntities((t as Tokens.Text).text), marks); if (n) out.push(n) }
        break
      }
      case 'escape': { const n = textNode((t as Tokens.Escape).text, marks); if (n) out.push(n); break }
      case 'strong': out.push(...inlineTokens((t as Tokens.Strong).tokens, withMark(marks, 'bold'))); break
      case 'em': out.push(...inlineTokens((t as Tokens.Em).tokens, withMark(marks, 'italic'))); break
      case 'del': out.push(...inlineTokens((t as Tokens.Del).tokens, withMark(marks, 'strike'))); break
      case 'codespan': { const n = textNode(decodeEntities((t as Tokens.Codespan).text), withMark(marks, 'code')); if (n) out.push(n); break }
      case 'br': out.push({ type: 'hardBreak' }); break
      case 'link': out.push(...inlineTokens((t as Tokens.Link).tokens, marks)); break
      case 'image': { const n = textNode((t as Tokens.Image).text || '', marks); if (n) out.push(n); break }
      case 'html': break
      default: {
        const anyTok = t as { tokens?: Token[]; text?: string }
        if (anyTok.tokens) out.push(...inlineTokens(anyTok.tokens, marks))
        else if (anyTok.text) { const n = textNode(decodeEntities(anyTok.text), marks); if (n) out.push(n) }
      }
    }
  }
  return out
}

const paragraph = (tokens: Token[] = []): JSONContent => ({ type: 'paragraph', content: inlineTokens(tokens) })

const tableCell = (cell: Tokens.TableCell, header: boolean): JSONContent => ({
  type: header ? 'tableHeader' : 'tableCell',
  content: [paragraph(cell.tokens)],
})

// Block tokens -> array of block nodes. 'text' tokens become paragraphs so this
// also handles tight list-item content.
const blockTokens = (tokens: Token[] = []): JSONContent[] => {
  const out: JSONContent[] = []
  for (const t of tokens) {
    switch (t.type) {
      case 'space': break
      case 'heading':
        out.push({ type: 'heading', attrs: { level: (t as Tokens.Heading).depth }, content: inlineTokens((t as Tokens.Heading).tokens) })
        break
      case 'paragraph':
        out.push(paragraph((t as Tokens.Paragraph).tokens))
        break
      case 'text': {
        const tt = t as Tokens.Text
        out.push(paragraph(tt.tokens ?? [{ type: 'text', raw: tt.text, text: tt.text } as Token]))
        break
      }
      case 'code': {
        const code = t as Tokens.Code
        out.push({
          type: 'codeBlock',
          attrs: { language: code.lang || null },
          content: code.text ? [{ type: 'text', text: code.text }] : [],
        })
        break
      }
      case 'blockquote':
        out.push({ type: 'blockquote', content: blockTokens((t as Tokens.Blockquote).tokens) })
        break
      case 'list': {
        const list = t as Tokens.List
        out.push({
          type: list.ordered ? 'orderedList' : 'bulletList',
          ...(list.ordered && list.start !== 1 ? { attrs: { start: list.start } } : {}),
          content: list.items.map((item) => {
            const content = blockTokens(item.tokens)
            return { type: 'listItem', content: content.length ? content : [{ type: 'paragraph' }] }
          }),
        })
        break
      }
      case 'table': {
        const table = t as Tokens.Table
        const headerRow: JSONContent = { type: 'tableRow', content: table.header.map((c) => tableCell(c, true)) }
        const bodyRows: JSONContent[] = table.rows.map((row) => ({
          type: 'tableRow',
          content: row.map((c) => tableCell(c, false)),
        }))
        out.push({ type: 'table', content: [headerRow, ...bodyRows] })
        break
      }
      case 'hr':
        out.push({ type: 'horizontalRule' })
        break
      case 'html':
        break
      default:
        break
    }
  }
  return out
}

export const markdownToTiptap = (markdown: string): JSONContent => {
  const tokens = marked.lexer(markdown)
  const content = blockTokens(tokens)
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}
