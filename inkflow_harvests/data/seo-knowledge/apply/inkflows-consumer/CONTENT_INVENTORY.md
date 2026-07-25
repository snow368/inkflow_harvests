# InkFlow 内容清单与每日写作计划 (Content Inventory & Daily Plan)

> 最后更新：2026-07-16 ｜ 维护分支：`main`（生产）｜ 本地路径：`marketing/src/...`
> 用途：单一真相源。列出 every 内容簇的「已完成 / 待写 / 待审改」状态，并拆成**每天按部就班**的任务（写 → 审核 → 修改 → 提交 main）。
> 配套规范：`INKFLOW-CONTENT-PLAYBOOK.md`（写作）、`INKFLOW-SEO-EEAT-PLAN.md`（E-E-A-T）、`aftercare-cluster-brief.md`（aftercare 样例 brief）。

---

## 一、已完成并上线（main，已部署，勿重复写）

### Cluster A — Aftercare（纹身 aftercare 簇）✅ 内容已上线
| 页面 | slug | 状态 | 待补 |
|------|------|------|------|
| 支柱 | `/blog/tattoo-aftercare-guide` | 已写·已部署 | E-E-A-T 作者未填（占位） |
| Hub | `/blog/topic/aftercare` | 已写·已部署 | 漏链 6 个 spoke（见 Day 2） |
| 6 spoke | `/blog/aftercare-{products,issues,color-tattoo,second-skin,timeline,activities}` | 已写·已部署 | E-E-A-T 作者未填；2 处内容待修 |

- 实际产出 = 7 页（brief 原规划 1 支柱 + 6 spoke；黑灰/敏感肌 2 薄页已并入支柱小节）。
- **审计结论（2026-07-16）**：内容齐全，但 4 处待补 + 全簇 E-E-A-T 未做。

### Cluster B — B5 Website Builder（纹身店建站簇）✅ 内容已上线 + E-E-A-T 已做
| 页面 | slug | 状态 |
|------|------|------|
| 支柱 | `/features/free-tattoo-website` | 已写·已部署·Sarah Chen ✅ |
| Hub | `/blog/topic/website-builder` | 已写·已部署·Sarah Chen ✅ |
| P0 站型×3 | `/features/{tattoo-artist-website,tattoo-studio-website,tattoo-portfolio-website}` | 已写·已部署·Sarah Chen ✅ |
| P0 选型×2 | `/alternatives/best-tattoo-website-builders` + `/features/tattoo-website-builder` | 已写·已部署·Sarah Chen ✅ |
| P1 教程×3 | `/blog/{how-to-make-a-tattoo-website,tattoo-website-design-ideas,tattoo-portfolio-website-examples}` | 已写·已部署·Sarah Chen ✅ |

- 部署提交：`a1694fc`（9 页 porting + blog 双分区）。
- **待补（P2，新建）**：`/templates`、`/features/tattoo-ai-design-generator`（见 Day 5–6）。

### 其他已上线（非簇，单页）
- 5 篇老 blog（`tattoo-aftercare-automation`、`tattoo-aftercare-email-automation`、`tattoo-inventory-guide`、`multi-artist-commission-tracking`、`reduce-no-shows-deposit-booking`）：作者已改 Sarah Chen ✅
- meaning/category 程序化簇 300+ 页：作者已统一 Sarah Chen ✅

---

## 二、需要写 / 改的清单（按优先级）

### 🔴 P0 — 审核修改（已有页上改，不新建）
| # | 任务 | 范围 | 说明 |
|---|------|------|------|
| 1 | Aftercare 全簇 E-E-A-T 补做 | 7 页 | 当前 7 页**均无作者署名**（brief 留占位）。需注入 Sarah Chen 作者段 + `@graph` JSON-LD（author/reviewedBy Person + 2 真实引用 + datePublished/dateModified）。这是「审核修改」最大缺口。 |
| 2 | Aftercare hub 补链 6 spoke | `blog/topic/aftercare.astro` | hub 当前只链支柱 + 2 blog + free tool + feature，漏链 6 个 spoke，破坏 Hub-and-Spoke 闭环。 |
| 3 | Aftercare 支柱补 aftercare-activities 内链 | `blog/tattoo-aftercare-guide.astro` | pillar 未回链 aftercare-activities spoke。 |
| 4 | second-skin 补署名 | `blog/aftercare-second-skin.astro` | 该页完全无 byline（审计发现）。 |
| 5 | color-tattoo 修悬空引用 | `blog/aftercare-color-tattoo.astro` | 有 "color guide (coming soon)" 悬空链接，需落地或删除。 |

### 🟠 P1 — 新建页（B5 P2）
| # | 任务 | slug | 类型 |
|---|------|------|------|
| 6 | 模板套用下载型页 | `/templates` | P2 交易页（artist/shop/studio 模板库 + 一键套用） |
| 7 | AI 设计生成器页 | `/features/tattoo-ai-design-generator` | P2 观察位（AI/生成器词簇） |

### 🟡 P2 — 文档恢复（支撑「审核依据」不白写）
| # | 任务 | 说明 |
|---|------|------|
| 8 | 重建 B5 brief | `b5-website-builder-cluster-brief.md` 在当前仓库**确实已丢失**（git 历史里也无，仅记忆中有 5 子主题 11 页结构），需从记忆重建并存入 `marketing/seo-targets/briefs/`。 |
| 9 | 重建 B5 关键词研究文档 | `inkflow-kw-tattoo-website.md` **确缺失**（git 历史无）。但通用长尾数据已找回（见下）→ 可据 `page_plan.csv` / `kd_queue.csv` 中 B5 相关词重建。 |

