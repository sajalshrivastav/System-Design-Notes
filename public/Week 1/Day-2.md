# ⚙️ Frontend System Design — Day 2
## Topic: The JavaScript Event Loop

> **Study time:** 1 hour | **Phase:** 1 of 5 | **Difficulty:** Beginner → Intermediate  
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Asked at every company — Google, Razorpay, CRED, Flipkart)

---

## 📌 The Big Picture

JavaScript is **single-threaded** — it can only execute one thing at a time.  
But websites need to handle timers, API calls, clicks, and animations simultaneously.

**The Event Loop is how JS handles async operations without blocking.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE EVENT LOOP ENGINE                        │
│                                                                 │
│   ┌──────────────┐    ┌─────────────┐    ┌──────────────────┐  │
│   │  Call Stack  │    │  Web APIs   │    │  Task Queues     │  │
│   │              │    │             │    │                  │  │
│   │ (JS engine)  │    │ setTimeout  │    │ Microtask Queue  │  │
│   │              │    │ fetch()     │    │ (Promises)       │  │
│   │ One task     │    │ addEventListener│                   │  │
│   │ at a time    │    │ XMLHttpReq  │    │ Macrotask Queue  │  │
│   │              │    │             │    │ (setTimeout,     │  │
│   │              │    │             │    │  setInterval)    │  │
│   └──────┬───────┘    └──────┬──────┘    └────────┬─────────┘  │
│          │                   │                    │            │
│          │◀──────────────────┴────────────────────┘            │
│                     Event Loop polls                           │
│              "Is call stack empty? Move next task in"          │
└─────────────────────────────────────────────────────────────────┘
```

---

## The 4 Components You Must Know

### 1. Call Stack
Where JS executes code. **LIFO** (Last In, First Out) — like a stack of plates.

```
┌─────────────────────────────────┐
│         CALL STACK              │
│                                 │
│  console.log("end")   ← TOP     │  ← executes first
│  main()               ← BOTTOM  │  ← executes last
│                                 │
└─────────────────────────────────┘

When a function is called → pushed onto stack
When a function returns  → popped off stack
When stack is EMPTY     → Event Loop can push next task
```

### 2. Web APIs (Browser) / Node APIs (Server)
The browser provides these — JS hands off async work here:

```
┌──────────────────────────────────────────────────────┐
│                    WEB APIS                          │
│                                                      │
│  setTimeout(cb, 1000)   → starts a 1 second timer   │
│  fetch(url)             → makes an HTTP request      │
│  addEventListener(...)  → waits for user event       │
│  XMLHttpRequest         → older HTTP request         │
│                                                      │
│  JS doesn't wait for these — it moves on immediately │
│  When done, callback is sent to the Task Queue       │
└──────────────────────────────────────────────────────┘
```

### 3. Microtask Queue (HIGH PRIORITY)
Callbacks from **Promises** and `queueMicrotask()` go here.

```
Microtask Queue examples:
  → Promise.resolve().then(callback)
  → async/await (internally uses Promises)
  → queueMicrotask(callback)
  → MutationObserver callbacks

PRIORITY RULE: ALL microtasks drain before ANY macrotask runs
```

### 4. Macrotask Queue (LOWER PRIORITY)
Also called Callback Queue or Task Queue.

```
Macrotask Queue examples:
  → setTimeout(callback, delay)
  → setInterval(callback, delay)
  → setImmediate (Node.js)
  → I/O callbacks
  → UI rendering events

One macrotask runs per Event Loop tick
```

---

## The Event Loop Algorithm

This is the exact loop the JavaScript engine runs:

```javascript
while (true) {
  
  // 1. Execute ALL synchronous code first
  executeSynchronousCode();
  
  // 2. Drain the ENTIRE microtask queue
  while (microtaskQueue.length > 0) {
    executeMicrotask(microtaskQueue.shift());
    // Note: new microtasks added here are also processed!
  }
  
  // 3. Take ONE macrotask (if any)
  if (macrotaskQueue.length > 0) {
    executeMacrotask(macrotaskQueue.shift());
  }
  
  // 4. Render if needed (browser only)
  if (shouldRender) render();
  
  // 5. Repeat
}
```

> The golden rule: Microtasks always run before macrotasks.  
> Even if a setTimeout has 0ms delay, a Promise will run before it.

---

## Example 1 — setTimeout Basics

```javascript
console.log("start");

setTimeout(() => {
  console.log("timeout");
}, 0);

console.log("end");
```

### Step-by-step walkthrough:

```
STEP 1: console.log("start")
  Stack: [console.log("start"), main()]
  → Executes immediately
  Output so far: "start"

STEP 2: setTimeout(cb, 0)
  Stack: [setTimeout, main()]
  → Hands callback to Web API
  → Web API: [timer: 0ms (cb)]
  → setTimeout IMMEDIATELY pops off stack
  → JS does NOT wait for 0ms — it moves on!

