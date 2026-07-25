<!--
来源：iris1031 (dev.to，作者署名 生姜Iris / Iris，gingiris.tools)
主题：竞品分析 / 技术（含 MCP 接入、逆向增长拆解）
收录日期：2026-07-13
SELF-REPORTED 标记说明：文中所有"战绩类/个人经验类"数字（如 30 次 Product Hunt #1、60k GitHub stars、10 分钟拆解、省下 2–3 小时/周、帮我省了两次、50+ 产品实测、~80% 创始人买错工具 等）均来自作者自述，无法独立核实，统一标 ★SELF-REPORTED。工具价格/功能等为作者在文中陈述的事实性信息，未标星；读者仍需自行核对最新定价。
注意：第 1 篇 URL slug 为 "5-competitor-analysis-workflow"，但 WebFetch 抓取到的实际正文标题为 "The $5 Competitor Analysis Workflow for Solo Founders"，内容是一套 $5 竞品深潜工作流（非 5 个并列工作流）。本文按实际抓取内容整理。
-->

# 竞品分析 / 技术 全文提炼（iris1031 / dev.to）

> 4 篇合集，按"能照着做"的带内容级别整理。含竞品分析工作流、逆向增长拆解框架、14 工具对比、MCP 远程服务接入与避坑。

---

## 1. The $5 Competitor Analysis Workflow for Solo Founders [https://dev.to/iris1031/the-5-competitor-analysis-workflow-for-solo-founders-1l0a]

### 核心论点
- 独立开发者 / 单人创始人不需要每月 $125 的 SimilarWeb。多数时候只想回答一个问题：**这个竞品到底在增长吗？他们在用什么方式增长？**——一个月顶多查 1–2 次。
- 作者自建了一套工作流：**每次深度竞品深潜约 $5、每周省下 2–3 小时、且比贵价工具更可靠地暴露她关心的信号** ★SELF-REPORTED。
- 触发点：想动手做一个功能 sprint 前，先用低成本方式确认竞品是否真的在蚕食自己的市场。

### 可操作战术（带具体做法）
**第一步：明确"我到底想知道什么"（5 个问题）**
每次评估竞品，只回答这 5 个快问题，其余都是噪音（看 20 分钟就会忘）：
1. 他们真有流量，还是只在 Twitter 上嗓门大？
2. SEO  footprint 如何——有没有内容在帮他们获客？
3. 最近是否融资 / 大版本发布，导致数据被扭曲？
4. 用户都在骂什么？
5. 定价页长啥样，变过没？

**第二步：60 秒快照（用 analook.com）**
- 输入竞品域名 → 约 1 分钟拿到：预估月流量及趋势、 top 流量来源（organic / paid / direct）、top SEO 关键词、Product Hunt 发布历史、GitHub repo 数据（若有）、当前定价档位。
- 重点信号：**定价历史（Wayback Machine 快照）**。如果一个工具 6 个月内从 $29/月 涨到 $49/月，说明：要么找到了价格底线、要么开始焦虑、要么向上 reposition。单看数字分不清，但值得追。
- 单次报告 $2.99；一次深潜通常 2 份报告，比价时偶尔 3 份 → 合计约 $5。

**第三步：挑 1–2 个信号深挖（不要全挖）**
- **Product Hunt 历史（手动，免费，5 分钟）**：搜 maker profile，看时间线。18 个月前 800 upvote 发布后"再无动静"= 被收购 / 熄火 / 完全 pivot；每隔几个月就发新东西 = 还在迭代找角度。
- **Wayback Machine 定价页（免费，最爱信号）**：访问 `web.archive.org`，输入 `competitor.com/pricing`，看 6 / 12 / 18 个月前的快照。是否加了 enterprise 档？是否砍了免费计划？是否涨价并悄悄给老用户加 "grandfathered" 计划？定价页改动是窥探业务真实状态的窗口，公司不会随便改定价页。
- **SEO 关键词簇（Analook 报告内）**：如果竞品 top organic 词都是高意图产品词（如 "competitor analysis tool for startups"），说明在抢同一批搜索词；如果排的是漏斗上两层的 informational 词，说明走的是另一条获客路，根本不在同一渠道竞争。

