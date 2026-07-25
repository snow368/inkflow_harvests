# 建站 9 步启动流程

**用法：** 给一个需求 → 按 9 步走 → 出站上线 → 迭代循环
**适用：** SaaS / B2C / B2B / 内容站（各类型差异已在每步标注）

---

## 适用分类
建站流程, 通用

## Step 1：需求分析

**输入：** 一个想法/产品/方向
**输出：** 网站类型 + 目标客户 + 转化路径

### 确定类型

| 维度 | SaaS | B2C | B2B | 内容站 |
|------|------|-----|-----|--------|
| 卖什么 | 订阅软件 | 实体产品 | 批发/代工 | 流量变现 |
| 谁付钱 | 企业/个人 | 消费者 | 企业采购 | 广告主 |
| 转化路径 | 试用→付费 | 加购→下单 | 询盘→订单 | PV→广告 |
| 外链来源 | G2/目录 | 评测/导购 | 行业目录 | 量取胜 |

### 确定转化路径

```
SaaS:    搜索 → Landing Page → 注册试用 → 付费
B2C:    搜索 → 产品页 → 加购 → 下单
B2B:    搜索 → 产品页 → 询盘 → 订单
内容站:  搜索 → 内容页 → 广告点击
```

**输出示例：**
```
站点类型: SaaS
目标客户: 纹身工作室老板（个体或 2-5 人团队）
转化路径: 搜索 → 对比页 → 免费试用 → 订阅付费
```

---

## Step 2：主关键词挖掘

**输入：** 需求分析输出
**输出：** 10-20 个核心主关键词

### 方法

| 方法 | 怎么做 | 工具 |
|------|--------|------|
| 竞品关键词 | 看 3-5 个竞品网站用什么词 | Ahrefs / SEMrush / 手动看 |
| 行业基础词 | 产品类目名 + 解决方案名 | 行业知识 |
| 品牌+替代品 | "[竞品] alternative" / "vs [竞品]" | Google Suggest |
| 痛点词 | "how to [解决某个问题]" | Reddit / Quora / 论坛 |

### 筛选标准

| 类型 | 初期可接受的 KD | 理由 |
|------|---------------|------|
| SaaS | < 20 | 新站缺 DA，高 KD 竞争不过 |
| B2C | < 25 | 产品词 intent 精准，略高也能接受 |
| B2B | < 15 | 长尾词天然低 KD |
| 内容站 | < 10 | 靠量取胜，KD 高了成本太高 |

**输出示例：**
```
主关键词池:
  - tattoo studio software
  - studioflo
  - tattoo booking system
  - tattoo client management
  - studioflo alternatives
  - mangomint for tattoo
```

---

## Step 3：长尾词扩展

**输入：** 10-20 个主关键词
**输出：** 100-500 个长尾词（按类型分组）

### 各类型长尾词形态

| 类型 | 长尾词公式 | 例子 |
|------|-----------|------|
| SaaS | [场景] + [痛点] + [解决方案] | "how to manage tattoo shop appointments online" |
| B2C | [产品] + [属性] + [使用场景] | "wireless earbuds long battery life running" |
| B2B | [产品规格] + [供应商] + [地域] | "3mm rubber sheet supplier in california" |
| 内容站 | [问题] + [指南] + [对比] | "best way to remove tattoo at home" |

### 扩展方法

```
方法 1: Google Autocomplete
  输入 "tattoo studio" → 看联想词

方法 2: 竞品内页
  看竞品网站上了哪些长尾内容页

方法 3: Related Searches
  搜索主关键词 → 页面底部 "searches related to..."

方法 4: 论坛/Reddit
  提取用户真实问的问题 → 转成长尾词
```

**输出示例：**
```
长尾词池（SaaS 案例）:
  BOFU intent:
    - studioflo vs inkflow
    - studioflo alternatives 2026
    - best tattoo studio software for small shops
    - mangomint pricing for tattoo studios
  MOFU intent:
    - tattoo client intake form template
    - how to manage tattoo appointments
    - tattoo shop schedule software
  TOFU intent:
    - how to grow a tattoo business
    - tips for tattoo shop organization
```

---

## Step 4：意图分组

**输入：** 长尾词池
**输出：** BOFU / MOFU / TOFU 三组

### 判断标准

| 意图 | 搜索词特征 | 用户状态 | 对应页面 |
|------|-----------|---------|---------|
| **BOFU** | "vs"、"alternative"、"best"、"pricing"、"review" | 准备买了 | 对比页/定价页 |
| **MOFU** | "how to"、"what is"、"guide"、"features" | 在了解方案 | 功能页/场景页 |
| **TOFU** | 行业知识、统计数据、"tips"、"trends" | 刚意识到问题 | 博客/指南 |

### 分配比例

| 类型 | BOFU | MOFU | TOFU | 理由 |
|------|------|------|------|------|
| SaaS | 40% | 35% | 25% | 对比页转化最高 |
| B2C | 30% | 30% | 40% | TOFU 内容也能带货 |
| B2B | 25% | 40% | 35% | B2B 需要更多教育内容 |
| 内容站 | 10% | 20% | 70% | 靠信息流量变现 |

