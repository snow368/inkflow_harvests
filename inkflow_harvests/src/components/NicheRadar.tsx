import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Radar,
  Plus,
  Loader2,
  X,
  Trash2,
  Sparkles,
  Users,
  TrendingUp,
  Timer,
  Activity,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  Save,
  Trophy,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  listNiches,
  createNiche,
  updateNiche,
  deleteNiche,
  scanNiches,
  extractTech,
  listTechnologies,
  type NicheOpportunity,
} from "@/lib/aicore";

type StatusFilter = "all" | "suggested" | "confirmed";

// The 4 scoring dimensions — each 0-100, higher = better opportunity.
const DIMS = [
  { key: "competition_score", label: "竞争稀缺", icon: Users, hint: "越高 = 玩家越少（就 1-2 家最好）" },
  { key: "margin_score", label: "利润空间", icon: TrendingUp, hint: "越高 = 利润越厚" },
  { key: "refresh_score", label: "迭代缓慢", icon: Timer, hint: "越高 = 更新换代越慢（护城河）" },
  { key: "demand_score", label: "需求稳定", icon: Activity, hint: "越高 = 需求越真实稳定" },
] as const;

function parseMetricValue(v: string): number | string {
  const t = v.trim();
  if (t !== "" && !isNaN(Number(t))) return Number(t);
  return t;
}

function scoreColor(n: number): string {
  if (n >= 75) return "text-emerald-400";
  if (n >= 50) return "text-cyan-400";
  if (n >= 30) return "text-amber-400";
  return "text-zinc-500";
}
function barColor(n: number): string {
  if (n >= 75) return "bg-emerald-500";
  if (n >= 50) return "bg-cyan-500";
  if (n >= 30) return "bg-amber-500";
  return "bg-zinc-600";
}

