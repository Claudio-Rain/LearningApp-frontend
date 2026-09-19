import { describe, expect, it } from 'vitest'
import type { JSONContent } from '@tiptap/vue-3'
import { applyTitleDoc, docToPlainTitle, isPlainTitleDoc, titleDoc } from './itemTitle'

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
