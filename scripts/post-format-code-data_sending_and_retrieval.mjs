import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'data_sending_and_retrieval'
const ANSWER_FILE = `prompts/3_output/answers/${TOPIC_SLUG}.md`
const LANG = 'csharp'

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

function getCodeExample(q) {
  const t = q.toLowerCase()
  if (t.includes('get request') || (t.includes('httpclient') && t.includes('get'))) return `using var client = new HttpClient();\nvar response = await client.GetAsync("https://api.example.com/users");\nresponse.EnsureSuccessStatusCode();\nvar json = await response.Content.ReadAsStringAsync();\nvar users = JsonSerializer.Deserialize<List<User>>(json);`
  if (t.includes('post') && t.includes('json')) return `var payload = new { Name = "Alice", Age = 30 };\nvar json = JsonSerializer.Serialize(payload);\nvar content = new StringContent(json, Encoding.UTF8, "application/json");\nvar response = await client.PostAsync("/api/users", content);\nresponse.EnsureSuccessStatusCode();`
  if (t.includes('multipart') || t.includes('file upload')) return `using var form = new MultipartFormDataContent();\nform.Add(new StringContent("Alice"), "name");\nvar fileBytes = await File.ReadAllBytesAsync("photo.jpg");\nform.Add(new ByteArrayContent(fileBytes), "photo", "photo.jpg");\nvar resp = await client.PostAsync("/upload", form);\nresp.EnsureSuccessStatusCode();`
  if (t.includes('ihttpclientfactory') || t.includes('httpclientfactory')) return `// Registration\nbuilder.Services.AddHttpClient<IUserService, UserService>(c =>\n    c.BaseAddress = new Uri("https://api.example.com/"));\n\n// Usage\nclass UserService(HttpClient client) : IUserService\n{\n    public async Task<User> GetAsync(int id)\n        => await client.GetFromJsonAsync<User>($"users/{id}");\n}`
  if (t.includes('delegatinghandler') || t.includes('pipeline') && t.includes('handler')) return `class AuthHandler : DelegatingHandler\n{\n    protected override async Task<HttpResponseMessage> SendAsync(\n        HttpRequestMessage req, CancellationToken ct)\n    {\n        req.Headers.Authorization =\n            new AuthenticationHeaderValue("Bearer", _token);\n        return await base.SendAsync(req, ct);\n    }\n}`
  if (t.includes('cancellation') || t.includes('cancellationtoken')) return `var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));\ntry\n{\n    var resp = await client.GetAsync("/api/data", cts.Token);\n    var data = await resp.Content.ReadAsStringAsync(cts.Token);\n}\ncatch (OperationCanceledException) { /* timeout or cancelled */ }`
  if (t.includes('retry') && t.includes('jitter')) return `// Polly retry with jitter\nvar retry = new ResiliencePipelineBuilder<HttpResponseMessage>()\n    .AddRetry(new RetryStrategyOptions<HttpResponseMessage>\n    {\n        MaxRetryAttempts = 3,\n        BackoffType = DelayBackoffType.Exponential,\n        UseJitter = true,\n    }).Build();`
  if (t.includes('tcpclient') || t.includes('tcp')) return `using var client = new TcpClient();\nawait client.ConnectAsync("example.com", 80);\nvar stream = client.GetStream();\nvar msg = Encoding.UTF8.GetBytes("Hello\\n");\nawait stream.WriteAsync(msg);\nvar buf = new byte[1024];\nint n = await stream.ReadAsync(buf);\nConsole.WriteLine(Encoding.UTF8.GetString(buf, 0, n));`
  if (t.includes('udpclient') || t.includes('udp')) return `using var udp = new UdpClient();\nudp.Connect("server.example.com", 9000);\nvar msg = Encoding.UTF8.GetBytes("ping");\nawait udp.SendAsync(msg);\nvar result = await udp.ReceiveAsync();\nConsole.WriteLine(Encoding.UTF8.GetString(result.Buffer));`
  if (t.includes('socketshttphandler') || t.includes('connection pool')) return `var handler = new SocketsHttpHandler\n{\n    PooledConnectionLifetime = TimeSpan.FromMinutes(15),\n    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),\n    MaxConnectionsPerServer = 10,\n};\nvar client = new HttpClient(handler);`
  if (t.includes('grpc') || t.includes('protobuf')) return `// gRPC client (auto-generated stub)\nvar channel = GrpcChannel.ForAddress("https://api:5001");\nvar client = new Greeter.GreeterClient(channel);\nvar reply = await client.SayHelloAsync(\n    new HelloRequest { Name = "Alice" });\nConsole.WriteLine(reply.Message);`
  if (t.includes('http/2') || t.includes('http2') || t.includes('multiplexing')) return `var handler = new SocketsHttpHandler();\nvar client = new HttpClient(handler)\n{\n    DefaultRequestVersion = HttpVersion.Version20,\n    DefaultVersionPolicy = HttpVersionPolicy.RequestVersionExact,\n};\n// HTTP/2 multiplexes requests on one TCP connection`
  if (t.includes('ensuressuccess') || t.includes('ensuresuccessstatuscode')) return `var response = await client.GetAsync(url);\n// Throws HttpRequestException on 4xx/5xx\nresponse.EnsureSuccessStatusCode();\n\n// Or check manually for richer error handling:\nif (!response.IsSuccessStatusCode)\n    throw new ApiException(response.StatusCode,\n        await response.Content.ReadAsStringAsync());`
  if (t.includes('ssl') || t.includes('certificate') || t.includes('mtls')) return `// mTLS client certificate\nvar cert = X509Certificate2.CreateFromPemFile("client.crt", "client.key");\nvar handler = new HttpClientHandler();\nhandler.ClientCertificates.Add(cert);\nvar client = new HttpClient(handler);`
  if (t.includes('span') || t.includes('memory<byte>')) return `// Zero-copy socket read into span\nvar socket = new Socket(SocketType.Stream, ProtocolType.Tcp);\nawait socket.ConnectAsync("server", 8080);\nvar buffer = new byte[4096].AsMemory();\nint received = await socket.ReceiveAsync(buffer, SocketFlags.None);\nvar data = buffer.Slice(0, received).Span;`
  // default
  return `// Typed HttpClient with IHttpClientFactory\nclass ApiClient(HttpClient http)\n{\n    public async Task<T> GetAsync<T>(string path)\n    {\n        var r = await http.GetAsync(path);\n        r.EnsureSuccessStatusCode();\n        return await r.Content.ReadFromJsonAsync<T>();\n    }\n}`
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const mdContent = readFileSync(ANSWER_FILE, 'utf-8')
const questions = parseAnswerFile(mdContent)
console.log(`Parsed ${questions.length} questions from ${ANSWER_FILE}`)

const snapshot = await getDocs(collection(db, 'learning_items'))
const allItems = snapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))
console.log(`Fetched ${allItems.length} items from Firestore`)

