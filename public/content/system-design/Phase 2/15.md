# Frontend System Design — Day 15
## Topic: List Virtualization

> **Study time:** 1 hour | **Phase:** 3 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐ (Flipkart, Swiggy, CRED, any app with large data grids)

---

## The Big Picture

Rendering 10,000 DOM nodes causes:
- 10,000 layout calculations
- 10,000 paint operations
- ~50MB+ memory usage
- Initial render time: 2–5 seconds
- Scroll: janky, dropped frames

Virtualization renders only what's visible (~15 rows) regardless of
how many items exist in the data. The rest are mathematical spacers.

```
WITHOUT virtualization — 10,000 items:
  DOM nodes: ~50,000 (5 per row)
  Memory: ~25MB
  Initial render: 2,000ms
  Scroll FPS: 15–20 (janky)

WITH virtualization — 10,000 items:
  DOM nodes: ~75 (15 visible + overscan)
  Memory: ~40KB
  Initial render: 8ms
  Scroll FPS: 60 (smooth)
```

---

## How Virtual Scroll Works

### The Core Mechanism

```
REAL SCROLL:                    VIRTUAL SCROLL:
┌─────────────────┐             ┌─────────────────┐
│ item 1  ← DOM   │             │ [spacer: 0px]    │ ← invisible
│ item 2  ← DOM   │             │                  │
│ item 3  ← DOM   │  VIEWPORT   │ item 4  ← DOM    │ ← visible window
│ item 4  ← DOM   │ ─────────▶  │ item 5  ← DOM    │
│ item 5  ← DOM   │             │ item 6  ← DOM    │
│ ...     ← DOM   │             │ ...     ← DOM    │
│ item N  ← DOM   │             │ item 15 ← DOM    │
└─────────────────┘             │ [spacer: large]  │ ← invisible
  N × DOM nodes                 └─────────────────┘
  (all in memory)                 ~15 DOM nodes always
```

### The Math

```
Given:
  totalItems = 10,000
  rowHeight  = 44px
  viewportHeight = 400px
  scrollTop = 5,000px (user scrolled halfway)

Calculate:
  startIndex = Math.floor(scrollTop / rowHeight)
             = Math.floor(5000 / 44)
             = 113

  endIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight)
           = Math.ceil((5000 + 400) / 44)
           = 122

  visibleCount = endIndex - startIndex = 9 rows

  totalHeight = totalItems × rowHeight
              = 10,000 × 44 = 440,000px
              (this is the real scroll container height)

  row top offset = index × rowHeight
                 = 113 × 44 = 4,972px (absolute positioned)
```

### The HTML Structure

```html
<!-- Outer scroll container (fixed height, overflow: auto) -->
<div
  id="scroll-container"
  style="height: 400px; overflow-y: auto; position: relative"
  (scroll)="onScroll()"
>
  <!-- Inner spacer (full list height — creates real scroll bar) -->
  <div style="height: 440000px; position: relative">

    <!-- Only visible rows — absolutely positioned -->
    <div style="position: absolute; top: 4972px; height: 44px">
      Row 113 content
    </div>
    <div style="position: absolute; top: 5016px; height: 44px">
      Row 114 content
    </div>
    <!-- ... ~15 rows total ... -->

  </div>
</div>

<!-- Result: scroll bar represents 440,000px height
     but only 15 DOM nodes exist at any time -->
```

---

## Overscan — Preventing Blank Flashes

```
PROBLEM: On fast scroll, browser renders frame BEFORE JS updates DOM.
For a split second, user sees empty space where rows should be.

SOLUTION: Overscan — render extra rows above and below the viewport.

const OVERSCAN = 3; // rows above and below viewport

startIndex = Math.max(0, visibleStart - OVERSCAN);
endIndex   = Math.min(totalItems - 1, visibleEnd + OVERSCAN);

Now user scrolls into pre-rendered rows — no blank flash.
Overscan of 3 adds 6 extra DOM nodes (3 above + 3 below).
Tradeoff: slightly more DOM vs much better scroll experience.
```

---

## Variable Height Rows — The Hard Problem

Fixed row height is easy (math is trivial). Variable heights are harder.

### Approach 1 — Estimated Height + Measure on Render

