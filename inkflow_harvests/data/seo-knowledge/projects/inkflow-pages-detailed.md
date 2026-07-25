# InkFlow 逐页详细规划

---

## 页面总数

| 类型 | 数量 | 说明 |
|------|------|------|
| Landing Page | 1 | 首页 |
| 功能页 | 8 | Booking / POS / CRM / Waivers / Inventory / Aftercare / Analytics / Marketing |
| 对比页 | 5 | vs Tattoo Studio Pro / Tattoogenda / Booksy / Vagaro / InkBook |
| 替代品页 | 3 | Best Software / TSP Alternatives / Booksy Alternatives |
| 定价页 | 1 | Pricing |
| 博客 | 10+ | 首批 10 篇，持续增加 |
| 其他 | 4 | Download / About / Contact / 404 |
| **总计** | **32+** | 首批，后续扩展 |

---

## 1. LANDING PAGE（首页）

**URL:** `/`
**Title:** Tattoo Studio Management Software | InkFlow
**Description:** All-in-one tattoo studio management platform. Booking, POS, CRM, digital waivers, inventory & aftercare. Start free.
**Keywords:** tattoo studio management software, tattoo booking system, tattoo shop POS

### Hero Section
```
H1: The Only Platform Your Tattoo Studio Will Ever Need
H2: From first booking to healed aftercare — manage every part of your studio in one app.

图片: MacBook + iPad 展示产品界面的实机截图（横向排列）
      用 Figma 做一张合成图：左侧 Mac 显示 Today Dashboard，右侧 iPad 显示 Booking Calendar

CTA 按钮: [Start Free Trial →]  [See Features →]
```

### Social Proof Bar
```
"Trusted by 500+ studios worldwide"
Icon: G2 Rating 4.8/5  |  Capterra 4.7/5  |  GetApp 4.9/5
（用 G2/Capterra 的官方 badge 图片，去对应平台下载）
```

### Key Features Grid（6 大功能）

布局：3列×2行，每行3个卡片

```
Feature Card 模板:
  Icon（Lucide 图标） + H3 + 一句话 + 绿链 Learn More

1. Smart Booking
   H3: Deposit-Based Scheduling
   图片: 产品 Booking 页面的截图，标注 "deposit" 和 "reminder" 标签
   链: /features/booking

2. POS & Payments
   H3: Point of Sale with Commission Split
   图片: POS 页面截图，显示收银台界面
   链: /features/pos

3. Digital Waivers
   H3: Paperless Consent Forms
   图片: Waiver 截图（iPad 上签名界面）
   链: /features/waivers

4. Client CRM
   H3: 360° Client History
   图片: 客户详情页截图，显示标签、历史预约、消费记录
   链: /features/crm

5. Inventory
   H3: Ink & Needle Tracking
   图片: 库存管理页面截图，显示库存列表和低库存警告
   链: /features/inventory

6. Aftercare
   H3: Automated Follow-Up
   图片: 售后自动化邮件模板截图
   链: /features/aftercare
```

### How It Works（3 步）

```
H2: Get Your Studio Online in Minutes

Step 1 — Set Up
  H3: Configure your studio
  图片: 设置向导页面截图
  文案: Add artists, services, pricing, and business hours. It takes 5 minutes.

Step 2 — Go Live
  H3: Share your booking link
  图片: Booking 分享页面截图（显示 QR code + 分享按钮）
  文案: Share your personalized booking link on Instagram, your website, or as a QR code.

Step 3 — Grow
  H3: Automate your workflow
  图片: Analytics 仪表盘截图
  文案: Automated reminders, aftercare, reviews — your studio runs itself.
```

### CTA Section（全宽 Banner）

```
H2: Ready to Transform Your Studio?
H3: Join 500+ studios already using InkFlow. Free trial, no credit card required.
图片: 尾部的浅色背景 + 产品截图拼贴

CTA: [Start Free Trial →]  [Book a Demo →]
```

### FAQ Section（GEO 优化，8 个问答）

