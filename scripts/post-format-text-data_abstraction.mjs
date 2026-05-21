import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'data_abstraction'
const ANSWER_FILE = `prompts/3_output/answers/${TOPIC_SLUG}.md`

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89331298111",
  appId: "1:89331298111:web:91475d009ad1af427a2d8a"
}

function parseAnswerFile(content) {
  const lines = content.split('\n')
  const questions = []
  let currentLevel = null
  for (const line of lines) {
    const levelMatch = line.match(/^## Level (\d+)/)
    if (levelMatch) currentLevel = `L${levelMatch[1]}`
    const qMatch = line.match(/^\*\*Q:\s*(.+?)\*\*\s*$/)
    if (qMatch && currentLevel) questions.push({ level: currentLevel, question: qMatch[1].trim() })
  }
  return questions
}

function splitSentences(text) {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/)
  return parts.map(s => s.trim()).filter(Boolean)
}

function processNodes(nodes) {
  const result = []
  for (const node of nodes) {
    if (node.type === 'paragraph' && node.content) {
      const text = node.content.map(n => n.text ?? '').join('')
      const sentences = splitSentences(text)
      if (sentences.length > 1) {
        for (const s of sentences) {
          result.push({ type: 'paragraph', content: [{ type: 'text', text: s }] })
        }
        continue
      }
    }
    result.push(node)
  }
  return result
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const mdContent = readFileSync(ANSWER_FILE, 'utf-8')
const questions = parseAnswerFile(mdContent)
console.log(`Parsed ${questions.length} questions from ${ANSWER_FILE}`)

const snapshot = await getDocs(collection(db, 'learning_items'))
const allItems = snapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))
console.log(`Fetched ${allItems.length} items from Firestore`)

let updated = 0
const notFound = []

for (const { level, question } of questions) {
  const item = allItems.find(it =>
    it.title === question ||
    it.title === `${level} ${question}`
  )

  if (!item) {
    notFound.push(`[${level}] ${question.slice(0, 80)}`)
    continue
  }

  const existingContent = item.content ?? { type: 'doc', content: [] }
  const nodes = existingContent.content ?? []
  const processedNodes = processNodes(nodes)
  const newTitle = /^L\d/.test(item.title) ? item.title : `${level} ${item.title}`

  await updateDoc(doc(db, 'learning_items', item.remoteId), {
    title: newTitle,
    content: { ...existingContent, content: processedNodes },
    lastModified: new Date().toISOString(),
  })

  console.log(`[${level}] Updated: ${question.slice(0, 70)}`)
  updated++
}

console.log(`\nDone: ${updated} updated, ${notFound.length} not found`)
notFound.forEach(q => console.log('NOT FOUND:', q))
process.exit(0)
