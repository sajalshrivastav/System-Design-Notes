# 🔬 Frontend System Design — Day 9
## Topic: Performance Metrics & Tools

> **Study time:** 1 hour | **Phase:** 2 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Every senior interview — "how would you debug a slow page?")

---

## The Big Picture

Knowing what to optimize (Days 4–6) is only half the job.
The other half is knowing how to FIND what's slow.

```
PERFORMANCE DEBUGGING TOOLKIT:

  Lighthouse         → Lab audit: scores, opportunities, diagnostics
  Network tab        → What loads, how big, how long, cache status
  Performance tab    → Where CPU time goes, long tasks, frame drops
  Coverage tab       → How much JS/CSS is actually used on first load
  web-vitals library → Real user field data in production
  PageSpeed Insights → Lab + field data for any URL
```

---

## Tool 1 — Lighthouse

### What it measures

```
4 categories:
  Performance    → 0–100 score based on 6 timing metrics
  Accessibility  → ARIA, color contrast, keyboard navigation
  Best Practices → HTTPS, no console errors, correct image ratios
  SEO            → Meta tags, crawlability, mobile-friendly

6 performance metrics (weighted):
  LCP  (25%) → Largest Contentful Paint
  TBT  (30%) → Total Blocking Time
  CLS  (25%) → Cumulative Layout Shift
  FCP  (10%) → First Contentful Paint
  TTI  (10%) → Time to Interactive
  SI   (10%) → Speed Index
```

### Lab vs Field Data

```
LAB DATA (Lighthouse):
  → Controlled test, reproducible, great for dev iteration
  → Does NOT reflect real user experience

FIELD DATA (Chrome UX Report / PageSpeed Insights):
  → Real measurements from actual Chrome users
  → Reports p75 (75th percentile)
  → Use for final decisions and monitoring

Rule: optimize using Lighthouse, validate using field data.
```

### How to run

```bash
# DevTools: Lighthouse tab → Mobile + Slow 4G → Analyze page load

# CLI:
npx lighthouse https://yoursite.com --output=html --preset=mobile

# PageSpeed Insights: pagespeed.web.dev

# CI/CD:
npm install -g @lhci/cli
lhci autorun
```

---

## Tool 2 — Network Tab

### Key columns

```
Name        → URL. Click to see full details (headers, timing, response)
Status      → 200 (ok), 304 (cached), 404, 500
Size        → [wire size] / [decoded size]. (disk cache) = served from cache
Time        → Total time. Hover: DNS, connect, SSL, TTFB, download breakdown
Waterfall   → Visual timeline — shows parallelism and bottlenecks
```

### What to look for

```
RED FLAGS:
  Render-blocking scripts without defer/async → delays FCP
  JS bundles > 200KB gzipped → split them
  TTFB > 200ms → server is the bottleneck
  No (disk cache) on repeat visit → missing Cache-Control headers

GOOD SIGNS:
  304 responses → cache revalidation working
  (disk cache) → browser cache serving correctly
  Parallel waterfall → HTTP/2 working
```

### Network throttling

```
Slow 4G:  1.6 Mbps down, 750 Kbps up, 150ms latency ← always test this
Fast 4G:  30 Mbps down,  15 Mbps up,   28ms latency
3G:       750 Kbps down, 250 Kbps up,  300ms latency
```

### Coverage tab (hidden gem)

```
DevTools → Ctrl+Shift+P → "Coverage" → Start → reload page

Red bars  = unused code on first load
Green bars = used code

Example: "210KB JS file, 68% unused" → code splitting opportunity
```

---

## Tool 3 — Performance Tab

### Recording workflow

```
1. Click record (or Ctrl+Shift+E for page load)
2. Perform the action you want to measure (3–5 seconds)
3. Click Stop
4. Read the flame chart

Settings: CPU throttling 4x (simulates mid-range mobile)
```

### Reading the flame chart

```
Width  = how long it took
Height = call stack depth (bottom = root, top = leaf)

Colour key:
  Blue   → HTML parsing, network
  Purple → Layout/reflow (watch for these during animations)
  Yellow → JavaScript execution (look for wide blocks)
  Green  → Paint and composite
  Red ▲  → Long task > 50ms — blocks main thread

Controls: W/S = zoom in/out, A/D = scroll left/right
```

