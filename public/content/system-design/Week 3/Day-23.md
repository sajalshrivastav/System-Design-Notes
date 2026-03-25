# Frontend System Design — Day 23
## Topic: Internationalization (i18n)

> **Study time:** 1 hour | **Phase:** 4 of 5 | **Difficulty:** Intermediate
> **Interview frequency:** ⭐⭐⭐ (Flipkart, Razorpay, any product expanding beyond India)

---

## The Big Picture

i18n is not just "swapping strings". A fully internationalized app handles:

```
TRANSLATION (l10n):     "Submit" → "जमा करें" → "تأكيد"
NUMBER FORMATTING:      1000000 → 10,00,000 (en-IN) vs 1,000,000 (en-US)
                                → 1.000.000 (de-DE — dot is thousands sep!)
CURRENCY:               ₹10,00,000 vs $1,000,000 vs €1.000.000
DATE FORMAT:            15/03/2024 (en-IN) vs 3/15/2024 (en-US)
PLURAL FORMS:           English has 2, Arabic has 6, Russian has 3
RTL LAYOUT:             Arabic, Hebrew — entire layout mirrors
TEXT EXPANSION:         English → German: +30% longer on average
                        English → Finnish: +60% longer
```

Getting this wrong at scale means a rewrite, not a refactor.

---

## Part 1 — Translation Architecture

### Three Decisions to Make Upfront

```
1. FILE FORMAT
   JSON — developer-friendly, most common, easy to version in git
   XLIFF — translator-friendly, supported by professional CAT tools
   PO files — standard in open source, gettext ecosystem
   
   → Use JSON with a TMS (Translation Management System)
     like Lokalise, Phrase, or Crowdin for most products

2. KEY STRATEGY
   Flat:     "button.submit", "nav.claims", "errors.network"
   Nested:   { "button": { "submit": "Submit" } }
   
   → Namespaced flat keys scale best:
     Feature-grouped: "claims.filter.label", "common.submit"
     Never component-grouped — features change, components get deleted

3. LOADING STRATEGY
   Build-time (all locales bundled): simple, larger initial load
   Runtime lazy-load (fetch on demand): complex, smaller initial load
   
   → Lazy-load when you have 5+ locales
   → Bundle when you have 2-3 locales
```

### React — react-i18next Setup

```javascript
// locales/en/common.json
{
  "nav": {
    "claims":   "Claims",
    "settings": "Settings"
  },
  "actions": {
    "submit":   "Submit",
    "cancel":   "Cancel",
    "loading":  "Loading..."
  },
  "claims": {
    "title":    "Your claims"
  }
}

// locales/hi/common.json
{
  "nav": {
    "claims":   "दावे",
    "settings": "सेटिंग्स"
  },
  "actions": {
    "submit":   "जमा करें",
    "cancel":   "रद्द करें",
    "loading":  "लोड हो रहा है..."
  }
}

// i18n.ts — configure once, import before app renders
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend'; // lazy-load from /locales/

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: detectUserLocale(),   // detect from browser or user preference
    fallbackLng: 'en',         // missing key → fall back to English
    ns: ['common', 'claims', 'errors'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,       // React escapes by default — safe
    },
  });

function detectUserLocale() {
  return localStorage.getItem('locale')
    ?? navigator.language
    ?? 'en';
}

// In components
import { useTranslation } from 'react-i18next';

function NavBar() {
  const { t, i18n } = useTranslation('common');

  return (
    <nav>
      <a href="/claims">{t('nav.claims')}</a>
      <button onClick={() => i18n.changeLanguage('hi')}>
        हिंदी
      </button>
    </nav>
  );
}
```

---

## Part 2 — Intl API (Numbers, Dates, Currency)

### Always Use the Browser's Built-in Intl API

```javascript
// THE WRONG WAY — never manually format numbers
const formatted = '₹' + amount.toFixed(2); // wrong grouping for India!

// THE RIGHT WAY — Intl handles locale differences automatically
```

### Number Formatting

```javascript
// Indian lakh system — 10,00,000 not 1,000,000!
new Intl.NumberFormat('en-IN').format(1000000)
// → "10,00,000"

new Intl.NumberFormat('en-US').format(1000000)
// → "1,000,000"

new Intl.NumberFormat('de-DE').format(1000000)
// → "1.000.000"  ← dot is thousands separator in German!

// Fractions
new Intl.NumberFormat('de-DE').format(1.5)
// → "1,5"  ← comma is decimal separator in German!
// This is why you NEVER assume dot = decimal separator
```

### Currency Formatting

