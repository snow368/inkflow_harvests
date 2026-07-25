# SEO 知识库分类地图（按功能板块 + 站型标注）

> 本图是知识库的「分类应用入口」。全库 195 个 markdown 文件已通读并归入 10 个 SEO 功能板块 + 跨类元文档。
> 用法：**做哪类 SEO 工作、做哪个站型，就只查对应板块+站型标注的知识**，不必翻全库。
> 分类原则见 `keyword-research.md` 的 `### 🧩 合并原则`（只取有用的、6 条测试筛选；SELF-REPORTED 来源标注但未审计）。

---

## 一、怎么用这张图

### 1.1 按功能板块查

| 我要做… | 查哪个板块 |
|---|---|
| 找词 / 分组 / 映射页面 / 评 KD | **二、关键词研究** |
| 写页面 / 改文案 / GEO 写作 / 内链 / 选题 | **三、内容创作与优化** |
| 速度 / CWV / 收录 / robots / 抓取 / JS | **四、技术 SEO** |
| JSON-LD / FAQPage / Breadcrumb / ImageObject | **五、结构化数据** |
| 外链 / 目录 / 数字 PR / 关系链 | **六、外链建设** |
| GSC / CTR / 排名追踪 / AB 测试 / 自动化 | **七、数据分析与测量** |
| 增长飞轮 / 程序化 SEO / 竞品 / 内容集群 / 自动化 | **八、战略与增长** |
| LinkedIn / YouTube / Reddit / 社媒 / 本地 / 图片 / 邮件 | **九、平台特指** |
| SaaS / B2C / B2B / 内容站 / 新站上线流程 | **十、站型工作流** |
| 核心更新 / 排名因子 / 2026 趋势 / AI 搜索 | **十一、算法与趋势** |

### 1.2 按站型查（标注规则）

每个核心文档和来源用标签标注适用站型。筛选逻辑：

| 标签 | 含义 | 适用站点 |
|------|------|---------|
| `【SaaS】` | 此文档/技巧只适用于**订阅制软件**站 | InkFlow、Calendly、Notion |
| `【B2C】` | 此文档/技巧只适用于**卖实物货品**站 | 跨境电商/DTC/Shopify 站 |
| `【B2B】` | 此文档/技巧只适用于**批发/代工/企业服务**站 | Alibaba、Made-in-China |
| `【内容站】` | 此文档/技巧只适用于**流量变现（广告/Affiliate）**站 | 工具站、Affiliate 站 |
| `【InkFlow】` | InkFlow 专属执行档案，直接套用 | InkFlow |
| `【通用】` | **所有站型通用**（默认无标签也是通用） | — |

> **使用**：如果你在做 B2C 站，只看标了 `【B2C】` 或 `【通用】` 的文档，忽略 `【SaaS】` `【B2B】` `【内容站】` 的内容。
> **定性铁律**：拿到任何新站先过 `framework/site-type-router.md` 路由（Gingiris 两轴分类 → 4 型映射），确认调哪个 per-type skill。

### 1.3 按站型查核心 skill

| 站型 | 调哪个 skill | 主框架 |
|------|-------------|--------|
| SaaS | `seo-saas` Skill | `framework/workflow-saas.md` |
| B2C 货品 | `seo-b2c` Skill | `framework/workflow-b2c.md` |
| B2B 批发 | `seo-b2b` Skill | `framework/workflow-b2b.md` |
| 内容站 | `seo-content-site` Skill | `framework/workflow-kickstart.md` |

---

## 二、关键词研究

**🎯 何时用**：建词库、把词分组映射到页面、判断 KD/意图、定每月生产优先级。