**第四步：$5 vs $125 的诚实取舍**
- SimilarWeb（$125/月）：大站（月访客百万级）流量估算更准、历史趋势可回溯数年、受众重叠数据难复制。**适用**：M&A 尽调、给投资人的市场规模测算。
- $5 Analook 报告：流量方向"够用"（同一量级 / 涨还是跌）、SEO 关键词图、PH+GitHub 故事、定价快照。**适用**：决定做不做某功能、要不要避开竞品地盘。
- 作者原话：不需要 99% 确信竞品是 50K 还是 80K 月访客，只需要知道"跟我一个量级还是领先我五个量级、在往哪走"。

**第五步：写一句话结论就收手**
"快速快照 → 挑最有趣的信号 → 只深挖那一件事 → 写一段结论 → 走人"。每月约做 2 次 ★SELF-REPORTED。

### 关键数字（标★）
- SimilarWeb 价格：**$125/月**（按次？不，按"每月"）。★作者陈述
- Analook 单次报告：**$2.99**；一次深潜通常 2 份、偶尔 3 份。
- 每周省下 **2–3 小时** ★SELF-REPORTED。
- 月做约 **2 次**竞品检查 ★SELF-REPORTED。
- 该工作流"至少两次帮我省掉做错功能" ★SELF-REPORTED。
- 作者亲历：差点花一周做 SEO 内容模块，跑竞品检查后发现有 2 个直接竞品几乎零内容 footprint、流量几乎全 direct+referral，且都在 18 个月内发布、定价页未变 → 判定 SEO 缺口是"无人占领"而非"市场不支持" → 做了内容模块，"值了"，整轮研究约 2 小时 ★SELF-REPORTED。
- Analook 免费层：2 份报告/月，无需信用卡。

### 模板或工作流
- **5 问题清单**（见上"第一步"）。
- **手动深挖 SOP**：
  1. analook.com 跑 1 份快照（$2.99）
  2. Product Hunt maker profile 看时间线（5 分钟，免费）
  3. web.archive.org 查 `competitor.com/pricing` 的历史快照（免费）
  4. 在 Analook 报告里看 SEO 关键词簇，判断是否同渠道竞争
  5. 写一句结论（例："竞品 X 在涨/跌，靠 direct+referral，SEO 是空白，我可以占领"）
- **$5 工作流适配判断**：若问题只是"竞品在涨还是跌 + 靠什么涨"，用 $5；若要给投资人做市场规模测算，才上 $125。

### Takeaway
贵价工具卖的是"更准的数据"，但单人创始人要的是"够用的方向 + 快 + 便宜"。先用 $5 快照 + 免费手动深挖回答 5 个核心问题，比租铲车搬沙发（买 $125 月费）实在得多。真正值钱的是"挑一个信号深挖 + 写一句假设"，不是报告本身。

---

## 2. How I reverse-engineered 3 competitors' growth strategies in 10 minutes (and what I found) [https://dev.to/iris1031/how-i-reverse-engineered-3-competitors-growth-strategies-in-10-minutes-and-what-i-found-8gb]

### 核心论点
- 标准竞品分析（填 grid：功能/定价/受众/定位）适合战略 PPT，但**说不清一个公司"现在靠什么增长"**。
- 作者改用 **"增长指纹（growth fingerprint）"5 信号框架**，在 **10 分钟内**逆向拆出竞品增长打法 ★SELF-REPORTED（标题主张；正文给的 10 分钟是分步累计≈10 分钟）。
- 方法："快聚合视图（工具抓数据）+ 对一个信号手动深挖"——工具负责采集，人负责解读。

