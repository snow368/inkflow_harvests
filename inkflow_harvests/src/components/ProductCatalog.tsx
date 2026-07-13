import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  RefreshCw,
  Download,
  Box,
  AlertCircle,
  Loader2,
  Database,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listProducts,
  pullHarvests,
  pullShopify,
  type MemoryItemDTO,
  type ImportSummary,
  type ShopifyImportResult,
} from "@/lib/aicore";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [20, 50, 100];

function parseMeta(m: Record<string, unknown> | string | undefined): Record<string, unknown> {
  if (typeof m === "string") {
    try {
      const p = JSON.parse(m);
      if (p && typeof p === "object") return p as Record<string, unknown>;
    } catch {
      /* ignore malformed metadata */
    }
  } else if (m && typeof m === "object") {
    return m;
  }
  return {};
}

// Chips for the "元数据" column — hides fields already surfaced elsewhere
// (category / sku / unit_price / source) and shows the rest (tags, spec…).
function metaChips(m: Record<string, unknown> | string | undefined): string[] {
  const obj = parseMeta(m);
  const hidden = new Set(["category", "sku", "unit_price", "source"]);
  const keys = Object.keys(obj).filter((k) => !hidden.has(k));
  if (keys.length === 0) return [];
  return keys.slice(0, 4).map((k) => {
    const v = obj[k];
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `${k}: ${s.length > 28 ? s.slice(0, 28) + "…" : s}`;
  });
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ProductCatalog() {
  const [tenant, setTenant] = useState("harvests");
  const [all, setAll] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [items, setItems] = useState<MemoryItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [importing, setImporting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");

  const [shopify, setShopify] = useState<ShopifyImportResult | null>(null);
  const [shopifyLoading, setShopifyLoading] = useState<"verify" | "enrich" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts({
        tenant: all ? undefined : tenant,
        all,
        q: debouncedQ || undefined,
        brand: brandFilter !== "all" ? brandFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tenant, all, debouncedQ, page, pageSize, categoryFilter, brandFilter]);

  // Fetch whenever the resolved query changes.
  useEffect(() => {
    load();
  }, [load]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Reset to first page when filters change.
  useEffect(() => {
    setPage(0);
  }, [tenant, all, debouncedQ, pageSize, categoryFilter, brandFilter]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const summary: ImportSummary = await pullHarvests({
        tenant,
        limit: 200,
        offset: 0,
      });
      toast.success("导入完成", {
        description: `新增/更新 ${summary.imported ?? 0} 条，来源共 ${summary.total ?? "?"} 条`,
      });
      await load();
    } catch (e) {
      toast.error("导入失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setImporting(false);
    }
  };

  const handleShopify = async (dryRun: boolean) => {
    setShopifyLoading(dryRun ? "verify" : "enrich");
    setShopify(null);
    try {
      const result = await pullShopify({
        tenant: "competitors:tattoo",
        brand: "peach",
        site: "peach",
        dryRun,
      });
      setShopify(result);
      if (dryRun) {
        const rate = result.total_existing
          ? Math.round((result.matched / result.total_existing) * 100)
          : 0;
        toast.success("官网匹配率验证完成", {
          description: `${result.brand} 官网在售 ${result.total_shopify} 个 SKU；本租户现有 ${result.total_existing} 条中匹配 ${result.matched} 条（${rate}%），待新增 ${result.to_insert} 条`,
        });
      } else {
        toast.success("竞品入库完成", {
          description: `已写入 ${result.updated} 条（更新 ${result.matched} + 新增 ${result.to_insert}）`,
        });
        await load();
      }
    } catch (e) {
      toast.error("竞品官网抓取失败", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setShopifyLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const categories = Array.from(
    new Set(
      items
        .map((it) => (parseMeta(it.metadata).category as string | undefined) ?? "")
        .filter(Boolean)
    )
  ).sort();

  const KNOWN_COMPETITOR_BRANDS = ["peach", "kingpin", "painfulpleasures"];
  const baseBrands = items
    .map((it) => (parseMeta(it.metadata).brand as string | undefined) ?? "")
    .filter(Boolean);
  const brands = Array.from(
    new Set(tenant.startsWith("competitors") ? [...KNOWN_COMPETITOR_BRANDS, ...baseBrands] : baseBrands)
  ).sort();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
          <Database className="w-4 h-4 text-rose-500" />
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            disabled={all}
            className={cn(
              "bg-transparent text-sm text-zinc-100 outline-none w-48",
              all && "opacity-40"
            )}
          >
            <option value="harvests">harvests（本品牌）</option>
            <option value="competitors:tattoo">competitors:tattoo（竞品）</option>
          </select>
        </div>

        <label className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl cursor-pointer select-none">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
            className="accent-rose-600 w-4 h-4"
          />
          <span className="text-xs font-medium text-zinc-300">显示全部租户</span>
        </label>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm text-zinc-200 outline-none"
          title="按竞品品牌筛选"
        >
          <option value="all">全品牌</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm text-zinc-200 outline-none"
        >
          <option value="all">全类目</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题 / 内容…"
            className="bg-transparent text-sm text-zinc-100 outline-none flex-1 placeholder:text-zinc-600"
          />
        </div>

        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          刷新
        </Button>

        <Button variant="default" size="sm" onClick={handleImport} disabled={importing}>
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          从 harvests-db 重新导入
        </Button>

        <div className="w-px h-6 bg-zinc-800/60" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShopify(true)}
          disabled={shopifyLoading !== null}
          title="只比对 Peach 官网 SKU 与本租户现有商品，不修改数据"
        >
          {shopifyLoading === "verify" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Globe className="w-4 h-4" />
          )}
          验证官网匹配率
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => handleShopify(false)}
          disabled={shopifyLoading !== null}
          title="从 Peach 官网抓取描述/价格/图片并写入 competitors:tattoo（brand=peach）"
        >
          {shopifyLoading === "enrich" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Globe className="w-4 h-4" />
          )}
          抓取竞品入库
        </Button>
      </div>

      {/* Shopify / competitor fetch result */}
      {shopify && (
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-zinc-200">
              {shopify.brand} 官网（{shopify.site}）{shopify.mode === "verify" ? "匹配率验证（未写入）" : "竞品入库完成"}
              <span className="ml-2 text-[10px] font-normal text-zinc-500">tenant = {shopify.tenant_id}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="rounded-lg bg-zinc-900/50 py-2">
              <div className="text-lg font-bold text-white">{shopify.total_existing}</div>
              <div className="text-[10px] text-zinc-500">本租户现有</div>
            </div>
            <div className="rounded-lg bg-zinc-900/50 py-2">
              <div className="text-lg font-bold text-white">{shopify.total_shopify}</div>
              <div className="text-[10px] text-zinc-500">官网在售 SKU</div>
            </div>
            <div className="rounded-lg bg-zinc-900/50 py-2">
              <div className="text-lg font-bold text-emerald-400">{shopify.matched}</div>
              <div className="text-[10px] text-zinc-500">匹配命中</div>
            </div>
            <div className="rounded-lg bg-zinc-900/50 py-2">
              <div className="text-lg font-bold text-amber-400">{shopify.to_insert}</div>
              <div className="text-[10px] text-zinc-500">待新增</div>
            </div>
            <div className="rounded-lg bg-zinc-900/50 py-2">
              <div className="text-lg font-bold text-rose-400">{shopify.updated}</div>
              <div className="text-[10px] text-zinc-500">已写入</div>
            </div>
          </div>

          {shopify.unmatched_existing.length > 0 && (
            <details className="text-xs group">
              <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">
                本租户中 {shopify.unmatched_existing.length} 条未在官网出现的 SKU（点开查看）
              </summary>
              <div className="mt-2 flex flex-wrap gap-1 max-h-32 overflow-auto">
                {shopify.unmatched_existing.slice(0, 80).map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-[10px] text-zinc-400 font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </details>
          )}

          {shopify.sample_shopify_skus.length > 0 && (
            <div className="text-xs text-zinc-500">
              <span className="text-zinc-400">官网 SKU 样本：</span>
              {shopify.sample_shopify_skus.slice(0, 12).join("、")}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
          <Box className="w-4 h-4 text-rose-500" />
          <span className="text-zinc-400">商品总数</span>
          <span className="font-bold text-white">{total}</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            加载中…
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/30 rounded-xl text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">无法读取 AI Core</p>
            <p className="text-xs text-red-300/80 font-mono break-all">{error}</p>
            <p className="text-xs text-red-300/60 mt-1">
              提示：确认已部署新版 AI Core worker，且本页通过 harvests.pages.dev 同源访问。
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-zinc-800/50 overflow-hidden bg-[#0d0d0d]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800/50 bg-zinc-900/30">
                <th className="px-4 py-3 font-black w-12">#</th>
                <th className="px-4 py-3 font-black">标题</th>
                <th className="px-4 py-3 font-black w-24">类型</th>
                <th className="px-4 py-3 font-black w-32">来源</th>
                <th className="px-4 py-3 font-black">内容预览</th>
                <th className="px-4 py-3 font-black">元数据</th>
                <th className="px-4 py-3 font-black w-32">更新时间</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-zinc-500">
                    暂无商品。点击右上角「从 harvests-db 重新导入」拉取数据。
                  </td>
                </tr>
              )}
              {items.map((it, i) => {
                const meta = parseMeta(it.metadata);
                const cat = (meta.category as string | undefined) ?? "";
                const price = meta.unit_price;
                return (
                <motion.tr
                  key={it.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-zinc-800/30 hover:bg-zinc-900/40 transition-colors"
                >
                  <td className="px-4 py-3 text-zinc-600 font-mono">{from + i}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-100 max-w-[260px] truncate">{it.title || "—"}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {it.entity_id && (
                        <span className="text-[10px] text-zinc-600 font-mono truncate">{it.entity_id}</span>
                      )}
                      {cat && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800/70 text-[10px] text-zinc-300 truncate max-w-[180px]">
                          {cat}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-600/10 text-rose-400 text-[10px] font-bold uppercase">
                      {it.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{it.source || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[320px]">
                    <div className="line-clamp-2 leading-relaxed">{it.content || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                      {price != null && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-600/10 text-emerald-400 text-[10px] font-bold">
                          ¥{String(price)}
                        </span>
                      )}
                      {metaChips(it.metadata).map((c, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-[10px] text-zinc-400 font-mono"
                        >
                          {c}
                        </span>
                      ))}
                      {price == null && metaChips(it.metadata).length === 0 && (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(it.updated_at)}</td>
                </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>
              显示 {from}–{to} / 共 {total}
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-2 py-1 text-zinc-300 outline-none"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} / 页
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </Button>
            <span className="text-xs text-zinc-400 px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
