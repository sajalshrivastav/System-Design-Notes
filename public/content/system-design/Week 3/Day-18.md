# 🏗️ Frontend System Design — Day 18
## Topic: Micro Frontends

> **Study time:** 1 hour | **Phase:** 3 of 5 | **Difficulty:** Advanced
> **Interview frequency:** ⭐⭐⭐⭐ (Flipkart, CRED, Razorpay, any company with 50+ frontend engineers)

---

## The Big Picture

Micro frontends solve a **people and process problem**, not primarily a technical one.

```
THE MONOLITH PROBLEM AT SCALE:
  200 engineers, one Angular codebase
  → Every team's deploys are coupled
  → Merge conflicts daily
  → CI/CD takes 40 minutes
  → One team's test failure blocks everyone's release
  → The "shared component" becomes owned by nobody

WHAT MFEs GIVE YOU:
  → Independent deployability — Team Checkout ships at their own cadence
  → Team autonomy — each team owns their stack + CI/CD
  → Isolated failures — one widget crashes, rest of page works
  → Incremental migration — React and Angular can coexist on one page
```

Always frame MFEs as an organisational scaling solution first, a technical pattern second.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  SHELL APP (host)                                               │
│  Handles: routing, auth, shared layout                          │
│  Does NOT know about internals of any remote                    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Search MFE   │  │ Checkout MFE │  │ Recommendations MFE  │ │
│  │ Team Search  │  │ Team Payment │  │ Team Discovery       │ │
│  │ React 18     │  │ Angular 17   │  │ React 18             │ │
│  │ Own CI/CD    │  │ Own CI/CD    │  │ Own CI/CD            │ │
│  │ search.com/  │  │ checkout.com/│  │ recs.com/            │ │
│  │ remoteEntry  │  │ remoteEntry  │  │ remoteEntry          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
│  SHARED: React, design-system, auth-utils (loaded once)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Webpack Module Federation

The primary technical implementation. Built into Webpack 5 and Rspack.

### What It Does

```
BUILD TIME:
  Remote app marks certain modules as "exposed"
  Webpack packages them with a manifest file (remoteEntry.js)
  Remote deploys to its own URL

RUNTIME:
  Shell fetches remoteEntry.js from each remote's URL
  Downloads only the specific module bundle needed
  Shared dependencies (React) loaded once, reused by all
  Remote component mounted as if it were a local import
```

### Remote App Configuration

```javascript
// checkout-app/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'checkout',
      filename: 'remoteEntry.js', // manifest the host will fetch

      // What this app exposes to other apps
      exposes: {
        './CheckoutPage':  './src/pages/CheckoutPage',
        './CartWidget':    './src/components/CartWidget',
        './useCartCount':  './src/hooks/useCartCount',
      },

      // Shared dependencies — loaded once across all MFEs
      shared: {
        react: {
          singleton: true,          // only one instance allowed
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        '@company/design-system': {
          singleton: true,
          requiredVersion: '^2.0.0',
        },
      },
    }),
  ],
};
```

### Shell (Host) App Configuration

```javascript
// shell-app/webpack.config.js
new ModuleFederationPlugin({
  name: 'shell',

  // Register remotes with their URLs
  remotes: {
    checkout:    'checkout@https://checkout.company.com/remoteEntry.js',
    search:      'search@https://search.company.com/remoteEntry.js',
    recs:        'recs@https://recs.company.com/remoteEntry.js',
  },

  shared: {
    react:      { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom':{ singleton: true, requiredVersion: '^18.0.0' },
  },
})
```

### Consuming a Remote Component

```javascript
// Shell app — React
import React, { lazy, Suspense } from 'react';

// Dynamic import with remote name/exposed path
const CheckoutPage = lazy(
  () => import('checkout/CheckoutPage')
  //           ↑ remote name  ↑ exposed path (matches exposes config)
);

const CartWidget = lazy(
  () => import('checkout/CartWidget')
);

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/" element={
          <Layout>
            <CartWidget /> {/* mounted from checkout MFE */}
            <MainContent />
          </Layout>
        } />
      </Routes>
    </Suspense>
  );
}
```

