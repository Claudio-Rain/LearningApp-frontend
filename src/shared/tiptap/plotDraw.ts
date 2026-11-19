// Turning a PlotSpec into function-plot options. Browser-only (function-plot
// and KaTeX); the pure spec/text handling lives in utils/plotSpec.ts.
//
// function-plot draws labels wherever it's told, so with a few named curves,
// points and guide lines they pile up. Every label here goes through a small
// placer instead: it tries a handful of positions and takes the first that
// stays inside the plot and clear of everything placed before it.

import katex from 'katex'
import { EvalBuiltIn, type FunctionPlotAnnotation, type FunctionPlotDatum, type FunctionPlotOptions } from 'function-plot'
import { DEFAULT_X_DOMAIN, isSequence, normalizeExpression, plainLabel, type PlotSpec } from '@/utils/plotSpec'

// Constants the evaluator doesn't know by name. (Its scope only takes numbers,
// which is why ln/arcsin are rewritten in normalizeExpression instead.)
const SCOPE = { e: Math.E, pi: Math.PI }

export const COLORS = ['#1E88E5', '#E53935', '#43A047', '#FB8C00', '#8E24AA']
const MARK_COLOR = '#90A4AE'

const SEQUENCE_X_DOMAIN: Range = [0, 10.5]

// function-plot's fixed cartesian margins around the drawing area.
const MARGIN = { left: 40, right: 20, top: 20, bottom: 20 }

type Fn = (x: number) => number
type Range = [number, number]

/** f(v) for an expression in x, or in n for a sequence. */
const evaluator = (fn: string, variable: 'x' | 'n'): Fn => {
  const meta = { fn, scope: SCOPE }
  return v => EvalBuiltIn(meta, 'fn', { [variable]: v }) as number
}

/** The whole numbers a sequence is drawn at inside the visible x range. */
const integersIn = ([lo, hi]: Range): number[] => {
  const first = Math.ceil(lo)
  const count = Math.min(Math.floor(hi) - first + 1, 400)
  return Array.from({ length: Math.max(0, count) }, (_, i) => first + i)
}

/** Sampled values of every curve, for fitting the y range. */
const sampleValues = (fs: Fn[], sequence: boolean[], [lo, hi]: Range): number[] =>
  fs.flatMap((f, i) => {
    const xs = sequence[i] ? integersIn([lo, hi]) : Array.from({ length: 201 }, (_, k) => lo + ((hi - lo) * k) / 200)
    return xs.map(f).filter(Number.isFinite)
  })

/** Central-difference slope; the tangent needs f'(x) and nobody wants to type it. */
const slope = (f: Fn, x: number): number => {
  const h = 1e-5 * Math.max(1, Math.abs(x))
  return (f(x + h) - f(x - h)) / (2 * h)
}

/**
 * A y range that shows the curves well: the 5th–95th percentile of sampled
 * values (so an asymptote like 1/x doesn't flatten everything), widened to
 * include any marked point or horizontal line, padded 15%.
 */
const fitYDomain = (values: number[], extra: number[]): Range => {
  const ys = [...values].sort((a, b) => a - b)
  let bottom = Math.min(0, ...extra, ys.length ? ys[Math.floor(ys.length * 0.05)]! : -5)
  let top = Math.max(0, ...extra, ys.length ? ys[Math.ceil(ys.length * 0.95) - 1]! : 5)
  if (top - bottom < 1e-9) {
    bottom -= 1
    top += 1
  }
  const pad = (top - bottom) * 0.15
  return [bottom - pad, top + pad]
}

/**
 * Compile and try each expression before drawing: a typo should give a
 * message, not a half-drawn chart from an exception thrown mid-render.
 */
const findBadExpression = (sources: string[], fs: Fn[]): string => {
  for (let i = 0; i < fs.length; i++) {
    let ok = false
    try {
      ok = typeof fs[i]!(0.4321) === 'number'
    } catch {
      // The parser's own messages ("reading 'type'") don't help anyone.
    }
    if (!ok) return `“${sources[i]}” — check the syntax, e.g. sin(x) with parentheses, 3*x or 3x`
  }
  return ''
}

// --- label placement -----------------------------------------------------------

interface Box {
  x1: number
  y1: number
  x2: number
  y2: number
}

type Anchor = 'start' | 'end'

/** A candidate spot for a label, in pixels inside the drawing area (baseline). */
interface Spot {
  px: number
  py: number
  anchor: Anchor
}

export const FONT_PX = 14
// Rough advance for 14px semibold text; generous so near-misses don't touch.
export const textWidth = (text: string) => text.length * 8 + 4

const boxOf = ({ px, py, anchor }: Spot, text: string): Box => {
  const w = textWidth(text)
  const x1 = anchor === 'start' ? px : px - w
  return { x1, y1: py - FONT_PX, x2: x1 + w, y2: py + 4 }
}

const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2

