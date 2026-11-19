// What a function plot shows, independent of how it's drawn.
//
// A plot is stored as attrs on the `functionPlot` Tiptap node, and travels as
// text in a ```plot fenced block (what Claude writes, and what extractText
// sends back to Claude). The text form is one setting per line:
//
//   ```plot
//   title: ε-δ definition for $f(x)=x^2$
//   y = x^2 - 3x "f(x)"
//   sin(x)/x
//   point: 1, 1 "(a, L)"
//   hline: 1.5 "L + ε"
//   vline: 0.71 "a − δ"
//   x: -2pi, 2pi
//   y: -2, 4
//   tangent
//   area: 0, 3
//   ```
//
// Any line that isn't a setting is a function of x. A trailing "quoted text"
// on a function, point or line is its label. This file has no DOM and no
// plotting code, so it runs in the extension's service worker too.

export interface PlotPoint {
  x: number
  y: number
  label?: string
}

export interface PlotLine {
  /** 'x' is a vertical line at x = at; 'y' a horizontal one at y = at. */
  axis: 'x' | 'y'
  at: number
  label?: string
}

export interface PlotSpec {
  /** Expressions in x, as the user typed them. */
  functions: string[]
  /** Names for the functions, by index; '' (or missing) means unnamed. */
  labels?: string[]
  /** Caption above the plot; may hold $...$ math. */
  title?: string
  /** Marked points, e.g. the (a, L) of a limit. */
  points?: PlotPoint[]
  /** Labelled guide lines, e.g. the ε and δ bands. */
  lines?: PlotLine[]
  /** Visible x range; absent means the default. */
  xDomain?: [number, number] | null
  /** Visible y range; absent means fitted to the functions. */
  yDomain?: [number, number] | null
  /** Show the tangent line of the first function, following the pointer. */
  tangent?: boolean
  /** Shade the area under the first function between these x values. */
  area?: [number, number] | null
}

export const DEFAULT_X_DOMAIN: [number, number] = [-5, 5]

/** At most this many curves; past that a plot stops being readable. */
export const MAX_FUNCTIONS = 5

/** Points and guide lines together; enough for any band-and-point sketch. */
export const MAX_MARKS = 12

// --- expressions ------------------------------------------------------------

// Names students write that the evaluator (JS Math based) doesn't know.
const FUNCTION_ALIASES: Record<string, string> = {
  ln: 'log',
  sen: 'sin',
  tg: 'tan',
  arcsin: 'asin',
  arccos: 'acos',
  arctan: 'atan',
  arcsen: 'asin',
  arctg: 'atan',
}

const UNICODE: [RegExp, string][] = [
  [/π/g, 'pi'],
  [/[·×]/g, '*'],
  [/÷/g, '/'],
  [/[−–]/g, '-'],
  [/²/g, '^2'],
  [/³/g, '^3'],
  [/√/g, 'sqrt'],
]

/**
 * Turn what a person (or Claude) writes into what the evaluator accepts:
 * drops a leading `y =` / `f(x) =`, maps ln/arcsin/sen…, and unicode symbols.
 * `e` and `pi` are left as names; the plot supplies them as constants.
 */
export const normalizeExpression = (source: string): string => {
  let s = source.trim()
  for (const [re, to] of UNICODE) s = s.replace(re, to)
  s = s.replace(/^(?:y|[a-zA-Z]\s*\(\s*x\s*\))\s*=\s*/, '')
  s = s.replace(/\b([a-z]+)\s*\(/g, (match, name: string) =>
    name in FUNCTION_ALIASES ? `${FUNCTION_ALIASES[name]}(` : match
  )
  return s
}

const mentions = (expr: string, name: string) => new RegExp(`(^|[^a-zA-Z])${name}([^a-zA-Z]|$)`).test(expr)

/**
 * A sequence, not a function: written in n and not in x, e.g. "(-1)^n/n".
 * Drawn as dots at whole n, since a_n doesn't exist between integers.
 */
export const isSequence = (fn: string): boolean => {
  const expr = normalizeExpression(fn)
  return mentions(expr, 'n') && !mentions(expr, 'x')
}

// --- labels -------------------------------------------------------------------

// LaTeX commands worth turning into a character for text drawn inside the
// SVG, where KaTeX can't render.
const LATEX_SYMBOLS: Record<string, string> = {
  varepsilon: 'ε', epsilon: 'ε', delta: 'δ', Delta: 'Δ', alpha: 'α', beta: 'β',
  gamma: 'γ', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', phi: 'φ',
  omega: 'ω', infty: '∞', pm: '±', cdot: '·', times: '×', le: '≤', leq: '≤',
  ge: '≥', geq: '≥', ne: '≠', neq: '≠', to: '→', approx: '≈', sqrt: '√',
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸',
  '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', '/': 'ᐟ', n: 'ⁿ', x: 'ˣ', i: 'ⁱ',
}

const SUBSCRIPT: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈',
  '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', i: 'ᵢ', j: 'ⱼ',
  k: 'ₖ', m: 'ₘ', n: 'ₙ', o: 'ₒ', x: 'ₓ',
}

