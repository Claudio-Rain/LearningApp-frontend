import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89311298111",
  appId: "1:89311298111:web:91475d009ad1af427a2d8a"
}

const REPHRASED_QUESTIONS = [
  ['L1', 'Compare TCP and UDP. What guarantees does TCP provide that UDP doesn\'t?'],
  ['L1', 'Explain GET, POST, PUT, PATCH, DELETE. When should each be used?'],
  ['L1', 'What is DNS and when does it occur in an HTTP request?'],
  ['L1', 'Why is serialization necessary for network data transmission?'],
  ['L1', 'Compare binary (Protobuf, MessagePack) vs. text (JSON, XML) serialization formats. What\'s the trade-off?'],
  ['L1', 'Why is GET "safe" but POST isn\'t? What are the practical consequences?'],
  ['L1', 'Where does HTTP sit in the OSI model, and which transport protocol does it use?'],
  ['L1', 'Define idempotency. Which HTTP methods are idempotent and why does it matter?'],
  ['L2', 'When a service returns 503, how do you decide: retry immediately, use exponential backoff, or surface the error?'],
  ['L2', 'How do you send a GET request with `HttpClient` in C# and read the response as a string?'],
  ['L2', 'Walk through everything from typing a URL to rendered HTML.'],
  ['L2', 'When would you return 307 Temporary Redirect vs. 301 Moved Permanently? What\'s the risk in APIs?'],
  ['L2', 'How does HTTP keep-alive work and why was it introduced?'],
  ['L2', 'What\'s the difference between 401 and 403? How should clients respond differently?'],
  ['L2', 'Where does HTTP request data live: headers vs. body? Give examples.'],
  ['L2', 'What does `HttpResponseMessage.EnsureSuccessStatusCode()` do? When would you prefer manual checking?'],
  ['L3', 'When would you choose `UdpClient` over `TcpClient`? Give a real-world case where packet loss is acceptable.'],
  ['L3', 'Using `TcpClient`, connect to a host, send a UTF-8 message, and read the response.'],
  ['L3', 'Why shouldn\'t you create a new `HttpClient` per request? What\'s the recommended pattern in ASP.NET Core?'],
  ['L3', 'How do you send a multipart/form-data request (file upload) with `HttpClient`?'],
  ['L3', 'Show how to POST JSON with `HttpClient`. What `Content-Type` is needed and how does `JsonContent` help?'],
  ['L3', 'How do you attach a `CancellationToken` to `HttpClient`? What exception fires and how do you distinguish cancellation from timeout?'],
  ['L3', 'When would you choose XML over JSON for .NET HTTP calls? What classes does .NET provide for serialization?'],
  ['L3', 'What is `ICredentials` and how does it relate to `NetworkCredential`? Show how to pass credentials to `HttpClientHandler`.'],
  ['L3', 'Distinguish `HttpClient.Timeout` from `CancellationTokenSource` timeout. Which takes precedence?'],
  ['L3', 'What\'s the difference between Basic auth (`NetworkCredential`) and Windows/NTLM auth?'],
  ['L4', 'You retry a POST without checking idempotency. What can go wrong and how do you make it safe?'],
  ['L4', 'What is "retry storm" and how does jitter in exponential backoff prevent it?'],
  ['L4', 'A developer creates `HttpClient` in every action. Works in dev, but fails in prod with `SocketException`. Why and how do you fix it?'],
  ['L4', 'A JSON payload has extra fields your model doesn\'t define. What happens with `System.Text.Json` by default? How do you control it?'],
  ['L4', 'You registered `HttpClient` as singleton but stale DNS entries appear after IP changes. Why and what\'s the fix?'],
  ['L4', 'Why do circular object references break JSON serialization? How do you handle them in `System.Text.Json`?'],
  ['L4', 'A dev disables SSL validation to fix a local issue. What are the production risks?'],
  ['L5', 'Describe the TCP three-way handshake. When does `TcpClient.ConnectAsync` return?'],
  ['L5', 'How would you implement response caching at the client level using `HttpMessageHandler`? What headers should you respect?'],
  ['L5', 'Compare `PooledConnectionIdleTimeout` vs. `PooledConnectionLifetime`. How do you tune them for high-throughput?'],
  ['L5', 'Implement a custom `DelegatingHandler` that adds a Bearer token and refreshes on 401.'],
  ['L5', 'How does `CredentialCache` differ from `NetworkCredential`? When do you need different credentials per URI?'],
  ['L5', 'How does `SocketsHttpHandler` manage connection pooling? Why is `PooledConnectionLifetime` important for DNS?'],
  ['L5', 'Explain `Socket.SetSocketOption` with `ReuseAddress` or `SO_REUSEPORT`. How do they address port exhaustion?'],
  ['L5', 'What is the `TIME_WAIT` state in TCP and why can it cause port exhaustion?'],
  ['L5', 'Explain the `HttpMessageHandler` / `DelegatingHandler` pipeline. How does a request travel through handlers?'],
  ['L6', 'Compare typed, named, and singleton `HttpClient`. When would you pick each?'],
  ['L6', 'When would you choose gRPC (HTTP/2 + Protobuf) over REST + JSON? Consider payload size, streaming, and type safety.'],
  ['L6', 'How do you call a third-party API using mutual TLS (mTLS)? How does it differ from one-way TLS?'],
  ['L6', 'A colleague suggests replacing JSON with MessagePack or Protobuf. What benchmarks would you run and what non-performance factors matter?'],
  ['L6', 'Replace synchronous HTTP calls with a message queue (RabbitMQ). What do you gain and lose?'],
  ['L6', 'For a real-time multiplayer game, compare raw UDP, WebSockets over TCP, and HTTP long-polling.'],
  ['L6', 'You need to call 10 independent endpoints safely with `HttpClient`. How do you parallelize and cap concurrency?'],
  ['L7', 'Implement an idempotency key pattern for financial POSTs to prevent double-charging on retries. What must the server store?'],
  ['L7', 'How does HTTP/2 multiplexing eliminate head-of-line blocking? Why does HTTP/3 (QUIC) still improve on this?'],
  ['L7', 'Compare `Socket` in blocking, non-blocking, and async I/O (`SocketAsyncEventArgs`) modes. When drop to `SocketAsyncEventArgs`?'],
  ['L7', 'Walk through how DNS TTL, TCP slow start, TLS handshake, and server queuing affect an HTTP request. How do keep-alive, pooling, and TLS resumption help?'],
  ['L7', 'How do you enable HTTP/2 or HTTP/3 in .NET? What server config is required?'],
  ['L7', 'What is a service mesh?'],
  ['L7', 'How can `Span<byte>` and `Memory<byte>` reduce allocations in high-throughput `Socket.ReceiveAsync`?'],
  ['L7', 'Your service mesh (Istio) handles retries. Should the app still retry? What problems arise from both layers?'],
  ['L7', 'A service receives 200k UDP packets/sec and starts dropping them. Walk through diagnostics: socket buffers (`SO_RCVBUF`) to app-level batching.'],
  ['L7', 'What is stream prioritization in HTTP/2? In what applications does it provide measurable benefit?'],
]

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const snapshot = await getDocs(collection(db, 'learning_items'))
const allItems = snapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))

