# InkFlow 内容 + 图片 + 内链执行手册

---

## 一、内容怎么写（每页固定结构）

### 功能页标准模板（8 个功能页统一）

```
【H1】{关键词} for Tattoo Studios
  首段（100-150字）：结论前置
    → "Running a tattoo studio means juggling {痛点}..."
    → 结尾链到 Booking 功能页

【H2】The Problem with Traditional {Topic}
  1-2 段：描述痛点，数据支撑（如果有）
  每段 50-100 字

【H2】How InkFlow Fixes {Topic}
  【H3】{Feature 1}: {一句话说明}
    1 段（80-120字）说明功能 + 链到相关功能页
    【图片】：产品截图

  【H3】{Feature 2}: {一句话说明}
    同上

  【H3】{Feature 3}
    同上

  【H3】{Feature 4}
    同上

【H2】{Topic} Features at a Glance
  对比表：InkFlow vs 竞品

【CTA】Ready to {行动}?
  [Start Free Trial →]

【FAQ】3-5 个 Q&A
  Q: Can InkFlow {do something}?
  A: Yes. {结论前置}...
  （结构化数据：FAQPage schema）
```

### 对比页标准模板（5 个对比页统一）

```
【H1】InkFlow vs {Competitor}: Which is Better for Your Studio?
  首段：结论前置
    → "If you need {A}, choose InkFlow. If you need {B}, choose {Competitor}."

【H2】Feature Comparison
  表格：

  | Feature | InkFlow | {Competitor} |
  | Booking | ✅ | ✅ |
  | Digital Waivers | ✅ Included | ⚠️ Add-on |
  | Commission Split | ✅ | ❌ |

【H2】Pricing Comparison
  InkFlow Free / Pro $29 / Plus $49
  {Competitor} $xx / $xx / $xx

【H2】What Users Say
  引用 G2/Trustpilot 评价各 1 条

【H2】Why Switch to InkFlow
  3-4 个核心理由，每点 1 句

【CTA】[Try InkFlow Free →]

【FAQ】3-5 个 Q&A
```

### 博客标准模板

```
【H1】{Title with target keyword}
  首段：摘要 + 结论前置（80-120字）
    → 告诉读者"读完能解决什么问题"

【H2】{Section 1}
  2-3 段，每段 50-120 字
  每段能被独立引用（GEO 优化）
  中间自然插入 1 张图

【H2】{Section 2}
  同上

【H2】{Section 3}
  同上

【CTA】Ready to {action}? Try InkFlow. [Start Free Trial]

【FAQ】3 个相关问答
```

---

## 二、图片怎么弄

### 图片来源

| 类型 | 做法 | 工具 |
|------|------|------|
| **产品截图** | 直接在 InkFlow 界面截图 | 系统自带截图 |
| **设备合成图** | 截图套进 MacBook/iPad/iPhone 框 | 用 `screely.com` 或 Figma 模板 |
| **流程图** | 简单的步骤图，描述流程 | Excalidraw（免费）或 Figma |
| **对比图** | 前/后对比 | Figma |
| **图标** | Lucide 图标库（跟 PWA 一致） | lucide.dev |
| **OG 图** | 博客标配 1200×630 | Figma 模板，每篇替换标题 |

### 每页需要几张图

| 页面 | 最少 | 最多 | 说明 |
|------|------|------|------|
| Landing Page | 6 | 8 | Hero 主图 + 6 功能卡片各 1 + 尾部 |
| 功能页 | 4 | 5 | Hero 1 + 3-4 个子功能截图 |
| 对比页 | 0 | 1 | 不需要图，主要靠表格 |
| 博客 | 2 | 4 | 文章头部 1 + 正文 1-3 张 |
| 定价页 | 0 | 0 | 纯文字 |
| 下载页 | 4 | 6 | 各平台安装步骤截图 |

### 图片制作流程

```
第 1 步：截图
  → 打开 InkFlow 实际界面
  → Command+Shift+4（Mac）/ Win+Shift+S（Win）
  → 截取需要的区域

第 2 步：套设备框
  → 打开 screely.com
  → 上传截图
  → 选 MacBook / iPad / iPhone
  → 下载 PNG

第 3 步：转 WebP
  → 用 squoosh.app 压缩
  → 输出 WebP 格式
  → 控制在 200KB 以内

第 4 步：命名
  → inkflow-{page}-{feature}.webp
  → 例: inkflow-booking-calendar.webp
```

