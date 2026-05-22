# Answers: Asynchrony and Non-Blocking Environments

---

## Level 1 — Definition & Basics

**Q: L1 What is asynchronous code and how does it differ from synchronous execution?**

> Asynchronous code means you start an operation and move on without waiting for it to finish, rather than blocking until it completes.

With synchronous code, each line must finish before the next one starts — the thread sits idle waiting. Asynchronous code lets you hand off a long-running job, go do something else, and come back when the result is ready. In .NET, `async/await` is the language mechanism that makes this look sequential while behaving non-blocking under the hood.

```csharp
// Synchronous — blocks
string data = GetDataSync();
ProcessData(data);

// Asynchronous — doesn't block
string data = await GetDataAsync();
ProcessData(data);
```

---

**Q: L1 What problem does asynchronous programming solve? Give a concrete example.**

> It solves the problem of wasting a thread — and blocking a user or a server — while waiting for slow external operations.

Think of a WPF or WinForms application that fetches data from a REST API synchronously on the UI thread. The window freezes, the user can't click anything, and Windows may even show "Not Responding." Async lets the UI thread stay responsive while the network call is in flight. The same principle applies in ASP.NET: a synchronously blocked thread is a thread that can't serve another request.

---

**Q: L1 What is the relationship between threads and asynchronous programming?**

> They are not the same thing — async is about freeing threads from waiting, not about creating more of them.

A thread is an OS-level unit of execution. Asynchrony is a programming model that says "don't pin a thread to this work while it's waiting on I/O." When you `await` a network call, no thread is sitting there blocked — the OS uses an I/O completion port and resumes the continuation only when data arrives. You can write highly concurrent async code that uses very few threads.

---

**Q: L1 What's the difference between blocking and non-blocking calls, and why does it matter?**

> A blocking call holds the thread until the operation finishes; a non-blocking call returns immediately and notifies you when the work is done.

Blocking matters because threads are expensive — the CLR thread pool has limits, and a thread blocked on I/O is wasted capacity. In a web server, if every request blocks a thread waiting on a DB query, you saturate the thread pool under moderate load and requests start queuing. Non-blocking I/O keeps threads free to handle other work during the wait.

---

**Q: L1 What happens if a UI application calls a database synchronously on the main thread, and how does async change this?**

> The UI freezes because the main thread is blocked and can't process paint or input events.

The message loop that drives all UI rendering and user interaction runs on that same thread. If it's stuck waiting on a database round-trip, nothing else can happen — buttons don't respond, animations stop. Making the call async means the main thread returns to the message loop immediately, the UI stays live, and the continuation updates the UI once the data arrives.

---

**Q: L1 Define Task, async, await, and continuation.**

> A `Task` is a promise of future work; `async` marks a method that can yield; `await` is the yield point; and a continuation is what runs after the yield resumes.

Think of a `Task` like a ticket you get when you drop off dry cleaning — it represents work that will finish later. `async` tells the compiler to transform the method into a state machine. `await` says "pause here and give the thread back until this ticket is done." A continuation is the rest of the method after that pause — the compiler wires it up so it runs automatically when the awaited task completes.

---

**Q: L1 What is a thread pool, and why is it relevant when talking about async/await in .NET?**

> The thread pool is a managed set of reusable threads, and async/await is designed to return threads to it as fast as possible rather than holding them blocked.

Creating threads is expensive, so .NET maintains a pool and recycles them. When you `await` an I/O-bound task, the thread goes back to the pool to serve other work. When the I/O completes, a pool thread picks up the continuation. This is why async/await dramatically increases throughput in web servers — one thread can interleave many concurrent I/O-bound requests.

---

## Level 2 — Core Concepts

**Q: L2 What is the difference between an I/O-bound task and a CPU-bound task? Give one example of each.**

> I/O-bound tasks spend most of their time waiting on an external system; CPU-bound tasks spend most of their time executing on the processor.

Reading a file, making an HTTP request, or querying a database are I/O-bound — the CPU is idle during most of that work. Compressing an image, parsing a large JSON tree, or running a machine-learning inference are CPU-bound — the processor is fully engaged. The distinction drives which async pattern you should reach for.

