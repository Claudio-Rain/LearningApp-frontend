import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89331298111",
  appId: "1:89331298111:web:91475d009ad1af427a2d8a"
}

// [level, original title, interview%, dailyUse%, blocker%, frequency%]
const QUESTIONS = [
  // L1 — Definition & Basics
  ['L1', 'In your own words, what is a stored procedure and how does it differ from a regular SQL query you send from application code?', 95, 30, 10, 80],
  ['L1', 'What does it mean that a stored procedure is "stored" — where exactly does the database engine keep it, and what is stored alongside the SQL text?', 55, 50, 15, 35],
  ['L1', 'Why did stored procedures become a mainstream pattern in the 1990s, and what problems were they originally designed to solve?', 35, 10, 5, 15],
  ['L1', 'Walk me through the minimum SQL you need to write to create a stored procedure that accepts a user ID and returns that user\'s full name.', 80, 95, 30, 95],
  ['L1', 'How do you execute a stored procedure, and how does calling it differ between at least two database systems you have worked with?', 60, 70, 50, 65],
  ['L1', 'A junior engineer says "stored procedures are always faster than sending queries from the app." What is true about that claim, what is misleading, and when might it actually be wrong?', 75, 55, 30, 60],

  // L2 — Core Concepts
  ['L2', 'Explain the difference between IN, OUT, and INOUT parameters. When would you choose an OUT parameter over simply returning a result set?', 80, 60, 35, 60],
  ['L2', 'How do default parameter values work in stored procedures, and what subtle bug can arise when a caller omits a parameter that has a default?', 60, 75, 60, 60],
  ['L2', 'What is the risk of using NVARCHAR(MAX) or TEXT as a parameter type for every string argument?', 55, 75, 80, 60],
  ['L2', 'Describe the looping constructs available in at least one database procedural language. When is a loop inside a stored procedure a red flag, and when is it justified?', 80, 80, 60, 75],
  ['L2', 'How do conditional branches inside a stored procedure interact with the query optimizer? Does branching prevent a single cached plan from being reused?', 75, 60, 55, 60],
  ['L2', 'Can a stored procedure participate in a caller-initiated transaction? What happens to atomicity if an outer BEGIN TRANSACTION wraps a procedure call that itself issues a COMMIT?', 75, 75, 90, 60],
  ['L2', 'What is a savepoint, and how would you use one inside a stored procedure to implement partial rollback without unwinding the entire outer transaction?', 55, 55, 55, 40],
  ['L2', 'Compare error handling in T-SQL (TRY/CATCH) versus PL/pgSQL (EXCEPTION blocks). What information is available inside the handler, and what is lost if you simply ROLLBACK and re-raise?', 60, 70, 55, 60],
  ['L2', 'A procedure catches every exception, logs it, and always returns a success code to the caller. What are the operational risks of this pattern?', 80, 90, 95, 80],

  // L3 — Practical Usage
  ['L3', 'Describe how your preferred language/ORM framework executes a stored procedure. What does the driver do under the hood that is different from sending a raw query string?', 55, 50, 30, 40],
  ['L3', 'When mapping a stored procedure\'s result set to application objects, what can go wrong with column ordering versus column naming, and how do you guard against it?', 55, 75, 75, 60],
  ['L3', 'When would you use dynamic SQL inside a stored procedure rather than static SQL? Write a brief pseudocode sketch of a procedure that builds a WHERE clause dynamically based on which filter parameters are non-null.', 75, 90, 60, 85],
  ['L3', 'What is the difference between sp_executesql and EXEC(\'string\') in terms of plan reuse and security?', 90, 95, 95, 90],
  ['L3', 'A colleague opens a CURSOR inside a stored procedure to process 500,000 rows one at a time. Walk me through the performance implications and rewrite the logic as a set-based operation.', 90, 80, 75, 75],
  ['L3', 'Are there scenarios where a cursor inside a stored procedure is genuinely the right tool? Describe one.', 60, 55, 35, 40],
  ['L3', 'A stored procedure that ran in under 50 ms for two years suddenly takes 45 seconds in production. No schema changes were made. Walk me through your diagnostic process step by step.', 90, 90, 75, 80],
  ['L3', 'You inherit a stored procedure with no comments that produces incorrect totals for a subset of customers. How do you isolate the bug without a debugger attachment to production?', 75, 85, 40, 75],

  // L4 — Common Pitfalls
  ['L4', 'What is "logic sprawl" in the context of stored procedures, and why can it create a maintenance nightmare?', 75, 75, 55, 75],
  ['L4', 'Explain the "God procedure" anti-pattern. What concrete problems does it create for the optimizer, for testing, and for deployments?', 75, 60, 55, 60],
  ['L4', 'Stored procedures are often cited as a defense against SQL injection. Is that fully accurate?', 95, 90, 95, 90],
  ['L4', 'Two stored procedures A and B are called concurrently. A acquires a lock on Table1 then Table2; B acquires a lock on Table2 then Table1. Describe the deadlock, how the database resolves it, and how you would redesign.', 90, 75, 90, 60],
  ['L4', 'Using READ UNCOMMITTED (NOLOCK) inside a stored procedure — when is it acceptable and when is it dangerous?', 80, 80, 80, 80],
  ['L4', 'What is parameter sniffing, why does it make a procedure fast for one user and slow for another, and what are three mitigation strategies with their respective trade-offs?', 90, 80, 80, 80],
  ['L4', 'What causes a stored procedure plan to be evicted from the cache or recompiled, and why can a recompilation storm under high concurrency be worse than a slightly suboptimal cached plan?', 75, 60, 75, 55],

  // L5 — Internals & Deep Mechanics
  ['L5', 'Walk me through what the database engine does between receiving CREATE PROCEDURE and the point where the procedure is ready to execute.', 75, 35, 35, 35],
  ['L5', 'How does SQL Server\'s procedure plan cache differ from PostgreSQL\'s prepared statement plan cache in terms of scope, eviction policy, and connection pooling interaction?', 60, 55, 55, 40],
  ['L5', 'What is the effect of WITH RECOMPILE on a stored procedure, when is it appropriate, and what is the performance cost of using it indiscriminately?', 75, 75, 55, 60],
  ['L5', 'Explain why the execution plan compiled during the first call can be catastrophically wrong for subsequent calls with different parameter distributions.', 75, 60, 75, 60],
  ['L5', 'Compare OPTIMIZE FOR UNKNOWN, OPTIMIZE FOR (specific value), local variable workarounds, and query hints as solutions to parameter sniffing.', 75, 75, 55, 60],
  ['L5', 'Where in the system catalog is procedure metadata stored, and what information is available there that is useful for auditing or dependency analysis?', 55, 75, 35, 60],
  ['L5', 'Encrypting stored procedure source code (WITH ENCRYPTION in SQL Server, wrapping in Oracle). What operational problems does this create, and when is it genuinely justified?', 55, 55, 75, 35],

  // L6 — Trade-offs & Design Decisions
  ['L6', 'You need to enforce a business rule that every INSERT into Orders recalculates the customer\'s credit exposure. Compare stored procedure, trigger, CHECK constraint, and application-layer validation.', 90, 80, 55, 80],
  ['L6', 'When would you choose a table-valued function over a stored procedure, and what are the key limitations of functions that make procedures more appropriate for write operations?', 75, 75, 55, 60],
  ['L6', 'A startup wants to put all business logic in stored procedures for performance. What are the long-term trade-offs? Make a recommendation.', 75, 75, 55, 75],
  ['L6', 'How do stored procedures complicate a microservices migration? What migration path would you recommend for a 500-procedure legacy database?', 75, 60, 55, 55],
  ['L6', 'How would you version-control stored procedures in a team of 20 engineers using CI/CD? Compare migration-script versus state-based approaches.', 75, 90, 75, 80],
  ['L6', 'Deploying a breaking change to a stored procedure signature when 15 different services call it. What deployment strategies exist?', 75, 80, 75, 60],
  ['L6', 'How do you write automated unit tests for a stored procedure? What frameworks exist, and what makes procedures harder to test in isolation?', 55, 75, 35, 55],
  ['L6', 'A stored procedure calls three other procedures and sends an email via database mail. How do you test the orchestration logic without sending real emails or permanently modifying data?', 55, 70, 35, 40],

  // L7 — Advanced & Expert
  ['L7', 'What are natively compiled stored procedures? What constraints do they impose, and for which workload profiles do they provide the largest gains?', 55, 35, 35, 20],
  ['L7', 'Explain how natively compiled procedures bypass the interpreted execution engine. What does "compilation to machine code" mean here, and what are the deployment and memory management implications?', 40, 20, 20, 15],
  ['L7', 'When would you implement a stored procedure as a CLR procedure or external language procedure rather than T-SQL? What trade-offs does this introduce?', 55, 35, 55, 35],
  ['L7', 'A CLR stored procedure works in development but causes an AppDomain unload in production under load. Walk through your debugging approach.', 35, 35, 75, 15],
  ['L7', 'Designing a SaaS platform where all tenants share the same schema — how do you use stored procedures as a security boundary?', 75, 85, 90, 60],
  ['L7', 'Explain ownership chaining in SQL Server. How does it allow a stored procedure to access tables the calling user cannot directly access, and what security assumption does it break?', 75, 75, 75, 60],
  ['L7', 'Describe a strangler-fig migration strategy for 800 stored procedures toward microservices. What risks exist at each phase?', 75, 60, 55, 40],
  ['L7', 'In a high-throughput OLTP system (50,000 TPS), is it better to push aggregation logic into stored procedures close to the data, or retrieve narrow sets and aggregate in the application tier?', 75, 60, 55, 60],
  ['L7', 'A stored procedure runs correctly in isolation but produces inconsistent results from 200 concurrent sessions. Walk me through the full spectrum of root causes.', 90, 60, 90, 60],
]

