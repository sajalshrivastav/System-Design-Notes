# 📊 Frontend System Design — Day 4
## Topic: Core Web Vitals

> **Study time:** 1 hour | **Phase:** 1 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Every senior frontend interview — Google, Flipkart, Swiggy, Razorpay)

---

## The Big Picture

Google made Core Web Vitals an **official SEO ranking factor** in 2021.
Every product company now tracks these. In interviews, saying
*"I'd improve LCP by preloading the hero image and switching to WebP"*
is the answer that gets you hired over someone who just says *"optimize images"*.

```
┌──────────────────────────────────────────────────────────────────┐
│                   3 CORE WEB VITALS                             │
│                                                                  │
│  LCP  Largest Contentful Paint   → How fast does it LOAD?      │
│  CLS  Cumulative Layout Shift    → How STABLE is the layout?   │
│  INP  Interaction to Next Paint  → How RESPONSIVE is it?       │
│                                                                  │
│  ALL 3 must be "Good" for your page to pass Core Web Vitals    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Metric 1 — LCP (Largest Contentful Paint)

### What it measures
Time from page start until the **largest visible element** fully renders.
Usually: hero image, h1 heading, or above-fold content block.

### Thresholds

```
┌─────────────────────────────────────────────────────┐
│  Good         ≤ 2.5s   ████████████░░░░░░░░░░░░░  │
│  Needs work   ≤ 4.0s   ████████████████░░░░░░░░░  │
│  Poor         > 4.0s   ████████████████████████░  │
└─────────────────────────────────────────────────────┘
Target: ≤ 2.5s
```

### What counts as the LCP element?

```
Browser automatically picks the LARGEST element visible in viewport:
  → <img> tags
  → <image> inside SVG
  → Background images (via CSS url())
  → <video> poster images
  → Block-level elements with text content

NOTE: Elements removed from DOM don't count
NOTE: LCP can change as page loads (new larger element appears)
      Final LCP = last element reported before user first interacts
