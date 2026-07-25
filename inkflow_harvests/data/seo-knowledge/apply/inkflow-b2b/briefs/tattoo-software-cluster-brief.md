# Tattoo Software Cluster — Content Brief

> 配套：`tattoo-software-cluster-gap-analysis.md`（SERP 差距，本文件喂给它）。
> 流水线：SERP 差距 → 本 Brief → 写页（先模型页 #8 → 核心四页 → niche 五页）→ 注入 Meta/Title/H1/Schema/内链 → build 验证。
> 簇类型：**BOFU 交易/商业**（SaaS 最高 ROI）。全 13 页意图=交易，正确。

---

## 0. 簇概览

| 页面 | 类型 | slug | 词量 | 决策 |
|------|------|------|------|------|
| tattoo-crm-software | 功能/商业 | `/tattoo-crm-software` | 1800–2600 | **模型页（先写）** |
| tattoo-appointment-booking | 功能/商业 | `/tattoo-appointment-booking` | 1500–2200 | 保留 |
| tattoo-scheduler | 功能/商业 | `/tattoo-scheduler` | 1500–2200 | 保留 |
| tattoo-booking-app | 功能/商业 | `/tattoo-booking-app` | 1200–1800 | 保留 |
| tattoo-business-management | 功能/商业 | `/tattoo-business-management` | 2000–3000 | 保留 |
| tattoo-client-management | 功能/商业 | `/tattoo-client-management` | 1500–2200 | 保留 |
| tattoo-commission-software | 工具/商业 | `/tattoo-commission-software` | 1000–1500 | 保留 |
| tattoo-consent-form-app | 工具/商业 | `/tattoo-consent-form-app` | 1000–1500 | 保留 |
| tattoo-deposit-software | 工具/商业 | `/tattoo-deposit-software` | 1000–1500 | 保留 |
| tattoo-payment-processing | 功能/商业 | `/tattoo-payment-processing` | 1500–2200 | 保留 |
| tattoo-pos-system | 功能/商业 | `/tattoo-pos-system` | 1200–1800 | 保留（7行扩写） |
| tattoo-scheduling-software | 功能/商业 | `/tattoo-scheduling-software` | 1500–2200 | 保留 |
| tattoo-waiver-app | 工具/商业 | `/tattoo-waiver-app` | 1000–1500 | 保留 |

**实际产出 = 13 页**（无薄页并入，每页都是独立交易意图词）。

---

## 1. 独家角度（Exclusive Angle）

> 本簇是 BOFU 交易页，**不做新奇观点**，角度 = 「最清晰的结构 / 最强信任信号 / 最狠的性价比」。

- **用户真实决策痛点**：① per-seat 费太贵 ② 只管老客不管获客 ③ 工具拼凑 ④ 怕跑单。
- **我们的信任/结构优势**：免费档即含**被 Google 收录的独立站（接 organic 新客）**、**零 per-seat 费**、一体化替代 4–5 个 SaaS。
- **与 InkFlow 转化衔接**：每页末尾 CTA → `/pricing`（免费起步）。

---

## 2. E-E-A-T 通用块（全簇复用）

- **Author**：Sarah Chen（Founder & CEO，12 年纹身店运营），`BaseLayout author="Sarah Chen"` + `<AuthorByline />`。
- **Reviewer**：商业页用机构占位 `Reviewed by InkFlow Studio Operations`；consent/waiver 页加「非法律建议」免责。
- **真实引用（≥2）**：行业报告 / 对手官网定价页（Square/Booksy 费率），不编造，查不到标 `[建议补充]`。
- **发布/更新日期**：published 2026-07-19 ｜ updated 同。
- **第一手经验信号**：「InkFlow 管理的 X 家工作室」类数据（真实则写，否则删）。

---

## 3. Schema 计划

| 页面 | 页面类型 | Schema |
|------|---------|--------|
| 全 13 页 | 功能/商业 | `SoftwareApplication`（默认）+ `FAQPage`(FAQSchema) + `BreadcrumbList`(模板带) |

### 3.1 内链拓扑（全簇强制）
1. **防蚕食互链**：booking ↔ scheduler ↔ scheduling ↔ appointment-booking 四页互相指认差异（"需要多艺人排程？看 /tattoo-scheduler"）。
2. **每页 → 1 条 features 页**：`/features/tattoo-booking-software`（描述性锚文本）。
3. **每页 → 末尾 CTA** `/pricing`（免费起步）。
4. **Pillar → 类目/首页**：由模板（header/footer/Breadcrumb）自动带。

---

## 4. 逐页 Brief