### 可操作战术（带具体做法）
**5 信号框架（growth fingerprint）**
1. **流量来源结构**：SEO 主导 / 付费主导 / 社区驱动？决定其内容策略、burn rate、护城河。80% organic 与 60% direct（通常 = 强口碑或病毒循环）是两种完全不同的游戏。
2. **内容节奏 & 主题簇**：发布频率？高表现页围绕哪些主题？告诉你他们认为受众在哪、在优化搜索里的什么问题。
3. **评论情感随时间变化**：不只看星级，看"近期 vs 早期"的模式。18 个月前被爱、现在平庸 = 留存问题；越来越好 = 迭代到位。
4. **招聘职位**：被严重低估的信号。猛招工程 = 押注平台；猛招销售 = 向上 / 企业市场；设计岗激增 = 即将 rebrand 或大改版。
5. **社交 & 社区活跃度**：不看粉丝数，看互动质量。社区里真有人在互相帮忙，还是只有排期帖的鬼城？Twitter/X 回复、Reddit 提及、Discord 活跃度。

**10 分钟实操流程（逐步骤）**
1. 跑一份 Analook 报告——流量来源、top 内容、评论快照（~2 分钟）
2. 扫他们过去 90 天的招聘板（~2 分钟）
3. 搜 Twitter/X 和 Reddit 近期"自然提及"——不是带标签的推广帖，是人们主动聊他们（~3 分钟）
4. 在 G2 / Capterra 看 1–2 条近期评论，拿定性质感（~2 分钟）
5. **逼自己写一段假设**：_"这个公司靠 X 增长，当前缺口是 Y，我要盯的是 Z"_（~1 分钟）

> 关键：最后一步"写假设"才是分析真正发生的地方，数据只是输入。

**3 个真实产品拆解示范**
- **Cursor**：增长指纹 = 口碑 + 开发者社区。月流量百万级，但 direct+referral 主导，不跑激进付费、不发高频博客。靠让开发者主动聊。缺口：几乎没有面向团队 / 管理者的内容（全是个人生产力），做团队工作流产品者的机会窗。
- **Linear**：指纹 = 鲜明立场定位 + 设计社区拉动。流量可观但不巨大，来源偏 design/product 论坛、HN、Twitter/X 的 referral，而非 SEO 博客。博客约一季度一篇但篇篇几百评论（因为有立场）。招聘平稳 = 不是"不惜代价扩张"。UX 口碑强、定制化吐槽多 = 故意用灵活性换观点鲜明。
- **Notion**：最典型的"社区 + 模板飞轮"。自然搜索 footprint 巨大，但很多由 UGC（模板、教程、社区帖）驱动而非官博。最有趣的信号：近一年评论情感"软化"——不是崩，是"好但慢""怀念以前简单"变多 = 成为平台后的复杂度税。

**跨 50+ 产品的规律** ★SELF-REPORTED（作者称跑过 50+ 产品）
- 护城河写在流量结构里：60%+ organic = 分销上难以撼动；60%+ paid = 要么高 LTV 市场，要么依赖烧钱（单位经济更优者即可击破）。
- **评论轨迹比评分重要**：4.2 在涨 > 4.6 在跌。
- 招聘"突然安静"也是信号：之前猛招现在静 = 要么提效、要么撞墙，要分清。
- 社区是**先行指标**不是滞后指标：等社区冷了，增长早停了，社区降温在前。

### 关键数字（标★）
- **10 分钟**完成一次 3 竞品逆向拆解（标题主张，分步累计）★SELF-REPORTED。
- 跑过 **50+ 产品**后得出的规律 ★SELF-REPORTED。
- 框架用到的样例数据：Cursor 月流量"百万级"；Linear 博客"约一季度一篇"；Notion 评论情感"近一年软化"。
- 文末作者署名战绩：**60k GitHub stars、30x Product Hunt #1** ★SELF-REPORTED。

