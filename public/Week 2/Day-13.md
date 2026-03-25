# 🌐 Frontend System Design — Day 13
## Topic: Network Optimization

> **Study time:** 1 hour | **Phase:** 2 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐ (Asked at Google, Razorpay, Flipkart, Swiggy)

---

## The Big Picture

Days 10-12 reduced the SIZE of what you send.
Day 13 is about getting it there FASTER.

```
FOUR NETWORK LEVERS:

  1. Resource hints   → tell browser what to fetch BEFORE it discovers it
  2. HTTP/2 & HTTP/3  → send multiple resources on ONE connection simultaneously
  3. Compression      → Brotli/Gzip reduce bytes in transit by 70-80%
  4. Service Workers  → serve from cache instantly, enable offline
```

---

## Lever 1 — Resource Hints

### The Four Hints

```
preload    → HIGH priority. Load now. Critical resource for THIS page.
prefetch   → LOW priority. Load during idle. For NEXT page navigation.
preconnect → Open TCP+TLS connection to a third-party NOW.
dns-prefetch → Resolve DNS only. Lighter than preconnect.
```

### preload — Load It Before Browser Discovers It

```html
<!-- Browser discovers LCP image when it parses the <img> tag
     By then it's already 100-200ms into the page load

     preload tells browser: "fetch this NOW, immediately" -->

<!-- LCP image -->
<link rel="preload" href="hero.avif" as="image" fetchpriority="high">

<!-- Critical font — prevents FOIT -->
<link rel="preload" href="inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- Above-fold JS -->
<link rel="preload" href="critical.js" as="script">

<!-- Critical CSS (if not inlined) -->
<link rel="preload" href="above-fold.css" as="style">
```

```
as attribute values:
  as="image"  → image resources
  as="font"   → web fonts (requires crossorigin attribute!)
  as="script" → JavaScript files
  as="style"  → CSS files
  as="fetch"  → fetch/XHR requests (requires crossorigin)

Without "as": browser gives it default (low) priority — defeats the purpose!
```

### prefetch — Download Now, Use Later

```html
<!-- Browser downloads during idle time, stores in cache -->
<!-- Used when user navigates to a predicted next page -->

<!-- Prefetch next route's JS chunk -->
<link rel="prefetch" href="/dashboard/main.chunk.js">

<!-- Dynamic prefetch on hover (best UX pattern) -->
<script>
navLinks.forEach(link => {
  link.addEventListener('mouseenter', () => {
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = link.dataset.chunk;
    document.head.appendChild(prefetch);
  });
});
</script>
<!-- Result: by the time user clicks, chunk is already cached -->
```

### preconnect — Open TCP+TLS Connection Early

```html
<!-- Saves 200-500ms by doing DNS + TCP + TLS early
     Before you actually make the first request to this origin -->

<!-- Your API (saves latency on first API call) -->
<link rel="preconnect" href="https://api.yoursite.com">

<!-- Your CDN -->
<link rel="preconnect" href="https://cdn.yoursite.com">

<!-- Google Fonts (two origins needed) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- crossorigin required when origin uses CORS (fonts, fetch) -->
```

### dns-prefetch — DNS Resolution Only

```html
<!-- Lighter than preconnect — only DNS lookup, no TCP/TLS -->
<!-- Use for origins you MIGHT fetch from, or as preconnect fallback -->

<link rel="dns-prefetch" href="//analytics.google.com">
<link rel="dns-prefetch" href="//cdn.example.com">

<!-- Best practice: use both together for maximum compatibility -->
<link rel="preconnect" href="https://cdn.example.com">
<link rel="dns-prefetch" href="//cdn.example.com">
```

### Resource Hints Priority Table

| Hint | What it does | Priority | When to use |
|------|-------------|----------|-------------|
| `preload` | Download resource | High — immediate | LCP image, critical fonts, above-fold CSS |
| `prefetch` | Download for later | Low — during idle | Next route's JS, next page's hero |
| `preconnect` | Open connection | Medium | API domain, CDN, Google Fonts |
| `dns-prefetch` | Resolve DNS only | Lowest | Maybe-used origins, preconnect fallback |

### Warning — Don't Over-Hint

```
Each preload uses bandwidth immediately.
Each preconnect uses a TCP connection slot.
Browser has limited parallel connection resources.

Rule: preload maximum 3-4 resources (LCP image + fonts)
      preconnect maximum 3-4 origins (API + CDN + fonts)
      Over-hinting starves resources that actually matter
```

---

## Lever 2 — HTTP/2 and HTTP/3

### HTTP/1.1 — The Old Bottleneck

