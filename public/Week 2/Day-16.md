# Frontend System Design — Day 16
## Topic: State Management Patterns

> **Study time:** 1 hour | **Phase:** 3 of 5 | **Difficulty:** Intermediate → Advanced
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Every senior interview — architecture decisions matter)

---

## The Big Picture

State management is the most over-engineered area in frontend development.
The right answer is almost always "the simplest thing that works" —
but you need to know the full spectrum to make that call confidently.

```
THE SPECTRUM:

  Local state          Context / Service      Redux / NgRx
  ─────────────────────────────────────────────────────────
  Simple, co-located   Medium, shared          Complex, global
  useState/signal      createContext/@Injectable  Store/Effects/Selectors
  Zero boilerplate     Low overhead            High boilerplate + tooling
  Perfect for UI       Perfect for singletons  Perfect for audit trails

  SERVER STATE is a separate category entirely:
  React Query / SWR / Angular resource()
  Handles: loading, caching, stale, refetch, optimistic updates
```

---

## Category 1 — Local State

State that lives inside a single component. Nothing else needs it.
This is the **default and correct** choice for most UI state.

### React

```javascript
// useState — for simple independent values
function ClaimCard({ claim }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving]   = useState(false);
  // expanded and saving are UI concerns owned by this card
  // → local state is correct

  return (
    <div>
      <button onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Collapse' : 'Expand'}
      </button>
      {expanded && <ClaimDetails claim={claim} />}
    </div>
  );
}

// useReducer — for complex local state with multiple related fields
function ClaimsFilter() {
  const [filters, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'SET_STATUS':   return { ...state, status: action.value, page: 1 };
        case 'SET_SEARCH':   return { ...state, search: action.value, page: 1 };
        case 'NEXT_PAGE':    return { ...state, page: state.page + 1 };
        case 'RESET':        return initialFilters;
        default: return state;
      }
    },
    { status: 'all', search: '', page: 1 }
  );
  // Multiple related fields with coordinated updates
  // → useReducer is cleaner than 3 useState calls
}
```

### Angular

```typescript
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class ClaimCardComponent {
  // Classic property state
  expanded = false;
  saving = false;

  // Angular 17+ signals — reactive local state
  expanded = signal(false);
  saving   = signal(false);

  toggle() {
    this.expanded.update(v => !v); // only this component re-renders
  }
}
```

### When Local State is Wrong

```
NOT for: data that two sibling components both need
NOT for: data that must survive navigation/unmounting
NOT for: data that needs to be visible to 5+ unrelated components
```

---

## Category 2 — Context / Services (Shared Singletons)

For data that needs to be available across the component tree
without prop drilling. Best for app-wide singletons.

### React Context — The Right Pattern

```javascript
// 1. Create typed context
const AuthContext = createContext(null);

// 2. Custom hook for clean consumption + error boundary
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

// 3. Provider wraps the relevant subtree
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login  = async (credentials) => { /* ... */ };
  const logout = () => { setUser(null); /* ... */ };

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 4. Consume anywhere — no prop drilling
function Header() {
  const { user, logout } = useAuth();
  return <div>{user?.name} <button onClick={logout}>Sign out</button></div>;
}
```

### Context Performance Trap

```javascript
// PROBLEM: ONE context for multiple concerns = too many re-renders
// Changing language re-renders components that only use theme!
const AppContext = createContext(null);

function Provider({ children }) {
  const [theme, setTheme]       = useState('light');
  const [language, setLanguage] = useState('en');
  const [user, setUser]         = useState(null);

  return (
    <AppContext.Provider value={{ theme, setTheme, language, setLanguage, user, setUser }}>
      {children}
    </AppContext.Provider>
  );
}
// Changing language → ALL consumers re-render, even theme-only components

// SOLUTION: split by concern (one context per independent concern)
<UserContext.Provider value={userValue}>
  <ThemeContext.Provider value={themeValue}>
    <LanguageContext.Provider value={langValue}>
      {children}
    </LanguageContext.Provider>
  </ThemeContext.Provider>
</UserContext.Provider>
// Changing language → only language consumers re-render
```

### Angular Services (Context Equivalent)

```typescript
// Injectable service = React Context + Provider in one
@Injectable({ providedIn: 'root' }) // available app-wide
export class AuthService {
  // Signals for reactive state (Angular 17+)
  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly(); // expose read-only

  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  // Derived state
  readonly isLoggedIn = computed(() => this._user() !== null);

  login(credentials: Credentials): Observable<void> {
    this._loading.set(true);
    return this.http.post<User>('/auth/login', credentials).pipe(
      tap(user => {
        this._user.set(user);
        this._loading.set(false);
      })
    );
  }

  logout() {
    this._user.set(null);
  }
}

// Inject in any component — no providers needed
@Component({ /* ... */ })
export class HeaderComponent {
  auth = inject(AuthService);
  // Template: {{ auth.user()?.name }}
}
```