console.log(`Fetched ${allItems.length} total learning items from Firestore`)

// Find the Data Sending and Retrieval collection ID
const collectionsSnapshot = await getDocs(collection(db, 'collections'))
const collections = collectionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
const targetCollection = collections.find(c => c.title === 'Data Sending and Retrieval')

if (!targetCollection) {
  console.error('❌ "Data Sending and Retrieval" collection not found')
  process.exit(1)
}

console.log(`✓ Found collection: ${targetCollection.title}`)

const collectionItems = allItems.filter(item => item.collectionId === targetCollection.id)
console.log(`Found ${collectionItems.length} items in collection\n`)

const now = new Date().toISOString()
let matched = 0
let updated = 0
const unmatched = []

for (const [level, newTitle] of REPHRASED_QUESTIONS) {
  const item = collectionItems.find(it => {
    const title = it.title
    const prefix = title.match(/^L\d/)?.[0]
    return prefix === level
  })

  if (!item) {
    unmatched.push(`[${level}] NOT FOUND`)
    continue
  }

  // Only update if the title has changed
  if (item.title !== `${level} ${newTitle}`) {
    await updateDoc(doc(db, 'learning_items', item.remoteId), {
      title: `${level} ${newTitle}`,
      lastModified: now,
    })
    updated++
  }

  matched++
  console.log(`[${level}] "${newTitle.slice(0, 50)}..."`)
}

console.log(`\nDone. ${matched} matched, ${updated} updated, ${unmatched.length} not found.`)
if (unmatched.length) {
  console.log('\nUnmatched:')
  unmatched.forEach(u => console.log(u))
}

process.exit(0)
