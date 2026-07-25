# AEO/GEO 执行框架：让 AI 引擎引用你的内容 (2026)

> 写给谁看：SEO 负责人、内容运营
> 目标：可量化的 AEO/GEO 执行体系，让 AI Overview + ChatGPT + Perplexity 持续引用你的页面
> 最后更新：2026-07-13

---

## 一、理解 Game: AI 引用链的逻辑

```
你的页面 → Schema 标记实体 → AI 爬虫读取 → 知识图谱匹配 → 用户查询 → AI 引用/不引用
                ↑                      ↑              ↑               ↑
          你必须做对             按月审计           EAS 评分       查询意图匹配
```

**核心逻辑**：
1. AI 引擎不"排名"页面，它**选择引用**页面
2. 被引用的前提：机器能确定"这个页面是谁写的、它知道什么、可以信任吗"
3. Schema + 作者 + 可验证数据 = 信任信号
4. 信号强的域名被引用的频率是弱信号的 **3.4 倍**

---

## 二、EAS: 实体权威评分（衡量你在 AI 眼里的可信度）

EAS 0-100，追踪三个维度：

| 维度 | 权重 | 低分特征 | 高分特征 |
|------|------|---------|---------|
| **Schema 覆盖度** | 40% | 缺 Schema 或 Schema 有缺失字段 | 所有页面有完整 Article + Person + Organization Schema |
| **实体信号密度** | 35% | 无署名作者、无第三方引用 | 作者有 LinkedIn + 凭据 + 5+ 外部引用 |
| **内容新鲜度** | 25% | 页面 180+ 天未更新 | 90 天内更新过且有真数据变化 |

**基准线**：
- B2B SaaS 无 GEO 投入中位数 EAS：**12**
- 全结构化数据 + 实体权威堆栈部署中位数 EAS：**27**
- EAS > 65 的域名引用频率是 EAS < 40 的 **3.4 倍**

**目标**：先把 InkFlow 推过 EAS 27，再瞄准 65。

> **注意**: 不需要做到满分。从 12 到 27 的提升只需要做好 Schema + 署名作者 + 90 天更新周期这三件事。

---

## 三、GEO 七大杠杆优先级排序

按投入/产出比排列，从最容易的做起：

### 🚀 P0: 立刻做（本周）

| 杠杆 | 动作 | 投入时间 | 预期提升 |
|------|------|---------|---------|
| **FAQPage Schema** | 给每个内容页加 FAQPage JSON-LD | 1 天 | AI 引用 +3.4x |
| **Article Schema** | 确保每篇内容页有 headline + author + datePublished + dateModified | 1 天 | AI 引用 +3.1x |
| **Person Schema** | 每个作者页面加 Person Schema（含 sameAs → LinkedIn） | 半天 | 引用可能性 +41% |

**验证方法**：用 Google Rich Results Test + Schema.org Validator 检查。⚠️ "已部署" ≠ "有效" — 缺失必填字段会让引用收益无声消失。

### 📅 P1: 按节奏做（本月）

| 杠杆 | 动作 | 投入时间 | 预期提升 |
|------|------|---------|---------|
| **内容 90 天更新周期** | 建立内容刷新日历，每篇内容至少每 90 天更新一次数据 | 持续 | GVS 溢价 79% |
| **可验证数据锚点** | 每 500 词 ≥ 3 个事实锚点（带链接的第三方数据/自家数据） | 融入写作流程 | 引用率 +2.1x |
| **AI 爬虫审计** | 检查 robots.txt 是否误屏蔽 GPTBot/ClaudeBot/Google-Extended | 1 天 | 0 成本 |

> 🔬 **硬证据（同行评审，非自述）**：在内容中加入引用、引文、统计数据，可使生成式引擎答案中的可见度提升 **最高 +40%**（Aggarwal et al., *GEO: Generative Engine Optimization*, KDD 2024, arXiv 2311.09735）。这是「可验证数据锚点」杠杆的底层依据 —— 每条 claim 带来源不是装饰，是 GEO 最高杠杆动作。优先级高于一切"感觉有用"的润色。

### 🏗️ P2: 季度战役

