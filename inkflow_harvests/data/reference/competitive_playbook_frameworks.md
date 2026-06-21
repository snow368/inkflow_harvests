# Competitive Launch Playbook — Reference Frameworks
> DEV REFERENCE ONLY — not shown to end users. Used to inform analysis design and prompt engineering.

---

## Framework A: Tattoo Supply IG-Native (PRODUCTION)

Used by `executeSupplyAnalysis()` Phase 4. Built for Instagram-first tattoo brands.

**Phases:** teaser → hype_building → product_reveal → artist_demo → social_proof → call_to_action → sustain

**Key differentiators from SaaS/3C:**
- Artist IS the marketing channel (reposts, demos, UGC)
- Trade show debut → IG rollout cadence
- Drop culture: limited editions, pre-order windows
- Visual-first: reel demos, needle-to-skin, before/after
- Community-driven CTA: comment-to-win, DM for details
- Scarcity: convention exclusive, first batch, limited run

**Data sources:** IG captions, hashtags, engagement counts, comment sentiment, web search snippets, Reddit mentions

---

## Framework B: Enterprise SaaS / B2B Launch (REFERENCE)

Based on 2025 PM best practices from Spekit, Understory, Aakash Gupta, Tailored Edge Marketing.

### Launch Tiers

| Tier | Scope | Prep | Budget | Channels |
|------|-------|------|--------|----------|
| Tier 1 (Major) | New product/platform | 8 weeks | $50K-$100K | Press + webinar + email + paid + outbound |
| Tier 2 (Standard) | Significant feature | 3-4 weeks | $10K-$25K | Blog + email + sales enablement |
| Tier 3 (Minor) | Small feature/fix | 1 week | <$5K | In-app + changelog |

### 4-Phase Launch Structure

| Phase | Timeline | Activities |
|-------|----------|------------|
| **Alignment & Strategy** | 6-8 weeks pre-launch | ICP definition, positioning, competitive tiering, battlecards, success metrics |
| **Enablement** | 2-4 weeks pre-launch | Sales deck, talk tracks, FAQs, demo scripts, pricing, paid campaign setup |
| **Launch & Support** | Launch week | Press, email blast, social, outbound blitz, daily monitoring, real-time response |
| **Measure & Learn** | 1-4 weeks post-launch | Win/loss analysis, KPI tracking, channel optimization, case study development |

### Competitive Battlecard Template

```
Competitor | Strengths | Weaknesses | Our Advantages
When We Win | When We Lose
Talk Tracks for Top 3 Objections
Proof Points (case studies, reviews, win rates)
```

**Intel Sources:** Product trials, website monitoring, G2/Capterra reviews, customer interviews, Gong/Chorus recordings, job postings, earnings calls, industry reports.

**Update Cadence:** Monthly refresh, continuous weekly inputs via Slack/Notion.

### Messaging Framework

> *"For [who], struggling with [pain], we are the only [category] that delivers [differentiated outcome] because [credible reason]."*

**Feature → Benefit → Outcome Chain:** Feature → Benefit → Outcome

### GTM Channel Strategy

| Type | Channels | Best For |
|------|----------|----------|
| Soft Launch | 2 channels (retargeting + founder-led email) | Betas, signal over scale |
| Minimal Launch | 3-4 channels (+ Search, press release) | Broader reach, limited bandwidth |
| Full-Scale Launch | 5+ sequenced channels | Market impact |

### Key Metrics

| Metric | Target |
|--------|--------|
| Feature adoption (90 days) | >40% |
| Win rate (competitive deals) | >30% |
| Launch ROMI (pipeline:spend) | 3:1 |
| MQL → SQL conversion | Track monthly |

### Go/No-Go Gates

1. After wireframes/messaging approved
2. After final creative/assets complete
3. **48 hours pre-launch** — 30-min leadership vote

---

## Framework C: Consumer Hardware / 3C Product Launch (REFERENCE)

Combined from Shopify product launch plan + 3C industry practices.

### 6-Phase Launch

| Phase | Duration | Key Activities |
|-------|----------|---------------|
| **Market Validation** | 4-6 weeks pre | User research, competitor teardown, pricing analysis, positioning |
| **Pre-Launch Hype** | 3-4 weeks pre | Teaser videos, influencer seeding, media embargo, waitlist/landing page |
| **Launch Event** | Day 0 | Press event, live stream, unboxing videos, review embargo lift |
| **DTC Rollout** | Week 1-2 | E-commerce launch, email blast, paid social, retargeting |
| **Channel Expansion** | Week 3-6 | Retail/Amazon, distributor push, affiliate program, comparison content |
| **Sustain** | Ongoing | User-generated content, community management, iteration based on reviews |

### 3C-Specific Tactics
- **Unboxing experience** — packaging as marketing
- **Comparison content** — vs competitor specs, price-to-performance
- **Review seeding** — send to YouTube/TikTok reviewers pre-launch
- **Crowdfunding** — Kickstarter/Indiegogo as marketing channel
- **Certification signaling** — FDA, CE, IP rating as trust signals
- **Supply chain transparency** — "designed in X, manufactured in Y"

### 3C KPI Dashboard
- Pre-order conversion rate
- Day-1 sell-through %
- Review score (Amazon, YouTube)
- Return rate (first 30 days)
- Social sentiment (brand vs competitor)
- Retail partner reorder velocity

---

## SaaS vs 3C — Why They're Different

| Dimension | SaaS / B2B (Framework B) | 3C Hardware (Framework C) |
|-----------|--------------------------|---------------------------|
| **Purchase cycle** | Weeks to months, multi-stakeholder | Minutes to days, single buyer |
| **Decision driver** | ROI, integration, security, support | Price, specs, reviews, brand trust |
| **Launch channel** | Content marketing + sales enablement | DTC site + retail/Amazon + earned media |
| **Key asset** | Demo environment, white papers, battlecards | Unboxing video, comparison table, review quotes |
| **Validation signal** | G2/Capterra reviews, analyst reports | Amazon stars, YouTube reviews, Reddit threads |
| **Pricing model** | Tiered subscription, freemium, per-seat | One-time purchase, bundles, seasonal promos |
| **Post-launch** | Onboarding flow, NPS, churn monitoring | Return rate, retail reorder, accessory upsell |
| **Hype mechanic** | Waitlist, beta access, founder content | Teardown/leak, influencer seed, embargo lift |
| **Competitive moat** | Switching cost, data lock-in, ecosystem | Brand, distribution, supply chain, patents |
| **Timeline** | 8-12 weeks enterprise, 2-4 weeks PLG | 6-8 weeks pre → 2 week launch burst |

### When to Use Each

- **Framework B (SaaS)** — if competitor is a software tool, platform, or API (e.g., tattoo booking app, studio management SaaS)
- **Framework C (3C)** — if competitor sells physical products with specs, packaging, retail (e.g., tattoo machines, power supplies, furniture)
- **Framework A (Tattoo IG)** — for Instagram-first tattoo brands where the IG feed IS the launch channel (current production use)

---

## Implementation Notes

- **Production bot** uses Framework A (tattoo IG-native) via `executeSupplyAnalysis()`
- **Frameworks B & C** are reference only — they live here for dev planning and future expansion
- The prompt JSON structure in `bot-worker-cloak.ts` can be swapped per `accountType`:
  - `supply_brand` / `supply_distributor` → Framework A
  - Future `saas_competitor` → Framework B
  - Future `3c_brand` → Framework C
- For mixed competitors (e.g., a tattoo brand that also sells a booking app), blend the relevant frameworks