```
H2: Frequently Asked Questions

Q1: Is InkFlow really free for solo artists?
A1: Yes. Our Free plan supports solo artists with basic booking and client management. ...
  → 结论前置，不超过 80 字

Q2: Can I accept deposits through InkFlow?
A2: Absolutely. InkFlow integrates with Stripe to collect deposits at the time of booking. ...

Q3: Does InkFlow work on iPad?
A3: Yes. InkFlow is a PWA that works on any device — iPhone, iPad, Android, and desktop. ...

Q4: Can I have multiple artists on one account?
A4: Yes. Our Pro plan supports up to 10 artists with individual calendars, commission tracking, and shared client database. ...

Q5: What payment methods are supported?
A5: InkFlow uses Stripe for payment processing. You can accept credit cards, debit cards, Apple Pay, and Google Pay. ...

Q6: Is my data secure?
A6: All data is encrypted in transit and at rest. We use Cloudflare for CDN and DDoS protection. ...

Q7: Can I import my existing client data?
A7: Yes. InkFlow supports CSV import for clients, appointments, and inventory. ...

Q8: Do you offer a demo?
A8: Yes. Book a personal demo with our team. We'll walk through your specific needs. ...

结构化数据: FAQPage schema
```

### Footer

```
Logo + 一句话描述

功能: Booking | POS | CRM | Waivers | Inventory | Aftercare | Analytics
对比: vs Tattoo Studio Pro | vs Tattoogenda | vs Booksy | vs Vagaro
资源: Blog | API Docs | Pricing | Download
公司: About | Contact | Privacy Policy | Terms of Service

© 2026 InkFlow.
```

---

## 2. 功能页 — BOOKING（预约管理）

**URL:** `/features/booking`
**Title:** Tattoo Booking Software — Online Scheduling & Deposits | InkFlow
**Description:** Reduce no-shows with deposit-based booking. Automated reminders, multi-artist scheduling, and online booking for tattoo studios.
**Keywords:** tattoo booking software, online scheduling, deposit booking

### 页面结构

```
H1: Smart Booking Software for Tattoo Studios

  图片: Booking Dashboard 全屏截图（浏览器全宽）
  说明: 用产品真实截图，Chrome 浏览器窗口 + InkFlow 日历界面
  尺寸: 1200×675px，WebP 格式

H2: The Problem with Traditional Booking
  <p>Missed appointments, double-bookings, endless phone calls...</p>
  <p>These problems cost studios an average of $12,000/year in lost revenue.</p>

H2: How InkFlow Fixes Booking

  H3: Deposit-Required Scheduling
    图片: Booking 设置截图，显示 "Deposit Required" 开关
    尺寸: 600×400px
    <p>Require a deposit at the time of booking. Clients commit, no-shows drop by 80%.</p>

  H3: Automated Reminders
    图片: Reminder 邮件/SMS 截图
    尺寸: 600×400px
    <p>SMS and email reminders 48h and 24h before each appointment. Customizable templates.</p>

  H3: Multi-Artist Calendar
    图片: 周视图日历截图，每个纹身师不同颜色
    尺寸: 900×500px
    <p>See every artist's schedule at a glance. Drag-and-drop to reschedule.</p>

  H3: Online Booking Widget
    图片: 嵌入到工作室官网的 booking widget 截图
    尺寸: 400×600px（手机竖屏）
    <p>Embed a booking button on your website. Clients book without picking up the phone.</p>

  H3: Waitlist Management
    <p>If an artist has a cancellation, the next person on the waiting list gets notified automatically.</p>

H2: Booking Features Comparison

  | Feature | InkFlow | Competitors |
  |---------|---------|-------------|
  | Deposit at booking | ✅ Included | ⚠️ Add-on |
  | SMS reminders | ✅ Unlimited | ⚠️ Per message |
  | Multi-artist | ✅ Up to 10 | ❌ Extra fee |
  | Online widget | ✅ Free | ⚠️ Limited |

H2: Pricing
  Free: Basic booking, 1 artist
  Pro: $29/mo — Full booking, 10 artists
  Plus: $49/mo — Custom domain, priority

CTA: [Start Free Trial →]

FAQ（3-5 个 booking 相关的 Q&A）
```

---

## 3. 对比页 — INKFLOW VS TATTOO STUDIO PRO

