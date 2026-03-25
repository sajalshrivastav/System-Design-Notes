# 🌐 Frontend System Design — Day 1
## Topic: How the Web Works (URL → Pixels on Screen)

> **Study time:** 1 hour | **Phase:** 1 of 5 | **Difficulty:** Beginner  
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Asked at Google, Meta, Flipkart, Razorpay)

---

## 📌 The Big Picture

Every time you visit a website, **6 things happen in sequence**.  
Understanding each step deeply = understanding frontend performance, security, and architecture.

```
You type URL → DNS Lookup → TCP Handshake → TLS Handshake → HTTP Request → Browser Renders
     [1]           [2]           [3]              [4]              [5]              [6]
```

---

## Step 1 — Browser Checks Caches First

Before anything hits the network, the browser checks **4 caches in order:**

```
┌─────────────────────────────────────────────────────────────┐
│                    CACHE CHECK ORDER                        │
│                                                             │
│  1. Browser Cache  →  "Did I visit this site recently?"    │
│         ↓ (not found)                                       │
│  2. OS Cache       →  "Does my OS remember this domain?"   │
│         ↓ (not found)                                       │
│  3. Router Cache   →  "Does my router know this IP?"       │
│         ↓ (not found)                                       │
│  4. ISP Cache      →  "Does my internet provider know?"    │
│         ↓ (not found)                                       │
│     → Go to DNS Lookup                                      │
└─────────────────────────────────────────────────────────────┘
```

> 💡 **Key insight:** This is why revisiting a website feels instant. The DNS result
> is cached locally and doesn't need a network round trip every time.

---

## Step 2 — DNS Resolution

**DNS = Domain Name System** — the internet's phone book.  
Translates human-readable names (`google.com`) → machine-readable IPs (`142.250.195.78`)

### The DNS Lookup Chain

```
Your Browser
     │
     │  "What's the IP for google.com?"
     ▼
ISP Recursive Resolver  ──────────────────────────────┐
     │                                                 │
     │  asks                                           │ returns
     ▼                                                 │ final IP
Root Name Server                                       │
     │  "I don't know google.com,                      │
     │   but try the .com TLD server"                  │
     ▼                                                 │
.com TLD Server                                        │
     │  "I don't know google.com exactly,              │
     │   but try Google's authoritative server"        │
     ▼                                                 │
Google's Authoritative Server                          │
     │  "google.com = 142.250.195.78"   ───────────────┘
     
Result is CACHED at every step ⚡
```

### Key DNS Terms

| Term | Meaning |
|------|---------|
| **DNS Resolver** | Your ISP's server that does the lookup work |
| **Root Server** | Knows which server handles each TLD (.com, .in, .org) |
| **TLD Server** | Top Level Domain — handles all .com or .in domains |
| **Authoritative Server** | The final authority — owns the actual domain records |
| **TTL** | Time To Live — how long the DNS result is cached |
| **A Record** | Maps domain → IPv4 address |
| **CNAME** | Maps domain → another domain name |

### Performance Impact
- DNS lookup: **20–120ms** on first visit
- After caching: **~0ms** (served from local cache)
- Optimization: `<link rel="dns-prefetch" href="//api.example.com">` 
  → tells browser to resolve DNS for this domain before it's needed

---

## Step 3 — TCP 3-Way Handshake

**TCP = Transmission Control Protocol** — guarantees packets arrive correctly and in order.  
Before any data flows, a connection must be established:

```
Browser                          Server
   │                                │
   │──────── SYN ──────────────────▶│  "Hey, I want to connect"
   │                                │
   │◀─────── SYN-ACK ───────────────│  "Sure! I'm ready"
   │                                │
   │──────── ACK ──────────────────▶│  "Great, let's go!"
   │                                │
   │         [Connection Open]      │
   │                                │
   │◀══════ Data can now flow ══════│
```

> ⏱️ **Cost:** 1 round trip (~50ms on a good connection)  
> 💡 **Optimization:** HTTP Keep-Alive reuses this connection for multiple requests  
> 💡 **Optimization:** HTTP/2 multiplexes many requests over ONE connection

---

## Step 4 — TLS Handshake (HTTPS only)

**TLS = Transport Layer Security** — encrypts all data so nobody can snoop.  
All modern websites use HTTPS which requires this extra step:

```
Browser                              Server
   │                                    │
   │── "Here's what encryption          │
   │    I support (cipher suites)"─────▶│
   │                                    │
   │◀── "Here's my SSL certificate  ────│
   │     + let's use AES-256"           │
   │                                    │
   │  [Browser verifies certificate     │
   │   with Certificate Authority]      │
   │                                    │
   │── "Certificate OK.             ────▶│
   │    Here's our session key"         │
   │                                    │
   │◀── "Encrypted tunnel ready!" ──────│
   │                                    │
   │◀═══════ Encrypted data ═══════════▶│
```

