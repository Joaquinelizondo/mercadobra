CREATE TABLE IF NOT EXISTS fabrication_orders (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES customer_quotes(id) ON DELETE SET NULL,
  b2b_project_id INTEGER REFERENCES b2b_projects(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  supplier_company TEXT NOT NULL,
  project_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  specifications JSONB DEFAULT '{}'::jsonb,
  target_price NUMERIC(12, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  workshop_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fabrication_orders_supplier_id ON fabrication_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fabrication_orders_quote_id ON fabrication_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_fabrication_orders_status ON fabrication_orders(status);

