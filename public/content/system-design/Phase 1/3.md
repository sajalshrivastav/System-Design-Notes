# 🗄️ Frontend System Design — Day 3
## Topic: Browser Storage

> **Study time:** 1 hour | **Phase:** 1 of 5 | **Difficulty:** Beginner → Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Asked at Razorpay, CRED, Flipkart, Swiggy, Google)

---

## The Big Picture

Every frontend system needs to answer: **"Where do I store this data on the client?"**

Get it wrong and you either:
- Break on page refresh (stored nothing)
- Create a security vulnerability (stored in wrong place)
- Kill performance (stored too much / wrong type)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  5 BROWSER STORAGE MECHANISMS                       │
│                                                                     │
│  localStorage    → persistent, same origin, ~5-10MB                │
│  sessionStorage  → tab-scoped, dies on close, ~5-10MB              │
│  Cookies         → sent to server on every request, ~4KB           │
│  IndexedDB       → client-side database, 50MB+, any JS object      │
│  Cache API       → network cache for PWAs, via Service Worker      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Decision Framework

Use this to answer "where would you store X?" instantly:

```
Does the server need it on every HTTP request?
  YES → Cookie
    Is it sensitive (auth token, session ID)?
      YES → HttpOnly + Secure + SameSite Cookie (server-set)
      NO  → Regular cookie

  NO → Client-only storage
    Is it large structured data OR needs offline support?
      YES → IndexedDB
    Is it network assets (JS, CSS, images, API responses)?
      YES → Cache API (via Service Worker)
    Should it survive tab/browser close?
      YES → localStorage
      NO  → sessionStorage
```

---

## 1. localStorage

Persistent key-value storage. Survives browser close and restart.

### Properties

| Property | Value |
|----------|-------|
| Capacity | ~5–10 MB |
| Persists after tab/browser close | Yes — forever until cleared |
| Sent to server | No |
| Accessible from JS | Yes |
| Scope | Same origin (protocol + domain + port) |
| Data type | Strings only (must JSON.stringify objects) |

### API

```javascript
// Store data
localStorage.setItem('theme', 'dark');
localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Sajal' }));

// Read data
const theme = localStorage.getItem('theme');           // 'dark'
const user = JSON.parse(localStorage.getItem('user')); // { id: 1, name: 'Sajal' }

// Check if exists
if (localStorage.getItem('theme') !== null) { ... }

// Remove one item
localStorage.removeItem('theme');

// Clear everything
localStorage.clear();

// Get number of items
localStorage.length;

// Iterate all keys
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
}
```

### Use Cases
- User preferences (theme, language, font size)
- UI state (sidebar collapsed, last active tab)
- Non-sensitive cached API data
- Shopping cart for unauthenticated users

### Security Warning

```
NEVER store in localStorage:
  × JWT access tokens
  × Passwords or API keys
  × Sensitive personal data

WHY: XSS attacks can read all localStorage with:
  document.cookie // no — that's cookies
  localStorage.getItem('token') // any injected script can do this

BETTER: Use HttpOnly cookies for auth tokens
```

---

## 2. sessionStorage

Same API as localStorage but data dies when the tab closes.

### Properties

| Property | Value |
|----------|-------|
| Capacity | ~5–10 MB |
| Persists after tab close | No — wiped immediately |
| Sent to server | No |
| Accessible from JS | Yes |
| Scope | Same tab only (NOT shared between tabs) |
| Data type | Strings only |

### API

```javascript
// Same API as localStorage — just replace the object name
sessionStorage.setItem('formStep', '2');
sessionStorage.setItem('checkoutData', JSON.stringify(cart));

const step = sessionStorage.getItem('formStep');
sessionStorage.removeItem('formStep');
sessionStorage.clear();
```

### Key Difference from localStorage

```
localStorage:   Shared across ALL tabs of same origin
sessionStorage: Each tab has its own ISOLATED sessionStorage

Example:
  Tab 1: sessionStorage.setItem('key', 'hello')
  Tab 2: sessionStorage.getItem('key') → NULL (different tab!)
```

### Use Cases
- Multi-step form state (survive page refresh within same tab)
- Temporary checkout/wizard data
- Search filters for current session
- One-time page-specific state

---

## 3. Cookies

Small pieces of data sent to the server with every HTTP request.

### Properties