### Angular Native Federation

```typescript
// Angular 17+ — @angular-architects/native-federation
// webpack.config.js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'checkout',
  exposes: {
    './CheckoutModule': './src/app/checkout/checkout.module.ts',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true }),
  },
});

// Shell app routes — lazy-load from remote
export const routes: Routes = [
  {
    path: 'checkout',
    loadRemoteModule({
      type: 'module',
      remoteEntry: 'https://checkout.company.com/remoteEntry.json',
      exposedModule: './CheckoutModule'
    }).then(m => m.CheckoutModule)
  }
];
```

---

## Cross-MFE Communication

MFEs are isolated — they can't import directly from each other. Communication happens through shared channels.

### Method 1 — Custom Events (Loose Coupling)

```javascript
// Any MFE: emit event
window.dispatchEvent(new CustomEvent('mfe:cart-updated', {
  detail: { cartCount: 3, lastAdded: 'product-123' },
  bubbles: true,
}));

// Shell or any other MFE: listen
window.addEventListener('mfe:cart-updated', (event) => {
  const { cartCount } = event.detail;
  updateCartBadge(cartCount);
});

// Best for: notifications, fire-and-forget events
// Problems: no type safety, no request-response, no history
```

### Method 2 — Shared State Package

```javascript
// @company/shared-state — published to internal npm registry
// Loaded once via Module Federation shared config

class SharedStore {
  #state = { user: null, cart: null, theme: 'light' };
  #listeners = new Map();

  get(key) {
    return this.#state[key];
  }

  set(key, value) {
    this.#state[key] = value;
    this.#listeners.get(key)?.forEach(fn => fn(value));
  }

  subscribe(key, fn) {
    if (!this.#listeners.has(key)) {
      this.#listeners.set(key, new Set());
    }
    this.#listeners.get(key).add(fn);
    return () => this.#listeners.get(key).delete(fn); // unsub
  }
}

export const store = new SharedStore();

// Shell: set user after login
import { store } from '@company/shared-state';
store.set('user', { id: '123', name: 'Sajal', role: 'agent' });

// Checkout MFE: read user
const user = store.get('user');
store.subscribe('user', (newUser) => setCurrentUser(newUser));
```

### Method 3 — URL / Query Parameters

```javascript
// Best for shareable state: filters, pagination, selected item
// All MFEs read from the same URL

// Navigation MFE sets state in URL
router.push('/claims?status=approved&page=2&agent=123');

// Claims MFE reads URL
const params = new URLSearchParams(window.location.search);
const status = params.get('status'); // 'approved'
const page   = parseInt(params.get('page') ?? '1');

// Survives page refresh, bookmarkable, no coupling needed
```

### Method 4 — Props from Shell

```jsx
// Shell orchestrates — passes data down to remotes
function App() {
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <CheckoutWidget
      userId={user.id}
      theme={theme}
      onOrderComplete={(orderId) => {
        // Callback flows back up to shell
        router.push(`/confirmation/${orderId}`);
      }}
    />
  );
}
// Best when: shell owns the data, remote just renders it
// Problems: deep prop passing, tight coupling shell↔remote
```

---

## Tradeoffs — The Complete Picture

### Benefits

```
TEAM AUTONOMY:
  → Each team owns their repo, CI/CD pipeline, deployment cadence
  → No waiting for other teams to merge/approve/release
  → Teams can choose their own tech stack (within reason)

INDEPENDENT DEPLOYABILITY:
  → Fix a Checkout bug at 11pm without touching Search
  → Canary deploy a new Recommendations widget to 5% of users
  → Roll back one MFE without rolling back everything

ISOLATED FAILURES:
  → Checkout crashes → users can still search and browse
  → Error boundaries around each MFE contain the blast radius

INCREMENTAL MIGRATION:
  → Old Angular pages and new React pages on the same domain
  → Migrate team by team, feature by feature
  → No big-bang rewrite needed
```

