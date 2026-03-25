# ⚛️ Frontend System Design — Day 14
## Topic: Virtual DOM & Change Detection

> **Study time:** 1 hour | **Phase:** 3 of 5 | **Difficulty:** Intermediate → Advanced
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Asked at every product company — Google, Razorpay, Flipkart, CRED)

---

## The Core Problem

The DOM is slow. Directly manipulating it on every state change causes
cascading layout recalculations, repaints, and compositing — potentially
hundreds of times per second. Frameworks must minimise real DOM touches.

```
React's answer:    Virtual DOM + diffing algorithm
Angular's answer:  Zone.js + change detection tree

Both solve the same problem differently.
Understanding both deeply is what separates SDE-2 from junior candidates.
```

---

## Part 1 — React's Virtual DOM

### What the Virtual DOM Is

```
Virtual DOM = a lightweight JavaScript object tree that mirrors the real DOM.
Every JSX element compiles to a plain JS object (React.createElement call).

JSX:
  <div className="card">
    <h2>Claim #1001</h2>
    <span className="status">Pending</span>
  </div>

Compiled VDOM node:
  {
    type: 'div',
    props: { className: 'card' },
    children: [
      { type: 'h2', props: {}, children: ['Claim #1001'] },
      { type: 'span', props: { className: 'status' }, children: ['Pending'] }
    ]
  }

Diffing two such JS objects = microseconds.
Updating the real DOM from the diff = the expensive part (milliseconds).
```

### The 3-Step Render Cycle

```
Step 1 — RENDER PHASE
  React calls component functions to build a new VDOM tree.
  Pure JavaScript — no DOM access.
  Can be paused/interrupted in Concurrent React.

Step 2 — RECONCILIATION (DIFF)
  React compares new VDOM vs previous VDOM.
  Finds the minimal set of real DOM changes needed.
  Also pure JS — no DOM access.

Step 3 — COMMIT PHASE
  React applies the computed changes to the real DOM.
  Cannot be interrupted.
  Runs useEffect/useLayoutEffect callbacks after commit.

Key insight: React never touches the real DOM in steps 1 and 2.
The real DOM is only modified in step 3 — and only for what changed.
```

---

## Part 2 — React's Diffing Algorithm

### Rule 1 — Different Element Type = Destroy and Rebuild

```jsx
// BEFORE
<div><Counter /></div>

// AFTER
<span><Counter /></span>

// React sees: different type at this position (div → span)
// Destroys the entire subtree including Counter
// Counter LOSES ALL STATE and remounts from scratch

// This applies to components too:
// <ClaimsTable /> → <ClaimsGrid />  (different components = destroy + rebuild)
```

### Rule 2 — Same Type = Update Props In-Place

```jsx
// BEFORE
<div className="old" id="card-1">hello</div>

// AFTER
<div className="new" id="card-1">world</div>

// React sees: same type (div)
// Updates only changed props: className and text content
// DOM node is REUSED — state preserved — very fast

// For components:
// <ClaimCard status="pending" /> → <ClaimCard status="approved" />
// React updates ClaimCard's props in place — component's internal state preserved
```

### Rule 3 — Lists Need Keys

```jsx
// WITHOUT keys — React diffs by array position
// Adding item at START forces update of every item
const before = [<li>A</li>, <li>B</li>];
const after  = [<li>NEW</li>, <li>A</li>, <li>B</li>];
// React: position 0 changed (A→NEW), position 1 changed (B→A),
//        position 2 is new (insert B)
// 3 DOM operations to add 1 item!

// WITH keys — React diffs by identity
const before = [<li key="a">A</li>, <li key="b">B</li>];
const after  = [<li key="new">NEW</li>, <li key="a">A</li>, <li key="b">B</li>];
// React: "new" is new (insert), "a" and "b" still exist (no-op)
// 1 DOM operation to add 1 item!
```

### Why Index as Key Causes Bugs

```jsx
// WRONG — never use index as key for dynamic lists
{items.map((item, i) => <Item key={i} data={item} />)}

// Problem: delete items[0]:
// key=0 existed before → key=0 still exists after (was items[1])
// React REUSES the DOM node and component state of the old items[0]
// State gets associated with the wrong data item!

// CORRECT — use stable unique ID
{items.map(item => <Item key={item.id} data={item} />)}
// key=item.id is stable — React correctly tracks identity across renders
```

---

## Part 3 — When React Re-Renders

### Default Re-render Triggers

```
A component re-renders when:
  1. Its own state changes (useState setter, useReducer dispatch)
  2. Its parent re-renders (even if props are identical!)
  3. A context it consumes changes
  4. forceUpdate() is called (class components)

THE BIG GOTCHA:
  Parent re-renders → ALL children re-render by default.
  Even if the child's props didn't change.
  Even if the child renders nothing different.
  This is the most common React performance problem.
```