| Property | Value |
|----------|-------|
| Capacity | ~4 KB per cookie |
| Persists | Configurable via `expires` / `Max-Age` |
| Sent to server | YES — automatically on every request to matching domain |
| Accessible from JS | Only if NOT HttpOnly |
| Scope | Domain + path (can share across subdomains) |
| Data type | String |

### Setting Cookies

```javascript
// From JavaScript (NOT recommended for sensitive data)
document.cookie = "theme=dark; path=/; max-age=86400";
document.cookie = "userId=123; path=/; expires=Fri, 31 Dec 2026 23:59:59 GMT";

// Read all cookies (returns one big string)
console.log(document.cookie); // "theme=dark; userId=123"

// Delete a cookie (set expiry in the past)
document.cookie = "theme=; max-age=0; path=/";
```

```
// From Server (HTTP Response Header) — THE SECURE WAY
Set-Cookie: sessionId=abc123xyz;
  HttpOnly;            ← JS cannot read this cookie at all
  Secure;              ← Only sent over HTTPS
  SameSite=Strict;     ← Never sent on cross-site requests (CSRF protection)
  Max-Age=86400;       ← Expires after 24 hours
  Path=/;              ← Available on all paths
```

### Cookie Security Flags — MUST KNOW

```
HttpOnly:
  → Cookie cannot be accessed by JavaScript (document.cookie)
  → Protects against XSS attacks stealing the token
  → ALWAYS use this for auth tokens/session IDs

Secure:
  → Cookie only sent over HTTPS connections
  → Never transmitted over plain HTTP
  → ALWAYS use in production

SameSite:
  → Strict: Only sent for same-site requests (most secure)
  → Lax: Sent for same-site + top-level navigations (default)
  → None: Sent cross-site (requires Secure flag)
  → Use Strict or Lax to prevent CSRF attacks

Max-Age / Expires:
  → Max-Age: seconds until expiry (e.g., 86400 = 24 hours)
  → Expires: specific date-time string
  → Neither: session cookie (dies when browser closes)
```

### Use Cases
- Session IDs and auth tokens (HttpOnly cookies)
- Remember me / persistent login
- CSRF protection tokens
- A/B testing user assignment
- Cross-subdomain data (api.site.com ↔ app.site.com)

### Interview Q: "Where should JWT tokens be stored?"

```
WRONG answer: localStorage
  → Vulnerable to XSS — any injected script can steal it

CORRECT answer: HttpOnly cookies
  → JS cannot access it at all
  → Sent automatically on every request
  → Protected from XSS (HttpOnly) and CSRF (SameSite)

If you MUST use localStorage (e.g., cross-origin API):
  → Store access token in memory (JS variable) instead
  → Store refresh token in HttpOnly cookie
  → Refresh access token on every page load
```

---

## 4. IndexedDB

A full client-side NoSQL database built into the browser.

### Properties

| Property | Value |
|----------|-------|
| Capacity | 50 MB+ (browser managed, can request more) |
| Persists after close | Yes — until explicitly cleared |
| Sent to server | No |
| Accessible from JS | Yes (async API) |
| Scope | Same origin |
| Data type | Any JS object (files, blobs, arrays, objects) |

### API (using Dexie.js — recommended wrapper)

```javascript
// Raw IndexedDB is complex — use Dexie.js in production
import Dexie from 'dexie';

const db = new Dexie('MyDatabase');

db.version(1).stores({
  products: '++id, name, price, category',
  cart: '++id, productId, quantity'
});

// Add data
await db.products.add({ name: 'iPhone', price: 80000 });

// Query data
const phones = await db.products
  .where('category').equals('phone')
  .toArray();

// Update
await db.products.update(1, { price: 75000 });

// Delete
await db.products.delete(1);
```

### Raw IndexedDB (know the pattern)

```javascript
const request = indexedDB.open('MyDB', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('products', { keyPath: 'id' });
  store.createIndex('name', 'name', { unique: false });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(['products'], 'readwrite');
  const store = transaction.objectStore('products');
  store.add({ id: 1, name: 'iPhone', price: 80000 });
};
```

### Use Cases
- Offline-first PWAs (Gmail offline, Figma)
- Large datasets (product catalogs, email threads)
- File and blob storage (images, documents)
- Client-side full-text search index
- Draft auto-saving (rich text editors)