### Finding the problem

```
Long tasks:
  → Red triangle in top-right of block
  → Click → see full call stack
  → Every function that caused the block

Forced reflow:
  → Purple block INSIDE yellow JS block
  → JS read layout property after write → sync reflow
  → Fix: batch DOM reads before writes

Bottom-Up tab:
  → Sort by "Self Time"
  → Shows which functions consumed the most CPU
  → Start optimizing from the TOP of this list
```

---

## Tool 4 — Measuring Web Vitals in Code

```javascript
// Install: npm install web-vitals
import { getLCP, getCLS, getINP, getFCP, getTTFB } from 'web-vitals';

// Development
getLCP(({ value, rating }) =>
  console.log(`LCP: ${Math.round(value)}ms (${rating})`));
getCLS(({ value, rating }) =>
  console.log(`CLS: ${value.toFixed(3)} (${rating})`));
getINP(({ value, rating }) =>
  console.log(`INP: ${Math.round(value)}ms (${rating})`));

// Production — send to analytics
function report({ name, value, rating }) {
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({
      metric: name,
      value: Math.round(value),
      rating,  // 'good' | 'needs-improvement' | 'poor'
      page: location.pathname,
    }),
  });
}
getLCP(report); getCLS(report); getINP(report); getTTFB(report);
```

```javascript
// Custom timing with performance marks
performance.mark('api-start');
const data = await fetch('/api/products');
performance.mark('api-end');
performance.measure('api-call', 'api-start', 'api-end');

const [m] = performance.getEntriesByName('api-call');
console.log(`API took: ${Math.round(m.duration)}ms`);

// Navigation timing breakdown
const nav = performance.getEntriesByType('navigation')[0];
console.log('TTFB:', Math.round(nav.responseStart - nav.requestStart));
console.log('DOM parse:', Math.round(nav.domContentLoadedEventEnd - nav.responseEnd));
console.log('Total load:', Math.round(nav.loadEventEnd - nav.startTime));
```

---

## The 5-Step Debug Workflow

This is the answer to "how would you debug a slow page?" in interviews.

### Step 1 — Measure first, never guess

```
Run Lighthouse on Mobile + Slow 4G.
Open PageSpeed Insights for real field data.
Write down every failing metric with its current value.
DO NOT start coding yet.
```

### Step 2 — Identify the worst metric

```
LCP > 2.5s   → loading problem
CLS > 0.1    → stability problem
INP > 200ms  → responsiveness problem
TTFB > 200ms → server problem (not frontend!)
TBT > 200ms  → main thread blocking

Fix the worst one first — biggest ROI.
```

### Step 3 — Diagnose root cause

```
LCP slow:
  → Network tab: find the LCP element request
  → Is it preloaded? (<link rel="preload" as="image">)
  → Is it WebP/AVIF? On CDN?
  → Is it lazy-loaded? (remove loading="lazy" from LCP image!)

CLS > 0.1:
  → Rendering panel → enable "Layout Shift Regions"
  → Red flash shows which element shifted and when
  → Images without dimensions? Ads without reserved space?

INP > 200ms:
  → Performance tab → record while clicking the slow element
  → Find the long task in the handler
  → Bottom-Up → sort by Self Time

TTFB > 200ms:
  → Network tab → hover HTML document → Waiting bar
  → If long = server issue → not a frontend fix
  → Escalate to backend: server caching, DB queries
```

### Step 4 — Fix one thing at a time

```
Make ONE change. Re-measure. Record before/after numbers.

If you fix 5 things at once:
  → Can't attribute what helped
  → Might accidentally cancel improvements

Commit discipline:
  "fix: preload LCP image → LCP: 4.2s → 2.1s"
  "fix: add image dimensions → CLS: 0.28 → 0.04"
```

### Step 5 — Verify in field data

```
After deploy: watch web-vitals metrics in production analytics.
Wait 7+ days for statistically significant field data.
Lab improvements don't always translate to real users.
The field data is the truth.
```

---

## Quick Diagnosis Cheat Sheet

