# Bot 逻辑规则总表

## 1. IG Outreach Bot (`bot-worker-cloak.ts`)

| 规则维度 | 参数 | 逻辑 |
|---------|------|------|
| **执行模式** | `BOT_EXEC_MODE` | browse_like = 浏览+点赞评论关注；browse_only = 只看不互动 |
| **真人休息** | `BOT_HUMAN_BREAK_MIN_MS` / `MAX_MS` | 每 N 个 profile 后休息 2-5 分钟，模拟真人刷手机停下来喝水 |
| **休息频率** | `BOT_BREAK_EVERY_N` | 默认 8 个 profile 后停一次，±1 随机抖动 |
| **点赞冷却** | `BOT_LIKE_COOLDOWN_MIN/MAX_HOURS` | 同一个账号 24-72h 内不重复点赞 |
| **评论概率** | `BOT_COMMENT_CHANCE` | 每个帖子 20% 概率评论 |
| **评论日上限** | `BOT_COMMENT_DAILY_MAX` | 每天最多评论 2 条 |
| **评论对象冷却** | `BOT_COMMENT_HANDLE_COOLDOWN_HOURS` | 同一个纹身师 72h 内不再评论 |
| **关注日上限** | `BOT_FOLLOW_DAILY_MIN/MAX` | 每天 3-6 个关注 |
| **关注冷却** | `BOT_FOLLOW_POST_COOLDOWN_HOURS` | 关注后 48h 内不取关 |
| **触达次数** | — | 同一个账号最多触达 3 次（like/comment/follow 算一次） |
| **关系图谱** | `BOT_RELATIONSHIP_SCRAPE_MIN_FOLLOWERS` | 粉丝 ≥ 200 才抓关系网络 |

---

## 2. Comment Generator (`comment-generator.ts`)

| 规则维度 | 参数 | 逻辑 |
|---------|------|------|
| **5 种风格权重** | `weights` | short_praise 25%、casual 25%、question 20%、detail_focused 15%、professional 15% |
| **语言** | `BOT_COMMENT_LANG` | auto = 根据 caption 自动检测；en/es/it/pt/fr/de 固定 |
| **语言检测** | `LANG_SIGNALS` | 函数词匹配 + 特殊字符权重，最低 1.5 分才切换语言 |
| **字数** | — | 6-20 词，一条短句最佳 |
| **去重** | `isTooSimilar()` | 跟最近 20 条历史评论算词重叠，>60% 相似重生成 |
| **重试** | — | 最多 3 次，降级 caption 上下文 + 强制 short_praise 风格 |
| **Fallback** | `fallbacks` | 3 次都重复 → 8 条硬编码模板里随机取 |
| **预热池** | `warmupCommentPool()` | 预生成 8 条评论存内存，少于 3 条自动补货 |
| **核心铁律** | Prompt 规则 | ① 不像 bot/营销/顾客 ② 不提购买/产品/DM ③ 用纹身行业语言 ④ 最多 1 个 emoji ⑤ 6-20 词 |
| **Style confidence** | `styleConfidence` | `high` = 可指名风格；`medium` = 带过即可；`low` = 只谈通用技术，不猜风格 |

---

## 3. Supply Comments Scraper (`bot-comments-scraper.ts`)

| 规则维度 | 参数 | 逻辑 |
|---------|------|------|
| **采集目标** | `BRAND_HANDLES` | 60 个 supply 品牌分 6 类（针/耗材、色料、机器、综合、护理、中国 OEM） |
| **纹身师范围** | `ARTISTS` | 150+ 纹身师，覆盖 15+ 语言区域，聚焦 fine line/realism/precision |
| **采集方式** | — | CDP Chrome → 遍历纹身师帖子 → 提取评论区品牌回复 |
| **分类规则** | `categorizeComment()` | 关键词匹配 9 类：compliment / product_mention / feature_request / artist_appreciation / collaboration / educational / technique_question / emoji_only / short_reaction / other |
| **输出** | `brand_comments_dataset.json` | 每条含 brand / artist / comment / category / wordCount / hasEmoji / postUrl |

---

## 4. Reddit Intel Bot (`bot-worker-cloak.ts:2324`)

| # | 规则 | 说明 |
|--|------|------|
| 1 | **语义理解** | 不关键词匹配，像人一样理解帖子 |
| 2 | **行话翻译** | "my pen" = 机器，"spits ink" = 针/色料问题，"bogs down" = 电机不够力 |
| 3 | **愿望/功能需求=最高价值** | 区分 wishlist_items（缺口）vs feature_requests（缺功能） |
| 4 | **区分技术 vs 产品** | "如何排色更好"（技术）≠ "我的 Bishop 比 Dragonhawk 排色好"（产品对比） |
| 5 | **具体痛点/赞点** | 不是 "bad quality" 而是 "motor overheats after 2h" |
| 6 | **品牌模糊识别** | "FK" = FK Irons，"dhawk" = Dragonhawk，"Chey" = Cheyenne |
| 7 | **技术水平推断** | 新手问 starter kit，pro 讨论性能细节 |
| 8 | **购买意图** | researching / ready_to_buy / just_bought 三档 |
| 9 | **对比结论** | 哪个品牌赢了 + 原因 |
| 10 | **价格敏感度** | budget_conscious / premium_only |
| 11 | **过滤社交帖** | 纯艺术展示帖标记 is_product_related: false |

---