```
HTTP/1.1 limitation:
  → 1 request at a time per connection
  → Browser opens max 6 connections per domain
  → Each connection = DNS + TCP + TLS overhead

Waterfall (sequential requests per connection):
  connection 1: main.js      ████████░░░░░░░░
  connection 2: styles.css   ░░████████░░░░░░
  connection 3: logo.png     ░░░░░████████░░░
  connection 4: api.json     ░░░░░░░░████████
  (each waits — blocks the others)
```

### HTTP/2 — Multiplexing

```
Key improvements:
  → Multiple requests on ONE TCP connection (multiplexing)
  → No head-of-line blocking between requests
  → Header compression (HPACK) — saves bandwidth on many small requests
  → Binary protocol (more efficient than text)

HTTP/2 waterfall (all parallel):
  main.js      ████████
  styles.css   ████████
  logo.png     ████████
  api.json     ████████
  (all start simultaneously on one connection)

Domain sharding (HTTP/1.1 hack) HURTS with HTTP/2:
  Old: cdn1.example.com, cdn2.example.com → more parallel connections
  Now: Multiple origins = multiple TLS handshakes = slower!
  Modern rule: serve all assets from ONE origin with HTTP/2
```

### HTTP/3 — QUIC Protocol

```
HTTP/2 remaining problem:
  → Built on TCP → TCP head-of-line blocking
  → ONE lost packet stalls ALL streams until retransmit
  → Problem on mobile networks with high packet loss

HTTP/3 solution:
  → Built on QUIC (UDP-based)
  → Each stream is independent
  → Lost packet only blocks THAT stream, not others
  → 0-RTT reconnection for known servers (~200ms saved)

Adoption:
  → All major CDNs support HTTP/3 (Cloudflare, Fastly, AWS CloudFront)
  → 95%+ of Chrome users have HTTP/3 enabled
  → Check: DevTools → Network → Protocol column → look for "h3"
```

### Checking Your HTTP Version

```
DevTools → Network tab → right-click column headers → enable "Protocol"
  "h2"   = HTTP/2 (good)
  "h3"   = HTTP/3 (excellent)
  "http/1.1" = old, upgrade your server/CDN
```

---

## Lever 3 — Compression

### Gzip vs Brotli

```
GZIP:
  Algorithm: LZ77 + Huffman coding
  Savings:   ~70% on text (100KB → 30KB)
  Support:   100% of browsers and servers
  Speed:     Fast compression, moderate ratio
  Use when:  Server doesn't support Brotli (rare now)

BROTLI:
  Algorithm: Google's LZ77 variant + Huffman + context modeling
  Savings:   ~80% on text (100KB → 20-25KB) — 20-26% better than Gzip
  Support:   All modern browsers (97%+)
  Speed:     Slower to compress, but much better ratio
  Use when:  Always — with Gzip fallback for old clients
```

### What to Compress

```
ALWAYS COMPRESS (text-based):
  HTML, CSS, JavaScript, TypeScript (compiled)
  JSON, XML, SVG
  Plain text, CSV
  Fonts (.woff, NOT .woff2 — already compressed)

NEVER COMPRESS (already compressed):
  JPEG, PNG, WebP, AVIF, GIF
  WOFF2 (already uses Brotli internally)
  ZIP, RAR, 7z archives
  MP4, WebM, other videos
  Compressing already-compressed formats wastes CPU and sometimes increases size
```

### Server Configuration

```nginx
# Nginx — enable both
brotli on;
brotli_comp_level 6;
brotli_types text/html text/css application/javascript
             application/json image/svg+xml;

gzip on;
gzip_comp_level 6;
gzip_vary on;
gzip_types text/html text/css application/javascript
           application/json image/svg+xml;
```

```javascript
// Express.js — Gzip (easy)
const compression = require('compression');
app.use(compression());

// Express.js — Brotli (shrink-ray package)
const shrinkRay = require('shrink-ray-current');
app.use(shrinkRay());
```

### Pre-compression at Build Time (Best Practice)

```javascript
// Generate .gz and .br versions of all static assets at build time
// Server serves pre-compressed files — zero runtime CPU cost

// vite.config.ts
import viteCompression from 'vite-plugin-compression';
export default defineConfig({
  plugins: [
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
  ]
});
// Generates: main.js + main.js.br + main.js.gz
// Server picks based on Accept-Encoding header

// Nginx: serve pre-compressed if available
gzip_static on;    // serves .gz files automatically
brotli_static on;  // serves .br files automatically
```

---

## Lever 4 — Service Workers

### What Service Workers Enable

```
Service Worker = JavaScript that runs in background, separate from page.
Has no DOM access. Intercepts all network requests.

Enables:
  → Instant load from cache (cached resources: ~2ms vs network: ~200ms)
  → Offline support (page works without internet)
  → Background sync (retry failed requests when online)
  → Pre-caching (download resources proactively during idle)
  → Push notifications
```