### 模板或工作流
- **10 分钟 SOP**（见上 5 步，合计 ~10 分钟）。
- **增长指纹 5 信号检查表**：流量结构 / 内容节奏+主题簇 / 评论情感走势 / 招聘职位 / 社区互动质量。
- **假设模板**：`这个公司靠 [X] 增长，当前缺口是 [Y]，我要盯的信号是 [Z]`。
- **工具组合**：Analook（60 秒聚合 15+ 来源：流量指纹 + 内容信号 + 评论情感）→ 再手动深挖最有趣的那一个信号。

### Takeaway
别再填功能对比表。用 5 信号抓"增长指纹"，10 分钟内从"他们在涨吗"推到"靠什么涨、缺口在哪、我能不能填"。强制写一句假设是把数据变成决策的关键动作。

---

## 3. The best competitor analysis tool in 2026: an honest comparison of 14 options [https://dev.to/iris1031/the-best-competitor-analysis-tool-in-2026-an-honest-comparison-of-14-options-4747]

### 核心论点
- **2026 年没有单一竞品分析工具能覆盖全貌**。工具已分化为 7 类，每类擅长一件事、弱于其他，应混搭 2–3 个。
- 选型三要素：① stage（pre-PMF / $10K MRR / $1M ARR）；② budget（<$100/月 vs $2000+/月）；③ workflow（ad-hoc teardown vs 持续监控）。
- **买前先问：我要用这些数据做哪个决策？** 若数据不改变决策（定价/定位/发布时间/功能），就不需要工具，只需一次 30 分钟经验对话。
- 误区：**~80% 的 SaaS 创始人第一次都买错工具**；多数人买了生成报告却不做决策，工具成摆设 ★SELF-REPORTED（基于 2024–2026 年 24 次咨询对话估算）。
- 作者在建 Analook + 咨询 30+ SaaS 期间实测 14 个工具（2026 年 3–5 月），每个给 "good for / skip for" 结论 ★SELF-REPORTED。

### 可操作战术（带具体做法）
**7 大类别速览（先定类，再混搭）**
1. AI 竞品拆解（60 秒报告）：Analook（免费 3 份/月）、Visualping AI（付费）。强：一份报告覆盖全貌；弱：快照非持续监控。
2. SEO 竞品研究：Ahrefs($129)、SEMrush($139)、Moz($99)。强：最深外链+关键词；弱：缺非 SEO 信号（PH/GitHub/定价/社媒）。
3. 企业级竞争情报：Crayon($1000–2000)、Klue($1500+)、Kompyte($800+)。强：人工分析师+Slack/CRM 工作流；弱：3–6 周 onboarding、$20K+/年，对创始人过度。
4. 流量情报：SimilarWeb($125+)、SEMrush Traffic Analytics。强：中大站流量估算最佳；弱：小/早期竞品数据差。
5. 网站变更监控：Visualping($16+)、Hexowatch、Wachete。强：像素级 diff 告警；弱：不说"为什么变"。
6. 社媒监听：Toolify Social Listening(免费)、Brand24($79+)、Mention。强：实时品牌提及；弱：只给信号不给分析。
7. 手动研究栈（$0 档）：Wayback Machine + Google Trends + 竞品 PH 页 + LinkedIn + 隐身模式看定价页。强：零成本全自控；弱：每竞品 2–3 小时，超 5 个不可扩展。