```csharp
// I/O-bound — use async/await
public async Task<string> FetchDataAsync(string url)
{
    return await httpClient.GetStringAsync(url);
}

// CPU-bound — use Task.Run
public async Task<int> ComputeAsync(int[] data)
{
    return await Task.Run(() => data.Sum(x => ExpensiveCalculation(x)));
}
```

---

**Q: L2 Why does the I/O-bound vs CPU-bound distinction matter when choosing between `async/await` and `Task.Run`?**

> Use `async/await` directly for I/O-bound work and `Task.Run` to offload CPU-bound work to the thread pool — mixing them up wastes threads or blocks the UI.

For I/O-bound work, the OS API is already async, so you just `await` it. Wrapping I/O in `Task.Run` wastes a pool thread on blocking. CPU-bound work genuinely needs a background thread to avoid blocking the caller.

---

**Q: L2 Is it a good idea to wrap a database query with `Task.Run(() => db.Query(...))`?**

> No — it's async-over-sync: it wastes a thread pool thread just to block it on a synchronous I/O call.

If `db.Query` is a synchronous blocking call, wrapping it in `Task.Run` doesn't make the I/O non-blocking — it just moves the blocking to a different thread. You've spent a thread for nothing. The right fix is to use the async version of the API (`db.QueryAsync`) and await it directly, which uses true async I/O with no thread blocked during the wait.

```csharp
// Bad — wastes a thread pool thread blocking on sync I/O
var result = await Task.Run(() => db.Query<User>("SELECT..."));

// Good — true async I/O, no thread blocked
var result = await db.QueryAsync<User>("SELECT...");
```

---

**Q: L2 What are the valid return types for an `async` method and when would you use each?**

> Use `Task` when there's no result to return, `Task<T>` when there is, and `async void` only for event handlers where you have no choice.

`Task` and `Task<T>` are awaitable and let callers observe completion and exceptions. `async void` swallows exceptions onto the `SynchronizationContext` and can't be awaited, so callers lose all visibility. Since C# 7 you also have `ValueTask` and `ValueTask<T>` for hot-path scenarios where the result is often available synchronously.

---

**Q: L2 Why is `async void` dangerous outside of event handlers?**

> Because the caller can't await it, any exception thrown inside propagates to the `SynchronizationContext` and will typically crash the process.

With `async Task`, an exception is captured in the returned `Task` and re-thrown when awaited — the caller can catch it. With `async void`, there's no `Task` to hold the exception, so it's raised on whatever context is current, and in most app models that means an unhandled exception. It also makes testing and composition impossible since you can't await the method.

```csharp
// Dangerous — exception crashes the process
public async void DoWorkAsync()
{
    throw new InvalidOperationException("Oops!");  // unhandled, crashes
}

// Safe — exception is caught and handled
public async Task DoWorkAsync()
{
    throw new InvalidOperationException("Oops!");  // captured, can be caught
}

try
{
    await DoWorkAsync();  // can catch the exception
}
catch (InvalidOperationException) { }
```

---

**Q: L2 When would you use `ValueTask<T>` instead of `Task<T>`?**

> `ValueTask<T>` is a struct-based alternative to `Task<T>` that avoids a heap allocation when the result is already available synchronously.

Every `Task<T>` is a heap-allocated object. In hot-path code — like a cache lookup where the value is almost always in memory — you'd still allocate a `Task` just to return immediately. `ValueTask<T>` can represent a synchronous result without any allocation in that case. The trade-off is that `ValueTask` has stricter consumption rules: you can only await it once and shouldn't cache it.

```csharp
// Hot path with cache — ValueTask avoids allocation when hit
public async ValueTask<User> GetUserAsync(int id)
{
    if (_cache.TryGetValue(id, out var user))
        return user;  // no allocation, result already available
    
    return await _httpClient.GetAsync($"/users/{id}");
}
```

---

**Q: L2 Write a method `GetDataAsync()` that fetches a string from a URL and explain each keyword.**

> `async` signals the compiler to build a state machine; `await` is the suspension point that frees the thread until the HTTP response arrives.

