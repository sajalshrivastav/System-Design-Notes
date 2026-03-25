# Frontend System Design — Day 11
## Topic: CSS Performance

> **Study time:** 1 hour | **Phase:** 2 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐ (Asked at Google, Flipkart, CRED, Swiggy)

---

## The Big Picture

CSS is render-blocking by default. Every stylesheet in `<head>` delays
the browser from painting a single pixel until it's fully downloaded and parsed.

```
Without CSS optimisation:
  HTML arrives → browser finds <link rel="stylesheet"> →
  STOPS rendering → downloads 200KB CSS (1s on Slow 4G) →
  resumes rendering

With Critical CSS:
  HTML arrives → browser reads inlined critical CSS (0 extra requests) →
  renders above-fold IMMEDIATELY →
  loads remaining CSS async in background
```

4 areas to master:
1. Eliminating render-blocking CSS
2. Critical CSS extraction
3. CSS containment (isolated rendering)
4. Animation + font performance

---

## Part 1 — Render-Blocking CSS

### Why CSS blocks rendering

```
Browser rendering rule:
  "Do not render ANYTHING until all CSS in <head> is parsed"

This is intentional — prevents Flash of Unstyled Content (FOUC)
But it means EVERY stylesheet in <head> delays FCP and LCP
```

### Technique 1 — media attribute

```html
<!-- BAD: print stylesheet blocks rendering on ALL devices -->
<link rel="stylesheet" href="print.css">

<!-- GOOD: only blocks when printing -->
<link rel="stylesheet" href="print.css" media="print">

<!-- Only blocks on narrow screens -->
<link rel="stylesheet" href="mobile.css" media="(max-width: 768px)">

<!-- Portrait orientation only -->
<link rel="stylesheet" href="portrait.css" media="(orientation: portrait)">
```

### Technique 2 — async CSS loading

```html
<!-- Load CSS without blocking rendering -->
<link
  rel="preload"
  href="non-critical.css"
  as="style"
  onload="this.onload=null; this.rel='stylesheet'"
>
<noscript>
  <link rel="stylesheet" href="non-critical.css">
</noscript>

<!-- Step by step:
  1. rel="preload" → browser downloads file ASAP but doesn't apply it
  2. Does NOT block rendering (not a stylesheet yet)
  3. onload → once downloaded, switch rel to "stylesheet" (now applied)
  4. noscript → fallback for JS-disabled browsers
  5. this.onload=null → prevents infinite loop in some browsers -->
```

### Technique 3 — defer heavy CSS

```javascript
// Load non-critical CSS after page renders
window.addEventListener('load', () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'below-fold.css';
  document.head.appendChild(link);
});
```

---

## Part 2 — Critical CSS

### What it is

```
Critical CSS = the minimum styles needed to render
              above-the-fold content without scrolling.

Typically includes:
  → body/html base styles
  → Header and navigation
  → Hero section
  → Above-fold typography
  → Layout structure (grid/flex for visible sections)

NOT included (non-critical):
  → Footer styles
  → Modal/drawer styles
  → Below-fold component styles
  → Print styles
```

### The Critical CSS Pattern

```html
<!-- Critical CSS: inlined in <head> — zero extra round trips -->
<style>
  /* Only above-fold styles — target < 14KB (one TCP packet) */
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', sans-serif; }
  .header { background: white; padding: 1rem 2rem; position: sticky; top: 0; }
  .hero { min-height: 60vh; display: flex; align-items: center; }
  h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; }
  .cta-button { background: #2563EB; color: white; padding: 1rem 2rem; border-radius: 8px; }
</style>

<!-- Non-critical CSS: loaded async — doesn't block FCP -->
<link
  rel="preload"
  href="/static/main.css"
  as="style"
  onload="this.onload=null; this.rel='stylesheet'"
>
```

### Tools to Automate Critical CSS Extraction

```bash
# critical — extracts above-fold CSS for a URL
npm install --save-dev critical

# Build script:
const critical = require('critical');
critical.generate({
  inline: true,
  base: 'dist/',
  src: 'index.html',
  target: 'index-critical.html',
  width: 1300,
  height: 900,
});

# PurgeCSS — remove ALL unused CSS
npm install --save-dev purgecss
# Scans HTML/JS files, removes CSS rules never used

# Tailwind CSS — automatic purging (best approach)
# tailwind.config.js:
module.exports = {
  content: ['./src/**/*.{html,ts,tsx,jsx}'],
  // Only generates classes actually used in your templates
  // Result: 5-15KB vs 200KB for most apps
};
```

