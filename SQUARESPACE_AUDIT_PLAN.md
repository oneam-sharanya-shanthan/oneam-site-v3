# Squarespace Site Audit — Plan

## Goal
Audit the **live** Squarespace deployment (oneam.us) plus the `squarespace/` component
files in this repo for unnecessary, redundant, or inefficient code — both globally
(`squarespace/head-injection-v2.css` / `head-injection.html`) and per-component. This is
a **read-only audit**: produce a findings report, do not apply fixes.

Context: this repo is a fast Squarespace deployment (see root `CLAUDE.md`). Site-wide
CSS/tokens live in Design → Custom CSS, served live at a URL like
`static1.squarespace.com/static/custom-css/<site-id>/<page-id>/<rev>/custom.css`
(found via the `<link rel="stylesheet">` tags on any live page — grep for `custom-css`
and `versioned-site-css` in the page source). Component-specific code blocks are
individually pasted into Squarespace pages from files in `squarespace/*.html`. Squarespace's
own generated CSS (`site.css`) frequently defines the *same* classes our custom CSS
targets, at equal specificity — so what looks dead or redundant in isolation may be a
necessary override. Confirm against the live DOM before flagging anything.

## Known prior finding (don't re-discover, just confirm still true)
On `oneam.us/insights`, the CSS rules `.summary-thumbnail-container` and
`.summary-title-link` in `head-injection-v2.css` do not match anything in the live DOM —
that page actually uses Squarespace's native "Blog Basic Grid" block
(`.blog-basic-grid--container`, `.image-wrapper`, `.blog-title`), not a Summary block.
Those two rules are currently dead code for that page (though may be intentionally kept
in case a Summary block is used elsewhere — check for that before recommending removal).

## Step 1 — Discover the live page list
Fetch `https://www.oneam.us/` and extract every internal nav link (from `.header-nav-wrapper`
or equivalent) to build the full list of live pages to check. Don't guess/hardcode a page
list — derive it from the live nav so the audit stays correct if pages are added/removed.
Expect something like: Home, About, Team, Industries, Resources, Insights, Contact.

## Step 2 — Per-page pass (repeat for every discovered page)
For each live page URL:
1. `curl` the raw HTML.
2. Extract the `custom.css` and `site.css` (or `versioned-site-css`) stylesheet links from
   the `<link>` tags and fetch both.
3. Extract every class name actually present in that page's rendered HTML.
4. Cross-reference against:
   - `squarespace/head-injection-v2.css` (or `head-injection.html`) — flag any selector
     that matches nothing on this page. A selector only counts as globally dead once it's
     been checked against *every* discovered page, not just one.
   - The specific `squarespace/*.html` component file mapped to this page in the
     `CLAUDE.md` "Squarespace component files" table — confirm the file's classes
     (`.oa-*` wrappers) actually appear in the live DOM, and flag any page/file mismatches
     (a component file that doesn't match what's actually live, à la the Insights case).
5. Note any inline `!important` or high-specificity hacks and check whether Squarespace's
   own `site.css` still requires them (i.e. still same-specificity class-selector conflict)
   or whether it's legacy/no-longer-needed.

## Step 3 — Global CSS token audit
In `head-injection-v2.css`:
- For every `--token` defined in `:root`, grep for usages across (a) the rest of that file,
  (b) every `squarespace/*.html` component file, and (c) all fetched live-page HTML/CSS.
  Flag tokens with zero usages anywhere as removal candidates.
- Flag any duplicate/overlapping rules (e.g. two selectors setting the same property to the
  same value where one could be merged or removed).
- Flag any hardcoded color/shadow/spacing values in component files that duplicate an
  existing token (per CLAUDE.md: "Hardcode values only when a CSS variable doesn't exist").

## Step 4 — Per-component review
For each file in `squarespace/*.html`, check against the CLAUDE.md component rules:
- No re-declared global custom properties/utilities (`.oa-container`, tokens, etc.)
- No `@font-face` declarations
- No animation/scroll-reveal JS
- No external `<script src>`/`<link>` tags
- JS wrapped in an IIFE, only present if the component needs interaction
- Non-semantic elements (`div`/`span`) with visible text have explicit `font-family` +
  `font-weight`
- Flag unnecessary wrapper divs / DOM bloat

## Step 5 — Deliverable
Produce a single prioritized report (no code changes applied) with:
- **Confirmed dead CSS** — selector, file:line, which live page(s) were checked to confirm
  it matches nothing anywhere.
- **Unused tokens** — token name, definition location, confirmation no usage was found.
- **File/page mismatches** — component file vs. what's actually live.
- **Redundancy/simplification opportunities** — grouped by risk: safe-to-remove vs.
  needs-confirmation-from-user (anything touching `!important` overrides should default
  to needs-confirmation, since those were often added to fight a real specificity battle).
- Do **not** edit any files as part of this audit — only report findings.

