// 一键同步 VPS SQLite 任务数据到 Cloudflare D1
// 用法: cd C:\harvests\inkflow_harvests && node sync-d1.js

const Database = require('better-sqlite3');
const db = new Database('data/deep_scan_tasks.db');

const rows = db.prepare('SELECT id, payload, status, created_at, updated_at FROM automation_tasks').all();
console.log('VPS 任务数:', rows.length);

fetch('https://harvests-api.inkflowapp.workers.dev/api/automation/task-list/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer vps-bot-secret-2024'
  },
  body: JSON.stringify({ tasks: rows })
}).then(r => r.json()).then(data => {
  console.log('同步结果:', JSON.stringify(data, null, 2));
}).catch(e => {
  console.error('同步失败:', e.message);
});
