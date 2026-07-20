// classify.mjs — 知识入库分类引擎（Gemini 主分类 + 关键词规则兜底）
// 零依赖，Node 18+ 全局 fetch。被 ingest.mjs / server.mjs 复用。
//
// 环境变量：
//   GEMINI_API_KEY   必填（走 LLM 时）。缺失则自动降级为规则兜底。
//   GEMINI_ENDPOINT  默认 https://generativelanguage.googleapis.com
//                    国内请设为你的 CF Worker 代理地址（GFW 直连会失败）。
//   GEMINI_MODEL     默认 gemini-2.0-flash
//
// 导出：classify(text, { platformHint, dimHint, kbHint }) -> Promise<result>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAXONOMY = JSON.parse(fs.readFileSync(path.join(__dirname, "taxonomy.json"), "utf-8"));

// ---------- 组 Gemini 提示词 ----------
function buildPrompt(text) {
  const seo = TAXONOMY.kbs.seo.dimensions;
  const soc = TAXONOMY.kbs.social.dimensions;
  const plat = TAXONOMY.kbs.social.platforms;
  const seoList = Object.entries(seo).map(([id, v]) => `    - ${id}: ${v.label}`).join("\n");
  const socList = Object.entries(soc).map(([id, v]) => `    - ${id}: ${v.label}`).join("\n");
  const platList = Object.entries(plat).map(([id, v]) => `    - ${id}: ${v.label}`).join("\n");
  return `你是 InkFlow 知识库的分类器。把下面这条知识分到正确的库和桶，只输出 JSON，不要任何解释性文字。

【库 kb】二选一：
  - seo   = SEO / 搜索引擎优化 / 排名 / 关键词 / 外链 / 技术SEO / 内容写作
  - social = 社媒运营 / 内容营销 / 涨粉 / 钩子文案 / 平台战术 / 社媒获客

【若 kb=seo，dimension 六选一】
${seoList}

【若 kb=social，dimension 六选一】
${socList}
  且必须选一个 platform：
${platList}
  （通用/不指向单一平台 → cross）

【输出 JSON 形状】
{
  "kb": "seo|social",
  "dimension": "上面对应库的 dimension id",
  "platform": "social 必填；seo 恒为 null",
  "title": "≤40字中文标题",
  "summary": "2-4句核心提炼：学到什么+怎么用",
  "category": "更细小类，自由中文短语",
  "tags": ["3-6个关键词"],
  "confidence": 0.0,
  "reason": "一句话分类依据"
}

【待分类知识】
"""
${text.slice(0, 6000)}
"""`;
}

// ---------- Gemini 调用 ----------
async function callGemini(text) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, err: "GEMINI_API_KEY 未设置" };
  const endpoint = (process.env.GEMINI_ENDPOINT || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `${endpoint}/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(text) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return { ok: false, err: `HTTP ${resp.status}` };
    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return { ok: false, err: "空响应" };
    const parsed = JSON.parse(raw);
    return { ok: true, result: parsed };
  } catch (e) {
    return { ok: false, err: e.message || String(e) };
  }
}

// ---------- 规则兜底（关键词打分）----------
function scoreBucket(text, hints) {
  const low = text.toLowerCase();
  let s = 0;
  for (const h of hints) if (low.includes(h.toLowerCase())) s += 1;
  return s;
}

export function classifyByRules(text) {
  const seoDims = TAXONOMY.kbs.seo.dimensions;
  const socDims = TAXONOMY.kbs.social.dimensions;
  const platforms = TAXONOMY.kbs.social.platforms;

  // 先判库：SEO 总分 vs Social 总分
  let seoScores = {}, socScores = {};
  for (const [id, v] of Object.entries(seoDims)) seoScores[id] = scoreBucket(text, v.hints);
  for (const [id, v] of Object.entries(socDims)) socScores[id] = scoreBucket(text, v.hints);
  const seoTotal = Object.values(seoScores).reduce((a, b) => a + b, 0);
  const socTotal = Object.values(socScores).reduce((a, b) => a + b, 0);

  const kb = socTotal > seoTotal ? "social" : "seo";
  const dims = kb === "seo" ? seoScores : socScores;
  const best = Object.entries(dims).sort((a, b) => b[1] - a[1])[0];
  const dimension = best[0];
  const topScore = best[1];

  let platform = null;
  if (kb === "social") {
    let pScores = {};
    for (const [id, v] of Object.entries(platforms)) pScores[id] = scoreBucket(text, v.hints);
    const pBest = Object.entries(pScores).sort((a, b) => b[1] - a[1])[0];
    platform = pBest[1] > 0 ? pBest[0] : "cross";
  }

  const total = kb === "seo" ? seoTotal : socTotal;
  const confidence = total === 0 ? 0.2 : Math.min(0.85, 0.4 + topScore * 0.1);
  const first = text.trim().split("\n")[0].slice(0, 40) || "未命名知识";

  return {
    kb, dimension, platform,
    title: first,
    summary: text.trim().slice(0, 200),
    category: "auto-rules",
    tags: [],
    confidence: Number(confidence.toFixed(2)),
    reason: `规则兜底：${kb} 命中 ${total} 关键词，最强桶 ${dimension}(${topScore})`,
    engine: "rules",
  };
}

// ---------- 校验 + 归一化 LLM 结果 ----------
function normalize(r) {
  const validKb = ["seo", "social"];
  if (!validKb.includes(r.kb)) throw new Error(`非法 kb: ${r.kb}`);
  const dims = TAXONOMY.kbs[r.kb].dimensions;
  if (!dims[r.dimension]) throw new Error(`非法 dimension: ${r.dimension} for ${r.kb}`);
  if (r.kb === "social") {
    const plats = TAXONOMY.kbs.social.platforms;
    if (!r.platform || !plats[r.platform]) r.platform = "cross";
  } else {
    r.platform = null;
  }
  r.title = (r.title || "未命名知识").slice(0, 40);
  r.summary = r.summary || "";
  r.category = r.category || "";
  r.tags = Array.isArray(r.tags) ? r.tags.slice(0, 6) : [];
  r.confidence = typeof r.confidence === "number" ? r.confidence : 0.5;
  r.reason = r.reason || "";
  r.engine = "gemini";
  return r;
}

// ---------- 主入口 ----------
export async function classify(text, opts = {}) {
  if (!text || !text.trim()) throw new Error("空输入");
  let result, note = "";
  const g = await callGemini(text);
  if (g.ok) {
    try {
      result = normalize(g.result);
    } catch (e) {
      note = `LLM 结果非法(${e.message})，已用规则兜底`;
      result = classifyByRules(text);
    }
  } else {
    note = `LLM 不可用(${g.err})，已用规则兜底`;
    result = classifyByRules(text);
  }

  // 人工覆盖（入口里手动指定）优先级最高
  if (opts.kbHint && ["seo", "social"].includes(opts.kbHint)) result.kb = opts.kbHint;
  if (opts.dimHint) result.dimension = opts.dimHint;
  if (opts.platformHint) result.platform = opts.platformHint;
  if (result.kb === "seo") result.platform = null;

  if (result.confidence < 0.6) result.needsReview = true;
  if (note) result.note = note;
  return result;
}

// CLI: node classify.mjs "一段知识文本"
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, "/") ||
    process.argv[1] && process.argv[1].endsWith("classify.mjs")) {
  const text = process.argv.slice(2).join(" ");
  if (text) classify(text).then(r => console.log(JSON.stringify(r, null, 2)));
}
