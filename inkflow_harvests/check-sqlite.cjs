const Database = require('better-sqlite3');
const db = new Database('data/deep_scan_tasks.db');
const rows = db.prepare("SELECT id, bot_id, artist_handle, mode FROM bot_observations ORDER BY id DESC LIMIT 10").all();
console.log(JSON.stringify(rows, null, 2));
// 统计非空 artist_handle 的数量
const nonEmpty = db.prepare("SELECT COUNT(*) as c FROM bot_observations WHERE artist_handle IS NOT NULL AND artist_handle != ''").get();
console.log('非空 artist_handle:', nonEmpty.c);
console.log('总数:', db.prepare("SELECT COUNT(*) as c FROM bot_observations").get().c);