> ⏱️ **Cost:** 1–2 extra round trips (~100ms added latency)  
> 💡 **TLS 1.3** (modern) reduced this to just 1 round trip  
> 💡 **Optimization:** `<link rel="preconnect" href="https://api.example.com">`  
>    → does TCP + TLS handshake early, before data is needed

---

## Step 5 — HTTP Request & Response

Now the browser asks for the actual page content:

### Request
```
GET /index.html HTTP/1.1
Host: google.com
Accept: text/html,application/xhtml+xml
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Cookie: session=abc123
```

### Response
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Encoding: gzip
Cache-Control: max-age=3600
ETag: "abc123"

<!DOCTYPE html>
<html>...
```

### HTTP Status Codes You Must Know

```
┌────────────────────────────────────────────────────────────────┐
│  2xx  SUCCESS                                                  │
│  ├── 200  OK                    → Request succeeded           │
│  ├── 201  Created               → New resource created        │
│  └── 204  No Content            → Success, nothing to return  │
│                                                                │
│  3xx  REDIRECT                                                 │
│  ├── 301  Moved Permanently     → URL changed forever         │
│  ├── 302  Found (Temp Redirect) → URL changed temporarily     │
│  └── 304  Not Modified          → Use your cached version     │
│                                                                │
│  4xx  CLIENT ERROR                                             │
│  ├── 400  Bad Request           → You sent invalid data       │
│  ├── 401  Unauthorized          → Not logged in               │
│  ├── 403  Forbidden             → Logged in but no permission │
│  ├── 404  Not Found             → Resource doesn't exist      │
│  └── 429  Too Many Requests     → Rate limited                │
│                                                                │
│  5xx  SERVER ERROR                                             │
│  ├── 500  Internal Server Error → Server crashed              │
│  ├── 502  Bad Gateway           → Upstream server failed      │
│  └── 503  Service Unavailable   → Server overloaded           │
└────────────────────────────────────────────────────────────────┘
```

### HTTP Versions — Know the Differences

| Version | Key Feature | Problem Solved |
|---------|-------------|----------------|
| **HTTP/1.1** | Keep-Alive connections | Reuses TCP connection |
| **HTTP/2** | Multiplexing | Multiple requests on 1 connection |
| **HTTP/3** | Uses QUIC (UDP) | Faster, no head-of-line blocking |

---

## Step 6 — The Critical Rendering Path

This is where **your job as a frontend engineer begins.**  
The browser turns raw HTML/CSS/JS into pixels on screen in 6 sub-steps:

```
HTML bytes                CSS bytes
    │                         │
    ▼                         ▼
┌─────────┐             ┌──────────┐
│  Parse  │             │  Parse   │
│  HTML   │             │   CSS    │
└────┬────┘             └────┬─────┘
     │                       │
     ▼                       ▼
┌─────────┐             ┌──────────┐
│   DOM   │             │  CSSOM   │
│  Tree   │             │   Tree   │
└────┬────┘             └────┬─────┘
     │                       │
     └──────────┬────────────┘
                │  combine
                ▼
         ┌────────────┐
         │   Render   │
         │    Tree    │  ← only VISIBLE nodes
         └─────┬──────┘
               │
               ▼
         ┌────────────┐
         │   Layout   │  ← calculates size & position
         │  (Reflow)  │    of every element
         └─────┬──────┘
               │
               ▼
         ┌────────────┐
         │   Paint    │  ← fills in pixels
         │  (Repaint) │    (colors, text, images)
         └─────┬──────┘
               │
               ▼
         ┌────────────┐
         │ Composite  │  ← assembles layers
         │            │    GPU handles this ⚡
         └────────────┘
               │
               ▼
         🖥️  Pixels on screen!
```

### What Blocks Rendering? ⚠️

```
┌──────────────────────────────────────────────────────────────┐
│  CSS is RENDER BLOCKING                                      │
│  → Browser won't paint until ALL CSS is downloaded+parsed    │
│  → Put critical CSS inline, load rest async                  │
│                                                              │
│  JavaScript is PARSER BLOCKING                               │
│  → Browser stops parsing HTML when it hits a <script> tag   │
│  → Always add defer or async to script tags                  │
│                                                              │
│  <script src="app.js">        ← ❌ blocks HTML parsing       │
│  <script defer src="app.js">  ← ✅ runs after HTML parsed   │
│  <script async src="app.js">  ← ✅ runs when downloaded     │
└──────────────────────────────────────────────────────────────┘
```

### Layout vs Paint vs Composite — Performance Impact

```
MOST EXPENSIVE → Layout (Reflow)
  Triggered by: changing width, height, top, left, margin, padding
  Cost: browser recalculates ALL element positions
  
MEDIUM COST → Paint (Repaint)  
  Triggered by: changing color, background, border-color, shadow
  Cost: browser repaints affected pixels

CHEAPEST → Composite only
  Triggered by: transform, opacity
  Cost: GPU handles it, no CPU work
  
