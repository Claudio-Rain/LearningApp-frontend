import { describe, expect, it } from 'vitest'
import type { JSONContent } from '@tiptap/vue-3'
import {
  applyTitleDoc,
  docToPlainTitle,
  isPlainTitleDoc,
  titleDoc,
  titleDocFromMarkdown,
  titleFieldsFromMarkdown,
  titlePreviewFromMarkdown,
} from '@/utils/itemTitle'

const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content })
const para = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
})
const codeBlock = (text: string): JSONContent => ({
  type: 'codeBlock',
  content: [{ type: 'text', text }],
})

const item = (over: Partial<{ title: string; titleContent: JSONContent }> = {}) => ({
  title: 'What is a closure?',
  ...over,
})

describe('titleDoc', () => {
  it('wraps a plain title as one paragraph', () => {
    expect(titleDoc(item())).toEqual(doc(para('What is a closure?')))
  })

  it('prefers the rich title when there is one', () => {
    const rich = doc(para('What does this print?'), codeBlock('console.log(1)'))
    expect(titleDoc(item({ titleContent: rich }))).toBe(rich)
  })

  it('makes an empty document for an empty title', () => {
    expect(titleDoc(item({ title: '' }))).toEqual(doc())
  })
})

describe('docToPlainTitle', () => {
  it('collapses block structure to one line', () => {
    const rich = doc(para('What does this print?'), codeBlock('a = 1\nprint(a)'))
    expect(docToPlainTitle(rich)).toBe('What does this print? a = 1 print(a)')
  })

  it('is empty for a document with no text', () => {
    expect(docToPlainTitle(doc())).toBe('')
    expect(docToPlainTitle(doc({ type: 'paragraph' }))).toBe('')
  })
})

describe('isPlainTitleDoc', () => {
  it('accepts nothing a string would lose', () => {
    expect(isPlainTitleDoc(doc())).toBe(true)
    expect(isPlainTitleDoc(doc(para('What is a closure?')))).toBe(true)
  })

  it('rejects marks, extra blocks and non-text nodes', () => {
    expect(isPlainTitleDoc(doc(codeBlock('let x = 1')))).toBe(false)
    expect(isPlainTitleDoc(doc(para('one'), para('two')))).toBe(false)
    expect(
      isPlainTitleDoc(doc({
        type: 'paragraph',
        content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }],
      }))
    ).toBe(false)
    expect(
      isPlainTitleDoc(doc({
        type: 'paragraph',
        content: [{ type: 'image', attrs: { src: 'x.png' } }],
      }))
    ).toBe(false)
  })
})

describe('applyTitleDoc', () => {
  it('stores a rich title alongside its flattened text', () => {
    const rich = doc(para('What does this print?'), codeBlock('print(1)'))
    const next = applyTitleDoc(item(), rich)

    expect(next.title).toBe('What does this print? print(1)')
    expect(next.titleContent).toBe(rich)
  })

  it('drops the key entirely when the title goes back to plain text', () => {
    const was = applyTitleDoc(item(), doc(para('a'), codeBlock('b')))
    const next = applyTitleDoc(was, doc(para('just text now')))

    expect(next.title).toBe('just text now')
    // Not merely undefined: an undefined value would reach Firestore, which
    // rejects it, and the field has to actually go away on the remote copy.
    expect('titleContent' in next).toBe(false)
  })

  it('leaves other fields alone', () => {
    const next = applyTitleDoc({ ...item(), priority: 3 }, doc(para('x')))
    expect(next.priority).toBe(3)
  })
})

describe('titleDocFromMarkdown', () => {
  it('keeps a fenced code block, with its language', () => {
    const doc = titleDocFromMarkdown('What does this print?\n\n```python\nprint(1)\n```')

    expect(doc.content).toHaveLength(2)
    expect(doc.content![0]!.type).toBe('paragraph')
    expect(doc.content![1]).toEqual({
      type: 'codeBlock',
      attrs: { language: 'python' },
      content: [{ type: 'text', text: 'print(1)' }],
    })
  })

  it('keeps inline code as a mark', () => {
    const doc = titleDocFromMarkdown('What does `useRef` return?')
    const marked = doc.content![0]!.content!.find(n => n.text === 'useRef')

    expect(marked!.marks).toEqual([{ type: 'code' }])
  })

  it('flattens blocks the title editor cannot edit', () => {
    // A heading, a list and a table all keep their words and lose their shape —
    // a title must never hold a node with no button to remove it.
    for (const markdown of ['# A heading', '- one\n- two', '| a | b |\n| - | - |\n| 1 | 2 |']) {
      const doc = titleDocFromMarkdown(markdown)
      expect(doc.content!.every(block => block.type === 'paragraph')).toBe(true)
      expect(docToPlainTitle(doc)).not.toBe('')
    }
  })

  it('is empty for empty markdown', () => {
    expect(titleDocFromMarkdown('')).toEqual({ type: 'doc', content: [] })
  })
})

describe('titleFieldsFromMarkdown', () => {
  it('leaves prose as a plain title', () => {
    const fields = titleFieldsFromMarkdown('What is a closure?')

    expect(fields.title).toBe('What is a closure?')
    expect('titleContent' in fields).toBe(false)
  })

  it('stores a rich title when the markdown has code', () => {
    const fields = titleFieldsFromMarkdown('What does this print?\n\n```js\nconsole.log(1)\n```')

    expect(fields.title).toBe('What does this print? console.log(1)')
    expect(fields.titleContent).toBeDefined()
  })
})

describe('titlePreviewFromMarkdown', () => {
  it('shows one clean line instead of raw markdown', () => {
    expect(titlePreviewFromMarkdown('What does `x = 1` do?')).toBe('What does x = 1 do?')
    expect(titlePreviewFromMarkdown('Print it:\n\n```\nprint(1)\nprint(2)\n```'))
      .toBe('Print it: print(1) print(2)')
  })
})