## 5. Bot Stealth 指纹伪装 (`bot-stealth.ts`)

| 规则维度 | 说明 |
|---------|------|
| **navigator.webdriver** | 抹除，防止 IG 检测自动化 |
| **Canvas 指纹** | 确定性种子随机化（per bot），每次启动一致 |
| **WebGL 指纹** | 随机化 + 种子一致性 |
| **WebRTC** | 禁用（防真实 IP 泄漏） |
| **时区/语言/UA** | 匹配代理 IP 所在地 |
| **hardwareConcurrency** | 伪造 CPU 核心数 |
| **plugins** | 伪造 Chrome 插件数组 |
| **种子算法** | SHA-256 bot ID → mulberry32 PRNG |
| **视图** | `--window-size=1280,900`，deviceScaleFactor=2 |

---

## 6. Bot 人格画像 (`bot-profile.ts`)

| 画像 ID | 类型 | 活跃时段 | 特征 |
|---------|------|---------|------|
| `night_owl` | 夜猫子 | 22:00-02:00, 14:00-17:00 | 高互动、深度浏览、爱评论、慢节奏 |
| `scroller` | 随手刷 | 07:00-09:00, 12:00-14:00, 18:00-20:00 | 碎片刷、选择性点赞、基本不评 |
| `professional` | 业内同行 | 09:00-12:00, 15:00-18:00 | 专业口吻、行业内容优先、战略关注 |
| `social_butterfly` | 社交达人 | 10:00-13:00, 16:00-22:00 | 话多、高频互动、关注涨粉快 |
| `lurker` | 潜水党 | 08:00-10:00, 20:00-23:00 | 只看不互动，浏览慢 |
| `growth_hacker` | 增长黑客 | 06:00-09:00, 11:00-14:00, 19:00-22:00 | 定时定量、数据驱动、关注/取关循环 |
| `weekend_warrior` | 周末党 | 工作日12-13点，周末10-18点 | 工作日少量，周末集中大量操作 |
| `collector` | 收藏家 | 09:00-11:00, 14:00-16:00, 21:00-23:00 | 关注多、保存多、编目式浏览 |

---

## 7. Supply Analysis Bot (`bot-worker-cloak.ts:2545`)

| 规则维度 | 说明 |
|---------|------|
| **采集源** | IG 主页（粉丝/发帖/bio/商业标记）、评论情感分析、多角度 Web 搜索 |
| **搜索维度** | Reddit/电商/新闻/官网 4 渠道交叉验证 |
| **产出** | 产品矩阵（名称/品类/定价/目标客群/迭代历史）、竞品变更日志、发布策略模型 |
| **分析链路** | teaser → reveal → demo → availability → sustain 全链路逆向工程 |

---

## 8. Product Tracker Bot (`product-tracker.ts`)

| 规则维度 | 说明 |
|---------|------|
| **数据源** | Supply Analysis + Reddit Intel + Forum Monitor 多源聚合 |
| **检测内容** | 新品发布/下架/改版/扩张 |
| **覆盖品类** | 纹身机器/笔、色料、护理、耗材配件 |
| **社交热力评分** | 0-100 |
| **输出** | competitor_products 表更新 + 变更推送 |

---

## 9. Forum Monitor Bot (`forum-monitor.ts`)

| 规则维度 | 说明 |
|---------|------|
| **渲染方式** | Playwright 渲染 XenForo/vBulletin 论坛 |
| **数据源** | ReinventingTheTattoo / LastSparrowTattoo / TattooNow |
| **提取内容** | 新帖 + 新回复 |
| **AI 分类** | 品牌/产品/机器/色料/技术/护理/行业 |
| **输出** | intel 表，与 Reddit Intel 互补覆盖论坛渠道 |

---

## 10. 真人行为模拟（贯穿所有 bot）

| 行为 | 实现方式 |
|------|---------|
| **鼠标移动** | `humanMouseMove()` — 随机贝塞尔曲线路径 |
| **悬停** | `humanHover()` — 随机停在某些元素上看看 |
| **打字** | `humanTypeInto()` — 打字速度 40-120ms/键、随机停顿、随机打错+退格 |
| **滚动** | `page.mouse.wheel()` — 每次滚 80-900px 不等，不是匀速 |
| **浏览量图** | 点开帖子后停留 2.5-7s 才关，模拟看内容 |
| **休息** | 每 N 个 profile 后 2-5 分钟 break |
| **坐标点击** | 不直接用 `element.click()`，有时用 `page.mouse.click(x, y)` 模拟真实点击位置 |
| **Jitter** | 所有延迟带 ±30-50% 随机抖动，拒绝固定值 |

---

## 11. Closed-Loop IG 互动系统

| 回路 | 说明 |
|------|------|
| **互动回报** | `checkOwnPostComments()` — bot 回复自己帖子下的评论 |
| **粉丝归因** | `ig_relationships` + `daily_bot_stats` 追踪每个 bot 带来的粉丝 |
| **内容管道注入** | 高信号观察 → `content_samples` 表 |
| **DM 自动回复** | `checkDmReplies()` → `classifyIntent()` → `pickAutoReply()` 从 marketing_scripts 表取 |
| **日活追踪** | `daily_bot_stats` 每个 bot 每日操作统计 |
| **学习循环** | 每 20 个任务 → `POST /api/bot/learn/analyze` → 更新 `bot_profile_adjustments` |
