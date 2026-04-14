# 🎨 Frontend System Design — Day 20
## Topic: Design Systems

> **Study time:** 1 hour | **Phase:** 3 of 5 | **Difficulty:** Intermediate → Advanced
> **Interview frequency:** ⭐⭐⭐⭐ (CRED, Razorpay, Flipkart — senior roles that own shared components)

---

## The Big Picture

A design system is NOT a component library.

```
Component library:  collection of UI building blocks
Design system:      single source of truth for how a product looks,
                    feels, and behaves — includes tokens, component
                    APIs, accessibility standards, documentation,
                    and the governance process that keeps it consistent
```

A design system solves three problems simultaneously:
1. Visual consistency across teams
2. Accessibility without each team re-implementing it
3. Speed — teams assemble from components instead of building from scratch

---

## Part 1 — Design Tokens

### What They Are

Design tokens are named variables that store design decisions.
They replace hardcoded values and create a shared language between
designers and engineers.

```
WITHOUT TOKENS:
  .button  { background: #3B82F6; }
  .link    { color: #3B82F6; }
  .badge   { border-color: #3B82F6; }
  /* Brand refresh → find/replace across entire codebase */

WITH TOKENS:
  --color-brand: #3B82F6;
  .button  { background: var(--color-brand); }
  .link    { color: var(--color-brand); }
  .badge   { border-color: var(--color-brand); }
  /* Brand refresh → change --color-brand once → everything updates */
```

### The 3-Layer Token Architecture

```
LAYER 1 — PRIMITIVE TOKENS (raw values)
  The complete palette. Named by value, not meaning.
  --blue-500: #3B82F6
  --gray-100: #F3F4F6
  --space-4:  16px
  --radius-md: 8px

LAYER 2 — SEMANTIC TOKENS (meaning)
  Map primitives to purpose. What components consume.
  --color-primary:   var(--blue-500)
  --color-surface:   var(--gray-100)
  --space-component: var(--space-4)

LAYER 3 — COMPONENT TOKENS (optional)
  Component-specific mappings. Useful when one component
  needs to override the semantic default.
  --button-bg:     var(--color-primary)
  --button-radius: var(--radius-md)
```

### Why Layering Matters

```css
/* Dark mode — ONLY redefine semantic layer */
:root {
  --blue-500: #3B82F6;          /* primitive — stays */
  --color-primary: var(--blue-500); /* semantic */
}
[data-theme="dark"] {
  --color-primary: #60A5FA;     /* lighter blue for dark bg */
  /* Don't change --blue-500 — it's still that exact hex */
  /* Change MEANING of "primary" without changing the primitive */
}

/* Multi-brand — swap semantic tokens */
[data-brand="razorpay"] { --color-primary: #2D68F0; }
[data-brand="flipkart"]  { --color-primary: #2874F0; }
[data-brand="digit"]     { --color-primary: #0B7BFF; }

/* Components never change — they reference semantic tokens */
.button { background: var(--color-primary); }
```

### Style Dictionary — Token Toolchain

```javascript
// tokens/color.json (single source of truth)
{
  "color": {
    "blue": { "500": { "value": "#3B82F6" } },
    "primary": { "value": "{color.blue.500}" }
  }
}

// Style Dictionary generates multiple outputs from one source:
// CSS:     --color-primary: #3B82F6;
// JS:      export const colorPrimary = '#3B82F6';
// iOS:     let colorPrimary = UIColor(red: 0.23, ...)
// Android: <color name="color_primary">#3B82F6</color>

// Integration with Figma Variables:
// Figma Variables → exported as JSON → Style Dictionary → code
// Designers and engineers share the same token names
```

---

## Part 2 — Component API Design

### Principles That Make APIs Last

```
1. SEMANTIC OVER IMPLEMENTATION
   variant="destructive" not color="red"
   Intent is clear; implementation can change without breaking API

2. COMPOSABILITY OVER CONFIGURATION
   Accept children/slots, not 15 props
   Compound components > monolithic configuration

3. PROGRESSIVE DISCLOSURE
   Simple API for common case, escape hatches for edge cases
   <Button> works with zero configuration
   <Button asChild leftIcon={...}> for complex cases

4. CONSISTENT NAMING
   size, variant, disabled across ALL components
   Button size="sm" and Input size="sm" accept same values
```

### Button API Evolution

```jsx
// v1 — implementation-specific, breaks when design changes
<Button blueBackground roundedCorners size={16} />

// v2 — semantic, stable
<Button variant="primary" size="md" />

// v3 — composable, accessible, production-ready
<Button
  variant="primary"     // primary | secondary | ghost | destructive
  size="md"             // sm | md | lg | xl
  isLoading={saving}    // shows spinner, disables, sets aria-busy
  disabled={!isValid}
  leftIcon={<SaveIcon />}
  onClick={handleSave}
  type="button"         // prevent accidental form submit
>
  Save claim
</Button>
```

