import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'code_quality'
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
  if (t.includes('cyclomatic complexity') && t.includes('control-flow')) return `// CC = 1 (baseline) + 1(if) + 1(for) + 3(switch cases) = 6\nvoid Process(Order order)\n{\n    if (order.IsPaid)          // +1\n    {\n        for (var i ...) {     // +1\n            switch (order.Type) {\n                case A: ...   // +1\n                case B: ...   // +1\n                case C: ...   // +1\n            }\n        }\n    }\n}`
  if (t.includes('cyclomatic complexity')) return `// Low complexity (CC=2) — easy to test\nbool IsEligible(int age) => age >= 18;\n\n// High complexity (CC=8) — hard to test\nbool IsEligible(User u)\n{\n    if (u.Age >= 18 && u.IsVerified\n        && u.Country != "US" || u.HasWaiver)\n        return u.Tier == "Gold" ? true : u.Points > 100;\n    return false;\n}`
  if (t.includes('maintainability index')) return `// High MI (green ~80) — readable\npublic decimal CalculateTax(decimal income)\n    => income * TaxRate;\n\n// Low MI (red ~5) — complex + dense\npublic decimal X(decimal a, decimal b, int c, bool d, string e)\n    => d ? (a * b) / (c == 0 ? 1 : c) + (e.Length > 0 ? 1.5m : 0) : 0;`
  if (t.includes('coupling') && (t.includes('afferent') || t.includes('efferent'))) return `// High efferent coupling (Ce) — fragile\nclass OrderService\n{\n    // depends on 8 types:\n    private readonly IRepo _repo;\n    private readonly IMailer _mail;\n    private readonly ILogger _log;\n    private readonly IPayment _pay;\n    private readonly ICache _cache;\n    private readonly IQueue _queue;\n    private readonly IAudit _audit;\n    private readonly ITax _tax;\n}`
  if (t.includes('depth of inheritance') || t.includes('dit')) return `// DIT = 1 (flat, clear)\nclass Button : Control { }\n\n// DIT = 6 (deep, confusing)\nclass FancyAnimatedIconButton\n    : AnimatedButton         // DIT 5\n    // → IconButton → Button → ClickableControl\n    // → Control → UIElement { }`
  if (t.includes('code smell') || t.includes('smells')) return `// Long Method smell — extract to smaller methods\nvoid ProcessOrder(Order o)\n{\n    // 200 lines of mixed concerns\n    ValidateOrder(o);     // extracted\n    ApplyDiscounts(o);    // extracted\n    ChargePayment(o);     // extracted\n    SendConfirmation(o);  // extracted\n}`
  if (t.includes('sonarqube') || t.includes('sonar')) return `# SonarQube quality gate check in CI\ndotnet sonarscanner begin \\\n  /k:"MyProject" \\\n  /d:sonar.host.url="http://sonar:9000"\ndotnet build\ndotnet sonarscanner end`
  if (t.includes('editorconfig')) return `# .editorconfig\n[*.cs]\nindent_style = space\nindent_size = 4\ndotnet_style_qualification_for_field = false:suggestion\ncsharp_prefer_braces = true:warning`
  if (t.includes('roslyn') && t.includes('analyzer')) return `// Minimal Roslyn diagnostic analyzer\n[DiagnosticAnalyzer(LanguageNames.CSharp)]\npublic class EmptyCatchAnalyzer : DiagnosticAnalyzer\n{\n    public override void Initialize(AnalysisContext ctx)\n    {\n        ctx.RegisterSyntaxNodeAction(Analyze,\n            SyntaxKind.CatchClause);\n    }\n    void Analyze(SyntaxNodeAnalysisContext ctx)\n    {\n        var clause = (CatchClauseSyntax)ctx.Node;\n        if (!clause.Block.Statements.Any())\n            ctx.ReportDiagnostic(Diagnostic.Create(\n                Rule, clause.GetLocation()));\n    }\n}`
  if (t.includes('resharper')) return `// ReSharper suppression (inline)\n// ReSharper disable once PossibleNullReferenceException\nvar name = user.Name.ToUpper();\n\n// Project-wide: ResharperCodeInspectionSettings.xml\n// or via Settings → Code Inspection → Inspection Severity`
  if (t.includes('cognitive complexity')) return `// Low cognitive (CC=1 cyclomatic, ~1 cognitive)\nbool IsAdult(int age) => age >= 18;\n\n// Higher cognitive — nested ifs add more than cyclomatic\nbool CanAccess(User u, Resource r)\n{\n    if (u.IsAdmin)             // +1\n        if (r.IsPublic)        // +2 (nested)\n            return true;\n    if (u.Roles               // +1\n        .Contains(r.Role))    // +1 (logical op)\n        return true;\n    return false;\n}`
  if (t.includes('technical debt')) return `// Technical debt example: missing null checks\n// Current (debt)\npublic string GetCity(User u) => u.Address.City;\n\n// After remediation\npublic string GetCity(User u)\n    => u?.Address?.City ?? "Unknown";`
  if (t.includes('quality gate')) return `// dotnet-coverage + reportgenerator in CI\ndotnet test --collect:"XPlat Code Coverage"\nreportgenerator -reports:coverage.xml -targetdir:report\n# SonarQube quality gate: fail if coverage < 80%`
  if (t.includes('stylecop')) return `// StyleCop rule SA1633: file must have header\n// StyleCop rule SA1101: prefix local calls with 'this'\npublic void Method()\n{\n    this.DoWork(); // SA1101 compliant\n}\n// .stylecop.json or StyleCop.Analyzers NuGet configures rules`
  // default
  return `// Measurable code quality improvement\n// Before refactor: CC=14, MI=22 (red)\npublic void Process(Order o, bool x, int t, string s) { /* 80 lines */ }\n\n// After: CC=3, MI=78 (green)\npublic void Process(Order o)\n{\n    Validate(o);\n    Apply(o);\n    Notify(o);\n}`
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
