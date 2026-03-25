# ⚡ Frontend System Design — Day 5
## Topic: HTTP Caching Deep Dive

> **Study time:** 1 hour | **Phase:** 1 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Asked at Google, Razorpay, Flipkart, Swiggy, CRED)

---

## The Big Picture

Caching is the **highest-leverage performance optimization** in frontend engineering.

```
No cache:    Browser → DNS → TCP → TLS → Server → Response  ~500–2000ms
With cache:  Browser → Memory                                ~2–5ms

That's a 400x difference.
```

**3 places caches live:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser Cache    → Stores responses per user, per browser          │
│  CDN Cache        → Shared cache at edge servers near users         │
│  Server Cache     → Redis/Memcached on the backend (not our job)    │
│                                                                     │
│  As a frontend engineer you control:                                │
│    → Cache-Control headers (tells browser + CDN what to do)        │
│    → ETags (helps with conditional revalidation)                    │
│    → CDN configuration and cache invalidation strategy             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cache-Control Header — The Master Switch

Every HTTP response should have a `Cache-Control` header. This single header
tells every cache in the chain exactly what to do with the response.

### Key Directives

```
max-age=N
  → Cache this response for N seconds
  → max-age=3600 = cache for 1 hour
  → After expiry: must revalidate (but may use ETag)

public
  → Any cache may store this (browser, CDN, proxy server)
  → Use for: CSS, JS, images, fonts, public API responses

private
  → Only the browser cache may store this — NOT CDN
  → Use for: user-specific data, personalized pages, auth responses

no-cache
  → CONFUSING NAME! Does NOT mean "don't cache"
  → Means: "cache it, but revalidate before every use"
  → Browser checks with server if content is still fresh
  → If unchanged: server sends 304 (no body) — fast!

no-store
  → Never store this response anywhere — not even on disk
  → Use for: banking, medical, highly sensitive data
  → Every request goes to server — no caching at all

immutable
  → Content will NEVER change — skip revalidation even after max-age
  → Only use with hashed filenames (styles.a1b2c3.css)
  → Browser won't even send revalidation request

stale-while-revalidate=N
  → Serve stale cache immediately, fetch fresh in background
  → N = window (seconds) in which stale is acceptable
  → Best UX: always fast, stays reasonably fresh

must-revalidate
  → Once stale: must revalidate before serving
  → Never serve stale content (opposite of stale-while-revalidate)

s-maxage=N
  → Same as max-age but only for shared caches (CDN)
  → Overrides max-age for CDNs, browser still uses max-age
```

### Real-World Recipes

```
Static assets with hash in filename (app.a1b2c3.js):
  Cache-Control: public, max-age=31536000, immutable
  → Cache for 1 year, never revalidate
  → The hash in the filename IS the version — safe forever

HTML pages:
  Cache-Control: no-cache
  → Revalidate every time, but use ETag to avoid re-download
  → Ensures users always get latest HTML (which links to latest hashed assets)

API responses (user-specific):
  Cache-Control: private, max-age=60
  → Cache in browser only (private), revalidate after 60s
  → CDN never caches user-specific data

Public API responses (same for all users):
  Cache-Control: public, max-age=300, stale-while-revalidate=60
  → CDN caches for 5 minutes
  → If stale by up to 60s, serve stale + refresh in background

Sensitive / auth pages:
  Cache-Control: no-store
  → Never cache — always fresh from server

CDN with shorter browser cache:
  Cache-Control: public, max-age=60, s-maxage=86400
  → Browser caches for 1 minute
  → CDN caches for 24 hours (CDN handles invalidation via API)
```

---

## ETags — Conditional Revalidation

### The Problem ETags Solve

When `max-age` expires, browser must recheck the server. Without ETags, it
downloads the entire file again — even if nothing changed.

With ETags, browser sends the old ETag. Server checks if content changed:
- Unchanged → `304 Not Modified` — no body, just a few bytes
- Changed → `200 OK` with new content and new ETag

### How It Works

