CREATE TABLE IF NOT EXISTS search_contacts (
  id SERIAL PRIMARY KEY,
  search_term TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'featured-search',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_contacts_created_at_idx
  ON search_contacts(created_at DESC);
