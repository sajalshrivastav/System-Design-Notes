# Frontend System Design — Day 24
## Topic: REST API Design & Consumption

> **Study time:** 1 hour | **Phase:** 4 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Asked at EVERY company — design patterns critical)

---

## The Big Picture

REST APIs are the backbone of modern web apps. But "calling an API" is 10% of the work. The hard 90%:

```
ERROR HANDLING:     Network fails, 500s, 429 rate limits, timeout
LOADING STATES:     Skeleton, spinner, optimistic updates
CACHING:            When to cache, when to invalidate, stale data
RACE CONDITIONS:    User types fast, 3 requests in flight, which wins?
RETRIES:            Exponential backoff, idempotency, circuit breaker
PAGINATION:         Cursor vs offset, infinite scroll, prefetch
VERSIONING:         /v1/ vs /v2/, breaking changes, migration
INTERCEPTORS:       Auth tokens, logging, error tracking, retry logic
```

Getting this right = smooth UX. Getting it wrong = loading spinners, stale data, confused users.

---

## Part 1 — REST Fundamentals from Frontend POV

### HTTP Methods — What They Mean for Frontend

```
GET     → Fetch data. Safe, idempotent, cacheable
          Example: GET /api/claims?status=pending

POST    → Create new resource. NOT idempotent (repeat = duplicates)
          Example: POST /api/claims { claimData }
          Returns: 201 Created + Location header

PUT     → Replace entire resource. Idempotent (repeat = same result)
          Example: PUT /api/claims/123 { updatedClaimData }
          All fields required, missing ones = deleted

PATCH   → Partial update. Should be idempotent
          Example: PATCH /api/claims/123 { status: "approved" }
          Only changed fields sent

DELETE  → Remove resource. Idempotent
          Example: DELETE /api/claims/123
          Returns: 204 No Content or 200 with confirmation
```

### Idempotency — Critical Concept

```javascript
// NON-IDEMPOTENT — dangerous to retry
POST /api/claims { amount: 10000 }
// Retry on network timeout → creates duplicate claim!

// IDEMPOTENT — safe to retry
PUT /api/claims/123 { amount: 10000 }
// Retry 10 times → still just updates claim 123

// Frontend pattern: use idempotency keys for POST
POST /api/claims
Headers: { 'Idempotency-Key': 'claim_abc123' }
Body: { amount: 10000 }
// Server deduplicates based on key
// Safe to retry — same key = same claim
```

### Status Codes — What Frontend Should Do

```
2xx Success:
  200 OK              → Show data, cache if GET
  201 Created         → Show success, redirect to new resource
  204 No Content      → Show success, no response body

3xx Redirects:
  301 Moved Permanently → Update bookmarks, follow redirect
  302 Found           → Follow redirect, don't cache
  304 Not Modified    → Use cached version (ETag match)

4xx Client Errors:
  400 Bad Request     → Show validation errors from response
  401 Unauthorized    → Redirect to login, refresh token
  403 Forbidden       → Show "no permission" message
  404 Not Found       → Show "not found" page
  422 Unprocessable   → Show field-level validation errors
  429 Too Many Requests → Retry with exponential backoff

5xx Server Errors:
  500 Internal Error  → Show generic error, log to Sentry, retry
  502 Bad Gateway     → Retry with backoff (upstream service down)
  503 Service Unavailable → Show maintenance message, retry
  504 Gateway Timeout → Retry with backoff
```

---

## Part 2 — API Client Architecture

### The Problem with Inline Fetch

```javascript
// WRONG — scattered throughout components
function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  
  useEffect(() => {
    fetch('/api/claims')
      .then(r => r.json())
      .then(setClaims);
  }, []);
  // Problems:
  // - No error handling
  // - No loading state
  // - No auth token
  // - No retry logic
  // - No caching
  // - Duplicated in every component
}
```

### Solution: Centralized API Client

