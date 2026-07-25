# SEO 全维度目录（按功能板块拆解）

> **目的**：把 SEO 拆成 12 个功能板块，每个板块下列出 **所有需要检查的维度**（Dimension）+ 核心标准 + 工具/方法 + InkFlow 现状。
> 不是「知识库索引」—— 是 **可执行的检查清单**，做哪块查哪块。
>
> 版本：v1 — 2026-07-14
> 前置依赖：`framework/knowledge-classification.md`（知识库按 10 板块分类）、`framework/page-content-checklist.md`（页面级验收单）
> 关键词：seo-dimension-catalog

---

## 目录

| # | 板块 | 维度数 | 核心依赖 |
|---|------|--------|---------|
| 一 | 关键词研究 | 7 | `keyword-research.md` |
| 二 | 内容创作与优化 | 15 | `content-seo.md`, `aeo.md`, `seo-content-writing` |
| 三 | 技术 SEO | 12 | `technical-seo.md`, `javascript-seo.md` |
| 四 | 结构化数据 / Schema | 10 | `meta-tags-rules.md`, `seo-schema-injector` |
| 五 | E-E-A-T（跨板块） | 6 | `aeo.md`, `content-seo.md` |
| 六 | 内链架构 | 5 | `internal-linking-rules.md` |
| 七 | 外链建设 | 8 | `seo-link-building` |
| 八 | 数据分析与测量 | 6 | GSC, `seo-gsc-analyzer` |
| 九 | 竞争分析 | 7 | `serp-top10-rules.md`, `content-gap-matrix.md` |
| 十 | 站型工作流 | 5 | `site-type-router.md` |
| 十一 | 平台特指 | 6 | `social-seo.md`, `image-seo.md` |
| 十二 | 算法与趋势 | 4 | `aeo.md` |

**全库 103 个维度**（每页逐项可查）。

---

## 一、关键词研究（9 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 1.1 | **搜索意图** | ① 4 类：交易型(vs/best/review) > 商业型(software/app) > 信息型(how to/guide) > 导航型(品牌名)；② 3 型：购买词/痛点词/场景词（Ahrefs 2024：64.7% 流量来自<100 月搜的长尾词，转化率 3-5 倍于头部词）；③ 形态 A 对比 vs 形态 B 交易 | SERP 首页类型定意图 | 56 词已分 4 梯队，BOFU 优先 |
| 1.2 | **KD 竞争度** | **手动检查 SERP**（最可靠，不用工具看数据）：低 KD 信号=论坛/博客排首页+0-2 广告+<5000 万结果+过时内容还在前排；高 KD 信号=Forbes/Wikipedia/大品牌页+4+广告+全 Landing Page。**按站型定初期 KD**：SaaS<20、B2C<25、B2B<15、内容站<10 | Ahrefs / Semrush / 手动 SERP 检查表 | 56 词 KD<30 可打 |
| 1.3 | **加权评分** | **5 维加权**（不用简单加总）：KD×0.3 + 意图×0.25 + 商业价值×0.2 + 搜索量×0.15 + 匹配度×0.1 → 最终分。>3.5 优先做。新站信息型→商业型→交易型渐进路线 | `seo-keyword-finder` 加权表 | 现有评分按简单加总（50 分制），可改加权 |
| 1.4 | **搜索量** | **不只看绝对量**：Ahrefs 数据——64.7% 的搜索流量来自月搜<100 的长尾词；长尾词转化率是头部词的 3-5 倍。新站 ≤500/月 长尾优先 | Google Keyword Planner / Ahrefs | Tattoo niche 词量中等 |
| 1.5 | **词簇覆盖** | 一页覆盖 1 主词 + 3-8 副词（同意图）；不逐词建页。**B2C 品类矩阵法**(@KaiCromwell)：材质/尺寸/功能/风格 各维独立品类页，组成多入口矩阵 | H2 规划覆盖子话题 | 56 词已分组映射 |
| 1.6 | **关键词扩展 7 法** | ① Google Autocomplete（种子词 + a-z 前缀 + vs/for/how 后缀）；② People Also Ask（搜索结果 PAA 框）；③ Related Searches（底部 8 词）；④ Reddit/社区自然用语（r/tattoos r/smallbusiness 提取真实问题话术）；⑤ 竞品 sitemap 词根提取；⑥ AnswerThePublic 疑问词扩展；⑦ **问题词库**：What is/How to/Best/Top/X vs Y/X alternative/X for [persona]/Free vs Paid | 整合 7 法建长期关键词流水线 | 已有 `inkflow-keywords.md`，但扩展方法未系统化 |
| 1.7 | **主题集群** | Hub-and-Spoke：支柱页覆盖大主题，集群页深入子话题，集群→支柱内链。**产品页不做支柱**（产品页=转化页，支柱页=信息权威页） | `topic-clusters-guide.md` | InkFlow 暂以产品页为中心，非纯内容站 |
| 1.8 | **月度审计** | 每月：GSC 查表现词→AITDK 看竞品新增→Reddit 新话题→新词打分排序→分配内容日历。BOFU/MOFU/TOFU 比例：SaaS=40/35/25；B2C=30/30/40；B2B=25/40/35；内容站=10/20/70 | GSC / AITDK / Reddit | 待部署后启动 |
| 1.9 | **术语统一** | 同概念用统一词（"tattoo artist" / "tattooer" / "tattoo professional" 选一个）+ 建站词库 + 每页执行。禁同义分散权重 | 建站词库 > 内容规范 | 待建 |

