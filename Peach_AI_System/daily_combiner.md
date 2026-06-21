# Peach 超级生图专家 — 每日组合引擎

> 基于 16+ 篇 Kwadron IG 帖子 + 21 场景库 + 10 个关键词典 + 产品原图分析，
> 每日自动生成不重复的组合提示词，确保 3-10 个账号每天出图不撞车。

---

## 一、Peach 产品视觉锚定（Product Identity Lock）

### 产品身份定义（精确结构）

```
Peach 纹身墨盒 = 圆柱形 cartridge，总长 6.5cm

从下到上：
├─ 顶部：粉色塑料塞子 1cm 高 + 3mm 透明圆杆
├─ 绿色塑料台阶 2mm 高（直径比粉色环小 2mm）
├─ 粉色硅胶心形环 1.5cm 长（外粉色硅胶 + 内绿色塑料 + 心形凹槽 + PEACH logo）
├─ 白色半透明磨砂外壳（主体，内含不锈钢针）
└─ 底部：透明塑料，内含不锈钢针尖（形状因针型 RL/RS/M1/CM/F 不同）

品牌识别三件套：粉色硅胶心形环 ★★★★★ + 绿色台阶 ★★★★ + 顶部粉色塞子 ★★★★

CON = 粉绿配色 / COG = 灰白配色 / AES = 粉透明配色
```

### 产品锚点库（6 张标准参照图）

每张图都有精确的尺寸和位置标注：

| 锚点 | 描述 | 用途 |
|------|------|------|
| anchor_front | 正侧面，针尖朝右，水平放置 | 产品身份识别 |
| anchor_needle_macro | 针尖微距，占画面 1/2 | 技术感展示 |
| anchor_top_view | 俯视，铜环位置清晰 | 结构识别 |
| anchor_back_view | 背面，橡胶膜 + 接口 | 接口兼容展示 |
| anchor_handheld | 手持，显示尺寸 | 生活化场景 |
| anchor_exploded | 分解：针管+外壳+铜环+膜 | 工艺拆解 |

---

## 二、同行出图模式库（来自 Kwadron 16+ 帖分析）

### 6 种核心构图模式（Hook Patterns）

通过分析 Kwadron 16 篇 IG 帖，发现他们的构图集中在以下 6 种：

| 模式 | 占比 | 描述 | 代表作 |
|------|------|------|--------|
| **needle_macro** | 44% | 极浅景深，针尖/针管特写占画面 1/3-1/2 | DYCKPh1Ck6-, DXGspjMjTS1 |
| **product_shot** | 19% | 产品 + 包装盒完整展示，产品居中 | DUaa989Ci63, DUK1RYmlQRo |
| **promotional** | 19% | 品牌文字 + 产品局部，科技感 | DYCKPh1Ck6-, DV_Ay0wimMK |
| **skin_entry** | 6% | 针入皮肤特写，工艺展示 | DXjBXb0iFli |
| **lifestyle** | 6% | 品牌标识 + 工作室环境 | DXHAEdoiZLi, DW8qBB_Deca |
| **dramatic_zoom** | 6% | 设备部件放大，视觉冲击 | DYCKPh1Ck6- |

### Kwadron 视觉风格特征

| 维度 | Kwadron 做法 | Peach 可做 |
|------|-------------|-----------|
| **配色** | 黑金为主，100% 黑金配色 | 粉绿/灰白/粉透明 三色系 |
| **背景** | 纯黑渐变 > 深灰 > 白色 | 同左，加品牌色渐变 |
| **灯光** | 侧逆光 66% + 硬光 66% + 戏剧光 | 同左，加品牌色光 |
| **情绪** | luxury / prestige（高级感） | luxury + warmth（高级+亲和） |
| **文字** | 大号白色/金色标题叠加 | 同左，用 Peach 品牌字 |
| **色调** | 冷灰 + 品牌色点缀 | 冷灰 + 粉/绿点缀 |

### Cheyenne / FK Irons / Dragonhawk 对比

| 品牌 | 核心色调 | 构图偏好 | 灯光偏好 | 独特之处 |
|------|---------|---------|---------|---------|
| **Kwadron** | 黑金 | 针尖微距 | 侧逆硬光 | 极简高级，黑金统一 |
| **Cheyenne** | 橙黑 | 产品排列 | 暖光渐变 | 橙色能量感，温暖 |
| **FK Irons** | 紫绿红 | 多机排列 | 冷光 + 渐变 | 限量色彩，科技感 |
| **Dragonhawk** | 荧光绿 | 悬浮对角线 | 侧光 + 烟雾 | 赛博朋克，未来感 |
| **Bishop** | 银灰紫 | 对称排列 | 均匀柔光 | 干净优雅，秩序感 |
| **Eternal** | 荧光色 | 节日主题 | 均匀顶光 | 万圣节/圣诞限定 |