### 分错了怎么办

```
信号: BOFU 词 → 写了 MOFU 内容 → 跳出率高
修正: 改成对比/购买导向的内容结构

信号: MOFU 词 → 试了 BOFU 写法 → CVR 低
修正: 加更多教育内容，减少推销感
```

**输出示例：**
```
BOFU（40%）:
  /vs-studioflo
  /alternatives
  /pricing

MOFU（35%）:
  /features/client-management
  /features/scheduling
  /features/payments

TOFU（25%）:
  /blog/tattoo-studio-management-tips
```

---

## Step 5：网站架构

**输入：** 意图分组结果
**输出：** 网站目录树

### 标准架构

```
首页
├── /features/                      ← MOFU
│   ├── /features/client-management
│   ├── /features/scheduling
│   └── /features/payments
├── /pricing                        ← BOFU
├── /vs-[competitor]                ← BOFU（多个）
├── /alternatives                   ← BOFU
├── /blog                           ← TOFU
│   ├── /blog/guide-1
│   └── /blog/guide-2
├── /tools（如适用）                ← 引流
│   └── /tools/free-calculator
├── /about
└── /contact
```

### 各类型特殊情况

| 类型 | 特殊页面 |
|------|---------|
| SaaS | /integrations, /changelog, /api-docs |
| B2C | /category/*, /reviews, /size-guide |
| B2B | /certifications, /factory-tour, /wholesale |
| 内容站 | /guides/*, /best-*, /vs-* |

**输出示例：**
```
inkflow.com/
├── /vs-studioflo
├── /vs-mangomint
├── /pricing
├── /features/
│   ├── /features/client-management
│   └── /features/scheduling
├── /free-tools/
│   └── /free-tools/calculator
├── /blog/
│   └── /blog/tattoo-studio-tips
├── /about
└── /contact
```

---

## Step 6：写页面

**输入：** 网站架构 + 意图分组
**输出：** 所有页面的初稿

### 页面结构模板（通用）

**BOFU 对比页：**
```
H1: [产品] vs [竞品] — Which Is Right for Your [客户]?
Section 1: N 个迁移信号
Section 2: 功能 + 价格对比表
Section 3: 迁移成本 & 风险
Section 4: 社会证明 / 评价
FAQ（Schema 标记）
CTA
```

**功能页（MOFU）：**
```
H1: [Feature Name] — 解决什么问题
Section 1: 场景化描述痛点
Section 2: 怎么解决（截图/视频）
Section 3: 具体好处（数据/案例）
Section 4: 相关功能链接（内链）
CTA
```

**TOFU 博客：**
```
H1: [指南/趋势/教程]
Section 1: 问题是什么
Section 2: 深度分析/步骤
Section 3: 结论 + 自然引导到产品
```

### 内容长度指南

| 类型 | 字数 | 原则 |
|------|------|------|
| BOFU 对比页 | 1500-2000 | 全面覆盖买家决策点 |
| MOFU 功能页 | 800-1200 | 精确，不废话 |
| TOFU 博客 | 1500-3000 | 深度，等有 DA 后再做 |
| 定价页 | 500-800 | 清晰，直接 |

### OG 卡

每个页面配 OG 卡（1200×630），@WeiYipei 实战验证有效。

| 页面 | OG 卡内容 |
|------|----------|
| 对比页 | "[产品] vs [竞品]" + 关键差异 |
| 功能页 | 功能名 + 解决的问题 |
| 定价页 | "Start at $X/mo" |
| 博客 | 文章标题 + 吸引点 |

---

## Step 7：技术地基

**输入：** 网站架构
**输出：** 技术配置完成

### 上线前必做清单

来源：@KristinaAzarenko + @noelcetaSEO + @boringgeodude

```
□ 域名 + HTTPS
□ Google Search Console + GA4
□ sitemap.xml 提交
□ Lighthouse CWV 审计（移动端+桌面端）
□ 导航用 <a href> 不是 <button>
□ 图片用 <img> 不是 CSS background
□ 移动端按钮 ≥ 38px
□ robots.txt 正确配置（不屏蔽搜索引擎）
```

### Schema 清单

| 页面类型 | Schema | 适用类型 |
|---------|--------|---------|
| 首页/品牌 | `Organization` + `SoftwareApplication` | SaaS |
| 产品页 | `Product` + `Offer` + `AggregateRating` | B2C / B2B |
| 对比页 | `FAQPage` | 所有 |
| 分类页 | `ItemList` + `BreadcrumbList` | 所有 |
| 博客 | `Article` + `BreadcrumbList` | 所有 |
| 联系方式 | `ContactPoint` + `PostalAddress` | B2B |

---

## Step 8：上线 + 推广

**输入：** 技术配置完成
**输出：** 网站上线 + 外部信号发出

### 上线发布

```bash
# 不是代码，是检查清单
□ 域名解析
□ HTTPS 证书生效
□ GSC 验证通过
□ sitemap 提交成功
□ 网站可正常访问
□ 手机端可用
□ OG 卡预览正常
```

### 外部引用源注册

| 类型 | Day 1 必须注册 |
|------|---------------|
| SaaS | G2、Capterra、Trustpilot |
| B2C | Trustpilot、行业评测站 |
| B2B | 行业目录、Alibaba（如适用） |
| 内容站 | —（靠搜索流量） |

### 首周推广

```
Day 1-3:
  □ X/Twitter 发布上线消息
  □ Reddit 相关 subreddit 分享（不要硬推）
  □ LinkedIn 行业群组分享

Day 4-7:
  □ 检查 GSC 是否有收录
  □ 提交给 Product Hunt（SaaS）
  □ 联系早期测试用户
```

---

## Step 9：数据驱动迭代

**输入：** GSC + GA4 数据
**输出：** 每两周/每月的内容优化

### 每月 GSC 检查

来源：@David_mduw + @foley_seo

```
□ 拉出 Impression > 500 且 CTR < 2% 的关键词
□ 检查 title 是否匹配搜索意图
□ 改 title tag（每次 3-5 个）
□ 2 周后看 CTR 变化
□ 记录到 SEO Experiment Log
```

### SEO Experiment Log

| Date | Page | Change | Expected Impact | CTR Before | CTR After | Result |
|------|------|--------|----------------|-----------|----------|--------|

### 内容补全

根据 GSC 数据发现有展示但没排好的词 → 补充内容：

```
第 1 月:
  □ 补 BOFU 对比页（优先级最高）
  □ 修复技术问题

第 2 月:
  □ 补 MOFU 功能页
  □ 优化 title/description

第 3 月:
  □ 开始 TOFU 博客
  □ 视频/案例研究
```

---

## 附录：AI 搜索就绪策略（Google 官方路线）

**来源：** Google Search Central 官方指南（@Prabir336 信息图）+ @boringgeodude + @vibemarketersHQ + @DavidGQuaid

Google 官方明确说：**不需要 AEO/GEO hacks**。
把 SEO 基础做好，AI 搜索自然会收录你。没有"AI SEO"，只有 SEO。

### Phase 1：新站基础期（上线 → 3 个月）—— 不用考虑 AI

走 @Prabir336 / Google Search Central 路线，只做基础 SEO：

| ✅ 做 | ❌ 不做 |
|-------|--------|
| Helpful content（对比页/功能页） | llms.txt |
| Strong technical SEO（Schema/CWV/结构） | Chunked content |
| Clear site structure | AI fluff |
| GSC + GA4 基础 | 专门"喂 AI"的内容 |
| 外部引用源（G2/Trustpilot/目录） | 纯 GEO 内容投资 |

**原因：** 新站 DA = 0，AI 不会引用一个没权威度的站。做 GEO 优化也没用。

### Phase 2：AI-aware 期（3-6 个月）

有了基础流量和 DA 后，开始关注 AI：

| ✅ 做 | 👀 监控 |
|-------|---------|
| 维护已有的 Schema（确保 AI 能解析） | AI Overview 是否出现你的内容 |
| 内容策略继续按 intent 走 | Perplexity/ChatGPT 是否引用你 |
| 继续建外链/引用源 | 竞品在 AI 结果中的表现 |

这个阶段还是不做：llms.txt、chunked content、专门"喂 AI"的内容格式。（@DavidGQuaid：AI 访问受限，ROI 不确定）

### Phase 3：AI 优化期（6 个月+）

网站稳定有流量、AI 搜索流量占比可见时：

| ✅ 做 | 🤔 评估 |
|-------|---------|
| 分析 AI 引用你和引用竞品的差异 | llms.txt 是否值得（等数据） |
| 针对 AI 引用偏差调整内容 | chunked content 实验 |
| 结构化数据升级 | 专门的 GEO 内容投资 |

### 判断标准

```
PMF 还没找到 → Phase 1
PMF 找到了，AI 在 analytics 中可见 → Phase 2
AI 占 organic traffic > 10% → Phase 3
```

---

## 完整流程一览

```
需求 → 主关键词 → 长尾词 → 意图分组 → 网站架构 → 写页 → 技术地基 → 上线推广 → 迭代
                                                                              ↓
                                                                        GSC 数据回馈
```

**各类型耗时预估：**

| 类型 | Phase 0-1（准备） | Phase 2（建设） | Phase 3（见效） |
|------|-----------------|----------------|----------------|
| SaaS | 2 周 | 3-4 周 | 3-6 月 |
| B2C | 1 周 | 2-3 周 | 2-4 月 |
| B2B | 2 周 | 3-4 周 | 3-6 月 |
| 内容站 | 1 周 | 4-8 周（量） | 6-12 月 |

---

**关联文件：**
- `workflow-saas.md` — SaaS 细节
- `workflow-b2b.md` — B2B 细节
- `workflow-b2c.md` — B2C 细节
- `site-types.md` — 类型分类
- `keyword-research.md` — 关键词研究
- `../sources/deep-dive/` — 所有来源分析
