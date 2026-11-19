import { describe, it, expect } from 'vitest'
import { markdownToTiptap } from '@/utils/markdown'
import { extractText } from '@/utils/claude/text'
import { repairLatex } from '@/utils/latex'
import { hasMath, mathTextHtml } from '@/utils/mathText'
import { calloutFromTag } from '@/utils/richFormat'

const firstParagraph = (md: string) => markdownToTiptap(md).content?.[0]?.content ?? []

describe('callouts', () => {
  it('turn "> [!TAG] title" into a callout with its body', () => {
    const doc = markdownToTiptap('> [!THEOREM] Integration by **parts**\n> $$\\int u\\,dv = uv - \\int v\\,du$$\n> Use it when…')
    const box = doc.content?.[0]
    expect(box?.type).toBe('callout')
    expect(box?.attrs).toEqual({ variant: 'theorem', title: 'Integration by parts' })
    expect(box?.content?.map(n => n.type)).toEqual(['mathBlock', 'paragraph'])
  })

  it('take Spanish and GitHub tags, and an empty title', () => {
    expect(markdownToTiptap('> [!Cuidado]\n> No olvides la constante.').content?.[0]?.attrs).toEqual({
      variant: 'warning',
      title: '',
    })
    expect(calloutFromTag('IMPORTANT')).toBe('theorem')
    expect(calloutFromTag('ejemplo')).toBe('example')
  })

  it('make an unknown tag a plain note instead of showing "[!FOO]"', () => {
    expect(markdownToTiptap('> [!FOO] Hm\n> text').content?.[0]?.attrs?.variant).toBe('note')
  })

  it('leave ordinary blockquotes alone', () => {
    expect(markdownToTiptap('> just a quote').content?.[0]?.type).toBe('blockquote')
  })

  it('go back to Claude in the same syntax', () => {
    const doc = markdownToTiptap('> [!TIP] The idea\n> Peel off one sine.')
    expect(extractText(doc)).toContain('> [!TIP] The idea\nPeel off one sine.')
  })
})

describe('highlights and coloured text', () => {
  it('==text== is the default (yellow) highlighter', () => {
    expect(firstParagraph('a ==key step== b')[1]).toEqual({
      type: 'text',
      text: 'key step',
      marks: [{ type: 'highlight' }],
    })
  })

  it('==text=={.green} picks a highlighter colour', () => {
    expect(firstParagraph('==done=={.green}')[0]?.marks).toEqual([{ type: 'highlight', attrs: { color: 'green' } }])
  })

  it('[text]{.blue} colours text and [text]{.bg-pink} highlights it', () => {
    const nodes = firstParagraph('[given]{.blue} and [found]{.bg-pink}')
    expect(nodes[0]?.marks).toEqual([{ type: 'tone', attrs: { color: 'blue' } }])
    expect(nodes[2]?.marks).toEqual([{ type: 'highlight', attrs: { color: 'pink' } }])
  })

  it('carries the colour onto formulas inside', () => {
    expect(firstParagraph('[$u = \\cos x$]{.purple}')[0]).toEqual({
      type: 'mathInline',
      attrs: { latex: 'u = \\cos x' },
      marks: [{ type: 'tone', attrs: { color: 'purple' } }],
    })
  })

  it('keeps the words but drops an unknown colour', () => {
    expect(firstParagraph('[text]{.chartreuse}')).toEqual([{ type: 'text', text: 'text' }])
  })

  it('does not mistake == in math or an ordinary link', () => {
    expect(firstParagraph('[docs](https://x.y)')).toEqual([{ type: 'text', text: 'docs' }])
    expect(firstParagraph('$a == b$')[0]?.type).toBe('mathInline')
  })
})

describe('repairLatex', () => {
  it('turns a check mark escape into \\checkmark', () => {
    expect(repairLatex('= \\sin^3 x \\u2713')).toBe('= \\sin^3 x \\checkmark ')
  })

  it('turns other escapes into the character', () => {
    expect(repairLatex('x \\u2192 0')).toBe('x → 0')
  })

  it('leaves the real \\u accent alone', () => {
    expect(repairLatex('\\u{a} \\u o')).toBe('\\u{a} \\u o')
  })

  it('is applied to math coming from markdown', () => {
    expect(firstParagraph('ok $x^2 \\u2713$')[1]?.attrs?.latex).toBe('x^2 \\checkmark')
  })
})

describe('mathTextHtml', () => {
  it('renders $...$ and escapes the rest', () => {
    const html = mathTextHtml('Compute $\\int x\\,dx$ <now>')
    expect(html.startsWith('Compute ')).toBe(true)
    expect(html).toContain('class="katex"')
    expect(html.endsWith(' &lt;now&gt;')).toBe(true)
  })

  it('leaves prices as text', () => {
    expect(hasMath('It costs $5 and $10')).toBe(false)
  })
})
