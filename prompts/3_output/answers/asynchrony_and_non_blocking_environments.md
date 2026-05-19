# Answers: Asynchrony and Non-Blocking Environments

---

## Level 1 — Definition & Basics

**Q: In your own words, what does it mean for code to be "asynchronous"? How does it differ from synchronous execution?**

> **Bottom line:** Asynchronous code means you start an operation and move on without waiting for it to finish, rather than blocking until it completes.

**Elaboration:** With synchronous code, each line must finish before the next one starts — the thread sits idle waiting. Asynchronous code lets you hand off a long-running job, go do something else, and come back when the result is ready. In .NET, `async/await` is the language mechanism that makes this look sequential while behaving non-blocking under the hood.

---

**Q: What problem does asynchronous programming solve? Give a concrete everyday example where synchronous code would be harmful.**

> **Bottom line:** It solves the problem of wasting a thread — and blocking a user or a server — while waiting for slow external operations.

**Elaboration:** Think of a WPF or WinForms application that fetches data from a REST API synchronously on the UI thread. The window freezes, the user can't click anything, and Windows may even show "Not Responding." Async lets the UI thread stay responsive while the network call is in flight. The same principle applies in ASP.NET: a synchronously blocked thread is a thread that can't serve another request.

---

**Q: What is a thread, and what is the relationship between threads and asynchronous programming? Are they the same thing?**

> **Bottom line:** They are not the same thing — async is about freeing threads from waiting, not about creating more of them.

**Elaboration:** A thread is an OS-level unit of execution. Asynchrony is a programming model that says "don't pin a thread to this work while it's waiting on I/O." When you `await` a network call, no thread is sitting there blocked — the OS uses an I/O completion port and resumes the continuation only when data arrives. You can write highly concurrent async code that uses very few threads.

---

**Q: What does it mean for a call to be "blocking"? What does it mean to be "non-blocking"? Why does the distinction matter?**

> **Bottom line:** A blocking call holds the thread until the operation finishes; a non-blocking call returns immediately and notifies you when the work is done.

**Elaboration:** Blocking matters because threads are expensive — the CLR thread pool has limits, and a thread blocked on I/O is wasted capacity. In a web server, if every request blocks a thread waiting on a DB query, you saturate the thread pool under moderate load and requests start queuing. Non-blocking I/O keeps threads free to handle other work during the wait.

---

**Q: If a UI application calls a database synchronously on the main thread, what happens? How would making it asynchronous change that behavior?**

> **Bottom line:** The UI freezes because the main thread is blocked and can't process paint or input events.

**Elaboration:** The message loop that drives all UI rendering and user interaction runs on that same thread. If it's stuck waiting on a database round-trip, nothing else can happen — buttons don't respond, animations stop. Making the call async means the main thread returns to the message loop immediately, the UI stays live, and the continuation updates the UI once the data arrives.

---

**Q: Define the terms: Task, async, await, and continuation — as if explaining them to a junior developer joining your team.**

> **Bottom line:** A `Task` is a promise of future work; `async` marks a method that can yield; `await` is the yield point; and a continuation is what runs after the yield resumes.

**Elaboration:** Think of a `Task` like a ticket you get when you drop off dry cleaning — it represents work that will finish later. `async` tells the compiler to transform the method into a state machine. `await` says "pause here and give the thread back until this ticket is done." A continuation is the rest of the method after that pause — the compiler wires it up so it runs automatically when the awaited task completes.

---

**Q: What is a thread pool, and why is it relevant when talking about async/await in .NET?**

> **Bottom line:** The thread pool is a managed set of reusable threads, and async/await is designed to return threads to it as fast as possible rather than holding them blocked.

**Elaboration:** Creating threads is expensive, so .NET maintains a pool and recycles them. When you `await` an I/O-bound task, the thread goes back to the pool to serve other work. When the I/O completes, a pool thread picks up the continuation. This is why async/await dramatically increases throughput in web servers — one thread can interleave many concurrent I/O-bound requests.

---

## Level 2 — Core Concepts

**Q: What is the difference between an I/O-bound task and a CPU-bound task? Give one example of each.**

> **Bottom line:** I/O-bound tasks spend most of their time waiting on an external system; CPU-bound tasks spend most of their time executing on the processor.

**Elaboration:** Reading a file, making an HTTP request, or querying a database are I/O-bound — the CPU is idle during most of that work. Compressing an image, parsing a large JSON tree, or running a machine-learning inference are CPU-bound — the processor is fully engaged. The distinction drives which async pattern you should reach for.

---

**Q: Why does the I/O-bound vs CPU-bound distinction matter when choosing between `async/await` and `Task.Run`? What goes wrong if you use the wrong one?**

> **Bottom line:** Use `async/await` directly for I/O-bound work and `Task.Run` to offload CPU-bound work to the thread pool — mixing them up either wastes threads or blocks the UI.

**Elaboration:** For I/O-bound work, the underlying API is already asynchronous at the OS level, so you just `await` it — no extra thread needed. If you wrap I/O in `Task.Run`, you're burning a pool thread just to sit and wait, which is wasteful. For CPU-bound work, `Task.Run` is right because you genuinely need a background thread to crunch numbers without blocking the calling thread.

---

**Q: A developer wraps a database query with `Task.Run(() => db.Query(...))`. Is this a good idea? Why or why not?**

> **Bottom line:** No — it's async-over-sync: it wastes a thread pool thread just to block it on a synchronous I/O call.

**Elaboration:** If `db.Query` is a synchronous blocking call, wrapping it in `Task.Run` doesn't make the I/O non-blocking — it just moves the blocking to a different thread. You've spent a thread for nothing. The right fix is to use the async version of the API (`db.QueryAsync`) and await it directly, which uses true async I/O with no thread blocked during the wait.

---

**Q: What are the valid return types for an `async` method in C#? When would you choose `Task`, `Task<T>`, or `void`?**

> **Bottom line:** Use `Task` when there's no result to return, `Task<T>` when there is, and `async void` only for event handlers where you have no choice.

