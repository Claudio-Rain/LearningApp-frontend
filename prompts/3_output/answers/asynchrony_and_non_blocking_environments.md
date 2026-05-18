# Model Answers: Asynchrony and Non-Blocking Environments

---

**Q: What does it mean for code to be "asynchronous"? How does it differ from synchronous execution?**

> **Bottom line:** Asynchronous code allows a thread to start an operation and move on to other work while waiting for the result, rather than blocking until it completes.

**Elaboration:** In synchronous execution the calling thread is occupied — it cannot do anything else until the called method returns. Asynchrony breaks that coupling: the runtime records where to resume and releases the thread to the pool. This is what lets a web server handle thousands of concurrent requests with a small fixed thread pool.

---

**Q: What problem does asynchronous programming solve, and why does it matter in modern applications?**

> **Bottom line:** It eliminates thread waste caused by blocking waits, enabling higher throughput without adding more threads.

**Elaboration:** Threads are expensive — each costs ~1 MB of stack and requires OS scheduling. When a thread blocks on a network call it holds those resources while doing nothing useful. Async programming keeps threads productive during waits, which is especially critical in servers where throughput scales directly with thread availability.

---

**Q: What is the difference between an I/O-bound task and a CPU-bound task?**

> **Bottom line:** I/O-bound work spends time waiting for external systems (disk, network, DB); CPU-bound work spends time computing on the processor.

**Elaboration:** A real I/O-bound example is reading a file from disk — the CPU sits idle while the storage controller transfers data. A CPU-bound example is computing a SHA-256 hash of a large buffer — the CPU is fully occupied. The distinction determines which concurrency tool fits: for I/O-bound you `await` the operation; for CPU-bound you offload to a thread pool thread via `Task.Run`.

---

**Q: Why does the I/O vs CPU distinction matter when choosing between async/await and Task.Run?**

> **Bottom line:** `async/await` alone is right for I/O-bound work; `Task.Run` is needed to keep the calling thread responsive for CPU-bound work.

**Elaboration:** For I/O-bound tasks the underlying API (HttpClient, FileStream, etc.) already returns a Task, so you simply `await` it — no extra thread is consumed. For CPU-bound work there is no inherent Task; wrapping in `Task.Run` moves the computation to a thread pool thread, freeing the calling thread. Using `Task.Run` on I/O-bound work wastes a thread and provides no benefit.

---

**Q: What are the possible return types of an async method in C#?**

> **Bottom line:** An async method returns `Task` (no result), `Task<T>` (typed result), `void` (fire-and-forget, avoid except for event handlers), or `ValueTask`/`ValueTask<T>` for performance-sensitive hot paths.

**Elaboration:** `Task` and `Task<T>` are the standard choices — callers can `await` them and observe exceptions. `async void` swallows unhandled exceptions and cannot be awaited, so it is only appropriate for event handlers. `ValueTask<T>` avoids a heap allocation when the result is often synchronously available but comes with strict usage constraints.

```csharp
async Task DoWorkAsync() { /* no result */ }
async Task<string> FetchAsync() => await client.GetStringAsync(url);
async void OnClick(object s, EventArgs e) { await DoWorkAsync(); } // event handler only
```

---

**Q: How do you obtain the result from a Task<T>?**

> **Bottom line:** Use `await task` — it's non-blocking and surfaces exceptions naturally; avoid `.Result` and `.Wait()` which block the thread and can deadlock.

**Elaboration:** `await task` suspends the current async method until the task completes, then returns the value. `.Result` and `.Wait()` are synchronous blocking calls; in environments with a single-threaded synchronization context (WinForms, classic ASP.NET) they deadlock because the continuation needs the context that is held by the blocked call.

```csharp
string content = await FetchContentAsync(url); // correct
string bad = FetchContentAsync(url).Result;     // dangerous
```

---

**Q: What is the difference between Task.Delay and Thread.Sleep?**

> **Bottom line:** `Task.Delay` is non-blocking and releases the thread during the wait; `Thread.Sleep` blocks the thread for the duration.

**Elaboration:** Inside an `async` method always use `await Task.Delay(ms)` — the thread returns to the pool while the timer runs and resumes the continuation when it fires. `Thread.Sleep` pins the thread, which wastes a pool thread and can contribute to starvation in server scenarios. `Thread.Sleep` is only appropriate in dedicated background threads where blocking is intentional.

---

**Q: Write a simple async method that fetches data from a URL and returns its content as a string.**

> **Bottom line:** Declare the method `async Task<string>`, use `HttpClient.GetStringAsync`, and `await` the result.

**Elaboration:** `HttpClient` is designed for reuse — inject or share a single instance. No `Task.Run` is needed because the HTTP call is I/O-bound.

```csharp
private static readonly HttpClient _client = new();

public async Task<string> FetchContentAsync(string url, CancellationToken ct = default)
{
    return await _client.GetStringAsync(url, ct);
}
```

---

**Q: You need to make three independent HTTP calls and wait for all of them. What if you only need the first to finish?**