**14 工具逐一结论**
1. **Analook** — 免费 3 份/月；$29/月(30 份)；单次 $5。60 秒拆解覆盖 15+ 源（Wayback、DataForSEO SEO、社媒、PH、GitHub、AI verdict）；免费层真免费（非试用）；Wayback 集成看定位演变；**暴露远程 MCP server**（可在 Claude Desktop / Cursor 内跑拆解）。弱：快照非监控、外链数据摘要级（不如 Ahrefs）、不做销售 battlecard。**结论：2026 早期 SaaS 最佳；<$10K MRR、月研 1–5 竞品就用它。**
2. **Ahrefs** — $129/月(Lite)；行业最大外链索引 35T+ links；纯 SEO 竞品分析。**买若 SEO>50% 获客；跳过若早期需更广信号。**
3. **Crayon** — $1000–2000/月，$20K+/年；销售赋能、battlecard、Salesforce 集成。**结论：$1M+ ARR 销售驱动公司才对；<$1M 错配。**
4. **SimilarWeb** — $125+/月；中大站流量金标准，免费层基础数。**结论：拿免费层抽查；仅当流量情报是第一优化目标才付费（小站 <10K 访客数据不足）。**
5. **Visualping** — $16–49/月；像素级页面变更告警。**结论：若定价/功能变更是你要行动的信号就买；手动查页就跳过。**
6. **Google Trends** — 免费；看品牌搜索飙升（=发布/媒体/病毒时刻）。**结论：每周用，免费且高信号。**
7. **Wayback Machine** — 免费；追溯定位/定价/功能主张演变。**结论：每次研究新竞品都用，免费免注册。**
8. **Toolify Social Listening** — 免费层；跨 Twitter/X、Reddit、论坛品牌提及，数小时内抓病毒帖/热帖。**结论：加进任何工作流，免费低维护。**
9–14 **可直接跳过（多数创始人）**：Klue($1500+，同 Crayon 但略便宜、企业开销一样)、Kompyte（Visualping 更便宜做同样事）、Owler（免费层够用、付费不值）、Crunchbase（免费够用）、G2/Capterra（免费研究够用、付费分析过度）、Brand24（与 Toolify 免费重叠）。

**作者个人工作流（SOP 级，月花费 $0）** ★SELF-REPORTED
1. Analook（dogfood，每竞品省 ~2 小时）
2. Google Trends（周查头部竞品品牌搜索趋势）
3. Wayback Machine（手动深挖 pivot 历史）
4. Twitter 高级搜索：`from:CompetitorHandle since:2026-01-01` 读全部公开推文
5. Crunchbase 免费层（融资状态抽查）

### 关键数字（标★）
- 实测工具数：**14**（2026 年 3–5 月个人测试）★SELF-REPORTED。
- 平均企业工具起价：**$1,200/月**（Crayon/Klue/Kompyte 定价页）。
- 平均自助工具起价：**$0–29/月**（Analook/Visualping/Wayback）。
- 首次买错工具创始人比例：**~80%**（24 次对话估算）★SELF-REPORTED。
- 首份报告耗时：**60 秒 ~ 2 周**（因类别而异）。
- 免费"真有价值"工具：**3 个**（Analook、Google Trends、Wayback Machine）。
- 支持 MCP/API 集成工具：**4 个**（Analook、Ahrefs、Similarweb(API)、Crayon(企业 API)）。
- 定价明细：Analook 免费 3 份/月、Pro $29/月(30 份)、单次 $5；Ahrefs $129/月、SEMrush $139/月、Moz $99/月；Crayon $1000–2000/月、Klue $1500+/月、Kompyte $800+/月；SimilarWeb $125+/月；Visualping $16–49/月；Brand24 $79+/月。
- 企业 CI onboarding：**3–6 周**；手动研究栈：**2–3 小时/竞品**（不超 5 个可扩展）。
- 门槛：Crayon 需 10+ AEs；Analook 适 <$10K MRR、1–5 竞品/月；SimilarWeb 适 >10K 访客。
- 作者自用栈月花费：**$0** ★SELF-REPORTED。

### 模板或工作流
**选型决策树（逐字流程）**
- Q1 预算？$0 → 手动栈（Analook 免费 + Google Trends + Wayback + Toolify）；$30–100/月 → Analook Pro($29)+Visualping($16)；$200–500/月 → 加 Ahrefs Lite($129)；$1K+/月 → 若有销售团队才考虑 Crayon/Klue。
- Q2 主用例？临时拆解 → Analook；持续监控(24h 内抓变更) → Visualping+Toolify；销售 battlecard → Crayon/Klue；SEO 超排名 → Ahrefs/SEMrush；流量估算 → SimilarWeb。
- Q3 单人还是团队？solo → Analook+Wayback+Google Trends；2–5 人增长团队 → 加 Ahrefs+监控工具；10+ 人营收团队 → 企业 CI 才合理。

