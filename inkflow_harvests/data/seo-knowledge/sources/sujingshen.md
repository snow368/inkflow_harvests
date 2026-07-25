# sujingshen（SagaSu）外链策略分析

来源：X @sujingshen // sagasu.art
状态：✅ 已学
类型：🟢 工具型 — 开源 backlink-pilot + OpenClaw 自动化

---

## 适用分类
中文出海圈, 外链建设

## 核心贡献：开源 Backlink Pilot

自动提交外链的工具，GitHub: github.com/s87343472/backlink-pilot

使用 OpenClaw + rebrowser-playwright 自动化填表提交。

---

## 外链渠道优先级（实测 40+ 渠道）

### 🥇 第一梯队：GitHub awesome-list
零成本、高曝光、长期有效。提 Issue 说"请加上我的项目"，通过了就永久收录。
一天提了 18 个，覆盖 200k+ stars 曝光。

### 🥈 第二梯队：免费目录站

| 站点 | DA/DR | 审核速度 |
|------|-------|---------|
| SaaSHub | DA 46 | 当天批准 |
| submitaitools.org | DA 73 | 1-3 天 |
| toolverto.com | — | 1-3 天 |
| uneed.best | DR 72 | 排队中 |
| bai.tools | — | ~30 天 |

### 🥉 第三梯队：社区 & 论坛
Hacker News (Show HN)、Reddit、V2EX — 必须手动，自动化会被封号。

---

## 避坑清单

| 站点 | 坑 |
|------|----|
| IndieHub | 看起来免费，发布要 $4.9 |
| OpenHunts | 免费排队 51 周 |
| toolify.ai | 提交要 $99 |
| alternativeto.net | 隐形验证码，无法自动化 |
| Product Hunt | Cloudflare 拦截，只能手动 |

## 提交节奏（防封关键）
- 不同站点之间：**隔 1-3 分钟**
- 同一站点重试：**隔 30-60 分钟**
- 一天 **5-10 个站**，细水长流

---

## 对 InkFlow 的直接价值

SagaSu 的外链策略可以直接复用：
1. GitHub awesome-list → 搜 awesome-indie、awesome-cloudflare、awesome-saas 等
2. SaaSHub / submitaitools / uneed.best → 域名下来就提交
3. 避坑列表省了试错时间
4. 提交节奏：5-10 个/天，细水长流
