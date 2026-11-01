import { describe, expect, it } from 'vitest'
import { classifyLine, parseFullText, parseItemBlocks } from '@/views/bulkInsert/parse'

describe('parseItemBlocks', () => {
  it('splits on blank lines and joins multi-line answers', () => {
    const items = parseItemBlocks('question: Q1\nanswer: A1\nmore\n\nQUESTION: Q2\nAnswer: A2', true)
    expect(items).toEqual([
      { question: 'Q1', answer: 'A1 more', valid: true },
      { question: 'Q2', answer: 'A2', valid: true }
    ])
  })

  it('needs an answer only when one is required', () => {
    expect(parseItemBlocks('question: Q', true)[0]!.valid).toBe(false)
    expect(parseItemBlocks('question: Q', false)[0]!.valid).toBe(true)
    expect(parseItemBlocks('answer: A', false)[0]!.valid).toBe(false)
  })

  it('returns nothing for blank input', () => {
    expect(parseItemBlocks('  \n ', true)).toEqual([])
  })
})

describe('classifyLine', () => {
  it.each([
    ['', 'skip'],
    ['---- JUNIOR ----', 'skip'],
    ['# Frontend', 'category'],
    ['- Routing', 'collection'],
    ['question: Q', 'question'],
    ['answer: A', 'answer'],
    ['plain text', 'continuation']
  ])('%s is %s', (line, kind) => {
    expect(classifyLine(line).kind).toBe(kind)
  })

  it('treats a bare # as clearing the category', () => {
    expect(classifyLine('#')).toEqual({ kind: 'category', title: null })
  })
})

describe('parseFullText', () => {
  const text = [
    'question: orphan',
    '# Frontend',
    '- Styling',
    'question: Q1',
    'answer: A1',
    'continued',
    '#',
    '- routing',
    'question: Q2'
  ].join('\n')

  it('groups items under collections with the category in effect', () => {
    const cols = parseFullText(text, new Set(['routing']), true)
    expect(cols.map(c => [c.title, c.isNew, c.categoryTitle])).toEqual([
      ['Styling', true, 'Frontend'],
      ['routing', false, null]
    ])
    expect(cols[0]!.items).toEqual([{ question: 'Q1', answer: 'A1 continued', valid: true }])
    expect(cols[1]!.items[0]!.valid).toBe(false)
  })

  it('accepts questions alone when answers are not required', () => {
    const cols = parseFullText(text, new Set(), false)
    expect(cols[1]!.items[0]!.valid).toBe(true)
  })
})