`HttpClient.GetStringAsync` is a true async I/O method — no thread is blocked during the network round-trip. The `await` captures the continuation and the compiler wires up the rest of the method to run when the task completes. The return type is `Task<string>` so callers can await it and get exceptions surfaced normally.

```csharp
public async Task<string> GetDataAsync(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url);
}
```

---

**Q: L2 What does `await` do at runtime? Does it block the thread?**

> `await` does not block — it registers the rest of the method as a continuation and returns control to the caller immediately.

At compile time, the compiler splits the method at every `await` into states in a generated state machine. At runtime, if the awaited task isn't done yet, the current thread is released — it goes back to the thread pool or message loop. When the task completes, a thread (often from the pool) picks up the continuation from the state machine and resumes execution on the line after `await`.

---

**Q: L2 How do you obtain the result value from a `Task<T>` and what are the risks?**

> Always use `await` to get the result — it's non-blocking, propagates exceptions cleanly, and doesn't risk deadlocks.

You can also access `.Result` or call `.Wait()`, but both block the calling thread synchronously. In contexts with a `SynchronizationContext` (WinForms, ASP.NET classic), this causes a deadlock: the continuation needs the context to resume, but the context is blocked waiting for `.Result`. `await` avoids all of this and is the right answer in virtually every case.

```csharp
// Correct
string data = await GetDataAsync(url);

// Risky — blocks the thread, can deadlock
string data = GetDataAsync(url).Result;
```

---

**Q: L2 What's the difference between `Task.Delay` and `Thread.Sleep`?**

> `Task.Delay` is non-blocking and async-friendly; `Thread.Sleep` blocks the current thread for the entire duration.

`Thread.Sleep` holds the thread captive — it can't do anything else during the wait. `Task.Delay` uses a timer and releases the thread immediately, resuming the continuation after the delay expires. In async methods you should always use `await Task.Delay(...)`. `Thread.Sleep` is only appropriate in blocking code where you genuinely want to park the thread, which is rare.

---

**Q: L2 What happens if you use `Thread.Sleep(2000)` inside an `async` method?**

> The thread is fully blocked for 2 seconds — it can't serve any other async work during that time, which defeats the purpose of async.

The method is still marked `async`, but `Thread.Sleep` has no idea about async — it just blocks the OS thread. If this is the UI thread, the UI freezes. If this is a thread-pool thread handling an ASP.NET request, that thread is unavailable for other requests during the sleep. The fix is `await Task.Delay(2000)`.

```csharp
// Bad — blocks the thread completely
public async Task DoWorkAsync()
{
    Thread.Sleep(2000);  // 2 seconds of wasted thread capacity
}

// Good — releases the thread
public async Task DoWorkAsync()
{
    await Task.Delay(2000);  // thread is free to do other work
}
```

---

## Level 3 — Practical Usage

**Q: L3 When calling three independent APIs, should you use `Task.WhenAll` or sequential awaits?**

> `Task.WhenAll` — it fires all three requests concurrently and waits for all to finish, whereas sequential awaits would run them one after another.

If each call takes 500ms, sequential awaits cost 1500ms total. `Task.WhenAll` costs roughly 500ms because all three are in-flight simultaneously. Sequential awaits are only correct when each call depends on the result of the previous one.

```csharp
var t1 = GetUserAsync();
var t2 = GetOrdersAsync();
var t3 = GetInventoryAsync();
await Task.WhenAll(t1, t2, t3);
```

---

**Q: L3 What's the difference between `Task.WhenAll` and `Task.WhenAny`?**

> `WhenAll` completes when every task is done; `WhenAny` completes as soon as the first one finishes.

A classic use case for `WhenAny` is a timeout hedge: fire the real request and a `Task.Delay` timeout task together, then `WhenAny` to see which wins. Another is querying redundant servers and taking the fastest response. You do need to be careful with `WhenAny` to cancel or observe the remaining tasks so they don't leak.

```csharp
var dataTask = FetchDataAsync();
var timeoutTask = Task.Delay(TimeSpan.FromSeconds(5));
var winner = await Task.WhenAny(dataTask, timeoutTask);
if (winner == timeoutTask) throw new TimeoutException();
return await dataTask;
```

---

**Q: L3 What is `Task.ContinueWith` and when is it preferable to `await`?**