```javascript
// India
new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,  // no paise for whole rupee amounts
}).format(1000000)
// → "₹10,00,000"

// USA
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(1000000)
// → "$1,000,000.00"

// Germany
new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
}).format(1000000)
// → "1.000.000,00 €"  ← currency symbol position differs!

// Compact notation (for dashboards)
new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
}).format(1000000)
// → "₹10L"

// Percentage
new Intl.NumberFormat('en-IN', {
  style: 'percent',
  maximumFractionDigits: 1,
}).format(0.175)
// → "17.5%"
```

### Date Formatting

```javascript
const date = new Date('2024-03-15T10:30:00Z');

// India — DD/MM/YYYY
new Intl.DateTimeFormat('en-IN').format(date)
// → "15/03/2024"

// USA — M/D/YYYY
new Intl.DateTimeFormat('en-US').format(date)
// → "3/15/2024"

// Long format
new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(date)
// → "15 March 2024"

// With time and timezone
new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata'
}).format(date)
// → "15 Mar 2024, 4:00 pm"

// Relative time ("2 days ago", "in 3 hours")
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
rtf.format(-2, 'day')    // → "2 days ago"
rtf.format(-1, 'day')    // → "yesterday"   ← 'auto' uses natural words
rtf.format(3, 'hour')    // → "in 3 hours"
rtf.format(-30, 'minute')// → "30 minutes ago"

// Hindi relative time
const rtfHi = new Intl.RelativeTimeFormat('hi', { numeric: 'auto' });
rtfHi.format(-2, 'day')  // → "2 दिन पहले"
```

### Helper Utility Functions

```javascript
// helpers/i18n.ts — wrap Intl for reuse
export const formatCurrency = (amount: number, locale = 'en-IN', currency = 'INR') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (date: Date | string, locale = 'en-IN') =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));

export const formatRelativeTime = (date: Date, locale = 'en') => {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = date.getTime() - Date.now();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  return rtf.format(diffDays, 'day');
};
```

---

## Part 3 — Plurals and Interpolation

### Interpolation — Variables in Translations

```javascript
// NEVER concatenate translations
// Word order differs between languages!
t('hello') + ' ' + user.name
// English: "Hello Sajal" — subject after greeting
// Japanese: "Sajalさん、こんにちは" — name comes first
// Concatenation breaks word order for many languages

// CORRECT — let translators control placement
// en.json
{ "greeting": "Hello, {{name}}!" }

// hi.json
{ "greeting": "नमस्ते, {{name}}!" }

// ja.json
{ "greeting": "{{name}}さん、こんにちは！" }
// Translator puts {{name}} wherever the language requires

// Usage
t('greeting', { name: user.name })
// → "Hello, Sajal!"  (en)
// → "नमस्ते, Sajal!"  (hi)
```

### Plural Forms

```javascript
// English: 1 claim, 2 claims (2 forms: one, other)
// Arabic: 0, 1, 2, 3-10, 11+, 100+  (6 forms!)
// Russian: complex rules based on last digit

// i18next plural convention — _one and _other suffixes
// en.json
{
  "claim_one":   "{{count}} claim",
  "claim_other": "{{count}} claims"
}

// hi.json (Hindi also has 2 forms)
{
  "claim_one":   "{{count}} दावा",
  "claim_other": "{{count}} दावे"
}

// ar.json (Arabic — 6 forms)
{
  "claim_zero":  "لا دعاوى",
  "claim_one":   "دعوى واحدة",
  "claim_two":   "دعويان",
  "claim_few":   "{{count}} دعاوى",
  "claim_many":  "{{count}} دعوى",
  "claim_other": "{{count}} دعوى"
}

// i18next picks the right form based on count and locale
t('claim', { count: 1 })  // → "1 claim"
t('claim', { count: 5 })  // → "5 claims"
t('claim', { count: 0 })  // → "0 claims" (uses _other in English)
```

### Text Expansion — Design for It

```css
/* English → German averages +30% longer
   "Submit claim" → "Anspruch einreichen" (+58%)
   "Settings" → "Einstellungen" (+56%)
   
   Design rules:
   → Never fixed-width containers for text
   → Allow wrapping with min-height not height
   → Buttons: min-width + padding, never fixed width */

/* WRONG */
.btn { width: 120px; }         /* German overflows */
.badge { white-space: nowrap; max-width: 80px; } /* clips */

/* CORRECT */
.btn {
  min-width: 80px;
  padding: 0 16px;              /* grows with content */
}
.badge {
  display: inline-block;
  padding: 2px 8px;             /* no max-width */
}
```

---

## Part 4 — RTL Layouts

### Setting Direction

```html
<!-- Static -->
<html lang="ar" dir="rtl">

<!-- Dynamic (React) -->
useEffect(() => {
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  const isRtl = rtlLocales.includes(locale);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = locale;
}, [locale]);
```

### CSS Logical Properties — Write Once, Works Both Directions

