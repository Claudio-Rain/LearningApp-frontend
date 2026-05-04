import type { JSONContent } from '@tiptap/vue-3'

function parseTextMarks(element: Element): JSONContent['marks'] {
  const marks: JSONContent['marks'] = []
  let current = element

  while (current && current !== document.body) {
    const tagName = current.tagName?.toLowerCase()

    switch (tagName) {
      case 'strong':
      case 'b':
        marks.push({ type: 'bold' })
        break
      case 'em':
      case 'i':
        marks.push({ type: 'italic' })
        break
      case 'u':
        marks.push({ type: 'underline' })
        break
      case 'mark':
      case 'span':
        if ((current as HTMLElement).style.backgroundColor || (current as HTMLElement).className?.includes('highlight')) {
          marks.push({ type: 'highlight' })
        }
        break
      case 'code':
        marks.push({ type: 'code' })
        break
      case 'a':
        const href = (current as HTMLAnchorElement).href
        if (href) {
          marks.push({ type: 'link', attrs: { href } })
        }
        break
    }

    current = current.parentElement as Element
  }

  return marks.length > 0 ? marks : undefined
}

function parseNodeFromHtml(html: string): JSONContent[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const nodes: JSONContent[] = []

  for (const child of doc.body.children) {
    const node = parseElement(child as HTMLElement)
    if (node) {
      if (Array.isArray(node)) {
        nodes.push(...node)
      } else {
        nodes.push(node)
      }
    }
  }

  return nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [{ type: 'text', text: html }] }]
}

function parseElement(element: HTMLElement): JSONContent | JSONContent[] | null {
  const tagName = element.tagName?.toLowerCase()

  if (!element.children.length && !element.textContent?.trim()) {
    return null
  }

  switch (tagName) {
    case 'p':
    case 'div':
      return parseParagraph(element)

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return parseHeading(element, tagName)

    case 'pre':
    case 'code':
      return parseCodeBlock(element)

    case 'table':
      return parseTable(element)

    case 'ul':
    case 'ol':
      return parseList(element, tagName === 'ol')

    case 'blockquote':
      return parseBlockquote(element)

    case 'hr':
      return { type: 'horizontalRule' }

    case 'br':
      return { type: 'paragraph' }

    case 'span':
    case 'strong':
    case 'em':
    case 'b':
    case 'i':
    case 'u':
    case 'mark':
      return parseParagraph(element)

    default:
      // For unknown elements, try to extract content
      const content = parseContent(element)
      if (content && content.length > 0) {
        return { type: 'paragraph', content }
      }
      return null
  }
}

function parseParagraph(element: HTMLElement): JSONContent {
  const content = parseContent(element)
  return { type: 'paragraph', content }
}

function parseHeading(element: HTMLElement, tag: string | undefined): JSONContent {
  const level = (parseInt(tag?.[1] || '1')) as 1 | 2 | 3 | 4 | 5 | 6
  const content = parseContent(element)
  return { type: 'heading', attrs: { level }, content }
}

function parseCodeBlock(element: HTMLElement): JSONContent {
  const code = element.textContent || ''
  const language = (element as HTMLElement).className?.match(/language-(\w+)/)?.[1] || 'plaintext'

  return {
    type: 'codeBlock',
    attrs: { language },
    content: [{ type: 'text', text: code }]
  }
}

function parseTable(element: HTMLElement): JSONContent {
  const rows: JSONContent[] = []
  const table = element as unknown as HTMLTableElement

  for (const row of table.rows) {
    const cells: JSONContent[] = []

    for (const cell of row.cells) {
      const isHeader = row === table.rows[0] || cell.tagName === 'TH'
      const cellType = isHeader ? 'tableHeader' : 'tableCell'

      cells.push({
        type: cellType,
        attrs: {
          colspan: cell.colSpan,
          rowspan: cell.rowSpan,
          colwidth: null
        },
        content: [{ type: 'paragraph', content: parseContent(cell as HTMLElement) }]
      })
    }

    rows.push({
      type: 'tableRow',
      content: cells
    })
  }

  return {
    type: 'table',
    content: rows
  }
}

function parseList(element: HTMLElement, ordered: boolean): JSONContent {
  const items: JSONContent[] = []

  for (const li of element.querySelectorAll(':scope > li')) {
    items.push({
      type: 'listItem',
      content: [{ type: 'paragraph', content: parseContent(li as HTMLElement) }]
    })
  }

  return {
    type: ordered ? 'orderedList' : 'bulletList',
    content: items
  }
}

function parseBlockquote(element: HTMLElement): JSONContent {
  const content = parseContent(element)
  return { type: 'blockquote', content }
}

function parseContent(element: HTMLElement): JSONContent[] {
  const content: JSONContent[] = []

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        content.push({ type: 'text', text })
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement

      if (!el.children.length && el.textContent?.trim()) {
        const marks = parseTextMarks(el)
        const text = el.textContent.trim()
        if (text) {
          content.push({ type: 'text', text, marks })
        }
      } else {
        const parsed = parseElement(el)
        if (parsed && Array.isArray(parsed)) {
          content.push(...parsed)
        } else if (parsed) {
          content.push(parsed)
        }
      }
    }
  }

  return content
}

export function htmlToTiptap(html: string): JSONContent {
  const nodes = parseNodeFromHtml(html)

  return {
    type: 'doc',
    content: nodes
  }
}

export function stripHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}