> **🔴 页面级 on-page 一致性（强制，违反即打回）**：每页的 **Meta Title、H1、第一段前两句** 必须字面包含**完全相同**的主推词短语（见 `seo-targets/site-content-seo-ruleset.md` 第 3/5/7 节）。Title 与 H1 一致是确定硬规则；第一段前两句带出主词已验证为沙盒期新站最强信号位，必须执行。建页后逐页核对，不一致不允许 build。

### 4.1 模型页 — tattoo-crm-software（先写）

| 字段 | 值 |
|------|-----|
| 主词 | tattoo CRM software |
| 副词 | tattoo client management, tattoo studio CRM |
| 路径 | `/tattoo-crm-software` |
| 类型 | 功能/商业（BOFU） |
| 字数 | 1800–2600 |

**H1**：Tattoo CRM Software That Turns One-Time Clients into Regulars
**Title**（≤60）：Tattoo CRM Software: Keep Clients Coming Back | InkFlow
**Meta**（≤160）：Tattoo CRM software that tracks full client history, automates rebooking, and runs targeted campaigns. Start free—no per-artist fees.
**大纲（对比表开头，跳过 hook）**：
- H2: What Is Tattoo-Specific CRM?（BLUF：通用 CRM vs tattoo CRM 差异）
- H2: InkFlow CRM vs Generic CRMs（**对比表**：字段/价格/per-seat/获客）
- H2: Client History That Actually Drives Rebooking（档案字段清单 + 复购自动化）
- H2: Automated Campaigns（分群、生日、愈合后回访）
- H2: Client Portal（移动自助、参考图上传——信息增益）
- H2: FAQ（4–6 问）
**内链**：↑ features/tattoo-booking-software；→ tattoo-client-management；→ /pricing
**Schema**：SoftwareApplication + FAQPage

### 4.2 tattoo-appointment-booking

| 字段 | 值 |
|------|-----|
| 主词 | tattoo appointment booking |
| 类型 | 功能/商业 | 字数 | 1500–2200 |
**H1**：Tattoo Appointment Booking Software That Fills Your Calendar
**结构**：预约 3 步流程 → **定金防跑单**（20–50% no-show 数据）→ 自动提醒 → 多艺人可选 → **对比表**(InkFlow vs Bookedin vs Square vs Booksy) → FAQ → CTA
**信息增益**：预约页自带 SEO 独立站（约新客）。**内链**：→ tattoo-scheduler（"需要多艺人排程？"）、→ /features、→ /pricing

### 4.3 tattoo-scheduler

| 字段 | 值 |
|------|-----|
| 主词 | tattoo scheduler |
| 类型 | 功能/商业 | 字数 | 1500–2200 |
**H1**：Tattoo Scheduler for Multi-Artist Studios
**结构**：多艺人独立日历 → 冲突检测 → 休假/时区/轮班 → 与 booking 区分（互链）→ 对比表(SchedulingKit/TattooPro) → FAQ
**信息增益**：零 per-seat 费。**内链**：→ tattoo-appointment-booking、→ /features、→ /pricing

### 4.4 tattoo-booking-app

| 字段 | 值 |
|------|-----|
| 主词 | tattoo booking app |
| 类型 | 功能/商业（移动） | 字数 | 1200–1800 |
**H1**：The Tattoo Booking App Clients Actually Use
**结构**：iOS/Android 客户端 → 推送提醒 → 客户自助改约 → 离线 → 对比(Booksy App) → FAQ
**信息增益**：免费档含独立站。**内链**：→ tattoo-appointment-booking、→ /features、→ /pricing

### 4.5 tattoo-business-management

| 字段 | 值 |
|------|-----|
| 主词 | tattoo business management software |
| 类型 | 功能/商业 | 字数 | 2000–3000 |
**H1**：All-in-One Tattoo Business Management Software
**结构**：一体化 vs 拼凑叙事 → **全功能对比表**(InkFlow vs TattooNOW vs Vagaro vs Mindbody) → ROI 计算 → 模块清单(预约/CRM/支付/站/营销) → FAQ
**信息增益**：1 个免费工具替代 4–5 付费 SaaS。**内链**：→ tattoo-crm-software、→ tattoo-payment-processing、→ /pricing

### 4.6 tattoo-client-management

| 字段 | 值 |
|------|-----|
| 主词 | tattoo client management software |
| 类型 | 功能/商业 | 字数 | 1500–2200 |
**H1**：Tattoo Client Management Software That Remembers Everything
**结构**：档案字段(设计/部位/尺寸/愈合/过敏/艺人偏好) → 复购自动化 → 分群营销 → 对比(SkunkCRM/Tattit) → FAQ
**内链**：→ tattoo-crm-software、→ /features、→ /pricing