```css
/* PHYSICAL properties — break in RTL */
.nav-item {
  padding-left: 16px;      /* wrong side in RTL */
  margin-right: 8px;       /* wrong side in RTL */
  border-left: 3px solid;  /* wrong side in RTL */
  text-align: left;        /* wrong in RTL */
}

/* LOGICAL properties — automatically correct in both directions */
.nav-item {
  padding-inline-start: 16px;   /* left in LTR, right in RTL */
  margin-inline-end: 8px;       /* right in LTR, left in RTL */
  border-inline-start: 3px solid; /* left in LTR, right in RTL */
  text-align: start;            /* left in LTR, right in RTL */
}
```

### Logical Properties Quick Reference

| Physical (avoid) | Logical (use) |
|-----------------|---------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `float: left` | `float: inline-start` |

### Directional Icons

```css
/* Arrows and chevrons SHOULD flip in RTL */
/* "Back" arrow in LTR points left → in RTL points right */
[dir="rtl"] .icon-arrow-forward { transform: scaleX(-1); }
[dir="rtl"] .icon-chevron-right { transform: scaleX(-1); }
[dir="rtl"] .icon-back          { transform: scaleX(-1); }

/* Icons that should NOT flip */
/* Phone, email, logos, checkmarks, warning icons */
/* Emojis — never flip these */
```

---

## Part 5 — Angular i18n

### ngx-translate Setup

```typescript
// app.config.ts
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient],
        },
        defaultLanguage: 'en',
      })
    ),
  ],
};

// Template usage
// {{ 'nav.claims' | translate }}
// {{ 'greeting' | translate:{ name: user.name } }}

// Component class
@Component({ /* ... */ })
export class NavComponent {
  private translate = inject(TranslateService);

  switchToHindi() {
    this.translate.use('hi');
    // Lazy-loads /assets/i18n/hi.json
    document.documentElement.lang = 'hi';
  }
}
```

### Angular Locale-Aware Pipes

```typescript
// Register locale data — REQUIRED or pipes use en-US defaults
import { registerLocaleData } from '@angular/common';
import localeHi from '@angular/common/locales/hi';
import localeEnIn from '@angular/common/locales/en-IN';

registerLocaleData(localeHi, 'hi');
registerLocaleData(localeEnIn, 'en-IN');

// app.config.ts
providers: [
  { provide: LOCALE_ID, useValue: 'en-IN' }
]

// In templates — pipes respect LOCALE_ID automatically
{{ 1000000 | number }}              // → "10,00,000"
{{ 1000000 | currency:'INR':'symbol':'1.0-0' }}  // → "₹10,00,000"
{{ submittedDate | date:'dd MMM yyyy' }}          // → "15 Mar 2024"
{{ submittedDate | date:'shortDate' }}             // → "15/03/2024"
```

### Dynamic Locale Service

```typescript
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private translate = inject(TranslateService);
  currentLocale = signal('en-IN');

  setLocale(locale: string) {
    const rtlLocales = ['ar', 'he', 'fa', 'ur'];
    this.currentLocale.set(locale);
    this.translate.use(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
    localStorage.setItem('locale', locale);
  }

  initFromSaved() {
    const saved = localStorage.getItem('locale')
      ?? navigator.language
      ?? 'en-IN';
    this.setLocale(saved);
  }
}
```

---

## Interview Questions & Model Answers

### Q1: "How would you add Hindi support to the Digit Insurance app?"

```
I'd approach it in four layers:

1. Translation strings:
   Set up ngx-translate with JSON files per locale.
   /assets/i18n/en.json, /assets/i18n/hi.json.
   Extract all hardcoded strings to translation keys.
   The key naming convention: namespace.feature.element
   e.g. "claims.filter.status", "common.actions.submit"

2. Numbers, dates, currency:
   Register en-IN and hi locale data with registerLocaleData.
   Use Angular's built-in pipes (number, currency, date) —
   they automatically use the active LOCALE_ID.
   Never manually format "₹" + amount — Intl handles the
   lakh separator (10,00,000 not 1,000,000).

3. Plural forms:
   Hindi has two plural forms like English.
   Use ngx-translate's ICU message format for count-based strings:
   "{{count}} दावे" for plural, "{{count}} दावा" for singular.

4. Layout considerations:
   Hindi is LTR so no RTL changes needed.
   But German text is 30% longer — same principle applies.
   All containers use min-width + padding, never fixed widths.
   Test with the Hindi translations to catch overflow issues.
```

### Q2: "A number is displaying as 1,000,000 for Indian users but should be 10,00,000. How do you fix this?"

