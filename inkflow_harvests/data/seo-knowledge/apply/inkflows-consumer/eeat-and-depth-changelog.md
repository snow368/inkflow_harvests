# E-E-A-T Source Upgrade + Category Depth Expansion — Changelog

> Date: 2026-07-12
> Files changed: `src/data/tattoo-category-content.ts` (E-E-A-T + 11 thin pages)
> Validated: `tsc --noEmit` on the data file = 0 errors. No Wikipedia URLs remain.

---

## ① E-E-A-T Authority Source Upgrade (all 15 categories)

Replaced every `CATEGORY_EEAT.sources` Wikipedia entry with verified real authorities per
`eeat-authority-source-plan.md`. Also upgraded the shared `EEAT_EXPERIENCE` block with two
citable industry stats.

### New source map (label → url)

| Category | Source 1 | Source 2 |
|----------|----------|----------|
| animals | Smithsonian (Krutak, Ötzi / biography language) | Wohlrab et al. 2007, Body Image (DOI) |
| flowers | Wohlrab et al. 2007 (DOI) | Smithsonian (Krutak) |
| nature | Smithsonian (Krutak, Ötzi) | Wohlrab et al. 2007 (DOI) |
| mythological | Wohlrab et al. 2007 (DOI) | Smithsonian (Krutak) |
| geometric | Jung, *Man and His Symbols* (1964, worldcat ISBN) | Wohlrab et al. 2007 (DOI) |
| religious | British Museum collection (Eye of Horus) | Wohlrab et al. 2007 (DOI) |
| cultural | National Geographic (Polynesian tatau) | Smithsonian (Krutak) |
| modern | IBISWorld (US $1.3B, 2025) | Ipsos (30% US adults, 2019) |
| objects | Wohlrab et al. 2007 (DOI) | IBISWorld (US industry) |
| birds | Smithsonian (Krutak) | Wohlrab et al. 2007 (DOI) |
| zodiac | Wohlrab et al. 2007 (DOI) | Smithsonian (Krutak) |
| insects | Wohlrab et al. 2007 (DOI) | Smithsonian (Krutak) |
| sea-life | National Geographic (Polynesian tatau) | Smithsonian (Krutak) |
| time | British Museum collection (memento mori) | Wohlrab et al. 2007 (DOI) |
| words | Wohlrab et al. 2007 (DOI) | Smithsonian (Krutak) |

### Global Experience gain (shared EEAT_EXPERIENCE)
Added: "about 30% of U.S. adults now have at least one tattoo (Ipsos, 2019), up from 21% in 2012,
and the U.S. tattoo industry reached $1.3 billion in 2025 (IBISWorld)."

**Notes / honesty flags**
- Wohlrab et al. 2007 DOI `10.1016/j.bodyim.2006.12.001` is a real, citable peer-reviewed source
  and is used broadly (motivation claim applies to every category).
- Jung has no stable URL; used `worldcat.org/isbn/9780385052219` (ISBN lookup, real pattern).
- British Museum: used the collection root (`britishmuseum.org/collection`) — stable, no fabricated object ID.
- Per the original plan §8, mythological / zodiac / insects / words were flagged "batch 2 (per-DOI
  academic verification)." We upgraded them OFF Wikipedia now using the strong verified general
  sources (Smithsonian + Wohlrab) as an interim; niche academic DOIs for those four can still be
  added later if you want maximum precision.

---

## ② Category Depth Expansion (11 thin pages)

Added `deepDive` (2–3 paragraphs) + `didYouKnow` (4 bullets) + expanded `faqs` from 3 → 5 for the
11 thin categories: geometric, religious, cultural, objects, modern, birds, zodiac, insects,
sea-life, time, words. All content is dataset-grounded (uses each category's own `dataInsights`
as anchors) — no padding.

### Prose word count (backtick string content per category, excludes symbol grid)

| Category | Before* | After | Δ |
|----------|--------|-------|---|
| geometric | ~350 | 676 | +326 |
| religious | ~350 | 668 | +318 |
| cultural | ~350 | 657 | +307 |
| objects | ~350 | 598 | +248 |
| modern | ~350 | 569 | +219 |
| birds | ~350 | 576 | +226 |
| zodiac | ~350 | 602 | +252 |
| insects | ~350 | 570 | +220 |
| sea-life | ~350 | 528 | +178 |
| time | ~350 | 585 | +235 |
| words | ~350 | 598 | +248 |
| **avg** | **~350** | **602** | **+252** |

\* approximate, pre-expansion thin-page baseline (intro + 3 FAQs + dataInsights).

**Honest status on the "2000+ words" target:** the prose is now ~600 words/category (doubled),
NOT 2000. Reasons and options:
- The rendered page ALSO shows the category's own symbol grid (e.g. geometric = 11 symbols, each
  with a name + meaning), which adds real on-page text beyond the prose counted above.
- Pushing prose to a literal 2000 words/category would require padding and would hurt quality/readability.
- If you want to push the depth score further with *genuine* content, the clean next step is a
  second pass adding per-category: "How to choose a {category} tattoo", "Placement & sizing guide",
  and a "Most-requested {category} symbols" detailed section — that can lift prose to ~1000–1200
  sustainably. Say the word and I'll do it.

---

## Validation
- `tsc --noEmit` on `src/data/tattoo-category-content.ts` → 0 errors.
- `grep -c wikipedia` on the file → 0 (all Wikipedia sources removed).
- Build is blocked in the sandbox (dist/ write) — run `npm run build` locally, then
  `wrangler pages deploy dist --project-name ink-flow`.

## Net effect on the Noel Ceta ranking model
- E-E-A-T sources upgraded → stronger Trust/Authoritativeness signal (factor not separately scored
  but feeds the "intent match + depth" cluster and AI-citation likelihood).
- Depth +252 words/page on the 11 thin pages → moves them from the ~350-word band toward the
  comprehensive band. Combined with the earlier `dataInsights` (original data, +89% top-10 factor)
  and the internal-link work (Phase 1, +230 links), the 11 thin pages are now materially stronger
  than at session start.
