# Aftercare Cluster — Content Briefs（模板簇 #1）

> 用途：按 cluster 整簇书写的第一个范本。本文件覆盖 aftercare 簇全部待写页面（1 支柱 + 6 支撑），2 个薄页并入支柱。
> 生成日期：2026-07-15 ｜ 流水线步骤：SERP 差距 ✅ → Content Brief（本文件）→ 写页（待审后执行）
> 所有 E-E-A-T 作者/审核者人设为**占位**，发布前请确认真实姓名与 about 页链接。

---

## 0. 簇概览

| 页面 | 类型 | slug | 词量 | 决策 |
|------|------|------|------|------|
| aftercare-general | pillar | `/blog/tattoo-aftercare-guide` | 490 | **保留（先写）** |
| aftercare-products | spoke | `/blog/aftercare-products` | 61 | 保留 |
| aftercare-issues | spoke | `/blog/aftercare-issues` | 57 | 保留 |
| aftercare-color-tattoo | spoke | `/blog/aftercare-color-tattoo` | 30 | 保留 |
| aftercare-second-skin | spoke | `/blog/aftercare-second-skin` | 24 | 保留 |
| aftercare-timeline | spoke | `/blog/aftercare-timeline` | 23 | 保留 |
| aftercare-activities | spoke | `/blog/aftercare-activities` | 14 | 保留 |
| aftercare-black-grey | spoke | — | 6 | **并入** aftercare-general（"黑灰愈合"小节） |
| aftercare-sensitive-skin | spoke | — | 1 | **并入** aftercare-general（"敏感肌"小节） |

**实际产出 = 7 页**（支柱把 2 个薄页吸收为小节，不单独立页）。

---

## 1. 独家角度（Exclusive Angle）

竞品 Top 页（Vertigo、Peachy、Thundercat、Markings）全部是**工作室视角、按天一刀切**的护理流程，且都在推自家产品。

我们的差异点 = **"愈合不是一刀切——按纹身类型与部位差异化护理"**：
- 彩色 vs 黑灰的愈合差异（彩色脱皮更戏剧化；黑灰更慢但更稳）
- fine line 比 bold 愈合快但更易褪
- 手/脚/肋部等"难愈部位"的独立时间表
- 敏感肌、second skin、运动/游泳等真实场景
- 把 aftercare 和"设计决策"挂钩（InkFlow 的设计发现场景天然衔接：你选的 style/placement 决定了 aftercare 难度）

这个角度吃下了我们簇内 color-tattoo / black-grey / sensitive-skin / activities 全部子主题，且竞品无系统覆盖 → **可作为 Featured Snippet 与"更权威"的差异化信号**。

---

## 2. E-E-A-T 通用块（全簇复用）

> 作者/审核者为占位，发布前替换为真实具名人员并补 about 页链接。

- **Author（具名 + 职称 + bio + about 链接）**
  - 姓名：Maya Lindqvist（占位）
  - 职称：Lead Aftercare Researcher, InkFlow
  - Bio：12 年持证纹身师，现负责 InkFlow 护理研究；写过 200+ 术后护理案例复盘。
  - About：`/about/maya-lindqvist`（待建）
- **Reviewer（具名 + 资质）**
  - 姓名：Dr. Priya Anand, MD（占位）
  - 资质：Board-certified dermatologist，专注色素性皮损与创伤愈合
- **真实引用（2+ 稳定一手来源，禁 Wikipedia）**
  - American Academy of Dermatology — "Tattoo aftercare"：`https://www.aad.org/public/everyday-care/skin-care-basics/tattoos/tattoo-aftercare`
  - NHS — "Tattoos"：`https://www.nhs.uk/conditions/tattoos/`
  - Mayo Clinic — "Tattoos: Understand risks and aftercare"：`https://www.mayoclinic.org/healthy-lifestyle/adult-health/expert-answers/tattoos/faq-20058403`
- **发布/更新日期**：published 2026-07-15 ｜ updated 同（每 6 个月复核）
- **第一手经验信号**：InkFlow 用户护理调研数据（示例占位："我们在 1,200 份用户回访中发现，手/脚纹身的平均完全愈合比前臂多 7–10 天"——发布前需有真实数据支撑，否则删除该句）

---

## 3. Schema 计划

| 页面 | Schema 类型 |
|------|------------|
| aftercare-general（支柱） | `Article` + `FAQPage`（可选 `HowTo` 若全文步骤化标注） |
| 6 个 spoke | `Article` + `FAQPage` |
| 全簇 | 每页含 `BreadcrumbList`（Home › Blog › Aftercare） |

### 3.1 内链拓扑规则（全簇强制，Hub-and-Spoke 修正版）

