# 知识入库流水线 knowledge-intake

**一句话**：投喂一条知识 → LLM 自动判断归属 → 落到对应平台库 → 自动长索引与 SKILL 候选。

管理两个知识库：
- `../seo-knowledge/`（SEO 技能库，6 维度）
- `../social-knowledge/`（社媒技能库，6 维度 × 4 平台）

---

## 快速开始

```bash
cd "inkflow_harvests/data/knowledge-intake"

# 1. 设 Gemini（国内务必设代理端点，否则直连 Google 被墙）
set GEMINI_API_KEY=你的key
set GEMINI_ENDPOINT=https://你的cf-worker代理     # 可选，默认直连 Google
set GEMINI_MODEL=gemini-2.0-flash                  # 可选

# 2. 启动提交入口
node server.mjs
# → 浏览器打开 http://localhost:8787
```

**入口页操作**：粘贴知识 → `🔍 预览分类` 看归属对不对 → `✅ 确认落库`。
可用下拉手动覆盖「库 / 平台 / 维度」（人工优先级最高）。

> ⚠️ 不设 `GEMINI_API_KEY` 也能跑，会自动降级为**关键词规则兜底**（离线、确定性，但语义弱）。

---

## 命令行投喂（不开网页也行）

```bash
node ingest.mjs "一段知识文本" "https://来源url"
```

---

## 落库规则

| 库 | 分桶轴 | 落库路径 |
|---|---|---|
| seo | dimension（6选1）| `seo-knowledge/sources/_intake/{dimension}/` |
| social | platform + dimension | `social-knowledge/sources/_intake/{platform}/` |

- 每条 = 一个结构化 `.md`（frontmatter + 核心提炼 + 原文 + 「学→用」闭环清单）
- **SHA-256 指纹去重**：同内容重复投喂自动跳过
- `routing-log.jsonl` = 全量审计流水
- 每库 `sources/_intake/index.md` = 自动维护的计数索引

---

## 慢慢长 SKILL

每个桶（库+平台+维度）累积到 **5 条**（`taxonomy.json → skill_promotion.threshold` 可调），
自动触发一个 **SKILL 候选**：
- 写入 `skills-registry.json → promoted`
- 追加到 `skills-todo.md`（你逐条把这批原料提炼成一个可执行技能）
- 该桶计数清零，继续累积可促成进阶技能

这就是「慢慢建立索引和 SKILL」的机制——投喂越多，索引越全，SKILL 候选越丰富。

---

## 文件清单

| 文件 | 作用 |
|---|---|
| `taxonomy.json` | **分类目标树（单一真相源）**。加维度/平台只改这里 |
| `classify.mjs` | 分类引擎：Gemini 主分类 + 关键词规则兜底 |
| `ingest.mjs` | 路由落库：写 md + 去重 + 更新索引 + 促成 SKILL |
| `server.mjs` | 本地 HTTP 提交入口（零依赖） |
| `portal.html` | 提交入口网页表单 |
| `skills-registry.json` | SKILL 促成登记表（自动维护） |
| `routing-log.jsonl` | 入库审计流水（自动生成） |
| `skills-todo.md` | SKILL 待建清单（自动生成） |

---

## 部署到 harvests.pages.dev（已落地 ✅）

把知识采集后台作为 **dev-only 模块**挂到线上站（harvests.pages.dev/#/kb），仅 snow368(dev) 可见可操作，**不进前台公共 tab**。

### 已改动的文件
| 文件 | 改动 |
|---|---|
| `harvests-cloud-api/src/index.ts` | 新增 KB 模块：`ensureKbTable` / `classifyKb`（规则分类）/ `fetchExtract`（服务端抓页，绕过 GFW）/ `POST /api/kb-intake`（dev-only）/ `GET /api/kb`（dev-only） |
| `inkflow_harvests/src/components/KnowledgeIntake.tsx` | 新建 SPA 组件：URL 抓取预览、内容文本框、文件读取、分类预览+覆盖、提交入库、浏览列表 |
| `inkflow_harvests/src/App.tsx` | 加 `kb` tab，用 `isSnow368` 门禁（`showKb`），**不进公共 validTabs**，前台绝不显示 |

### 双层门禁（防御纵深）
1. **前端**：`showKb = isSnow368`（user.email === snow368@gmail.com）。非 dev 侧边栏无入口，URL `#/kb` 也因不在 validTabs 而回退 dashboard。
2. **后端**：`/api/kb*` 受 Worker 鉴权中间件保护 + `requireDev()` 二次校验 email === snow368@gmail.com，否则 403。即使前端被绕过，API 仍拒非 dev。

### 本机部署步骤（沙箱无 CF 凭据，需你跑）
```bash
# 1) 把 SEO(315)+社媒(226) 种子灌入线上 D1（harvests-db）
cd "inkflow_harvests/data/knowledge-intake"
npx wrangler d1 execute harvests-db --remote --file=seed-kb.sql

# 2) 部署 Cloud API Worker（含新 /api/kb* 路由）
cd "harvests-cloud-api"
npx wrangler deploy

# 3) 构建并部署 Pages（含新 kb tab 组件）
cd "../inkflow_harvests"
npm run build
npx wrangler pages deploy dist --project-name=harvests
```
> 也可直接 push `main` 触发 GitHub Actions（`.github/workflows/deploy-pages.yml`）自动构建部署 Pages；Worker 需单独 `wrangler deploy`。

### 使用
- dev 登录 harvests.pages.dev → 侧边栏出现「SEO/社媒知识库」→ 粘贴链接自动抓取分类 / 或直接投递内容入库 / 浏览 541 条种子（315 SEO + 226 社媒）。
- 服务端抓页走 Cloudflare 边缘网络，国内也能抓 x.com 等被墙站点。

---

## 文件清单

| 文件 | 作用 |
|---|---|
| `taxonomy.json` | **分类目标树（单一真相源）**。加维度/平台只改这里 |
| `classify.mjs` | 本地分类引擎：Gemini 主分类 + 关键词规则兜底 |
| `ingest.mjs` | 本地路由落库：写 md + 去重 + 更新索引 + 促成 SKILL |
| `server.mjs` + `portal.html` | 本地 HTTP 提交入口（零依赖，离线可用） |
| `seed-kb.sql` | **线上 D1 种子**：541 条（SEO 315 + 社媒 226），`wrangler d1 execute --remote` 灌入 |
| `skills-registry.json` | SKILL 促成登记表（自动维护） |
| `routing-log.jsonl` | 入库审计流水（自动生成） |
| `skills-todo.md` | SKILL 待建清单（自动生成） |
