-- D1 tables for automation dashboard sync
CREATE TABLE IF NOT EXISTS automation_tasks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_task_stats (
  day TEXT NOT NULL,
  status TEXT NOT NULL,
  cnt INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, status)
);

CREATE TABLE IF NOT EXISTS bot_accounts (
  account_id TEXT PRIMARY KEY,
  ig_handle TEXT NOT NULL,
  stage TEXT DEFAULT 'new',
  daily_task_limit INTEGER DEFAULT 10,
  speed_factor REAL DEFAULT 1.0
);
