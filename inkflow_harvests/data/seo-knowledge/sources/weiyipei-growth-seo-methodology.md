# 来源 072 — 生姜Iris (@WeiYipei) 增长/SEO 方法论合辑

> 来源类型：X/Twitter 账号 @WeiYipei + 其公开 playbook（HuggingFace / gingiris.tools / dev.to / clawhub）
> 人物：生姜Iris（Gingiris 主理人）｜前 AFFiNE COO & 联创｜Forbes Asia 30U30
> 抓取方式：WebFetch 主页 + WebSearch 定位其 playbook/文章（X 时间线无法直接全量抓取，其帖子已沉淀为结构化 playbook）
> 收录日期：2026-07-13
> 主题：开源出海增长、SEO+GEO 双引擎、B2B SaaS、竞品调研、Product Hunt 发布、KOL/UGC、用户访谈、出海

⚠️ **SELF-REPORTED 标记**：下方带 ★ 的数字/案例均为 Iris 自述（虽部分有公开 GitHub 等佐证，但非独立审计）。唯 **GEO 引用 +40%** 为同行评审论文（Aggarwal et al., KDD 2024, arXiv 2311.09735），属硬证据，单独标注。

---

## 0. 人物背景（判断内容可信度）

- Gingiris 主理人，开源出海增长顾问
- 前 AFFiNE COO & 联创：★ 0→60k GitHub stars（24 个月）、★ $10M 融资、★ 30+ 次 Product Hunt 日榜第一
- ★ 顾问过 150+ AI 出海团队
- 核心信条（原话）：
  > "SEO and GEO are not two separate things — they're two sides of the same coin."
  > "Authentic voice is the best E-E-A-T signal. Don't let AI write like AI."
  > "Start from BOFU, work upward. High-intent keywords convert 5–10x better."

---

## 1. SEO + GEO 双引擎（最相关，已深植 aeo.md）

### 1.1 双引擎框架
```
传统搜索 (Google/Bing)                AI 搜索 (ChatGPT/Perplexity/Claude)
  关键词 + 外链 ← SEO                    IndexNow + AI 爬虫 ← GEO
  Schema + Core Web Vitals             直接答案 + 对比表格
          \___ 共享基础：结构化内容 ___/
```
GEO 不是替代 SEO，是让同一篇内容"既排 Google、又被 AI 引用"。

### 1.2 五大核心原则（ operational ）
1. **从 BOFU 往上做** — 高意向词优先（pricing / comparison）。新站关键词过滤器：volume 300–1,000 / KD 5–35 / traffic potential 300+。只在这个区间打。
2. **真实声音 = 最好的 E-E-A-T** — 创始人故事、真实数字、亲历经验，别让 AI 写得像 AI。
3. **结构化 = 可引用** — Key Stats 表格、FAQ Schema（5–8 个真实搜索问题）、对比矩阵。
4. **IndexNow 是 GEO 基础设施** — 每次更新后秒级推 Bing/Yandex，让 LLM 在 Google 爬到前就发现/收录。
5. **对比页是 SEO 金矿** — 每个竞品一个页面，截获决策期用户。

### 1.3 页面优化细则（2026-06-24 标准）
- 内链密度 **≤2–3 个/段落**，超了 = Google 垃圾信号 → 排名跌
- 主动引用竞品博客作外链（信任信号）
- Title 公式：**best / free / top / guide + 年份**，CTR 提升最高
- Meta description 重写关键词（不堆砌）
- BreadcrumbList Schema
- 页面可见 freshness date

### 1.4 GEO 三件套（triple combo）
> FAQ Schema + 结构化表格 + 直接回答段落（direct-answer paragraph）
每页同时拿到这三者，被 AI Overview 引用的概率最高。