class Placer {
  private taken: Box[] = []
  readonly w: number
  readonly h: number

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    // The Reset view / Edit buttons float over the top-right corner.
    this.reserve({ x1: w - 120, y1: -MARGIN.top, x2: w + MARGIN.right, y2: 16 })
  }

  reserve(box: Box) {
    this.taken.push(box)
  }

  private fits(box: Box) {
    const inside = box.x1 >= 2 && box.x2 <= this.w - 2 && box.y1 >= 2 && box.y2 <= this.h - 2
    return inside && !this.taken.some(t => overlaps(t, box))
  }

  /** First spot that fits; with `force`, the first spot even if nothing fits. */
  place(text: string, spots: Spot[], force: boolean): Spot | null {
    const spot = spots.find(s => this.fits(boxOf(s, text))) ?? (force ? spots[0] : undefined)
    if (spot) this.reserve(boxOf(spot, text))
    return spot ?? null
  }
}

/** Pixel <-> data conversion for the drawing area. */
const scales = (x: Range, y: Range, w: number, h: number) => ({
  px: (v: number) => ((v - x[0]) / (x[1] - x[0])) * w,
  py: (v: number) => (1 - (v - y[0]) / (y[1] - y[0])) * h,
  vx: (p: number) => x[0] + (p / w) * (x[1] - x[0]),
  vy: (p: number) => y[0] + (1 - p / h) * (y[1] - y[0]),
})

type Scales = ReturnType<typeof scales>

const BASE = { graphType: 'polyline', sampler: 'builtIn', scope: SCOPE } as const

// function-plot's text datum, positioned from a placed spot. `fill` can be
// 'currentColor' (follows the theme); `color` must stay a real colour for d3.
const textDatum = (s: Scales, spot: Spot, text: string, color: string, fill = color) =>
  ({
    graphType: 'text',
    location: [s.vx(spot.px), s.vy(spot.py)],
    text,
    skipTip: true,
    color,
    attr: { fill, 'font-size': `${FONT_PX}px`, 'font-weight': '600', 'text-anchor': spot.anchor },
  }) as FunctionPlotDatum

// Points first: their labels are the most specific, so they get first pick.
const pointData = (spec: PlotSpec, s: Scales, placer: Placer): FunctionPlotDatum[] => {
  const points = spec.points ?? []
  if (!points.length) return []
  for (const p of points) {
    const [px, py] = [s.px(p.x), s.py(p.y)]
    placer.reserve({ x1: px - 6, y1: py - 6, x2: px + 6, y2: py + 6 })
  }
  const labels = points.flatMap(p => {
    if (!p.label) return []
    const text = plainLabel(p.label)
    const [px, py] = [s.px(p.x), s.py(p.y)]
    const spot = placer.place(text, [
      { px: px + 8, py: py - 8, anchor: 'start' },
      { px: px - 8, py: py - 8, anchor: 'end' },
      { px: px + 8, py: py + 18, anchor: 'start' },
      { px: px - 8, py: py + 18, anchor: 'end' },
    ], true)
    return spot ? [textDatum(s, spot, text, MARK_COLOR)] : []
  })
  return [
    {
      fnType: 'points',
      graphType: 'scatter',
      points: points.map(p => [p.x, p.y]),
      color: MARK_COLOR,
      skipTip: true,
      attr: { r: '4.5', opacity: '1', fill: MARK_COLOR, class: 'fplot-point' },
    } as FunctionPlotDatum,
    ...labels,
  ]
}

// Guide-line labels run horizontally beside their line (the library's own
// annotation text is rotated and lands on top of everything else).
const lineLabelData = (spec: PlotSpec, s: Scales, placer: Placer): FunctionPlotDatum[] =>
  (spec.lines ?? []).flatMap(l => {
    if (!l.label) return []
    const text = plainLabel(l.label)
    const { w, h } = placer
    const spots: Spot[] =
      l.axis === 'y'
        ? [
            { px: 6, py: s.py(l.at) - 5, anchor: 'start' },
            { px: w - 6, py: s.py(l.at) - 5, anchor: 'end' },
            { px: 6, py: s.py(l.at) + 15, anchor: 'start' },
            { px: w - 6, py: s.py(l.at) + 15, anchor: 'end' },
          ]
        : [16, h - 8, h / 2, 34, h - 26].flatMap(py => [
            { px: s.px(l.at) + 5, py, anchor: 'start' as const },
            { px: s.px(l.at) - 5, py, anchor: 'end' as const },
          ])
    const spot = placer.place(text, spots, true)
    return spot ? [textDatum(s, spot, text, MARK_COLOR, 'currentColor')] : []
  })

// Curve names are not written inside the plot: wherever they go they end up
// on top of some curve, and the legend below already shows them, with real
// math. Only points and guide lines, which have no legend, get on-plot text.

/** A sequence as dots at whole n. */
const sequenceDatum = (f: Fn, xDomain: Range, color: string): FunctionPlotDatum =>
  ({
    fnType: 'points',
    graphType: 'scatter',
    points: integersIn(xDomain)
      .map(n => [n, f(n)])
      .filter(([, y]) => Number.isFinite(y)),
    color,
    skipTip: true,
    attr: { r: '4', opacity: '1', fill: color, class: 'fplot-point' },
  }) as FunctionPlotDatum

