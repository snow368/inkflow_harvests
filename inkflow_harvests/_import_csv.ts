import { neon } from '@neondatabase/serverless';
import fs from 'fs';

// Load .env manually
const envRaw = fs.readFileSync('.env', 'utf-8');
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const sql = neon(process.env.NEON_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL || '');

function fmt(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const state = process.argv[2] || 'AZ';
  const csvPath = state === 'UT'
    ? 'D:/MyCrawler_System/Data/Raw_Leads/UT_Raw_formatted.csv'
    : 'D:/MyCrawler_System/Data/Raw_Leads/AZ_Raw_formatted.csv';

  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').filter(Boolean);
  const header = lines[0].split(',');
  const rawRows = lines.slice(1).map(line => {
    const vals = line.split(',');
    const row: any = {};
    header.forEach((h, i) => row[h.trim()] = (vals[i] || '').trim());
    return row;
  });

  console.log(`Importing ${rawRows.length} rows from ${csvPath}`);

  // 1. Clear existing artists for this region
  await sql`DELETE FROM artists WHERE import_region = ${state}`;
  console.log(`Cleared existing ${state} artists`);

  // 2. Insert in batches
  let inserted = 0;
  let skipped = 0;
  const BATCH = 200;

  for (let i = 0; i < rawRows.length; i += BATCH) {
    const batch = rawRows.slice(i, i + BATCH);
    const dedup = new Map<string, string>();  // id -> SQL value string

    for (const r of batch) {
      const name = (r.name || '').trim();
      let igHandle = (r.ig_handle || '').trim();
      if (!igHandle || igHandle === 'N/A') igHandle = '';

      // Skip rows with absolutely no data
      if (!name && !igHandle) {
        const addr = (r.address || '').trim();
        if (!addr || addr === 'N/A') { skipped++; continue; }
      }

      const shopName = name
        ? name
        : igHandle
          ? igHandle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          : `Studio in ${(r.city || 'Unknown').replace(/,.*$/, '').trim()}`;

      const id = name
        ? `${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${(r.address || '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${(r.phone || '').replace(/\D/g, '')}`.slice(0, 120)
        : igHandle
          ? `ig_${igHandle}`
          : `addr_${(r.address || '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`.slice(0, 120);

      const igUrl = igHandle ? `https://www.instagram.com/${igHandle}` : null;
      const address = (r.address || '').trim() || null;
      const phone = (r.phone || '').replace(/\D/g, '') || null;
      const city = (r.city || '').trim() || null;
      const website = (r.website || '').trim() || null;
      const email = (r.email || '').trim() || null;
      const rating = parseFloat(r.rating) || 0;
      const reviews = parseInt(r.reviews) || 0;
      const username = (name || igHandle || 'shop').replace(/\s+/g, '_').toLowerCase().slice(0, 60);
      const now = new Date().toISOString();

      dedup.set(id, `(${fmt(id)}, ${fmt(id)}, ${fmt(username)}, ${fmt(shopName)}, ${fmt(shopName)}, 'outreach', ${rating}, ${reviews}, ${fmt(address)}, ${fmt(phone)}, ${fmt(website)}, ${fmt(igUrl)}, ${fmt(email)}, ${fmt(city)}, 'csv_import', 'tattoo_shop', ${fmt(state)}, ${fmt(now)})`);
    }

    if (dedup.size === 0) continue;
    const insertValues = [...dedup.values()];

    await sql.query(`
      INSERT INTO artists (id, uid, username, full_name, shop_name, stage, rating, reviews, address, phone, website, ig_handle, email, city, source_type, entity_type, import_region, last_updated)
      VALUES ${insertValues.join(',\n')}
      ON CONFLICT (id) DO UPDATE SET
        shop_name = COALESCE(NULLIF(EXCLUDED.shop_name, ''), artists.shop_name),
        ig_handle = COALESCE(NULLIF(EXCLUDED.ig_handle, ''), artists.ig_handle),
        address = COALESCE(NULLIF(EXCLUDED.address, ''), artists.address),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), artists.phone),
        city = COALESCE(NULLIF(EXCLUDED.city, ''), artists.city),
        last_updated = NOW()
    `);
    inserted += insertValues.length;
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${insertValues.length} upserted (total ${inserted})`);
  }

  console.log(`\nDone! ${state}: ${inserted} inserted, ${skipped} skipped`);
}

main().catch(e => console.error('Error:', e));