**Elaboration:** `Task` and `Task<T>` are awaitable and let callers observe completion and exceptions. `async void` swallows exceptions onto the `SynchronizationContext` and can't be awaited, so callers lose all visibility. Since C# 7 you also have `ValueTask` and `ValueTask<T>` for hot-path scenarios where the result is often available synchronously.

---

**Q: Why is `async void` generally considered dangerous outside of event handlers? What specific problem does it cause?**

> **Bottom line:** Because the caller can't await it, any exception thrown inside propagates to the `SynchronizationContext` and will typically crash the process.

**Elaboration:** With `async Task`, an exception is captured in the returned `Task` and re-thrown when awaited — the caller can catch it. With `async void`, there's no `Task` to hold the exception, so it's raised on whatever context is current, and in most app models that means an unhandled exception. It also makes testing and composition impossible since you can't await the method.

---

**Q: What is `ValueTask<T>` and when would you prefer it over `Task<T>`?**

> **Bottom line:** `ValueTask<T>` is a struct-based alternative to `Task<T>` that avoids a heap allocation when the result is already available synchronously.

**Elaboration:** Every `Task<T>` is a heap-allocated object. In hot-path code — like a cache lookup where the value is almost always in memory — you'd still allocate a `Task` just to return immediately. `ValueTask<T>` can represent a synchronous result without any allocation in that case. The trade-off is that `ValueTask` has stricter consumption rules: you can only await it once and shouldn't cache it.

---

**Q: Write a method `GetDataAsync()` that asynchronously fetches a string from a URL and returns it. Walk through every keyword you use and explain its role.**

> **Bottom line:** `async` signals the compiler to build a state machine; `await` is the suspension point that frees the thread until the HTTP response arrives.

**Elaboration:** `HttpClient.GetStringAsync` is a true async I/O method — no thread is blocked during the network round-trip. The `await` captures the continuation and the compiler wires up the rest of the method to run when the task completes. The return type is `Task<string>` so callers can await it and get exceptions surfaced normally.

```csharp
public async Task<string> GetDataAsync(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url);
}
```

---

**Q: What does `await` actually do at runtime? Does it block the calling thread? What happens to execution after the `await` line?**

> **Bottom line:** `await` does not block — it registers the rest of the method as a continuation and returns control to the caller immediately.

**Elaboration:** At compile time, the compiler splits the method at every `await` into states in a generated state machine. At runtime, if the awaited task isn't done yet, the current thread is released — it goes back to the thread pool or message loop. When the task completes, a thread (often from the pool) picks up the continuation from the state machine and resumes execution on the line after `await`.

---

**Q: How do you obtain the result value from a `Task<T>`? What are the different ways, and what are the risks of each?**

> **Bottom line:** Always use `await` to get the result — it's non-blocking, propagates exceptions cleanly, and doesn't risk deadlocks.

**Elaboration:** You can also access `.Result` or call `.Wait()`, but both block the calling thread synchronously. In contexts with a `SynchronizationContext` (WinForms, ASP.NET classic), this causes a deadlock: the continuation needs the context to resume, but the context is blocked waiting for `.Result`. `await` avoids all of this and is the right answer in virtually every case.

```csharp
// Correct
string data = await GetDataAsync(url);

// Risky — blocks the thread, can deadlock
string data = GetDataAsync(url).Result;
```

---

**Q: What is the difference between `Task.Delay` and `Thread.Sleep`? When would you use each one?**

> **Bottom line:** `Task.Delay` is non-blocking and async-friendly; `Thread.Sleep` blocks the current thread for the entire duration.

**Elaboration:** `Thread.Sleep` holds the thread captive — it can't do anything else during the wait. `Task.Delay` uses a timer and releases the thread immediately, resuming the continuation after the delay expires. In async methods you should always use `await Task.Delay(...)`. `Thread.Sleep` is only appropriate in blocking code where you genuinely want to park the thread, which is rare.

---

**Q: If you use `Thread.Sleep(2000)` inside an `async` method, what actually happens to the thread? Is this a problem?**

> **Bottom line:** The thread is fully blocked for 2 seconds — it can't serve any other async work during that time, which defeats the purpose of async.

**Elaboration:** The method is still marked `async`, but `Thread.Sleep` has no idea about async — it just blocks the OS thread. If this is the UI thread, the UI freezes. If this is a thread-pool thread handling an ASP.NET request, that thread is unavailable for other requests during the sleep. The fix is `await Task.Delay(2000)`.

---

## Level 3 — Practical Usage

**Q: You need to call three independent APIs and wait for all of them before proceeding. Which method do you use — `Task.WhenAll` or sequential awaits — and why?**

> **Bottom line:** `Task.WhenAll` — it fires all three requests concurrently and waits for all to finish, whereas sequential awaits would run them one after another.

**Elaboration:** If each call takes 500ms, sequential awaits cost 1500ms total. `Task.WhenAll` costs roughly 500ms because all three are in-flight simultaneously. Sequential awaits are only correct when each call depends on the result of the previous one.

```csharp
var t1 = GetUserAsync();
var t2 = GetOrdersAsync();
var t3 = GetInventoryAsync();
await Task.WhenAll(t1, t2, t3);
```

---

**Q: What is the difference between `Task.WhenAll` and `Task.WhenAny`? Describe a real scenario where `Task.WhenAny` is the right choice.**

> **Bottom line:** `WhenAll` completes when every task is done; `WhenAny` completes as soon as the first one finishes.

**Elaboration:** A classic use case for `WhenAny` is a timeout hedge: fire the real request and a `Task.Delay` timeout task together, then `WhenAny` to see which wins. Another is querying redundant servers and taking the fastest response. You do need to be careful with `WhenAny` to cancel or observe the remaining tasks so they don't leak.

```csharp
var dataTask = FetchDataAsync();
var timeoutTask = Task.Delay(TimeSpan.FromSeconds(5));
var winner = await Task.WhenAny(dataTask, timeoutTask);
if (winner == timeoutTask) throw new TimeoutException();
return await dataTask;
```

