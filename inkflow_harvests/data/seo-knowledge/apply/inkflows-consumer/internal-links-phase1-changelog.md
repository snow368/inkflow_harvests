# Phase 1 — Internal Links (Related Tools) 落地记录

**Date:** 2026-07-12
**Source blueprint:** `inkflow-site-architecture-blueprint.md` (from OneLegchris site-structure thread)
**Status:** ✅ Implemented

## 改了什么

| 文件 | 改动 |
|---|---|
| `src/data/tattoo-category-content.ts` | 新增 `RelatedLink` 接口 + `CategoryPageContent.relatedTools?` 字段 + `CATEGORY_RELATED_TOOLS` 映射（15 类各 3 条）；新增 `CategoryPageContent.relatedCategories?` + `CATEGORY_RELATED_CATEGORIES` 映射（15 类各 3 条跨类别） |
| `src/data/tattoo-meanings.ts` | `TattooMeaning` 接口新增可选 `relatedTools?` 字段（逐 symbol 覆盖用） |
| `src/pages/meaning/category/[category].astro` | import `CATEGORY_RELATED_TOOLS`/`CATEGORY_RELATED_CATEGORIES`；计算 `relatedTools` + `relatedCategories`；在 symbol grid 之后渲染「Explore Related Categories」区块（3 卡片/类），其后渲染「Related Tools & Resources」区块 |
| `src/pages/meaning/[symbol].astro` | 计算 `relatedTools`（默认 2 个免费工具）；在 Related Meanings 之后、CTA 之前渲染「Related Tools」区块（2 卡片/符号） |

## 内部链接新增数量

| 区块 | 每页条数 | 页数 | 小计 |
|---|---|---|---|
| Category → Related Tools | 3 | 15 | **45** |
| Symbol → Related Tools（默认 meaning-finder + price-calculator）| 2 | 70 | **140** |
| Category → Related Categories（跨类别，topic-cluster）| 3 | 15 | **45** |
| **合计** | | | **230** |

链接目标（真实存在的路由，已据 `src/pages` 核对）：
- `/free-tools/tattoo-meaning-finder` — 与含义内容强相关，所有页都链
- `/free-tools/tattoo-price-calculator` — 所有页都链
- 每类第 3 条：按主题轮换 `/features/tattoo-booking-software` · `/features/tattoo-ink-passport` · `/features/tattoo-booking-page`

直接解决了 `kb-item-inventory.md` 的 **gap #3（meaning→产品内链=0）** 与 **gap #8（分类间互链缺失）**。

## 验证

- `tsc --noEmit` 对两个数据文件 = 0 errors ✅
- `npm run build`（本地，沙箱会拦截 dist/）应产出 158 页，本次仅新增渲染区块、不改路由，预期 0 error
- 上线后用 GSC 链接报告核对：15 个 category 页应各收到 +3 内链，70 个 symbol 页各 +2

## 还没做的（蓝图 Phase 1 余下部分）

- **工具页 → 2 条产品内链**（6 工具 × 2 = 12 条）：属 off-page/link-magnet 分发，未做。可在各 `/free-tools/*.astro` 加产品内链区块。
- **70 个 symbol 的逐条 `relatedTools` 覆盖**：目前用全局默认 2 条；高价值符号（wolf/lion/dragon/phoenix 等）可后续加 `relatedTools` 指向更具体的功能页（如 `tattoo-ink-passport`）。

> Phase 1 的 #1 #2 #4 已完成（共 230 条内链），仅 #3（工具页外链 ~12 条）待做。

## 下一步建议

1. 本地 `npm run build` 确认 0 error 后部署（`wrangler pages deploy dist --project-name ink-flow`）。
2. 落实 **分类间互链**（一顿饭功夫，加一个字段 + 模板区块，再 +45 条）。
3. 回到待定旧项：E-E-A-T 来源升级（Wikipedia→Smithsonian/IBISWorld/Jung）、11 个薄页面扩到 2000+ 词。