**📚 核心文档（已整合共识）**
- `framework/keyword-research.md`【通用】— 三阶段闭环（挖词→分组→页面规划）+ 5 维评分（KD/意图/价值/量/匹配度，≥35 优先）+ 月度审计
- `content-seo.md` §二【通用】— 5 维评分矩阵（商业价值 40% / 意图 25% / 竞争 15% / AI 覆盖 10% / 搜索量 10%，>7.0 进 Brief）
- `150-seo-strategies.md` A 部分【通用】— 20 条选题法（PAA / 下拉 / 相关搜索 / GSC 高曝光低点击 / 长尾 / B2B commercial）
- `keyword-selection-methodology.md`【通用】— 已合并进 keyword-research.md，仅留索引

**🔍 原始来源（SELF-REPORTED 经验，按价值摘）**
- `sources/weixin-seo-keyword-research-independent-site-2026-07-13.md` — 独立站三阶段闭环 + PowerShell 合并 CSV + 阈值按品类定
- `sources/ericlancheres-keyword-clustering.md` — 实体 SEO（打"新关键词"非现有词、Entity Density>Keyword Density、每 top entity 出现 3-5 次）
- `sources/aronhouyu-google-trends-market-verification.md` — Google Trends 6 步验证（3 月短期 / 1 年对比 / 5 年赛道）
- `sources/connorgillivan-seo-funnel-strategy.md` — BOFU 先做→外链集中打 BOFU（转化最高）
- `sources/hezhiyan7.md` — 固定 niche 内找 KD<20 低竞争切入角度
- `sources/056-saturday-night-seo-tips.md` — 以 Top 3 页面为支点跳到重叠词扩张
- `sources/semrush-tofu-mofu-bofu-content-funnel.md` — TOFU/MOFU/BOFU 模板规划
- `sources/x-account-learnings.md` — 多 X 账号打法索引（Product-Led SEO / 外链速度 / 站内搜索=需求信号）

**📁 InkFlow 档案**：`inkflow-keywords.md`（56 词 4 梯队）· `inkflow-keyword-priority.md` · `inkflow-keywords-headings.md` · `inkflow-keywords-v2.md` · `inkflow-keyword-page-feature-map.md` · `inkflow-keyword-trend-analysis.md`

**✅ 应用指引**：新站 KD<20 起步；一簇 5-8 词一页；InkFlow 56 词已分 4 梯队，按 `inkflow-keyword-priority.md` 逐月生产。

---

## 三、内容创作与优化

**🎯 何时用**：写任何页面 / 改文案 / 做 GEO 写作 / 排内链 / 定选题方向 / 内容差距分析。

**📚 核心文档（已整合共识）**
- `content-seo.md`【通用】— 生产工作流（5 维评分 + BLUF + 段落自包含 + 列表表格 + 发布线 IndexNow→Reddit→GSC）
- `aeo.md`【通用】— GEO 三件套（FAQPage Schema + 结构化表格 + 首段 40-60 字答案）+ EAS 实体权威评分
- `framework/seo-geo-writing-standard.md`【通用】— 每段首句即答案、独立可引用、每页清单
- `framework/heading-hierarchy-rules.md`【通用】— H1 唯一含词、H2 每页 4-7、H3 每 H2 下 2-4、禁跳级
- `topic-clusters-guide.md`【通用】— Hub-and-Spoke 主题集群（产品页不做支柱，在内容页链向产品）
- `internal-linking-rules.md`【通用】— 每页 ≥3 描述性锚文本内链；功能页互链最紧急
- `content-matrix.md`【通用】— 页面类型×格式×Schema×漏斗×意图×字数 总矩阵（速查）
- `framework/faq-writing-standard.md`【通用】— **FAQ 权威标准（2026-07-17 新建）**：合并 6 处分散 FAQ 规则 + TanTan 206 + seo.md，裁定数量(3-5基线/pillar 5-8)/长度(甜点40-60/上限<300)/真实问题来源/两类FAQ/H3进PAA，消库内冲突
- `framework/page-content-checklist.md`【SaaS】【通用】— (InkFlow 框架) 每页上线硬验收单（§5 = 写作文风标准 Anti-AI-Cliché，来自 seo.md 合并；§二对比页已按 v2 修正 Capterra/quote 归属）

