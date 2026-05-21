import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89331298111",
  appId: "1:89331298111:web:91475d009ad1af427a2d8a"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const snapshot = await getDocs(collection(db, 'learning_items'))
const allItems = snapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))

let withCode = 0, withoutCode = 0
for (const item of allItems) {
  const nodes = item.content?.content ?? []
  const hasCode = nodes.some(n => n.type === 'codeBlock')
  if (hasCode) withCode++; else withoutCode++
}

console.log(`Total: ${allItems.length}`)
console.log(`With codeBlock: ${withCode}`)
console.log(`Without codeBlock: ${withoutCode}`)
process.exit(0)
