// Convert Claude's markdown answer into TipTap JSONContent so it renders as
// rich text (headings, code blocks, tables, lists, bold) in the editor and the
// content widget.
//
// This walks marked's token tree directly instead of using TipTap's
// generateJSON, because generateJSON needs a DOM (window/DOMParser) which the
// extension's background service worker doesn't have. Doing it token-by-token
// works identically in the worker and the browser.

import type { JSONContent } from '@tiptap/vue-3'
import { Marked, type TokenizerExtension, type Token, type Tokens } from 'marked'
import { parsePlotSpec } from './plotSpec'
import { repairLatex } from './latex'
import { calloutFromTag, isHighlightColor, isTextColor } from './richFormat'

// --- LaTeX ---------------------------------------------------------------
// Claude writes formulas as $…$ / \(…\) inline and $$…$$ / \[…\] for display.
// These tokenizers lift them out before marked's escape handling can eat the
// backslashes; they become mathInline / mathBlock nodes below.

type MathToken = Tokens.Generic & { text: string }

const blockMath: TokenizerExtension = {
  name: 'blockMath',
  level: 'block',
  start: (src) => src.match(/\$\$|\\\[/)?.index,
  tokenizer(src) {
    const m = /^ {0,3}(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])[ \t]*(?:\n|$)/.exec(src)
    if (m) return { type: 'blockMath', raw: m[0], text: repairLatex(m[1] ?? m[2] ?? '').trim() }
  },
}

const INLINE_MATH = [
  /^\$\$([^$]+?)\$\$/,
  // Non-space right inside both `$`, and no digit right after the closing one,
  // so "$5 and $10" stays text.
  /^\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/,
  /^\\\(([\s\S]+?)\\\)/,
]

const inlineMath: TokenizerExtension = {
  name: 'inlineMath',
  level: 'inline',
  start: (src) => {
    const i = src.search(/\$|\\\(/)
    return i < 0 ? undefined : i
  },
  tokenizer(src) {
    for (const re of INLINE_MATH) {
      const m = re.exec(src)
      if (m) return { type: 'inlineMath', raw: m[0], text: repairLatex(m[1] ?? '').trim() }
    }
  },
}

// --- Highlights and coloured text ------------------------------------------
//   ==text==             yellow highlighter
//   ==text=={.green}     highlighter in a palette colour
//   [text]{.blue}        coloured text
//   [text]{.bg-pink}     highlighter, Pandoc-span style
// Unknown colours keep the text and drop the styling.

type MarkJSON = NonNullable<JSONContent['marks']>[number]
type StyledToken = Tokens.Generic & { tokens: Token[]; mark: MarkJSON | null }

const highlightMarkFor = (color?: string): MarkJSON =>
  color && color !== 'yellow' && isHighlightColor(color)
    ? { type: 'highlight', attrs: { color } }
    : { type: 'highlight' }

/** The mark a "{.class}" stands for: `blue` colours text, `bg-…`/`hl-…` highlights. */
const markForClass = (cls: string): MarkJSON | null => {
  const bg = /^(?:bg|hl|mark)-(.+)$/.exec(cls)
  if (bg) return isHighlightColor(bg[1]!) ? highlightMarkFor(bg[1]) : null
  return isTextColor(cls) ? { type: 'tone', attrs: { color: cls } } : null
}

const highlightText: TokenizerExtension = {
  name: 'highlightText',
  level: 'inline',
  start: (src) => {
    const i = src.indexOf('==')
    return i < 0 ? undefined : i
  },
  tokenizer(src) {
    const m = /^==(?=\S)([^\n]*?\S)==(?:\{\.([a-z]+)\})?/.exec(src)
    if (!m) return
    const color = m[2]
    const mark = !color || isHighlightColor(color) ? highlightMarkFor(color) : null
    return { type: 'styled', raw: m[0], mark, tokens: this.lexer.inlineTokens(m[1]!) }
  },
}

const styledSpan: TokenizerExtension = {
  name: 'styledSpan',
  level: 'inline',
  start: (src) => {
    const i = src.search(/\[[^\]\n]+\]\{\./)
    return i < 0 ? undefined : i
  },
  tokenizer(src) {
    const m = /^\[([^\]\n]+)\]\{\.([a-z-]+)\}/.exec(src)
    if (!m) return
    return { type: 'styled', raw: m[0], mark: markForClass(m[2]!), tokens: this.lexer.inlineTokens(m[1]!) }
  },
}

// A private instance, so the assistants' global `marked.parse` is unaffected.
const markdownLexer = new Marked({ extensions: [blockMath, inlineMath, highlightText, styledSpan] })

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

const withMark = (marks: JSONContent['marks'], mark: string | MarkJSON): JSONContent['marks'] =>
  [...(marks ?? []), typeof mark === 'string' ? { type: mark } : mark]

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
      case 'inlineMath': {
        // Carries the surrounding marks, so a formula inside ==…== or a
        // coloured span is highlighted or coloured with the words around it.
        const { text } = t as MathToken
        if (text) out.push({ type: 'mathInline', attrs: { latex: text }, ...(marks.length && { marks }) })
        break
      }
      case 'styled': {
        const { tokens: inner, mark } = t as StyledToken
        out.push(...inlineTokens(inner, mark ? withMark(marks, mark) : marks))
        break
      }
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

// "> [!TIP] Optional title" (GitHub alert syntax) opens a callout box; any
// other blockquote stays a blockquote. An unknown tag still makes a box, as a
// plain note, so the content never shows a stray "[!FOO]".
const CALLOUT_HEAD = /^\[!([^\]\s]+)\][ \t]*([^\n]*)(?:\n|$)/

const blockquoteNode = (bq: Tokens.Blockquote): JSONContent => {
  const head = CALLOUT_HEAD.exec(bq.text)
  if (!head) return { type: 'blockquote', content: blockTokens(bq.tokens) }

  const body = blockTokens(markdownLexer.lexer(bq.text.slice(head[0].length)))
  return {
    type: 'callout',
    attrs: {
      variant: calloutFromTag(head[1]!) ?? 'note',
      // The title is a plain attribute (rendered with its $math$); drop
      // emphasis markers rather than show them.
      title: head[2]!.replace(/\*\*|__|\*|_(?=\s|$)/g, '').trim(),
    },
    content: body.length ? body : [{ type: 'paragraph' }],
  }
}

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
        // ```plot blocks become interactive plots; one that doesn't parse stays
        // visible as code so the content isn't lost.
        const lang = code.lang?.trim().toLowerCase()
        const plot = lang === 'plot' ? parsePlotSpec(code.text) : null
        if (plot) {
          out.push({ type: 'functionPlot', attrs: { ...plot } })
          break
        }
        // ```mermaid blocks become drawn diagrams (syntax is checked when drawn).
        if (lang === 'mermaid' && code.text.trim()) {
          out.push({ type: 'diagram', attrs: { source: code.text.trim() } })
          break
        }
        out.push({
          type: 'codeBlock',
          attrs: { language: code.lang || null },
          content: code.text ? [{ type: 'text', text: code.text }] : [],
        })
        break
      }
      case 'blockquote':
        out.push(blockquoteNode(t as Tokens.Blockquote))
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
      case 'blockMath': {
        const { text } = t as MathToken
        if (text) out.push({ type: 'mathBlock', attrs: { latex: text } })
        break
      }
      case 'html':
        break
      default:
        break
    }
  }
  return out
}

export const markdownToTiptap = (markdown: string): JSONContent => {
  const tokens = markdownLexer.lexer(markdown)
  const content = blockTokens(tokens)
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}