**🔍 原始来源（按价值摘）**
- `sources/okara-ai-content-strategy.md`【通用】— Docs 每页独立回答一个真实问题 = SEO landing page
- `sources/072-tantan-faq-206.md`【通用】— 两类FAQ(独立页vs产品模块)/全站禁复制同套/答案≤100字首句给答案/真实问题来源采集法(客服·竞品评论区·Reddit)/H3进PAA
- `sources/kaicromwell-collection-blog-seo.md`【B2C】【SaaS】— 品类页补 5 类支撑博客建集群
- `sources/rosshudgens-tofu-content-back.md`【通用】— TOFU 因 AI 引用 ROI 回升；仍 BOFU 优先
- `sources/noelceta-seo-thin-content-paradox.md`【通用】— 长度≠质量；新站先建 authority 再写长文
- `sources/boringlocalseo-comparison-money-page.md`【SaaS】【B2C】— 对比页改写为"买家决策工具"
- `sources/weiyipei-devto-4articles-fulltext.md`【通用】— GEO 证据层占"可被引用度"43%
- `sources/vibemarketersHQ-ai-content-gap.md`【通用】— 6 步 AI Overview 内容差
- `sources/coreyhainesco-saas-content-marketing.md`【SaaS】— 五层认知框架 + 内容 Atomization
- `sources/app-playbook-site-playbook-mode.md`【SaaS】— 单页 Playbook 结构
- `sources/frontend-prince-*`【通用】— 落地页 CRO 写法
- `sources/john-ola25-landing-page-cro.md`【通用】— 落地页 message match

**📁 InkFlow 档案**：`inkflow-blog-strategy.md` · `inkflow-content-image-links.md` · `inkflow-content-plan.md` · `inkflow-content-plan-complete.md` · `inkflow-screenshot-guide.md` · `inkflow-pages-detailed.md` · `inkflow-website-execution-guide.md`

**✅ 应用指引**：所有页面套 `seo-geo-writing-standard.md` 清单；**FAQ 统一按 `framework/faq-writing-standard.md` 写**（3-5 个真实问题 + FAQPage JSON-LD + H3 包问题）；对比页=买家决策工具；GEO 证据层写法（每条 claim 带值+样本+来源）。**这是用户最常调用的板块。**

---

## 四、技术 SEO

**🎯 何时用**：速度/CWV 优化、robots/sitemap/canonical、抓取与索引、JS 渲染、移动端、Meta 标签。

**📚 核心文档（已整合共识）**
- `technical-seo.md`【通用】— 季度审计-修复（P0 24h / P1 速赢）+ IndexNow 三步 + CWV
- `javascript-seo.md`【通用】— `curl -A Googlebot` 查原始 HTML；内链用 `<a>` 非 onClick
- `image-seo.md`【通用】— WebP/AVIF、主图<100KB、描述性 alt、ImageObject Schema
- `meta-tags-rules.md`【通用】— Title≤60 / Description≤155 / OG 每页 / canonical 每页
- `deep-learn-seo-fixes.md`【通用】— "前 10 页加内链+Title 精确匹配+FAQ" / "11-20 名优化"速赢

**🔍 原始来源（按价值摘）**
- `sources/kristina-azarenko-technical-seo.md`【通用】— React/Vue SPA 导航必须用 `<a href>`
- `sources/seokeval-technical-seo.md`【通用】— 技术审计清单

**📁 InkFlow 档案**：`inkflow-audit.md` · `inkflow-website-plan.md` · `inkflow-total-check.md`

**✅ 应用指引**：Astro SSG 天然合规，无需大改；上线前跑 CWV + Lighthouse；IndexNow 已建 hook（待部署生效）。

---

## 五、结构化数据

**🎯 何时用**：决定页面用哪种 JSON-LD、补 FAQPage/Breadcrumb/Product/SoftwareApplication/ImageObject。

