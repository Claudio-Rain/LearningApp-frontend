// LaTeX formulas for Tiptap, rendered with KaTeX.
//
// Two atom nodes that store the source in a `latex` attribute: `mathInline`
// sits inside a line of text, `mathBlock` is a display formula on its own line.
// Both render through MathNode.vue, which also handles click-to-edit.
//
// Typing shortcuts in the editor:
//   $\frac{a}{b}$   -> inline formula (fires on the closing `$`)
//   $$ + space      -> empty display formula, opened for editing

import { InputRule, Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import MathNode from '../components/MathNode.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      /** Insert an inline formula. Without `latex`, the selected text becomes the source. */
      insertMathInline: (latex?: string) => ReturnType
      /** Insert a display formula. Without `latex`, the selected text becomes the source. */
      insertMathBlock: (latex?: string) => ReturnType
    }
  }
}

const latexAttribute = {
  latex: {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute('data-latex') ?? el.textContent ?? '',
    renderHTML: (attrs: { latex?: string }) => ({ 'data-latex': attrs.latex ?? '' }),
  },
}

// Opening `$` must be followed by a non-space and the closing one preceded by a
// non-space, so prices like "$5 and $10" never turn into a formula.
const INLINE_INPUT = /(?:^|[^$\\])\$([^\s$](?:[^$]*[^\s$])?)\$$/
const BLOCK_INPUT = /^\$\$\s$/

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes: () => latexAttribute,

  parseHTML: () => [{ tag: 'span[data-type="math-inline"]' }],

  renderHTML: ({ HTMLAttributes }) => [
    'span',
    mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline' }),
  ],

  renderText: ({ node }) => `$${node.attrs.latex}$`,

  addNodeView: () => VueNodeViewRenderer(MathNode),

  addCommands() {
    return {
      insertMathInline:
        latex =>
        ({ state, commands }) => {
          const { from, to } = state.selection
          const source = latex ?? state.doc.textBetween(from, to, ' ')
          return commands.insertContent({ type: this.name, attrs: { latex: source } })
        },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: INLINE_INPUT,
        handler: ({ state, range, match }) => {
          const latex = match[1]!
          // match[0] may start with the character before the opening `$`; keep it.
          const start = range.from + match[0].length - latex.length - 2
          state.tr.replaceWith(start, range.to, this.type.create({ latex }))
        },
      }),
    ]
  },
})

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes: () => latexAttribute,

  parseHTML: () => [{ tag: 'div[data-type="math-block"]' }],

  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }),
  ],

  renderText: ({ node }) => `$$\n${node.attrs.latex}\n$$\n`,

  addNodeView: () => VueNodeViewRenderer(MathNode),

  addCommands() {
    return {
      insertMathBlock:
        latex =>
        ({ state, commands }) => {
          const { from, to } = state.selection
          const source = latex ?? state.doc.textBetween(from, to, '\n')
          return commands.insertContent({ type: this.name, attrs: { latex: source } })
        },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: BLOCK_INPUT,
        handler: ({ state, range }) => {
          // Swap the whole (now `$$`-only) paragraph for an empty formula.
          const $from = state.doc.resolve(range.from)
          state.tr.replaceRangeWith($from.before(), $from.after(), this.type.create())
        },
      }),
    ]
  },
})

/** Both math nodes, ready to spread into an editor's `extensions`. */
export const MathExtensions = [MathInline, MathBlock]
