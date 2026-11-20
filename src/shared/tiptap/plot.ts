// Interactive function plots for Tiptap, drawn with function-plot.
//
// One block atom, `functionPlot`, whose attrs are a PlotSpec (see
// utils/plotSpec.ts): the expressions and their names, a title, labelled
// points and guide lines, plus optional ranges, a pointer-following tangent,
// a shaded area and sliders for parameters the expressions use. FunctionPlotNode.vue draws and edits it.

import { Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import FunctionPlotNode from '../components/FunctionPlotNode.vue'
import { plotSpecToText, type PlotLine, type PlotParam, type PlotPoint, type PlotSpec } from '@/utils/plotSpec'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    functionPlot: {
      /** Insert a plot; without a spec it starts as y = x^2, opened for editing. */
      insertFunctionPlot: (spec?: PlotSpec) => ReturnType
    }
  }
}

// Each attr round-trips through one data-* attribute as JSON.
const jsonAttr = <T>(name: string, fallback: T) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => {
    const raw = el.getAttribute(`data-${name}`)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  renderHTML: (attrs: Record<string, unknown>) => ({ [`data-${name}`]: JSON.stringify(attrs[name] ?? fallback) }),
})

export const FunctionPlot = Node.create({
  name: 'functionPlot',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes: () => ({
    functions: jsonAttr<string[]>('functions', []),
    labels: jsonAttr<string[] | null>('labels', null),
    title: jsonAttr<string | null>('title', null),
    points: jsonAttr<PlotPoint[] | null>('points', null),
    lines: jsonAttr<PlotLine[] | null>('lines', null),
    xDomain: jsonAttr<[number, number] | null>('xDomain', null),
    yDomain: jsonAttr<[number, number] | null>('yDomain', null),
    tangent: jsonAttr<boolean>('tangent', false),
    area: jsonAttr<[number, number] | null>('area', null),
    params: jsonAttr<PlotParam[] | null>('params', null),
  }),

  parseHTML: () => [{ tag: 'div[data-type="function-plot"]' }],

  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-type': 'function-plot' }),
  ],

  renderText: ({ node }) => `\`\`\`plot\n${plotSpecToText(node.attrs as PlotSpec)}\n\`\`\`\n`,

  addNodeView: () => VueNodeViewRenderer(FunctionPlotNode),

  addCommands() {
    return {
      insertFunctionPlot:
        spec =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: spec ?? { functions: [] } }),
    }
  },
})
