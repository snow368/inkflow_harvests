# Aftercare Cluster — Gap Analysis & Intent Audit（写前必读）

> 生成：2026-07-16 ｜ 用途：在动笔扩写 aftercare 7 篇前，校准「每篇主打词 + 意图 + SERP 差距 + 内容厚度差」。
> 配套文件：`aftercare-cluster-brief.md`（已有逐页 content brief，本文件补「实际 vs 目标」差距与意图核验）。
> ✅ SERP 竞争格局已用内置 WebSearch 抓取真实 Top5（2026-07-16）。**我方当前排名**仍需你本机 GSC 复核（见 §4.4），但对手是谁、内容差距在哪已可逐项对标。

---

## 1. 结论速览

| 维度 | 结论 |
|------|------|
| **厚度** | 7 篇全部偏薄：支柱 1589 词、6 个 spoke 仅 694–860 词（含 HTML 标记，真实正文更少），仅为 brief 目标的 **50–60%**。✅ 你的直觉正确——单薄。 |
| **意图** | 7 篇里 **6 篇意图正确**，1 篇需修正（`aftercare-products` 标「商业」但正文是中性建议，未匹配商业调查意图）。详见 §3。 |
| **E-E-A-T** | **部分缺失（此前夸大）**：FAQ 段 + FAQPage schema + 面包屑 + 内链 **已存在**（7 篇全有 `<FAQSchema>`）；真正缺的是具名作者(现硬编码 `InkFlow Team`)、reviewer、2+ 真实引用、`@graph` JSON-LD、可见 byline、内容深度。Day 1 必修（详见 §7）。 |
| **SERP 缺口** | 竞品普遍有：真实 fresh-vs-healed 照片、成分级产品对比、可下载护理卡（PDF）、 medically-reviewed 徽章、视频。我们基本都没有。 |

---

## 2. 逐页 Gap 表（词数 / 意图 / 主缺口）

> 词数 = `wc -w` 含标记，真实正文约为其 60–70%。**§2 原标「目标词数取自 brief」不实**——`aftercare-cluster-brief.md` 词量列是过时桩值（pillar 490 / products 61 / issues 57 / color 30），与下表目标矛盾；现按 KB 标准重定（见 §7.4）。

| 页面 | 主打词 | brief 意图 | 当前词 | 目标词 | 厚度差 | 主要缺口（除 E-E-A-T 外） |
|------|--------|-----------|--------|--------|--------|---------------------------|
| `tattoo-aftercare-guide` | tattoo aftercare | 信息 | 1589 | 2500–3200 | −900~−1600 | 各「by type/placement」小节展开不足；缺真实照片；缺 printable 护理卡；CTA 弱 |
| `aftercare-products` | best tattoo aftercare balm / tattoo aftercare products | **商业**(需修正) | 820 | 1500–2000 | −700~−1200 | 未真正做产品横评/推荐；无 CTA；工具榜单格式不匹配（当前写成了中性建议博客） |
| `aftercare-issues` | infected tattoo / tattoo healing problems | 信息 | 772 | 1400–1800 | −600~−1000 | YMYL 医疗内容无 reviewer；缺「何时就医」流程图；照片警示缺失 |
| `aftercare-color-tattoo` | aftercare for color tattoo | 信息 | 767 | 1200–1600 | −400~−800 | 缺色彩 fresh-vs-healed 照片；防晒数据（UPF/SPF）未量化 |
| `aftercare-second-skin` | tattoo aftercare second skin | 信息 | 803 | 1100–1500 | −300~−700 | 品牌对比（Saniderm/Tegaderm）轻微商业意图未接；渗液照片缺失 |
| `aftercare-timeline` | tattoo aftercare day 1 / tattoo healing timeline | 信息 | 860 | 1200–1600 | −300~−700 | 日表已有但可加「部位修正系数」；缺示意图 |
| `aftercare-activities` | tattoo aftercare swimming / can you workout | 信息 | 694 | 1000–1400 | −300~−700 | 时间线（几天能游泳/健身）可表格式强化；缺风险分级 |

**簇总词数**：当前 ≈6,265（含标记）→ 目标 ≈9,400–12,800。需新增约 **3,000–6,500 词真实正文**。

---

## 3. 意图审计（用户核心疑问：这些意图对不对？）

### 3.1 逐篇意图判定