### 1.5 证据层（**硬证据，非 SELF-REPORTED**）
> 在内容中加入引用、引文、统计数据，可使生成式引擎答案中的可见度提升 **最高 40%**。
> 来源：Aggarwal et al., *GEO: Generative Engine Optimization*, KDD 2024, arXiv 2311.09735。
这是 GEO "证据层" 最高杠杆投入的同行评审背书 —— 也是我们每条 claim 都要带来源的原因。

### 1.6 外链：质量 > 数量
- ★ $20–30 找评测站 outreach → 20–30 条高质量外链
- 论坛批量外链（如 BacklinkBeam）有惩罚风险

### 1.7 AI 流量衡量（GA4 配置）
- GA4 默认把 ChatGPT/Perplexity/Claude 引流转进 Referral/Organic/Direct，混在一起
- 解法：用 regex 把 AI 来源单独拆成 "AI Chatbots" 渠道组，隔离 GEO 流量才能量化 ROI
- 附：AI 流量来源识别 regex 模式（见 playbook）

### 1.8 SEO/GEO Agent SOP（AI 自动化）
- AI agent 可自主做 90% SEO：关键词研究、内容生成、内链、Schema、每日排名报告、CTR 优化
- 剩下 10%（域名设置、OAuth、付款）需人做一次 → 用 **Owner Checklist** 明确分工
- 成本：DataForSEO($50–100/月) + GSC(免费) + GA4(免费) ≈ **$50–100/月** vs 代理 $3,000–10,000+/月（≈95% 降本）
- 每日报告标题范式："今天 Google 第 1 页有几个关键词？" —— 每天看
- 起点低没关系，纪律可复制；agent 跑起来后，多做一个域名的边际成本≈0

---

## 2. 开源 / 开发者营销（gingiris-opensource）

- 核心渠道：GitHub Stars、Hacker News (Show HN)、Dev.to、Lobsters、Indie Hackers、Reddit (r/LocalLLaMA, r/selfhosted, r/SideProject)
- 中国开发者社区差异（西方玩法直接搬会被判 spam）：
  - Gitee（镜像 repo）、CSDN（写中文教程）、掘金（社区问答）、V2EX（社区公告）、少数派（深度分析）
  - 每个平台有自己的 norms，照搬西式发帖会被 flag
- GitHub Issue / README 生成器（gingiris.tools 自带工具）

---

## 3. B2B SaaS 增长（gingiris-b2b-growth）

- PLG / SLG 选择、联盟营销、渠道合作
- 真实案例：HeyGen、Deel、Vercel、Supabase、AWS
- 全生命周期：PMF → $10M ARR
- 详见 playbook（非本次 SEO 重点，留待 B2B 分支整合）

---

## 4. 竞品调研 Playbook（Competitor Research）

- 4 步框架：网站拆解 → 社媒 → 流量来源 → 广告投放
- 3 版网站演化分析（V1 / Beta / Launch，用 Wayback Machine）
- **X/Twitter 传播链映射**：4 阶段模型 + 单帖拆解模板
- 增长飞轮 6 阶段评分（Activation → Referral → Acquisition → Retention → Revenue → Product）
- KOL 识别框架（Traffic King / Topic Starter / Mindset Shifter）
- 内容效果排名（已验证）：Visual Demo > User Story > Competitor Comparison
- ICP 深度分析模板 + Freemium 定价拆解

---

## 5. 发布 / KOL / UGC（gingiris-launch）

- Product Hunt 当日运营、KOL outreach 模板、Reddit/HN seeding、UGC 增长飞轮
- 发布前 checklist、发布后维持策略

---

## 6. 用户访谈 / PMF（gingiris-user-interview）

- HeyGen 937 方法论（用户访谈框架）

---

## 7. 出海 / Go-Global（gingiris-go-global）

- 去全球扩张策略

---

## 与现有 SEO KB 的关系