| Metric | Target | First tool | What to look for |
|--------|--------|-----------|-----------------|
| LCP | ≤ 2.5s | Network tab | LCP element request — preloaded? WebP? CDN? |
| CLS | ≤ 0.1 | Rendering panel | Layout Shift regions — which element moved? |
| INP | ≤ 200ms | Performance tab | Long task in event handler |
| TTFB | ≤ 200ms | Network tab | Waiting bar on HTML document |
| TBT | ≤ 200ms | Performance tab | Wide yellow JS blocks |
| FCP | ≤ 1.8s | Network tab | Render-blocking resources in head |

---

## Tools Reference

| Tool | Use for | Access |
|------|---------|--------|
| Lighthouse | Full audit + score | DevTools → Lighthouse tab |
| PageSpeed Insights | Lab + field data | pagespeed.web.dev |
| Network tab | Requests, timing, cache | DevTools → Network |
| Performance tab | CPU, long tasks, frames | DevTools → Performance |
| Coverage tab | Unused JS/CSS | DevTools → Ctrl+Shift+P → Coverage |
| Rendering panel | Paint flash, layout shifts | DevTools → ⋮ → More tools → Rendering |
| web-vitals lib | Real user monitoring | npm install web-vitals |
| Memory tab | Memory leaks | DevTools → Memory |

---

## Interview Q&A

### Q: "How would you debug a slow page?"

```
5 steps:
1. Measure — Lighthouse + PageSpeed Insights (never guess)
2. Identify worst metric — LCP, CLS, INP, TTFB?
3. Diagnose root cause with right tool per metric
4. Fix one thing, re-measure, document before/after
5. Verify in production field data via web-vitals library

For LCP: Network tab → find the LCP request
For INP: Performance tab → record interaction → find long task
For TTFB: Server issue — check server caching, not frontend
```

### Q: "What is the difference between lab and field data?"

```
Lab (Lighthouse): controlled test, reproducible, simulated device.
  Use for: development iteration, CI/CD regression detection.

Field (CrUX, web-vitals): real users, p75, production conditions.
  Use for: final decisions, validating deployed improvements.

They often disagree: real users have slower/older devices,
different geographic locations, pre-warmed caches, extensions.
Optimize with lab. Validate with field.
```

### Q: "What is Total Blocking Time?"

```
TBT = sum of all time main thread was blocked > 50ms during page load.
Each "long task" (JS > 50ms) contributes: (task duration - 50ms).

A 200ms task → contributes 150ms to TBT.
A 45ms task  → contributes 0ms (under threshold).

High TBT = page unresponsive during load → high INP.
Fix: code splitting, defer non-critical JS, break up long tasks.
Target: < 200ms TBT.
```

---

## Cheat Sheet

```
LAB vs FIELD:
  Lab  = Lighthouse, controlled, reproducible, dev iteration
  Field = real users, p75, production truth

DEBUG WORKFLOW:
  1. Measure → 2. Worst metric → 3. Root cause → 4. Fix one thing → 5. Verify field

METRIC → TOOL:
  LCP  → Network tab (find element request)
  CLS  → Rendering panel (layout shift regions)
  INP  → Performance tab (record interaction, find long task)
  TTFB → Network tab (Waiting bar on HTML = server issue)
  TBT  → Performance tab (wide yellow JS blocks)

KEY NUMBERS:
  Long task   = JS > 50ms
  Good TTFB   = < 200ms
  Slow 4G     = 1.6 Mbps, 150ms latency
  p75         = 75th percentile of real users
```

---

## Hands-On Task (20 mins)

1. Open `pagespeed.web.dev` → test `amazon.in` or `flipkart.com`
2. Read Lab AND Field data — do they agree? Which metrics fail?
3. Click "View Treemap" → see which JS bundles are largest
4. DevTools → Slow 4G → reload any heavy site → find slowest TTFB
5. Run Coverage → see % of unused JS on first load

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 10** | JavaScript Performance | Code splitting, tree shaking, bundle optimization |
| **Day 11** | CSS Performance | Critical CSS, render-blocking, animation containment |
| **Day 12** | Image & Asset Optimization | WebP, AVIF, srcset, lazy loading |