| 页面 | 判定 | 说明 |
|------|------|------|
| tattoo-aftercare-guide | ✅ 正确 | "tattoo aftercare" 主导意图 = 教学/信息（Google 以指南型结果服务）。TOFU 信息词无误。 |
| aftercare-products | ⚠️ **需修正** | "best tattoo aftercare balm" = 商业调查意图（比价/选购前）；"tattoo aftercare products" 偏中性信息。当前正文是「你只需要 3 样，其余是营销」的**中性建议**，未真正服务商业意图。→ 重标为 **商业+信息混合**，并补：真实产品横评表（Aquaphor/Bepanthen/Hustle Butter/Inktrox）、按肤质/阶段推荐、**软 CTA 到 InkFlow 或联盟产品**。 |
| aftercare-issues | ✅ 正确（但 YMYL） | "infected tattoo" = 问题诊断型信息意图，正确。但属医疗 YMYL，Google 抬升 E-E-A-T 门槛 → **必须有具名皮肤科 reviewer**，否则即便意图对也难排。 |
| aftercare-color-tattoo | ✅ 正确 | 教学型信息意图。 |
| aftercare-second-skin | ✅ 基本正确 | "how long to leave second skin" = 教学信息。注："second skin" 本身是产品（Saniderm/Tegaderm），SERP 有轻微商业 bleed，但我们的目标词是教学向，无需改意图，可在文中顺带提品牌差异。 |
| aftercare-timeline | ✅ 正确 | 教学信息 + 强 Featured Snippet（表格）候选。 |
| aftercare-activities | ✅ 正确 | "can you swim/workout" = 是非型教学信息。 |

**结论：6/7 意图正确，仅 `aftercare-products` 需从纯「商业」修正为「商业+信息混合」并让内容匹配商业调查意图。**

### 3.2 簇级意图结构问题（更重要）

- **整簇 86% 是信息意图（6 信息 + 1 商业）**。对 "tattoo aftercare" 这个主题，商业价值主要在「产品销售 + 工作室预约」，信息页负责引流（TOFU）。这本身没问题，但 **brief 与现有页都缺「信息页 → InkFlow 转化」的 CTA 路径**——意图对了，转化链断了。每篇信息页末尾须有 1 个软 CTA（如「用 InkFlow 自动发 aftercare 提醒邮件」或「免费建独立站」）。
- **YMYL 两篇**（issues + 部分 color/products 涉及医疗）必须补 medical reviewer，否则 Google 以「缺少资质」压排名。

---

## 4. SERP / 竞争对手差距（需本机复核精确排名）

### 4.1 真实 SERP Top5（2026-07-16 WebSearch 抓取的 Top5）

| 主打词 | SERP Top5 真实对手 | 对手类型 | 对手页面形态 |
|--------|-------------------|---------|------------|
| **tattoo aftercare** | Cleveland Clinic、Healthline、dhtattoo.co.nz、inkrementaltattoo.com、saigontattooclub.com | 2 医疗权威 + 3 工作室 | 长指南（含按周时间线、产品建议、并发症） |
| **best tattoo aftercare balm** | vitiumtattoo.com（品牌对比表+FAQ）、reviewtattoo.com（实测 8 款+Amazon 评分价格）、glow.com.au（澳洲打分榜）、reuzel.com（品牌+5 维标准） | 品牌站 + 评测站 | **顶部对比表 + 价格 + 评分 + Amazon 链接** |
| **infected tattoo** | Medical News Today、Cleveland Clinic、Healthline、Apollo Hospitals、OSF HealthCare | **100% 医疗/医院** | 症状清单、治疗、何时就医、引用医生 |
| **aftercare for color tattoo** | tattootwins.com.au（黑 vs 彩差异）、nivea.co.uk（4 贴士）、vietinktattoo.com（致褪色的错）、Cleveland Clinic、gtattoo.ca | 工作室 + 护肤品牌 + 医疗 | 色彩专属建议 + 防晒强调 |
| **tattoo aftercare second skin** | saniderm.com（知识库）、saniderm.com/how-to-use、**品牌自身霸屏**、beanweilertattoos、scratchtattoos、azkubicki | 1 品牌官方 + 4 工作室 | 贴/撕教程、佩戴时长、渗液说明 |
| **tattoo aftercare day 1 / healing timeline** | rinattattarin.com（LA 师傅 24 年经验逐日）、monolithstudio、thundercattattoostudios（Day1-2/3-7/8-14/W3-4 清单）、tattoora.com.au、tattoobuild.com | 工作室为主 | **分阶段逐日清单 + 一手师傅经验** |
| **tattoo aftercare swimming** | peachytattoos、fiercetattoostudio、bangertattoocare.com（按水源/部位极细）、usms.org（游泳组织） | 工作室 + 垂类组织 | **按水源分级（泳池/海/湖/温泉）+ 风险 + 万一游了怎么办** |

### 4.2 逐页「要打败/对标谁 + 必含段」（写前对照）

**① `tattoo-aftercare-guide`（支柱）** — 对标 Cleveland Clinic / Healthline 的医学严谨 + 工作室实操
- 必含：分阶段时间线（第1周/2–4周/5周+）、by-type 小节（线条/写实/水彩/彩色/覆盖疤）、by-placement 修正（关节/手脚/肋骨）、产品建议（洁面+保湿，点名 Aquaphor/Bepanthen/Hustle Butter 但说明差异）、并发症警示、**可打印护理卡 CTA**。
- 厚度：2500–3200 词（KB §7.4 基线，已统一，非 §2 旧值 2800–3500）；E-E-A-T：Sarah Chen + 具名皮肤科 reviewer。

