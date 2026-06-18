/**
 * _search_maps.ts — 全信息店铺搜索引擎
 *
 * 每个店铺一次性抓取: IG / TikTok / Facebook / Email / Phone / Website
 * 不再分多次跑。慢但全面，一次搞定。
 *
 * 用法:
 *   1. 打开 Chrome 远程调试: chrome.exe --remote-debugging-port=9222
 *   2. npx tsx _search_maps.ts
 */

import { neon } from '@neondatabase/serverless';
import { chromium } from 'playwright';
import fs from 'fs';

const envRaw = fs.readFileSync('.env', 'utf-8');
for (const line of envRaw.split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) {
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

const sql = neon(process.env.NEON_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL || '');
const CSV_PATH = 'shop_full_info.csv';

// ============================================================
// 通用工具
// ============================================================
const SKIP_HANDLES = new Set([
  'instagram','meta','facebook','threads','gmail','outlook','yahoo','hotmail',
  'accounts','share','about','help','login','home','explore','signup','settings',
  'legal','security','developer','blog','creators','business','shop',
  'wix','squarespace','wordpress','godaddy','shopify',
  'locations','reels','discover','people','profilecard','profile',
  'tiktok','twitter','x','youtube','pinterest','snapchat','linkedin',
]);

const IG_SKIP_PATHS = ['/reels/', '/p/', '/reel/', '/explore/', '/accounts/', '/discover/',
  '/stories/', '/developer/', '/about/', '/legal/', '/privacy/', '/help/',
  '/meta/', '/ads/', '/business/', '/creator/', '/tv/', '/music/', '/profilecard/'];

const FB_SKIP_PATHS = ['/sharer/', '/plugins/', '/login/', '/privacy/', '/policies/', '/help/',
  '/share/', '/intent/', '/profile.php', '/groups/', '/pages/create/', '/photos/', '/reviews/'];

const TK_SKIP_PATHS = ['/search/', '/explore/', '/business/', '/about/', '/ad/', '/viral/'];

const TEMPLATE_DOMAINS = ['wixsite.com', 'squarespace.com', 'myshopify.com', 'wordpress.com'];

function normalizeUrl(raw: string): string {
  try { const u = new URL(raw); u.hash = ''; u.search = ''; return u.toString().replace(/\/+$/, ''); }
  catch { return raw.trim(); }
}

function isValidHandle(handle: string): boolean {
  if (!handle || handle.length < 2 || handle.length > 30) return false;
  const lower = handle.toLowerCase();
  if (SKIP_HANDLES.has(lower)) return false;
  if (/^[0-9._-]+$/.test(lower)) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(lower);
}

// ============================================================
// Social link extraction（一次性找 IG/TikTok/FB）
// ============================================================
function extractInstagramHandle(url: string): string | null {
  const m = /instagram\.com\/(?:[a-zA-Z]{2,}\/)?([a-zA-Z0-9_.-]+)/i.exec(url);
  if (!m) return null;
  const lower = url.toLowerCase();
  if (IG_SKIP_PATHS.some(p => lower.includes(p))) return null;
  const h = m[1].replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase();
  return isValidHandle(h) ? h : null;
}

function extractTikTokHandle(url: string): string | null {
  const m = /tiktok\.com\/@?([a-zA-Z0-9_.-]+)/i.exec(url);
  if (!m) return null;
  const lower = url.toLowerCase();
  if (TK_SKIP_PATHS.some(p => lower.includes(p))) return null;
  const h = m[1].replace(/^@/, '').replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase();
  return isValidHandle(h) ? h : null
}

function extractFacebookHandle(url: string): string | null {
  const lower = url.toLowerCase();
  if (FB_SKIP_PATHS.some(p => lower.includes(p))) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const handle = parts[0];
    if (!handle || handle === 'profile.php' || SKIP_HANDLES.has(handle.toLowerCase())) return null;
    if (/^\d+$/.test(handle)) return null;
    if (handle.length < 3) return null;
    if (/^[a-z]+$/.test(handle) && handle.length > 15) return null;
    return handle;
  } catch { return null; }
}

function extractEmail(text: string): string | null {
  const m = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(text);
  if (!m) return null;
  const email = m[0].toLowerCase().trim();
  // Skip generic/no-reply emails
  if (/^(noreply|no-reply|donotreply|admin|webmaster|info|contact|hello|support)@/i.test(email)) return null;
  if (/@(example|test|localhost)\./.test(email)) return null;
  return email;
}

