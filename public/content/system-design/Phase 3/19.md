# 🖥️ Frontend System Design — Day 19
## Topic: Rendering Patterns (CSR, SSR, SSG, ISR)

> **Study time:** 1 hour | **Phase:** 3 of 5 | **Difficulty:** Intermediate → Advanced
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Every senior interview — "when would you use SSR?")

---

## The Core Question

When does HTML reach the browser, and how much work does the browser
have to do before the user sees something?

That single question drives every rendering decision.

```
PATTERN  WHERE RENDERING HAPPENS    WHEN HTML IS READY
───────  ─────────────────────────  ──────────────────
CSR      Browser (client)           After JS downloads + runs
SSR      Server (per request)       After server fetches data + builds HTML
SSG      Build machine (once)       At deploy time (pre-built)
ISR      Build + server (background) Pre-built, refreshed on schedule
```

---

## Pattern 1 — CSR (Client-Side Rendering)

The Angular and React SPA default. Browser downloads empty HTML + JS bundle, then JS renders everything.

### Request Timeline

```
Browser → GET /dashboard
Server  ← 200 OK: <html><body><div id="app"></div></body></html>  ← empty!

Browser downloads app.js (300KB, ~1.5s on Slow 4G)
Browser parses + executes app.js (~0.5s on mobile)
Browser fetches /api/claims (~200ms)
Browser renders content ← first thing user sees (~2.5s total)
```

### Characteristics

```
GOOD:
  → No server required — deploy as static files to CDN
  → Fast subsequent navigations — all code already loaded
  → Simplest mental model — no server/client boundary
  → Best for complex interactive state
  → Cheap to host (static files on S3/Cloudflare)

BAD:
  → Slow FCP — blank page until JS runs
  → Poor SEO by default — crawlers receive empty HTML
  → All CPU on user's device — slow on low-end Android
  → High Time to Interactive — large JS bundle penalty
```

### When CSR is Correct

```
Behind-login dashboards    → SEO irrelevant, auth required
Admin panels               → Complex state, no public crawlers
Internal tools             → Your Digit Insurance claims portal
Real-time applications     → WebSocket/polling state hard to SSR
Highly interactive UIs     → Complex client-side state (forms, drag/drop)
```

---

## Pattern 2 — SSR (Server-Side Rendering)

Server receives request, fetches data, builds complete HTML, sends to browser. Browser shows content immediately, JS hydrates for interactivity.

### Request Timeline

```
Browser → GET /products/123
Server:  1. Fetches product from DB/API (~50ms)
         2. Renders full HTML with product data (~10ms)
         3. Sends complete HTML
Browser ← 200 OK: <html><body><h1>Product Name</h1><p>₹2,999</p>...
                                                   ← visible immediately!
Browser downloads JS (~1s)
Browser hydrates (attaches event listeners) (~0.5s)
← fully interactive ~2s after first visible content
```

### Next.js App Router (SSR by default)

```javascript
// Server Component — runs on server, zero client JS
// Data fetched before HTML is sent to browser
async function ProductPage({ params }) {
  const product = await fetch(
    `https://api.example.com/products/${params.id}`,
    { cache: 'no-store' } // no-store = fresh SSR on every request
  ).then(r => r.json());

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>₹{product.price.toLocaleString('en-IN')}</p>
      <AddToCartButton productId={product.id} /> {/* client component */}
    </main>
  );
}

// HTML with product data is in the first HTTP response
// FCP = TTFB + server render time (~200ms total)
// vs CSR FCP = TTFB + JS download + execute + API fetch (~2500ms)
```

### Angular Universal (SSR for Angular)

```typescript
// app.config.server.ts
import { provideServerRendering } from '@angular/platform-server';

export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // ...rest of providers
  ]
};

// Component — runs on server AND client
@Component({
  template: `
    @if (product()) {
      <h1>{{ product()!.name }}</h1>
    }
  `
})
export class ProductComponent implements OnInit {
  product = signal<Product | null>(null);

