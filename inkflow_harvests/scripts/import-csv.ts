/**
 * 通用 CSV 导入脚本
 * 用法: npx tsx scripts/import-csv.ts <csv路径> [州代码]
 * 示例: npx tsx scripts/import-csv.ts data/OR_Raw.csv OR
 * 自动映射列名 + upsert，不会重复插入
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

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

// artists 表: id, uid, username, full_name, shop_name, stage, rating, reviews, address, phone, website, ig_handle, email, city, source_type, entity_type, import_region, last_updated
const COL_MAP: [string, string][] = [
  ['shop_name', 'Shop Name'], ['shop_name', 'Name'], ['shop_name', 'name'], ['shop_name', 'Store Name'], ['shop_name', 'Studio Name'], ['shop_name', 'Business Name'],
  ['ig_handle', 'Instagram'], ['ig_handle', 'ig_handle'], ['ig_handle', 'IG Handle'], ['ig_handle', 'Instagram Handle'],
  ['address', 'Address'], ['address', 'Full Address'], ['address', 'Street'],
  ['city', 'City'], ['city', 'Town'],
  ['phone', 'Phone'], ['phone', 'Tel'], ['phone', 'Telephone'],
  ['website', 'Website'], ['website', 'Web'],
  ['rating', 'Rating'], ['rating', 'Stars'],
  ['reviews', 'Reviews'], ['reviews', 'Review Count'], ['reviews', 'review_count'],
  ['email', 'Email'], ['email', 'E-mail'],
];

function findCol(raw: string, headerMap: Record<string, number>): string | null {
  const r = raw.trim().toLowerCase();
  for (const [field, csvName] of COL_MAP) {
    if (csvName.toLowerCase() === r) return field;
  }
  return null;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('用法: npx tsx scripts/import-csv.ts <csv路径> [州代码]');
    console.error('示例: npx tsx scripts/import-csv.ts data/OR_Raw.csv OR');
    process.exit(1);
  }
  const stateArg = process.argv[3] || '';
  if (!fs.existsSync(csvPath)) { console.error(`文件不存在: ${csvPath}`); process.exit(1); }

  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').filter(Boolean);
  const rawHeader = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const headerIdx: Record<string, number> = {};
  rawHeader.forEach((h, i) => headerIdx[h] = i);

  // 映射 CSV 列位置到数据库字段
  const fields: Record<string, number | null> = {};
  for (const h of rawHeader) {
    const f = findCol(h, headerIdx);
    if (f) fields[f] = headerIdx[h];
  }

  console.log('📄 列映射:');
  for (const [f, idx] of Object.entries(fields)) {
    console.log(`  ${f} ← ${rawHeader[idx!]}`);
  }

  // 解析数据
  const vals = lines.slice(1).map(line => {
    const parts = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: any = {};
    rawHeader.forEach((h, i) => row[h] = parts[i] || '');
    return row;
  });

  // 推断州
  let state = stateArg;
  if (!state) {
    const cnt: Record<string, number> = {};
    const ci = fields['city'];
    for (const r of vals) {
      if (ci !== null && ci !== undefined) {
        // try state from known city lists or just use first state found
      }
    }
  }
  if (!state) state = 'XX';

  console.log(`\n📊 ${vals.length} 行, 州: ${state}`);

  let inserted = 0, skipped = 0, errCount = 0;
  const BATCH = 200;

  for (let i = 0; i < vals.length; i += BATCH) {
    const batch = vals.slice(i, i + BATCH);
    for (const r of batch) {
      const name = fields['shop_name'] !== null && fields['shop_name'] !== undefined ? (r[rawHeader[fields['shop_name']!]] || '').trim() : '';
      let ig = fields['ig_handle'] !== null && fields['ig_handle'] !== undefined ? (r[rawHeader[fields['ig_handle']!]] || '').trim() : '';
      const addr = fields['address'] !== null && fields['address'] !== undefined ? (r[rawHeader[fields['address']!]] || '').trim() : '';
      const city = fields['city'] !== null && fields['city'] !== undefined ? (r[rawHeader[fields['city']!]] || '').trim() : '';
      const phone = fields['phone'] !== null && fields['phone'] !== undefined ? (r[rawHeader[fields['phone']!]] || '').trim() : '';
      const web = fields['website'] !== null && fields['website'] !== undefined ? (r[rawHeader[fields['website']!]] || '').trim() : '';
      const email = fields['email'] !== null && fields['email'] !== undefined ? (r[rawHeader[fields['email']!]] || '').trim() : '';
      const rating = fields['rating'] !== null && fields['rating'] !== undefined ? parseFloat(r[rawHeader[fields['rating']!]]) || 0 : 0;
      const revs = fields['reviews'] !== null && fields['reviews'] !== undefined ? parseInt(r[rawHeader[fields['reviews']!]]) || 0 : 0;

      if (ig && ig !== 'N/A') {
        ig = ig.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').replace(/^@/, '').trim();
      } else { ig = ''; }

      if (!name && !ig && !addr) { skipped++; continue; }

      const id = name
        ? `${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${addr.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${phone.replace(/\D/g, '')}`.slice(0, 120)
        : ig ? `ig_${ig}` : `addr_${addr.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`.slice(0, 120);

      try {
        await sql`
          INSERT INTO artists (id, uid, username, full_name, shop_name, stage, rating, reviews, address, phone, website, ig_handle, email, city, source_type, entity_type, import_region, last_updated)
          VALUES (${id}, ${id}, ${''}, ${name}, ${name}, ${'new'}, ${rating}, ${revs}, ${addr}, ${phone}, ${web || null}, ${ig}, ${email || null}, ${city}, ${'csv'}, ${'tattoo_shop'}, ${state}, NOW())
          ON CONFLICT (id) DO UPDATE SET
            shop_name = COALESCE(NULLIF(EXCLUDED.shop_name, ''), artists.shop_name),
            ig_handle = COALESCE(NULLIF(EXCLUDED.ig_handle, ''), artists.ig_handle),
            address = COALESCE(NULLIF(EXCLUDED.address, ''), artists.address),
            phone = COALESCE(NULLIF(EXCLUDED.phone, ''), artists.phone),
            website = COALESCE(NULLIF(EXCLUDED.website, ''), artists.website),
            email = COALESCE(NULLIF(EXCLUDED.email, ''), artists.email),
            rating = GREATEST(EXCLUDED.rating, artists.rating),
            reviews = GREATEST(EXCLUDED.reviews, artists.reviews),
            city = COALESCE(NULLIF(EXCLUDED.city, ''), artists.city),
            last_updated = NOW()
        `;
        inserted++;
      } catch (err: any) {
        errCount++;
        if (errCount <= 3) console.error(`  [ERROR] ${name || ig}: ${err?.message?.slice(0, 100)}`);
      }
    }
    process.stdout.write(`\r  进度: ${Math.min(i + BATCH, vals.length)}/${vals.length} (插入 ${inserted}, 跳过 ${skipped})`);
  }
  console.log(`\n\n✅ 完成: 插入 ${inserted}, 跳过 ${skipped}, 错误 ${errCount}`);
}

main().catch(e => { console.error(e); process.exit(1); });
