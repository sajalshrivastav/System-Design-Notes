# ♿ Frontend System Design — Day 22
## Topic: Accessibility (a11y)

> **Study time:** 1 hour | **Phase:** 4 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐⭐ (Google, CRED, any product with public-facing pages)

---

## The Core Principle

Accessibility means your product works for everyone — keyboard-only
users, screen reader users, people with low vision, motor disabilities,
or cognitive differences.

```
THE BUSINESS CASE (relevant for India):
  → WCAG compliance required for government portals + financial products
  → 15% of the global population has some form of disability
  → Accessible code is almost always better code — semantic HTML,
    clear structure, logical focus order improve everyone's experience
  → axe-core violations in CI = same category as failing unit tests
```

---

## Part 1 — Semantic HTML (The Foundation)

### Why It Matters First

Semantic HTML gives browsers and screen readers meaning for free.
A `<button>` is automatically:
- Focusable via Tab key
- Activatable with Enter or Space
- Announced as "button" by screen readers
- Disabled correctly with the `disabled` attribute

A `<div onclick>` has none of this. You must manually add `tabIndex`,
keyboard handlers, and ARIA roles — and engineers forget at least one.

### Semantic Fixes

```html
<!-- WRONG — div soup -->
<div class="btn" onclick="submit()">Submit</div>
<div class="link" onclick="navigate()">View claim</div>
<div class="heading">Claims dashboard</div>

<!-- CORRECT — semantic elements -->
<button type="button" onclick="submit()">Submit</button>
<a href="/claims/1">View claim</a>
<h1>Claims dashboard</h1>
```

### Landmark Elements

```html
<!-- Screen reader users jump between landmarks with keyboard shortcuts -->
<header>                           <!-- role="banner" -->
  <nav aria-label="Main navigation"> <!-- role="navigation" -->
    ...
  </nav>
</header>

<main>                             <!-- role="main" — ONE per page -->
  <article>...</article>
  <aside aria-label="Filters">...</aside>  <!-- role="complementary" -->
</main>

<footer>...</footer>               <!-- role="contentinfo" -->

<!-- Label duplicate landmark types -->
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Breadcrumb">...</nav>
<!-- Without labels, SR hears "navigation" twice — confusing -->
```

### Heading Hierarchy

```html
<!-- ONE h1 per page — the page title -->
<!-- Never skip levels (h1 → h3 skips h2) -->
<!-- Never use headings for styling — use CSS for that -->

<h1>Claims dashboard</h1>
  <h2>Active claims</h2>
    <h3>Health claims</h3>
    <h3>Motor claims</h3>
  <h2>Resolved claims</h2>
```

---

## Part 2 — Keyboard Navigation

### The Rules

```
Tab         → next focusable element
Shift+Tab   → previous focusable element
Enter       → activate link or button
Space       → activate button, toggle checkbox
Arrow keys  → navigate within a widget (menu, tabs, radio group)
Escape      → dismiss dialog, close dropdown, cancel action
```

Every feature achievable by mouse must be achievable by keyboard alone.

### Focus Management

```javascript
// 1. Modal opens → move focus INTO modal
useEffect(() => {
  if (open) {
    // Small timeout ensures DOM is ready
    setTimeout(() => dialogRef.current?.focus(), 0);
  }
}, [open]);

// 2. Modal closes → return focus to the trigger button
const triggerRef = useRef(null);
useEffect(() => {
  if (!open) {
    triggerRef.current?.focus();
  }
}, [open]);

// 3. SPA route change → announce new page to screen readers
useEffect(() => {
  // Option A: focus the page heading
  document.getElementById('page-heading')?.focus();
  // Option B: update aria-live region
  announcer.textContent = `Navigated to ${pageTitle}`;
}, [location.pathname]);
```

### Focus Trap (Modal Pattern)

```javascript
function useFocusTrap(containerRef, isActive) {
  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;

      const focusable = [...container.querySelectorAll(focusableSelectors)];
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();        // wrap backwards to last
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();       // wrap forwards to first
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}
```

### Visible Focus Indicator

```css
/* NEVER DO THIS */
:focus { outline: none; }
button:focus { outline: 0; }

/* CORRECT — custom but always visible */
:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
  border-radius: 4px;
}
/* :focus-visible only applies during keyboard navigation
   not when clicking with mouse — eliminates the design complaint
   "focus rings look ugly on click" */
```

### Skip Navigation Link

