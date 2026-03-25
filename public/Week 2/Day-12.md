# 🖼️ Frontend System Design — Day 12
## Topic: Image & Asset Optimization

> **Study time:** 1 hour | **Phase:** 2 of 5 | **Difficulty:** Beginner → Intermediate
> **Interview frequency:** ⭐⭐⭐⭐⭐ (Every senior interview — images are 50-70% of page weight)

---

## The Big Picture

Images are typically 50–70% of a page's total bytes.
No other optimization delivers as much impact per hour of work.
A single unoptimized hero image can cost 2 seconds of LCP.

```
THE 4 IMAGE OPTIMIZATION LEVERS:

  1. FORMAT   → Is this the smallest format? (AVIF > WebP > JPEG)
  2. SIZE     → Am I sending a 2000px image to a 400px screen? (srcset)
  3. TIMING   → Do I load this before the user needs it? (lazy loading)
  4. PRIORITY → Does the browser know which image matters most? (fetchpriority)
```

---

## Lever 1 — Image Formats

### Format Comparison

```
AVIF  → 50% smaller than JPEG. Best quality. 90% browser support. USE FIRST.
WebP  → 30% smaller than JPEG. Transparency support. 97% support. USE AS FALLBACK.
JPEG  → Baseline. Photos. No transparency. Only as final fallback in <picture>.
PNG   → Lossless. Large files. Only for transparency when SVG won't work.
SVG   → Vector. Infinitely scalable. Icons, logos, illustrations. Tiny size.
GIF   → NEVER for animations. Use <video autoplay muted loop> — 10x smaller.
```

### Typical file sizes for a product photo

```
JPEG (baseline)  100KB  ████████████████████
PNG  (lossless)  180KB  ████████████████████████████████████
WebP (lossy)      65KB  █████████████
AVIF (lossy)      45KB  █████████
```

### Format Decision Tree

```
Is it a photo/complex illustration?
  → Use AVIF (with WebP + JPEG fallback in <picture>)

Is it a logo, icon, or line art?
  → Use SVG (infinitely scalable, tiny, cacheable forever)

Does it have transparency and SVG won't work?
  → Use WebP with PNG fallback

Is it animated?
  → Use <video autoplay muted loop playsinline> (10x smaller than GIF)
```

---

## Lever 2 — Responsive Images with srcset

### The Problem

```
Without srcset:
  Browser downloads the same 2000px image for:
  → A 4K desktop monitor
  → A 375px mobile phone
  Mobile users download 10x more data than needed!

With srcset:
  Browser picks the smallest image that looks sharp on the device.
  Mobile gets 400px image (~30KB)
  Desktop gets 1200px image (~100KB)
```

### srcset with Width Descriptors (w)

```html
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg   400w,
    hero-800.jpg   800w,
    hero-1200.jpg 1200w,
    hero-2000.jpg 2000w
  "
  sizes="
    (max-width: 768px)  100vw,
    (max-width: 1200px)  80vw,
    1200px
  "
  alt="Hero image"
  width="1200"
  height="600"
>
```

```
How the browser picks the right image:
  1. Reads "sizes" → knows how wide the image will display
  2. Multiplies by device pixel ratio (Retina = 2x, some mobiles = 3x)
  3. Picks smallest srcset image that meets the requirement

Example — iPhone 12 (375px wide, 3x DPR, image is 100vw):
  Needs: 375 × 3 = 1125 physical pixels
  Picks: hero-1200.jpg (closest match above 1125px)
  Not: hero-2000.jpg (unnecessarily large)
```

### srcset with Density Descriptors (x)

```html
<!-- For fixed-size images: avatars, thumbnails, icons -->
<img
  src="avatar-80.jpg"
  srcset="
    avatar-80.jpg  1x,
    avatar-160.jpg 2x,
    avatar-240.jpg 3x
  "
  width="80"
  height="80"
  alt="User avatar"
>
```

### The sizes Attribute — Getting It Right

```html
<!-- sizes must accurately describe how wide the image displays -->
<!-- Without sizes: browser assumes 100vw → downloads too-large image -->

<img
  srcset="img-400.jpg 400w, img-800.jpg 800w, img-1200.jpg 1200w"
  sizes="
    (max-width: 600px)  100vw,   /* full width on mobile */
    (max-width: 1024px)  50vw,   /* half width on tablet */
    400px                        /* fixed 400px on desktop */
  "
  alt="Product image"
>
```

