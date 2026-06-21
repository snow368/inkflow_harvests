-- User scrape configurations
CREATE TABLE IF NOT EXISTS user_scrape_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_email TEXT DEFAULT '',
  keyword TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scrape_user ON user_scrape_configs(user_id);