export default function NicheRadar() {
  const [niches, setNiches] = useState<NicheOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [seedFilter, setSeedFilter] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selected, setSelected] = useState<NicheOpportunity | null>(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNiches({
        status: statusFilter === "all" ? undefined : statusFilter,
        seed: seedFilter.trim() || undefined,
        minScore: minScore || undefined,
      });
      setNiches(data.items || []);
    } catch (e) {
      toast.error("加载机会雷达失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, seedFilter, minScore]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Radar className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-bold text-zinc-100">机会雷达</h2>
          <span className="text-[11px] text-zinc-500">超窄细分蓝海 · 1-2 家 / 高利润 / 慢迭代</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScanOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4" /> AI 脑暴
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> 手动新增
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">状态</label>
          <div className="flex gap-1">
            {([
              { v: "all", l: "全部" },
              { v: "suggested", l: "待确认" },
              { v: "confirmed", l: "已确认" },
            ] as const).map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm",
                  statusFilter === o.v ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200",
                ].join(" ")}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">按种子方向筛选</label>
          <input
            value={seedFilter}
            onChange={(e) => setSeedFilter(e.target.value)}
            placeholder="如 户外 / 宠物 / 乐器配件"
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">最低机会分：{minScore}</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-40 accent-cyan-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : niches.length === 0 ? (
        <div className="text-zinc-500 text-sm py-10 text-center">
          暂无机会。点「AI 脑暴」让 AI 挖掘超窄细分赛道，或「手动新增」。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {niches.map((n) => (
            <NicheCard key={n.id} niche={n} onClick={() => setSelected(n)} />
          ))}
        </div>
      )}

      {selected && (
        <NicheDetail
          niche={selected}
          onClose={() => setSelected(null)}
          onSaved={(n) => {
            setSelected(n);
            load();
          }}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      )}

      {scanOpen && (
        <ScanModal
          onClose={() => setScanOpen(false)}
          onDone={() => {
            setScanOpen(false);
            load();
          }}
        />
      )}

      {addOpen && (
        <AddModal
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed ? (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
      <CheckCircle2 className="w-3 h-3" /> 已确认
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
      <CircleDashed className="w-3 h-3" /> 待确认
    </span>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-zinc-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${barColor(value)}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 w-6 text-right">{value}</span>
    </div>
  );
}

function NicheCard({ niche, onClick }: { niche: NicheOpportunity; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-cyan-500/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-zinc-100 text-[15px] leading-snug">{niche.name}</div>
        <StatusBadge confirmed={niche.status === "confirmed"} />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <Trophy className={`w-4 h-4 ${scoreColor(niche.opportunity_score)}`} />
        <span className={`text-xl font-bold ${scoreColor(niche.opportunity_score)}`}>{niche.opportunity_score}</span>
        <span className="text-[10px] text-zinc-600">机会分</span>
      </div>
      {niche.description && <p className="text-[12px] text-zinc-500 mt-1.5 line-clamp-2">{niche.description}</p>}
      <div className="space-y-1 mt-3">
        <MiniBar label="竞争稀缺" value={niche.competition_score} />
        <MiniBar label="利润空间" value={niche.margin_score} />
        <MiniBar label="迭代缓慢" value={niche.refresh_score} />
        <MiniBar label="需求稳定" value={niche.demand_score} />
      </div>
      <div className="flex items-center flex-wrap gap-1.5 mt-3">
        {niche.seed && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{niche.seed}</span>}
        {niche.players.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            玩家：{niche.players.slice(0, 2).join("、")}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Detail drawer (edit scores + metrics + confirm/delete) ──────────────────
function NicheDetail({
  niche,
  onClose,
  onSaved,
  onDeleted,
}: {
  niche: NicheOpportunity;
  onClose: () => void;
  onSaved: (n: NicheOpportunity) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(niche.name);
  const [description, setDescription] = useState(niche.description);
  const [seed, setSeed] = useState(niche.seed);
  const [players, setPlayers] = useState(niche.players.join(", "));
  const [status, setStatus] = useState<"suggested" | "confirmed">(niche.status);
  const [scores, setScores] = useState({
    competition_score: niche.competition_score,
    margin_score: niche.margin_score,
    refresh_score: niche.refresh_score,
    demand_score: niche.demand_score,
  });
  const [metrics, setMetrics] = useState<{ key: string; value: string }[]>(
    Object.entries(niche.metrics || {}).map(([k, v]) => ({ key: k, value: String(v) }))
  );
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Direction 2 + 3.1: tech library ↔ opportunity radar ──────────────────
  // coverage = how many technologies are tagged with this niche's name (the
  // "技术覆盖率"). extractTech pushes player tech into the library tagged with
  // this niche as its category.
  const playerUrlsInit =
    Array.isArray(niche.metrics?.player_urls)
      ? (niche.metrics!.player_urls as unknown as string[]).join("\n")
      : typeof niche.metrics?.player_urls === "string"
      ? (niche.metrics!.player_urls as string)
      : "";
  const [coverage, setCoverage] = useState<number | null>(null);
  const [showExtract, setShowExtract] = useState(false);
  const [techUrls, setTechUrls] = useState(playerUrlsInit);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    let alive = true;
    listTechnologies({ category: niche.name })
      .then((r) => alive && setCoverage(r.total))
      .catch(() => alive && setCoverage(0));
    return () => {
      alive = false;
    };
  }, [niche.name]);

  const extractPlayerTech = async () => {
    const urls = techUrls.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast.error("请填写玩家产品页 URL");
      return;
    }
    setExtracting(true);
    try {
      const r = await extractTech({ urls, category: niche.name });
      toast.success(`抽取到 ${r.count} 条技术${r.errors.length ? `（${r.errors.length} 个抓取失败）` : ""}`);
      // Persist URLs into niche metrics + keep local state in sync so a later
      // save() won't clobber them.
      const m: Record<string, number | string> = {};
      metrics.forEach((row) => {
        const k = row.key.trim();
        if (k) m[k] = parseMetricValue(row.value);
      });
      m.player_urls = techUrls.trim();
      setMetrics((p) => [...p.filter((x) => x.key !== "player_urls"), { key: "player_urls", value: techUrls.trim() }]);
      await updateNiche(niche.id, { metrics: m });
      setCoverage((c) => (typeof c === "number" ? c + r.count : r.count));
    } catch (e) {
      toast.error("抽取失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setExtracting(false);
    }
  };

  // Live preview of the weighted opportunity score (matches server weights).
  const preview = useMemo(() => {
    const s =
      scores.competition_score * 0.3 +
      scores.margin_score * 0.3 +
      scores.refresh_score * 0.2 +
      scores.demand_score * 0.2;
    return Math.round(s * 10) / 10;
  }, [scores]);

  const save = async () => {
    setSaving(true);
    try {
      const m: Record<string, number | string> = {};
      metrics.forEach((r) => {
        const k = r.key.trim();
        if (k) m[k] = parseMetricValue(r.value);
      });
      const updated = await updateNiche(niche.id, {
        name: name.trim() || niche.name,
        description,
        seed: seed.trim(),
        players: players.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        status,
        ...scores,
        metrics: m,
      });
      toast.success("已保存");
      onSaved(updated);
    } catch (e) {
      toast.error("保存失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteNiche(niche.id);
      toast.success("已删除");
      onDeleted();
    } catch (e) {
      toast.error("删除失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setDeleting(false);
    }
  };

  const addMetric = () => {
    if (!newKey.trim()) return;
    setMetrics((p) => [...p, { key: newKey.trim(), value: newVal }]);
    setNewKey("");
    setNewVal("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-[#0c0c0c] border-l border-zinc-800 overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-400" /> 机会详情
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-center gap-3">
          <Trophy className={`w-8 h-8 ${scoreColor(preview)}`} />
          <div>
            <div className={`text-3xl font-bold ${scoreColor(preview)}`}>{preview}</div>
            <div className="text-[11px] text-zinc-500">机会分（竞争×0.3 + 利润×0.3 + 迭代×0.2 + 需求×0.2）</div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">细分品类名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">机会说明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">种子方向</label>
            <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="如 户外 / 宠物" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">现有玩家（逗号分隔）</label>
            <input value={players} onChange={(e) => setPlayers(e.target.value)} placeholder="厂商A, 厂商B" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
          </div>
        </div>

        {/* 4-dimension score editors */}
        <div className="space-y-3">
          <label className="text-[11px] text-zinc-500">四维评分（0-100，越高越好）</label>
          {DIMS.map((d) => {
            const val = scores[d.key];
            const Icon = d.icon;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" /> {d.label}
                    <span className="text-[10px] text-zinc-600">{d.hint}</span>
                  </span>
                  <span className={`text-sm font-semibold ${scoreColor(val)}`}>{val}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={val}
                  onChange={(e) => setScores((p) => ({ ...p, [d.key]: Number(e.target.value) }))}
                  className="w-full accent-cyan-500"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-500">状态</span>
          <button
            onClick={() => setStatus(status === "confirmed" ? "suggested" : "confirmed")}
            className={status === "confirmed" ? "px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm" : "px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-sm"}
          >
            {status === "confirmed" ? "已确认" : "待确认"}
          </button>
          <span className="text-[11px] text-zinc-600">（确认 = AI 建议经人工核实）</span>
        </div>

        {/* Extra flexible metrics */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-zinc-500">补充指标（如客单价 / 起订量 / 备注，灵活录入）</label>
          </div>
          <div className="space-y-1.5">
            {metrics.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.key}
                  onChange={(e) => setMetrics((p) => p.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                  placeholder="指标名"
                  className="flex-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
                <input
                  value={r.value}
                  onChange={(e) => setMetrics((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  placeholder="值"
                  className="w-28 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
                />
                <button onClick={() => setMetrics((p) => p.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="新指标名" className="flex-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
            <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="值" className="w-28 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
            <button onClick={addMetric} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm">
              <Plus className="w-4 h-4" /> 加
            </button>
          </div>
        </div>

        {/* Direction 2 + 3.1: tech library ↔ opportunity radar */}
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> 技术洞察（技术库 ↔ 机会雷达）
            </span>
            {coverage !== null && (
              <span className="text-[11px] text-zinc-500">
                技术覆盖率：
                <span className={coverage > 0 ? "text-cyan-400" : "text-amber-400"}>{coverage}</span> 条
              </span>
            )}
          </div>
          {niche.opportunity_score >= 70 && coverage === 0 && (
            <p className="text-[11px] text-amber-400/90">
              ⚠️ 机会分高但技术覆盖率为 0 —— 建议抽取玩家技术，了解竞品护城河后再决策。
            </p>
          )}
          <div>
            <button
              onClick={() => setShowExtract((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700/60 hover:bg-cyan-600 text-white text-sm font-semibold"
            >
              <Zap className="w-4 h-4" /> 抽取玩家技术
            </button>
          </div>
          {showExtract && (
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-500">
                粘贴该赛道玩家的产品页 URL（逗号 / 换行分隔）。提交后技术库会以「品类 = {niche.name}」标记这些技术，供跨品类借鉴视图筛选。
              </p>
              <textarea
                value={techUrls}
                onChange={(e) => setTechUrls(e.target.value)}
                rows={3}
                placeholder="https://player-product-page.com/..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
              />
              <button
                onClick={extractPlayerTech}
                disabled={extracting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} 开始抽取并入库
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存
          </button>
          <button
            onClick={remove}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-red-600/80 text-zinc-300 hover:text-white text-sm font-semibold disabled:opacity-50 ml-auto"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 删除
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI scan modal ────────────────────────────────────────────────────────────
function ScanModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [seed, setSeed] = useState("");
  const [count, setCount] = useState(8);
  const [urls, setUrls] = useState("");
  const [scanning, setScanning] = useState(false);

  const run = async () => {
    setScanning(true);
    try {
      const urlList = urls.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      const r = await scanNiches({ seed: seed.trim(), count, urls: urlList.length ? urlList : undefined });
      toast.success(`AI 挖到 ${r.count} 个机会${r.errors.length ? `（${r.errors.length} 个抓取失败）` : ""}`);
      onDone();
    } catch (e) {
      toast.error("脑暴失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0c0c0c] border border-zinc-800 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" /> AI 脑暴超窄机会
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          AI 会挖掘「玩家极少 + 利润超高 + 迭代很慢」的超窄细分赛道，并给出四维评分（状态=待确认）。留空种子方向 = 全行业发散。
        </p>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">种子方向（可选）</label>
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="如 户外装备 / 宠物用品 / 乐器配件（留空=不限）"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">生成数量：{count}</label>
          <input type="range" min={3} max={20} step={1} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-cyan-500" />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">参考网址（可选，逗号 / 换行分隔，用作 AI 灵感素材）</label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={3}
            placeholder="https://example.com/niche-market-report"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          />
        </div>
        <button
          onClick={run}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 开始脑暴
        </button>
      </div>
    </div>
  );
}

// ── Manual add modal ────────────────────────────────────────────────────────
function AddModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seed, setSeed] = useState("");
  const [players, setPlayers] = useState("");
  const [scores, setScores] = useState({
    competition_score: 60,
    margin_score: 60,
    refresh_score: 60,
    demand_score: 50,
  });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      toast.error("请填写细分品类名称");
      return;
    }
    setSaving(true);
    try {
      await createNiche({
        name: name.trim(),
        description,
        seed: seed.trim(),
        players: players.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        status: "suggested",
        ...scores,
      });
      toast.success("已新增（待确认）");
      onCreated();
    } catch (e) {
      toast.error("新增失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0c0c0c] border border-zinc-800 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" /> 手动新增机会
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">细分品类名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">机会说明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">种子方向</label>
            <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="如 户外" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">现有玩家（逗号分隔）</label>
            <input value={players} onChange={(e) => setPlayers(e.target.value)} placeholder="厂商A, 厂商B" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
          </div>
        </div>
        <div className="space-y-3">
          {DIMS.map((d) => {
            const val = scores[d.key];
            const Icon = d.icon;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" /> {d.label}
                  </span>
                  <span className={`text-sm font-semibold ${scoreColor(val)}`}>{val}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={val}
                  onChange={(e) => setScores((p) => ({ ...p, [d.key]: Number(e.target.value) }))}
                  className="w-full accent-cyan-500"
                />
              </div>
            );
          })}
        </div>
        <button
          onClick={create}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 新增
        </button>
      </div>
    </div>
  );
}