> `ContinueWith` chains a callback to run after a task completes, but `await` is almost always cleaner and safer.

`ContinueWith` is lower-level and requires manual exception and cancellation handling. It doesn't capture `SynchronizationContext` by default, so continuations may run unexpectedly on a pool thread. Use it only for attaching continuations to tasks you don't own; otherwise `await` is strictly better.

```csharp
// Awkward and error-prone
GetDataAsync().ContinueWith(task => 
{
    if (task.IsFaulted) { /* handle error */ }
    else { var data = task.Result; /* use data */ }
});

// Clean and natural
var data = await GetDataAsync();  // exceptions bubble normally
```

---

**Q: L3 When should you use `Task.Run`? Write an example.**

> Use `Task.Run` to push CPU-bound work off the calling thread — typically the UI thread — onto a thread-pool thread.

If you're computing something expensive (image processing, a large sort, heavy encryption) on a WPF main thread, the UI will freeze. `Task.Run` moves that work to a background thread while keeping the UI responsive. Don't use it just to wrap I/O — that wastes a thread for no benefit.

```csharp
private async void Button_Click(object sender, EventArgs e)
{
    var result = await Task.Run(() => HeavyComputation(data));
    label.Text = result.ToString();
}
```

---

**Q: L3 Should you use `Task.Run` inside an ASP.NET Core controller action?**

> Generally no — in ASP.NET Core there's no `SynchronizationContext`, so `Task.Run` just wastes a thread switch.

Controller actions already run on thread-pool threads. Wrapping work in `Task.Run` just queues to the pool from the pool — pure overhead. Use async I/O APIs directly instead. The only exception is genuine CPU-bound work, and even then it's suspicious in a controller.

---

**Q: L3 What is a `CancellationToken` and how does it work?**

> A `CancellationToken` is a cooperative signal that lets you request cancellation of an async operation from outside it.

You create a `CancellationTokenSource`, extract its `.Token`, and pass that token to any async method that accepts one. The method periodically checks `token.IsCancellationRequested` or calls `token.ThrowIfCancellationRequested()`. You call `cts.Cancel()` to flip the signal. It's cooperative — the method has to opt in to honouring it.

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

**Q: L3 How do you implement a timeout using `CancellationTokenSource`?**

> Pass a `TimeSpan` to the `CancellationTokenSource` constructor and it will auto-cancel after that duration.

This is the cleanest way to add timeouts — no separate `Task.Delay` needed. The `OperationCanceledException` you catch on timeout is the same exception thrown for user-initiated cancellation, so you handle both in one place.

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

**Q: L3 What happens if a method doesn't check a cancelled `CancellationToken`?**

> If the method doesn't check the token, it ignores cancellation and runs to completion — the token has no magic, it's just a cooperative flag.

Make a method cancellation-aware by passing the token to all inner async calls (which check it themselves) or calling `token.ThrowIfCancellationRequested()` at logical checkpoints. Nothing forces the method to stop; it must actively participate.

---

**Q: L3 What exception is thrown during cancellation and how should you handle it?**

> `OperationCanceledException` (or its subclass `TaskCanceledException`) is thrown, and it should typically be caught separately and treated as a normal control flow event, not an error.

Unlike `IOException` or `HttpRequestException`, cancellation usually means "the caller no longer needs this result" — it's expected, not exceptional. You should catch it, do any cleanup, and let it propagate or swallow it cleanly depending on the scenario. Don't log it as an error in production or wrap it in a generic error handler that alerts on it.

---

**Q: L3 How do you catch exceptions from awaited tasks? What happens if you don't await a faulted task?**

> Wrap the `await` in a standard try/catch — exceptions from async methods re-surface there exactly as you'd expect.

If you don't await a faulted task, the exception is stored in the task object and no one observes it. In older .NET versions this caused an `UnobservedTaskException` to crash the process on GC. In modern .NET it's silently swallowed, which is arguably worse — you lose the error entirely. Always await tasks or explicitly handle their exceptions.

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

**Q: L3 If `Task.WhenAll` has multiple failures, how do you access all exceptions?**

