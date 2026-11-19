// Plain text that may hold $...$ math, as HTML: what list rows, flashcard
// fronts and plot titles show instead of raw dollar signs and backslashes.

import katex from 'katex'
import { repairLatex } from './latex'

export { repairLatex }

export const renderMath = (latex: string, displayMode = false): string =>
  katex.renderToString(repairLatex(latex), { displayMode, throwOnError: false, strict: 'ignore' })

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// $...$ with no "$" or line break inside; "$5 and $10" never pairs up because
// the opening $ must be followed, and the closing one preceded, by non-space.
const INLINE_MATH = /\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g

/** Text with $...$ math as safe HTML: KaTeX for the math, everything else escaped. */
export const mathTextHtml = (text: string): string => {
  let html = ''
  let last = 0
  for (const m of text.matchAll(INLINE_MATH)) {
    html += escapeHtml(text.slice(last, m.index)) + renderMath(m[1]!)
    last = m.index! + m[0].length
  }
  return html + escapeHtml(text.slice(last))
}

/** Whether mathTextHtml would render anything as math (lets callers skip v-html). */
export const hasMath = (text: string): boolean => new RegExp(INLINE_MATH.source).test(text)