| Iris 方法 | 对应本 KB 文档 | 可操作动作 |
|----------|--------------|-----------|
| SEO+GEO 双引擎 / GEO 三件套 / 证据层 40% | `aeo.md` | ✅ 已深植（section 九 + 数据锚点杠杆升级） |
| IndexNow 是 GEO 基础设施 | `technical-seo.md` / `aeo.md` | 已在节奏中，强化"GEO 基础设施"定位 |
| BOFU-first 关键词过滤 | `framework/keyword-research.md`（§二/§1.1） / `content-seo.md` | 待整合（高意向词优先） |
| 内链 ≤2–3/段落、Title 公式 | `technical-seo.md` / `content-seo.md` | 待整合 |
| 对比页 SOP | `content-seo.md`（SaaS 对比页） | 已有，可对照 |
| 质量外链 > 数量 | `link-building-campaigns.md` | 已有，可对照 |
| 开源/开发者营销 | `programmatic-seo.md` / `link-building` | 待整合（dev-tool SEO） |
| 竞品调研 X 传播链 | `seo-strategy.md` | 待整合 |
| SEO/GEO Agent SOP | `seo-automation-tools.md` | 待整合（自动化） |

> 本次重点是把 **SEO+GEO 双引擎** 深植 `aeo.md`；其余主题已在上方表格标注"待整合"，可后续按需展开。

---

## 8. 真实帖子索引（dev.to cross-post，共 129 篇，本批露出 60 篇）

> ✅ **全文状态（2026-07-13）**：下方 60 篇已全部抓成"带内容"提炼稿（非链接索引），按主题分 6 份文件：
> - SEO/GEO（4 篇）→ `weiyipei-devto-4articles-fulltext.md`
> - B2B SaaS 增长（12 篇）→ `weiyipei-b2b-saas-fulltext.md`
> - GitHub Star / 开源（14 篇）→ `weiyipei-github-star-fulltext.md`
> - Product Hunt 发布（15 篇）→ `weiyipei-producthunt-fulltext.md`
> - ASO 应用商店（10 篇）→ `weiyipei-aso-fulltext.md`
> - 竞品分析 / 技术（4 篇）→ `weiyipei-competitor-tech-fulltext.md`
> 每篇均含：核心论点 / 可操作战术(带具体做法) / 关键数字(★SELF-REPORTED) / 模板清单 SOP / takeaway + 对 ink-flow-manager 可落地动作。
> dev.to 仍有 69 篇未露出（需翻页），后续可按需补抓。

> ⚠️ 获取方式说明：X 时间线无法直接全量抓取（需登录/JS 渲染），但 @WeiYipei 把每个 X 线程扩写成长文发到 dev.to（用户名 **iris1031**），**这些是她的真实帖子原文**，可正常打开。下方为已确认的 60 篇，按主题分组，URL 可直接抓取全文。

### 8.1 SEO / GEO / ChatGPT（与 KB 最相关，优先深挖）
| # | 标题 | 日期 | URL |
|---|------|------|-----|
| 2 | ChatGPT SEO: How to Show Up in ChatGPT in 2026 | Jul 6 | https://dev.to/iris1031/chatgpt-seo-how-to-show-up-in-chatgpt-in-2026-2456 |
| 5 | GEO Guide: Get Cited by ChatGPT, Claude & Perplexity [2026] | Jun 25 | https://dev.to/iris1031/geo-guide-get-cited-by-chatgpt-claude-perplexity-2026-1f7 |
| 8 | SaaS SEO in 2026: The Complete Guide to Compounding Organic Growth | Jun 24 | https://dev.to/iris1031/saas-seo-in-2026-the-complete-guide-to-compounding-organic-growth-2c3m |
| 32 | I gave my AI agent the ability to do my SEO. 32,000 Google impressions in 30 days. | Jun 2 | https://dev.to/iris1031/i-gave-my-ai-agent-the-ability-to-do-my-seo-32000-google-impressions-in-30-days-1nal |