```javascript
class VirtualList {
  constructor(estimatedRowHeight = 50) {
    this.estimatedRowHeight = estimatedRowHeight;
    this.measuredHeights = new Map(); // index → actual height
  }

  getItemOffset(index) {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      // Use measured height if known, otherwise estimate
      offset += this.measuredHeights.get(i) ?? this.estimatedRowHeight;
    }
    return offset;
  }

  onRowRendered(index, element) {
    const height = element.getBoundingClientRect().height;
    if (height !== this.measuredHeights.get(index)) {
      this.measuredHeights.set(index, height);
      // Recalculate positions for all rows after this one
      this.recalculate(index);
    }
  }
}
```

### Approach 2 — Use a Library

Variable height virtualization is complex enough that you should always
use a battle-tested library rather than rolling your own.

```
react-window:    Lightweight, fixed or variable height
react-virtuoso: Variable height, grouping, reverse scroll, chat lists
@tanstack/virtual: Framework-agnostic, most flexible
Angular CDK:    Built into Angular — use this in your Angular apps
```

---

## Library Implementations

### React — react-window (Fixed Height)

```jsx
import { FixedSizeList } from 'react-window';

// Each row is a pure component — receives style, index, data
const ClaimRow = ({ index, style, data }) => (
  <div style={style} className="claim-row">
    <span>{data[index].id}</span>
    <span>{data[index].description}</span>
    <span className={`badge ${data[index].statusClass}`}>
      {data[index].status}
    </span>
    <span>{data[index].amount}</span>
  </div>
);

function ClaimsList({ claims }) {
  return (
    <FixedSizeList
      height={600}          // Viewport height
      itemCount={claims.length}
      itemSize={44}         // Fixed row height in px
      itemData={claims}     // Passed to each row as data prop
      width="100%"
    >
      {ClaimRow}
    </FixedSizeList>
  );
}
// DOM nodes: ~30 regardless of claims.length
```

### React — react-window (Variable Height)

```jsx
import { VariableSizeList } from 'react-window';

function ClaimsList({ claims }) {
  const getItemSize = (index) => {
    // Return row height based on content
    return claims[index].hasDetails ? 80 : 44;
  };

  return (
    <VariableSizeList
      height={600}
      itemCount={claims.length}
      estimatedItemSize={44}       // Initial estimate for scroll bar
      itemSize={getItemSize}       // Called per item
      width="100%"
    >
      {ClaimRow}
    </VariableSizeList>
  );
}
```

### React — react-virtuoso (Best for Complex Cases)

```jsx
import { Virtuoso } from 'react-virtuoso';

// Handles variable height automatically — no height prop needed
function ClaimsList({ claims }) {
  return (
    <Virtuoso
      style={{ height: '600px' }}
      data={claims}
      itemContent={(index, claim) => (
        <ClaimCard claim={claim} />
        // Each ClaimCard can be any height — Virtuoso measures it
      )}
      // Built-in features:
      endReached={() => loadMoreClaims()}  // infinite scroll
      overscan={200}                        // px of overscan
    />
  );
}

// For grouped lists (e.g. claims grouped by date):
import { GroupedVirtuoso } from 'react-virtuoso';

<GroupedVirtuoso
  groupCounts={[5, 10, 8]}  // items per group
  groupContent={index => <DateHeader date={dates[index]} />}
  itemContent={(index, groupIndex) => <ClaimCard claim={claims[index]} />}
/>
```

### Angular CDK Virtual Scroll

```typescript
// In module: import ScrollingModule from '@angular/cdk/scrolling'

// Fixed height
@Component({
  template: `
    <cdk-virtual-scroll-viewport
      itemSize="44"
      style="height: 600px"
    >
      <div
        *cdkVirtualFor="let claim of claims; trackBy: trackById"
        class="claim-row"
        style="height: 44px"
      >
        {{ claim.id }} — {{ claim.description }}
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
export class ClaimsListComponent {
  @Input() claims: Claim[] = [];