```typescript
// api/client.ts — single source of truth
class ApiClient {
  private baseURL: string;
  private getAuthToken: () => string | null;

  constructor(config: { baseURL: string; getAuthToken: () => string | null }) {
    this.baseURL = config.baseURL;
    this.getAuthToken = config.getAuthToken;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle non-OK responses
      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null as T;
      }

      return await response.json();
    } catch (error) {
      // Network errors, timeout, etc.
      if (error instanceof TypeError) {
        throw new NetworkError('Network request failed');
      }
      throw error;
    }
  }

  private async handleErrorResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    let errorData: any = {};

    if (contentType?.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData = { message: await response.text() };
    }

    switch (response.status) {
      case 400:
        return new ValidationError(errorData.message, errorData.errors);
      case 401:
        return new AuthError('Unauthorized');
      case 403:
        return new ForbiddenError('Forbidden');
      case 404:
        return new NotFoundError('Resource not found');
      case 422:
        return new ValidationError(errorData.message, errorData.errors);
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        return new RateLimitError('Too many requests', retryAfter);
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError('Server error', response.status);
      default:
        return new ApiError('Unknown error', response.status);
    }
  }

  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Custom error classes
class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 422);
    this.name = 'ValidationError';
  }
}

class AuthError extends ApiError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Export singleton
export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  getAuthToken: () => localStorage.getItem('authToken'),
});
```

### Using the API Client

```typescript
// api/claims.ts — domain-specific API functions
import { apiClient } from './client';

export interface Claim {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export const claimsApi = {
  getAll: (params?: { status?: string; page?: number }) =>
    apiClient.get<Claim[]>('/claims', { params }),

  getById: (id: string) =>
    apiClient.get<Claim>(`/claims/${id}`),

  create: (data: Omit<Claim, 'id' | 'submittedAt'>) =>
    apiClient.post<Claim>('/claims', data),

  update: (id: string, data: Partial<Claim>) =>
    apiClient.patch<Claim>(`/claims/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/claims/${id}`),
};

// In component
import { claimsApi } from '@/api/claims';

function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    claimsApi
      .getAll({ status: 'pending' })
      .then(setClaims)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  
  return <ClaimsList claims={claims} />;
}
```

---

## Part 3 — Request Interceptors

### Axios-Style Interceptors for Fetch

```typescript
// api/interceptors.ts
type Interceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class ApiClient {
  private requestInterceptors: Interceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  useRequestInterceptor(interceptor: Interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  useResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let config = { ...options };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    let response = await fetch(`${this.baseURL}${endpoint}`, config);

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    return response.status === 204 ? null : await response.json();
  }
}

// Example interceptors

// 1. Auth token refresh interceptor
apiClient.useResponseInterceptor(async (response) => {
  if (response.status === 401) {
    // Try to refresh token
    const newToken = await refreshAuthToken();
    if (newToken) {
      // Retry original request with new token
      const originalRequest = response.clone();
      return fetch(originalRequest.url, {
        ...originalRequest,
        headers: {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
    // Refresh failed → redirect to login
    window.location.href = '/login';
  }
  return response;
});

// 2. Logging interceptor
apiClient.useRequestInterceptor((config) => {
  console.log(`[API] ${config.method} ${config.url}`);
  return config;
});

apiClient.useResponseInterceptor((response) => {
  console.log(`[API] ${response.status} ${response.url}`);
  return response;
});

// 3. Error tracking interceptor (Sentry)
apiClient.useResponseInterceptor((response) => {
  if (response.status >= 500) {
    Sentry.captureException(new Error(`API Error: ${response.status}`), {
      extra: { url: response.url, status: response.status },
    });
  }
  return response;
});

// 4. Request ID for tracing
apiClient.useRequestInterceptor((config) => {
  const requestId = crypto.randomUUID();
  config.headers = {
    ...config.headers,
    'X-Request-ID': requestId,
  };
  return config;
});
```

---

## Part 4 — Retry Logic & Error Recovery

### Exponential Backoff