```
FIRST REQUEST:
Browser → GET /styles.css HTTP/1.1

Server  ← HTTP/1.1 200 OK
           ETag: "abc123def"
           Cache-Control: no-cache
           Content-Length: 51200
           [full 50KB CSS body]

Browser stores: response body + ETag "abc123def"

─────────────────────────────────────
SUBSEQUENT REQUEST (max-age expired or no-cache):
Browser → GET /styles.css HTTP/1.1
           If-None-Match: "abc123def"    ← sends stored ETag

IF FILE UNCHANGED:
Server  ← HTTP/1.1 304 Not Modified
           ETag: "abc123def"
           [NO BODY — saves 50KB!]

Browser uses cached version — fast + bandwidth saved.

IF FILE CHANGED:
Server  ← HTTP/1.1 200 OK
           ETag: "xyz789new"            ← new ETag
           [new 52KB CSS body]
```

### ETag vs Last-Modified

```
Last-Modified: Tue, 15 Jan 2026 10:30:00 GMT

On revalidation:
  If-Modified-Since: Tue, 15 Jan 2026 10:30:00 GMT

WHY ETag is better:
  → Last-Modified has 1-second precision (changes within 1s missed)
  → ETag is a hash — detects any byte-level change
  → Servers can generate ETags for dynamic content
  → ETags survive server clock sync issues

Use ETag when possible. Last-Modified as fallback.
```

### Performance Impact of ETags

```
Without ETag (file unchanged, but cache expired):
  → Full download: 50KB
  → Network time: ~400ms
  → Bandwidth: 50,000 bytes wasted

With ETag (file unchanged, cache expired):
  → 304 response: ~200 bytes (just headers)
  → Network time: ~50ms
  → Bandwidth: 200 bytes — 250x smaller!
```

---

## 5 Caching Strategies

### 1. Cache First (Static Assets)

```
Request → Check cache → Found? Serve it : Fetch network → Cache → Serve

Use for: CSS, JS, fonts, images — anything that changes rarely
Code pattern:
  Service Worker:
  caches.match(request).then(cached => cached || fetch(request))
```

### 2. Network First (Dynamic Data)

```
Request → Fetch network → Success? Cache + Serve : Use cache

Use for: API responses, user data, real-time content
Code pattern:
  fetch(request)
    .then(response => { cache.put(request, response.clone()); return response; })
    .catch(() => caches.match(request))
```

### 3. Stale While Revalidate (Best UX)

```
Request → Serve from cache immediately (even if stale)
        → Simultaneously fetch fresh from network in background
        → Update cache for next request

Use for: news feeds, dashboards, product listings
Header:  Cache-Control: max-age=60, stale-while-revalidate=300

Timeline:
  0s        → Request: serve fresh cache (max-age=60, not expired)
  60s       → Cache expires
  60–360s   → serve STALE cache immediately + fetch fresh in bg
  360s+     → stale window over → must wait for network

User always gets instant response. Never feels slow.
```

### 4. Cache Only (Offline Apps)

```
Request → Cache → If miss: fail (show offline UI)

Use for: app shell in PWAs, pre-cached offline content
Service Worker pre-caches everything on install
```

### 5. Network Only (Real-Time Data)

```
Request → Network always, never cache

Use for: payments, live scores, fraud checks, medical data
No caching involved — always authoritative
```

---

## CDN Caching

CDN (Content Delivery Network) = network of servers distributed globally.
User's request goes to nearest CDN edge server — not your origin.

### How It Works

```
WITHOUT CDN:
User (Mumbai) → Your Server (Bangalore) → ~30ms
User (New York) → Your Server (Bangalore) → ~250ms

WITH CDN:
User (Mumbai) → CDN Edge (Mumbai) → ~5ms     [cache HIT]
User (New York) → CDN Edge (New York) → ~5ms  [cache HIT]
CDN (Mumbai) → Your Server (Bangalore) → ~30ms [only on cache MISS]
```

### CDN Cache Control

```
# Tell CDN to cache for longer than browser
Cache-Control: public, max-age=60, s-maxage=86400

# s-maxage: only read by CDN (not browser)
# max-age: read by browser (60s)
# s-maxage: read by CDN (86400s = 24 hours)

# CDN serves from edge for 24 hours
# Browser revalidates with CDN every 60 seconds
```

### Cache Invalidation — The Hard Problem

> "There are only two hard things in Computer Science:
>  cache invalidation and naming things." — Phil Karlton

