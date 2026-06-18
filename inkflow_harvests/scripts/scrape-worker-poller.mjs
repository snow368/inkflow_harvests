// VPS Scrape Worker Poller
// Polls Worker API for pending scrape tasks and processes them
// Run: node scripts/scrape-worker-poller.mjs

const WORKER_API = 'https://harvests-cloud-api.inkflowapp.workers.dev';
const POLL_TOKEN = 'vps-bot-secret-2024';
const POLL_INTERVAL_MS = 30_000; // 30s

let running = true;

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
          // TODO: Run actual scraper here
          // Example:
          // const results = await runScraper(task.keyword, task.city, task.country);

          // For now, simulate work
          console.log(`  → Simulating scrape for "${task.keyword}" in ${task.city}...`);
          await sleep(5000); // Replace with actual scraping

          // Mark as completed
          await fetch(`${WORKER_API}/api/scrape/update-status?token=${POLL_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: task.id, status: 'completed', result: '{}' }),
          });
          console.log(`  ✅ Task #${task.id} completed`);
        } catch (err) {
          console.error(`  ❌ Task #${task.id} failed:`, err.message);
          await fetch(`${WORKER_API}/api/scrape/update-status?token=${POLL_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: task.id, status: 'failed' }),
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
poll();