---

## 二、内容创作与优化（18 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 2.1 | **H1 关键词** | 唯一、含主词、≤60 字符；每页仅一个 H1 | 哥飞 auditor / 手动检查 | ✅ 已覆盖 |
| 2.2 | **H2→H3 层级** | H2 每页 4-7 个、H3 每 H2 下 2-4、禁跳级、禁空 H；**URL 层级≤3**（/features ← /features/booking） | `heading-hierarchy-rules.md` | 部分页 H2 不足 4 |
| 2.3 | **Title** | ≤60 字符、主词前置、品牌后置 | 哥飞 auditor | ✅ 已覆盖 |
| 2.4 | **Meta Description** | 50-160 字符、含主词+价值点+CTA；不重复 Title | 哥飞 auditor | ✅ 已覆盖但部分可优化 |
| 2.5 | **Canonical URL** | 每页显式 canonical，自引用 | `meta-tags-rules.md` | Astro 默认自引用 ✅ |
| 2.6 | **OG + Twitter Card** | og:title、og:description、og:image、twitter:card 每页 | SEOHead.astro | ✅ 已覆盖 |
| 2.7 | **BLUF（首段答案前置）** | 首段 40-60 字直接给结论，不走铺垫。禁止 "In today's world…" "随着…发展" 类开篇 | 手动检查 | 约 50% 页需改 |
| 2.8 | **段落自包含** | 拿走一段能独立理解；禁 "如上所述""后面会讲" 依赖语；**每段开头句=该段核心结论**，中间展开证据/数据，结尾+内链 | AEO 标准 | 约 30% 页不过关 |
| 2.9 | **列表 / 表格占比** | AI 提取准确率比段落高 30-40%；每页 ≥1 个；**信息对比必用表格**，不用段落描述 | 手动检查 | ✅ 对比页有，功能页部分缺 |
| 2.10 | **FAQ 区块 + 格式** | 3-5 个真实问题 + FAQPage Schema。**格式规范**：Q = [含主词的自然语言问题]、A = 40-60 字直接答案。FAQ 置页尾，CTA 之前 | `FAQSchema.astro` | 10 页（19%）缺 FAQ；有 FAQ 的页格式待统一 |
| 2.11 | **正文词数** | money/compare 页 1200-1800（追竞品深度）；blog 400-900；tool/support 400-700 | 哥飞 auditor | 53 页中 28 页（53%）money/compare 页词数<1200 |
| 2.12 | **信息增益（独家角度）** | 写了什么竞品没写的内容（数据/案例/方法/行业知识）。**每页至少1个"竞品没有但你写了"的角度** | `content-gap-matrix.md` E1-E7 | `digital-tattoo-waiver` 已做 E1/E2/E6 |
| 2.13 | **TL;DR / 摘要** | TOFU 页（博客/指南）顶部加 2-3 句摘要，方便快速浏览 + AI 引用 | 手动插入 | 未做 |
| 2.14 | **目录（ToC）** | >1500 词的长页加锚点目录，提升可读性+锚文本内链价值 | 手动/组件 | 未做 |
| 2.15 | **GEO 证据层** | 每个数据/claim 带 = **值 + 样本量 + 周期 + 来源**（GEO 43% 可被引用度权重）。关键统计用 `<blockquote>` 或引用格式凸显，AI 偏好引用统计 | `aeo.md` §9 | ✅ meaning 页有，营销页部分缺 |
| 2.16 | **图片 + Alt** | 每页 ≥1 相关图 + Alt 描述含主词；主图<100KB、WebP | `image-seo.md` | 纹身含义页缺真实图，营销页少图 |
| 2.17 | **CTA** | 每页 1-2 个明确行动号召，路径清晰（试用/咨询/下载） | 手动检查 | ✅ 已覆盖但可优化命名 |
| 2.18 | **内容更新/刷新** | 已有排名的老页面更新 ROI：更新年份/数据→+10-15%（每季）；加新 H2→+15-25%（每月）；加 FAQ→+10-20%（一次性）。**>1 年未更新的内容必须刷新** | 手动/GSC 发现 | 未上线，无陈旧内容 |