**📚 核心文档（已整合共识）**
- `schema-plan.md`【SaaS】— InkFlow 专属对照表（首页 Organization / 功能页 SoftwareApplication / 对比页 FAQPage / 定价页 Product+Offer / 博客 Article+BreadcrumbList）
- `framework/seo-per-page-execution.md`【通用】— 每页 10 步发布清单（含加 Schema）

**🔍 原始来源（按价值摘）**
- `sources/frontend-prince-seo-content-structure.md`【通用】— 清晰 heading 层级 + 结构化数据 = AI 更易引用
- `sources/gingiris-skill-blueprints/gingiris-seo-geo.SKILL.md`【通用】— 双引擎 JSON-LD 标准
- `sources/hridoyreh-image-seo.md`【通用】— `ImageObject` schema（contentUrl/name/caption）
- `sources/jespernissen-image-seo-youtube-entity.md`【通用】— 视频/图片命名含品牌词 + Schema

**📁 InkFlow 档案**：`inkflow-website-plan.md`（SEOHead 组件自动注入）

**✅ 应用指引**：InkFlow 已清掉错误的 `Product` 误用（全站统一 SoftwareApplication）；**`ImageObject` 是待补缺口**（图片站/电商核心资产，四套 per-type skill 均未覆盖）。

---

## 六、外链建设

**🎯 何时用**：规划外链策略、找外链源、数字 PR、关系链、目录提交、anchor 比例。

**📚 核心文档（已整合共识）**
- `link-building-campaigns.md`【通用】— 4 周战役 + 质量>数量
- `webinar-link-building.md`【SaaS】【B2B】— 权威 Webinar 作 Link Bait（平均 140+ 外链）
- `framework/b2b-backlink-sources.md`【SaaS】【B2B】— 第一梯队 DA70+（G2/Capterra/Trustpilot/ThomaNet）
- `framework/tattoo-niche-backlinks.md`【SaaS】（InkFlow 专属）· `free-tool-distribution-plan.md`【通用】

**🔍 原始来源（按价值摘）**
- `sources/hezhiyan7-trustpilot.md`【通用】— Trustpilot(DR90+) 注册拿永久外链
- `sources/mdanassaif-directory-submission.md`【通用】— 手动提交 30-100 目录；**SaaS 必做 G2/Capterra/PH/AlternativeTo**
- `sources/060-seo-ai-future-real-relationships.md`【通用】— 真实关系外链最强大
- `sources/066-tangxianseng-directory-submission-indexing.md`【通用】— 提交后 `site:` 查收录
- `sources/semrush-ai-citations-third-party-sources.md`【通用】— AI 也读别人关于你的话
- `sources/X-accounts-directory.md`【通用】— 外链机会类型索引

**📁 InkFlow 档案**：`inkflow-backlink-list.md`（精选 25 + 完整池 259，每天 3-5 提交）

**✅ 应用指引**：InkFlow 当前**外链=0**（Noel Ceta 模型 +156% 第一因子）。第一动作：注册 G2/Capterra/Trustpilot + 提交目录 + 免费工具嵌入挂件自动生成外链。

---

## 七、数据分析与测量

**🎯 何时用**：注册 GSC、看 CTR/展示、排名追踪、AB 测试、建 SEO 实验循环、自动化监控。

**📚 核心文档（已整合共识）**
- `seo-automation-tools.md` — 2026 三趋势（报告→行动 / 多 AI 平台可见性 / 预测性 SEO）+ 工具矩阵 + 自动化替代策略是错误
- `tools.md` — 工具库（GSC/Ahrefs/Semrush/Screaming Frog/Surfer/Cloudflare）