> `WhenAll` throws an `AggregateException`, but awaiting it unwraps and re-throws only the first inner exception. To see all failures, inspect `task.Exception.InnerExceptions`.

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

**Q: L3 How do you process results as they finish instead of waiting for all to complete?**

> Use `Task.WhenAny` in a loop — pull the first completed task out of a list, process it, remove it, and repeat until the list is empty.

This pattern ensures you never idle when results are available. Each iteration of the loop awaits the next task to finish, processes its result immediately, and continues. It's simple and requires no additional libraries, though for high-volume streaming `IAsyncEnumerable` or `System.Threading.Channels` may be a better fit.

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

**Q: L3 When would you use a channel or `IAsyncEnumerable` instead of `Task.WhenAll`?**

> `WhenAll` collects all results in memory first; streaming with `IAsyncEnumerable` or channels lets you process results incrementally as they arrive, which matters when the dataset is large or latency per item is critical.

If you're fetching 10,000 records from a database, buffering all of them in memory before processing is wasteful. `IAsyncEnumerable` lets you yield each item as soon as it's ready and process it, keeping memory flat. For producer/consumer decoupling with backpressure, `System.Threading.Channels` is the right primitive — it lets you control the buffer size and apply backpressure when the consumer is slower than the producer.

---

**Q: L3 What does `ConfigureAwait(false)` do and when would you use it?**

> `ConfigureAwait(false)` tells the awaiter not to capture the current `SynchronizationContext`, so the continuation runs on a thread-pool thread rather than marshalling back to the original context.

In library code you usually don't need to resume on the UI thread or the ASP.NET request context — that's the application's concern. By using `ConfigureAwait(false)` throughout your library, you avoid unnecessary context switches and eliminate the deadlock risk when a caller blocks on your task with `.Result`.

```csharp
public async Task<string> LibraryMethodAsync()
{
    var data = await httpClient.GetStringAsync(url).ConfigureAwait(false);
    return Process(data);
}
```

---

**Q: L3 In what contexts is `ConfigureAwait(false)` most important?**

> It's most critical in library code consumed by apps with a `SynchronizationContext` — classic ASP.NET or WinForms/WPF — where it prevents deadlocks when callers block on async results.

The deadlock happens like this: the caller calls `.Result`, holding the sync context; the awaited continuation needs the sync context to resume; deadlock. `ConfigureAwait(false)` breaks the cycle by letting the continuation run on any thread-pool thread, bypassing the captured context entirely.

---

**Q: L3 Is it good advice to always add `ConfigureAwait(false)` everywhere?**

> It's good advice for library code, but wrong in application code where you need to update UI or access context-bound objects after an await.

In WPF or WinForms, after an `await` you often update UI elements — that must happen on the UI thread. If you `ConfigureAwait(false)`, the continuation may run on a pool thread and you'll get a cross-thread exception. The rule of thumb is: use `ConfigureAwait(false)` in libraries, omit it in application code that cares about context.

---

## Level 4 — Common Pitfalls

**Q: L4 Why does using `.Result` on an awaited task deadlock in ASP.NET 4.x?**

> ASP.NET 4.x has a `SynchronizationContext` that only allows one thread at a time; `.Result` blocks that thread while the continuation waits to enter the same context.

The request thread holds the ASP.NET sync context. The inner `await` captures it. When the I/O completes, the continuation is scheduled to run on that context — but the context is occupied by the thread sitting on `.Result`. Neither can proceed. In ASP.NET Core this doesn't happen because there is no `SynchronizationContext`, but in classic ASP.NET it's a guaranteed deadlock.

---

**Q: L4 What is the "async all the way down" principle?**

> Every method in the call chain that uses `await` should itself be `async` and awaited by its caller — mixing sync blocking into the chain breaks async's non-blocking guarantee.

If any layer in the chain calls `.Result` or `.Wait()`, you've reintroduced blocking at that point. Besides deadlock risk, you lose the scalability benefit of async — a thread is pinned for the duration of that block. Violations usually happen at seams where async code meets synchronous infrastructure, like legacy interfaces or test runners.

---

**Q: L4 What are the risks of fire-and-forget tasks and how do you handle them safely?**

