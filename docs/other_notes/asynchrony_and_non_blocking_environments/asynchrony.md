# Asynchrony & Non-Blocking Environments — Model Answers

---

## Level 1 — Definition & Basics

---

**Q: What does it mean for code to be asynchronous, and why does it matter?**

> **Bottom line:** Asynchronous code lets a thread start an operation and move on to other work instead of sitting idle waiting for it to finish.

**Elaboration:** This matters most for I/O — network calls, disk reads, database queries — where the CPU isn't actually doing anything during the wait. In a web server context, a synchronous handler ties up a thread for the entire duration of a database call; an async one releases that thread back to the pool so it can serve other requests. At scale, that difference determines how many concurrent users your service can handle without running out of threads.

---

**Q: What is the difference between asynchronous and parallel execution? Can something be asynchronous but not parallel?**

> **Bottom line:** Asynchronous means "don't block while waiting"; parallel means "do multiple things simultaneously on multiple threads."

**Elaboration:** Yes, you can absolutely be asynchronous without parallelism. A single-threaded JavaScript runtime is a perfect example — it's entirely async, but only one piece of code runs at a time. In .NET, `await`ing one task at a time is async but sequential. Parallelism requires multiple threads or cores actually executing at the same moment, which is a separate concern.

---

**Q: What problem does the `async`/`await` pattern solve compared to writing callback-based code?**

> **Bottom line:** It lets you write async code that reads like synchronous code, eliminating callback hell and making control flow — especially error handling — straightforward.

**Elaboration:** With callbacks, you end up with deeply nested lambdas, and exception handling gets split across multiple closures. With `async`/`await`, a `try/catch` just works around an `await`, the compiler generates the continuation machinery for you, and the intent of the code is obvious. The logic stays linear even though the execution isn't.

---

**Q: What happens to a thread while it is blocked waiting for a synchronous I/O call to complete? What happens instead when you `await` an asynchronous operation?**

> **Bottom line:** A blocked thread sits parked doing nothing, consuming stack memory and a thread-pool slot; an awaited async operation releases the thread entirely until the I/O completes.

**Elaboration:** Under the hood, an `await` on a truly async I/O operation uses OS-level completion ports or similar mechanisms — the hardware notifies the runtime when the data is ready, and the runtime schedules a thread-pool thread to resume the continuation. No thread is held hostage in the meantime. That's why a server that `await`s database calls can handle thousands of concurrent requests with a small thread pool.

---

**Q: If async/await ultimately produces state machine code under the hood, why is it still preferable to writing that state machine manually?**

> **Bottom line:** The compiler-generated state machine is correct, maintainable, and handles edge cases — like exception propagation and `ExecutionContext` capture — that are easy to get wrong by hand.

**Elaboration:** Writing a state machine manually means managing `INotifyCompletion`, capturing the right execution context, handling faults and cancellation, and keeping state across every suspension point. That's hundreds of lines of brittle code for what `async`/`await` expresses in ten. The compiler also gets to optimize it — for example, skipping the state machine entirely if the awaitable is already complete.

---

**Q: In your own words, explain what a `Task` represents in .NET. Is it a thread?**

> **Bottom line:** A `Task` represents a future result — a promise that some work will complete — and it has nothing to do with threads directly.

**Elaboration:** A `Task` is just an object that tracks the state of an operation: not started, running, completed successfully, or faulted. It may be backed by a thread-pool thread, it may be backed by an I/O completion port with no thread involved at all, or it may already be completed before you even look at it. Confusing `Task` with `Thread` is a common mistake that leads to over-using `Task.Run`.

---

**Q: What does "non-blocking" mean in the context of a web server handling many simultaneous requests?**

> **Bottom line:** Non-blocking means a thread handling a request is never held idle — when it hits I/O, it yields so the runtime can use that thread for another request.

**Elaboration:** In a blocking model, you need roughly one thread per concurrent request, and threads are expensive — each one costs ~1MB of stack and scheduling overhead. In a non-blocking model, a small pool of threads can multiplex across thousands of in-flight requests because they're only active during actual CPU work. That's why `async` controllers in ASP.NET Core can handle dramatically higher throughput under I/O load.

---

## Level 2 — Core Concepts

---

**Q: What is the difference between an I/O-bound and a CPU-bound operation? Give one concrete example of each.**

> **Bottom line:** I/O-bound means the bottleneck is waiting for external hardware or a network; CPU-bound means the bottleneck is the processor doing computation.

**Elaboration:** A database query is I/O-bound — your code is just waiting for bytes over a network socket and the CPU is idle. Resizing an image or computing a SHA-256 hash over a large file is CPU-bound — the processor is running flat out. The distinction matters because they need different concurrency strategies.

---

**Q: Why does the distinction between I/O-bound and CPU-bound matter when choosing whether to use `async`/`await` or `Task.Run`?**

> **Bottom line:** For I/O-bound work, `async`/`await` with truly async APIs releases the thread; for CPU-bound work, you need `Task.Run` to explicitly push the work off-thread.

**Elaboration:** An async I/O call like `HttpClient.GetAsync` doesn't consume a thread while waiting — that's the whole point. But if you have a CPU-heavy loop, just marking the method `async` changes nothing; the thread is still grinding through that work synchronously. `Task.Run` ships the CPU work to the thread pool so the calling thread is free. Using `Task.Run` for I/O-bound work is wasteful — you're consuming an extra thread for no reason.

---

**Q: If you have a CPU-heavy calculation that you want to run without blocking the calling thread, how would you offload it, and why?**

> **Bottom line:** Wrap it in `Task.Run` and `await` the result.

**Elaboration:** `Task.Run` queues the delegate onto the thread pool, so the calling thread — whether it's a UI thread or a request thread — is freed immediately. You `await` the returned `Task` to get the result back when it's done, without blocking. Don't try to fake this with a fake-async method that just synchronously computes and returns `Task.FromResult` — that still blocks the caller.

