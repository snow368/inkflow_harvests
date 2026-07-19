/**
 * 订单备注解析器 —— 提取赠品与针型号信息
 * Cloudflare Worker 兼容版（无 Node.js 依赖）
 *
 * 规则: 按行解析,每行结构 = [数量][品牌] : [描述] [针型号]
 *   示例: 2Peach CON : extended cap 1007RL  → 2盒 Peach 品牌, CON 系列, 1007RL
 *         3 AES: 1003RL                     → 3盒 AES 品牌, 1003RL
 *         1AES: 0603RL                      → 1盒 AES 品牌, 0603RL
 *         送1003RL一盒                      → 赠品 1003RL 1盒
 *         1013SEM*2                         → 2盒 1013SEM, 继承 defaultSeries
 *
 * 通用型: 1003RL / 1209RM / RL1003 / 1003 RL / 10号03针RL
 * 赠品:   小海报, 贴纸, 海报等
 */

export interface GiftItem {
  type: 'needle' | 'poster' | 'sticker' | 'unknown';
  label: string;
  quantity: number;
  /** 所属系列（CON / COG / AES 等），从备注显式前缀或订单 line_items 推断 */
  series?: string;
  /** 推测的盒数（每盒10支针） */
  estimatedBoxes?: number;
}

export interface ParseOptions {
  /** 默认系列 —— 当备注行无显式系列前缀时使用 */
  defaultSeries?: string;
}

/** 针型后缀列表（常见纹身针分类） */
const NEEDLE_SUFFIXES = [
  'RL', 'RS', 'RG', 'RT', 'RM',        // 圆针系列（RM → SEM，见 SUFFIX_MAP）
  'F', 'FL',                             // 平针系列
  'M', 'M1', 'M2', 'MC', 'MT', 'MAG',   // 排针系列
  'SEM',                                // Soft-Edge Magnum (例 4737: 1013SEM)
  'L', 'LL', 'SL',                       // 其他
];

/** 后缀归一化映射：不同写法映射到标准后缀（用于 SKU 匹配） */
const SUFFIX_MAP: Record<string, string> = {
  'RM': 'SEM',  // RM = Soft-Edge Magnum，等同 SEM
};

// 构建后缀正则: 按长度降序排列(先匹配长的如 M1 再匹配短的如 M)
const SUFFIX_PATTERN = NEEDLE_SUFFIXES.sort((a, b) => b.length - a.length).join('|');

// 针型号匹配 A: 数字(3-4位) + 字母后缀 —— 如 1003RL, 1209RM, 0603RL
const NEEDLE_DIGITS_FIRST = new RegExp(`\\b(\\d{3,4})(${SUFFIX_PATTERN})\\b`, 'gi');

// 针型号匹配 B: 字母后缀 + 数字(3-4位) —— 如 RL1003, RM1209
const NEEDLE_LETTERS_FIRST = new RegExp(`\\b(${SUFFIX_PATTERN})(\\d{3,4})\\b`, 'gi');

// 针型号匹配 C: 数字 + 空格 + 字母后缀 —— 如 1003 RL, 0603 RL
const NEEDLE_SPACE_SEP = new RegExp(`\\b(\\d{3,4})\\s+(${SUFFIX_PATTERN})\\b`, 'gi');

// 额外: "10号03针RL" 格式的中文描述针
const NEEDLE_CHINESE = /(\d{1,2})[号#](\d{1,2})[针/]?(RL|RS|RG|RT|RM|F|M)/gi;

// 行首数量提取: "2Peach" → 2, "3 AES" → 3, "1AES" → 1
// 注意: 必须是「数字 + 品牌词(2个以上字母)」, 否则会误把针型号(1209RS/1003RL)的数字当成数量
const LINE_QTY_PREFIX = /^(\d{1,2})\s*([A-Za-z]{2,})/;

// 额外数量标注: "x2", "*2", "×2", "2盒", "两盒" 等
const QTY_SUFFIX = /[×xX*]\s*(\d+)|(\d+)\s*盒/g;

// 行内系列提取: "2Peach CON :" → "CON", "3 AES:" → "AES", "1AES:" → "AES"
// 系列是冒号前的 2-4 个大写字母（CON/COG/AES 等）
const LINE_SERIES = /([A-Z]{2,4})\s*:/;

/**
 * 从一行文本中提取系列前缀
 * "2Peach CON : extended cap 1007RL" → "CON"
 * "3 AES: 1003RL"                     → "AES"
 * "1009SEM"                           → null（无显式系列）
 */
function extractLineSeries(line: string): string | null {
  const m = line.match(LINE_SERIES);
  if (m) return m[1].toUpperCase();
  // 无冒号格式检查：若有 qty 前缀且紧跟大写词（如 "CON 1007RL" 无冒号写法）
  const implicit = line.match(/^\d{1,2}\s*[A-Za-z]*?\s*([A-Z]{2,4})\b(?!\d)/);
  if (implicit) return implicit[1].toUpperCase();
  return null;
}

// 常见赠品关键词
const GIFT_KEYWORDS: Array<{ pattern: RegExp; type: GiftItem['type']; label: string }> = [
  { pattern: /小海报/gi, type: 'poster', label: '小海报' },
  { pattern: /贴纸/gi, type: 'sticker', label: '贴纸' },
  { pattern: /海报/gi, type: 'poster', label: '海报' },
  { pattern: / sticker/i, type: 'sticker', label: 'Sticker' },
];

/** 判断两个 needle 型号是否等价（忽略大小写和后缀大小写） */
function areNeedlesEqual(a: string, b: string): boolean {
  return a.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      === b.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * 从一行备注文本中提取 needle 型号列表
 */
function extractNeedlesFromLine(line: string): Array<{ code: string; qty: number }> {
  const results: Array<{ code: string; qty: number }> = [];
  const seen = new Set<string>();

  // 后缀归一化映射正则（如 RM→SEM）
  const suffixMapPattern = new RegExp(`(${Object.keys(SUFFIX_MAP).join('|')})$`);

  const addIfNew = (code: string) => {
    const normalized = code.replace(suffixMapPattern, (m) => SUFFIX_MAP[m] || m);
    const key = normalized.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ code: normalized, qty: 1 });
    }
  };

  let m;

  // a) 中文描述: "10号03针RL" → 1003RL
  NEEDLE_CHINESE.lastIndex = 0;
  while ((m = NEEDLE_CHINESE.exec(line)) !== null) {
    const gauge = m[1].padStart(2, '0');
    const needleCount = m[2].padStart(2, '0');
    const suffix = m[3];
    addIfNew(`${gauge}${needleCount}${suffix}`);
  }

  // b) 空格分隔: "1003 RL"
  NEEDLE_SPACE_SEP.lastIndex = 0;
  while ((m = NEEDLE_SPACE_SEP.exec(line)) !== null) {
    addIfNew(m[1] + m[2]);
  }

  // c) 字母在前: "RL1003"
  NEEDLE_LETTERS_FIRST.lastIndex = 0;
  while ((m = NEEDLE_LETTERS_FIRST.exec(line)) !== null) {
    addIfNew(m[2] + m[1]);
  }

  // d) 数字在前(标准): "1003RL"
  NEEDLE_DIGITS_FIRST.lastIndex = 0;
  while ((m = NEEDLE_DIGITS_FIRST.exec(line)) !== null) {
    addIfNew(m[1] + m[2]);
  }

  return results;
}