```

### Common causes of poor LCP

```
1. Large unoptimized images (JPEG instead of WebP/AVIF)
2. Render-blocking JavaScript delaying HTML parsing
3. Slow server response (TTFB > 200ms)
4. No CDN — server physically far from user
5. Web fonts blocking text render (FOIT/FOUT)
6. CSS background images (browser can't preload these early)
7. LCP image lazy loaded (browser delays fetching it!)
```

### How to fix LCP

```javascript
// Fix 1: Preload the LCP image (most impactful)
<link rel="preload" as="image" href="hero.webp" fetchpriority="high">

// Fix 2: Never lazy-load the LCP image
<img src="hero.webp" loading="eager"> // NOT loading="lazy"

// Fix 3: Convert to WebP/AVIF
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero image" width="1200" height="600">
</picture>

// Fix 4: Inline critical CSS (removes render-blocking CSS request)
<style>
  /* Only CSS needed for above-fold content */
  .hero { background: #fff; }
  h1 { font-size: 2rem; }
</style>
<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">

// Fix 5: Reduce TTFB
// → Use server-side caching (Redis, Varnish)
// → Use edge rendering (Cloudflare Workers, Next.js edge)
// → Move to faster hosting or closer region

// Fix 6: Use a CDN
// → Cloudflare, AWS CloudFront, Fastly
// → Serves assets from edge servers close to user
// → Reduces latency from 200ms to 20ms for static assets

// Fix 7: Defer non-critical scripts
<script defer src="analytics.js"></script>
<script async src="chat-widget.js"></script>
```

### LCP Mental Model

```
TIME →  0ms     200ms    500ms   1000ms  2500ms   4000ms
        │        │        │       │       │        │
        │        │        │       │       │        │
        ▼        ▼        ▼       ▼       ▼        ▼
       DNS      TCP      TTFB   HTML    Images   Render
      lookup  handshake  resp  parsed  loaded   complete
                                                   ↑
                                               LCP fires here
                                            (target: before 2.5s)
```

---

## Metric 2 — CLS (Cumulative Layout Shift)

### What it measures
How much page elements **unexpectedly move** while loading.
Score of 0 = no shifts (perfect). Higher = worse.

### Thresholds

```
┌─────────────────────────────────────────────────────┐
│  Good         ≤ 0.1    ████████████░░░░░░░░░░░░░  │
│  Needs work   ≤ 0.25   ████████████████░░░░░░░░░  │
│  Poor         > 0.25   ████████████████████████░  │
└─────────────────────────────────────────────────────┘
Target: ≤ 0.1
```

### How CLS is calculated

```
Layout Shift Score = Impact Fraction × Distance Fraction

Impact Fraction: what % of viewport was affected by the shift
Distance Fraction: how far the element moved as % of viewport

Example:
  Button moves from y=200 to y=400 (moved 200px)
  Button + ad = 50% of viewport
  Viewport height = 800px → distance = 200/800 = 0.25

  Shift Score = 0.50 × 0.25 = 0.125 (Needs Improvement)
```

### Common causes of poor CLS

```
1. Images without width/height set
   → Browser doesn't know space to reserve → content jumps when image loads

2. Ads and embeds without reserved dimensions
   → Ad loads → pushes article down → user clicks wrong thing

3. Web fonts causing FOUT (Flash of Unstyled Text)
   → Fallback font different size → text reflow on font swap

4. Dynamically injected content above existing content
   → Banner added to top → everything shifts down

5. Animations using top/left/width/height
   → These trigger layout → cause shifts
   → Use transform instead
```

### How to fix CLS

```css
/* Fix 1: Always set image dimensions */
img {
  width: 800px;
  height: 400px;
  /* OR use aspect-ratio */
}

/* Modern approach: aspect-ratio */
img {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto; /* browser calculates correctly */
}
```

```html
<!-- Fix 2: Reserve space for ads -->
<div style="min-height: 250px; width: 300px;">
  <!-- Ad will load here — space already reserved -->
</div>

<!-- Fix 3: Preload fonts -->
<link rel="preload" as="font" href="font.woff2" crossorigin>
```

```css
/* Fix 3: Font display strategy */
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2');
  font-display: optional; /* best for CLS — no swap */
  /* OR */
  font-display: swap;     /* shows fallback first, then swaps */
  size-adjust: 105%;      /* adjust fallback to match custom font size */
}

/* Fix 4: Animate with transform only */
.sliding-panel {
  transform: translateX(-100%); /* GOOD — no layout */
  transition: transform 0.3s;
}
/* NEVER animate: top, left, right, bottom, width, height, margin, padding */
```

---

## Metric 3 — INP (Interaction to Next Paint)

### What it measures
Time from **user interaction** (click, tap, keyboard) to the next visual update.
Replaced FID (First Input Delay) in March 2024.

Key difference from FID: INP measures **all interactions** throughout the page
lifetime, not just the first one. It reports the **worst interaction**.

### Thresholds

```
┌─────────────────────────────────────────────────────┐
│  Good         ≤ 200ms  ████████████░░░░░░░░░░░░░  │
│  Needs work   ≤ 500ms  ████████████████░░░░░░░░░  │
│  Poor         > 500ms  ████████████████████████░  │
└─────────────────────────────────────────────────────┘
Target: ≤ 200ms
```

### The INP breakdown

```
User clicks button
        │
        │  Input delay (waiting for main thread to be free)
        ▼
Main thread picks up event
        │
        │  Processing time (your event handler runs)
        ▼
Handler complete
        │
        │  Presentation delay (browser paints the result)
        ▼
Screen updates ← INP measured to here

INP = Input Delay + Processing Time + Presentation Delay
```

### Common causes of poor INP

```
1. Long tasks blocking the main thread
   → JS task > 50ms blocks the browser from responding
   → User clicks → browser can't respond until task finishes

2. Heavy event handlers
   → onClick doing too much synchronous work
   → Reading layout properties inside handlers (forces reflow)

3. Unoptimized framework updates
   → React: unnecessary re-renders of large trees
   → Angular: default change detection checking everything

4. Third-party scripts
   → Analytics, chat widgets, ads running on main thread
   → Common cause of "I can't figure out why it's slow"

5. Large DOM size
   → > 1500 nodes slows down layout and style calculations
```

### How to fix INP

```javascript
// Fix 1: Break up long tasks using scheduler.yield()
async function processLargeData(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    // Yield to browser every 100 items — let it handle input
    if (i % 100 === 0) {
      await scheduler.yield(); // modern browsers
      // Fallback: await new Promise(r => setTimeout(r, 0));
    }
  }
}

