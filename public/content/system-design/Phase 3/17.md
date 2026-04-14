# Frontend System Design — Day 17
## Topic: Component Design Patterns

> **Study time:** 1 hour | **Phase:** 3 of 5 | **Difficulty:** Intermediate → Advanced
> **Interview frequency:** ⭐⭐⭐⭐⭐ (CRED, Razorpay, Flipkart — "design a reusable X component")

---

## The Big Picture

Every component design decision is a tradeoff between flexibility and
complexity. These four patterns are tools for inverting control —
letting consumers of your component decide *what* while your component
handles *how*.

```yaml
# PATTERN                      SOLVES                                  REPLACED BY (modern React)
# ───────────────────────────────────────────────────────────────────────────────────────────────
Compound components:           Prop explosion, inflexible layout       # Still best for this
Render props:                  Logic + rendering separation            # Custom hooks (mostly)
Custom hooks:                  Logic reuse across components           # Nothing — this IS modern
Higher-Order Components:       Cross-cutting behaviour                 # Custom hooks (mostly)
```

---

## Pattern 1 — Compound Components

### The Problem It Solves

```
Without compound components — prop explosion:
  <Select
    items={items}
    renderItem={renderItem}
    renderGroup={renderGroup}
    headerContent={...}
    footerContent={...}
    onSearch={onSearch}
    showSearch={true}
    searchPlaceholder="Search claims..."
    emptyState={<EmptyView />}
    loading={isLoading}
  />
  // 15+ props, rigid layout, impossible to customise

With compound components — flexible composition:
  <Select value={v} onChange={setV}>
    <Select.Search placeholder="Search claims..." />
    <Select.List>
      {items.map(i => <Select.Option key={i.id} value={i}>{i.label}</Select.Option>)}
    </Select.List>
    <Select.Footer>
      <button>Add new claim type</button>
    </Select.Footer>
  </Select>
  // Consumer controls layout completely
  // Add/remove parts freely
  // Each part is independently reusable
```

### How It Works

```
Parent component:
  → Holds shared state (which tab is active, which option is selected)
  → Provides state via Context

Child components:
  → Consume context to access/update shared state
  → Have no concept of each other — only talk to context

Consumer:
  → Assembles the parts however they want
  → Can add custom elements between compound components
  → Controls the layout completely
```

### React Implementation — Tabs

```javascript
import { createContext, useContext, useState } from 'react';

// 1. Context for shared state
const TabsContext = createContext(null);
function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab components must be inside <Tabs>');
  return ctx;
}

// 2. Root component — owns state, provides context
function Tabs({ children, defaultValue, onChange }) {
  const [active, setActive] = useState(defaultValue);

  const handleChange = (value) => {
    setActive(value);
    onChange?.(value);
  };

  return (
    <TabsContext.Provider value={{ active, setActive: handleChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// 3. Child components — consume context
function TabList({ children, className }) {
  return (
    <div role="tablist" className={className}>
      {children}
    </div>
  );
}

function Tab({ value, children, disabled }) {
  const { active, setActive } = useTabs();
  const isActive = active === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !disabled && setActive(value)}
      className={`tab ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }) {
  const { active } = useTabs();
  if (active !== value) return null;
  return (
    <div role="tabpanel" tabIndex={0}>
      {children}
    </div>
  );
}

// 4. Attach as static properties for clean dot notation API
Tabs.List  = TabList;
Tabs.Tab   = Tab;
Tabs.Panel = TabPanel;

// 5. Usage — caller controls structure completely
<Tabs defaultValue="claims" onChange={handleTabChange}>
  <Tabs.List>
    <Tabs.Tab value="claims">Active Claims</Tabs.Tab>
    <Tabs.Tab value="history">History</Tabs.Tab>
    <Tabs.Tab value="reports" disabled>Reports</Tabs.Tab>
  </Tabs.List>

  <div className="tab-content">
    <Tabs.Panel value="claims">
      <ClaimsList status="active" />
    </Tabs.Panel>
    <Tabs.Panel value="history">
      <ClaimsHistory />
    </Tabs.Panel>
  </div>
</Tabs>
```

### Real-World Compound Component Examples

```
Radix UI Select:      <Select.Root> + <Select.Trigger> + <Select.Content>
Headless UI Tabs:     <Tab.Group> + <Tab.List> + <Tab> + <Tab.Panels>
React Hook Form:      <FormProvider> + <Controller>
TanStack Table:       <Table> + <TableHeader> + <TableRow> + <TableCell>
```

---

## Pattern 2 — Render Props

### Core Idea

```
A component receives a function as a prop and calls it with
its internal state. The consumer decides what to render with
that data.

