CREATE TABLE IF NOT EXISTS customer_quotes (
  id BIGSERIAL PRIMARY KEY,
  customer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reference_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UYU',
  sent_at TIMESTAMPTZ,
  estimated_start_at DATE,
  estimated_end_at DATE,
  internal_notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_quotes_status_check CHECK (
    status IN ('in_progress', 'sent', 'accepted', 'project_in_progress', 'completed', 'rejected', 'cancelled')
  ),
  CONSTRAINT customer_quotes_currency_check CHECK (currency IN ('UYU', 'USD')),
  CONSTRAINT customer_quotes_total_check CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS customer_quotes_customer_idx
  ON customer_quotes(customer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_quotes_status_idx
  ON customer_quotes(status);
