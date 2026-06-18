import { neon } from '@neondatabase/serverless';
import { chromium } from 'playwright';
import fs from 'fs';

// .env
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
const IG_BASE = 'https://www.instagram.com';

interface IgProfile {
  handle: string;
  fullName: string;
  biography: string;
  followers: number;
  following: number;
  profilePic: string;
  isPrivate: boolean;
  isVerified: boolean;
}

async function fetchIgProfile(page: any, handle: string): Promise<IgProfile | null> {
  try {
    const apiUrl = `${IG_BASE}/api/v1/users/web_profile_info/?username=${handle}`;
    const data = await page.evaluate(async (url: string) => {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'X-IG-App-ID': '936619743392459', 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (!res.ok) return null;
      return await res.json();
    }, apiUrl);
    if (!data?.data?.user) return null;
    const u = data.data.user;
    return {
      handle,
      fullName: u.full_name || '',
      biography: u.biography || '',
      followers: u.edge_followed_by?.count || u.follower_count || 0,
      following: u.edge_follow?.count || u.following_count || 0,
      profilePic: u.profile_pic_url_hd || u.profile_pic_url || '',
      isPrivate: u.is_private || false,
      isVerified: u.is_verified || false,
    };
  } catch { return null; }
}

async function main() {
  // Get artists needing enrichment, prioritized by conversion_score
  const artists = await sql`
    SELECT id, ig_handle, shop_name, import_region, reviews, conversion_score
    FROM artists
    WHERE ig_handle IS NOT NULL AND ig_handle != ''
      AND ig_handle NOT LIKE '%.com%'
      AND ig_handle NOT LIKE '%.net%'
      AND (followers IS NULL OR followers = 0)
    ORDER BY conversion_score DESC, reviews DESC
  `;
  console.log(`Found ${artists.length} artists needing enrichment`);

  if (artists.length === 0) { console.log('All done!'); process.exit(0); }

  // Launch Chrome with existing IG login session
  console.log('Launching Chrome (headless)...');
  const profileDir = 'F:/inkflow/bot_profiles/bot_outreach_01_chrome_data';
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await context.newPage();
  console.log('Navigating to Instagram...');
  await page.goto('https://www.instagram.com', { timeout: 15000, waitUntil: 'domcontentloaded' });
  console.log('URL after navigate:', page.url());

  let enriched = 0;
  let failed = 0;
  let skipped = 0;
  const start = Date.now();

  const DELAY_MS = 2500; // 2.5s between requests to avoid rate limiting
  const MAX_BATCH = 900; // max per run

  for (let i = 0; i < Math.min(artists.length, MAX_BATCH); i++) {
    const artist = artists[i];
    const profile = await fetchIgProfile(page, artist.ig_handle);

    if (!profile) { failed++; }
    else if (profile.isPrivate) { skipped++; }
    else {
      await sql`
        UPDATE artists SET
          full_name = COALESCE(NULLIF(${profile.fullName}, ''), full_name),
          followers = ${profile.followers},
          following = ${profile.following},
          profile_pic = ${profile.profilePic},
          last_updated = NOW()
        WHERE id = ${artist.id}
      `;
      enriched++;
    }

    if ((i + 1) % 10 === 0 || i === Math.min(artists.length, MAX_BATCH) - 1) {
      const pct = Math.round((i + 1) * 100 / Math.min(artists.length, MAX_BATCH));
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`  [${pct}%] ${i + 1}/${Math.min(artists.length, MAX_BATCH)} — ${enriched} enriched, ${failed} failed, ${skipped} private (${elapsed}s)`);
    }

    // Delay between requests
    if (i < Math.min(artists.length, MAX_BATCH) - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  await context.close();
  console.log(`\nDone! ${enriched} enriched, ${failed} not found, ${skipped} private`);
  process.exit(0);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