### Angular Critters (Built-in)

```json
// angular.json — enable automatic critical CSS inlining
{
  "configurations": {
    "production": {
      "inlineCritical": true,
      "optimization": {
        "styles": {
          "minify": true,
          "inlineCritical": true
        }
      }
    }
  }
}
```

### Critical CSS Size Rule

```
Target: keep inlined critical CSS under 14KB

Why 14KB?
  → First TCP packet is ~14KB
  → Browser can render first frame before waiting for more data
  → Over 14KB = must wait for additional round trip

If you inline everything:
  → HTML file becomes huge — can't be cached efficiently
  → First load is large even for repeat visitors
  → Defeats the purpose
```

---

## Part 3 — CSS Containment

### What it is

```
contain property tells the browser:
"Changes inside this element don't affect the outside world"

Without containment:
  A card's content changes → browser checks if:
  → Parent needs to resize?
  → Siblings need to reposition?
  → Page layout needs updating?
  → All other elements' styles still valid?

With containment:
  A card's content changes → browser knows:
  → Nothing outside this element can be affected
  → Skip recalculating everything else
  → Much faster!
```

### contain Values

```css
contain: layout
  → Layout changes inside don't affect outside
  → Children cannot affect parent/sibling geometry

contain: paint
  → Content visually clipped to element's border box
  → Browser skips painting outside this boundary

contain: style
  → CSS counters and quotes inside don't affect outside
  → Rarely needed on its own

contain: size
  → Element's size doesn't depend on children
  → Requires explicit width/height
  → Enables most aggressive optimisation

contain: strict
  → All of the above: layout + paint + style + size
  → Must set explicit dimensions
  → Maximum performance — browser optimises aggressively

contain: content
  → layout + paint + style (no size)
  → Most practical for real components
  → Doesn't require explicit size
```

### Practical Patterns

```css
/* Claim card — independent from other cards */
.claim-card {
  contain: content; /* layout + paint + style */
}
/* Browser: "when this card changes, don't check other cards" */

/* Virtual scroll item — fully isolated */
.list-item {
  contain: strict;
  height: 60px; /* required for size containment */
  width: 100%;
}
/* Browser optimises each item independently */

/* Analytics widget — updates don't affect page layout */
.analytics-widget {
  contain: content;
}
/* Chart re-renders? Browser only repaints this widget */

/* Modal — completely isolated */
.modal {
  contain: layout paint;
}
```

### content-visibility: auto (Modern Power Feature)

```css
/* Skip rendering entire sections until they're near viewport */
.page-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 600px; /* estimated height while offscreen */
}

/* Browser behaviour:
   → Sections near viewport: rendered normally
   → Sections far from viewport: layout skipped entirely
   → As user scrolls: sections rendered progressively
   → Performance improvement: up to 7x faster initial render! */

/* Best for:
   → Long product listing pages
   → Article pages with many sections
   → Dashboard with multiple independent widgets
   → Any page where content extends far below the fold */

/* Real measurement: a page with 20 sections:
   Without: browser lays out all 20 sections on load
   With:    browser lays out ~3 visible sections, skips 17 */
```

---

## Part 4 — CSS Selector Performance

Modern browsers are very fast at matching selectors, but good selector
hygiene still matters at scale and shows senior awareness in interviews.

### Selector Speed Rules

```css
/* SLOW — browser walks UP the DOM from every matching element */
.header .nav .dropdown .menu .item a.active { }

/* FAST — O(1) class lookup, no traversal */
.nav-item--active { }

/* SLOW — expensive universal + descendant */
* .child { color: red; }

/* FAST — direct class */
.list-child { color: red; }

/* SLOW — :nth-child with complex expressions */
:nth-child(3n+2 of .item) { }

/* FAST — assign class in code */
.item-pattern-2 { }
```

### Specificity — Keep it Flat

```css
/* PROBLEM: High specificity causes specificity wars */
#app .header .nav .link.active { color: blue; }
/* Can only be overridden by: !important or even higher specificity */

/* SOLUTION: BEM — flat, low specificity */
.nav__link--active { color: blue; }
/* Can be overridden by adding one more class */

/* Specificity hierarchy (low → high):
   element (0,0,1) < class (0,1,0) < id (1,0,0) < inline < !important

   Rules:
   → Never use IDs in CSS selectors (use classes only)
   → Never use !important except for utility overrides
   → Keep nesting to maximum 3 levels
   → Prefer BEM or utility classes */
```

