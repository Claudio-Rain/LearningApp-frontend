import type { JSONContent } from '@tiptap/vue-3'
import { htmlToTiptap, stripHtml } from '@/utils/htmlToTiptap'

// Parsers for the HTML bulk insert. Both need a DOM (DOMParser), so they run in
// the browser only.

export interface HtmlItem {
  title: string
  content: JSONContent
  preview: string
  valid: boolean
}

const PREVIEW_LENGTH = 100

/** Convert one item's HTML, marking it invalid (with `errorPreview`) if conversion throws. */
const toItem = (title: string, html: string, errorPreview: string): HtmlItem => {
  try {
    return { title, content: htmlToTiptap(html), preview: stripHtml(html).substring(0, PREVIEW_LENGTH), valid: true }
  } catch {
    return { title, content: { type: 'doc', content: [] }, preview: errorPreview, valid: false }
  }
}

/** One item per line: the title, a tab, then the item's HTML. Incomplete lines are skipped. */
export const parseTsv = (text: string): HtmlItem[] =>
  text
    .split('\n')
    .filter(line => line.trim())
    .flatMap(line => {
      const [title, html] = line.split('\t')
      if (!title?.trim() || !html?.trim()) return []
      return [toItem(title.trim(), html, 'Error parsing HTML')]
    })

/**
 * Pasted HTML, split into one item per heading: each h1–h6 titles the content
 * below it. Content before the first heading becomes "Item 1".
 */
export const parseHtmlSections = (text: string): HtmlItem[] => {
  let body: HTMLElement
  try {
    body = new DOMParser().parseFromString(text, 'text/html').body
  } catch {
    return []
  }

  const sections: HtmlItem[] = []
  let title = 'Item 1'
  let content: Element[] = []

  const flush = () => {
    if (content.length === 0) return
    const div = document.createElement('div')
    content.forEach(el => div.appendChild(el.cloneNode(true)))
    sections.push(toItem(title, div.innerHTML, 'Error parsing'))
  }

  for (const element of body.children) {
    if (/^h[1-6]$/.test(element.tagName.toLowerCase())) {
      flush()
      title = element.textContent || `Item ${sections.length + 1}`
      content = []
    } else {
      content.push(element)
    }
  }
  flush()

  return sections
}