---

## 三、技术 SEO（14 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 3.1 | **CWV（Core Web Vitals）** | LCP<2.5s / INP<200ms / CLS<0.1（2024年3月INP正式替代FID） | PageSpeed Insights / Lighthouse | 未实测（需部署后） |
| 3.2 | **LCP 优化** | 首屏最大元素：`fetchpriority=high` + preload + WebP/AVIF。案例：某站移动端 LCP 6.8s→2.1s（4MB hero→180KB WebP + 延迟加载），自然搜索流量+31% | `technical-seo.md` | 待部署后实测 |
| 3.3 | **图片优化** | WebP/AVIF 格式、主图<100KB、懒加载 `loading=lazy`；文件名用描述性（product-name-material-color.jpg 非 IMG_001.jpg） | `image-seo.md` | Astro Image 组件已做 ✅ |
| 3.4 | **移动端适配** | 移动端首屏、触摸目标≥48px、字体≥16px。教训：某 SaaS 导航栏折叠问题→自然流量-40%（2周定位） | Lighthouse Mobile | Astro 默认响应式 ✅ |
| 3.5 | **Robots.txt** | AI 爬虫允许（GPTBot / Google-Extended / ClaudeBot / PerplexityBot / OAI-SearchBot / ChatGPT-User / Claude-Web / Applebot-Extended）；禁抓敏感路径 | `aeo.md` §5 | 已建待生效 |
| 3.6 | **Sitemap.xml** | 索引所有关键页；无 404/302 入 sitemap；每页 `<lastmod>` | Sitemap 生成器 | 已建待生效 |
| 3.7 | **IndexNow** | 新页/改页 24h 内推送；Bing 验证 Token 正确 | IndexNow hook | ⚠️ 阻塞（ink-flows.com 返 SPA） |
| 3.8 | **JS SEO** | `<a href>` 非 `onClick`；`curl -A Googlebot` 抓原始 HTML 含正文（SSR/SSG 无 CSR 问题） | `javascript-seo.md` | Astro SSG 天然静态 ✅ |
| 3.9 | **Canonical + Hreflang** | 无自引用 canonical 或 hreflang 错误即扣分；**国际站 hreflang 必须双向返回+自引用+x-default** | 手动/爬虫 | Astro 默认 ✅；无多语言 |
| 3.10 | **404 / 重定向** | 死链 301 到相关内容；不链到 404 / 链回链；禁 A→B→C 链式跳转 | 爬虫/`broken-link-checker` | 13 个 301 跳转桩已排除 |
| 3.11 | **页面加载速度** | 首包<200KB、无巨大 JS bundle、按需加载。**PageSpeed 案例**：69→94（问题清单→AI 逐条修复→验证→部署） | Lighthouse / Bundle 分析 | Astro 零 JS 默认页快 ✅ |
| 3.12 | **安全（HTTPS）** | SSL 证书、无混合内容、HSTS 头 | SSL Checker | 待部署后验证 |
| 3.13 | **速赢战术** | **"5 Fixes Before Dinner"**：GSC 顶部10页→每页+3内链→Title精确匹配→加FAQ→超200KB图压缩。**"11-20排名优化法"**：GSC 11-20位页→H1精确匹配→+5内链→扩核心段→2-3周上首页 | `technical-seo.md` §十二 | 待部署后执行 |
| 3.14 | **国际 SEO（多语言）** | URL 用子目录（/de/）非 ccTLD 非子域名；hreflang 双向+自引用+x-default；核心页面全本地化（非机器翻译→转化低30-50%） | `international-seo.md` | 目前无多语言需求