> ✅ **2026-07-16 16:40 更正（重要）**：此前误判「长尾地图已丢失」。**长尾地图实际完整保存在 `main` 历史**，工作区只是处于未提交删除状态。已执行 `git checkout HEAD -- marketing/scripts marketing/seo-targets` 一键恢复：
> - `marketing/seo-targets/longtail_matrix.csv`（**5652 个真实长尾词，16 集群**，Google Suggest 真实下拉）+ `longtail_matrix.md` + `longtail_matrix.keywords.json` ✅ 完整恢复
> - `marketing/scripts/mine_longtail.py` / `kd_score.py` / `build_kd_queue.py` ✅ 恢复
> - `page_plan.csv` / `kd_queue.csv` / `page_plan.md` ✅ 恢复
> 即：**长尾地图与挖词/KD 资产均未丢失，无需重挖**；仅 B5 brief 与 B5 关键词研究文档（#8/#9）真正缺失，需重建。

### ⚪ 未来簇（依已恢复的长尾地图规划）
- 长尾地图（`longtail_matrix.csv`，5652 词 / 16 集群）已恢复，可直接枚举未来簇（tattoo booking / waiver / inventory / CRM 等）。恢复地图后拆 Day 任务。

---

## 三、每日按部就班计划

> 每日节奏：**写（或改）→ 审核（过 E-E-A-T 清单）→ 修改 → 本地 build 验证 → 提交 push main**。
> 每天只做 1 个 Day，做完再开下一个，避免半成品堆积。

### Week 1 — Aftercare 收尾（审核修改为主）
- **Day 1** ｜ #1 Aftercare E-E-A-T 批量注入
  - 给 7 页加 Sarah Chen 作者段 + `@graph` JSON-LD（复用 B5 页格式）。
  - 审核：每页有具名作者 + 审核人 + ≥2 可点击真实引用 + 发布/修改日期。
- **Day 2** ｜ #2 + #3 Aftercare 内链闭环
  - hub 补链 6 spoke；支柱补 aftercare-activities 回链。
  - 审核：每 spoke 回链 pillar / hub；URL ≤ 3 层；锚文本用词自然。
- **Day 3** ｜ #4 + #5 Aftercare 内容修复
  - second-skin 补 byline；color-tattoo 处理悬空 "coming soon" 引用。
  - 审核：无悬空链接、无占位文案。
- **Day 4** ｜ Aftercare 全簇 build + 提交
  - `cd marketing && npm run build` 验证 176+ 页通过 → commit → `git push origin main`。
  - 硬刷 live 抽查 2 页确认作者=Sarah Chen。

### Week 2 — B5 P2 新建（写为主）
- **Day 5** ｜ #6 写 `/templates`
  - 按 brief 写模板套用下载型页 → 注入 E-E-A-T → build → 提交 main。
- **Day 6** ｜ #7 写 `/features/tattoo-ai-design-generator`
  - 写 AI 设计生成器页 → E-E-A-T → build → 提交 main。
- **Day 7** ｜ #8 + #9 文档恢复
  - 重建 B5 brief（5 子主题 11 页结构）；找回/重建 longtail 集群地图。
  - 提交 main（纯文档，不触发页面构建问题）。

### Week 3+ — 未来簇
- 等 #9 恢复 longtail 地图后，按地图拆新簇 Day 任务，循环「写→审→改→提交」。

---

## 四、每日流程红线（必须遵守，违反=改动不上线）

1. **改完必须 `git push origin main`**（不是 master）。`.github/workflows/deploy.yml` 只监听 `main`。
2. **本地编辑路径 = `marketing/src/...`**（站点在 `marketing/` 子目录）。仓库根 `src/...` 是 master 侧支孤儿，不部署。
3. **每页 E-E-A-T 强制**：具名作者 Sarah Chen（Founder & CEO, 12 年经验, /about）+ 审核人 + ≥2 真实可点击引用 + 发布/修改日期；JSON-LD 用 `@graph`（WebPage + author/reviewedBy Person + citation）。
4. **build 验证**：`cd marketing && npm run build` 必须 0 错误再 push。
5. **不自建分支大改**：直接在 `main` 工作，小步提交，降低冲突面。

---

## 五、依据文档索引
- `INKFLOW-CONTENT-PLAYBOOK.md`（仓库根）— 内容写作规范
- `INKFLOW-SEO-EEAT-PLAN.md`（仓库根）— E-E-A-T 落地计划
- `marketing/seo-targets/briefs/aftercare-cluster-brief.md` — aftercare 簇 brief（✅ 在 main）
- `marketing/seo-targets/briefs/b5-website-builder-cluster-brief.md` — B5 brief（❌ 确实丢失，待 Day 7 重建）
- `marketing/seo-targets/longtail_matrix.csv` — 长尾地图（✅ **已恢复**，5652 词 / 16 集群；非 `inkflow-longtail-cluster-map.md`）
- `marketing/seo-targets/page_plan.csv` + `kd_queue.csv` — 关键词规划 / KD 队列（✅ 已恢复）
- `inkflow-kw-tattoo-website.md` — B5 关键词研究（❌ 确实丢失，待 Day 7 据 page_plan/kd_queue 重建）
