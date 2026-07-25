# 新站上线执行方法论（通用）

**来源：** 2026/06/05 深度分析 21 篇汇总
**适用：** 任何类型的新站（SaaS / 电商 / 内容站 / 品牌站）
**核心原则：** 新站缺 Domain Authority，不要跟老站比内容长度，比执行速度。

---

## 适用分类
建站流程, 发布

## Phase 0：上线前 2 周（建地基）

### 0.1 技术地基 🔴

| # | 事项 | 来源 |
|---|------|------|
| 1 | 注册域名 + 配置 HTTPS | — |
| 2 | 开 Google Search Console + GA4 | @foley_seo |
| 3 | 提交 sitemap.xml | @KristinaAzarenko |
| 4 | 跑 Lighthouse 检查 CWV | @KristinaAzarenko |
| 5 | 检查 `<button>` vs `<a>` 使用 | @KristinaAzarenko |
| 6 | 检查图片用 `<img>` 不是 CSS background | @KristinaAzarenko |
| 7 | 配置 robots.txt（不屏蔽搜索引擎） | — |
| 8 | 配置移动端适配（按钮 ≥ 38px） | 之前 UI 标准 |

**范式：** Technical Excellence 是新站和高 DR 老站竞争的基础。老站可能有内容优势，但技术层面新站可以做到完美。

### 0.2 Schema 结构化数据 🔴

每个核心页面必须包含：

- **首页/品牌页** → `Organization` + `SoftwareApplication`（SaaS）
- **产品或服务页** → `Product` + `Offer`
- **对比页** → `FAQPage`（FAQ 标记）
- **博客** → `Article` + `BreadcrumbList`
- **全站** → `BreadcrumbList` + `SiteNavigationElement`

Schema 是 GEO 的基础，也是传统 SEO 的排名信号。对 AI 引用和传统 SEO 都有用。@boringgeodude、@DavidGQuaid 都指向同一个结论：Schema 做没有坏处。

### 0.3 外部引用源注册 🔴

来源：@noelcetaSEO（Domain Authority 差距）

在上线前或上线的同时，注册以下外部引用源：

| 优先级 | 源 | 适用类型 | 价值 |
|--------|---|---------|------|
| 🔴 | G2 | SaaS | DR 90+ 外链 |
| 🔴 | Capterra | SaaS | DR 90+ 外链 |
| 🔴 | Trustpilot | 通用 | DR 90+ 外链 + 品牌信任 |
| 🟡 | 行业目录 | 通用 | 定向外链 |
| 🟡 | Chrome Web Store | SaaS | DR 99 外链 |
| 🟡 | SaaS directories | SaaS | 259 个目录站（来自 @sujingshen） |

**为什么上线前就注册？** 因为 Google 索引新站时，外部引用源帮助 Google 快速建立信任。不是等有流量了再注册，是注册了才能有流量。

---

## Phase 1：上线（核心页上线）

### 1.1 首页 Hero

来源：@Goldikam A/B 测试

Hero 不是 tagline，是 **3 秒内向陌生人的推销**。

**模板：**
```
[是什么] + [质量对标的参照物] + [消除决策障碍]

例子（Goldikam 胜出变体）:
"European bedding. Hotel-quality. Free shipping over $100."

InkFlow 例子:
"Free Tattoo Studio Software. Client Management, Scheduling, and Payments in One Place."
```

准备 3 个变体，上线后 A/B 测试 2 周。

### 1.2 OG 卡 🔴

每个页面配 OG 卡（1200×630）。
来源：@WeiYipei 36 天复盘实战验证。

| 页面类型 | OG 卡内容 |
|---------|----------|
| 首页 | 品牌名 + 价值主张 + Logo |
| 对比页 | "InkFlow vs [竞品]" + 关键差异点 |
| 功能页 | 功能名 + 解决的问题 |
| 工具页 | 工具名 + 免费提示 |

### 1.3 BOFU 对比页（最高优先级页面）

来源：@boringlocalseo 决策工具框架 + @WeiYipei 实战 + @ConnorGillivan BOFU 优先

**不写成功能对比表，写成买家决策工具。**

```
模板：
  H1: [产品] vs [竞品] — Which Is Right for Your [客户]?
  ↓
  Section 1: N Signs You Should Switch (迁移信号)
    列出具体场景，让读者自我诊断
  ↓
  Section 2: Side-by-Side Comparison
    功能 + 价格 + 适用场景
  ↓
  Section 3: Migration Cost & Risk
    "How long does it take?" / "Is my data safe?"
  ↓
  Section 4: Social Proof
    案例/评价/数据
  ↓
  FAQ (Schema 标记)
    3-5 个真实问题
  ↓
  CTA: Free Trial / Get Started
```

