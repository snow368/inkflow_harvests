# SaaS 站上线工作流

**适用：** 订阅制软件（如 InkFlow）
**目标：** 获取免费试用 → 付费订阅
**转化路径：** 搜索 → Landing Page → 注册试用 → 付费

---

## 适用分类
建站流程, SaaS

## Phase 0：上线前 2 周（建地基）

### 技术地基

| # | 事项 | 来源 |
|---|------|------|
| 1 | 注册域名 + HTTPS | — |
| 2 | **Google Search Console + GA4** | @foley_seo |
| 3 | sitemap.xml 提交 | @KristinaAzarenko |
| 4 | Lighthouse CWV 审计 | @KristinaAzarenko |
| 5 | `<button>` 导航 → 改用 `<a href>` | @KristinaAzarenko |
| 6 | 产品截图用 `<img>` 不是 CSS background | @KristinaAzarenko |
| 7 | PWA manifest 配置 | — |
| 8 | 移动端按钮 ≥ 38px | 之前 UI 标准 |

### Schema 结构化数据

| 页面类型 | Schema 类型 |
|---------|------------|
| 首页/品牌 | `SoftwareApplication` + `Organization` |
| 功能页 | `SoftwareApplication` + `WebPage` |
| 对比页 | `FAQPage`（3-5 个问答） |
| 定价页 | `Product` + `Offer` |
| 博客 | `Article` + `BreadcrumbList` |

### 外部引用源 🔴

SaaS 特有的外链优势——注册就有 DR 90+ 外链：

| 优先级 | 源 | 价值 |
|--------|---|------|
| 🔴 | G2 | DR 90+，SaaS 用户必看 |
| 🔴 | Capterra | DR 90+，SaaS 用户必看 |
| 🔴 | Trustpilot | DR 90+，品牌信任 |
| 🟡 | Chrome Web Store | DR 99（@hezhiyan7） |
| 🟡 | 259 个 SaaS 目录站 | @sujingshen 的外链池 |
| 🟡 | Product Hunt | 上线时可以发布 |

**新站 vs 老站的 Domain Authority 差距（@noelcetaSEO）：老站 12,000 外链/200+ 引用域名，新站只有 400/40。SaaS 目录外链是缩小差距最快的方式。**

---

## Phase 1：上线日（核心页）

### 1.1 首页 Hero

来源：@Goldikam（+44% CVR / +289% Rev）

3 变体模板：
```
A（控制）: "Tattoo Studio Management Software"
B（痛点导向）: "Stop Losing Clients to Paper and Spreadsheets"
C（预期胜出）: "Free Tattoo Studio Software. Client Management, Scheduling, and Payments in One Place."
```

### 1.2 OG 卡 🔴

来源：@WeiYipei（19 个页面重做 OG 卡，效果显著）

| 页面 | OG 卡内容 |
|------|----------|
| 首页 | 品牌名 + 一句话价值 + Logo |
| 对比页 | "[产品] vs [竞品]" + 关键差异 |
| 定价页 | "Start at $[价格]/mo" + 功能亮点 |

### 1.3 BOFU 对比页 🔴🔴（最高优先级）

来源：@boringlocalseo + @WeiYipei + @ConnorGillivan

SaaS 转化最高的页面类型，不是博客，是**对比页**。

```
模板：
  H1: [产品] vs [竞品] — 哪个适合你的[客户]？
  ↓
  Section 1: N 个迁移信号（自我诊断）
  ↓
  Section 2: 功能 + 价格对比表
  ↓
  Section 3: 迁移成本 & 风险评估
  ↓
  Section 4: 用户评价 / 社会证明
  ↓
  FAQ（Schema 标记）
  ↓
  CTA: Start Free Trial
```

**优先级顺序：** 1️⃣ vs 最大直接竞品 → 2️⃣ vs 替代品 → 3️⃣ vs 老方法（纸笔/Excel）

### 1.4 长尾词策略 🟡

来源：知识库通用原则

SaaS 的长尾词不是产品规格词（那是 B2B），而是 **场景+痛点+解决方案** 组合：

