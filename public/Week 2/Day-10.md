# ⚡ Frontend System Design — Day 10
## Topic: JavaScript Performance

> **Study time:** 1 hour | **Phase:** 2 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Every senior interview — "how would you reduce bundle size?")

---

## The Big Picture

Every byte of JS costs you TWICE:
1. Download time — transferring bytes over network
2. Parse + compile time — CPU processes bytes before code runs

```
500KB JS on mid-range Android:
  Download (Slow 4G): ~2.5 seconds
  Parse + compile:    ~3-4 seconds
  Total before code runs: ~6 seconds

After splitting to 80KB initial + lazy chunks:
  Download: ~0.4 seconds
  Parse + compile: ~0.5 seconds
  Time to interactive: ~1 second
```

The solution is not to write less code — it's to **load the right code at the right time**.

---

## Technique 1 — Code Splitting

Splits one giant bundle into smaller chunks loaded on demand.

### 3 Types

```
1. ENTRY POINT SPLITTING
   → Separate bundle per page (default for MPA)
   → Webpack/Vite do this automatically for multiple HTML files

2. ROUTE-BASED SPLITTING (highest impact)
   → Each SPA route loads its JS only when user navigates to it
   → Cuts initial bundle by 50-80% in large apps
   → Most important type — implement this first

3. COMPONENT-BASED SPLITTING
   → Heavy components loaded only when rendered
   → Use for: chart libraries, rich text editors, map widgets, modals
```

### React — lazy + Suspense

```javascript
import React, { lazy, Suspense } from 'react';

// BEFORE — all routes in initial bundle
import Dashboard from './Dashboard';   // ~120KB
import Reports   from './Reports';     // ~80KB
import Settings  from './Settings';    // ~40KB
// Initial bundle: 240KB + app code

// AFTER — each route loads on demand
const Dashboard = lazy(() => import('./Dashboard'));
const Reports   = lazy(() => import('./Reports'));
const Settings  = lazy(() => import('./Settings'));
// Initial bundle: ~20KB app code only

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports"   element={<Reports   />} />
        <Route path="/settings"  element={<Settings  />} />
      </Routes>
    </Suspense>
  );
}
```

### Angular — Lazy Routes

```typescript
// app.routes.ts — every feature module loaded on demand
export const routes: Routes = [
  {
    path: 'claims',
    loadChildren: () =>
      import('./claims/claims.module').then(m => m.ClaimsModule)
  },
  {
    path: 'dashboard',
    // Angular 17+ standalone:
    loadComponent: () =>
      import('./dashboard/dashboard.component')
        .then(c => c.DashboardComponent)
  }
];

// app.config.ts — with prefetch strategy
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules))
    // PreloadAllModules: after initial load, prefetches all lazy routes in background
  ]
};
```

### Named Chunks — Better Debugging

```javascript
// Add webpackChunkName magic comment
const Dashboard = lazy(() =>
  import(/* webpackChunkName: "dashboard" */ './Dashboard')
);
// Creates: dashboard.a1b2c3.js instead of 3.a1b2c3.js
// Much easier to identify in Network tab and bundle analysis
```

---

## Technique 2 — Tree Shaking

Bundler removes code that is never imported. Eliminates dead code automatically.

### The Golden Rule: Named Imports Only

```javascript
// BAD — imports entire library, defeats tree shaking
import _ from 'lodash';
import moment from 'moment';
import * as ReactIcons from 'react-icons';

const result = _.debounce(fn, 300);  // Only using debounce
// But entire lodash (72KB gzipped) is in your bundle!

// GOOD — only debounce is imported and bundled
import { debounce } from 'lodash-es';   // 2KB
import { format } from 'date-fns';     // 2KB
import { FaArrow } from 'react-icons/fa'; // specific icon only

// Same functionality — 95% smaller
```

### Why ES Modules Matter for Tree Shaking

```javascript
// CommonJS (require) — DYNAMIC, cannot be statically analysed
const { debounce } = require('lodash'); // bundler can't tree-shake this

// ES Modules (import) — STATIC, bundler can trace imports at build time
import { debounce } from 'lodash-es'; // bundler removes unused exports

// This is why lodash-es exists separately from lodash
// lodash   = CommonJS = no tree shaking = 72KB always
// lodash-es = ES modules = full tree shaking = ~2KB for one function
```

### Making Your Own Code Tree-Shakeable

