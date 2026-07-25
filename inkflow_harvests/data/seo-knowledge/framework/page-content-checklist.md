# 页面内容验收清单（Page Content Checklist）

> **用途**：InkFlow 每个营销页上线/重写前的**硬验收单**。把哥飞（Gefei）三个工具的方法论
> （`seo.web.cafe/serp/` 排名解密、`/audit/` On-Page 体检、`/review/` 页面军师）与本项目
> `framework/serp-top10-rules.md` 的 R/L/V 规则合并成一份可逐项勾选的清单。
> 原则：宁缺毋滥，只列可操作、对排名有直接影响的项目。

---

## 〇、哥飞三工具怎么用（外部数据，本地引擎覆盖不了的部分）

本环境无浏览器自动化，无法直接点击 web.cafe 网页 UI。分两层用：

**A. 本地引擎（已建，跑源码，覆盖 /audit/ + /review/ 的页面侧）**
- 脚本：`C:/Users/snow3/WorkBuddy/2026-07-12-11-40-44/.workbuddy/scratch/audit_pages.py`
- 跑法：`python audit_pages.py` → 输出 `audit_report.md`（53 页分数矩阵 + 聚合缺口）
- 覆盖：TDK / H1 / 词数 / 聚焦度 / 内链 / Schema / 对比表 / FAQ / 价格 / Best-for / Pros-Cons / 评分 / Capterra-G2 / 客户 quote / P0P1P2
- 比去审计 ink-flows.com 的 SPA 壳更准（源码即真相）

**B. 网页工具（手动跑，覆盖域名侧 + 真实 SERP 排位，本地拿不到）**
- `seo.web.cafe/serp/`：输入商业词（best tattoo booking software / tattoo waiver app / tattoo appointment scheduling / tattoo studio management software）→ 看 TOP10 域名侧(DR/流量) + 页面侧(on-page 分) → 找「页面派」可学对象 + 薄弱占位。**1 积分/次，游客 10/天**。
- `seo.web.cafe/audit/`：**Astro 部署后**用真实 URL（非 SPA）输入 URL+目标词 → 0-100 分 + 聚焦度 + 密度榜；多页对比模式放竞品。**1 积分/页**。
- `seo.web.cafe/review/`：**部署后**输入页 URL → 自动推断词 + 域名底子 + 真实排位 → P0/P1/P2。**2 积分/页**。
- ⚠️ 当前 ink-flows.com 返 React SPA，audit/review 会判 CSR 空壳 → **须先解决 Astro 部署**才能用 B 层验自己页。

---

## 一、所有页面通用验收（来自 /audit/ 7 大类）

| # | 项目 | 标准 | 工具对应 |
|---|---|---|---|
| 1 | Title | 存在且 ≤60 字符，含主词 | Meta |
| 2 | Description | 50–160 字符，含主词+价值点 | Meta |
| 3 | H1 | 唯一、含主词、≤60 字符 | 标题 |
| 4 | 正文词数（按类型） | **money/compare 竞争页 1200–1800**（哥飞竞争型 money 页标准）；blog/tool/support 页 400–900 聚焦词即可 | 内容量 |
| 5 | 关键词聚焦度 | 主词在 Title/H1/URL/开头100词覆盖 + 密度 0.5–3% | 聚焦度（哥飞封顶逻辑：<55% 总分封顶 65） |
| 6 | FAQ + FAQPage | 3–5 个真实问答 + JSON-LD（权威标准见 `framework/faq-writing-standard.md`） | 内容/AEO |
| 7 | 具名 Person 作者 | `author="Jake Davis"` 级真人，非 "InkFlow Team" | E-E-A-T（**当前 100% 缺失**） |
| 8 | 内链 ≥3 | 非孤岛；BOFU 页链向相关功能/对比/工具 | 链接 |
| 9 | Schema 正确 | 功能/对比=SoftwareApplication+FAQPage；博客=Article+Person；首页=Organization | 结构化 |
| 10 | OG/Twitter | SEOHead 组件层已统一注入（不重复查） | 社交 |
| 11 | 写作文风过检 | 无 AI 套话、段落 2–4 句、句长多变、BLUF（详见第六节） | 文风（新增，来自 seo.md 合并） |

---

## 二、按页面类型的专项验收

### 对比页 / 替代品页（形态 A · 榜单词 · 规则集 L1–L8）
> 单厂商几乎排不进这类词前 10（被榜单站统治），所以本类页定位=**进榜单站 + 吃长尾 + 承接品牌词**。页面本身要经得起「如果排进去」的标准。