---

## 5. Cache API

Stores HTTP Request/Response pairs. Powers offline-first PWAs.

### Properties

| Property | Value |
|----------|-------|
| Capacity | Browser managed (usually GBs available) |
| Persists after close | Yes — until manually cleared |
| Accessible from JS | Via Service Worker (and window.caches) |
| Scope | Same origin |
| Data type | Request/Response pairs |

### API

```javascript
// In Service Worker — cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js',
        '/logo.png'
      ]);
    })
  );
});

// Intercept all network requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache hit — return cached version
      if (cachedResponse) return cachedResponse;
      // Cache miss — fetch from network
      return fetch(event.request);
    })
  );
});
```

### Caching Strategies

```
Cache First (Static assets):
  → Try cache → if miss, fetch network
  → Best for: CSS, JS, images, fonts

Network First (Dynamic data):
  → Try network → if fail, fallback to cache
  → Best for: API responses, user data

Stale While Revalidate (Background update):
  → Return cache immediately
  → Fetch network in background to update cache
  → Best for: news feeds, dashboards

Cache Only:
  → Only serve from cache, never network
  → Best for: offline-only content

Network Only:
  → Always fetch from network, skip cache
  → Best for: real-time data (payments, live scores)
```

### Use Cases
- PWA offline support
- Instant repeat page loads (serve from cache)
- Reducing server load for static assets
- Offline fallback pages

---

## Comparison Table

```
┌──────────────────┬──────────┬─────────────┬───────────┬─────────────┬────────────┐
│ Feature          │  local   │  session    │  Cookies  │  IndexedDB  │  Cache API │
│                  │ Storage  │  Storage    │           │             │            │
├──────────────────┼──────────┼─────────────┼───────────┼─────────────┼────────────┤
│ Capacity         │ 5-10 MB  │ 5-10 MB     │ 4 KB      │ 50 MB+      │ GBs        │
│ Persists         │ Forever  │ Tab only    │ Configur. │ Forever     │ Forever    │
│ Server access    │ No       │ No          │ YES auto  │ No          │ No         │
│ JS accessible    │ Yes      │ Yes         │ If not    │ Yes (async) │ SW only    │
│                  │          │             │ HttpOnly  │             │            │
│ Data type        │ String   │ String      │ String    │ Any object  │ Req/Resp   │
│ Sync/Async       │ Sync     │ Sync        │ Sync      │ Async       │ Async      │
│ XSS safe         │ No       │ No          │ HttpOnly  │ No          │ Yes        │
└──────────────────┴──────────┴─────────────┴───────────┴─────────────┴────────────┘
```

---

## Real System Design Questions & Answers

### Q1: "Design a shopping cart that persists across page refreshes"

```javascript
// Store in localStorage
const CART_KEY = `cart_${userId || 'guest'}`;

// Add item
function addToCart(item) {
  const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// On logout: clear cart
function logout() {
  localStorage.removeItem(CART_KEY);
}

// Multi-device sync: also save to server API
// localStorage = client cache, server = source of truth
```

---

### Q2: "How would you store auth tokens securely?"

```
Option 1 — HttpOnly Cookie (BEST):
  → Server sets: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
  → Browser sends automatically on every request
  → JS cannot read it → safe from XSS
  → SameSite=Strict → safe from CSRF

Option 2 — Memory (good for SPAs):
  → Store access token in JS variable (not localStorage)
  → Store refresh token in HttpOnly cookie
  → Access token lost on page refresh → use refresh token to get new one
  → XSS can steal memory token during session, but can't persist it

Option 3 — localStorage (BAD for tokens):
  → XSS can steal token permanently
  → Never do this for auth tokens
```

---

### Q3: "What is the difference between localStorage and sessionStorage?"

```
localStorage:
  → Persists until explicitly cleared
  → Shared across ALL tabs of same origin
  → Survives browser close and reopen

sessionStorage:
  → Cleared when tab/window closes
  → Isolated per tab — Tab 1 cannot read Tab 2's data
  → NOT shared across tabs even if same URL

Use sessionStorage when:
  → Data should not persist beyond current task
  → Multi-step form state within same tab
  → Sensitive temporary data
```

---

### Q4: "Design an offline-first note-taking app"