> **Bottom line:** Use `Task.WhenAll` to wait for all and `Task.WhenAny` to take whichever completes first.

**Elaboration:** `Task.WhenAll` returns a Task that completes when every input task completes, giving you all results in one array. `Task.WhenAny` returns as soon as one task completes — you still need to `await` the winning task to get its result, and you should cancel or ignore the remaining ones.

```csharp
var t1 = FetchContentAsync(url1, ct);
var t2 = FetchContentAsync(url2, ct);
var t3 = FetchContentAsync(url3, ct);
string[] all = await Task.WhenAll(t1, t2, t3);

var winner = await Task.WhenAny(t1, t2, t3);
string first = await winner;
```

---

**Q: How do you handle exceptions thrown inside an async method?**

> **Bottom line:** Exceptions are captured in the returned Task and re-thrown when you `await` it — if you never `await` it, the exception is silently lost.

**Elaboration:** Wrap `await` calls in standard `try/catch` blocks — the compiler plumbs the exception through the state machine correctly. Forgetting to `await` a faulted task is a common production bug; it triggers `UnobservedTaskException` in some runtimes but otherwise drops the error silently.

```csharp
try { var result = await FetchContentAsync(url, ct); }
catch (HttpRequestException ex) { /* handle */ }
```

---

**Q: If Task.WhenAll has two faulted tasks, what happens when you await it?**

> **Bottom line:** `await Task.WhenAll(...)` re-throws only the first exception; to see all exceptions inspect the task's `.Exception.InnerExceptions` collection.

**Elaboration:** Internally `WhenAll` collects all exceptions into an `AggregateException`, but `await` unwraps it and surfaces only the first `InnerException`. Keep a reference to the `WhenAll` task and read `task.Exception.InnerExceptions` in the catch block to act on all failures.

```csharp
var all = Task.WhenAll(t1, t2, t3);
try { await all; }
catch { foreach (var ex in all.Exception!.InnerExceptions) Console.WriteLine(ex.Message); }
```

---

**Q: How would you cancel an async operation after a 5-second timeout?**

> **Bottom line:** Create a `CancellationTokenSource` with a timeout and pass its `Token` to the async method; when the timeout fires, an `OperationCanceledException` is thrown.

**Elaboration:** The cooperative model requires every async method along the call chain to accept and check the token — typically by passing it to underlying API calls. Catch `OperationCanceledException` separately from other exceptions to distinguish cancellation from real errors.

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
try { string result = await FetchContentAsync(url, cts.Token); }
catch (OperationCanceledException) { Console.WriteLine("Timed out."); }
```

---

**Q: When would you use Task.Run? Show how to attach a continuation with Task.ContinueWith.**

> **Bottom line:** Use `Task.Run` to offload CPU-bound work from the calling thread; `Task.ContinueWith` chains work to run after the task completes.

**Elaboration:** A typical use case is a desktop app where you don't want to freeze the UI thread with a heavy computation. In modern code `await` is almost always cleaner than `ContinueWith`, but `ContinueWith` is still useful when you need fine-grained `TaskContinuationOptions` (e.g., only run on failure).

```csharp
var task = Task.Run(() => HeavyComputation());
task.ContinueWith(t =>
{
    if (t.IsCompletedSuccessfully) Console.WriteLine(t.Result);
}, TaskScheduler.Current);
```

---

**Q: Why is calling .Result or .Wait() on a Task dangerous?**

> **Bottom line:** They block the current thread synchronously and can cause a deadlock when there is a single-threaded synchronization context.

**Elaboration:** The deadlock: the UI/request thread calls `.Wait()`, holding the synchronization context. The `await` continuation needs that same context to resume — but it is blocked. They wait on each other forever. The fix is to go fully async all the way up, or use `ConfigureAwait(false)` in library code so continuations don't require the original context.

---

**Q: A developer wraps every async call in Task.Run. Is this a good practice?**

> **Bottom line:** No — for I/O-bound code it wastes a thread pool thread for zero benefit; `Task.Run` is only justified for CPU-bound work.

**Elaboration:** For an I/O-bound call like `HttpClient.GetStringAsync`, the underlying Task is already non-blocking — wrapping it in `Task.Run` consumes a thread pool thread for the entire duration of the I/O wait. This reduces throughput rather than improving it.

---

**Q: When is async void acceptable?**

> **Bottom line:** Only for event handlers — everywhere else it is dangerous because exceptions are unobservable and the caller cannot await it.

**Elaboration:** An unhandled exception inside `async void` is raised on the synchronization context, typically crashing the process. It also makes testing difficult since you cannot await the work. I treat every `async void` outside an event handler as a code smell.

---

**Q: ConfigureAwait(false) everywhere but UI still freezes — what might be wrong?**

> **Bottom line:** `ConfigureAwait(false)` only affects continuations; if code on the UI thread blocks synchronously (`.Result`, `.Wait()`) before reaching those continuations, the freeze is caused by that blocking call, not context capture.

**Elaboration:** A common mistake is adding `ConfigureAwait(false)` inside a library but calling the library from UI code with `.Result` — the block happens before any continuation can run. The real fix is making the call site `async` rather than patching the library.

---

**Q: What does ConfigureAwait(false) do under the hood?**

> **Bottom line:** It tells the awaiter not to capture the current `SynchronizationContext`, so the continuation runs on whichever thread pool thread the Task completes on rather than marshaling back to the original context.

**Elaboration:** When you `await` a Task, the state machine checks `SynchronizationContext.Current`. If it's non-null, it posts the continuation to that context. `ConfigureAwait(false)` returns a `ConfiguredTaskAwaitable` with `continueOnCapturedContext = false`, bypassing that marshal. In ASP.NET Core there is no `SynchronizationContext`, so it's a no-op there — but it's still good practice in libraries for portability.

---

**Q: You launch 10 tasks and want to process each result as soon as it finishes.**

> **Bottom line:** Use `Task.WhenEach` (.NET 9+), or in earlier versions loop with `Task.WhenAny`, remove the completed task, and process its result.

```csharp
// .NET 9+
await foreach (var task in Task.WhenEach(tasks))
    Process(await task);

