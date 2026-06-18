-- Users management
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT DEFAULT '',
  display_name TEXT DEFAULT '',
  role TEXT DEFAULT 'user',          -- admin | user
  quota_daily_scrape INTEGER DEFAULT 10,
  quota_total_scrape INTEGER DEFAULT 100,
  scrape_used_today INTEGER DEFAULT 0,
  scrape_used_total INTEGER DEFAULT 0,
  last_active_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,              -- scrape_submit | scrape_complete | api_call
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_action ON usage_logs(action);