### Costs

```
OPERATIONAL COMPLEXITY:
  → 10 teams → 10 repos → 10 CI/CD pipelines → 10 CDN deployments
  → Local development: run shell + all remotes simultaneously
  → Integration testing is much harder — need all MFEs running together

PERFORMANCE OVERHEAD:
  → Extra network requests for each remoteEntry.js manifest
  → Cold start: first route visit fetches that MFE's bundle
  → Multiple React versions = multiple React instances = subtle bugs
    ("Invalid hook call" error if singleton: true not set correctly)

INCONSISTENT UX:
  → Teams can drift from the design system
  → Different loading states, error patterns, accessibility
  → Needs strong design system governance to prevent this

CONTRACTS AND VERSIONS:
  → Runtime type errors — no compile-time safety across MFE boundaries
  → Remote changes exposed API → shell breaks silently at runtime
  → Needs contract testing + integration test environment
```

---

## Performance Mitigation Strategies

```javascript
// 1. Prefetch remote manifests for likely-next routes
<link rel="prefetch" href="https://checkout.company.com/remoteEntry.js">

// 2. Prefetch dynamically on hover
link.addEventListener('mouseenter', () => {
  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.href = 'https://checkout.company.com/remoteEntry.js';
  document.head.appendChild(prefetch);
});

// 3. Build-time integration (slower CI but faster runtime)
// Pre-build all MFEs into one deployment — loses independent deploys
// but avoids runtime federation overhead. Used for critical pages.

// 4. Edge caching remoteEntry.js
// remoteEntry.js is small (~2KB) — aggressive CDN caching
// Use versioned filenames: remoteEntry.v42.js for cache busting

// 5. Skeleton screens for loading states
// Each MFE provides its own loading skeleton
// Shell shows skeleton while remote JS loads
```

---

## When to Use Micro Frontends

### Use When

```
✅ 50+ frontend engineers across multiple teams
✅ Teams genuinely blocked by other teams' releases
✅ Need to deploy different features at different cadences
✅ Incremental migration from one framework to another
✅ Truly independent business domains (Search, Checkout, Recommendations)
✅ Teams need to make different technology choices
```

### Don't Use When

```
❌ < 20 engineers — operational overhead not worth it
❌ New product / greenfield — premature optimisation
❌ One or two teams — coordination problem doesn't exist yet
❌ All features tightly coupled — MFE boundaries will be wrong
❌ No design system — visual inconsistency guaranteed

CONSIDER FIRST:
  Monorepo (Nx/Turborepo): separate packages, shared build, simpler deployment
  Lazy-loaded routes: code splitting solves bundle size without MFE overhead
  Feature flags: independent rollout without independent deployment
  Better CI/CD: faster pipelines reduce the blocking problem
```

---

## Interview Questions & Model Answers

### Q1: "What is a micro frontend and why would you use one?"

```
A micro frontend is an independently deployable piece of frontend
functionality, owned by one team, that gets composed with other
MFEs at runtime to form a complete application.

The primary reason to use them is organisational scale:
when multiple teams share a single frontend codebase, their
deployments are coupled — one team's broken tests or slow CI
blocks everyone's release pipeline.

With MFEs:
  → Each team has their own repo, CI/CD, and deploy cadence
  → A bug in Checkout doesn't block the Search team
  → Teams can choose technology appropriate to their domain
  → Old and new frameworks can coexist during migration

I'd always ask first: could a monorepo, better CI/CD, or
clear code ownership boundaries solve this? MFEs add significant
operational complexity — they're only worth it when teams
genuinely need independent deployability at scale.
```

### Q2: "How does Webpack Module Federation work?"

