-- InkFlow API - Neon Schema
-- Run: npx wrangler deploy  (schema created via migrations or Neon console)

-- Bot instances
CREATE TABLE IF NOT EXISTS bot_instances (
  id TEXT PRIMARY KEY,
  host TEXT DEFAULT '',
  version TEXT DEFAULT '',
  profile JSONB,
  online INTEGER DEFAULT 0,
  last_seen_at BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0
);

-- Automation tasks
CREATE TABLE IF NOT EXISTS automation_tasks (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  run_at BIGINT NOT NULL DEFAULT 0,
  lease_until BIGINT,
  leased_by TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_reason TEXT,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON automation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_run_at ON automation_tasks(run_at);

-- Bot observations (results)
CREATE TABLE IF NOT EXISTS bot_observations (
  id SERIAL PRIMARY KEY,
  command_id TEXT,
  handle TEXT NOT NULL,
  summary JSONB,
  facts JSONB,
  created_at BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_obs_handle ON bot_observations(handle);
CREATE INDEX IF NOT EXISTS idx_obs_created ON bot_observations(created_at DESC);

-- Content competitors
CREATE TABLE IF NOT EXISTS content_competitors (
  id SERIAL PRIMARY KEY,
  ig_handle TEXT NOT NULL,
  account_type TEXT DEFAULT 'supply_brand',
  source TEXT DEFAULT '',
  priority INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  category TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

-- Bot schedule (for pause/resume windows)
CREATE TABLE IF NOT EXISTS bot_schedule (
  id TEXT PRIMARY KEY,
  config JSONB,
  state TEXT DEFAULT 'running',
  updated_at BIGINT DEFAULT 0
);