**② `aftercare-products`** — 对标 vitiumtattoo / reviewtattoo 的**对比表形态**（证实商业意图）
- 必含：**对比表**（产品/价格带/核心成分/适用阶段/肤质/是否纯素）、"我们怎么打分"方法论、按肤质推荐、常见误区（凡士林封毛孔）、软 CTA。
- 厚度：**1500–2000 词**（KB 工具榜单基线，非博客基线）；意图改「商业+信息」。

**③ `aftercare-issues`（YMYL）** — 对标 Medical News Today / Cleveland Clinic
- 必含：症状 vs 正常发红对照表、**何时就医流程图**（发烧/蔓延红线/脓液→立即就医）、家庭护理边界、具名医生 reviewer（缺则几乎排不上）。
- 厚度：1400–1800 词；E-E-A-T：YMYL 强制 medical reviewer。

**④ `aftercare-color-tattoo`** — 对标 tattootwins / vietinktattoo
- 必含：彩色比黑灰更易褪色的机制、UV 是头号敌人（量化 SPF50+ 建议）、fresh-vs-healed 描述、按颜色类型（红/黄/白）注意事项、长期防晒习惯。
- 厚度：1200–1600 词。

**⑤ `aftercare-second-skin`** — 对标 saniderm 官方 + 工作室教程
- 必含：贴法（裁剪+从中间向外抚平）、佩戴时长（首片≤24h、二片3–5天、总共≤7天）、撕除（温水下平行撕）、渗液"ink sack"正常说明、过敏处理、传统 vs second skin 差异。
- 厚度：1100–1500 词。

**⑥ `aftercare-timeline`** — 对标 thundercattattoostudios 分阶段清单
- 必含：Day1-2 / 3-7 / 8-14 / 15-21 / W3-6 五阶段清单、**部位修正系数**（手脚/关节更慢）、milky phase 解释、Featured Snippet 表格候选。
- 厚度：1200–1600 词。

**⑦ `aftercare-activities`** — 对标 bangertattoocare 按水源分级
- 必含：**按水源时间表**（泳池2–4周/海2–4周/湖4–6周/温泉4–6周）、按部位（手脚更久）、万一提前游了怎么办、健身/出汗/出汗瑜伽分级、宠物毛发风险。
- 厚度：1000–1400 词。

### 4.3 我们的差异化优势（必须放大）
**"按类型与部位差异化护理" 独家角度**——竞品（除 tattootwins 略提黑/彩）几乎都是「按天一刀切」流程。这是我们能吃 Featured Snippet 与「更权威」的支点，brief §1 已定，扩写时务必强化（每篇都挂这个钩子）。

### 4.4 缺失内容元素清单（对标竞品补）
- [ ] 真实 fresh-vs-healed 照片（每类型至少 1 组对比图）
- [ ] 产品成分级横评表（含价格带/适用阶段/肤质）
- [ ] 可下载/打印 aftercare 护理卡（PDF，易获外链）
- [ ] medically-reviewed 徽章 + 具名 reviewer
- [ ] 信息页 → InkFlow 软 CTA
- [ ] （可选）嵌入式 how-to 短视频

### 4.5 ⚠️ 我方排名待 GSC 复核（对手已锁定）
WebSearch 已给出对手 Top5，但**我方当前排名**沙箱仍无法定位（需 GSC）。请本机填下表：

| 主打词 | 我方排名 | Top1 | Top2 | Top3 |
|--------|---------|------|------|------|
| tattoo aftercare | ? | Cleveland Clinic | Healthline | dhtattoo.co.nz |
| best tattoo aftercare balm | ? | vitiumtattoo | reviewtattoo | glow.com.au |
| infected tattoo | ? | Medical News Today | Cleveland Clinic | Healthline |
| aftercare for color tattoo | ? | tattootwins | nivea | vietinktattoo |
| tattoo aftercare second skin | ? | saniderm (KB) | saniderm (how-to) | beanweilertattoos |
| tattoo healing timeline | ? | rinattattarin | monolithstudio | thundercattattoostudios |
| tattoo aftercare swimming | ? | peachytattoos | fierce tattoo | bangertattoocare |

---

## 5. 明天（Day 1）写什么 —— 执行顺序建议

> 原 `CONTENT_INVENTORY.md` Day 1 写「7 篇补 E-E-A-T + 4 修复」。结合本分析，**建议改为「先模型页、后 cascade」**，否则薄页批量盖章无意义。

1. **Day 1：支柱 `tattoo-aftercare-guide` 重写为模型页**
   - 扩到 2800–3500 词（各 by-type/placement 小节加真实细节 + 照片占位）。
   - 注入 E-E-A-T：Author=Sarah Chen（改 `BlogSchema author`）+ 加 medical reviewer（具名皮肤科医生）+ `@graph` JSON-LD（Article/FAQPage + author Person + reviewer）+ 可见 byline 段。
   - 末尾加 1 个 InkFlow 软 CTA。
   - 本地 `cd marketing && npm run build` 验证通过 → push main。
