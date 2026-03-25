# 🎯 Day 21 — Phase 3 Review: Questions & Model Answers

> **Phase 3 covers:** Days 14–20 — Virtual DOM, List Virtualization, State Management,
> Component Patterns, Micro Frontends, Rendering Patterns, Design Systems

---

## Question 1 — Virtual DOM & Change Detection (Day 14)

**Question:** Your Angular app has a claims list with 500 items. Every time a single claim's status updates via WebSocket, the entire list re-renders and the page feels sluggish. Walk me through how you'd diagnose and fix this.

**Model Answer:**

The root cause is Angular's default change detection. Zone.js fires on every WebSocket message and walks the entire component tree — checking all 500 claim cards even though only one changed.

**Diagnosis steps:**
1. Open Angular DevTools → Component profiler → record while a WebSocket update fires
2. Look for the ClaimCard component rendering 500 times instead of 1
3. Check if the component has `ChangeDetectionStrategy.Default` set (or missing)

**Fix 1 — OnPush change detection (highest impact):**
Add `ChangeDetectionStrategy.OnPush` to the claim card component. Now Angular only checks it when its `@Input()` reference changes, a DOM event fires inside it, or an async pipe emits.

**Fix 2 — Immutable updates:**
The WebSocket handler must create a NEW array reference, not mutate the existing one:
```typescript
// WRONG — same reference, OnPush misses it
this.claims[index].status = 'approved';

// CORRECT — new array reference, OnPush triggers
this.claims = this.claims.map(c =>
  c.id === updatedId ? { ...c, status: 'approved' } : c
);
```

**Fix 3 — trackBy in ngFor:**
```html
<div *ngFor="let claim of claims; trackBy: trackById">
```
Without trackBy, Angular recreates ALL 500 DOM nodes on array change. With trackBy, only the changed item re-renders.

**Fix 4 — Virtual scrolling (if list is very long):**
If 500+ items, add `cdk-virtual-scroll-viewport` so only ~15 DOM nodes exist at any time.

**Result:** From 500 component checks per WebSocket message to 1. Eliminating visible jank.

---

## Question 2 — State Management (Day 16)

**Question:** A junior engineer on your team suggests putting all application state — including form field values, loading spinners, and the claims list fetched from the API — into NgRx. How do you respond?

**Model Answer:**

I'd push back and explain the state locality rule: state should live as close to where it's used as possible. NgRx adds significant boilerplate and only pays off in specific scenarios.

**I'd categorize the state differently:**

Form field values → local component state. Only the form component needs them. Putting them in NgRx means writing an action for every keystroke. Use reactive forms or signal-based local state.

Loading spinners → local component state or part of a service. The spinner is a UI concern owned by the component showing it.

Claims list from the API → this is server state, not client state. Server state has different characteristics: it can go stale, needs deduplication, needs cache invalidation after mutations. The right tool is an HttpClient + signals service or — if we were on React — React Query. These handle loading/error/success states automatically without any actions or reducers.

**When I would reach for NgRx:**
- State shared across 10+ components that changes through complex coordinated actions
- Genuine audit trail requirements (time-travel debugging)
- Multi-step wizards with undo/redo
- Our claims portal at Digit doesn't meet this bar — an injectable service with signals handles everything we need with a fraction of the code.

The anti-pattern I see most: treating NgRx as the "correct" state solution rather than a last resort. Teams spend more time writing actions/reducers than building features.

---

## Question 3 — Component Patterns (Day 17)

**Question:** You're building a reusable Tabs component for a design system. Other teams need to use it with different layouts — sometimes the tab list is on top, sometimes on the side, sometimes with a custom header between the list and panels. How do you design it?

**Model Answer:**

I'd use the compound component pattern. This is exactly the problem it solves — rigid layouts caused by a single monolithic component with too many props.

**The design:**
- `Tabs` root component owns the active tab state and provides it via context
- `Tabs.List`, `Tabs.Tab`, and `Tabs.Panel` are sub-components that consume that context
- The consumer assembles them however they need

```tsx
// Consumer controls the layout completely
<Tabs defaultValue="claims">
  <Tabs.List>
    <Tabs.Tab value="claims">Active Claims</Tabs.Tab>
    <Tabs.Tab value="history">History</Tabs.Tab>
  </Tabs.List>

  <CustomHeader /> {/* consumer can inject anything between list and panels */}

  <Tabs.Panel value="claims"><ClaimsList /></Tabs.Panel>
  <Tabs.Panel value="history"><HistoryList /></Tabs.Panel>
</Tabs>
```

