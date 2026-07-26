# ASP.NET 4.x SynchronizationContext Deadlock

## The Deadlock Scenario

```mermaid
sequenceDiagram
    participant RT as Request Thread
    participant SC as ASP.NET<br/>SyncContext
    participant IO as I/O Operation
    
    RT->>SC: Holds sync context
    RT->>RT: Calls .Result (blocks)
    Note over RT: Thread blocked,<br/>waiting for task
    
    RT->>IO: Inner await scheduled
    IO->>IO: I/O completes
    
    IO->>SC: Continuation tries to resume<br/>on sync context
    Note over SC: Context occupied by<br/>blocked thread!
    SC->>SC: Cannot proceed
    
    RT->>RT: ❌ DEADLOCK
    SC->>SC: ❌ DEADLOCK
```

## Execution Timeline

```mermaid
gantt
    title ASP.NET 4.x Deadlock Timeline
    dateFormat YYYY-MM-DD HH:mm:ss
    
    section Request Thread
    Hold SyncContext :active, thread1, 2026-05-19 12:00:00, 10s
    .Result blocks thread :crit, thread2, 2026-05-19 12:00:01, 9s
    
    section SyncContext
    Occupied by thread :crit, ctx1, 2026-05-19 12:00:01, 9s
    Waiting for continuation :crit, ctx2, 2026-05-19 12:00:05, 4s
    
    section I/O Operation
    Async work :, io1, 2026-05-19 12:00:02, 3s
    Tries to schedule continuation :crit, io2, 2026-05-19 12:00:05, 1s
    
    section Result
    Deadlock :crit, dead1, 2026-05-19 12:00:06, 3s
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> RequestThread: HTTP Request arrives
    RequestThread --> CallsResult: .Result blocks thread
    CallsResult --> AwaitScheduled: Inner await scheduled on I/O
    AwaitScheduled --> IOCompletes: I/O operation finishes
    IOCompletes --> ContinuationWaits: Continuation tries to resume<br/>on SyncContext
    ContinuationWaits --> Deadlock: SyncContext occupied<br/>by blocked thread
    Deadlock --> [*]
    
    note right of CallsResult
        Thread holds SyncContext
        and blocks waiting for task
    end note
    
    note right of ContinuationWaits
        Continuation scheduled on
        same SyncContext that's blocked
    end note
    
    note right of Deadlock
        Neither thread nor context
        can make progress
    end note
```

## Solution Comparison

```mermaid
graph TD
    A["ASP.NET 4.x Sync Context<br/>Deadlock Problem"] --> B1["❌ Using .Result"]
    A --> B2["✅ Solution 1:<br/>async/await"]
    A --> B3["✅ Solution 2:<br/>ConfigureAwait false"]
    A --> B4["✅ Solution 3:<br/>Task.Run"]
    
    B1 --> C1["Blocks on .Result"]
    C1 --> C1a["Holds SyncContext"]
    C1a --> C1b["❌ DEADLOCK"]
    
    B2 --> C2["Make handler async"]
    C2 --> C2a["await all the way"]
    C2a --> C2b["✅ No deadlock"]
    
    B3 --> C3["Escape SyncContext"]
    C3 --> C3a["ConfigureAwait false"]
    C3a --> C3b["✅ No deadlock"]
    
    B4 --> C4["Run on thread pool"]
    C4 --> C4a["Different thread,<br/>no context"]
    C4a --> C4b["✅ No deadlock"]
```