```typescript
// utils/retry.ts
interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => error instanceof ServerError || error instanceof NetworkError,
  } = options;

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      // Don't retry on client errors (4xx)
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Last attempt → throw
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Calculate backoff: exponential with jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage in API client
class ApiClient {
  async requestWithRetry<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return retryWithBackoff(
      () => this.request<T>(endpoint, options),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        shouldRetry: (error, attempt) => {
          // Retry on 5xx and network errors
          if (error instanceof ServerError || error instanceof NetworkError) {
            return true;
          }
          // Retry on 429 if Retry-After header is present
          if (error instanceof RateLimitError && error.retryAfter) {
            return attempt < 2; // Max 2 retries for rate limits
          }
          return false;
        },
      }
    );
  }
}

// In component
const submitClaim = async (data: ClaimData) => {
  try {
    await apiClient.requestWithRetry('/claims', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    showSuccess('Claim submitted');
  } catch (error) {
    showError('Failed to submit claim');
  }
};
```

### Circuit Breaker Pattern

```typescript
// utils/circuit-breaker.ts
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private failureThreshold: number = 5,    // Open after 5 failures
    private successThreshold: number = 2,    // Close after 2 successes
    private timeout: number = 60000          // Wait 60s before retry
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout elapsed
      if (Date.now() - this.lastFailureTime! < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Timeout elapsed → try again
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        console.log('Circuit breaker CLOSED');
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log('Circuit breaker OPEN');
    }
  }

  getState() {
    return this.state;
  }
}

// Usage
const claimsBreaker = new CircuitBreaker(5, 2, 60000);

apiClient.useResponseInterceptor(async (response) => {
  if (response.url.includes('/claims') && response.status >= 500) {
    await claimsBreaker.execute(() => Promise.reject(new ServerError()));
  }
  return response;
});
```

---

## Part 5 — Pagination Strategies

### Offset-Based Pagination

```typescript
// Good for: static data, jump to page N, small datasets
// Bad for: real-time data (items shift between pages)

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// API call
GET /api/claims?page=2&perPage=20

// Response
{
  "data": [ /* 20 claims */ ],
  "pagination": {
    "page": 2,
    "perPage": 20,
    "total": 250,
    "totalPages": 13
  }
}

// React implementation
function usePaginatedClaims() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Claim> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    claimsApi
      .getAll({ page, perPage: 20 })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page]);

  return {
    claims: data?.data ?? [],
    page,
    totalPages: data?.pagination.totalPages ?? 0,
    loading,
    nextPage: () => setPage(p => p + 1),
    prevPage: () => setPage(p => Math.max(1, p - 1)),
    goToPage: setPage,
  };
}

// Component
function ClaimsList() {
  const { claims, page, totalPages, loading, nextPage, prevPage } = usePaginatedClaims();

  return (
    <>
      {loading && <Spinner />}
      <table>
        {claims.map(claim => <ClaimRow key={claim.id} claim={claim} />)}
      </table>
      <Pagination>
        <button onClick={prevPage} disabled={page === 1}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={nextPage} disabled={page === totalPages}>Next</button>
      </Pagination>
    </>
  );
}
```

### Cursor-Based Pagination

```typescript
// Good for: real-time data, infinite scroll, large datasets
// Bad for: jump to page N (no random access)

interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
  };
}

// API call
GET /api/claims?cursor=eyJpZCI6MTIzfQ==&limit=20

// Response
{
  "data": [ /* 20 claims */ ],
  "pagination": {
    "nextCursor": "eyJpZCI6MTQzfQ==",
    "prevCursor": "eyJpZCI6MTAzfQ==",
    "hasMore": true
  }
}

// Infinite scroll implementation
function useInfiniteScroll<T>(
  fetchFn: (cursor: string | null) => Promise<CursorPaginatedResponse<T>>
) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetchFn(cursor);
      setItems(prev => [...prev, ...response.data]);
      setCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, fetchFn]);

  return { items, loading, hasMore, loadMore };
}

// Component with Intersection Observer
function InfiniteClaimsList() {
  const { items, loading, hasMore, loadMore } = useInfiniteScroll(
    (cursor) => claimsApi.getAll({ cursor, limit: 20 })
  );

  const observerRef = useRef<IntersectionObserver>();
  const lastItemRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, loadMore]);

  return (
    <div>
      {items.map((claim, index) => (
        <ClaimRow
          key={claim.id}
          claim={claim}
          ref={index === items.length - 1 ? lastItemRef : null}
        />
      ))}
      {loading && <Spinner />}
      {!hasMore && <div>No more claims</div>}
    </div>
  );
}
```