### Tailwind CSS Performance

```
Why Tailwind produces small CSS:

Traditional CSS:
  You write: 500 rules
  User page uses: 50 rules
  Shipped: 500 rules (450 wasted)

Tailwind CSS:
  You write: utility classes in HTML templates
  Build tool scans templates for used classes
  Shipped: exactly the classes used = 5-15KB

Result: a Tailwind app's CSS is typically 95% smaller
than a traditional CSS app with similar functionality.
```

---

## Part 5 — Web Fonts Performance

### The Two Problems

```
FOIT — Flash of Invisible Text:
  → Browser hides text while custom font loads
  → Contributes to high FCP (no text visible)
  → Caused by: font-display: block (the default)

FOUT — Flash of Unstyled Text:
  → Browser shows fallback font, then swaps
  → Causes CLS (layout shift when metrics differ)
  → Caused by: font-display: swap
```

### font-display Values

```css
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');

  /* block: invisible for up to 3s, then fallback, then swap */
  /* (default, worst for UX) */
  font-display: block;

  /* swap: show fallback immediately, swap when font loads */
  /* Good UX but causes CLS */
  font-display: swap;

  /* fallback: ~100ms block, then fallback, swap within 3s */
  /* Good balance */
  font-display: fallback;

  /* optional: very brief block, use fallback if not cached */
  /* Best for CLS — no swap on most visits */
  font-display: optional;
}
```

### Preloading Fonts

```html
<!-- Preload critical fonts to reduce FOUT window -->
<!-- Browser downloads font alongside HTML — available before text renders -->
<link
  rel="preload"
  as="font"
  href="/fonts/inter-regular.woff2"
  type="font/woff2"
  crossorigin
>
<!-- crossorigin is required even for same-origin font files -->
<!-- Only preload fonts used above the fold (header, hero text) -->
<!-- Preloading every font variant defeats the purpose -->
```

### size-adjust — Reduce CLS from Font Swaps

```css
/* Match fallback font metrics to custom font */
/* Reduces layout shift when the custom font loads and swaps */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');          /* use system font */
  size-adjust: 107%;            /* match Inter's character width */
  ascent-override: 90%;         /* match Inter's ascent */
  descent-override: 22%;        /* match Inter's descent */
  line-gap-override: 0%;
}

body {
  /* Use fallback first, then Inter */
  font-family: 'Inter', 'Inter-fallback', sans-serif;
}
/* When Inter loads and swaps, metrics already match — no layout shift */
```

---

## Part 6 — Animation Performance & Accessibility

### The Two Safe Properties (Review from Day 6)

```css
/* ONLY these skip layout and paint — run on GPU */
.animate-me {
  transition: transform 0.3s ease;  /* movement */
  transition: opacity 0.3s ease;    /* fading */
}

/* Everything else triggers layout or paint — avoid in animations */
/* Never animate: width, height, top, left, margin, padding, color */
```

### prefers-reduced-motion — Required for Accessibility

```css
/* Always wrap animations with this media query */
/* Users with vestibular disorders, epilepsy, or motion sensitivity */
/* may have enabled "Reduce motion" in their OS settings */

/* Approach 1: opt-in animations */
@media (prefers-reduced-motion: no-preference) {
  .hero-image {
    animation: fadeSlideIn 0.6s ease;
  }
  .modal {
    transition: transform 0.3s, opacity 0.3s;
  }
}
/* Safe default: no animation unless user explicitly wants motion */

/* Approach 2: disable specific animations */
.hero-image {
  animation: fadeSlideIn 0.6s ease;
}
@media (prefers-reduced-motion: reduce) {
  .hero-image { animation: none; }
  .modal { transition: none; }
  * { animation-duration: 0.01ms !important; }
}
```

---

## Interview Questions & Model Answers

### Q1: "What is render-blocking CSS and how do you eliminate it?"

```
Every CSS file in <head> is render-blocking by default.
The browser cannot paint anything until all CSS is downloaded and parsed.

3 techniques to eliminate render-blocking CSS:

1. Media attributes — print/mobile CSS only blocks on matching media:
   <link rel="stylesheet" href="print.css" media="print">

2. Async loading pattern — preload + onload swap:
   <link rel="preload" href="styles.css" as="style"
         onload="this.onload=null;this.rel='stylesheet'">
   Preload downloads without blocking, onload applies it after render.

3. Critical CSS inlining — put above-fold CSS directly in <style>,
   load rest async. Eliminates the first round trip entirely.
   Angular's inlineCritical: true does this automatically in production.
```

