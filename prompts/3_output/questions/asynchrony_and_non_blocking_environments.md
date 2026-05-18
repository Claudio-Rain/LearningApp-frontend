# Interview Questions: Asynchrony and Non-Blocking Environments

## Coverage map

| Item | Type | Level |
|------|------|-------|
| General asynchronous programming concepts | Knowledge | Level 1 — Definition & Basics |
| I/O-bound vs CPU-bound tasks | Knowledge | Level 2 — Core Concepts |
| Different return types of async methods | Knowledge | Level 2 — Core Concepts |
| Task.Delay vs Thread.Sleep | Knowledge | Level 2 — Core Concepts |
| Knows how to cancel async tasks after some time | Knowledge | Level 3 — Practical Usage |
| Knows how to handle errors in asynchronous operations | Knowledge | Level 3 — Practical Usage |
| Able to process asynchronous tasks as they complete | Knowledge | Level 5 — Internals & Deep Mechanics |
| Understanding of ConfigureAwait | Knowledge | Level 5 — Internals & Deep Mechanics |
| Uses async/await to create an asynchronous method (Task) | Skill | Level 3 — Practical Usage |
| Runs Task (Task.Run) and creates a continuation (Task.ContinueWith) | Skill | Level 3 — Practical Usage |
| Waits for Task completion (await, Task.WhenAll, Task.WhenAny, Wait()) | Skill | Level 3 — Practical Usage |
| Obtains result from Task<T> | Skill | Level 2 — Core Concepts |
| Uses CancellationTokens to interrupt or cancel execution | Skill | Level 3 — Practical Usage |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate understands what asynchronous programming is and why it exists._

### What is Asynchrony
- ❓ What does it mean for code to be "asynchronous"? How does it differ from synchronous execution? `[INFERRED]`
- ❓ What problem does asynchronous programming solve, and why does it matter in modern applications? `[INFERRED]`
- ❓ What is a thread? What is the difference between parallelism and concurrency? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of tasks, return types, and the I/O vs CPU distinction._

### I/O-bound vs CPU-bound
- ❓ What is the difference between an I/O-bound task and a CPU-bound task? Give one real example of each. `[FROM JD]`
- ❓ Why does the distinction between I/O-bound and CPU-bound work matter when choosing between `async/await` and `Task.Run`? `[FROM JD]`

### Return Types and Results
- ❓ What are the possible return types of an `async` method in C#? When would you return `Task<T>` vs `Task` vs `void`? `[FROM JD]`
- ❓ How do you obtain the result from a `Task<T>`? What are the different ways and what are their trade-offs? `[FROM JD]`

### Task.Delay vs Thread.Sleep
- ❓ What is the difference between `Task.Delay` and `Thread.Sleep`? When should you prefer one over the other? `[FROM JD]`

---

## Level 3 — Practical Usage
_Goal: Test ability to write async code correctly in C#._

### async/await
- ❓ Write a simple async method that fetches data from a URL and returns its content as a string. `[FROM JD]`
- ❓ How do you make an existing synchronous method asynchronous? What must you change at the call site? `[INFERRED]`

### Task.WhenAll / Task.WhenAny
- ❓ You need to make three independent HTTP calls and wait for all of them. How do you do it? What if you only need the first to finish? `[FROM JD]`
- ❓ What is the difference between `await task` and calling `task.Wait()`? `[FROM JD]`

### Error Handling
- ❓ How do you handle exceptions thrown inside an `async` method? What happens if you don't `await` a faulted task? `[FROM JD]`
- ❓ If `Task.WhenAll` has two faulted tasks, what happens when you `await` it? How do you observe all errors? `[FROM JD]`

### Cancellation
- ❓ How would you cancel an async operation after a 5-second timeout? Write the code and explain how `CancellationToken` propagates. `[FROM JD]`
- ❓ What is the cooperative cancellation model? What must every method in the call chain do to support cancellation? `[FROM JD]`

### Task.Run and ContinueWith
- ❓ When would you use `Task.Run`? Show how to attach a continuation with `Task.ContinueWith`. `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Expose common async mistakes and misconceptions._

### Pitfalls
- ❓ What is "sync over async"? Why is calling `.Result` or `.Wait()` on a Task dangerous? `[INFERRED]`
- ❓ A developer wraps every async call in `Task.Run` "to make it truly async." Is this a good practice? Why or why not? `[INFERRED]`
- ❓ When is `async void` acceptable and why is it generally discouraged? `[INFERRED]`
- ❓ A developer added `ConfigureAwait(false)` everywhere in a library but the UI still freezes. What might be wrong? `[FROM JD]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how async/await works under the hood._

### ConfigureAwait
- ❓ What does `ConfigureAwait(false)` actually do under the hood? `[FROM JD]`
- ❓ In ASP.NET Core (not classic ASP.NET), is `ConfigureAwait(false)` necessary? Why? `[INFERRED]`

### Processing Tasks as They Complete
- ❓ You launch 10 tasks and want to process each result as soon as it finishes, not in the order they were started. How do you implement this? `[FROM JD]`

### CancellationToken Internals
- ❓ How does `CancellationToken` work internally? How does `CancellationTokenSource.Cancel()` notify all registered operations? `[FROM JD]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate judgment about async design patterns._

### Design Decisions
- ❓ Compare sequential `await`, `Task.WhenAll`, and `Task.WhenAny` for five independent DB queries. Which do you choose and why? `[INFERRED]`
- ❓ How do you decide when to expose a cancellation token parameter vs. using a timeout internally? `[INFERRED]`
- ❓ What are the trade-offs between `Task<T>` and `ValueTask<T>`? When does `ValueTask<T>` provide a measurable benefit? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Probe deep async knowledge and architecture-level thinking._

### Advanced Scenarios
- ❓ Describe a classic async deadlock in classic ASP.NET or WinForms. What causes it and how do you fix it? `[INFERRED]`
- ❓ What does the C# compiler generate for an `async` method? Describe the state machine at a high level. `[INFERRED]`
- ❓ Under high load your web API has low CPU but response times spike. How do you diagnose and fix thread pool starvation? `[INFERRED]`
- ❓ What is `IAsyncEnumerable<T>` and how does it differ from returning `Task<IEnumerable<T>>`? `[INFERRED]`