  trackById(index: number, claim: Claim): string {
    return claim.id; // Required for efficient reuse
  }
}
```

```typescript
// Variable height with custom strategy
import { VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';

// Custom strategy for variable height rows
@Injectable()
export class VariableHeightStrategy implements VirtualScrollStrategy {
  // ... implement scrolledIndexChange, attach, etc.
}

@Component({
  providers: [{
    provide: VIRTUAL_SCROLL_STRATEGY,
    useClass: VariableHeightStrategy
  }],
  template: `
    <cdk-virtual-scroll-viewport style="height: 600px">
      <div *cdkVirtualFor="let claim of claims; trackBy: trackById">
        <app-claim-card [claim]="claim" />
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
class ClaimsListComponent { }
```

---

## Infinite Scroll vs Virtualization

These are complementary, not alternatives:

```
INFINITE SCROLL:
  → Loads more data from server as user scrolls
  → Solves: data fetching problem
  → Problem: eventually you have thousands of DOM nodes!
  → Without virtualization: page degrades after 500+ items

VIRTUALIZATION:
  → Controls how many DOM nodes exist at once
  → Solves: rendering performance problem
  → Can work with locally loaded data or streamed data

TOGETHER — best pattern:
  → Virtualization renders only visible items (15 DOM nodes)
  → Infinite scroll fetches next page when user reaches end
  → List can grow to 100,000+ items with consistent performance
```

### Implementation with react-virtuoso

```jsx
function InfiniteClaimsList() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    const next = await fetchClaims({ offset: claims.length, limit: 50 });
    setClaims(prev => [...prev, ...next]);
    setLoading(false);
  };

  useEffect(() => { loadMore(); }, []); // initial load

  return (
    <Virtuoso
      style={{ height: '600px' }}
      data={claims}
      endReached={loadMore}       // fetch more when user reaches end
      overscan={400}
      components={{
        Footer: () => loading ? <LoadingSpinner /> : null
      }}
      itemContent={(index, claim) => <ClaimCard claim={claim} />}
    />
  );
}
```

---

## When Not to Use Virtualization

Virtualization adds complexity — don't use it for small lists:

```
< 100 items:    Don't bother — regular rendering is fine
100–500 items:  Consider if items are complex (heavy DOM per row)
500+ items:     Use virtualization — clear win
1,000+ items:   Always virtualize

Also avoid when:
  → You need Ctrl+F page search to find content in list
    (virtual DOM nodes don't exist in DOM, so browser search misses them)

  → You need to print the entire list
    (only visible nodes render)

  → Items have unpredictable dynamic heights that change after render
    (resizing after measure causes jumpy scroll — very hard to handle)
```

---

## Table Virtualization

Grids/tables with many rows AND many columns need both row and column virtualization:

```jsx
import { FixedSizeGrid } from 'react-window';

function ClaimsGrid({ rows, columns }) {
  const Cell = ({ rowIndex, columnIndex, style }) => (
    <div style={style}>
      {rows[rowIndex][columns[columnIndex].key]}
    </div>
  );

  return (
    <FixedSizeGrid
      columnCount={columns.length}
      columnWidth={150}
      rowCount={rows.length}
      rowHeight={44}
      height={600}
      width={800}
    >
      {Cell}
    </FixedSizeGrid>
  );
}
// Virtualizes BOTH rows and columns
// 10,000 rows × 50 columns = 500,000 cells
// Only ~(15 rows × 6 columns) = ~90 DOM cells at any time
```

---

## Interview Questions & Model Answers

### Q1: "How would you render a list of 50,000 insurance claims efficiently?"

```
I'd use virtual scrolling — a windowing technique where only
the visible rows are rendered as DOM nodes.

How it works:
  1. The scroll container's inner div is set to totalItems × rowHeight
     This gives the browser a correct scroll bar
  2. On scroll, calculate which items are in the viewport:
     startIndex = Math.floor(scrollTop / rowHeight)
     endIndex   = Math.ceil((scrollTop + viewportHeight) / rowHeight)
  3. Render ONLY those items as absolutely positioned nodes
  4. Add 3-5 rows of overscan to prevent blank flashes on fast scroll

In Angular I'd use CDK Virtual Scroll:
  <cdk-virtual-scroll-viewport itemSize="44">
    <div *cdkVirtualFor="let claim of claims; trackBy: trackById">

In React I'd use react-virtuoso (handles variable heights automatically)
or react-window for fixed heights.

Result: 50,000 claims → ~30 DOM nodes → consistent 60fps scroll
```

### Q2: "What is overscan in virtual scroll and why is it needed?"

```
Overscan is rendering extra rows above and below the visible viewport.

Without overscan:
  User scrolls fast → browser renders the new frame BEFORE JS has
  updated the DOM → user briefly sees empty white space where rows
  should be → bad UX

With overscan (3 extra rows each side):
  When user scrolls into view, rows are already pre-rendered
  No blank flash — smooth scroll experience

The tradeoff is 6 extra DOM nodes (3 above + 3 below) vs
much better user experience. Always use some overscan.
```

### Q3: "What's the difference between infinite scroll and virtualization?"

```
They solve different problems and work well together:

Infinite scroll:
  → Loads more DATA from server as user scrolls to bottom
  → Prevents loading all 50,000 items upfront
  → Problem: without virtualization, DOM grows unboundedly

Virtualization:
  → Controls how many DOM NODES exist at any moment
  → Data can all be in memory — just not all in the DOM
  → Problem: doesn't help if all 50,000 items are fetched upfront

Best pattern: combine both.
  → Virtualization keeps DOM node count constant (~30)
  → Infinite scroll fetches next page when user nears the end
  → List grows indefinitely with no performance degradation
```

---

## Cheat Sheet

```
VIRTUAL SCROLL MATH:
  startIndex = floor(scrollTop / rowHeight)
  endIndex   = ceil((scrollTop + viewportHeight) / rowHeight)
  totalHeight = totalItems × rowHeight  (spacer height)
  rowOffset   = index × rowHeight       (absolute top position)

WHEN TO VIRTUALIZE:
  < 100 items   → don't bother
  100–500 items → consider if complex rows
  500+ items    → always virtualize

LIBRARIES:
  React fixed height:   react-window FixedSizeList
  React variable:       react-virtuoso Virtuoso
  React table grid:     react-window FixedSizeGrid
  Angular:              CDK cdk-virtual-scroll-viewport + cdkVirtualFor
  Framework-agnostic:   @tanstack/virtual

KEY CONCEPTS:
  Overscan    = extra rows above/below viewport (prevents blank flash)
  Window      = the visible set of rows (~15 items)
  Spacer      = invisible full-height div that creates real scroll bar
  Recycling   = DOM nodes reused with different data as user scrolls

COMMON PITFALL:
  Never use index as key in virtual lists — React reuses DOM nodes,
  wrong keys cause state to appear on wrong data item
  Always use stable unique ID: key={item.id}
```

---

## Hands-On Task (20 mins)

1. Play with the interactive demo above — switch between "Virtual scroll" and "Real DOM" with 10,000 items
2. Notice how DOM nodes stay constant in virtual mode regardless of item count
3. Open the Angular app at work → find the largest list component
4. Check if it uses `cdk-virtual-scroll-viewport` — if not, it's a candidate for virtualization
5. Install `react-virtuoso` in a sandbox project and render 10,000 items — confirm 60fps scroll

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Virtualization** | Rendering only visible list items as DOM nodes |
| **Windowing** | Alternative name for list virtualization |
| **Overscan** | Extra rows rendered above/below viewport to prevent blank flashes |
| **Virtual window** | The set of currently rendered visible items |
| **Spacer element** | Full-height invisible div that creates a realistic scroll bar |
| **Recycled DOM** | Reusing existing DOM nodes with new data instead of creating new ones |
| **Infinite scroll** | Loading more data from server as user scrolls |
| **Fixed height** | All rows the same pixel height — simpler math |
| **Variable height** | Rows with different heights — requires measurement or estimation |
| **react-window** | Lightweight React virtualization library by bvaughn |
| **react-virtuoso** | Feature-rich React virtualization with variable height support |
| **CDK Virtual Scroll** | Angular's built-in virtual scroll (Angular CDK) |
| **cdkVirtualFor** | Angular directive replacing *ngFor for virtualized lists |
| **@tanstack/virtual** | Framework-agnostic virtual scroll (works with React/Vue/Solid) |
| **Estimated height** | Initial row height guess for variable height virtualization |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 16** | State Management Patterns | Context, Redux, NgRx, Signals — architecture decisions |
| **Day 17** | Component Design Patterns | Compound components, render props, HOCs |
| **Day 18** | Micro Frontends | Module Federation, independent deployments |