---

## Lever 3 — The picture Element

### Format Fallback (AVIF → WebP → JPEG)

```html
<picture>
  <!-- Browser tries in order, uses first supported format -->
  <source
    type="image/avif"
    srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
  >
  <source
    type="image/webp"
    srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
  >
  <!-- Fallback: img tag for browsers that support neither -->
  <img
    src="hero-800.jpg"
    srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
    alt="Hero image"
    width="1200"
    height="600"
    loading="eager"
    fetchpriority="high"
  >
</picture>
```

### Art Direction — Different Crop per Breakpoint

```html
<picture>
  <!-- Mobile: tight square crop -->
  <source
    media="(max-width: 767px)"
    srcset="product-square-400.webp 400w, product-square-800.webp 800w"
    sizes="100vw"
  >
  <!-- Desktop: wide landscape crop -->
  <img
    src="product-landscape.webp"
    srcset="product-landscape-800.webp 800w, product-landscape-1600.webp 1600w"
    sizes="60vw"
    alt="Product"
    width="1200"
    height="675"
  >
</picture>
```

### Rules for picture

```
1. img tag inside picture is always the FALLBACK
2. alt, width, height, loading, fetchpriority → go on the img tag
3. Attributes on <source> tags are only used for selection
4. Browser picks the FIRST matching source — order matters
5. type attribute = MIME type of the format being offered
```

---

## Lever 4 — Loading Strategy & Priority

### The LCP Image — Never Lazy Load It

```html
<!-- WRONG: lazy loading the LCP image adds 2-4 seconds to LCP -->
<img src="hero.jpg" loading="lazy" alt="Hero">

<!-- WRONG: no fetchpriority means browser deprioritises it -->
<img src="hero.jpg" alt="Hero">

<!-- CORRECT: preload + eager + high priority -->
<link rel="preload" as="image" href="hero.webp" fetchpriority="high">

<img
  src="hero.webp"
  loading="eager"
  fetchpriority="high"
  decoding="async"
  alt="Hero"
  width="1200"
  height="600"
>
```

### All Other Images — Lazy Load

```html
<!-- Below-fold images: native lazy loading -->
<img
  src="product.webp"
  loading="lazy"
  decoding="async"
  alt="Product"
  width="400"
  height="400"
>

<!-- Native lazy: browser loads ~1 viewport before element enters view -->
<!-- For custom threshold, use IntersectionObserver -->
```

### decoding="async" — Free Win

```html
<!-- decoding="async": browser decodes image off main thread -->
<!-- Prevents main thread jank during image decode on scroll -->
<!-- Always use for non-critical images -->
<img src="photo.webp" decoding="async" loading="lazy" alt="Photo">
```

### Complete Attribute Reference

```
loading="eager"     → start loading immediately (default for above-fold)
loading="lazy"      → load when near viewport (all below-fold images)

fetchpriority="high"   → hints browser to prioritise this fetch
fetchpriority="low"    → de-prioritise (thumbnails, background)
fetchpriority="auto"   → browser decides (default)

decoding="async"    → decode off main thread (non-critical images)
decoding="sync"     → decode on main thread (LCP image)
decoding="auto"     → browser decides (default)

width + height      → ALWAYS set these — prevents CLS
alt                 → ALWAYS set — accessibility
```

---

## Always Set Width and Height

```html
<!-- BAD: no dimensions → browser doesn't know space to reserve -->
<!-- → image loads → content shifts → CLS score increases -->
<img src="product.jpg" alt="Product">

<!-- GOOD: browser reserves exact space before image loads → no CLS -->
<img src="product.jpg" alt="Product" width="400" height="400">

<!-- Modern alternative: aspect-ratio CSS -->
<style>
  img {
    width: 100%;
    aspect-ratio: 4 / 3; /* browser reserves space in correct ratio */
    height: auto;
  }
</style>
```

---

## Build Tools for Image Optimization

### Sharp (Node.js — Most Powerful)

```javascript
const sharp = require('sharp');

// Convert + resize + compress
await sharp('hero.jpg')
  .resize(1200, 630)
  .webp({ quality: 80 })
  .toFile('hero-1200.webp');

// Generate full srcset
const sizes = [400, 800, 1200, 2000];
for (const width of sizes) {
  // AVIF
  await sharp('hero.jpg')
    .resize(width)
    .avif({ quality: 60 })
    .toFile(`hero-${width}.avif`);
  // WebP
  await sharp('hero.jpg')
    .resize(width)
    .webp({ quality: 80 })
    .toFile(`hero-${width}.webp`);
  // JPEG fallback
  await sharp('hero.jpg')
    .resize(width)
    .jpeg({ quality: 85, progressive: true })
    .toFile(`hero-${width}.jpg`);
}
```