### 8.2 B2B SaaS 增长
| # | 标题 | 日期 | URL |
|---|------|------|-----|
| 4 | B2B SaaS Growth: 7 Retention Levers for 2026 | Jun 26 | https://dev.to/iris1031/b2b-saas-growth-7-retention-levers-for-2026-108e |
| 14 | B2B SaaS Growth: 7 Revenue Loops for 2026 | Jun 18 | https://dev.to/iris1031/b2b-saas-growth-7-revenue-loops-for-2026-1g2g |
| 15 | How I built a B2B growth system with Claude Code skills | Jun 18 | https://dev.to/iris1031/how-i-built-a-b2b-growth-system-with-claude-code-skills-and-you-can-steal-it-1fo1 |
| 20 | B2B SaaS Growth: 7 Activation-to-Proof Loops for 2026 | Jun 14 | https://dev.to/iris1031/b2b-saas-growth-7-activation-to-proof-loops-for-2026-28o3 |
| 26 | B2B SaaS Growth: 7 Demo-to-Expansion Loops for 2026 | Jun 8 | https://dev.to/iris1031/b2b-saas-growth-7-demo-to-expansion-loops-for-2026-1ld4 |
| 33 | B2B SaaS Growth: 7 Pricing and Packaging Fixes for 2026 | Jun 2 | https://dev.to/iris1031/b2b-saas-growth-7-pricing-and-packaging-fixes-for-2026-492i |
| 37 | B2B SaaS Growth: 7 ICP Fixes for 2026 | May 29 | https://dev.to/iris1031/b2b-saas-growth-7-icp-fixes-for-2026-3ap2 |
| 42 | B2B SaaS Growth: 7 Expansion Loops for 2026 | May 25 | https://dev.to/iris1031/b2b-saas-growth-7-expansion-loops-for-2026-15o7 |
| 47 | B2B SaaS Growth: 6 Retention and Expansion Loops | May 20 | https://dev.to/iris1031/b2b-saas-growth-6-retention-and-expansion-loops-4ej |
| 51 | SaaS Marketing on a Budget: 7 Tactics That Actually Worked | May 17 | https://dev.to/iris1031/saas-marketing-on-a-budget-7-tactics-that-actually-worked-across-affine-analook-and-30-launches-2ald |
| 55 | B2B SaaS Growth: 7 Compounding Plays for 2026 | May 13 | https://dev.to/iris1031/b2b-saas-growth-7-compounding-plays-for-2026-22dh |
| 59 | B2B SaaS Growth: 8 Loops That Compound in 2026 | Apr 30 | https://dev.to/iris1031/b2b-saas-growth-8-loops-that-compound-in-2026-4gdl |

### 8.3 GitHub Star / 开源增长
| # | 标题 | 日期 | URL |
|---|------|------|-----|
| 6 | GitHub Star Growth: 7 Distribution Loops for 2026 | Jun 25 | https://dev.to/iris1031/github-star-growth-7-distribution-loops-for-2026-19hp |
| 7 | Build in Public in 2026: The Playbook That Took AFFiNE to 60K Stars | Jun 24 | https://dev.to/iris1031/build-in-public-in-2026-the-playbook-that-took-affine-to-60k-stars-4ae6 |
| 11 | GitHub Star Growth: 7 Proof Loops for 2026 | Jun 20 | https://dev.to/iris1031/github-star-growth-7-proof-loops-for-2026-3619 |
| 17 | GitHub Star Growth: 7 Retention Signals for 2026 | Jun 17 | https://dev.to/iris1031/github-star-growth-7-retention-signals-for-2026-3kin |
| 21 | GitHub Star Growth: 7 Proof Assets That Lift Conversion | Jun 13 | https://dev.to/iris1031/github-star-growth-7-proof-assets-that-lift-conversion-3k21 |
| 23 | GitHub Star Growth: 7 Distribution Gaps to Fix in 2026 | Jun 11 | https://dev.to/iris1031/github-star-growth-7-distribution-gaps-to-fix-in-2026-1mc9 |
| 27 | GitHub Star Growth: 7 README Signals That Increase Trust | Jun 7 | https://dev.to/iris1031/github-star-growth-7-readme-signals-that-increase-trust-10o2 |
| 29 | GitHub Star Growth: 7 Conversion Loops That Compound | Jun 5 | https://dev.to/iris1031/github-star-growth-7-conversion-loops-that-compound-29ll |
| 34 | GitHub Star Growth: 7 Proof Assets That Convert in 2026 | Jun 1 | https://dev.to/iris1031/github-star-growth-7-proof-assets-that-convert-in-2026-1mm8 |
| 38 | GitHub Star Growth: 7 README Fixes for 2026 | May 28 | https://dev.to/iris1031/github-star-growth-7-readme-fixes-for-2026-3mhm |
| 43 | GitHub Star Growth: 7 Distribution Loops for 2026 | May 24 | https://dev.to/iris1031/github-star-growth-7-distribution-loops-for-2026-4g0m |
| 48 | GitHub Star Growth: 7 Trust Loops That Compound | May 19 | https://dev.to/iris1031/github-star-growth-7-trust-loops-that-compound-j7d |
| 52 | GitHub Star Growth: 7 Systems That Compound in 2026 | May 17 | https://dev.to/iris1031/github-star-growth-7-systems-that-compound-in-2026-4j26 |
| 56 | GitHub Star Growth: 8 Compounding Plays for 2026 | May 8 | https://dev.to/iris1031/github-star-growth-8-compounding-plays-for-2026-4dk9 |