2. **Day 2–7：逐 spoke 按同模板扩写 + E-E-A-T**（顺序：products→issues→timeline→color→second-skin→activities）。
   - `aftercare-products` 顺便修正意图为「商业+信息」，补产品横评 + CTA。
   - `aftercare-issues` 必加 medical reviewer（YMYL）。
3. **Day 8（或穿插）：补 §4.3 缺失元素**（照片/PDF 卡/视频）与 SERP 复核填表。

---

## 6. E-E-A-T 注入技术要点（写页时直接用）

- **Author 改法**：每页 `<BlogSchema ... author="Sarah Chen" ... />`，并把默认 props 里的 `"InkFlow Team"` 改为 `"Sarah Chen"`（BlogSchema.astro 第 11 行默认值，建议一并改，防漏）。
- **真实引用（KB E-E-A-T 强制，本文此前漏列）**：每页 ≥2 条稳定真实 URL 来源。YMYL 三篇（issues/products/color）须 cite 权威医疗源（AAD / Mayo Clinic / Healthline）；其他页引 InkFlow 产品数据或行业来源。**绝不编造**，查不到标 `[建议补充]`。
- **Reviewer**：aftercare 簇（尤其 issues/products/color）建议加具名 reviewer（如 `Dr. [真实姓名], MD, board-certified dermatologist`）。这是「all Sarah Chen」规则的**健康内容例外**——YMYL 必须有医疗资质 reviewer 才能满足 E-E-A-T 的 Trust。
- **`@graph` JSON-LD**：在现有 BreadcrumbList `<script>` 旁加 `Article` + `FAQPage`，含 `author`(Person: Sarah Chen, jobTitle, sameAs /about) 与 `reviewedBy`(Person: 医生)。注意主站 `SEOHead` 默认 `appSchema=true` 会注入 `SoftwareApplication`，自带 schema 的页须 `appSchema={false}` 防重复（参考 B5 页做法）。
- **可见 byline**：每页加「Written by Sarah Chen · Reviewed by Dr. X · Updated 2026-07-16」段，链接 `/about`。

---

## 7. KB 校验与修正（对照 `seo-knowledge` 知识库 · 2026-07-16）

> 加载 `seo-content-writing` / `seo-technical` / `seo-competitor-gap` / `seo-saas` 四个知识库技能后，回头核验本文 §1–§6。结论：**方向对，但有 3 处说错/夸大、4 处知识库要求但本文漏写。** 逐条如下。

### 7.1 ✅ 我们说对了的
- **意图判定（6/7 正确）**：符合 KB 意图分类（信息 vs 商业）。`aftercare-products` 改「商业+信息混合」正确——KB 的 `best X for Y` / 工具榜单确属商业/交易意图。
- **单薄诊断正确**：当前 spoke 694–860 词 < KB 博客基线 1000，确属偏薄。
- **YMYL 必须 medical reviewer**：KB `seo-saas §8` + `INKFLOW-SEO-EEAT-PLAN` 明确 YMYL 医疗内容需具名资质 reviewer，否则压排名。正确。
- **差异化角度（by type & placement）**：契合 KB「差异化角度 / 信息增益」原则，是正确支点。
- **Schema 用 `appSchema={false}`**：KB `seo-saas §5` 明令内容页（博客）关掉 SoftwareApplication，正确。

### 7.2 ⚠️ 我们说错 / 夸大的（已修正）
1. **词数基线说错（重要）**：此前口头称「博客/指南应 2000–4000 词」——**错**。KB `seo-content-writing` 矩阵明确：**博客/指南 = 1000–1500 词**；2500–3500 是「长文/案例研究」档，仅支柱级 definitive guide 适用。已按 KB 重定目标（§7.4）。
2. **「E-E-A-T 全部缺失 / 无 FAQ / 无内链」夸大**：实测源码，**7 篇全部已有 `<FAQSchema>`（FAQPage schema）+ FAQ 段 + 面包屑 + 内链**（支柱 13 条、各 spoke 4–7 条）。缺的是：**具名作者、reviewer、2+ 真实引用、@graph JSON-LD、可见 byline、内容深度、照片/护理卡**。Day 1 不是「从零加 FAQ」，而是「强化已有 FAQ + 补 E-E-A-T 厚度」。
3. **§2「目标词数取自 brief」不实**：实测 `aftercare-cluster-brief.md` 词量列是过时桩值（pillar 490 / products 61 / issues 57 / color 30），与 §2 目标 2800-3500 矛盾。该目标非 brief 来源，已改按 KB 重定（§7.4）。

