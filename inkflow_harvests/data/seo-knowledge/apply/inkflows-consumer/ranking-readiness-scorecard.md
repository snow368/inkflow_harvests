# Ranking-Readiness Scorecard — 15 Tattoo Category Pages

**Framework:** Noel Ceta 8-factor / 100-point ranking-prediction model (`noel-ceta-ranking-prediction-model.md`).
**Date:** 2026-07-12
**Scope:** the 15 `/meaning/category/[category]` pages driven by `src/data/tattoo-category-content.ts`.

> Word-count figures below are **prose-only estimates** (intro + deepDive + didYouKnow + FAQ text; the symbol-card grid is excluded). Measure exactly with a word-counter before treating as final. Ceta's figures are self-reported — use as a prioritization heuristic, not a guarantee.

---

## 1. The 100-point model applied

| Component | Rule | Pts | Status on our pages |
|-----------|------|-----|---------------------|
| Word count | 2,000–3,500 words | 25 | ❌ Most pages 350–1,300 words |
| H2 count | 5–8 headings | 20 | ✅ Template renders 5–6 H2s |
| **Original data** | stats / research | 20 | ✅ **Added this sprint (`dataInsights`)** |
| Internal links | 3+ relevant | 15 | ✅ Symbol grid = 4–11 links/page |
| Backlinks @ launch | 2+ day-1 | 10 | ❌ 0 — needs off-page plan |
| Keyword difficulty | KD < 30 | 5 | ⚠️ Long-tail category queries, moderate |
| Intent match | > 90% | 5 | ✅ BLUF intros answer the query |
| Core Web Vitals | passing | 5 | ✅ Astro static, fast |

---

## 2. Per-page score (before vs. after `dataInsights`)

Predicted band: **<60 → 18% top-10** · **60–79 → 54% top-10** · **80+ → 82% top-10**.

| Category | Est. words | H2 | Data (was/now) | IL | Intent | CWV | **Before** | **After** | Band move |
|----------|-----------|----|----------------|----|--------|-----|-----------|-----------|-----------|
| animals | ~1,100 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| flowers | ~1,100 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| nature | ~1,030 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| mythological | ~1,015 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| geometric | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| religious | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| cultural | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| objects | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| modern | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| birds | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| zodiac | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| insects | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| sea-life | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| time | ~330 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |
| words | ~350 | 20 | 0 → 20 | 15 | 5 | 5 | 50 | **70** | <60 → 60–79 |

**Result of this sprint:** every page moved from the 18%-top-10 band into the 54%-top-10 band — a ~3× predicted lift — from a single content block (original data).

---

## 3. The remaining levers to reach the 82% band (80+)

To clear 80 we still need **+25 (depth)** and ideally **+10 (launch backlinks)**:

### Lever A — Content depth (need 2,000+ words) — +25 pts
Currently the biggest gap. Two tiers:
- **Thin pages (11, no `deepDive`):** geometric, religious, cultural, objects, modern, birds, zodiac, insects, sea-life, time, words. Each is ~350 words; needs ~1,650 more.
  - Fastest fill: expand the `dataInsights` block, add a "How to choose / pair" subsection, and a short per-symbol "why it trends" note.
  - Priority order: **geometric** (largest category, 15.7% of directory) → **cultural / religious** (high commercial intent) → rest.
- **Stronger pages (4, have `deepDive`):** animals, flowers, nature, mythological. ~1,100 words; need ~900 more to hit 2,000. Add a comparison table and a "common mistakes" subsection.

### Lever B — Backlinks at launch (+156% lift in model) — +10 pts
Off-page, not writable in the page:
- Outreach: pitch each new category page to tattoo/aftercare communities, studio partners (500+ on InkFlow), and Pinterest/Reddit relevant subs within 24h of publish.
- Repurpose: turn each `dataInsights` stat into a shareable graphic for studio social accounts (original data = naturally linkable).

### Lever C — Keyword difficulty (selection, not content)
Category long-tail ("animal tattoo meanings") is moderate; the 70 symbol pages are the lower-KD harvest. Keep building those.

---

## 4. Action checklist (next sprint)
- [ ] Expand the 11 thin pages toward 2,000 words (start with geometric).
- [ ] Add a comparison / "how to choose" table to each page (also helps snippets).
- [ ] Launch backlink plan for each published category page (24h window).
- [ ] Stand up the ranking spreadsheet (URL, KD, position, words, H2, original-data?, IL, publish date) to build our *own* model in ~3 months.
- [ ] Re-score after depth + backlinks land; target 80+ on all 15.