| 类型 | 例子 | KD | 优先级 |
|------|------|----|--------|
| 场景词 | "how to manage tattoo shop appointments" | 低 | 🟡 Phase 1 |
| 痛点词 | "stop losing client records" | 低 | 🟡 Phase 1 |
| 对比词 | "studioflo vs mangomint for tattoo shops" | 中 | 🔴 BOFU 页已覆盖 |
| 功能词 | "tattoo client intake form template" | 低 | 🟡 Phase 2 |

**怎么用：**
- 每个长尾词独立页面或段落
- 不写长文，精准回答搜索意图（@noelcetaSEO）
- 长尾词内容 = 功能页的自然补充

### 1.5 免费工具策略 🔴

来源：多次确认（完全开放）+ @WeiYipei（没人撞上限=没人付费）

**双条件：**
1. 核心工具完全免费（无需注册即用）
2. 免费 quota 让中大型用户刚好撞到上限 → 引导升级

**常见 quota 设计：**

| 档次 | 月用量 | 价格 |
|------|--------|------|
| Free | 基础功能 + 30 客户 | $0 |
| Pro | 无限客户 + 高级功能 | $19-29 |
| Team | 多员工 + 团队协作 | $79-99 |

确保 Free 版够一家小型工作室用，中型工作室刚好撞上限。

---

## Phase 2：上线后 1 个月（建信任）

### 2.1 GSC 数据驱动 🔴

来源：@David_mduw + @foley_seo

**每月 GSC 检查：**
```
□ Impression > 500 且 CTR < 2% 的关键词
□ 改 title tag（每次 3-5 个）
□ 2 周后看 CTR 变化
□ 记录到 SEO Experiment Log
```

### 2.2 BOFU → TOFU 内容扩展

| 阶段 | 内容类型 | 优先级 |
|------|---------|--------|
| 上线 | 对比页 (vs 竞品) | 🔴 最高 |
| 第 1 月 | 替代品页 (/alternatives/) | 🔴 |
| 第 2 月 | 功能页 / 场景页 | 🟡 |
| 第 3 月 | TOFU 博客（行业知识） | 🟡 |
| 第 3 月+ | 视频 / 案例研究 | 🟢 |

**新站不做：** 长文博客（@noelcetaSEO 新站缺 Domain Authority，写了也不排名）。

### 2.3 Reddit 冷启动

来源：@TheCoolestCool + @victor_bigfield

找到目标客户活跃的 subreddit（SaaS 常见：r/SaaS / r/smallbusiness / 行业 subreddit）。

```
Phase 1: 回答问题不带链接（建 Karma）
Phase 2: 分享行业经验帖（自然提产品）
Phase 3: 用户问再 DM（被动转化）
```

---

## Phase 3：上线后 2-3 个月（规模化）

### 3.1 AI 产品 Demo 视频

来源：@ErnestoSOFTWARE + @VincentLogic

- 白墙录屏/手机拍
- AI 后期改成不同场景/风格
- 分发到 IG / TikTok / YouTube
- 不投虚拟人物路线

### 3.2 冷邮件（B2B SaaS）

来源：@ConnorShowler + @Alexzartarian

| 阶段 | 量级 | 方式 |
|------|------|------|
| 验证 PMF | 20 封 | 手动发 |
| 系统化 | 50/周 | 工具辅助 |
| 规模化 | 500/周 | 多域名 + 多邮箱 |

### 3.3 KOL / Influencer

来源：@foley_seo Distribution 优先级

- 找行业 KOL 免费使用产品
- 产品换内容，不付费
- 审计真实 engagement

---

## SaaS 特有的注意事项

| 维度 | 做法 | 来源 |
|------|------|------|
| 定价 | 免费额度让用户撞上限 | @WeiYipei |
| 试用转化 | 监控免费→付费转化率 | — |
| 外链 | G2/Capterra 比客座博客重要 | @hezhiyan7 |
| 内容 | 对比页 > 博客 | @ConnorGillivan |
| 增长 | Distribution > Product | @foley_seo |

---

**来源索引：** 21 篇深度分析 → `D:\seo-knowledge\sources\deep-dive\`
