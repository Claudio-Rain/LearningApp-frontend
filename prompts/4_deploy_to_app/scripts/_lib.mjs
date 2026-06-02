import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89331298111",
  appId: "1:89331298111:web:91475d009ad1af427a2d8a"
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const db = getFirestore(app)

// Parses inline **bold**, `code`, and *italic* into Tiptap text node arrays
function parseInline(text) {
  const nodes = []
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'bold' }] })
    } else if (match[2] !== undefined) {
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'code' }] })
    } else {
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }]
}

// Converts a markdown table (array of raw lines) into a Tiptap table node
function parseTable(tableLines) {
  const dataLines = tableLines.filter(l => !/^\|[\s|:-]+\|$/.test(l))
  if (dataLines.length === 0) return null

  return {
    type: 'table',
    content: dataLines.map((line, rowIndex) => {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      const cellType = rowIndex === 0 ? 'tableHeader' : 'tableCell'
      return {
        type: 'tableRow',
        content: cells.map(cellText => ({
          type: cellType,
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: [{ type: 'paragraph', content: parseInline(cellText) }]
        }))
      }
    })
  }
}

// Converts rich markdown (from an answer file body) into Tiptap JSONContent
function markdownToTiptap(markdown) {
  // Strip prompt-template instruction lines that slipped into answer files
  const lines = markdown
    .split('\n')
    .filter(l => !/^\*Include .+\.\*$/.test(l.trim()))

  const nodes = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i++; continue }

    // Heading (##, ###, ####...)
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/)
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInline(headingMatch[2].trim())
      })
      i++; continue
    }

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'plaintext'
      i++
      const codeLines = []
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // consume closing ```
      nodes.push({
        type: 'codeBlock',
        attrs: { language: lang },
        content: [{ type: 'text', text: codeLines.join('\n') }]
      })
      continue
    }

    // Horizontal rule (standalone ---, not a table separator)
    if (/^---+\s*$/.test(line)) {
      nodes.push({ type: 'horizontalRule' })
      i++; continue
    }

    // Blockquote → plain paragraph (per deploy_to_app.md)
    if (line.startsWith('> ')) {
      const bqLines = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2).trim())
        i++
      }
      nodes.push({ type: 'paragraph', content: parseInline(bqLines.join(' ')) })
      continue
    }

    // Markdown table
    if (line.startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const tableNode = parseTable(tableLines)
      if (tableNode) nodes.push(tableNode)
      continue
    }

    // Bullet list
    if (/^[-*+]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^[-*+]\s+/, '')) }]
        })
        i++
      }
      nodes.push({ type: 'bulletList', content: items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^\d+\.\s+/, '')) }]
        })
        i++
      }
      nodes.push({ type: 'orderedList', content: items })
      continue
    }

    // Regular paragraph — accumulate until a block boundary
    const paraLines = []
    while (i < lines.length) {
      const l = lines[i]
      if (!l.trim()) break
      if (/^#{2,6}\s/.test(l)) break
      if (l.startsWith('```')) break
      if (/^---+\s*$/.test(l)) break
      if (l.startsWith('> ')) break
      if (l.startsWith('|')) break
      if (/^[-*+]\s+/.test(l)) break
      if (/^\d+\.\s+/.test(l)) break
      paraLines.push(l)
      i++
    }
    if (paraLines.length > 0) {
      nodes.push({ type: 'paragraph', content: parseInline(paraLines.join(' ')) })
    }
  }

  return { type: 'doc', content: nodes }
}