  constructor(
    private productService: ProductService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit() {
    // Works on both server and browser
    this.productService.getProduct(this.route.snapshot.params['id'])
      .subscribe(p => this.product.set(p));
  }
}
```

### The Hydration Problem

```
SSR UNCANNY VALLEY:
  t=0ms:    Browser receives full HTML — page LOOKS ready
  t=200ms:  User sees button, moves to click it
  t=500ms:  User clicks button — nothing happens!
  t=1500ms: JS downloads
  t=2000ms: Hydration completes
  t=2000ms: Button click finally fires

User thinks the page is broken. 

This is "time to interactive" gap — visible but unresponsive.

Partial hydration (React 18):
  Priority hydrate interactive parts first
  Static parts: never need to hydrate at all
  
React Server Components:
  Server components ship zero JS — no hydration needed
  Only "use client" components hydrate
```

### When SSR is Correct

```
Public product/content pages with SEO requirement
Personalised content (user-specific, can't pre-build)
Data too dynamic for SSG but needs fast FCP
Pages where authenticated user sees different content
```

---

## Pattern 3 — SSG (Static Site Generation)

HTML built once at deploy time. Every request gets pre-built HTML from CDN. Fastest possible load.

### Build → Deploy → Serve

```
BUILD TIME (npm run build):
  1. Fetch all product data from API
  2. Render HTML for every product page
  3. Write 10,000 .html files to disk

DEPLOY:
  Upload .html files to S3/Cloudflare/Vercel CDN

RUNTIME (every request):
  Browser → GET /products/123
  CDN     ← 200 OK: pre-built HTML  ← served in ~5ms from edge
  
No database touched. No server woken up. Just file serving.
```

### Next.js SSG

```javascript
// generateStaticParams — which pages to pre-build
export async function generateStaticParams() {
  const products = await fetch('/api/products').then(r => r.json());
  return products.map(p => ({ id: String(p.id) }));
  // Tells Next.js: build /products/1, /products/2, ..., /products/10000
}

async function ProductPage({ params }) {
  const product = await fetch(
    `/api/products/${params.id}`,
    { cache: 'force-cache' } // SSG — bake into build
  ).then(r => r.json());

  return <ProductDetail product={product} />;
}

// Output after build: 10,000 .html files
// Each served from CDN in ~5ms — far faster than any SSR
```

### Characteristics

```
GOOD:
  → Fastest possible load — CDN edge, ~5ms TTFB
  → Perfect SEO — complete HTML, no JS needed
  → No server — zero hosting cost for traffic spikes
  → Infinitely scalable — CDN handles millions of requests

BAD:
  → Stale data — reflects build-time snapshot
  → Long builds — 10,000 pages × 500ms = 83 minutes
  → Rebuild required for any data change
  → Cannot personalise — same HTML for all users
```

### When SSG is Correct

```
Blog posts / documentation    → Content changes rarely
Marketing / landing pages      → Same for all users, no live data
Product catalogues             → Acceptable to rebuild on changes
Help centre articles           → Static content, SEO critical
Any page that's same for all users + infrequently updated
```

---

## Pattern 4 — ISR (Incremental Static Regeneration)

SSG with automatic background regeneration. Pages cached as static HTML, regenerated every N seconds or on-demand webhook.

### How ISR Works

```
BUILD TIME:
  Pages pre-built as HTML — same as SSG

FIRST REQUEST (t=0):
  CDN serves pre-built HTML — fast (~5ms)

AFTER REVALIDATION WINDOW (t > 60s):
  Next request: CDN serves STALE cached HTML (still fast!)
  Background: server silently regenerates the page
  Next-next request: CDN serves FRESH HTML

→ stale-while-revalidate at the full page level
→ Users always get fast response
→ Data is at most 60s stale
```

### Next.js ISR

```javascript
// Time-based ISR — revalidate every 60 seconds
async function ProductPage({ params }) {
  const product = await fetch(
    `/api/products/${params.id}`,
    { next: { revalidate: 60 } } // ISR: cache for 60 seconds
  ).then(r => r.json());

  return <ProductDetail product={product} />;
}

// On-demand ISR — trigger from webhook when data changes
// app/api/revalidate/route.ts
export async function POST(request) {
  const { path, tag, secret } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (path) revalidatePath(path);       // revalidate specific path
  if (tag)  revalidateTag(tag);         // revalidate all pages with this tag

  return Response.json({ revalidated: true, at: new Date().toISOString() });
}

// Your CMS/backend sends POST /api/revalidate when product data changes
// Instantly regenerates that product's page — no full rebuild needed

// Tagging fetches for targeted invalidation
async function ProductPage({ params }) {
  const product = await fetch(`/api/products/${params.id}`, {
    next: {
      revalidate: 3600,                    // also check hourly
      tags: ['products', `product-${params.id}`] // targeted invalidation
    }
  }).then(r => r.json());
}
```

### When ISR is Correct

```
E-commerce product pages     → SEO critical, prices update daily not real-time
News articles                → Updated occasionally, not every second
Restaurant menus             → Change weekly, SEO matters
Real estate listings         → Updated daily, high traffic, SEO critical
Any public page needing SEO + reasonably fresh data
```

---

## React Server Components — The Modern Layer

Next.js App Router introduced a third category beyond CSR and SSR: components that run only on the server and ship zero JavaScript to the client.

```
TRADITIONAL SSR:
  Server renders HTML, sends it
  Then sends JS bundle
  JS re-runs (hydrates) to make interactive
  → JS bundle = server components + client components

REACT SERVER COMPONENTS:
  Server components: render on server, ship ZERO JS
  Client components: render on server + hydrate on client
  → JS bundle = only client components

Result: dramatically smaller bundles
        server components can access DB directly (no API needed)
        only interactive parts need to hydrate
```

```javascript
// Server Component (default in Next.js App Router)
// This function NEVER runs in the browser
// Zero bytes added to JS bundle
async function ClaimsList() {
  // Direct DB access — no API layer needed!
  const claims = await prisma.claim.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <ul>
      {claims.map(claim => (
        // ClaimCard is a client component (interactive)
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </ul>
  );
}

// Client Component — needs interactivity
'use client'; // ← marks this as client component
function ClaimCard({ claim }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div onClick={() => setExpanded(e => !e)}>
      <h3>{claim.title}</h3>
      {expanded && <ClaimDetails claim={claim} />}
    </div>
  );
}

// Pattern: keep client components as LEAF nodes
// Server components handle data fetching + layout
// Client components handle only interactivity
```

---

## Comparison Table

| Pattern | FCP | SEO | Server needed | Hosting | Data freshness |
|---------|-----|-----|--------------|---------|----------------|
| CSR | Slow | Poor | No | CDN only | Always fresh |
| SSR | Fast | Excellent | Yes (Node.js) | Server/serverless | Always fresh |
| SSG | Fastest | Excellent | No (build time only) | CDN only | Build-time snapshot |
| ISR | Fastest | Excellent | Minimal | CDN + serverless | Configurable (N seconds) |

---

## Decision Guide

```
Page type                    → Pattern
──────────────────────────────────────────────────────────────
Behind-login dashboard        → CSR   (SEO irrelevant, auth required)
Admin panel / internal tool   → CSR   (your Digit app)
Real-time data (prices/scores)→ CSR   (data too dynamic to pre-render)
Highly interactive SPA        → CSR   (complex state hard to SSR)

Public marketing pages        → SSG   (never changes, max performance)
Blog posts / documentation    → SSG   (infrequent updates, SEO critical)
Help centre articles          → SSG   + on-demand ISR for updates

E-commerce product pages      → ISR   (SEO + fresh data needed)
News / magazine articles      → ISR   (published, occasionally updated)
Restaurant / venue pages      → ISR   (weekly updates, SEO matters)

Personalised user pages       → SSR   (different content per user)
Pages needing real-time + SEO → SSR   (live auction pages etc.)
Auth-gated but SEO-crawlable  → SSR   (preview/shared pages)
```

---

## Interview Questions & Model Answers

### Q1: "When would you use SSR vs CSR?"

```
It depends on two factors: SEO requirements and data freshness.

USE CSR when:
  → The page is behind authentication (SEO irrelevant)
  → Complex client-side state that's hard to SSR
  → Internal tools, dashboards, admin panels
  → My Digit Insurance claims portal is CSR — correct decision

USE SSR when:
  → Public pages that need to rank in search engines
  → Content is personalised per user (can't pre-build)
  → Need fast FCP for authenticated pages
  → Marketing site product pages

The key tradeoff: SSR needs a running server, adds operational
complexity, and has the "hydration gap" problem where the page
looks ready but isn't yet interactive. CSR is simpler but shows
users a blank page while JS loads.

Modern answer: Next.js App Router with React Server Components
blurs this — server components for data fetching, client
components only where interactivity is needed.
```

### Q2: "What is the difference between SSG and ISR?"

```
SSG: pre-builds ALL pages at deploy time. Data baked in.
  → Fastest possible — CDN serves static HTML
  → Stale unless you trigger a full rebuild
  → Good for: docs, blogs, marketing pages (rarely change)

ISR: pre-builds at deploy time but regenerates in background.
  → Same CDN speed for most requests
  → Automatically refreshes every N seconds or on-demand
  → First request after stale period: served stale + regenerating
  → Good for: e-commerce (prices change daily), news (articles update)

ISR is stale-while-revalidate at the page level.
You get CDN performance AND data freshness — at the cost of
occasionally serving data that's up to N seconds old.

On-demand ISR is even better: your CMS triggers a revalidation
webhook when data changes, and only THAT page rebuilds.
No full-site rebuild, no waiting.
```

### Q3: "What is hydration and why is it a problem?"

```
Hydration is the process where the browser downloads JS and
re-runs the component tree to attach event listeners to
the already-rendered SSR HTML.

The problem: there's a gap between "page looks ready" and
"page is actually interactive". The HTML is visible at FCP
but buttons don't respond until hydration completes.

For a heavy page this could be 1-2 seconds. User sees a button,
clicks it, nothing happens. They click again — still nothing.
Then JS finishes, both clicks fire at once.

React 18 partial hydration helps:
  → Prioritise hydrating interactive components first
  → Static content doesn't need to hydrate at all

React Server Components eliminates hydration for server components:
  → Only "use client" components ship JS to the browser
  → Everything else: pure HTML, no hydration needed
  → Dramatically smaller bundles + faster TTI

Angular 17 introduced incremental hydration:
  → Hydrate components on-demand (on viewport, on interaction)
  → Static parts never hydrate
```

---

## Cheat Sheet

```
CSR:   browser renders everything. Fast navigations, slow FCP.
       Use for: dashboards, admin, real-time, behind-auth apps.

SSR:   server renders full HTML per request. Fast FCP, needs server.
       Use for: public pages with SEO, personalised content.

SSG:   build-time pre-rendering. Fastest possible, stale data.
       Use for: docs, blogs, marketing (infrequent changes).

ISR:   SSG + background regeneration. CDN speed + freshness.
       Use for: e-commerce, news, any public page updated regularly.

RSC (React Server Components):
       Component-level SSR without hydration cost. 
       Server components → zero JS bundle. Client components → "use client".

HYDRATION:
       SSR sends HTML + JS. JS re-runs to make interactive.
       Gap between visible and interactive = hydration gap.
       RSC + partial hydration minimises this.

DECISION RULE:
       Behind login?       → CSR
       Public + SEO + static? → SSG
       Public + SEO + fresh?  → ISR or SSR
       Personalised + public? → SSR
```

---

## Hands-On Task (20 mins)

1. Look at your Digit Insurance app — confirm it's CSR (check: is the initial HTML empty?)
2. Visit any e-commerce site → View Source → is there product content in the HTML? (indicates SSR/SSG)
3. Visit `nextjs.org/docs` → View Source → there's full HTML in the source (SSG!)
4. Open DevTools → Network → reload a Next.js site → look for the `x-nextjs-cache` response header
5. HIT = served from cache (SSG/ISR), MISS = freshly rendered (SSR)

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **CSR** | Client-Side Rendering — browser downloads JS, renders in browser |
| **SSR** | Server-Side Rendering — server builds HTML per request |
| **SSG** | Static Site Generation — HTML built at deploy time |
| **ISR** | Incremental Static Regeneration — SSG with background refresh |
| **FCP** | First Contentful Paint — when first content appears |
| **Hydration** | JS attaching event listeners to SSR-rendered HTML |
| **Hydration gap** | Time between "looks ready" and "actually interactive" |
| **React Server Components** | Components that run only on server, ship zero JS |
| **"use client"** | Next.js directive marking a component as client-side |
| **revalidate** | Next.js config: how often ISR regenerates a page |
| **revalidatePath** | Next.js function: immediately regenerate a specific page |
| **revalidateTag** | Next.js function: regenerate all pages tagged with a key |
| **Angular Universal** | Angular's SSR implementation |
| **Partial hydration** | Only hydrating interactive parts, not the whole page |
| **Incremental hydration** | Angular 17+ — hydrate components on demand |
| **TTFB** | Time to First Byte — server response latency |
| **Edge rendering** | SSR running at CDN edge nodes near users |
| **App Router** | Next.js routing system with RSC as the default |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 20** | Design Systems | Tokens, theming, component APIs, a11y at scale |
| **Day 21** | Phase 3 Review | Architecture mock questions across Days 14–20 |
| **Day 22** | Accessibility (a11y) | WCAG, ARIA, keyboard nav — asked at FAANG |
