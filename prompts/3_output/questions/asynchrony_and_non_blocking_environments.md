# Interview Questions: Asynchrony and Non-Blocking Environments

## Coverage map
> Maps each Knowledge and Skill item from the JD to its progression level.

| Item | Type | Level |
|------|------|-------|
| General asynchronous programming concepts | Knowledge | Level 1 — Definition & Basics |
| Able to explain the different I/O-bound and CPU-bound tasks | Knowledge | Level 2 — Core Concepts |
| Understanding different return types of async methods | Knowledge | Level 2 — Core Concepts |
| What is the difference between Task.Delay and Thread.Sleep, when to use them? | Knowledge | Level 2 — Core Concepts |
| Understanding of ConfigureAwait | Knowledge | Level 3 — Practical Usage |
| Knows how to handle errors in asynchronous operations | Knowledge | Level 3 — Practical Usage |
| Able to process asynchronous tasks as they complete | Knowledge | Level 3 — Practical Usage |
| Knows how to cancel async tasks after some time | Knowledge | Level 3 — Practical Usage |
| Uses async/await to create an asynchronous method (Task) | Skill | Level 2 — Core Concepts |
| Obtains result from Task\<T\> | Skill | Level 2 — Core Concepts |
| Runs Task (Task.Run) and creates a continuation (Task.ContinueWith) | Skill | Level 3 — Practical Usage |
| Waits for Task completion (await, Task.WhenAll, Task.WhenAny, Wait()) | Skill | Level 3 — Practical Usage |
| Uses CancellationTokens to interrupt or cancel execution | Skill | Level 3 — Practical Usage |

---

## Level 1 — Definition & Basics
_Goal: Verify that the candidate understands what asynchrony is, why it exists, and can speak its core vocabulary without confusion._

### What is Asynchrony
- ❓ In your own words, what does it mean for code to be "asynchronous"? How does it differ from synchronous execution? `[FROM JD]`
- ❓ What problem does asynchronous programming solve? Give a concrete everyday example where synchronous code would be harmful. `[INFERRED]`
- ❓ What is a thread, and what is the relationship between threads and asynchronous programming? Are they the same thing? `[INFERRED]`

### Blocking vs Non-Blocking
- ❓ What does it mean for a call to be "blocking"? What does it mean to be "non-blocking"? Why does the distinction matter? `[FROM JD]`
- ❓ If a UI application calls a database synchronously on the main thread, what happens? How would making it asynchronous change that behavior? `[INFERRED]`

### Key Vocabulary
- ❓ Define the terms: Task, async, await, and continuation — as if explaining them to a junior developer joining your team. `[FROM JD]`
- ❓ What is a thread pool, and why is it relevant when talking about async/await in .NET? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Confirm the candidate understands the fundamental building blocks — Tasks, return types, CPU vs I/O distinction, and basic async/await mechanics._

### I/O-Bound vs CPU-Bound
- ❓ What is the difference between an I/O-bound task and a CPU-bound task? Give one example of each. `[FROM JD]`
- ❓ Why does the I/O-bound vs CPU-bound distinction matter when choosing between `async/await` and `Task.Run`? What goes wrong if you use the wrong one? `[FROM JD]`
- ❓ A developer wraps a database query with `Task.Run(() => db.Query(...))`. Is this a good idea? Why or why not? `[INFERRED]`

### Return Types of Async Methods
- ❓ What are the valid return types for an `async` method in C#? When would you choose `Task`, `Task<T>`, or `void`? `[FROM JD]`
- ❓ Why is `async void` generally considered dangerous outside of event handlers? What specific problem does it cause? `[FROM JD]`
- ❓ What is `ValueTask<T>` and when would you prefer it over `Task<T>`? `[INFERRED]`

### Task and async/await Basics
- ❓ Write a method `GetDataAsync()` that asynchronously fetches a string from a URL and returns it. Walk through every keyword you use and explain its role. `[FROM JD]`
- ❓ What does `await` actually do at runtime? Does it block the calling thread? What happens to execution after the `await` line? `[FROM JD]`
- ❓ How do you obtain the result value from a `Task<T>`? What are the different ways, and what are the risks of each? `[FROM JD]`

### Task.Delay vs Thread.Sleep
- ❓ What is the difference between `Task.Delay` and `Thread.Sleep`? When would you use each one? `[FROM JD]`
- ❓ If you use `Thread.Sleep(2000)` inside an `async` method, what actually happens to the thread? Is this a problem? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Assess whether the candidate can write correct async code in real scenarios, including task composition, error handling, cancellation, and context awareness._