**Why this beats the alternative:**
A single `<Tabs items={...} panels={...} headerSlot={...} layout="side" />` would need a new prop every time a team has an unusual layout. The compound approach gives consumers full flexibility — they can put the list on the side, add content between parts, omit the footer — without the component needing to know about any of it.

**In Angular:** I'd use content projection with named `ng-content` slots — same concept, Angular-native implementation.

**Accessibility is handled in the root:** `role="tablist"`, `aria-selected`, `role="tab"`, `role="tabpanel"` — all wired through context so consumers can't accidentally omit them.

---

## Question 4 — Rendering Patterns (Day 19)

**Question:** Flipkart is building a new product listing page. The product data changes daily (prices, stock), the page gets millions of visits, and SEO is critical. What rendering strategy would you recommend and why?

**Model Answer:**

I'd recommend ISR — Incremental Static Regeneration — with on-demand revalidation.

**Why not SSG alone:**
Prices and stock change daily, so a static build that's a week old would show wrong prices. You'd need to trigger a full rebuild on every data change, which doesn't scale.

**Why not SSR alone:**
SSR renders fresh HTML on every request, which means every one of those millions of visits hits your server. At Flipkart's scale that's expensive infrastructure, higher TTFB (server must query DB before responding), and a SPOF if the server is slow.

**Why ISR:**
Pages are pre-built as static HTML and served from CDN edges globally — so TTFB is ~5ms like SSG. But they automatically regenerate in the background every 60 seconds. Users might see prices up to 60 seconds stale, which is acceptable for a product listing page.

For critical price changes (flash sale starts), I'd add **on-demand revalidation via webhook**: when the inventory service updates a product, it calls `POST /api/revalidate` with the product ID. Next.js immediately regenerates only that product's page. No full rebuild, no stale flash sale prices.

**The configuration:**
```javascript
fetch(`/api/products/${id}`, {
  next: { revalidate: 60, tags: [`product-${id}`] }
})
```

This gives Flipkart: CDN speed globally, correct prices within 60s normally, instant updates for flash sales, and excellent SEO since crawlers receive full HTML on first request.

---

## Question 5 — Design Systems (Day 20)

**Question:** Your team is building a design system that needs to support both light and dark modes AND allow different brands (e.g. Digit's blue vs a white-label partner's green). How do you architect the theming layer?

**Model Answer:**

I'd use CSS custom properties with a 3-layer token architecture.

**Layer 1 — Primitive tokens:** Every color the system can produce, named by value:
```css
--blue-500: #0B7BFF;
--green-500: #16A34A;
--gray-900: #111827;
```

**Layer 2 — Semantic tokens:** Map primitives to meaning. This is the indirection layer that makes everything work:
```css
:root {
  --color-brand:      var(--blue-500);
  --color-bg-primary: #ffffff;
  --color-text-primary: var(--gray-900);
}
```

**Dark mode:** Redefine only the semantic layer:
```css
[data-theme="dark"] {
  --color-bg-primary:   #111827;
  --color-text-primary: #f9fafb;
  /* --color-brand stays the same */
}
```

**Multi-brand:** Swap the brand token:
```css
[data-brand="digit"]   { --color-brand: #0B7BFF; }
[data-brand="partner"] { --color-brand: #16A34A; }
```

**The key insight:** Components only ever reference semantic tokens — never primitives. A button uses `var(--color-brand)`, not `var(--blue-500)`. So switching theme or brand is a single HTML attribute change. Zero component code changes.

**Layer 3 — Component tokens (optional):** Component-specific overrides when a component needs to deviate from the semantic default:
```css
--button-bg: var(--color-brand);
--button-radius: var(--radius-md);
```

**Theme switching in code:**
```typescript
// On load: localStorage preference or OS setting
const saved = localStorage.getItem('theme');
const os = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', saved ?? os);
document.documentElement.setAttribute('data-brand', 'digit');
```

This scales to any number of themes and brands without touching a single component.

---

## Scoring Guide

When you practice these answers, rate yourself on:

| Level | What it looks like |
|-------|-------------------|
| **Junior** | Describes the solution but not the root cause or tradeoffs |
| **Mid** | Correct solution, names the right APIs, misses nuance or quantification |
| **Senior** | Root cause → diagnosis tool → specific fix → why this fix → what it improves |

**Senior signal phrases to include:**
- "The root cause is..." (shows you understand mechanisms, not just fixes)
- "I'd diagnose with..." (shows structured debugging approach)
- "The tradeoff is..." (shows architectural thinking)
- "This means teams can't accidentally..." (shows thinking about DX and scale)

---

*Frontend System Design Series — Phase 3 Review | Sajal Shrivastav | 2026*