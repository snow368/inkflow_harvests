# @_zheergen — Ideogram 4.0 开源生图模型（Structured JSON Prompting）

**原文：** https://x.com/_zheergen/status/2062409005994234272
**类型：** 🔴 AI 生图工具 / 开源模型

---

## 一、核心信息

| 维度 | 数据 |
|------|------|
| 模型 | Ideogram 4.0（开源） |
| 权重 | 9.3B open-weight |
| 分辨率 | 支持 2K 生成 |
| 显存 | nf4 版本 24GB 可跑 |
| 多语言文字渲染 | ✅ 支持中文 |
| GitHub | https://t.co/0bDfC4sWBD |

### 最关键的特性：Structured JSON Prompting

不是写一句 prompt 许愿，而是用 JSON **像设计施工图一样控制画面**：

```json
{
  "text_position": "top center",
  "objects": [
    {"type": "product", "position": "center", "color": "pink"},
    {"type": "background", "style": "gradient", "colors": ["white", "light-pink"]}
  ],
  "foreground": "...",
  "background": "..."
}
```

可以精确控制：
- 文字放哪
- 物体放哪
- 颜色用什么
- 背景和前景怎么分
- 元素位置框

---

## 二、范式层面的意义

> "ChatGPT Image 2 强在综合体验和产品化。Ideogram 4.0 则是冲着开源可控设计模型去的"

**可控生图** 和 **prompt 许愿** 的区别：

| 维度 | Prompt 生图（旧范式） | JSON 可控（新范式） |
|------|---------------------|-------------------|
| 控制粒度 | 自然语言描述，随机性大 | 精确位置/颜色/布局 |
| 可重复性 | 同 prompt 每次不一样 | 同 JSON 每次一致 |
| 生产可用性 | 需要多次抽卡 | 一次生成到位 |
| 集成难度 | 只能手动 | 程序化调用 |

---

## 三、对 Peach 管线的直接应用

Peach 目前的问题：
- 用 Qwen/硅基流动生图 → 质量不稳定
- 需要 5 种风格 × 3 产品 = 15 张测试图
- 没有精确控制布局的能力

Ideogram 4.0 的 JSON prompting 可以：

```json
{
  "description": "PMU needle product shot",
  "background": {"style": "gradient", "from": "#1a237e", "to": "#e0e0e0"},
  "objects": [
    {
      "type": "product",
      "position": "center",
      "name": "CON cartridge needle",
      "angle": "45-degree",
      "shadow": "soft drop"
    }
  ],
  "text_overlay": {"content": "CON", "position": "bottom-right", "style": "metallic"},
  "decorative_elements": ["geometric_lines", "white_rings"],
  "lighting": "studio softbox"
}
```

**优势：**
1. 每次生成的布局一致（同一套 JSON 换背景色就行）
2. 支持中文文字渲染（Peach 品牌字标可以直接图上渲染）
3. 开源可本地部署（隐私安全）
4. 24GB 显存就能跑

### 跟现有方案的对比

| 维度 | Qwen (硅基流动) | Ideogram 4.0 |
|------|----------------|--------------|
| 可控性 | 低（自然语言 prompt） | **高（JSON 结构化）** |
| 中文支持 | 一般 | ✅ |
| 成本 | API 按次付费 | **开源免费** |
| 部署 | 云端 | 本地/云端 |
| 质量 | 中等 | ✅ ChatGPT Image 2 级别 |

---

## 四、行动项

| # | 行动 | 优先级 |
|---|------|--------|
| 1 | 查看 Ideogram 4.0 GitHub 了解部署要求 | 🔴 高 |
| 2 | 评估 24GB VRAM（本地能否跑，或租 GPU） | 🔴 高 |
| 3 | 如果用，把 Peach 的 5 种风格模板翻译成 JSON structure | 🟡 中 |
| 4 | 如果部署成本低，替代 Qwen 做 Peach 的默认生图引擎 | 🟡 中 |

---

**关联记忆：** [[ai-image-generation]] [[peach-project-progress-2026-06-04]] [[daily-progress-2026-06-05]]