### Task Composition
- ❓ You need to call three independent APIs and wait for all of them before proceeding. Which method do you use — `Task.WhenAll` or sequential awaits — and why? `[FROM JD]`
- ❓ What is the difference between `Task.WhenAll` and `Task.WhenAny`? Describe a real scenario where `Task.WhenAny` is the right choice. `[FROM JD]`
- ❓ When would you use `Task.Wait()` or `.Result` instead of `await`? What trade-offs does that introduce? `[FROM JD]`
- ❓ Explain `Task.ContinueWith`. When is it preferable to `await`, and what are its pitfalls? `[FROM JD]`

### Task.Run
- ❓ When should you use `Task.Run`? Write an example that correctly offloads a CPU-bound operation without blocking the UI thread. `[FROM JD]`
- ❓ Is it correct to use `Task.Run` inside an ASP.NET Core controller action? Why or why not? `[INFERRED]`

### Cancellation
- ❓ What is a `CancellationToken` and how does it work? Walk through creating one, passing it to an async method, and cancelling it after a timeout. `[FROM JD]`
- ❓ How would you implement a timeout on an async operation using `CancellationTokenSource`? Write the code. `[FROM JD]`
- ❓ What happens if a cancelled `CancellationToken` is passed to an operation that doesn't check it? How do you make a method cancellation-aware? `[INFERRED]`
- ❓ What exception is thrown when a cancellation is triggered? How should you handle it differently from other exceptions? `[INFERRED]`

### Error Handling
- ❓ How do you correctly catch exceptions from an awaited `Task`? What happens if you do not await a faulted Task? `[FROM JD]`
- ❓ If you use `Task.WhenAll` and two of five tasks throw exceptions, what do you receive? How do you access all the individual exceptions? `[FROM JD]`
- ❓ What is an `AggregateException` and when does it appear in async code? How do you unwrap it? `[INFERRED]`

### Processing Tasks as They Complete
- ❓ You fire off five async operations and want to process each result as soon as it finishes, rather than waiting for all five. How do you implement that? `[FROM JD]`
- ❓ Compare `Task.WhenAll` followed by result processing vs using a channel or `IAsyncEnumerable` for streaming results. When does the latter approach matter? `[INFERRED]`

### ConfigureAwait
- ❓ What does `ConfigureAwait(false)` do and why would you use it in a library method? `[FROM JD]`
- ❓ In what type of application context is it most important to use `ConfigureAwait(false)`? What problem does it prevent? `[FROM JD]`
- ❓ A developer says "I always add `ConfigureAwait(false)` everywhere just to be safe." Is this correct advice? Are there cases where you should not use it? `[INFERRED]`

---

## Level 4 — Common Pitfalls
_Goal: Identify whether the candidate has been burned by or understands the classic async mistakes and how to avoid them._

### Deadlocks
- ❓ Explain the classic async deadlock scenario in ASP.NET or WinForms. What sequence of calls produces it, and why? `[INFERRED]`
- ❓ A developer uses `.Result` on an awaited Task inside an ASP.NET 4.x controller. Walk through exactly why this deadlocks. `[INFERRED]`
- ❓ What is the "async all the way down" principle? What happens when you violate it? `[INFERRED]`

### Fire-and-Forget Anti-Patterns
- ❓ What are the risks of fire-and-forget tasks (calling an async method without awaiting it)? How do you handle exceptions from them safely? `[INFERRED]`
- ❓ When is fire-and-forget acceptable, and what safeguards should surround it? `[INFERRED]`

### Async Void
- ❓ A developer writes an `async void` method that throws. Where does the exception go, and what happens to the application? `[FROM JD]`
- ❓ Besides event handlers, are there any other legitimate uses for `async void`? What would be a safer alternative? `[INFERRED]`

### Subtle Misuse
- ❓ What is the difference between these two code snippets, and which is correct?
  ```csharp
  // A
  var result = await GetDataAsync();
  // B
  var result = GetDataAsync().Result;
  ```
  `[INFERRED]`
- ❓ A developer marks a method `async` but never uses `await` inside it. What does the compiler do, and is there a performance cost? `[INFERRED]`
- ❓ What is "async over sync" (wrapping synchronous code in `Task.FromResult` or `Task.Run` unnecessarily)? Why is it harmful in library code? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Determine whether the candidate understands what happens under the hood — state machines, thread scheduling, and the synchronization context._

### State Machine & Compiler Transform
- ❓ What does the C# compiler generate when it encounters an `async` method? Describe the state machine at a high level. `[INFERRED]`
- ❓ Where does execution resume after `await` completes? Who is responsible for scheduling that continuation? `[INFERRED]`
- ❓ What is the `SynchronizationContext` and what role does it play in how `await` resumes execution? `[INFERRED]`