💡 RULE: Animate with transform & opacity ONLY
   Never animate top/left/width/height — causes layout thrash!
```

---

## 🎯 Interview Questions & Model Answers

### Q1: "What happens when you type a URL and press Enter?"

**Junior answer:** Browser sends a request and gets HTML back.

**Senior answer (use this structure):**
```
1. Check caches (browser → OS → router → ISP)
2. DNS lookup if not cached:
   resolver → root server → TLD server → authoritative server
3. TCP 3-way handshake (SYN → SYN-ACK → ACK)
4. TLS handshake for HTTPS (certificate verification + session key)
5. HTTP GET request → server returns HTML
6. Critical Rendering Path:
   HTML→DOM + CSS→CSSOM → Render Tree → Layout → Paint → Composite
```

**Bonus point to add:**
> "Each step has optimization opportunities — dns-prefetch for DNS,
> preconnect for TCP+TLS, HTTP/2 for multiplexing, and critical CSS
> inlining to unblock the first paint."

---

### Q2: "What is the Critical Rendering Path and how do you optimize it?"

**Answer:**
```
CRP is the sequence of steps the browser takes to convert HTML/CSS/JS
into pixels on screen.

To optimize it:
1. Minimize render-blocking CSS → inline critical CSS, async load rest
2. Defer non-critical JS → use defer/async attributes  
3. Reduce DOM size → fewer nodes = faster layout
4. Avoid forced synchronous layout → don't read then write DOM in loops
5. Use will-change for animated elements → promotes to own GPU layer
```

---

### Q3: "What is the difference between reflow and repaint?"

**Answer:**
```
Reflow (Layout): 
  Recalculates geometry of ALL elements
  Triggered by: size/position changes (width, height, margin)
  Very expensive — avoid in animations

Repaint (Paint):
  Redraws pixels for visual changes
  Triggered by: color, background, visibility changes
  Less expensive than reflow

Composite only:
  GPU handles transform and opacity changes
  Cheapest — use these for smooth 60fps animations
```

---

## ⚡ Quick Reference Cheat Sheet

```
DNS lookup time:     20–120ms first visit, ~0ms cached
TCP handshake:       1 round trip (~50ms)
TLS handshake:       1–2 round trips (~100ms) [TLS 1.3 = 1 RTT]
TTFB target:         < 200ms
First paint target:  < 1 second

Performance hints in HTML:
  <link rel="dns-prefetch" href="//cdn.example.com">
  <link rel="preconnect" href="https://api.example.com">
  <link rel="preload" href="critical.css" as="style">
  <script defer src="app.js">
  <script async src="analytics.js">
```

---

## 🛠️ Hands-On Task (Do This Today — 20 mins)

1. Open **Chrome DevTools** (F12)
2. Go to the **Network** tab
3. Visit `https://google.com` and refresh (Ctrl+R)
4. Click on the first request (the HTML document)
5. Look at the **Timing** tab — you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ Timing breakdown of one HTTP request:                   │
│                                                         │
│  Queueing          → waiting for browser resources     │
│  DNS Lookup        → Step 2 from our notes             │
│  Initial connection → TCP handshake (Step 3)           │
│  SSL               → TLS handshake (Step 4)            │
│  Request sent      → HTTP request going out (Step 5)   │
│  TTFB              → Time waiting for server response  │
│  Content Download  → Actual bytes arriving             │
└─────────────────────────────────────────────────────────┘
```

6. Compare Google vs a slow site — the difference makes everything concrete!

---

## 📚 Key Terms Glossary

| Term | Definition |
|------|-----------|
| **DNS** | Domain Name System — maps domain names to IP addresses |
| **TCP** | Transmission Control Protocol — reliable ordered delivery |
| **TLS/SSL** | Encryption protocol for HTTPS |
| **HTTP** | Hypertext Transfer Protocol — web communication standard |
| **DOM** | Document Object Model — browser's tree representation of HTML |
| **CSSOM** | CSS Object Model — browser's tree representation of CSS |
| **Render Tree** | Combined DOM+CSSOM, only visible elements |
| **Reflow** | Recalculating layout/geometry of elements |
| **Repaint** | Redrawing pixels after visual change |
| **TTFB** | Time to First Byte — server response time metric |
| **CRP** | Critical Rendering Path — steps from bytes to pixels |
| **RTT** | Round Trip Time — time for data to go and come back |
| **CDN** | Content Delivery Network — servers close to users |

---

## 🔗 What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 2** | JavaScript Event Loop | Foundation of all async code |
| **Day 3** | Browser Storage (cookies, localStorage, sessionStorage, IndexedDB) | Auth, caching, offline |
| **Day 4** | Core Web Vitals & Performance Metrics | Measured in every frontend interview |
| **Day 5** | HTTP Caching Deep Dive | Cache-Control, ETags, CDN strategy |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*