### 7.3 ➕ 知识库要求但本文漏写的
1. **每页 2+ 条真实引用/来源**（KB E-E-A-T 强制，已补 §6）：YMYL 页须 cite AAD / Mayo / Healthline；非 YMYL 也至少 2 条稳定真实 URL。
2. **内链方向错（真实缺口）**：现有内链多为 blog→blog；KB `seo-saas` + 技术 SEO `R4` 要求 **每篇博客 ≥3 条链到功能页**（喂转化漏斗）。当前几乎无 blog→feature 链接——这是比「无内链」更精确的缺口。
3. **BLUF + 自包含 + 表格**（KB 写作三原则）：本文只查词数，未查结构。需确认每页首段 40–60 字直给答案、每段独立、关键对比用表格。
4. **Meta 审计**（KB 技术 SEO）：Title ≤60、Description ≤155–160、canonical、OG 每页必备。经 `SEOHead` 组件大概率已处理，但上线前需逐页核验（尤其 Title 是否含关键词前置、Description 是否含价值点+CTA）。

### 7.4 修正后的目标词数（KB 基线）
| 页面 | 类型 | 当前词 | **KB 基线** | 修正后目标 | 缺口 |
|------|------|--------|-----------|-----------|------|
| tattoo-aftercare-guide | 支柱(长文档) | 1589 | 2500–3500 | 2500–3200 | −900~−1600 |
| aftercare-products | 博客(实为工具榜单) | 820 | 1000–1500 | **1500–2000**（KB 工具榜单基线，非博客基线） | −700~−1200 |
| aftercare-issues | 博客(YMYL) | 772 | 1000–1500 | 1100–1500 | −300~−700 |
| aftercare-color-tattoo | 博客 | 767 | 1000–1500 | 1000–1400 | −230~−630 |
| aftercare-second-skin | 博客 | 803 | 1000–1500 | 1000–1400 | −200~−600 |
| aftercare-timeline | 博客 | 860 | 1000–1500 | 1100–1500 | −240~−640 |
| aftercare-activities | 博客 | 694 | 1000–1500 | 1000–1400 | −300~−700 |

---

## 8. 支柱页动笔前核对清单（SERP + Gap + 写作规则 三合一）

> **动笔 `tattoo-aftercare-guide` 前逐项核对。** 本清单合并五份依据：① 写作规则 `site-content-seo-ruleset.md`；② E-E-A-T 规则 `eeat-authority-source-plan.md` + 用户级 E-E-A-T 强制信号；③ SERP 必含段（§4.2①）；④ Gap 修正（§7.4 词数 + §7.3 结构/内链/Meta）；⑤ **KB `seo-content-writing` 完整法则**（每页 13 项检查清单 + 10 步流程 + AEO 四法则 + 三大原则 + Hook 打磨）。写的时候按这份来，不要只盯 §7.6 单条。

> **⚠️ 2026-07-16 完整性复核**：拿 KB `seo-content-writing` 全套法则逐条比对本 §8 初版，发现 **5 条硬规则此前漏写**，已补入下方（标 🆕）：① Hook 三选一（TOFU 强制）；② AEO 每个 H2 下 40–60 字直答（不止开头 BLUF）；③ 信息增益作为独立必查项；④ 发布后分发节奏；⑤ Voice Profile 保留声音。

### 8.1 主推词 & 元数据（规则集 §1–5）
- [ ] 主推词：`tattoo aftercare`（URL / H1 / title / 内链锚文本全部围绕它）
- [ ] slug `tattoo-aftercare-guide` **已收录，绝不改**（规则集铁律：改即丢权重）
- [ ] Title ≤60 字符，主推词前置（如 `Tattoo Aftercare: Complete Healing Guide`）
- [ ] Description ≤160，自然含主推词 + 价值点 + 软 CTA
- [ ] H1 含主推词（每页仅 1 个，与 title 语义一致）
- [ ] 前 100 字出现 1 次主推词；全文 2–4 次；长尾变体（color / second skin / healing timeline 等）3–6 次；密度 <3%（禁堆砌）

### 8.2 SERP 必含段（§4.2① 对标 Cleveland Clinic / Healthline + 工作室实操）
- [ ] 分阶段时间线（第 1 周 / 2–4 周 / 5 周+）
- [ ] **by-type 小节**（线条 / 写实 / 水彩 / 彩色 / 覆盖疤）—— 差异化支点，竞品几乎都按天一刀切
- [ ] **by-placement 修正**（关节 / 手脚 / 肋骨）
- [ ] 产品建议（洁面 + 保湿，点名 Aquaphor / Bepanthen / Hustle Butter 并说明差异）
- [ ] 并发症警示（vs 正常愈合对照）
- [ ] 可打印护理卡 CTA（信息增益，易获外链）

