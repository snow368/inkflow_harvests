# Meta 标签规则（SEO）

---

## 适用分类
关键词研究, 技术SEO

## Title（最重要的 SEO 元素）

| 规则 | 说明 | 例子 |
|------|------|------|
| **长度** | ≤60 字符 | 超了 Google 会截断... |
| **关键词前置** | 最重要的词放最前面 | ✅ "Tattoo Booking Software — InkFlow" |
| **每页唯一** | 不能重复 | 每个页面不同 title |
| **品牌放最后** | 分隔符用 `—` 或 `\|` | "Digital Waivers for Tattoo Studios \| InkFlow" |
| **不要堆砌** | 不要重复关键词 | ❌ "Booking Software, Tattoo Booking, Studio Booking" |

**格式：** `{目标关键词} — {品牌名}`

**例子：**
```
首页：    "Tattoo Studio Management Software — InkFlow"
Booking： "Tattoo Booking Software — Online Scheduling & Deposits | InkFlow"
Waivers： "Digital Tattoo Consent Form App — InkFlow"
Aftercare："Tattoo Aftercare Automation — Automated Follow-Ups | InkFlow"
对比页：  "InkFlow vs Tattoo Studio Pro — Honest Comparison (2026)"
博客：    "How to Digitize Tattoo Waivers in 2026 — InkFlow Blog"
```

---

## Description（影响点击率）

| 规则 | 说明 |
|------|------|
| **长度** | ≤155 字符 |
| **含关键词** | 目标词自然出现 1 次 |
| **含价值** | 告诉用户点进来能得到什么 |
| **含 CTA** | "Start free" / "Try it" |
| **每页唯一** | 不能重复 |
| **不要堆砌** | 自然语句 |

**格式：** `{价值主张} + {关键功能/数据} + {CTA}`

**例子：**
```
Booking:
  "Reduce no-shows with deposit-based tattoo booking software. 
   Automated reminders, multi-artist scheduling. Start free."

Waivers:
  "Go paperless with a digital tattoo consent form app. 
   E-signatures, QR check-in, medical history tracking. Try InkFlow."

Aftercare:
  "Automate tattoo aftercare with healing check-ins and review requests. 
   Studios using InkFlow see 40% more healed photo submissions."
```

---

## OG Meta（社交分享用）

```
<meta property="og:title" content="{Title} | InkFlow" />
<meta property="og:description" content="{Description}" />
<meta property="og:image" content="https://inkflow.com/og-image.jpg" />
<meta property="og:url" content="{页面 URL}" />
<meta property="og:type" content="website" />
```

用户分享到 X/LinkedIn/Twitter 时显示这些内容。

---

## Twitter Card

```
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{Title} | InkFlow" />
<meta name="twitter:description" content="{Description}" />
<meta name="twitter:image" content="..." />
```

---

## 其他 Meta

| 标签 | 用途 | 加不加 |
|------|------|--------|
| **keywords** | 已不用于排名 | ❌ 不加 |
| **viewport** | 移动端适配 | ✅ Astro 默认加 |
| **charset** | UTF-8 | ✅ Astro 默认加 |
| **robots** | 控制爬虫 | ✅ 只有特殊页面加（noindex） |
| **canonical** | 防重复内容 | ✅ 每页加 |
