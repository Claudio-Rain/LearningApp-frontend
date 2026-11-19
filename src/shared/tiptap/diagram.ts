// Diagrams for Tiptap, drawn with Mermaid: flowcharts, sequence diagrams,
// mind maps, timelines, state/class/ER diagrams, pie charts…
//
// One block atom, `diagram`, holding the Mermaid source text. DiagramNode.vue
// draws it (loading Mermaid only when a card actually has a diagram) and edits
// it. In markdown it's a ```mermaid fenced block, the form Claude writes.

import { Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import DiagramNode from '../components/DiagramNode.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diagram: {
      /** Insert a diagram; without source it starts empty, opened for editing. */
      insertDiagram: (source?: string) => ReturnType
    }
  }
}

export const Diagram = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes: () => ({
    source: {
      default: '',
      parseHTML: (el: HTMLElement) => el.getAttribute('data-source') ?? '',
      renderHTML: (attrs: Record<string, unknown>) => ({ 'data-source': attrs.source ?? '' }),
    },
  }),

  parseHTML: () => [{ tag: 'div[data-type="diagram"]' }],

  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'diagram' })],

  renderText: ({ node }) => `\`\`\`mermaid\n${node.attrs.source ?? ''}\n\`\`\`\n`,

  addNodeView: () => VueNodeViewRenderer(DiagramNode),

  addCommands() {
    return {
      insertDiagram:
        (source = '') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { source } }),
    }
  },
})