---

**Q: When would you use `Task.Wait()` or `.Result` instead of `await`? What trade-offs does that introduce?**

> **Bottom line:** Almost never — they're synchronous blocking calls that can deadlock in contexts with a `SynchronizationContext` and should be avoided except in very specific entry-point scenarios.

**Elaboration:** The one legitimate case is a synchronous `Main` method or test setup in older frameworks where you can't propagate async. Even then, you should understand that you're blocking a thread and accepting deadlock risk. In any app that has a synchronization context — WinForms, WPF, ASP.NET classic — calling `.Result` on a task that needs that context to resume will deadlock every time.

---

**Q: Explain `Task.ContinueWith`. When is it preferable to `await`, and what are its pitfalls?**

> **Bottom line:** `ContinueWith` chains a callback to run after a task completes, but `await` is almost always cleaner and safer for the same purpose.

**Elaboration:** `ContinueWith` predates `async/await` and is lower-level — you have to manually handle exceptions, scheduling, and cancellation. It doesn't capture the `SynchronizationContext` by default, so continuations may run on a pool thread unexpectedly. There are rare cases where `ContinueWith` is useful — attaching a continuation to a task you don't own without `await`-ing — but for normal code `await` is strictly better.

---

**Q: When should you use `Task.Run`? Write an example that correctly offloads a CPU-bound operation without blocking the UI thread.**

> **Bottom line:** Use `Task.Run` to push CPU-bound work off the calling thread — typically the UI thread — onto a thread-pool thread.

**Elaboration:** If you're computing something expensive (image processing, a large sort, heavy encryption) on a WPF main thread, the UI will freeze. `Task.Run` moves that work to a background thread while keeping the UI responsive. Don't use it just to wrap I/O — that wastes a thread for no benefit.

```csharp
private async void Button_Click(object sender, EventArgs e)
{
    var result = await Task.Run(() => HeavyComputation(data));
    label.Text = result.ToString();
}
```

---

**Q: Is it correct to use `Task.Run` inside an ASP.NET Core controller action? Why or why not?**

> **Bottom line:** Generally no — in ASP.NET Core there's no `SynchronizationContext`, so `Task.Run` just wastes a thread switch with no benefit.

**Elaboration:** ASP.NET Core already runs controller actions on thread-pool threads, and there's no UI thread to protect. Wrapping work in `Task.Run` just adds overhead: you're queueing to the pool from the pool. The right approach is to use async I/O APIs directly. The only exception is if you genuinely have CPU-bound work you want to parallelize, but even then `Task.Run` in a controller is suspicious.

---

**Q: What is a `CancellationToken` and how does it work? Walk through creating one, passing it to an async method, and cancelling it after a timeout.**

> **Bottom line:** A `CancellationToken` is a cooperative signal that lets you request cancellation of an async operation from outside it.

