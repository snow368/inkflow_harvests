# Noel Ceta — Ranking Prediction Model (content pre-publish scorecard)

**Source:** [@noelcetaSEO on X](https://x.com/noelcetaSEO/status/2076011291957703151) — thread, 2026.
**Captured into InkFlow SEO knowledge base:** 2026-07-12

> ⚠️ **Reliability note (E-E-A-T):** These numbers are **self-reported by one marketer**, not peer-reviewed or independently reproduced. Treat them as a *directional framework / hypothesis*, not established fact. Use it to prioritize effort, then validate against our own InkFlow data (Search Console rankings) over time.

---

## 1. The claim

> "Before publishing, I can predict if content will rank. I built a model analyzing 2,400 published pieces. It predicts top 10 rankings with 82% accuracy."

The thread then explains **how to build your own** model. Core idea: content performance is *predictable*, not random — score each piece against the factors that correlate with top-10 rankings, and only publish when the score clears a threshold.

---

## 2. The 8 factors that correlate with top-10 rankings

Each factor's **top-10 rate lift** is the reported correlation (pages that have it vs. those that don't):

| # | Factor | Reported top-10 lift | Type | Controllable in-page? |
|---|--------|----------------------|------|------------------------|
| 1 | **Content depth** (3,000+ words) | **+67%** | Content | ✅ |
| 2 | **Heading structure** (5+ H2s) | **+45%** | Content | ✅ |
| 3 | **Original data** (stats / research) | **+89%** | Content | ✅ |
| 4 | **Internal links** (3+ relevant) | **+23%** | Content | ✅ |
| 5 | **Backlinks at launch** (3+ links day 1) | **+156%** | Off-page | ❌ (outreach) |
| 6 | **Keyword difficulty** (<30) | **+78%** | Keyword selection | ⚠️ (choose query) |
| 7 | **Search intent match** (perfect) | **+92%** | Content | ✅ |
| 8 | **Core Web Vitals** (passing) | **+34%** | Technical | ❌ (dev) |

**Takeaway for InkFlow:** 4 of the 8 highest-leverage factors are things we control *in the page content* — and #3 (Original data, +89%) and #7 (Intent match, +92%) are the two biggest content levers. #5 (backlinks at launch, +156%) is the single largest lift but requires an off-page workflow, not just writing.

---

## 3. The 100-point scoring formula

Score each piece before publishing:

| Component | Rule | Points |
|-----------|------|--------|
| Word count | 2,000–3,500 words | **25** |
| H2 count | 5–8 headings | **20** |
| Original data | includes stats / research | **20** |
| Internal links | 3+ relevant internal links | **15** |
| Backlinks day 1 | 2+ links at publish | **10** |
| Keyword difficulty | KD < 30 | **5** |
| Intent match | > 90% | **5** |
| Core Web Vitals | passing | **5** |
| **Total** | | **100** |

---

## 4. Reported benchmark (the payoff)

| Score band | Top-10 rate (within 3 mo) | Avg. position |
|------------|---------------------------|---------------|
| **80+** | **82%** | 5.3 |
| 60–79 | 54% | 12.4 |
| < 60 | 18% | 23.1 |

The jump from the 60–79 band (54%) to the 80+ band (82%) is exactly what a single **Original-data section (+20)** can buy a page that is otherwise solid — which is the core action we took for the 15 tattoo category pages (see `ranking-readiness-scorecard.md`).

---

## 5. How to build your own model (the 7 steps)

1. **Collect historical data** — spreadsheet of published URLs with ranking outcome (top 3 / top 10 / top 50 / unranked) + metrics.
2. **Score each piece** (0–100) on the 8 factors.
3. **Correlation analysis** — plot score (X) vs. ranking outcome (Y); which factors correlate strongest?
4. **Weight factors** — which matter most for *your* niche?
5. **Build scoring formula.**
6. **Test on ~200 new pieces.**
7. **Refine** based on actual accuracy (he recommends a 2–3 week build per niche, then ongoing monthly refinement).

Minimum ~100 pieces to start; 500+ is better.

> **InkFlow application:** we don't yet have 100+ ranked pieces of our own. Until we do, use Ceta's weights as a *prioritization heuristic*, and start logging our 15 category pages + 70 symbol pages in a spreadsheet (URL, target keyword, KD, current position, word count, H2 count, has original data?, internal links, publish date) so we can build our own model in ~3 months.

---

## 6. Mapping to the InkFlow tattoo project

| Factor | Current state on category pages | Action |
|--------|--------------------------------|--------|
| Content depth (25) | Most pages ~800–1,400 words; below 2,000 | Add depth: dataInsights + expand intros (see scorecard) |
| Heading structure (20) | 5–6 H2s already rendered by template | ✅ Met |
| **Original data (20)** | **Was 0 — no stats/research on page** | ✅ **Added `dataInsights` section to all 15 categories (this sprint)** |
| Internal links (15) | Symbol grid = 4–11 internal links/page | ✅ Met |
| Backlinks at launch (10) | 0 at launch | ❌ Needs off-page outreach plan |
| Keyword difficulty (5) | Category long-tail (e.g. "animal tattoo meanings") moderate | ⚠️ Keep building long-tail symbol pages |
| Intent match (5) | Strong BLUF intros match intent | ✅ Met |
| Core Web Vitals (5) | Astro static, fast | ✅ Met |

**Net:** adding the Original-data section moves a typical page from ~65 (54% band) to ~85 (82% band) on the model's own math — the single highest-ROI content change available to us right now.