**优先级：** 第 1 个对比页 vs 最大的直接竞品。

### 1.4 免费工具页（如适用）

来源：06/04 策略 + @WeiYipei 教训

**两个必须同时满足的条件：**
1. 工具完全免费开放（不需要注册就能试）
2. 免费额度刚好让中大型用户撞到上限 → 引导升级

如果没人撞到上限，就没有人付费。@WeiYipei 的 Analook 36 天 0 付费就是这个原因。

---

## Phase 2：上线后 1 个月（建信任）

### 2.1 GSC 数据驱动优化

来源：@David_mduw + @foley_seo

**每月 GSC 检查清单：**
```
□ 拉出所有 Impression > 500 但 CTR < 2% 的关键词
□ 对比当前 title 和搜索意图
□ 改 title tag（每次改 3-5 个）
□ 2 周后看 CTR 变化
□ 记录到 SEO Experiment Log
```

**SEO Experiment Log 模板：**

| Date | Page | Change | Expected Impact | CTR Before | CTR After | Result |
|------|------|--------|----------------|-----------|----------|--------|

### 2.2 内容优先级

来源：@noelcetaSEO（新站缺 DA）+ @RossHudgens（TOFU 在 AI 中回归）

```
Phase 1（上线期）: BOFU 对比页 — 转化最高
Phase 2（1 月后）: 功能页/产品页 — 建内容基础
Phase 3（2 月后）: TOFU 博客 — 有 DA 基础后做
```

**新站不用做的事：**
- ❌ 长文博客（上线初期）— 没 DA 写了也不排名
- ❌ 纯 GEO 内容 — AI 访问限制
- ❌ 投付费广告 — Distribution 优先级排最后

### 2.3 Reddit 冷启动

来源：@TheCoolestCool + @victor_bigfield

```
Phase 1（1-2 周）:
  □ 每天 15 分钟在目标 subreddit 回答问题
  □ 不带链接，纯回答问题
  □ 目标：300+ karma

Phase 2（3-4 周）:
  □ 分享行业经验帖
  □ 在内容中自然提到"我们用的工具"
  □ 不直接发链接

Phase 3（5 周+）:
  □ 用户主动问时再 DM 或自然引导
```

---

## Phase 3：上线后 2-3 个月（规模化）

### 3.1 AI UGC 视频生产

来源：@ErnestoSOFTWARE

- 产品 Demo 白墙拍，AI 后期改背景/打光
- 同一素材分不同风格分发到多平台
- 不投虚拟人路线，优先产品演示路线

### 3.2 冷邮件 B2B（如适用）

来源：@ConnorShowler + @Alexzartarian

- 先自己做，不外包（ConnorShowler 教训）
- 手动发 20 封验证 PMF → 系统化 → 规模化
- 冷邮件是补充渠道，不是第一渠道

### 3.3 Influencer / KOL

来源：@foley_seo Distribution 优先级

- 找 niche 中的 KOL 免费使用产品
- 不付费，用产品换内容
- 审计真实 engagement（不看虚荣指标）

---

## 附录：冲突处理指南

当学到的不同来源相互矛盾时：

| 冲突 | 判断标准 |
|------|---------|
| BOFU vs TOFU 优先级 | 新站 → BOFU；有 DA 后 → TOFU |
| GEO 做不做 | Schema 做；纯 GEO 内容不做 |
| 长文 vs 短文 | 新站 → 短文精悍；有 DA 后 → 长文深度 |
| 免费工具限不限 | 完全开放但设 quota 上限 |
| AI 内容 | AI 分析可以；AI 生成正文不行 |
| 外链数量 vs 质量 | 新站先注册目录（G2/Capterra），不急建大量外链 |

---

## 附录：21 篇分析的底层规律

所有分析归结为 3 条底层规律：

1. **New Sites** 面临 Domain Authority 差距（@noelcetaSEO），不跟老站比内容数量，比 Technical Excellence + Niche 深度 + 执行速度
2. **AI 内容检测** 在加速（@foley_seo），AI 只做分析层，不做产出层
3. **Distribution > Product**（@foley_seo SEO Stack 经验），产品够用就行，重点在分发
