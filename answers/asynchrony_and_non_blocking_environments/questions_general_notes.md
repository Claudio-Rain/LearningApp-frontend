# Asynchrony & Non-Blocking — Concept Maps

---

## 1. The Big Picture: Concept Relationships

```mermaid
mindmap
  root((Async & Non-Blocking))
    Execution Models
      Synchronous
        Blocking
        Thread held idle
      Asynchronous
        Non-blocking
        Thread released during I/O
      Concurrent
        Interleaved progress
        Single thread possible
      Parallel
        Simultaneous execution
        Requires multiple threads/cores
    Work Types
      I/O-Bound
        Network calls
        Disk reads
        Database queries
        Use async/await directly
      CPU-Bound
        Image processing
        Hashing / computation
        Use Task.Run to offload
    Core Primitives
      Task
        Represents future result
        NOT a thread
        States: pending / running / completed / faulted
      ValueTask
        Struct-based
        Avoids heap allocation
        Sync-path optimization
        Single-use only
      CancellationToken
        Cooperative cancellation
        Flows down call chain
        ThrowIfCancellationRequested
    Patterns
      async/await
        Compiler state machine
        Reads like sync code
        Hot tasks
      Task.WhenAll
        Concurrent fan-out
        Wait for all
      Task.WhenAny
        Race pattern
        Timeout implementation
      SemaphoreSlim
        Throttle concurrency
        WaitAsync = non-blocking
      Channel T
        Producer-consumer pipeline
        Async-native
    Pitfalls
      Deadlocks
        Result on sync context
        Wait on UI thread
      async void
        Unobserved exceptions
        Only for event handlers
      Thread Pool Starvation
        Blocking in async code
        Too many Thread Sleep
      ConfigureAwait false
        Library code must use it
        Avoids context marshaling
```

---

## 2. Runtime Execution Model (What Happens Under the Hood)

```mermaid
flowchart TD
    A[Caller invokes async method] --> B[State machine created on stack]
    B --> C[MoveNext called — execution starts]
    C --> D{Awaitable already complete?}

    D -- Yes --> E[Continue synchronously\nno suspension needed]
    D -- No --> F[Register completion callback\non awaiter]

    F --> G[Thread returns to caller\nor thread pool]
    G --> H[... other work happens ...]

    H --> I[I/O hardware completes\nOS notifies runtime]
    I --> J{SynchronizationContext\ncaptured?}

    J -- Yes\ne.g. UI thread --> K[Post continuation to\nSynchronizationContext]
    J -- No\nASP.NET Core / console --> L[Schedule on any\nThread Pool thread]

    K --> M[MoveNext called again\nstate restored from fields]
    L --> M

    M --> N{More awaits?}
    N -- Yes --> D
    N -- No --> O[Task marked Complete\nresult stored]
    O --> P[Callers awaiting this\ntask are resumed]

    style F fill:#f0ad4e,color:#000
    style G fill:#5bc0de,color:#000
    style I fill:#5cb85c,color:#000
    style K fill:#d9534f,color:#fff
```

---

## 3. Task States & Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created : Task object exists\nnot yet started

    Created --> Running : task.Start()\nor Task.Run()\nor async method called

    Running --> RanToCompletion : work finished\nresult available
    Running --> Faulted : unhandled exception\nthrown inside
    Running --> Cancelled : OperationCanceledException\nwith matching token

    RanToCompletion --> [*] : await returns value\ncontinuation resumes
    Faulted --> [*] : await re-throws\noriginal exception\nnot AggregateException
    Cancelled --> [*] : await throws\nOperationCanceledException

    note right of Faulted
        .Result wraps in AggregateException
        await unwraps to original type
    end note

    note right of Running
        Task ≠ Thread
        May use I/O port with NO thread
        May already be done before you await
    end note
