ALTER TABLE customer_quotes
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS desired_date DATE,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS proposal_description TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS customer_quote_messages (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL REFERENCES customer_quotes(id) ON DELETE CASCADE,
  author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_quote_messages_role_check CHECK (author_role IN ('customer', 'admin'))
);

CREATE INDEX IF NOT EXISTS customer_quote_messages_quote_idx
  ON customer_quote_messages(quote_id, created_at ASC, id ASC);