// Pre-.NET 9
var pending = tasks.ToList();
while (pending.Count > 0)
{
    var done = await Task.WhenAny(pending);
    pending.Remove(done);
    Process(await done);
}
```

---

**Q: How does CancellationToken work internally?**

> **Bottom line:** `CancellationTokenSource` holds shared cancellation state; `CancellationToken` is a lightweight struct that reads that state, and cooperative cancellation means each operation must explicitly check the token and throw `OperationCanceledException`.

**Elaboration:** `CancellationTokenSource.Cancel()` atomically sets a flag and invokes registered callbacks. Every `CancellationToken` struct holds a reference to the same source object, so checking `token.IsCancellationRequested` is a cheap field read. The runtime never forcefully aborts threads — the cancellation signal is only honored when receiving code explicitly calls `ThrowIfCancellationRequested()` or passes the token to an awaitable.

---

**Q: Compare sequential await vs Task.WhenAll vs Task.WhenAny for 5 independent DB queries.**

> **Bottom line:** `Task.WhenAll` — it runs all five concurrently, keeping total latency equal to the slowest query rather than the sum.

**Elaboration:** Sequential `await` adds latencies: if each query takes 100 ms you wait 500 ms. `Task.WhenAll` fires all five simultaneously and waits ~100 ms. `Task.WhenAny` is only appropriate if you can act on partial data. The main trade-off is DB connection pool pressure — if the pool is a bottleneck, consider batching into two parallel groups.

---

**Q: What are the trade-offs between Task<T> and ValueTask<T>?**

> **Bottom line:** `ValueTask<T>` avoids a heap allocation when the result is synchronously available, but misusing it — awaiting it more than once or storing it — causes incorrect behavior.

**Elaboration:** `Task<T>` always allocates on the heap; `ValueTask<T>` is a struct that can wrap a synchronous result without allocation. The gain is only meaningful on hot paths called millions of times per second (e.g., pipeline reads). The constraints are strict: never `await` a `ValueTask<T>` more than once, never store it. I only reach for it when profiling shows allocations are the bottleneck.

---

**Q: Describe a classic async deadlock in classic ASP.NET or WinForms.**

> **Bottom line:** The deadlock occurs when synchronous blocking (`.Result` or `.Wait()`) holds a single-threaded context while the continuation needs that same context to resume — they wait on each other forever.

**Elaboration:** In classic ASP.NET, each request has a single `AspNetSynchronizationContext`. Calling `someTask.Result` blocks the request thread holding the context. The `await` continuation inside `someTask` needs to post back to that context — which is blocked — so it queues forever. Fix without full rewrite: `ConfigureAwait(false)` all the way down so continuations don't require the original context. Real fix: go fully async end-to-end.

---

**Q: What does the compiler generate for an async method?**

> **Bottom line:** The compiler transforms an `async` method into a struct-based state machine implementing `IAsyncStateMachine`, splitting the method body at each `await` point into numbered states.

**Elaboration:** Each `await` becomes a state transition: the machine checks if the awaitable is already complete (fast path, no allocation), and if not, hooks a callback to resume at the next state. Local variables become fields on the struct so they survive across suspension. Understanding this matters for performance: excessive `await` points on hot paths increase state machine complexity and can prevent inlining.

---

**Q: How do you diagnose and fix thread pool starvation under high load?**

> **Bottom line:** Thread pool starvation happens when all pool threads are blocked on synchronous waits — the fix is eliminating blocking calls and going fully async.

**Elaboration:** I'd start with dotnet-counters to confirm thread count is at the pool maximum while CPU is idle. Then search the codebase for `.Result`, `.Wait()`, `Thread.Sleep`, and synchronous stream reads inside async paths. The fix is converting every blocking call to its async equivalent. In extreme cases, adjust `ThreadPool.SetMinThreads` to allow faster thread injection, but that's a band-aid — the root cause must be fixed.
