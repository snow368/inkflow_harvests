/**
 * 通用 CSV 导入脚本
 * 用法: npx tsx scripts/import-csv.ts <csv路径> [州代码]
 * 示例: npx tsx scripts/import-csv.ts data/OR_Raw.csv OR
 *
 * 自动映射常见 CSV 列名，支持增量导入（不会清空已有数据）
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// 加载 .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf-8');
  for (const line of envRaw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const sql = neon(process.env.NEON_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL || '');

// 常见列名映射
const COLUMN_MAP: Record<string, string> = {
  // 店名 → shop_name（数据库字段名）
  'shop name': 'shop_name', 'name': 'shop_name', 'store name': 'shop_name', 'business name': 'shop_name', 'studio name': 'shop_name',
  // IG
  'instagram': 'ig_handle', 'ig handle': 'ig_handle', 'ig_handle': 'ig_handle', 'instagram handle': 'ig_handle',
  // 地址
  'address': 'address', 'full address': 'address', 'street': 'address',
  // 城市
  'city': 'city', 'town': 'city',
  // 州
  'state': 'state', 'province': 'state', 'region': 'state',
  // 电话
  'phone': 'phone', 'tel': 'phone', 'telephone': 'phone', 'mobile': 'phone',
  // 网站
  'website': 'website', 'web': 'website', 'site': 'website',
  // 评分
  'rating': 'rating', 'stars': 'rating', 'score': 'rating',
  // 评价数
  'reviews': 'reviews', 'review count': 'reviews', 'review_count': 'reviews',
  // 邮箱
  'email': 'email', 'e-mail': 'email', 'mail': 'email',
};

function detectColumn(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/^["']|["']$/g, '');
  return COLUMN_MAP[key] || null;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('用法: npx tsx scripts/import-csv.ts <csv路径> [州代码]');
    console.error('示例: npx tsx scripts/import-csv.ts data/OR_Raw.csv OR');
    process.exit(1);
  }

  const stateArg = process.argv[3] || '';

  if (!fs.existsSync(csvPath)) {
    console.error(`文件不存在: ${csvPath}`);
    process.exit(1);
  }

  // 读 CSV
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').filter(Boolean);
  const rawHeader = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

  // 映射列名
  const colMap: Record<string, string> = {};
  for (const h of rawHeader) {
    const mapped = detectColumn(h);
    if (mapped) colMap[mapped] = h;
  }

  console.log(`📄 列映射:`);
  for (const [k, v] of Object.entries(colMap)) {
    console.log(`  ${k} ← ${v}`);
  }

  // 解析行
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: any = {};
    rawHeader.forEach((h, i) => row[h] = vals[i] || '');
    return row;
  });

  // 提取状态
  let state = stateArg;
  if (!state) {
    // 从数据推断
    const stateCounts: Record<string, number> = {};
    for (const r of rows) {
      const s = (colMap['state'] ? r[colMap['state']] : '').toUpperCase().trim();
      if (s && s.length <= 2) stateCounts[s] = (stateCounts[s] || 0) + 1;
    }
    state = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'XX';
  }

  console.log(`\n📊 数据: ${rows.length} 行, 州: ${state}`);

  let inserted = 0;
  let skipped = 0;
  let existing = 0;
  const BATCH = 200;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    for (const r of batch) {
      const name = colMap['shop_name'] ? (r[colMap['shop_name']] || '').trim() : '';
      let igHandle = colMap['ig_handle'] ? (r[colMap['ig_handle']] || '').trim() : '';
      const address = colMap['address'] ? (r[colMap['address']] || '').trim() : '';
      const city = colMap['city'] ? (r[colMap['city']] || '').trim() : '';
      const phone = colMap['phone'] ? (r[colMap['phone']] || '').trim() : '';
      const website = colMap['website'] ? (r[colMap['website']] || '').trim() : '';
      const email = colMap['email'] ? (r[colMap['email']] || '').trim() : '';
      const ratingStr = colMap['rating'] ? (r[colMap['rating']] || '').trim() : '';
      const reviewsStr = colMap['review_count'] ? (r[colMap['review_count']] || '').trim() : '';

      // 清理 IG handle
      if (igHandle && igHandle !== 'N/A') {
        igHandle = igHandle.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').replace(/^@/, '').trim();
      } else {
        igHandle = '';
      }

      // 跳过无数据行
      if (!name && !igHandle && !address) { skipped++; continue; }

      const rating = parseFloat(ratingStr) || 0;
      const reviewCount = parseInt(reviewsStr) || 0;

      // 生成唯一 ID
      const id = name
        ? `${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${address.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${phone.replace(/\D/g, '')}`.slice(0, 120)
        : igHandle
          ? `ig_${igHandle}`
          : `addr_${address.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`.slice(0, 120);

      try {
        // 用 upsert：存在则更新，不存在则插入
        await sql`
          INSERT INTO artists (id, shop_name, ig_handle, address, city, state, phone, website, email, rating, reviews, import_region, last_updated)
          VALUES (${id}, ${name}, ${igHandle}, ${address}, ${city}, ${state}, ${phone}, ${website || null}, ${email || null}, ${rating}, ${reviewCount}, ${state}, NOW())
          ON CONFLICT (id) DO UPDATE SET
            ig_handle = COALESCE(NULLIF(EXCLUDED.ig_handle, ''), artists.ig_handle),
            website = COALESCE(NULLIF(EXCLUDED.website, ''), artists.website),
            email = COALESCE(NULLIF(EXCLUDED.email, ''), artists.email),
            rating = CASE WHEN EXCLUDED.rating > 0 THEN EXCLUDED.rating ELSE artists.rating END,
            review_count = CASE WHEN EXCLUDED.review_count > 0 THEN EXCLUDED.review_count ELSE artists.review_count END,
            updated_at = NOW()
        `;
        inserted++;
      } catch (err: any) {
        // 唯一约束冲突
        if (err?.message?.includes('duplicate key')) { existing++; continue; }
        console.error(`  [ERROR] ${name || igHandle}: ${err?.message?.slice(0, 100)}`);
        skipped++;
      }
    }

    const done = Math.min(i + BATCH, rows.length);
    process.stdout.write(`\r  进度: ${done}/${rows.length} 行 (插入 ${inserted}, 已有 ${existing}, 跳过 ${skipped})`);
  }

  console.log(`\n\n✅ 导入完成`);
  console.log(`  总行数: ${rows.length}`);
  console.log(`  插入:   ${inserted}`);
  console.log(`  已存在: ${existing}`);
  console.log(`  跳过:   ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