---

## Part 6 — Optimistic Updates

### The Pattern

```typescript
// Problem: user clicks "like" → wait 500ms for API → button updates
// Solution: update UI immediately, revert if API fails

function useLikeClaim(claimId: string) {
  const [liked, setLiked] = useState(false);
  const [optimisticLike, setOptimisticLike] = useState<boolean | null>(null);

  const toggleLike = async () => {
    // 1. Optimistically update UI
    const newLiked = !liked;
    setOptimisticLike(newLiked);

    try {
      // 2. Make API call
      await claimsApi.toggleLike(claimId, newLiked);
      // 3. Success → commit optimistic state
      setLiked(newLiked);
      setOptimisticLike(null);
    } catch (error) {
      // 4. Failure → revert optimistic state
      setOptimisticLike(null);
      showError('Failed to update like');
    }
  };

  // Display optimistic value if present, else actual value
  const displayLiked = optimisticLike !== null ? optimisticLike : liked;

  return { liked: displayLiked, toggleLike };
}

// Component
function ClaimCard({ claim }: { claim: Claim }) {
  const { liked, toggleLike } = useLikeClaim(claim.id);

  return (
    <div>
      <h3>{claim.title}</h3>
      <button onClick={toggleLike}>
        {liked ? '❤️' : '🤍'}
      </button>
    </div>
  );
}
```

### Optimistic Updates with Rollback Queue

```typescript
// For complex state (list of items, not just boolean)
type OptimisticUpdate<T> = {
  id: string;
  rollback: () => void;
  data: T;
};

class OptimisticUpdateManager<T> {
  private updates = new Map<string, OptimisticUpdate<T>>();

  add(id: string, data: T, rollback: () => void) {
    this.updates.set(id, { id, data, rollback });
  }

  commit(id: string) {
    this.updates.delete(id);
  }

  rollback(id: string) {
    const update = this.updates.get(id);
    if (update) {
      update.rollback();
      this.updates.delete(id);
    }
  }

  rollbackAll() {
    this.updates.forEach(update => update.rollback());
    this.updates.clear();
  }
}

// Usage in claims list
function useClaimsList() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const optimisticManager = useRef(new OptimisticUpdateManager<Claim>()).current;

  const deleteClaim = async (id: string) => {
    // 1. Save original state for rollback
    const originalClaims = [...claims];
    const rollback = () => setClaims(originalClaims);

    // 2. Optimistically update UI
    setClaims(claims => claims.filter(c => c.id !== id));
    optimisticManager.add(id, claims.find(c => c.id === id)!, rollback);

    try {
      // 3. Make API call
      await claimsApi.delete(id);
      // 4. Success → commit
      optimisticManager.commit(id);
    } catch (error) {
      // 5. Failure → rollback
      optimisticManager.rollback(id);
      showError('Failed to delete claim');
    }
  };

  return { claims, deleteClaim };
}
```

---

## Part 7 — API Versioning from Frontend

### URL Versioning

```typescript
// /api/v1/claims vs /api/v2/claims

// config.ts
export const API_VERSION = 'v2';
export const API_BASE_URL = `/api/${API_VERSION}`;

// Support multiple versions during migration
const apiClientV1 = new ApiClient({ baseURL: '/api/v1' });
const apiClientV2 = new ApiClient({ baseURL: '/api/v2' });

// Feature flag for gradual rollout
const useV2 = featureFlags.get('api-v2-enabled');
const client = useV2 ? apiClientV2 : apiClientV1;
```