```csharp
var result = await Task.Run(() => ExpensiveCalculation(data));
```

---

**Q: What are the valid return types for an `async` method in C#, and when would you use each one?**

> **Bottom line:** `Task`, `Task<T>`, `void`, `ValueTask`, `ValueTask<T>`, and any custom awaitable type — use `Task<T>` by default, `Task` when there's no result, and `async void` only for event handlers.

**Elaboration:** `Task<T>` is the standard return type when you have a result to return; `Task` when the method is fire-and-continue with no result. `async void` is specifically for event handler signatures — it's the only case where you can't change the return type. `ValueTask<T>` is for high-performance paths where the result is often synchronously available, avoiding a `Task` allocation.

---

**Q: What is the practical difference between returning `Task` and returning `void` from an async method? When is `async void` acceptable?**

> **Bottom line:** `Task` lets callers `await` the method and observe exceptions; `async void` fires unobserved and any unhandled exception will crash the process.

**Elaboration:** When you return `Task`, the caller can `await` it, attach continuations, use it in `WhenAll`, or catch exceptions from it. With `async void`, the task is not surfaced at all — exceptions go straight to the `SynchronizationContext` and typically tear down the app. The one legitimate use of `async void` is event handlers, like `button.Click += async (s, e) => { ... }`, where the delegate signature is fixed and you have no choice.

---

**Q: What is a `ValueTask<T>` and what problem does it solve compared to `Task<T>`?**

> **Bottom line:** `ValueTask<T>` is a struct-based alternative to `Task<T>` that avoids a heap allocation when the result is already available synchronously.

**Elaboration:** Every `Task<T>` is a heap-allocated object. On a hot path — say, a cache layer that usually returns synchronously — that's a lot of unnecessary GC pressure. `ValueTask<T>` can hold the result inline (as a struct) for the sync case and only allocates a full task object for the genuinely async case. The tradeoff is constraints: you can only `await` a `ValueTask` once, and you can't store it for later use.

---

**Q: What are two ways to obtain the result of a `Task<T>`, and what is the risk of using one of them on a UI or ASP.NET synchronization context?**

> **Bottom line:** You can `await` the task or access `.Result` — but `.Result` on a synchronization context will deadlock.

**Elaboration:** `await` is the right way — it suspends the current method and releases the thread. `.Result` (or `.Wait()`) blocks the current thread synchronously. If that thread owns a `SynchronizationContext` — like the WPF UI thread or the old ASP.NET request context — the awaited continuation needs that same context to resume, but it's blocked waiting for the result. Neither side moves; you deadlock.

---

**Q: What happens if you access `task.Result` and the task threw an exception? How does that differ from `await`-ing the task?**

> **Bottom line:** `.Result` wraps the original exception in an `AggregateException`; `await` unwraps it and re-throws the original exception directly.

**Elaboration:** This is a real gotcha. If your task faults with an `InvalidOperationException` and you access `.Result`, your `catch (InvalidOperationException)` block won't fire because it's now wrapped in an `AggregateException`. With `await`, the compiler generates unwrapping code so you catch the original exception type. This alone is a strong reason to prefer `await` over `.Result`.

---

**Q: What is the difference between `Task.Delay` and `Thread.Sleep`? When should you use each?**

> **Bottom line:** `Task.Delay` is async and releases the thread during the wait; `Thread.Sleep` blocks the current thread for the entire duration.

**Elaboration:** `Thread.Sleep` ties up a thread-pool thread that could be handling other work — in a server context that's wasteful and at scale it degrades throughput. `Task.Delay` uses a timer under the hood and the thread is free to do other work while the delay counts down. You should almost always use `await Task.Delay(...)` in async code; `Thread.Sleep` has very few legitimate uses outside of synchronous test code or shutdown sequences.

---

**Q: If you use `Thread.Sleep(5000)` inside an ASP.NET Core request handler, what is the impact at scale compared to `await Task.Delay(5000)`?**

> **Bottom line:** `Thread.Sleep` pins a thread for 5 seconds; at scale that exhausts the thread pool and requests queue up, starving the server.

**Elaboration:** ASP.NET Core's thread pool has a finite size — typically around 2x CPU cores by default before it starts growing slowly. If each request sleeps for 5 seconds, you can only handle as many concurrent requests as you have threads. With `await Task.Delay(5000)`, each thread is released during the wait and can serve dozens of other requests. The difference at 1000 concurrent requests is between "working fine" and "complete thread-pool starvation."

---

## Level 3 — Practical Usage

---

**Q: Write an async method that fetches data from an HTTP endpoint and returns the response body as a string. What return type would you use and why?**

> **Bottom line:** Return `Task<string>` — that's the standard return type for an async method that produces a string result.

**Elaboration:** `HttpClient` exposes truly async methods that don't hold threads during the network wait, so this is a textbook `async`/`await` use case. I'd use `GetStringAsync` for simplicity, or `GetAsync` + `ReadAsStringAsync` if I need to inspect the status code first.

```csharp
public async Task<string> FetchAsync(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url);
}
```

---

**Q: What does the compiler actually do when it sees an `async` method — what is emitted, and what triggers the state machine to resume?**

> **Bottom line:** The compiler rewrites the method into a struct-based state machine with a `MoveNext` method, and the awaitable's completion callback is what schedules the next `MoveNext` invocation.

**Elaboration:** Every `await` point becomes a case in a switch statement inside `MoveNext`. When the awaited operation completes, it calls back into the state machine — either via `SynchronizationContext.Post` if one is present, or directly on the completing thread. The state machine captures all locals as fields on the struct so they survive the suspension. This is why async methods have slightly more overhead than plain synchronous ones — there's a state machine allocation and a few extra indirections.

---

**Q: When would you use `Task.Run(() => ...)` instead of simply `await someAsyncMethod()`?**

> **Bottom line:** Use `Task.Run` when the work is CPU-bound synchronous code that would otherwise block the calling thread.