- [ ] 可扫读对比表（功能 × 竞品矩阵）✅ 已具备
- [ ] **每个竞品量化评分 /10**（L2）— 当前 10/10 缺失
- [ ] **每个竞品 "Best for [场景]" 标签**（L3）— 当前仅 3 页缺，其他有"TOP PICK"近似
- [ ] **Pros / Cons 双向评价**（L4）— 当前 10/10 缺失
- [ ] 价格起价露出（L5，可与 V1 合并）
- [ ] **编辑方法论 + 具名作者/编辑/事实核查**（L6）— 当前全站匿名，缺失
- [ ] ⚠️ **不放客户 quote 到榜单式页**（L7 反向规则：榜单页信任机制=编辑方法论，不是客户 quote；quote 留给厂商页 V3）
- [ ] CTA 明确（L8）✅ 已具备
- [ ] 🚨 **Capterra/G2 徽章/引用是厂商页 V5 专属，对比页不放**（v2 已证伪 v1"对比页引 Capterra"；对比页信任层=编辑方法论 L6，非第三方聚合评分）

### 功能页 / 产品页（形态 B · 交易词 · 规则集 V1–V6）
> 这类词（tattoo waiver app / booking app for artists）头部是厂商页，InkFlow 可正面竞争。

- [ ] **价格 / 起价露出**（V6）— 当前 17 个非对比页缺失
- [ ] 高频功能词组覆盖（deposit / waiver / portfolio / commission / no-show / SMS）✅ 多数已覆盖
- [ ] **真实客户 quote（姓名 + 店名）**（V5）— 当前全站缺失
- [ ] **Capterra / G2 徽章或引用**（V4）— 当前全站缺失（需真实账号）
- [ ] 当页承接需求（免费工具页必须有交互，非纯跳转落地页）✅ 工具页已做
- [ ] CTA ✅

> 🚨 **扩写范围铁律（回应「竞对2000字你400字怎么排」）**
> - **只有 Form B 厂商页才需要追竞品深度（~1700–1900 词）**：`digital-tattoo-waiver`(66词 vs WaiverKit/Wavrr ~1900)、`online-tattoo-booking`(80词 vs TattMe/Porter ~1700)、`features/tattoo-waiver-software`(1270→1900) 等。这些词 SERP 是厂商页，我们能正面打。
> - **Form A `compare/best-*` 和 `alternatives/*` 页不追 2000 词**：这些词（best tattoo studio software）被榜单站统治，单厂商扩到 2000 也排不进前 10（SERP 研究已证伪）。它们定位=**outreach 进榜单站 + 承接长尾/品牌词**，页面达标即可，不必 head-to-head 扩写。
> - **实际 head-to-head 扩写工作量 ≈ 3 个全写（66/80/246词页）+ 几个补 200–600 词 ≈ 1–1.5 万字，几周可完**，绝非「53 页全写 2000 字 = 一年」。
> - 审计脚本 `audit_pages.py` 已按此区分深度目标（money/compare=1200-1800，其他=400-900），报告的「形态B 头对头竞争页」表量化了每个页的竞品缺口。

### 博客页（信息词）
- [ ] Article schema + Person 作者 + 发布/更新日期
- [ ] 词数 ≥1000（当前多数达标，blog/topic/aftercare 仅 219 词偏薄）
- [ ] ≥4 内链回功能/工具/对比页

### 免费工具页（形态 B · 当页承接）
- [ ] 真实交互元素（输入/计算/生成）当页完成，非 "Try Now" 跳转
- [ ] FAQ + CTA 到注册

---

## 三、P0 / P1 / P2 优先级（来自 /review/）

- **P0 致命**（不解决其他优化都打折）：无 H1 / 词数<400 近空壳 / CSR 空壳 / 无目标词
- **P1 重要**：无具名 Person 作者 / 缺 FAQ / 孤岛页(0 内链) / 内链<3 / 词数 400–800 / 站内自相竞争
- **P2 提升**：对比页缺评分/Best-for/Pros-Cons/编辑方法论具名（L6）/ 非对比页缺价格（V1）

---

## 四、当前审计发现的系统性缺口（53 页实测，2026-07-14）

| 缺口 | 占比 | 优先级 | 说明 |
|---|---|---|---|
| 缺具名 Person 作者 | 53/53 (100%) | **P1** | 全站用 "InkFlow Team"，E-E-A-T 头号债 |
| 对比/替代品页缺评分/10 | 10/53 (19%) | P2 | 10 个对比页全缺（L2） |
| 对比页缺 Pros/Cons | 10/53 (19%) | P2 | 同上（L4） |
| 对比页缺 Best-for 标签 | 10/53 (19%) | P2 | 同上（L3） |
| 对比页缺编辑方法论具名 | 10/53 (19%) | P2 | 同上（L6，全站匿名） |
| 非对比页缺价格露出 | 17/53 (32%) | P2 | 多为 features/free-tools（V1） |
| 内链<3 | 15/53 (28%) | P1 | compare/best-tattoo-studio-software 竟 0 内链 |
| 词数<400 薄页 | 17/53 (32%) | P0/P1 | digital-tattoo-waiver(66)/online-tattoo-booking(80)/find-artist(78) 近空壳 |
| 缺 FAQ/FAQPage | 10/53 (19%) | P1 | 多为 utility/index 页 |