---

## 三、每日组合引擎（Daily Combiner）

### 组合公式

```
每日提示词 = [产品锚点] + [构图模式] + [灯光] + [背景] + [氛围] + [配色]
```

### 维度表

#### 维度 1: 产品锚点（每天选 1 个）

| ID | 锚点 | 提示词片段 |
|----|------|-----------|
| A1 | 正侧面 | "cylindrical cartridge, white frosted housing, gold brass ring mid-body, vertical orientation, needle tip pointing up" |
| A2 | 针尖微距 | "extreme macro view of needle tip, stainless steel precision, shallow depth of field" |
| A3 | 手持尺寸 | "gloved hand holding cartridge mid-body, showing real scale" |
| A4 | 三件排列 | "three cartridges aligned horizontally, evenly spaced" |
| A5 | 工作台场景 | "cartridge on black workstation mat with ink caps scattered around" |

#### 维度 2: 构图模式（每天选 1 个）

| ID | 模式 | 提示词片段 |
|----|------|-----------|
| C1 | 针尖微距特写 | "extreme close-up, needle tip fills 1/2 frame, <1mm depth of field" |
| C2 | 45度斜侧悬浮 | "45-degree angled floating, diagonal composition" |
| C3 | 正侧面平视 | "eye-level side profile, full length visible" |
| C4 | 俯拍俯角 | "45-degree overhead angle, top and front visible" |
| C5 | 低角度仰拍 | "worm's-eye view, looking up, heroic perspective" |
| C6 | 手持特写 | "gloved hand holding, medium close-up" |
| C7 | 三件对称 | "three items symmetrically arranged, centered" |

#### 维度 3: 灯光（每天选 1-2 个）

| ID | 类型 | 提示词片段 |
|----|------|-----------|
| L1 | 侧逆光 | "side-rim light, sharp edge highlight along contour" |
| L2 | 柔光顶光 | "soft overhead light, even coverage, gentle shadows" |
| L3 | 硬质侧光 | "hard side light, razor-sharp shadow, high contrast" |
| L4 | 双光源混合 | "warm key light + cool rim, mixed temperature" |
| L5 | 霓虹色光 | "neon pink/blue ambient glow from side" |
| L6 | 环形微距光 | "ring light, shadowless macro illumination" |
| L7 | 底部透光 | "bottom-lit, glow from below, floating effect" |

#### 维度 4: 背景（每天选 1 个）

| ID | 类型 | 提示词片段 |
|----|------|-----------|
| B1 | 纯黑渐变 | "black gradient background, darker at top, subtle reflection at bottom" |
| B2 | 纯白无限 | "pure white seamless background, studio infinity" |
| B3 | 深灰工作室 | "dark gray studio backdrop, subtle texture" |
| B4 | 品牌色渐变 | "peach brand color gradient (pink to green)" |
| B5 | 工作台表面 | "black matte workstation surface, slight scuff marks" |
| B6 | 金属拉丝 | "brushed metal surface, industrial texture" |
| B7 | 大理石 | "white marble surface, gray veining" |
| B8 | 霓虹暗墙 | "dark wall with neon light reflection" |

#### 维度 5: 氛围（每天选 1 个）

| ID | 氛围 | 提示词片段 |
|----|------|-----------|
| F1 | 精密高端 | "precision engineering aesthetic, clinical clean, professional" |
| F2 | 温暖亲和 | "warm and approachable, soft edges, inviting" |
| F3 | 赛博科技 | "cyberpunk tech, LED glow, futuristic" |
| F4 | 奢华优雅 | "luxury beauty aesthetic, refined, high-end" |
| F5 | 力量硬核 | "aggressive, powerful, dark and intense" |
| F6 | 日常纪实 | "documentary style, real studio environment" |

#### 维度 6: 配色方案（按产品线选）

| 产品线 | 配色方案 | 提示词片段 |
|--------|---------|-----------|
| 主线 CON | 粉绿 | "accent color: soft pink and mint green" |
| Men COG | 灰白 | "accent color: charcoal gray and clean white" |
| PMU AES | 粉透明 | "accent color: translucent pink, delicate" |

---

## 四、每日输出模板（每天 3-5 张不重复）

### 示例：Day 1

**图 1（针尖微距 + 硬光 + 黑背景）**
```
extreme macro close-up of tattoo cartridge needle tip, stainless steel precision
group 7 needles in circular arrangement, sharp metallic reflection,
side-rim light from right-back at 45 degrees, hard light creating razor-sharp shadow edges,
pure black gradient background with subtle bottom reflection,
depth of field <1mm, only tip in focus,
precision engineering aesthetic, professional, ultra HD
```

