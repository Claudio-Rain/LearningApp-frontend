import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'fs'

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

// Parses inline **bold** and `code` into Tiptap text node arrays
function parseInline(text) {
  const nodes = []
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'bold' }] })
    } else {
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'code' }] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }]
}

function buildTiptap(bottomLine, elaboration, codeBlock) {
  const nodes = []

  nodes.push({
    type: 'paragraph',
    content: [{ type: 'text', text: bottomLine, marks: [{ type: 'bold' }] }]
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