STEP 3: console.log("end")
  Stack: [console.log("end"), main()]
  → Executes immediately
  Output so far: "start", "end"

STEP 4: main() finishes, stack is empty
  Timer fires → cb moved to Macrotask Queue
  Macrotask Queue: [cb]

STEP 5: Event Loop sees empty stack
  → Moves cb from Macrotask Queue to Stack
  → cb() executes → console.log("timeout")
  Output: "start", "end", "timeout"
```

**Final output:**
```
start
end
timeout
```

> NOT "start", "timeout", "end" — even with 0ms delay!

---

## Example 2 — Promises vs setTimeout (CRITICAL)

```javascript
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve()
  .then(() => console.log("3"));

console.log("4");
```

### Step-by-step walkthrough:

```
STEP 1: console.log("1") → logs "1" immediately

STEP 2: setTimeout(cb2, 0) → cb2 goes to Web API, then Macrotask Queue

STEP 3: Promise.resolve().then(cb3)
  → Promise is ALREADY resolved
  → cb3 goes straight to Microtask Queue (NOT macrotask!)
  Microtask Queue: [cb3]

STEP 4: console.log("4") → logs "4" immediately

STEP 5: main() finishes, stack empty
  → Event Loop: any microtasks? YES
  → Runs cb3 → logs "3"
  → Microtask queue empty

STEP 6: Event Loop: any macrotasks? YES
  → Runs cb2 → logs "2"
```

**Final output:**
```
1
4
3
2
```

> KEY INSIGHT: Promises (microtasks) ALWAYS run before setTimeout (macrotasks)
> This is why async/await feels "faster" than setTimeout — it uses microtasks.

---

## Example 3 — The Classic Trick Question

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i);
  }, 0);
}
console.log("loop done");
```

### What does this log?

```
Most candidates say: 0, 1, 2
Correct answer:      loop done, 3, 3, 3
```

### Why?

```
STEP 1: Loop runs 3 times, registers 3 setTimeout callbacks
  Web API gets 3 timers
  i goes from 0 → 1 → 2 → 3 (loop ends when i=3)

STEP 2: console.log("loop done") executes synchronously

STEP 3: All 3 timers fire, 3 callbacks in Macrotask Queue

STEP 4: Each callback runs and reads i
  But i is var — function-scoped, SHARED across all iterations
  By the time callbacks run, i = 3
  All 3 callbacks log 3!
```

**Output:**
```
loop done
3
3
3
```

### The Fix — Use `let`:
```javascript
for (let i = 0; i < 3; i++) {    // let instead of var
  setTimeout(() => {
    console.log(i);               // each iteration has its OWN i
  }, 0);
}
// Output: loop done, 0, 1, 2
```

> `let` creates a new binding per loop iteration — each callback captures its own `i`.  
> `var` creates one binding for all iterations — all callbacks share the same `i`.

---

## async/await and the Event Loop

`async/await` is syntactic sugar over Promises. Internally it uses microtasks.

```javascript
async function fetchData() {
  console.log("1 - before await");
  const result = await Promise.resolve("data");
  console.log("3 - after await:", result);  // this is a microtask callback!
}

fetchData();
console.log("2 - sync after call");
```

**Output:**
```
1 - before await
2 - sync after call
3 - after await: data
```

### Why?

```
- fetchData() starts executing synchronously
- "1 - before await" logs
- await pauses fetchData and returns control to caller
  (await = Promise.then under the hood)
- "2 - sync after call" logs (synchronous code)
- Microtask queue: [resume fetchData]
- Stack empty → microtask runs → "3 - after await: data"
```

---

## Execution Order Priority (Memorize This)

```
┌─────────────────────────────────────────────────────────────┐
│              EXECUTION ORDER — HIGH TO LOW                  │
│                                                             │
│  1. Synchronous code              (runs first, always)      │
│     ↓                                                       │
│  2. Microtasks                    (Promises, async/await)   │
│     ALL microtasks drain before next step                   │
│     ↓                                                       │
│  3. Browser rendering             (if needed)               │
│     ↓                                                       │
│  4. One Macrotask                 (setTimeout, setInterval) │
│     ↓                                                       │
│  5. Back to step 2 (Microtasks again)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Microtasks vs Macrotasks — Quick Reference

```
┌────────────────────────────────┬──────────────────────────────┐
│        MICROTASKS              │        MACROTASKS            │
│    (High priority)             │    (Lower priority)          │
├────────────────────────────────┼──────────────────────────────┤
│ Promise.then()                 │ setTimeout()                 │
│ Promise.catch()                │ setInterval()                │
│ Promise.finally()              │ setImmediate() [Node]        │
│ async/await                    │ requestAnimationFrame        │
│ queueMicrotask()               │ I/O callbacks                │
│ MutationObserver               │ MessageChannel               │
├────────────────────────────────┼──────────────────────────────┤
│ ALL drain before macrotask     │ ONE per event loop tick      │
│ Can starve macrotasks if       │ Runs after all microtasks    │
│ continuously adding more       │ are drained                  │
└────────────────────────────────┴──────────────────────────────┘
```

---

## Interview Questions & Model Answers

### Q1: "What is the Event Loop?"

```
The Event Loop is a mechanism that allows JavaScript — which is 
single-threaded — to handle asynchronous operations non-blockingly.

