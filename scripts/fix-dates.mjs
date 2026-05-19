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

// Questions in the exact order they appear in framework_http_clients.md
const ORDERED_TITLES = [
  "What is an HTTP request header, and can you name five headers commonly seen in ASP.NET applications? What does each one tell the server?",
  "How are HTTP response status codes grouped into classes (1xx–5xx)? Give one real-world example from each class and explain what it signals to the client.",
  "What is the difference between the `Content-Type` and `Accept` headers? Why does confusing them cause problems in API clients?",
  "What is the role of the `Authorization` header, and why should its value never be logged verbatim?",
  "In one or two sentences, what is ASP.NET Core middleware? How does it differ from an HTTP handler in classic ASP.NET (OWIN)?",
  "What does `app.Use` vs `app.Run` mean when registering middleware? Which one allows the request to continue down the pipeline?",
  "A junior developer asks whether to handle cross-cutting concerns (logging, auth, CORS) in middleware or in action filters. How would you guide that decision?",
  "Describe the request/response lifecycle through the ASP.NET Core middleware pipeline. What happens if a middleware calls `next()` vs if it does not?",
  "Why does middleware registration order matter? Give a concrete scenario where the wrong order causes a security or correctness bug.",
  "When would you choose `IMiddleware` (factory-based) over the convention-based `InvokeAsync` approach? What are the lifecycle implications?",
  "How does ASP.NET Core expose request headers on the server side? How would you safely read a header that might be absent?",
  "What is `HttpRequestHeaders` in the `System.Net.Http` client stack? How is it different from `IHeaderDictionary` on the server side?",
  "Why are some headers (e.g., `Host`, `Content-Length`) considered \"restricted\" in `HttpClient` and cannot be set via `DefaultRequestHeaders`?",
  "A REST API returns `200 OK` on every response and puts the real error in a JSON body field. What problems does this cause?",
  "When should an API return `400 Bad Request` vs `422 Unprocessable Entity`? Does ASP.NET Core's default behavior align with your preference?",
  "Show how you would add a custom `X-Correlation-Id` header to every outgoing `HttpClient` request without duplicating code in each call site.",
  "How would you remove a sensitive header (e.g., `Server`) from every HTTP response in ASP.NET Core? Would you use middleware or response headers policy — why?",
  "Your integration tests fail in CI because `DefaultRequestHeaders` throws `InvalidOperationException` after the first request is sent. What is the root cause and how do you fix it?",
  "What does `AddXmlSerializerFormatters()` do? What is the difference between `XmlSerializerOutputFormatter` and `XmlDataContractSerializerOutputFormatter`?",
  "What is `RespectBrowserAcceptHeader`? Why is it `false` by default, and when would you set it to `true`?",
  "Walk through how content negotiation selects a formatter when a client sends `Accept: application/xml, application/json;q=0.8`. What happens if no formatter matches?",
  "A product manager wants every endpoint to always return JSON regardless of the client's `Accept` header. How would you implement that, and what are the downsides?",
  "What is the difference between `[Consumes(\"application/json\")]` and `[Produces(\"application/json\")]`? How does each affect routing and response serialization?",
  "If a client POSTs `Content-Type: text/plain` to an action decorated with `[Consumes(\"application/json\")]`, what HTTP status code does the client receive, and why?",
  "How do you bind a file upload to an action method parameter using `IFormFile`? What `Content-Type` must the client use, and why?",
  "What is the default maximum request body size in ASP.NET Core (Kestrel), and how would you increase it only for a specific file-upload endpoint?",
  "A developer writes a middleware that reads `Request.Body` for audit logging, but downstream action methods always receive an empty model. What is the cause, and what are two ways to fix it?",
  "Why is it dangerous to capture `HttpContext` in a background `Task` started inside middleware? What interface should you use instead?",
  "A team stores per-request state in `HttpContext.Items`. Another team uses a scoped service. Compare these approaches.",
  "What abstract base classes would you extend to create a custom input and output formatter in ASP.NET Core MVC?",
  "A custom `OutputFormatter` is registered but never selected. List three things you would check first.",
  "A file upload endpoint works under 2 MB but returns `413` for larger files only in production behind IIS/NGINX. What layers enforce size limits and how do you adjust each?",
  "Why should you avoid `IFormFile.OpenReadStream()` then `ReadToEnd()` for very large files?",
  "A colleague shares `HttpClient` as a static field and mutates `DefaultRequestHeaders` per request in a parallel loop. What concurrency bug will occur, and how do you redesign it?",
  "What is `IFeatureCollection` in ASP.NET Core? How does `HttpContext` use it internally?",
  "Name four common request feature interfaces and describe what each exposes. When would application code interact with them directly?",
  "What are the performance and versioning trade-offs of the feature collection abstraction layer?",
  "How does `IHttpContextAccessor` propagate `HttpContext` to non-middleware services? What `AsyncLocal<T>` mechanism underlies it?",
  "A singleton service injected with `IHttpContextAccessor` returns `null` for `HttpContext` during startup initialization. Why, and how do you guard against it?",
  "Walk through the `ObjectResult` execution path. How does `DefaultOutputFormatterSelector` score and pick a formatter?",
  "Why does `RespectBrowserAcceptHeader = false` make browsers always receive JSON, even though browsers send `text/html` as their first-choice `Accept` value?",
  "How does ASP.NET Core compile the middleware pipeline into a single `RequestDelegate` chain at startup? What are the performance implications of `app.UseWhen` vs branching inside a single middleware?",
  "Compare placing request-validation logic in middleware vs `IActionFilter` vs the domain model. Under what circumstances does each give better cohesion?",
  "When designing a public API supporting JSON, XML, and MessagePack, how would you structure formatter registration for easy extensibility?",
  "A GDPR requirement mandates stripping PII from request logs. Compare (a) a logging middleware, (b) a custom `ILogger` sink, (c) a structured-logging enricher.",
  "Describe the memory and latency trade-offs between fully buffering a request body vs streaming it for file-upload endpoints.",
  "How does `EnableBuffering()` work internally? What are the implications for memory pressure under high concurrency?",
  "Describe a legitimate use case for swapping out `IHttpResponseBodyFeature` mid-pipeline and the risks.",
  "Minimal APIs bypass much of the MVC formatter infrastructure. What do you lose, and how do you recover it if you need content negotiation?",
  "Design a production-ready middleware that computes an HMAC signature over the request body for audit, writes it to a distributed cache, and passes it downstream without breaking streaming endpoints.",
  "In a high-throughput API gateway, how would you profile and reduce allocations in a custom middleware chain?",
  "Implement a custom `IOutputFormatter` that serializes to `application/vnd.myapp.v2+json` and integrates with `DefaultOutputFormatterSelector`. What edge cases must you handle?",
  "A client sends `Accept: */*` and `Accept-Encoding: br`. Your formatter returns JSON but NGINX strips Brotli-encoded responses. How do you diagnose and architect a solution at the ASP.NET Core level?",
  "`IHttpUpgradeFeature` enables protocol upgrades. Walk through the upgrade handshake at the feature-collection level.",
  "Kestrel implements `IHttpMinRequestBodyDataRateFeature` to protect against slow-loris attacks. How does this interact with large file uploads, and how do you configure it per route?",
  "In production, a subset of requests fail with `ObjectDisposedException` on `HttpContext.Response.Body` after the response appears sent. Walk through every layer to find the root cause.",
  "You are evaluating gRPC (`Grpc.AspNetCore`) vs a REST API with custom binary formatters. Compare on content negotiation, middleware compatibility, browser accessibility, and operational complexity.",
]

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const snapshot = await getDocs(collection(db, 'learning_items'))
const allItems = snapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))

console.log(`Fetched ${allItems.length} total learning items from Firestore`)

// Base date: 2026-05-19T03:00:00.000Z, increment by 1 minute per item
const BASE_DATE = new Date('2026-05-19T03:00:00.000Z')

let matched = 0
let unmatched = []

for (let i = 0; i < ORDERED_TITLES.length; i++) {
  const title = ORDERED_TITLES[i]
  const item = allItems.find(it => it.title === title)

  if (!item) {
    unmatched.push(`[${i + 1}] NOT FOUND: ${title.slice(0, 60)}...`)
    continue
  }

  const newDate = new Date(BASE_DATE.getTime() + i * 60_000).toISOString()
  const now = new Date().toISOString()
  await updateDoc(doc(db, 'learning_items', item.remoteId), { dateCreated: newDate, lastModified: now })
  console.log(`[${i + 1}] Updated "${title.slice(0, 55)}..." → ${newDate}`)
  matched++
}

console.log(`\nDone. ${matched} updated, ${unmatched.length} not found.`)
if (unmatched.length) {
  console.log('\nUnmatched:')
  unmatched.forEach(u => console.log(u))
}

process.exit(0)
