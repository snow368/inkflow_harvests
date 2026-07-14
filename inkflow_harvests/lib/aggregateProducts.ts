import type { MemoryItemDTO } from "./aicore";

export interface ProductFamily {
  key: string;
  representative: MemoryItemDTO;
  variants: MemoryItemDTO[];
}

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

// Collapse a product title to its "family" name by stripping the tokens that
// only denote a size / packaging / color variant — so that
//   "Dragonhawk Cartridge 1207RL 0.35mm 10pcs"
//   "Dragonhawk Cartridge 1207RL 0.30mm 20pcs"
// resolve to the SAME family (the shared model 1207RL), while a genuinely
// different model (1209RL) stays separate.
function normalizeTitle(title: string): string {
  let s = (title || "").toLowerCase();
  // strip color words (en + zh) — these are variants, not the model
  s = s.replace(
    /\b(red|black|blue|green|purple|white|pink|gold|rose|silver|gray|grey|brown|yellow|orange|cyan|violet|transparent)\b/g,
    " "
  );
  s = s.replace(/[红黑蓝绿紫白粉金银灰棕黄橙]/g, " ");
  // strip dimension / pack-qty / count tokens (keeps bare model numbers like 1207RL)
  s = s.replace(
    /\d+(?:\.\d+)?\s?(?:mm|cm|g|ml|mah|v|inch|"|pcs|pc|pieces?|个|支|盒|包|条|set|套装|pack|pair|双|瓶|袋)/g,
    " "
  );
  s = s.replace(/\b\d+\s?x\s?\d+\b/gi, " ");
  // strip prices
  s = s.replace(/[¥$€£]\s?\d+/g, " ");
  // strip parentheses / slashes / brackets
  s = s.replace(/[()/[\]【】]/g, " ");
  // drop everything but letters / numbers / whitespace, then collapse spaces
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function aggregateProductFamilies(items: MemoryItemDTO[]): ProductFamily[] {
  const map = new Map<string, ProductFamily>();
  for (const it of items) {
    const meta = parseMeta(it.metadata);
    const brand = String((meta.brand as string) || (meta.vendor as string) || "")
      .toLowerCase()
      .trim();
    const key = `${brand}::${normalizeTitle(it.title || "")}`;
    const fam = map.get(key);
    if (fam) fam.variants.push(it);
    else map.set(key, { key, representative: it, variants: [it] });
  }
  return Array.from(map.values());
}