Logic lives IN the component.
Rendering lives in the CONSUMER.
```

### Classic Render Prop

```javascript
// Component exposes its state through a render function
function DataFetcher({ url, render }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [url]);

  // Calls the render function with its state
  return render({ data, loading, error });
}

// Consumer decides what to render
<DataFetcher
  url="/api/claims"
  render={({ data: claims, loading, error }) => {
    if (loading) return <Skeleton rows={5} />;
    if (error)   return <Alert type="error" message={error} />;
    return <ClaimsList claims={claims} />;
  }}
/>
```

### Children as Render Function (More Common)

```javascript
// More ergonomic — use children instead of render prop
function Toggle({ children, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  const toggle = () => setOn(o => !o);
  const reset  = () => setOn(defaultOn);

  return children({ on, toggle, reset });
}

<Toggle>
  {({ on, toggle }) => (
    <div>
      <button onClick={toggle}>
        {on ? 'Collapse details' : 'Show details'}
      </button>
      {on && <ClaimDetails />}
    </div>
  )}
</Toggle>
```

### Why Custom Hooks Replaced Render Props

```javascript
// Render prop — extra component in the tree
<Toggle>
  {({ on, toggle }) => <SomeUI on={on} toggle={toggle} />}
</Toggle>

// Custom hook — same logic, no extra nesting
function SomeUI() {
  const { on, toggle } = useToggle();
  return <button onClick={toggle}>{on ? 'on' : 'off'}</button>;
}

// Custom hook wins because:
//   → No extra React tree nesting (better DevTools)
//   → No callback function allocation per render
//   → Composable with other hooks
//   → Cleaner TypeScript types
//   → Easier to test independently
```

---

## Pattern 3 — Custom Hooks (The Modern Standard)

### The Principle

```
Separate WHAT the component renders from HOW it works.

Before:  ClaimsList manages fetching + state + rendering
After:   useClaims manages fetching + state
         ClaimsList only handles rendering

Benefits:
  → useClaims can be tested without rendering anything
  → useClaims can be reused in ClaimsModal, ClaimsWidget etc.
  → ClaimsList is a pure function of its data — easy to test
  → Logic changes don't risk breaking rendering and vice versa
```

### Complete Custom Hook Pattern

```javascript
// useClaims — everything except rendering
function useClaims({ initialPage = 1, status = 'all' } = {}) {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(initialPage);
  const [total, setTotal]     = useState(0);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await claimsApi.getAll({ page, status });
      setClaims(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const refresh  = fetchClaims;

  return {
    claims, loading, error,
    page, total,
    nextPage, prevPage, refresh,
    hasNextPage: page * 10 < total,
  };
}

// ClaimsList — purely rendering
function ClaimsList({ status }) {
  const { claims, loading, error, nextPage, hasNextPage } = useClaims({ status });

  if (loading && !claims.length) return <SkeletonList />;
  if (error) return <ErrorBanner message={error} retry={() => refresh()} />;

  return (
    <>
      <List items={claims} renderItem={claim => <ClaimCard claim={claim} />} />
      {hasNextPage && <button onClick={nextPage}>Load more</button>}
    </>
  );
}
```

### Practical Custom Hooks Library

```javascript
// useDebounce — debounce any rapidly changing value
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// useMediaQuery — respond to viewport changes
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// useClickOutside — close dropdown/modal when clicking outside
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// useKeyPress — react to keyboard shortcuts
function useKeyPress(targetKey, handler) {
  useEffect(() => {
    const downHandler = (e) => {
      if (e.key === targetKey) handler(e);
    };
    window.addEventListener('keydown', downHandler);
    return () => window.removeEventListener('keydown', downHandler);
  }, [targetKey, handler]);
}
```

---

## Pattern 4 — Higher-Order Components

### What They Are

```
A function that takes a component and returns a new enhanced component.
Pattern from the class component era.

function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user } = useAuth();
    if (!user) return <Redirect to="/login" />;
    return <WrappedComponent {...props} currentUser={user} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);