> 这是每个簇 Brief 都必须遵守的「内容蜂巢」拓扑。写页套站点模板会自动带第 ④ 层，但规则在此显式列出，防止漏链。

1. **Spoke → Pillar（硬规则）**：每个支撑页必须含 ≥1 条**描述性锚文本**链向本簇支柱页（如 "完整纹身护理指南"），不用 "点击这里"。
2. **Pillar → Spoke（按相关性）**：支柱正文相关段落自然链回 spoke；其余放 "相关阅读" 模块，不强制每 spoke 各塞一条相同锚文本。
3. **Spoke ↔ Spoke（横向互链）**：相关支撑页之间互链，增强簇内凝聚力。
4. **Pillar → 类目/首页（向上链，强制）**：支柱页必须链向 `/blog`（博客枢纽）与 `/`（首页），让簇是「连在全站上的主题模块」而非孤儿岛。spoke 经 pillar 间接归属全站。
   - 此层由**站点模板**自动保证：header 全站导航 + footer 全站链接 + `BreadcrumbList`（Home › Blog › Aftercare）。写页时套模板即带，**不用在正文单独写**，但正文里也鼓励在相关处自然链一下。
5. **BreadcrumbList**：每页 `Home › Blog › {Cluster}`，与层级导航一致。

---

## 4. 逐页 Brief

### 4.1 Pillar — Tattoo Aftercare Guide

| 字段 | 值 |
|------|-----|
| 目标主词 | tattoo aftercare |
| 副关键词 | tattoo healing, tattoo healing process, aftercare for tattoo |
| 路径 | `/blog/tattoo-aftercare-guide` |
| 类型 | 指南（信息意图） |
| 目标字数 | 2,800–3,500 |
| 读者 | 刚纹完/准备纹身、第一次护理的人 |
| 意图 | 信息（TOFU） |

**Title 方案（≤60 字符）**
1. `Tattoo Aftercare Guide: Heal It Right by Style & Spot`（推荐）
2. `Tattoo Aftercare: Day-by-Day Healing & What's Normal`
3. `How to Care for a New Tattoo (by Type & Placement)`

**Meta Description（≤160）**
Your tattoo aftercare isn't one-size-fits-all. Get a day-by-day healing plan plus color, black-grey, fine-line and sensitive-skin specifics — straight from artists and dermatologists.

**H1**：Tattoo Aftercare Guide: Heal It Right by Style and Placement

**大纲（BLUF 开头：第一段直接给核心答案——"新纹身是伤口，前 48 小时最关键；护理因类型/部位而异"）**
- ## H2: The first 48 hours (what to do the moment you leave the studio)
  - ### H3: Traditional wrap vs second skin — when to remove
  - ### H3: Your first wash (the most important one)
- ## H2: Healing by day — what's normal, what's not
  - （表格：Day 0–3 / 4–10 / 11–21 / 22–30 / 30+，每阶段"发生什么 + 该做/别做"）
- ## H2: Aftercare by tattoo type ← 独家角度核心
  - ### H3: Color tattoos (peel harder, fade risk)
  - ### H3: Black & grey (slower but steadier) — 吸收原 aftercare-black-grey
  - ### H3: Fine line (heals fast, fades easy)
  - ### H3: Bold / blackout (second mini-peel around day 10–14)
- ## H2: Aftercare for sensitive skin ← 吸收原 aftercare-sensitive-skin
  - 低敏产品选择 + 过敏征兆
- ## H2: Aftercare by placement (the hard spots)
  - 手/脚/指（再生快但掉色）→ 肋/胸骨（慢 5–7 天）
- ## H2: Products that actually help (and what to skip)
  - 链向 `/blog/aftercare-products`
- ## H2: When it goes wrong — infection vs normal
  - 链向 `/blog/aftercare-issues`
- ## H2: FAQ
  - Q: Can a tattoo heal in a week? → A: 表面 1–2 周，真皮层 3–6 个月…
  - Q: Do color tattoos heal differently? → A: 是的，脱皮更明显…
  - Q: When can I swim / gym? → A: 游泳 2–3 周；健身房轻量 ~day 10…
  - Q: Can tattoo blowouts heal? → 链向 issues 页
  - Q: What sunscreen for healed tattoo? → SPF 30+，终身防护防褪

**关键词融入**：tattoo aftercare (H1+Title+首段+URL) 4–6 次；tattoo healing (H2+段落) 3–4；aftercare for [type] (H3) 各 1–2。

**Featured Snippet 目标**：日表（表格格式），40–60 字精华——"Days 0–3: wash 2–3×/day, no soak. Days 4–10: peel, don't pick. Weeks 3–4: surface healed; dermis heals 3–6 months."

