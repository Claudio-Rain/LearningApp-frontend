// Tiptap extensions for rich card content: coloured text (`tone`), a
// multi-colour highlighter and callout boxes. Colours are stored as palette
// names and drawn by shared/styles/richContent.scss, so they follow the theme.

import { Mark, Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import Highlight from '@tiptap/extension-highlight'
import CalloutNode from '../components/CalloutNode.vue'
import { isCalloutVariant, isHighlightColor, isTextColor, type CalloutVariant } from '@/utils/richFormat'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tone: {
      /** Colour the selected text with a palette colour, or clear it with null. */
      setTone: (color: string | null) => ReturnType
    }
    callout: {
      /** Wrap the selected blocks (or the current one) in a callout box. */
      setCallout: (variant: CalloutVariant) => ReturnType
    }
  }
}

/** Coloured text: <span data-tone="blue">. */
export const Tone = Mark.create({
  name: 'tone',

  addAttributes: () => ({
    color: {
      default: 'blue',
      parseHTML: el => el.getAttribute('data-tone'),
      renderHTML: attrs => ({ 'data-tone': attrs.color }),
    },
  }),

  parseHTML: () => [{ tag: 'span[data-tone]' }],

  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { class: 'tone' }), 0],

  addCommands() {
    return {
      setTone:
        color =>
        ({ commands }) =>
          color && isTextColor(color) ? commands.setMark(this.name, { color }) : commands.unsetMark(this.name),
    }
  },
})

/**
 * The highlighter, by palette name: <mark data-color="green">. No colour is
 * the classic yellow, which keeps every highlight saved before this valid.
 */
export const ColorHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: el => {
          const c = el.getAttribute('data-color')
          return c && isHighlightColor(c) ? c : null
        },
        renderHTML: attrs => (attrs.color ? { 'data-color': attrs.color } : {}),
      },
    }
  },
}).configure({ multicolor: true })

/** A titled, coloured box around any blocks: definition, key result, tip… */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes: () => ({
    variant: {
      default: 'note',
      parseHTML: el => {
        const v = el.getAttribute('data-variant')
        return isCalloutVariant(v) ? v : 'note'
      },
      renderHTML: attrs => ({ 'data-variant': attrs.variant }),
    },
    title: {
      default: '',
      parseHTML: el => el.getAttribute('data-title') ?? '',
      renderHTML: attrs => (attrs.title ? { 'data-title': attrs.title } : {}),
    },
  }),

  parseHTML: () => [{ tag: 'div[data-type="callout"]' }],

  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0],

  addNodeView: () => VueNodeViewRenderer(CalloutNode),

  addCommands() {
    return {
      setCallout:
        variant =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
    }
  },
})

/** Everything above, ready to spread into an editor's `extensions`. */
export const RichFormatExtensions = [Tone, ColorHighlight, Callout]
