# InkFlow 营销站执行指南

**来源：** 2026/06/05 SEO 深度分析 21 篇汇总
**状态：** 🔴 高优先 / 🟡 中优先 / 🟢 低优先 / ⚪ 上线后

---

## 一、首页

### Hero 区域 🔴

Goldikam A/B 测试方法论：Hero 不是 tagline，是 3 秒内向陌生人的推销。

**准备 3 个变体：**
```
A（控制）: "Tattoo Studio Management Software"
B（痛点导向）: "Stop Losing Clients to Paper and Spreadsheets"
C（预测胜者）: "Free Tattoo Studio Software. Client Management, Scheduling, and Payments in One Place."
```

→ 上线后用 A/B 工具跑 2 周，看哪个 CVR 高

### OG 卡 🔴

WeiYipei 教训：19 个页面重做 OG 卡后分享转化明显提升。

- 每个页面配 OG 卡（1200×630）
- 首页 OG 卡包含产品名 + 价值主张 + Logo
- 对比页 OG 卡突出对比对象名

---

## 二、BOFU 对比页（最高优先级的页面）

### 结构模板 🔴

来源：@boringlocalseo 决策工具框架 + @WeiYipei 实战验证

**不做成功能对比表，做成买家决策工具。**

```
H1: InkFlow vs [竞品] — Which Is Right for Your Tattoo Studio?
↓
Section 1: 5 Signs You Should Switch (迁移信号)
  列出具体的场景，让读者自我诊断
↓
Section 2: Side-by-Side Comparison (对比)
  功能对比 + 价格对比 + 适用场景
↓
Section 3: Migration Cost & Risk (迁移成本)
  "How long does it take?" / "Is my data safe?" / "Learning curve"
↓
Section 4: Real Studio Experiences (社会证明)
  案例/评价（暂时没有就写预期收益）
↓
FAQ (买家最后时刻的疑虑)
  - 3-5 个真实问题
  - 用 Schema FAQ 标记
↓
CTA: Start Free Trial
```

### 优先级排序 🔴

| 对比页 | 优先级 | 理由 |
|--------|--------|------|
| vs Studioflo | 🔴 第 1 个 | 最大的直接竞品 |
| vs Porter | 🟡 第 2 个 | Porter 已停服，搜索"Porter alternatives" |
| vs Mangomint | 🟡 第 3 个 | 价格更高，可打性价比 |

→ 全部用同一套模板，换数据和角度

---

## 三、免费工具页

### 策略 🔴

来源：06/04 确认（完全开放不设限）+ @WeiYipei 教训（没人撞到上限=没人付费）

**两个看似矛盾但必须同时满足的条件：**

```
条件 A: 工具完全免费开放使用（不需要注册就能用）
条件 B: 免费额度刚好让中大型工作室撞到上限 → 引导升级
```

**实现方式：**
- 基础功能无需注册（"Try it now" — 现场演示/计算器）
- 高级功能/数据导出需要注册（自然收集线索）
- 使用量大的功能设 quota（每月 X 次免费，升级解锁无限）

### 对网站结构的影响

```
首页 → 免费工具（引流）→ 产品页（转化）
                    ↘ BOFU 对比页（截流竞品搜索）
```

---

## 四、功能页 / 产品页

### 结构 🟡

来源：@boringlocalseo 每个页面是决策工具

```
不是:
  H2: Features
  P: Manage your client database...

而是:
  H2: Are You Still Managing Clients on Paper? Here's What You're Missing
  P: (场景化描述痛点)
  H3: How Much Time Does This Save?
  P: (具体数字，如 "Average studio saves 5hrs/week")
```

### Schema 结构化数据 🔴

来源：@boringgeodude GEO + @noelcetaSEO Technical Excellence

每个功能页/产品页必须包含：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "InkFlow",
  "operatingSystem": "Web, iOS, Android",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

### OG 卡 🟡

每个页面配 OG 卡，WeiYipei 实战证明有效。

---

## 五、技术层面

### GSC 开户 🔴

来源：@foley_seo 说 SEO 是第一引擎 + @David_mduw GSC quick wins

**上线第一天做的事：**
- [ ] Google Search Console 添加域名
- [ ] sitemap.xml 提交
- [ ] GA4 连接
- [ ] 记录品牌流量 baseline（方便后续剥离分析）