### 图片存放位置
```
marketing/public/images/
├── hero/            ← Landing Page 大图
├── features/        ← 功能页截图
│   ├── booking.webp
│   ├── pos.webp
│   ├── waivers.webp
│   └── ...
├── how-it-works/   ← 3 步流程
├── og/             ← OG 图片
└── download/       ← 下载页截图

命名规则：inkflow-{页面}-{描述}.webp
例：inkflow-booking-calendar.webp
```

### Alt 文本规则
```
截图： "InkFlow {页面名} showing {内容} — {用途}"
例：  "InkFlow booking showing weekly calendar with color-coded artists"

流程图："{流程名} — Step 1: {说明}, Step 2: {说明}"
例：  "Digital waiver flow — Step 1: Client scans QR, Step 2: Signs on phone"

图标：  "{名称} icon"
例：  "Calendar icon"
```

---

## 三、内链怎么连

### 每个页面必须有的内链

| 页面 | 必须链到 | 链的位置 |
|------|---------|---------|
| Landing Page | 8 个功能页（通过 Feature Cards） | Hero 下方 |
| 功能页 | 相关功能页（如 Waivers → Aftercare） | H2 正文中 |
| 功能页 | 定价页 | CTA 区 |
| 对比页 | InkFlow 对应的功能页 | 对比表后 |
| 对比页 | 定价页 | CTA 区 |
| 博客 | 相关功能页（首次提到该功能时） | 正文中 |
| 博客 | 相关博客（Related Posts） | 底部 |
| 博客 | 定价页 | CTA 区 |
| 定价页 | 功能页 × 3-4 | 功能对比区 |

### 内链锚文本规则

| 链向 | 锚文本 | 不要用 |
|------|--------|-------|
| Landing Page | "InkFlow" / "our platform" | "click here" |
| 功能页 | "InkFlow's {feature} feature" / "our {feature} tool" | "learn more" |
| 对比页 | "check our comparison" / "see how" | "this page" |
| 定价页 | "see our pricing" / "plans start at $29" | "pricing" |
| 博客 | "our guide to {topic}" / "how to {topic}" | "this article" |

### 内链数量

| 页面 | 最少 | 推荐 |
|------|------|------|
| Landing Page | 8 | 10-12（全功能页+定价） |
| 功能页 | 3 | 4-6 |
| 对比页 | 3 | 4-5 |
| 博客 | 2 | 3-4 |

### 不要互链的页面
```
对比页之间不要互链（InkFlow vs A → InkFlow vs B ❌）
博客之间不要太多互链（每篇只链 1 篇相关）
功能页不要链回 Landing Page
```

---

## 四、内容生产流程（我从 AI 角度的产出）

**每篇内容的产出格式：**

```markdown
---
title: "Digital Waivers for Tattoo Studios"
description: "..."
keywords: ["tattoo consent form app", "digital waiver tattoo"]
---

## H1: Digital Waivers for Tattoo Studios

[首段 100-150 字，结论前置]

## H2: ...
```

你拿到后要做的事：
```
1. 审内容 — 改行业术语、加真实案例、删 AI 味
2. 给截图 — 截图 + 告诉我放哪
3. 确认没问题 → 我发 Astro 发布
```

---

## 五、发布检查清单（每页都过一遍）

```
□ 标题含目标关键词
□ Description ≤160 字含目标词
□ H1 只有一个
□ H2 分段清晰，每段独立可引用
□ 每段 50-120 字（不长不短）
□ 图片有 alt 文本
□ 图片转 WebP ≤200KB
□ Canonical URL 正确
□ Open Graph meta 完整
□ FAQ 有结构化数据（功能页/对比页）
□ CTA 至少 1 个
□ 内链至少 3 条
□ Robots.txt 允许索引
□ Sitemap 已更新
```

---

## 六、内容审核流程（你我的分工）

### 我出初稿
```
1. 从关键词表选目标词
2. 按对应模板写出完整内容
3. 包含 H1-H3、段落、FAQ
4. 标注 [图片位置] 方便你截图
5. 标注 [链接:xxx] 方便我加链接
```

### 你审（15-20 分钟）
```
1. 改行业术语和表达
   → 删除 AI 味、改成你平时说话的方式
   → 加你实际做产品的洞察
2. 截图补充
   → 在每个 [图片位置] 处截图
   → 按命名规则保存
3. 确认内容准确
   → 功能描述对不对
   → 竞品对比有没有错
```