```
This is the classic Indian lakh formatting bug. The number 1,000,000
is formatted with the en-US locale but Indian users expect the
South Asian grouping system: ones, thousands, then lakhs (groups of 2).

Root cause: the code is using locale 'en-US' or no locale at all.

Fix — use Intl.NumberFormat with 'en-IN':
  new Intl.NumberFormat('en-IN').format(1000000)
  → "10,00,000"

In Angular, ensure LOCALE_ID is 'en-IN' and locale data is registered:
  registerLocaleData(localeEnIn, 'en-IN');
  { provide: LOCALE_ID, useValue: 'en-IN' }
  Then {{ 1000000 | number }} → "10,00,000" automatically.

The wider lesson: never assume number formatting.
The 'en' locale is not the same as 'en-IN'.
Germany uses dot as thousands separator and comma as decimal.
Always pass the full locale tag (language-REGION).
```

### Q3: "How do you handle RTL layouts without duplicating all your CSS?"

```
The key is CSS logical properties — they automatically flip
based on the document's dir attribute.

Instead of:
  padding-left: 16px   (hardcoded physical direction)
  text-align: left

Use:
  padding-inline-start: 16px  (start = left in LTR, right in RTL)
  text-align: start

Setting <html dir="rtl"> then makes the entire layout mirror correctly
with zero additional CSS.

For icons that represent direction (arrows, chevrons, back buttons):
  [dir="rtl"] .icon-forward { transform: scaleX(-1); }

For icons that shouldn't flip (phone, email, logos):
  No changes needed — they're not directional.

The migration approach:
  1. Set dir="rtl" in DevTools on the current app
  2. Every broken element has a physical property that needs converting
  3. Convert margin-left → margin-inline-start etc. across the codebase
  4. Add the RTL locale files and test end-to-end
```

---

## Cheat Sheet

```
TRANSLATION:
  Never concatenate — use interpolation: t('greeting', { name })
  Namespace keys by feature: 'claims.table.statusColumn'
  Fall back to English for missing keys: fallbackLng: 'en'
  Lazy-load locales for 5+ languages

INTL API (no library needed):
  Numbers:  new Intl.NumberFormat('en-IN').format(1000000) → "10,00,000"
  Currency: style:'currency', currency:'INR' → "₹10,00,000"
  Dates:    new Intl.DateTimeFormat('en-IN').format(date)  → "15/03/2024"
  Relative: new Intl.RelativeTimeFormat('en').format(-2,'day') → "2 days ago"
  Always use locale tag with region: 'en-IN' not 'en'

PLURALS:
  English: 2 forms (one, other)
  Arabic: 6 forms — always use i18next/ICU plural support
  Never hardcode "s" suffix

TEXT EXPANSION:
  English → German: +30%, English → Finnish: +60%
  min-width + padding, never fixed width on text containers

RTL:
  Set dir="rtl" on <html> for Arabic/Hebrew/Farsi/Urdu
  Replace physical CSS with logical properties:
    padding-left → padding-inline-start
    margin-right → margin-inline-end
    text-align: left → text-align: start
  Flip directional icons with scaleX(-1), not separate assets

ANGULAR:
  registerLocaleData() — required or pipes use en-US
  LOCALE_ID provider — sets default for all pipes
  ngx-translate for runtime string translation
  Built-in pipes (number, currency, date) for formatting
```

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **i18n** | Internationalization — making software adaptable to locales |
| **l10n** | Localization — adapting for a specific locale (translation + formatting) |
| **locale** | Language + region code: `en-IN`, `hi-IN`, `ar-SA` |
| **Intl API** | Browser built-in for locale-aware formatting |
| **Intl.NumberFormat** | Formats numbers per locale (lakh, thousand, etc.) |
| **Intl.DateTimeFormat** | Formats dates per locale |
| **Intl.RelativeTimeFormat** | Formats relative time ("2 days ago") |
| **ICU message format** | Standard for plurals and interpolation in translations |
| **Plural form** | Language-specific count-based grammar variants |
| **Interpolation** | Variable substitution in translation strings |
| **RTL** | Right-to-left text direction (Arabic, Hebrew) |
| **LTR** | Left-to-right text direction (English, Hindi) |
| **dir attribute** | HTML attribute: `dir="rtl"` or `dir="ltr"` |
| **Logical properties** | CSS direction-agnostic properties (`inline-start`, `inline-end`) |
| **react-i18next** | React translation library wrapping i18next |
| **ngx-translate** | Angular runtime translation library |
| **LOCALE_ID** | Angular DI token for current locale |
| **registerLocaleData** | Angular function to register locale data for pipes |
| **TMS** | Translation Management System (Lokalise, Phrase, Crowdin) |
| **Lakh** | Indian numbering unit (1 lakh = 100,000) |
| **Text expansion** | Translated strings being longer than source strings |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 24** | REST & GraphQL APIs | API design, caching, optimistic updates |
| **Day 25** | WebSockets & real-time | Live data, polling vs push, reconnection |
| **Day 26** | PWA & offline | Service workers in production, app shell |