### Core Web Vitals 🟡

来源：@KristinaAzarenko 技术 SEO

- [ ] 上线前跑 Lighthouse
- [ ] 检查 `<button>` vs `<a>` 使用（导航用 `<a>`）
- [ ] 纹身作品图用 `<img>` 不是 CSS background
- [ ] 检查 React lazy load 对 Googlebot 的可见性

### SSL / 移动端 🟡

- [ ] HTTPS 强制跳转
- [ ] 移动端按钮 ≥ 38px（之前确定的 UI 标准）
- [ ] PWA manifest 配置

---

## 六、外部引用源（Authority Building）

### 注册优先级 🔴

来源：@noelcetaSEO Domain Authority 差距 + @foley_seo Distribution 优先

```
Phase 1（上线前 2 周）:
  □ G2 — 创建公司页，邀请用户评价
  □ Capterra — 同上
  □ Trustpilot — 注册

Phase 2（上线后 1 月）:
  □ SaaS directories（sujingshen 的 259 目录站）
  □ Chrome 插件（hezhiyan7 的 DR99 外链策略）

Phase 3（上线后 2 月）:
  □ 客座博客投稿
  □ LinkedIn 内容分发
```

---

## 七、上线后迭代体系

### SEO 实验循环 🟡

来源：@foley_seo + @David_mduw

```
每月:
  □ 拉 GSC 数据 → 找 Impression > 500 但 CTR < 2% 的关键词
  □ 改 title tag（每次 3-5 个）
  □ 2 周后看 CTR 变化
  □ 记录到 SEO Experiment Log（Notion/Sheets）
```

### SEO Experiment Log 模板

| Date | Page | Change | Expected Impact | CTR Before | CTR After | Result |
|------|------|--------|----------------|-----------|----------|--------|
| | | | | | | |

---

## 八、不用做的事情

来源：多个分析的冲突对比

| ❌ 不用做 | 原因 |
|----------|------|
| 纯 GEO 内容 | @DavidGQuaid 反驳，AI 访问受限 |
| 长文博客（上线初期） | @noelcetaSEO 新站缺 Domain Authority，写了也不排名 |
| 投付费广告 | @foley_seo Distribution 优先级里排最后 |
| 外包冷邮件 | @ConnorShowler 请的"专家"搞砸了 |
| AI 生成博客正文 | @foley_seo Google 能识别 AI 内容 |

---

## 九、21 篇分析的源头索引

| # | 来源 | 指导了什么 |
|---|------|-----------|
| 1 | @JoyanneHawkins | 外链策略 → anchor text 自然 |
| 2 | @boringlocalseo | 所有页面 = 决策工具 |
| 3 | @foley_seo | SEO 实验循环 + AI 只做分析 |
| 4 | @boringgeodude | GEO → Schema 照做，纯 GEO 内容不做 |
| 5 | @TheCoolestCool | Reddit 冷启动计划 |
| 6 | @Goldikam | Hero 标题 3 变体 |
| 7 | @ConnorShowler | 冷邮件 B2B 门槛高，先做 SEO |
| 8 | @Max_Alexxander | CRO 细节（按钮大小/底部 CTA） |
| 9 | @john_ola25 | Landing Page message match |
| 10 | @noelcetaSEO | 新站别写长文，先建 Domain Authority |
| 11 | @ErnestoSOFTWARE | AI UGC 视频生产/不投虚拟人 |
| 12 | @vibemarketersHQ | pSEO 模板 + YouTube 内容系统 |
| 13 | @foley_seo (3) | Distribution 优先级：SEO > Social > Influencer > UGC > Ads |
| 14 | @RomielClarke | 内容团队招 strategist 不是 editor |
| 15 | @DavidGQuaid | GEO 谨慎投入 |
| 16 | @WeiYipei | 定价+Bofu 对比页+OG 卡 |
| 17 | @RossHudgens | TOFU 内容在 AI 中回归，但排 BOFU 之后 |
| 18 | @David_mduw | GSC quick wins + 每月 title 优化 |
| 19 | @victor_bigfield | Claude + Reddit 获客 |
| 20 | @VincentLogic | 视频生产范式转变 |
| 21 | @_zheergen | Ideogram 4.0 JSON prompting → Peach |