// Fix 2: Debounce expensive event handlers
import { debounce } from 'lodash';

const handleSearch = debounce((query) => {
  // Expensive search operation
  fetchResults(query);
}, 300); // only fires 300ms after user stops typing

// Fix 3: Move heavy work to Web Worker
const worker = new Worker('heavy-calc.js');
worker.postMessage({ data: largeDataset });
worker.onmessage = (e) => {
  // Receive result — update UI on main thread
  updateUI(e.data.result);
};

// Fix 4: Optimize React rendering
// useMemo — memoize expensive calculations
const sortedList = useMemo(() =>
  items.sort((a, b) => a.price - b.price),
  [items] // only recalculate when items changes
);

// useCallback — stable reference for event handlers
const handleClick = useCallback((id) => {
  setSelected(id);
}, []); // created once, not on every render

// React.memo — skip re-render if props unchanged
const ProductCard = React.memo(({ product }) => {
  return <div>{product.name}</div>;
});

// Fix 5: Angular OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush // only check on input changes
})
export class ProductListComponent {
  @Input() products: Product[];
}
```

---

## How to Measure Core Web Vitals

### In Chrome DevTools

```
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Performance" category
4. Click "Analyze page load"
5. See LCP, CLS, INP scores with recommendations

OR:

1. Go to Performance tab
2. Click Record
3. Reload page
4. Stop recording
5. Look for "LCP" marker on the timeline
```

### In JavaScript (Real User Monitoring)

```javascript
// Measure LCP
new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// Measure CLS
let clsValue = 0;
new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
    }
  }
  console.log('CLS:', clsValue);
}).observe({ type: 'layout-shift', buffered: true });

// Measure INP (simplified)
new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    console.log('INP candidate:', entry.duration);
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 16 });

// Easier: use web-vitals library (Google)
import { getLCP, getCLS, getINP } from 'web-vitals';

getLCP(console.log);
getCLS(console.log);
getINP(console.log);
```

### Tools to Use

| Tool | Use For |
|------|---------|
| **Lighthouse** (DevTools) | Lab testing — controlled, reproducible |
| **PageSpeed Insights** | Real user data + lab data for any URL |
| **Chrome UX Report** | Real user data across millions of visits |
| **WebPageTest** | Deep waterfall analysis, advanced testing |
| **web-vitals JS library** | Measure real users in production |

---

## Interview Questions & Model Answers

### Q1: "How would you improve a page with poor LCP?"

```
Step 1 — Identify what the LCP element is
  → Open DevTools → Lighthouse → see which element is LCP
  → Usually hero image or h1

Step 2 — Fix based on cause:
  If it's an image:
    → Add <link rel="preload" as="image"> in <head>
    → Convert to WebP/AVIF
    → Remove loading="lazy" if it was on the LCP image
    → Ensure it's not in CSS background (use <img> instead)

  If server is slow (TTFB > 200ms):
    → Add CDN
    → Server-side caching
    → Edge rendering

  If JS is blocking:
    → Add defer/async to scripts
    → Inline critical CSS
    → Remove unused third-party scripts

Expected improvement: good optimization can improve LCP from 4s to 1.8s
```

### Q2: "A user complains the page shifts as they're about to click. What's happening and how do you fix it?"

```
This is a CLS (Cumulative Layout Shift) problem.

Common culprit: An image or ad loads after the text, pushing content down.

Investigation:
  → Lighthouse → CLS score and which elements shifted
  → Performance tab → Layout Shift events

Fix:
  1. Check if images have width/height attributes set
  2. Reserve space for ads: give container min-height before ad loads
  3. Check for dynamically injected banners/notifications above content
  4. Look for font swaps causing text reflow

Prevention:
  → Always set aspect-ratio or explicit dimensions on images
  → Give ad slots fixed dimensions
  → Use font-display: optional or size-adjust for fonts
```

### Q3: "INP on our checkout page is 650ms. Where do you start?"

```
650ms INP is Poor. Strategy:

Step 1 — Find the slow interaction
  → Performance tab → record while interacting
  → Look for long tasks (red blocks > 50ms)
  → Check which event handler is slow