### 8.4 Product Hunt 发布
| # | 标题 | 日期 | URL |
|---|------|------|-----|
| 1 | Product Launch Checklist 2026: 40 Tasks + Free Template | Jul 6 | https://dev.to/iris1031/product-launch-checklist-2026-40-tasks-free-template-4n78 |
| 9 | Product Hunt Launch: 7 Pre-Launch Checks for 2026 | Jun 22 | https://dev.to/iris1031/product-hunt-launch-7-pre-launch-checks-for-2026-2ii4 |
| 12 | Product Hunt Launch: 7 Conversion Loops for 2026 | Jun 19 | https://dev.to/iris1031/product-hunt-launch-7-conversion-loops-for-2026-3ac8 |
| 18 | Product Hunt Launch: 7 Maker Comment Loops for 2026 | Jun 16 | https://dev.to/iris1031/product-hunt-launch-7-maker-comment-loops-for-2026-1lgk |
| 22 | Product Hunt Launch: 7 Positioning Fixes for 2026 | Jun 12 | https://dev.to/iris1031/product-hunt-launch-7-positioning-fixes-for-2026-41b0 |
| 24 | Product Hunt Launch: 7 Pre-Launch Signals for 2026 | Jun 10 | https://dev.to/iris1031/product-hunt-launch-7-pre-launch-signals-for-2026-44ck |
| 28 | Product Hunt Launch: 7 Comment Plays for 2026 | Jun 6 | https://dev.to/iris1031/product-hunt-launch-7-comment-plays-for-2026-2aj5 |
| 30 | Product Hunt Launch: 7 Proof Loops That Win Trust | Jun 4 | https://dev.to/iris1031/product-hunt-launch-7-proof-loops-that-win-trust-4f69 |
| 35 | Product Hunt Launch: 7 Comment Loops That Lift Conversion | May 31 | https://dev.to/iris1031/product-hunt-launch-7-comment-loops-that-lift-conversion-3j57 |
| 40 | Product Hunt Launch: 7 Retention Loops for 2026 | May 27 | https://dev.to/iris1031/product-hunt-launch-7-retention-loops-for-2026-1fpl |
| 44 | Product Hunt Launch: 7 Funnel Fixes for 2026 | May 23 | https://dev.to/iris1031/product-hunt-launch-7-funnel-fixes-for-2026-129d |
| 45 | Product Hunt Launch: 7 Positioning Checks for 2026 | May 22 | https://dev.to/iris1031/product-hunt-launch-7-positioning-checks-for-2026-19p1 |
| 49 | How to Pick a Product Hunt Hunter (or Skip Them) — 7 Criteria from 30 #1 Launches | May 17 | https://dev.to/iris1031/how-to-pick-a-product-hunter-or-skip-them-entirely-7-criteria-from-30-1-launches-5e9k |
| 53 | Product Hunt Launch: 8 Prep Moves That Compound | May 15 | https://dev.to/iris1031/product-hunt-launch-8-prep-moves-that-compound-eon |
| 57 | Product Hunt Launch Checklist: 9 Plays for 2026 | May 7 | https://dev.to/iris1031/product-hunt-launch-checklist-9-plays-for-2026-4a1i |