**图 2（手持 + 柔光 + 工作台）**
```
black nitrile gloved hand holding white frosted cartridge mid-body,
needle tip pointing up, gold brass ring visible at mid-section,
soft diffused light from upper-left, natural skin-to-metal texture contrast,
black matte workstation surface with ink caps scattered nearby,
slight scuff marks on table, real studio feel,
documentary style, warm and approachable
```

**图 3（三件排列 + 顶光 + 品牌色）**
```
three peach cartridges aligned horizontally, evenly spaced,
white frosted housing with gold brass ring,
soft overhead light, even coverage, minimal shadows,
pink-to-green gradient background,
eye-level symmetric composition,
precision engineering aesthetic, clinical clean
```

**图 4（悬浮 + 霓虹光 + 赛博）**
```
white cartridge floating vertically at center frame,
neon pink and blue side light creating edge glow on frosted housing,
gold brass ring reflecting colored light,
dark wall background with neon reflection,
45-degree angled floating, dynamic composition,
cyberpunk tech, futuristic
```

### 示例：Day 2（完全不同的组合）

**图 1（正侧面 + 硬侧光 + 金属背景）**
**图 2（针尖微距 + 环形光 + 白底）**
**图 3（手持 + 自然光 + 森林背景）**
**图 4（低角度 + 暖背光 + 力量感）**

---

## 五、防重复策略

### 规则

1. **相邻帖子至少换 2 个维度** — 不能连续两张图只用不同背景
2. **同一账号每天最多 1 张微距** — 避免同质化
3. **产品线轮换** — CON/COG/AES 交替使用，不连续发同一产品线
4. **构图模式池轮换** — 6 种构图模式在一周内均匀分布

### 每周出图计划模板

| 周一 | 周二 | 周三 | 周四 | 周五 | 周六 | 周日 |
|------|------|------|------|------|------|------|
| 微距硬光 | 手持自然 | 三件排列 | 悬浮霓虹 | 工作台纪实 | 产品包装 | 品牌创意 |

---

## 六、禁止事项（From forbidden_rules.md）

绝对不生成以下：
- 医疗注射器 / 针筒 / 采血针
- 医院 / 诊所场景
- 血迹 / 刺入皮肤
- 其他品牌 logo
- 非纹身行业文字

高危词（prompt 中避免）：
syringe, injection, medical, hospital, blood, doctor, nurse, surgery

---

## 七、Prompt 生成器（Python 脚本接口）

```python
# 用法示例
from daily_combiner import generate_daily_prompt

# 生成一天 4 张不重复图
prompts = generate_daily_prompt(
    product_line="CON",  # 或 "COG", "AES"
    count=4,
    avoid_yesterday=["C1_L1_B1", "C6_L5_B8"]  # 排除昨天用过的组合
)

for i, p in enumerate(prompts, 1):
    print(f"Day X - 图{i}:")
    print(p)
    print("---")
```

### 组合 ID 编码

```
C1_L1_B1 = 构图模式1 + 灯光1 + 背景1
避免重复用：C1_L1_B1, C1_L3_B1, C2_L1_B1
```

---

## 八、视觉质量要求

所有输出必须满足：
1. **产品识别度 > 90%** — 一眼能认出是纹身墨盒
2. **无医疗联想** — 不能像注射器
3. **光影层次丰富** — 至少有 3 层光影（主光+补光+环境光）
4. **材质表现准确** — 磨砂外壳不透明、金环有金属反光、针尖有高光
5. **品牌一致性** — 粉绿/灰白/粉透明配色不乱用

---

## 九、每日工作流

```
每天早上 8:00
  |
  v
1. 读取昨日已用组合 ID（避免重复）
2. 从组合引擎随机抽取 3-5 个不重复组合
3. 按产品线（CON/COG/AES）轮换分配
4. 输出 3-5 条 prompt
5. 每条 prompt 附带：
   - 组合 ID（用于去重追踪）
   - 目标账号（如果是多账号）
   - 建议配文风格（Kwadron式/ Cheyenne式/ 自有风格）
```

---

## 十、快速参考卡（Daily Quick Card）

每次生图前，填这 5 个空：

```
产品：[CON / COG / AES]
构图：[C1 微距 / C2 45度 / C3 平视 / C4 俯拍 / C5 仰拍 / C6 手持 / C7 三件]
灯光：[L1 侧逆 / L2 顶光 / L3 硬侧 / L4 混合 / L5 霓虹 / L6 环形 / L7 底部]
背景：[B1 黑渐变 / B2 白无限 / B3 深灰 / B4 品牌色 / B5 工作台 / B6 金属 / B7 大理石 / B8 霓虹]
氛围：[F1 精密 / F2 温暖 / F3 赛博 / F4 奢华 / F5 力量 / F6 纪实]
```

组合后自动生成完整 prompt。