```html
<!-- First interactive element in body -->
<!-- Allows keyboard users to skip repetitive nav -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<header>
  <nav>...20 navigation links...</nav>
</header>

<main id="main-content" tabindex="-1">
  <!-- tabindex="-1" makes it programmatically focusable -->
  <h1>Claims dashboard</h1>
</main>
```

```css
.skip-link {
  position: absolute;
  left: 1rem;
  top: 1rem;
  transform: translateY(-200%);  /* off-screen by default */
  transition: transform 0.2s;
  background: var(--color-brand);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  z-index: 9999;
}
.skip-link:focus {
  transform: translateY(0);      /* visible on focus */
}
```

---

## Part 3 — ARIA Patterns

### First Rule of ARIA

Don't use ARIA. Use semantic HTML first.
ARIA only fills gaps where native HTML can't express the semantics.
ARIA changes what screen readers announce — it does NOT add keyboard
behaviour, focus, or visual changes. You must handle those separately.

### Label Hierarchy

```html
<!-- aria-label: provide name when no visible text -->
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

<!-- aria-labelledby: point to visible text by ID -->
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm claim approval</h2>
</div>
<!-- SR announces: "Confirm claim approval, dialog" -->

<!-- aria-describedby: supplementary description -->
<input
  type="password"
  id="password"
  aria-describedby="pw-requirements"
/>
<p id="pw-requirements">Must be 8+ characters with one number</p>
<!-- SR reads label first, then reads the description -->
```

### Live Regions — Announcing Dynamic Changes

```html
<!-- polite: wait for user to finish, then announce -->
<div aria-live="polite" aria-atomic="true" id="status">
  <!-- Inject content dynamically when something changes -->
  <!-- e.g. "3 results found", "Changes saved" -->
</div>

<!-- assertive: interrupt immediately — use sparingly -->
<div role="alert" aria-live="assertive">
  <!-- "Session expired" — needs immediate attention -->
</div>

<!-- role="status" for non-urgent status updates -->
<div role="status">
  Showing 42 results
</div>
```

```javascript
// The element must exist in DOM on page load
// Inject text to trigger announcement
function announce(message, priority = 'polite') {
  const el = document.getElementById(
    priority === 'assertive' ? 'alert-region' : 'status-region'
  );
  el.textContent = '';
  // Small delay ensures SR picks up the change
  setTimeout(() => { el.textContent = message; }, 100);
}

// Usage
announce('Claim #1001 approved successfully');
announce('Session expired. Please log in again.', 'assertive');
```

### Common ARIA Patterns

```html
<!-- Toggle/pressed button -->
<button aria-pressed={isExpanded} onClick={toggle}>
  Show details
</button>
<!-- SR: "Show details, toggle button, pressed" / "not pressed" -->

<!-- Expandable accordion -->
<button
  aria-expanded={isOpen}
  aria-controls="section-content"
>
  Claim history
</button>
<div id="section-content" hidden={!isOpen}>
  ...
</div>

<!-- Loading button -->
<button aria-busy={isLoading} disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save claim'}
</button>

<!-- Badge notification count -->
<button>
  Notifications
  <span aria-label="3 unread notifications">3</span>
</button>

<!-- Decorative icons — hide from SR -->
<span aria-hidden="true"><SaveIcon /></span>

<!-- Icon-only button — must have accessible name -->
<button aria-label="Delete claim #1001">
  <TrashIcon aria-hidden="true" />
</button>
```

---

## Part 4 — Accessible Forms

### Complete Form Field Pattern

```jsx
function FormField({ id, label, type = 'text', required, hint, error, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      <input
        id={id}
        type={type}
        aria-required={required}
        aria-invalid={!!error}                  // true when validation fails
        aria-describedby={
          error ? `${id}-error` :
          hint  ? `${id}-hint`  : undefined
        }
        {...props}
      />

      {hint && !error && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"                           // announced immediately
          className="error"
        >
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
```

### Error Summary on Submit

```jsx
function Form() {
  const errorSummaryRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validate(formData);
    setErrors(validation);
    setSubmitted(true);

    if (Object.keys(validation).length === 0) {
      submitForm();
    }
  };

  // Move focus to error summary when errors appear
  useEffect(() => {
    if (submitted && Object.keys(errors).length > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [submitted, errors]);

  const errorList = Object.entries(errors);

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}                          // programmatically focusable
          role="alert"
          aria-labelledby="error-heading"
        >
          <h2 id="error-heading">
            {errorList.length} error{errorList.length !== 1 ? 's' : ''} found
          </h2>
          <ul>
            {errorList.map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`}>{message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* form fields */}
    </form>
  );
}
```

### Color Contrast — Numbers to Know

```
WCAG AA (minimum required):
  Normal text (< 18pt / 14pt bold):  4.5 : 1
  Large text (≥ 18pt / 14pt bold):   3.0 : 1
  UI components, focus indicators:   3.0 : 1