| 杠杆 | 动作 | 投入 | 预期提升 |
|------|------|------|---------|
| **第三方平台存在感** | Reddit/G2/行业媒体 90 天运营计划 | 高 | 85% AI 引用来自第三方 |
| **数字 PR（嘉宾文章）** | 2-3 篇行业媒体嘉宾文章 | 中 | AI 引用频率 +38% |
| **原创数据/研究报告** | 行业基准报告 → 天然被链接 | 高 | 最高可链接性资产 |

### 🎯 P3: 战略项目

| 杠杆 | 动作 | 投入 |
|------|------|------|
| **跨平台引用** | ChatGPT + Perplexity + Gemini + AI Overviews 各自优化（引用重叠 < 14%） | 极高 |

---

## 四、AEO 内容创作执行标准

### 4.1 段落自包含 + BLUF 结构（强制）

```
每个 H2 下：
  第一句 = 40-60 字直接答案（BLUF）
  后续 = 展开 + 数据 + 案例
  段落独立 = 摘出来也能被理解
```

**检查方法**：随机抽取任意段落，看它是否不需要上下文就能回答一个问题。

### 4.2 内容结构化偏好

```
写内容时，按这个优先级分配篇幅：

1️⃣ 表格（占 20-30% 内容量） → AI 引用率 34%
2️⃣ Q&A 块（占 15-25%）     → AI 引用率 29%
3️⃣ 结构化列表（占 10-20%）  → AI 引用率 21%
4️⃣ 叙述性段落（剩余）        → AI 引用率 8%
```

### 4.3 FAQ 写作规则

```
问题 = 真实用户在搜索框中输入的词，不是营销包装
答案 = 40-60 字，直接、可引用、不铺垫

✅ "What is tattoo studio management software?"
   "Tattoo studio management software is a digital platform that helps..."
❌ "Discover the Benefits of Modern Studio Solutions"
   （不是真实搜索问题）
```

> **FAQ 数量/长度权威裁定** → 见 `framework/faq-writing-standard.md`：**基线 3-5 个**（常规页），pillar/综合页可 5-8；答案首句 BLUF（甜点 40-60 字），整答上限 <300 字。下方 "≥5 / 8-12" 仅指综合支柱页，非常规。

### 4.4 每个内容页的 AEO 自检清单

```
□ 页面开头 40-60 字是否直接回答了核心问题？
□ 是否有 ≥ 1 个表格？
□ 是否有 3-5 个 FAQ（真实搜索问题，pillar 页可 5-8）？
□ 每段落是否自包含？
□ 是否有可验证的第三方数据/来源链接？
□ 是否有署名作者（含凭据/LinkedIn 链接）？
□ 是否有原文研究的独特数据点？
□ 是否在过去 90 天内更新过？
□ 是否有 FAQPage + Article Schema？
□ 是否有 BreadcrumbList Schema？
```

**规则**: ≥ 7 项通过 → 发布。5-6 项 → 修改再发。≤ 4 项 → 重写。

---

## 五、AI 爬虫治理（要不被看见，等于没发）

### 每月审计 robots.txt

确保以下 User-Agent **不被 Disallow**（覆盖主流 AI 检索/引用爬虫；来源：本项目审计 + 生姜Iris `gingiris-seo-geo-agent` 蓝本）：

```
User-agent: GPTBot            # OpenAI / ChatGPT 检索爬虫
User-agent: OAI-SearchBot     # OpenAI ChatGPT 搜索结果爬虫
User-agent: ChatGPT-User      # OpenAI 用户发起的抓取（如聊天中贴链接）
User-agent: Google-Extended   # Google AI Overviews / Gemini 爬虫
User-agent: PerplexityBot     # Perplexity
User-agent: ClaudeBot         # Anthropic Claude
User-agent: Claude-Web        # Anthropic 网页搜索（Claude 内置）
User-agent: Applebot-Extended # Apple Intelligence / Siri 建议
User-agent: Bingbot           # Microsoft Copilot / IndexNow 后端
```

> ⚠️ 不同 AI 厂商爬虫名会迭代（如 Claude-Web 为较新名称）。每月审计时对照官方文档核对；25% 的财富 500 强因宽泛通配符无意识屏蔽了 GPTBot。检查 `Disallow: /` 是否排除了上述 UA。

> 25% 的财富 500 强网站因宽泛的通配符规则无意识屏蔽了 GPTBot。检查你的 `Disallow: /` 是否排除了上述 UA。