**🔍 原始来源（按价值摘）**
- `sources/connor-showler-gsc-optimization.md` — GSC 筛 Position 4-20 按 impressions，优化已有页（#8→#3 流量>发 10 篇新文）
- `sources/davidmduw-gsc-quick-wins.md` — 每月拉 Impression>500 但 CTR<2% 改 title
- `sources/foley-seo-ai-experiments.md` — 每次只改一个变量打 annotation，AI 追踪 6 信号；位置改善≠流量改善
- `sources/057-ge-ai-visibility-microsoft-clarity.md` — 微软 Clarity AI Visibility 监控"被 AI 引用"
- `sources/069-ptengine-product-page-ab-testing.md` — 产品页 5 层测试，每月 10+ 测试的团队增长 2.1x
- `sources/goldikam-hero-headline-ab.md` — Hero A/B（+"质量保证+免费" +44% CVR）
- `sources/ahrefs-blog.md` — 仅 1.74% 新页面一年进前十；GEO 引用数据
- `sources/gingiris-skill-blueprints/gingiris-seo-geo-agent.SKILL.md` — Day-by-day SEO SOP（北极星=进 Top10 词数）
- `sources/ryan-doser-ai-seo-automation.md` — AI 内容流水线（研究→事实核查→去重→内链→审批→发布）

**📁 InkFlow 档案**：`inkflow-audit.md` · `seo-tracking.md`（第 4 周查索引 / 8 周查排名 / 12 周超竞品）

**✅ 应用指引**：上线 Day1 注册 GSC + GA4 + Clarity；每周筛 4-20 位词优化；建 Experiment Log。

---

## 八、战略与增长

**🎯 何时用**：定增长引擎、内容集群规划、程序化 SEO 评估、竞品深潜、案例研究、自动化体系。

**📚 核心文档（已整合共识）**
- `case-studies.md`【SaaS】【B2B】— 新加坡 B2B（静默期生存 / 意图匹配 / 内链审计 +15%）· 匈牙利小语种
- `150-seo-strategies.md`【通用】— 150 条综合策略（A 关键词 / B 内容 / C 页面 / D 技术 / E 外链 / F AI / G 增长）
- `programmatic-seo.md`【通用】— ⚠️ **InkFlow 暂未启用**；质量门槛（真实需求+60% 独有+真实数据+≤50 页）+ 架构规则
- `site-types.md`【通用】· `b2c-b2b-seo-differences.md`【通用】— 站型图谱与差异
- `niche-competition-scorecard.md`【通用】· `ai-agent-seo-automation.md`【通用】
- `framework/serp-top10-rules.md`【SaaS】— SERP TOP10 竞品规则识别法（实测核验 v2）
- `framework/content-gap-matrix.md`【SaaS】— 竞品内容差距 + 7 个独家信息增益角度
- `framework/seo-dimension-catalog.md`【通用】— SEO 全维度目录（12 板块 × 103 维）