### Good Candidates for Context / Services

```
Auth state (current user, permissions, token)
Theme (dark/light mode, brand colors)
Locale / i18n (language, timezone, number format)
Feature flags (which features are enabled)
Toast / notification queue (global UI)
```

---

## Category 3 — Redux / NgRx (Global Store)

For complex client state that many components share, with audit trail
requirements or complex update logic.

### When You Actually Need Redux/NgRx

```
Use when you have:
  1. Many components reading the same data (~10+)
  2. Complex update logic (multiple actions, coordinated updates)
  3. Need for time-travel debugging / replay
  4. Cross-cutting concerns (undo/redo, optimistic updates with rollback)
  5. Large team needing explicit contracts between state and UI

Don't use when:
  → You just want to avoid prop drilling (use Context)
  → You have server data (use React Query)
  → Most state is UI state (use local state)
```

### Redux Toolkit (Modern Redux)

```javascript
import { createSlice, createAsyncThunk, configureStore } from '@reduxjs/toolkit';

// 1. Async thunk for API calls
export const fetchClaims = createAsyncThunk(
  'claims/fetchAll',
  async (filters, { rejectWithValue }) => {
    try {
      return await claimsApi.getAll(filters);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 2. Slice = actions + reducer combined
const claimsSlice = createSlice({
  name: 'claims',
  initialState: {
    items: [],
    selectedId: null,
    loading: false,
    error: null,
  },

  reducers: {
    selectClaim(state, { payload: id }) {
      state.selectedId = id; // Immer handles immutability
    },
    updateStatus(state, { payload: { id, status } }) {
      const claim = state.items.find(c => c.id === id);
      if (claim) claim.status = status;
    },
  },

  extraReducers: builder => {
    builder
      .addCase(fetchClaims.pending,   s => { s.loading = true; s.error = null; })
      .addCase(fetchClaims.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.items = payload;
      })
      .addCase(fetchClaims.rejected,  (s, { payload }) => {
        s.loading = false;
        s.error = payload;
      });
  },
});

export const { selectClaim, updateStatus } = claimsSlice.actions;

// 3. Selectors (memoized with createSelector)
import { createSelector } from '@reduxjs/toolkit';

const selectClaims   = state => state.claims.items;
const selectStatusFilter = state => state.filters.status;

export const selectFilteredClaims = createSelector(
  [selectClaims, selectStatusFilter],
  (claims, status) => status === 'all'
    ? claims
    : claims.filter(c => c.status === status)
  // Recalculates ONLY when claims or status changes
);

// 4. Component
function ClaimsList() {
  const dispatch = useDispatch();
  const claims   = useSelector(selectFilteredClaims);
  const loading  = useSelector(s => s.claims.loading);

  useEffect(() => { dispatch(fetchClaims()); }, []);

  return loading ? <Spinner /> : <List items={claims} />;
}
```

### NgRx (Angular Redux)

```typescript
// actions.ts
export const loadClaims       = createAction('[Claims] Load');
export const claimsLoaded     = createAction('[Claims] Loaded',
  props<{ claims: Claim[] }>());
export const loadClaimsFailed = createAction('[Claims] Failed',
  props<{ error: string }>());

// reducer.ts
interface ClaimsState { claims: Claim[]; loading: boolean; error: string | null; }

export const claimsReducer = createReducer(
  { claims: [], loading: false, error: null } as ClaimsState,
  on(loadClaims,       s => ({ ...s, loading: true, error: null })),
  on(claimsLoaded,     (s, { claims }) => ({ ...s, claims, loading: false })),
  on(loadClaimsFailed, (s, { error }) => ({ ...s, error, loading: false }))
);

// effects.ts — handle async side effects
@Injectable()
export class ClaimsEffects {
  loadClaims$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadClaims),
      switchMap(() =>
        this.claimsService.getAll().pipe(
          map(claims  => claimsLoaded({ claims })),
          catchError(e => of(loadClaimsFailed({ error: e.message })))
        )
      )
    )
  );
  constructor(private actions$: Actions, private claimsService: ClaimsService) {}
}

// selectors.ts
export const selectAllClaims  = createSelector(selectClaimsState, s => s.claims);
export const selectIsLoading  = createSelector(selectClaimsState, s => s.loading);

// component.ts
@Component({ /* ... */ })
export class ClaimsComponent implements OnInit {
  claims$  = this.store.select(selectAllClaims);
  loading$ = this.store.select(selectIsLoading);
  constructor(private store: Store) {}
  ngOnInit() { this.store.dispatch(loadClaims()); }
}
```