**URL:** `/compare/tattoo-studio-pro`
**Title:** InkFlow vs Tattoo Studio Pro (2026) — Honest Comparison
**Description:** Compare InkFlow vs Tattoo Studio Pro. Features, pricing, and which is best for your tattoo studio.
**Keywords:** tattoo studio pro vs inkflow, tattoo studio pro alternatives

### 页面结构

```
H1: InkFlow vs Tattoo Studio Pro: Which is Right for Your Studio?

H2: Quick Verdict
  <p>If you're a solo artist or small studio looking for an affordable, all-in-one solution with built-in waivers and aftercare, choose InkFlow.
  If you need enterprise-level features for 25+ artists, Tattoo Studio Pro's Legion plan might be worth the premium.</p>

H2: Feature Comparison

  | Feature | InkFlow | Tattoo Studio Pro |
  |---------|---------|-------------------|
  | Starting Price | $0/mo | $29/mo |
  | Deposit Booking | ✅ | ✅ |
  | Digital Waivers | ✅ Included | ✅ Included |
  | Commission Split | ✅ | ✅ |
  | Aftercare Automation | ✅ | ❌ |
  | SMS Reminders | ✅ Unlimited | ⚠️ Limited |
  | Free Plan | ✅ Forever | ❌ 30-day trial |
  | Multi-Language | ✅ 7 languages | ❌ English only |
  | Inventory Tracking | ✅ | ✅ |

  （对比数据来源：Tattoo Studio Pro 官网 + G2 评价）

H2: Pricing Comparison

  InkFlow:       Free $0 | Pro $29 | Plus $49
  Tattoo Studio Pro: Solo $29 | Crew $69 | Tribe $119 | Legion $299

H2: What Real Users Say
  引用 G2 评价（双方各 1-2 条）

H2: Why Switch to InkFlow
  1. Better value for small-medium studios
  2. Built-in aftercare automation
  3. Free plan with no time limit
  4. Multi-language support

CTA: [Try InkFlow Free →]

H2: Frequently Asked Questions
  Q: Can I import data from Tattoo Studio Pro?
  A: Yes, InkFlow supports CSV import...

（FAQPage schema + Product comparison schema）
```

---

## 4. 博客页 — HOW TO DIGITIZE TATTOO WAIVERS

**URL:** `/blog/how-to-digitize-tattoo-waivers`
**Title:** How to Digitize Tattoo Waivers — Complete Guide 2026 | InkFlow
**Description:** Go paperless with digital tattoo consent forms. Save time, reduce liability, and improve client experience.
**Keywords:** digital tattoo waiver, consent form app, paperless intake

### 页面结构

```
H1: How to Digitize Tattoo Waivers in 2026
  <p>Paper waivers are slow, easy to lose, and hard to organize. Here's how to go fully digital.</p>
  图片: 纸质 waiver 堆 vs iPad 上的数字 waiver 对比图（二合一）
  尺寸: 800×400px

H2: Why Go Digital?

  H3: Save Time
  <p>Clients fill out waivers before arrival. Average check-in time drops from 5 minutes to 30 seconds.</p>
  图片: QR code 签到截图
  尺寸: 400×400px

  H3: Reduce Liability
  <p>Digital waivers with timestamps and e-signatures hold up better in legal disputes than paper.</p>

  H3: Stay Organized
  <p>Search any client's signed waiver in seconds. No more filing cabinets.</p>

H2: What to Look For in a Digital Waiver Solution

  <ul>
    <li>Legally binding e-signatures</li>
    <li>Conditional logic (show different questions based on answers)</li>
    <li>PDF export for backup</li>
    <li>Medical history tracking</li>
    <li>Parental consent for minors</li>
  </ul>
  图片: Waiver 表单截图，显示条件逻辑（如果选 "Yes" 出现新的问题）
  尺寸: 600×800px（手机竖屏）

H2: How InkFlow Handles Waivers
  <p>InkFlow's built-in waiver system covers all of the above at no extra cost...</p>

  Step 1: Customize template
  Step 2: Send link or use QR code
  Step 3: Client signs on their phone
  Step 4: Stored forever, searchable
  图片: 4 步流程示意图（用 Figma 画）

H2: Start Digitizing Today
  <p>Ready to ditch paper waivers? InkFlow includes digital waivers on every plan.</p>
CTA: [Try InkFlow Free →]

FAQ（3-5 个 waiver 相关问题）
Related Posts: /blog/aftercare-automation, /features/waivers
```

