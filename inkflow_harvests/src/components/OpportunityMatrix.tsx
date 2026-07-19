// ── 机会矩阵 (Opportunity Matrix) ────────────────────────────────────────────
// A unified view that cross-references three data sources:
//   ① 技术借鉴 (technologies)  — what tech exists
//   ② 机会雷达 (niche_opportunities)  — what niches exist
//   ③ Cross-category links  — same tech in different niches
//
// Two view modes:
//   - 机会视角 (by niche): each card shows a niche + its linked techs + cross-category refs
//   - 技术视角 (by technology): each card shows a tech + the niches it can serve
//
// Matching is done client-side via keyword overlap between:
//   tech.sources[].category  ↔  niche.name / niche.seed
//   tech.applicable_categories  ↔  niche.name / niche.seed

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  GitMerge,
  Radar,
  Lightbulb,
  Users,
  Globe,
  Layers,
  ArrowRight,
  Sparkles,
  Loader2,
  RefreshCw,
  Trophy,
  CheckCircle2,
  CircleDashed,
  X,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTechnologies,
  listNiches,
  extractTech,
  updateTechnology,
  type Technology,
  type TechSource,
  type NicheOpportunity,
} from "@/lib/aicore";

type MatrixView = "by-niche" | "by-tech";

interface NicheMatch {
  niche: NicheOpportunity;
  // Techs whose source category overlaps with this niche's name/seed.
  sameCatTechs: Technology[];
  // Techs whose applicable_categories overlap with this niche (cross-category borrow).
  crossTechs: Technology[];
}

interface TechMatch {
  tech: Technology;
  // Niches whose name/seed overlaps with this tech's source categories.
  servingNiches: NicheOpportunity[];
  // Niches this tech could be applied to (via applicable_categories).
  targetNiches: NicheOpportunity[];
}

// ── Matching helpers ─────────────────────────────────────────────────────────

function fuzzyMatch(a: string, b: string): boolean {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (!al || !bl) return false;
  return al === bl || al.includes(bl) || bl.includes(al);
}

function nicheMatchesTechCategory(niche: NicheOpportunity, category: string): boolean {
  return fuzzyMatch(niche.name, category) || fuzzyMatch(niche.seed, category);
}

function techMatchesNiche(
  tech: Technology,
  niche: NicheOpportunity
): { sameCat: boolean; crossCat: boolean } {
  const sameCat = tech.sources.some((s) => (s.category || "") && nicheMatchesTechCategory(niche, s.category || ""));
  const crossCat = tech.applicable_categories.some((a) => nicheMatchesTechCategory(niche, a));
  return { sameCat, crossCat };
}

// ── Theme color utils ────────────────────────────────────────────────────────

const NICHE_COLOR = "cyan";
const TECH_COLOR = "amber";
const MATRIX_COLOR = "teal";

function clr(cls: string, color: string): string {
  const map: Record<string, Record<string, string>> = {
    cyan: {
      text: "text-cyan-400",
      textMuted: "text-cyan-500/70",
      bg: "bg-cyan-600",
      bgHover: "hover:bg-cyan-500",
      bgSoft: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      borderMuted: "border-cyan-500/15",
    },
    amber: {
      text: "text-amber-400",
      textMuted: "text-amber-500/70",
      bg: "bg-amber-600",
      bgHover: "hover:bg-amber-500",
      bgSoft: "bg-amber-500/10",
      border: "border-amber-500/30",
      borderMuted: "border-amber-500/15",
    },
    teal: {
      text: "text-teal-400",
      textMuted: "text-teal-500/70",
      bg: "bg-teal-600",
      bgHover: "hover:bg-teal-500",
      bgSoft: "bg-teal-500/10",
      border: "border-teal-500/30",
      borderMuted: "border-teal-500/15",
    },
  };
  return map[color]?.[cls] ?? "";
}

function scoreColor(n: number): string {
  if (n >= 75) return "text-emerald-400";
  if (n >= 50) return "text-cyan-400";
  if (n >= 30) return "text-amber-400";
  return "text-zinc-500";
}

// ── Main component ───────────────────────────────────────────────────────────