### Header Versioning

```typescript
// Single URL, version in header
// Accept: application/vnd.company.v2+json

apiClient.useRequestInterceptor((config) => {
  config.headers = {
    ...config.headers,
    Accept: 'application/vnd.company.v2+json',
  };
  return config;
});
```

### Handling Breaking Changes

```typescript
// Adapter pattern for version compatibility
interface ClaimV1 {
  id: string;
  claim_amount: number;        // snake_case
  submitted_date: string;
}

interface ClaimV2 {
  id: string;
  amount: number;               // camelCase, renamed
  submittedAt: string;          // renamed
  status: 'pending' | 'approved'; // new field
}

// Adapter transforms V1 response to V2 shape
function adaptClaimV1toV2(v1: ClaimV1): ClaimV2 {
  return {
    id: v1.id,
    amount: v1.claim_amount,
    submittedAt: v1.submitted_date,
    status: 'pending', // default for V1
  };
}

// Use adapter in API client
const claimsApi = {
  getAll: async (): Promise<ClaimV2[]> => {
    const version = getApiVersion();
    if (version === 'v1') {
      const v1Claims = await apiClientV1.get<ClaimV1[]>('/claims');
      return v1Claims.map(adaptClaimV1toV2);
    }
    return apiClientV2.get<ClaimV2[]>('/claims');
  },
};
```

---

## Interview Questions & Model Answers

### Q1: "How would you handle a race condition where a user types quickly in a search box and multiple API requests are in flight?"

```
There are three strategies, depending on requirements:

1. DEBOUNCING (most common for search):
   Wait until user stops typing for N ms before making request.
   
   const debouncedSearch = debounce((query: string) => {
     searchApi.search(query);
   }, 300);
   
   Good for: reducing API calls, most search UIs
   Trade-off: slight delay before search starts

2. REQUEST CANCELLATION (AbortController):
   Cancel previous request when new one starts.
   Only show results from the latest request.
   
   const abortController = useRef<AbortController>();
   
   const search = (query: string) => {
     // Cancel previous request
     abortController.current?.abort();
     abortController.current = new AbortController();
     
     fetch('/search', {
       signal: abortController.current.signal,
       body: JSON.stringify({ query })
     });
   };
   
   Good for: instant search, real-time updates
   Trade-off: more API calls

3. REQUEST SEQUENCING (ignore stale responses):
   Let all requests finish, but only show the latest result.
   
   const requestId = useRef(0);
   
   const search = async (query: string) => {
     const currentId = ++requestId.current;
     const results = await searchApi.search(query);
     
     // Ignore if newer request already completed
     if (currentId !== requestId.current) return;
     
     setResults(results);
   };
   
   Good for: when cancellation isn't supported
   Trade-off: wastes bandwidth on stale requests

For Digit's claim search, I'd use debouncing (300ms) + cancellation.
Debounce reduces API load, cancellation ensures we show latest results.
```

### Q2: "Your API returns 500 errors intermittently. How would you handle this?"

```
I'd implement a retry strategy with exponential backoff:

1. EXPONENTIAL BACKOFF:
   Retry after 1s, 2s, 4s, 8s (doubles each time)
   Add jitter (random 0-1000ms) to prevent thundering herd
   
   const delay = Math.min(
     1000 * Math.pow(2, attempt) + Math.random() * 1000,
     10000 // cap at 10s
   );

2. RETRY DECISION LOGIC:
   Only retry on:
   - 5xx errors (server issues)
   - Network errors (timeout, connection refused)
   
   Never retry on:
   - 4xx errors (client mistakes — retrying won't help)
   - POST without idempotency key (risk of duplicates)

3. CIRCUIT BREAKER:
   After 5 consecutive failures, stop retrying for 60s
   Prevents hammering a dead service
   Show "Service unavailable" message to user
   
   State: CLOSED → OPEN (failing) → HALF_OPEN (testing)

4. USER FEEDBACK:
   First retry: show nothing (user doesn't notice)
   Second retry: show toast "Retrying..."
   Third retry failed: show error with "Retry" button
   
   Let user manually retry after auto-retries exhausted.

5. MONITORING:
   Log all retries to Sentry with:
   - Endpoint
   - Attempt number
   - Error message
   - User ID (if applicable)
   
   Set up alerts if retry rate > 10% for any endpoint.

For Digit's claims API, I'd use maxAttempts=3, exponential backoff,
and circuit breaker. 500 errors are usually temporary (deployment,
upstream service restart), so retrying usually succeeds.
```

