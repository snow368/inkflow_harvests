import { neon } from '@neondatabase/serverless';
import fs from 'fs';

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
const CSV_PATH = 'ig_handles_results.csv';

if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, 'id,shop_name,city,ig_handle,source,status,searched_at\n', 'utf-8');
}

// === deep scan worker helpers ===
const SOCIAL_HOSTS = { instagram: ['instagram.com'] };
const IG_REGEX = /instagram\.com\/(?:[a-zA-Z]{2,}\/)?([a-zA-Z0-9_.]+)/gi;

function ensureHttp(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.includes('.')) return `https://${t}`;
  return null;
}

function normalizeUrl(raw: string): string {
  try { const u = new URL(raw); u.hash = ''; u.search = ''; return u.toString().replace(/\/+$/, ''); }
  catch { return raw.trim(); }
}

function findSocialLinks(text: string): string[] {
  if (!text) return [];
  const urls = Array.from(new Set((text.match(/https?:\/\/[^\s"'<>]+/gi) || []).map(normalizeUrl)));
  return urls.filter(u => SOCIAL_HOSTS.instagram.some(h => u.toLowerCase().includes(h)));
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' }
    });
    if (!resp.ok) return '';
    return await resp.text();
  } catch {
    try {
      const { execSync } = require('child_process');
      return execSync(`curl -s --max-time ${Math.ceil(timeoutMs / 1000)} -A "Mozilla/5.0 Chrome/124.0.0.0" "${url.replace(/"/g,'\\"')}"`, { timeout: timeoutMs + 2000, encoding: 'utf-8' });
    } catch { return ''; }
  }
}

function extractHandle(igUrl: string): string | null {
  IG_REGEX.lastIndex = 0;
  const m = IG_REGEX.exec(igUrl);
  if (!m) return null;
  const h = m[1].replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase();
  if (h && h.length >= 2 && h.length <= 30 && !h.includes('.')) return h;
  return null;
}

const SKIP = new Set([
  'instagram', 'meta', 'facebook', 'threads', 'gmail', 'outlook',
  'yahoo', 'hotmail', 'accounts', 'share', 'about', 'help', 'legal',
  'security', 'developer', 'blog', 'creators', 'business', 'shop',
  'settings', 'login', 'home', 'explore', 'discover', 'signup'
]);

function buildQueries(shopName: string, city: string): string[] {
  const base = [shopName, city].filter(Boolean).join(' ');
  return [
    `${base} instagram`,
    `${base} site:instagram.com`,
    `${shopName} instagram`,
    `${shopName} tattoo instagram`,
  ].filter(Boolean);
}

async function searchIg(shopName: string, city: string, website?: string): Promise<{ handle: string | null; source: string }> {
  // 1. Check website first
  const siteUrl = ensureHttp(website);
  if (siteUrl) {
    const html = await fetchText(siteUrl);
    for (const link of findSocialLinks(html)) {
      const h = extractHandle(link);
      if (h && !SKIP.has(h)) return { handle: h, source: 'website' };
    }
  }

  // 2. Search DuckDuckGo / Bing / Google
  const queries = buildQueries(shopName, city);
  const engines = [
    (q: string) => `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  ];

  for (const q of queries) {
    for (const makeUrl of engines) {
      const html = await fetchText(makeUrl(q), 8000);
      if (!html) continue;
      for (const link of findSocialLinks(html)) {
        const h = extractHandle(link);
        if (h && !SKIP.has(h)) return { handle: h, source: 'search' };
      }
    }
  }
  return { handle: null, source: 'none' };
}

async function main() {
  const artists = await sql`
    SELECT id, shop_name, city, website
    FROM artists
    WHERE (ig_handle IS NULL OR ig_handle = '' OR ig_handle = 'N/A')
      AND source_type IN ('maps_scrape', 'csv_import')
    ORDER BY last_updated DESC NULLS LAST
  `;
  console.log(`Found ${artists.length} artists without IG handle`);
  if (artists.length === 0) { console.log('All done!'); process.exit(0); }

  // Resume from CSV
  const csvLines = fs.readFileSync(CSV_PATH, 'utf-8').trim().split('\n');
  const searchedIds = new Set<string>();
  for (let i = 1; i < csvLines.length; i++) {
    searchedIds.add(csvLines[i].split(',')[0]);
  }
  const remaining = artists.filter(a => !searchedIds.has(String(a.id)));
  console.log(`Already searched: ${searchedIds.size}`);
  console.log(`Remaining: ${remaining.length}`);
  if (remaining.length === 0) { console.log('All done!'); process.exit(0); }

  let found = 0;
  let failed = 0;
  const start = Date.now();
  const DELAY_MS = 1200;

  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i];
    const shopName = String(a.shop_name || '').trim();
    const city = String(a.city || '').trim();
    const website = a.website ? String(a.website).trim() : undefined;
    if (!shopName) { failed++; continue; }

    let igHandle = '';
    let src = '';
    let status = 'failed';

    try {
      const result = await searchIg(shopName, city, website);
      if (result.handle) {
        igHandle = result.handle;
        src = result.source;
        status = 'found';
        await sql`
          UPDATE artists SET ig_handle = ${igHandle}, last_updated = NOW()
          WHERE id = ${a.id}
        `;
        found++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    fs.appendFileSync(CSV_PATH, `${a.id},${shopName.replace(/,/g,' ')},${city.replace(/,/g,' ')},${igHandle},${src},${status},${new Date().toISOString()}\n`, 'utf-8');

    if ((i + 1) % 50 === 0 || i === remaining.length - 1) {
      const pct = Math.round((i + 1) * 100 / remaining.length);
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`  [${pct}%] ${i + 1}/${remaining.length} — found ${found}, failed ${failed} (${elapsed}s)`);
    }

    if (i < remaining.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone! Found: ${found}, Failed: ${failed} (${((Date.now()-start)/1000).toFixed(0)}s)`);
  process.exit(0);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