Step 2 — Common checkout page culprits:
  → Payment form validation running synchronously
  → Address autocomplete making sync API calls
  → Heavy re-render when updating cart items
  → Third-party fraud detection scripts

Step 3 — Fixes:
  → Break validation into async chunks
  → Debounce address autocomplete (300ms)
  → Optimize React/Angular rendering with memoization
  → Move fraud detection to Web Worker
  → Defer third-party scripts until after interaction

Step 4 — Measure improvement
  → Use web-vitals library in production
  → Track p75 INP (75th percentile) — Google uses this
```

### Q4: "What's the difference between FID and INP?"

```
FID (First Input Delay) — OLD, replaced March 2024:
  → Only measured FIRST interaction on page
  → Only measured input delay (waiting for main thread)
  → Didn't measure how long handler took to run

INP (Interaction to Next Paint) — NEW:
  → Measures ALL interactions throughout page lifetime
  → Reports the worst one (p98 of interactions)
  → Includes: input delay + processing time + paint delay
  → Much more comprehensive and harder to game

Why INP is better:
  → FID could be gamed: make first interaction fast, rest slow
  → INP catches pages that become sluggish after initial load
  → More representative of real user experience
```

---

## Cheat Sheet — Memorize Before Interviews

```
LCP (Loading):
  Metric: time to largest element rendered
  Good: ≤ 2.5s | Needs work: ≤ 4.0s | Poor: > 4.0s
  Top fixes: preload LCP image, WebP/AVIF, CDN, defer JS, inline critical CSS
  Never: lazy load the LCP image!

CLS (Stability):
  Metric: sum of unexpected layout shifts
  Good: ≤ 0.1 | Needs work: ≤ 0.25 | Poor: > 0.25
  Top fixes: set image dimensions, reserve ad space, font-display: optional
  Never: animate top/left/width/height (use transform instead)

INP (Responsiveness):
  Metric: worst interaction response time
  Good: ≤ 200ms | Needs work: ≤ 500ms | Poor: > 500ms
  Top fixes: break long tasks, debounce handlers, Web Workers, OnPush/useMemo
  Replaced FID in March 2024

MEASUREMENT TOOLS:
  Lighthouse (lab) → PageSpeed Insights (real+lab) → web-vitals library (prod)

KEY NUMBERS:
  TTFB target: < 200ms
  Long task threshold: > 50ms (blocks main thread)
  LCP element: checked every 100ms, reports largest visible element
  CLS window: 5s sessions, max gap 1s between shifts
```

---

## Hands-On Task (20 mins)

1. Open **PageSpeed Insights**: `pagespeed.web.dev`
2. Enter any site you use (Flipkart, Swiggy, your company's site)
3. Run the analysis
4. For each failing metric note:
   - What the current score is
   - What the top recommendation is
   - Which HTML element is the LCP element

5. Then run it on `web.dev` (Google's own site) — perfect scores!

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Core Web Vitals** | Google's 3 key metrics: LCP, CLS, INP |
| **LCP** | Largest Contentful Paint — loading performance |
| **CLS** | Cumulative Layout Shift — visual stability |
| **INP** | Interaction to Next Paint — responsiveness |
| **FID** | First Input Delay — old metric replaced by INP |
| **TTFB** | Time to First Byte — server response speed |
| **Layout Shift** | Unexpected movement of page elements |
| **Long Task** | JS task > 50ms that blocks main thread |
| **Web Worker** | Background JS thread (no UI access) |
| **fetchpriority** | HTML attribute to hint browser resource priority |
| **font-display** | CSS property controlling font loading behavior |
| **FOIT** | Flash of Invisible Text — text hidden while font loads |
| **FOUT** | Flash of Unstyled Text — fallback font shows then swaps |
| **Lab data** | Controlled test (Lighthouse) — reproducible |
| **Field data** | Real user data (Chrome UX Report) — actual users |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 5** | HTTP Caching | Cache-Control, ETags, CDN — ties directly to LCP improvement |
| **Day 6** | Browser Rendering Deep Dive | Reflow/repaint — ties directly to CLS and INP |
| **Day 7** | Security Fundamentals | XSS, CSRF, CSP headers |
| **Day 8** | Phase 1 Review | 5 timed questions across all topics |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*