**🔍 原始来源（按价值摘）**
- `sources/CoderJeffLee.md` — GEO 三件套（IndexNow+Schema+AI-friendly FAQ）+ pSEO 验证再规模化
- `sources/coderjefflee-seo-three-systems.md` — 三系统框架（结构/内容/信任，缺一不可）
- `sources/david-gquaid-pseo-scaled-content.md` · `sources/vibemarketersHQ-programmatic-seo.md` — pSEO 本质（SEO App / 模板×场景）+ 📌 InkFlow 暂未启用
- `sources/chuhaiqu-linkedin-b2b-content-system.md` — 70/20/10 内容分层 + 5 阶段管线（对接 LinkedIn KB）
- `sources/coreyganim-10-ai-revenue-services.md` · `sources/foley-seo-distribution-saas-growth.md` — SaaS 增长引擎排序（SEO>Social>Influencer>UGC>Paid）
- `sources/kai-cromwell-seo-long-game.md` — SEO 收益 12-24+ 月，短期靠 striking-distance 优化
- `sources/weiyipei-growth-seo-methodology.md` · `sources/weiyipei-competitor-tech-fulltext.md` — 双引擎框架 + $5 竞品深潜 SOP + 5 信号
- `framework/serp-top10-rules.md` — **SERP TOP10 竞品规则识别法（已实测核验 v2）**：按查询意图分 A对比/B交易 两种 SERP 形态；榜单页规则 L1-L8 + 厂商页规则 V1-V6，每条标置信度 ✅/⚠️/❌（v1 的 R1/R6/R10/R11 已证伪）
- `framework/page-content-checklist.md` — **(InkFlow 框架) 每页上线硬验收单**：哥飞三工具方法论 + R/L/V + 53 页本地审计发现（Person作者100%缺/对比页信任层全缺/内链<3占28%/薄页占32%），附 P0/P1/P2 与执行顺序
- `sources/hezhiyan7-progressive-result-display.md` · `sources/irentdumpsters-local-brand-building.md` · `sources/lvloomystery.md` — 渐进展示 / 拥有注意力 / 资源索引
- `sources/gingiris-skill-blueprints/gingiris-b2b-growth.SKILL.md` — B2B SaaS PLG/SLG 诊断（ACV+销售周期）+ 5 阶段路径（$0→$10M ARR）+ 2B 内容公式（case study 必做 / CFO 友好定价 / 无 hype 话术）
- `sources/gingiris-skill-blueprints/2c-adaptation.md` — 2C 双轨关键词（红利词+长尾）+ 区域渠道数据 + YMYL 加固 + KOL 分层 + 程序化质量闸

**📁 InkFlow 档案**：`inkflow.md`（定调：SaaS 新站先 BOFU 对比页+功能页，外链靠产品驱动不买）· `inkflow-market-gaps.md` · `inkflow-real-gaps.md` · `inkflow-shop-conversion-funnel.md` · `inkflow-seo-complete.md` · `inkflow-total-check.md` · `inkflow-playbook.md`

**✅ 应用指引**：InkFlow=SaaS，走 BOFU 优先 + 免费工具（Product-Led SEO）+ G2/Capterra 外链。**程序化 SEO 知识全归档在本板块，待 InkFlow 有 50-100 篇手写内容 + 一定 DA 后再评估启用。** B2B SaaS 增长阶段（PLG/SLG + 5 阶段 + 2B 内容公式）见 `seo-saas` 第九节与 `framework/site-type-router.md` 第三节。

---

## 九、平台特指

**🎯 何时用**：做 LinkedIn / YouTube / Reddit / 社媒分发 / 本地 SEO / 图片 SEO / 邮件营销 / 国际化。

**📚 核心文档（已整合共识）**
- `local-seo.md`【B2C】【内容站】· `youtube-seo.md`【通用】· `reddit-seo.md`【通用】· `social-seo.md`【通用】· `international-seo.md`【B2C】【B2B】· `google-maps-review-intelligence.md`【B2C】【本地】

**🔍 原始来源（按价值摘）**
- **LinkedIn**：`sources/067-anne-linkedin-b2b-lead-generation.md`【SaaS】【B2B】· `sources/dan-rosenthal-linkedin-inbound.md`【通用】
- **Reddit**：`sources/thecoolestcool-reddit-strategy.md`【通用】
- **Email**：`sources/055-email-open-rate-sweet-spot.md`【通用】
- **Local**：`sources/059-ai-search-local-seo-playbook.md`【B2C】【本地】
- **Image**：`sources/hridoyreh-image-seo.md`【通用】· `sources/kasra-dash-seo-testing.md`【通用】
- **出海区域渠道（来自 gingiris 2c-adaptation）**【B2C】— 简中/韩/日/东南亚 渠道 + MAU 数据
- **KOL 分层**【B2C】— nano/micro/macro/mega