```

---

## 4. Blocking vs Non-Blocking: Thread Behaviour

```mermaid
sequenceDiagram
    participant R as Request Thread
    participant DB as Database
    participant TP as Thread Pool
    participant C as Continuation

    rect rgb(255, 200, 200)
        Note over R,DB: BLOCKING (synchronous)
        R->>DB: query (Thread.Sleep / .Result / .Wait)
        Note over R: ❌ Thread HELD — doing nothing
        DB-->>R: response (5 seconds later)
        Note over R: Only NOW can handle next request
    end

    rect rgb(200, 255, 200)
        Note over R,C: NON-BLOCKING (async/await)
        R->>DB: await queryAsync()
        Note over R: ✅ Thread RELEASED back to pool
        R->>TP: handle other requests...
        TP->>TP: handle other requests...
        DB-->>C: I/O complete — callback fires
        C->>TP: schedule MoveNext on any free thread
        Note over C: Continuation resumes with result
    end
```

---

## 5. When to Use What — Decision Tree

```mermaid
flowchart TD
    START([You need to run some work]) --> Q1{Is the work\nI/O-bound?}

    Q1 -- Yes --> Q2{Does the API\nexpose async methods?}
    Q2 -- Yes --> A1[✅ await the async API directly\nHttpClient.GetAsync\nDbContext.SaveChangesAsync\nFile.ReadAllTextAsync]
    Q2 -- No --> A2[⚠️ Wrap in Task.Run\nor use async adapter\nThis is the sync-over-async smell]

    Q1 -- No --> Q3{Is it CPU-bound?}
    Q3 -- Yes --> Q4{Is the caller\na UI or request thread?}
    Q4 -- Yes --> A3[✅ Task.Run to offload\nto thread pool\nthen await the result]
    Q4 -- No --> A4[Consider Parallel.For\nor PLINQ for data parallelism]

    Q3 -- No --> Q5{Result already\navailable synchronously?}
    Q5 -- Yes --> A5[Task.FromResult / ValueTask\nno async overhead needed]
    Q5 -- No --> A6[Review the use case —\nmay need Channel or\nIAsyncEnumerable]

    A1 --> DONE([await it — done])
    A3 --> DONE

    style A1 fill:#5cb85c,color:#fff
    style A3 fill:#5cb85c,color:#fff
    style A2 fill:#d9534f,color:#fff
    style A5 fill:#5bc0de,color:#000
```

---

## 6. Concurrency vs Parallelism

```mermaid
flowchart LR
    subgraph CONCURRENT["Concurrent (async/await) — 1 thread"]
        direction TB
        T1[Thread]
        R1[Request A: await DB query]
        R2[Request B: await HTTP call]
        R3[Request C: processing]

        T1 --> R3
        T1 -.->|"suspended\n(I/O in flight)"| R1
        T1 -.->|"suspended\n(I/O in flight)"| R2
    end

    subgraph PARALLEL["Parallel (Task.Run / PLINQ) — multiple threads"]
        direction TB
        T2[Thread 1] --> W1[CPU work chunk A]
        T3[Thread 2] --> W2[CPU work chunk B]
        T4[Thread 3] --> W3[CPU work chunk C]
    end

    CONCURRENT -->|"I/O-bound ✅\nsmall thread pool\nthousands of requests"| NOTE1[High throughput\nlow thread count]
    PARALLEL -->|"CPU-bound ✅\nactual simultaneous\nexecution"| NOTE2[Faster computation\nmore cores = more speed]
