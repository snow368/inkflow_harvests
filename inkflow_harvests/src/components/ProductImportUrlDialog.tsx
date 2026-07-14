import { useState } from "react";
import { X, Link2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { importFromUrl, normalizeMemory, type UrlImportResult } from "@/lib/aicore";
import { cn } from "@/lib/utils";

// Paste-a-URL product import (C channel). Any public product page works —
// AI Core fetches it, asks Workers AI to extract structured fields, and writes
// a `product` memory into the knowledge base. Best for one-off competitors /
// items found while browsing that aren't on a known Shopify store.
export default function ProductImportUrlDialog({
  open,
  tenant,
  onClose,
  onCreated,
}: {
  open: boolean;
  tenant: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [url, setUrl] = useState("");
  const [brand, setBrand] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<UrlImportResult | null>(null);

  if (!open) return null;

  const reset = () => {
    setUrl("");
    setBrand("");
    setDone(null);
  };

  const handleSave = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error("请输入有效的商品页网址（以 http/https 开头）");
      return;
    }
    setSaving(true);
    setDone(null);
    try {
      const result = await importFromUrl(tenant, {
        url: url.trim(),
        brand: brand.trim() || undefined,
      });
      // Best-effort: normalize specs for each created item so it's comparable
      // immediately (AI-quality when the AI binding is configured).
      if (result.memory_ids?.length) {
        await Promise.all(
          result.memory_ids.map((id) =>
            normalizeMemory({ tenant, id }).catch(() => undefined)
          )
        );
      }
      setDone(result);
      toast.success("已入库", {
        description: result.extracted?.title || url,
      });
      onCreated();
      // Keep the dialog open showing the extracted preview; user closes it.
    } catch (e) {
      toast.error("采集失败", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full px-3 py-2 bg-zinc-900/70 border border-zinc-800/60 rounded-lg text-sm text-zinc-100 outline-none focus:border-rose-500/60";
  const label = "block text-[11px] uppercase tracking-wider text-zinc-500 mb-1 font-bold";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-800/70 bg-zinc-950/95 p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-100">从网址采集商品</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className={label}>商品页网址 *</label>
          <input
            className={field}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/products/xxx"
            disabled={saving}
          />
        </div>

        <div>
          <label className={label}>品牌（可选，留空让 AI 自动识别）</label>
          <input
            className={field}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="如 Dragonhawk"
            disabled={saving}
          />
        </div>

        {done && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 space-y-1">
            <div className="flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-4 h-4" /> 已入库
            </div>
            {done.extracted?.title && <div>标题：{done.extracted.title}</div>}
            {done.extracted?.brand && <div>品牌：{done.extracted.brand}</div>}
            {done.extracted?.category && <div>类目：{done.extracted.category}</div>}
            {done.extracted?.unit_price != null && (
              <div>价格：¥{done.extracted.unit_price}</div>
            )}
            <div className="text-emerald-300/70">
              已入库 {done.imported} 条，并自动归一化用于对比。
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            关闭
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={saving || !/^https?:\/\//i.test(url.trim())}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            采集并归一化
          </Button>
        </div>
      </div>
    </div>
  );
}
