CREATE TABLE IF NOT EXISTS quote_consultations (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  name TEXT,
  email TEXT,
  phone TEXT,
  zone TEXT,
  project_type TEXT,
  budget_range TEXT,
  payment_preference TEXT,
  message TEXT,
  search_term TEXT,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  search_contact_id INTEGER REFERENCES search_contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_consultations_created_at
  ON quote_consultations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_consultations_source
  ON quote_consultations (source);

CREATE INDEX IF NOT EXISTS idx_quote_consultations_event_type
  ON quote_consultations (event_type);