```

### Problems with HOCs

```
1. Prop collision — both HOC and component define same prop name
2. Ref forwarding — HOC breaks React.forwardRef unless explicitly handled
3. Component wrapper hell — DevTools shows deep nesting
4. Static methods not copied — WrappedComponent.getInitialProps not on HOC
5. TypeScript complexity — harder to type than custom hooks
```

### When HOCs Are Still Valid

```
1. React.memo(Component) — technically an HOC, still commonly used
2. Legacy class component codebases — HOCs are the only reuse pattern
3. Library HOCs you consume (don't write new ones):
   → React-Redux: connect(mapState, mapDispatch)(Component)
   → React Router: withRouter(Component)
4. Error boundaries wrapping:
   function withErrorBoundary(Component, fallback) {
     return class extends React.Component {
       // Can only be done with class components
     };
   }
```

---

## Angular Equivalents

### Content Projection — Angular's Compound Components

```typescript
// ng-content creates named slots (like React's compound children)
@Component({
  selector: 'app-modal',
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal" role="dialog">
        <header class="modal-header">
          <ng-content select="[modal-header]"></ng-content>
          <button (click)="close.emit()">×</button>
        </header>
        <main class="modal-body">
          <ng-content select="[modal-body]"></ng-content>
        </main>
        <footer class="modal-footer">
          <ng-content select="[modal-footer]"></ng-content>
        </footer>
      </div>
    </div>
  `
})
export class ModalComponent {
  @Output() close = new EventEmitter<void>();
}

// Usage — caller controls each slot
<app-modal (close)="closeModal()">
  <h2 modal-header>Claim Details</h2>
  <app-claim-form modal-body [claim]="selectedClaim" />
  <div modal-footer>
    <button (click)="save()">Save</button>
    <button (click)="closeModal()">Cancel</button>
  </div>
</app-modal>
```

### Injectable Services — Angular's Custom Hooks

```typescript
// Same logic extraction principle as custom hooks
@Injectable({ providedIn: 'root' })
export class ClaimsFeatureService {
  private http = inject(HttpClient);

  // State signals
  claims = signal<Claim[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(1);

  // Derived state (equivalent to useMemo)
  approvedClaims = computed(() =>
    this.claims().filter(c => c.status === 'approved')
  );

  totalPages = computed(() =>
    Math.ceil(this.claims().length / 10)
  );

  load() {
    this.loading.set(true);
    this.http.get<Claim[]>('/api/claims', {
      params: { page: this.page() }
    }).pipe(takeUntilDestroyed()).subscribe({
      next:  claims => { this.claims.set(claims); this.loading.set(false); },
      error: err    => { this.error.set(err.message); this.loading.set(false); }
    });
  }
}

// Component — purely rendering, inject service
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.loading()) { <app-skeleton /> }
    @else {
      @for (claim of svc.claims(); track claim.id) {
        <app-claim-card [claim]="claim" />
      }
    }
  `
})
export class ClaimsListComponent {
  svc = inject(ClaimsFeatureService);
  ngOnInit() { this.svc.load(); }
}
```

### Attribute Directives — Angular's Behaviour HOCs

```typescript
// Add behaviour to any element without wrapping
@Directive({ selector: '[appAutoFocus]' })
export class AutoFocusDirective implements AfterViewInit {
  private el = inject(ElementRef);
  ngAfterViewInit() {
    this.el.nativeElement.focus();
  }
}

@Directive({ selector: '[appPermission]' })
export class PermissionDirective implements OnInit {
  @Input('appPermission') requiredRole!: string;
  private auth = inject(AuthService);
  private el   = inject(ElementRef);
  private renderer = inject(Renderer2);

  ngOnInit() {
    if (!this.auth.hasRole(this.requiredRole)) {
      this.renderer.setStyle(this.el.nativeElement, 'display', 'none');
    }
  }
}

// Usage
<button appAutoFocus>This gets focus on mount</button>
<button appPermission="admin">Admin-only button</button>
```

---

## Comparing the Patterns

| Pattern | Solves | Modern equivalent | When to use |
|---------|--------|-------------------|-------------|
| Compound components | Prop explosion, layout control | Still best for this | Dropdown, Tabs, Modal, Accordion |
| Render props | Logic/render separation | Custom hooks | Legacy codebases, library APIs |
| Custom hooks | Logic reuse | — this is the standard | Any shared stateful logic |
| HOC | Cross-cutting concerns | Custom hooks + memo | Legacy, error boundaries, React.memo |

---

## Interview Questions & Model Answers

### Q1: "Design a reusable Modal component for a design system"

```
I'd use the compound component pattern:

<Modal open={isOpen} onClose={handleClose}>
  <Modal.Overlay />
  <Modal.Panel>
    <Modal.Header>
      <Modal.Title>Confirm Action</Modal.Title>
      <Modal.CloseButton />
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to approve this claim?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="ghost" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
    </Modal.Footer>
  </Modal.Panel>
</Modal>

Why compound:
  → Consumer controls layout (Header/Body/Footer order)
  → Can omit parts they don't need (no footer on some modals)
  → Can add custom elements between parts
  → State (open/close) managed once in Modal root

Implementation:
  → Modal root: owns open state, provides via context
  → Modal.Overlay: reads open state to show/hide
  → Modal.Panel: focus trap, keyboard handling (Escape to close)
  → Modal.Header/Body/Footer: layout slots
  → Accessibility: role="dialog", aria-modal, focus management
```

### Q2: "What is the difference between a HOC and a custom hook?"

```
Both share logic across components, but differently:

HOC: function(Component) → EnhancedComponent
  → Returns a new component that wraps the original
  → Adds behaviour by wrapping the component tree
  → Used in class component era
  → Problems: prop collision, wrapper hell, TypeScript complexity
  → Modern use: React.memo, error boundaries

Custom hook: useXxx() → state/logic
  → Extracts logic into a reusable function
  → No component wrapping — called inside the component
  → Composes with other hooks naturally
  → Full TypeScript support
  → Testable independently (React Testing Library renderHook)

Example:
  HOC:  const Protected = withAuth(Dashboard)
  Hook: function Dashboard() { const { user } = useAuth(); ... }

For new code: always prefer custom hooks.
For legacy class component code: HOCs are still necessary.
```

### Q3: "How do compound components share state between sub-components?"

```
Through React Context. The root component:
  1. Creates a context
  2. Holds the shared state
  3. Provides it via context to all children

Child components consume the context to read/update state.
They have no direct knowledge of each other — only the context.

Example: Tabs component
  → <Tabs> holds activeTab state, provides via TabsContext
  → <Tab> reads context to know if it's active, writes to change active tab
  → <TabPanel> reads context to know if it should render

The consumer assembles these in JSX however they like.
The context wiring is invisible to them.

Key implementation detail: always throw in the custom hook
if context is null — ensures children are properly nested:
  function useTabs() {
    const ctx = useContext(TabsContext);
    if (!ctx) throw new Error('Must be used inside <Tabs>');
    return ctx;
  }
```

---

## Cheat Sheet

```
COMPOUND COMPONENTS:
  When: related sub-components share state + consumer controls layout
  How:  Root owns state → provides via Context → children consume
  Examples: Tabs, Select, Modal, Accordion, Menu
  API pattern: Component.SubComponent (dot notation)

RENDER PROPS:
  When: component has logic + consumer decides rendering
  How:  render={({ data }) => <YourUI data={data} />}
  Or:   children={({ on }) => <YourUI on={on} />}
  Modern: use custom hooks instead for new code

CUSTOM HOOKS:
  When: stateful logic reused across multiple components
  Rules: starts with "use", can call other hooks, pure JS
  How:  extract useState + useEffect + derived state into useXxx()
  Test: renderHook() from @testing-library/react

HOC:
  When: wrapping a component to add cross-cutting behaviour
  How:  function withX(Component) { return (props) => <Component {...props} />; }
  Modern: use custom hooks instead — only HOCs for React.memo, error boundaries

ANGULAR MAPPING:
  Compound → Content projection (ng-content with named slots)
  Custom hook → Injectable service with signals
  HOC → Attribute directive
  Render prop → Has no direct Angular equivalent (use services)
```

---

## Hands-On Task (20 mins)

1. Find a component in your Angular app that has 5+ `@Input()` bindings
2. Could it be restructured with content projection (ng-content) instead?
3. Find two components that duplicate the same `subscribe/loading/error` pattern
4. Extract that into an injectable service with signals
5. In React: find a component that's both fetching data AND rendering — extract the fetch into a custom hook

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Compound component** | Pattern where parent manages state shared by child sub-components |
| **Render prop** | Function prop that a component calls to determine what to render |
| **Custom hook** | Reusable function starting with "use" that encapsulates logic |
| **HOC** | Higher-Order Component — function that takes and returns a component |
| **Inversion of control** | Component gives consumer control over certain decisions |
| **Content projection** | Angular pattern using ng-content for slot-based composition |
| **Dot notation API** | Pattern of attaching sub-components: `Tabs.List`, `Tabs.Tab` |
| **Logic reuse** | Extracting stateful behaviour to share across components |
| **Prop explosion** | Anti-pattern where a component has too many configuration props |
| **Wrapper hell** | HOC anti-pattern where DevTools shows deeply nested component wrappers |
| **Attribute directive** | Angular directive that adds behaviour to existing elements |
| **Structural directive** | Angular directive that changes DOM structure (*ngFor, *ngIf, @defer) |
| **ng-content** | Angular slot mechanism for content projection |
| **renderHook** | React Testing Library utility for testing custom hooks |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 18** | Micro Frontends | Module Federation, independent deployments |
| **Day 19** | Rendering Patterns | SSR, SSG, CSR, ISR — when to use each |
| **Day 20** | Design Systems | Component tokens, theming, a11y at scale |

