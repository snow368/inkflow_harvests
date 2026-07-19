import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Plus,
  Loader2,
  Globe,
  PackagePlus,
  X,
  Trash2,
  CheckCircle2,
  CircleDashed,
  ArchiveX,
  Camera,
  Images,
  RefreshCw,
  MessagesSquare,
  Upload,
  Download,
  Lightbulb,
  Wrench,
  PackageX,
  Hammer,
  Satellite,
  Radio,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Star,
  ShoppingCart,
  ThumbsDown,
  BatteryWarning,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listProducts,
  listCompetitorPosts,
  createMemory,
  deleteMemory,
  captureSnapshot,
  listIntelEvents,
  ingestReviews,
  listReviews,
  harvestReviews,
  upsertAudience,
  listAudience,
  createCampaign,
  listCampaigns,
  dispatchCampaign,
  type MemoryItemDTO,
  type IntelEventDTO,
  type ReviewDTO,
  type ReviewStats,
  type ReviewSignal,
  type StoredAudienceDTO,
  type CampaignDTO,
  createWatch,
  listWatch,
  deleteWatch,
  runWatch,
  type RedditWatchDTO,
  type StoredRedditWatchDTO,
  type WatchRunResultDTO,
  getTriangulatedLeads,
  type TriangulatedLead,
  type LeadEvidence,
} from "@/lib/aicore";
import { aggregateProductFamilies } from "@/lib/aggregateProducts";

const CLOUD_API = "";

/** Create a content brief from an intelligence item (competitor / triangulation / gap). */
async function createBriefFromIntel(source: string, title: string, product: string, score: number, extra?: Record<string, string>) {
  const r = await fetch(CLOUD_API + "/api/content/briefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, source, product, score, format: "Reel", platform: "Instagram", ...extra }),
  });
  if (!r.ok) throw new Error("Brief 创建失败");
  return r.json();
}

function parseMeta(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object") return p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  } else if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
}

const SELECTION_TENANT = "selection";

// Derive the intelligence tenant from a free-text industry keyword. This is what
// makes the new-arrivals page reusable for ANY industry without a fixed enum:
// the user just types the industry and an isolated tenant is created on the fly.
//   "纹身"/"tattoo" → competitors:tattoo   (the original IG-bot-backed tenant)
//   "通用"/"general" → competitors:general  (the serverless research tenant)
//   anything else    → competitors:<slug>   (e.g. 美妆 → competitors:美妆)
function tenantFromKeyword(kw: string): string {
  const t = (kw || "").trim();
  const low = t.toLowerCase();
  if (!t || low === "纹身" || low === "tattoo") return "competitors:tattoo";
  if (low === "通用" || low === "general") return "competitors:general";
  const safe = t.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `competitors:${safe || "general"}`;
}
const WINDOWS = [
  { label: "近 7 天", days: 7 },
  { label: "近 30 天", days: 30 },
  { label: "近 90 天", days: 90 },
  { label: "全部", days: 9999 },
];
const SELECTION_STATUS = ["考虑中", "已进货", "已放弃"] as const;

type SelStatus = (typeof SELECTION_STATUS)[number];

/* ── Section G: 三角共振 / 选品线索 (chat demand × review gap × competitor moves) ─ */
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-zinc-400">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

const SRC_COLOR: Record<string, string> = { chat: "bg-sky-400", review: "bg-amber-400", intel: "bg-violet-400" };
const SRC_LABEL: Record<string, string> = { chat: "聊单需求", review: "评论缺口", intel: "竞品动作" };