### 我改 + 发
```
1. 收到你确认后
2. 图片转 WebP 放进 /public/images/
3. 生成 Astro 页面
4. 自检（发布检查清单）
5. 发布
6. IndexNow 推送
```

---

## 七、发布节奏

| 阶段 | 每周篇数 | 频率 |
|------|---------|------|
| 第 1-4 周（冷启动） | 4-5 篇/周 | 工作日每天 1 篇 |
| 第 5-8 周 | 3 篇/周 | 一三五发 |
| 第 9 周+ | 2 篇/周 | 周二四发 |

最佳发布时段（美国）：周二三四早上 8-10am ET。避开周一和周五。

---

## 八、内容更新策略

| 类型 | 更新频率 | 触发条件 |
|------|---------|---------|
| 对比页 | 每 3 个月 | 竞品改价格/功能时 |
| 功能页 | 每 6 个月 | 产品功能更新时 |
| 博客 | 每 12 个月 | 数据过时/排名下降 |
| Landing Page | 每 3 个月 | 转化率下降 |

更新流程：检测到排名下降 → 检查内容是否过时 → 补充新数据 → 更新内链 → 改更新日期 → 重新提交 GSC

---

## 九、效果跟踪

### 第 1 周看
| 指标 | 及格线 |
|------|-------|
| Google 收录 | 提交 3 天内收录 |
| 索引关键词 | ≥5 个相关词 |
| 排名 | 前 50 页算正常 |

### 第 1 月看
| 指标 | 目标 |
|------|------|
| 长尾词排名 | 进前 20 |
| 日均点击 | ≥10 |
| CTR | ≥2% |

### 对比页特别跟踪
```
搜索 "InkFlow vs {竞品}" → 目标前 3
搜索 "{竞品} alternatives" → 目标前 5
```

---

## 十、转化路径

```
访客 → 内容页 → CTA → 注册页（邮箱+密码） → 确认邮件 → 首次登录 → 首次预约 → 活跃用户
```

注册页不设障碍，只问邮箱+密码，无信用卡。

---

## 十一、多语言

| 阶段 | 语种 | 时间 |
|------|------|------|
| Phase 1 | 仅英文 | 第 1-3 月 |
| Phase 2 | ES / PT / FR | 第 4 月+ |
| Phase 3 | DE / JP / ZH | 第 6 月+ |

翻译流程：原文定稿 → DeepSeek 翻译 → 复核 → 发布。先译 Landing + 3 核心功能 + 5 热门博客。

URL: /features/booking（英），/es/features/booking（西）

---

## 十二、邮件捕获

| 位置 | 形式 |
|------|------|
| 博客底部 | "Get weekly tattoo studio marketing tips" |
| 对比页 | 下载完整对比表 PDF（邮箱换内容） |
| Landing Page | Join 500+ studio owners |

Lead Magnet: "Tattoo Studio Software Comparison Checklist" — PDF 1 页

---

## 十三、社交媒体同步

每篇内容发布后在 X/Twitter 发帖总结 3 点。
Reddit r/tattoo、r/tattooadvice 相关讨论下参与（不硬推）。

---

## 十四、监控

| 项 | 工具 | 频率 |
|----|------|------|
| 收录 | GSC | 每周 |
| 排名 | GSC | 每月 |
| 死链 | Dr. Link Check | 每月 |
| 竞品变化 | 手动 | 每季度 |

---

## 十五、法律页面

/privacy — /terms — /cookies
用 Termly.io 或 GetTerms.io 生成模板，根据实际情况修改。

---

## 十六、404 页面

H1: Page Not Found
CTA: [Go to Homepage] [Browse Features]

---

## 十七、内容日历（第 1 月）

```
Week 1: 建站（Astro + 域名 + G2 注册 + 部署）
Week 2: 3 对比页 + 1 博客 + 1 功能页 + 外链每天 3 个
Week 3: 1 对比页 + 2 博客 + 2 功能页 + 外链每天 3 个
Week 4: 1 替代品页 + 2 博客 + 2 功能页 + 整体数据检查
```

---

## 十八、首页版本迭代

| 版本 | 时间 | 变化 |
|------|------|------|
| V1.0 | 上线 | 基础版 |
| V1.1 | 第 2 月 | 加客户评价轮播 |
| V1.2 | 第 3 月 | 加真实数据（"1243 studios"） |
| V2.0 | 第 6 月 | A/B test 优化转化 |