WCAG AAA (enhanced — aim for financial/insurance apps):
  Normal text:   7.0 : 1
  Large text:    4.5 : 1

Common failures in the wild:
  #999999 on #ffffff  = 2.85:1  ✗ (fails AA)
  #aaaaaa on #ffffff  = 2.32:1  ✗ (placeholder text often fails)
  Light blue on white = often fails for small text

Tools:
  Chrome DevTools → CSS Overview → Colors section
  axe DevTools extension (browser)
  Colour Contrast Analyser (free desktop app)
```

---

## Part 5 — Testing Tools

### Automated (catch ~57% of issues)

```javascript
// jest-axe — unit test level
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('ClaimCard has no accessibility violations', async () => {
  const { container } = render(
    <ClaimCard
      claim={{ id: '1', title: 'Health claim', status: 'approved' }}
    />
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Playwright + axe — integration test level
import { checkA11y } from 'axe-playwright';

test('Claims page is accessible', async ({ page }) => {
  await page.goto('/claims');
  await checkA11y(page, undefined, {
    axeOptions: { runOnly: ['wcag2a', 'wcag2aa'] }
  });
});
```

### What Automated Tools Miss (Manual Testing Required)

```
→ Logical focus order — Tab through the page sequentially
→ Focus trap correctness — does Tab stay inside modals?
→ Screen reader flow — do announcements make sense in context?
→ Error announcement timing — are errors announced when they appear?
→ Keyboard shortcut conflicts — do they clash with screen reader shortcuts?
→ Cognitive clarity — are error messages actionable?
→ Reduced motion — does @media (prefers-reduced-motion) work?
```

### Quick Manual Test Checklist

```
1. Unplug your mouse → Tab through the entire feature
   ✓ Can you complete every action?
   ✓ Is focus always visible?
   ✓ Does focus order match reading order?

2. Turn on VoiceOver (Cmd+F5 Mac) or NVDA (Windows)
   ✓ Does it announce headings, buttons, form labels?
   ✓ Are icons labelled or hidden?
   ✓ Do error messages get announced?

3. Zoom browser to 200%
   ✓ Does layout stay intact?
   ✓ Is all text still readable (no overflow)?

4. Check Chrome DevTools → CSS Overview → Colors
   ✓ Any red contrast failures?
```

---

## Interview Questions & Model Answers

### Q1: "How would you make a custom dropdown accessible?"

```
A custom dropdown needs to replicate what the native <select>
provides for free: keyboard navigation, ARIA roles, and focus management.

Structure:
  <div role="combobox" aria-expanded={open} aria-haspopup="listbox"
       aria-controls="dropdown-list">
    <button aria-label="Select claim type" onClick={toggle}>
      {selectedLabel}
    </button>
  </div>
  <ul id="dropdown-list" role="listbox" aria-label="Claim type">
    {options.map(opt => (
      <li role="option" aria-selected={opt.value === value}
          id={`option-${opt.value}`} key={opt.value}
          onClick={() => select(opt.value)}>
        {opt.label}
      </li>
    ))}
  </ul>

Keyboard behaviour:
  Enter/Space on trigger → open, focus first option
  Arrow Down/Up → move through options
  Enter → select focused option, close, return focus to trigger
  Escape → close, return focus to trigger
  Tab → close, move to next element

This is the ARIA Authoring Practices pattern for a "select-only combobox".
In practice I'd use Radix UI's Select — it handles all of this correctly
and is extensively tested with screen readers.
```

### Q2: "What is aria-live and when would you use it?"

```
aria-live creates a "live region" — the screen reader monitors it and
automatically announces changes to its content without the user
navigating to it.

Two politeness levels:
  polite: waits until the user is idle before announcing
          Use for: save confirmations, filter result counts,
          progress updates — anything non-urgent
  
  assertive: interrupts the user immediately
             Use for: session timeouts, critical errors
             Use sparingly — interruptions are disruptive

Common usage in a claims app:
  Search results: <div aria-live="polite">42 claims found</div>
  Save status:    <div aria-live="polite">Changes saved</div>
  Error alert:    <div role="alert">Session expired</div>
                  (role="alert" is shorthand for aria-live="assertive")

Key implementation detail: the live region element must exist in the DOM
before you inject content. Create an empty <div aria-live="polite"> on
page load, then update its textContent when something changes.
```

### Q3: "How do you test accessibility in your CI/CD pipeline?"

```
I use a layered approach:

1. axe-core in Jest unit tests — catches violations at component level
   on every commit. jest-axe wraps axe-core with a toHaveNoViolations
   matcher. Any component with a missing label, bad contrast, or wrong
   ARIA fails the test.

2. axe in Playwright/Cypress integration tests — tests full page a11y
   including dynamic state. Catches issues that only appear after
   interaction (modal opened, form submitted with errors, etc.)

3. Lighthouse in CI — lighthouse-ci GitHub Action checks the a11y score
   on every PR. We set a minimum score threshold of 90.

4. Manual testing on each feature before release:
   Tab-only navigation, VoiceOver, 200% zoom, contrast check.

The honest caveat: automated tools catch about 57% of WCAG issues.
The rest — focus order logic, screen reader announcement quality,
keyboard interaction correctness — require manual testing.
axe in CI is a floor, not a ceiling.
```

---

## Cheat Sheet

```
SEMANTIC HTML FIRST:
  <button> not <div onclick>
  <a href> not <div onclick>
  One <h1> per page, never skip heading levels
  Landmark elements: <header>, <main>, <nav>, <footer>

KEYBOARD NAVIGATION:
  Every mouse action = keyboard action
  Focus trap in modals (Tab cycles within)
  Return focus to trigger when modal closes
  Skip link as first element in body
  Never remove :focus outline — use :focus-visible instead

ARIA ESSENTIALS:
  aria-label: name for icon-only buttons
  aria-labelledby: point dialog to its title
  aria-describedby: associate hint/error with input
  aria-live="polite": announce status updates
  role="alert": announce errors immediately
  aria-hidden="true": hide decorative icons from SR
  aria-expanded: accordion/dropdown open state
  aria-invalid: form field has validation error

FORMS:
  Every <input> must have a <label> via for/id
  aria-required for required fields
  aria-invalid="true" when validation fails
  aria-describedby points to error message element
  Error summary at top of form on submit, focus moves there

CONTRAST:
  Normal text: 4.5:1 minimum (WCAG AA)
  Large text: 3:1 minimum
  Never color-alone for meaning (pair with icon/text)

TESTING:
  jest-axe in unit tests (automated)
  axe in Playwright (integration)
  Manual: Tab navigation, VoiceOver, 200% zoom
  Automated tools catch ~57% — manual required for the rest
```

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **WCAG** | Web Content Accessibility Guidelines — the standard |
| **POUR** | WCAG principles: Perceivable, Operable, Understandable, Robust |
| **WCAG AA** | Minimum compliance level — 4.5:1 contrast for text |
| **WCAG AAA** | Enhanced level — 7:1 contrast, harder to achieve |
| **Screen reader** | Software that reads page content aloud (NVDA, VoiceOver) |
| **Landmark** | HTML5 sectioning element (`<main>`, `<nav>`, `<header>`) |
| **Focus trap** | Confining Tab navigation within a modal/dialog |
| **Skip link** | First element — allows jumping past repeated nav |
| **aria-label** | Provides accessible name when no visible text exists |
| **aria-labelledby** | Associates element with visible text label via ID |
| **aria-describedby** | Associates element with supplementary description |
| **aria-live** | Region that auto-announces dynamic content changes |
| **aria-hidden** | Hides element from assistive technology |
| **aria-invalid** | Marks a form field as having a validation error |
| **aria-expanded** | Indicates whether a collapsible element is open |
| **aria-pressed** | Indicates toggle button state |
| **aria-busy** | Indicates element is loading/updating |
| **role="alert"** | Announces content immediately (assertive live region) |
| **role="status"** | Announces content politely (non-urgent updates) |
| **:focus-visible** | CSS pseudo-class — only shows focus ring for keyboard nav |
| **axe-core** | Industry-standard automated a11y testing engine |
| **jest-axe** | axe-core wrapper for React component unit testing |
| **.sr-only** | CSS class — hidden visually, readable by screen readers |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 23** | Internationalization (i18n) | Multi-language, RTL, locale formatting |
| **Day 24** | REST & GraphQL APIs | API design, caching, optimistic updates |
| **Day 25** | WebSockets & real-time | Live data, polling vs push |