### Basic Service Worker

```javascript
// sw.js — service worker file (separate from app bundle)
const CACHE_NAME = 'app-v1';
const APP_SHELL = ['/', '/index.html', '/app.js', '/styles.css'];

// INSTALL: cache app shell when SW first installs
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ACTIVATE: clean up old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key)) // delete stale caches
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH: intercept every network request
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
    // Cache hit → serve instantly (~2ms)
    // Cache miss → fetch from network, optionally cache result
  );
});

// Register in your app:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Workbox — Use This in Production

```javascript
// Don't write Service Workers from scratch — use Workbox
// Google's library handles caching strategies, versioning, cleanup
import { registerRoute } from 'workbox-routing';
import {
  CacheFirst,
  StaleWhileRevalidate,
  NetworkFirst
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Images: cache first, 30-day expiry
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 })]
  })
);

// API responses: stale-while-revalidate (fast + reasonably fresh)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({ cacheName: 'api-responses' })
);

// HTML pages: network first (always latest content)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3 // fallback to cache if network slow
  })
);

// Static assets (hashed): cache forever
registerRoute(
  ({ url }) => /\.(js|css)$/.test(url.pathname) && url.pathname.includes('.'),
  new CacheFirst({ cacheName: 'static-assets' })
);
```

---

## The Complete Network Strategy

```html
<!-- 1. RESOURCE HINTS — top of <head> -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.yoursite.com">
<link rel="preconnect" href="https://cdn.yoursite.com">
<link rel="preload" href="hero.avif" as="image" fetchpriority="high">
<link rel="preload" href="inter.woff2" as="font" crossorigin>
<link rel="prefetch" href="/dashboard/chunk.js">
```

```
2. SERVER SETUP:
   ✅ HTTP/2 or HTTP/3 enabled
   ✅ Brotli compression for text resources
   ✅ Pre-compressed .br and .gz files for static assets
   ✅ Cache-Control: max-age=31536000, immutable (hashed JS/CSS)
   ✅ Cache-Control: no-cache + ETag (HTML files)
   ✅ HTTPS everywhere (required for HTTP/2, Brotli, SW)

3. CDN:
   ✅ Static assets served from CDN edge
   ✅ CDN points of presence in your users' regions
   ✅ HTTP/3 support
   ✅ Auto-compression (Brotli/Gzip)
   ✅ Image CDN with format auto-negotiation

4. SERVICE WORKER (for PWA/offline):
   ✅ App shell cached on install
   ✅ Cache-first for static assets
   ✅ Stale-while-revalidate for API data
   ✅ Network-first for HTML pages
```

---

## Interview Questions & Model Answers

### Q1: "What is the difference between preload, prefetch and preconnect?"

```
preload:
  → Downloads a resource for the CURRENT page immediately
  → High priority — browser fetches it right away
  → Use for: LCP image, critical fonts, above-fold CSS
  → <link rel="preload" href="hero.avif" as="image">

prefetch:
  → Downloads a resource for the NEXT likely page
  → Low priority — happens during idle time
  → Stored in cache for when user navigates
  → <link rel="prefetch" href="/dashboard/bundle.js">

preconnect:
  → Opens TCP + TLS connection to a third-party origin EARLY
  → Saves 200-500ms on the first request to that origin
  → Use for: your API domain, CDN, Google Fonts
  → <link rel="preconnect" href="https://api.yoursite.com">

dns-prefetch:
  → DNS resolution only (no TCP/TLS)
  → Lighter than preconnect — use for origins you might fetch
  → Fallback for browsers without preconnect support
```

### Q2: "How does HTTP/2 improve performance over HTTP/1.1?"

```
HTTP/1.1:
  → One request at a time per connection
  → Browser opens 6 parallel connections per domain
  → Each connection = DNS + TCP + TLS overhead
  → Head-of-line blocking: slow request blocks others

HTTP/2:
  → Multiple requests multiplexed over ONE connection
  → No head-of-line blocking between streams
  → Header compression (HPACK) — important for APIs with many headers
  → Binary framing — more efficient than HTTP/1.1 text

Practical impact:
  → Eliminates "domain sharding" anti-pattern
  → Waterfall shrinks — resources load in parallel
  → Especially impactful for APIs with many small requests

HTTP/3 further improves on HTTP/2 by using QUIC (UDP)
which eliminates TCP-level head-of-line blocking.
```

### Q3: "When would you use a Service Worker?"

```
Service Workers are most valuable for:

