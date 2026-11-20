// Answers mark their sections with a paragraph that is bold all the way
// through ("**Step 1: Scratch work (find $\delta$ in terms of $\varepsilon$).**"),
// not with real headings. This extension gives those paragraphs the
// step-heading class (styled in shared/styles/richContent.scss), so an answer
// reads in sections instead of as one even wall of text — in the editor and
// on the study card alike.
//
// Read from the document, not the DOM, and applied as a decoration: the
// editor owns its DOM and would fight a class set on it by hand.

import { Extension } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/** Longer than this, a bold paragraph is emphasis, not a heading. */
export const STEP_HEADING_MAX_LENGTH = 140

/**
 * Whether a paragraph reads as a step heading: every word in it bold (formulas
 * in the middle of the bold line are fine), and short. A paragraph that only
 * starts in bold ("**Goal:** Show that…") is body text.
 */
export function isStepHeading(node: PMNode): boolean {
  if (node.type.name !== 'paragraph' || node.childCount === 0) return false
  if (node.textContent.length > STEP_HEADING_MAX_LENGTH) return false
  let bold = false
  let heading = true
  node.forEach(child => {
    if (!heading) return
    if (child.isText) {
      if (child.marks.some(mark => mark.type.name === 'bold')) bold = true
      else if (child.text?.trim()) heading = false
    } else if (child.type.name !== 'mathInline' && child.type.name !== 'hardBreak') {
      heading = false
    }
  })
  return heading && bold
}

/** Only top-level paragraphs: a bold line inside a list or a callout stays as it is. */
const decorate = (doc: PMNode) => {
  const decorations: Decoration[] = []
  doc.forEach((node, offset) => {
    if (isStepHeading(node)) {
      decorations.push(Decoration.node(offset, offset + node.nodeSize, { class: 'step-heading' }))
    }
  })
  return DecorationSet.create(doc, decorations)
}

const key = new PluginKey<DecorationSet>('stepHeadings')

export const StepHeadings = Extension.create({
  name: 'stepHeadings',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_, state) => decorate(state.doc),
          apply: (tr, old) => (tr.docChanged ? decorate(tr.doc) : old),
        },
        props: {
          decorations: state => key.getState(state),
        },
      }),
    ]
  },
})