// Extracts the question text and Tiptap content from a single answer file
function parseAnswerFile(markdown) {
  const lines = markdown.split('\n')

  // "# L4 Question text?" or "# L2 L1 — Question text?"
  // Keep the level prefix (L1, L2…) in the title but strip duplicates and dashes
  const headingLine = lines[0] || ''
  const qMatch = headingLine.match(/^#\s+(L\d+)(?:\s+L\d+)?(?:\s+[—-])?\s+(.+)/)
  const question = qMatch ? `${qMatch[1]} ${qMatch[2].trim()}` : headingLine.replace(/^#+\s*/, '').trim()

  const content = markdownToTiptap(lines.slice(1).join('\n').trim())
  return { question, content }
}

// Inserts a topic by reading all answer .md files from a directory
export async function insertTopicFromFiles(answersDir, title) {
  const files = readdirSync(answersDir)
    .filter(f => f.endsWith('.md'))
    .sort()

  if (files.length === 0) {
    console.error(`No answer files found in ${answersDir}`)
    return
  }

  const items = []
  for (const file of files) {
    const markdown = readFileSync(join(answersDir, file), 'utf8')
    const { question, content } = parseAnswerFile(markdown)
    items.push({ question, content })
    console.log(`  Parsed: ${file}`)
  }

  const now = new Date().toISOString()
  const batch = writeBatch(db)

  const collectionRef = doc(collection(db, 'collections'))
  batch.set(collectionRef, {
    title,
    dateCreated: now,
    lastModified: now,
    numberOfItems: items.length
  })

  for (const { question, content } of items) {
    const itemRef = doc(collection(db, 'learning_items'))
    batch.set(itemRef, {
      collectionId: collectionRef.id,
      title: question,
      content,
      dateCreated: now,
      lastModified: now
    })
  }

  await batch.commit()
  console.log(`\nInserted ${items.length} items into collection '${title}' (id: ${collectionRef.id})`)
  return { title, collectionId: collectionRef.id, count: items.length }
}

function buildTiptap(bottomLine, elaboration, codeBlock) {
  const nodes = []

  // Parse inline markdown in bottomLine and wrap the result with bold
  const bottomLineContent = parseInline(bottomLine).map(node => ({
    ...node,
    marks: [...(node.marks || []), { type: 'bold' }]
  }))

  nodes.push({
    type: 'paragraph',
    content: bottomLineContent
  })

  if (elaboration) {
    nodes.push({ type: 'paragraph', content: parseInline(elaboration) })
  }

  if (codeBlock) {
    nodes.push({
      type: 'codeBlock',
      attrs: { language: 'plaintext' },
      content: [{ type: 'text', text: codeBlock }]
    })
  }

  return { type: 'doc', content: nodes }
}

function parseQAPairs(markdown) {
  const blocks = markdown.split(/\n\s*---+\s*\n/)
  const pairs = []

  for (const block of blocks) {
    // Question: **Q: ...** (may span lines in edge cases)
    const qMatch = block.match(/\*\*Q:\s*([\s\S]*?)\*\*/)
    if (!qMatch) continue

    const question = qMatch[1].trim().replace(/\s*\n\s*/g, ' ')

    // Bottom line: either "> **Bottom line:** text" or "> text"
    let blMatch = block.match(/^>\s*\*\*Bottom line:\*\*\s*(.+)/m)
    if (!blMatch) {
      blMatch = block.match(/^>\s*(.+)/m)
    }
    if (!blMatch) continue

    const bottomLine = blMatch[1].trim()

    // Code block (first one only)
    const codeMatch = block.match(/```[^\n]*\n([\s\S]*?)```/)
    const codeBlock = codeMatch ? codeMatch[1] : null

    // Elaboration: strip Q, bottom line, and code block, then find text
    let remaining = block
      .replace(qMatch[0], '')
      .replace(blMatch[0], '')
    if (codeBlock) remaining = remaining.replace(/```[\s\S]*?```/g, '')

    let elaboration = ''
    const elMatch = remaining.match(/\*\*Elaboration:\*\*\s*([\s\S]+?)(?:\n\s*\n|$)/)
    if (elMatch) {
      elaboration = elMatch[1].trim().replace(/\s*\n\s*/g, ' ')
    } else {
      // Fallback: grab non-heading, non-blockquote, non-tag lines
      const lines = remaining.split('\n').filter(l => {
        const t = l.trim()
        return t && !t.startsWith('#') && !t.startsWith('>') && !t.startsWith('**Q:') && !t.startsWith('tags:')
      })
      elaboration = lines.join(' ').trim()
    }

    pairs.push({ question, bottomLine, elaboration, codeBlock })
  }

  return pairs
}

export async function insertTopic(filePath, title) {
  const markdown = readFileSync(filePath, 'utf8')
  const pairs = parseQAPairs(markdown)

  if (pairs.length === 0) {
    console.error(`No Q&A pairs found in ${filePath}`)
    return
  }

  const now = new Date().toISOString()
  const batch = writeBatch(db)

  const collectionRef = doc(collection(db, 'collections'))
  batch.set(collectionRef, {
    title,
    dateCreated: now,
    lastModified: now,
    numberOfItems: pairs.length
  })

  for (const { question, bottomLine, elaboration, codeBlock } of pairs) {
    const itemRef = doc(collection(db, 'learning_items'))
    batch.set(itemRef, {
      collectionId: collectionRef.id,
      title: question,
      content: buildTiptap(bottomLine, elaboration, codeBlock),
      dateCreated: now,
      lastModified: now
    })
  }

  await batch.commit()
  console.log(`Inserted ${pairs.length} items into collection '${title}' (id: ${collectionRef.id})`)
  return { title, collectionId: collectionRef.id, count: pairs.length }
}