```
STRATEGY 1: Filename hashing (BEST — no invalidation needed)
  → styles.a1b2c3.css — hash changes when content changes
  → Old URL never needs invalidation (it's a different URL)
  → Set max-age=31536000, immutable — cache forever

  Build tools that do this automatically:
  Webpack, Vite, Angular CLI → filename hashing built in

STRATEGY 2: CDN Cache Purge API
  → Cloudflare: DELETE /zones/{id}/purge_cache
  → Fastly: POST /service/{id}/purge
  → Deploy new code → call CDN API to invalidate paths
  → Instant — no TTL wait

STRATEGY 3: Query string versioning
  → styles.css?v=2.1.0
  → Works but some CDNs ignore query strings
  → Less reliable than filename hashing

STRATEGY 4: Versioned paths
  → /v2/styles.css
  → Clean approach, deploy new version to new path
  → Old version still accessible during rollout
```

---

## The Full Caching Strategy for a Real App

This is what you say in system design interviews:

```
STATIC ASSETS (JS/CSS/images with hashed names):
  Cache-Control: public, max-age=31536000, immutable
  → Cache forever in browser AND CDN
  → Hash in filename ensures automatic cache busting on deploy

HTML FILES:
  Cache-Control: no-cache
  + ETag header
  → Revalidate every time but use ETag — 304 if unchanged
  → Ensures users get latest HTML (which references latest hashed assets)

API RESPONSES (public, same for all users):
  Cache-Control: public, max-age=60, stale-while-revalidate=30
  → CDN caches at edge
  → Serve stale + refresh in background

API RESPONSES (user-specific):
  Cache-Control: private, max-age=30
  → Only browser cache — CDN never stores personal data

FONTS (from Google Fonts or self-hosted):
  Cache-Control: public, max-age=31536000, immutable
  → Fonts never change — cache forever

SENSITIVE PAGES (checkout, account, payments):
  Cache-Control: no-store
  → Never cache — fresh from server every time
```

---

## Interview Questions & Model Answers

### Q1: "How would you cache a large React app for fast repeat visits?"

```
Three-layer strategy:

1. Static assets (JS, CSS, images):
   → Vite/webpack generates hashed filenames: main.a1b2c3.js
   → Set: Cache-Control: public, max-age=31536000, immutable
   → Browser caches for 1 year, CDN caches at edge
   → Deploy new version → new hash → automatic cache bust

2. HTML entry point (index.html):
   → Set: Cache-Control: no-cache + ETag
   → Browser revalidates each visit but 304 if unchanged
   → On new deploy: different ETag → browser downloads new HTML
   → New HTML references new hashed assets → cascade update

3. API responses:
   → User data: Cache-Control: private, max-age=60
   → Public data: Cache-Control: public, max-age=300, stale-while-revalidate=60

Result: First visit downloads everything. Repeat visits:
  → index.html: ~50ms (304 revalidation)
  → JS/CSS: ~2ms (browser cache hit)
  → API: instant if within max-age, background update if stale
```

### Q2: "What is the difference between no-cache and no-store?"

```
no-cache (confusingly named):
  → DOES cache the response
  → BUT must revalidate with server before using it
  → Server returns 304 if unchanged — fast!
  → Use for: HTML files, content that changes but bandwidth matters

no-store:
  → NEVER cache — not in browser, not on disk, not on CDN
  → Every request goes to origin server fresh
  → Use for: banking pages, medical records, highly sensitive data

Memory trick:
  no-cache = "cache it but always check"
  no-store = "never touch a cache"
```

### Q3: "A CDN is serving stale content after a deploy. How do you fix it?"

```
Immediate fix:
  → Call CDN purge API to invalidate affected paths
  → Cloudflare: CF-Cache-Status: PURGE
  → Most CDNs have dashboard purge + API purge

Long-term fix:
  → Switch to filename hashing for all assets
  → styles.a1b2c3.css — hash changes on every deploy
  → Old cached files harmless (different URL)
  → New deploy = new URLs = automatic cache bust

For HTML:
  → Use short max-age + ETag instead of long cache
  → Cache-Control: no-cache ensures HTML revalidates
  → Even if CDN serves stale HTML briefly, it'll be corrected
  → OR: bypass CDN for HTML (serve direct from origin)

Prevention:
  → Set s-maxage shorter for HTML than for assets
  → Configure CDN to respect Cache-Control headers strictly
```

