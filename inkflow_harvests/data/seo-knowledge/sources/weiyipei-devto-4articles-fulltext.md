# 生姜Iris（@WeiYipei / dev.to iris1031）4 篇 SEO/GEO 真帖子全文提炼

> 来源类型：dev.to 原文全文抓取（非 playbook 摘要、非索引）
> 抓取日期：2026-07-13
> 作者：Iris Wei（生姜iris）— 前 AFFiNE COO（0→60k GitHub stars）/ Forbes Asia 30U30 / 30x Product Hunt #1 / 顾问 150+ AI 出海团队
> 说明：本文档是「带内容」版——保留原文的**模板、公式、数字、清单**，可直接照做。
> ⚠️ SELF-REPORTED 标记：作者自述战绩（60k stars / 32k impressions / 53x）为一手案例、非第三方审计；**唯一同行评审硬证据**是 GEO 引用 +40%（Aggarwal et al., KDD 2024, arXiv 2311.09735）。引用为效果承诺前请自行验证。

---

## 目录
1. [#2 ChatGPT SEO：如何在 ChatGPT 里被引用](#1)
2. [#5 GEO Guide：被 ChatGPT/Claude/Perplexity 引用](#2)
3. [#8 SaaS SEO 2026：复利式自然增长](#3)
4. [#32 让 AI Agent 跑 SEO：30 天 32,000 impressions](#4)
5. [四篇合起来的可执行清单](#5)

---

<a name="1"></a>
## 1. #2 ChatGPT SEO: How to Show Up in ChatGPT in 2026

### 核心论点
- 搜索没被取代，而是**裂成两扇门**：Google（排名/可点击）和 ChatGPT（引用/可被引）。ChatGPT SEO = 赢第二扇门。
- 竞争单位变了：Google 上比谁**可点击（clickable）**，ChatGPT 上比谁**可被引用（quotable）**——成为模型信任到愿意�"抬进"答案的那 2-3 段。
- 奖励的页面类型变了：不是外链最多的，而是**每条主张都带机器可验证证据**的。

### ChatGPT 如何决定引用谁（机制）
- 走 **RAG（检索增强生成）**：抓候选页 → 从最信任的段落里组合答案（Lewis et al., arXiv 2005.11401）。
- 模型被专门训练成「带来源回答」（WebGPT, Nakano et al., arXiv 2112.09332 因引用而获奖励）→ **带来源的内容结构性占优**。
- 关键推论：**自带证据的段落比"让模型相信你"的段落更容易被引用**。
  - ✅ 会被整段搬进答案：`"referral loops lifted our activation by 32% over 30 days (n=120)"`
  - ❌ 不会：`"referral loops really helped us"`

### 证据层（Evidence Layer）= 唯一能撬动 40% 的杠杆
- 在其 GEO 权重框架里，**证据层占「可被引用度」的 43%**：
  - 权威引述 quotations = **16%**
  - 带完整出处的统计 statistics = **14%**
  - 可追溯性 citability = **13%**
  - 结构（标题/表格/FAQ）只占 **12%**
- **大多数团队把力气全砸在那 12%，跳过 43%。**
- 硬证据：加引用+引述+统计，生成引擎可见度**最高提升 40%**（Aggarwal et al., GEO, KDD 2024）——这是论文里实测的最大单一杠杆。

### 铁律：永不编造（Never Fabricate）
写作时给每条 claim 打标签：
- `[source-supported]` = 你自己可验证的数据
- `[externally-verified]` = 你先核实过的一手来源
- `[needs-citation]` = 还没证据的（**标出来，别编**）
- 来源优先级：学术论文 > 行业报告 > 权威机构 > 专家观点 > 实践案例
- 一条被抓到的假统计，会摧毁让你被引用的全部信任。

### 3 层 ChatGPT SEO 栈
1. **证据（43%）**：每条核心主张带 1 条外部验证引述 **或** 1 条完整出处统计（值+样本+周期+来源）；每篇至少 1 条一手来源。
2. **结构（12%）**：顶部一句话答案 + H2/H3 层级 + Key Stats 表 + 5-8 条 FAQ（FAQPage schema）——让证据**可被抽取**。
3. **权威（E-E-A-T）**：署名作者+真实履历+方法说明+诚实边界。"真实声音是最好的 E-E-A-T 信号，别让 AI 写得像 AI。"

### ✅ ChatGPT SEO 执行清单
- [ ] **第一句就给答案**（先结论后故事，模型抬顶部）
- [ ] **加 Key Stats 表**（带 Source 列）——页面上最可被引用的对象
- [ ] **放至少 1 条一手来源引用**（论文/官方报告，不只是自家数字）
- [ ] **统计写全**：值 + 样本 + 周期 + 来源（半条统计传不出去）
- [ ] **加 5-8 条 FAQ** + 输出 FAQPage JSON-LD（CMS 可从 frontmatter 生成）
- [ ] **署名** + 一行履历
- [ ] **用 IndexNow 推 Bing**，让 LLM 在下次 Google 爬取前就发现更新
- [ ] **每周追踪**：拿目标词去 ChatGPT/Perplexity/Claude 查，记录是否被引用

### 衡量（否则你在猜）
- AI 流量会"隐身"：`chatgpt.com` / `perplexity.ai` / `claude.ai` 的引荐被塞进 Organic 或 Referral。
- 在 GA4 建一个专门的 **AI Search 渠道组**匹配这些引荐来源，拖到 Organic 上面，才看得见 GEO 实际带来的量。
- 低科技闭环：每周拿你最想赢的 5 个 query 去问 AI，记录域名是否出现——**每周引用检查是唯一 ground truth**。

---

<a name="2"></a>
## 2. #5 GEO Guide: Get Cited by ChatGPT, Claude & Perplexity [2026]

### 核心：GEO 三件套（Three-Piece Set）
1. **`/llms.txt`** — 根目录文件：About + Top Articles + Citable Statistics + Contact
2. **FAQ Schema（JSON-LD）** — 放进你 top 5 文章
3. **Citable Statistics 表** — 带 source URL

**部署效果对比（n=15 站，2026 Q1 审计）：**
- 三件套全上 → 首次 AI 引用中位数 **21-45 天**
- 只上一件 → **70-120 天**，甚至永远不来

### 战术 1：QAE 内容结构（地基）
```
## [问题作 H2]

[1-2 句直接答案]

[支撑证据：数据 / 案例 / 示例]
```
- ❌ Before：`## Social Listening` + 一段泛泛而谈
- ✅ After：`## What is social media listening and why do startups use it?` + 直接答案 + `Startups using social listening find leads 3x faster (Brand24, 2024 benchmark)`

### 战术 2：FAQPage Schema（引用倍增器）
- 每篇 **8-12 个问题**（问题越多 = 引用面越大）
- 每个答案自包含、完整
- 用具体数字、具名工具、带时间的 claim
- 每个答案 **< 300 字**

### 战术 3：带出处的具体统计（❌→✅）
- "Many companies use social listening" → "67% of high-growth SaaS companies use social listening tools (Drift, 2023)"
- "GEO improves AI citation rates" → "FAQ schema increases AI citation rate by 30-40% vs unstructured (Princeton NLP, 2024)"
- "Product Hunt is good for launches" → "Tue-Thu launches get 40% more upvotes than weekend (PH data, Q1 2025)"

### 战术 4：Key Stats 表放在标题附近（前 200 字内）
| Key Stat | Value |
|----------|-------|
| GEO citation rate lift from FAQ schema | +30-40% |
| Perplexity time-to-citation (fresh) | 3-7 days |
| ChatGPT Search time-to-citation | 2-4 weeks |
| Google AI Overviews time-to-citation | 1-3 months |
| Optimal FAQ questions per article | 8-12 |
| Max answer length for AI citation | ~300 words |

### 战术 5：具名作者+可验证履历
```
By Iris (@gingiris) — ex-AFFiNE COO, grew open source
project to 60k GitHub stars, 30x Product Hunt #1 winner.
```
强信号：量化成就 / 第一人称经验 / 跨平台一致身份 / 发表在可信第三方。

### 技术 GEO 设置清单
**1. robots.txt 放行 AI 爬虫**
```
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
```
验证：`yourdomain.com/robots.txt` + Cloudflare → Security → Bots

**2. llms.txt（根目录）** — 最小可用：About + Top Articles + Citable Stats + Citation Format
```
# [站点一句话定位]
> [一段话描述站点覆盖什么]
## Key Pages
- [Article Title](URL): [一行摘要 + 关键数据点]
## Key Statistics
- [Stat 1 with source]
## About the Author
[Name] — [credentials]. [Contact/social link]
```

**3. IndexNow 即时推 Bing**
```
curl "https://www.bing.com/indexnow?url=https://yourdomain.com/your-new-post/&key=YOUR_INDEXNOW_KEY"
```
拿 key：Bing Webmaster Tools → IndexNow

**4. Article Schema 带 dateModified**
```html
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"Article",
  "headline":"...","datePublished":"2026-04-17","dateModified":"2026-04-17",
  "author":{"@type":"Person","name":"Iris","url":"https://gingiris.com/en"} }
</script>
```

### GEO 30 分钟快启计划
1. [5min] 查 robots.txt，加 AI 爬虫允许名单
2. [10min] 根目录放 llms.txt 简版
3. [10min] 给最好那篇文章加 FAQPage schema
4. [5min] IndexNow 一条 curl 推 Bing

### 平台特定战术（time-to-first-citation）
| 平台 | 难度 | 关键要素 | 中位天数 |
|------|------|----------|----------|
| **Perplexity** | 最容易 | 90 天内 freshness / 问句式 H2 / 带源编号列表 | **9-21 天** |
| **ChatGPT** | 中 | GPTBot 放行 / Article+FAQPage+HowTo schema / OAI-SearchBot | **18-32 天** (n=12) |
| **Claude** | 最难 | Citable Statistics 块 / llms.txt / 一手专家定位 | **30-50 天** |
| **Google Gemini** | — | 别单独优化，优化 Google Search 即可 | 跟随 Google 排名约滞后 60 天 |

### 硬数字（GEO Benchmark）
- **40%** 自然点击在 AI Overview 出现在你 #1 上方时流失（Google 2026）
- **0.29%** 全网流量目前来自 AI 助手（2026 Q1, n=71,000 站）
- **42%** 全网流量仍来自 Google
- **20%** Google query 现在触发 AI Overview（2026 April）
- **18%** Perplexity 答案基于 Quora；**12%** ChatGPT 答案引 Reddit；**14%** Claude/Perplexity 引用来自 HN 首页
- **134-167 字** = 单段可被引用的甜点区
- **35%** 创业公司 90 天内放弃付费 GEO 工具

### 关键要点
- **停止优化页面，开始优化 claim**——每条统计、每个直接答案、每行表格都是可被独立抽取的"passage"。
- FAQPage schema = 最高 ROI 的单个 GEO 战术。
- IndexNow → Bing = 进 AI 引用管线最快的路。
- GEO 与 SEO 复利叠加：排名高的内容也更易被 AI 引。

---

<a name="3"></a>
## 3. #8 SaaS SEO in 2026: Compounding Organic Growth

### 核心：SaaS SEO ≠ 贴了软件 logo 的通用 SEO
三点不同：
1. **意图漏斗 > 搜索量**：`best CRM for startups`（低量）胜过 `what is a CRM`（高量），因为前者在决策模式。**先赢漏斗底部。**
2. **产品导向+程序化内容可规模化**：集成页/用例页/对比页可跨几十个竞品模板化，每个都是排名+转化资产。
3. **指标是 pipeline 不是 position**：#3 带来 40 个 trial 胜过 #1 带来 4 个。

### Key Stats
| 指标 | 2026 现实 |
|------|-----------|
| 付费广告一停 | 流量当天归 **0** |
| SEO 内容停更 | 继续排名+转化**数年** |
| 新内容开始排名 | **3-6 个月**（年轻域名） |
| 最佳转化词类型 | **BOFU**（alternatives/vs/best-of） |
| BOFU vs TOFU 转化率 | BOFU 高 **5-10 倍** |
| 最快见效 | page-2（pos 11-20）→ page 1，**数周** |
| 启动点 | **BOFU first**，再往漏斗上走 |

### SaaS SEO Playbook（按优先级）
**1. 从漏斗底部（BOFU）开始**——先写这些，转化最狠、排名最快（竞争更薄）：
- `[competitor] alternative`（搜的人正在离开竞品）
- `[competitor] vs [competitor]`（决策阶段对比）
- `best [category] tools`（listicle，诚实地把自己放 #1）
- `free [category] tool` / `[category] for [use case]`

**2. 动笔前先匹配搜索意图**——你能控的最大排名因子：**给搜索者 top10 已经在给的东西**。搜关键词→读 top10（跳过 sponsored）→看**格式**（step-by-step / 工具清单 / 定义），照着匹配。想要 how-to 你却写工具画廊 = 排不上。

**3. 建主题集群**——1 个 pillar + 4-8 个 supporting，全互链。内链保持**上下文相关，每段 2-3 条，绝不堆砌**。

**4. 技术基础做对就停**——干净 sitemap / 快加载 / canonical / 带词的描述性 slug / schema（FAQ, SoftwareApplication）= 技术 SaaS SEO 的 90%。别第二个月去追 CWV 满分，去写 BOFU 页。

**5. 正确方式赚权威**：
- **编辑外链**：HARO/Qwoted/Featured.com——真记者引用你（DA 70-90）
- **高权威共现**：被买家已信任的地方列出并链接
- 避开 `$199 买 50 条` 的批量外链（Google 会打折甚至伤你）

**6. 别忘 GEO**——同样的结构化内容（清晰答案/对比表/FAQ schema）既排 Google 又被 AI 引，当一个动作做。

### 浪费 6 个月的错误
- **先追大词**（"project management software" KD 80+ 年轻站排不上）→ 从 KD<20 的 BOFU 起
- **重量不重质**（10 篇薄的近重复页会触发全站质量降权）→ 1 篇真有用 > 10 篇门口页
- **忽略已有页**（最快的赢在 pos 11-20：改 title/紧 meta/加内链 → 数周上 page 1）
- **买便宜外链**（别）
- **把 SEO 和 AI 搜索当两件事**（现在是一个动作）

### 最小工具栈（不用 $500/月）
- **GSC**（免费）——真实排名 + striking-distance 数据
- **关键词**：Google Keyword Planner（免费）或预算够时上付费
- **竞品**：Analook 免费 60 秒竞品拆解 + 手动读 SERP
- **一个快且可爬的站**

---

<a name="4"></a>
## 4. #32 I gave my AI agent the ability to do my SEO — 32,000 impressions / 30 天

### 背景
- 2026 April 因托管事故迁域名，**权重悬崖**：4 年域名权威 + 100+ 外链归零。
- 手里：60+ 篇文章（好）/ 0 外链（坏）/ 一个"AI agent 能做大部分 SEO operator 活"的假设（未验证）。
- 于是给 agent 写 SOP，前提：**任何写不成具体步骤的事 = agent 做不了的事**。

### Key Stats（30 天）
| 指标 | Day 0 | Day 30 | Delta |
|------|-------|--------|-------|
| GSC 月 impressions | ~600 | ~32,000 | **53x** |
| 收录页数 | 8/66 | 57/66 (86%) | +49 |
| page 1 关键词 | 0 | 6 | +6 |
| page 2-3 关键词 | 1 | 11 | +10 |
| AI Overview 引用 | 0 | 1 | +1 |
| 人工工时 | ~25h/周 | ~3h/周 | -88% |
> 作者自己声明 53x 不可复制（起点太烂+低垂果实）；真正可复制的是**agent 每天做、不倦怠的 SOP**。

### Agent 每天做什么（25 步确定性工作流）
```
1. 查 GSC API 昨日数据
2. 查 DataForSEO 追踪词的 SERP 排名
3. 算今天的 "Page-1 keyword count"（每日北极星）
4. 检测 delta：进 top10 / 掉出 / +20% movers
5. 读文章数据库（文章 × 表现指标）
6. 诊断：哪些文章缺内链 / 需刷新 / 需 Schema / 该降权
7. 选今天的动作（最多 3 个，按 影响×难度 排序）
8. 执行（写 commit 到 Jekyll repo）
9. push（或限流时批量周推）
10. 写每日报告（page-1 头条 + 每词明细 + GA4）
11. 对变更页提交 URL Inspection（需人工时打 flag）
```
> 惊喜发现：**SEO 里无聊的每日纪律最好自动化**；需要人的是战略决策（建哪个主题集群？何时发对比页？）。别让 agent 战略化，让它**运营上不知疲倦**。

### 4 阶段增长模式（真实发生）
**Week 1 基础（600→2,100）**——几乎全是技术清理，找到 31 个问题：5 篇 canonical 坏 / 12 篇缺 hreflang / 8 篇 Schema typo / 4 个 404 僵尸页还在 sitemap / 2 条 robots.txt 挡了想收录的 AI 爬虫。
> **3x impressions 几乎全来自这**。文章本来就好，只是不可爬。教训：**近 12 个月做过迁移/重构的站，约 30% 排名潜力锁在技术问题后面。**

**Week 2 Schema+GEO（2,100→8,400）**——加 FAQPage(12 篇) / HowTo(8 篇) / Article+author+datePublished(每篇) / Organization+WebSite+SearchAction(首页)。
> 4x 跳升来自：12 个 FAQ 页拿 featured snippet 资格 + AI Overview 开始引 1 篇 + Perplexity 露出 2 篇。agent 有内建的 **Schema 类型矩阵**（文章类型→所需 schema），90 分钟搞定。

**Week 3 内链+CTR 改写（8,400→18,200）**——诊断很狠：**9 篇高排名文章没有任何指向落地页的内链**（流量来了就跳）。改：23 个标题（5 要素 CTR 规则：数字/年份/括号/社会证明/50-60 字符）+ 从 9 篇插内链到 3 个转化页 + 每篇加标准化 Convert Block（CTA+UTM）。还找出 3 篇同词自相残杀 → canonical 化 2 篇，立即涨位。

**Week 4 复利（18,200→32,000）**——最无聊的一周，重复同样的事，曲线复利。单篇冲到 "github star growth playbook" #3（1.3K 月搜/低 KD）→ +800 impressions/天。

### 什么有效
1. **agent 对 SEO 没有情绪**——人厌倦无聊部分、过度投资战略部分；agent 反过来：宗教般执行无聊部分，把战略赌注留给人。
2. **SOP 就是护城河**——~30 页 SOP 让 agent 可靠。"SOP 在我脑子里"的解法 = **写下来**（写成 agent 能跟的步骤，才让你成为真正的 SEO operator）。
3. **Schema.org 对 AI 搜索被低估**——4 页 FAQ→12 页，3 页变 featured snippet，1 页被 AI Overview 引，共 ~90 分钟。
4. **每日报告杀死拖延**——早上第一眼看到"今天几个词在 Google 首页"，这数字无法忽略、无法争辩。行为改变来自报告不是意志力。

### 什么没效（诚实）
- agent 首次 Schema 有 3/12 页 typo → 上线前必须用 **Google Rich Results Test 验证**
- 6 个 sitemap URL 没被收录（"Discovered - currently not indexed"）→ 需人工去 GSC URL Inspection 手动请求
- 域名迁移 backlog agent 处理不了（9 篇 stale URL 需人提供 canonical 上下文）
- 部分标题改写太激进（给 4 个不需要年份的标题加了年份）→ 新版 SOP 加了"非时效文章别加年份"规则

### 本周就能做的 4 件（不需要 AI）
1. 审计 Schema.org 标记（几乎一定有低垂果实）
2. 给 top 5 文章加 FAQPage schema（featured snippet 资格 = 免费 CTR）
3. GA4 配 "AI Chatbots" 渠道（regex 含 ChatGPT/Perplexity/Claude/Gemini/Copilot/DeepSeek），放在 Referral **上面**否则被吞
4. 把每日 SEO 报告头条写成"今天几个词在 Google page 1?"，每天看

---

<a name="5"></a>
## 5. 四篇合起来 → InkFlow 可执行清单

> InkFlow = SaaS。以下按"今天能做 / 本周 / 本月"分层，直接映射到我们的站。

### 🔴 今天（0 成本，各 30 分钟内）
- [ ] **建 `/llms.txt`**（根目录）：About InkFlow + Top 5 页 + Citable Stats（纹身含义数据）+ Contact
- [ ] **robots.txt 放行 6 个 AI 爬虫**（GPTBot/OAI-SearchBot/PerplexityBot/ClaudeBot/Google-Extended/CCBot）——先核查现状
- [ ] **GA4 建 "AI Search" 渠道组**（regex: chatgpt/perplexity/claude/gemini/copilot/deepseek），拖到 Organic 上面
- [ ] **给最好那篇内容页加 FAQPage JSON-LD**（8-12 问，每答 <300 字）

### 🟡 本周
- [ ] **每篇内容页顶部加 Key Stats 表**（带 Source 列）——最可被引用对象
- [ ] **QAE 结构改写**：H2 改成问句 + 第一句直接答案 + 证据段
- [ ] **每条 claim 打标签**（source-supported / externally-verified / needs-citation），补一手来源
- [ ] **接入 IndexNow → Bing**（配合之前 open 的 IndexNow hook 缺口）
- [ ] **每周引用检查**：拿 5 个目标词去 ChatGPT/Perplexity/Claude 查，记录是否被引

### 🟢 本月（SaaS 专属）
- [ ] **BOFU 页优先**：`[竞品] alternative` / `X vs Y` / `best tattoo [X] tools` / `free tattoo [X]`
- [ ] **striking-distance 优化**：GSC 找 pos 11-20 的页，改 title+meta+内链 → 数周上 page 1
- [ ] **主题集群**：pillar + 4-8 supporting，内链每段 2-3 条
- [ ] **技术审计（一次性）**：canonical / hreflang / Schema typo / 僵尸 404 / robots——对照 #32 的 31 项
- [ ] **编辑外链**：HARO/Qwoted/Featured.com（对应我们 backlinks=0 的最大缺口）

### 权重认知（写作时刻记）
- **证据层 = 43%**（quotes 16% + stats 14% + citability 13%），结构只占 12%——**别把力气全砸结构**。
- GEO 三件套全上 → 首引 21-45 天；只上一件 → 70-120 天。
- 半条统计传不出去：**值 + 样本 + 周期 + 来源**缺一不可。