**购前必问 SOP**：`what decision am I going to make with this data?` 有用的分析 = 改变某个决策（定价/定位标语/发布时机/下一功能）。不触发决策 → 不买工具，开 30 分钟对话即可。

**手动栈组件清单**：Wayback Machine + Google Trends + 竞品 PH 页 + LinkedIn + 隐身模式看定价页。

### Takeaway
2026 年没有"全能"竞品工具。按"预算→用例→团队规模"决策树混搭 2–3 个；早期 SaaS 用 Analook（+$0 手动栈）足够；买任何工具前先确认它会触发一个决策，否则别买。直接跳过 Klue/Kompyte/Owler/Crunchbase 付费/G2·Capterra 付费/Brand24。

---

## 4. Adding a Remote MCP Server to Our SaaS in 200 Lines — and the 3 Bugs That Almost Shipped [https://dev.to/iris1031/adding-a-remote-mcp-server-to-our-saas-in-200-lines-and-the-3-bugs-that-almost-shipped-4hp]

### 核心论点
- 在 SaaS（Analook，竞品分析工具）上加一个远程 MCP server，让 Claude Desktop / Cursor 之类的 agent 能"在编辑器内"直接拿到结构化竞品报告，而不用手写 REST 三轮调用 + 手动 JSON 解析。
- 标题写"200 行"，实际生产可用版本是 **280 行 Python + Starlette 包装层 + contextvar 中间件 + 4 条路由错误映射 + FastMCP 的 session/lifespan 管线**。"200 行"是美好的愿望 ★SELF-REPORTED（作者自承）。
- 价值：加一个 config block，agent 自省工具，`analyze_competitor("lovable.dev")` 直接在 Claude Desktop 内 work——能上 Smithery、进目录、触达不想切出编辑器的 AI builder。

### 可操作战术（带具体做法）
**架构与目标**
- Analook 本身：贴 URL → 从 15+ 源（DataForSEO、TwitterAPI.io、Product Hunt、GitHub、Wayback 等）拉数据 → 返回带 AI verdict（killer move / growth pattern / replicability）的结构化报告。
- 痛点：agent 循环里每次都要手调 REST：`POST /api/analyze` → 轮询 `/api/v1/status/{id}` → 拉 `/api/v1/report/{id}`，三轮往返 + 手动解析，且 agent 不知道有哪些工具。
- MCP 解法：一个 config block，agent 自省，`analyze_competitor("lovable.dev")` Just Works。

**实施计划（4 步）**
1. 用 FastMCP 的 `streamable_http_app()` 挂一个 MCP HTTP transport。
2. 包一层 Starlette middleware，把 `Authorization: Bearer` 头抓进 `ContextVar`。
3. 挂到现有 FastAPI app 的 `/mcp`。
4. 5 个工具，每个调用 HTTP API 用的同一套内部逻辑。

**暴露的 5 个工具（modules/mcp_app.py，共 280 行）**
`analyze_competitor`、`get_report_status`、`get_report`、`get_report_markdown`、`list_my_reports`

**客户端接入配置（Claude Desktop）**
```json
{
  "mcpServers": {
    "analook": {
      "url": "https://www.analook.com/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_ANALOOK_TOKEN>"
      }
    }
  }
}
```
→ 放进 `~/Library/Application Support/Claude/claude_desktop_config.json`，重启 Claude，即可问："Use analook to analyze lovable.dev, then compare it side-by-side with linear.app and notion.so." Claude 会并行调 3 次 `analyze_competitor`、轮询 `get_report_status` 至完成、取各报告并合成对比。约 3 分钟、3 credits、一条 prompt。

