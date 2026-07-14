import { motion } from "framer-motion";
import { X, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemoryItemDTO } from "@/lib/aicore";

// Display labels for canonical spec keys (kept in sync with the backend
// specNormalizer NEEDLE_SPEC_KEYS + generic extras). Unknown keys fall back to
// their raw key name.
const SPEC_LABELS: Record<string, string> = {
  gauge_g: "规格号",
  gauge_mm: "针径 (mm)",
  configuration: "排布",
  needle_count: "针数",
  taper: "收尖",
  cartridge: "卡针式",
  membrane: "隔膜",
  material: "材质",
  color: "颜色",
  capacity: "容量",
  size: "尺寸",
  weight: "重量",
  power: "功率",
  diameter: "直径",
};

// Canonical spec keys are shown first (in this order), then any extra keys
// found across the selection, alphabetically.
const CANON_ORDER = [
  "gauge_g",
  "gauge_mm",
  "configuration",
  "needle_count",
  "taper",
  "cartridge",
  "membrane",
  "material",
];

function parseMeta(m: Record<string, unknown> | string | undefined): Record<string, unknown> {
  if (typeof m === "string") {
    try {
      const p = JSON.parse(m);
      if (p && typeof p === "object") return p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  } else if (m && typeof m === "object") {
    return m;
  }
  return {};
}

function getSpecs(it: MemoryItemDTO): Record<string, string> {
  const meta = parseMeta(it.metadata);
  const specs = meta.specs;
  if (specs && typeof specs === "object") return specs as Record<string, string>;
  return {};
}

function rowValue(it: MemoryItemDTO, key: string): string {
  const meta = parseMeta(it.metadata);
  if (key === "brand") return (meta.brand as string) ?? "—";
  if (key === "category") return (meta.category as string) ?? "—";
  if (key === "unit_price") {
    const p = meta.unit_price;
    return p == null ? "—" : `¥${p}`;
  }
  const s = getSpecs(it)[key];
  return s == null || s === "" ? "—" : String(s);
}

// Top fixed rows: brand / category / price — always present, always first.
const FIXED_ROWS = [
  { key: "brand", label: "品牌" },
  { key: "category", label: "类目" },
  { key: "unit_price", label: "价格" },
];

export default function ProductCompare({
  items,
  onClose,
}: {
  items: MemoryItemDTO[];
  onClose: () => void;
}) {
  // Collect spec keys present in any selected item.
  const keySet = new Set<string>();
  for (const it of items) {
    for (const k of Object.keys(getSpecs(it))) keySet.add(k);
  }
  const extras = Array.from(keySet)
    .filter((k) => !CANON_ORDER.includes(k))
    .sort();
  const specRows = [
    ...CANON_ORDER.filter((k) => keySet.has(k)).map((k) => ({ key: k, label: SPEC_LABELS[k] ?? k })),
    ...extras.map((k) => ({ key: k, label: SPEC_LABELS[k] ?? k })),
  ];
  const rows = [...FIXED_ROWS, ...specRows];

  // For each row, detect if values differ (more than one distinct non-empty).
  const rowDiffers = (key: string): boolean => {
    const vals = items.map((it) => rowValue(it, key)).filter((v) => v !== "—");
    return new Set(vals).size > 1;
  };
  const rowReference = (key: string): string => {
    const first = items.map((it) => rowValue(it, key)).find((v) => v !== "—");
    return first ?? "—";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[88vh] overflow-auto rounded-2xl border border-zinc-800 bg-[#111] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#111] border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-bold text-white">横向对比 · {items.length} 项</h3>
            <span className="text-xs text-zinc-500">
              {parseMeta(items[0]?.metadata).category || ""}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] uppercase tracking-widest text-zinc-500 font-black p-3 w-36 sticky left-0 bg-[#111]">
                    属性
                  </th>
                  {items.map((it) => {
                    const meta = parseMeta(it.metadata);
                    return (
                      <th key={it.id} className="text-left p-3 align-top min-w-[180px]">
                        <div className="font-semibold text-zinc-100 leading-snug">{it.title || "—"}</div>
                        {meta.brand && (
                          <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600/10 text-rose-400 text-[10px] font-bold uppercase">
                            {String(meta.brand)}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const diff = rowDiffers(row.key);
                  const ref = rowReference(row.key);
                  return (
                    <tr key={row.key} className="border-t border-zinc-800/60">
                      <td
                        className={cn(
                          "p-3 text-xs font-bold sticky left-0 bg-[#111]",
                          diff ? "text-amber-300" : "text-zinc-400"
                        )}
                      >
                        {row.label}
                        {diff && <span className="ml-1 text-[9px] text-amber-400">≠</span>}
                      </td>
                      {items.map((it) => {
                        const v = rowValue(it, row.key);
                        const cellDiff = diff && v !== ref;
                        return (
                          <td
                            key={it.id}
                            className={cn(
                              "p-3 align-top text-zinc-200",
                              cellDiff && "bg-amber-500/10 text-amber-200 font-semibold"
                            )}
                          >
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === FIXED_ROWS.length && (
            <p className="mt-4 text-xs text-zinc-500">
              这些商品还没有归一化规格（metadata.specs 为空）。点列表里的「归一化」按钮，或「归一化本页」批量生成，对比就能按规格逐行对齐。
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