```
Storage strategy:
  → IndexedDB: store all notes (title, content, timestamps)
  → Cache API: cache app shell (HTML, CSS, JS) via Service Worker
  → localStorage: store user preferences (font size, theme)

Sync strategy:
  → On online: sync IndexedDB changes to server API
  → On offline: queue changes locally, sync when back online
  → Use timestamps for conflict resolution
  → Background sync via Service Worker when connection restores
```

---

## Security Quick Reference

```
┌────────────────────────────────────────────────────────────────────┐
│                    SECURITY RISKS                                  │
│                                                                    │
│  XSS (Cross-Site Scripting):                                       │
│    → Attacker injects malicious JS into your page                 │
│    → That JS can read localStorage, sessionStorage, non-HttpOnly  │
│      cookies, and memory variables                                 │
│    → Defense: Content Security Policy + HttpOnly cookies           │
│                                                                    │
│  CSRF (Cross-Site Request Forgery):                                │
│    → Attacker tricks user into making request to your site         │
│    → Browser automatically sends cookies with request             │
│    → Defense: SameSite=Strict cookies + CSRF tokens               │
│                                                                    │
│  Storage by security level (most secure → least):                 │
│    1. HttpOnly cookie (cannot be read by JS at all)               │
│    2. Memory variable (lost on refresh, no persistence)           │
│    3. sessionStorage (XSS risk, at least dies on close)           │
│    4. localStorage (XSS risk + persists forever)                  │
│    5. Non-HttpOnly cookie (XSS risk + sent to server)             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Cheat Sheet — Memorize Before Interviews

```
localStorage  → persistent, 5MB, string only, no server, XSS risk
sessionStorage → tab-scoped, 5MB, dies on close, isolated per tab
Cookies       → 4KB, auto-sent to server, HttpOnly = XSS safe
IndexedDB     → 50MB+, async, any data type, offline apps
Cache API     → network cache, Service Worker, PWA offline

AUTH TOKEN RULE:
  NEVER localStorage → XSS steals it
  ALWAYS HttpOnly cookie → JS cannot touch it

WHEN TO USE WHAT:
  Theme/prefs          → localStorage
  Form wizard state    → sessionStorage
  Auth session         → HttpOnly cookie
  Offline app data     → IndexedDB
  Static assets cache  → Cache API
```

---

## Hands-On Task (20 mins)

Open your browser's DevTools → Application tab. You'll see:

```
Storage section:
  Local Storage    ← click and see what sites store here
  Session Storage  ← try opening same URL in new tab — different!
  Cookies          ← look for HttpOnly flag on auth cookies
  IndexedDB        ← open Gmail — see all emails stored here!
  Cache Storage    ← open any PWA — see cached assets
```

Try these in console on any site:
```javascript
// See all localStorage items
Object.entries(localStorage).forEach(([k, v]) => console.log(k, v));

// See cookies (non-HttpOnly ones)
document.cookie;

// Check if site uses Service Worker
navigator.serviceWorker.getRegistrations().then(console.log);
```

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **localStorage** | Persistent key-value browser storage, same origin, ~5MB |
| **sessionStorage** | Tab-scoped key-value storage, cleared on tab close |
| **Cookie** | Small data sent with every HTTP request, server-readable |
| **HttpOnly** | Cookie flag that prevents JS access — blocks XSS theft |
| **Secure** | Cookie flag — only sent over HTTPS |
| **SameSite** | Cookie flag — controls cross-site sending (prevents CSRF) |
| **IndexedDB** | Browser's built-in NoSQL database for large structured data |
| **Cache API** | Stores Request/Response pairs for offline/PWA use |
| **Service Worker** | Background JS thread — powers Cache API and offline support |
| **XSS** | Cross-Site Scripting — injected JS attack that can steal storage data |
| **CSRF** | Cross-Site Request Forgery — tricks browser into sending cookies to attacker |
| **PWA** | Progressive Web App — web app with offline + install capabilities |
| **Same Origin** | Same protocol + domain + port (https://app.com:443) |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 4** | Core Web Vitals & Performance | LCP, CLS, FID — every frontend interview |
| **Day 5** | HTTP Caching Deep Dive | Cache-Control, ETags, CDN strategy |
| **Day 6** | Network Patterns | REST vs GraphQL, WebSockets, SSE, polling |
| **Day 7** | Component Architecture | Design systems, atomic design, reusability |