**传输层**：Streamable HTTP（MCP protocol 2024-11-05）。已上官方 MCP Registry：`io.github.Gingiris/analook`。

### 关键数字（标★）
- MCP 代码行数：**280 行**（`modules/mcp_app.py`）；标题"200 行"为愿望值 ★SELF-REPORTED。
- 暴露工具数：**5 个**。
- 上线前抓到的严重 bug：**3 个**（review 发现）；上线后抓到：**1 个**（Railway 环境变量尾随空格）。
- "做完"到"真能用"耗时：**~6 小时**。
- curl 返回 405 持续：**47 分钟**（周日晚 11:47 起）。
- SaaS 当时用户规模：**39 用户**。
- 生产 bug 造成：**5 份报告丢失**（含 1 份真实外部用户）。
- 已上官方 MCP Registry：是。
- 文末战绩署名：**60k GitHub stars、30x Product Hunt #1** ★SELF-REPORTED。

### 模板或工作流 / 避坑清单（3 个 review 抓到的 bug + 1 个生产 bug）
**Bug 1：progress schema 崩溃（P1）**
- 现象：`analyze_competitor` 写 `"progress": "🌐 排队中…"`（字符串），但现有 `_run_analysis` 执行 `job["progress"]["website"] = "running"`，期望 **dict** → 后台任务静默崩溃，用户拿到 job_id、轮询看到永远 "running" 却不知为何。
- 修复：从 HTTP 路径**原样复制** schema——含 9 个 module key 的 dict 结构，不"近似"、不"类似"、要"完全一样"。
```python
jobs[job_id] = {
    "status": "running",
    "progress": {
        "website": "pending",
        "social": "pending",
        # ... 另 7 个 key，全部必需
    },
    "results": {},
    # ...
}
```
- 教训：两条代码路径共享状态时，schema 即契约；把 schema drift 当 API breaking change 对待。

**Bug 2：8 字符 UUID 碰撞（P1，隐私泄露）**
- 现象：`uuid.uuid4().hex[:8]` 约 40 亿 ID，但 jobs dict 与 HTTP 来源 job_id 共享 → 两个用户可能拿到相同 job_id，一人看到另一人的报告（隐私泄露，非崩溃）。
- 修复：用完整 `uuid.uuid4().hex` 并查重。
```python
job_id = uuid.uuid4().hex
while job_id in jobs:
    job_id = uuid.uuid4().hex
```
- 教训：短 ID 适合不透明 slug，不适合共享 dict 里与鉴权相关的标识符。

**Bug 3：差点成的 SSRF（P2）**
- 现象：`normalize_url_or_raise` 是死代码（函数不存在）；fallback 用标准库 `urlparse`，接受 `file://`、`javascript:`、`http://localhost:8080/admin`，`_run_analysis` 随后**去 fetch** 该 URL。若攻击者在 MCP 里调 `analyze_competitor("file:///etc/passwd")`，后端会去 fetch 并"分析"本地密码文件（在其环境下不可任意读，但会"越陈越糟"）。
- 修复：fetch 前显式 scheme 白名单。
```python
if parsed.scheme not in ("http", "https"):
    return {"error": "INVALID_URL", "hint": "Only http/https URLs are supported"}
```
- 教训：任何服务端 fetch 的用户供给 URL，在做 scheme 白名单 + host 校验前都是 SSRF 候选。