### 8.3 结构调整（KB 三大原则 + AEO 四法则）
- [ ] 🆕 **Hook 三选一（TOFU 强制，KB §11.3）**：动笔前先给 3 种 hook 备选（大胆断言 / 个人故事 / 惊人数据）+ 一句简析 → 用户选 1 个 → 再接 BLUF。**aftercare 支柱是 TOFU 博客，此步不可跳**（商业/对比页才可跳）。
- [ ] **BLUF**：hook 之后首段 40–60 字直给答案（"tattoo aftercare = 清洁 + 保湿 + 防晒 + 别抠"）
- [ ] 🆕 **AEO 直接回答法则（KB §二.1）**：**每个 H2 下第一段都 40–60 字直答**（不止开头那段），这样每个子话题都可被 AI 引用 / 抢 Featured Snippet
- [ ] 每段自包含（拿走一段能独立理解，不写"如前所述"）；关键对比用**表格**（产品对比表 / by-type 对照表 / 并发症对照表）——AI 提取准确率 +30–40%
- [ ] FAQ 强化到 **5–8 问**（覆盖疑问式变体；已有 `<FAQSchema>` FAQPage schema，继续用并扩充）
- [ ] 🆕 **信息增益必查项（KB 每页清单第 13 条 + §十.3）**：至少 1 个"只有 InkFlow 能写"的元素——真实工作室数据 / 一手案例 / by-type×by-placement 独家矩阵（竞品按天一刀切，这是我们的信息增益支点）

### 8.4 E-E-A-T（eeat 计划 + 用户级强制 + §6）
- [ ] **Author = Sarah Chen**（Founder & CEO，12 年纹身店运营，链接 `/about`）
- [ ] **Reviewer = 具名皮肤科医生**（`Dr. [姓名], MD, board-certified dermatologist`）—— YMYL/医疗相关强制
- [ ] **≥2 条真实引用**：AAD (aad.org) / Mayo Clinic / Healthline / Cleveland Clinic（医疗权威）；**绝不编造**，查不到标 `[建议补充]`
- [ ] **`@graph` JSON-LD**：Article + FAQPage，含 `author`(Person: Sarah Chen, jobTitle, sameAs `/about`) 与 `reviewedBy`(Person: 医生)；页设 `appSchema={false}` 防与 `SEOHead` 的 SoftwareApplication 重复
- [ ] **可见 byline**：「Written by Sarah Chen · Reviewed by Dr. X · Updated 2026-07-16」链接 `/about`
- [ ] **一手经验信号**：InkFlow 处理过 X 万次预约 / aftercare 提醒（取自 `EEAT_EXPERIENCE` 真实数据，不虚构）

### 8.5 内链（规则集 §6 + KB R4）
- [ ] 出链 3–8 条，同 aftercare 簇内互链（spoke → pillar，pillar → spoke）
- [ ] **≥3 条链到功能页**（喂转化漏斗，当前缺失）：如 `/features/tattoo-artist-website`（自动 aftercare 提醒）、`/compare/...`；锚文本用主推词变体
- [ ] 末尾 1 个 InkFlow 软 CTA（「用 InkFlow 自动发 aftercare 提醒」/「免费建独立站」）

### 8.6 词数（§7.4 KB 基线，已统一）
- [ ] 目标 **2500–3200 词**（非 §2/§4.2 旧值 2800–3500）
- [ ] 真实正文 ≈ `wc -w` 的 60–70%，故 `wc -w` 目标 ≈ 3600–4600

### 8.7 Meta 审计（KB 技术 SEO，上线前核验）
- [ ] Title ≤60 / Description ≤155–160 / canonical 正确 / OG 完整（`SEOHead` 大概率已处理，逐页确认）

### 8.8 🆕 Voice Profile（KB §11.1，保留个人声音）
- [ ] 动笔前读 `seo-knowledge/voice-profile.md`（7/14 已建），按其语气 / 句式 / 人称 / 是否带一手经历起草
- [ ] 铁律：AI 只建议不磨平声音；疑似偏离处标 `[voice-check]` 求确认
- [ ] SEO 主干（BLUF / 自包含 / 表格 / Schema / 内链）仍 mandatory，本层只补"人味"

### 8.9 执行顺序（写后）
1. Hook 三选一（8.3）→ 用户选 → 按 8.1–8.6 + 8.8 重写支柱页
2. 本地 `cd marketing && npm run build` 验证通过
3. commit + `git push origin main`（防丢红线：只 commit 本次改动，勿 `git add -A` / `reset --hard`）
4. 验证 live：作者 = Sarah Chen + reviewer 出现
5. 🆕 **发布后分发节奏（KB §六）**：Day1 IndexNow 推送 + X 推广 → Day3 X 重推（换切入点）→ Day7 LinkedIn 轮播 → Week4 GSC 查收录/排名
6. 再 cascade 6 spoke（顺序 products → issues → timeline → color → second-skin → activities）