### React.memo — Opt Out of Unnecessary Re-renders

```javascript
// WITHOUT memo — re-renders every time parent re-renders
function ClaimCard({ claim }) {
  return <div>{claim.title} — {claim.status}</div>;
}

// WITH memo — only re-renders if props change (shallow comparison)
const ClaimCard = React.memo(function ClaimCard({ claim }) {
  return <div>{claim.title} — {claim.status}</div>;
});

// React.memo does SHALLOW prop comparison:
//   { id: 1, title: 'abc' } vs { id: 1, title: 'abc' } → SAME → skip render
//   { id: 1, title: 'abc' } vs { id: 1, title: 'xyz' } → DIFFERENT → render

// Custom comparator for specific fields:
const ClaimCard = React.memo(
  function ClaimCard({ claim, onSelect }) {
    return <div onClick={() => onSelect(claim.id)}>{claim.title}</div>;
  },
  (prevProps, nextProps) => {
    // Return true = skip re-render (props "same")
    // Return false = re-render (props "different")
    return prevProps.claim.id === nextProps.claim.id &&
           prevProps.claim.status === nextProps.claim.status;
  }
);
```

### useMemo and useCallback — Stable References

```javascript
// THE PROBLEM: new object/function created on every render
function ClaimsList({ claims }) {
  // New object created on every render of ClaimsList
  const headerStyle = { fontWeight: 'bold', color: 'navy' };

  // New function created on every render of ClaimsList
  const handleSelect = (id) => setSelectedId(id);

  return <MemoizedCard style={headerStyle} onSelect={handleSelect} />;
  // MemoizedCard always re-renders — props are "new" references even
  // if semantically identical. React.memo comparison: prevProps.style !== nextProps.style
}

// THE SOLUTION: memoize objects and functions
function ClaimsList({ claims }) {
  // Same reference across renders (unless deps change)
  const headerStyle = useMemo(
    () => ({ fontWeight: 'bold', color: 'navy' }),
    [] // no dependencies — created once
  );

  // Same function reference across renders
  const handleSelect = useCallback(
    (id) => setSelectedId(id),
    [] // no dependencies — created once
  );

  return <MemoizedCard style={headerStyle} onSelect={handleSelect} />;
  // Now MemoizedCard correctly skips re-renders
}
```

### React 18 Automatic Batching

```javascript
// BEFORE React 18: multiple setState = multiple renders
// Only batched inside React event handlers
setTimeout(() => {
  setCount(c => c + 1); // render 1
  setFlag(f => !f);     // render 2
}, 0);

// AFTER React 18: batched EVERYWHERE automatically
setTimeout(() => {
  setCount(c => c + 1); // batched
  setFlag(f => !f);     // batched
  // → ONE render total
}, 0);
// Works in: setTimeout, Promises, fetch callbacks, native events
// Opt out: flushSync(() => setState(...)) for immediate render
```

---

## Part 4 — Angular Change Detection

### How Zone.js Works

```
Zone.js = library that monkey-patches ALL async browser APIs:
  setTimeout, setInterval, clearTimeout
  Promise.then, Promise.catch, async/await
  addEventListener (all DOM events)
  fetch, XMLHttpRequest
  requestAnimationFrame, MutationObserver

When any of these complete → Zone.js notifies Angular:
  "Something async happened — you should check for changes"

Angular's response:
  Walk the entire component tree from root to leaf.
  Check every component, every binding, every pipe.
  Update DOM wherever values changed.
```

### Default Change Detection — The Problem

```
Default (ChangeDetectionStrategy.Default):
  User clicks ONE button anywhere in the app →
  Zone.js fires → Angular checks EVERY component in the tree →
  Even components with no data connection to the click

For a large app with 100+ components:
  Every click = 100+ component checks
  Every keypress = 100+ component checks
  Every timer tick = 100+ component checks
  This is why large Angular apps feel sluggish by default
```

### OnPush — The Solution

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngFor="let claim of claims; trackBy: trackById">
      {{ claim.id }} — {{ claim.status }}
    </div>
  `
})
export class ClaimListComponent {
  @Input() claims: Claim[] = [];

  trackById(index: number, claim: Claim): string {
    return claim.id;
  }
}
```

```
With OnPush, Angular checks this component ONLY when:
  1. An @Input() reference changes (new array/object)
  2. A DOM event fires inside this component's template
  3. An async pipe emits a new value
  4. markForCheck() is called manually
  5. detectChanges() is called manually

Everything else: Angular SKIPS this component entirely.
```