let inserted = 0, skippedHasCode = 0, notFound = 0

for (const { level, question } of questions) {
  const item = allItems.find(it =>
    it.title === question ||
    it.title === `${level} ${question}`
  )

  if (!item) { notFound++; console.log(`NOT FOUND: ${question.slice(0, 70)}`); continue }

  const existingContent = item.content ?? { type: 'doc', content: [] }
  const nodes = existingContent.content ?? []

  if (nodes.some(n => n.type === 'codeBlock')) { skippedHasCode++; continue }

  const code = getCodeExample(question)
  const codeNode = { type: 'codeBlock', attrs: { language: LANG }, content: [{ type: 'text', text: code }] }

  const blockquoteIdx = nodes.findIndex(n => n.type === 'blockquote')
  const insertIdx = blockquoteIdx >= 0 ? blockquoteIdx : nodes.length
  const newNodes = [...nodes.slice(0, insertIdx), codeNode, ...nodes.slice(insertIdx)]

  await updateDoc(doc(db, 'learning_items', item.remoteId), {
    content: { ...existingContent, content: newNodes },
    lastModified: new Date().toISOString(),
  })

  console.log(`[${level}] Inserted code: ${question.slice(0, 70)}`)
  inserted++
}

console.log(`\nDone: ${inserted} inserted, ${skippedHasCode} skipped (had code), ${notFound} not found`)
process.exit(0)
