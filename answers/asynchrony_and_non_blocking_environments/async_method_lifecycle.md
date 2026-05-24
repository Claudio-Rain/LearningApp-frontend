# Async Method Lifecycle Diagram

## Sequence Diagram: Async Method Lifecycle with All Actors

```mermaid
sequenceDiagram
    participant Caller as Caller Code
    participant AsyncFunc as Async Function
    participant Promise as Promise
    participant EventLoop as Event Loop
    participant Microtask as Microtask Queue
    participant Macrotask as Macrotask Queue
    participant AsyncOp as Async Operation<br/>(I/O, Timer, etc)

    Caller->>AsyncFunc: 1. Call async function()
    AsyncFunc->>Promise: 2. Create Promise immediately
    Promise-->>Caller: 3. Return Promise (pending)
    
    Note over AsyncFunc: Execution starts (synchronously)
    AsyncFunc->>AsyncFunc: 4. Run sync code
    
    rect rgb(200, 220, 255)
        Note over AsyncFunc,AsyncOp: Await Point
        AsyncFunc->>AsyncOp: 5. Initiate async operation
        AsyncOp->>Macrotask: 6. Register callback
        AsyncFunc->>Microtask: 7. Suspend execution
        AsyncFunc-->>Caller: (Control returns to caller)
    end
    
    rect rgb(255, 240, 200)
        Note over EventLoop: Event Loop Cycle
        EventLoop->>Microtask: 8. Process all microtasks
        EventLoop->>Macrotask: 9. Get next macrotask
        Macrotask->>AsyncOp: 10. Async operation completes
    end
    
    AsyncOp->>Promise: 11. Resolve/Reject with result
    Promise->>Microtask: 12. Schedule promise callback
    
    EventLoop->>Microtask: 13. Execute promise callback
    Microtask->>AsyncFunc: 14. Resume async function
    
    Note over AsyncFunc: Resumed execution
    AsyncFunc->>AsyncFunc: 15. Continue after await
    
    AsyncFunc->>Promise: 16. Return final value
    Promise-->>Caller: 17. Resolve with result
    Caller->>Caller: 18. Execute .then() or next line
```

## Key Actors Explained

### 1. **Caller Code**
- Initiates the async function call
- Receives a Promise/Task immediately (non-blocking)
- Continues execution while operation is pending
- Can attach callbacks or await the result

### 2. **Async Function**
- Executes synchronously until the first `await` point
- Returns a Promise immediately (hot task)
- Execution is **suspended** at await points, not blocked
- Resumes when awaited operation completes

### 3. **Promise**
- Represents the eventual result of async work
- State: **pending** → **resolved** (fulfilled) or **rejected** (error)
- Holds the actual result/error value
- Notifies all listeners when state changes

### 4. **Event Loop**
- Single-threaded orchestrator in JavaScript
- Continuously processes tasks from queues
- Prioritizes microtasks over macrotasks
- Drives resumption of suspended functions

### 5. **Microtask Queue** (High Priority)
- Promise `.then()` callbacks
- `queueMicrotask()` calls
- `MutationObserver` callbacks
- Processed **completely** before next macrotask

### 6. **Macrotask Queue** (Lower Priority)
- `setTimeout()`/`setInterval()`
- File I/O operations
- UI events
- HTTP requests
- Only one macrotask processed per event loop cycle

### 7. **Async Operation**
- The actual I/O work: network call, file read, timer, database query
- Non-blocking from CPU perspective
- Handled by OS-level mechanisms
- Completes independently, then notifies runtime

---

## Lifecycle Stages Breakdown

### Stage 1: **Call & Initialization**
```
Caller invokes async function() 
→ Promise created immediately
→ Control returned to caller (non-blocking)
```

### Stage 2: **Synchronous Execution**
```
Async function runs synchronously
→ Executes code until first `await`
→ May complete synchronously if no await
```

### Stage 3: **Suspension at Await**
```
Function reaches `await` point
→ Operation initiated (e.g., fetch())
→ Function execution paused
→ State captured in state machine
→ Thread/execution context released
```

### Stage 4: **Pending State**
```
Promise is pending
→ Async operation in progress
→ Event loop processing other tasks
→ No thread blocked, waiting "free"
```

### Stage 5: **Operation Completion**
```
I/O operation finishes
→ Result/error available
→ Runtime notified (OS completion port)
→ Promise state changes (resolve/reject)
```

### Stage 6: **Callback Scheduling**
```
Promise resolves/rejects
→ Continuation callback scheduled
→ Added to microtask queue (high priority)
→ Event loop will process next
```

### Stage 7: **Resumption**
```
Event loop picks up microtask
→ Async function resumes execution
→ Awaited value now available
→ Continues from suspension point
```

### Stage 8: **Completion & Return**
```
Async function finishes execution
→ Returned value wrapped in Promise
→ Promise resolves with final result
→ Caller's callbacks triggered
→ Results available to consumer
```

---

## Task Execution Flow Chart

```mermaid
flowchart TD
    A["Call async function()"] --> B["Create Promise<br/>(pending)"]
    B --> C["Return Promise<br/>to Caller"]
    C --> D["Start Execution<br/>(synchronously)"]
    D --> E{"Await Point?"}
    
    E -->|No| F["Execute to End"]
    F --> G["Resolve Promise<br/>with result"]
    
    E -->|Yes| H["Initiate Operation<br/>(I/O, Timer, etc)"]
    H --> I["Suspend Function<br/>(State Saved)"]
    I --> J["Release Control<br/>to Caller"]
    
    J --> K["Event Loop<br/>Processes Tasks"]
    K --> L["Async Operation<br/>Completes"]
    L --> M["Schedule Callback<br/>(Microtask)"]
    M --> N["Event Loop<br/>Executes Callback"]
    N --> O["Resume Function<br/>from Await Point"]
    
    O --> P["Continue Execution"]
    P --> Q{"More Awaits?"}
    Q -->|Yes| H
    Q -->|No| F
    
    G --> R["Caller consumes<br/>result"]
```

---

## Why This Matters

### **Non-Blocking Execution**
- Caller is never blocked
- Promise returned immediately
- Thread can handle other work
- Critical for scalability

### **Automatic State Management**
- Compiler generates state machine
- Locals preserved across suspensions
- No manual context switching
- Error handling works naturally with `try/catch`

### **Event Loop Coordination**
- Microtasks guarantee execution before next macrotask
- Prevents race conditions
- Ensures predictable ordering
- Enables responsive applications

### **Resource Efficiency**
- Single thread handles thousands of async operations
- No thread per operation overhead
- OS provides hardware-level I/O notifications
- Scales to massive concurrency

---

## Example: Fetch Data Scenario

```javascript
// Caller initiates
const promise = fetchUserData(123);  // Returns immediately

console.log("Request sent"); // Executes right away

// Async function
async function fetchUserData(id) {
  const response = await fetch(`/api/user/${id}`); // Suspend here
  const data = await response.json();              // And here
  return { id, ...data };                           // Return
}
```

**Timeline:**
1. `fetchUserData()` called → Promise created
2. `console.log()` executes immediately
3. `fetch()` initiated → function suspends
4. Event loop processes other tasks
5. Network response arrives → callback scheduled
6. Function resumes at first `await`
7. `.json()` called → function suspends again
8. JSON parsing completes → callback scheduled
9. Function resumes → returns final result
10. Promise resolves with data