Outcome: shipped as `squarespace/head-injection-v3.css` (dead selectors + unused tokens
removed, `--fs-h2`/`--fs-h3` kept intentionally). `header-injection.html` /
`footer-injection.html` were split out as the live site-wide Code Injection blocks
(replacing the old `head-injection.html` / `head-injection-current.css`, both deleted).

---

## Performance / SEO / GEO evaluation — 2026-07-07

Live-DOM audit of all 7 pages (home, about, team, industries, faq, insights, contact)
plus `robots.txt` / `sitemap.xml`. Read-only — no fixes applied.

### Performance
- **Two render-blocking 3rd-party scripts in `header-injection.html`, both confirmed
  unused in the live DOM:** Will-Myers Toolkit (`toolkit@1`, 6.6 KB gzip) and Swiper
  bundle (`swiper@11`, 43 KB gzip — the single largest 3rd-party asset on the site).
  Neither has `async`/`defer`; they're the *only* two blocking `<script>` tags in
  `<head>` on any page (Squarespace's own 41 platform scripts are 100% async/defer).
  Zero `swiper-container`/`-wrapper`/`-slide` or `data-wm-*` markup found anywhere —
  testimonials already use a hand-rolled `.oa-carousel-*` carousel instead.
- **sectionSlider CSS+JS** (`sectionSlider@5`, ~11 KB gzip combined) — also confirmed
  unused (no matching class/data-attribute on any page). Non-blocking but still two
  wasted requests site-wide.
- **Will-Myers Popup CSS+JS — keep, in active use.** Powers the ~10 team-member bio
  popups on `/team` (`href="#wm-popup=/<slug>"`). Only used on one page but that's
  expected for a site-wide injection.
- **SVG clip-paths — keep, in active use.** `clip-image-right`/`-top`/`-left` are
  applied via per-block custom CSS on Home/About/Team/Industries/FAQ (wired up through
  the Squarespace editor, invisible to the repo). `clip-cta-right` alone has zero
  matching `clip-path:` rule anywhere — low-value dead weight bundled in the same SVG.
- **Our own code is not the problem.** `head-injection-v3.css` is ~5 KB, component
  files are all lean single-purpose blocks. The bloat is 100% leftover 3rd-party plugin
  injections, not custom CSS/JS we wrote.
- Images are served through Squarespace's CDN with responsive `srcset`/lazy-load
  already in place — no action needed there.

### SEO
- **Homepage `<title>` is just "OneAM"** — no keywords, no value prop — while every
  other page has a full descriptive title. This is backwards; the homepage is usually
  the highest-authority page and should carry the strongest title.
- **`/about` has 5 `<h1>` tags; `/insights` has 21.** About's extra H1s look like
  separate text/quote blocks manually styled as "Heading 1" in the editor for size
  rather than semantics — fixable by changing their heading level. Insights' 20 extra
  H1s are one-per-card from Squarespace's native Blog Basic Grid template
  (`h1.blog-title`) — a platform template quirk, not something our code controls.
- **Missing alt text is widespread:** Team 12/14 images empty `alt=""` (headshots —
  filenames literally have the person's name, e.g. `ksusha-mccormick.jpg`), Insights
  22/24, Home 5/12, About/Industries/FAQ 3/5 each, Contact 2/4. Easy, high-value fix via
  each image block's alt-text field in the editor.
- **`sitemap.xml` is stale and actively wrong.** All 28 listed URLs are either 404
  (`/solutions`, `/company`) or 301-redirects (`/resources` and 25 `/resources/*` posts,
  which now live at `/insights/*`). **None of the current live pages** (`/about`,
  `/team`, `/industries`, `/faq`, `/insights`) appear in the sitemap at all. This wastes
  crawl budget on dead URLs while omitting the real site structure — worth checking
  Squarespace's page-indexing/collection settings for why it hasn't regenerated.
- `robots.txt` and canonical tags (checked `/` vs `/home` duplicate) are both correctly
  configured — no action needed.

### GEO (AI answer-engine optimization)
- **Biggest opportunity: the FAQ page has 17 fully-formed Q&A pairs in clean semantic
  `<details>/<summary>` markup, but zero `FAQPage` schema.org JSON-LD** (only generic
  site-wide `WebSite`/`LocalBusiness` schema). This is the single highest-leverage GEO
  fix available — AI answer engines and Google AI Overviews both favor explicit
  Q&A structured data for extraction/citation, and the content is already shaped for it.
- `robots.txt` explicitly lists every major AI crawler (ClaudeBot, GPTBot,
  Google-Extended, anthropic-ai, etc.) but doesn't actually `Disallow` any of them —
  they fall into the same `User-agent: *` group as everyone else, so nothing is
  blocking AI ingestion. Good baseline, no change needed.
- No `llms.txt` (404). Emerging, unofficial convention — optional/low-priority, not a
  proven signal yet.
- The multi-H1 and stale-sitemap issues above hurt GEO the same way they hurt SEO — AI
  crawlers use the same structural signals to judge topical authority and site map.
- Content is plain server-rendered HTML (verified via raw `curl`, no JS execution
  needed) — AI crawlers/scrapers can read full text directly. No action needed.