// Builds a blockquote node with the ratings text to append to the Tiptap doc
function buildRatingsNode(interview, dailyUse, blocker, frequency) {
  const bold = text => ({ type: 'text', marks: [{ type: 'bold' }], text })
  const plain = text => ({ type: 'text', text })

  return {
    type: 'blockquote',
    content: [{
      type: 'paragraph',
      content: [
        bold('Ratings — '),
        plain('Interview: '),
        bold(`${interview}%`),
        plain(' · Daily Use: '),
        bold(`${dailyUse}%`),
        plain(' · Blocker: '),
        bold(`${blocker}%`),
        plain(' · Frequency: '),
        bold(`${frequency}%`),
      ]
    }]
  }
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const snapshot = await getDocs(collection(db, 'learning_items'))
const allItems = snapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))

console.log(`Fetched ${allItems.length} total learning items from Firestore`)

const now = new Date().toISOString()
let matched = 0
const unmatched = []

for (const [level, title, interview, dailyUse, blocker, frequency] of QUESTIONS) {
  const item = allItems.find(it => it.title === title || it.title === `${level} — ${title}` || it.title === `${level} ${title}`)

  if (!item) {
    unmatched.push(`[${level}] NOT FOUND: ${title.slice(0, 70)}`)
    continue
  }

  // Build updated content: append ratings blockquote to existing doc content
  const existingContent = item.content ?? { type: 'doc', content: [] }
  const existingNodes = existingContent.content ?? []

  // Remove any previously added ratings blockquote (idempotent re-runs)
  const filtered = existingNodes.filter(node => {
    if (node.type !== 'blockquote') return true
    const text = node.content?.[0]?.content?.map(n => n.text).join('') ?? ''
    return !text.startsWith('Ratings —')
  })

  const updatedContent = {
    ...existingContent,
    content: [...filtered, buildRatingsNode(interview, dailyUse, blocker, frequency)]
  }

  const newTitle = `${level} ${title}`

  await updateDoc(doc(db, 'learning_items', item.remoteId), {
    title: newTitle,
    content: updatedContent,
    lastModified: now,
  })

  console.log(`[${level}] Updated: "${title.slice(0, 60)}..."`)
  matched++
}

console.log(`\nDone. ${matched} updated, ${unmatched.length} not found.`)
if (unmatched.length) {
  console.log('\nUnmatched:')
  unmatched.forEach(u => console.log(u))
}

process.exit(0)
