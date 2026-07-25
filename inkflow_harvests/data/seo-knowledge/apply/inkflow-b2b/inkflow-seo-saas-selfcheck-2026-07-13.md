# InkFlow × seo-saas 自检报告

> 执行时间：2026-07-13
> 依据技能：`C:/Users/snow3/.workbuddy/skills/seo-saas/SKILL.md`（第九章自检清单）
> 站点定性：**SaaS**（订阅制软件，转化=注册试用/付费）✅ 适用本技能
> 代码库：`D:/ink-flow-manager/marketing`（Astro 5 静态站，`output: 'static'`，部署目标 `ink-flow` / `ink-flows.com`）

---

## 一、自检清单评分卡（14 项）

| # | 检查项 | 状态 | 证据 / 说明 |
|---|--------|------|-------------|
| 1 | 已定性 = SaaS | ✅ 通过 | InkFlow = 纹身工作室 SaaS，转化=注册/付费 |
| 2 | 架构含 功能页+对比页+替代品页+定价+免费工具 | ✅ 通过 | features 19 页 / compare 8 页 / alternatives 2 页 / pricing / free-tools 6 页 / blog 8 页 |
| 3 | BOFU 页（对比/替代/功能）已先做 | ✅ 通过 | 对比/替代/功能页均存在，博客在后 |
| 4 | 关键词 KD<20 起步 / 非品牌词 >60% | ⚠️ 待 GSC 验证 | 代码层无法核验，需 GSC 导出确认（新站静默期暂无数据） |
| 5 | 每功能独立落地页 + SoftwareApplication（内容页已关） | ✅ 通过 | 19 个功能页；`SEOHead` 默认发 SoftwareApplication，12 个内容页传 `appSchema={false}` |
| 6 | 内链 ≤2-3/段；主动 cite 竞品外链 | ✅ 通过（部分） | Phase1 已加 242 条内链；对比页引用竞品但多为站内，显式外链竞品 blog 信号可加强 |
| 7 | Title 含 best/free/top/guide+年份；BreadcrumbList 全站 | ✅ 通过 | 对比/替代页用 `best-`/`vs` 模式 OK；**BreadcrumbList 已全站覆盖**（`SEOHead` 按 URL 自动派生，symbol 页因含分类层级用 `disableBreadcrumb` 保留 4 级手动版） |
| 8 | **IndexNow 已配（内容更新即推 Bing）** | ❌ 缺口→已建 | 见第二节：密钥文件在，但**无提交脚本 + 线上未正确托管密钥** |
| 9 | FAQPage Schema 5-8 问，每答<300字 | ✅ 通过（已扩展） | compare 8 页 + category 15 页（FAQSchema 喂 `faqs`）+ **symbol 70 页**（新增：用 `meaning/desc/origin/culturalNotes` 真实字段派生，无编造；有 culturalNotes 出 3 问、否则 1-2 问）；features/alternatives/blog 早前已覆盖 |
| 10 | 外链渠道 = G2/Capterra/SaaS目录/PH（非买链） | ❌ 缺口 | 外链=0（Noel Ceta 模型 +156% 头号因子，当前 0 分）— 需外部账号认领 |
| 11 | E-E-A-T 每页：作者+审核+2来源+日期 | ⚠️ 部分 | blog/category/symbol/about 有 2 来源；**symbol 页缺每页作者/审核人** |
| 12 | GA4 已配 AI Chatbots 渠道组 | ❌ 待配 | 需 GA4 后台建 regex 渠道组（ChatGPT/Perplexity/Claude）→"AI 引用"可量化 |
| 13 | KPI 埋点：注册转化率 / 付费转化率 | ❌ 待配 | 需 GA4 事件（register / subscribe） |
| 14 | llms.txt + robots 开放 AI 爬虫 | ✅ 通过 | `public/llms.txt` 已列权威页；`robots.txt` 已 Allow GPTBot/Google-Extended/PerplexityBot/Claude-SearchBot/OAI-SearchBot |

**合计：✅ 9 项 / ⚠️ 3 项 / ❌ 3 项**（#7 BreadcrumbList、#9 FAQPage 已于 2026-07-13 第二轮补充；#8 代码已补，余为运营/外部依赖）

---

## 二、本次已修复：IndexNow 自动提交 Hook（#8）

### 新增文件
- `scripts/submit-indexnow.mjs` — 读取 `dist/sitemap-index.xml` + 子 sitemap，提取全部 URL，POST 到 `https://api.indexnow.org/indexnow`。
- 逻辑：优先读本地 `dist/`（刚部署的 URL），缺失时回退抓取线上 sitemap；按 Bing 规范分批（≤10000/批）；幂等；失败不影响 deploy 退出码。

