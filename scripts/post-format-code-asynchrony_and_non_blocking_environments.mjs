import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'asynchrony_and_non_blocking_environments'
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
  if (t.includes('task.whenall') && t.includes('whenany')) return `var tasks = new[] { GetAAsync(), GetBAsync() };\nawait Task.WhenAll(tasks);\nvar first = await Task.WhenAny(tasks);`
  if (t.includes('task.whenall')) return `var t1 = FetchUsersAsync();\nvar t2 = FetchOrdersAsync();\nawait Task.WhenAll(t1, t2);\nvar users = t1.Result;\nvar orders = t2.Result;`
  if (t.includes('task.whenany')) return `var cts = new CancellationTokenSource();\nvar winner = await Task.WhenAny(SlowAsync(), FastAsync());\nvar result = await winner;`
  if (t.includes('configureawait')) return `// In library code — avoid capturing SynchronizationContext\npublic async Task<string> FetchAsync()\n{\n    var data = await _http.GetStringAsync(url).ConfigureAwait(false);\n    return data;\n}`
  if (t.includes('cancellationtoken') && t.includes('timeout')) return `var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));\ntry { await LongOperationAsync(cts.Token); }\ncatch (OperationCanceledException) { Console.WriteLine("Timed out"); }`
  if (t.includes('cancellationtoken')) return `public async Task DoWorkAsync(CancellationToken ct)\n{\n    ct.ThrowIfCancellationRequested();\n    await Task.Delay(1000, ct);\n}`
  if (t.includes('async void')) return `// Dangerous — exceptions propagate to SynchronizationContext\nasync void Button_Click(object s, EventArgs e)\n{\n    await DoWorkAsync(); // exception here crashes the app\n}\n// Prefer: async Task DoWorkAsync()`
  if (t.includes('valuetask')) return `public ValueTask<int> GetCachedAsync()\n{\n    if (_cache.TryGetValue("key", out var v))\n        return new ValueTask<int>(v); // sync, no allocation\n    return new ValueTask<int>(FetchAsync());\n}`
  if (t.includes('task.run') && t.includes('cpu')) return `// CPU-bound: offload to thread pool\nvar result = await Task.Run(() => HeavyCpuComputation(data));\n\n// I/O-bound: do NOT wrap in Task.Run\nvar json = await httpClient.GetStringAsync(url); // already async`
  if (t.includes('task.run')) return `// Offload CPU work from UI/request thread\nvar result = await Task.Run(() =>\n{\n    return ExpensiveCalculation(input);\n});`
  if (t.includes('thread pool') || t.includes('threadpool')) return `// Thread pool starvation example\nfor (int i = 0; i < 100; i++)\n    Task.Run(() => Thread.Sleep(5000)); // blocks pool threads\n// Fix: use await Task.Delay(5000) instead`
  if (t.includes('deadlock')) return `// Classic ASP.NET deadlock\npublic string Get() => GetDataAsync().Result; // blocks\nprivate async Task<string> GetDataAsync()\n    => await httpClient.GetStringAsync(url); // needs ctx\n// Fix: async all the way or ConfigureAwait(false)`
  if (t.includes('aggregateexception')) return `try { await Task.WhenAll(t1, t2, t3); }\ncatch (Exception ex)\n{\n    // unwrap AggregateException from .Wait()/.Result:\n    var all = ex is AggregateException ae ? ae.InnerExceptions : new[] { ex };\n}`
  if (t.includes('continuewith') || t.includes('continueWith')) return `var chain = Task.Run(() => Compute())\n    .ContinueWith(t => Process(t.Result),\n        TaskContinuationOptions.OnlyOnRanToCompletion);\nawait chain;`
  if (t.includes('taskcompletionsource')) return `var tcs = new TaskCompletionSource<int>();\ncallback = result => tcs.SetResult(result);\nLegacyApiWithCallback(callback);\nvar value = await tcs.Task;`
  if (t.includes('iasyncenumerable') || t.includes('async enumerable')) return `public async IAsyncEnumerable<int> StreamAsync()\n{\n    for (int i = 0; i < 10; i++)\n    {\n        await Task.Delay(100);\n        yield return i;\n    }\n}\nawait foreach (var item in StreamAsync()) { }`
  if (t.includes('channel')) return `var ch = Channel.CreateUnbounded<int>();\n// Producer\nawait ch.Writer.WriteAsync(42);\nch.Writer.Complete();\n// Consumer\nawait foreach (var item in ch.Reader.ReadAllAsync()) { }`
  if (t.includes('synchronizationcontext')) return `// UI SynchronizationContext posts continuations to UI thread\nawait LongOpAsync(); // resumes on UI thread by default\nawait LongOpAsync().ConfigureAwait(false); // resumes on any thread`
  if (t.includes('state machine') || t.includes('compiler generate')) return `// Compiler rewrites async method into a state machine struct:\n// MoveNext() called by awaiter on each resume\n// Equivalent rough manual form:\nclass GetDataStateMachine : IAsyncStateMachine {\n    public void MoveNext() { /* each await becomes a case */ }\n}`
  if (t.includes('parallel.foreach')) return `// CPU-bound parallel work\nParallel.ForEach(largeList, item => Process(item));\n\n// vs async concurrent I/O\nawait Task.WhenAll(largeList.Select(item => FetchAsync(item)));`
  if (t.includes('task.delay') || t.includes('thread.sleep')) return `// Non-blocking delay (releases thread)\nawait Task.Delay(2000);\n\n// Blocking delay (holds thread)\nThread.Sleep(2000); // never use in async methods`
  if (t.includes('getdataasync') || t.includes('fetch')) return `public async Task<string> GetDataAsync()\n{\n    using var client = new HttpClient();\n    return await client.GetStringAsync("https://api.example.com/data");\n}`
  if (t.includes('result') && t.includes('.result')) return `// Risky — can deadlock\nstring data = GetAsync().Result;\n\n// Safe\nstring data = await GetAsync();`
  if (t.includes('fire-and-forget') || t.includes('fire and forget')) return `// With safeguard\n_ = Task.Run(async () =>\n{\n    try { await BackgroundWorkAsync(); }\n    catch (Exception ex) { logger.LogError(ex, "BG task failed"); }\n});`
  if (t.includes('retry')) return `async Task<T> RetryAsync<T>(Func<Task<T>> op, int times)\n{\n    for (int i = 0; i < times; i++)\n    try { return await op(); }\n    catch when (i < times - 1)\n    { await Task.Delay(100 * (1 << i)); }\n    return await op();\n}`
  if (t.includes('backpressure')) return `var options = new BoundedChannelOptions(100)\n    { FullMode = BoundedChannelFullMode.Wait };\nvar ch = Channel.CreateBounded<Work>(options);\n// Writer waits when buffer is full — natural backpressure`
  // default
  return `// Basic async/await pattern\npublic async Task<string> FetchAsync(string url)\n{\n    using var client = new HttpClient();\n    return await client.GetStringAsync(url);\n}`
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

  if (nodes.some(n => n.type === 'codeBlock')) {
    skippedHasCode++
    continue
  }

  const code = getCodeExample(question)
  const codeNode = { type: 'codeBlock', attrs: { language: LANG }, content: [{ type: 'text', text: code }] }

  // Insert before first blockquote (ratings), after last paragraph
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