**Elaboration:** If `someAsyncMethod` is genuinely async — hitting a network, disk, or database — you just `await` it directly. `Task.Run` is for offloading synchronous, CPU-heavy work: image processing, JSON parsing on a hot path, tight computation loops. It's also sometimes used in UI apps to keep the UI thread responsive, but in server code it's usually unnecessary and wasteful for I/O operations.

---

**Q: Rewrite the following continuation using `async`/`await`. What are the trade-offs of each style?**

```csharp
Task.Run(() => GetData())
    .ContinueWith(t => Process(t.Result));
```

> **Bottom line:** `async`/`await` is clearer, handles exceptions naturally, and correctly captures the synchronization context; `ContinueWith` is lower-level and has subtle exception propagation rules.

**Elaboration:** `ContinueWith` always runs the continuation even if the antecedent faulted, so you have to check `t.IsFaulted` or the wrapped exception yourself. With `async`/`await`, a `try/catch` just works. The `async`/`await` version is also far more readable when the chain grows longer.

```csharp
public async Task RunAsync()
{
    var data = await Task.Run(() => GetData());
    Process(data);
}
```

---

**Q: `Task.ContinueWith` has a subtle pitfall around exception propagation. What is it, and how do you guard against it?**

> **Bottom line:** By default, `ContinueWith` runs even if the antecedent faulted, and if you access `.Result` on a faulted task it throws an `AggregateException` — and if the continuation itself faults, that exception can go unobserved.

**Elaboration:** You can guard against it with `TaskContinuationOptions.OnlyOnRanToCompletion` / `OnlyOnFaulted`, or by checking `t.Exception` inside the continuation. Better yet, just don't use `ContinueWith` in new code — `async`/`await` handles this correctly by default, and faults propagate as you'd expect.

---

**Q: You need to fire off three independent HTTP calls and wait for all of them to finish before continuing. Which API would you use and why? Write the code.**

> **Bottom line:** `Task.WhenAll` — it starts all three concurrently and returns a single task that completes when all of them do.

**Elaboration:** If you `await` each call sequentially, they run one at a time and you wait for total latency. With `Task.WhenAll`, all three in-flight simultaneously and you only wait for the slowest one. It also aggregates any exceptions so you can inspect all failures, not just the first.

```csharp
var t1 = client.GetStringAsync(url1);
var t2 = client.GetStringAsync(url2);
var t3 = client.GetStringAsync(url3);

var results = await Task.WhenAll(t1, t2, t3);
```

---

**Q: What is the difference between `Task.WhenAll` and `Task.WhenAny`? Describe a real scenario where `WhenAny` is the right choice.**

> **Bottom line:** `WhenAll` waits for every task to finish; `WhenAny` completes as soon as the first one does.

**Elaboration:** A classic `WhenAny` scenario is a timeout pattern — you race an operation against `Task.Delay(timeout)` and whichever finishes first wins. Another is redundant requests: send the same query to two replicas and use the first response. Just be careful that when `WhenAny` returns, the other tasks are still running — you may need to cancel them to avoid resource leaks.

---

**Q: What are the dangers of calling `.Wait()` or `.Result` on a Task instead of `await`-ing it? Under what narrow circumstances might it be acceptable?**

> **Bottom line:** The biggest dangers are deadlocks on contexts with a `SynchronizationContext` and exception wrapping in `AggregateException`.

**Elaboration:** Beyond deadlocks, `.Wait()` blocks a thread-pool thread that could be handling other work. The narrow cases where it's acceptable: `Main` methods in older .NET where you can't use `async Main`, truly synchronous initialization code where you can guarantee there's no synchronization context (console apps, background services during startup), or inside unit test setup that doesn't support async. Even then, I'd look hard for a better option first.

---

**Q: You launch five tasks and want to process each result as soon as it finishes, not after all five are done. How would you implement this?**

> **Bottom line:** Use a loop around `Task.WhenAny`, removing each completed task from the set and processing its result immediately.

**Elaboration:** The pattern is straightforward but you need to remember to remove the completed task from the list on each iteration, otherwise you'll keep getting the same completed task back. In .NET 6+ there's also `Task.WhenEach` (via experimental APIs) and `Channel<T>`-based pipelines for more sophisticated scenarios.

```csharp
var tasks = new List<Task<Result>> { t1, t2, t3, t4, t5 };

while (tasks.Count > 0)
{
    var completed = await Task.WhenAny(tasks);
    tasks.Remove(completed);
    Process(await completed);
}
```

---

**Q: Is the order in which `Task.WhenAny` returns tasks deterministic? What should you keep in mind when building a loop around it?**

> **Bottom line:** No, the order is non-deterministic — you get whichever task happens to complete first at runtime.

**Elaboration:** When building a loop, always remove the completed task before calling `WhenAny` again, otherwise it will return the same already-completed task on every iteration and loop forever. Also, access the result via `await completed` inside the loop — not `.Result` — to get clean exception propagation.

---

**Q: Explain how `CancellationToken` works in .NET. Who creates the token, who passes it, and who observes it?**

> **Bottom line:** The caller creates a `CancellationTokenSource`, passes the `Token` to the async method, and the method periodically checks or registers callbacks to respond to cancellation.

**Elaboration:** The `CancellationTokenSource` is the control side — the caller calls `.Cancel()` on it when it wants to abort. The `CancellationToken` itself is the read-only view that gets passed down the call chain. Deep in the implementation, you either call `token.ThrowIfCancellationRequested()` at checkpoints or pass the token to other async APIs like `HttpClient` which handle it natively. The model is cooperative — nothing is forcefully stopped.

---

**Q: Write an async method that accepts a `CancellationToken` and cancels a long-running HTTP request after 3 seconds if it hasn't completed.**

> **Bottom line:** Link a `CancellationTokenSource` with a 3-second timeout to the incoming token and pass the linked token to `HttpClient`.

```csharp
public async Task<string> FetchWithTimeoutAsync(string url, CancellationToken ct)
{
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(3));

    return await _client.GetStringAsync(url, cts.Token);
}
```