function extractPhone(text: string): string | null {
  // US phone formats: (123) 456-7890, 123-456-7890, +1 123 456 7890
  const m = /(?:\+1\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g.exec(text);
  if (!m) return null;
  return m[0].trim();
}

function findAllSocialLinks(text: string) {
  const urls = Array.from(new Set((text.match(/https?:\/\/[^\s"'<>]+/gi) || []).map(normalizeUrl)));
  const result = { instagram: '', tiktok: '', facebook: '' };
  for (const url of urls) {
    if (!result.instagram && /instagram\.com/i.test(url)) {
      const h = extractInstagramHandle(url);
      if (h) result.instagram = h;
    }
    if (!result.tiktok && /tiktok\.com/i.test(url)) {
      const h = extractTikTokHandle(url);
      if (h) result.tiktok = h;
    }
    if (!result.facebook && /facebook\.com/i.test(url)) {
      const h = extractFacebookHandle(url);
      if (h) result.facebook = h;
    }
    if (result.instagram && result.tiktok && result.facebook) break;
  }
  return result;
}

// ============================================================
// Pass 1: Google search — IG / TikTok / FB / Phone / Website
// ============================================================
async function googleSearch(context: any, shopName: string, city: string, address?: string) {
  const queries = [
    ...(address ? [`${address} ${city} tattoo shop`] : []),
    `${shopName} ${city} tattoo shop`,
    `${shopName} Instagram`,
  ].filter(Boolean);

  const page = await context.newPage();
  const result = { instagram: '', tiktok: '', facebook: '', phone: '', website: '' };
  try {
    for (const q of queries) {
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en`, {
        timeout: 25000, waitUntil: 'domcontentloaded',
      });
      await new Promise(r => setTimeout(r, 10000 + Math.random() * 10000));

      const html = await page.content();

      // Social links from search results
      const social = findAllSocialLinks(html);
      if (social.instagram && !result.instagram) result.instagram = social.instagram;
      if (social.tiktok && !result.tiktok) result.tiktok = social.tiktok;
      if (social.facebook && !result.facebook) result.facebook = social.facebook;

      // Phone from knowledge panel (Google Maps sidebar)
      if (!result.phone) {
        const phoneEl = page.locator('a[href^="tel:"]').first();
        const tel = await phoneEl.getAttribute('href').catch(() => null);
        if (tel) result.phone = tel.replace('tel:', '').trim();
      }

      // Website from organic results or knowledge panel
      if (!result.website) {
        const allAnchors = await page.locator('a[href]').all();
        for (const a of allAnchors) {
          const href = await a.getAttribute('href').catch(() => null);
          if (!href) continue;
          const lower = href.toLowerCase();
          if (/^(https?:\/\/)/.test(href) && !/(google|instagram|facebook|tiktok|youtube|twitter)\.com/.test(lower)) {
            if (!result.website) result.website = normalizeUrl(href);
          }
        }
      }

      // Email from search snippet
      if (!result.email) {
        const email = extractEmail(html);
        if (email) result.email = email;
      }

      if (result.instagram) break; // Found the main target, stop
    }
  } finally { await page.close().catch(() => {}); }
  return result;
}

// ============================================================
// Pass 2: Website probe — visit shop website for deeper info
// ============================================================
async function websiteProbe(context: any, website: string): Promise<{
  instagram: string; tiktok: string; facebook: string; email: string; phone: string;
}> {
  const result = { instagram: '', tiktok: '', facebook: '', email: '', phone: '' };
  if (!website || /google\.com/i.test(website)) return result;
  try {
    const domain = new URL(website).hostname.toLowerCase();
    if (TEMPLATE_DOMAINS.some(d => domain.includes(d))) return result;
  } catch { return result; }

  const page = await context.newPage();
  try {
    await page.goto(website, { timeout: 25000, waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));

    // Step 1: Visit homepage + check for social links, email, phone
    let html = await page.content();
    let social = findAllSocialLinks(html);
    if (social.instagram) result.instagram = social.instagram;
    if (social.tiktok) result.tiktok = social.tiktok;
    if (social.facebook) result.facebook = social.facebook;
    if (!result.email) result.email = extractEmail(html) || '';
    if (!result.phone) result.phone = extractPhone(html) || '';

    // Step 2: Click contact/about page if available
    const navLinks = await page.locator('a').all();
    for (const a of navLinks) {
      const text = await a.innerText().catch(() => '');
      if (/contact|about|info|reach|booking/i.test(text)) {
        const href = await a.getAttribute('href').catch(() => null);
        if (href) {
          try {
            const contactUrl = new URL(href, website).href;
            await page.goto(contactUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 2000));
            const ch = await page.content();
            const cs = findAllSocialLinks(ch);
            if (!result.instagram && cs.instagram) result.instagram = cs.instagram;
            if (!result.tiktok && cs.tiktok) result.tiktok = cs.tiktok;
            if (!result.facebook && cs.facebook) result.facebook = cs.facebook;
            if (!result.email) result.email = extractEmail(ch) || '';
            if (!result.phone) result.phone = extractPhone(ch) || '';
          } catch {}
        }
        break; // Only visit first contact/about page
      }
    }
  } finally { await page.close().catch(() => {}); }
  return result;
}

// ============================================================
// Ensures artists table has all needed columns
// ============================================================
async function ensureColumns() {
  for (const col of ['tiktok', 'phone', 'email', 'facebook']) {
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'artists' AND column_name = ${col}
        ) THEN
          EXECUTE 'ALTER TABLE artists ADD COLUMN ' || ${col} || ' TEXT';
        END IF;
      END $$;
    `.catch(() => {});
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  const STATE_FILTER = (process.env.STATE || '').trim().toUpperCase() || undefined;
  if (STATE_FILTER) console.log(`[setup] STATE filter: ${STATE_FILTER}`);

  // Ensure DB columns exist
  await ensureColumns();
  console.log('[setup] DB columns verified');

  // Load artists — include those with IG but missing other contact info
  const artists = await sql`
    SELECT id, shop_name, city, address, website, ig_handle
    FROM artists
    WHERE source_type IN ('maps_scrape', 'csv_import')
      ${STATE_FILTER ? sql`AND import_region = ${STATE_FILTER}` : sql``}
      AND shop_name !~* '^(studio|shop|salon|spa|parlor|barber)\\s+in\\s'
      AND LOWER(shop_name) NOT IN ('wix','squarespace','wordpress','godaddy','shopify','weebly','webnode','jimdo','strikingly','ucraft','duda','imcreator')
      AND (
        (ig_handle IS NULL OR ig_handle = '' OR ig_handle = 'N/A')
        OR (tiktok IS NULL AND facebook IS NULL AND email IS NULL AND phone IS NULL)
      )
    ORDER BY
      CASE WHEN ig_handle IS NULL OR ig_handle = '' OR ig_handle = 'N/A' THEN 0 ELSE 1 END,
      last_updated DESC NULLS LAST
  `;
  console.log(`Total artists without IG: ${artists.length}`);
  if (artists.length === 0) process.exit(0);

  // Resume from CSV
  const CSV_HEADER = 'id,shop_name,city,ig_handle,tiktok,facebook,email,phone,website,source,status,searched_at';
  const csvLines = fs.existsSync(CSV_PATH)
    ? fs.readFileSync(CSV_PATH, 'utf-8').trim().split('\n')
    : [CSV_HEADER];
  const searched = new Set<string>();
  for (let i = 1; i < csvLines.length; i++) searched.add(csvLines[i].split(',')[0]);
  const remaining = artists.filter(a => !searched.has(String(a.id)));
  console.log(`Remaining: ${remaining.length}/${artists.length}`);

  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, CSV_HEADER + '\n', 'utf-8');
  }

  console.log('Connecting Chrome CDP...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  let found = 0, failed = 0, start = Date.now();

  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i];
    const shop = String(a.shop_name || '').trim();
    const city = String(a.city || '').trim();
    const address = String(a.address || '').trim();
    const website = a.website ? String(a.website).trim() : '';
    if (!shop) { failed++; continue; }

    // Pre-fill IG if already in DB (skip expensive Google search, just probe website for extras)
    const hasExistingIg = a.ig_handle && String(a.ig_handle).trim() && !['N/A', ''].includes(String(a.ig_handle).trim());

    let ig = hasExistingIg ? String(a.ig_handle).trim() : '';
    let tk = '', fb = '', email = '', phone = '', site = '';
    let source = '';
    let status = 'failed';

    try {
      if (hasExistingIg) {
        // === Already has IG → probe website for missing fields only ===
        const targetSite = website || '';
        if (targetSite) {
          const webResult = await websiteProbe(context, targetSite);
          if (webResult.tiktok) tk = webResult.tiktok;
          if (webResult.facebook) fb = webResult.facebook;
          if (webResult.email) email = webResult.email;
          if (webResult.phone) phone = webResult.phone;
        }
        if (tk || fb || email || phone) status = 'supplement';
        else status = 'skipped';
      } else {
        // === Pass 1: Google search ===
        const googleResult = await googleSearch(context, shop, city, address);
        ig = googleResult.instagram || '';
        tk = googleResult.tiktok || '';
        fb = googleResult.facebook || '';
        phone = googleResult.phone || '';
        site = googleResult.website || '';
        if (ig) source = 'google';

        // === Pass 2: Website probe (only if we have a website or found one) ===
        const targetSite = website || site;
        if (!ig && targetSite) {
          const webResult = await websiteProbe(context, targetSite);
          if (webResult.instagram) { ig = webResult.instagram; if (!source) source = 'website'; }
          if (webResult.tiktok && !tk) tk = webResult.tiktok;
          if (webResult.facebook && !fb) fb = webResult.facebook;
          if (webResult.email && !email) email = webResult.email;
          if (webResult.phone && !phone) phone = webResult.phone;
        }
      }

      // === Save to DB ===
      if (status === 'skipped') {
        found++;
        console.log(`  SKIP: ${shop} → already has @${ig}, nothing new`);
      } else if (status === 'supplement') {
        await sql`
          UPDATE artists SET
            tiktok = COALESCE(NULLIF(${tk || ''}, ''), tiktok),
            facebook = COALESCE(NULLIF(${fb || ''}, ''), facebook),
            email = COALESCE(NULLIF(${email || ''}, ''), email),
            phone = COALESCE(NULLIF(${phone || ''}, ''), phone),
            last_updated = NOW()
          WHERE id = ${a.id}
        `;
        const parts = [tk ? '🎵'+tk : '', fb ? 'FB:'+fb : '', email ? '📧'+email : '', phone ? '📞'+phone : ''].filter(Boolean);
        console.log(`  EXTRA: ${shop} → ${parts.join(' ')}`);
      } else if (ig) {
        status = 'found';
        await sql`
          UPDATE artists SET
            ig_handle = ${ig},
            tiktok = COALESCE(NULLIF(${tk || ''}, ''), tiktok),
            facebook = COALESCE(NULLIF(${fb || ''}, ''), facebook),
            email = COALESCE(NULLIF(${email || ''}, ''), email),
            phone = COALESCE(NULLIF(${phone || ''}, ''), phone),
            last_updated = NOW()
          WHERE id = ${a.id}
        `;
        found++;
        console.log(`  FOUND: ${shop} → @${ig}${tk ? ' 🎵'+tk : ''}${fb ? ' FB:'+fb : ''}`);
      } else if (fb || tk) {
        status = 'partial';
        await sql`
          UPDATE artists SET
            tiktok = COALESCE(NULLIF(${tk || ''}, ''), tiktok),
            facebook = COALESCE(NULLIF(${fb || ''}, ''), facebook),
            email = COALESCE(NULLIF(${email || ''}, ''), email),
            phone = COALESCE(NULLIF(${phone || ''}, ''), phone),
            last_updated = NOW()
          WHERE id = ${a.id}
        `;
        found++;
        console.log(`  PARTIAL: ${shop} → ${tk ? '🎵'+tk : ''} ${fb ? 'FB:'+fb : ''}`);
      } else if (email || phone) {
        status = 'contact_only';
        await sql`
          UPDATE artists SET
            email = COALESCE(NULLIF(${email || ''}, ''), email),
            phone = COALESCE(NULLIF(${phone || ''}, ''), phone),
            last_updated = NOW()
          WHERE id = ${a.id}
        `;
        console.log(`  CONTACT: ${shop} → ${email ? '📧'+email : ''} ${phone ? '📞'+phone : ''}`);
      } else {
        failed++;
      }

      // Save website if found but missing
      if (site && !website) {
        await sql`UPDATE artists SET website = ${site}, last_updated = NOW() WHERE id = ${a.id}`.catch(() => {});
      }
    } catch (e: any) {
      failed++;
      console.log(`  ERROR: ${shop} → ${e.message?.slice(0, 100)}`);
    }

    // Always append to CSV
    const csvSafe = (s: string) => s.replace(/,/g, ' ').replace(/\n/g, ' ').trim();
    fs.appendFileSync(CSV_PATH,
      `${a.id},${csvSafe(shop)},${csvSafe(city)},${csvSafe(ig)},${csvSafe(tk)},${csvSafe(fb)},${csvSafe(email)},${csvSafe(phone)},${csvSafe(site)},${source},${status},${new Date().toISOString()}\n`,
      'utf-8'
    );

    // Progress
    if ((i + 1) % 5 === 0 || i === remaining.length - 1) {
      const p = Math.round((i + 1) * 100 / remaining.length);
      console.log(`  [${p}%] ${i+1}/${remaining.length} — found ${found}, failed ${failed} (${((Date.now()-start)/1000).toFixed(0)}s)`);
    }

    // Slow delay between shops (avoid Google captcha)
    if (i < remaining.length - 1) {
      await new Promise(r => setTimeout(r, 30000 + Math.random() * 30000));
    }
  }

  console.log(`\nDone! Found: ${found}, Failed: ${failed} (${((Date.now()-start)/1000).toFixed(0)}s)`);
  process.exit(0);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
