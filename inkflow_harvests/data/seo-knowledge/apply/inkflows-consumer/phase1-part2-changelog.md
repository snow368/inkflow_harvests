# Phase 1 Part 2 — Depth Second-Pass + Tool-Page Internal Links

**Date:** 2026-07-12
**Scope:** (1) second-pass depth on 11 thin category pages; (2) Phase 1 #3 tool-page → product internal links.
**Status:** ✅ Implemented & type-checked (build sandbox-blocked at dist/ write, as expected).

---

## ① Second-pass depth — 11 thin categories

Added 3 new optional fields to `CategoryPageContent` and rendered them in
`src/pages/meaning/category/[category].astro` (after the "Original Data" section,
before the full symbol grid):

- `choosingGuide` — "How to Choose a {Category} Tattoo" (genuine decision content)
- `placementGuide` — "Best Placements & Sizing for {Category} Tattoos"
- `popularSymbols: { name, note }[]` — "Most-Requested {Category} Symbols" (real
  symbols/variations per category)

Categories expanded: geometric, religious, cultural, objects, modern, birds,
zodiac, insects, sea-life, time, words.

### Prose word count (template-string content only; excludes symbol grid + dataInsights)

| Category | Before* | After | Δ |
|----------|--------|-------|---|
| geometric | ~602 | 933 | +331 |
| religious | ~602 | 930 | +328 |
| cultural  | ~602 | 905 | +303 |
| objects   | ~602 | 872 | +270 |
| modern    | ~602 | 830 | +228 |
| birds     | ~602 | 833 | +231 |
| zodiac    | ~602 | 846 | +244 |
| insects   | ~602 | 820 | +218 |
| sea-life  | ~602 | 839 | +237 |
| time      | ~602 | 839 | +237 |
| words     | ~602 | 860 | +258 |
| **avg**   | **~602** | **~870** | **+268** |

\* baseline from `eeat-and-depth-changelog.md` first-pass (~602 words).

**Honesty note:** prose alone is ~870 words (not the literal 2000). The rendered
page ALSO shows each category's `dataInsights` (original-data bullets, ~100 words)
and its own symbol grid (names + meanings + descriptions), so total on-page text
comfortably passes 1,000 words. Pushing prose to a literal 2000 would require
padding; we stopped at genuine, useful content. If you want the literal 2000,
the clean next step is a 3rd paragraph on each `choosingGuide` ("what to brief
your artist").

**Fix during implementation:** 3 `popularSymbols` notes contained an apostrophe
inside a single-quoted TS string (`limb's`, `sailor's`, `one's`) — broke
compilation. Rephrased; `tsc --noEmit` on the data file is now 0 errors.

---

## ② Phase 1 #3 — tool-page → product internal links (12 links)

Added a "Run Your Studio on InkFlow" section (2 product internal links each)
before the final CTA on all 6 free-tool pages:

| Tool page | Link 1 | Link 2 |
|---|---|---|
| tattoo-meaning-finder | /features/index | /pricing |
| free-waiver-generator | /features/tattoo-waiver-software | /compare/best-tattoo-waiver-app |
| commission-calculator | /features/tattoo-crm-software | /blog/multi-artist-commission-tracking |
| no-show-calculator | /features/tattoo-booking-software* | /blog/reduce-no-shows-deposit-booking |
| aftercare-email-generator | /features/tattoo-aftercare-software-automation | /blog/tattoo-aftercare-email-automation |
| tattoo-price-calculator | /features/tattoo-ink-passport | /pricing |

\* Blueprint's `/features/tattoo-deposit-software` does not exist (verified against
`src/pages/features/`); substituted `/features/tattoo-booking-software` (booking
software handles deposits in practice). All other 11 target routes verified to exist.

**All 12 target routes verified present** before linking (broken internal links
hurt SEO). Total Phase 1 internal links now = 230 (prior) + 12 = **242**.

---

## Validation

- `tsc --noEmit` on `src/data/tattoo-category-content.ts` → 0 errors.
- `astro build` reached the emit/write stage (compile of all `.astro`/`.ts`
  changes passed) and was only blocked by the sandbox `dist/` write — run locally
  to finish, then `wrangler pages deploy dist --project-name ink-flow`.
- Remaining 466 `tsc` errors are pre-existing `noImplicitAny` in unrelated
  React/`lib` files; `astro build` (esbuild) ignores them.

## Net effect on the Noel Ceta ranking model

- Depth: +268 words/page of genuine content on 11 thin pages → stronger
  "comprehensive content" signal (depth factor, +25 pts at 2000+; we're now
  materially past the old ~350-word thin band).
- Internal links: +12 tool→product links closes the last Phase 1 gap (#3),
  funneling link equity from the free-tool link-magnets into the money pages.