**✅ 应用指引**：InkFlow=SaaS → **LinkedIn + X + Reddit 主线**（social-seo.md 结论）；Local/Shopping/语音 暂不适用（无线下/非电商）；图片 SEO 适用于纹身作品图。**出海/B2C 货品站** → 抖音/小红书/Naver/KakaoTalk 等区域渠道（数据见 `seo-b2c` 第九节）+ KOL nano/micro 分层。

---

## 十、站型工作流

**🎯 何时用**：确认站型、按类型取用上线流程、建新站、对接 per-type SKILL。

**📚 核心文档（已整合共识）**
- `site-types.md`【通用】— 5 类（SaaS/B2C/B2B/内容站/品牌站）目标+转化路径+策略+KD+KPI
- `site-launch-methodology.md`【通用】— 新站上线（Phase0 技术地基 + Schema + 外部引用源 + BOFU 模板 + Reddit 冷启动）
- `framework/workflow-saas.md`【SaaS】· `workflow-b2c.md`【B2C】· `workflow-b2b.md`【B2B】· `workflow-kickstart.md`【内容站】— 各类型上线工作流
- `framework/site-type-router.md`【通用】— **类型路由/闸门**（Gingiris 两轴模型 → 4 per-type skill 映射）

**🔍 原始来源（按价值摘）**
- `sources/weiyipei-b2b-saas-fulltext.md`【SaaS】【B2B】— 窄化 ICP 到"一个痛苦工作流"
- `sources/061-ai-saas-payment-page-checklist.md`【SaaS】— 支付页 3 件事
- `sources/068-indie-dev-japan-tool-site-seo.md`【内容站】— 工具站长尾内容池
- `sources/weiyipei-saas-analook-36day-case-study.md`【SaaS】— 36 天案例
- `sources/gingiris-skill-blueprints/SKILL-CATALOG.md`【通用】· `2c-adaptation.md`【B2C】· `gingiris-b2b-growth.SKILL.md`【SaaS】【B2B】
- `sources/batch-0606-mixed-seo-links.md`【B2C】— B2C 电商落地页参考

**📁 InkFlow 档案**：`inkflow.md` · `inkflow-pages-detailed.md` · `inkflow-playbook.md` · `inkflow-website-execution-guide.md` · `inkflow-market-gaps.md` · `inkflow-real-gaps.md` · `inkflow-shop-conversion-funnel.md` · `inkflow-seo-complete.md` · `inkflow-total-check.md`

**✅ 应用指引**：InkFlow 定性 = **SaaS 型**，用 `framework/workflow-saas.md` + 用户级 `seo-saas` SKILL；跨类型四套 per-type skill 已建（seo-saas/seo-b2c/seo-b2b/seo-content-site），做其他站型时直接调用。**拿到任何新站先过 `framework/site-type-router.md` 路由（Gingiris 两轴分类 → 4 型映射），确认调哪个 skill，避免跨类型套打法。**

---

## 十一、算法与趋势

**🎯 何时用**：理解核心更新影响、排名因子优先级、2026 AI 搜索趋势、调整 KPI（从排名→被引用）。

**📚 核心文档（已整合共识）**
- `google-algorithms.md` — 核心更新追踪（HCS/Page Experience/Spam/AIO/Reviews）+ E-E-A-T 持续信号
- `ranking-factors.md` — 已证实 6 大因子（内容质量最高 / 外链域多样性>总量 / 技术 / 页面体验 / 意图匹配 / 品牌）+ SaaS 特有 Product-Led SEO
- `seo-trends-predictions.md` — 零点击率 64.82%、AI 引用率取代排名为 KPI、品牌提及超外链、Schema 强制、E-E-A-T 2.0