### 8.5 ASO（应用商店优化）
| # | 标题 | 日期 | URL |
|---|------|------|-----|
| 3 | ASO App Store Optimization: 7 Screenshot Tests for 2026 | Jun 27 | https://dev.to/iris1031/aso-app-store-optimization-7-screenshot-tests-for-2026-5e0d |
| 10 | ASO App Store Optimization: 7 Review Signals for 2026 | Jun 21 | https://dev.to/iris1031/aso-app-store-optimization-7-review-signals-for-2026-1en2 |
| 19 | ASO App Store Optimization: 7 Conversion Levers for 2026 | Jun 15 | https://dev.to/iris1031/aso-app-store-optimization-7-conversion-levers-for-2026-2dgc |
| 25 | ASO App Store Optimization: 7 Screenshot Jobs for 2026 | Jun 9 | https://dev.to/iris1031/aso-app-store-optimization-7-screenshot-jobs-for-2026-27p0 |
| 31 | ASO App Store Optimization: 7 Review Loops for 2026 | Jun 3 | https://dev.to/iris1031/aso-app-store-optimization-7-review-loops-for-2026-5m4 |
| 36 | ASO App Store Optimization: 7 Retention Signals for 2026 | May 30 | https://dev.to/iris1031/aso-app-store-optimization-7-retention-signals-for-2026-57jo |
| 41 | ASO App Store Optimization: 7 Conversion Loops for 2026 | May 21 | https://dev.to/iris1031/aso-app-store-optimization-7-conversion-loops-for-2026-1e8c |
| 46 | ASO App Store Optimization: 7 Conversion Loops for 2026 | May 21 | https://dev.to/iris1031/aso-app-store-optimization-7-conversion-loops-for-2026-1gk2 |
| 54 | ASO App Store Optimization: 8 Plays That Still Work | May 14 | https://dev.to/iris1031/aso-app-store-optimization-8-plays-that-still-work-30h0 |
| 58 | ASO App Store Optimization: 7 Fixes That Still Work | May 6 | https://dev.to/iris1031/aso-app-store-optimization-7-fixes-that-still-work-481 |

### 8.6 竞品分析 / 技术
| # | 标题 | 日期 | URL |
|---|------|------|-----|
| 13 | The $5 Competitor Analysis Workflow for Solo Founders | Jun 18 | https://dev.to/iris1031/the-5-competitor-analysis-workflow-for-solo-founders-1l0a |
| 16 | How I reverse-engineered 3 competitors' growth strategies in 10 minutes | Jun 17 | https://dev.to/iris1031/how-i-reverse-engineered-3-competitors-growth-strategies-in-10-minutes-and-what-i-found-8gb |
| 39 | The Best Competitor Analysis Tool in 2026: An Honest Comparison of 14 Options | May 27 | https://dev.to/iris1031/the-best-competitor-analysis-tool-in-2026-an-honest-comparison-of-14-options-4747 |
| 60 | Adding a Remote MCP Server to Our SaaS in 200 Lines | Apr 29 | https://dev.to/iris1031/adding-a-remote-mcp-server-to-our-saas-in-200-lines-and-the-3-bugs-that-almost-shipped-4hp |

> 剩余 69 篇需翻页获取（dev.to 个人页归档）。需要「全量」时再翻页拉取。