### CDN Image Transformation (Most Scalable)

```javascript
// Cloudinary — transform via URL params
// https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/product.jpg

// Parameters:
//   f_auto  → auto-selects AVIF/WebP/JPEG based on browser Accept header
//   q_auto  → automatically adjusts quality based on image content
//   w_800   → resize to 800px wide
//   c_fill  → fill crop mode

// Imgix
// https://yourco.imgix.net/hero.jpg?w=800&fm=webp&auto=format,compress

// Cloudflare Images
// https://imagedelivery.net/{account}/{image-id}/w=800,format=auto

// Benefits:
//   → One source image → infinite transformations on the fly
//   → Automatic format negotiation per browser
//   → Edge-served (fast globally)
//   → No build-time image generation needed
```

---

## Advanced Patterns

### Blur-Up Placeholder

```html
<!-- Show tiny blurred placeholder while full image loads -->
<!-- Creates perceived performance — page doesn't look empty -->
<div style="position:relative; overflow:hidden; aspect-ratio: 16/9">
  <!-- Tiny base64 image (20px, blurred) — no extra request -->
  <img
    src="data:image/webp;base64,UklGRlYA..."
    style="filter:blur(20px); transform:scale(1.1); width:100%; height:100%; object-fit:cover"
    aria-hidden="true"
    alt=""
  >
  <!-- Real image — fades in when loaded -->
  <img
    src="hero-full.webp"
    loading="lazy"
    onload="this.style.opacity='1'"
    style="
      position:absolute; inset:0;
      opacity:0;
      transition:opacity 0.4s ease;
      width:100%; height:100%;
      object-fit:cover
    "
    alt="Hero"
    width="1200"
    height="675"
  >
</div>
```

### Replacing GIF with Video

```html
<!-- GIF: animated banner — 2MB -->
<!-- <img src="animation.gif" alt=""> -->

<!-- Video: same animation — 180KB (10x smaller) -->
<video
  autoplay
  muted
  loop
  playsinline
  width="600"
  height="400"
>
  <source src="animation.webm" type="video/webm">
  <source src="animation.mp4" type="video/mp4">
</video>
```

---

## The Complete Optimized Image Pattern

```html
<!-- This is what every hero/LCP image should look like -->
<link rel="preload" as="image" href="hero.avif" fetchpriority="high">

<picture>
  <source
    type="image/avif"
    srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
  >
  <source
    type="image/webp"
    srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
  >
  <img
    src="hero-800.jpg"
    srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
    alt="Descriptive alt text"
    width="1200"
    height="600"
    loading="eager"
    fetchpriority="high"
    decoding="sync"
  >
</picture>
```

---

## Interview Questions & Model Answers

### Q1: "How would you optimize images on a product listing page?"

```
Strategy across all 4 levers:

1. FORMAT — Use picture element with AVIF → WebP → JPEG fallback
   Saves 30-50% vs JPEG with same visual quality

2. SIZE — srcset with 3-4 sizes + accurate sizes attribute
   Mobile downloads 400px image not 1200px image

3. TIMING — lazy load ALL product images (below fold)
   Only preload the LCP image (first above-fold hero)
   <img loading="lazy" decoding="async">

4. PRIORITY — set explicit width/height on all images
   Prevents CLS (layout shift when images load)

5. Build pipeline — Sharp or CDN transformation to auto-generate
   AVIF/WebP at multiple sizes from one source image

Result: typical product page goes from 3MB images to 400KB
with same visual quality on each device.
```

### Q2: "What is the difference between loading="lazy" and fetchpriority="high"?"

```
loading="lazy":
  → Controls WHEN the browser fetches the image
  → lazy: only fetch when image is near viewport (~1 viewport away)
  → eager: fetch immediately (default)
  → Use lazy on ALL below-fold images
  → NEVER use lazy on the LCP image

fetchpriority="high":
  → Controls the PRIORITY of the fetch in the browser's queue
  → high: fetch this before lower-priority resources
  → low: de-prioritise this fetch
  → Doesn't change when — changes the order in the fetch queue
  → Use high on the LCP image to ensure browser downloads it first

They work together on the LCP image:
  loading="eager"      → start immediately, don't defer
  fetchpriority="high" → fetch this before other resources
  Both together: LCP image loads as fast as possible
```