### 改 `package.json`
```json
"submit-indexnow": "node scripts/submit-indexnow.mjs",
"deploy": "wrangler pages deploy dist --project-name ink-flow && npm run submit-indexnow"
```
→ 以后 `npm run deploy` 部署完**自动推送**全站 URL 给 Bing/Yandex/LLM 爬虫，新页无需等 Google 抓取即被收录。

### 语法校验
`node --check scripts/submit-indexnow.mjs` → `SYNTAX_OK` ✅

---

## 三、⚠️ 关键阻断（必须解决，否则 Hook 无效）

**线上检查（2026-07-13）发现：`ink-flows.com` 当前返回的是 React SPA 应用，不是 Astro 静态站。**

| 检查 | 结果 |
|------|------|
| `https://ink-flows.com/inkflow-indexnow-key-2026.txt` | HTTP 200，但**返回的是 SPA 的 index.html**，不是原始密钥 → Bing 验证必失败 |
| `https://ink-flows.com/sitemap-index.xml` | 返回 0 个 `<loc>`（SPA catch-all 接管）→ sitemap 未上线 |
| `https://ink-flows.com/` 根 | 返回 SPA HTML（`<script src="/src/main.tsx">`、canonical `https://inkflow.com/`） |

**根因**：`astro.config.mjs` 的 `site='https://ink-flows.com'`，但该域名当前被 **SPA 应用** 占用（`inkflow.com` 是其 canonical），Astro marketing 的 `dist/`（含 `public/` 下的密钥文件、robots、llms.txt、sitemap）**没有真正部署/绑定到 ink-flows.com**。所以 `public/` 里的静态资源根本没被托管。

**后果**：即便提交脚本完美，Bing 拉取 `keyLocation` 拿到的是 HTML 而非密钥 → 提交被拒。SEO 三件套中的 IndexNow 这条实际失效。

**需要你确认/处理（运营动作，非代码）**：
1. **确认部署目标**：Astro marketing `dist/` 应部署到哪个域名？若 `ink-flows.com` 已被 SPA 占用，请绑定到子域（如 `www.ink-flows.com` 或 `go.ink-flows.com`），并同步改 `astro.config site`。
2. **部署后复检**：`curl https://<domain>/inkflow-indexnow-key-2026.txt` 必须返回纯文本 `inkflow-indexnow-key-2026`（非 HTML）。
3. **清理遗留密钥文件**（建议）：`public/inkflows-key.txt`（内容 `inkflows-b79afe547c48`）命名不符合 IndexNow 规范（文件名须=密钥），疑似旧残留，确认无引用后删除，避免混淆。

> 一旦静态站点正确上线，本 Hook 即可生效——`npm run deploy` 后会自动推送。

---

## 四、其余待办（按优先级）

| 优先级 | 缺口 | 动作 | 责任方 |
|--------|------|------|--------|
| 🔴 高 | 部署/域名阻断（第三节） | 绑定 Astro `dist` 到正确域名 | 你（部署权限） |
| 🔴 高 | 外链=0（#10） | 认领 G2/Capterra 产品页、提交 SaaS 目录、PH 首发 | 你（外部账号） |
| 🟢 低 | BreadcrumbList 全站（#7） | **已完成** — `SEOHead` 按 URL 自动派生 + symbol 页 4 级手动版 | 已闭环 |
| 🟢 低 | FAQPage 覆盖（#9） | **已完成** — symbol 70 页新增 FAQPage（真实字段派生）；category/compare/features/blog 已覆盖 | 已闭环 |
| 🟡 中 | symbol 页缺每页作者/审核（#11） | 注入 Person/reviewer | 我（下次） |
| 🟢 低 | GA4 AI Chatbots 渠道组（#12） | GA4 后台 regex 建组 | 你/我 |
| 🟢 低 | KPI 注册/付费事件（#13） | GA4 事件埋点 | 你/我 |
| 🟢 低 | 竞品 blog 显式外链（#6） | 对比页加 competitor blog 外链显客观 | 我（下次） |

---

## 五、本次交付物

- ✅ `scripts/submit-indexnow.mjs`（新建，语法通过）
- ✅ `package.json` deploy 链已接 IndexNow 提交
- ✅ 本报告（自检 + 阻断说明）
- ⏸️ 待你解决第三节的部署/域名绑定后，Hook 才能真正运行

> 注：沙箱内 `astro build` 被禁用（dist/ 写权限），故未实际跑 build+deploy；脚本与配置已就绪，由你本地 `npm run deploy` 触发。