> Exceptions are silently swallowed and you have no visibility into failures — the operation runs in the background with no error handling.

If the fire-and-forget method throws, the exception goes into an unobserved task. To handle this safely, wrap the call in a method that has its own try/catch and logs the exception, then call that wrapper without awaiting. You should also consider whether truly fire-and-forget is the right design, or whether a proper background service with error handling is warranted.

```csharp
_ = RunSafelyAsync(DoBackgroundWorkAsync());

async Task RunSafelyAsync(Task task)
{
    try { await task; }
    catch (Exception ex) { logger.LogError(ex, "Background task failed"); }
}
```

---

**Q: L4 When is fire-and-forget acceptable?**

> It's acceptable for low-stakes background work — logging, analytics, cache warming — where losing the operation on failure is tolerable.

The safeguards are: a try/catch with logging inside the async method, a timeout or cancellation token so it can't hang forever, and no shared mutable state that could corrupt if the operation fails silently. Anything involving user data, billing, or critical side effects should not be fire-and-forget.

---

**Q: L4 Are there legitimate uses for `async void` besides event handlers?**

> Almost none — only event handlers are defensible, and those can be refactored to delegate to an `async Task` method.

The safer pattern is a thin sync wrapper calling `async Task`: `private void OnClick(...) => _ = OnClickAsync(...);`, then handle exceptions inside `OnClickAsync`.

---

**Q: L4 What is "async over sync" and why is it harmful?**

> It creates a false promise of async I/O, misleads callers about the method's behavior, and adds overhead without any actual non-blocking benefit.

If a library method returns `Task.FromResult(value)` wrapping a synchronous DB call, the caller gets a `Task` and assumes the work is non-blocking — but the blocking already happened before the method returned. `Task.Run` is worse because it still blocks a thread, just a different one. Library code should either use genuinely async APIs or be honest about being synchronous.

```csharp
// Misleading — blocks before returning
public Task<User> GetUserAsync(int id)
{
    var user = _db.Users.FirstOrDefault(u => u.Id == id);  // BLOCKS HERE
    return Task.FromResult(user);
}

// Honest — be synchronous
public User GetUser(int id)
{
    return _db.Users.FirstOrDefault(u => u.Id == id);
}

// Right way — true async
public async Task<User> GetUserAsync(int id)
{
    return await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
}
```

---

## Level 6 — Trade-offs & Design Decisions

**Q: L6 When should you make a method async vs synchronous?**

> Make a method async if it performs I/O or calls other async methods — otherwise keep it synchronous and avoid unnecessary overhead.

The cost of async is real: compiler-generated state machine, potential allocations, and more complex stack traces. If a method just does in-memory computation, making it async adds noise with no benefit. The smell to watch for is wrapping synchronous work in `Task.FromResult` just to satisfy an interface — that's a sign the design needs rethinking.

```csharp
// Keep synchronous — no I/O, just computation
public int Sum(int[] numbers)
{
    return numbers.Sum();
}

// Make async — calls other async methods or does I/O
public async Task<List<User>> GetActiveUsersAsync()
{
    var all = await _db.GetAllUsersAsync();
    return all.Where(u => u.IsActive).ToList();
}
```

---

**Q: L6 Should you use async/await in a CLI tool that makes a single HTTP request?**

> Yes, but primarily because `HttpClient` is async by design — the added complexity of async in a CLI is minimal and the alternatives are worse.

In a single-request CLI tool the scalability benefits of async don't matter, but using `httpClient.GetStringAsync` and awaiting it is simpler than forcing synchronous behavior via `.Result` or working around it. With `async Main` available since C# 7.1, there's no ceremony overhead. The trade-off is negligible.

---

**Q: L6 Compare async/await, raw threads, and Rx for high-throughput event processing.**

> async/await is the default choice for I/O-driven work; raw threads for CPU-parallel work that needs explicit control; Rx for complex event streams with composition, filtering, and time-based operators.

async/await handles the vast majority of server-side concurrent I/O cleanly. Raw threads are appropriate when you need strict affinity, custom scheduling, or are working below the abstraction level of tasks. Rx (System.Reactive) shines when you're composing event sequences — debouncing, merging streams, windowing — where async/await's linear model becomes awkward. For most backend work, async/await gets you 95% of the way there.