const lineAnnotations = (spec: PlotSpec): FunctionPlotAnnotation[] => [
  ...(spec.area ? [{ x: spec.area[0] }, { x: spec.area[1] }] : []),
  ...(spec.lines ?? []).map(l => (l.axis === 'x' ? { x: l.at } : { y: l.at })),
]

export type PlotBuild =
  | { error: string }
  | { options: Omit<FunctionPlotOptions, 'target' | 'width' | 'height'> }

/** Everything function-plot needs for a plot of this outer size, except the target. */
export const buildPlot = (spec: PlotSpec, width: number, height: number): PlotBuild => {
  const fns = spec.functions.map(normalizeExpression)
  const sequence = spec.functions.map(isSequence)
  const fs = fns.map((fn, i) => evaluator(fn, sequence[i] ? 'n' : 'x'))
  const error = findBadExpression(spec.functions, fs)
  if (error) return { error }

  // Sequences usually start at n = 1; -5..5 would waste half the plot.
  const xDomain = spec.xDomain ?? (sequence.every(Boolean) ? SEQUENCE_X_DOMAIN : DEFAULT_X_DOMAIN)
  const extraY = [
    ...(spec.points ?? []).map(p => p.y),
    ...(spec.lines ?? []).filter(l => l.axis === 'y').map(l => l.at),
  ]
  const yDomain = spec.yDomain ?? fitYDomain(sampleValues(fs, sequence, xDomain), extraY)

  const w = width - MARGIN.left - MARGIN.right
  const h = height - MARGIN.top - MARGIN.bottom
  const s = scales(xDomain, yDomain, w, h)
  const placer = new Placer(w, h)

  const data: FunctionPlotDatum[] = fns.map((fn, i) => {
    const color = COLORS[i % COLORS.length]!
    if (sequence[i]) return sequenceDatum(fs[i]!, xDomain, color)
    const label = plainLabel(spec.labels?.[i] ?? '')
    // `title` prefixes the pointer readout with the curve's name.
    return { ...BASE, fn, color, ...(label && { title: label }) } as FunctionPlotDatum
  })
  // Tangent and area only make sense on a continuous first function.
  const continuousFirst = !sequence[0]
  if (spec.area && continuousFirst) {
    data.push({ ...BASE, fn: fns[0], closed: true, range: spec.area, skipTip: true, color: COLORS[0] })
  }
  if (spec.tangent && continuousFirst) {
    // Start inside the shaded area if there is one, else a bit right of centre.
    const x0 = spec.area
      ? (spec.area[0] + spec.area[1]) / 2
      : (xDomain[0] + xDomain[1]) / 2 + (xDomain[1] - xDomain[0]) / 8
    const f0 = fs[0]!
    data[0]!.derivative = { fn: scope => slope(f0, Number(scope.x)), x0, updateOnMouseMove: true }
  }

  data.push(...pointData(spec, s, placer), ...lineLabelData(spec, s, placer))

  return {
    options: {
      grid: true,
      xAxis: { domain: [...xDomain] },
      yAxis: { domain: [...yDomain] },
      tip: { xLine: true, yLine: true },
      annotations: lineAnnotations(spec),
      data,
    },
  }
}

// --- rich labels (title and legend) ---------------------------------------------

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const renderMath = (latex: string) => katex.renderToString(latex, { throwOnError: false, strict: 'ignore' })

const MATH_WORDS = new Set(['sin', 'cos', 'tan', 'sqrt', 'log', 'ln', 'exp', 'abs', 'pi', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan'])

/**
 * Whether a label without $...$ is really a formula ("y = x^(3/2)") rather
 * than prose ("chord, length ≈ 8.94"): math symbols, and no word longer than
 * two letters that isn't a function name.
 */
const looksLikeMath = (text: string) =>
  /[=^_²³√]/.test(text) && (text.match(/[a-zA-Z]{3,}/g) ?? []).every(w => MATH_WORDS.has(w))

/** Expression syntax ("x^(3/2)", "sqrt(x)") to LaTeX ("x^{3/2}", "\sqrt{x}"). */
const expressionToLatex = (text: string) =>
  text
    .replace(/\^\(([^()]*)\)/g, '^{$1}')
    .replace(/sqrt\(([^()]*)\)/g, '\\sqrt{$1}')
    .replace(/\b(sinh|cosh|tanh|sin|cos|tan|log|ln|exp)\b/g, '\\$1')
    .replace(/\bpi\b/g, '\\pi')
    .replace(/\*/g, ' \\cdot ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')

/**
 * Label or title text as safe HTML: $...$ parts rendered with KaTeX, the rest
 * escaped — and a bare formula with no $ at all rendered as math too.
 */
export const richTextHtml = (text: string): string => {
  if (!text.includes('$') && looksLikeMath(text)) return renderMath(expressionToLatex(text))
  return text
    .split(/(\$[^$]+\$)/g)
    .map(part =>
      part.length > 2 && part.startsWith('$') && part.endsWith('$') ? renderMath(part.slice(1, -1)) : escapeHtml(part)
    )
    .join('')
}
