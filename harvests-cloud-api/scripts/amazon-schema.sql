-- Amazon Intel Schema for D1
-- Run: wrangler d1 execute harvests-db --file=scripts/amazon-schema.sql

CREATE TABLE IF NOT EXISTS amazon_products (
  asin TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  price TEXT,
  currency TEXT DEFAULT 'USD',
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  image_url TEXT,
  product_url TEXT,
  domain TEXT DEFAULT 'www.amazon.com',
  search_keyword TEXT,
  category TEXT,
  scraped_at INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS amazon_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asin TEXT NOT NULL,
  product_title TEXT,
  domain TEXT DEFAULT 'www.amazon.com',
  reviewer_name TEXT,
  reviewer_url TEXT,
  rating INTEGER,
  title TEXT,
  review_text TEXT,
  review_date TEXT,
  verified INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  images TEXT,
  review_url TEXT,
  scraped_at INTEGER,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_amazon_reviews_asin ON amazon_reviews(asin);
CREATE INDEX IF NOT EXISTS idx_amazon_reviews_domain ON amazon_reviews(domain);
CREATE INDEX IF NOT EXISTS idx_amazon_reviews_rating ON amazon_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_amazon_products_keyword ON amazon_products(search_keyword);
CREATE INDEX IF NOT EXISTS idx_amazon_products_domain ON amazon_products(domain);

CREATE TABLE IF NOT EXISTS amazon_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  user_id TEXT DEFAULT 'system',
  params TEXT,
  status TEXT DEFAULT 'pending',
  progress TEXT,
  result_summary TEXT,
  error_message TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_amazon_tasks_status ON amazon_tasks(status);
CREATE INDEX IF NOT EXISTS idx_amazon_tasks_type ON amazon_tasks(type);