**Elaboration:** `CreateLinkedTokenSource` ensures that either the caller's cancellation or the 3-second timeout will abort the request. Using `CancelAfter` is cleaner than a separate `Task.Delay` race because the `HttpClient` itself observes the token and tears down the connection.

---

**Q: What is the difference between cooperative cancellation and forceful thread abortion? Why does .NET favour the cooperative model?**

> **Bottom line:** Cooperative cancellation asks the running code to stop cleanly at defined checkpoints; `Thread.Abort` (forceful) injects an exception at an arbitrary point, which can corrupt state.

**Elaboration:** Thread abortion was available in .NET Framework and was famously dangerous — it could interrupt a `finally` block, leave locks held, or corrupt shared data structures. Cooperative cancellation lets the code reach a safe point before stopping, release resources properly, and propagate a clean `OperationCanceledException`. That predictability is why .NET Core removed `Thread.Abort` entirely.

---

**Q: What happens if you call `token.ThrowIfCancellationRequested()` and the token is cancelled — what exception is thrown, and how should callers handle it?**

> **Bottom line:** It throws `OperationCanceledException`, and callers should either let it propagate or catch it specifically to handle the cancellation case.

**Elaboration:** `OperationCanceledException` is the expected, non-error signal that work was cancelled — it's not a bug. Callers who care about the difference between cancellation and failure should `catch (OperationCanceledException)` separately from `catch (Exception)`. In ASP.NET Core, if the client disconnects and you propagate `OperationCanceledException`, the framework handles it gracefully rather than logging it as an error.

---

**Q: How do you correctly catch exceptions thrown inside an `async` method? What happens if you `await` a faulted task inside a `try/catch`?**

> **Bottom line:** You `await` the task inside a `try` block and catch the exception normally — `await` unwraps and re-throws it as the original exception type.

**Elaboration:** This is one of the cleanest aspects of `async`/`await`. The compiler generates the unwrapping for you, so a `try { await SomeAsync(); } catch (HttpRequestException ex) { }` just works exactly as you'd expect. The only gotcha is if you start the task outside the `try` block — then you've missed the exception. Start and `await` in the same `try`.

---

**Q: If you use `Task.WhenAll` and two of the three tasks fail, how many exceptions will you see, and how do you access all of them?**

> **Bottom line:** `await Task.WhenAll(...)` re-throws only the first exception; to see all of them, catch the `AggregateException` or inspect the individual tasks after the `WhenAll` call.

**Elaboration:** The `Task` returned by `WhenAll` has an `.Exception` property of type `AggregateException` containing all the faults. When you `await` it, only the first inner exception is re-thrown for convenience. If you need all exceptions — for example to log or retry each failure independently — catch `Exception`, then look at `task.Exception.InnerExceptions` on the original tasks.

```csharp
var tasks = new[] { t1, t2, t3 };
try
{
    await Task.WhenAll(tasks);
}
catch
{
    var exceptions = tasks
        .Where(t => t.IsFaulted)
        .Select(t => t.Exception!.InnerException);
}
```

---

**Q: What is an `AggregateException` and when does it appear vs. a plain exception when working with async code?**

> **Bottom line:** `AggregateException` is a container for one or more exceptions — it appears when you access `.Result` or `.Wait()`, but `await` unwraps it and throws the first inner exception directly.

**Elaboration:** It was designed for `Task` and `Parallel` APIs where multiple operations can fail simultaneously. With `await`, the framework unwraps it for you. You only see raw `AggregateException` if you go through `.Result`, `.Wait()`, or `Task.WhenAll` without `await`. Understanding this distinction helps explain why switching from `.Result` to `await` can change which exception type your `catch` blocks see.

---

## Level 4 — Common Pitfalls

---

**Q: What does `ConfigureAwait(false)` do, and why is it recommended in library code?**

> **Bottom line:** It tells the runtime not to resume the continuation on the original `SynchronizationContext`, which avoids deadlocks and reduces unnecessary context switching in library code.

**Elaboration:** Library code doesn't care which thread it runs on after an `await` — it has no UI to update and no request-scoped state to restore. Using `ConfigureAwait(false)` lets the continuation resume on any thread-pool thread, which is faster and prevents deadlocks when a caller blocks synchronously on the result. Application code that does care about context — like code that updates a WPF control — should not use it.

---

**Q: What is a synchronization context? Name two execution environments that install one and two that do not.**

> **Bottom line:** A `SynchronizationContext` is an abstraction for "post work to the right thread" — it controls where continuations run after an `await`.

**Elaboration:** WPF and WinForms install one that marshals continuations back to the UI thread. Classic ASP.NET (pre-Core) installed one that preserved request identity across threads. ASP.NET Core and console apps do not install one — continuations run on any available thread-pool thread, which is why deadlocks are less common there.

---

**Q: If a library method deep in a call chain does not use `ConfigureAwait(false)` and a caller on a WPF UI thread `await`s it, what can happen?**

> **Bottom line:** If the caller then synchronously blocks on the result using `.Result`, it will deadlock because the continuation needs the UI thread, which is blocked waiting for it.

**Elaboration:** The library's continuation is trying to resume on the captured UI `SynchronizationContext`, but the UI thread is sitting in `.Result` waiting for the task to finish — classic deadlock. Even if the caller doesn't block, skipping `ConfigureAwait(false)` in library code means unnecessary marshaling back to the UI thread for every continuation, which hurts performance.

---

**Q: Should application-level code (e.g., ASP.NET Core controllers, WPF code-behind) use `ConfigureAwait(false)`?**

> **Bottom line:** In ASP.NET Core, it doesn't matter functionally since there's no `SynchronizationContext`; in WPF code-behind, you usually don't want it because you need the UI thread after the `await`.

**Elaboration:** In WPF, if you `await` something in a button handler and then update a label, you need to be back on the UI thread — `ConfigureAwait(false)` would break that. In ASP.NET Core there's no context to restore, so it has no effect — but some teams still add it for explicitness or for code that might be shared with other contexts. Library code is where it's non-negotiable.

