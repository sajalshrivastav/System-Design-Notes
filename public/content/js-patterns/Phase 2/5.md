#  React Design Patterns — Complete Guide 
---

 
##  Table of Contents

 
1. [Component Patterns](#-component-patterns)
   - Container/Presentational
   - Compound Components
   - Controlled vs Uncontrolled
2. [Higher-Order Components (HOC)](#-higher-order-components-hoc)
3. [Render Props](#-render-props)
4. [Custom Hooks Patterns](#-custom-hooks-patterns)
5. [State Management Patterns](#-state-management-patterns)
   - Lifting State Up
   - Context + useReducer
   - State Machine
6. [Composition Patterns](#-composition-patterns)
   - Slot Pattern
   - Provider Pattern
   - Layout Components
7. [Performance Patterns](#-performance-patterns)
8. [Advanced Patterns](#-advanced-patterns)
   - Portal Pattern
   - Error Boundary
   - Suspense Pattern
9. [Real-World Architecture Patterns](#-real-world-architecture-patterns)

 
---

 
##  Component Patterns

 
### 1. Container / Presentational Pattern

 
> **Separate data-fetching logic from UI rendering.**

 
The **Container** handles state/logic. The **Presentational** component is pure UI.

 
```jsx
// ============================================
// PRESENTATIONAL — Pure UI, receives props
// ============================================

 
// components/UserCard.jsx
function UserCard({ user, onFollow, isFollowing }) {
  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
      <span className="stats">
        {user.followers} followers · {user.following} following
      </span>
      <button
        onClick={() => onFollow(user.id)}
        className={isFollowing ? "following" : "follow"}
      >
        {isFollowing ? "Following ✓" : "Follow"}
      </button>
    </div>
  );
}

 
// components/UserCardSkeleton.jsx
function UserCardSkeleton() {
  return (
    <div className="user-card skeleton">
      <div className="avatar-placeholder" />
      <div className="text-placeholder" />
      <div className="text-placeholder short" />
    </div>
  );
}

 
// ============================================
// CONTAINER — Handles logic, passes to presentational
// ============================================

 
// containers/UserCardContainer.jsx
import { useState, useEffect } from 'react';

 
function UserCardContainer({ userId }) {
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 
  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        setUser(data);
        setIsFollowing(data.isFollowedByMe);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

 
  const handleFollow = async (id) => {
    setIsFollowing(prev => !prev);
    await fetch(`/api/users/${id}/follow`, { method: 'POST' });
  };

 
  if (loading) return <UserCardSkeleton />;
  if (error) return <div className="error">Error: {error}</div>;
  if (!user) return null;

 
  return (
    <UserCard
      user={user}
      onFollow={handleFollow}
      isFollowing={isFollowing}
    />
  );
}

 
// ============================================
// MODERN APPROACH — Custom Hook replaces Container
// ============================================

 
function useUser(userId) {
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 
  useEffect(() => {
    let cancelled = false;

 
    async function fetchUser() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        if (!cancelled) {
          setUser(data);
          setIsFollowing(data.isFollowedByMe);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

 
    fetchUser();
    return () => { cancelled = true; };
  }, [userId]);

 
  const toggleFollow = async () => {
    setIsFollowing(prev => !prev);
    await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
  };

 
  return { user, isFollowing, loading, error, toggleFollow };
}

 
// Usage — cleaner than container!
function UserProfile({ userId }) {
  const { user, isFollowing, loading, error, toggleFollow } = useUser(userId);

 
  if (loading) return <UserCardSkeleton />;
  if (error) return <div>Error: {error}</div>;

 
  return <UserCard user={user} isFollowing={isFollowing} onFollow={toggleFollow} />;
}
```

 
#### When to Use
- **Container/Presentational**: Legacy codebases, class components
- **Custom Hook**: Modern React (preferred approach)

 
---

 
### 2. Compound Components Pattern

 
> **Components that work together sharing implicit state.**

 
Think of `<select>` and `<option>` — they don't work alone, but together they're powerful.

 
```jsx
// ============================================
// COMPOUND COMPONENTS — Accordion
// ============================================

 
import { createContext, useContext, useState, Children, cloneElement } from 'react';

 
// Shared Context
const AccordionContext = createContext();

 
function Accordion({ children, allowMultiple = false }) {
  const [openItems, setOpenItems] = useState(new Set());

 
  const toggle = (id) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

 
  const isOpen = (id) => openItems.has(id);

 
  return (
    <AccordionContext.Provider value={{ toggle, isOpen }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

 
function AccordionItem({ id, children }) {
  const { isOpen } = useContext(AccordionContext);

 
  return (
    <div className={`accordion-item ${isOpen(id) ? "open" : ""}`}>
      {children}
    </div>
  );
}

 
function AccordionTrigger({ id, children }) {
  const { toggle, isOpen } = useContext(AccordionContext);

 
  return (
    <button
      className="accordion-trigger"
      onClick={() => toggle(id)}
      aria-expanded={isOpen(id)}
    >
      {children}
      <span className="icon">{isOpen(id) ? "▲" : "▼"}</span>
    </button>
  );
}

 
function AccordionContent({ id, children }) {
  const { isOpen } = useContext(AccordionContext);

 
  if (!isOpen(id)) return null;

 
  return (
    <div className="accordion-content" role="region">
      {children}
    </div>
  );
}

 
// Attach sub-components
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

// ====== USAGE — Beautiful declarative API ======

 
function FAQ() {
  return (
    <Accordion allowMultiple>
      <Accordion.Item id="q1">
        <Accordion.Trigger id="q1">What is React?</Accordion.Trigger>
        <Accordion.Content id="q1">
          React is a JavaScript library for building user interfaces.
        </Accordion.Content>
      </Accordion.Item>

 
      <Accordion.Item id="q2">
        <Accordion.Trigger id="q2">What are hooks?</Accordion.Trigger>
        <Accordion.Content id="q2">
          Hooks let you use state and lifecycle features in function components.
        </Accordion.Content>
      </Accordion.Item>

 
      <Accordion.Item id="q3">
        <Accordion.Trigger id="q3">What is JSX?</Accordion.Trigger>
        <Accordion.Content id="q3">
          JSX is a syntax extension that looks like HTML but works in JavaScript.
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

 
// ============================================
// COMPOUND COMPONENTS — Tabs
// ============================================

const TabsContext = createContext();

 
function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

 
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

 
function TabList({ children }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

 
function Tab({ id, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);

 
  return (
    <button
      role="tab"
      className={`tab ${activeTab === id ? "active" : ""}`}
      onClick={() => setActiveTab(id)}
      aria-selected={activeTab === id}
    >
      {children}
    </button>
  );
}

 
function TabPanel({ id, children }) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== id) return null;

 
  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

 
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

 
// Usage
function SettingsPage() {
  return (
    <Tabs defaultTab="general">
      <Tabs.List>
        <Tabs.Tab id="general">General</Tabs.Tab>
        <Tabs.Tab id="security">Security</Tabs.Tab>
        <Tabs.Tab id="notifications">Notifications</Tabs.Tab>
      </Tabs.List>

 
      <Tabs.Panel id="general">General settings...</Tabs.Panel>
      <Tabs.Panel id="security">Security settings...</Tabs.Panel>
      <Tabs.Panel id="notifications">Notification prefs...</Tabs.Panel>
    </Tabs>
  );
}
```

 
---

 
### 3. Controlled vs Uncontrolled Components

 
```jsx
// ============================================
// CONTROLLED — Parent owns the state
// ============================================

 
function ControlledInput() {
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState([]);

 
  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);

 
    // Real-time validation
    const newErrors = [];
    if (newValue.length < 3) newErrors.push("Min 3 characters");
    if (newValue.length > 50) newErrors.push("Max 50 characters");
    setErrors(newErrors);
  };

 
  return (
    <div>
      <input
        value={value}           // Controlled by React state
        onChange={handleChange}  // Every change goes through handler
        className={errors.length ? "error" : ""}
      />
      {errors.map((err, i) => <span key={i} className="error">{err}</span>)}
      <p>Character count: {value.length}</p>
    </div>
  );
}

 
 
// ============================================
// UNCONTROLLED — DOM owns the state
// ============================================

 
import { useRef } from 'react';

 
function UncontrolledForm() {
  const nameRef = useRef();
  const emailRef = useRef();
  const fileRef = useRef();

 
  const handleSubmit = (e) => {
    e.preventDefault();

 
    // Access values directly from DOM via refs
    const formData = {
      name: nameRef.current.value,
      email: emailRef.current.value,
      file: fileRef.current.files[0],
    };

 
    console.log("Submitted:", formData);
  };

 
  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} defaultValue="Sajal" />  {/* defaultValue, NOT value */}
      <input ref={emailRef} type="email" />
      <input ref={fileRef} type="file" />            {/* File inputs are ALWAYS uncontrolled */}
      <button type="submit">Submit</button>
    </form>
  );
}

 
// ============================================
// HYBRID — Component supports BOTH modes
// ============================================

 
function Toggle({ value: controlledValue, onChange, defaultValue = false }) {
  const [internalValue, setInternalValue] = useState(defaultValue);

 
  // Determine if controlled or uncontrolled
  const isControlled = controlledValue !== undefined;
  const isOn = isControlled ? controlledValue : internalValue;

 
  const handleToggle = () => {
    const newValue = !isOn;

 
    if (!isControlled) {
      setInternalValue(newValue);  // Uncontrolled: update internal state
    }

 
    onChange?.(newValue);          // Always call onChange if provided
  };

 
  return (
    <button
      onClick={handleToggle}
      className={`toggle ${isOn ? "on" : "off"}`}
      role="switch"
      aria-checked={isOn}
    >
      {isOn ? "ON" : "OFF"}
    </button>
  );
}

 
// Usage — Both modes work!
// <Toggle onChange={(v) => console.log(v)} />                    // Uncontrolled
// <Toggle value={isEnabled} onChange={setIsEnabled} />           // Controlled
```

 
---

 
## 🔵 Higher-Order Components (HOC)

 
> **A function that takes a component and returns an enhanced component.**

 
```jsx
// ============================================
// HOC — withAuth (Route Protection)
// ============================================

 
function withAuth(WrappedComponent, requiredRole = null) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth(); // Custom hook

 
    if (loading) return <LoadingSpinner />;

 
    if (!user) {
      return <Navigate to="/login" replace />;
    }

 
    if (requiredRole && user.role !== requiredRole) {
      return <div className="forbidden">403 — Access Denied</div>;
    }

 
    return <WrappedComponent {...props} user={user} />;
  };
}

 
// Usage
const ProtectedDashboard = withAuth(Dashboard);
const AdminPanel = withAuth(AdminSettings, "admin");

 
// In routes
// <Route path="/dashboard" element={<ProtectedDashboard />} />
// <Route path="/admin" element={<AdminPanel />} />

 
// ============================================
// HOC — withErrorBoundary
// ============================================

 
function withErrorBoundary(WrappedComponent, FallbackComponent) {
  return class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

 
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

 
    componentDidCatch(error, errorInfo) {
      console.error("Error caught:", error, errorInfo);
      // Log to error tracking service
    }

 
    render() {
      if (this.state.hasError) {
        return FallbackComponent
          ? <FallbackComponent error={this.state.error} />
          : <div>Something went wrong</div>;
      }
      return <WrappedComponent {...this.props} />;
    }
  };
}

 
// Usage
const SafeChart = withErrorBoundary(Chart, ChartErrorFallback);

 
// ============================================
// HOC — withLogging (Analytics)
// ============================================

 
function withLogging(WrappedComponent, componentName) {
  return function LoggedComponent(props) {
    useEffect(() => {
      console.log(`[MOUNT] ${componentName}`);
      analytics.track(`${componentName}_viewed`);

 
      return () => {
        console.log(`[UNMOUNT] ${componentName}`);
      };
    }, []);

 
    useEffect(() => {
      console.log(`[UPDATE] ${componentName}`, props);
    });

 
    return <WrappedComponent {...props} />;
  };
}

 
// Usage
const TrackedProductPage = withLogging(ProductPage, "ProductPage");

 
// ============================================
// HOC — Composing Multiple HOCs
// ============================================

 
// Utility to compose HOCs
function compose(...fns) {
  return (component) => fns.reduceRight((acc, fn) => fn(acc), component);
}

 
// Compose multiple HOCs cleanly
const EnhancedDashboard = compose(
  withAuth,
  withErrorBoundary,
  (C) => withLogging(C, "Dashboard"),
)(Dashboard);

 
// Same as: withAuth(withErrorBoundary(withLogging(Dashboard, "Dashboard")))
```

 
#### ⚠️ HOC Pitfalls
- **Wrapper Hell** — too many HOCs create deep nesting
- **Prop collision** — HOCs might overwrite props
- **Ref forwarding** — need `React.forwardRef`
- **Static methods** — need to copy statics with `hoist-non-react-statics`
- **Prefer Custom Hooks** in modern React!

 
---

 
## 🟣 Render Props Pattern

 
> **Share code via a prop whose value is a function.**

 
```jsx
// ============================================
// RENDER PROPS — Mouse Position Tracker
// ============================================

 
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

 
  useEffect(() => {
    const handleMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

 
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

 
  return render(position);
}

 
// Usage — Different UIs with same logic
function App() {
  return (
    <div>
      {/* Render as coordinates text */}
      <MouseTracker render={({ x, y }) => (
        <p>Mouse: ({x}, {y})</p>
      )} />

 
      {/* Render as a following dot */}
      <MouseTracker render={({ x, y }) => (
        <div
          className="cursor-dot"
          style={{
            position: 'fixed',
            left: x - 10,
            top: y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'red',
          }}
        />
      )} />
    </div>
  );
}

 
// ============================================
// RENDER PROPS — Data Fetcher
// ============================================

 
function DataFetcher({ url, children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 
  useEffect(() => {
    let cancelled = false;

 
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => { if (!cancelled) setData(data); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });

 
    return () => { cancelled = true; };
  }, [url]);

 
  // "children as a function" — variant of render props
  return children({ data, loading, error });
}

 
// Usage
function UserList() {
  return (
    <DataFetcher url="/api/users">
      {({ data, loading, error }) => {
        if (loading) return <Spinner />;
        if (error) return <Error message={error.message} />;

 
        return (
          <ul>
            {data.map(user => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        );
      }}
    </DataFetcher>
  );
}

 
// ============================================
// RENDER PROPS — Toggle / Disclosure
// ============================================

 
function Toggle({ children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

 
  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

 
  return children({ isOpen, toggle, open, close });
}

 
// Usage
function DropdownMenu() {
  return (
    <Toggle>
      {({ isOpen, toggle }) => (
        <div className="dropdown">
          <button onClick={toggle}>
            Menu {isOpen ? "▲" : "▼"}
          </button>
          {isOpen && (
            <ul className="dropdown-menu">
              <li>Profile</li>
              <li>Settings</li>
              <li>Logout</li>
            </ul>
          )}
        </div>
      )}
    </Toggle>
  );
}
```

---

 
## 🔶 Custom Hooks Patterns

 
> **The modern replacement for HOCs and Render Props.**

 
```jsx
// ============================================
// CUSTOM HOOK — useLocalStorage
// ============================================

 
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

 
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

 
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(error);
    }
  };

 
  return [storedValue, setValue, removeValue];
}

 
// Usage
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

 
  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      Current: {theme}
    </button>
  );
}

 

 
// ============================================
// CUSTOM HOOK — useFetch (with caching)
// ============================================

 
const cache = new Map();

 
function useFetch(url, options = {}) {
  const [data, setData] = useState(cache.get(url) || null);
  const [loading, setLoading] = useState(!cache.has(url));
  const [error, setError] = useState(null);

 
  useEffect(() => {
    if (!url) return;

 
    let cancelled = false;
    const controller = new AbortController();

 
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

 
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

 
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

 
        const json = await response.json();

 
        if (!cancelled) {
          cache.set(url, json);
          setData(json);
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

 
    fetchData();

 
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url]);

 
  const refetch = () => {
    cache.delete(url);
    setData(null);
    setLoading(true);
    // Trigger re-fetch by updating URL dependency
  };

 
  return { data, loading, error, refetch };
}

 
// Usage
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

 
  if (loading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

 
  return <div>{user.name}</div>;
}

 
// ============================================
// CUSTOM HOOK — useDebounce
// ============================================

 
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

 
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

 
    return () => clearTimeout(timer);
  }, [value, delay]);

 
  return debouncedValue;
}

 
// Usage — Debounced search
function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const { data: results } = useFetch(
    debouncedQuery ? `/api/search?q=${debouncedQuery}` : null
  );

 
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {results?.map(item => <div key={item.id}>{item.title}</div>)}
    </div>
  );
}

 
// ============================================
// CUSTOM HOOK — useToggle
// ============================================

 
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

 
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

 
  return { value, toggle, setTrue, setFalse };
}

 
// ============================================
// CUSTOM HOOK — useMediaQuery
// ============================================

 
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    return window.matchMedia(query).matches;
  });

 
  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

 
    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

 
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

 
  return matches;
}

 
// Usage
function ResponsiveLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDark = useMediaQuery('(prefers-color-scheme: dark)');

 
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}

 
// ============================================
// CUSTOM HOOK — useClickOutside
// ============================================

 
function useClickOutside(ref, callback) {
  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }

 
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

 
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [ref, callback]);
}

 
// Usage
function Dropdown() {
  const ref = useRef();
  const { value: isOpen, toggle, setFalse: close } = useToggle();

 
  useClickOutside(ref, close);

 
  return (
    <div ref={ref}>
      <button onClick={toggle}>Menu</button>
      {isOpen && (
        <ul className="dropdown-menu">
          <li>Option 1</li>
          <li>Option 2</li>
        </ul>
      )}
    </div>
  );
}

 
// ============================================
// CUSTOM HOOK — usePrevious
// ============================================

 
function usePrevious(value) {
  const ref = useRef();

 
  useEffect(() => {
    ref.current = value;
  }, [value]);

 
  return ref.current;
}

 
// Usage — Detect value changes
function PriceDisplay({ price }) {
  const prevPrice = usePrevious(price);
  const trend = price > prevPrice ? "📈" : price < prevPrice ? "📉" : "➡️";

 
  return (
    <span>
      ${price} {trend}
      {prevPrice !== undefined && (
        <small> (was ${prevPrice})</small>
      )}
    </span>
  );
}

 
// ============================================
// CUSTOM HOOK — useIntersectionObserver
// ============================================

 
function useIntersectionObserver(options = {}) {
  const [entry, setEntry] = useState(null);
  const [node, setNode] = useState(null);

 
  useEffect(() => {
    if (!node) return;

 
    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { threshold: 0.1, ...options }
    );

 
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, options.threshold, options.rootMargin]);

 
  return { ref: setNode, entry, isVisible: entry?.isIntersecting ?? false };
}

 
// Usage — Lazy loading & infinite scroll
function LazyImage({ src, alt }) {
  const { ref, isVisible } = useIntersectionObserver();
  const [loaded, setLoaded] = useState(false);

 
  return (
    <div ref={ref} className="lazy-image-container">
      {isVisible && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={loaded ? "loaded" : "loading"}
        />
      )}
    </div>
  );
}
```
---
## 🟡 State Management Patterns

 
### 1. Lifting State Up

 
```jsx
// ============================================
// LIFTING STATE — Shared state in common ancestor
// ============================================

 
function TemperatureConverter() {
  const [celsius, setCelsius] = useState(0);

 
  // State lives in parent, shared via props
  return (
    <div>
      <CelsiusInput
        value={celsius}
        onChange={setCelsius}
      />
      <FahrenheitInput
        value={(celsius * 9/5) + 32}
        onChange={(f) => setCelsius((f - 32) * 5/9)}
      />
      <KelvinDisplay value={celsius + 273.15} />
    </div>
  );
}

 
function CelsiusInput({ value, onChange }) {
  return (
    <label>
      Celsius:
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
```

 
### 2. Context + useReducer (Mini Redux)

 
```jsx
// ============================================
// CONTEXT + REDUCER — Global State Management
// ============================================

 
import { createContext, useContext, useReducer, useMemo } from 'react';

 
// Types
const ACTIONS = {
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  APPLY_COUPON: 'APPLY_COUPON',
};

 
// Reducer
function cartReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_TO_CART: {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

 
    case ACTIONS.REMOVE_FROM_CART:
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.payload),
      };

 
    case ACTIONS.UPDATE_QUANTITY:
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.payload.id
            ? { ...i, quantity: Math.max(0, action.payload.quantity) }
            : i
        ).filter(i => i.quantity > 0),
      };

 
    case ACTIONS.CLEAR_CART:
      return { ...state, items: [], coupon: null };

 
    case ACTIONS.APPLY_COUPON:
      return { ...state, coupon: action.payload };

 
    default:
      return state;
  }
}
// Context
const CartContext = createContext();

 
function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    coupon: null,
  });

 
  // Memoized derived state
  const cartInfo = useMemo(() => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );
    const discount = state.coupon ? subtotal * (state.coupon.percent / 100) : 0;
    const total = subtotal - discount;
    const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

 
    return { subtotal, discount, total, itemCount };
  }, [state.items, state.coupon]);

 
  // Action creators
  const actions = useMemo(() => ({
    addToCart: (product) => dispatch({ type: ACTIONS.ADD_TO_CART, payload: product }),
    removeFromCart: (id) => dispatch({ type: ACTIONS.REMOVE_FROM_CART, payload: id }),
    updateQuantity: (id, quantity) => dispatch({ type: ACTIONS.UPDATE_QUANTITY, payload: { id, quantity } }),
    clearCart: () => dispatch({ type: ACTIONS.CLEAR_CART }),
    applyCoupon: (coupon) => dispatch({ type: ACTIONS.APPLY_COUPON, payload: coupon }),
  }), []);

 
  const value = useMemo(() => ({
    ...state,
    ...cartInfo,
    ...actions,
  }), [state, cartInfo, actions]);

 
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

 
function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

 
// Usage
function ProductCard({ product }) {
  const { addToCart } = useCart();

 
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => addToCart(product)}>Add to Cart</button>
    </div>
  );
}

 
function CartSummary() {
  const { items, total, itemCount, clearCart } = useCart();

 
  return (
    <div className="cart-summary">
      <h2>Cart ({itemCount} items)</h2>
      {items.map(item => (
        <div key={item.id}>
          {item.name} x{item.quantity} = ${item.price * item.quantity}
        </div>
      ))}
      <strong>Total: ${total.toFixed(2)}</strong>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}

 
// App wrapper
// <CartProvider>
//   <App />
// </CartProvider>
```

 
### 3. State Machine Pattern

 
```jsx
// ============================================
// STATE MACHINE — Form Submission
// ============================================

 
const STATES = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
};

 
const EVENTS = {
  SUBMIT: 'SUBMIT',
  VALIDATION_SUCCESS: 'VALIDATION_SUCCESS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SUBMISSION_SUCCESS: 'SUBMISSION_SUCCESS',
  SUBMISSION_ERROR: 'SUBMISSION_ERROR',
  RESET: 'RESET',
};

 
// State machine transitions
const machine = {
  [STATES.IDLE]: {
    [EVENTS.SUBMIT]: STATES.VALIDATING,
  },
  [STATES.VALIDATING]: {
    [EVENTS.VALIDATION_SUCCESS]: STATES.SUBMITTING,
    [EVENTS.VALIDATION_ERROR]: STATES.ERROR,
  },
  [STATES.SUBMITTING]: {
    [EVENTS.SUBMISSION_SUCCESS]: STATES.SUCCESS,
    [EVENTS.SUBMISSION_ERROR]: STATES.ERROR,
  },
  [STATES.SUCCESS]: {
    [EVENTS.RESET]: STATES.IDLE,
  },
  [STATES.ERROR]: {
    [EVENTS.SUBMIT]: STATES.VALIDATING,
    [EVENTS.RESET]: STATES.IDLE,
  },
};

 
function useStateMachine(initialState) {
  const [state, setState] = useState(initialState);

 
  const send = useCallback((event) => {
    setState(currentState => {
      const nextState = machine[currentState]?.[event];
      if (!nextState) {
        console.warn(`Invalid transition: ${currentState} + ${event}`);
        return currentState;
      }
      return nextState;
    });
  }, []);

 
  return { state, send, is: (s) => state === s };
}

 
// Usage
function ContactForm() {
  const { state, send, is } = useStateMachine(STATES.IDLE);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [error, setError] = useState('');

 
  const handleSubmit = async (e) => {
    e.preventDefault();
    send(EVENTS.SUBMIT);

 
    // Validate
    if (!formData.name || !formData.email) {
      setError("Name and email are required");
      send(EVENTS.VALIDATION_ERROR);
      return;
    }

 
    send(EVENTS.VALIDATION_SUCCESS);

 
    // Submit
    try {
      await fetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      send(EVENTS.SUBMISSION_SUCCESS);
    } catch (err) {
      setError(err.message);
      send(EVENTS.SUBMISSION_ERROR);
    }
  };

 
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
        disabled={is(STATES.SUBMITTING)}
        placeholder="Name"
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
        disabled={is(STATES.SUBMITTING)}
        placeholder="Email"
      />

 
      {is(STATES.ERROR) && <div className="error">{error}</div>}
      {is(STATES.SUCCESS) && <div className="success">Message sent! ✅</div>}

 
      <button
        type="submit"
        disabled={is(STATES.SUBMITTING) || is(STATES.VALIDATING)}
      >
        {is(STATES.SUBMITTING) ? "Sending..." : "Send Message"}
      </button>

 
      {(is(STATES.SUCCESS) || is(STATES.ERROR)) && (
        <button type="button" onClick={() => send(EVENTS.RESET)}>
          Reset
        </button>
      )}
    </form>
  );
}
```

 
---

 
## 🟠 Composition Patterns

 
### 1. Slot Pattern

 
> **Named slots for flexible component layouts (like Vue slots).**

 
```jsx
// ============================================
// SLOT PATTERN — Flexible Layout
// ============================================

 
function Card({ children }) {
  // Extract named slots from children
  const slots = {};
  Children.forEach(children, child => {
    if (child?.type?.slot) {
      slots[child.type.slot] = child;
    }
  });

 
  return (
    <div className="card">
      {slots.header && <div className="card-header">{slots.header}</div>}
      {slots.body && <div className="card-body">{slots.body}</div>}
      {slots.footer && <div className="card-footer">{slots.footer}</div>}
    </div>
  );
}

 
// Simpler approach with explicit props
function Modal({ header, body, footer, isOpen, onClose }) {
  if (!isOpen) return null;

 
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {header}
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{body}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
// Usage
function App() {
  const [isOpen, setIsOpen] = useState(false);

 
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      header={<h2>Confirm Delete</h2>}
      body={<p>Are you sure you want to delete this item?</p>}
      footer={
        <>
          <button onClick={() => setIsOpen(false)}>Cancel</button>
          <button className="danger" onClick={handleDelete}>Delete</button>
        </>
      }
    />
  );
}
```
### 2. Provider Pattern

 
```jsx
// ============================================
// PROVIDER PATTERN — Theme + Auth + i18n
// ============================================

 
// Multiple providers composed together
function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <I18nProvider locale="en">
            <NotificationProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </NotificationProvider>
          </I18nProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

 
// Utility to compose providers without nesting
function composeProviders(...providers) {
  return function ComposedProvider({ children }) {
    return providers.reduceRight(
      (acc, [Provider, props = {}]) => (
        <Provider {...props}>{acc}</Provider>
      ),
      children
    );
  };
}

 
// Clean composition
const AppProviders2 = composeProviders(
  [ErrorBoundary],
  [ThemeProvider, { defaultTheme: 'dark' }],
  [AuthProvider],
  [I18nProvider, { locale: 'en' }],
  [NotificationProvider],
  [CartProvider],
);

 
// <AppProviders2><App /></AppProviders2>
```

 
### 3. Layout Components

 
```jsx
// ============================================
// LAYOUT — Reusable Layout Components
// ============================================

 
function PageLayout({ children, sidebar, breadcrumbs }) {
  return (
    <div className="page-layout">
      <Header />
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="content-area">
        {sidebar && <aside className="sidebar">{sidebar}</aside>}
        <main className="main-content">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

 
function Stack({ children, gap = 16, direction = 'vertical', align = 'stretch' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: direction === 'vertical' ? 'column' : 'row',
      gap: `${gap}px`,
      alignItems: align,
    }}>
      {children}
    </div>
  );
}

 
function Grid({ children, columns = 3, gap = 16, minWidth = '250px' }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
      gap: `${gap}px`,
    }}>
      {children}
    </div>
  );
}

 
// Usage
function ProductsPage() {
  return (
    <PageLayout
      sidebar={<CategoryFilter />}
      breadcrumbs={['Home', 'Products']}
    >
      <Stack gap={24}>
        <h1>Products</h1>
        <Grid columns={3} gap={20}>
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </Grid>
      </Stack>
    </PageLayout>
  );
}
```

 
---

 
## ⚡ Performance Patterns

 
```jsx
// ============================================
// MEMOIZATION — React.memo, useMemo, useCallback
// ============================================

 
// 1. React.memo — Prevent re-render if props haven't changed
const ExpensiveList = React.memo(function ExpensiveList({ items, onSelect }) {
  console.log("ExpensiveList rendered");

 
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onSelect(item)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}, (prevProps, nextProps) => {
  // Optional: Custom comparison
  return prevProps.items.length === nextProps.items.length &&
         prevProps.items.every((item, i) => item.id === nextProps.items[i].id);
});

 
// 2. useMemo — Cache expensive computations
function Dashboard({ transactions }) {
  const analytics = useMemo(() => {
    console.log("Computing analytics...");
    return {
      total: transactions.reduce((sum, t) => sum + t.amount, 0),
      average: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length,
      max: Math.max(...transactions.map(t => t.amount)),
      categories: Object.groupBy(transactions, t => t.category),
    };
  }, [transactions]);

 
  return <AnalyticsChart data={analytics} />;
}

 
// 3. useCallback — Stable function references
function Parent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

 
  // ❌ Bad — Creates new function every render, breaks child memo
  // const handleClick = (id) => { ... }

 
  // ✅ Good — Stable reference
  const handleClick = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

 
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ExpensiveList items={items} onSelect={handleClick} />
    </>
  );
}

 
// ============================================
// VIRTUALIZATION — Render only visible items
// ============================================

 
function useVirtualList({ items, itemHeight, containerHeight, overscan = 5 }) {
  const [scrollTop, setScrollTop] = useState(0);

 
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

 
  const visibleItems = items.slice(startIndex, endIndex).map((item, i) => ({
    ...item,
    style: {
      position: 'absolute',
      top: (startIndex + i) * itemHeight,
      height: itemHeight,
      width: '100%',
    },
  }));

 
  const totalHeight = items.length * itemHeight;

 
  const onScroll = (e) => setScrollTop(e.target.scrollTop);

 
  return { visibleItems, totalHeight, onScroll };
}

 
function VirtualList({ items, itemHeight = 50 }) {
  const containerRef = useRef();
  const { visibleItems, totalHeight, onScroll } = useVirtualList({
    items,
    itemHeight,
    containerHeight: 500,
  });

 
  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height: 500, overflow: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight }}>
        {visibleItems.map(item => (
          <div key={item.id} style={item.style}>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

 
// ============================================
// CODE SPLITTING — React.lazy
// ============================================

 
import { lazy, Suspense } from 'react';

 
// Lazy load heavy components
const HeavyChart = lazy(() => import('./components/HeavyChart'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

 
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/charts" element={<HeavyChart />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}
```

 
---

 
## 🔴 Advanced Patterns

 
### 1. Error Boundary Pattern

 
```jsx
// ============================================
// ERROR BOUNDARY — Catch & Handle Render Errors
// ============================================

 
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

 
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

 
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to monitoring service
    // errorReportingService.log(error, errorInfo);
  }

 
  render() {
    if (this.state.hasError) {
      return this.props.fallback
        ? this.props.fallback(this.state.error, () => this.setState({ hasError: false }))
        : (
          <div className="error-boundary">
            <h2>Something went wrong 😵</h2>
            <pre>{this.state.error?.message}</pre>
            <button onClick={() => this.setState({ hasError: false })}>
              Try Again
            </button>
          </div>
        );
    }

 
    return this.props.children;
  }
}

 
// Usage
function App() {
  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={retry}>Retry</button>
        </div>
      )}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```
### 2. Portal Pattern

 
```jsx
// ============================================
// PORTAL — Render outside parent DOM hierarchy
// ============================================

 
import { createPortal } from 'react-dom';

 
function TooltipPortal({ children, position }) {
  return createPortal(
    <div
      className="tooltip"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.getElementById('tooltip-root')
  );
}

 
function Tooltip({ content, children }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef();

 
  const handleMouseEnter = () => {
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom + 8 });
    setShow(true);
  };

 
  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </span>
      {show && <TooltipPortal position={position}>{content}</TooltipPortal>}
    </>
  );
}

 
// Usage
// <Tooltip content="This is a tooltip!">Hover me</Tooltip>
```

 
---

 
## 🏗️ Real-World Architecture Patterns

 
### Feature-based Folder Structure

 
```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── SignupForm.jsx
│   │   │   └── AuthGuard.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── usePermissions.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── api/
│   │   │   └── authApi.js
│   │   ├── utils/
│   │   │   └── tokenUtils.js
│   │   └── index.js          ← Public API barrel file
│   │
│   ├── products/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── index.js
│   │
│   └── cart/
│       ├── components/
│       ├── hooks/
│       ├── context/
│       └── index.js
│
├── shared/
│   ├── components/           ← Reusable UI (Button, Modal, Input)
│   ├── hooks/                ← Generic hooks (useDebounce, useFetch)
│   ├── utils/                ← Helpers (formatDate, formatCurrency)
│   └── constants/
│
├── layouts/
│   ├── MainLayout.jsx
│   ├── AuthLayout.jsx
│   └── AdminLayout.jsx
│
├── pages/                    ← Route-level components
│   ├── Home.jsx
│   ├── Products.jsx
│   └── Dashboard.jsx
│
├── App.jsx
└── main.jsx
```

 
### Barrel Exports Pattern

 
```jsx
// features/auth/index.js — PUBLIC API
// Only export what other features should use

 
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
export { AuthGuard } from './components/AuthGuard';
export { useAuth } from './hooks/useAuth';
export { AuthProvider } from './context/AuthContext';

 
// DON'T export internal implementation details!

 
// Usage in other features:
// import { useAuth, AuthGuard } from '@/features/auth';
```

 
---

 
## 🧠 React Pattern Selection Guide

 
| Problem | Pattern | Modern Alternative |
|---------|---------|-------------------|
| Separate logic from UI | Container/Presentational | Custom Hooks |
| Share logic between components | HOC | Custom Hooks |
| Dynamic rendering based on state | Render Props | Custom Hooks |
| Components that work together | Compound Components | — (still best) |
| Form state management | Controlled Components | React Hook Form |
| Global state | Context + useReducer | Zustand / Jotai |
| Expensive renders | React.memo + useMemo | React Compiler |
| Heavy components | Code Splitting (lazy) | — |
| Render errors | Error Boundary | — |
| Render outside DOM tree | Portal | — |
| Flexible layouts | Slot / Layout Components | — |
| State-dependent UI | State Machine | XState / Zustand |

 
---

 