import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'data_abstraction'
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
  if (t.includes('abstract class') && t.includes('interface') && (t.includes('difference') || t.includes('choose'))) {
    return `// Abstract class: shared state + behavior\nabstract class Animal\n{\n    public string Name { get; set; } // shared state\n    public abstract void Speak();    // must override\n    public void Eat() => Console.WriteLine("Eating"); // concrete\n}\n\n// Interface: contract only\ninterface IFlyable\n{\n    void Fly();\n}`
  }
  if (t.includes('abstract class')) return `abstract class Shape\n{\n    public abstract double Area(); // must be overridden\n    public void Print() => Console.WriteLine($"Area: {Area()}");\n}\n\nclass Circle : Shape\n{\n    public double Radius { get; set; }\n    public override double Area() => Math.PI * Radius * Radius;\n}`
  if (t.includes('interface') && (t.includes('contract') || t.includes('impose'))) return `interface IRepository<T>\n{\n    Task<T> GetByIdAsync(int id);\n    Task<IEnumerable<T>> GetAllAsync();\n    Task SaveAsync(T entity);\n}\n\nclass UserRepository : IRepository<User>\n{\n    public async Task<User> GetByIdAsync(int id) { ... }\n    // must implement all members\n}`
  if (t.includes('virtual') && t.includes('override') && t.includes('new')) return `class Base\n{\n    public virtual void M() => Console.Write("Base");\n}\nclass Derived : Base\n{\n    public override void M() => Console.Write("Derived"); // polymorphic\n    public new void M2() => Console.Write("Hides Base"); // not polymorphic\n}\nBase b = new Derived();\nb.M();  // "Derived" (virtual dispatch)\nb.M2(); // compile error — M2 not on Base`
  if (t.includes('polymorphism') || t.includes('virtual')) return `class Logger\n{\n    public virtual void Log(string msg) => Console.WriteLine(msg);\n}\nclass FileLogger : Logger\n{\n    public override void Log(string msg)\n    {\n        base.Log(msg);           // call base\n        File.AppendAllText("app.log", msg);\n    }\n}\nLogger l = new FileLogger();\nl.Log("Hello"); // calls FileLogger.Log`
  if (t.includes('explicit interface')) return `interface IFoo { void Bar(); }\ninterface IBar { void Bar(); }\n\nclass Widget : IFoo, IBar\n{\n    void IFoo.Bar() => Console.Write("IFoo.Bar");\n    void IBar.Bar() => Console.Write("IBar.Bar");\n}\n// Usage:\nWidget w = new Widget();\n((IFoo)w).Bar(); // IFoo.Bar\n((IBar)w).Bar(); // IBar.Bar`
  if (t.includes('sealed')) return `// Sealed class: no further inheritance\npublic sealed class FinalImpl : IService\n{\n    public void Execute() { /* ... */ }\n}\n// class Attempt : FinalImpl { } // compile error\n\n// Sealed override: prevent further overrides\nclass Derived : Base\n{\n    public sealed override void Method() { }\n}`
  if (t.includes('vtable') || t.includes('virtual dispatch') || t.includes('clr')) return `// CLR virtual dispatch via vtable\n// Each type has a Method Table (vtable)\n// Virtual call: load vtable ptr → look up slot → call\n// Non-virtual call: direct call (no lookup)\n\nvar animal = new Dog();\nanimal.Speak(); // vtable lookup → Dog.Speak\n// vs:\n((Animal)animal).Feed(); // non-virtual → Animal.Feed directly`
  if (t.includes('default interface') || t.includes('c# 8')) return `interface ILogger\n{\n    void Log(string msg);\n    // Default implementation (C# 8+)\n    void LogWarning(string msg) => Log($"[WARN] {msg}");\n}\n\nclass ConsoleLogger : ILogger\n{\n    public void Log(string msg) => Console.WriteLine(msg);\n    // LogWarning inherited from interface default\n}`
  if (t.includes('covariant') || t.includes('contravariant') || t.includes('variance')) return `// Covariant: out T (read-only, safe to upcast)\nIEnumerable<string> strings = new List<string>();\nIEnumerable<object> objects = strings; // OK: IEnumerable<out T>\n\n// Contravariant: in T (write-only, safe to downcast)\nAction<object> obj = Console.WriteLine;\nAction<string> str = obj; // OK: Action<in T>`
  if (t.includes('marker interface')) return `// Old marker pattern (avoid)\ninterface ISerializable { } // no members\n\n// Modern alternative: attribute\n[AttributeUsage(AttributeTargets.Class)]\nclass SerializableAttribute : Attribute { }\n\n[Serializable]\nclass MyDto { ... }`
  if (t.includes('composition') && t.includes('inheritance')) return `// Favor composition\nclass EmailNotifier { public void Send(string msg) { ... } }\nclass SmsNotifier  { public void Send(string msg) { ... } }\n\nclass OrderService\n{\n    private readonly EmailNotifier _email;\n    private readonly SmsNotifier _sms;\n    // Compose behavior, not inherit it\n    public void PlaceOrder() { _email.Send("..."); _sms.Send("..."); }\n}`
  if (t.includes('template method')) return `abstract class DataExporter\n{\n    // Template method\n    public void Export()\n    {\n        var data = LoadData();     // abstract hook\n        var formatted = Format(data); // abstract hook\n        Save(formatted);          // concrete step\n    }\n    protected abstract IEnumerable<Row> LoadData();\n    protected abstract string Format(IEnumerable<Row> rows);\n    private void Save(string content) => File.WriteAllText("out.txt", content);\n}`
  // default
  return `// Interface → implementation → usage\ninterface IPaymentGateway\n{\n    Task<bool> ChargeAsync(decimal amount, string cardToken);\n}\n\nclass StripeGateway : IPaymentGateway\n{\n    public async Task<bool> ChargeAsync(decimal amount, string token)\n    {\n        // call Stripe API\n        return true;\n    }\n}`
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