---

## 7. What this means for "写内容板块" (content sections)

Priority order when writing any new InkFlow content page:

1. **Lead with original data** — our own 70-symbol dataset, studio intake notes (500+ studios), tool usage. This is the +89% lever and the hardest for competitors to copy.
2. **Hit 5+ H2s and 2,000+ words** — structure + depth.
3. **3+ internal links** — already automatic via symbol grids; add contextual links in prose.
4. **Perfect intent match** — answer the query in the first paragraph (BLUF).
5. **Pair with launch backlinks** — content alone caps at ~90/100; the last 10 points need off-page.

See `ranking-readiness-scorecard.md` for the per-page application.

---

## 8. 完整回复串捕获（Reply 3–14，上一版遗漏的部分）

> 上一版只抓到主推 + 第一句编号。以下是完整 14 条回复串的逐条逐字转述——这些是模型**真正可操作**的部分。

### Reply 3 — Top-10 表现者 vs 垫底页面的真实均值（建模基准）

分析 2,400 篇后的分组均值：

| 指标 | Top-10 表现者 | 垫底表现者 |
|------|--------------|-----------|
| 词数 | 3,240 | 1,450 |
| H2 数 | 7.2 | 2.1 |
| 含原创数据 | 87% | 12% |
| 内链数 | 4.1 | 0.4 |
| 发布日外链 | 2.3 | 0 |
| 关键词难度 KD | 24 | 42 |
| 意图匹配 | 96% | 68% |
| Core Web Vitals 通过 | 98% | 64% |

→ 差距巨大，这正是 §2 权重与 §3 公式的来源。

### Reply 5 — Step 1 数据收集表格模板（建自己的模型）

建一张表，列：
- **A:** URL
- **B:** Keyword
- **C:** 当前排名位置
- **D:** 词数
- **E:** H2 数
- **F:** 含原创数据？(是/否)
- **G:** 内链数
- **H:** 发布日外链数
- **I:** 关键词难度 KD
- **J:** 意图匹配 (%)
- **K:** CWV 通过？(是/否)

最少 100 篇，500+ 更好。**→ 已落成 `seo-targets/inkflow-ranking-scorecard.csv`（列 A–K + 公式分 + 行动列）。**

### Reply 6 — Step 2 精确打分公式（0–100）

- 词数 2,000–3,500 = **25**
- H2 数 5–8 = **20**
- 原创数据 = **20**
- 内链 3+ = **15**
- 发布日外链 2+ = **10**
- KD < 30 = **5**
- 意图 > 90% = **5**
- CWV 通过 = **5**

（已在 §3 收录）

### Reply 7 — Step 3–4 相关性分析

X 轴 = 内容分(0–100)，Y 轴 = 排名结果(top3/top10/top50/未排名)。看：高分是否排名更好？哪些因子相关性最强？有无例外？据模式调整权重。

### Reply 8 — 真实示例（分数段预测，已在 §4）

80+ → 82% top10，均位 5.3；60–79 → 54%，均位 12.4；<60 → 18%，均位 23.1。

### Reply 9 — 发布前自评示例

新内容打分：内容清单 25？H2 结构 20？外链计划 10？KD 5？ = 78？ → 预测 54% top10，均位 12。问：**这值得发吗？**

### Reply 10 — 补救不及格页面（<70 分的决策树）

若分数 <70，四选一或组合：
1. 改进内容（加 H2、加深）
2. 获取更多发布日外链（outreach）
3. 换关键词（更低难度）
4. 加原创数据（调研/问卷）

重打分，**≥75 再发**。发布前优化 = **3× 更好结果**。

### Reply 11 — 自动化打分工具

- **Airtable**：建自动化，内容录入即打分、预测排名
- **Google Sheets**：建打分公式 + VLOOKUP 历史数据 + 预测新内容
- **Zapier**：接内容日历，发布即自动打分、预警团队

### Reply 12 — 常见错误

❌ 历史数据不够(<100) ❌ 忽略重要因子(CWV、意图) ❌ 过度加权单一因子(只看词数) ❌ 不测试模型准确度 ❌ 拒绝发低分内容(有时它也会赢)。**模型指导决策，不替代判断。**

### Reply 13 — 6 个月迭代路线

- 月1：建初版（分析 2,400）
- 月2–3：测 50 篇新内容预测
- 月4：量准确度（当前 82%）
- 月5：按真实结果调权重
- 月6+：持续迭代。模型随数据变好。

### Reply 14 — 收尾

内容表现不是随机的，是可预测的。分析你的数据、建打分模型、发布前预测、上线前优化。这就是发能排名的内容的方法。

## 9. 把回复串落成 InkFlow 可用工具

| 回复 | 内容 | InkFlow 落地 |
|------|------|-------------|
| Reply 5 | 数据收集模板 A–K | `seo-targets/inkflow-ranking-scorecard.csv`（15 页当前自评） |
| Reply 6 | 精确打分公式 | 同上 CSV 的 `score_known_factors` 列 |
| Reply 10 | <70 补救决策树 | `ranking-readiness-scorecard.md` §5，映射到 11 个薄页面 |
| Reply 12 | 常见错误 | `ranking-readiness-scorecard.md` §6，对照我们构建 |
| Reply 13 | 6 个月路线 | `ranking-readiness-scorecard.md` §7，自建模型节奏 |

See `ranking-readiness-scorecard.md` for the per-page application.
