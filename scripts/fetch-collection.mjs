import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89311298111",
  appId: "1:89311298111:web:91475d009ad1af427a2d8a"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Fetch all items to find collection IDs
const itemsSnapshot = await getDocs(collection(db, 'learning_items'))
const allItems = itemsSnapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))

// Group by collectionId and find which one matches "Data Sending and Retrieval"
const collectionMap = new Map()
allItems.forEach(item => {
  if (!collectionMap.has(item.collectionId)) {
    collectionMap.set(item.collectionId, [])
  }
  collectionMap.get(item.collectionId).push(item)
})

console.log('Available collectionIds:')
const collectionIds = Array.from(collectionMap.keys())
collectionIds.forEach(id => {
  const sample = collectionMap.get(id)[0]
  console.log(` - ${id} (${collectionMap.get(id).length} items, sample: "${sample.title}")`)
})

// Try different collection paths
let targetCollection = null
const paths = ['learning_collections', 'collections', 'topics']

for (const path of paths) {
  try {
    const snap = await getDocs(collection(db, path))
    const collections = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    console.log(`\nFound ${path}:`)
    collections.forEach(c => console.log(` - ${c.title || c.name || 'Unknown'} (ID: ${c.id})`))
    targetCollection = collections.find(c => (c.title || c.name)?.toLowerCase().includes('data sending'))
    if (targetCollection) break
  } catch {
    console.log(`✗ ${path} not found`)
  }
}

// If still not found, try matching by first item's pattern
if (!targetCollection) {
  console.log('\n⚠️  Checking if any collectionId has items starting with "L1 What is..."')
  for (const [id, items] of collectionMap) {
    const match = items.find(i => i.title.startsWith('L1') || i.title.startsWith('L2'))
    if (match) {
      console.log(`  - ${id}: "${match.title.substring(0, 60)}"`)
    }
  }
  console.log('\n⚠️  "Data Sending and Retrieval" collection not found in available data.')
  console.log('Please specify which collectionId corresponds to "Data Sending and Retrieval":')
  process.exit(1)
}

console.log(`\n✓ Found collection: ${targetCollection.title} (ID: ${targetCollection.id})`)

// Filter items from this collection
const items = allItems
  .filter(item => item.collectionId === targetCollection.id)
  .sort((a, b) => {
    const levelA = a.title.match(/^L\d/)?.[0] || ''
    const levelB = b.title.match(/^L\d/)?.[0] || ''
    return levelA.localeCompare(levelB)
  })

console.log(`\nFetched ${items.length} items:\n`)
items.forEach((item, idx) => {
  const level = item.title.match(/^L\d/)?.[0] || 'Unknown'
  const titleWithoutLevel = item.title.replace(/^L\d[\s—-]+/, '')
  console.log(`${idx + 1}. [${level}] ${titleWithoutLevel}`)
})

