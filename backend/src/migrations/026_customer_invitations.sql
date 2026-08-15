CREATE TABLE IF NOT EXISTS customer_invitations (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_invitations_status_check CHECK (status IN ('sent','accepted','expired','revoked'))
);
CREATE INDEX IF NOT EXISTS customer_invitations_user_idx ON customer_invitations(user_id, created_at DESC);