---

## 5. 定价页

**URL:** `/pricing`
**Title:** Pricing — InkFlow Tattoo Studio Software
**Description:** Free for solo artists. Pro $29/mo for full features. Plus $49/mo for custom domain. Start free, upgrade anytime.

### 页面结构

```
H1: Simple Pricing for Every Studio

H2: Compare Plans

3 列定价卡片：

Free — $0
  • 1 artist
  • Basic booking
  • Client management
  • Unlimited appointments
  CTA: [Get Started Free]

Pro — $29/mo
  • Up to 10 artists
  • Everything in Free +
  • Digital waivers
  • POS & payments
  • SMS reminders
  • Inventory tracking
  • Aftercare automation
  CTA: [Start Pro Trial]

Plus — $49/mo
  • Everything in Pro +
  • Custom domain
  • Priority support
  • Analytics dashboard
  CTA: [Start Plus Trial]

H2: All Plans Include
  ● Secure cloud storage ● Multi-language ● Regular updates ● Email support

H2: Frequently Asked Questions
  Q: Can I switch plans anytime?
  Q: Is there a contract?
  Q: What payment methods do you accept?
  Q: Can I cancel anytime?
```

---

## 6. 下载页

**URL:** `/download`
**Title:** Download InkFlow — Install on Any Device
**Description:** InkFlow is a PWA that works on any device. No app store needed.

```
H1: Use InkFlow on Any Device

H2: Install on iPhone/iPad
  步骤 1-3 配截图
  图片: Safari 分享菜单截图，突出 "Add to Home Screen"

H2: Install on Android
  步骤 1-3 配截图
  图片: Chrome 菜单截图，突出 "Install App"

H2: Desktop (Coming Soon)
  图片: 灰色占位，标注 "Coming 2026"

H2: Why Use the PWA?
  ● Works offline ● Push notifications ● Fast loading ● Auto-updates
```

---

## 7. 图片策略

### 图片来源

| 类型 | 来源 | 要求 |
|------|------|------|
| **产品截图** | 从 InkFlow 实际界面截取 | 真实数据，不要用 lorem ipsum |
| **界面合成图** | Figma 做设备框合成 | MacBook + iPad + iPhone 组合 |
| **流程图** | Figma / Excalidraw | 统一的样式，品牌色 |
| **对比图** | Figma | 前/后对比，纸 vs 数字 |
| **图标** | Lucide React 图标库 | 跟 PWA 一致 |
| **OG 图片** | Figma 模板 + 自动生成 | 每篇内容一个模板 |

### 图片格式

| 用途 | 格式 | 最大尺寸 |
|------|------|---------|
| Hero 大图 | WebP | 1920×800px |
| 功能截图 | WebP | 1200×675px |
| 卡片图 | WebP | 600×400px |
| 手机截图 | WebP | 400×800px |
| 图标 | SVG | 48×48px |
| OG 图片 | PNG | 1200×630px |

### Alt 文本规则
每张图片都必须写 alt 文本，格式：
```
截图: "InkFlow {页面名} showing {核心内容} — {页面用途}"
图标: "{图标名} icon"
流程图: "{流程名} — Step 1: {说明}, Step 2: {说明}"
```

---

## 8. 每页 CTA 规则

| 页面类型 | CTA 位置 | CTA 文案 |
|---------|---------|---------|
| Landing Page | Hero + 中部 + 底部 | "Start Free Trial" / "See Features" |
| 功能页 | 底部 | "Try InkFlow Free" |
| 对比页 | 对比表后 + 底部 | "Try InkFlow Free" |
| 博客 | 内容后 | "Ready to {action}? Try InkFlow" |
| 定价页 | 每张卡片 | "Get Started Free" / "Start Pro Trial" |
| 下载页 | 底部 | "Get InkFlow Now" |
