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

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
    else { current += c; }
  }
  fields.push(current.trim());
  return fields.map(f => f.replace(/^"|"$/g, '').trim());
}

function readCsv(path: string): string[] {
  let csv = fs.readFileSync(path, 'utf-8');
  if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);
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

function processCsv(path: string, state: string) {
  const rows = readCsv(path);
  if (rows.length < 2) return [];
  const header = parseCsvLine(rows[0]);
  const regionSuffix = state === 'UT' ? '_ut' : '_az';

  const result: { id: string; values: string }[] = [];

  for (const line of rows.slice(1)) {
    const vals = parseCsvLine(line);
    while (vals.length < header.length) vals.push('');
    const r: any = {};
    header.forEach((h, i) => r[h.trim()] = (vals[i] || '').trim());

    const name = (r.name || '').trim();
    let igHandle = (r.ig_handle || '').trim();
    if (!igHandle || igHandle === 'N/A' || igHandle.startsWith('http')) igHandle = '';

    if (!name && !igHandle) {
      const addr = (r.address || '').trim();
      if (!addr || addr === 'N/A') continue;
    }

    const shopName = name
      ? name
      : igHandle
        ? igHandle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : `Studio in ${(r.city || 'Unknown').replace(/,.*$/, '').trim()}`;

    const idBase = name
      ? `${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${(r.address || '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${(r.phone || '').replace(/\D/g, '')}`
      : igHandle
        ? `ig_${igHandle}`
        : `addr_${(r.address || '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

    const id = `${idBase}${regionSuffix}`.slice(0, 120);

    let address = (r.address || '').trim();
    address = address === 'N/A' ? '' : address;
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

    result.push({
      id,
      values: `(${fmt(id)}, ${fmt(id)}, ${fmt(username)}, ${fmt(shopName)}, ${fmt(shopName)}, 'outreach', ${fmt(rating)}, ${fmt(reviews)}, ${fmt(address || null)}, ${fmt(phone)}, ${fmt(website || null)}, ${fmt(igHandle || null)}, ${fmt(email || null)}, ${fmt(city || null)}, 'csv_import', 'tattoo_shop', ${fmt(state)}, ${fmt(now)})`
    });
  }

  return result;
}

async function main() {
  // Process both CSVs
  const azRows = processCsv('D:/MyCrawler_System/Data/Raw_Leads/AZ_Raw_formatted.csv', 'AZ');
  const utRows = processCsv('D:/MyCrawler_System/Data/Raw_Leads/UT_Raw_formatted.csv', 'UT');

  console.log(`AZ: ${azRows.length} rows, UT: ${utRows.length} rows`);

  // Wipe all existing data
  await sql`DELETE FROM artists`;
  console.log('Wiped existing data');

  // Insert in batches, interleaving AZ and UT to ensure uniqueness
  const allRows = [...azRows, ...utRows];
  let inserted = 0;
  const BATCH = 200;

  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const dedup = new Map<string, string>();
    for (const row of batch) {
      dedup.set(row.id, row.values);
    }
    const insertValues = [...dedup.values()];
    if (insertValues.length === 0) continue;

    await sql.query(`
      INSERT INTO artists (id, uid, username, full_name, shop_name, stage, rating, reviews, address, phone, website, ig_handle, email, city, source_type, entity_type, import_region, last_updated)
      VALUES ${insertValues.join(',\n')}
      ON CONFLICT (id) DO UPDATE SET
        shop_name = COALESCE(NULLIF(EXCLUDED.shop_name, ''), artists.shop_name),
        ig_handle = COALESCE(NULLIF(EXCLUDED.ig_handle, ''), artists.ig_handle),
        reviews = GREATEST(EXCLUDED.reviews, artists.reviews),
        last_updated = NOW()
    `);
    inserted += insertValues.length;
    if (inserted % 500 === 0 || inserted === allRows.length) {
      console.log(`  ${inserted}/${allRows.length} inserted`);
    }
  }

  // Verify
  const count = await sql`SELECT COUNT(*) as c FROM artists`;
  const byRegion = await sql`SELECT import_region, COUNT(*) as c FROM artists GROUP BY import_region`;
  console.log(`\nTotal: ${count[0].c} | By region: ${JSON.stringify(byRegion)}`);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