### llms.txt（2026 年新兴标准）

在站点根目录创建 `/llms.txt`，告诉 AI 模型哪些页面是权威来源：

```
# InkFlow — Tattoo Studio Management Software
> All-in-one platform for booking, deposits, waivers, CRM, and aftercare.

## 权威页面
- https://ink-flows.com/features/  # Core features
- https://ink-flows.com/pricing/    # Pricing plans
- https://ink-flows.com/meaning/    # Tattoo meaning encyclopedia
```

---

## 六、每周 AEO/GEO 运营节奏

```
周一:   发布新内容 → 提交 IndexNow
周二:   检查上周内容的 AI 引用状态（手动检查 ChatGPT/Perplexity）
周三:   更新 1 篇 90 天以上未修改的旧内容
周四:   回复 Reddit/Quora 上相关主题的讨论（建设第三方存在感）
周五:   审计 robots.txt + Schema 验证
```

---

## 七、衡量标准（KPI）

| KPI | 当前值 | 目标 (3 个月) | 目标 (6 个月) |
|-----|-------|-------------|-------------|
| AI 引用频率 | 0 | 每周 ≥ 3 | 每周 ≥ 10 |
| GVS (Generative Visibility Score) | — | ≥ 27 | ≥ 50 |
| FAQPage Schema 覆盖率 | — | 100% | 100% |
| 90 天更新率 | — | 50% | 80% |
| llms.txt | 无 | 已部署 | 已部署 |

---

## 八、按业务类型调整 GEO 杠杆

### AI 引擎的引用偏好差异

| | SaaS | B2C 电商 | B2B |
|--|------|---------|-----|
| **AI 最常引用的来源** | G2/Capterra 评价、对比页、功能页 | Product 标签页、评测文章、Reddit 讨论 | 行业白皮书、案例研究、Wikipedia |
| **第三方平台存在感重点** | G2、Capterra、Reddit、Product Hunt | Pinterest、TikTok、Instagram、评测站 | 行业协会、LinkedIn、行业媒体 |
| **Schema 优先级** | SoftwareApplication + FAQPage + Person | Product + Offer + AggregateRating + FAQPage | Organization + Article + Person |
| **内容资产类型** | 免费工具、对比页、功能页 | 产品评测、购买指南、使用场景 | 白皮书、案例研究、ROI 计算器 |
| **数字 PR 角度** | "X% 的纹身工作室已数字化" | "2026 年最流行纹身风格" | "纹身行业供应商报告" |

### 85% 的 AI 引用来自第三方平台

```
SaaS:  85% = G2 评论 + Reddit 讨论 + Product Hunt + 行业媒体
B2C:   85% = 社媒(UGC) + 评测站 + 论坛 + Pinterest
B2B:   85% = 行业协会 + LinkedIn + 行业媒体 + Wikipedia + 白皮书平台
```

**关键启示**: 不要只在你自己的网站上做 GEO。AI 引擎更信任第三方平台的信号。你的 Reddit/G2/LinkedIn 存在感可能比网站本身更重要。

### AI 引用转化率 (by 查询类型)

| 查询类型 | SaaS 转化率 | B2C 转化率 |
|---------|-----------|-----------|
| **信息类** | 低（引用即可） | 低（品牌曝光） |
| **商业类** | 中（"Best X" → 对比 → Demo） | 高（"Best X" → 购买） |
| **交易类** | 高（"X alternative" → 试用） | 很高（"buy X" → 下单） |

---

## 九、SEO+GEO 双引擎实战补充（来源：生姜Iris / @WeiYipei，来源 072）

> 来自前 AFFiNE COO（0→60k GitHub stars）、顾问 150+ AI 出海团队的实战体系。其核心：**SEO 与 GEO 是同一枚硬币的两面**，同一篇内容应"既排 Google、又被 AI 引用"。下方为可直接落地的细则。

### 9.1 关键词：从 BOFU 往上做
```
新站只打这个区间：volume 300–1,000 / KD 5–35 / traffic potential 300+
顺序：高意向词（pricing / comparison）优先 → 再补 TOFU
理由：高意向词转化 5–10x 更好，新站没必要在头部红海耗
```
与本文「按业务类型调整」呼应：SaaS/B2B 的对比页、定价页是 BOFU 主战场。

