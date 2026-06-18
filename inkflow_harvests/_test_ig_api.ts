import { neon } from '@neondatabase/serverless';
import { chromium } from 'playwright';
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
const IG_BASE = 'https://www.instagram.com';

async function fetchIgProfile(page: any, handle: string): Promise<any> {
  try {
    const apiUrl = `${IG_BASE}/api/v1/users/web_profile_info/?username=${handle}`;
    const data = await page.evaluate(async (url: string) => {
      try {
        const res = await fetch(url, { headers: { 'X-IG-App-ID': '936619743392459' } });
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    }, apiUrl);
    if (!data?.data?.user) return null;
    const u = data.data.user;
    return {
      handle,
      fullName: u.full_name || '',
      followers: u.edge_followed_by?.count || u.follower_count || 0,
      following: u.edge_follow?.count || u.following_count || 0,
      profilePic: u.profile_pic_url_hd || u.profile_pic_url || '',
      isPrivate: u.is_private || false,
    };
  } catch { return null; }
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.instagram.com', { timeout: 15000 });

  // Test just 5 handles
  const testHandles = ['inkmagazine', 'tattoo', 'inkedmag', 'intatattoo', 'tattoolife'];
  for (const h of testHandles) {
    const profile = await fetchIgProfile(page, h);
    console.log(`${h}: ${profile ? profile.fullName + ' (' + profile.followers + ' followers)' : 'FAILED'}`);
  }

  await browser.close();
  console.log('TEST DONE');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