### The Immutability Requirement

```typescript
// WRONG — mutating existing reference
// OnPush sees same reference → skips check → UI doesn't update
addClaim(newClaim: Claim) {
  this.claims.push(newClaim);       // same array reference!
  this.claims[0].status = 'Done';   // same object reference!
}

// CORRECT — always create new reference
addClaim(newClaim: Claim) {
  this.claims = [...this.claims, newClaim]; // NEW array → OnPush triggers
}

updateStatus(id: string, status: string) {
  this.claims = this.claims.map(c =>       // NEW array → OnPush triggers
    c.id === id ? { ...c, status } : c     // NEW object for changed item
  );
}

// Rule: with OnPush, treat all inputs as IMMUTABLE.
// Never mutate — always replace with new reference.
```

### runOutsideAngular — Escape Zone.js

```typescript
@Component({ /* ... */ })
export class ScrollableListComponent implements OnInit {
  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    // HIGH-FREQUENCY EVENTS: run outside zone.js
    // Otherwise Angular re-runs change detection on every scroll pixel
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleScroll);
      // canvas.requestAnimationFrame loop
      // resize observer
      // mousemove tracking
    });
  }

  handleScroll = () => {
    // Do expensive calculation outside Angular
    const pos = window.scrollY;

    // Only trigger change detection when necessary
    if (Math.abs(pos - this.lastPos) > 100) {
      this.ngZone.run(() => {
        this.scrollPosition = pos; // this triggers CD
        this.lastPos = pos;
      });
    }
  }
}
```

---

## Part 5 — Angular Signals (Angular 17+)

```typescript
import { signal, computed, effect } from '@angular/core';

// signal() — reactive state primitive
const count = signal(0);

// Reading: call as function
console.log(count()); // 0

// Writing:
count.set(5);
count.update(current => current + 1);

// computed() — auto-tracks dependencies
const double = computed(() => count() * 2);
// When count changes → double automatically recalculates

// In components — fine-grained updates
@Component({
  template: `
    <p>Count: {{ count() }}</p>
    <p>Double: {{ double() }}</p>
    <button (click)="increment()">+1</button>
  `
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);

  increment() {
    this.count.update(c => c + 1);
    // Only THIS component re-renders — no zone.js, no tree walk
    // Much more granular than Zone.js-based CD
  }
}
```

```
Signals vs Zone.js:
  Zone.js: "something happened → check entire tree"
  Signals: "this specific value changed → only update its consumers"

Angular signals are similar in concept to React's useState —
fine-grained reactivity without global tree walking.
Angular 18+ supports fully zoneless mode using signals.
```

---

## React vs Angular — The Key Comparison

| Question | React | Angular |
|----------|-------|---------|
| Change detection model | Pull — React decides when | Push — Zone.js notifies |
| Default scope | Component + all children | Entire component tree |
| Opt-out mechanism | `React.memo` | `ChangeDetectionStrategy.OnPush` |
| Async tracking | Explicit `setState` calls | Zone.js monkey-patches all async |
| Granular updates | Signals (in development) | Signals (Angular 17+) |
| Concurrent rendering | Yes (React 18) | No (synchronous) |
| Can interrupt render | Yes (Concurrent mode) | No |

---

## Interview Questions & Model Answers

### Q1: "How does React's Virtual DOM work?"

```
React maintains two copies of a virtual DOM tree — both are
lightweight JavaScript objects, not actual DOM nodes.

When state changes:
  1. Render phase: React calls components to build a new VDOM tree
  2. Reconciliation: React diffs new tree vs previous tree (pure JS)
  3. Commit: React applies only the changed parts to the real DOM

The diffing has two key rules:
  Different element type at same position → destroy and rebuild subtree
  Same element type → update props in-place, preserve DOM node and state

For lists, React needs keys to diff by identity rather than position.
Without keys, adding an item at the start forces every item to re-render.

The real DOM is only touched in the commit phase, and only for nodes
that actually changed. This is why React can update efficiently.
```

### Q2: "Why does React.memo not always prevent re-renders?"

```
React.memo does a SHALLOW comparison of props by default.
It compares prop references, not deep values.

The most common failure: passing new object/function references
from the parent on every render.

// This breaks memo:
<MemoChild
  style={{ color: 'red' }}    // new object every render
  onClick={() => doThing()}   // new function every render
/>

// Memo compares: prevStyle !== nextStyle (different references)
// → re-renders even though values are identical

Fix: use useMemo for object props, useCallback for function props
to create stable references that don't change between renders.

Rule: React.memo only prevents re-renders if the parent
      passes STABLE references (primitives, or memoized objects/functions).
```

### Q3: "What is Angular's OnPush change detection and when do you need it?"

