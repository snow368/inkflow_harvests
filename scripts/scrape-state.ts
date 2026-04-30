import { chromium } from 'playwright';
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sql = neon(process.env.NEON_DATABASE_URL!);
const UID = '6L5jF9zmRvcnyS9SRb559SnasxF3';

const stateCode = process.argv[2]?.toUpperCase();
if (!stateCode) {
  console.error('用法: npx tsx scripts/scrape-state.ts <州代码> [城市文件路径]');
  process.exit(1);
}

let cities: string[];
const customCityFile = process.argv[3];
if (customCityFile && fs.existsSync(customCityFile)) {
  cities = fs.readFileSync(customCityFile, 'utf-8')
    .split('\n')
    .map(c => c.trim())
    .filter(Boolean);
  console.log(`📋 使用自定义城市列表: ${customCityFile}，共 ${cities.length} 个城市`);
} else {
  // 动态导入 us-cities-utils 获取城市
  const { getCities } = await import('@mardillu/us-cities-utils');
  cities = (getCities(stateCode) as any[]).map(c => c.name);
  console.log(`📋 自动生成 ${stateCode} 城市列表，共 ${cities.length} 个城市`);
}

function clean(val: any): string {
  if (typeof val !== 'string') return String(val ?? '');
  return val.replace(/\uFFFD/g, '').trim();
}

function generateStableId(name: string, city: string, phone: string, address: string, website: string): string {
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const safeCity = city.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const suffix = phone || (website && website !== 'N/A' ? website.split('//')[1]?.replace(/[^a-zA-Z0-9]/g, '') : '') || address.replace(/[^a-z0-9]/g, '').slice(0, 20);
  return `maps_${safeName}_${safeCity}_${suffix}`.replace(/\//g, '_').replace(/N\/A/gi, 'NA');
}

async function main() {
  const browser = await chromium.launch({ 
  channel: 'chrome', 
  headless: true 
});
  const page = await browser.newPage();
  let totalSaved = 0;

  for (const city of cities) {
    const searchQuery = `Tattoo Shops in ${city}`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}?hl=en`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(7000);

    const shopLinks = await page.$$eval('a[href*="/maps/place/"]', links =>
      [...new Set(links.map(a => (a as HTMLAnchorElement).href))]
    );

    for (const url of shopLinks) {
      try {
        await page.goto(url, { waitUntil: 'commit', timeout: 50000 });
        await page.waitForSelector('h1.DUwDvf', { timeout: 15000 });

        const name = await page.$eval('h1.DUwDvf', el => el.textContent?.trim() || '');
        const address = await page.$eval('button[data-item-id="address"]', el => el.textContent?.trim() || '').catch(() => 'N/A');
        const phone = await page.$eval('button[data-item-id^="phone:tel:"]', el => el.textContent?.trim() || '').catch(() => 'N/A');
        const website = await page.$eval('a[data-item-id="authority"]', el => (el as HTMLAnchorElement).href).catch(() => 'N/A');
        const rating = await page.$eval('span[aria-label*="review"]', el => {
          const aria = (el as HTMLSpanElement).getAttribute('aria-label') || '';
          const match = aria.match(/[\d,]+/);
          return match ? match[0].replace(',', '') : '0';
        }).catch(() => '0');

        const id = generateStableId(name, city, phone, address, website);

        await sql`
          INSERT INTO artists (id, uid, username, full_name, shop_name, stage, reviews, address, phone, website, city, source_type, entity_type, import_region, last_updated)
          VALUES (${id}, ${UID}, ${name.replace(/\s/g, '_').toLowerCase()}, ${name}, ${name}, 'outreach', ${parseInt(rating) || 0}, ${address}, ${phone}, ${website}, ${city}, 'maps_scrape', 'tattoo_shop', ${stateCode}, NOW())
          ON CONFLICT (id) DO NOTHING
        `;
        totalSaved++;
        console.log(`✅ 已保存: ${name} (${city})`);
      } catch (e: any) {
        console.warn(`❌ 失败: ${url} - ${e.message}`);
      }
    }
  }

  await browser.close();
  console.log(`🎉 抓取完成！共新入库 ${totalSaved} 家店铺`);
  process.exit(0);
}

main().catch(console.error);