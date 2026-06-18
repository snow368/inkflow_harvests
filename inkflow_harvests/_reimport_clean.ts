import { neon } from '@neondatabase/serverless';
import fs from 'fs';

// Load .env
const envRaw = fs.readFileSync('.env', 'utf-8');
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

const sql = neon(process.env.NEON_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL || '');

/** Parse a CSV line with proper quote handling */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  fields.push(current.trim());
  return fields.map(f => f.replace(/^"|"$/g, '').trim());
}

/** Read CSV and merge multi-line quoted fields into logical rows */
function readCsv(path: string): string[] {
  let csv = fs.readFileSync(path, 'utf-8');
  if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1); // strip BOM
  const physicalLines = csv.split(/\r?\n/);
  const rows: string[] = [];
  let current = '';
  let quoteCount = 0;
  for (const line of physicalLines) {
    current += (current ? '\n' : '') + line;
    for (const c of line) { if (c === '"') quoteCount++; }
    if (quoteCount % 2 === 0) {
      if (current.trim()) rows.push(current);
      current = '';
      quoteCount = 0;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

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

  const rows = readCsv(csvPath);
  if (rows.length < 2) { console.log('No data'); process.exit(0); }

  const header = parseCsvLine(rows[0]);
  console.log('Header:', header, 'count:', header.length);

  const rawRows = rows.slice(1).map(line => {
    const vals = parseCsvLine(line);
    // Pad or truncate to match header length
    while (vals.length < header.length) vals.push('');
    const row: any = {};
    header.forEach((h, i) => row[h.trim()] = (vals[i] || '').trim());
    return row;
  });

  // Stats
  const withName = rawRows.filter(r => r.name).length;
  const withIg = rawRows.filter(r => r.ig_handle && r.ig_handle !== 'N/A').length;
  const withRating = rawRows.filter(r => r.rating && parseFloat(r.rating) > 0).length;
  const withReviews = rawRows.filter(r => r.reviews && parseInt(r.reviews) > 0).length;
  console.log(`Parsed ${rawRows.length} rows — name:${withName} IG:${withIg} rating>0:${withRating} reviews>0:${withReviews}`);

  // Clear existing for this region
  await sql`DELETE FROM artists WHERE import_region = ${state}`;
  console.log(`Cleared existing ${state} artists`);

  // Insert in batches
  let inserted = 0;
  let skipped = 0;
  const BATCH = 200;

  for (let i = 0; i < rawRows.length; i += BATCH) {
    const batch = rawRows.slice(i, i + BATCH);
    const dedup = new Map<string, string>();

    for (const r of batch) {
      const name = (r.name || '').trim();
      let igHandle = (r.ig_handle || '').trim();
      if (!igHandle || igHandle === 'N/A' || igHandle.startsWith('http')) igHandle = '';

      if (!name && !igHandle) {
        const addr = (r.address || '').trim();
        if (!addr || addr === 'N/A') { skipped++; continue; }
      }

      const shopName = name
        ? name
        : igHandle
          ? igHandle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          : `Studio in ${(r.city || 'Unknown').replace(/,.*$/, '').trim()}`;

      const regionSuffix = state === 'UT' ? '_ut' : '_az';
      const id = name
        ? `${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${(r.address || '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${(r.phone || '').replace(/\D/g, '')}${regionSuffix}`.slice(0, 120)
        : igHandle
          ? `ig_${igHandle}${regionSuffix}`
          : `addr_${(r.address || '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}${regionSuffix}`.slice(0, 120);

      let address = (r.address || '').trim();
      address = address === 'N/A' ? '' : address;
      // Clean special chars from address (map pin icons etc)
      address = address.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

      const phone = (r.phone || '').replace(/\D/g, '') || null;
      let city = (r.city || '').trim();
      city = city === 'N/A' ? '' : city;
      let website = (r.website || '').trim();
      website = website === 'N/A' ? '' : website;
      const email = (r.email || '').trim();
      const rating = parseFloat(r.rating) || null;
      const reviews = parseInt(r.reviews) || 0;
      const username = (name || igHandle || 'shop').replace(/\s+/g, '_').toLowerCase().slice(0, 60);
      const now = new Date().toISOString();

      dedup.set(id, `(${fmt(id)}, ${fmt(id)}, ${fmt(username)}, ${fmt(shopName)}, ${fmt(shopName)}, 'outreach', ${fmt(rating)}, ${fmt(reviews)}, ${fmt(address || null)}, ${fmt(phone)}, ${fmt(website || null)}, ${fmt(igHandle || null)}, ${fmt(email || null)}, ${fmt(city || null)}, 'csv_import', 'tattoo_shop', ${fmt(state)}, ${fmt(now)})`);
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
        rating = COALESCE(EXCLUDED.rating, artists.rating),
        reviews = GREATEST(EXCLUDED.reviews, artists.reviews),
        last_updated = NOW()
    `);
    inserted += insertValues.length;
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${insertValues.length} upserted (total ${inserted})`);
  }

  console.log(`\nDone! ${state}: ${inserted} inserted, ${skipped} skipped`);
}

main().catch(e => console.error('Error:', e));
