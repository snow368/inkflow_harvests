# InkFlow 营销官网详细规划

## 一、整体架构

```
inkflow.com/                         ← 营销官网（Astro SSG，SEO 友好）
├── /                                ← Landing Page（首页）
├── /features/                       ← 功能总览
│   ├── /booking                     ← 预约管理
│   ├── /pos                         ← POS 收银
│   ├── /crm                         ← 客户管理
│   ├── /waivers                     ← 电子 Waiver
│   ├── /inventory                   ← 库存管理
│   ├── /aftercare                   ← 售后自动化
│   ├── /analytics                   ← 数据分析
│   └── /marketing                   ← 营销工具
├── /pricing                         ← 定价页面
├── /compare/                        ← 对比页
│   ├── /tattoo-studio-pro           ← vs Tattoo Studio Pro
│   ├── /tattoogenda                 ← vs Tattoogenda
│   ├── /booksy                      ← vs Booksy
│   ├── /vagaro                      ← vs Vagaro
│   └── /inkbook                     ← vs InkBook
├── /alternatives/                   ← 替代品页
│   ├── /best-tattoo-studio-software
│   ├── /tattoo-studio-pro-alternatives
│   └── /booksy-for-tattoo-shops
├── /blog/                           ← 博客
│   ├── /how-to-digitize-waivers
│   ├── /reduce-no-shows
│   ├── /aftercare-automation
│   └── /...（持续增加）
├── /download                        ← App 下载页
├── /about                           ← 关于
├── /contact                         ← 联系/注册
└── /app/*                           ← PWA 应用（React SPA，/app/ 路径下）
```

---

## 二、Landing Page（首页）详细结构

### Hero Section
```
H1: The All-in-One Management Platform for Tattoo Studios
H2: From booking to aftercare — run your entire studio from one app.
CTA: [Start Free Trial] [See Features]

背景：工作室工作场景图/产品截图轮播
```

### Social Proof Bar
```
"Trusted by 500+ tattoo studios worldwide"
G2 Rating: 4.8/5  |  Capterra: 4.7/5  |  GetApp: 4.9/5
```

### Key Features Grid（6 大核心功能）
每个功能卡片：
```
图标 + 标题 + 一句话描述 + [Learn More →]

1. 📅 Smart Booking
   Deposit-based scheduling with automated reminders.

2. 💳 POS & Payments
   Stripe-powered POS, commission splitting, tips.

3. 📋 Digital Waivers
   Paperless intake with e-signatures, QR check-in.

4. 📦 Inventory Tracking
   Ink, needle, supply tracking with low-stock alerts.

5. 🤝 Client CRM
   360° client history, tags, follow-ups, referrals.

6. 📈 Analytics
   Real-time dashboard, revenue reports, artist performance.
```

### How It Works（3 步）
```
Step 1: Set up your studio — 5 min
   Add artists, services, prices, hours.
Step 2: Go live — 1 hour
   Custom booking link, embed on your website.
Step 3: Grow — ongoing
   Automated reminders, aftercare, reviews.
```

### Pricing Preview
```
Free · $0     → Solo artist, basic booking
Pro · $29/mo  → Full features, multi-artist
Plus · $49/mo → Custom domain, priority support

[See full pricing →]
```

### FAQ Section（GEO 优化，每段独立可引用）
```
Q: What makes InkFlow different from other tattoo studio software?
A: ...（结论前置，150 字内）

Q: Can I accept deposits through InkFlow?
A: ...

Q: Does InkFlow work on iPad?
A: ...
```

### Footer
```
产品: Features | Pricing | Download | Integrations
对比: vs Tattoo Studio Pro | vs Tattoogenda | vs Booksy | vs Vagaro
资源: Blog | Help Center | API Docs
公司: About | Contact | Privacy | Terms
Social: X/Twitter | YouTube | Instagram
```

---

## 三、功能页模板（共 8 个功能页，统一结构）

### URL 模式
`/features/{slug}`

### SEO Meta
```
title: {Feature Name} for Tattoo Studios — InkFlow
description: {一句话价值主张，含关键词，≤160字}
og_type: website
json-ld: WebPage schema
```

### 页面结构
```
H1: Smart {Feature} for Tattoo Studios
  → 一句话结论前置（GEO 优化）

H2: Why {Feature} Matters
  → 痛点描述（2-3 句）

H2: How InkFlow Handles {Feature}
  → 产品截图/GIF + 说明
  → 3-4 个核心功能点，每点独立段落

H2: {Feature} That Grows With You
  → Free / Pro / Plus 各有什么

CTA Section: Ready to simplify your {feature}?
  [Start Free Trial] [Book a Demo]

FAQ（3-5 个，AI-friendly Q&A 格式）
```

### 内链策略
- 每个功能页底部链到相关功能页（如 Waivers → Aftercare）
- 正文中链到定价页
- FAQ 中链到对比页

---

## 四、对比页模板

### URL 模式
`/compare/{competitor-slug}`

### SEO Meta
```
title: InkFlow vs {Competitor} — Honest Comparison
description: How InkFlow compares to {Competitor}. Compare features, pricing, and more for your tattoo studio.
```

