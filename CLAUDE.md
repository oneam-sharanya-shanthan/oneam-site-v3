# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static HTML/CSS/JS marketing site for OneAM (invoice factoring / early-pay platform). No build system, no framework, no package manager — open any `.html` file directly in a browser.

There is also a parallel Squarespace deployment. The `squarespace/` folder contains code that gets pasted into Squarespace's code injection panel, not run standalone.

## Running the site

Open any `.html` file directly in a browser, or use a local server:

```
npx serve .
# or
python3 -m http.server
```

## CSS / JS architecture

Every standalone page loads in this exact order:

```html
<link rel="stylesheet" href="brand.css">       <!-- tokens + base reset -->
<link rel="stylesheet" href="components.css">  <!-- all shared components -->
<style>/* page-specific only */</style>        <!-- hero layout, clip-paths, etc. -->
<script src="components.js"></script>          <!-- at end of <body> -->
```

**`brand.css`** — design tokens only (CSS custom properties, @font-face, base reset, typography). This is the single source of truth for all colors, spacing, shadows, type scale. Never hardcode colors or use raw `rgba()` — always use a token.

**`components.css`** — owns all shared UI: nav, footer, buttons, scroll reveal (`.reveal` / `.reveal-stagger`), sticky CTA, FAQ accordion, testimonial carousel, insights cards, why-grid. Page files must not redefine these.

**`components.js`** — a single IIFE with self-contained init functions. Each init silently no-ops if its target element is absent, so every page loads this file unconditionally without side effects.

**Page `<style>` blocks** — page-specific layout only: hero layout, section backgrounds, clip-path shapes, anything unique to that page. Must not re-declare anything already in `components.css`.

## Squarespace vs. standalone

This is a fast Squarespace deployment to get the site live quickly — not an ideal long-term architecture. Every decision should favour speed and reliability over perfection. Keep components as lean as possible.

### Two site-wide injection points

**1. Code Injection › Header** (`squarespace/head-injection.html` — PART 2 only, the `<svg>` block)
- The four SVG clip-path defs only
- Must be HTML, cannot go in Custom CSS

**2. Design › Custom CSS** (`squarespace/head-injection.html` — PART 1, the `<style>` contents)
- All CSS custom properties (`:root` token block)
- Shared utility classes: `.oa-container`, `.section-dark`, `.section-label`, `.logo-inline`, `.arrow`
- Reduced motion rule
- Font sizes (via Site Styles sliders for native elements; `--fs-*` vars for code blocks)
- Do NOT re-declare anything from this file inside a component code block

### What each component code block must NOT include
- Any CSS custom property already defined in the Custom CSS (colors, shadows, spacing tokens, font stacks, type scale vars) — reference them with `var(--...)` instead
- `@font-face` declarations — fonts are loaded via Squarespace's font system
- `.oa-container` definition — already global
- Any animation or scroll-reveal JS — not used in Squarespace blocks
- External script or stylesheet `<link>`/`<script src>` tags
- Unnecessary wrapper divs — keep the DOM as flat as possible

### Lightweight component rules
- CSS: scoped to a unique `.oa-[component]` wrapper class, no deeper than needed
- JS: only include a `<script>` tag if the component genuinely requires interaction (carousel arrows, accordion toggle). Wrap in an IIFE. No framework, no libraries.
- Hardcode values only when a CSS variable doesn't exist for it — prefer `var(--shadow-card-md)` over writing out the full shadow
- Use `filter: drop-shadow()` instead of `box-shadow` on cards inside scroll containers (avoids shadow clipping)
- No redundant comments inside component files beyond the header block

### Font matching in Squarespace components

Squarespace only applies its paragraph/heading styles to native HTML elements (`<p>`, `<h2>`, etc.). A `<div>` or `<span>` gets none of that — no font family, no weight.

**Rule:** any non-semantic element (`div`, `span`) that displays text must declare `font-family` and `font-weight` explicitly. Do not assume inheritance.

**Rule:** before writing a font size, verify the original standalone CSS. Check the element's own rule in `components.css` or the page `<style>` block first, then fall back to the base reset in `brand.css` (e.g. the base `p` rule is `--fs-p1`; an unstyled `div` has no implicit size). Never guess — open the file.

Quick reference for the most common cases:
- Body / paragraph copy: `font-family: var(--font-brand); font-weight: var(--fw-light);`
- Headings / labels: `font-family: var(--font-brand); font-weight: var(--fw-medium);`
- Base `p` size: `var(--fs-p1)` — secondary/caption text: `var(--fs-p2)`

In Squarespace code blocks, use `.oa-container` instead of `.container` to avoid collision with Squarespace's own `.container` class.

## Clip-path shapes

The curved image edges are SVG clip-paths defined inline in each HTML file as invisible `<svg width="0" height="0">` elements. The four shapes and their usage:

- `#clip-image-right` — concave left edge, image on the right (hero, final CTA)
- `#clip-image-left` — concave right edge, image on the left (american-biz section)
- `#clip-cta-right` — tighter concave left for the final CTA image
- `#clip-image-top` — rounded top curve for stacked mobile layouts

The SVG block must appear before any element that references these IDs. `components.js` also injects `#clip-image-top` as a fallback (it checks for the ID first, so no duplicate is created).

## Key design tokens

Colors: `--fuchsia` (#C33CD2, primary accent), `--navy` (#14143C, text + dark backgrounds), `--teal` (#3CC3D2, secondary accent). Tint variants follow the pattern `--fuchsia-80`, `--fuchsia-60`, etc. Alpha variants: `--fuchsia-alpha-30`, `--navy-alpha-08`, etc.

Fonts: `--font-brand` (Boing, loaded via local woff2 files), `--font-ui` (Josefin Sans, Google Fonts), `--font-data` (IBM Plex Mono).

Dark sections: add `.section-dark` to any `<section>` with `background: var(--navy)` — this class flips all child text to white via `components.css`.

## Responsive breakpoints

- `768px` — main breakpoint: split layouts stack vertically, side clip-paths replaced by top curve
- `480px` — compact adjustments only

## Squarespace component workflow

When asked to produce code for a Squarespace component (e.g. "give me the code for the FAQ"):
1. Create a new file in `squarespace/` named after the component in kebab-case (e.g. `squarespace/faq.html`)
2. Put the complete, paste-ready code in that file
3. Show the code in the chat as well so it can be copied immediately

When fixes or updates are requested for an existing component:
- Update the file in `squarespace/` — do not create a new file
- The file is always the source of truth for that component

## Squarespace component files

| File | Component | Page |
|---|---|---|
| `squarespace/head-injection.html` | CSS tokens + SVG clip-paths | site-wide (Code Injection › Header) |
| `squarespace/why-grid.html` | Why businesses choose OneAM — 4 icon cards | Home |
| `squarespace/testimonials.html` | What our customers say — carousel + arrows | Home |
| `squarespace/what-makes-us-different.html` | What makes us different — 4 circle-icon + text rows | About |
| `squarespace/stat-cards.html` | Stat cards — two centered $4.6T / 300,000+ cards | About |
| `squarespace/industries-grid.html` | Industries grid — 8 circle-icon + label items | Industries |
| `squarespace/faq.html` | FAQ accordion — 4 groups, 17 questions, expand-all toggle | Resources |