### 8.10 覆盖比对表（本 §8 vs KB `seo-content-writing` 全法则）
| KB 法则 | 出处 | §8 覆盖 |
|---------|------|---------|
| H1 含关键词 / Title≤60 前置 / Desc≤160 含CTA | 每页清单 1–3 | ✅ 8.1 |
| BLUF 首段答案 | 三大原则 1 | ✅ 8.3 |
| **每个 H2 下 40–60 字直答** | AEO 四法则 1 | 🆕 8.3（补） |
| 段落自包含 | 三大原则 2 | ✅ 8.3 |
| 列表/表格（≥1） | 三大原则 3 / 清单 | ✅ 8.3 |
| FAQ 3–5 + FAQPage schema | AEO 四法则 4 | ✅ 8.3（5–8） |
| 字数按类型 | 内容矩阵 | ✅ 8.6 |
| Canonical / OG / Twitter | 清单 9–10 | ✅ 8.7 |
| 内链 ≥3 | 清单 11 | ✅ 8.5（+功能页向） |
| CTA ≥1 | 清单 12 | ✅ 8.5 |
| **信息增益（只有你能写）** | 清单 13 / §十.3 | 🆕 8.3（补） |
| **Hook 三选一（TOFU）** | §11.3 | 🆕 8.3（补） |
| **Voice Profile 保声音** | §11.1 | 🆕 8.8（补） |
| **发布后分发节奏** | §六 | 🆕 8.9（补） |
| 10 步流程②搜SERP③找差距 | §五 | ✅ 已在 §4（SERP）+ §4.2（gap） |
| 成功标准（1周收录/8周top10） | §七 | ⏳ 上线后追踪（非写前项） |
| 7 段销售型结构 | §八 | ➖ 不适用（那是案例研究页，非 aftercare 信息博客） |

> 簇总词：当前 ≈6,265 → 修正后目标 ≈8,000–11,000。需新增约 **1,700–4,700 词**（比原估 3,000–6,500 少，因原目标定高了）。

### 7.5 修正后的 E-E-A-T 注入清单（每页必做，KB `seo-saas §8`）
- [ ] **具名作者**：`BlogSchema author="Sarah Chen"` + 默认 props 改 `"Sarah Chen"`（防漏）
- [ ] **审核人（credentials）**：YMYL 三篇（issues/products/color）须具名皮肤科医生 `Dr. X, MD, board-certified dermatologist`
- [ ] **2+ 真实引用**：稳定真实 URL（YMYL 引 AAD/Mayo/Healthline；其他引 InkFlow 数据/行业来源），不编造
- [ ] **发布 + 最后更新日期**：可见
- [ ] **可见第一手经验信号**：如「InkFlow 管理的 X 家工作室 aftercare 提醒数据」
- [ ] **`@graph` JSON-LD**：Article + FAQPage + author(Person: Sarah Chen, sameAs /about) + reviewedBy(Person: 医生)；页设 `appSchema={false}`
- [ ] **可见 byline**：「Written by Sarah Chen · Reviewed by Dr. X · Updated 2026-07-16」链 `/about`

### 7.6 修正后的 Day 1 执行顺序
1. **支柱 `tattoo-aftercare-guide` 重写为模型页**：扩到 2500–3200 词（各 by-type/placement 加真实细节）；**强化已有 FAQ**（补到 5–8 问，每答 <300 字）；注入 §7.5 全套 E-E-A-T；**加 3 条 blog→feature 内链**（如 /features/booking、/features/client-reminders）；首段 BLUF；末尾软 CTA。本地 build → push main。
2. **逐 spoke（products→issues→timeline→color→second-skin→activities）**：同模板扩写 + E-E-A-T + 补 blog→feature 内链；products 顺改意图为商业+信息并补产品横评表；issues 必加 medical reviewer。
3. **照片/PDF 护理卡/视频**：Day 8 穿插补（属 §4.3 缺失元素，非阻塞）。

### 7.7 优先级提醒（KB `seo-saas` BOFU-first）
aftercare 是 **TOFU 博客**。KB 铁律：SaaS SEO 转化发生在 BOFU（对比/替代/功能页），博客在后。扩写 aftercare 是「修补已有薄页」（契合 KB「11–20 排名优化法」：扩写已在 11–20 名的页），**正确但非最高 ROI**。更高杠杆仍在 BOFU 页（对比/替代/功能）。勿因 aftercare 收尾而长期忽略 BOFU 簇。

---

## 9. Spoke Blog 写作核对清单（支柱 §8 的博客适配版）

> §8 是为**支柱长文**（definitive guide, 2500–3200 词）设计的。6 个 spoke 类型与支柱不同，本 §9 按 KB 内容矩阵三类博客分别给出模板，写 spoke 时只用本 §，不看 §8（避免被 2500 词目标误导）。

### 9.1 KB 内容矩阵 × 我们的 6 个 spoke

