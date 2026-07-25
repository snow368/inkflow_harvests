# 来源 072 · TanTan《每日SEO 206：你做的 FAQ，有一半从一开始就选错了方向》

> **来源性质**：微信公众号文章摄取（mp.weixin.qq.com/s/XvQGO4kVuH3Gzaume8mLbQ，2026-07-16 用户提供）。
> **可信度**：SELF-REPORTED（作者 TanTan 为独立站 B2B SEO 实战派，亦被本项目 `site-type-workflow-ruleset.md` 引用；内容未独立审计，但原则与本项目 v2 实测规则不冲突，已升级为自有规则）。
> **用途**：补强「FAQ 怎么写 / 问题从哪来」这一层——本项目自有规则早有"真实问题 + FAQPage schema"，但缺"真实问题去哪捞"的采集法和"答案长度/PAA"写法细节。

---

## 一、两类 FAQ（形态决定放法）

| 类型 | 何时建 | 判定标准 | 本项目对应 |
|---|---|---|---|
| **独立 FAQ 页** | 有人真的搜这个主题（如 "X 是什么" / "X 合法吗"） | 有独立搜索量才建 | 不建泛用 `/faq` 页（除非有真实搜索需求） |
| **产品/分类页 FAQ 模块** | 零搜索量也该有 | 处理**购买顾虑**，不处理参数 | 我们所有 compare/features 页的页尾 FAQ 模块 ✅ 正确 |

> ❌ **不要**为 SEO 硬建一个泛用 `/faq` 页塞一堆没人搜的问题。

## 二、最致命的错误：全站复制同一套 FAQ

- 不同产品页贴**完全相同**的 FAQ → 重复内容，触发整站质量扣分。
- ✅ 每条 FAQ 必须**按该页主题专属**写（我们的 compare 6 页 + features 5 页已核：全部专属、无复制）。

## 三、答案写法（喂 AI Overview 引用）

- **首句直接给答案**（BLUF），不铺垫。
- **长度 ≤100 字**（原文：太长模型会砍，AI Overview 直接抽首句）。
- 保留 `FAQPage` JSON-LD（Google 2026-05 取消富摘要展示，但 Bing 仍显 + 助 AI 引用）。

## 四、问题来源（核心红线）

- 问题必须来自**真实客户疑问**：客服记录 / 销售询盘 / 评论区 / Reddit / G2 / Capterra 提问区。
- ❌ 不能用"感觉用户会问"的模板/营销话术拼问题。
- 采集法：竞品评论区 + 社群（Reddit / Facebook 纹身师群）+ 自家工单/销售笔记。

## 五、进 PAA 盒子（可选优化）

- 可见 FAQ 的**问题用 H3 包** → 更容易进 Google "People Also Ask" 盒子，承接长尾。
- JSON-LD 已覆盖结构，H3 是额外增益。

---

> **与本项目的冲突/补强结论**：不冲突、是补强。本项目 `content-matrix.md` / `seo-dimension-catalog.md` / `page-content-checklist.md` 早有"真实问题 + 3-5 个 + FAQPage schema"，TanTan 补的是**采集法**（去哪捞真实问题）+ **答案≤100字/H3进PAA** 写法细节。已合并进 `framework/faq-writing-standard.md`（权威标准）。
