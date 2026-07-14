import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createMemory, normalizeMemory } from "@/lib/aicore";
import { cn } from "@/lib/utils";

// Manual product entry dialog. Any brand can be added here regardless of where
// it sells (Shopify / self-hosted site / social-first), so this is the universal
// entry point for growing the knowledge base.
export default function ProductAddDialog({
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
  const [vendor, setVendor] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [specText, setSpecText] = useState("");
  const [image, setImage] = useState("");
  const [sku, setSku] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setVendor("");
    setTitle("");
    setCategory("");
    setUnitPrice("");
    setSpecText("");
    setImage("");
    setSku("");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("标题必填");
      return;
    }
    if (!vendor.trim()) {
      toast.error("品牌必填（用于同款合并与对比）");
      return;
    }
    setSaving(true);
    try {
      const entityId = sku.trim() || `${vendor.trim()}::${Date.now()}`;
      const content = [title.trim(), specText.trim()].filter(Boolean).join(" | ");
      const { id } = await createMemory(tenant, {
        entity_id: entityId,
        title: title.trim(),
        content,
        metadata: {
          sku: entityId,
          vendor: vendor.trim(),
          category: category.trim() || null,
          unit_price: unitPrice ? Number(unitPrice) : null,
          spec: specText.trim() ? { note: specText.trim() } : {},
          tags: [],
          image: image.trim() || null,
        },
      });
      // Best-effort: normalize specs so the new item is comparable immediately.
      if (id) {
        try {
          await normalizeMemory({ tenant, id });
        } catch {
          /* normalization is optional; user can click 归一化 later */
        }
      }
      toast.success("已入库", { description: `${vendor.trim()} ${title.trim()}` });
      reset();
      onCreated();
      onClose();
    } catch (e) {
      toast.error("入库失败", { description: e instanceof Error ? e.message : String(e) });
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
          <h3 className="text-base font-bold text-zinc-100">新增商品</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>品牌 *</label>
            <input
              className={field}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="如 Dragonhawk"
            />
          </div>
          <div>
            <label className={label}>类目</label>
            <input
              className={field}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="needle / cartridge / pen / machine"
            />
          </div>
        </div>

        <div>
          <label className={label}>标题 *</label>
          <input
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="产品名称"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>价格</label>
            <input
              className={field}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="如 99"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className={label}>货号 SKU（可选）</label>
            <input
              className={field}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="留空自动生成"
            />
          </div>
        </div>

        <div>
          <label className={label}>规格说明（可选）</label>
          <textarea
            className={cn(field, "min-h-[72px] resize-y")}
            value={specText}
            onChange={(e) => setSpecText(e.target.value)}
            placeholder="如 1207RL 0.35mm 10pcs；保存后会自动归一化为可对比字段"
          />
        </div>

        <div>
          <label className={label}>图片 URL（可选）</label>
          <input
            className={field}
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            保存并归一化
          </Button>
        </div>
      </div>
    </div>
  );
}