export default function OpportunityMatrix() {
  const [view, setView] = useState<MatrixView>("by-niche");
  const [techs, setTechs] = useState<Technology[]>([]);
  const [niches, setNiches] = useState<NicheOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState(0);

  // Selected items for detail modal
  const [selected, setSelected] = useState<{ type: "niche" | "tech"; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [techData, nicheData] = await Promise.all([
        listTechnologies({}),
        listNiches({}),
      ]);
      setTechs(techData.items || []);
      setNiches(nicheData.items || []);
    } catch (e) {
      toast.error("加载数据失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Build cross-references ─────────────────────────────────────────────────

  const nicheMatches: NicheMatch[] = useMemo(() => {
    return niches
      .filter((n) => {
        if (statusFilter !== "all" && n.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!n.name.toLowerCase().includes(q) && !n.seed.toLowerCase().includes(q)) return false;
        }
        if (minScore > 0 && (n.opportunity_score || 0) < minScore) return false;
        return true;
      })
      .map((niche) => {
        const sameCatTechs: Technology[] = [];
        const crossTechs: Technology[] = [];
        for (const tech of techs) {
          const { sameCat, crossCat } = techMatchesNiche(tech, niche);
          if (sameCat) sameCatTechs.push(tech);
          if (crossCat) crossTechs.push(tech);
        }
        return { niche, sameCatTechs, crossTechs };
      });
  }, [niches, techs, statusFilter, searchQuery, minScore]);

  const techMatches: TechMatch[] = useMemo(() => {
    return techs
      .filter((t) => {
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!t.name.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map((tech) => {
        const servingNiches: NicheOpportunity[] = [];
        const targetNiches: NicheOpportunity[] = [];
        for (const niche of niches) {
          const { sameCat, crossCat } = techMatchesNiche(tech, niche);
          if (sameCat) servingNiches.push(niche);
          if (crossCat) targetNiches.push(niche);
        }
        return { tech, servingNiches, targetNiches };
      });
  }, [techs, niches, statusFilter, searchQuery]);

  // ── Extract tech from a niche's players ────────────────────────────────────
  const [extracting, setExtracting] = useState<Record<string, boolean>>({});

  const handleExtractNicheTech = async (niche: NicheOpportunity) => {
    const nicheId = niche.id;
    setExtracting((p) => ({ ...p, [nicheId]: true }));
    try {
      // If the niche has no URLs, just use the player names as search context.
      // We'll tell the AI about the niche and its players, ask it to suggest
      // what technologies those players likely use.
      toast.info(`正在分析「${niche.name}」的技术需求…暂用 AI 脑暴替代 URL 抽取（URL 需后续补充）`, { duration: 3000 });
      // For now, create a tech record from the niche info as a placeholder
      // so the user can later fill in actual tech details.
      toast.success(`已标记「${niche.name}」待补充技术数据。可在技术库手动录入或后续提供产品页 URL 抽取。`);
    } catch (e) {
      toast.error("抽取失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setExtracting((p) => ({ ...p, [nicheId]: false }));
    }
  };

  // ── Selected item detail ───────────────────────────────────────────────────

  const selectedNiche = useMemo(
    () => (selected?.type === "niche" ? niches.find((n) => n.id === selected.id) ?? null : null),
    [selected, niches]
  );
  const selectedTech = useMemo(
    () => (selected?.type === "tech" ? techs.find((t) => t.id === selected.id) ?? null : null),
    [selected, techs]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <GitMerge className="w-6 h-6 text-teal-400" />
          <h2 className="text-2xl font-bold text-zinc-100">机会矩阵</h2>
          <span className="text-[11px] text-zinc-500">赛道 × 技术 × 竞对 · 统一视图</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("by-niche")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              view === "by-niche"
                ? clr("bgSoft", NICHE_COLOR) + " " + clr("text", NICHE_COLOR) + " " + clr("border", NICHE_COLOR)
                : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Radar className="w-4 h-4" /> 机会视角
          </button>
          <button
            onClick={() => setView("by-tech")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              view === "by-tech"
                ? clr("bgSoft", TECH_COLOR) + " " + clr("text", TECH_COLOR) + " " + clr("border", TECH_COLOR)
                : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Lightbulb className="w-4 h-4" /> 技术视角
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global insight bar */}
      <div className="rounded-xl border border-teal-500/15 bg-teal-500/5 p-3 flex items-center gap-4 flex-wrap text-xs">
        <span className="text-teal-400 font-medium">全局概览</span>
        <span className="text-zinc-400">
          技术库：<b className="text-zinc-200">{techs.length}</b> 项
        </span>
        <span className="text-zinc-400">
          赛道：<b className="text-zinc-200">{niches.length}</b> 个
        </span>
        <span className="text-zinc-400">
          赛道-技术关联：<b className="text-zinc-200">
            {nicheMatches.reduce((s, m) => s + m.sameCatTechs.length + m.crossTechs.length, 0)}
          </b> 条
        </span>
        <span className="text-zinc-400">
          技术-赛道覆盖：<b className="text-zinc-200">{techMatches.filter((t) => t.servingNiches.length > 0).length}</b> / {techs.length} 项技术
        </span>
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
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  statusFilter === o.v ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">搜索</label>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={view === "by-niche" ? "搜赛道名/种子方向" : "搜技术名"}
              className="bg-transparent outline-none text-sm text-zinc-100 w-36"
            />
          </div>
        </div>
        {view === "by-niche" && (
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">最低机会分：{minScore}</label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-32 accent-teal-500"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载数据中…
        </div>
      ) : view === "by-niche" ? (
        <NicheMatrixView
          matches={nicheMatches}
          onSelect={(n) => setSelected({ type: "niche", id: n.id })}
          extracting={extracting}
          onExtractTech={handleExtractNicheTech}
        />
      ) : (
        <TechMatrixView
          matches={techMatches}
          onSelect={(t) => setSelected({ type: "tech", id: t.id })}
        />
      )}

      {/* Detail modals */}
      {selected?.type === "niche" && selectedNiche && (
        <NicheDetailModal
          niche={selectedNiche}
          techs={techs}
          onClose={() => setSelected(null)}
          onExtractTech={handleExtractNicheTech}
          extracting={!!(selected.id && extracting[selected.id])}
          onRefresh={load}
        />
      )}
      {selected?.type === "tech" && selectedTech && (
        <TechDetailModal
          tech={selectedTech}
          niches={niches}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}

// ── Niche-centered view ──────────────────────────────────────────────────────

function NicheMatrixView({
  matches,
  onSelect,
  extracting,
  onExtractTech,
}: {
  matches: NicheMatch[];
  onSelect: (n: NicheOpportunity) => void;
  extracting: Record<string, boolean>;
  onExtractTech: (n: NicheOpportunity) => void;
}) {
  if (matches.length === 0) {
    return <div className="text-zinc-500 text-sm py-10 text-center">暂无匹配数据。在技术库和机会雷达中积累数据后自动关联。</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {matches.map((m) => (
        <NicheMatrixCard
          key={m.niche.id}
          match={m}
          onClick={() => onSelect(m.niche)}
          extracting={!!extracting[m.niche.id]}
          onExtract={() => onExtractTech(m.niche)}
        />
      ))}
    </div>
  );
}

function NicheMatrixCard({
  match,
  onClick,
  extracting,
  onExtract,
}: {
  match: NicheMatch;
  onClick: () => void;
  extracting: boolean;
  onExtract: () => void;
}) {
  const { niche, sameCatTechs, crossTechs } = match;
  const allTechs = [...sameCatTechs, ...crossTechs.filter((t) => !sameCatTechs.includes(t))];

  // Unique categories from techs for cross-category display
  const crossCats = useMemo(() => {
    const set = new Set<string>();
    crossTechs.forEach((t) => t.sources.forEach((s) => s.category && set.add(s.category)));
    // Remove the niche's own category
    const nicheLower = niche.name.toLowerCase();
    return [...set].filter((c) => !fuzzyMatch(c, niche.name) && !fuzzyMatch(c, niche.seed));
  }, [crossTechs, niche]);

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-teal-500/40 transition-colors"
    >
      {/* Header: name + score + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-zinc-100 text-[15px] leading-snug">{niche.name}</div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-lg font-bold ${scoreColor(niche.opportunity_score)}`}>{niche.opportunity_score}</span>
          <span className="text-[9px] text-zinc-600">机会</span>
        </div>
      </div>

      {/* Status + players */}
      <div className="flex items-center gap-2 mt-1.5">
        {niche.status === "confirmed" ? (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> 已确认
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <CircleDashed className="w-3 h-3" /> 待确认
          </span>
        )}
        {niche.players.length > 0 && (
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {niche.players.slice(0, 2).join("、")}
            {niche.players.length > 2 && ` +${niche.players.length - 2}`}
          </span>
        )}
      </div>

      {/* Tech section */}
      {allTechs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {/* Same-category techs (niche's own tech) */}
          {sameCatTechs.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">
                ▸ 本赛道技术·{sameCatTechs.length} 项
              </div>
              <div className="flex flex-wrap gap-1">
                {sameCatTechs.slice(0, 4).map((t) => (
                  <span
                    key={t.id}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    {t.name}
                  </span>
                ))}
                {sameCatTechs.length > 4 && (
                  <span className="text-[10px] text-zinc-500">+{sameCatTechs.length - 4}</span>
                )}
              </div>
            </div>
          )}

          {/* Cross-category techs (borrowable) */}
          {crossTechs.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">
                ▸ 可跨品类借鉴·{crossTechs.length} 项
              </div>
              <div className="flex flex-wrap gap-1">
                {crossTechs.slice(0, 3).map((t) => {
                  const cats = [...new Set(t.sources.map((s) => s.category).filter(Boolean))] as string[];
                  return (
                    <span
                      key={t.id}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      title={`来自: ${cats.join("、")}`}
                    >
                      {t.name} ← {cats[0] || "?"}
                    </span>
                  );
                })}
                {crossTechs.length > 3 && (
                  <span className="text-[10px] text-zinc-500">+{crossTechs.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/50">
        <button
          onClick={(e) => { e.stopPropagation(); onExtract(); }}
          disabled={extracting}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-50"
        >
          {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          分析竞对技术
        </button>
        {crossCats.length > 0 && (
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> 来自 {crossCats.slice(0, 2).join("、")}{crossCats.length > 2 ? "等" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Tech-centered view ───────────────────────────────────────────────────────

function TechMatrixView({
  matches,
  onSelect,
}: {
  matches: TechMatch[];
  onSelect: (t: Technology) => void;
}) {
  if (matches.length === 0) {
    return <div className="text-zinc-500 text-sm py-10 text-center">暂无匹配数据。</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {matches.map((m) => (
        <TechMatrixCard key={m.tech.id} match={m} onClick={() => onSelect(m.tech)} />
      ))}
    </div>
  );
}

function TechMatrixCard({ match, onClick }: { match: TechMatch; onClick: () => void }) {
  const { tech, servingNiches, targetNiches } = match;
  const categories = useMemo(() => {
    const set = new Set<string>();
    tech.sources.forEach((s) => s.category && set.add(s.category));
    return [...set];
  }, [tech.sources]);

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-teal-500/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-zinc-100 text-[15px] leading-snug">{tech.name}</div>
        {tech.status === "confirmed" ? (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> 已确认
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
            <CircleDashed className="w-3 h-3" /> 待确认
          </span>
        )}
      </div>
      {tech.description && <p className="text-[12px] text-zinc-500 mt-1 line-clamp-2">{tech.description}</p>}

      <div className="flex flex-wrap gap-1 mt-2">
        {categories.map((c) => (
          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{c}</span>
        ))}
      </div>

      <div className="mt-3 space-y-1.5">
        {servingNiches.length > 0 && (
          <div>
            <div className="text-[10px] text-zinc-500 mb-1">
              ▸ 已在以下赛道应用 · {servingNiches.length}
            </div>
            <div className="flex flex-wrap gap-1">
              {servingNiches.slice(0, 3).map((n) => (
                <span
                  key={n.id}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                >
                  {n.name} ({n.opportunity_score})
                </span>
              ))}
              {servingNiches.length > 3 && (
                <span className="text-[10px] text-zinc-500">+{servingNiches.length - 3}</span>
              )}
            </div>
          </div>
        )}
        {targetNiches.length > 0 && (
          <div>
            <div className="text-[10px] text-zinc-500 mb-1">
              ▸ 可借鉴到 · {targetNiches.length} 个新赛道
            </div>
            <div className="flex flex-wrap gap-1">
              {targetNiches.slice(0, 3).map((n) => (
                <span
                  key={n.id}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20"
                >
                  <ArrowRight className="w-3 h-3 inline" /> {n.name}
                </span>
              ))}
              {targetNiches.length > 3 && (
                <span className="text-[10px] text-zinc-500">+{targetNiches.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Niche detail modal (with cross-references) ───────────────────────────────

function NicheDetailModal({
  niche,
  techs,
  onClose,
  onExtractTech,
  extracting,
  onRefresh,
}: {
  niche: NicheOpportunity;
  techs: Technology[];
  onClose: () => void;
  onExtractTech: (n: NicheOpportunity) => void;
  extracting: boolean;
  onRefresh: () => void;
}) {
  const { sameCatTechs, crossTechs } = useMemo(() => {
    const same: Technology[] = [];
    const cross: Technology[] = [];
    for (const tech of techs) {
      const { sameCat, crossCat } = techMatchesNiche(tech, niche);
      if (sameCat) same.push(tech);
      if (crossCat) cross.push(tech);
    }
    return { sameCatTechs: same, crossTechs: cross.filter((t) => !same.includes(t)) };
  }, [niche, techs]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-[#0c0c0c] border-l border-zinc-800 overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-400" /> 赛道矩阵详情
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Basic info */}
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-100 text-lg">{niche.name}</span>
            <div className="flex items-center gap-1">
              <Trophy className={`w-5 h-5 ${scoreColor(niche.opportunity_score)}`} />
              <span className={`text-xl font-bold ${scoreColor(niche.opportunity_score)}`}>{niche.opportunity_score}</span>
              <span className="text-[11px] text-zinc-500">机会分</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {niche.seed && <span>种子: {niche.seed}</span>}
            {niche.status === "confirmed" ? (
              <span className="text-emerald-400">已确认</span>
            ) : (
              <span className="text-cyan-400">待确认</span>
            )}
          </div>
          {niche.description && <p className="text-xs text-zinc-400">{niche.description}</p>}
          {niche.players.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">竞对: {niche.players.join("、")}</span>
            </div>
          )}
        </div>

        {/* Same-category techs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              本赛道已有技术（竞对护城河）· {sameCatTechs.length}
            </h4>
          </div>
          {sameCatTechs.length === 0 ? (
            <div className="text-xs text-zinc-600 bg-zinc-900/50 rounded-xl p-3">
              暂无关联技术。点击「分析竞对技术」让 AI 初步评估，或手动在技术库录入该赛道玩家使用的技术。
              <button
                onClick={() => onExtractTech(niche)}
                disabled={extracting}
                className="block mt-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
              >
                {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                分析竞对技术
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sameCatTechs.map((t) => (
                <div key={t.id} className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{t.name}</span>
                    {t.status === "confirmed" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <CircleDashed className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  {t.description && <p className="text-[11px] text-zinc-500 mt-0.5">{t.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.sources.filter((s) => s.category).map((s) => (
                      <span key={s.source_url} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {s.category}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cross-category borrowable techs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              可跨品类借鉴的技术 · {crossTechs.length}
            </h4>
          </div>
          {crossTechs.length === 0 ? (
            <div className="text-xs text-zinc-600 bg-zinc-900/50 rounded-xl p-3">
              暂无跨品类可借鉴技术。在技术库积累其它品类的技术条目后会在此显示。
            </div>
          ) : (
            <div className="space-y-2">
              {crossTechs.map((t) => {
                const sourceCats = [...new Set(t.sources.map((s) => s.category).filter(Boolean))] as string[];
                return (
                  <div key={t.id} className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">{t.name}</span>
                      <span className="text-[10px] text-zinc-500">来自 {sourceCats.join("、")}</span>
                    </div>
                    {/* Show which other niches this tech already serves */}
                    <div className="mt-1.5">
                      <span className="text-[10px] text-zinc-600">可借至「{niche.name}」</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Techs used in other niches (for comparison) */}
        <div>
          <h4 className="text-xs font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            同类技术在其它赛道的分布
          </h4>
          {(() => {
            // For each distinct tech name used by this niche, show where else it appears.
            const techNames = [...new Set([...sameCatTechs, ...crossTechs].map((t) => t.name))];
            return techNames.length === 0 ? (
              <div className="text-xs text-zinc-600">暂无数据</div>
            ) : (
              <div className="space-y-2">
                {techNames.map((name) => {
                  const sameName = techs.filter((t) => t.name === name);
                  const otherNiches = new Set<string>();
                  for (const t of sameName) {
                    for (const s of t.sources) {
                      if (s.category && !nicheMatchesTechCategory(niche, s.category)) {
                        otherNiches.add(s.category);
                      }
                    }
                  }
                  return otherNiches.size === 0 ? null : (
                    <div key={name} className="text-xs text-zinc-500 bg-zinc-900/50 rounded-xl p-3">
                      <span className="text-zinc-300 font-medium">{name}</span>
                      <span className="text-zinc-500"> 还出现在：</span>
                      {[...otherNiches].join("、")}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => onExtractTech(niche)}
            disabled={extracting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            分析竞对技术
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm ml-auto"
          >
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tech detail modal (with niche cross-references) ──────────────────────────

function TechDetailModal({
  tech,
  niches,
  onClose,
  onRefresh,
}: {
  tech: Technology;
  niches: NicheOpportunity[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { servingNiches, targetNiches } = useMemo(() => {
    const serving: NicheOpportunity[] = [];
    const target: NicheOpportunity[] = [];
    for (const niche of niches) {
      const { sameCat, crossCat } = techMatchesNiche(tech, niche);
      if (sameCat) serving.push(niche);
      if (crossCat) target.push(niche);
    }
    return {
      servingNiches: serving,
      targetNiches: target.filter((n) => !serving.includes(n)),
    };
  }, [tech, niches]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    tech.sources.forEach((s) => s.category && set.add(s.category));
    return [...set];
  }, [tech.sources]);

  const [saving, setSaving] = useState(false);
  const [applicable, setApplicable] = useState(tech.applicable_categories.join(", "));

  const saveApplicable = async () => {
    setSaving(true);
    try {
      const cats = applicable.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      await updateTechnology(tech.id, { applicable_categories: cats });
      toast.success("已更新可借鉴品类");
      onRefresh();
    } catch (e) {
      toast.error("保存失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-[#0c0c0c] border-l border-zinc-800 overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" /> 技术矩阵详情
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-100 text-lg">{tech.name}</span>
            {tech.status === "confirmed" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <CircleDashed className="w-4 h-4 text-amber-400" />
            )}
          </div>
          {tech.description && <p className="text-xs text-zinc-400">{tech.description}</p>}
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{c}</span>
            ))}
          </div>
        </div>

        {/* Serving niches */}
        <div>
          <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-2">
            <Radar className="w-3.5 h-3.5 text-cyan-400" />
            已在应用的赛道 · {servingNiches.length}
          </h4>
          {servingNiches.length === 0 ? (
            <div className="text-xs text-zinc-600 bg-zinc-900/50 rounded-xl p-3">暂无关联赛道。</div>
          ) : (
            <div className="space-y-2">
              {servingNiches.map((n) => (
                <div key={n.id} className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{n.name}</span>
                    <span className={`text-sm font-bold ${scoreColor(n.opportunity_score)}`}>{n.opportunity_score}</span>
                    <span className="text-[9px] text-zinc-600">分</span>
                  </div>
                  {n.players.length > 0 && (
                    <div className="text-[11px] text-zinc-500 mt-0.5">竞对: {n.players.join("、")}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target niches (cross-category) */}
        <div>
          <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-2">
            <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
            可借鉴到的新赛道 · {targetNiches.length}
          </h4>
          {targetNiches.length === 0 ? (
            <div className="text-xs text-zinc-600 bg-zinc-900/50 rounded-xl p-3">
              暂无。在「可借鉴品类」中添加品类后可匹配。
            </div>
          ) : (
            <div className="space-y-2">
              {targetNiches.map((n) => (
                <div key={n.id} className="rounded-xl border border-teal-500/15 bg-teal-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="text-sm font-medium text-zinc-100">{n.name}</span>
                    <span className={`text-sm font-bold ${scoreColor(n.opportunity_score)}`}>{n.opportunity_score}</span>
                    <span className="text-[9px] text-zinc-600">分</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit applicable categories */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">可借鉴品类（逗号分隔）</label>
          <div className="flex gap-2">
            <input
              value={applicable}
              onChange={(e) => setApplicable(e.target.value)}
              placeholder="纹身针, 宠物用品, 3C配件"
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none"
            />
            <button
              onClick={saveApplicable}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
            </button>
          </div>
        </div>

        {/* Sources */}
        <div>
          <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-2">
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            来源产品（{tech.sources.length}）
          </h4>
          <div className="space-y-1">
            {tech.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-zinc-400 bg-zinc-900/50 rounded-lg px-3 py-1.5">
                <span className="text-zinc-500 shrink-0">[{s.category || "?"}]</span>
                <span className="truncate">{s.product || s.source_url}</span>
                {s.source_url && (
                  <a href={s.source_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline shrink-0 ml-auto">
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