---

## 四、结构化数据 / Schema（10 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 4.1 | **Organization（首页/about）** | name + url + logo；About 页加 Person（创始人） | `PageSchema.astro` | ✅ 首页有 Organization；About 已补 ✅ |
| 4.2 | **SoftwareApplication（功能页）** | name + applicationCategory + operatingSystem + offers + author(Person) | `PageSchema.astro` | ✅ 全站已统一 |
| 4.3 | **FAQPage（FAQ 区块页）** | mainEntity 数组，每项 Question+Answer；3-5 个 | `FAQSchema.astro` | 10 页（19%）缺 |
| 4.4 | **Article（博客）** | headline + author(Person) + datePublished + dateModified + image + publisher | `seo-schema-injector` | ✅ 博客页有；author 须从 Organization→Person |
| 4.5 | **BreadcrumbList（导航）** | position + name + item；所有有层级页 | `PageSchema.astro` | ✅ 已覆盖 |
| 4.6 | **ImageObject（含图页）** | contentUrl + caption + author；Article 内嵌套 image 字段 | `seo-schema-injector` | Meaning 页已补 ✅；其他图页待补 |
| 4.7 | **Person（作者/创始人）** | name + jobTitle + url(about) + sameAs；所有 Author 字段用 Person 非 Organization | 手动注入 | ⚠️ **全站 53 页 100% 缺** |
| 4.8 | **Product（电商页）** | name + image + offers.price + aggregateRating | 仅 B2C 货品站用 | InkFlow SaaS 站不用 ❌ |
| 4.9 | **WebSite + SearchAction（首页）** | 首页加 WebSite schema + potentialAction SearchAction（搜索目标 + query-input） | `seo-schema-injector` | 待加（首页目前只有 Organization） |
| 4.10 | **AggregateRating（评分）** | SoftwareApplication/Product 可含 aggregateRating（ratingValue + ratingCount）；**须来自真实评测**（Capterra/G2），严禁编造 | Capterra/G2 评测页 | ⚠️ 全站缺（需要真实评分数据） |
| 4.11 | **WebPage（工具页）** | 主页用 WebPage，不用 Article 或 Product | `PageSchema.astro` | 免费工具页已用 ✅ |
| 4.12 | **语法校验** | JSON-LD 无语法错误；用 Google Rich Results Test 验 | Schema.org 验证 / 哥飞 auditor | 待部署后验证 |

---

## 五、E-E-A-T（跨板块，6 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 5.1 | **具名作者（Experience + Expertise）** | 每页 Person Schema：name + jobTitle + about-page 链接 + 行业经验 | `EEAT_AUTHOR` 常量 | ⚠️ **53 页 100% 缺**（"InkFlow Team"） |
| 5.2 | **审核人（Authoritativeness + Trust）** | 关键页（legal/compliance/medical）加 reviewer：name + credentials | 页面变量 | About 页已有 ✅；waiver 页示范已加 |
| 5.3 | **真实来源引用** | 每条 claim 配 2+ 稳定 URL（非编造）；数据来自真实实验/调研 | 手动标注 | Meaning 页有 ✅；营销页部分缺 |
| 5.4 | **一手经验信号** | 含独有数据/案例/使用体验；禁通用说服 | 手动检查 | `digital-tattoo-waiver` 已做 E2（成本对比）；全站待补 |
| 5.5 | **日期（Published + Updated）** | 每页标注显式日期；陈旧内容更新标记 | 页面 footer / schema | 部分页有 ✅；统一有待 |
| 5.6 | **第三方认可** | Capterra/G2/GetApp 真实评测 URL + 徽章 | `seo-schema-injector` V5 | ⚠️ **全站 100% 缺** |