**Elaboration:** You create a `CancellationTokenSource`, extract its `.Token`, and pass that token to any async method that accepts one. The method periodically checks `token.IsCancellationRequested` or calls `token.ThrowIfCancellationRequested()`. You call `cts.Cancel()` to flip the signal. It's cooperative — the method has to opt in to honouring it.

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
try
{
    var result = await FetchDataAsync(cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Operation timed out or was cancelled.");
}
```

---

**Q: How would you implement a timeout on an async operation using `CancellationTokenSource`? Write the code.**

> **Bottom line:** Pass a `TimeSpan` to the `CancellationTokenSource` constructor and it will auto-cancel after that duration.

**Elaboration:** This is the cleanest way to add timeouts — no separate `Task.Delay` needed. The `OperationCanceledException` you catch on timeout is the same exception thrown for user-initiated cancellation, so you handle both in one place.

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
try
{
    var data = await httpClient.GetStringAsync(url, cts.Token);
}
catch (OperationCanceledException)
{
    // Either timed out or cancelled externally
}
```

---

**Q: What happens if a cancelled `CancellationToken` is passed to an operation that doesn't check it? How do you make a method cancellation-aware?**

> **Bottom line:** If the method doesn't check the token, it simply ignores the cancellation and runs to completion — the token has no magic, it's just a cooperative flag.

**Elaboration:** To make a method cancellation-aware, accept a `CancellationToken` parameter and either pass it to all inner async calls (which will check it themselves) or call `token.ThrowIfCancellationRequested()` at logical checkpoints in a CPU-heavy loop. The key word is cooperative — nothing forces the method to stop; it has to actively participate.

---

**Q: What exception is thrown when a cancellation is triggered? How should you handle it differently from other exceptions?**

> **Bottom line:** `OperationCanceledException` (or its subclass `TaskCanceledException`) is thrown, and it should typically be caught separately and treated as a normal control flow event, not an error.

**Elaboration:** Unlike `IOException` or `HttpRequestException`, cancellation usually means "the caller no longer needs this result" — it's expected, not exceptional. You should catch it, do any cleanup, and let it propagate or swallow it cleanly depending on the scenario. Don't log it as an error in production or wrap it in a generic error handler that alerts on it.

---

**Q: How do you correctly catch exceptions from an awaited `Task`? What happens if you do not await a faulted Task?**

> **Bottom line:** Wrap the `await` in a standard try/catch — exceptions from async methods re-surface there exactly as you'd expect.

**Elaboration:** If you don't await a faulted task, the exception is stored in the task object and no one observes it. In older .NET versions this caused an `UnobservedTaskException` to crash the process on GC. In modern .NET it's silently swallowed, which is arguably worse — you lose the error entirely. Always await tasks or explicitly handle their exceptions.

```csharp
try
{
    var result = await GetDataAsync();
}
catch (HttpRequestException ex)
{
    // Handles network errors surfaced from the async method
}
```

---

**Q: If you use `Task.WhenAll` and two of five tasks throw exceptions, what do you receive? How do you access all the individual exceptions?**

> **Bottom line:** `WhenAll` throws an `AggregateException` — but when you `await` it, only the first inner exception is re-thrown; to see all of them, inspect the task's `Exception.InnerExceptions`.

**Elaboration:** This trips people up. Awaiting `Task.WhenAll` unwraps the aggregate and throws only the first exception, so you can miss others. To get all failures, catch the aggregate on the task itself before awaiting, or check `task.Exception.InnerExceptions`.

```csharp
var task = Task.WhenAll(t1, t2, t3, t4, t5);
try
{
    await task;
}
catch
{
    foreach (var ex in task.Exception!.InnerExceptions)
        Console.WriteLine(ex.Message);
}
```

---

**Q: What is an `AggregateException` and when does it appear in async code? How do you unwrap it?**

> **Bottom line:** `AggregateException` is a container for one or more exceptions and appears when you call `.Wait()` or `.Result` on a faulted task, or when `Task.WhenAll` faults.

**Elaboration:** `await` automatically unwraps the first inner exception for you, which is why you rarely see `AggregateException` in normal async/await code. You only see it when using the blocking `.Result`/`.Wait()` APIs or `WhenAll`. To handle all inner exceptions, use `AggregateException.Handle(predicate)` or iterate `InnerExceptions`.

---

**Q: You fire off five async operations and want to process each result as soon as it finishes, rather than waiting for all five. How do you implement that?**

> **Bottom line:** Use `Task.WhenAny` in a loop — pull the first completed task out of a list, process it, remove it, and repeat until the list is empty.

**Elaboration:** This pattern ensures you never idle when results are available. Each iteration of the loop awaits the next task to finish, processes its result immediately, and continues. It's simple and requires no additional libraries, though for high-volume streaming `IAsyncEnumerable` or `System.Threading.Channels` may be a better fit.

```csharp
var tasks = new List<Task<Result>> { op1, op2, op3, op4, op5 };
while (tasks.Count > 0)
{
    var finished = await Task.WhenAny(tasks);
    tasks.Remove(finished);
    ProcessResult(await finished);
}
```

---

**Q: Compare `Task.WhenAll` followed by result processing vs using a channel or `IAsyncEnumerable` for streaming results. When does the latter approach matter?**

> **Bottom line:** `WhenAll` collects all results in memory first; streaming with `IAsyncEnumerable` or channels lets you process results incrementally as they arrive, which matters when the dataset is large or latency per item is critical.

**Elaboration:** If you're fetching 10,000 records from a database, buffering all of them in memory before processing is wasteful. `IAsyncEnumerable` lets you yield each item as soon as it's ready and process it, keeping memory flat. For producer/consumer decoupling with backpressure, `System.Threading.Channels` is the right primitive — it lets you control the buffer size and apply backpressure when the consumer is slower than the producer.

---

**Q: What does `ConfigureAwait(false)` do and why would you use it in a library method?**

> **Bottom line:** `ConfigureAwait(false)` tells the awaiter not to capture the current `SynchronizationContext`, so the continuation runs on a thread-pool thread rather than marshalling back to the original context.

**Elaboration:** In library code you usually don't need to resume on the UI thread or the ASP.NET request context — that's the application's concern. By using `ConfigureAwait(false)` throughout your library, you avoid unnecessary context switches and eliminate the deadlock risk when a caller blocks on your task with `.Result`.

```csharp
public async Task<string> LibraryMethodAsync()
{
    var data = await httpClient.GetStringAsync(url).ConfigureAwait(false);
    return Process(data);
}
```

---

**Q: In what type of application context is it most important to use `ConfigureAwait(false)`? What problem does it prevent?**

> **Bottom line:** It's most critical in library code consumed by apps with a `SynchronizationContext` — classic ASP.NET or WinForms/WPF — where it prevents deadlocks when callers block on async results.

**Elaboration:** The deadlock happens like this: the caller calls `.Result`, holding the sync context; the awaited continuation needs the sync context to resume; deadlock. `ConfigureAwait(false)` breaks the cycle by letting the continuation run on any thread-pool thread, bypassing the captured context entirely.

---

**Q: A developer says "I always add `ConfigureAwait(false)` everywhere just to be safe." Is this correct advice? Are there cases where you should not use it?**

> **Bottom line:** It's good advice for library code, but wrong in application code where you need to update UI or access context-bound objects after an await.

**Elaboration:** In WPF or WinForms, after an `await` you often update UI elements — that must happen on the UI thread. If you `ConfigureAwait(false)`, the continuation may run on a pool thread and you'll get a cross-thread exception. The rule of thumb is: use `ConfigureAwait(false)` in libraries, omit it in application code that cares about context.

---

## Level 4 — Common Pitfalls

**Q: Explain the classic async deadlock scenario in ASP.NET or WinForms. What sequence of calls produces it, and why?**

> **Bottom line:** The deadlock happens when you block synchronously on an async method that needs the captured `SynchronizationContext` to resume — the context is already blocked, so it never resumes.

**Elaboration:** In WinForms: the UI thread calls `asyncMethod().Result`. The `await` inside `asyncMethod` captures the UI sync context. When the I/O completes, the continuation tries to post back to the UI thread. But the UI thread is blocked on `.Result`. Neither side can proceed — classic deadlock. The fix is either `ConfigureAwait(false)` in the async method, or `async` all the way up.

---

**Q: A developer uses `.Result` on an awaited Task inside an ASP.NET 4.x controller. Walk through exactly why this deadlocks.**

> **Bottom line:** ASP.NET 4.x has a `SynchronizationContext` that only allows one thread at a time; `.Result` blocks that thread while the continuation waits to enter the same context.

**Elaboration:** The request thread holds the ASP.NET sync context. The inner `await` captures it. When the I/O completes, the continuation is scheduled to run on that context — but the context is occupied by the thread sitting on `.Result`. Neither can proceed. In ASP.NET Core this doesn't happen because there is no `SynchronizationContext`, but in classic ASP.NET it's a guaranteed deadlock.

---

**Q: What is the "async all the way down" principle? What happens when you violate it?**

> **Bottom line:** Every method in the call chain that uses `await` should itself be `async` and awaited by its caller — mixing sync blocking into the chain breaks async's non-blocking guarantee.

**Elaboration:** If any layer in the chain calls `.Result` or `.Wait()`, you've reintroduced blocking at that point. Besides deadlock risk, you lose the scalability benefit of async — a thread is pinned for the duration of that block. Violations usually happen at seams where async code meets synchronous infrastructure, like legacy interfaces or test runners.

---

**Q: What are the risks of fire-and-forget tasks (calling an async method without awaiting it)? How do you handle exceptions from them safely?**

> **Bottom line:** Exceptions are silently swallowed and you have no visibility into failures — the operation runs in the background with no error handling.

**Elaboration:** If the fire-and-forget method throws, the exception goes into an unobserved task. To handle this safely, wrap the call in a method that has its own try/catch and logs the exception, then call that wrapper without awaiting. You should also consider whether truly fire-and-forget is the right design, or whether a proper background service with error handling is warranted.

```csharp
_ = RunSafelyAsync(DoBackgroundWorkAsync());

async Task RunSafelyAsync(Task task)
{
    try { await task; }
    catch (Exception ex) { logger.LogError(ex, "Background task failed"); }
}
```

---

**Q: When is fire-and-forget acceptable, and what safeguards should surround it?**

> **Bottom line:** It's acceptable for low-stakes background work — logging, analytics, cache warming — where losing the operation on failure is tolerable.

**Elaboration:** The safeguards are: a try/catch with logging inside the async method, a timeout or cancellation token so it can't hang forever, and no shared mutable state that could corrupt if the operation fails silently. Anything involving user data, billing, or critical side effects should not be fire-and-forget.

---

**Q: A developer writes an `async void` method that throws. Where does the exception go, and what happens to the application?**

> **Bottom line:** The exception is re-raised on the `SynchronizationContext` that was active when the method was called, and in most app models that crashes the process.

**Elaboration:** There's no `Task` object to hold the exception, so the runtime raises it as an unhandled exception on whatever context is current. In ASP.NET or WPF that typically means `AppDomain.UnhandledException` fires and the process may terminate. It's completely uncatchable at the call site.

---

**Q: Besides event handlers, are there any other legitimate uses for `async void`? What would be a safer alternative?**

> **Bottom line:** Almost none — the only real case is event handlers, and even those can often be refactored to delegate to an `async Task` method.

**Elaboration:** Some people use `async void` in top-level program entry points in older frameworks, or in certain MSBuild task patterns, but these are niche. The safer pattern even for event handlers is a thin sync wrapper that calls an `async Task` method: `private void OnClick(...) => _ = OnClickAsync(...);`, then handle the exception inside `OnClickAsync`.

---

**Q: What is the difference between these two code snippets, and which is correct?**
```csharp
// A
var result = await GetDataAsync();
// B
var result = GetDataAsync().Result;
```

> **Bottom line:** A is correct — `await` is non-blocking and exception-safe; B blocks the thread synchronously and risks deadlock in contexts with a `SynchronizationContext`.

**Elaboration:** With B, if there's a sync context involved and the async method's continuation needs that context to resume, you deadlock. Even without a sync context, you're wasting a thread by blocking it. Additionally, `.Result` wraps exceptions in an `AggregateException`, so your catch blocks need to handle that differently. There's no scenario in modern code where B is preferable to A.

---

**Q: A developer marks a method `async` but never uses `await` inside it. What does the compiler do, and is there a performance cost?**

> **Bottom line:** The compiler generates a state machine anyway and emits a warning — the method runs synchronously but with the overhead of an unnecessary async wrapper.

**Elaboration:** The method will complete synchronously, but the compiler still allocates the state machine infrastructure. You get a CS1998 warning telling you this is probably a mistake. If you intentionally want to return a completed task, use `Task.FromResult(value)` or `Task.CompletedTask` instead of adding `async` for nothing.

---

**Q: What is "async over sync" (wrapping synchronous code in `Task.FromResult` or `Task.Run` unnecessarily)? Why is it harmful in library code?**

> **Bottom line:** It creates a false promise of async I/O, misleads callers about the method's behavior, and adds overhead without any actual non-blocking benefit.

**Elaboration:** If a library method returns `Task.FromResult(value)` wrapping a synchronous DB call, the caller gets a `Task` and assumes the work is non-blocking — but the blocking already happened before the method returned. `Task.Run` is worse because it still blocks a thread, just a different one. Library code should either use genuinely async APIs or be honest about being synchronous.

---

## Level 5 — Internals & Deep Mechanics

**Q: What does the C# compiler generate when it encounters an `async` method? Describe the state machine at a high level.**

> **Bottom line:** The compiler transforms the method into a struct-based state machine that tracks a current state, resumes execution at the right point when each awaited task completes, and captures all local variables as fields.

**Elaboration:** Each `await` becomes a state transition. The first time the method is called it starts in state 0. When it hits an `await`, it saves its local state and registers a callback on the task. When that task completes, the callback fires, advances the state counter, and re-enters the method body at the correct resumption point. Local variables become fields on the struct so they survive the yield.

---

**Q: Where does execution resume after `await` completes? Who is responsible for scheduling that continuation?**

> **Bottom line:** The continuation is scheduled by the awaiter — usually the task scheduler or `SynchronizationContext` — which posts it back to the appropriate thread or context.

**Elaboration:** If a `SynchronizationContext` was captured at the await point (and `ConfigureAwait(false)` wasn't used), the continuation is posted to that context. Otherwise it's scheduled on the `TaskScheduler.Current`, which typically means a thread-pool thread. The `TaskAwaiter` returned by `GetAwaiter()` is responsible for calling `OnCompleted` to register the callback.

---

**Q: What is the `SynchronizationContext` and what role does it play in how `await` resumes execution?**

> **Bottom line:** `SynchronizationContext` is an abstraction for "how to post work to the right thread" — and `await` uses it to ensure continuations run on the correct thread, like the UI thread.

**Elaboration:** Each app model can provide a custom `SynchronizationContext`. WinForms posts to the message loop, WPF uses the dispatcher, ASP.NET classic uses a request context. When you `await` without `ConfigureAwait(false)`, the current context is captured, and the continuation is posted through it. This is what lets you safely update UI after an `await` without manually marshalling to the UI thread.

---

**Q: When you `await` an I/O-bound operation, is a thread blocked waiting for it to complete? What is actually happening at the OS level?**

> **Bottom line:** No thread is blocked — the OS uses I/O completion ports (Windows) or similar async I/O mechanisms, and a thread-pool thread is only used when the result is ready to be processed.

**Elaboration:** The OS registers the I/O operation and the network stack or disk controller handles it in hardware. When the data arrives, the OS queues a completion notification, and the CLR's I/O completion port listener picks it up and schedules the continuation on a pool thread. The pool thread that initiated the request was released the moment `await` suspended — it's doing other work the whole time.

---

**Q: How does `Task.Run` interact with the thread pool? What happens if the thread pool is saturated?**

> **Bottom line:** `Task.Run` queues work to the thread pool, and if the pool is saturated, the work queues up until a thread becomes available, adding latency.

**Elaboration:** The thread pool has a minimum and maximum thread count. When max is reached, new work waits in the queue. The pool can inject new threads over time but slowly — one per second by default — so saturation under burst load causes significant queuing delays. This is thread pool starvation, and it's often triggered by sync-over-async patterns that hold pool threads blocked.

---

**Q: What is thread pool starvation in the context of async code? How would you diagnose and fix it?**

> **Bottom line:** Starvation happens when too many thread-pool threads are blocked — usually by sync-over-async code — leaving no threads available to process async continuations.

**Elaboration:** Symptoms are requests that suddenly take much longer than usual under load, even though individual operations are fast. To diagnose, look at thread counts with `dotnet-counters` or a memory dump — if you see hundreds of threads all blocked on `.Result` or `.Wait()`, that's starvation. The fix is to eliminate sync-over-async patterns and use async I/O throughout.

---

**Q: What is the difference between a "hot" Task and a "cold" Task? Which does `async/await` produce by default?**

> **Bottom line:** A hot task is already running; a cold task hasn't started yet — and `async/await` always produces hot tasks.

**Elaboration:** `Task` objects returned from async methods start executing immediately when the method is called — they're hot. A cold task would require manual starting via `task.Start()` — this is only possible with `Task` created via the constructor, which is rarely done. You should almost never create cold tasks in practice; async methods give you hot tasks, which is what you want.

---

**Q: How does `TaskCompletionSource<T>` work and when would you use it?**

> **Bottom line:** `TaskCompletionSource<T>` lets you manually control when a `Task<T>` completes, making it useful for bridging callback-based or event-based APIs into the async/await world.

**Elaboration:** You create a `TaskCompletionSource`, hand out its `.Task` to callers who await it, then call `SetResult`, `SetException`, or `SetCanceled` from wherever the real completion happens — a callback, an event handler, or another thread. It's the standard pattern for wrapping legacy event-driven code so it can participate in async call chains.

```csharp
public Task<string> WaitForResponseAsync()
{
    var tcs = new TaskCompletionSource<string>();
    _legacyClient.OnResponse += data => tcs.SetResult(data);
    _legacyClient.OnError += ex => tcs.SetException(ex);
    return tcs.Task;
}
```

---

**Q: What is the cost of creating a `Task` vs a `ValueTask`? In which scenarios does that cost become significant?**

> **Bottom line:** `Task` always allocates on the heap; `ValueTask` can avoid that allocation when the result is already available synchronously, which matters in high-frequency, tight-loop scenarios.

**Elaboration:** In normal application code the allocation cost of `Task` is negligible. It becomes significant in hot paths — a caching layer called millions of times per second where 95% of calls are cache hits. The `ValueTask` returns the cached value as a stack-allocated struct with zero heap cost. The trade-off is stricter usage rules and more complexity, so only reach for it when profiling shows the allocation is actually a problem.

---

## Level 6 — Trade-offs & Design Decisions

**Q: Not every method needs to be async. What criteria guide your decision to make a method async vs synchronous?**

> **Bottom line:** Make a method async if it performs I/O or calls other async methods — otherwise keep it synchronous and avoid unnecessary overhead.

**Elaboration:** The cost of async is real: compiler-generated state machine, potential allocations, and more complex stack traces. If a method just does in-memory computation, making it async adds noise with no benefit. The smell to watch for is wrapping synchronous work in `Task.FromResult` just to satisfy an interface — that's a sign the design needs rethinking.

---

**Q: You are writing a small CLI tool that makes a single HTTP request and exits. Should you use async/await? What are the trade-offs?**

> **Bottom line:** Yes, but primarily because `HttpClient` is async by design — the added complexity of async in a CLI is minimal and the alternatives are worse.

**Elaboration:** In a single-request CLI tool the scalability benefits of async don't matter, but using `httpClient.GetStringAsync` and awaiting it is simpler than forcing synchronous behavior via `.Result` or working around it. With `async Main` available since C# 7.1, there's no ceremony overhead. The trade-off is negligible.

---

**Q: Compare using async/await vs raw threads vs reactive extensions (Rx) for a high-throughput event processing scenario. When would each shine?**

> **Bottom line:** async/await is the default choice for I/O-driven work; raw threads for CPU-parallel work that needs explicit control; Rx for complex event streams with composition, filtering, and time-based operators.

**Elaboration:** async/await handles the vast majority of server-side concurrent I/O cleanly. Raw threads are appropriate when you need strict affinity, custom scheduling, or are working below the abstraction level of tasks. Rx (System.Reactive) shines when you're composing event sequences — debouncing, merging streams, windowing — where async/await's linear model becomes awkward. For most backend work, async/await gets you 95% of the way there.

---

**Q: What is the difference between asynchrony and parallelism? Can you have one without the other?**

> **Bottom line:** Asynchrony is about not waiting — freeing the caller while work happens; parallelism is about doing multiple things simultaneously on multiple cores — they're independent axes.

**Elaboration:** You can have async without parallelism: a single-threaded event loop (like early Node.js) handles thousands of concurrent connections asynchronously with one thread. You can have parallelism without async: `Parallel.For` runs CPU work on multiple threads synchronously from the caller's perspective. And you can have both: multiple async tasks running in parallel on the thread pool.

---

**Q: When would you use `Parallel.ForEach` instead of `Task.WhenAll` over an async delegate? What are the risks of mixing them incorrectly?**

> **Bottom line:** Use `Parallel.ForEach` for CPU-bound work you want to parallelize across cores; use `Task.WhenAll` for concurrent async I/O-bound operations.

**Elaboration:** `Parallel.ForEach` with an async delegate is a common trap — the loop doesn't actually wait for async work to complete because the async lambda returns a `Task` that `Parallel.ForEach` ignores. This means iterations may "complete" before their async work is done. For I/O-bound work over a collection, project to tasks and use `Task.WhenAll`. For CPU-bound work, use `Parallel.ForEach` with synchronous delegates.

---

**Q: You are writing a NuGet library used by many applications. What async-related API design rules would you follow?**

> **Bottom line:** Always use `ConfigureAwait(false)`, expose `CancellationToken` parameters, never expose sync-over-async wrappers, and use `Task`/`Task<T>` return types consistently.

**Elaboration:** Libraries have no idea what synchronization context the caller has, so `ConfigureAwait(false)` everywhere prevents deadlocks for callers who block on your tasks. Cancellation tokens should be optional with a default of `CancellationToken.None` to avoid breaking changes. Never ship a sync wrapper over async — it's always a footgun. Follow Microsoft's guidance: go async all the way or stay synchronous, never mix.

---

**Q: Should a library ever expose a synchronous wrapper over an async method? What are the risks, and what is the recommended guidance from Microsoft?**

> **Bottom line:** No — Microsoft's guidance is explicitly against it because there is no safe, general way to call async code synchronously from a library.

**Elaboration:** The problem is you don't know the caller's environment. Any blocking strategy (`.Result`, `GetAwaiter().GetResult()`, custom sync context) either risks deadlock or adds thread overhead. Stephen Toub's "should I expose async wrappers for synchronous methods" post is the canonical reference — the answer is no. If you need both, expose two separate implementations: one truly async, one truly synchronous.

---

**Q: At what point in your call stack should `CancellationToken` be introduced? Should it be optional or required? What does your choice signal to callers?**

> **Bottom line:** Introduce it at the top-level entry point and thread it all the way down; make it optional with a default of `CancellationToken.None` to avoid breaking existing callers.

**Elaboration:** The token should flow from the outermost boundary — HTTP request handler, message consumer, user gesture — down through every async method in the chain. Making it required signals that callers must always think about cancellation, which is heavy-handed for internal helpers. Optional with `CancellationToken.None` default is the pragmatic balance. The earlier you introduce it, the finer-grained your cancellation support.

---

**Q: How would you design a system that needs to cancel all in-flight operations when a user logs out?**

> **Bottom line:** Issue a user-scoped `CancellationTokenSource`, link it to individual operation tokens, and cancel the source on logout — all in-flight operations will observe cancellation through their linked tokens.

**Elaboration:** You'd maintain a `CancellationTokenSource` per user session, stored somewhere accessible to the request pipeline. Each incoming request creates a linked token source combining the user-level token with a per-request timeout. On logout, calling `userCts.Cancel()` cascades through all linked tokens. `CancellationTokenSource.CreateLinkedTokenSource` is the API for composing tokens from multiple sources.

---

## Level 7 — Advanced & Expert

**Q: In an ASP.NET Core service handling 10,000 concurrent requests, what specific async mistakes would cause latency to spike under load?**

> **Bottom line:** Thread pool starvation from sync-over-async patterns is the biggest culprit, followed by not using async I/O, excessive `Task.Run` usage, and missing `ConfigureAwait(false)` in library dependencies.

**Elaboration:** Sync-over-async (`.Result`/`.Wait()`) pins pool threads. If even a small percentage of requests do this under load, you exhaust the pool and new requests queue waiting for a thread. Missing async DB calls (synchronous EF or ADO.NET) has the same effect. `Task.Run` in controllers burns two thread switches per request for no benefit. These compound quickly at 10K concurrency.

---

**Q: What is backpressure, and how do you implement it in an async pipeline? Why does ignoring it lead to memory exhaustion?**

> **Bottom line:** Backpressure is the mechanism by which a slow consumer signals a fast producer to slow down, preventing unbounded buffer growth and memory exhaustion.

**Elaboration:** Without backpressure, a producer that generates items faster than the consumer can process them fills an unbounded queue that grows until OOM. `System.Threading.Channels` implements backpressure natively: a bounded channel blocks (or returns false on `TryWrite`) when full, forcing the producer to wait. This creates natural flow control without polling or custom throttling logic.

---

**Q: Describe how `System.Threading.Channels` works and how it compares to `BlockingCollection<T>` for producer/consumer scenarios.**

> **Bottom line:** `Channels` is async-native and non-blocking; `BlockingCollection<T>` is synchronous and blocks threads — use `Channels` for async pipelines, `BlockingCollection` only in purely synchronous contexts.

**Elaboration:** A `Channel<T>` gives you a `ChannelWriter` and `ChannelReader` with `WriteAsync`/`ReadAsync` methods that integrate naturally with `async/await` and `IAsyncEnumerable`. `BlockingCollection` uses a blocking `Take()` that pins a thread. Under load with many concurrent producers/consumers, `Channels` scales much better because no threads are blocked waiting for items.

---

**Q: What is `IAsyncEnumerable<T>` and how does it differ from returning a `Task<IEnumerable<T>>`?**

> **Bottom line:** `IAsyncEnumerable<T>` streams items one at a time as they become available; `Task<IEnumerable<T>>` buffers the entire result set before returning anything.

**Elaboration:** With `Task<IEnumerable<T>>`, the caller waits for all items and they all live in memory simultaneously. With `IAsyncEnumerable<T>`, the caller gets each item as soon as it's produced — ideal for database cursor reads, large file parsing, or event streams. Memory stays flat regardless of dataset size, and time-to-first-item is much lower.

```csharp
public async IAsyncEnumerable<Order> GetOrdersAsync([EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var row in dbReader.ReadAsync(ct))
        yield return Map(row);
}
```

---

**Q: How does `await foreach` interact with cancellation? How do you pass a `CancellationToken` into an `IAsyncEnumerable<T>` sequence?**

> **Bottom line:** Use `WithCancellation(token)` on the enumerable in the `await foreach` call, or decorate the producer parameter with `[EnumeratorCancellation]` so the token is injected automatically.

**Elaboration:** `await foreach (var item in source.WithCancellation(ct))` passes the token to the underlying enumerator's `MoveNextAsync`. On the producer side, marking the `CancellationToken` parameter with `[EnumeratorCancellation]` lets the compiler wire it up automatically when called via `WithCancellation`. This makes cancellation work transparently throughout the chain.

---

**Q: You need to implement a retry-with-timeout strategy for a flaky external API call. Design the solution using `CancellationTokenSource`, `Polly`, or both.**

> **Bottom line:** Use Polly for retry semantics and `CancellationTokenSource` for the overall timeout — they compose cleanly and each does what it's best at.

**Elaboration:** The overall deadline is a `CancellationTokenSource` with a `TimeSpan`. Pass its token to Polly's retry policy via `ExecuteAsync(ct => ..., ct)`. Polly handles the retry loop with exponential backoff; the `CancellationToken` ensures the entire operation stops when the deadline is exceeded, even mid-retry. Edge cases: ensure you reset the inner timeout per attempt if needed, and catch `OperationCanceledException` to distinguish timeout from user cancellation.

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var policy = Policy
    .Handle<HttpRequestException>()
    .WaitAndRetryAsync(3, i => TimeSpan.FromSeconds(Math.Pow(2, i)));

var result = await policy.ExecuteAsync(ct => client.GetStringAsync(url, ct), cts.Token);
```

---

**Q: How do you compose multiple `CancellationToken` sources (e.g., a user-triggered cancel AND a timeout)? What .NET API enables this?**

> **Bottom line:** Use `CancellationTokenSource.CreateLinkedTokenSource(token1, token2)` — the resulting token is cancelled when either source fires.

**Elaboration:** This is the idiomatic .NET pattern for composing cancellation signals. You might have an ASP.NET `HttpContext.RequestAborted` token (request cancelled) and a `CancellationTokenSource` timeout, and you want the operation to stop on whichever fires first. Dispose the linked source when done to avoid a memory leak from the internal registration.

```csharp
using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(requestToken, timeoutCts.Token);
await DoWorkAsync(linkedCts.Token);
```

---

**Q: You have a production service where some requests occasionally hang indefinitely. Walk through your methodology for diagnosing whether the root cause is an async deadlock, thread pool starvation, or an awaited operation that never completes.**

> **Bottom line:** Capture a process dump during the hang and inspect thread stacks — the pattern of blocked threads tells you which root cause you're dealing with.

**Elaboration:** Use `dotnet-dump collect` or attach WinDbg/lldb to get a dump. Thread pool starvation shows dozens of pool threads all blocked on `.Result` or `.Wait()`. A deadlock shows two threads waiting on each other or a single context-bound thread holding a lock the continuation needs. An operation that never completes shows a task awaiting a response from an external system that never arrived — check for missing timeouts or a socket that silently dropped. `dotnet-counters monitor` for `ThreadPool.Queue.Length` spiking is a fast live indicator of starvation.

---

**Q: What tooling would you use to trace async call chains and identify where time is spent in an async pipeline?**

> **Bottom line:** OpenTelemetry with `Activity` tracing is the best production-grade approach; Visual Studio's async-aware debugger and `dotnet-trace` cover local investigation.

**Elaboration:** In production, `System.Diagnostics.Activity` (the OpenTelemetry API) propagates trace context across async boundaries and services, giving you waterfall views of where time is spent. Locally, Visual Studio's parallel stacks and async call stack windows show the logical async call chain even across `await` boundaries. `dotnet-trace` with the `cpu-sampling` or `gc-verbose` provider captures allocation and CPU profiles. For thread pool specifically, `dotnet-counters` gives live thread queue depth and completed work items per second.

---

**Q: You are designing a microservice that must process a high-volume stream of events, call downstream APIs, and write results to a database — all with cancellation support and graceful shutdown.**

> **Bottom line:** Structure it as a `System.Threading.Channels`-backed pipeline: ingestion writes to a bounded channel, a worker pool reads and processes with linked cancellation tokens, and a `IHostedService` manages lifecycle and graceful drain.

**Elaboration:** The bounded channel provides backpressure so fast ingestion can't overwhelm slow DB writes. A `CancellationTokenSource` linked from `IHostApplicationLifetime.ApplicationStopping` flows through all workers, allowing graceful shutdown — workers finish their current item and exit cleanly. Each stage (ingest, process, write) runs as a separate set of `Task.Run` workers reading from and writing to channels. Retry logic (Polly) sits at the downstream API call layer. OpenTelemetry traces span the whole pipeline.

---

**Q: How does the actor model (e.g., Orleans, Akka.NET) relate to async programming? When would you reach for an actor framework instead of raw async/await?**

> **Bottom line:** Actors provide a higher-level concurrency model — each actor processes one message at a time, eliminating shared-state synchronization — whereas raw async/await leaves concurrency control to you.

**Elaboration:** With async/await, you're still responsible for thread safety when multiple async operations access shared state. Actors encapsulate state and serialize access through a message queue, so you get concurrent processing without locks or race conditions by design. I'd reach for Orleans or Akka.NET when the domain naturally maps to entities with independent state and lifecycles — like online game sessions, IoT device shadows, or user session management — where the overhead of the framework pays for itself in safety and scalability.

---