/** "3/2" -> "³ᐟ²" with SUPERSCRIPT; null when some character has no such form. */
const remap = (s: string, table: Record<string, string>): string | null => {
  const chars = [...s.replace(/\s+/g, '')]
  return chars.length && chars.every(c => c in table) ? chars.map(c => table[c]).join('') : null
}
const toSuperscript = (s: string) => remap(s, SUPERSCRIPT)
const toSubscript = (s: string) => remap(s, SUBSCRIPT)

/**
 * A label as plain text for drawing inside the plot: `$L+\varepsilon$`
 * becomes "L+ε". The legend and title render the original with KaTeX.
 */
export const plainLabel = (label: string): string =>
  label
    .replace(/\$/g, '')
    .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => LATEX_SYMBOLS[name] ?? name)
    // x^2, x^{-1}, x^(3/2): exponents become superscripts when they can.
    .replace(/\^(?:\{([^{}]*)\}|\(([^()]*)\)|(-?\d+|[a-z]))/g, (m, a?: string, b?: string, c?: string) =>
      toSuperscript(a ?? b ?? c ?? '') ?? m
    )
    // b_n, a_{n+1}: subscripts likewise.
    .replace(/_(?:\{([^{}]*)\}|(\d+|[a-z]))/g, (m, a?: string, b?: string) => toSubscript(a ?? b ?? '') ?? m)
    .replace(/[{}\\]/g, '')
    .trim()

// A trailing "label" (straight or curly quotes) on a function, point or line.
const QUOTED_LABEL = /\s*["“]([^"”]*)["”]\s*$/

const splitLabel = (line: string): [string, string] => {
  const m = QUOTED_LABEL.exec(line)
  return m ? [line.slice(0, m.index).trim(), m[1]!.trim()] : [line, '']
}

const quote = (label?: string) => (label ? ` "${label}"` : '')

// --- numbers in settings ------------------------------------------------------

// Plain numbers plus multiples/fractions of pi: 3, -2.5, pi, -2pi, pi/2, 3pi/4.
const NUMBER = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)?)\s*\*?\s*(pi|π)?\s*(?:\/\s*(\d+(?:\.\d+)?))?$/i

export const parseNumber = (text: string): number | null => {
  const m = NUMBER.exec(text.trim().replace(/^[−–]/, '-'))
  if (!m) return null
  const [, coef = '', pi, divisor] = m
  const bareSign = coef === '' || coef === '+' || coef === '-'
  // A sign alone only makes sense in front of pi ("-pi").
  if (bareSign && !pi) return null
  const coefficient = coef === '-' ? -1 : bareSign ? 1 : Number(coef)
  const value = (coefficient * (pi ? Math.PI : 1)) / (divisor ? Number(divisor) : 1)
  return Number.isFinite(value) ? value : null
}

const parsePair = (text: string): [number, number] | null => {
  const parts = text.replace(/^[[(]|[\])]$/g, '').split(/\s*(?:,|\.\.|\bto\b|\ba\b)\s*/i)
  if (parts.length !== 2) return null
  const a = parseNumber(parts[0]!)
  const b = parseNumber(parts[1]!)
  return a === null || b === null ? null : [a, b]
}

const parseRange = (text: string): [number, number] | null => {
  const pair = parsePair(text)
  if (!pair || pair[0] === pair[1]) return null
  return pair[0] < pair[1] ? pair : [pair[1], pair[0]]
}

// --- text form ----------------------------------------------------------------

const RANGE_SETTING = /^(x|y|area|área)\s*[:=]\s*(.+)$/i
const MARK_SETTING = /^(point|punto|vline|hline)\s*[:=]\s*(.+)$/i
const TITLE_SETTING = /^(title|título|titulo)\s*[:=]\s*(.+)$/i
const TANGENT = /^(tangent|tangente)$/i

const RANGE_KEYS = { x: 'xDomain', y: 'yDomain', area: 'area', área: 'area' } as const