It works by:
1. Executing all synchronous code on the Call Stack
2. When async operations (setTimeout, fetch) complete, their callbacks
   are placed in Task Queues
3. Once the Call Stack is empty, the Event Loop moves callbacks from
   the queues to the stack for execution
4. Microtasks (Promises) are always processed before Macrotasks (setTimeout)
```

### Q2: "What's the output of this code?"

```javascript
console.log("a");
setTimeout(() => console.log("b"), 0);
Promise.resolve().then(() => console.log("c"));
console.log("d");
```

**Answer:** `a, d, c, b`

```
- "a" and "d" are synchronous → run first
- Promise.then is a microtask → runs before setTimeout
- setTimeout is a macrotask → runs last
```

### Q3: "Why does setTimeout with 0ms delay not run immediately?"

```
setTimeout(cb, 0) doesn't mean "run now" — it means "run as soon as 
possible after the current call stack is empty".

The callback must:
1. Wait for current synchronous code to finish
2. Wait for ALL microtasks (Promises) to drain
3. Only then get picked up by the Event Loop

This is why setTimeout is unreliable for precise timing — actual delay 
is always >= specified delay, often much more under load.
```

### Q4: "What happens if you add microtasks inside a microtask?"

```javascript
Promise.resolve()
  .then(() => {
    console.log("microtask 1");
    Promise.resolve().then(() => console.log("microtask 2"));
  });

setTimeout(() => console.log("macrotask"), 0);
// Output: microtask 1, microtask 2, macrotask
```

```
New microtasks added during microtask processing are ALSO processed
before any macrotask runs. The microtask queue drains completely —
including newly added ones — before the Event Loop moves to macrotasks.

Warning: Infinite microtask loops will freeze the browser!
```

---

## Cheat Sheet — Memorize Before Interviews

```
EXECUTION ORDER:
  sync code → microtasks → render → one macrotask → repeat

MICROTASKS (Promise family):
  Promise.then/.catch/.finally, async/await
  queueMicrotask(), MutationObserver

MACROTASKS (Timer/IO family):
  setTimeout, setInterval, setImmediate
  I/O callbacks, requestAnimationFrame

GOLDEN RULES:
  1. Stack must be EMPTY before any queue is processed
  2. ALL microtasks drain before ONE macrotask runs
  3. var in loops = shared binding = all callbacks see final value
  4. let in loops = new binding per iteration = each has own value
  5. setTimeout(fn, 0) is NOT immediate — still async!
  6. await pauses the function, NOT the entire program
```

---

## Hands-On Task (20 mins)

**Predict the output BEFORE running — then verify in browser console:**

### Task 1:
```javascript
console.log("1");
setTimeout(() => console.log("2"), 1000);
setTimeout(() => console.log("3"), 0);
Promise.resolve().then(() => console.log("4"));
console.log("5");
// Answer: 1, 5, 4, 3, 2
```

### Task 2:
```javascript
async function run() {
  console.log("A");
  await null;
  console.log("B");
}
run();
console.log("C");
// Answer: A, C, B
```

### Task 3 (Hard):
```javascript
Promise.resolve()
  .then(() => {
    console.log("promise 1");
    return Promise.resolve();
  })
  .then(() => console.log("promise 2"));

setTimeout(() => console.log("timeout"), 0);
// Answer: promise 1, promise 2, timeout
```

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Event Loop** | Moves callbacks from queues to call stack when stack is empty |
| **Call Stack** | LIFO structure where JS executes — one frame at a time |
| **Web APIs** | Browser-provided async capabilities (timers, fetch, DOM events) |
| **Microtask Queue** | High-priority queue for Promises — drains fully before macrotasks |
| **Macrotask Queue** | Lower-priority queue for setTimeout/setInterval callbacks |
| **LIFO** | Last In, First Out — how the call stack works |
| **FIFO** | First In, First Out — how the task queues work |
| **Blocking** | Sync code running so long it prevents UI from updating |
| **Non-blocking** | Async pattern that hands off work and continues executing |
| **async/await** | Syntactic sugar over Promises — makes async code readable |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 3** | Browser Storage | cookies, localStorage, sessionStorage, IndexedDB |
| **Day 4** | Core Web Vitals | LCP, FID, CLS — measured in every interview |
| **Day 5** | HTTP Caching | Cache-Control, ETags, CDN strategy |
| **Day 6** | Network Deep Dive | REST vs GraphQL, WebSockets, SSE |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*