### 9.2 GEO 三件套（每页必备）
```
FAQ Schema  +  结构化表格  +  直接回答段落(direct-answer paragraph)
三者齐全 → 被 AI Overview 引用概率最高
```
对应本文 4.2「内容结构化偏好」：表格 + Q&A 已是高引用格式，加上"开头直接答案段"即闭环。

### 9.3 IndexNow = GEO 基础设施（不只是收录加速）
```
每次内容更新 → 秒级推 Bing/Yandex IndexNow
让 LLM 在 Google 爬虫到达前就发现/收录 → AI 引用窗口提前
```
本文第六章周一"提交 IndexNow"即此动作，定位升级为 GEO 基础设施而非 SEO 提速。

### 9.4 页面硬规则（2026-06-24 标准）
| 规则 | 数值 | 违反后果 |
|------|------|---------|
| 内链密度 | **≤2–3 个/段落** | 超了 = Google 垃圾信号 → 排名跌 |
| Title 公式 | **best / free / top / guide + 年份** | CTR 提升最高范式 |
| Meta description | 重写关键词（不堆砌） | 避免关键词堆砌惩罚 |
| 外链策略 | 主动引竞品博客作信任信号 | 提升权威 |
| 新鲜度 | 页面可见 freshness date | AI 偏好近期内容 |

### 9.5 对比页 = SEO 金矿
```
每个竞品一个独立页面 → 截获决策期（"X alternative"）用户
结构：功能对比矩阵 + FAQ + BreadcrumbList Schema
```
与 SaaS 对比页策略一致，是 BOFU 最高的落地页型。

### 9.6 外链：质量 > 数量
```
✅ $20–30 找评测站 outreach → 20–30 条高质量外链
❌ 论坛批量外链（如 BacklinkBeam）→ 惩罚风险
```
与 `link-building-campaigns.md` 的质量优先原则一致。

### 9.7 AI 流量衡量（GA4 配置，量化 GEO ROI）
```
问题：GA4 默认把 ChatGPT/Perplexity/Claude 引流转进 Referral/Organic/Direct，混在一起
解法：用 regex 把 AI 来源单独拆成 "AI Chatbots" 渠道组 → 隔离 GEO 流量
```
本文第七章 KPI 目前靠"手动检查 ChatGPT/Perplexity"，加这层 GA4 配置才能把"AI 引用频率"变成可量化、可汇报的指标。

### 9.8 SEO/GEO Agent 自动化（可选）
- AI agent 可自主做 90%：关键词研究、内容生成、内链、Schema、每日排名报告、CTR 优化
- 剩 10%（域名设置/OAuth/付款）需人做一次 → 用 **Owner Checklist** 明确分工
- 成本 ≈ $50–100/月（DataForSEO+GSC+GA4）vs 代理 $3,000–10,000+/月（≈95% 降本）
- 每日报告标题范式："今天 Google 第 1 页有几个关键词？" —— 每天看，纪律 > 技巧

### 9.9 证据层权重拆解（来源 073，dev.to 全文）——写作时的资源分配依据
在生姜Iris 的 GEO 权重框架里，「可被引用度」的构成：
| 成分 | 权重 | 说明 |
|------|------|------|
| **证据层合计** | **43%** | 大多数团队跳过的部分 |
| ├ 权威引述 quotations | 16% | 外部一手来源的直接引用 |
| ├ 带完整出处的统计 | 14% | 值+样本+周期+来源，缺一不可 |
| └ 可追溯性 citability | 13% | 每条 claim 能溯源 |
| 结构（标题/表格/FAQ） | 12% | 只占 12%，**别把力气全砸这** |
> 铁律：给每条 claim 打标签 `[source-supported]` / `[externally-verified]` / `[needs-citation]`，**永不编造**。来源优先级：学术论文 > 行业报告 > 权威机构 > 专家观点 > 实践案例。
> 甜点区：单段可被引用长度 **134–167 字**；FAQ 每答 **<300 字**，每篇 **8–12 问**。

### 9.10 平台引用时效 + 三件套部署效果（来源 073）——排期与预期管理依据
**GEO 三件套全上 vs 只上一件（n=15 站，2026 Q1）：**
- 全上（llms.txt + FAQ Schema + Citable Stats 表）→ 首次 AI 引用中位数 **21–45 天**
- 只上一件 → **70–120 天**，甚至永远不来