```javascript
// BAD — default export object prevents tree shaking
export default {
  formatDate,
  parseDate,
  slugify,
  truncate
};

// GOOD — named exports, bundler removes unused ones
export { formatDate } from './formatDate';
export { parseDate  } from './parseDate';
export { slugify    } from './slugify';
export { truncate   } from './truncate';
```

### package.json sideEffects Field

```json
{
  "name": "my-utils",
  "sideEffects": false
}
```

```
sideEffects: false tells bundler:
  "It is safe to remove any export from this package that isn't used"
  "No module has side effects on import (no global mutations)"

sideEffects: ["./src/polyfills.js", "**/*.css"]
  → List files that DO have side effects
  → CSS imports are always side effects (they modify the page)
  → Polyfill files modify globals
```

---

## Technique 3 — Lazy Loading

Load resources only when they are actually needed.

### Prefetch vs Preload vs Lazy

```html
<!-- PRELOAD: load this SOON — needed for current page -->
<link rel="preload" as="script" href="critical.js">
<link rel="preload" as="image" href="hero.jpg">

<!-- PREFETCH: load this LATER — needed for next navigation -->
<link rel="prefetch" href="/dashboard/chunk.js">
<!-- Browser downloads during idle time, stores in cache -->

<!-- LAZY: don't load until element is in viewport -->
<img src="product.jpg" loading="lazy" alt="Product">

<!-- NEVER lazy-load the LCP image! -->
<img src="hero.jpg" loading="eager" fetchpriority="high">
```

### React — Lazy + Prefetch on Hover

```javascript
// Prefetch route chunk on hover — zero-delay navigation feel
function NavLink({ to, importFn, children }) {
  const prefetch = () => {
    importFn(); // trigger dynamic import — browser downloads in bg
  };

  return (
    <Link
      to={to}
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      {children}
    </Link>
  );
}

// Usage:
<NavLink
  to="/dashboard"
  importFn={() => import('./Dashboard')}
>
  Dashboard
</NavLink>
```

### Angular defer Blocks (Angular 17+)

```html
<!-- Load component when it enters viewport -->
@defer (on viewport) {
  <app-claim-analytics [data]="analyticsData" />
} @placeholder {
  <div class="chart-skeleton" style="height: 300px"></div>
} @loading (minimum 200ms) {
  <app-spinner />
} @error {
  <p>Failed to load analytics</p>
}

<!-- Load on user interaction -->
@defer (on interaction) {
  <app-rich-text-editor [(value)]="content" />
} @placeholder {
  <button>Click to edit</button>
}

<!-- Load when condition is true -->
@defer (when isUserLoggedIn) {
  <app-user-dashboard />
}
```

### IntersectionObserver for Custom Lazy Loading

```javascript
// Lazy load any resource when it enters viewport
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;

        // Load image
        if (el.dataset.src) {
          el.src = el.dataset.src;
          el.removeAttribute('data-src');
        }

        // Load component
        if (el.dataset.component) {
          import(el.dataset.component).then(m => {
            // mount component into el
          });
        }

        observer.unobserve(el); // stop watching once loaded
      }
    });
  },
  {
    rootMargin: '200px', // start loading 200px before viewport
    threshold: 0.1
  }
);

document.querySelectorAll('[data-src]').forEach(el => observer.observe(el));
```

---

## Technique 4 — Bundle Analysis

Find what's making your bundle large before optimizing.

### Tools

```bash
# webpack
npm install --save-dev webpack-bundle-analyzer

# webpack.config.js:
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
module.exports = {
  plugins: [new BundleAnalyzerPlugin({ analyzerMode: 'static' })]
};

# Vite
npm install --save-dev rollup-plugin-visualizer

# vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer';
export default defineConfig({
  plugins: [visualizer({ open: true, gzipSize: true })]
});

# Angular
ng build --stats-json
npx webpack-bundle-analyzer dist/your-app/stats.json

# Any bundler (uses source maps)
npm install -g source-map-explorer
source-map-explorer dist/main.*.js

# Check package size before installing:
# bundlephobia.com — type any npm package name
```

### What to Look for in the Treemap

```
BIG RED FLAGS:
  moment.js (67KB) → replace with date-fns (2KB per fn)
  lodash    (72KB) → use lodash-es or native JS
  firebase  (large)→ import only what you use
  chart.js  (63KB) → use lightweight-charts or d3 submodules

COMMON FIXES:
  Package                  → Lighter Alternative
  moment                   → date-fns (tree-shakeable)
  lodash                   → lodash-es or native array methods
  jquery                   → native DOM APIs
  @mui/icons (full import) → import { Search } from '@mui/icons-material/Search'
  react-icons (full import)→ import { FaArrow } from 'react-icons/fa'
  firebase (full import)   → import { getAuth } from 'firebase/auth' (modular)
```

