CREATE TABLE IF NOT EXISTS custom_requests (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  zone TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  finish TEXT NOT NULL,
  message TEXT DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