### 页面结构
```
H1: InkFlow vs {Competitor}: Which Is Better for Your Studio?

H2: Quick Verdict（结论前置）
  → "If you need X, choose InkFlow. If you need Y, choose {Competitor}."

H2: Feature Comparison Table
  | Feature | InkFlow | {Competitor} |
  |---------|---------|-------------|
  | Booking | ✅ | ✅ |
  | Digital Waivers | ✅ Included | ⚠️ Add-on |
  | Commission Split | ✅ | ❌ |
  | ... | ... | ... |

H2: Pricing Comparison
  InkFlow: Free / $29 / $49
  {Competitor}: $xx / $xx

H2: What Users Say
  引用 G2/Trustpilot 的评价

H2: Why Switch to InkFlow
  3 个核心理由

CTA: [Try InkFlow Free] [See All Features]

FAQ Schema（结构化数据标记）
```

---

## 五、博客模板

### URL 模式
`/blog/{post-slug}`

### SEO Meta
```
title: {Blog Title} — InkFlow Blog
description: {≤160字，含目标关键词}
og_type: article
json-ld: Article schema（含 publishDate, author）
```

### 文章结构
```
H1: {Title}（含目标关键词）
  → 2-3 句摘要（结论前置，GEO 优化）

H2: {Section 1}
  → 分段内容，每段 50-150 字，独立可引用
  → 列表/表格优先

H2: {Section 2}
  → 同上

H2: {Section 3}

H2: Frequently Asked Questions
  → 3-5 个 Q&A（FAQ schema）

CTA: Ready to {action}? [Try InkFlow Free]
```

### 内链规则
- 正文中自然链接到相关功能页
- 底部链到相关博客文章（Related Posts）
- 首次出现相关功能时链到功能页

---

## 六、导航菜单

### Header（桌面端）
```
[Logo]  Features ▾  Pricing  Compare ▾  Blog  [Start Free Trial]

Features ▾: Booking · POS · CRM · Waivers · Inventory · Aftercare
Compare ▾: vs Tattoo Studio Pro · vs Tattoogenda · vs Booksy
```

### Header（移动端）
```
[Logo] [Menu ☰]
☰ → 全部导航项 + CTA
```

### 面包屑
```
Home > Compare > InkFlow vs Tattoo Studio Pro
```

---

## 七、技术实现

### Astro 项目结构
```
marketing/
├── astro.config.mjs
├── package.json
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── pricing.astro
│   │   ├── download.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── features/
│   │   │   ├── index.astro        （功能总览）
│   │   │   └── [slug].astro       （功能详情）
│   │   ├── compare/
│   │   │   └── [slug].astro       （对比页）
│   │   ├── alternatives/
│   │   │   └── [slug].astro       （替代品页）
│   │   └── blog/
│   │       ├── index.astro        （博客列表）
│   │       └── [slug].astro       （博客详情）
│   ├── layouts/
│   │   ├── BaseLayout.astro       （通用布局：header + footer）
│   │   ├── BlogLayout.astro       （博客布局：+ 侧边栏）
│   │   └── FeatureLayout.astro    （功能页布局）
│   ├── components/
│   │   ├── SEOHead.astro           （统一 SEO meta 管理）
│   │   ├── Navbar.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── FeatureCard.astro
│   │   ├── PricingCard.astro
│   │   ├── CTASection.astro
│   │   ├── ComparisonTable.astro
│   │   ├── FAQ.astro
│   │   ├── Breadcrumb.astro
│   │   └── RelatedPosts.astro
│   ├── content/                   （Content Collections）
│   │   ├── config.ts              （Schema 定义）
│   │   ├── blog/                  （Markdown 博客）
│   │   └── features/              （功能页数据）
│   └── lib/
│       ├── jsonld.ts              （JSON-LD 生成）
│       └── i18n.ts                （多语言 UI 文案）
├── public/
│   ├── robots.txt
│   ├── og-images/                 （默认 OG 图片）
│   └── favicon.ico
└── tailwind.config.js             （共享 PWA 的 Tailwind 主题）
```

### 构建 + 部署
```
构建:
  npm run build         → Astro 输出到 dist/
  npm run build:pwa     → Vite 输出到 dist-pwa/
  node combine.js       → 合并到 dist/ + app/

部署:
  npx wrangler pages deploy dist/
```

---

## 八、SEO 技术配置

### 全局 SEOHead 组件
每个页面自动注入：
```html
<title>{page title} | InkFlow</title>
<meta name="description" content="{description}" />
<link rel="canonical" href="{url}" />
<meta property="og:title" content="{title} | InkFlow" />
<meta property="og:description" content="{description}" />
<meta property="og:type" content="{type}" />
<meta property="og:url" content="{url}" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">{JSON-LD}</script>
```

### Sitemap
自动生成，含所有页面 URL。
对比页和功能页 priority: 0.9
博客文章 priority: 0.7

### Robots.txt
```
User-agent: *
Allow: /
Sitemap: https://inkflow.com/sitemap-index.xml
```

---

## 九、内容日历（前 4 周）

| 周 | 周一 | 周二 | 周三 | 周四 | 周五 |
|----|------|------|------|------|------|
| W1 | 建站+域名 | G2/Capterra注册 | Landing Page | 功能页×2 | 功能页×2 |
| W2 | 对比页×1 | 对比页×1 | 对比页×1 | 替代品页×1 | 博客×1 |
| W3 | 功能页×2 | 对比页×1 | 博客×1 | 功能页×2 | 博客×1 |
| W4 | 替代品页×1 | 博客×1 | 对比页×1 | 博客×1 | 收尾+检查 |

每天提交 1-3 个外链（跟内容并行）。