---

## Category 4 — Server State (The Missing Category)

Most "state management" problems are actually **server state** problems.
Server state has fundamentally different characteristics than UI state.

### Client State vs Server State

```
CLIENT STATE:              SERVER STATE:
→ You own it               → Server owns it
→ Doesn't go stale         → Can go stale (others change it)
→ No async involved        → Always async (fetch, load, error)
→ No deduplication needed  → Same query from N components = N requests?
→ No cache invalidation    → Must invalidate when data changes

Examples:                  Examples:
  expanded/collapsed         Claims list from /api/claims
  current theme              User profile from /api/users/me
  form field values          Stats dashboard from /api/stats
  selected tab               Products from /api/products
```

### React Query — Best-in-Class Server State

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// FETCHING — automatic loading/error/cache/deduplication
function ClaimsList({ status }) {
  const { data: claims, isLoading, isError, error } = useQuery({
    queryKey:  ['claims', { status }], // cache key includes params
    queryFn:   () => fetchClaims({ status }),
    staleTime: 5 * 60 * 1000,         // fresh for 5min — no refetch
    gcTime:    10 * 60 * 1000,         // keep in cache 10min after unmount
    refetchOnWindowFocus: true,        // refetch when tab regains focus
    retry: 2,                          // retry failed requests twice
  });

  if (isLoading) return <Skeleton />;
  if (isError)   return <ErrorBanner message={error.message} />;
  return <List items={claims} />;
}
// ZERO prop drilling. Multiple components can call useQuery(['claims'])
// React Query deduplicates: only ONE actual HTTP request.

// MUTATIONS with optimistic updates
function useUpdateClaimStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => updateClaim(id, { status }),

    // Optimistic update: change UI immediately before server responds
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['claims'] });
      const snapshot = queryClient.getQueryData(['claims']); // save for rollback

      queryClient.setQueryData(['claims'], old =>
        old.map(c => c.id === id ? { ...c, status } : c)
      );
      return { snapshot };
    },

    // Rollback if server returns error
    onError: (err, vars, { snapshot }) => {
      queryClient.setQueryData(['claims'], snapshot);
      toast.error('Update failed — reverting');
    },

    // Refresh from server after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
}
```

### When to Use What for Server State

```
Simple fetching:          useQuery (React Query)
Simple mutations:         useMutation (React Query)
Paginated data:           useInfiniteQuery (React Query)
Real-time data:           WebSocket + queryClient.setQueryData
Angular:                  HttpClient + signals / resource() (Angular 19+)
                          OR ngx-query (React Query port for Angular)
```

---

## URL as State

Often overlooked, but URL-based state is the best approach for
shareable, bookmarkable state like filters and pagination.

```javascript
// React Router — filters in URL
function ClaimsList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') ?? 'all';
  const page   = Number(searchParams.get('page') ?? '1');

  const setStatus = (s) => setSearchParams(p => {
    p.set('status', s);
    p.set('page', '1'); // reset page on filter change
    return p;
  });

  return (
    <div>
      <StatusFilter value={status} onChange={setStatus} />
      {/* URL: /claims?status=approved&page=2 — shareable! */}
    </div>
  );
}

// Angular — ActivatedRoute
@Component({ /* ... */ })
export class ClaimsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  status$ = this.route.queryParams.pipe(
    map(p => p['status'] ?? 'all')
  );

  setStatus(status: string) {
    this.router.navigate([], {
      queryParams: { status, page: 1 },
      queryParamsHandling: 'merge'
    });
  }
}
```

---

## Interview Questions & Model Answers

### Q1: "How do you decide which state management solution to use?"

```
I use the state locality rule: state should live as close to
where it's used as possible. Only lift it when you need to.

The decision tree:

1. Does only ONE component need it?
   → Local state (useState / component signal)

2. Does a subtree of components need it, or is it app-wide?
   → Context (React) or Injectable Service (Angular)
   → Good for: auth, theme, locale, feature flags

3. Is it data that comes from the server?
   → React Query / TanStack Query
   → Handles loading, caching, stale data, deduplication
   → This eliminates the need for Redux in most apps

4. Is it complex client state with many consumers, complex
   update logic, or audit trail requirements?
   → Redux Toolkit (React) or NgRx (Angular)
   → Most apps DON'T actually need this layer

5. Is it shareable/bookmarkable state (filters, pagination)?
   → URL search params — free persistence and shareability

For our insurance claims app:
  Auth state → Angular service with signals
  Claims data → HttpClient + signals (server state)
  Filter/sort state → URL params (shareable)
  Form state → local component state
  No global store needed — not complex enough