### The Polymorphic Component Pattern

```jsx
// Problem: Button styles needed on non-button elements
// e.g. navigation links that look like buttons

// "as" prop (simpler but worse TypeScript)
<Button as="a" href="/claims">View claims</Button>

// Radix "asChild" (better type safety — recommended)
<Button asChild>
  <Link href="/claims">  {/* Link handles routing */}
    View claims          {/* Button provides styles + a11y */}
  </Link>
</Button>

// Angular equivalent — directive approach
// Apply button behaviour to any HTML element
<a routerLink="/claims" appButton variant="primary">
  View claims
</a>
```

### Avoiding the Props Explosion Anti-Pattern

```jsx
// BAD — every edge case becomes a new prop
<Card
  title="Claim #1001"
  subtitle="Health Insurance"
  icon={<ClaimIcon />}
  badge="Approved"
  badgeColor="green"
  footerText="Updated 2h ago"
  footerAction={<button>View</button>}
  onCardClick={navigate}
/>

// GOOD — compound components with slots
<Card onClick={navigate}>
  <Card.Header>
    <ClaimIcon aria-hidden />
    <Card.Title>Claim #1001</Card.Title>
    <Badge variant="success">Approved</Badge>
  </Card.Header>
  <Card.Body>Health Insurance</Card.Body>
  <Card.Footer>
    <span>Updated 2h ago</span>
    <Button size="sm" variant="ghost">View</Button>
  </Card.Footer>
</Card>
```

---

## Part 3 — Theming Architecture

### CSS Custom Properties — The Right Approach

```css
/* Light theme — base definition on :root */
:root {
  /* Backgrounds */
  --color-bg-primary:    #ffffff;
  --color-bg-secondary:  #f9fafb;
  --color-bg-tertiary:   #f3f4f6;

  /* Text */
  --color-text-primary:   #111827;
  --color-text-secondary: #6b7280;
  --color-text-disabled:  #9ca3af;

  /* Borders */
  --color-border:         #e5e7eb;
  --color-border-strong:  #d1d5db;

  /* Brand */
  --color-brand:          #3b82f6;
  --color-brand-hover:    #2563eb;
  --color-brand-light:    #eff6ff;

  /* Semantic states */
  --color-danger:         #ef4444;
  --color-success:        #22c55e;
  --color-warning:        #f59e0b;
  --color-info:           #3b82f6;

  /* Spacing scale */
  --space-1: 4px;   --space-2: 8px;  --space-3: 12px;
  --space-4: 16px;  --space-6: 24px; --space-8: 32px;

  /* Shape */
  --radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 12px;

  /* Typography */
  --text-sm: 0.875rem; --text-md: 1rem; --text-lg: 1.125rem;
}

/* Dark theme — ONLY redefine semantic tokens */
[data-theme="dark"] {
  --color-bg-primary:    #111827;
  --color-bg-secondary:  #1f2937;
  --color-bg-tertiary:   #374151;
  --color-text-primary:  #f9fafb;
  --color-text-secondary:#9ca3af;
  --color-text-disabled: #6b7280;
  --color-border:        #374151;
  --color-border-strong: #4b5563;
  /* --color-brand, --color-danger, etc. unchanged */
}
```

### Theme Switching

```javascript
// Simple toggle
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') ?? 'light';
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// On page load — respect user's saved preference or OS setting
const saved = localStorage.getItem('theme');
const osPrefers = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', saved ?? osPrefers);

// Watch for OS theme changes
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      // Only update if user hasn't manually set preference
      document.documentElement.setAttribute(
        'data-theme', e.matches ? 'dark' : 'light'
      );
    }
  });
```

---

## Part 4 — Accessibility in Design Systems

### The Core Principle

When accessibility is built into design system components, every team
gets it for free. It stops being something teams need to remember and
becomes something they cannot forget.

### WCAG POUR Framework

```
PERCEIVABLE:
  → Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large
  → Don't use color alone to convey meaning (pair with icon/text)
  → Alt text on all meaningful images

OPERABLE:
  → All interactions keyboard-accessible
  → Focus indicator always visible
  → No keyboard trap (except intentional modal)

UNDERSTANDABLE:
  → Clear error messages — what went wrong AND how to fix it
  → Consistent patterns — same gesture = same result
  → Form fields have visible, persistent labels

ROBUST:
  → Semantic HTML: <button> not <div onclick>
  → Correct ARIA roles and properties
  → Works with screen readers (VoiceOver, NVDA)
```

### Accessible Button Implementation