```

---

## 7. ConfigureAwait & SynchronizationContext

```mermaid
flowchart TD
    AWAIT[await someTask] --> CAPTURE{Capture\nSynchronizationContext?}

    CAPTURE -->|"ConfigureAwait true\ndefault"| CTX{Is there a\nSynchronizationContext?}
    CAPTURE -->|"ConfigureAwait false"| POOL[Resume on any\nThread Pool thread\nno marshaling]

    CTX -- Yes\nUI thread / classic ASP.NET --> MARSHAL[Post continuation\nback to that context\ne.g. WPF UI thread]
    CTX -- No\nASP.NET Core / console --> POOL

    MARSHAL --> DEADLOCK{Caller doing\n.Result or .Wait\non that context?}
    DEADLOCK -- Yes --> DEAD[💀 DEADLOCK\nContext blocked\nContinuation queued to it\nNeither moves]
    DEADLOCK -- No --> SAFE[✅ Continuation runs\non original context]

    style DEAD fill:#d9534f,color:#fff
    style SAFE fill:#5cb85c,color:#fff
    style POOL fill:#5cb85c,color:#fff
```

---

## 8. CancellationToken Flow

```mermaid
flowchart TD
    CTS[CancellationTokenSource\ncreated by caller] -->|".Token property"| TOKEN[CancellationToken\nread-only view]
    TOKEN -->|passed as parameter| M1[Method A]
    M1 -->|passes token down| M2[Method B]
    M2 -->|passes token down| M3[Method C\ne.g. HttpClient.GetAsync]

    CTS -->|"caller calls .Cancel()\nor CancelAfter timeout fires"| SIGNAL[Cancellation signalled]

    SIGNAL --> CHECK1[token.ThrowIfCancellationRequested\nat checkpoints in M1/M2]
    SIGNAL --> CHECK2[HttpClient observes token\naborts connection]

    CHECK1 --> OCE[OperationCanceledException\npropagates up call chain]
    CHECK2 --> OCE

    OCE --> CALLER[Caller catches\nOperationCanceledException\nor lets it propagate]

    subgraph LINKED["CreateLinkedTokenSource — layering cancellation"]
        EXT[External token\nfrom caller] --> LINK[CreateLinkedTokenSource]
        TIMEOUT[CancelAfter 3s] --> LINK
        LINK --> LINKED_TOKEN[Linked token\ncancelled if EITHER fires]
    end

    style SIGNAL fill:#f0ad4e,color:#000
    style OCE fill:#5bc0de,color:#000
```

---

## 9. Task.WhenAll vs WhenAny vs Sequential

```mermaid
gantt
    title Task Execution Timing Comparison
    dateFormat  s
    axisFormat  %Ss

    section Sequential await
    Task A     :a1, 0, 3s
    Task B     :a2, after a1, 2s
    Task C     :a3, after a2, 4s
    Total 9s   :milestone, after a3, 0

    section Task.WhenAll (concurrent)
    Task A     :b1, 0, 3s
    Task B     :b2, 0, 2s
    Task C     :b3, 0, 4s
    Total 4s   :milestone, after b3, 0

    section Task.WhenAny (first wins)
    Task A     :c1, 0, 3s
    Task B     :c2, 0, 2s
    Task C     :c3, 0, 4s
    Done at 2s :milestone, after c2, 0
```

---

## 10. async void vs async Task — Exception Paths

```mermaid
flowchart TD
    subgraph VOID["async void method"]
        V1[Exception thrown inside] --> V2[No Task to store it on]
        V2 --> V3[Posted to SynchronizationContext\nUnhandledException]
        V3 --> V4[💥 Process crash\nor silent swallow]
        V5[Caller cannot await it] --> V6[Cannot compose\ncannot cancel\ncannot test cleanly]
    end

    subgraph TASK["async Task method"]
        T1[Exception thrown inside] --> T2[Stored on the Task\nas faulted state]
        T2 --> T3[Surfaced when caller awaits]
        T3 --> T4[✅ Original exception type\nclean try/catch]
        T5[Caller awaits it] --> T6[Can WhenAll\ncan cancel\ncan test]
    end

    RULE[async void ONLY for event handlers\nwhere signature is fixed\ne.g. button.Click +=]

    style V4 fill:#d9534f,color:#fff
    style T4 fill:#5cb85c,color:#fff
    style RULE fill:#f0ad4e,color:#000
```