**执行顺序建议**：先补 P0 近空壳页（写满内容）→ 再全站加具名 Person 作者（E-E-A-T）→ 再修内链网（对比页至少 3 内链）→ 最后按 L/V 补对比页信任层（评分/Best-for/Pros-Cons/编辑方法论具名，须真实数据，严禁编造；**客户 quote/Capterra 仅厂商页 V3/V5，对比页不塞**，见 L7 反向规则）。

---

## 五、写作文风标准（Anti-AI-Cliché Writing Standard）

> **来源**：合并自通用 SEO 写作 Agent 规范 `G:/seo.md`（2026-07-17）。
> **定位**：本节是**文风层**，与前面的 L/V **结构/信任层**正交——L/V 管「页面有没有评分/Best-for/quote/schema」，本节管「文字读起来像不像真人写的」。两者都要过。
> **合并裁定**：seo.md 在「反 AI 腔写作」上比我们旧 KB 更细，全量采纳；但 seo.md 有两条**与本项目技术栈冲突**，不采纳（见 5.4）。

### 5.1 段落与句式（硬标准）
- [ ] 段落 **2–4 句**，屏幕上不超过 4–5 视觉行；允许单句成段制造节奏。
- [ ] 句长多变：短句冲击（4–6 词）+ 中句解释（12–15 词）混排；**禁**通篇学术长句、多重从句。
- [ ] 对话式但专业；利益/结果导向（"You get…" / "Your studio…"），非功能罗列。
- [ ] 句式**不重复**：禁止连续段落都用同一开头（如全部 "InkFlow lets you…" / "Our team…"）。

### 5.2 禁用 AI 套话清单（写完必查，命中即改）
**禁用短语**（英文页硬禁；除非确有语境）：
- "In today's digital landscape…" / "In the world of…"
- "Let's dive in / dive into…"
- "In conclusion…"
- 滥用 "Moreover," / "Furthermore," / "Additionally,"
- "It's worth noting that…"
- "At the end of the day…"（除非真口语）
- "Game-changer" / "revolutionary"（除非实至名归）
- "Unlock the power of…" / "Elevate your…" / "Seamlessly integrate…"

**禁用格式习惯**：
- 冒号后接列表的滥用；把 bullet 当正文主体（该用段落就用段落）。
- **em-dash（—）/ en-dash（–）滥用**（⚠️ 本项目页面里多处在用 `—`，见 5.3 审计）。
- 每段都用机械过渡词开头；段末重述刚说过的话的"总结句"。
- 反复 3+ 形容词堆名词；关键词堆砌。

### 5.3 落地到 InkFlow 的注意点
- 现有页面正文里 em-dash（`—`）用得不少（Hero/verdict 区常见）。**改文案时顺手把滥用的 `—` 换成句号或逗号**，保留确有必要的。
- BLUF 与 FAQ 指导（第六节 F 及 TanTan 206）一致：**每段/每答首句先给结论**，符合 AEO 引用。
- 8–10 年级可读性；术语（autoclave/BAC 合规等）该用就用，但句子要短。

### 5.4 seo.md 里**不采纳**的两条（与技术栈冲突，用我们的）
| seo.md 主张 | 冲突点 | 裁定 |
|---|---|---|
| **单文件输出**（一次只写一个文件，含 meta 在顶部） | 我们是多文件 Astro（页面 + 组件 + schema 分离） | ❌ 不采纳，保留多文件结构 |
| **纯语义 HTML，禁 `<div>/<section>/class/style`** | Astro + Tailwind 组件必须用 div/section/class | ⚠️ 仅适用于「起草裸文案草稿」；写进 `.astro` 页面时用我们的组件化写法 |

### 5.5 与我们框架**不冲突、我们更先进**的部分（seo.md 未覆盖，保留我们的）
- L/V 页型分型、L6 编辑方法论具名、V3 真实客户 quote / V5 Capterra 徽章、"真实数据禁编造"——seo.md 完全没有这层，**以本文件 + `serp-top10-rules.md` v2 为准**。

---

## 六、已知局限（诚实标注）
- 本地引擎聚焦度用 slug 派生主词，是近似（哥飞工具用真实抓取+分词）；focus=0 的博客/首页多为「派生词≠实际主题」 artifacts，非真问题，以布尔缺口为准。
- 评分/客户 quote/Capterra 引用须**真实数据**，伪造会触发 Google 人工惩罚，宁可空缺不编。
- SERP 排位、Ahrefs DR、真实流量等域名侧数据只能靠 web.cafe 工具手动跑（见〇-B）。