**分平台 time-to-first-citation：**
| 平台 | 难度 | 关键要素 | 中位天数 |
|------|------|----------|----------|
| Perplexity | 最容易 | 90 天内 freshness / 问句式 H2 / 带源编号列表 | **9–21 天** |
| ChatGPT | 中 | GPTBot+OAI-SearchBot 放行 / Article+FAQPage+HowTo | **18–32 天** (n=12) |
| Claude | 最难 | Citable Statistics 块 / llms.txt / 一手专家定位 | **30–50 天** |
| Gemini | — | 别单独优化，优化 Google Search；跟随排名滞后约 60 天 |

**llms.txt 最小可用模板**（放根目录）：
```
# [站点一句话定位]
> [一段话描述站点覆盖什么]
## Key Pages
- [Article Title](URL): [一行摘要 + 关键数据点]
## Key Statistics
- [Stat with source]
## About the Author
[Name] — [credentials]. [Contact/social link]
```

### 9.11 AI Agent 跑 SEO 的 25 步日常 SOP（来源 073，#32 案例）
> 实战案例：域名迁移权重归零后，30 天 impressions 600→32,000（作者自述 53x，起点极差、含低垂果实，53x 不可复制；**可复制的是 SOP 本身**）。
```
每日工作流（确定性 25 步，agent 执行、人只做战略）：
1 查 GSC 昨日数据 → 2 查 SERP 排名 → 3 算 Page-1 关键词数(北极星)
→ 4 检测 delta(进/出 top10, +20% movers) → 5 读文章×表现库
→ 6 诊断(缺内链/需刷新/需 Schema/该降权) → 7 选今日动作(≤3, 按 影响×难度)
→ 8 执行(写 commit) → 9 push(限流则周批推) → 10 写每日报告 → 11 变更页提交 URL Inspection
```
**4 阶段增长模式（可作审计顺序）：**
1. **技术清理**（Week 1，贡献 3x）：canonical / hreflang / Schema typo / 僵尸 404 / robots 误挡 AI 爬虫——迁移过的站约 30% 潜力锁在这。
2. **Schema+GEO**（Week 2，贡献 4x）：FAQPage + HowTo + Article(author+datePublished) + 首页 Organization/WebSite/SearchAction。
3. **内链+CTR**（Week 3）：高排名页补指向落地页的内链；标题按 5 要素改写（数字/年份/括号/社会证明/50-60 字符）；解决关键词自相残杀。
4. **复利**（Week 4）：重复执行，曲线复利。
**人工不可省的 4 处**：Schema 上线前用 Google Rich Results Test 验证 / "Discovered-not indexed" 需手动 URL Inspection / 迁移 canonical 需人给上下文 / 非时效文章别加年份。

---

## 更新记录

| 日期 | 事件 |
|------|------|
| 2026-06-06 | 初始化 |
| 2026-07-13 | 全面重写为 AEO/GEO 执行框架（含 EAS 评分、七大杠杆 P0-P3、自检清单、运营节奏、KPI） |
| 2026-07-13 | 新增"按业务类型调整 GEO 杠杆"章节（AI 引用偏好、第三方平台重点、转化率差异） |
| 2026-07-13 | 深植 @WeiYipei(生姜Iris) SEO+GEO 双引擎（来源 072）：升级"可验证数据锚点"杠杆为同行评审 +40% 硬证据；新增第九章 BOFU-first / GEO三件套 / IndexNow-GEO基建 / 内链≤2-3 / Title公式 / 对比页 / 质量外链 / GA4 AI来源衡量 / Agent自动化 |
| 2026-07-13 | 抓取生姜Iris dev.to 4 篇全文（来源 073），补第九章 9.9 证据层 43% 权重拆解 / 9.10 平台引用时效表+三件套部署效果(21-45天)+llms.txt 模板 / 9.11 AI Agent 25步日常SOP + 4阶段增长模式 |
| 2026-07-14 | 依据 gingiris 蓝本补全 §5 AI 爬虫 allow-list（新增 OAI-SearchBot / ChatGPT-User / Claude-Web / Applebot-Extended / Bingbot，对齐 gingiris-seo-geo-agent 机器人清单）|