**🔍 原始来源（按价值摘）**
- `sources/joyannehawkins-dec2025-core-update.md` — 旧 keyword-rich anchor 外链变负债；实体信任制 > 链接数
- `sources/prabir336-ai-seo-hacks-vs-real-seo.md` — Google 官方：基础 SEO = AI SEO，不需 llms.txt/chunking/特殊 Schema
- `sources/davidgquaid-reddit-perplexity-geo.md` — GEO 被过度吹，做 Schema+引用源，不做纯 GEO 内容
- `sources/jasmine-local-rankings-vs-recommendations.md` — 排名≠被推荐；GEO 优先级 > 纯排名
- `sources/vibemarketersHQ-ai-content-gap.md` — AI Overview 内容差 6 步
- `framework/deep-learn-seo-patterns.md` — 站内搜索词法 / AI 引用 Listicle 法 / 本地对比页法
- `sources/inkflow-keyword-trend-analysis.md` — 10 大词 Google Trends 均上升，Rising 词优先抢
- `sources/gingiris-skill-blueprints/2c-adaptation.md` — YMYL（Google 官方定义：健康/财务/安全/社会福祉）+ 5 动作加固（可验证资质 / 方法论透明页 / Organization.sameAs / About+团队页 / 绝不编造）

**✅ 应用指引**：坚持基础 SEO（独特内容 + 清晰技术 + 高质量图 + 页面体验）；E-E-A-T 用真实行业经验；KPI 从"排名"迁到"AI 引用率 / 零访问可见性"。**教育/医疗/金融等 YMYL 品类**：E-E-A-T 中 Trust 是核心，须做可验证资质 + 方法论透明页 + Organization.sameAs + About/团队页（详见 `seo-b2c` 第九节 9.3）。**

---

## 跨类 / 元文档（导航与索引）

以下不直接对应单一功能板块，是知识库的"地图"与"整合枢纽"：

| 文档 | 角色 |
|---|---|
| `index.md` | 知识库总目录 + 变更日志（导航入口） |
| `content-matrix.md` | 页面类型×格式×Schema×漏斗×意图×字数 总矩阵（速查枢纽） |
| `framework/skills-master-index.md` | 7 大技能分类 → 文件 → 适用项目（快速定位用哪份文档） |
| `readme.md` | 知识库定位与目录结构说明（新人入门） |
| `sources/x-account-learnings.md` · `sources/X-accounts-directory.md` | 多 X 账号打法索引 + 外链机会类型（跨类聚合） |
| `sources/gingiris-skill-blueprints/SKILL-CATALOG.md` | 41 个蓝本总目录（仅参考，不安装） |

---

> **分类统计**：全库 195 文件 → 关键词研究 ~11 · 内容创作与优化 ~22 · 技术 SEO ~8 · 结构化数据 ~7 · 外链建设 ~18 · 数据分析与测量 ~14 · 战略与增长 ~26 · 平台特指 ~45 · 站型工作流 ~23 · 算法与趋势 ~12 · 跨类元文档 ~6（含重复归类与 InkFlow 档案）。
> **完整文件级分类**（每个文件的主类/副类/核心知识点/来源性质/InkFlow 适用性）见 5 份分组报告：`C:/Users/snow3/WorkBuddy/2026-07-12-11-40-44/.workbuddy/scratch/kb-classify/group1~5.md`。
>
> **Gingiris 蓝本补全（2026-07-14）**：依据生姜Iris 4 份已存档 SKILL 蓝本（`gingiris-seo-geo` / `gingiris-seo-geo-agent` / `gingiris-b2b-growth` / `2c-adaptation`），将原本缺失的「类型分类」与「类型专属 SEO 打法」补齐：① 新建 `framework/site-type-router.md` 类型路由（Gingiris 两轴模型 → 4 per-type skill 映射 + OSS/App/Hardware/Local 扩展归并）；② `seo-saas` 补 B2B SaaS 增长诊断（PLG/SLG + 5 阶段 + 2B 内容公式）；③ `seo-b2c` 补 2C 出海分支（双轨关键词/区域渠道/YMYL/KOL/质量闸）；④ 八/九/十/十一 板块补对应来源指针与应用指引。GEO 证据层 43% / AI 爬虫 / Agent SOP 等已在 `aeo.md` 全覆盖，本次不重复。
