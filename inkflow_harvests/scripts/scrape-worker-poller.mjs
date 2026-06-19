// VPS Scrape Worker Poller
// Polls Worker API for pending scrape tasks and processes them
// Run: node scripts/scrape-worker-poller.mjs
// Requires: Python 3 + Playwright + Chrome on this machine

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const WORKER_API = 'https://harvests-cloud-api.inkflowapp.workers.dev';
const POLL_TOKEN = 'vps-bot-secret-2024';
const POLL_INTERVAL_MS = 30_000; // 30s

// Paths — adjust if your VPS layout differs
const SCRAPER_SCRIPT = process.env.SCRAPER_PATH || '../harvests-engine/scripts/python_scraper.py';
const OUTPUT_DIR = process.env.SCRAPER_OUTPUT_DIR || './data/scrape_output';
const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';

let running = true;

async function runScraper(keyword, city, country, taskId) {
  const state = guessState(city, country);
  const cmd = [
    'python', SCRAPER_SCRIPT,
    `--keyword="${keyword}"`,
    `--cities="${city}"`,
    `--state=${state}`,
    `--country="${country}"`,
    `--cdp-url=${CDP_URL}`,
    `--task-id=${taskId}`,
    `--output-dir=${OUTPUT_DIR}`,
    '--headless=false',
  ].join(' ');

  console.log(`  → Running: ${cmd}`);
  const start = Date.now();

  try {
    const stdout = execSync(cmd, { timeout: 600_000, maxBuffer: 10 * 1024 * 1024 }); // 10min timeout
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  → Scraper done in ${elapsed}s`);

    // Try to extract result summary from stdout
    const lines = stdout.toString().split('\n').filter(l => l.includes('✅') || l.includes('saved') || l.includes('found'));
    return { ok: true, elapsed, summary: lines.join(' | ') };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = err.stderr?.toString()?.slice(0, 500) || err.message;
    console.error(`  → Scraper failed after ${elapsed}s:`, msg);
    return { ok: false, elapsed, error: msg };
  }
}

function guessState(city, country) {
  // Simple state guesser — extend as needed
  const map = {
    'oregon': 'OR', 'OR': 'OR', 'Oregon': 'OR',
    'california': 'CA', 'CA': 'CA',
    'washington': 'WA', 'WA': 'WA',
    'nevada': 'NV', 'NV': 'NV',
    'arizona': 'AZ', 'AZ': 'AZ',
    'texas': 'TX', 'TX': 'TX',
    'new york': 'NY', 'NY': 'NY',
    'florida': 'FL', 'FL': 'FL',
  };
  return map[country] || map[state] || 'OR'; // default OR for tattoo shops
}

async function poll() {
  while (running) {
    try {
      const r = await fetch(`${WORKER_API}/api/scrape/pending?token=${POLL_TOKEN}`);
      const data = await r.json();
      if (!data.ok || !data.items?.length) {
        console.log(`[${new Date().toISOString()}] No pending tasks. Waiting ${POLL_INTERVAL_MS/1000}s...`);
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      for (const task of data.items) {
        console.log(`[${new Date().toISOString()}] Processing task #${task.id}: ${task.keyword} in ${task.city}, ${task.country}`);

        // Mark as running
        await fetch(`${WORKER_API}/api/scrape/update-status?token=${POLL_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: task.id, status: 'running' }),
        });

        try {
          // Run real scraper
          const result = await runScraper(task.keyword, task.city, task.country, task.id);

          if (result.ok) {
            await fetch(`${WORKER_API}/api/scrape/update-status?token=${POLL_TOKEN}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: task.id, status: 'completed',
                result: JSON.stringify(result),
              }),
            });
            console.log(`  ✅ Task #${task.id} completed (${result.elapsed}s)`);
          } else {
            throw new Error(result.error);
          }
        } catch (err) {
          console.error(`  ❌ Task #${task.id} failed:`, err.message?.slice(0, 200));
          await fetch(`${WORKER_API}/api/scrape/update-status?token=${POLL_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: task.id, status: 'failed', result: JSON.stringify({ error: err.message }) }),
          });
        }
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Poll error:`, err.message);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

process.on('SIGINT', () => { running = false; console.log('\nShutting down...'); process.exit(); });
console.log(`🔍 Scrape Worker Poller started (interval: ${POLL_INTERVAL_MS/1000}s)`);
console.log(`   Scraper: ${SCRAPER_SCRIPT}`);
console.log(`   CDP: ${CDP_URL}`);
poll();
