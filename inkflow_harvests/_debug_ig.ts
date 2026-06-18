import { chromium } from 'playwright';

async function main() {
  console.log('=== Debug Chrome IG Session ===');

  // 1. Test with fresh browser (no profile)
  console.log('\n--- Fresh browser ---');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.instagram.com', { timeout: 15000, waitUntil: 'domcontentloaded' });
  console.log('URL:', page.url());

  // Try API from fresh browser
  const api1 = await page.evaluate(async () => {
    try {
      const r = await fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=inkmagazine', {
        headers: { 'X-IG-App-ID': '936619743392459' }
      });
      return { ok: r.ok, status: r.status, text: (await r.text()).slice(0, 200) };
    } catch(e: any) { return { error: e.message }; }
  }).catch(e => ({ error: e.message }));
  console.log('Fresh API:', JSON.stringify(api1).slice(0, 300));
  await browser.close();

  // 2. Test with bot outreach profile
  console.log('\n--- Bot outreach profile ---');
  const ctx = await chromium.launchPersistentContext(
    'F:/inkflow/bot_profiles/bot_outreach_01_chrome_data',
    { headless: true, args: ['--no-sandbox'] }
  );
  const pages = ctx.pages();
  const p = pages.length > 0 ? pages[0] : await ctx.newPage();
  await p.goto('https://www.instagram.com', { timeout: 15000, waitUntil: 'domcontentloaded' });
  console.log('Profile URL:', p.url());

  // Check cookies
  const cookies = await ctx.cookies();
  const igCookies = cookies.filter((c: any) => c.domain.includes('instagram'));
  console.log('IG cookies:', igCookies.length, igCookies.map((c: any) => c.name).join(', '));

  // Try API from profile
  const api2 = await p.evaluate(async () => {
    try {
      const r = await fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=inkmagazine', {
        credentials: 'include',
        headers: { 'X-IG-App-ID': '936619743392459', 'X-Requested-With': 'XMLHttpRequest' }
      });
      return { ok: r.ok, status: r.status, text: (await r.text()).slice(0, 300) };
    } catch(e: any) { return { error: e.message }; }
  }).catch(e => ({ error: e.message }));
  console.log('Profile API:', JSON.stringify(api2).slice(0, 400));

  await ctx.close();
  console.log('\n=== Done ===');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