### Q3: "How would you design pagination for a claims list with 100,000 records?"

```
I'd use cursor-based pagination with infinite scroll:

1. WHY CURSOR OVER OFFSET:
   Offset-based breaks with real-time data:
   - User on page 2 (items 20-40)
   - New claim gets submitted (shifts all IDs)
   - User clicks "next" → sees duplicates or misses items
   
   Cursor-based is stable:
   - Cursor = "last seen ID + timestamp"
   - New claims don't affect cursor position
   - Always get next 20 items after cursor

2. API DESIGN:
   GET /api/claims?cursor=eyJpZCI6MTIzLCJ0cyI6MTY4MH0=&limit=20
   
   Response:
   {
     data: [...],
     pagination: {
       nextCursor: "eyJpZCI6MTQzLCJ0cyI6MTY4MH0=",
       hasMore: true
     }
   }
   
   Cursor is base64-encoded JSON: { id: 143, ts: 1680... }
   Backend decodes, queries WHERE id < 143 ORDER BY id DESC LIMIT 20

3. FRONTEND IMPLEMENTATION:
   - Infinite scroll with Intersection Observer
   - Load next page when user scrolls to bottom
   - Append new items to existing list
   - Virtual scrolling if list grows > 500 items
     (react-window renders only visible rows)

4. OPTIMIZATIONS:
   - Prefetch next page when user reaches 80% of current page
   - Cache pages in memory (keep last 3 pages)
   - Show skeleton loaders while loading
   - Debounce scroll events (check every 100ms, not every pixel)

5. EDGE CASES:
   - Empty state: "No claims yet"
   - End of list: "You've reached the end"
   - Error loading: "Failed to load. Retry?"
   - Slow connection: show loading spinner after 500ms

For Digit's claims list, cursor + infinite scroll is best.
Users rarely jump to page 50 (no need for page numbers).
They scroll down to find recent claims (cursor is perfect for this).
```

### Q4: "Explain idempotency and why it matters for frontend."

```
Idempotency means repeating an operation produces the same result.

IDEMPOTENT:
  GET  /claims/123       — read, no side effects
  PUT  /claims/123       — replace, same result if repeated
  DELETE /claims/123     — delete, still deleted if repeated
  PATCH /claims/123 { status: "approved" }
       — set to "approved", still "approved" if repeated

NON-IDEMPOTENT:
  POST /claims           — creates new claim each time!
  POST /claims/123/increment-view-count
       — increments each time (1, 2, 3...)

WHY IT MATTERS:
  Network is unreliable. Request might:
  1. Succeed but response gets lost (timeout)
  2. Take too long (user clicks "Submit" again)
  3. Fail temporarily (retry logic kicks in)

PROBLEM WITHOUT IDEMPOTENCY:
  User submits claim → network timeout
  User clicks "Submit" again → creates duplicate claim
  Retry logic tries 3 times → 3 duplicate claims!

SOLUTION — IDEMPOTENCY KEY:
  POST /claims
  Headers: { Idempotency-Key: "claim_abc123" }
  Body: { amount: 10000 }
  
  Server checks if it's seen this key before:
  - First time → create claim, store key
  - Repeat → return existing claim (don't create duplicate)
  
  Key = UUID or hash of request body + user ID + timestamp

FRONTEND IMPLEMENTATION:
  const submitClaim = async (data) => {
    const idempotencyKey = crypto.randomUUID();
    
    await apiClient.post('/claims', data, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
  };

  // Store key in component state to prevent accidental re-submission
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

For Digit's claim submission, idempotency prevents duplicate claims
if user's network is flaky or they double-click "Submit".
Server deduplicates based on key, safe to retry.
```