**Bug 4（review 没抓到，生产才发现）：Railway 环境变量尾随空格**
- 现象：上线 3 天后 demo 自测，返回 `Server analook unable to connect`，`/mcp` 是 `HTTP 404`。6 小时排查：Railway 后台环境变量名是 `SUPABASE_SERVICE_KEY␣`（带尾随空格），UI 上看不见；Python `os.environ.get("SUPABASE_SERVICE_KEY")` 匹配不到带空格的键 → supabase client 初始化返回 `None` → `_require_credits` 落到"无 Supabase = dev 模式"分支 → MCP 鉴权工具全返回 `AUTH_REQUIRED` → `save_report_to_db` 静默 no-op。
- 后果：3 周用户跑的分析，报告只活在 Railway 临时容器磁盘，每次 redeploy 被清，**5 份报告丢失**。
- 修复（一行）：推了 `/api/debug/auth` 端点列出所有 `SUPABASE_*` 环境变量键（让尾随空格可见）；加 `_service_degraded_response()` 在 `SUPABASE_URL` 已设但 client 初始化失败时**显式拒绝（HTTP 503）**，不再静默回退 dev 模式。
- 教训：任何 `if config_present: real_path else: dev_mode_fallback` 分支，都要有"config 半坏"的第三态，否则上线 3 周才从周报发现。

### Takeaway（给 past-me 的 3 句话）
1. **每个 commit 跑独立 code review，尤其 MCP 类改动**：写代码的 agent 不该审自己的代码；review 者不知道"我们本意"，只看到"我们写了什么"，所以上线前抓到全部 3 个 P1。
2. **尾随空格是真的**：凡是人类在 UI 里手敲的字符串标识符，默认把尾随空格污染当失败模式。reader 里加 `.strip()`、debug 端点暴露精确 keyset、显式暴露降级态。
3. **最小有用的 MCP server 比你想的大**：5 个工具 = 280 行 Python + Starlette 包装 + contextvar 中间件 + 4 条路由错误映射 + FastMCP session/lifespan 管线。仍小，但不是 demo 里"5 行 hello world"。

---

## 对 ink-flow-manager 项目的可借鉴点

> InkFlow 是做 SEO/内容增长 + 竞品调研的 SaaS，其竞品分析工作流可直接用于 `seo-competitor-gap` 流程。以下 5 条可落地动作：

1. **把"5 信号增长指纹框架"固化进 seo-competitor-gap 流程**：在竞品调研时不再只填功能/定价 grid，而是强制输出 5 项——流量结构（SEO/付费/社区占比）、内容节奏+主题簇、评论情感走势、招聘信号、社区互动质量，并逼自己写一句假设 `靠[X]增长 / 缺口[Y] / 盯[Z]`。这正好补强现有 skill 的"差距分析"维度。

2. **复用 $5 级低成本竞品深潜 SOP，作为 seo-competitor-gap 的默认前置动作**：域名 → 60 秒快照（流量趋势/Top 关键词/PH 历史/GitHub/定价）→ 挑 1–2 信号用 Wayback Machine + Google Trends + Twitter 高级搜索手动深挖 → 写一句结论。可写成 skill 的"标准竞品体检清单"，避免一上来就上贵价工具。

3. **直接接入 Analook 的远程 MCP server 提升调研效率**：在 InkFlow 的 AI 工作流里加 `https://www.analook.com/mcp`（Bearer token），让 agent 在编辑器内并行拆解 2–4 个竞品并合成对比（3 分钟/3 credits），作为 seo-competitor-gap 的数据采集前置。注意照搬文末 4 个 bug 的避坑：schema 逐字对齐、UUID 用全量、URL scheme 白名单防 SSRF、环境变量 `.strip()` + 降级显式 503。

4. **把"评论轨迹 > 评分""社区是先行指标"作为竞品内容缺口判读规则**：在 seo-competitor-gap 输出里，不只列竞品排了哪些词，更要标出"竞品近一年评论软化 / 社区降温"这类信号，反向定位 InkFlow 可填补的内容与体验缺口。

5. **给 seo-competitor-gap 增加"买前决策问句"闸门**：每次竞品调研前先问"这次数据会改变哪个决策（定价/定位/发布时机/下一功能）？"若不能触发决策，降级为 30 分钟经验对话而非跑完整工具链，避免产出无人使用的报告。
