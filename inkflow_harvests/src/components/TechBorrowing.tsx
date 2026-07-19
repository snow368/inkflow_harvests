import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Lightbulb,
  Plus,
  Loader2,
  Check,
  X,
  Trash2,
  Sparkles,
  Globe,
  Layers,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTechnologies,
  createTechnology,
  updateTechnology,
  extractTech,
  type Technology,
  type TechSource,
} from "@/lib/aicore";

type StatusFilter = "all" | "suggested" | "confirmed";
type View = "library" | "borrow";

// Parse a metric value: numbers stay numbers, everything else stays string.
function parseMetricValue(v: string): number | string {
  const t = v.trim();
  if (t !== "" && !isNaN(Number(t))) return Number(t);
  return t;
}

export default function TechBorrowing() {
  const [view, setView] = useState<View>("library");
  const [techs, setTechs] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Technology | null>(null);

  // borrow view
  const [borrowCategory, setBorrowCategory] = useState("");

  // extract form
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractUrls, setExtractUrls] = useState("");
  const [extractCategory, setExtractCategory] = useState("");
  const [extracting, setExtracting] = useState(false);

  // manual add form
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTechnologies({
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter.trim() || undefined,
      });
      setTechs(data.items || []);
    } catch (e) {
      toast.error("加载技术库失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleTechs = techs;

  // Techs usable for the borrow target: they have at least one source from a
  // category DIFFERENT from the target (i.e. a cross-category technology).
  const borrowable = useMemo(() => {
    const target = borrowCategory.trim().toLowerCase();
    if (!target) return [];
    return techs.filter((t) => t.sources.some((s) => (s.category || "").toLowerCase() !== target));
  }, [techs, borrowCategory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-bold text-zinc-100">技术借鉴</h2>
          <span className="text-[11px] text-zinc-500">跨品类技术矩阵 · 新品开发参考</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("library")}
            className={cnTab(view === "library")}
          >
            <Layers className="w-4 h-4" /> 技术库
          </button>
          <button
            onClick={() => setView("borrow")}
            className={cnTab(view === "borrow")}
          >
            <ArrowRight className="w-4 h-4" /> 借鉴视图
          </button>
          <button
            onClick={() => setExtractOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4" /> AI 抽取
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

      {view === "library" ? (
        <LibraryView
          techs={visibleTechs}
          loading={loading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          onSelect={setSelected}
        />
      ) : (
        <BorrowView techs={techs} borrowCategory={borrowCategory} setBorrowCategory={setBorrowCategory} borrowable={borrowable} onSelect={setSelected} />
      )}

      {selected && (
        <TechDetail
          tech={selected}
          onClose={() => setSelected(null)}
          onSaved={(t) => {
            setSelected(t);
            load();
          }}
        />
      )}

      {extractOpen && (
        <ExtractModal
          urls={extractUrls}
          setUrls={setExtractUrls}
          category={extractCategory}
          setCategory={setExtractCategory}
          extracting={extracting}
          onClose={() => setExtractOpen(false)}
          onRun={async () => {
            const urls = extractUrls.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
            if (urls.length === 0) {
              toast.error("请填写要抓取的 URL");
              return;
            }
            setExtracting(true);
            try {
              const r = await extractTech({ urls, category: extractCategory.trim() });
              toast.success(`已建议 ${r.count} 项技术${r.errors.length ? `（${r.errors.length} 个失败）` : ""}`);
              setExtractOpen(false);
              setExtractUrls("");
              load();
            } catch (e) {
              toast.error("抽取失败", { description: e instanceof Error ? e.message : String(e) });
            } finally {
              setExtracting(false);
            }
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

function cnTab(active: boolean): string {
  return [
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
    active ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200",
  ].join(" ");
}

// ── Library (list + filters) ────────────────────────────────────────────────
function LibraryView({
  techs,
  loading,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  onSelect,
}: {
  techs: Technology[];
  loading: boolean;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (s: string) => void;
  onSelect: (t: Technology) => void;
}) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    techs.forEach((t) => t.sources.forEach((s) => s.category && set.add(s.category)));
    return [...set].sort();
  }, [techs]);

  return (
    <div className="space-y-4">
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
          <label className="block text-[11px] text-zinc-500 mb-1">按品类筛选（来源品类）</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          >
            <option value="">全部品类</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </div>
      ) : techs.length === 0 ? (
        <div className="text-zinc-500 text-sm py-10 text-center">
          暂无技术。点「AI 抽取」从产品页自动建议，或「手动新增」。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {techs.map((t) => (
            <TechCard key={t.id} tech={t} onClick={() => onSelect(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TechCard({ tech, onClick }: { tech: Technology; onClick: () => void }) {
  const cats = useMemo(() => {
    const set = new Set<string>();
    tech.sources.forEach((s) => s.category && set.add(s.category));
    return [...set];
  }, [tech.sources]);
  const confirmed = tech.status === "confirmed";
  const metricCount = Object.keys(tech.metrics || {}).length;
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-amber-500/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-zinc-100 text-[15px] leading-snug">{tech.name}</div>
        <StatusBadge confirmed={confirmed} />
      </div>
      {tech.description && <p className="text-[12px] text-zinc-500 mt-1 line-clamp-2">{tech.description}</p>}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {cats.map((c) => (
          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            {c}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" /> {tech.sources.length} 来源
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> {metricCount} 指标
        </span>
        {tech.applicable_categories.length > 0 && (
          <span>可借至 {tech.applicable_categories.length} 品类</span>
        )}
      </div>
    </button>
  );
}

function StatusBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed ? (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
      <CheckCircle2 className="w-3 h-3" /> 已确认
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
      <CircleDashed className="w-3 h-3" /> 待确认
    </span>
  );
}

// ── Borrow view ─────────────────────────────────────────────────────────────
function BorrowView({
  techs,
  borrowCategory,
  setBorrowCategory,
  borrowable,
  onSelect,
}: {
  techs: Technology[];
  borrowCategory: string;
  setBorrowCategory: (s: string) => void;
  borrowable: Technology[];
  onSelect: (t: Technology) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4">
        <p className="text-xs text-zinc-500 mb-2">
          选一个目标品类，下面列出<b className="text-zinc-300">来自其它品类</b>、可借鉴过来的技术（含跨品类来源与指标）。
        </p>
        <input
          value={borrowCategory}
          onChange={(e) => setBorrowCategory(e.target.value)}
          placeholder="目标品类，如 美妆 / 3C / 健身"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none"
        />
      </div>

      {!borrowCategory.trim() ? (
        <div className="text-zinc-500 text-sm py-8 text-center">输入目标品类以查看可借鉴的技术。</div>
      ) : borrowable.length === 0 ? (
        <div className="text-zinc-500 text-sm py-8 text-center">暂无来自其它品类的可借鉴技术。可先用「AI 抽取」积累技术库。</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {borrowable.map((t) => {
            const fromCats = [...new Set(t.sources.map((s) => s.category).filter(Boolean))] as string[];
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="text-left rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-zinc-100 text-[15px]">{t.name}</div>
                  <StatusBadge confirmed={t.status === "confirmed"} />
                </div>
                <div className="text-[11px] text-zinc-500 mt-2">
                  来自品类：{fromCats.join("、") || "—"}
                </div>
                <div className="flex items-center gap-1 mt-2 text-[11px] text-amber-400">
                  <ArrowRight className="w-3 h-3" /> 可借鉴到「{borrowCategory}」
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tech detail (metrics editor + sources + applicable categories) ──────────
function TechDetail({ tech, onClose, onSaved }: { tech: Technology; onClose: () => void; onSaved: (t: Technology) => void }) {
  const [name, setName] = useState(tech.name);
  const [description, setDescription] = useState(tech.description);
  const [status, setStatus] = useState<"suggested" | "confirmed">(tech.status);
  const [applicable, setApplicable] = useState(tech.applicable_categories.join(", "));
  const [metrics, setMetrics] = useState<{ key: string; value: string }[]>(
    Object.entries(tech.metrics || {}).map(([k, v]) => ({ key: k, value: String(v) }))
  );
  const [sources, setSources] = useState<TechSource[]>(tech.sources);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const save = async () => {
    setSaving(true);
    try {
      const m: Record<string, number | string> = {};
      metrics.forEach((r) => {
        const k = r.key.trim();
        if (k) m[k] = parseMetricValue(r.value);
      });
      const updated = await updateTechnology(tech.id, {
        name: name.trim() || tech.name,
        description,
        status,
        applicable_categories: applicable.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        metrics: m,
        sources,
      });
      toast.success("已保存");
      onSaved(updated);
    } catch (e) {
      toast.error("保存失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const addMetric = () => {
    if (!newKey.trim()) return;
    setMetrics((p) => [...p, { key: newKey.trim(), value: newVal }]);
    setNewKey("");
    setNewVal("");
  };

  const groupedSources = useMemo(() => {
    const map = new Map<string, TechSource[]>();
    sources.forEach((s) => {
      const c = s.category || "未分类";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(s);
    });
    return [...map.entries()];
  }, [sources]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-[#0c0c0c] border-l border-zinc-800 overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100">技术详情</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">技术名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">描述</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-500">状态</span>
          <button
            onClick={() => setStatus(status === "confirmed" ? "suggested" : "confirmed")}
            className={status === "confirmed" ? "px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm" : "px-3 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm"}
          >
            {status === "confirmed" ? "已确认" : "待确认"}
          </button>
          <span className="text-[11px] text-zinc-600">（确认 = AI 建议经人工核实）</span>
        </div>

        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">可借鉴到的品类（逗号分隔）</label>
          <input
            value={applicable}
            onChange={(e) => setApplicable(e.target.value)}
            placeholder="美妆, 3C, 健身"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          />
        </div>

        {/* Metrics — flexible key/value, dimensions TBD by user */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-zinc-500">指标（利润率 / 技术难度 / 竞争程度 … 维度待定，灵活录入）</label>
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

        {/* Sources — grouped by category (cross-category listing) */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">来源产品（按品类分组 · 跨品类聚合）</label>
          <div className="space-y-3">
            {groupedSources.map(([cat, list]) => (
              <div key={cat}>
                <div className="text-[11px] text-amber-400/80 mb-1">{cat}</div>
                <div className="space-y-1">
                  {list.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] text-zinc-400">
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{s.product || s.source_url}</span>
                      {s.source_url && (
                        <a href={s.source_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline truncate ml-auto">
                          链接
                        </a>
                      )}
                      <button
                        onClick={() => setSources((p) => p.filter((x) => x !== s))}
                        className="text-zinc-600 hover:text-red-400 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {groupedSources.length === 0 && <div className="text-[12px] text-zinc-600">暂无来源</div>}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存
        </button>
      </div>
    </div>
  );
}

// ── Extract modal (AI suggests from product pages) ──────────────────────────
function ExtractModal({
  urls,
  setUrls,
  category,
  setCategory,
  extracting,
  onClose,
  onRun,
}: {
  urls: string;
  setUrls: (s: string) => void;
  category: string;
  setCategory: (s: string) => void;
  extracting: boolean;
  onClose: () => void;
  onRun: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0c0c0c] border border-zinc-800 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> AI 抽取技术
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          输入产品页 URL（逗号 / 换行分隔），AI 会抽取页面使用的技术并写入技术库（状态=待确认）。这些技术可来自任意品类，便于跨品类借鉴。
        </p>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">来源品类（这些产品属于哪个品类，便于跨品类聚合）</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="如 纹身 / 美妆 / 3C"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">产品页 URL</label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={5}
            placeholder="https://example.com/product-a&#10;https://example.com/product-b"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
          />
        </div>
        <button
          onClick={onRun}
          disabled={extracting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 抽取并写入
        </button>
      </div>
    </div>
  );
}

// ── Manual add modal ────────────────────────────────────────────────────────
function AddModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [applicable, setApplicable] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      toast.error("请填写技术名称");
      return;
    }
    setSaving(true);
    try {
      await createTechnology({
        name: name.trim(),
        description,
        status: "suggested",
        applicable_categories: applicable.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        sources: category || sourceUrl ? [{ product: name.trim(), category: category.trim(), source_url: sourceUrl.trim() }] : [],
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
      <div className="w-full max-w-lg bg-[#0c0c0c] border border-zinc-800 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-400" /> 手动新增技术
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">技术名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">描述</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">来源品类</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="如 纹身" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">来源 URL</label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">可借鉴到的品类（逗号分隔）</label>
          <input value={applicable} onChange={(e) => setApplicable(e.target.value)} placeholder="美妆, 3C" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none" />
        </div>
        <button
          onClick={create}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 新增
        </button>
      </div>
    </div>
  );
}