**竞品参考**
1. thundercattattoostudios.com — 按天清单清晰、语气像真工作室
2. peachytattoos.com — 类型差异（color/fine line）覆盖好，可借鉴
3. aad.org — 医学权威措辞，用于 E-E-A-T 引用

---

### 4.2 Spoke — Aftercare Products

| 字段 | 值 |
|------|-----|
| 主词 | best tattoo aftercare balm / tattoo aftercare products |
| 路径 | `/blog/aftercare-products` |
| 类型 | 指南（商业意图，含产品推荐但中立） |
| 字数 | 1,400–1,800 |
| 意图 | 商业 |

**H1**：Tattoo Aftercare Products: What Actually Helps (and What's Hype)
**大纲**
- ## H2: The only 3 things you really need (fragrance-free soap, thin moisturiser, paper towels)
- ## H2: Balms & creams compared (Aquaphor / Bepanthen / Hustle Butter / Inktrox) — 表格：适用阶段/肤质/价格带
- ## H2: Second skin as a product — 链向 `/blog/aftercare-second-skin`
- ## H2: Sensitive skin picks — 链向支柱 #sensitive-skin
- ## H2: What to skip (petroleum overuse, scented lotion, "natural" alcohol mixes)
- ## H2: FAQ (does cream expire? how much to apply? can I use regular lotion?)
**Schema**：Article + FAQPage ｜ **内链**：↑ 支柱；→ second-skin；→ 支柱#sensitive-skin

---

### 4.3 Spoke — Aftercare Issues

| 字段 | 值 |
|------|-----|
| 主词 | infected tattoo / tattoo healing problems |
| 路径 | `/blog/aftercare-issues` |
| 类型 | 指南（信息+危机处理） |
| 字数 | 1,400–1,800 |
| 意图 | 信息 |

**H1**：Tattoo Healing Issues: Normal Healing vs Infection
**大纲**
- ## H2: Normal healing signs (redness day 1–3, itch, peel, cloudiness)
- ## H2: Infection warning signs (red streaks, pus, fever, worsening pain) — 引用 AAD/NHS
- ## H2: Blowout during healing (can it heal? when to see artist) — 链向 problems 簇待建页
- ## H2: Allergic reaction (rash outside the ink, adhesive allergy)
- ## H2: What to do at each stage (photo-log → artist → doctor)
- ## H2: FAQ (can small tattoos peel? infected tattoo yellow scab? heal without second skin?)
**Schema**：Article + FAQPage ｜ **内链**：↑ 支柱；→ 待建 `/blog/tattoo-problems`

---

### 4.4 Spoke — Aftercare Color Tattoo

| 字段 | 值 |
|------|-----|
| 主词 | aftercare for color tattoo / color tattoo healing |
| 路径 | `/blog/aftercare-color-tattoo` |
| 类型 | 指南（信息） |
| 字数 | 1,200–1,600 |
| 意图 | 信息 |

**H1**：Color Tattoo Aftercare: Protect Vibrancy While It Heals
**大纲**
- ## H2: Why color heals differently (more trauma, dramatic peel, colored flakes are normal)
- ## H2: Day-by-day color healing (link timeline 页 for the full schedule)
- ## H2: Sun protection is non-negotiable (UV breaks ink particles — cite AAD)
- ## H2: Color on dark skin (healed look differs — link color 簇 `/blog/tattoo-color-guide`)
- ## H2: FAQ (can color tattoos take longer? best color aftercare? fade faster?)
**Schema**：Article + FAQPage ｜ **内链**：↑ 支柱；→ aftercare-timeline；→ color 簇支柱

---

### 4.5 Spoke — Aftercare Second Skin

| 字段 | 值 |
|------|-----|
| 主词 | tattoo aftercare second skin / heal with second skin |
| 路径 | `/blog/aftercare-second-skin` |
| 类型 | 指南（信息） |
| 字数 | 1,100–1,500 |
| 意图 | 信息 |

**H1**：Second Skin Aftercare: How Long to Leave It, What's Normal
**大纲**
- ## H2: What second skin does (breathable seal, optimal heal environment)
- ## H2: How long to keep it (24–48h standard; when to remove early)
- ## H2: Fluid pooling under the film — normal, don't panic
- ## H2: After removal: switch to wash + thin lotion
- ## H2: No second skin? (heal without it — link 支柱)
- ## H2: FAQ (heal faster with second skin? blowout under second skin? shower with it?)
**Schema**：Article + FAQPage ｜ **内链**：↑ 支柱；→ aftercare-products；→ 支柱(无 second skin 小节)

---

### 4.6 Spoke — Aftercare Timeline

| 字段 | 值 |
|------|-----|
| 主词 | tattoo aftercare day 1 / tattoo healing timeline |
| 路径 | `/blog/aftercare-timeline` |
| 类型 | 指南（信息，强 Featured Snippet 候选） |
| 字数 | 1,200–1,600 |
| 意图 | 信息 |

**H1**：Tattoo Healing Timeline: What to Expect, Day by Day
**大纲**
- ## H2: The 30-day surface timeline (table: Day 1 / 3–7 / 8–14 / 15–21 / 22–30)
- ## H2: The 3–6 month deep heal (dermis remodels, sun protection matters most)
- ## H2: Healing by tattoo type (color vs fine line vs blackout) — link color-tattoo & 支柱
- ## H2: Healing by placement (hands/feet/ribs run long) — link 支柱#placement
- ## H2: "Is this normal?" quick checks (faded at day 7? scab? itch?)
- ## H2: FAQ (healed 1 year look? 10 years? heal in 2 weeks?)
**Schema**：Article + FAQPage ｜ **内链**：↑ 支柱；→ aftercare-color-tattoo；→ 支柱#placement
**Featured Snippet**：日表（同支柱，但本页更细）

---

### 4.7 Spoke — Aftercare Activities

| 字段 | 值 |
|------|-----|
| 主词 | tattoo aftercare swimming / can you workout with new tattoo |
| 路径 | `/blog/aftercare-activities` |
| 类型 | 指南（信息） |
| 字数 | 1,000–1,400 |
| 意图 | 信息 |

**H1**：Tattoo Aftercare & Activities: When You Can Swim, Gym, and Shower
**大纲**
- ## H2: Showering (yes, but short + gentle soap)
- ## H2: Swimming / pools / hot tubs (wait 2–3 weeks — infection risk)
- ## H2: Gym & exercise (light from ~day 10; avoid friction/rubbing; sweat hygiene)
- ## H2: Sun, sauna, steam rooms (avoid; UV fades fresh ink)
- ## H2: FAQ (can you go swimming? exercise? gym day 1?)
**Schema**：Article + FAQPage ｜ **内链**：↑ 支柱；→ 待建 `/blog/tattoo-prep-guide`（运动前准备）

---

## 5. 内链矩阵（全簇）

| 从 → 到 | 锚文本 | 位置 |
|---------|--------|------|
| 支柱 → aftercare-products | best tattoo aftercare products | "Products" H2 |
| 支柱 → aftercare-issues | infection vs normal healing | "When it goes wrong" H2 |
| 支柱 → aftercare-color-tattoo | color tattoo aftercare | "By type" H2 |
| 支柱 → aftercare-second-skin | second skin aftercare | "First 48h" H2 |
| 支柱 → aftercare-timeline | day-by-day healing timeline | "By day" H2 |
| 支柱 → aftercare-activities | swimming and gym after a tattoo | "Activities" 旁 |
| 每 spoke → 支柱 | tattoo aftercare guide | 开头/结尾回链 |
| products → second-skin | second skin | 相关段落 |
| products → 支柱#sensitive-skin | sensitive skin | 相关段落 |
| issues → 待建 problems 页 | tattoo problems & fixes | 危机处理段 |
| color-tattoo → color 簇支柱 | color tattoo guide | "dark skin" 段 |
| timeline → color-tattoo | color healing stages | "by type" 段 |
| activities → 待建 prep 页 | before-you-go prep | 运动前段 |
| **支柱 → /blog（博客枢纽）** | all tattoo aftercare guides | header/footer + "相关阅读" |
| **支柱 → /（首页）** | InkFlow | header logo + footer |
| 每 spoke → /blog（向上链，经模板） | blog | header/footer 全站导航 |

> **向上链说明**：`支柱 → /blog` 与 `支柱 → /` 由站点模板（header 全站导航 + footer + BreadcrumbList）自动保证，写页套模板即带；此处显式列出以防漏链。spoke 经 pillar 间接归属全站。
> 跨簇链接（color / problems / prep）等对应簇 Brief 产出后再回填，避免断链。

---

## 6. 下一步

1. **你审本 Brief**：重点看 ① 独家角度是否成立 ② 作者/审核者占位是否替换 ③ 产品 CTA 与 InkFlow 实际功能是否吻合。
2. 确认后我按 Brief 逐页写正文（先支柱，再 6 spoke），并注入 Meta/Title/H1/Schema/内链。
3. 写完后跑一遍品牌语气自检（Component 1–4，目标 8+/10）与 E-E-A-T 校验。
4. 本簇跑通后，复制流程到 aftercare 同级 Tier 1 簇（ideas / color / cost）。
