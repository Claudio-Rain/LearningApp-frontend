# L2 What is the difference between `app.Use`, `app.Run`, and `app.Map` when registering middleware, and which allows the request to continue down the pipeline?

## Answer

ASP.NET Core builds the request pipeline by chaining `RequestDelegate` instances. The three registration methods differ in whether they pass control to the next component and whether they apply to a sub-path.

| Method | Calls `next`? | Terminates pipeline? | Branching? |
|---|---|---|---|
| `app.Use` | Yes (optionally) | No (unless you skip `next`) | No |
| `app.Run` | Never | Yes — always terminal | No |
| `app.Map` | N/A | Depends on branch contents | Yes — matches a path prefix |

### `app.Use` — Pass-through middleware

`app.Use` receives the `next` delegate and can invoke it to continue the pipeline. This is the standard way to write middleware that runs both before and after downstream components.

```csharp
app.Use(async (context, next) =>
{
    // Before downstream
    context.Items["StartTime"] = DateTime.UtcNow;

    await next(context);   // continue to the next middleware

    // After downstream (response is being returned)
    var start = (DateTime)context.Items["StartTime"]!;
    var elapsed = DateTime.UtcNow - start;
    Console.WriteLine($"Elapsed: {elapsed.TotalMilliseconds}ms");
});
```

Omitting `await next(context)` effectively short-circuits the pipeline from inside `Use`.

### `app.Run` — Terminal middleware

`app.Run` does **not** receive a `next` delegate. The pipeline always ends here. Registering anything after `app.Run` has no effect — those components are unreachable.

```csharp
app.Run(async context =>
{
    // This is the final handler — nothing after this runs
    context.Response.StatusCode = 200;
    await context.Response.WriteAsync("Hello from terminal middleware");
});

app.Use(/* never reached */);  // dead code
```

### `app.Map` — Path-based branching

`app.Map` splits the pipeline based on a path prefix. Requests that match the prefix are routed into the branch; non-matching requests continue on the main pipeline. The matched prefix is removed from `Request.Path` inside the branch.

```csharp
app.Map("/healthz", branch =>
{
    // Only requests to /healthz enter this branch
    branch.Run(async context =>
    {
        await context.Response.WriteAsync("Healthy");
    });
});

// Requests that do NOT start with /healthz reach here
app.MapControllers();
```

`app.MapWhen` is a more flexible variant that branches on any condition, not just a path:

```csharp
app.MapWhen(
    ctx => ctx.Request.Headers.ContainsKey("X-Debug"),
    branch => branch.UseMiddleware<DebugMiddleware>());
```

### Quick Decision Guide

- Use **`app.Use`** when your middleware needs to run logic before AND after downstream components (logging, timing, exception handling).
- Use **`app.Run`** for the absolute last handler in the pipeline, typically a catch-all or a minimal endpoint.
- Use **`app.Map`** to isolate a path prefix into its own sub-pipeline (health checks, admin routes, webhooks).

### Key Takeaways

- Only `app.Use` passes control downstream via `next` — it is the only method that allows the request to continue.
- `app.Run` is always terminal; code registered after it is unreachable.
- `app.Map` creates a branch; the main pipeline continues for requests that do not match the prefix.
- Order of registration matters: middleware runs in the order it is added with `Use`/`Run`, and branch selection happens top-to-bottom for `Map`.