---

**Q: L6 What's the difference between asynchrony and parallelism?**

> Asynchrony is about not waiting — freeing the caller while work happens; parallelism is about doing multiple things simultaneously on multiple cores — they're independent axes.

You can have async without parallelism: a single-threaded event loop (like early Node.js) handles thousands of concurrent connections asynchronously with one thread. You can have parallelism without async: `Parallel.For` runs CPU work on multiple threads synchronously from the caller's perspective. And you can have both: multiple async tasks running in parallel on the thread pool.

---

**Q: L6 When would you use `Parallel.ForEach` instead of `Task.WhenAll`?**

> Use `Parallel.ForEach` for CPU-bound work you want to parallelize across cores; use `Task.WhenAll` for concurrent async I/O-bound operations.

`Parallel.ForEach` with an async delegate is a common trap — the loop doesn't actually wait for async work to complete because the async lambda returns a `Task` that `Parallel.ForEach` ignores. This means iterations may "complete" before their async work is done. For I/O-bound work over a collection, project to tasks and use `Task.WhenAll`. For CPU-bound work, use `Parallel.ForEach` with synchronous delegates.

```csharp
// Trap — returns before async work completes
Parallel.ForEach(users, async user =>
{
    await ProcessUserAsync(user);  // ignored, not awaited
});

// Correct — wait for all
var tasks = users.Select(u => ProcessUserAsync(u));
await Task.WhenAll(tasks);

// Parallel for CPU-bound sync work
Parallel.ForEach(bigData, item =>
{
    var result = ExpensiveComputation(item);  // CPU-bound, sync
});
```

---

**Q: L6 What async-related API design rules should you follow for a NuGet library?**

> Always use `ConfigureAwait(false)`, expose optional `CancellationToken` parameters, never expose sync-over-async wrappers, and use `Task`/`Task<T>` consistently.

Libraries don't know the caller's context, so `ConfigureAwait(false)` prevents deadlocks. Make tokens optional with `CancellationToken.None` default. Never ship sync wrappers over async — it's dangerous. Follow Microsoft's guidance: go async all the way or stay synchronous, never mix.

---

**Q: L6 Should a library expose a synchronous wrapper over an async method?**

> No — there's no safe, general way to call async code synchronously from a library.

You don't know the caller's environment. Any blocking strategy (`.Result`, `GetAwaiter().GetResult()`) risks deadlock or adds overhead. If you need both, expose two separate implementations: one truly async, one truly synchronous.

```csharp
// Bad — wrapping async in sync is unsafe
public User GetUser(int id)
{
    return GetUserAsync(id).Result;  // risks deadlock
}

// Good — separate implementations, let callers choose
public async Task<User> GetUserAsync(int id)
{
    return await _db.GetUserAsync(id);
}

public User GetUser(int id)
{
    return _db.GetUser(id);  // truly sync, no wrapping
}
```

---

**Q: L6 At what point should `CancellationToken` be introduced in your call stack?**

> Introduce it at the top-level entry point and thread it all the way down; make it optional with a default of `CancellationToken.None` to avoid breaking existing callers.

The token should flow from the outermost boundary — HTTP request handler, message consumer, user gesture — down through every async method in the chain. Making it optional with `CancellationToken.None` default is the pragmatic balance.

---

## Level 7 — Advanced Patterns

**Q: L7 What is backpressure and how do you implement it in async pipelines?**

> Backpressure is the mechanism by which a slow consumer signals a fast producer to slow down, preventing unbounded buffer growth and memory exhaustion.

Without backpressure, a producer that generates items faster than the consumer can process them fills an unbounded queue that grows until OOM. `System.Threading.Channels` implements backpressure natively: a bounded channel blocks (or returns false on `TryWrite`) when full, forcing the producer to wait. This creates natural flow control without polling or custom throttling logic.

```csharp
// No backpressure — unbounded growth, memory leak
var unboundedQueue = new Queue<Item>();
while (ProducerRunning)
{
    unboundedQueue.Enqueue(item);  // grows forever if consumer slow
}

// With backpressure — bounded channel pauses producer
var channel = Channel.CreateBounded<Item>(capacity: 100);
await channel.Writer.WriteAsync(item);  // pauses if queue full
var item = await channel.Reader.ReadAsync();  // consumer drains
```