---

## Angular-Specific Performance (Your Tech Stack)

```typescript
// 1. OnPush change detection — biggest Angular perf win
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Only re-renders when:
  //   → @Input() value changes (by reference)
  //   → Event handler fires inside component
  //   → markForCheck() called explicitly
  //   → async pipe emits
})
export class ClaimListComponent {
  @Input() claims: Claim[] = [];
}

// 2. trackBy — prevent full list re-renders
@Component({
  template: `
    <div *ngFor="let claim of claims; trackBy: trackById">
      {{ claim.id }} — {{ claim.status }}
    </div>
  `
})
export class ClaimListComponent {
  trackById(index: number, claim: Claim): string {
    return claim.id; // Angular only re-renders items whose ID changed
  }
}
// Without trackBy: ANY claims array change = recreate ALL DOM nodes
// With trackBy: only changed/added/removed items updated

// 3. Async pipe — auto-subscribes + auto-unsubscribes + triggers CD
@Component({
  template: `
    <div *ngIf="claims$ | async as claims">
      {{ claims.length }} claims
    </div>
  `
})
export class ClaimsComponent {
  claims$ = this.claimsService.getAll(); // Observable
  // async pipe handles subscribe + unsubscribe automatically
}

// 4. Pure pipes — only recalculate when input changes
@Pipe({ name: 'filterClaims', pure: true })
export class FilterClaimsPipe implements PipeTransform {
  transform(claims: Claim[], status: string): Claim[] {
    return claims.filter(c => c.status === status);
    // NOT called unless claims or status reference changes
  }
}
```

---

## React-Specific Performance

```javascript
// 1. React.memo — skip re-render if props unchanged
const ClaimCard = React.memo(({ claim, onSelect }) => {
  return (
    <div onClick={() => onSelect(claim.id)}>
      {claim.name}
    </div>
  );
});
// Parent re-renders → ClaimCard only re-renders if claim or onSelect changed

// 2. useMemo — memoize expensive computations
function ClaimsPage({ claims, sortKey }) {
  const sortedClaims = useMemo(
    () => [...claims].sort((a, b) => a[sortKey] - b[sortKey]),
    [claims, sortKey] // only re-sort if these change
  );
  return <ClaimList claims={sortedClaims} />;
}

// 3. useCallback — stable function reference
function ClaimsPage({ onUpdate }) {
  const handleSelect = useCallback(
    (id) => setSelectedId(id),
    [] // created once — stable reference for memo'd children
  );
  return <ClaimCard onSelect={handleSelect} />;
}

// 4. useTransition — non-blocking state updates (React 18)
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e) => {
    setQuery(e.target.value); // urgent — update input immediately

    startTransition(() => {
      setResults(filterClaims(e.target.value)); // non-urgent — can wait
    });
  };

  return (
    <>
      <input value={query} onChange={handleSearch} />
      {isPending ? <Spinner /> : <ResultsList results={results} />}
    </>
  );
}
```

---

## Interview Questions & Model Answers

### Q1: "How would you reduce the bundle size of a large Angular app?"

```
3-step approach:

1. Measure first:
   ng build --stats-json
   npx webpack-bundle-analyzer dist/stats.json
   Identify the biggest offenders (usually large npm packages)

2. Code splitting — lazy load every feature module:
   loadChildren: () => import('./claims/claims.module')
   Result: initial bundle drops 50-80%

3. Tree shaking — remove unused library code:
   Switch lodash → lodash-es
   Switch moment → date-fns
   Use named imports for all libraries
   Set sideEffects: false in package.json

4. Angular-specific:
   OnPush change detection on all list components
   trackBy on all *ngFor directives
   Standalone components (Angular 17) — more tree-shakeable
   defer blocks for heavy components

A typical large Angular app goes from 1.2MB → 200KB initial bundle
with full lazy loading + tree shaking.
```

### Q2: "What is tree shaking and why does it require ES modules?"

```
Tree shaking = bundler removes code that is never imported.
It's dead code elimination at the module level.

Requires ES modules because:
  ES modules are STATIC — imports are resolved at compile time
  Bundler can trace the entire import graph before running anything
  Can determine with certainty which exports are never used

CommonJS (require) is DYNAMIC — can require() based on runtime values:
  const lib = require(someVariable); // bundler can't know what's used
  module.exports = computedObject;   // can't statically analyse

This is why lodash-es exists separately from lodash.
lodash uses CommonJS → bundler can't tree-shake → 72KB always included
lodash-es uses ES modules → tree-shakeable → 2KB for just debounce
```