### Q2: "What is CSS containment and when would you use it?"

```
CSS containment (contain property) tells the browser that changes
inside an element are isolated from the rest of the page.

Without containment:
  One card updates → browser checks if ALL other cards,
  parent, siblings need updating too. Expensive.

With containment:
  Browser knows changes are isolated → skips checking everything else.

I use contain: content on:
  → Card components in a list (claim cards in our insurance app)
  → Independently updating widgets (analytics panels)
  → Heavy components that re-render frequently

I use content-visibility: auto on:
  → Long pages with many below-fold sections
  → Browser skips rendering off-screen sections entirely
  → Can improve initial render by up to 7x on content-heavy pages
```

### Q3: "How do you handle web font loading without causing layout shift?"

```
Font loading causes two problems:
  FOIT — text invisible while font loads (hurts FCP)
  FOUT — fallback font shows then swaps (hurts CLS)

My approach:
  1. Preload critical font files:
     <link rel="preload" as="font" href="inter.woff2" crossorigin>
     Font ready before text renders — minimises FOUT window

  2. Use font-display: optional for body text:
     No swap after initial render — zero CLS from fonts
     Cached after first visit — fast on repeat

  3. Use size-adjust to match fallback metrics:
     @font-face { font-family: 'Inter-fallback'; size-adjust: 107%; }
     When font swaps, text doesn't reflow — CLS stays near zero

  4. Self-host fonts instead of loading from Google Fonts:
     Eliminates cross-origin DNS lookup + connection overhead
     Better caching control
```

---

## Cheat Sheet

```
RENDER-BLOCKING CSS:
  All <head> stylesheets block rendering by default
  Fix: media attribute, async preload pattern, critical CSS inline

CRITICAL CSS:
  Inline above-fold styles in <style> tag (< 14KB)
  Load rest async with preload + onload
  Angular: inlineCritical: true in angular.json

CSS CONTAINMENT:
  contain: content   → layout + paint + style isolation (practical)
  contain: strict    → all containment (needs explicit size)
  content-visibility: auto → skip rendering off-screen sections (up to 7x faster)

SELECTOR PERFORMANCE:
  Flat classes > deep descendants
  BEM prevents specificity wars
  Tailwind: only ships used classes = 5-15KB vs 100-200KB

WEB FONTS:
  font-display: optional → best for CLS (no swap)
  font-display: swap     → best for FOIT (shows text immediately)
  Preload fonts used above fold with crossorigin attribute
  size-adjust matches fallback metrics → reduces CLS from swaps

ANIMATIONS:
  Only animate transform and opacity (composite-only, GPU)
  Never animate: top, left, width, height, margin
  Always wrap in: @media (prefers-reduced-motion: no-preference)
```

---

## Hands-On Task (20 mins)

1. Open any Angular project → `angular.json` → check if `inlineCritical: true` is set
2. Open DevTools → Network → look at the main CSS file size (gzipped)
3. Run Coverage tab → see how much CSS is unused on first load
4. Add `contain: content` to one list component and test — no visual change, faster rendering
5. Check if any `@font-face` rules in your app have `font-display` set — if not, add it

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Render-blocking** | Resource that pauses browser rendering until fully downloaded |
| **Critical CSS** | Minimum CSS needed to render above-fold content |
| **FOIT** | Flash of Invisible Text — text hidden while font loads |
| **FOUT** | Flash of Unstyled Text — fallback shown then swapped |
| **CSS containment** | `contain` property — isolates element from affecting outside layout |
| **content-visibility** | Skips rendering off-screen elements entirely |
| **font-display** | Controls how browser handles font loading and fallback |
| **size-adjust** | Adjusts fallback font metrics to match custom font |
| **PurgeCSS** | Tool that removes unused CSS rules from production builds |
| **Critters** | Angular's built-in critical CSS extraction tool |
| **prefers-reduced-motion** | Media query for users who prefer minimal animation |
| **BEM** | Block-Element-Modifier — CSS naming convention for flat specificity |
| **Specificity** | CSS rule priority system — inline > id > class > element |
| **inlineCritical** | Angular build option to automatically inline critical CSS |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 12** | Image & Asset Optimization | WebP, AVIF, srcset, responsive images |
| **Day 13** | Network Optimization | Prefetch, preconnect, HTTP/2, compression |
| **Day 14** | Virtual DOM & Change Detection | React diffing, Angular change detection deep dive |