### Thread Pool Mechanics
- ❓ When you `await` an I/O-bound operation, is a thread blocked waiting for it to complete? What is actually happening at the OS level? `[INFERRED]`
- ❓ How does `Task.Run` interact with the thread pool? What happens if the thread pool is saturated? `[INFERRED]`
- ❓ What is thread pool starvation in the context of async code? How would you diagnose and fix it? `[INFERRED]`

### Task Internals
- ❓ What is the difference between a "hot" Task and a "cold" Task? Which does `async/await` produce by default? `[INFERRED]`
- ❓ How does `TaskCompletionSource<T>` work and when would you use it? Give a real scenario. `[INFERRED]`
- ❓ What is the cost of creating a `Task` vs a `ValueTask`? In which scenarios does that cost become significant? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate architectural judgment — when async is the right tool, when it adds unnecessary complexity, and how to make those calls consciously._

### When to Go Async
- ❓ Not every method needs to be async. What criteria guide your decision to make a method async vs synchronous? `[INFERRED]`
- ❓ You are writing a small CLI tool that makes a single HTTP request and exits. Should you use async/await? What are the trade-offs? `[INFERRED]`
- ❓ Compare using async/await vs raw threads vs reactive extensions (Rx) for a high-throughput event processing scenario. When would each shine? `[INFERRED]`

### Parallel vs Async
- ❓ What is the difference between asynchrony and parallelism? Can you have one without the other? `[INFERRED]`
- ❓ When would you use `Parallel.ForEach` instead of `Task.WhenAll` over an async delegate? What are the risks of mixing them incorrectly? `[INFERRED]`

### Library vs Application Design
- ❓ You are writing a NuGet library used by many applications. What async-related API design rules would you follow? (Think: ConfigureAwait, sync wrappers, cancellation support.) `[INFERRED]`
- ❓ Should a library ever expose a synchronous wrapper over an async method? What are the risks, and what is the recommended guidance from Microsoft? `[INFERRED]`

### Cancellation Design
- ❓ At what point in your call stack should `CancellationToken` be introduced? Should it be optional or required? What does your choice signal to callers? `[INFERRED]`
- ❓ How would you design a system that needs to cancel all in-flight operations when a user logs out? What components would you use? `[FROM JD]`

---

## Level 7 — Advanced & Expert
_Goal: Probe mastery-level understanding — high-throughput systems, advanced patterns, and nuanced architectural reasoning._

### High-Throughput & Scalability
- ❓ In an ASP.NET Core service handling 10,000 concurrent requests, what specific async mistakes would cause latency to spike under load? Walk through each one. `[INFERRED]`
- ❓ What is backpressure, and how do you implement it in an async pipeline? Why does ignoring it lead to memory exhaustion? `[INFERRED]`
- ❓ Describe how `System.Threading.Channels` works and how it compares to `BlockingCollection<T>` for producer/consumer scenarios. When would you choose one over the other? `[INFERRED]`

### IAsyncEnumerable & Streaming
- ❓ What is `IAsyncEnumerable<T>` and how does it differ from returning a `Task<IEnumerable<T>>`? Walk through a real use case where the distinction matters. `[INFERRED]`
- ❓ How does `await foreach` interact with cancellation? How do you pass a `CancellationToken` into an `IAsyncEnumerable<T>` sequence? `[INFERRED]`

### Advanced Cancellation & Timeouts
- ❓ You need to implement a retry-with-timeout strategy for a flaky external API call. Design the solution using `CancellationTokenSource`, `Polly`, or both. What edge cases must you handle? `[FROM JD]`
- ❓ How do you compose multiple `CancellationToken` sources (e.g., a user-triggered cancel AND a timeout)? What .NET API enables this? `[INFERRED]`

### Debugging & Observability
- ❓ You have a production service where some requests occasionally hang indefinitely. Walk through your methodology for diagnosing whether the root cause is an async deadlock, thread pool starvation, or an awaited operation that never completes. `[INFERRED]`
- ❓ What tooling (Visual Studio, dotnet-dump, EventSource, OpenTelemetry) would you use to trace async call chains and identify where time is spent in an async pipeline? `[INFERRED]`

### Architecture
- ❓ You are designing a microservice that must process a high-volume stream of events, call downstream APIs, and write results to a database — all with cancellation support and graceful shutdown. How would you structure the async pipeline? What patterns and primitives would you use? `[INFERRED]`
- ❓ How does the actor model (e.g., Orleans, Akka.NET) relate to async programming? When would you reach for an actor framework instead of raw async/await? `[INFERRED]`