```jsx
function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  onClick,
  type = 'button',        // never forget this — prevents form submit
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}          // tells SR: "this is loading"
      aria-disabled={disabled}        // communicates disabled state to AT
      onClick={!disabled && !isLoading ? onClick : undefined}
      className={`btn btn--${variant} btn--${size}`}
    >
      {isLoading && (
        <>
          <Spinner aria-hidden="true" />  {/* decorative */}
          <span className="sr-only">Loading, please wait</span>
        </>
      )}
      {!isLoading && leftIcon && (
        <span aria-hidden="true">{leftIcon}</span>  {/* decorative icon */}
      )}
      {children}
    </button>
  );
}
```

### Accessible Modal with Focus Trap

```javascript
function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Remember where focus was before modal opened
      returnFocusRef.current = document.activeElement;
      // Move focus into modal
      setTimeout(() => dialogRef.current?.focus(), 0);
    } else {
      // Return focus when modal closes
      returnFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        // Keep focus inside modal (focus trap)
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={dialogRef}
      tabIndex={-1}       // makes div programmatically focusable
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </div>
  );
}
```

### Common ARIA Patterns

```html
<!-- Icon-only button needs accessible name -->
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

<!-- Badge / notification count -->
<button>
  Notifications
  <span aria-label="3 unread notifications">3</span>
</button>

<!-- Live regions — announce dynamic updates -->
<div aria-live="polite" aria-atomic="true">
  <!-- Screen reader announces changes to this element -->
  {message}
</div>

<!-- Status update (e.g. "Claim saved successfully") -->
<div role="status" aria-live="polite">
  {statusMessage}
</div>

<!-- Alert (e.g. error messages) -->
<div role="alert" aria-live="assertive">
  {errorMessage}  <!-- Announced immediately, interrupts -->
</div>
```

---

## Part 5 — System Architecture

### The Layers (Atomic Design)

```
LAYER 1 — TOKENS (foundation)
  Design tokens: color, spacing, typography, elevation
  Platform-agnostic JSON → CSS vars, JS constants, iOS/Android

LAYER 2 — PRIMITIVES (atoms)
  Single-purpose UI elements: Button, Input, Text, Icon, Badge
  Minimal logic. Maximum composability. Zero business logic.

LAYER 3 — COMPOSITIONS (molecules)
  Primitive combinations: SearchInput, FormField, PasswordInput
  Slightly opinionated but still generic.

LAYER 4 — PATTERNS (organisms)
  Larger compositions: DataTable, Navigation, ClaimsFilter
  May have feature context. May contain some business logic.

LAYER 5 — TEMPLATES
  Full page layouts. Per-product. Reference design system
  but are not part of it.
```

### Headless Components — The Modern Approach

```jsx
// Headless = behaviour + accessibility, zero default styles
// You bring your own CSS

import * as Dialog from '@radix-ui/react-dialog';

// Radix handles:
//   → ARIA roles and attributes
//   → Focus trap
//   → Escape key
//   → Portal rendering
//   → Scroll lock on body
// You handle: all styling

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>
    <Button>Open claim</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="dialog-overlay" />
    <Dialog.Content
      className="dialog-content"
      aria-describedby="claim-description"
    >
      <Dialog.Title>Claim #1001</Dialog.Title>
      <Dialog.Description id="claim-description">
        Review and update claim details
      </Dialog.Description>
      <ClaimForm />
      <Dialog.Close asChild>
        <Button variant="ghost" aria-label="Close">×</Button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Versioning Strategy

```
SEMANTIC VERSIONING:
  MAJOR (2.0.0) → breaking API changes
  MINOR (1.3.0) → new components, new optional props
  PATCH (1.2.1) → bug fixes, token value adjustments

MIGRATION STRATEGY for breaking changes:
  1. Add new API alongside old API
  2. Deprecate old API with console.warn and link to migration guide
  3. Publish codemods (automated code transforms)
  4. Remove deprecated API in next major version

// Deprecation warning pattern
function Button({ color, variant, ...props }) {
  if (color !== undefined) {
    console.warn(
      '[DesignSystem] <Button color> is deprecated as of v2. ' +
      'Use <Button variant> instead. Migration guide: design.company.com/migrate'
    );
    return <ButtonImpl variant={color} {...props} />;
  }
  return <ButtonImpl variant={variant} {...props} />;
}
```

---

## Interview Questions & Model Answers

### Q1: "What are design tokens and why do they matter?"

```
Design tokens are named variables that store design decisions:
colors, spacing, typography, border radius, shadows.

They matter because they decouple the design values from the
components that use them. Without tokens, changing your brand
color means a find/replace across your entire codebase.
With tokens, you change one variable and everything updates.

The key insight is the layering:
  Primitive tokens: --blue-500: #3B82F6 (raw values)
  Semantic tokens: --color-primary: var(--blue-500) (meaning)
  Component tokens: --button-bg: var(--color-primary) (specific use)