```
By default Angular's Zone.js triggers change detection on the entire
component tree for every async event — click, keypress, timer, fetch.
In a large app this means hundreds of component checks per user interaction.

OnPush makes a component opt-in to checks instead of opt-out.
Angular only checks that component when:
  1. An @Input() reference changes
  2. A DOM event fires inside that component
  3. An async pipe emits
  4. markForCheck() is called

OnPush requires immutability:
  this.items.push(x)         → Angular doesn't see the change (same reference)
  this.items = [...items, x] → Angular sees new reference → triggers check

I use OnPush on all list components in our Angular insurance app.
Combined with trackBy, it prevents full list re-renders when a single
claim's status changes — only that item re-renders.
```

### Q4: "What are Angular Signals and how are they different from Zone.js?"

```
Zone.js is coarse-grained: "any async event happened → check the tree"
Signals are fine-grained: "this specific value changed → update its consumers"

With Zone.js:
  A timer fires → Zone.js notifies → Angular checks all components
  Even if the timer only changed one number in one component

With Signals:
  signal.update() → only components that read this signal re-render
  No tree walk, no Zone.js, no global event interception

Angular 17+ supports Signals natively.
Angular 18+ supports zoneless mode — no Zone.js at all.
This brings Angular's reactivity much closer to React's model.
```

---

## Cheat Sheet

```
REACT VDOM:
  3 steps: Render (build VDOM) → Reconcile (diff) → Commit (update DOM)
  Different type at same position → destroy + rebuild subtree
  Same type → update props in-place, preserve state
  Lists: always use stable unique key (never index for dynamic lists)

REACT RE-RENDERS:
  Triggers: setState, parent re-render, context change
  Parent re-renders → ALL children re-render (by default!)
  Prevent: React.memo + useMemo (values) + useCallback (functions)
  React 18: automatic batching everywhere → fewer renders

ANGULAR CHANGE DETECTION:
  Default: Zone.js notifies → checks ENTIRE tree → every async event
  OnPush: only checks when @Input changes, event inside, async pipe emits
  Immutability required with OnPush — never mutate, always replace reference
  runOutsideAngular for high-frequency events (scroll, mousemove)

ANGULAR SIGNALS (Angular 17+):
  signal() → reactive state, signal.set() / signal.update()
  computed() → auto-tracks signal dependencies
  Fine-grained: only signal consumers re-render, no tree walk
  Future: zoneless Angular (no Zone.js needed)

KEY NUMBERS:
  React.memo: shallow prop comparison by default
  trackBy: Angular only re-renders changed list items (same concept as React key)
  Default Angular: every click checks 100+ components in a large app
  OnPush: every click checks only the relevant component subtree
```

---

## Hands-On Task (20 mins)

1. Open your Angular app at Digit → find a component with `*ngFor`
2. Add `ChangeDetectionStrategy.OnPush` and `trackBy` to it
3. Check: does the component have any `array.push()` or direct mutations? Replace them with spread operators
4. Open React DevTools (Chrome extension) → enable "Highlight updates when components render"
5. In any React app: click a button → watch which components flash (re-render)
6. Wrap a frequently-flashing component in `React.memo` → click again → flash gone

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Virtual DOM** | Lightweight JS object tree mirroring the real DOM |
| **Reconciliation** | React's process of diffing old vs new VDOM to find changes |
| **Diffing** | Algorithm comparing two trees to find minimal set of changes |
| **Commit phase** | React's final step — applies computed changes to real DOM |
| **React.memo** | HOC that skips re-render if props shallow-equal |
| **useMemo** | Hook memoizing computed values across renders |
| **useCallback** | Hook memoizing function references across renders |
| **Zone.js** | Library that monkey-patches async APIs to notify Angular |
| **Change detection** | Angular's process of checking components for updates |
| **OnPush** | Angular CD strategy — only check on input change / event |
| **markForCheck()** | Manually schedule an OnPush component for checking |
| **detectChanges()** | Manually run change detection on a component and children |
| **runOutsideAngular** | Execute code without triggering Zone.js notifications |
| **Signals** | Angular 17+ fine-grained reactivity primitive |
| **computed()** | Angular signal that auto-tracks its dependencies |
| **Automatic batching** | React 18 — multiple setState calls = one render |
| **Concurrent React** | React 18 — render phase can be interrupted and resumed |
| **trackBy** | Angular *ngFor optimization — identify items by key |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 15** | List Virtualization | Render 10,000 items at 60fps — virtual scroll deep dive |
| **Day 16** | State Management Patterns | Context, Redux, NgRx, Signals — when to use which |
| **Day 17** | Component Design Patterns | Compound components, render props, HOCs |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*