### Q3: "What is the difference between preload, prefetch and lazy?"

```
preload   → load NOW, needed for current page
  <link rel="preload" as="image" href="hero.jpg">
  Use for: LCP image, critical fonts, above-fold CSS

prefetch  → load LATER, needed for likely next page
  <link rel="prefetch" href="dashboard.chunk.js">
  Browser downloads during idle time, stores in cache
  Use for: next route's JS, next page's hero image

lazy load → load ON DEMAND, only when needed
  <img loading="lazy"> — loads when entering viewport
  dynamic import()    — loads when code path executes
  Use for: below-fold images, non-critical routes, heavy components

Priority order:
  1. preload  (highest — browser fetches immediately)
  2. prefetch (background — fetched during idle)
  3. lazy     (on demand — fetched when needed)
```

---

## Cheat Sheet — Memorize Before Interviews

```
CODE SPLITTING:
  React:   lazy(() => import('./Component')) + Suspense
  Angular: loadChildren: () => import('./module').then(m => m.Module)
  Goal:    initial bundle < 100KB gzipped for SPA

TREE SHAKING:
  Rule:    named imports only — never import * or default object
  Requires: ES modules (import/export), not CommonJS (require)
  lodash → lodash-es
  moment → date-fns
  Set sideEffects: false in package.json

LAZY LOADING:
  preload   = load now, current page critical resource
  prefetch  = load in background, next page resource
  lazy      = load when entered viewport or code path hit

ANGULAR OPTIMISATIONS:
  OnPush change detection + trackBy in ngFor
  Lazy routes (loadChildren/loadComponent)
  defer blocks for heavy components (Angular 17+)
  Async pipe over manual subscribe

REACT OPTIMISATIONS:
  React.memo + useMemo + useCallback
  lazy + Suspense for routes
  useTransition for non-urgent updates

BUNDLE ANALYSIS TOOLS:
  webpack-bundle-analyzer, rollup-plugin-visualizer
  source-map-explorer, bundlephobia.com

KEY NUMBERS:
  Target initial bundle: < 100KB gzipped
  lodash full: 72KB → lodash-es single fn: ~2KB
  moment: 67KB → date-fns format fn: ~2KB
  500KB JS on Android: ~6s parse + compile time
```

---

## Hands-On Task (20 mins)

1. Open any Angular or React project you have locally
2. Run `ng build --stats-json` or `npm run build` (Vite shows sizes)
3. Look at the chunk sizes in the output
4. Check: are your routes lazy loaded? (look for `loadChildren` or `lazy()`)
5. Go to `bundlephobia.com` → look up `moment`, `lodash`, `firebase` — see their sizes
6. Check your imports — are you doing `import _ from 'lodash'` anywhere? Replace with named imports.

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Code splitting** | Breaking one bundle into multiple smaller chunks loaded on demand |
| **Tree shaking** | Removing unused exports from modules at build time |
| **Lazy loading** | Loading resources only when needed (routes, images, components) |
| **Dynamic import** | `import()` — loads a module on demand, returns a Promise |
| **Chunk** | A separately loaded JS file created by the bundler |
| **Bundle analysis** | Visualising bundle contents to find large packages |
| **Dead code** | Code that is never executed — tree shaking removes this |
| **sideEffects** | Package.json field — tells bundler if modules have side effects |
| **OnPush** | Angular change detection strategy — only checks on Input/event changes |
| **trackBy** | Angular optimization — identifies list items by key, avoids full re-render |
| **React.memo** | HOC that skips re-rendering if props are shallow-equal |
| **useMemo** | React hook — memoizes expensive computed values |
| **useCallback** | React hook — memoizes functions for stable references |
| **useTransition** | React 18 hook — marks state updates as non-urgent |
| **PreloadAllModules** | Angular strategy — prefetches all lazy routes after initial load |
| **defer block** | Angular 17+ template syntax — lazy loads component with lifecycle hooks |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 11** | CSS Performance | Critical CSS, render-blocking, containment |
| **Day 12** | Image & Asset Optimization | WebP, AVIF, srcset, responsive images |
| **Day 13** | Network Optimization | Prefetch, preconnect, HTTP/2, compression |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*