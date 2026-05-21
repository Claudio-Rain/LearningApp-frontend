import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'framework_http_clients'
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
  if (t.includes('middleware') && t.includes('app.use') && t.includes('app.run')) return `// app.Use: calls next\napp.Use(async (ctx, next) =>\n{\n    Console.WriteLine("Before");\n    await next();\n    Console.WriteLine("After");\n});\n\n// app.Run: terminal — never calls next\napp.Run(async ctx =>\n    await ctx.Response.WriteAsync("Final"));`
  if (t.includes('imiddleware') && t.includes('factory')) return `// IMiddleware (factory-based, supports DI)\npublic class LoggingMiddleware(ILogger<LoggingMiddleware> logger)\n    : IMiddleware\n{\n    public async Task InvokeAsync(HttpContext ctx, RequestDelegate next)\n    {\n        logger.LogInformation("Request: {Path}", ctx.Request.Path);\n        await next(ctx);\n    }\n}\n// Register:\nbuilder.Services.AddTransient<LoggingMiddleware>();\napp.UseMiddleware<LoggingMiddleware>();`
  if (t.includes('correlation') || t.includes('x-correlation')) return `// Add correlation ID to outgoing requests\nclass CorrelationHandler : DelegatingHandler\n{\n    protected override Task<HttpResponseMessage> SendAsync(\n        HttpRequestMessage req, CancellationToken ct)\n    {\n        req.Headers.TryAddWithoutValidation(\n            "X-Correlation-Id", Guid.NewGuid().ToString());\n        return base.SendAsync(req, ct);\n    }\n}`
  if (t.includes('content negotiation') || t.includes('accept header') || t.includes('formatter')) return `// Server: content negotiation selects formatter\n// Request: Accept: application/xml\n// → MVC picks XmlSerializer formatter\n\n// Register XML support:\nbuilder.Services.AddControllers()\n    .AddXmlSerializerFormatters();\n\n// Force JSON regardless of Accept:\noptions.RespectBrowserAcceptHeader = false;`
  if (t.includes('iformfile') || t.includes('file upload')) return `[HttpPost("upload")]\npublic async Task<IActionResult> Upload(IFormFile file)\n{\n    if (file.Length == 0) return BadRequest();\n    var path = Path.Combine("uploads", file.FileName);\n    await using var stream = System.IO.File.Create(path);\n    await file.CopyToAsync(stream);\n    return Ok(new { file.FileName, file.Length });\n}`
  if (t.includes('request body') && (t.includes('read') || t.includes('enable') || t.includes('buffer'))) return `// EnableBuffering allows reading body multiple times\napp.Use(async (ctx, next) =>\n{\n    ctx.Request.EnableBuffering();\n    var body = await new StreamReader(ctx.Request.Body).ReadToEndAsync();\n    ctx.Request.Body.Position = 0; // rewind for next middleware\n    await next();\n});`
  if (t.includes('httpcontext') && t.includes('background')) return `// WRONG: HttpContext captured in background Task\nasync Task Wrong(HttpContext ctx)\n{\n    _ = Task.Run(() => Log(ctx.Request.Path)); // ctx may be disposed!\n}\n\n// RIGHT: extract needed data before Task.Run\nasync Task Right(HttpContext ctx)\n{\n    var path = ctx.Request.Path.Value;\n    _ = Task.Run(() => Log(path));\n}`
  if (t.includes('ifeaturecollection') || t.includes('feature collection')) return `// Read a feature from HttpContext\nvar tlsFeature = ctx.Features.Get<ITlsConnectionFeature>();\nif (tlsFeature != null)\n{\n    var cert = await tlsFeature.GetClientCertificateAsync(ctx.RequestAborted);\n}\n\n// Swap a feature\nctx.Features.Set<IHttpResponseBodyFeature>(new CustomBodyFeature());`
  if (t.includes('server header') || t.includes('remove header')) return `// Remove Server header globally\napp.Use(async (ctx, next) =>\n{\n    ctx.Response.Headers.Remove("Server");\n    ctx.Response.Headers.Remove("X-Powered-By");\n    await next();\n});\n// Or via Kestrel:\nwebBuilder.ConfigureKestrel(opts =>\n    opts.AddServerHeader = false);`
  if (t.includes('consumes') || t.includes('produces')) return `[HttpPost]\n[Consumes("application/json")]\n[Produces("application/json")]\npublic IActionResult Create([FromBody] OrderDto dto)\n{\n    // 415 Unsupported Media Type if Content-Type != application/json\n    // 406 Not Acceptable if Accept != application/json\n    return Ok(new { dto.Id, Created = DateTime.UtcNow });\n}`
  if (t.includes('outputformatter') || t.includes('output formatter')) return `// Custom MessagePack output formatter\npublic class MsgPackFormatter : OutputFormatter\n{\n    public MsgPackFormatter()\n        => SupportedMediaTypes.Add("application/x-msgpack");\n\n    public override async Task WriteResponseBodyAsync(\n        OutputFormatterWriteContext ctx)\n    {\n        var bytes = MessagePackSerializer.Serialize(ctx.Object);\n        await ctx.HttpContext.Response.Body.WriteAsync(bytes);\n    }\n}`
  if (t.includes('iactionfilter') || t.includes('action filter')) return `// Validation filter — runs before action\npublic class ValidateModelFilter : IActionFilter\n{\n    public void OnActionExecuting(ActionExecutingContext ctx)\n    {\n        if (!ctx.ModelState.IsValid)\n            ctx.Result = new UnprocessableEntityObjectResult(ctx.ModelState);\n    }\n    public void OnActionExecuted(ActionExecutedContext ctx) { }\n}`
  if (t.includes('hmac') || t.includes('signature') || t.includes('webhook')) return `// Verify HMAC-SHA256 webhook signature\nbool VerifySignature(byte[] body, string header, string secret)\n{\n    var key = Encoding.UTF8.GetBytes(secret);\n    using var hmac = new HMACSHA256(key);\n    var expected = Convert.ToHexString(hmac.ComputeHash(body));\n    var received = header.Replace("sha256=", "");\n    return CryptographicOperations.FixedTimeEquals(\n        Convert.FromHexString(expected),\n        Convert.FromHexString(received));\n}`
  if (t.includes('requestdelegate') || t.includes('pipeline compile') || t.includes('use middleware')) return `// Middleware pipeline compiles to a RequestDelegate chain\n// Internally: next = app.Run(finalHandler)\n// next = Use(middleware2, next)\n// next = Use(middleware1, next)\n// _pipeline = next;\n\n// Each middleware wraps the next as a closure:\nRequestDelegate pipeline = ctx => Task.CompletedTask;\npipeline = ctx => middleware.InvokeAsync(ctx, pipeline);`
  // default
  return `// Custom middleware skeleton\npublic class TimingMiddleware(RequestDelegate next)\n{\n    public async Task InvokeAsync(HttpContext ctx)\n    {\n        var sw = Stopwatch.StartNew();\n        await next(ctx);\n        sw.Stop();\n        ctx.Response.Headers["X-Elapsed-Ms"] =\n            sw.ElapsedMilliseconds.ToString();\n    }\n}`
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