---

## Cheat Sheet

```
HTTP METHODS:
  GET     → fetch, idempotent, cacheable
  POST    → create, NOT idempotent (use idempotency key!)
  PUT     → replace entire resource, idempotent
  PATCH   → partial update, idempotent
  DELETE  → remove, idempotent

STATUS CODES:
  2xx → success, 201 for created, 204 for no content
  4xx → client error, show validation message, don't retry
  401 → refresh token or redirect to login
  429 → rate limit, retry with exponential backoff
  5xx → server error, retry with backoff, log to Sentry

API CLIENT ARCHITECTURE:
  Centralized client with interceptors
  Domain-specific API modules (claimsApi, usersApi)
  Custom error classes (ValidationError, NetworkError)
  Retry logic with exponential backoff + jitter
  Circuit breaker for cascading failures

RETRY LOGIC:
  Exponential backoff: 1s, 2s, 4s, 8s, capped at 10s
  Add jitter: +random(0-1000ms) to prevent thundering herd
  Only retry: 5xx, network errors
  Never retry: 4xx, POST without idempotency key

PAGINATION:
  Offset-based: page numbers, good for static data
    GET /claims?page=2&perPage=20
  Cursor-based: infinite scroll, good for real-time data
    GET /claims?cursor=xyz&limit=20
  Prefetch next page at 80% scroll for smooth UX

OPTIMISTIC UPDATES:
  1. Update UI immediately
  2. Make API call
  3. Success → commit, Failure → rollback
  Show error toast if rollback, let user retry

IDEMPOTENCY:
  POST with Idempotency-Key header prevents duplicates
  Safe to retry even if response lost
  Key = UUID or hash of request + user + timestamp

RACE CONDITIONS:
  Debounce: wait until user stops typing (300ms)
  Cancellation: AbortController cancels previous request
  Sequencing: ignore stale responses (requestId counter)

VERSIONING:
  URL: /api/v1/ vs /api/v2/
  Header: Accept: application/vnd.company.v2+json
  Adapter pattern to convert V1 → V2 response shape
```

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Idempotency** | Repeating operation produces same result (safe to retry) |
| **Idempotency Key** | Unique identifier to prevent duplicate POST requests |
| **Exponential Backoff** | Retry delay doubles each attempt (1s, 2s, 4s, 8s) |
| **Jitter** | Random delay added to backoff to prevent thundering herd |
| **Circuit Breaker** | Stop retrying after N failures, resume after timeout |
| **Thundering Herd** | Many clients retry simultaneously, overload server |
| **Optimistic Update** | Update UI before API confirms success |
| **Rollback** | Revert optimistic update if API fails |
| **Race Condition** | Multiple requests in flight, wrong one wins |
| **Debouncing** | Wait until user stops action before triggering (search) |
| **Throttling** | Limit action to once per N ms (scroll, resize) |
| **Request Cancellation** | Abort in-flight request (AbortController) |
| **Offset Pagination** | Page-based: ?page=2&perPage=20 |
| **Cursor Pagination** | Pointer-based: ?cursor=xyz&limit=20 |
| **Infinite Scroll** | Load more items as user scrolls (cursor pagination) |
| **Interceptor** | Middleware that runs before/after requests |
| **API Versioning** | /v1/ vs /v2/ or header-based version control |
| **Adapter Pattern** | Convert old API shape to new shape for compatibility |
| **Retry-After** | HTTP header indicating when to retry (429, 503) |
| **Stale Response** | Outdated response from earlier request |
| **Virtual Scrolling** | Render only visible items in long list (performance) |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 25** | GraphQL from Frontend POV | Queries, mutations, Apollo Client, N+1 problem |
| **Day 26** | WebSockets & Real-time | Live updates, reconnection, fallback strategies |
| **Day 27** | Offline-first & PWA | Service workers, background sync, app install |