/**
 * 从一行文本中提取行首数量
 * "2Peach..." → 2, "3 AES..." → 3, "1AES..." → 1, "送1003RL..." → null
 */
function extractLineQuantity(line: string): number | null {
  const m = line.match(LINE_QTY_PREFIX);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * 从一行文本中提取「后缀倍率」(x2 / ×2 / *2 / 2盒 / 两盒)
 * 用于把该行的针型号数量乘以倍率。无倍率则返回 1。
 */
const CN_NUM = new Map<string, number>([['一', 1], ['两', 2], ['兩', 2], ['二', 2], ['双', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7], ['八', 8], ['九', 9], ['十', 10]]);
function extractLineMultiplier(line: string): number {
  let m;
  QTY_SUFFIX.lastIndex = 0;
  while ((m = QTY_SUFFIX.exec(line)) !== null) {
    const qty = parseInt(m[1] || m[2], 10);
    if (!isNaN(qty) && qty > 0) return qty;
  }
  const cn = line.match(/([一二三四五六七八九十两双兩])\s*盒/);
  if (cn && CN_NUM.has(cn[1])) return CN_NUM.get(cn[1])!;
  return 1;
}

/**
 * 解析订单备注，提取赠品与针型号信息
 * @param note 订单备注原文
 * @param options 可选参数（defaultSeries: 当备注行无显式系列前缀时使用的默认系列）
 */
export function parseOrderNote(note: string, options?: ParseOptions): GiftItem[] {
  if (!note) return [];
  const gifts: GiftItem[] = [];
  const allNeedleCodes: string[] = [];
  const defaultSeries = options?.defaultSeries;

  // 清理: 去掉 IG 链接、多余空格
  const cleanNote = note.replace(/https?:\/\/[^\s]+/gi, '').trim();

  // 按行解析 —— 真实 Shopify 备注常用 "/" 分隔不同条目
  const lines = cleanNote.split(/[\n\r,;、/]+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lineQty = extractLineQuantity(line);
    const lineMult = extractLineMultiplier(line);
    const lineSeries = extractLineSeries(line) || defaultSeries;
    const needles = extractNeedlesFromLine(line);

    for (const n of needles) {
      const baseQty = lineQty !== null ? lineQty : n.qty;
      const effectiveQty = baseQty * lineMult;

      const existing = allNeedleCodes.findIndex(c => areNeedlesEqual(c, n.code));
      if (existing === -1) {
        allNeedleCodes.push(n.code);
        gifts.push({
          type: 'needle',
          label: n.code,
          series: lineSeries || undefined,
          quantity: effectiveQty,
          estimatedBoxes: effectiveQty,
        });
      }
    }
  }

  // 如果按行解析没命中，回退到整体匹配
  if (gifts.length === 0) {
    const fallbackNeedles = extractNeedlesFromLine(cleanNote);
    const firstLineSeries = lines.length > 0 ? (extractLineSeries(lines[0]) || defaultSeries) : defaultSeries;
    for (const n of fallbackNeedles) {
      allNeedleCodes.push(n.code);
      gifts.push({
        type: 'needle',
        label: n.code,
        series: firstLineSeries || undefined,
        quantity: n.qty,
        estimatedBoxes: n.qty,
      });
    }
  }

  // 赠品匹配（整体）
  for (const kw of GIFT_KEYWORDS) {
    if (kw.pattern.test(cleanNote)) {
      const key = kw.label;
      if (!gifts.some(g => g.label === key)) {
        gifts.push({
          type: kw.type,
          label: kw.label,
          quantity: 1,
        });
      }
    }
  }

  // 套餐检测: "套餐尺寸" 关键词
  if (/套餐尺寸/.test(cleanNote) && gifts.filter(g => g.type === 'needle').length === 0) {
    gifts.push({
      type: 'unknown',
      label: '套餐(未识别型号)',
      quantity: 1,
    });
  }

  return gifts;
}