1. Offline support (PWAs):
   Cache app shell on install
   Serve from cache when offline
   Show offline page instead of browser error

2. Performance (instant repeat visits):
   Static assets: cache-first → 2ms serve time vs 200ms network
   API data: stale-while-revalidate → instant + background refresh
   HTML: network-first with 3s timeout → always fresh, safe fallback

3. Background sync:
   Form submission fails (no network)?
   SW queues it, retries when online
   User never loses data

4. Slow/unreliable networks (common in India):
   Users on 2G/3G benefit enormously from SW caching
   Critical insurance app data cached for field agents offline

I would always use Workbox rather than writing SW from scratch —
it handles cache versioning, expiration, and strategy selection
with much less boilerplate.
```

---

## Cheat Sheet

```
RESOURCE HINTS:
  preload      → current page, high priority, immediate download
  prefetch     → next page, low priority, idle download
  preconnect   → open TCP+TLS to origin before first request
  dns-prefetch → DNS only, lighter than preconnect

HTTP VERSIONS:
  HTTP/1.1 → 1 request/connection, max 6 parallel connections
  HTTP/2   → multiplexed, one connection, header compression
  HTTP/3   → QUIC/UDP, no TCP HOL blocking, 0-RTT reconnect
  Check: DevTools → Network → Protocol column → should show "h2" or "h3"

COMPRESSION:
  Brotli   → 80% reduction, better than Gzip, use as primary
  Gzip     → 70% reduction, universal fallback
  Always compress: HTML, CSS, JS, JSON, SVG
  Never compress: JPEG, PNG, WebP, WOFF2, videos

SERVICE WORKERS:
  Intercept fetch requests → serve from cache or network
  Cache-first for static assets (images, JS, CSS)
  Stale-while-revalidate for API responses
  Network-first for HTML pages
  Use Workbox — don't write from scratch

QUICK WINS (implement in any app today):
  Add preconnect for API and CDN domains
  Add preload for LCP image and critical fonts
  Enable Brotli on your server/CDN
  Check Protocol column in DevTools — upgrade if HTTP/1.1
  Enable Service Worker for repeat-visit speed
```

---

## Hands-On Task (20 mins)

1. DevTools → Network → right-click column headers → enable "Protocol"
2. Load any major site — check if it shows "h2" or "h3" (Google, Flipkart should show h3)
3. Click any HTML document → Response Headers → look for `Content-Encoding: br` (Brotli)
4. Look at `<head>` of any production site (View Source) — find their resource hints
5. Check: `navigator.serviceWorker.getRegistrations().then(console.log)` — any PWAs register one?

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **preload** | Resource hint — download resource for current page immediately |
| **prefetch** | Resource hint — download resource during idle for next navigation |
| **preconnect** | Resource hint — open TCP+TLS connection to origin early |
| **dns-prefetch** | Resource hint — resolve DNS for origin before fetching |
| **HTTP/2** | Protocol with multiplexing — many requests on one connection |
| **HTTP/3** | Protocol using QUIC/UDP — eliminates TCP head-of-line blocking |
| **QUIC** | UDP-based transport protocol underneath HTTP/3 |
| **Multiplexing** | Sending multiple requests simultaneously on one connection |
| **Head-of-line blocking** | One slow request blocking all others in a queue |
| **Brotli** | Google's compression algorithm — ~80% reduction on text |
| **Gzip** | Standard compression — ~70% reduction on text |
| **Service Worker** | Background JS thread that intercepts network requests |
| **Cache-first** | SW strategy: serve from cache, fall back to network |
| **Network-first** | SW strategy: try network, fall back to cache if slow/offline |
| **Stale-while-revalidate** | SW strategy: serve cache immediately, refresh in background |
| **Workbox** | Google's library for Service Worker caching strategies |
| **0-RTT** | HTTP/3 feature: reconnect to known server without handshake |
| **Domain sharding** | HTTP/1.1 hack of using multiple subdomains — avoid with HTTP/2 |

---

## Phase 2 Complete — What's Next

Phase 2 (Days 9-13) covered the full performance toolkit:
- Day 9: Measurement — Lighthouse, DevTools, web-vitals
- Day 10: JS Performance — code splitting, tree shaking, lazy loading
- Day 11: CSS Performance — critical CSS, containment, animations
- Day 12: Image Optimization — formats, srcset, picture, loading strategy
- Day 13: Network Optimization — hints, HTTP/2, Brotli, Service Workers

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 14** | Virtual DOM & Change Detection | React diffing, Angular OnPush — Phase 3 begins |
| **Day 15** | List Virtualization | Render 10,000 items at 60fps |
| **Day 16** | Phase 2 Review | End-to-end performance optimization exercise |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*