### Q3: "When would you use the picture element vs just srcset on img?"

```
Use just srcset (simpler) when:
  → Same image crop for all screen sizes
  → Just want responsive sizing + format negotiation not needed
  → e.g. <img srcset="img-400.jpg 400w, img-800.jpg 800w">

Use picture element when:
  1. FORMAT FALLBACK — serving multiple formats (AVIF/WebP/JPEG)
     <source type="image/avif"> + <source type="image/webp"> + <img>

  2. ART DIRECTION — different crop per breakpoint
     Tight portrait crop on mobile, wide landscape on desktop
     <source media="(max-width: 767px)" srcset="square.webp">

  3. BOTH — most production cases use picture for format fallback
     + srcset on each source for responsive sizing

The img tag inside picture is always the ultimate fallback.
Attributes like alt, width, height, loading go on the img tag.
```

---

## Cheat Sheet

```
FORMAT PRIORITY:
  AVIF > WebP > JPEG for photos
  SVG for icons/logos/illustrations
  <video> instead of GIF for animations
  Savings: AVIF 50% smaller, WebP 30% smaller than JPEG

ALWAYS ON EVERY IMG TAG:
  width + height attributes  → prevents CLS
  alt text                   → accessibility
  loading="lazy"             → except LCP image
  decoding="async"           → except LCP image

LCP IMAGE (the one Lighthouse calls out):
  <link rel="preload" as="image" fetchpriority="high">
  loading="eager" fetchpriority="high" decoding="sync"
  NEVER loading="lazy" on the LCP image!

SRCSET RULE:
  w descriptors for fluid images (most cases)
  x descriptors for fixed-size images (avatars, thumbnails)
  Always include sizes attribute with w descriptors

PICTURE ELEMENT:
  Format fallback: AVIF source → WebP source → img fallback
  Art direction: media attribute to switch crops per breakpoint

CDN TRANSFORMATION:
  f_auto / format=auto → serves AVIF or WebP automatically
  Most scalable approach — no build-time image generation

BLUR-UP PLACEHOLDER:
  Inline base64 tiny blurred version → fade in real image
  Best perceived performance for image-heavy pages
```

---

## Hands-On Task (20 mins)

1. Open any website → DevTools → Network tab → filter by "Img"
2. Check: are images JPEG or WebP/AVIF?
3. Check: do images have `loading="lazy"` in the Elements panel?
4. Find the LCP image (Lighthouse tells you which one) — does it have `fetchpriority="high"`?
5. Check if any images are missing `width` and `height` attributes
6. Visit `squoosh.app` → upload any JPEG → compare JPEG vs WebP vs AVIF quality/size

---

## Key Terms Glossary

| Term | Definition |
|------|-----------|
| **WebP** | Google's image format — 30% smaller than JPEG with same quality |
| **AVIF** | AV1-based image format — 50% smaller than JPEG, best quality |
| **srcset** | HTML attribute providing browser a list of candidate images by width/density |
| **sizes** | HTML attribute telling browser how wide the image displays at each breakpoint |
| **picture** | HTML element allowing multiple image sources with format/media fallbacks |
| **art direction** | Serving different image crops for different screen sizes |
| **lazy loading** | Loading images only when they're near the viewport |
| **fetchpriority** | Hints browser on relative priority of a resource fetch |
| **decoding="async"** | Browser decodes image off main thread — prevents jank |
| **LCP image** | The largest visible element that determines LCP score |
| **blur-up** | Pattern showing tiny blurred placeholder while full image loads |
| **DPR** | Device Pixel Ratio — how many physical pixels per CSS pixel (Retina = 2x) |
| **Sharp** | Node.js library for high-performance image processing |
| **CDN transformation** | Serving dynamically resized/converted images from edge servers |

---

## What's Next

| Day | Topic | Why it matters |
|-----|-------|----------------|
| **Day 13** | Network Optimization | Prefetch, preconnect, HTTP/2, compression |
| **Day 14** | Virtual DOM & Change Detection | React diffing, Angular OnPush deep dive |
| **Day 15** | List Virtualization | Virtual scroll for 10,000-item lists |
| **Day 16** | Phase 2 Review | End-to-end performance optimization exercise |

