import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'data_validation'
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
  if (t.includes('email') && t.includes('regex')) return `// RFC 5321-approximate email regex\nvar pattern = @"^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$";\nbool IsValidEmail(string email)\n    => Regex.IsMatch(email, pattern, RegexOptions.IgnoreCase);`
  if (t.includes('email')) return `bool IsValidEmail(string email)\n{\n    if (string.IsNullOrWhiteSpace(email)) return false;\n    try {\n        var addr = new System.Net.Mail.MailAddress(email);\n        return addr.Address == email;\n    } catch { return false; }\n}`
  if (t.includes('phone') && (t.includes('parse') || t.includes('normaliz') || t.includes('validate'))) return `// Using libphonenumber-csharp\nvar phoneUtil = PhoneNumberUtil.GetInstance();\nvar parsed = phoneUtil.Parse("(800) 555-0199", "US");\nbool isValid = phoneUtil.IsValidNumber(parsed);\nstring e164 = phoneUtil.Format(parsed, PhoneNumberFormat.E164);\n// → "+18005550199"`
  if (t.includes('phone')) return `// Simple US phone normalization\nstring NormalizePhone(string input)\n{\n    var digits = Regex.Replace(input, @"[^\\d]", "");\n    if (digits.Length == 11 && digits[0] == '1')\n        digits = digits[1..];\n    return digits.Length == 10 ? $"+1{digits}" :\n        throw new FormatException("Invalid phone");\n}`
  if (t.includes('luhn')) return `bool IsLuhnValid(string number)\n{\n    var digits = number.Where(char.IsDigit).Select(c => c - '0').ToArray();\n    for (int i = digits.Length - 2; i >= 0; i -= 2)\n    {\n        digits[i] *= 2;\n        if (digits[i] > 9) digits[i] -= 9;\n    }\n    return digits.Sum() % 10 == 0;\n}`
  if (t.includes('credit card') || t.includes('card number')) return `// Validate + mask credit card\nbool IsValidCard(string num)\n{\n    var clean = num.Replace(" ", "").Replace("-", "");\n    return clean.Length >= 13 && clean.Length <= 19\n        && clean.All(char.IsDigit)\n        && IsLuhnValid(clean);\n}\nstring MaskCard(string num) =>\n    num[..^4].Select(_ => '*').Concat(num[^4..]).ToString();`
  if (t.includes('iban')) return `bool IsValidIban(string iban)\n{\n    var clean = iban.Replace(" ", "").ToUpper();\n    // Move first 4 chars to end, replace letters A=10..Z=35\n    var rearranged = clean[4..] + clean[..4];\n    var numericStr = string.Concat(rearranged.Select(c =>\n        char.IsLetter(c) ? (c - 'A' + 10).ToString() : c.ToString()));\n    return BigInteger.Parse(numericStr) % 97 == 1;\n}`
  if (t.includes('currency') || t.includes('decimal') || t.includes('money')) return `// Parse currency string safely\nbool TryParseCurrency(string input, out decimal result)\n{\n    var clean = input.Replace("$", "").Replace(",", "").Trim();\n    return decimal.TryParse(clean,\n        NumberStyles.Number,\n        CultureInfo.InvariantCulture, out result);\n}\n// Never use double for money — use decimal`
  if (t.includes('ipv4') || t.includes('ipv6') || t.includes('ip address')) return `// Prefer IPAddress.TryParse over regex\nbool IsValidIp(string input, out IPAddress addr)\n    => IPAddress.TryParse(input, out addr);\n\n// Check v4 vs v6\nvar ip = IPAddress.Parse("2001:db8::1");\nbool isV6 = ip.AddressFamily == AddressFamily.InterNetworkV6;`
  if (t.includes('date') && (t.includes('parse') || t.includes('validate'))) return `// Strict date parsing\nbool TryParseDate(string input, out DateOnly result)\n{\n    return DateOnly.TryParseExact(\n        input, "yyyy-MM-dd",\n        CultureInfo.InvariantCulture,\n        DateTimeStyles.None, out result);\n}\n// Avoid: DateTime.Parse — locale-sensitive`
  if (t.includes('guard clause')) return `// Guard clauses at method entry\nvoid ProcessOrder(Order order, int quantity)\n{\n    if (order is null) throw new ArgumentNullException(nameof(order));\n    if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));\n    if (!order.IsActive) throw new InvalidOperationException("Order is closed");\n    // Happy path below\n}`
  if (t.includes('regex') && t.includes('redos') || t.includes('backtrack') || t.includes('catastrophic')) return `// Vulnerable: catastrophic backtracking\nvar bad = new Regex(@"^(a+)+$");\nbad.IsMatch("aaaaaaaaaaaaaaaaX"); // hangs\n\n// Safe: atomic group or possessive (no backtracking)\nvar safe = new Regex(@"^(?:a+)+$",\n    RegexOptions.None, TimeSpan.FromSeconds(1)); // timeout`
  if (t.includes('fqdn') || t.includes('domain')) return `// FQDN validation\nbool IsValidFqdn(string host)\n{\n    if (host.Length > 253) return false;\n    return host.Split('.')\n        .All(label => label.Length is > 0 and <= 63\n            && Regex.IsMatch(label, @"^[a-zA-Z0-9]([a-zA-Z0-9\\-]*[a-zA-Z0-9])?$"));\n}`
  if (t.includes('schema') || t.includes('json schema')) return `// FluentValidation schema-style\npublic class OrderValidator : AbstractValidator<Order>\n{\n    public OrderValidator()\n    {\n        RuleFor(o => o.CustomerId).NotEmpty();\n        RuleFor(o => o.Amount).GreaterThan(0).LessThan(10_000);\n        RuleFor(o => o.Email).EmailAddress();\n    }\n}`
  // default
  return `// Input validation at system boundary\nbool Validate(string input, out string error)\n{\n    if (string.IsNullOrWhiteSpace(input))\n        { error = "Input required"; return false; }\n    if (input.Length > 255)\n        { error = "Too long"; return false; }\n    error = null;\n    return true;\n}`
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
