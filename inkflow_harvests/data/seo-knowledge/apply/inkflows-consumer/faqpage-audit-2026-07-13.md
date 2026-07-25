# FAQPage 结构化数据审计报告 — 2026-07-13

## 一、盘点结论（回应"36 用组件 / 8 内联"）

| 机制 | 数量 | 说明 |
|---|---|---|
| `<FAQSchema>` 组件（标准做法） | 37 个页面 | 含 blog/features/free-tools/compare 部分页 + meaning/index、category、symbol 页（symbol 为上一轮新增） |
| 内联 `<script>FAQPage</script>` | 8 个对比页 | best-tattoo-studio-software、booksy、best-tattoo-waiver-app、mindbody、tattoogenda、tattoo-studio-pro、square-appointments、vagaro |
| 合计覆盖 | 45 个页面 | 全站 FAQPage 已无"整页缺失"缺口（symbol 页已补） |

> 注：用户说的"36"是补 symbol 页之前的数；补完后为 37。两类机制并存是事实（"有的是 FAQSchema，有的是别的 Schema"）。

## 二、发现的问题（已全部修复）

### Bug 1 — 重复 FAQPage（3 页）
`best-tattoo-waiver-app` / `mindbody` / `square-appointments` 同时出现：
- 一个**空**的内联 `<script>FAQPage`（`"mainEntity": []`）
- 一个 `<FAQSchema>` 组件（含 4 条真实 Q&A）

→ 同一页输出两份 FAQPage，且一份为空，易致 Google 取错/忽略。
**修复**：删除空内联块，保留组件（组件内容真实有效）。

### Bug 2 — 空 FAQPage 但页面有可见 FAQ（4 页）
`best-tattoo-studio-software` / `tattoogenda` / `tattoo-studio-pro` / `vagaro` 内联 FAQPage 为 `"mainEntity": []`，但页面本身有可见 `<details>` FAQ 区块。Schema 与页面内容完全不对应（正是用户强调的"要对应页面内容"）。
**修复**：用页面可见 FAQ 的**原文**逐条填充 schema，1:1 对应（3/4/4/5 条）。

### Bug 3 — symbol 页 FAQ 无可见区块（上一轮缺口的收尾）
上一轮给 symbol 页加了 `<FAQSchema>`（内容从真实字段派生，无编造），但页面没有对应的可见 Q&A，schema 与可见内容对不齐。
**修复**：新增可见 "Frequently Asked Questions" 区块，与 schema 字段 1:1 渲染（`symbolFaqs`）。

## 三、修复后状态
- ✅ 全站 **0 个**空 FAQPage（`grep "mainEntity": []` = 0）
- ✅ 全站 **0 个**重复 FAQPage
- ✅ 每个 FAQPage 均对应页面可见内容
- ⚠️ 仍存在的**架构差异（非 bug，可选统一）**：对比页中 `booksy` + 上述 4 页用内联 `<script>`，其余 37 页用 `<FAQSchema>` 组件。建议后续把对比页也统一改为组件法，消除"双机制"维护负担。

## 四、改动文件清单
- `src/pages/meaning/[symbol].astro` — 新增可见 FAQ 区块（镜像 FAQSchema）
- `src/pages/compare/best-tattoo-waiver-app.astro` — 删除空内联 FAQPage
- `src/pages/compare/mindbody.astro` — 删除空内联 FAQPage
- `src/pages/compare/square-appointments.astro` — 删除空内联 FAQPage
- `src/pages/compare/best-tattoo-studio-software.astro` — 填充 FAQPage（3 条）
- `src/pages/compare/tattoogenda.astro` — 填充 FAQPage（4 条）
- `src/pages/compare/tattoo-studio-pro.astro` — 填充 FAQPage（4 条）
- `src/pages/compare/vagaro.astro` — 填充 FAQPage（5 条）
- `booksy.astro` — 已正确（内联但已填充且对应），未改动