const applyRange = (spec: PlotSpec, line: string): boolean => {
  const m = RANGE_SETTING.exec(line)
  // "y: 2x" matches the shape but isn't a range: the caller keeps it as a function.
  const range = m ? parseRange(m[2]!) : null
  if (!range) return false
  spec[RANGE_KEYS[m![1]!.toLowerCase() as keyof typeof RANGE_KEYS]] = range
  return true
}

const markCount = (spec: PlotSpec) => (spec.points?.length ?? 0) + (spec.lines?.length ?? 0)

const applyMark = (spec: PlotSpec, line: string): boolean => {
  const m = MARK_SETTING.exec(line)
  if (!m) return false
  const kind = m[1]!.toLowerCase()
  const [body, label] = splitLabel(m[2]!)
  if (markCount(spec) >= MAX_MARKS) return true

  if (kind === 'point' || kind === 'punto') {
    const pair = parsePair(body)
    if (pair) (spec.points ??= []).push({ x: pair[0], y: pair[1], ...(label && { label }) })
    return true
  }
  const at = parseNumber(body)
  if (at !== null) (spec.lines ??= []).push({ axis: kind === 'vline' ? 'x' : 'y', at, ...(label && { label }) })
  return true
}

/** Apply one setting line to the spec; false when the line isn't a setting. */
const applySetting = (spec: PlotSpec, line: string): boolean => {
  if (TANGENT.test(line)) {
    spec.tangent = true
    return true
  }
  const title = TITLE_SETTING.exec(line)
  if (title) {
    spec.title = title[2]!.trim()
    return true
  }
  return applyRange(spec, line) || applyMark(spec, line)
}

const addFunction = (spec: PlotSpec, line: string) => {
  if (spec.functions.length >= MAX_FUNCTIONS) return
  const [body, label] = splitLabel(line)
  const fn = body.replace(/^(?:y|[a-zA-Z]\s*\(\s*x\s*\))\s*[:=]\s*/, '')
  if (!fn) return
  spec.functions.push(fn)
  if (label) {
    spec.labels ??= []
    spec.labels[spec.functions.length - 1] = label
  }
}

/** Read a ```plot block's body. Returns null when it has no function to draw. */
export const parsePlotSpec = (text: string): PlotSpec | null => {
  const spec: PlotSpec = { functions: [] }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || applySetting(spec, line)) continue
    addFunction(spec, line)
  }
  if (!spec.functions.length) return null
  // Labels are set by index, so fill the holes left by unnamed functions.
  if (spec.labels) spec.labels = spec.functions.map((_, i) => spec.labels![i] ?? '')
  return spec
}

/** A number as a person would write it: pi multiples as "-2pi" or "pi/2". */
export const formatNumber = (n: number): string => {
  for (const d of [1, 2, 3, 4, 6]) {
    const k = (n * d) / Math.PI
    if (Math.abs(k - Math.round(k)) < 1e-9 && Math.round(k) !== 0) {
      const c = Math.round(k)
      const head = c === 1 ? '' : c === -1 ? '-' : String(c)
      return `${head}pi${d === 1 ? '' : `/${d}`}`
    }
  }
  return String(Math.round(n * 1e6) / 1e6)
}

const formatRange = ([lo, hi]: [number, number]) => `${formatNumber(lo)}, ${formatNumber(hi)}`

/** One function line, with its label if it has one. */
export const functionLine = (fn: string, label?: string) => `y = ${fn}${quote(label)}`

/** The point/vline/hline lines of a spec, one per mark. */
export const markLines = (spec: Pick<PlotSpec, 'points' | 'lines'>): string[] => [
  ...(spec.points ?? []).map(p => `point: ${formatNumber(p.x)}, ${formatNumber(p.y)}${quote(p.label)}`),
  ...(spec.lines ?? []).map(l => `${l.axis === 'x' ? 'vline' : 'hline'}: ${formatNumber(l.at)}${quote(l.label)}`),
]

/** The ```plot block body for a spec; parsePlotSpec reads it back unchanged. */
export const plotSpecToText = (spec: PlotSpec): string => {
  const lines: string[] = []
  if (spec.title) lines.push(`title: ${spec.title}`)
  spec.functions.forEach((fn, i) => lines.push(functionLine(fn, spec.labels?.[i])))
  lines.push(...markLines(spec))
  if (spec.xDomain) lines.push(`x: ${formatRange(spec.xDomain)}`)
  if (spec.yDomain) lines.push(`y: ${formatRange(spec.yDomain)}`)
  if (spec.tangent) lines.push('tangent')
  if (spec.area) lines.push(`area: ${formatRange(spec.area)}`)
  return lines.join('\n')
}