function TriangulationLeads({ tenant }: { tenant: string }) {
  const [leads, setLeads] = useState<TriangulatedLead[]>([]);
  const [counts, setCounts] = useState<{ chatDemandMessages: number; reviewGapReviews: number; intelEvents: number } | null>(null);
  const [windowDays, setWindowDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = useCallback(
    async (push: boolean) => {
      setError(null);
      if (push) setPushing(true);
      else setLoading(true);
      try {
        const res = await getTriangulatedLeads(tenant, { days: windowDays, autoPush: push });
        setLeads(res.leads);
        setCounts(res.sourceCounts);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
        setPushing(false);
      }
    },
    [windowDays]
  );

  useEffect(() => {
    run(false);
  }, [run]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-rose-400" />
          <h3 className="text-lg font-bold text-zinc-100">三角共振 · 选品线索</h3>
        </div>
        <div className="flex items-center gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              onClick={() => setWindowDays(w.days)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg border",
                windowDays === w.days ? "bg-rose-600/20 border-rose-500/40 text-rose-200" : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        聊单需求（sales）× 评论缺口（competitors）× 竞品动作（competitors）三源交叉验证。
        <span className="text-rose-300">仅当 3 源共振才自动推入选品池</span>，并附证据链供人工拍板。
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => run(false)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 刷新预览
        </button>
        <button
          onClick={() => run(true)}
          disabled={pushing}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-600 to-rose-600 hover:opacity-90 disabled:opacity-40 text-white flex items-center gap-1.5"
        >
          {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} 扫描并推入选品池
        </button>
        {counts && (
          <span className="text-[11px] text-zinc-500">
            聊单需求 {counts.chatDemandMessages} · 评论缺口 {counts.reviewGapReviews} · 竞品动作 {counts.intelEvents}
          </span>
        )}
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}

      {loading ? (
        <div className="text-zinc-500 text-sm py-6 text-center">计算中…</div>
      ) : leads.length === 0 ? (
        <div className="text-zinc-500 text-sm py-6 text-center">当前窗口内三源无交叉共振线索。多积累聊单 / 评论 / 竞品快照后会出现。</div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const open = expanded === l.theme;
            return (
              <div key={l.theme} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100">{l.themeLabel}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          l.resonance === 3 ? "bg-emerald-500/20 text-emerald-300" : l.resonance === 2 ? "bg-amber-500/20 text-amber-300" : "bg-zinc-700 text-zinc-400"
                        )}
                      >
                        {l.resonance} 源共振
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          l.recommendation === "auto" ? "bg-rose-500/20 text-rose-300" : l.recommendation === "review" ? "bg-amber-500/20 text-amber-300" : "bg-zinc-700 text-zinc-400"
                        )}
                      >
                        {l.recommendation === "auto" ? "自动推进" : l.recommendation === "review" ? "建议评估" : "观察"}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      聊单 {l.sources.chat} · 评论 {l.sources.review} · 竞品 {l.sources.intel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-zinc-100">{l.score}</div>
                    <div className="text-[10px] text-zinc-500">共振分</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <Bar label="需求强度" value={l.components.demandStrength} color="bg-sky-400" />
                  <Bar label="竞争空白度" value={l.components.whitespace} color="bg-violet-400" />
                  <Bar label="趋势斜率" value={l.components.trendSlope} color="bg-emerald-400" />
                  <Bar label="供应链可行性" value={l.components.supplyFeasibility} color="bg-amber-400" />
                </div>

                {l.recommendation === "auto" && (
                  <div className={cn("text-[11px] flex items-center gap-1", l.pushedToSelection ? "text-emerald-300" : "text-rose-300")}>
                    {l.pushedToSelection ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
                    {l.pushedToSelection ? "已推入选品池（考虑中）" : "本次扫描将自动推入选品池"}
                  </div>
                )}

                <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(open ? null : l.theme)} className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" /> {open ? "收起证据链" : `查看证据链（${l.evidence.length}）`}
                </button>
                <button
                  onClick={() => {
                    createBriefFromIntel(
                      "customer_feedback",
                      `三角共振选题: ${l.themeLabel}`,
                      "",
                      l.score,
                      { hook: `三源共振 ${l.resonance} 源: ${l.themeLabel}`, audience: "纹身师/PMU 操作者", pain_point: l.themeLabel }
                    ).then(() => toast.success("选题已生成 → Content Operations 查看"))
                      .catch((e: Error) => toast.error("生成失败", { description: e.message }));
                  }}
                  className="text-[11px] text-rose-300 hover:text-rose-200 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> 生成选题
                </button>
                </div>
                {open && (
                  <div className="space-y-1.5 pt-1">
                    {l.evidence.length === 0 && <div className="text-[11px] text-zinc-500">暂无明细</div>}
                    {l.evidence.map((e: LeadEvidence, i: number) => (
                      <div key={i} className="rounded border border-zinc-800 bg-zinc-900/70 p-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn("w-2 h-2 rounded-full", SRC_COLOR[e.source])} />
                          <span className="text-[10px] text-zinc-400">{SRC_LABEL[e.source]}</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 whitespace-pre-wrap">{e.excerpt}</p>
                        {e.link && (
                          <a href={e.link} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:underline">
                            来源 ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Section A2: 竞品内容库 (content pipeline 原料 / 留言洞察) ───────────── */
function CompetitorContentLibrary({ tenant }: { tenant: string }) {
  const [items, setItems] = useState<MemoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCompetitorPosts(tenant, { limit: 500 });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Images className="w-5 h-5 text-sky-400" />
        <h3 className="text-lg font-bold text-zinc-100">竞品内容库</h3>
        <span className="text-[11px] text-zinc-500">· content pipeline 原料</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        竞品 IG bot 抓取的<b className="text-zinc-300">整篇帖子</b>（文案 + 全部图片 + 评论 + 互动量）。可直接作为社媒图/视频生成的参考素材；
        评论已标注「有用 / 意图」，方便留言洞察筛选。
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      )}
      {error && <div className="text-sm text-red-400">加载失败：{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="text-sm text-zinc-500">
          暂无竞品帖子。先在 VPS 跑{' '}
          <code className="text-zinc-300">npx tsx scripts/bot-competitor-ig-monitor.ts --baseline</code> 灌入。
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => {
          const m = parseMeta(it.metadata);
          const imageUrls = (m.image_urls as string[] | undefined) || [];
          const comments = (m.comments as { author: string; text: string; useful: boolean; intent: string }[] | undefined) || [];
          const useful = comments.filter((c) => c.useful).slice(0, 2);
          const brand = (m.brand as string) || '';
          const likes = m.likes_count as number | null;
          const ccount = m.comments_count as number | null;
          const postUrl = (m.post_url as string) || '';
          const caption = (m.caption as string) || it.content || '';
          return (
            <div key={it.id || it.entity_id} className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 overflow-hidden flex flex-col">
              {imageUrls[0] ? (
                <img src={imageUrls[0]} alt="" className="w-full h-44 object-cover bg-zinc-800" loading="lazy" />
              ) : (
                <div className="w-full h-44 bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">无图片</div>
              )}
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-sky-400 font-semibold">{brand}</span>
                  <span className="text-[10px] text-zinc-500">
                    {likes != null ? `♥ ${likes}` : ''} {ccount != null ? `· 💬 ${ccount}` : ''}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 line-clamp-3">{caption}</p>
                {useful.length > 0 && (
                  <div className="space-y-1">
                    {useful.map((c, i) => (
                      <div key={i} className="text-[11px] text-zinc-400 border-l-2 border-emerald-500/60 pl-2">
                        <span className="text-emerald-400">@{c.author}</span>：{c.text}
                      </div>
                    ))}
                  </div>
                )}
                {postUrl && (
                  <a href={postUrl} target="_blank" rel="noreferrer" className="mt-auto text-[11px] text-sky-500 hover:underline">
                    查看原帖 ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function NewArrivals() {
  const [keyword, setKeyword] = useState("纹身");
  const tenant = tenantFromKeyword(keyword);
  const [researchUrls, setResearchUrls] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchMsg, setResearchMsg] = useState<string | null>(null);

  const runResearch = async () => {
    const urls = researchUrls
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      toast.error("请填写要抓取的 URL");
      return;
    }
    setResearching(true);
    setResearchMsg(null);
    try {
      const res = await fetch(`/harvests/${tenant}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev" },
        body: JSON.stringify({ industry: keyword, urls, brands: [], keywords: [], focus: "all" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ingested?: number; error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResearchMsg(`已抓取 ${data.ingested ?? 0} 条信号写入 ${tenant}`);
      toast.success(`已入库 ${data.ingested ?? 0} 条`);
    } catch (e) {
      setResearchMsg(e instanceof Error ? e.message : String(e));
      toast.error("抓取失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setResearching(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* 行业情报范围：按关键词驱动独立租户，免配置、无限行业 */}
      <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-sky-400" />
          <h3 className="text-lg font-bold text-zinc-100">行业情报范围</h3>
          <span className="text-[11px] text-zinc-500">· 按关键词驱动 · {tenant}</span>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          输入行业关键词即可新建独立情报租户并查看该行业的新品 / 动作 / 原声。「纹身」看纹身行业、「通用」看通用行业；其他词自动建{' '}
          <code className="text-zinc-300">competitors:&lt;关键词&gt;</code> 租户。下方可直接抓取网页情报入库。
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] text-zinc-500 mb-1">行业关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="如 纹身 / 美妆 / 3C / 健身"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex-[2] min-w-[260px]">
            <label className="block text-[11px] text-zinc-500 mb-1">抓取 URL（逗号 / 换行分隔，可选）</label>
            <input
              value={researchUrls}
              onChange={(e) => setResearchUrls(e.target.value)}
              placeholder="https://example.com/new-products …"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none"
            />
          </div>
          <button
            onClick={runResearch}
            disabled={researching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {researching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Satellite className="w-4 h-4" />}
            抓取并入库
          </button>
        </div>
        {researchMsg && <div className="text-[11px] text-zinc-400 mt-2">{researchMsg}</div>}
      </section>

      <CompetitorNewArrivals tenant={tenant} />
      <CompetitorContentLibrary tenant={tenant} />
      <CompetitorIntel tenant={tenant} />
      <VoiceOfCustomer tenant={tenant} />
      <RedditWatch tenant={tenant} />
      <DirectResearch tenant={tenant} />
      <MySelection />
      <TriangulationLeads tenant={tenant} />
      <GapAnalysis tenant={tenant} />
    </div>
  );
}

/* ── Section A: 竞品上新情报 (cross-brand within competitors:tattoo) ─────── */
function CompetitorNewArrivals({ tenant }: { tenant: string }) {
  const [items, setItems] = useState<MemoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [brand, setBrand] = useState("all");

  // Collapse same-model variants (different size / packaging) into one card.
  const [mergeFamilies, setMergeFamilies] = useState(true);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const toggleFamily = (key: string) =>
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts({ tenant, limit: 1000 });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((it) => (parseMeta(it.metadata).brand as string | undefined) ?? "")
            .filter(Boolean)
        )
      ).sort(),
    [items]
  );

  const newArrivals = useMemo(() => {
    const cutoff = Date.now() - windowDays * 864e5;
    return items
      .map((it) => {
        const meta = parseMeta(it.metadata);
        const discovered = (meta.first_seen as string) || it.created_at;
        return { it, discovered: new Date(discovered), brand: (meta.brand as string) ?? "" };
      })
      .filter(({ it, discovered, brand: b }) => {
        if (brand !== "all" && b !== brand) return false;
        return discovered.getTime() >= cutoff;
      })
      .sort((a, b) => b.discovered.getTime() - a.discovered.getTime());
  }, [items, windowDays, brand]);

  // Collapse same-model variants (different size / packaging) into one card.
  const families = useMemo(() => {
    if (!mergeFamilies) {
      return newArrivals.map(({ it }) => ({
        key: it.id || it.entity_id || "",
        representative: it,
        variants: [it],
      }));
    }
    return aggregateProductFamilies(newArrivals.map(({ it }) => it));
  }, [newArrivals, mergeFamilies]);

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-5 h-5 text-rose-500" />
        <h3 className="text-lg font-bold text-zinc-100">竞品上新情报</h3>
        <span className="text-[11px] text-zinc-500">· {tenant}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        跨所有竞品品牌聚合「最近新发现 / 新上架」的商品（按导入首见时间 first_seen 计算，数据不重复存储）。
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          className="px-3 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 outline-none"
        >
          {WINDOWS.map((w) => (
            <option key={w.days} value={w.days}>
              {w.label}
            </option>
          ))}
        </select>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="px-3 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 outline-none"
        >
          <option value="all">全部品牌</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-400">
          命中 <span className="font-bold text-rose-400">{newArrivals.length}</span> 条上新
        </span>
        <label className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl cursor-pointer select-none" title="同款不同尺寸/包装只显示一款">
          <input
            type="checkbox"
            checked={mergeFamilies}
            onChange={(e) => setMergeFamilies(e.target.checked)}
            className="accent-rose-600 w-4 h-4"
          />
          <span className="text-xs font-medium text-zinc-300">合并同款</span>
        </label>
        <button
          onClick={load}
          className="ml-auto px-3 py-2 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 rounded-xl text-zinc-300"
        >
          刷新
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400 py-6">{error}</div>
      ) : newArrivals.length === 0 ? (
        <div className="text-sm text-zinc-500 py-6">该时间窗口内没有新上架记录。</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {families.map((fam) => {
            const it = fam.representative;
            const meta = parseMeta(it.metadata);
            const image = meta.image as string | undefined;
            const price = meta.unit_price as number | null;
            const category = meta.category as string | undefined;
            const b = (meta.brand as string) ?? "";
            const discovered = new Date((meta.first_seen as string) || it.created_at);
            const expanded = expandedFamilies.has(fam.key);
            const variantCount = fam.variants.length;
            return (
              <div
                key={fam.key}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 flex flex-col gap-2"
              >
                {image ? (
                  <img
                    src={image}
                    alt={it.title}
                    className="w-full h-28 object-cover rounded-lg bg-zinc-800"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-28 rounded-lg bg-zinc-800/60 flex items-center justify-center text-zinc-600 text-xs">
                    无图
                  </div>
                )}
                <div className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug">
                  {it.title}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-rose-600/15 text-[10px] text-rose-300 font-medium">
                    {b}
                  </span>
                  {category && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                      {category}
                    </span>
                  )}
                  {variantCount > 1 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-600/15 text-[10px] text-rose-300 font-medium">
                      ×{variantCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-semibold text-emerald-400">
                    {price != null ? `$${price}` : "—"}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {discovered.toISOString().slice(0, 10)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    createBriefFromIntel(
                      "competitor_analysis",
                      `${b} 新品选题: ${it.title}`,
                      it.entity_id || "",
                      75,
                      { hook: `竞品 ${b} 上新 ${it.title}`, audience: "纹身师/PMU 操作者", pain_point: "竞品上新对比" }
                    ).then(() => toast.success("选题已生成 → Content Operations 查看"))
                      .catch((e: Error) => toast.error("生成失败", { description: e.message }));
                  }}
                  className="mt-1 w-full py-1 text-[10px] font-medium text-rose-300 bg-rose-600/15 hover:bg-rose-600/30 rounded-lg transition-colors"
                >
                  + 生成选题
                </button>
                {variantCount > 1 && (
                  <button
                    onClick={() => toggleFamily(fam.key)}
                    className="text-[10px] text-zinc-400 hover:text-rose-300 underline text-left"
                  >
                    {expanded ? "收起变体" : `展开 ${variantCount} 个尺寸/包装`}
                  </button>
                )}
                {expanded && variantCount > 1 && (
                  <div className="mt-1 pt-2 border-t border-zinc-800 space-y-1">
                    {fam.variants.slice(1).map((v) => {
                      const vm = parseMeta(v.metadata);
                      const vp = vm.unit_price as number | null;
                      return (
                        <div
                          key={v.id || v.entity_id}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-zinc-400 truncate">{v.title}</span>
                          <span className="text-emerald-400 font-semibold whitespace-nowrap">
                            {vp != null ? `$${vp}` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Section B: 我方选品新品 (separate tenant `selection`) ───────────────── */
function MySelection() {
  const [items, setItems] = useState<MemoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    entity_id: "",
    brand: "",
    expected_cost: "",
    expected_price: "",
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts({ tenant: SELECTION_TENANT, limit: 500 });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.title.trim() || !form.entity_id.trim()) {
      toast.error("请填写商品名称与 SKU");
      return;
    }
    setSaving(true);
    try {
      const meta: Record<string, unknown> = { status: "考虑中" as SelStatus };
      if (form.brand) meta.brand = form.brand;
      if (form.expected_cost) meta.expected_cost = Number(form.expected_cost);
      if (form.expected_price) meta.expected_price = Number(form.expected_price);
      if (form.note) meta.note = form.note;
      await createMemory(SELECTION_TENANT, {
        entity_id: form.entity_id.trim(),
        title: form.title.trim(),
        content: form.note.trim(),
        metadata: meta,
      });
      toast.success("已加入选品候选池");
      setForm({ title: "", entity_id: "", brand: "", expected_cost: "", expected_price: "", note: "" });
      setOpen(false);
      await load();
    } catch (e) {
      toast.error("添加失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (it: MemoryItemDTO, status: SelStatus) => {
    const meta = parseMeta(it.metadata);
    try {
      await createMemory(SELECTION_TENANT, {
        entity_id: it.entity_id ?? "",
        title: it.title,
        content: it.content,
        metadata: { ...meta, status },
      });
      toast.success(`已标记为「${status}」`);
      await load();
    } catch (e) {
      toast.error("更新失败", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const remove = async (it: MemoryItemDTO) => {
    try {
      await deleteMemory(SELECTION_TENANT, it.entity_id ?? "");
      toast.success("已移除候选");
      await load();
    } catch (e) {
      toast.error("移除失败", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const statusIcon: Record<SelStatus, React.ReactNode> = {
    考虑中: <CircleDashed className="w-3.5 h-3.5 text-amber-400" />,
    已进货: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    已放弃: <ArchiveX className="w-3.5 h-3.5 text-zinc-500" />,
  };

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <PackagePlus className="w-5 h-5 text-rose-500" />
        <h3 className="text-lg font-bold text-zinc-100">我方选品新品</h3>
        <span className="text-[11px] text-zinc-500">· tenant = {SELECTION_TENANT}（与 142 本库存隔离）</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        考虑进货、但还没进 harvests 本库存的候选池。进货后标记为「已进货」，可据此决定是否同步进本库存。
      </p>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> 添加候选
        </button>
        <span className="text-xs text-zinc-400">
          候选 <span className="font-bold text-rose-400">{items.length}</span> 条
        </span>
        <button
          onClick={load}
          className="ml-auto px-3 py-2 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 rounded-xl text-zinc-300"
        >
          刷新
        </button>
      </div>

      {open && (
        <div className="mb-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="商品名称 *">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              placeholder="如 0811RL 纹身针"
            />
          </Field>
          <Field label="SKU *">
            <input
              value={form.entity_id}
              onChange={(e) => setForm((f) => ({ ...f, entity_id: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              placeholder="如 CON-0811RL"
            />
          </Field>
          <Field label="来源品牌 / 供应商">
            <input
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              placeholder="如 Peach / Bishop"
            />
          </Field>
          <Field label="预期进价 ($)">
            <input
              value={form.expected_cost}
              onChange={(e) => setForm((f) => ({ ...f, expected_cost: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              placeholder="成本"
            />
          </Field>
          <Field label="预期售价 ($)">
            <input
              value={form.expected_price}
              onChange={(e) => setForm((f) => ({ ...f, expected_price: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              placeholder="售价"
            />
          </Field>
          <Field label="备注">
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              placeholder="卖点 / 选品理由"
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "加入候选池"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400 py-6">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-zinc-500 py-6">还没有候选。点「添加候选」记录想进货的新品。</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const meta = parseMeta(it.metadata);
            const status = (meta.status as SelStatus) ?? "考虑中";
            const cost = meta.expected_cost as number | undefined;
            const price = meta.expected_price as number | undefined;
            const brand = meta.brand as string | undefined;
            return (
              <div
                key={it.id || it.entity_id}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 flex items-center gap-3"
              >
                <div className="flex items-center gap-1.5 min-w-[88px]">
                  {statusIcon[status]}
                  <span className="text-xs text-zinc-300">{status}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">{it.title}</div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate">
                    {it.entity_id}
                    {brand ? ` · ${brand}` : ""}
                  </div>
                </div>
                <div className="text-xs text-zinc-400 hidden sm:block">
                  {cost != null && <span className="text-zinc-500">成本 ${cost}</span>}
                  {price != null && <span className="text-emerald-400"> 售 ${price}</span>}
                </div>
                <select
                  value={status}
                  onChange={(e) => changeStatus(it, e.target.value as SelStatus)}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none"
                >
                  {SELECTION_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(it)}
                  title="移除候选"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Section C: 竞品动作流 (snapshot diff → events) ────────────────────── */
const EVENT_TYPES = [
  { value: "all", label: "全部" },
  { value: "new", label: "上新" },
  { value: "removed", label: "下架" },
  { value: "price_up", label: "涨价" },
  { value: "price_down", label: "降价" },
];

const EVENT_META: Record<string, { label: string; cls: string }> = {
  new: { label: "上新", cls: "bg-emerald-600/15 text-emerald-300" },
  removed: { label: "下架", cls: "bg-rose-600/15 text-rose-300" },
  price_up: { label: "涨价", cls: "bg-amber-600/15 text-amber-300" },
  price_down: { label: "降价", cls: "bg-sky-600/15 text-sky-300" },
};

function priceText(e: IntelEventDTO): string {
  const f = e.price_from != null ? `$${e.price_from}` : null;
  const t = e.price_to != null ? `$${e.price_to}` : null;
  if (e.type === "new") return t ?? "—";
  if (e.type === "removed") return f ?? "—";
  if (f && t) return `${f} → ${t}`;
  return f ?? t ?? "—";
}

function CompetitorIntel({ tenant }: { tenant: string }) {
  const [events, setEvents] = useState<IntelEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [snapInfo, setSnapInfo] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [type, setType] = useState("all");
  const [brand, setBrand] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listIntelEvents(tenant, { days, type, brand, limit: 200 });
      setEvents(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [days, type, brand]);

  useEffect(() => {
    load();
  }, [load]);

  const brands = useMemo(
    () => Array.from(new Set(events.map((e) => e.brand).filter((b): b is string => !!b))).sort(),
    [events]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { new: 0, removed: 0, price_up: 0, price_down: 0 };
    for (const e of events) if (c[e.type] != null) c[e.type]++;
    return c;
  }, [events]);

  const snapshot = async () => {
    setCapturing(true);
    setSnapInfo(null);
    try {
      const r = await captureSnapshot(tenant);
      setSnapInfo(
        r.baseline
          ? `已建立基线快照 · 收录 ${r.captured ?? 0} 条 · 下次快照开始产出变化事件`
          : `本次快照产出 ${r.events ?? 0} 条变化事件 · 对比 ${r.captured ?? 0} 条`
      );
      toast.success(r.baseline ? "基线快照已建立" : `发现 ${r.events ?? 0} 条变化`);
      await load();
    } catch (e) {
      toast.error("快照失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Camera className="w-5 h-5 text-rose-500" />
        <h3 className="text-lg font-bold text-zinc-100">竞品动作流</h3>
        <span className="text-[11px] text-zinc-500">· 快照对比 · {tenant}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        对竞品池「拍快照」并与上一次对比，自动识别：上新 / 下架清仓 / 涨价 / 降价。首次为基线，之后每次对比产出变化事件。
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={snapshot}
          disabled={capturing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          拍快照 / 对比
        </button>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 outline-none"
        >
          {WINDOWS.map((w) => (
            <option key={w.days} value={w.days}>
              {w.label}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 outline-none"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="px-3 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 outline-none"
        >
          <option value="all">全部品牌</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="ml-auto px-3 py-2 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 rounded-xl text-zinc-300 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </button>
      </div>

      {snapInfo && (
        <div className="mb-3 text-xs text-zinc-400 bg-zinc-800/40 border border-zinc-800 rounded-lg px-3 py-2">
          {snapInfo}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="text-emerald-300">上新 {counts.new}</span>
        <span className="text-rose-300">下架 {counts.removed}</span>
        <span className="text-amber-300">涨价 {counts.price_up}</span>
        <span className="text-sky-300">降价 {counts.price_down}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400 py-6">{error}</div>
      ) : events.length === 0 ? (
        <div className="text-sm text-zinc-500 py-6">
          暂无变化事件。点「拍快照 / 对比」建立基线；之后再次快照（或等竞品目录变动后）就会出现上新 / 下架 / 调价记录。
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => {
            const meta = EVENT_META[e.type] ?? { label: e.type, cls: "bg-zinc-700 text-zinc-300" };
            return (
              <div
                key={e.id}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 flex items-center gap-3"
              >
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${meta.cls}`}>
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">{e.title ?? e.entity_id}</div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate">
                    {e.entity_id}
                    {e.brand ? ` · ${e.brand}` : ""}
                    {e.category ? ` · ${e.category}` : ""}
                  </div>
                </div>
                <span className="text-xs text-zinc-300 hidden sm:block">{priceText(e)}</span>
                <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                  {new Date(e.captured_at).toISOString().slice(0, 10)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Section D: 用户原声 / 需求缺口 (voice-of-customer across all platforms) ─ */
const REVIEW_SIGNALS: { value: ReviewSignal; label: string; cls: string; icon: React.ReactNode }[] = [
  { value: "wish", label: "许愿/未满足", cls: "bg-amber-600/15 text-amber-300", icon: <Lightbulb className="w-3.5 h-3.5" /> },
  { value: "restock_request", label: "求补货", cls: "bg-sky-600/15 text-sky-300", icon: <PackageX className="w-3.5 h-3.5" /> },
  { value: "diy", label: "DIY/空白", cls: "bg-violet-600/15 text-violet-300", icon: <Hammer className="w-3.5 h-3.5" /> },
  { value: "problem", label: "抱怨/缺陷", cls: "bg-rose-600/15 text-rose-300", icon: <Wrench className="w-3.5 h-3.5" /> },
  { value: "praise", label: "好评", cls: "bg-emerald-600/15 text-emerald-300", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];
const SIGNAL_META: Record<ReviewSignal, { label: string; cls: string; icon: React.ReactNode }> = Object.fromEntries(
  REVIEW_SIGNALS.map((s) => [s.value, { label: s.label, cls: s.cls, icon: s.icon }])
) as Record<ReviewSignal, { label: string; cls: string; icon: React.ReactNode }>;

const SENTIMENTS = [
  { value: "all", label: "全部情感" },
  { value: "positive", label: "正面" },
  { value: "negative", label: "负面" },
  { value: "neutral", label: "中性" },
];

// Parse a pasted blob into review records. Accepts either a JSON array of
// { platform, body, rating?, author?, source_url? } or a CSV/TSV with a header
// row (body/文本, platform/平台, rating/评分, author/作者, source_url/链接).
function parseReviewsInput(text: string, fallbackPlatform: string) {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    const arr = JSON.parse(t) as Record<string, unknown>[];
    return arr
      .map((r) => ({
        platform: (r.platform as string) || fallbackPlatform,
        body: String(r.body ?? ""),
        rating: r.rating != null ? Number(r.rating) : undefined,
        author: r.author as string | undefined,
        source_url: r.source_url as string | undefined,
      }))
      .filter((r) => r.body.trim());
  }
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const delim = lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : null;
  const header = delim ? lines[0].split(delim).map((h) => h.trim().toLowerCase()) : null;
  const col = (name: string) =>
    header ? header.findIndex((h) => h.includes(name)) : 0;
  const iBody = header ? (col("body") >= 0 ? col("body") : col("文本") >= 0 ? col("文本") : 0) : 0;
  const iPlatform = header ? (col("platform") >= 0 ? col("platform") : col("平台") >= 0 ? col("平台") : -1) : -1;
  const iRating = header ? (col("rating") >= 0 ? col("rating") : col("评分") >= 0 ? col("评分") : -1) : -1;
  const iAuthor = header ? (col("author") >= 0 ? col("author") : col("作者") >= 0 ? col("作者") : -1) : -1;
  const iUrl = header ? (col("source_url") >= 0 ? col("source_url") : col("链接") >= 0 ? col("链接") : -1) : -1;

  const start = header ? 1 : 0;
  const out: { platform: string; body: string; rating?: number; author?: string; source_url?: string }[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = delim ? lines[i].split(delim) : [lines[i]];
    const body = (parts[iBody] ?? "").trim();
    if (!body) continue;
    const platform = (iPlatform >= 0 && parts[iPlatform]?.trim()) || fallbackPlatform;
    const rating = iRating >= 0 && parts[iRating]?.trim() ? Number(parts[iRating]) : undefined;
    const author = iAuthor >= 0 ? (parts[iAuthor]?.trim() || undefined) : undefined;
    const source_url = iUrl >= 0 ? (parts[iUrl]?.trim() || undefined) : undefined;
    out.push({ platform, body, rating: Number.isFinite(rating) ? rating : undefined, author, source_url });
  }
  return out;
}

function VoiceOfCustomer({ tenant }: { tenant: string }) {
  const TENANT = tenant;
  const [items, setItems] = useState<ReviewDTO[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState("all");
  const [signal, setSignal] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [q, setQ] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePlatform, setPastePlatform] = useState("import");
  const [importing, setImporting] = useState(false);

  const [subreddit, setSubreddit] = useState("tattoo");
  const [redditQuery, setRedditQuery] = useState("");
  const [harvesting, setHarvesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listReviews(TENANT, { platform, signal, sentiment, q: q || undefined, limit: 200 });
      setItems(res.items);
      setStats(res.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [platform, signal, sentiment, q]);

  useEffect(() => {
    load();
  }, [load]);

  const platforms = useMemo(() => {
    const known = ["amazon", "reddit", "quora", "instagram", "youtube", "tiktok", "import"];
    const fromData = stats ? Object.keys(stats.byPlatform) : [];
    return Array.from(new Set([...fromData, ...known])).sort();
  }, [stats]);

  const doImport = async () => {
    const recs = parseReviewsInput(pasteText, pastePlatform);
    if (recs.length === 0) {
      toast.error("没解析到评论，请检查格式（JSON 数组 或 带表头的 CSV/TSV）");
      return;
    }
    setImporting(true);
    try {
      const r = await ingestReviews(TENANT, recs);
      toast.success(`已导入 ${r.ingested ?? 0} 条${r.skipped ? `，跳过 ${r.skipped} 条空内容` : ""}`);
      setPasteText("");
      setShowImport(false);
      await load();
    } catch (e) {
      toast.error("导入失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setImporting(false);
    }
  };

  const doHarvest = async () => {
    if (!subreddit.trim()) {
      toast.error("请填写 Subreddit");
      return;
    }
    setHarvesting(true);
    try {
      const r = await harvestReviews(TENANT, {
        platform: "reddit",
        subreddit: subreddit.trim(),
        query: redditQuery.trim() || undefined,
        limit: 50,
      });
      toast.success(`Reddit 抓取 ${r.harvested ?? 0} 条，入库 ${r.ingested ?? 0} 条`);
      await load();
    } catch (e) {
      toast.error("抓取失败", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setHarvesting(false);
    }
  };

  const downloadSample = () => {
    const sample = [
      { platform: "amazon", body: "I wish it had a longer battery life, the wireless machine dies after 2 hours.", rating: 3, author: "buyer_12" },
      { platform: "reddit", body: "Anyone know where to buy the Bishop wand? Sold out everywhere, please restock!", author: "u/tat_artist" },
      { platform: "quora", body: "I built my own power supply because nothing on the market was quiet enough — DIY all the way.", author: "anon" },
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "review-sample.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sentCls = (s: string) =>
    s === "positive" ? "text-emerald-300" : s === "negative" ? "text-rose-300" : "text-zinc-400";

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <MessagesSquare className="w-5 h-5 text-rose-500" />
        <h3 className="text-lg font-bold text-zinc-100">用户原声 / 需求缺口</h3>
        <span className="text-[11px] text-zinc-500">· 全网评论挖掘 · {TENANT}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        汇集亚马逊 / Reddit / Quora / 社媒 等平台的用户原声，规则引擎自动标注情感与信号：许愿句=未满足需求、求补货=爆款缺口、DIY=空白品类。这些是比价之外更值钱的新品线索。
      </p>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
          <div className="text-2xl font-bold text-zinc-100">{stats?.total ?? "—"}</div>
          <div className="text-[11px] text-zinc-500">原声总数</div>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
          <div className="text-2xl font-bold">
            <span className={sentCls("positive")}>{stats?.bySentiment.positive ?? 0}</span>
            <span className="text-zinc-600"> / </span>
            <span className={sentCls("negative")}>{stats?.bySentiment.negative ?? 0}</span>
          </div>
          <div className="text-[11px] text-zinc-500">正面 / 负面</div>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
          <div className="text-2xl font-bold text-amber-300">
            {(stats?.bySignal.wish ?? 0) + (stats?.bySignal.restock_request ?? 0) + (stats?.bySignal.diy ?? 0)}
          </div>
          <div className="text-[11px] text-zinc-500">未满足需求信号</div>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
          <div className="text-2xl font-bold text-violet-300">{stats?.bySignal.diy ?? 0}</div>
          <div className="text-[11px] text-zinc-500">DIY / 空白品类</div>
        </div>
      </div>

      {/* Top unmet-need voices */}
      {stats?.topWishes?.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-600/20 bg-amber-600/5 p-3">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-amber-300">
            <Lightbulb className="w-3.5 h-3.5" /> 高价值「未满足需求」原声 Top
          </div>
          <div className="space-y-1.5">
            {stats.topWishes.slice(0, 5).map((w, i) => (
              <div key={i} className="text-xs text-zinc-300 flex gap-2">
                <span className="text-amber-400/70 shrink-0">{w.platform}</span>
                <span className="line-clamp-2 flex-1">
                  {w.body}
                  {w.source_url && (
                    <a href={w.source_url} target="_blank" rel="noreferrer" className="ml-1 text-sky-400 hover:underline">
                      ↗
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs text-zinc-200 outline-none"
        >
          <option value="all">全部平台</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={signal}
          onChange={(e) => setSignal(e.target.value)}
          className="px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs text-zinc-200 outline-none"
        >
          <option value="all">全部信号</option>
          {REVIEW_SIGNALS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value)}
          className="px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs text-zinc-200 outline-none"
        >
          {SENTIMENTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索原声关键词…"
          className="px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs text-zinc-200 outline-none w-36"
        />
        <button
          onClick={load}
          className="px-2.5 py-1.5 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 rounded-lg text-zinc-300 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </button>
        <button
          onClick={() => setShowImport((v) => !v)}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 rounded-lg text-zinc-300"
        >
          <Upload className="w-3.5 h-3.5" /> 导入评论
        </button>
        <button
          onClick={downloadSample}
          title="下载样例 JSON"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 rounded-lg text-zinc-300"
        >
          <Download className="w-3.5 h-3.5" /> 样例
        </button>
      </div>

      {/* Reddit live harvest */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
        <span className="text-xs text-zinc-400 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-orange-400" /> Reddit 实时抓取：
        </span>
        <input
          value={subreddit}
          onChange={(e) => setSubreddit(e.target.value)}
          placeholder="subreddit，如 tattoo"
          className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none w-32"
        />
        <input
          value={redditQuery}
          onChange={(e) => setRedditQuery(e.target.value)}
          placeholder="关键词（可选），如 wireless machine"
          className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none w-44"
        />
        <button
          onClick={doHarvest}
          disabled={harvesting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {harvesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          抓取并入库
        </button>
        <span className="text-[10px] text-zinc-600">其他平台（Amazon/Quora/社媒）因反爬/鉴权限制，请用「导入评论」粘贴导出。</span>
      </div>

      {/* Import drawer */}
      {showImport && (
        <div className="mb-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-zinc-400">粘贴评论（JSON 数组 或 带表头的 CSV/TSV）：</span>
            <select
              value={pastePlatform}
              onChange={(e) => setPastePlatform(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none"
            >
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder={'[\n  {"platform":"amazon","body":"I wish it had...","rating":3},\n  {"platform":"reddit","body":"where to buy? restock!","author":"u/xxx"}\n]'}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none font-mono"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowImport(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              onClick={doImport}
              disabled={importing}
              className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              解析并入库
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400 py-6">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-zinc-500 py-6">
          还没有评论数据。点「导入评论」粘贴 Amazon/Quora/社媒 导出，或用上方 Reddit 实时抓取。
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-wrap gap-1 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                    {r.platform}
                  </span>
                  {r.signals.map((s) => {
                    const m = SIGNAL_META[s];
                    return (
                      <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${m.cls}`}>
                        {m.icon}
                        {m.label}
                      </span>
                    );
                  })}
                </div>
                {r.rating != null && (
                  <span className="text-[10px] text-zinc-500 shrink-0">★{r.rating}</span>
                )}
                {r.source_url && (
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-sky-400 hover:underline shrink-0"
                  >
                    ↗
                  </a>
                )}
              </div>
              <div className="text-sm text-zinc-200 mt-1.5 leading-snug">{r.body}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                <span className={sentCls(r.sentiment)}>{r.sentiment}</span>
                {r.author && <span>· {r.author}</span>}
                {r.topics.length > 0 && (
                  <span className="text-zinc-600">· #{r.topics.join(" #")}</span>
                )}
                {r.created_at && <span className="ml-auto">{r.created_at.slice(0, 10)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Section E: 精准反馈 / 主动调研 (direct outreach) ───────────────────── */
const OUTREACH_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "youtube", label: "YouTube" },
  { value: "import", label: "其他/导入" },
];
const DIRECT_TABS = [
  { value: "pool", label: "用户池" },
  { value: "campaign", label: "调研活动" },
  { value: "feedback", label: "精准反馈回收" },
];
const inputCls = "w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none";

/* ── Section E: Reddit 自动监控 (automated VoC radar) ────────────────────────
   订阅 subreddit×关键词，由 worker 的 Cron 触发器每 6 小时自动抓取并入库；
   也可手动「立即运行」。评论下钻可拉每帖评论（许愿句常藏在评论里）。
*/
function RedditWatch({ tenant }: { tenant: string }) {
  const TENANT = tenant;
  const [subs, setSubs] = useState<StoredRedditWatchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<WatchRunResultDTO[] | null>(null);

  // new-subscription form
  const [subreddit, setSubreddit] = useState("tattoo");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "top" | "relevance">("new");
  const [limit, setLimit] = useState(100);
  const [includeComments, setIncludeComments] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubs(await listWatch(TENANT));
    } catch (e) {
      toast.error("加载订阅失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addSub = async () => {
    if (!subreddit.trim()) {
      toast.error("请填写 Subreddit");
      return;
    }
    setSaving(true);
    try {
      await createWatch(TENANT, {
        subreddit: subreddit.trim(),
        query: query.trim() || undefined,
        sort,
        limit,
        includeComments,
      });
      toast.success("已添加监控订阅");
      setQuery("");
      await load();
    } catch (e) {
      toast.error("添加失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const removeSub = async (id: string) => {
    try {
      await deleteWatch(TENANT, id);
      setSubs((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      toast.error("删除失败", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const runNow = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const r = await runWatch(TENANT);
      setRunResult(r.results ?? []);
      toast.success(`本轮运行入库 ${r.totalIngested ?? 0} 条`);
      await load();
    } catch (e) {
      toast.error("运行失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Satellite className="w-5 h-5 text-orange-400" />
        <h3 className="text-lg font-bold text-zinc-100">Reddit 自动监控</h3>
        <span className="text-[11px] text-zinc-500">· VoC 雷达 · {TENANT}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        订阅 subreddit × 关键词，Worker 的 Cron 触发器每 6 小时自动抓取并入库（含评论下钻）。开启后无需手动点，新帖/新抱怨会自动进入「用户原声」池。
      </p>

      {/* New subscription form */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 mb-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Subreddit</label>
            <input
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              placeholder="tattoo"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">关键词（可选）</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="wireless machine"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">排序</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "new" | "top" | "relevance")}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100"
            >
              <option value="new">最新 new</option>
              <option value="top">热门 top</option>
              <option value="relevance">相关 relevance</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">上限（帖）</label>
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 100)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeComments}
              onChange={(e) => setIncludeComments(e.target.checked)}
              className="rounded border-zinc-700"
            />
            拉取每帖评论（许愿句常藏在评论里）
          </label>
          <button
            onClick={addSub}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            添加订阅
          </button>
        </div>
      </div>

      {/* Run-now + list */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-zinc-400">
          {loading ? "加载中…" : `共 ${subs.length} 个订阅`}
        </div>
        <button
          onClick={runNow}
          disabled={running || subs.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-orange-400" />}
          立即运行
        </button>
      </div>

      <div className="space-y-2">
        {subs.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-sm text-zinc-100 font-medium">
                r/{s.subreddit}
                {s.query ? <span className="text-zinc-500"> · 「{s.query}」</span> : null}
              </div>
              <div className="text-[11px] text-zinc-500">
                {s.sort} · ≤{s.limit}帖 · 评论{s.include_comments ? "开" : "关"} · 自动{s.cron_enabled ? "开" : "关"}
                {s.last_run_at
                  ? ` · 上次 ${new Date(s.last_run_at).toLocaleString("zh-CN", { hour12: false })} 入库 ${s.last_count}`
                  : " · 未运行"}
              </div>
            </div>
            <button
              onClick={() => removeSub(s.id)}
              className="ml-3 text-zinc-500 hover:text-rose-400 shrink-0"
              title="删除订阅"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!loading && subs.length === 0 ? (
          <div className="text-xs text-zinc-600 py-3 text-center">还没有订阅。添加后 Worker 会每 6 小时自动抓取。</div>
        ) : null}
      </div>

      {runResult && runResult.length > 0 ? (
        <div className="mt-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 space-y-1">
          <div className="text-[11px] text-zinc-500 mb-1">本轮运行结果</div>
          {runResult.map((r) => (
            <div key={r.subId} className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">
                r/{r.subreddit}
                {r.query ? ` · ${r.query}` : ""}
              </span>
              <span className={r.error ? "text-rose-400" : "text-emerald-300"}>
                {r.error ? `失败: ${r.error}` : `抓 ${r.harvested} / 库 +${r.ingested}`}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DirectResearch({ tenant }: { tenant: string }) {
  const TENANT = tenant;
  const [tab, setTab] = useState<"pool" | "campaign" | "feedback">("pool");
  return (
    <section className="rounded-2xl border border-rose-800/30 bg-rose-950/10 p-5">
      <div className="flex items-center gap-2 mb-1">
        <MessagesSquare className="w-5 h-5 text-rose-400" />
        <h3 className="text-lg font-bold text-zinc-100">精准反馈 / 主动调研</h3>
        <span className="text-[11px] text-zinc-500">· 直接沟通 · 配合 bot worker 发送</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        主动触达你的粉丝/客户，收集对某品牌产品使用感受的精准反馈。合规底线：只有标记「已授权」的用户才会被选入发送清单。本系统负责「选谁 + 发什么」，真发送由你的 bot worker 执行。
      </p>
      <div className="flex gap-1 mb-4 rounded-xl bg-zinc-900/50 p-1 w-fit">
        {DIRECT_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as "pool" | "campaign" | "feedback")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              tab === t.value ? "bg-rose-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "pool" && <AudiencePool tenant={TENANT} />}
      {tab === "campaign" && <CampaignManager tenant={TENANT} />}
      {tab === "feedback" && <DirectFeedback tenant={TENANT} />}
    </section>
  );
}

function AudiencePool({ tenant }: { tenant: string }) {
  const [items, setItems] = useState<StoredAudienceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    handle: "",
    platform: "instagram",
    display_name: "",
    tags: "",
    opted_in: false,
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listAudience(tenant, { limit: 300 });
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenant]);
  useEffect(() => {
    load();
  }, [load]);

  const optedCount = items.filter((i) => i.opted_in === 1).length;

  const addOne = async () => {
    if (!form.handle.trim()) {
      toast.error("请填写 handle");
      return;
    }
    setSaving(true);
    try {
      await upsertAudience(tenant, [
        {
          handle: form.handle.trim(),
          platform: form.platform,
          display_name: form.display_name || undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          opted_in: form.opted_in,
          notes: form.notes || undefined,
        },
      ]);
      toast.success("已加入用户池");
      setForm({ handle: "", platform: "instagram", display_name: "", tags: "", opted_in: false, notes: "" });
      setShowAdd(false);
      await load();
    } catch (e) {
      toast.error("添加失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const doBulk = async () => {
    const t = paste.trim();
    if (!t) {
      toast.error("粘贴内容为空");
      return;
    }
    let recs: { handle: string; platform: string; display_name?: string; tags: string[]; opted_in: boolean; notes?: string }[] = [];
    try {
      if (t.startsWith("[")) {
        recs = JSON.parse(t);
      } else {
        const lines = t.split(/\r?\n/).filter((l) => l.trim());
        const delim = lines[0].includes(",") ? "," : lines[0].includes("\t") ? "\t" : null;
        const header = delim ? lines[0].split(delim).map((h) => h.trim().toLowerCase()) : null;
        const idx = (n: string) => (header ? header.findIndex((h) => h.includes(n)) : -1);
        const iH = idx("handle");
        const iP = idx("platform");
        const iN = idx("display_name") >= 0 ? idx("display_name") : idx("name");
        const iT = idx("tag");
        const iO = idx("opted");
        const iNo = idx("note");
        for (let i = header ? 1 : 0; i < lines.length; i++) {
          const p = delim ? lines[i].split(delim) : [lines[i]];
          const handle = (p[iH >= 0 ? iH : 0] ?? "").trim();
          if (!handle) continue;
          recs.push({
            handle,
            platform: (iP >= 0 && p[iP]?.trim()) || "instagram",
            display_name: iN >= 0 ? p[iN]?.trim() || undefined : undefined,
            tags: iT >= 0 && p[iT] ? p[iT].split("|").map((x) => x.trim()).filter(Boolean) : [],
            opted_in: iO >= 0 ? /(1|true|yes|是)/i.test(p[iO] || "") : false,
            notes: iNo >= 0 ? p[iNo]?.trim() || undefined : undefined,
          });
        }
      }
    } catch {
      toast.error("解析失败，请检查格式");
      return;
    }
    if (recs.length === 0) {
      toast.error("没解析到用户");
      return;
    }
    setSaving(true);
    try {
      const r = await upsertAudience(tenant, recs);
      toast.success(`入库 ${r.upserted ?? 0} 条${r.skipped ? `，跳过 ${r.skipped}` : ""}`);
      setPaste("");
      setShowBulk(false);
      await load();
    } catch (e) {
      toast.error("导入失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-zinc-400">
          用户 <span className="font-bold text-rose-300">{items.length}</span> · 已授权{" "}
          <span className="font-bold text-emerald-400">{optedCount}</span>
        </span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="ml-auto px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          + 添加用户
        </button>
        <button
          onClick={() => setShowBulk((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs flex items-center gap-1"
        >
          <Upload className="w-3.5 h-3.5" /> 批量导入
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="渠道">
            <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className={inputCls}>
              {OUTREACH_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Handle / 账号 *">
            <input value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))} className={inputCls} placeholder="@username / 手机号" />
          </Field>
          <Field label="昵称">
            <input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="标签 (逗号分隔)">
            <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className={inputCls} placeholder="buyer, artist" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-zinc-300 sm:col-span-2">
            <input type="checkbox" checked={form.opted_in} onChange={(e) => setForm((f) => ({ ...f, opted_in: e.target.checked }))} />
            已授权接收调研（必勾才能被选中发送）
          </label>
          <Field label="备注">
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800">
              取消
            </button>
            <button onClick={addOne} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} 加入
            </button>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="mb-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
          <div className="text-xs text-zinc-400 mb-2">
            粘贴 JSON 数组 或 带表头 CSV（handle,platform,display_name,tags,opted_in,notes）。tags 用 | 分隔。
          </div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none font-mono"
            placeholder={'[\n {"handle":"@alice","platform":"instagram","tags":["buyer"],"opted_in":true}\n]'}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowBulk(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800">
              取消
            </button>
            <button onClick={doBulk} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} 解析入库
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400 py-4">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4">用户池为空。添加或批量导入你的粉丝/客户（记得勾选「已授权」）。</div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-auto">
          {items.map((a) => {
            const tags = typeof a.tags === "string" ? (JSON.parse(a.tags) as string[]) : (a.tags ?? []);
            return (
              <div key={a.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">{a.handle}</div>
                  <div className="text-[11px] text-zinc-500 truncate">
                    {a.display_name || a.platform}
                    {a.last_contacted_at ? ` · 上次触达 ${a.last_contacted_at.slice(0, 10)}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(tags as string[]).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                      {t}
                    </span>
                  ))}
                </div>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                    a.opted_in === 1 ? "bg-emerald-600/15 text-emerald-300" : "bg-zinc-700/60 text-zinc-400"
                  )}
                >
                  {a.opted_in === 1 ? "已授权" : "未授权"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CampaignManager({ tenant }: { tenant: string }) {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [manifest, setManifest] = useState<{
    campaign_id: string;
    recipients: { handle: string; platform: string; script: string }[];
    scripts_by_channel: Record<string, string>;
    total: number;
  } | null>(null);
  const [form, setForm] = useState({
    title: "",
    question: "",
    target_brand: "",
    channels: [] as string[],
    tags: "",
    platforms: "",
    limit: "200",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listCampaigns(tenant);
      setCampaigns(r.campaigns);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [tenant]);
  useEffect(() => {
    load();
  }, [load]);

  const toggleChannel = (c: string) =>
    setForm((f) => ({ ...f, channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c] }));

  const create = async () => {
    if (!form.title.trim() || !form.question.trim() || form.channels.length === 0) {
      toast.error("请填写标题、问题并至少选一个渠道");
      return;
    }
    setSaving(true);
    try {
      const r = await createCampaign(tenant, {
        title: form.title.trim(),
        question: form.question.trim(),
        target_brand: form.target_brand.trim() || undefined,
        channels: form.channels,
        audience_filter: {
          platforms: form.platforms ? form.platforms.split(",").map((x) => x.trim()).filter(Boolean) : undefined,
          tags: form.tags ? form.tags.split(",").map((x) => x.trim()).filter(Boolean) : undefined,
          limit: Number(form.limit) || 200,
        },
      });
      if (r.campaign) {
        toast.success("调研活动已创建");
        setForm({ title: "", question: "", target_brand: "", channels: [], tags: "", platforms: "", limit: "200" });
        setShowCreate(false);
        await load();
      } else throw new Error(r.error || "创建失败");
    } catch (e) {
      toast.error("创建失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const dispatch = async (id: string) => {
    setDispatching(true);
    setManifest(null);
    try {
      const r = await dispatchCampaign(tenant, id);
      if (r.recipients) {
        setManifest({
          campaign_id: r.campaign_id,
          recipients: r.recipients,
          scripts_by_channel: r.scripts_by_channel ?? {},
          total: r.total ?? r.recipients.length,
        });
        toast.success(`已生成发送清单 · ${r.total ?? r.recipients.length} 位已授权用户`);
      } else throw new Error(r.error || "dispatch 失败");
      await load();
    } catch (e) {
      toast.error("生成失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setDispatching(false);
    }
  };

  const downloadManifest = () => {
    if (!manifest) return;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispatch-${manifest.campaign_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-zinc-400">
          活动 <span className="font-bold text-rose-300">{campaigns.length}</span>
        </span>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="ml-auto px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          + 新建调研
        </button>
      </div>

      {showCreate && (
        <div className="mb-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="活动标题 *">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="如 无线机使用感受调研" />
          </Field>
          <Field label="目标品牌">
            <input value={form.target_brand} onChange={(e) => setForm((f) => ({ ...f, target_brand: e.target.value }))} className={inputCls} placeholder="如 Bishop（可空）" />
          </Field>
          <Field label="调研问题 *">
            <input value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} className={inputCls} placeholder="你最希望无线纹身机改进什么？" />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-500">发送渠道 *</span>
            <div className="flex flex-wrap gap-1.5">
              {OUTREACH_PLATFORMS.filter((p) => p.value !== "import").map((p) => (
                <button
                  key={p.value}
                  onClick={() => toggleChannel(p.value)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs border",
                    form.channels.includes(p.value)
                      ? "bg-rose-600/20 border-rose-500 text-rose-200"
                      : "border-zinc-700 text-zinc-400"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="受众平台筛选 (逗号分隔, 可空=全部)">
            <input value={form.platforms} onChange={(e) => setForm((f) => ({ ...f, platforms: e.target.value }))} className={inputCls} placeholder="instagram,whatsapp" />
          </Field>
          <Field label="受众标签筛选 (逗号分隔, 可空)">
            <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className={inputCls} placeholder="buyer,artist" />
          </Field>
          <Field label="最多发送人数">
            <input value={form.limit} onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800">
              取消
            </button>
            <button onClick={create} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} 创建
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400 py-4">{error}</div>
      ) : campaigns.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4">还没有调研活动。点「新建调研」定义问题、选受众与渠道。</div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-100">{c.title}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{c.question}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.target_brand && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-600/15 text-[10px] text-rose-300">{c.target_brand}</span>
                    )}
                    {c.channels.map((ch) => (
                      <span key={ch} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                    c.status === "active"
                      ? "bg-sky-600/15 text-sky-300"
                      : c.status === "done"
                      ? "bg-zinc-700 text-zinc-300"
                      : "bg-zinc-800 text-zinc-400"
                  )}
                >
                  {c.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
                <span>已发送 {c.recipients}</span>
                {c.dispatched_at && <span>· {c.dispatched_at.slice(0, 10)}</span>}
                <button
                  onClick={() => dispatch(c.id)}
                  disabled={dispatching}
                  className="ml-auto px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                >
                  {dispatching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} 生成发送清单
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {manifest && (
        <div className="mt-4 rounded-xl border border-sky-600/30 bg-sky-950/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-sky-300">
              发送清单 · {manifest.total} 位已授权用户（交给 bot worker 发送）
            </span>
            <button
              onClick={downloadManifest}
              className="ml-auto px-2 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-[11px] flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> 下载 JSON
            </button>
          </div>
          <div className="mb-2 space-y-1">
            {Object.entries(manifest.scripts_by_channel).map(([ch, script]) => (
              <div key={ch} className="text-[11px] text-zinc-400">
                <span className="text-sky-300 font-medium">{ch} 话术：</span> {script}
              </div>
            ))}
          </div>
          <div className="max-h-60 overflow-auto space-y-1">
            {manifest.recipients.map((r, i) => (
              <div key={i} className="text-[11px] text-zinc-300 flex gap-2">
                <span className="text-zinc-500 shrink-0">{r.platform}</span>
                <span className="text-zinc-400 shrink-0">{r.handle}</span>
                <span className="line-clamp-1 flex-1">{r.script}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectFeedback({ tenant }: { tenant: string }) {
  const [items, setItems] = useState<ReviewDTO[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platform: "instagram",
    body: "",
    rating: "",
    campaign_id: "",
    consented: true,
    contact_handle: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rv, cp] = await Promise.all([
        listReviews(tenant, { channel_type: "direct", limit: 200 }),
        listCampaigns(tenant),
      ]);
      setItems(rv.items);
      setCampaigns(cp.campaigns);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenant]);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.body.trim()) {
      toast.error("请填写反馈内容");
      return;
    }
    setSaving(true);
    try {
      const r = await ingestReviews(tenant, [
        {
          platform: form.platform,
          body: form.body.trim(),
          rating: form.rating ? Number(form.rating) : undefined,
          channel_type: "direct",
          consented: form.consented,
          campaign_id: form.campaign_id || undefined,
          contact_handle: form.contact_handle || undefined,
        },
      ]);
      toast.success(`已录入精准反馈${r.ingested ? `（${r.ingested} 条）` : ""}`);
      setForm({ platform: "instagram", body: "", rating: "", campaign_id: "", consented: true, contact_handle: "" });
      setShowAdd(false);
      await load();
    } catch (e) {
      toast.error("录入失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-zinc-400">
          精准反馈 <span className="font-bold text-rose-300">{items.length}</span> 条
        </span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="ml-auto px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          + 录入反馈
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="来源渠道">
            <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className={inputCls}>
              {OUTREACH_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="关联调研活动">
            <select value={form.campaign_id} onChange={(e) => setForm((f) => ({ ...f, campaign_id: e.target.value }))} className={inputCls}>
              <option value="">不关联</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="评分 (1-5, 可选)">
            <input value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} className={inputCls} type="number" min={1} max={5} />
          </Field>
          <Field label="用户账号/联系方式">
            <input value={form.contact_handle} onChange={(e) => setForm((f) => ({ ...f, contact_handle: e.target.value }))} className={inputCls} placeholder="@user / 手机号" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-zinc-300 sm:col-span-2">
            <input type="checkbox" checked={form.consented} onChange={(e) => setForm((f) => ({ ...f, consented: e.target.checked }))} />
            用户已授权记录此反馈
          </label>
          <Field label="反馈内容 *">
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} className={inputCls} placeholder="客户原话…" />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800">
              取消
            </button>
            <button onClick={submit} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} 录入
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400 py-4">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4">
          还没有直接沟通的精准反馈。从「调研活动」生成清单 → bot 发送 → 把回收的回答用「录入反馈」或导入进来（记得标 channel_type=direct）。
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-wrap gap-1 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-rose-600/15 text-[10px] text-rose-300 font-mono">{r.platform}</span>
                  {r.signals.map((s) => {
                    const m = SIGNAL_META[s];
                    return (
                      <span key={s} className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5", m.cls)}>
                        {m.icon}
                        {m.label}
                      </span>
                    );
                  })}
                  {r.campaign_id && <span className="px-1.5 py-0.5 rounded bg-sky-600/15 text-[10px] text-sky-300">campaign</span>}
                </div>
                {r.rating != null && <span className="text-[10px] text-zinc-500 shrink-0">★{r.rating}</span>}
              </div>
              <div className="text-sm text-zinc-200 mt-1.5 leading-snug">{r.body}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                <span
                  className={cn(
                    r.sentiment === "positive" ? "text-emerald-300" : r.sentiment === "negative" ? "text-rose-300" : "text-zinc-400"
                  )}
                >
                  {r.sentiment}
                </span>
                {r.contact_handle && <span>· {r.contact_handle}</span>}
                {r.topics.length > 0 && <span className="text-zinc-600">· #{r.topics.join(" #")}</span>}
                {r.created_at && <span className="ml-auto">{r.created_at.slice(0, 10)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section H: 竞品 Gap 分析 (实时基于市场评分 + 竞品目录计算) ──────── */
const MARKET_API = "";
const CAT_LABELS: Record<string, string> = {
  cartridge: "纹身针嘴", machine: "纹身机", ink: "墨水",
  transfer_paper: "转印纸", stencil_printer: "描线打印机", aftercare: "售后护理",
};
const catLabel = (c: string) => CAT_LABELS[c] || c;

function GapAnalysis({ tenant }: { tenant: string }) {
  const [seeding, setSeeding] = useState(false);
  const [surveyForm, setSurveyForm] = useState<{ title: string; question: string; target_brand: string; channels: string[] } | null>(null);
  const [surveySaving, setSurveySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [competitorProducts, setCompetitorProducts] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [prodRes, scoreRes] = await Promise.all([
          listProducts({ tenant, limit: 1000 }),
          fetch(MARKET_API + "/api/market/scores").then((r) => (r.ok ? r.json() : { scores: [] })).catch(() => ({ scores: [] })),
        ]);
        if (!active) return;
        setCompetitorProducts((prodRes.items || []).filter((p: any) => p.type === "product"));
        setAllScores(scoreRes.scores || []);
      } catch {
        /* keep empty — panels show empty states */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // 主推新品：真实竞品目录
  const featuredProducts = useMemo(() => competitorProducts.slice(0, 12), [competitorProducts]);

  // 市场空缺机会：每 (品类×国家) 头部品牌分 → vacancy = 100 - top，降序取前 6
  const opportunities = useMemo(() => {
    if (!allScores.length) return [];
    const map = new Map<string, { category: string; country: string; top: number; topBrand: string }>();
    for (const s of allScores) {
      const key = `${s.category}|${s.country}`;
      const cur = map.get(key);
      if (!cur || (s.score || 0) > cur.top) map.set(key, { category: s.category, country: s.country, top: s.score || 0, topBrand: s.brand });
    }
    const arr = [...map.values()].map((m) => ({ ...m, vacancy: 100 - m.top }));
    arr.sort((a, b) => b.vacancy - a.vacancy);
    return arr.slice(0, 6);
  }, [allScores]);

  // 维度短板：每品类 5 维平均最低者
  const dimensionWeakness = useMemo(() => {
    if (!allScores.length) return [];
    const dims = [
      { key: "google_score", label: "搜索可见性" },
      { key: "amazon_score", label: "电商销量" },
      { key: "social_score", label: "社媒声量" },
      { key: "artist_score", label: "艺术家背书" },
      { key: "dist_score", label: "渠道覆盖" },
    ];
    const cats = [...new Set(allScores.map((s: any) => s.category))];
    const out: any[] = [];
    for (const cat of cats) {
      const rows = allScores.filter((s: any) => s.category === cat);
      let worst: any = null;
      for (const d of dims) {
        const avg = rows.reduce((a: number, s: any) => a + (s[d.key] || 0), 0) / rows.length;
        if (!worst || avg < worst.avg) worst = { dim: d.label, avg: Math.round(avg) };
      }
      out.push({ category: cat, dim: worst.dim, avg: worst.avg });
    }
    out.sort((a, b) => a.avg - b.avg);
    return out.slice(0, 6);
  }, [allScores]);

  const seedToKB = async () => {
    setSeeding(true);
    let ok = 0, fail = 0;
    for (const o of opportunities) {
      try {
        await createMemory(tenant, {
          type: "gap_analysis",
          entity_id: `gap::opportunity-${o.category}-${o.country}`,
          title: `${catLabel(o.category)} × ${o.country} 市场空缺 ${o.vacancy}%`,
          content: `头部品牌 ${o.topBrand} 仅 ${o.top} 分，市场空缺 ${o.vacancy}%，存在空白切入空间。`,
          metadata: { source: "market_intelligence_realtime", category: o.category, country: o.country, vacancy: o.vacancy, top_brand: o.topBrand, top_score: o.top, researched_at: new Date().toISOString() },
        });
        ok++;
      } catch { fail++; }
    }
    for (const w of dimensionWeakness) {
      try {
        await createMemory(tenant, {
          type: "pain_point",
          entity_id: `gap::dimension-weakness-${w.category}-${w.dim}`,
          title: `${catLabel(w.category)}︰${w.dim}维度短板`,
          content: `该品类 ${w.dim} 维度平均仅 ${w.avg}/100，是行业共同短板，可作内容 / 选品切入方向。`,
          metadata: { source: "market_intelligence_realtime", severity: w.avg < 40 ? "critical" : w.avg < 55 ? "high" : "medium", category: w.category, dimension: w.dim, avg_score: w.avg, researched_at: new Date().toISOString() },
        });
        ok++;
      } catch { fail++; }
    }
    setSeeding(false);
    if (fail === 0) toast.success(`全部 ${ok} 条已写入 ${tenant} 知识库`);
    else toast.warning(`已写入 ${ok} 条，${fail} 条失败`);
  };

  const openSurvey = (title: string, question: string) => {
    setSurveyForm({ title, question, target_brand: "painfulpleasures", channels: ["instagram"] });
  };

  const submitSurvey = async () => {
    if (!surveyForm) return;
    setSurveySaving(true);
    try {
      const r = await createCampaign(tenant, {
        title: surveyForm.title,
        question: surveyForm.question,
        target_brand: surveyForm.target_brand || undefined,
        channels: surveyForm.channels,
        audience_filter: { platforms: ["instagram"], limit: 50 },
      });
      if (r.campaign) {
        toast.success(`调研活动已创建 → 去「主动调研」tab 查看并 dispatch`);
        setSurveyForm(null);
      } else throw new Error(r.error || "创建失败");
    } catch (e) {
      toast.error("创建调研失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSurveySaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-bold text-zinc-100">Gap 分析</h3>
        <span className="text-[11px] text-zinc-500">· 实时市场缺口 (评分驱动)</span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        实时基于 Market Intelligence 品牌评分（品类×国家×品牌 5 维分）与竞品目录动态计算市场空缺与维度短板，不再依赖静态调研快照。数据可写入 AI Core 知识库供三角共振引擎使用。
      </p>

      {/* 竞品目录 — 真实产品 */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <ShoppingCart className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-200">竞品目录在售产品</span>
          <span className="text-[10px] text-zinc-500">· {tenant}</span>
        </div>
        {featuredProducts.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 text-xs text-zinc-500">
            {loading ? "加载中…" : "竞品目录暂无产品。请通过「商品知识库 → 手动录入 / 从网址采集 / B 渠道 IG 采集」补充竞品数据后此处自动显示。"}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {featuredProducts.map((p) => {
              const m = parseMeta(p.metadata);
              const brand = (m.brand as string) || "—";
              const price = (m.price as string) || "—";
              const cat = (m.category as string) || "";
              return (
                <div key={p.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-2.5">
                  <div className="text-xs font-bold text-zinc-100 truncate" title={p.title}>{p.title}</div>
                  <div className="text-[10px] text-zinc-500">{price}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="px-1 py-0.5 rounded bg-emerald-600/15 text-[9px] text-emerald-300">{brand}</span>
                    {cat && <span className="text-[9px] text-zinc-500 truncate">{catLabel(cat)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 行业维度短板 — 基于品牌评分实时计算 */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-semibold text-zinc-200">行业维度短板 (5 维评分最低项)</span>
        </div>
        {dimensionWeakness.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 text-xs text-zinc-500">
            {loading ? "计算中…" : "暂无市场评分数据，请先填充 Market Intelligence。"}
          </div>
        ) : (
          <div className="space-y-2">
            {dimensionWeakness.map((w) => {
              const severity = w.avg < 40 ? "critical" : w.avg < 55 ? "high" : "medium";
              return (
                <div key={w.category + w.dim} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0"><TrendingDown className="w-4 h-4 text-rose-400 mt-0.5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-100">{catLabel(w.category)}︰{w.dim}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-medium",
                          severity === "critical" ? "bg-red-600/15 text-red-300" :
                          severity === "high" ? "bg-orange-600/15 text-orange-300" :
                          "bg-zinc-800 text-zinc-400"
                        )}>
                          {severity === "critical" ? "致命" : severity === "high" ? "严重" : "中等"}
                        </span>
                        <span className="text-[10px] text-zinc-500 ml-1">均分 {w.avg}/100</span>
                        <button
                          onClick={() => openSurvey(`${catLabel(w.category)}︰${w.dim}短板`, `你觉得 ${catLabel(w.category)} 这个品类在「${w.dim}」上最缺什么？`)}
                          className="ml-auto shrink-0 px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-[10px] text-rose-300 font-medium transition-colors"
                        >
                          发起调研
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">该维度平均仅 {w.avg}/100，是行业共同短板，可作内容选题 / 选品切入方向。</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 核心 Gap 机会 — 市场空缺排名 */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-200">你的机会 — 市场空缺 Top 6</span>
        </div>
        {opportunities.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 text-xs text-zinc-500">
            {loading ? "计算中…" : "暂无市场评分数据，请先填充 Market Intelligence。"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {opportunities.map((o, idx) => {
              const stars = o.vacancy >= 50 ? "⭐⭐⭐⭐⭐" : o.vacancy >= 40 ? "⭐⭐⭐⭐" : o.vacancy >= 30 ? "⭐⭐⭐" : "⭐⭐";
              return (
                <div key={o.category + o.country} className="rounded-xl border border-emerald-800/40 bg-emerald-900/20 p-3 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-emerald-100">{catLabel(o.category)} × {o.country}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed flex-1">市场空缺 <b className="text-emerald-300">{o.vacancy}%</b> — 头部品牌 {o.topBrand} 仅 {o.top} 分，存在空白切入空间。</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-800/30">
                    <span className="text-[10px] text-amber-400">{stars}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          createBriefFromIntel(
                            "gap_analysis",
                            `Gap 选题: ${catLabel(o.category)} × ${o.country} 市场空缺`,
                            "",
                            o.vacancy >= 40 ? 90 : 75,
                            { hook: `市场空缺 #${idx + 1}: ${catLabel(o.category)} @ ${o.country} (${o.vacancy}%)`, audience: "纹身师/PMU 操作者", pain_point: `头部 ${o.topBrand} 仅 ${o.top} 分` }
                          ).then(() => toast.success("选题已生成 → Content Operations 查看"))
                            .catch((e: Error) => toast.error("生成失败", { description: e.message }));
                        }}
                        className="shrink-0 px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-[10px] text-rose-300 font-medium transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> 生成选题
                      </button>
                      <button
                        onClick={() => openSurvey(`【Gap】${catLabel(o.category)} × ${o.country}`, `你觉得 ${catLabel(o.category)} 在 ${o.country} 市场最缺什么品牌 / 产品？`)}
                        className="shrink-0 px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-[10px] text-emerald-300 font-medium transition-colors"
                      >
                        发起调研
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 写入知识库按钮 */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3">
        <span className="text-xs text-zinc-400">
          将此分析写入 <code className="text-rose-300">{tenant}</code> 知识库，让三角共振引擎（聊单需求×评论缺口×竞品动作）自动交叉验证。
        </span>
        <button
          onClick={seedToKB}
          disabled={seeding}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
          写入知识库
        </button>
      </div>

      {/* Survey creation modal */}
      {surveyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSurveyForm(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700/60 bg-zinc-900 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-base font-bold text-zinc-100 mb-1">向终端客户发起调研</h4>
            <p className="text-xs text-zinc-500 mb-4">创建后进入「精准反馈 / 主动调研 → 调研活动」tab dispatch，bot worker 将向已授权用户发送 DM。</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">调研标题</label>
                <input value={surveyForm.title} onChange={(e) => setSurveyForm((f) => f ? { ...f, title: e.target.value } : null)} className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">问题（发送给客户的内容）</label>
                <textarea rows={3} value={surveyForm.question} onChange={(e) => setSurveyForm((f) => f ? { ...f, question: e.target.value } : null)} className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">渠道</label>
                  <div className="flex gap-2">
                    {["instagram", "facebook", "whatsapp"].map((ch) => (
                      <button key={ch} onClick={() => setSurveyForm((f) => f ? { ...f, channels: f.channels.includes(ch) ? f.channels.filter((x) => x !== ch) : [...f.channels, ch] } : null)}
                        className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors", surveyForm.channels.includes(ch) ? "bg-rose-600 text-white" : "bg-zinc-800 text-zinc-400")}>
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setSurveyForm(null)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800">取消</button>
                <button onClick={submitSurvey} disabled={surveySaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50">
                  {surveySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessagesSquare className="w-3.5 h-3.5" />}
                  创建调研
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