### 4.7 tattoo-commission-software（niche）

| 字段 | 值 |
|------|-----|
| 主词 | tattoo commission software |
| 类型 | 工具/商业 | 字数 | 1000–1500 |
**H1**：Tattoo Commission Software: Track Every Artist Payout
**结构**：抽成计算(按单/按比例) → 艺人结算 → 税务导出 → 与 booking 联动自动算账 → FAQ
**内链**：→ tattoo-business-management、→ /pricing

### 4.8 tattoo-consent-form-app（蓝海合规）

| 字段 | 值 |
|------|-----|
| 主词 | tattoo consent form app |
| 类型 | 工具/商业 | 字数 | 1000–1500 |
**H1**：Tattoo Consent Form App with E-Sign & Secure Storage
**结构**：e-sign → PDF 归档 → 合规存储 → 模板库 → 健康/未成年披露 → **免责声明(非法律建议)** → FAQ
**内链**：→ tattoo-waiver-app、→ /pricing

### 4.9 tattoo-deposit-software（niche 支付）

| 字段 | 值 |
|------|-----|
| 主词 | tattoo deposit software |
| 类型 | 工具/商业 | 字数 | 1000–1500 |
**H1**：Tattoo Deposit Software That Stops No-Shows
**结构**：定金收取 → 非退款政策模板 → Stripe/Square 集成 → no-show 保护 → 部分预付 → FAQ
**内链**：→ tattoo-payment-processing、→ tattoo-appointment-booking、→ /pricing

### 4.10 tattoo-payment-processing

| 字段 | 值 |
|------|-----|
| 主词 | tattoo payment processing |
| 类型 | 功能/商业 | 字数 | 1500–2200 |
**H1**：Tattoo Payment Processing Built for Studios
**结构**：费率 → text-to-pay → 分期 → POS 联动 → 退款 → 对比(Square/Stripe) → FAQ（与 POS 页区分：本页重「收款方式」）
**内链**：→ tattoo-pos-system、→ tattoo-deposit-software、→ /pricing

### 4.11 tattoo-pos-system（7 行扩写）

| 字段 | 值 |
|------|-----|
| 主词 | tattoo POS system |
| 类型 | 功能/商业 | 字数 | 1200–1800 |
**H1**：Tattoo POS System for Walk-Ins and Retail
**结构**：零售库存 → 分账 → 小票/发票 → 礼品卡 → 与支付页区分 → FAQ
**内链**：→ tattoo-payment-processing、→ /pricing

### 4.12 tattoo-scheduling-software

| 字段 | 值 |
|------|-----|
| 主词 | tattoo scheduling software |
| 类型 | 功能/商业（宏观） | 字数 | 1500–2200 |
**H1**：Tattoo Scheduling Software for Growing Studios
**结构**：与 #4.3 scheduler 区分（本页打「全功能排程平台」对比，scheduler 打「多艺人日历」）→ 企业/多店视角 → 对比表 → FAQ
**内链**：→ tattoo-scheduler、→ tattoo-appointment-booking、→ /pricing

### 4.13 tattoo-waiver-app（蓝海）

| 字段 | 值 |
|------|-----|
| 主词 | tattoo waiver app |
| 类型 | 工具/商业 | 字数 | 1000–1500 |
**H1**：Tattoo Waiver App: Sign, Store, Retrieve—Anywhere
**结构**：电子弃权书模板库 → 移动签署 → 到期续签提醒 → 随时调阅 → 与 #4.8 区分(本页重存储检索) → FAQ
**内链**：→ tattoo-consent-form-app、→ /pricing

---

## 5. 内链矩阵（全簇）

| 从 → 到 | 锚文本 | 位置 |
|---------|--------|------|
| appointment-booking → scheduler | multi-artist scheduling | 相关段 |
| scheduler → appointment-booking | online appointment booking | 相关段 |
| scheduler → scheduling-software | full scheduling platform | 相关段 |
| scheduling-software → scheduler | multi-artist calendar | 相关段 |
| 每页 → /features/tattoo-booking-software | tattoo booking software | 正文 |
| 每页 → /pricing | Start free | 末尾 CTA |
| 每页 → 1 条相关簇内页 | 描述性 | 相关段 |

---

## 6. 下一步

1. **你审本 Brief**：独家角度是否成立 / 防蚕食角度是否够清晰 / CTA 是否吻合。
2. 确认后按 Brief 逐页写（先 #4.1 模型页），注入 Meta/Title/H1/Schema/内链。
3. 写后本地 `cd marketing && npm run build` 验证（**先修 import 路径 `../../`→`../`**）→ commit + push main。
4. 跑品牌语气自检（8+/10）+ E-E-A-T 校验。