This layering enables dark mode and theming.
For dark mode, you only redefine the semantic layer —
what "primary" means in dark context.
Components reference semantic tokens, so they automatically
adapt without any component changes.
```

### Q2: "How would you build a theming system that supports dark mode and multiple brands?"

```
I'd use CSS custom properties with a 3-layer token architecture.

Layer 1 (primitives): the complete color palette
  --blue-500: #3B82F6
  --gray-900: #111827

Layer 2 (semantic): map to meaning
  --color-bg-primary: #ffffff
  --color-text-primary: #111827

Layer 3: optional component-level overrides

For dark mode — redefine only the semantic layer:
  [data-theme="dark"] {
    --color-bg-primary: #111827;
    --color-text-primary: #f9fafb;
  }

For multi-brand — same approach:
  [data-brand="razorpay"] { --color-brand: #2D68F0; }

Components only reference semantic tokens. Zero component
changes for any theme or brand switch.

On page load, I check localStorage for saved preference,
falling back to prefers-color-scheme media query.
```

### Q3: "How do you ensure accessibility in a design system?"

```
I bake it into the components so consumers get it for free.

The principle: accessibility lives in the design system,
not in each team's feature code. If teams have to remember
to add aria attributes, some will forget. If the component
handles it, it's impossible to forget.

Concretely for a Button:
  → type="button" to prevent accidental form submission
  → aria-busy when loading state is active
  → aria-disabled when disabled (even if not HTML disabled)
  → Loading state: spinner aria-hidden + sr-only text announcement
  → Decorative icons: aria-hidden so screen readers skip them

For a Modal:
  → role="dialog" and aria-modal="true"
  → aria-labelledby pointing to the modal title
  → Focus trap: Tab cycles within modal only
  → Escape key closes
  → Focus returns to trigger element when modal closes

For color choices:
  → 4.5:1 contrast ratio minimum for text (WCAG AA)
  → Never use color alone to convey meaning — always pair with icon or text

The tool I use to verify: axe-core in CI — fails builds
if components violate WCAG AA automatically.
```

---

## Cheat Sheet

```
TOKENS:
  Primitive → value (#3B82F6)
  Semantic  → meaning (--color-primary)
  Component → specific use (--button-bg)
  Rule: components reference semantic, never primitive

COMPONENT API RULES:
  variant not color (semantic not implementation)
  children/slots not 15 props
  Consistent naming: size/variant/disabled everywhere
  asChild for polymorphic elements

THEMING:
  CSS custom properties on [data-theme="dark"]
  Only redefine semantic layer for themes/brands
  localStorage → prefers-color-scheme as fallback

ACCESSIBILITY ESSENTIALS:
  type="button" on buttons (not in forms)
  aria-busy for loading states
  aria-hidden on decorative icons
  Focus trap in modals (Tab cycles within)
  Return focus when modal closes
  4.5:1 color contrast minimum
  Never color-only information

SYSTEM LAYERS:
  Tokens → Primitives → Compositions → Patterns → Templates

HEADLESS COMPONENTS:
  Radix UI, Ark UI, Headless UI
  Behaviour + a11y built in, you bring CSS
  Best for: complex components (Dialog, Select, Tooltip)
```

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **Design token** | Named variable storing a design decision (color, spacing, etc.) |
| **Primitive token** | Raw value: `--blue-500: #3B82F6` |
| **Semantic token** | Named by meaning: `--color-primary: var(--blue-500)` |
| **Style Dictionary** | Token transformation tool: JSON → CSS/JS/iOS/Android |
| **Headless component** | Behaviour + accessibility only, zero default styles |
| **Radix UI** | React headless component primitives |
| **WCAG** | Web Content Accessibility Guidelines |
| **POUR** | WCAG framework: Perceivable, Operable, Understandable, Robust |
| **Focus trap** | Keyboard navigation confined within a dialog/modal |
| **aria-labelledby** | Links element to its visible label by ID |
| **aria-describedby** | Links element to its description by ID |
| **aria-live** | Region that announces dynamic content changes to screen readers |
| **sr-only** | CSS class — visible to screen readers, hidden visually |
| **WCAG AA** | Minimum contrast: 4.5:1 normal text, 3:1 large text |
| **asChild** | Radix pattern — apply behaviour/styles to a different element |
| **Polymorphic component** | Component that renders as different HTML elements |
| **Codemod** | Automated code transform tool for migration |
| **axe-core** | Accessibility testing engine used in CI/CD |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 21** | Phase 3 Review | Architecture mock questions (Days 14–20) |
| **Day 22** | Accessibility deep dive | WCAG, ARIA patterns, keyboard navigation |
| **Day 23** | Internationalization (i18n) | Multi-language, RTL, locale formatting |