### Q4: "What is stale-while-revalidate and when would you use it?"

```
stale-while-revalidate lets you serve a stale (expired) cached response
immediately while fetching a fresh version in the background.

Cache-Control: max-age=60, stale-while-revalidate=300

How it works:
  0–60s:    Cache is fresh — serve directly
  60–360s:  Cache is stale but within SWR window:
              → Serve stale version immediately (instant!)
              → Fetch fresh version in background
              → Cache updated for next request
  360s+:    Beyond SWR window — must wait for network

Best use cases:
  → News feeds (slightly stale headlines OK)
  → Product listings (inventory changes slowly)
  → Dashboards (5-min-old data usually fine)
  → Any data where users care more about speed than freshness

NOT for:
  → Payments (must be real-time)
  → Inventory/stock (could oversell)
  → Auth state (security risk)
```

---

## Cheat Sheet — Memorize Before Interviews

```
CACHE-CONTROL DIRECTIVES:
  max-age=N         cache for N seconds
  public            CDN + browser can cache
  private           browser only (not CDN)
  no-cache          cache but always revalidate (NOT "don't cache"!)
  no-store          NEVER cache (banking/medical)
  immutable         never revalidate (use with hashed filenames)
  stale-while-revalidate=N  serve stale, fetch fresh in background
  s-maxage=N        CDN-only max-age override

ETAGS:
  Server sends:     ETag: "abc123"
  Browser sends:    If-None-Match: "abc123"
  Unchanged:        304 Not Modified (no body)
  Changed:          200 OK with new ETag + body

REAL APP STRATEGY:
  Hashed JS/CSS:    public, max-age=31536000, immutable
  HTML:             no-cache + ETag
  Public API:       public, max-age=60, stale-while-revalidate=30
  User API:         private, max-age=30
  Sensitive:        no-store

CACHE BUSTING:
  Best:  Filename hashing (main.a1b2c3.js)
  Good:  CDN purge API on deploy
  OK:    Query strings (?v=2.0)

CDN NUMBERS:
  Cache HIT latency:   ~5–15ms
  Cache MISS latency:  ~200–500ms (goes to origin)
  Bandwidth saved:     up to 95% with good cache strategy
```

---

## Hands-On Task (20 mins)

1. Open Chrome DevTools → Network tab on any site
2. Reload the page (F5) and look at the response headers for:
   - HTML file → what's the Cache-Control?
   - JS/CSS files → do they have hashed names? What's max-age?
   - Images → are they being cached?

3. Look at the "Size" column:
   - `(memory cache)` → served from RAM — fastest
   - `(disk cache)` → served from disk
   - A number in KB/MB → fetched from network

4. Do a hard reload (Ctrl+Shift+R) — watch which requests go to network vs cache

5. Look for ETags in response headers — tick "If-None-Match" in request headers on repeat load

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Cache-Control** | HTTP header that controls caching behavior for browsers and CDNs |
| **max-age** | Number of seconds a cached response is considered fresh |
| **ETag** | Hash of response content — used for conditional revalidation |
| **304 Not Modified** | Server response meaning "your cached version is still valid" |
| **CDN** | Content Delivery Network — edge servers near users |
| **Cache Hit** | Request served from cache — no network needed |
| **Cache Miss** | Cache doesn't have the response — must fetch from origin |
| **Stale** | Cached response past its max-age — may still be usable |
| **Revalidation** | Checking with server if a cached response is still fresh |
| **Cache Busting** | Technique to force cache to fetch fresh content |
| **Fingerprinting** | Adding content hash to filename for automatic cache busting |
| **s-maxage** | max-age that only applies to shared caches (CDNs) |
| **immutable** | Cache directive — content will never change, skip revalidation |
| **stale-while-revalidate** | Serve stale cache immediately, refresh in background |
| **Origin server** | Your actual backend server — not the CDN edge |
| **TTL** | Time To Live — how long a cache entry is valid |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 6** | Browser Rendering Deep Dive | Reflow, repaint, compositing, GPU layers |
| **Day 7** | Security Fundamentals | XSS, CSRF, CSP headers — asked at every company |
| **Day 8** | Phase 1 Review | 5 timed system design questions across all topics |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*