---

**Q: Walk me through exactly why calling `.Result` on a Task can deadlock in a WinForms or classic ASP.NET application, but not in a console app.**

> **Bottom line:** WinForms and classic ASP.NET have a single-threaded `SynchronizationContext`; when `.Result` blocks that thread, the continuation queued to that same context can never run.

**Elaboration:** Here's the sequence: UI thread calls `GetDataAsync()`, then blocks on `.Result`. Inside `GetDataAsync`, an `await` captures the WinForms `SynchronizationContext`. When the I/O finishes, the runtime tries to post the continuation to that context via `Post`, which queues it to run on the UI thread. But the UI thread is blocked in `.Result` waiting for the task to complete. The task can't complete until the continuation runs. Nobody moves. In a console app, there's no `SynchronizationContext`, so the continuation runs on any thread-pool thread and unblocks fine.

---

**Q: A junior developer writes `var data = GetDataAsync().Result;` at the top of a button click handler. What will happen and how would you fix it?**

> **Bottom line:** It will deadlock the UI thread immediately.

**Elaboration:** The button click handler runs on the UI thread, `.Result` blocks it, and as I described above, the continuation can never resume on that same blocked thread. The fix is simple: make the handler `async` and `await` the call.

```csharp
// Before
private void Button_Click(object sender, EventArgs e)
{
    var data = GetDataAsync().Result; // deadlock
}

// After
private async void Button_Click(object sender, EventArgs e)
{
    var data = await GetDataAsync();
}
```

---

**Q: Why is `async void` considered dangerous outside of event handlers? What happens to an exception thrown inside an `async void` method?**

> **Bottom line:** Exceptions from `async void` are posted directly to the `SynchronizationContext` and typically crash the process — the caller has no way to observe or handle them.

**Elaboration:** When an `async Task` method faults, the exception is stored on the `Task` and surfaces when you `await` it. With `async void`, there's no `Task` — the exception goes to `SynchronizationContext.UnhandledException`, which in most apps means an unhandled exception crash. You also can't `await` an `async void` method, so you can't compose it, cancel it, or test it cleanly.

---

**Q: A developer writes a "fire-and-forget" background job using `_ = Task.Run(...)`. What can go wrong, and how should you handle it properly?**

> **Bottom line:** Unhandled exceptions in the fire-and-forget task are silently swallowed, and you have no way to know the job failed or observe its lifetime.

**Elaboration:** If the task throws, it becomes an unobserved faulted task. In .NET 4.5+ this won't crash the process by default, but the failure is invisible. For fire-and-forget work in production code, you should at minimum attach a continuation that logs exceptions. For anything more serious — retries, shutdown tracking — use a proper background worker like `IHostedService` or `BackgroundService`.

---

**Q: What is wrong with this code, and what would you change?**
```csharp
public async Task<int> GetCountAsync()
{
    return await Task.FromResult(42);
}
```

> **Bottom line:** The `async`/`await` here is unnecessary — `Task.FromResult(42)` is already completed, so the state machine overhead is pure waste.

**Elaboration:** Every `async` method allocates a state machine. When the result is synchronously available and there's no real async work, you should just return the task directly without `await`. This is exactly the scenario `Task.FromResult` was designed for.

```csharp
public Task<int> GetCountAsync() => Task.FromResult(42);
```

---

**Q: What is the difference between these two snippets, and when does the distinction matter?**
```csharp
// A
await Task.WhenAll(tasks);

// B
foreach (var t in tasks) await t;
```

> **Bottom line:** Snippet A runs all tasks concurrently and waits for all; snippet B runs them sequentially, awaiting each before starting the next.

**Elaboration:** The tasks in snippet B were presumably already started, so "sequential" here means processing them one at a time — but they were all started upfront so they do overlap. The real difference is in exception handling: `WhenAll` aggregates all faults; `foreach await` throws on the first failure and may leave other tasks unobserved. Also, `WhenAll` is clearer intent. If the tasks haven't been started yet, snippet B is genuinely sequential.

---

## Level 5 — Internals & Deep Mechanics

---

**Q: When the compiler transforms an `async` method, what does the generated state machine look like at a high level? What are `MoveNext` and `SetStateMachine` responsible for?**

> **Bottom line:** The compiler generates a struct implementing `IAsyncStateMachine` with a `state` field per suspension point; `MoveNext` drives the execution forward on each resume, and `SetStateMachine` boxes the struct for the heap.

**Elaboration:** Every local variable and parameter becomes a field on the struct so values survive suspension. `MoveNext` is called once to start and then once per awaitable completion; it's essentially a switch on the state field. `SetStateMachine` is an artifact of the builder pattern — it's called when the struct needs to be boxed from stack to heap, which happens if the method actually suspends. In practice, `SetStateMachine` is rarely called because modern builders optimize around it.

---

**Q: At the point of an `await`, what exactly is captured so that execution can resume? What is captured by the `ExecutionContext`?**

> **Bottom line:** The state machine captures its own locals; the `ExecutionContext` captures security, culture, and `AsyncLocal<T>` values so they flow into the continuation.

**Elaboration:** The state machine fields hold the "what was I doing" data. The `ExecutionContext` — captured implicitly by the awaiter infrastructure — holds ambient state like `AsyncLocal<T>` values, the current culture, and activity/trace data. Notably, `SynchronizationContext` is captured separately by `TaskAwaiter`, not inside `ExecutionContext`. This separation is why `ConfigureAwait(false)` can suppress the context marshal without affecting `AsyncLocal` flow.

---

**Q: What is the role of `IAsyncStateMachine` and `AsyncTaskMethodBuilder` in the generated code?**

> **Bottom line:** `IAsyncStateMachine` is the interface the state machine struct implements; `AsyncTaskMethodBuilder` is the builder that creates the backing `Task` and drives `MoveNext` via awaiter callbacks.

