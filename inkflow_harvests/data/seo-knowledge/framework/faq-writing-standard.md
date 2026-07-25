# FAQ 写作权威标准（FAQ Writing Standard）

> **定位**：本项目 FAQ 的**唯一权威标准**。合并自 6 处分散规则 + 2 个新来源，消除内部冲突。
> **合并来源**：`content-matrix.md`(L48/62) · `seo-dimension-catalog.md`(L62/101) · `page-content-checklist.md`(§1#6/§5) · `seo-geo-writing-standard.md`(§四) · `site-type-workflow-ruleset.md`(L74-76) · `aeo.md`(L110-133/307) · 新来源 `sources/072-tantan-faq-206.md`(TanTan 206) · 新来源 `G:/seo.md`(反AI腔文风)。
> **冲突裁定记录**：见 `decisions/conflict-log.md` 冲突 7。

---

## 一、两类 FAQ（形态决定放法，来自 TanTan 206）

| 类型 | 何时建 | 本项目做法 |
|---|---|---|
| **独立 FAQ 页** | 有人真的搜这个主题（"X 是什么" / "waiver 合法吗"）才有独立搜索量才建 | ❌ **不建**泛用 `/faq` 页（除非有真实搜索需求验证） |
| **产品/分类页 FAQ 模块** | 零搜索量也该有，处理**购买顾虑** | ✅ compare/features 页尾 `<details>` FAQ 模块（正确） |

## 二、必备结构（双交付）

- [ ] **可见 FAQ 块**：置于页尾、CTA 之前。问题用 **H3** 包（进 PAA 盒子增益，TanTan 206）。
- [ ] **FAQPage JSON-LD**：`mainEntity` 数组，每项 Question+AnswerText，与可见 FAQ **一一对应、内容一致**（Google 2026-05 取消富摘要展示，但 Bing 仍显 + 喂 AI 引用）。
- [ ] **不跨页复制**：每条 FAQ 按该页主题专属（致命错：全站贴同一套 → 整站质量扣分）。已核 compare 6 页 + features 5 页全部专属 ✅。

## 三、问题来源（核心红线）

> **原则**：问题必须来自**真实客户疑问**，不是"感觉用户会问"的模板/营销话术。

**采集优先级（真实度从高到低）**：
1. 自家客服/工单/销售询盘记录（最权威，需用户提供）
2. 竞品评论区：G2 / Capterra / App 商店提问区
3. 社群：Reddit（r/tattoo、r/tattooartists）/ Facebook 纹身师群
4. GSC "People Also Ask" + 相关搜索

> ⚠️ 当前 11 页 FAQ 为**推理假设版**（合规合理但未经验证）。待用户提供真实客服/销售记录，或抓竞品评论区后，替换为"真实来源"版（答案仍按我们功能事实写，不编造）。

## 四、数量与长度（冲突裁定）

| 维度 | 旧规则冲突 | **裁定（取更细/更先进）** |
|---|---|---|
| **数量** | dimension-catalog/checklist：**3-5 个**；aeo.md：**≥5 / 8-12 问** | **基线 3-5 个**（常规页）；pillar/综合页可扩到 **5-8**；aeo 的 8-12 仅用于极少数综合支柱页，非常规。 |
| **答案长度** | dimension-catalog：A=**40-60 字**；aeo：FAQ 每答 **<300 字**、甜点 134-167 字 | **首句 BLUF 直接答案**（甜点区 40-60 字，AI 可引用 optimum）；**整答上限 <300 字**（aeo 红线）。两者不矛盾：40-60 字是"可被引用甜点"，<300 是"绝不超限"。 |

## 五、写法（与文风标准正交但一致）

- **BLUF**：每段/每答首句直接给结论，不铺垫（"In today's world…" 类开篇禁用，见 `page-content-checklist.md` §5）。
- **答案结构**：首句给结论 → 1 句支撑（可选数据/场景）→ 止。≤100 字最佳（TanTan），≤300 字封顶。
- **问题句式**：含主词的自然语言问句（"Is Booksy good for tattoo studios?" 非 "Our advantages?"）。
- **FAQ = 处理顾虑**：Q 写买家顾虑（贵? 合法? 复杂?），A 写保障（免费起 / 合法合规 / 5 分钟上手），来自 `site-type-workflow-ruleset.md`。

## 六、页型套用

| 页型 | 规则集 | FAQ 要求 |
|---|---|---|
| `compare/*` `best-*` `alternatives/*`（形态 A） | L1–L8 | FAQ 模块必备（L 系列兜底 AEO）；问题针对该竞品（如 "How much does Vagaro cost?"） |
| `features/*` 产品/业务词页（形态 B） | V1–V6 | FAQ 模块必备；问题针对该功能（如 "Can I track autoclave logs?"） |

> FAQ 是两形态**通用 AEO 标配**（已实测：bookedin / Wavrr 等均有 FAQ 区块）。

## 七、上线验收勾选

- [ ] 可见 FAQ 块存在（H3 包问题，页尾 CTA 前）
- [ ] FAQPage JSON-LD 存在且与可见 FAQ 一致
- [ ] 3-5 个（pillar 5-8），无跨页复制
- [ ] 每个问题来自真实来源（或标注"假设版待补真实数据"）
- [ ] 每答首句 BLUF，≤300 字，甜点 40-60 字
- [ ] 文风过检（`page-content-checklist.md` §5，无 AI 套话）

## 八、迭代记录

- 2026-07-17：新建本标准，合并 6 处分散 FAQ 规则 + TanTan 206 + seo.md 文风；裁定数量/长度冲突（冲突 7）。