---

## 六、内链架构（6 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 6.1 | **内链数量** | money/compare 页 ≥5 条；blog/tool ≥3 条；首页 ≥10 条。**内链 R1-R6**：每页≥3描述性锚文本(R1)、功能页互链(R2)、对比页→功能页(R3)、博客→功能页(R4)、工具→功能页(R5)、核心页→首页(R6) | 哥飞 auditor（孤岛预警） | 53 页中 15 页（28%）内链<3；5 页（9%）0 内链 |
| 6.2 | **锚文本质量** | 描述性含词锚文本（"digital tattoo waiver software" 非 "点击这里"）；同一目标页锚文本多样性 | 手动检查 | ✅ 大多已达标 |
| 6.3 | **孤岛断连** | 每页至少 1 条链入（从别页指向）；无孤立页 | 爬虫图谱 | compare/best-tattoo-studio-software 0 内链 → **孤岛** |
| 6.4 | **功能页互链** | 相关功能页互链（waiver → booking = compliance → aftercare）形成主题网 | `internal-linking-rules.md` | 部分达标，对比页弱 |
| 6.5 | **集群双向链验证** | 主题集群：支柱→集群页 双向链接，锚文本用关键词。用 grep 验证每个集群页内是否含支柱页链接 | `seo-topic-cluster` Step 3 | InkFlow 暂以产品页为中心，未正式集群 |
| 6.6 | **外链质量** | nofollow 标记；新窗口 noopener；不链低质量站 | 手动检查 | ✅ |

---

## 七、外链建设（10 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 7.1 | **外链总数** | 新站先建 50-100 条主题相关外链 | Ahrefs / Moz | ⚠️ **~0**（Noel 模型头因子+156%） |
| 7.2 | **域名多样性** | 50+ 唯一引用域名 > 同一域名 100 条。**铁律**：域名多样性 > 总数量 | Ahrefs DR | 0 |
| 7.3 | **外链类型分布** | 混合型：Guest Post / HARO / Broken Link / 免费工具 / 信息图 / 统计数据 / 目录站 / 资源页 / 品牌提及补链 / Podcast | `seo-link-building`（25 种策略） | 0 |
| 7.4 | **每日 outreach 节奏** | 每天 3-5 个：目录提交 + outreach 邮件 + 资源页联系。**原则**：细水长流，禁暴增（Google 判不自然） | 外链追踪表 | 未开始 |
| 7.5 | **第一梯队目录** | Google Business(DA100) / LinkedIn(98) / Crunchbase(91) / G2(89) / Capterra(87) / ProductHunt(88) / Trustpilot(90) / Dun&Bradstreet(91) | 注册+完善档案 | G2/Capterra 待建 |
| 7.6 | **纹身行业 Niche 外链** | 目录：tattoolove.es / tattoospotlight.com / inkstinct.co；媒体：inkedmag.com / tattooing101.com / tattoodo.com；协会：Alliance of Professional Tattooists / National Tattoo Association | outreach + 赞助 | 未开始 |
| 7.7 | **榜单站 outreach** | 形态 A 词（best tattoo booking software）— 进入 worldmetrics/wifitalents/leadspark 等。搜 "best tattoo X" → 找榜单页编辑联系方式 | outreach 模板 | ⚠️ 未开始 |
| 7.8 | **免费工具分发** | 6 大渠道：① SEO 拦截页 ② 目录站(alternative.me/saashub.com) ③ 嵌入代码 iframe ④ 资源页外联 ⑤ 社媒推广 ⑥ Product Hunt 发布 | `free-tool-distribution-plan.md` | ✅ 免费工具已建待分发 |
| 7.9 | **Webinar / 原创数据** | 每场权威型 webinar = 140+ 外链。5 步：独特角度→联合主持人→原创发现→策略分发→多格式复用。预算 $500-2K/场，一年 2-4 场 | `seo-link-building` §六 | 未开始 |
| 7.10 | **外链审计频率** | 每季度审计外链画像（坏链/失去链/新获链） | `seo-backlink-audit` | 未做（无可审对象） |