```
Module Federation is a Webpack 5 feature that enables:
  1. One app to expose its modules at a public URL
  2. Another app to dynamically import those modules at runtime

At build time:
  The remote app (e.g. Checkout) runs ModuleFederationPlugin
  with an "exposes" config. Webpack packages those modules
  and creates a remoteEntry.js manifest file.

At runtime:
  The shell app fetches remoteEntry.js from the remote's URL
  When the user navigates to /checkout, the shell does:
  import('checkout/CheckoutPage')
  Browser downloads only the Checkout bundle
  Component mounts as if it were a local import

The key feature is shared dependencies:
  React, design-system, auth libraries loaded ONCE
  All MFEs reuse the same instances
  Prevents multiple React versions causing hook errors
  Negotiates which version satisfies all requirements

Vite equivalent: @originjs/vite-plugin-federation
Angular equivalent: @angular-architects/native-federation
```

### Q3: "How do micro frontends communicate with each other?"

```
MFEs are intentionally isolated — they can't import from each
other directly (that would create coupling). Communication
happens through shared channels:

1. Custom DOM events (loose coupling):
   window.dispatchEvent(new CustomEvent('cart:updated', { detail: {...} }))
   Good for: notifications, fire-and-forget events

2. Shared state package:
   A small npm package published to your internal registry,
   loaded once via Module Federation's shared config.
   Provides get/set/subscribe API for cross-MFE state.
   Good for: auth state, cart count, theme

3. URL / query params:
   All MFEs share the same URL. State in query params is
   automatically available to every MFE.
   Good for: filters, pagination, selected items. Bookmarkable.

4. Props from shell:
   Shell passes data down to MFEs as props.
   Good for: when shell owns the data, remote just renders.

The key rule: never import directly from another remote.
All cross-MFE communication should go through the shell
or a shared package.
```

---

## Cheat Sheet

```
WHAT MFES SOLVE:
  People/process: independent deployability, team autonomy
  Technical: incremental framework migration

MODULE FEDERATION KEY CONCEPTS:
  Shell (host)  → registers remotes, loads them dynamically
  Remote        → exposes modules via remoteEntry.js
  Shared        → React, design-system loaded once, reused

COMMUNICATION METHODS:
  Custom events    → loose, fire-and-forget
  Shared package   → cross-MFE reactive state
  URL params       → shareable, bookmarkable
  Shell props      → shell-owns-data pattern

COSTS:
  Extra network requests (remoteEntry.js per remote)
  Runtime type errors (no compile-time safety at MFE boundary)
  Operational overhead (N repos, N CI pipelines, N deployments)
  Inconsistent UX without strong design system governance

USE WHEN:
  50+ engineers, multiple teams, deploy blocking is real pain
  Incremental migration needed
  Genuinely independent business domains

DON'T USE WHEN:
  < 20 engineers, new product, one or two teams
  Consider: monorepo, lazy routes, feature flags first

ANGULAR NATIVE FEDERATION:
  @angular-architects/native-federation
  Works with Angular 17+ standalone components
  Compatible with Vite-based Angular builds
```

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Micro frontend** | Independently deployable piece of frontend, owned by one team |
| **Shell app** | The host application that loads and composes MFEs |
| **Remote** | An MFE that exposes modules to be consumed by the shell |
| **Module Federation** | Webpack 5 plugin enabling runtime module sharing |
| **remoteEntry.js** | Manifest file that the host fetches to discover a remote's modules |
| **Singleton** | Shared dependency setting — only one instance loaded across all MFEs |
| **exposes** | Config that lists which modules a remote makes available |
| **remotes** | Config that registers which remote apps the shell can load |
| **Independent deployability** | Each team deploys without coordinating with others |
| **Monorepo** | Single repository with multiple packages — simpler alternative |
| **Contract testing** | Tests that verify the interface between host and remote |
| **Native Federation** | Angular-specific Module Federation implementation |
| **Custom event** | `window.dispatchEvent` — cross-MFE communication mechanism |
| **Shared state package** | npm package providing reactive state across MFE boundaries |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 19** | Rendering Patterns | SSR, SSG, CSR, ISR — when Next.js/SSR is the answer |
| **Day 20** | Design Systems | Component tokens, theming, a11y at scale |
| **Day 21** | Phase 3 Review | Architecture-level mock questions |

---

*Frontend System Design Series | Sajal Shrivastav | 2026*