**Elaboration:** When you call an `async` method, the builder is created on the stack, the state machine is initialized, and `MoveNext` is called once. If the first awaitable is already complete, `MoveNext` runs straight through and the builder returns a completed `Task`. If not, the awaiter registers a callback and the builder will schedule another `MoveNext` invocation when it fires. `AsyncValueTaskMethodBuilder` does the same job for `ValueTask`-returning methods.

---

**Q: When a `Task.Run` work item completes, on which thread does the continuation run by default? How does `ConfigureAwait(true)` change that?**

> **Bottom line:** By default it runs on any available thread-pool thread; `ConfigureAwait(true)` — the default — would attempt to marshal back to the captured `SynchronizationContext` if there is one.

**Elaboration:** Inside `Task.Run` there's typically no `SynchronizationContext`, so even with `ConfigureAwait(true)` the continuation stays on a thread-pool thread. The distinction only matters if you `await` something from a thread that has a context — like a UI thread. In server-side code without a context, `ConfigureAwait(true)` and `ConfigureAwait(false)` behave identically.

---

**Q: How does the .NET thread pool decide when to spin up new threads vs. queue work to existing threads? What are the implications for high-throughput async workloads?**

> **Bottom line:** The thread pool has a minimum thread count that responds immediately; beyond that, it adds threads slowly (one per ~500ms) to avoid over-provisioning.

**Elaboration:** This hill-climbing algorithm means that if a burst of synchronous-blocking tasks suddenly arrives, new threads trickle in slowly — latency spikes before the pool catches up. For genuinely async workloads, this rarely matters because threads are returned quickly. The implication: if you mix blocking code with async code in a high-throughput service, thread-pool starvation becomes a real risk because the slow growth can't keep pace with blocking demand.

---

**Q: What is `SynchronizationContext.Post` vs `SynchronizationContext.Send`, and how does the await machinery use them?**

> **Bottom line:** `Post` is async (fire-and-forget); `Send` is synchronous (blocks until the posted delegate completes). The `await` machinery uses `Post` to avoid blocking.

**Elaboration:** `TaskAwaiter` calls `SynchronizationContext.Post` to schedule the continuation on the captured context — it doesn't want to block the completing thread waiting for the continuation to run. `Send` is synchronous and could easily deadlock in the same scenarios as `.Result`. Knowing this helps explain why continuations on the UI thread are queued as messages rather than executed inline.

---

**Q: Under what conditions can `ValueTask<T>` improve performance? What are the constraints on how you are allowed to consume a `ValueTask`?**

> **Bottom line:** `ValueTask<T>` helps when the operation completes synchronously most of the time — you avoid allocating a `Task<T>` object for the common path.

**Elaboration:** The constraints exist because `ValueTask` can be backed by a pooled `IValueTaskSource` that gets recycled. You must `await` it exactly once, you must not store it and use it after awaiting, and you must not access it from multiple concurrent callers. Violate these and you get undefined behavior — the underlying object may have been reused for a completely different operation.

---

**Q: Why is it incorrect to `await` a `ValueTask` more than once, or to store it and use it after the first await?**

> **Bottom line:** The backing `IValueTaskSource` may have been returned to a pool and reused for another operation by the time you access it a second time.

**Elaboration:** `Task` is safe to `await` multiple times because it holds its state forever. `ValueTask` backed by a pooled source is designed for single-use — the pool recycles the source object as soon as the first consumer completes. A second `await` could read stale or incorrect data from whatever operation has since claimed that pooled object. If you need to `await` multiple times, call `.AsTask()` to convert to a safe `Task`.

---

## Level 6 — Trade-offs & Design Decisions

---

**Q: What is "async all the way down" and why is it generally the right rule? What are the costs of mixing sync and async code?**

> **Bottom line:** "Async all the way down" means every method in an async call chain is itself async — mixing sync and async creates deadlock risk, wasted threads, or awkward workarounds.

**Elaboration:** The moment you introduce a synchronous `.Result` or `.Wait()` anywhere in an async chain, you risk deadlock if a `SynchronizationContext` is present, and you're burning a thread for nothing. The alternative — fake-async wrappers using `Task.Run` — wastes threads and obscures intent. Going fully async is more work upfront but produces a clean, safe codebase. The main cost is that async infects the entire call stack: once you go async in one place, callers have to become async too.

---

**Q: In what scenarios would introducing async/await actually hurt performance rather than help it?**

> **Bottom line:** When the operation always completes synchronously — like reading from an in-memory cache — async overhead (state machine allocation, context capture, scheduling) costs more than it saves.

**Elaboration:** Every `async` method has overhead: struct allocation (or boxing), context capture, and potential thread-pool scheduling for continuations. For a hot path that hits an in-memory dictionary millions of times per second, that overhead is meaningful. `ValueTask` was created specifically to address this — it lets you return synchronously without a heap allocation when the result is already available.

---

**Q: You are writing a simple CLI utility that makes one HTTP call and exits. Is there a meaningful benefit to making it async?**

> **Bottom line:** Functionally no — there's one call, one thread, and the process exits immediately — but I'd still use `async Main` for consistency and to avoid awkward workarounds.

**Elaboration:** With `async Main` available since C# 7.1, there's no reason not to. The alternative is `GetAwaiter().GetResult()` in a non-async Main, which works fine in a console app but is a bad habit to normalize. In a simple CLI the performance difference is zero, so go async and write idiomatic code.

---

**Q: What is the difference between concurrency and parallelism in the context of async .NET code? Can `async`/`await` alone achieve parallelism?**

> **Bottom line:** Concurrency is interleaved progress on multiple tasks; parallelism is simultaneous execution on multiple cores. `async`/`await` alone gives you concurrency, not parallelism.

**Elaboration:** `await`ing multiple tasks concurrently (like with `Task.WhenAll`) interleaves their I/O waits — but a single thread is still doing the actual work one step at a time. True parallelism requires multiple threads, which means `Task.Run`, `Parallel.For`, or PLINQ. For I/O-heavy workloads, concurrency is usually enough. For CPU-heavy work, you need actual parallelism.