---

## 八、数据分析与测量（9 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 8.1 | **GSC 收录率** | 已提交页 ≥95% 被索引；无 "已发现但未索引" 堆积 | GSC Pages 报告 | 未上线，无数据 |
| 8.2 | **CTR（点击率）** | CTR 基准（按排位）：#1=27.6% / #2=15.8% / #3=11.0% / #4=8.4% / #5=6.3% / #6-10=2-4%。低于基准 30%+ → 优先优化 Title/Description | GSC Performance | 无数据 |
| 8.3 | **关键词四象限** | 高排名→高点击（保持）、高排名→低点击（优化Title/Desc）、低排名→高展示（扩内容+内链）、低排名→低点击（暂不关注或重做） | GSC 导出 → 四象限矩阵 | 无数据 |
| 8.4 | **平均排名 + 趋势** | 目标词月均排名变动；周粒度监控；同比/环比 | `seo-gsc-analyzer` | 无数据 |
| 8.5 | **低垂果实** | 排名 8-15 的词 → 每页：① Title 匹配意图 ② 回答 PAA ③ +2-3 内链 ④ 加 FAQ Schema → 有望进前 10 | GSC 11-20 筛选 + 逐页优化 | 无数据 |
| 8.6 | **AI 引用率** | TOFU 内容被 AI Overview 引用的次数 | `aeo.md` §9 | 未追踪 |
| 8.7 | **转化率** | BOFU 页（对比/功能/定价）注册率/付费率 | GA4 / 后端 | 未追踪 |
| 8.8 | **A/B 测试** | Title/CTA/对比表布局 变体测试；样本量每变体 ≥1000 | 手动/工具 | 未开始 |
| 8.9 | **GSC 月度复盘** | 每月按模板复盘：关键指标(环比) → Top10 词 → Top10 页 → 发现 → 本月行动 | `seo-gsc-analyzer` 模板 | 未上线 |

---

---

## 九、竞争分析（7 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 9.1 | **SERP 形态判定** | 搜意图判断 A 对比 B 交易 → 决定规则集（L 或 V） | `serp-top10-rules.md` | ✅ 已建框架 |
| 9.2 | **榜单页规则 L1-L8** | 对比表(L1)·量化评分(L2)·Best-for(L3)·双向评价(L4)·价格⚠(L5)·编辑方法论具名(L6)·**不放quote(L7 反向)**·披露CTA(L8) | 榜单页验收 | 10 个对比页 L2/L3/L4/L6 全缺 |
| 9.3 | **厂商页规则 V1-V6** | 价格(V1)·取舍(V2)·真实客户quote(V3)·功能词(V4)·Capterra徽章(V5)·CTA(V6) | 厂商页验收 | features 页 V3/V5 全缺 |
| 9.4 | **子话题覆盖差距** | 竞品 H2 覆盖了哪些子话题？我方可抄+超越（E1-E7 独家角度） | `content-gap-matrix.md` | ✅ 已建 7 个独家角度 |
| 9.5 | **竞品 E-E-A-T 差距** | 竞品用什么信任信号（quote/徽章/数据/作者）→ 我方必须 ≥ | 手动抓取比较 | Wavrr/TattMe 用真实 quote，我方缺 |
| 9.6 | **竞品外链画像** | 竞品从哪些站获链？可复制？ | Ahrefs / Moz | 未做（无数据） |
| 9.7 | **竞品内容更新频率** | 竞品博客/页面上次更新周期 → 我方快于它 | 手动查看 | 未追踪 |

---

