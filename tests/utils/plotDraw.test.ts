import { describe, it, expect } from 'vitest'
import type { FunctionPlotDatum } from 'function-plot'
import { FONT_PX, buildPlot, richTextHtml, textWidth } from '@/shared/tiptap/plotDraw'
import { parsePlotSpec } from '@/utils/plotSpec'

describe('richTextHtml', () => {
  it('renders a bare formula as math', () => {
    expect(richTextHtml('y = x^(3/2)')).toContain('class="katex"')
  })

  it('keeps prose as escaped text', () => {
    const html = richTextHtml('chord, length ≈ 8.94 <b>')
    expect(html).not.toContain('katex')
    expect(html).toBe('chord, length ≈ 8.94 &lt;b&gt;')
  })

  it('renders only the $...$ parts of mixed text', () => {
    const html = richTextHtml('Region under $y=x^2$ on the left')
    expect(html.startsWith('Region under ')).toBe(true)
    expect(html.endsWith(' on the left')).toBe(true)
    expect(html).toContain('class="katex"')
  })
})

type TextDatum = FunctionPlotDatum & { location: [number, number]; text: string; attr: Record<string, string> }

/** The text labels buildPlot placed, as pixel boxes in the drawing area. */
const labelBoxes = (block: string, width = 760, height = 460) => {
  const spec = parsePlotSpec(block)!
  const built = buildPlot(spec, width, height)
  if ('error' in built) throw new Error(built.error)
  const w = width - 60
  const h = height - 40
  const [x0, x1] = built.options.xAxis!.domain as [number, number]
  const [y0, y1] = built.options.yAxis!.domain as [number, number]
  return (built.options.data as TextDatum[])
    .filter(d => d.graphType === 'text')
    .map(d => {
      const px = ((d.location[0] - x0) / (x1 - x0)) * w
      const py = (1 - (d.location[1] - y0) / (y1 - y0)) * h
      const tw = textWidth(d.text)
      const left = d.attr['text-anchor'] === 'end' ? px - tw : px
      return { text: d.text, x1: left, x2: left + tw, y1: py - FONT_PX, y2: py + 4 }
    })
}

const overlap = (a: { x1: number; x2: number; y1: number; y2: number }, b: typeof a) =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2

describe('buildPlot sequences', () => {
  const build = (block: string) => {
    const built = buildPlot(parsePlotSpec(block)!, 760, 460)
    if ('error' in built) throw new Error(built.error)
    return built.options
  }

  it('draws a sequence as dots at whole n, alongside continuous envelopes', () => {
    const options = build('(-1)^n/n "$a_n$"\n1/x\n-1/x\nx: 0.5, 10.5\ny: -1.2, 1.2')
    const dots = (options.data as (FunctionPlotDatum & { points?: number[][] })[])[0]!
    expect(dots.graphType).toBe('scatter')
    expect(dots.points!.map(p => p[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(dots.points![0]![1]).toBeCloseTo(-1)
    expect(dots.points![1]![1]).toBeCloseTo(0.5)
    expect(options.data![1]!.graphType).toBe('polyline')
  })

  it('starts at 0 instead of -5 when everything is a sequence', () => {
    expect(build('1/n').xAxis!.domain).toEqual([0, 10.5])
  })
})

describe('buildPlot label placement', () => {
  // The washer plot from the screenshot: curve name, point and vertical line
  // all want the same corner.
  const crowded =
    'y = x^2 "y = x²"\n' +
    'point: 1, 1 "(1, 1)"\n' +
    'vline: 1 "x = 1 (outer radius R)"\n' +
    'hline: 1 "y = 1 (top)"\n' +
    'x: -0.2, 1.3\ny: -0.1, 1.3'

  it('keeps every label clear of the others', () => {
    const boxes = labelBoxes(crowded)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlap(boxes[i]!, boxes[j]!), `${boxes[i]!.text} vs ${boxes[j]!.text}`).toBe(false)
      }
    }
  })

  it('always places point and guide-line labels', () => {
    const texts = labelBoxes(crowded).map(b => b.text)
    expect(texts).toEqual(expect.arrayContaining(['(1, 1)', 'x = 1 (outer radius R)', 'y = 1 (top)']))
  })

  it('writes guide-line labels horizontally, inside the plot', () => {
    for (const b of labelBoxes(crowded)) {
      expect(b.x1).toBeGreaterThanOrEqual(0)
      expect(b.x2).toBeLessThanOrEqual(700)
    }
  })

  it('does not write curve names inside the plot (the legend has them)', () => {
    const texts = labelBoxes('y = x^2 "parabola"\npoint: 1, 1 "P"').map(b => b.text)
    expect(texts).toEqual(['P'])
  })

  it('reports a bad expression instead of building', () => {
    expect(buildPlot(parsePlotSpec('sin x +')!, 760, 460)).toHaveProperty('error')
  })
})

describe('buildPlot sliders', () => {
  const spec = parsePlotSpec('y = a*x\nslider: a = 1, -3..3\nx: 0, 1')!

  it('plots with the slider value, and complains when a name is undeclared', () => {
    expect('options' in buildPlot(spec, 400, 300, { a: 2 })).toBe(true)
    expect('error' in buildPlot(parsePlotSpec('y = a*x')!, 400, 300)).toBe(true)
  })

  it('keeps the y range of the starting values while a slider moves', () => {
    const at = (a: number) => {
      const built = buildPlot(spec, 400, 300, { a })
      return 'options' in built ? built.options.yAxis?.domain : null
    }
    expect(at(3)).toEqual(at(1))
  })
})