---

**Q: When would you choose `Parallel.ForEachAsync` over a set of concurrent `await`ed tasks? What are the trade-offs around degree-of-parallelism control?**

> **Bottom line:** `Parallel.ForEachAsync` is the right choice when you have a large collection and need to bound the degree of parallelism declaratively without managing it manually.

**Elaboration:** Starting 10,000 tasks with `Task.WhenAll` floods the thread pool and can overwhelm downstream services. `Parallel.ForEachAsync` lets you set `MaxDegreeOfParallelism` cleanly and it handles the partitioning. The trade-off is less flexibility — `Task.WhenAll` with your own throttling via `SemaphoreSlim` gives you more control over error handling and task tracking, at the cost of more boilerplate.

---

**Q: You need to throttle concurrent async operations to at most N at a time. How would you implement that, and what primitive would you use?**

> **Bottom line:** Use `SemaphoreSlim` initialized to N — `await WaitAsync()` before each operation and `Release()` in a `finally` block after.

```csharp
var semaphore = new SemaphoreSlim(maxConcurrency);

var tasks = items.Select(async item =>
{
    await semaphore.WaitAsync();
    try { await ProcessAsync(item); }
    finally { semaphore.Release(); }
});

await Task.WhenAll(tasks);
```

**Elaboration:** `SemaphoreSlim.WaitAsync()` is the key — it's a non-blocking async wait, unlike the synchronous `Wait()`. This pattern is the standard way to rate-limit concurrency without blocking threads. `Parallel.ForEachAsync` with `MaxDegreeOfParallelism` is a cleaner API if you're working with a collection rather than arbitrary tasks.

---

**Q: Compare `Channel<T>` and `BlockingCollection<T>` as mechanisms for producer-consumer pipelines. When is each appropriate in an async context?**

> **Bottom line:** `Channel<T>` is designed for async producers and consumers; `BlockingCollection<T>` is synchronous and blocks threads.

**Elaboration:** `BlockingCollection<T>` uses blocking operations — `Add` and `Take` — that hold threads. In an async service, that's thread-pool starvation waiting to happen. `Channel<T>` exposes `WriteAsync` and `ReadAsync` which integrate cleanly with `async`/`await`. If you're building a pipeline in a modern async codebase, `Channel<T>` is the right primitive. `BlockingCollection` is fine in legacy synchronous code or dedicated background threads, but not in async hot paths.

---

**Q: How does `IAsyncEnumerable<T>` differ from returning a `Task<IEnumerable<T>>`? When does the streaming model win?**

> **Bottom line:** `Task<IEnumerable<T>>` materializes the entire collection before returning; `IAsyncEnumerable<T>` yields items one at a time as they're produced.

**Elaboration:** The streaming model wins when the dataset is large, when you want the caller to process items as they arrive, or when you don't need all results before starting work. A classic example: streaming rows from a database query — with `Task<IEnumerable<T>>` you wait for all rows and buffer them in memory; with `IAsyncEnumerable<T>` you process rows as they arrive off the wire, with constant memory usage. Use `await foreach` to consume it.

---

## Level 7 — Advanced & Expert

---

**Q: What is "async overhead" and in which hot-path scenarios do you need to measure and minimize it?**

> **Bottom line:** Async overhead is the cost of state machine allocation, context capture, and scheduler invocations — measurable on paths that execute millions of times per second and usually complete synchronously.

**Elaboration:** For most server code hitting databases or HTTP endpoints, async overhead is irrelevant compared to network latency. Where it matters: caches hit on every request, serialization pipelines, in-memory message dispatchers, and any tight inner loop. Tools: BenchmarkDotNet for microbenchmarks, PerfView or dotMemory for allocation profiling, and ETW/async profiler traces to spot scheduler overhead.

---

**Q: How does `PoolingAsyncValueTaskMethodBuilder` help reduce allocations, and how do you opt into it?**

> **Bottom line:** It pools the state machine objects so the same memory is reused across invocations instead of allocating a new struct on every call.

**Elaboration:** You opt in per-method with an attribute, and the runtime manages a pool of `IValueTaskSource` instances that back the returned `ValueTask`. For frequently-called async methods that often complete asynchronously, this can dramatically reduce GC pressure. It was introduced in .NET 6 and requires opting in explicitly — it's not the default because pooling adds coordination overhead that isn't worth it for all methods.

```csharp
[AsyncMethodBuilder(typeof(PoolingAsyncValueTaskMethodBuilder<>))]
public async ValueTask<int> GetAsync() { ... }
```

---

**Q: A service handles 50k req/s and you observe high GC pressure. Profiling shows most allocations come from async state machines. What strategies would you apply?**

> **Bottom line:** Switch hot paths to `ValueTask`, use `PoolingAsyncValueTaskMethodBuilder`, eliminate unnecessary `await`s by returning tasks directly, and reduce closure captures.

**Elaboration:** First, identify the top allocating methods with a memory profiler. For paths that frequently complete synchronously, switch the return type to `ValueTask<T>`. For paths that always go async, opt into `PoolingAsyncValueTaskMethodBuilder`. Where you have `async` methods that just `await` a single call with no other logic, remove `async`/`await` and return the task directly — that eliminates the state machine entirely. Also audit lambdas passed to `Task.Run` or continuations — captured variables create additional closure allocations.

---

**Q: You have a tree of async calls that fans out to dozens of child operations. How do you propagate cancellation efficiently, and how do you ensure resources are cleaned up when any node is cancelled?**

> **Bottom line:** Pass the same `CancellationToken` through every method in the tree, and use `try/finally` or `IAsyncDisposable` to guarantee cleanup regardless of cancellation.