---

**Q: L7 How does `System.Threading.Channels` compare to `BlockingCollection<T>`?**

> `Channels` is async-native and non-blocking; `BlockingCollection<T>` is synchronous and blocks threads — use `Channels` for async pipelines, `BlockingCollection` only in purely synchronous contexts.

A `Channel<T>` gives you a `ChannelWriter` and `ChannelReader` with `WriteAsync`/`ReadAsync` methods that integrate naturally with `async/await` and `IAsyncEnumerable`. `BlockingCollection` uses a blocking `Take()` that pins a thread. Under load with many concurrent producers/consumers, `Channels` scales much better because no threads are blocked waiting for items.

```csharp
// Channels — async-native, non-blocking
var channel = Channel.CreateBounded<int>(capacity: 100);
await channel.Writer.WriteAsync(value);
var item = await channel.Reader.ReadAsync();

// BlockingCollection — blocks threads
var collection = new BlockingCollection<int>(boundedCapacity: 100);
collection.Add(value);  // blocks if full
var item = collection.Take();  // blocks if empty
```

---

**Q: L7 How does `IAsyncEnumerable<T>` differ from `Task<IEnumerable<T>>`?**

> `IAsyncEnumerable<T>` streams items one at a time as they become available; `Task<IEnumerable<T>>` buffers the entire result set before returning anything.

With `Task<IEnumerable<T>>`, the caller waits for all items and they all live in memory simultaneously. With `IAsyncEnumerable<T>`, the caller gets each item as soon as it's produced — ideal for database cursor reads, large file parsing, or event streams. Memory stays flat regardless of dataset size, and time-to-first-item is much lower.

```csharp
public async IAsyncEnumerable<Order> GetOrdersAsync([EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var row in dbReader.ReadAsync(ct))
        yield return Map(row);
}
```

---

**Q: L7 How do you pass a `CancellationToken` into an `IAsyncEnumerable<T>`?**

> Use `WithCancellation(token)` on the enumerable in the `await foreach` call, or decorate the producer parameter with `[EnumeratorCancellation]` so the token is injected automatically.

`await foreach (var item in source.WithCancellation(ct))` passes the token to the underlying enumerator's `MoveNextAsync`. On the producer side, marking the `CancellationToken` parameter with `[EnumeratorCancellation]` lets the compiler wire it up automatically when called via `WithCancellation`. This makes cancellation work transparently throughout the chain.

---

**Q: L7 How do you implement retry-with-timeout for an external API call?**

> Use Polly for retry semantics and `CancellationTokenSource` for the overall timeout — they compose cleanly and each does what it's best at.

The overall deadline is a `CancellationTokenSource` with a `TimeSpan`. Pass its token to Polly's retry policy via `ExecuteAsync(ct => ..., ct)`. Polly handles the retry loop with exponential backoff; the `CancellationToken` ensures the entire operation stops when the deadline is exceeded, even mid-retry. Edge cases: ensure you reset the inner timeout per attempt if needed, and catch `OperationCanceledException` to distinguish timeout from user cancellation.

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var policy = Policy
    .Handle<HttpRequestException>()
    .WaitAndRetryAsync(3, i => TimeSpan.FromSeconds(Math.Pow(2, i)));

var result = await policy.ExecuteAsync(ct => client.GetStringAsync(url, ct), cts.Token);
```

---

**Q: L7 How do you compose multiple `CancellationToken` sources?**

> Use `CancellationTokenSource.CreateLinkedTokenSource(token1, token2)` — the resulting token is cancelled when either source fires.

This is the idiomatic .NET pattern for composing cancellation signals. You might have an ASP.NET `HttpContext.RequestAborted` token (request cancelled) and a `CancellationTokenSource` timeout, and you want the operation to stop on whichever fires first. Dispose the linked source when done to avoid a memory leak from the internal registration.

```csharp
using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(requestToken, timeoutCts.Token);
await DoWorkAsync(linkedCts.Token);
```

---