```

### Q2: "What is the problem with using Redux for everything?"

```
Redux adds significant boilerplate:
  actions.ts → reducer.ts → effects.ts → selectors.ts → component
  A single feature needs 4+ files just to fetch and display a list.

This leads to real problems:
  → More code to maintain than the feature itself
  → Slow onboarding — new engineers spend days learning the patterns
  → Everything becomes an action — even UI state like "modal is open"
  → Over-normalisation — complex entity relationship management for
    data that could just be the raw API response

The modern answer:
  → Server state → React Query (zero boilerplate, handles caching)
  → Local UI state → useState/useReducer
  → Shared singletons → Context or service
  → Redux only when genuinely needed: time-travel debugging,
    undo/redo, very complex coordinated state across many features
```

### Q3: "What is server state and how is it different from client state?"

```
Server state is data that:
  1. Lives on the server (you don't own it)
  2. Can go stale (other users change it)
  3. Requires async fetching (loading/error/success lifecycle)
  4. Needs cache invalidation (after mutations)
  5. Should be deduplicated (same query from 5 components = 1 request)

Client state is data that:
  1. You own — only your app changes it
  2. Doesn't go stale — only changes when you tell it to
  3. Synchronous — no loading/error states
  4. Examples: dark mode preference, selected tab, form values

The mistake most apps make: treating server data like client state.
They put API responses into Redux, write reducers for loading/error/success,
manually invalidate after mutations — reinventing what React Query
gives you for free.

React Query handles all server state concerns automatically:
caching, deduplication, background refetch, stale-while-revalidate,
optimistic updates with rollback.
```

---

## Cheat Sheet

```
STATE CATEGORIES:
  Local:       useState / signal — one component owns it
  Shared:      Context / Angular service — subtree or app-wide
  Server:      React Query / HttpClient+signals — fetched async data
  Complex:     Redux / NgRx — many consumers, audit trail
  URL:         searchParams / ActivatedRoute — shareable/bookmarkable

STATE LOCALITY RULE:
  State lives as close to where it's used as possible.
  Start local, lift when you need to share it.
  NOT the other way around.

CONTEXT TRAP:
  One context for multiple concerns = too many re-renders
  Split by concern: AuthContext, ThemeContext, LanguageContext

REDUX WHEN:
  10+ components sharing same data
  Complex coordinated updates
  Time-travel debugging / undo-redo needed
  Large team needing explicit state contracts

REACT QUERY GIVES FREE:
  Loading / error / success states
  Deduplication (multiple components, one request)
  Stale-while-revalidate behaviour
  Cache invalidation after mutations
  Optimistic updates with rollback
  Background refetch on window focus

ANGULAR STATE OPTIONS (simple → complex):
  signal in component → signal service → BehaviorSubject service → NgRx store
```

---

## Hands-On Task (20 mins)

1. Look at your Angular app at Digit — how is claims data stored and fetched?
2. Is it in a service with a BehaviorSubject? In a component directly? In NgRx?
3. Does the service handle loading/error states explicitly?
4. Would React Query / a similar pattern improve the current approach?
5. Identify one piece of global state that is actually just UI state (could be local)
6. Identify one piece of local state that is actually server state (needs caching/invalidation)

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **State locality** | Principle: state lives as close to its consumers as possible |
| **Prop drilling** | Passing props through multiple intermediate components that don't need them |
| **Context** | React mechanism for providing values to a component subtree |
| **Provider** | Component that wraps a subtree and makes context available |
| **Consumer** | Component that reads from a context |
| **Reducer** | Pure function `(state, action) → newState` |
| **Action** | Plain object describing what happened in the system |
| **Selector** | Function that derives specific data from the store |
| **Store** | Central state container in Redux/NgRx |
| **Effects** | NgRx pattern for handling async side effects (API calls) |
| **Server state** | Data owned by the server — stale, async, needs caching |
| **Client state** | Data owned by the app — synchronous, you control all mutations |
| **React Query** | Library for fetching, caching, and synchronising server state |
| **Optimistic update** | Update UI immediately before server confirms — rollback on error |
| **Cache invalidation** | Marking cached data as stale so it will be refetched |
| **Stale-while-revalidate** | Serve cached data immediately while fetching fresh version |
| **BehaviorSubject** | RxJS observable with a current value — common Angular state pattern |
| **NgRx** | Angular's Redux implementation (actions, reducers, effects, selectors) |
| **Zustand** | Lightweight React state library — simpler alternative to Redux |
| **Immer** | Library that makes immutable state updates feel like mutations |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 17** | Component Design Patterns | Compound components, render props, HOCs |
| **Day 18** | Micro Frontends | Module Federation, independent deployments |
| **Day 19** | Rendering Patterns | SSR, SSG, CSR, ISR — when to use each |