| 页面 | KB 类型 | Schema | 漏斗 | 意图 | KB 词数 | 我们的目标 |
|------|---------|--------|------|------|---------|-----------|
| aftercare-color-tattoo | 博客/指南 | `Article` + `BreadcrumbList` | TOFU | 信息 | 1000–1500 | 1000–1400 |
| aftercare-second-skin | 博客/指南 | `Article` + `BreadcrumbList` | TOFU | 信息 | 1000–1500 | 1000–1400 |
| aftercare-timeline | 博客/指南 | `Article` + `BreadcrumbList` | TOFU | 信息 | 1000–1500 | 1100–1500 |
| aftercare-activities | 博客/指南 | `Article` + `BreadcrumbList` | TOFU | 信息 | 1000–1500 | 1000–1400 |
| aftercare-issues | 博客(YMYL) | `Article` + `BreadcrumbList` | TOFU | 信息 | 1000–1500 | 1100–1500 |
| aftercare-products | **工具榜单** | **`FAQPage`** | **MOFU** | **商业+信息** | **1500–2000** | 1100–1500 |

### 9.2 通用 Blog 模板（适用 color / second-skin / timeline / activities，§4.2 ②④⑤⑥⑦ 各加独有段）

```
- [ ] Hook 三选一（§8.3，TOFU 博客强制）→ 用户选 → 接 BLUF 首段 40–60 字直答
- [ ] 每个 H2 下首段 40–60 字直答（AEO 法则，抢 Featured Snippet）
- [ ] 一段一意、自包含（不写"如前所述"）
- [ ] ≥1 个表格或列表（关键对比用表，AI 提取率 +30–40%）
- [ ] FAQ 3–5 问 + `<FAQSchema>` FAQPage schema（已有，继续用）
- [ ] 字数 1000–1500（wc -w 约 1400–2100）
- [ ] Schema: `appSchema={false}` + `<BlogSchema author="Sarah Chen">` + `@graph` Article + BreadcrumbList
- [ ] E-E-A-T：Sarah Chen 作者 + ≥2 真实引用 + 可见 byline + updated 日期（§7.5 照做，但无 reviewer 要求——非 YMYL 不需医疗 reviewer）
- [ ] 内链 3–5 条：同簇互链 + **≥1 条到功能页**（喂转化漏斗，不像支柱需 3 条）
- [ ] 末尾 1 个 InkFlow 软 CTA（不像支柱需长篇 CTA）
- [ ] 信息增益：至少 1 个"只有 InkFlow 能写"的元素（by-type/placement 差异化 + 一手数据）
- [ ] Voice Profile 保留声音（读 `seo-knowledge/voice-profile.md`）
```

### 9.3 YMYL Blog 模板（适用 aftercare-issues，§4.2 ③ + 医疗强制）

通用 blog 模板全适用，**额外增加**：
- [ ] **具名皮肤科 reviewer**（YMYL 强制——KB 明确"缺资质压排名"，非可选）
- [ ] ≥2 条**医疗权威引用**（AAD/Mayo Clinic/Healthline/Cleveland Clinic，不编造）
- [ ] 含"何时就医"流程图 or 对照表（正常愈合 vs 感染症状 vs 立即就医）
- [ ] 页设 `appSchema={false}`（与支柱同，SEOHead 的 SoftwareApplication 不应用在 YMYL blog）
- [ ] 字数 1100–1500（wc -w 约 1570–2140）

### 9.4 工具榜单 Blog 模板（适用 aftercare-products，§4.2 ② + 商业意图改）

通用 blog 模板**大部分不适用**，用以下替换：
- [ ] **KB 类型 = 工具榜单**（不是博客/指南）
- [ ] Schema: **`FAQPage`**（非 `Article`），页设 `appSchema={false}`
- [ ] 意图：**商业+信息混合**（正文须服务"横评选购"商业调查意图）
- [ ] 必含结构：**横评对比表**（产品/价格带/核心成分/适用阶段/肤质）、"我们怎么打分"方法论段、按肤质推荐、常见误区、软 CTA
- [ ] Hook：可跳过（商业/交易页可不做 hook，直接对比表开头；KB §11.3 明确允许跳）
- [ ] 字数：**1500–2000**（工具榜单 KB 基线，不是 blog 的 1000–1500）
- [ ] 内链 3–5 条 + **≥2 条到功能页**（此页商业意图最强，转化路径最直接）
- [ ] E-E-A-T：与通用 blog 同（Sarah Chen + ≥2 引用 + byline；非 YMYL 不需 medical reviewer，但涉及护肤产品可顺带提专业建议来源）
- [ ] 更新频率：工具榜单 KB 要求 **每季度更新**（价格/排名会过时）

### 9.5 执行顺序

1. 用支柱模型页经验 → cascade 6 spoke
2. **顺序**：products（工具榜单，格式最不同）→ issues（YMYL，要求最高）→ timeline（Featured Snippet 候选）→ color → second-skin → activities（最简单的）
3. 每页按 9.2/9.3/9.4 对应模板写 → 本地 `cd marketing && npm run build` → commit + push main