## 十、站型工作流（5 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 10.1 | **站点定性** | SaaS / B2C 货品 / B2B 供应商 / 内容站 → 决定全站打法 | `site-types.md` | ✅ InkFlow=B2B SaaS |
| 10.2 | **PLG vs SLG 判断** | ACV + 销售周期 → Product-Led SEO（免费工具引流）或 Sales-Led（case study 驱动） | `seo-saas` §9 | ✅ PLG：免费工具 + 长尾内容 |
| 10.3 | **上线 9 步流程** | 关键词→集群→建页→技术→Schema→内容→内链→外链→监控 | `workflow-kickstart.md` | ✅ 已执行 |
| 10.4 | **每月生产节奏** | BOFU 页（对比/功能）→ MOFU（案例）→ TOFU（博客）；≥4 页/月 | `workflow-saas.md` | 计划中 |
| 10.5 | **月度审计** | GSC→关键词→页面→技术→外链 逐月闭环修复 | `seo-gsc-analyzer` | 待部署后启动 |

---

## 十一、平台特指（6 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 11.1 | **LinkedIn B2B 增长** | 行业内容库（按垂直切分）→ 排期引擎 → LinkedIn 轮播帖 | `social-seo.md` | 内容库待建 |
| 11.2 | **X/Twitter SEO 帖** | 项目推理 / 排名字帖 → 存档入 KB + 映射 InkFlow | `social-seo.md` | 已建立 workflow ✅ |
| 11.3 | **Reddit 自然外链** | 回答纹身/软件相关问题 → 自然引用 | `social-seo.md` | 未开始 |
| 11.4 | **图片 SEO** | 格式(WebP/AVIF) · 压缩(<100KB) · Alt 描述 · ImageObject Schema · 懒加载 · 响应式 | `image-seo.md` | ✅ Astro Image 已做 |
| 11.5 | **YouTube 分发** | 软件教程/对比/案例 → YouTube → 嵌入回站 | `youtube-seo.md` | 未开始 |
| 11.6 | **邮件 SEO（Newsletter）** | 周报/Welcome Series → 回流站 |  | 未开始 |

---

## 十二、算法与趋势（4 维）

| # | 维度 | 核心标准 / 公式 | 工具 / 方法 | InkFlow 现状 |
|---|------|----------------|------------|-------------|
| 12.1 | **GEO / AI 搜索适配** | FAQPage Schema + 结构化表格 + 首段 40-60 字答案 + 证据层（值+样本+周期+来源）占"可被引用度"43% | `aeo.md` | ✅ 已覆盖 |
| 12.2 | **AI 爬虫 allow-list** | robots.txt 允许 GPTBot / Google-Extended / ClaudeBot / PerplexityBot / OAI-SearchBot / ChatGPT-User / Claude-Web / Applebot-Extended；禁抓敏感路径 | `aeo.md` §5 | ✅ 已补全 |
| 12.3 | **Google 核心更新应对** | 坚持 E-E-A-T（真实经验+引用+作者）+ 有价值内容（非 AI 批量）+ 页面体验；无"黑帽"投机 | `deep-learn-seo-patterns.md` | 策略已定 |
| 12.4 | **YMYL 适配（B2C 出海）** | 纹身涉及身体健康（感染/疤痕/去除）= YMYL 领域；需要更强 E-E-A-T 信号（医学/卫生参考 + 合规声明 + 不准承诺疗效） | `seo-b2c` §9 | Meaning 页已有文化声明 ✅ |

---

## 使用说明

1. **做哪类工作查哪块**：建新页→查二（内容）+ 四（Schema）；竞品调研→查九（竞争分析）；上线前→查三（技术）+ 四（Schema）+ 六（内链）
2. **每维状态标记**：
   - ✅ = 已达标
   - ⚠️ = 局部达标或有缺口
   - ❌ = 未达标
   - 空 = 未开始/未知
3. **执行顺序**：先 P0（内容深度 + 聚焦度 + 关键词），再 P1（技术 + Schema + 内链 + E-E-A-T），再 P2（外链 + 社媒 + 多媒体）
4. **跨板块联动**：E-E-A-T 是跨所有板块的根基；竞争分析反哺内容策略；技术 SEO 是前面所有板块的基础设施
5. **数据更新**：全文 103 个维度状态为 2026-07-14 快照。每季度全线复盘一次，标记已修复和新增缺口。