**Elaboration:** The token propagates naturally through parameters — every `await` in the chain gets the token, and any async API that accepts a token (like `HttpClient`, EF Core queries) will abort immediately on cancellation. For resource cleanup, `using` statements work because they emit a `finally` block that runs even on `OperationCanceledException`. For fan-out, if you want to cancel the whole tree when one child fails, that's where `CreateLinkedTokenSource` comes in — you link the incoming token with a new source and cancel it on any child fault.

---

**Q: What is `CancellationTokenSource.CreateLinkedTokenSource` and when would you use it?**

> **Bottom line:** It creates a new token that is cancelled when any of the linked tokens are cancelled — useful when you want to add local cancellation reasons on top of an incoming token.

**Elaboration:** The classic use case is a timeout that layers on top of a caller's cancellation: you take the incoming token, link it with a `CancelAfter` source, and pass the linked token to your operation. If either the caller cancels or the timeout fires, the operation stops. Another use: a fan-out where you want to cancel all children if any one child fails — cancel the linked source's parent when the first failure is detected.

---

**Q: How do you implement a timeout that applies to a group of concurrent tasks, not just a single one?**

> **Bottom line:** Race `Task.WhenAll(groupTasks)` against `Task.Delay(timeout)` using `Task.WhenAny`, then cancel the group if the delay wins.

```csharp
using var cts = CancellationTokenSource.CreateLinkedTokenSource(externalToken);
cts.CancelAfter(timeout);

try
{
    await Task.WhenAll(tasks.Select(t => t(cts.Token)));
}
catch (OperationCanceledException) when (cts.IsCancellationRequested) { }
```

**Elaboration:** Passing the cancellation token to every task in the group ensures all of them respond to the timeout, not just the outermost `WhenAll`. The `when` clause distinguishes a timeout cancellation from an external one if you need to handle them differently.

---

**Q: An async method is hanging in production — the task never completes. Walk me through how you would diagnose this without restarting the process.**

> **Bottom line:** Capture a process dump and analyze it for blocked threads, async state machines stuck at a specific await point, and held synchronization primitives.

**Elaboration:** I'd use `dotnet-dump collect` to take a live dump without restarting, then `dotnet-dump analyze` with `dumpasync` to list all incomplete async state machines and which awaitable they're stuck on. If it's a deadlock, `syncblk` and `clrstack` show which threads hold and are waiting on which locks. PerfView's thread time view or the VS Parallel Stacks window on an attached debugger also surface stuck await chains clearly. The goal is to identify: is the task suspended waiting for I/O, for a lock, for a cancellation that never fires, or something else?

---

**Q: How do `Activity` and `AsyncLocal<T>` interact when crossing `await` boundaries? How would you propagate a trace ID through an async call graph?**

> **Bottom line:** `AsyncLocal<T>` values flow into continuations automatically via `ExecutionContext` capture — `Activity` (from `System.Diagnostics`) uses this to propagate trace context across `await` points.

**Elaboration:** When you `await`, the runtime captures the current `ExecutionContext`, which includes all `AsyncLocal<T>` slots. The continuation runs with a copy of that context, so your trace ID is visible. `Activity.Current` is itself stored in an `AsyncLocal`, so it flows automatically. For manual propagation, set an `AsyncLocal<string>` with your trace ID before the first `await` and read it deep in the call tree — it'll be there.

---

**Q: What is a "hot" vs "cold" task? Does `async`/`await` in C# produce hot or cold tasks, and what are the implications?**

> **Bottom line:** A hot task is already running when you receive it; a cold task hasn't started yet. C# `async`/`await` always produces hot tasks.

**Elaboration:** In Rx and some other frameworks, you can have cold observables or cold tasks that start on subscription. In C# `async` methods, execution starts as soon as you call the method — by the time you get the `Task` back, the method is already running. The implication: you can call multiple async methods, collect their tasks, and then `await` them all — the operations started in parallel. There's no "subscribe to start" step.

---

**Q: What happens to the `ExecutionContext` when you use `Task.Run`? Is the caller's `AsyncLocal<T>` value visible inside the `Task.Run` lambda?**

> **Bottom line:** Yes — `Task.Run` captures the caller's `ExecutionContext` and the lambda runs with a copy of it, so `AsyncLocal<T>` values are visible inside.

**Elaboration:** This is "flowing" the context. The values are copied — not shared — so mutations inside `Task.Run` don't propagate back to the caller. This is intentional and safe. The context capture happens at the point of the `Task.Run` call, not when the lambda executes. If you need to suppress flow for performance or isolation, use `ExecutionContext.SuppressFlow()`.

---

**Q: How does async code interact with `lock` statements? Why can't you `await` inside a `lock`, and what are the alternatives?**

> **Bottom line:** You can't `await` inside a `lock` because the continuation may resume on a different thread, which would try to release a lock it doesn't own.

**Elaboration:** `lock` in C# is syntactic sugar for `Monitor.Enter`/`Monitor.Exit`, which are thread-affine — the thread that enters must be the thread that exits. Since `await` can resume on a different thread, the continuation would try to call `Monitor.Exit` on the wrong thread, which throws. The async alternative is `SemaphoreSlim`, which is not thread-affine: `await semaphore.WaitAsync()` and `semaphore.Release()` can happen on different threads.

---

**Q: `SemaphoreSlim` exposes both `Wait()` and `WaitAsync()`. In a high-throughput async service, what are the consequences of accidentally using `Wait()` instead of `await WaitAsync()`?**

> **Bottom line:** `Wait()` blocks the calling thread, consuming a thread-pool thread for the duration of the wait — under contention, this starves the pool and degrades throughput across the entire service.

**Elaboration:** If you have 50 concurrent requests all contending on a `SemaphoreSlim` and using `Wait()`, that's potentially 50 thread-pool threads sitting blocked. The thread pool responds by slowly spinning up more threads, which takes time and memory. Meanwhile new requests queue up waiting for threads. With `await WaitAsync()`, contending requests suspend without holding a thread, so the same thread-pool threads can keep processing other work while waiting their turn. This is one of the most common and subtle performance issues in async services.
