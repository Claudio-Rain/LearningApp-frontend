import { describe, it, expect } from 'vitest'
import type { JSONContent } from '@tiptap/vue-3'
import { markdownToTiptap } from '@/utils/markdown'
import { extractText } from '@/utils/claude/text'

const firstParagraph = (md: string): JSONContent[] =>
  markdownToTiptap(md).content?.[0]?.content ?? []

describe('markdownToTiptap — math', () => {
  it('turns $…$ into an inline formula, keeping backslashes', () => {
    expect(firstParagraph('The area is $\\int_0^1 x^2\\,dx$ units.')).toEqual([
      { type: 'text', text: 'The area is ' },
      { type: 'mathInline', attrs: { latex: '\\int_0^1 x^2\\,dx' } },
      { type: 'text', text: ' units.' },
    ])
  })

  it('accepts \\(…\\) as inline delimiters', () => {
    expect(firstParagraph('So \\(\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1\\).')[1]).toEqual({
      type: 'mathInline',
      attrs: { latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
    })
  })

  it('leaves prices alone', () => {
    expect(firstParagraph('It costs $5 and $10 later.')).toEqual([
      { type: 'text', text: 'It costs $5 and $10 later.' },
    ])
  })

  it('turns a $$ block into a display formula', () => {
    const doc = markdownToTiptap('Derivative:\n\n$$\n\\frac{d}{dx} x^n = n x^{n-1}\n$$\n\nDone.')
    expect(doc.content?.map(n => n.type)).toEqual(['paragraph', 'mathBlock', 'paragraph'])
    expect(doc.content?.[1]?.attrs).toEqual({ latex: '\\frac{d}{dx} x^n = n x^{n-1}' })
  })

  it('accepts \\[…\\] as display delimiters', () => {
    const doc = markdownToTiptap('\\[\n\\sum_{k=1}^n k = \\frac{n(n+1)}{2}\n\\]')
    expect(doc.content?.[0]).toEqual({
      type: 'mathBlock',
      attrs: { latex: '\\sum_{k=1}^n k = \\frac{n(n+1)}{2}' },
    })
  })

  it('finds formulas inside list items', () => {
    const doc = markdownToTiptap('- first $a^2$\n- second')
    const item = doc.content?.[0]?.content?.[0]?.content?.[0]?.content ?? []
    expect(item[1]).toEqual({ type: 'mathInline', attrs: { latex: 'a^2' } })
  })

  it('does not touch $ inside code', () => {
    expect(firstParagraph('Run `echo $HOME$`')).toEqual([
      { type: 'text', text: 'Run ' },
      { type: 'text', text: 'echo $HOME$', marks: [{ type: 'code' }] },
    ])
  })
})

describe('extractText — math', () => {
  it('keeps formulas as LaTeX in plain text', () => {
    const doc = markdownToTiptap('Compute $\\int x\\,dx$')
    expect(extractText(doc).trim()).toBe('Compute $\\int x\\,dx$')
  })
})
