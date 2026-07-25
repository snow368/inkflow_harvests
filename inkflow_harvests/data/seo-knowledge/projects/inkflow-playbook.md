# InkFlow SEO 执行章程

学习来源：10+ 个 X SEO 账号，包含中文出海圈和国际 SEO 专家
制定日期：2026/06/01

---

## 第一阶段：基建（域名下来后第 1 周）

### Day 1：域名 + 邮箱 + GSC
1. 注册域名 `inkflow.com`
2. 配邮箱 `hello@inkflow.com`
3. 提交 Google Search Console
4. 配置 IndexNow（内容发布时主动推送搜索引擎）
5. 写 robots.txt（允许爬虫，不需屏蔽任何路径）
6. PWA 改 base 为 `/app/`（`vite.config.ts` + `BrowserRouter basename="/app"`）
7. Cloudflare `_redirects` 配置 SPA fallback：`/app/*  /app/index.html  200`

### Day 2：注册外链平台
按优先级注册以下平台，完善 profile：

| 平台 | DR | 操作 | 耗时 |
|------|----|------|------|
| G2 | 90+ | 注册公司 profile，填产品信息 | 15min |
| Capterra | 90+ | 同上 | 15min |
| GetApp | 85+ | 同上 | 10min |
| Trustpilot | 90+ | 注册公司 profile，邀请评价 | 10min |
| Crunchbase | 91 | Profile 添加 Company + Website | 10min |

### Day 3-4：建营销官网
- Astro SSG 建站
- Landing Page（Hero + 功能 + 定价 + CTA）
- Feature 页模板（可复用于 18 个功能页）
- 博客系统
- 每个页面加：
  - ✅ Schema 结构化数据（SoftwareApplication）
  - ✅ Open Graph meta
  - ✅ Canonical URL
  - ✅ 段落结论前置（GEO 友好）
  - ✅ 表格/列表优先（LLM 友好）

### Day 5-7：提交流程站外链
按此顺序提交，每天 3-5 个，间隔 1-3 分钟：

**Day 5:** GitHub awesome-list × 5 + SaaSHub + submitaitools
**Day 6:** Crunchbase + startupfa + instapaper + altervista + codeberg
**Day 7:** updown.io + dang.ai + fazier + twelve.tools + Neil Patel AI Tools

---

## 第二阶段：内容（第 2-4 周）

### 内容生产流程
```
我写初稿（基于产品功能 + 竞品 + 关键词表）
  → 你审（15分钟，加行业洞察）
    → 定稿
      → 发布到 Astro 博客/功能页
        → IndexNow 推送
          → X/Twitter 同步
```

### 20 篇内容计划

**对比页（转化最高，先做）：**
1. InkFlow vs Tattoo Studio Pro
2. InkFlow vs Tattoogenda
3. InkFlow vs Booksy
4. InkFlow vs Vagaro
5. InkFlow vs InkBook

**替代品页（截留流量）：**
6. Best Tattoo Studio Management Software 2026
7. Tattoo Studio Pro Alternatives
8. Booksy for Tattoo Shops: Better Alternatives
9. Best Free Tattoo Booking Software
10. Tattoo Shop POS System Comparison

**功能页（长尾词入口）：**
11. Digital Tattoo Waivers: Complete Guide
12. Tattoo Aftercare Automation
13. Multi-Artist Commission Tracking
14. Tattoo Appointment Reminder Software
15. Tattoo Shop Inventory Management

**指南（建立权威）：**
16. How to Start a Tattoo Studio (Software Guide)
17. Reduce No-Shows with Deposit Booking
18. Tattoo Client Management Best Practices
19. From IG DMs to Booking System
20. Tattoo Studio Marketing Automation

### 内容质量标准
- 每页只做一个搜索意图（不贪多）
- 段落前置答案（GEO 优化）
- 表格 + 列表优先（LLM 友好）
- 关键段落可被独立引用
- 每页有 CTA 引导注册

---

## 第三阶段：自动化外链（第 3 周起持续）

### 嵌入式外链（产品杠杆）
开发 Embedded Booking 挂件，底部自动带 "Powered by InkFlow"：
```html
Booking powered by <a href="https://inkflow.com">InkFlow</a>
```
用户越多，外链自动涨。

### 每日外链打卡（参考 @anson7956 + @JoeyYUDENG 模式）
每天提交 1-3 个新目录站/导航站，持续 100 天。

### 外链资源池（持续补充）
订阅关注以下账号的外链分享：
- @houzhongji89090 — 每天发免费高 DR 外链
- @anson7956 — 100 天外链打卡
- @JoeyYUDENG — 100 天外链打卡

---

## 第四阶段：排名爬坡（第 2-6 月）

### DR 增长路径

| 阶段 | DR 目标 | 动作 |
|------|---------|------|
| 第 1 月 | 0→15 | G2 + Capterra + Trustpilot + 目录站 20 个 |
| 第 2 月 | 15→25 | 嵌入式挂件 + SaaS 目录 + GitHub awesome-list |
| 第 3 月 | 25→35 | 集成伙伴目录（Stripe 等）+ Guest Post × 3 |
| 第 6 月 | 35+ | 自然外链积累 + 对比页被引用 + 品牌搜索 |

### 关键词梯队推进

| 阶段 | 做哪些词 |
|------|---------|
| 第 1-2 月 | KD 0-15 的长尾词（功能页+对比页） |
| 第 3-4 月 | KD 15-30 的中等词（扩展对比页+博客） |
| 第 5-6 月 | KD 30-40 的核心品类词（Landing Page 优化） |

### 每周检查
- GSC 查看收录和排名变化
- 对比页转化率跟踪
- 外链打卡进度
- 内容发布计划执行

---

## 避坑清单

| 不要做 | 为什么 |
|--------|-------|
| 批量替换关键词的 Programmatic 页面 | Google 2026 更新会降权 |
| 付费买 PBN 外链 | 被 Google 发现直接惩罚 |
| 一天提交 50+ 外链 | 触发垃圾检测 |
| 只发内容不互动 | X 账号会被判定机器人 |
| AI 纯生成不审核 | 内容质量差，没转化 |
| 功能做太多 | 一期聚焦核心功能 |
