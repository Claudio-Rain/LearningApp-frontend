import { describe, it, expect } from 'vitest'
import { Schema, type Node as PMNode } from '@tiptap/pm/model'
import { isStepHeading, STEP_HEADING_MAX_LENGTH } from '@/shared/tiptap/stepHeadings'

// Just enough schema to build the paragraphs answers are made of.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
    mathInline: { group: 'inline', inline: true, atom: true, attrs: { latex: { default: '' } } },
    hardBreak: { group: 'inline', inline: true },
    image: { group: 'inline', inline: true },
  },
  marks: { bold: {}, italic: {} },
})

const bold = (text: string) => schema.text(text, [schema.marks.bold!.create()])
const plain = (text: string) => schema.text(text)
const math = (latex: string) => schema.nodes.mathInline!.create({ latex })
const para = (...children: PMNode[]) => schema.nodes.paragraph!.create(null, children)

describe('isStepHeading', () => {
  it('takes a paragraph that is bold all the way through', () => {
    expect(isStepHeading(para(bold('Step 2: Write the formal proof.')))).toBe(true)
  })

  it('keeps it a heading with formulas in the middle of the bold line', () => {
    const p = para(bold('Step 1: Scratch work (find '), math('\\delta'), bold(' in terms of '), math('\\varepsilon'), bold(').'))
    expect(isStepHeading(p)).toBe(true)
  })

  it('leaves a paragraph that only starts in bold as body text', () => {
    expect(isStepHeading(para(bold('Goal:'), plain(' Show that for every epsilon there is a delta.')))).toBe(false)
  })

  it('allows plain spaces between the bold runs', () => {
    expect(isStepHeading(para(bold('Step 3:'), plain(' '), bold('Simplify')))).toBe(true)
  })

  it('needs some bold text: a formula alone is not a heading', () => {
    expect(isStepHeading(para(math('x^2')))).toBe(false)
  })

  it('treats a long bold paragraph as emphasis, not a heading', () => {
    expect(isStepHeading(para(bold('x'.repeat(STEP_HEADING_MAX_LENGTH + 1))))).toBe(false)
  })

  it('ignores empty paragraphs and anything with other inline content', () => {
    expect(isStepHeading(para())).toBe(false)
    expect(isStepHeading(para(bold('Look:'), schema.nodes.image!.create()))).toBe(false)
  })

  it('counts bold with another mark on top (bold italic) as bold', () => {
    const p = para(schema.text('Step 4: Conclude', [schema.marks.bold!.create(), schema.marks.italic!.create()]))
    expect(isStepHeading(p)).toBe(true)
  })
})
