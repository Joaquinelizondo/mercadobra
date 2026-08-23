ALTER TABLE customer_quotes
  ADD COLUMN IF NOT EXISTS deposit_mode TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS deposit_method TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_preference_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_external_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_receipt JSONB,
  ADD COLUMN IF NOT EXISTS deposit_reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;

ALTER TABLE customer_quotes DROP CONSTRAINT IF EXISTS customer_quotes_deposit_mode_check;
ALTER TABLE customer_quotes ADD CONSTRAINT customer_quotes_deposit_mode_check
  CHECK (deposit_mode IN ('none', 'percentage', 'fixed'));

ALTER TABLE customer_quotes DROP CONSTRAINT IF EXISTS customer_quotes_deposit_status_check;
ALTER TABLE customer_quotes ADD CONSTRAINT customer_quotes_deposit_status_check
  CHECK (deposit_status IN ('not_required', 'pending', 'reported', 'approved', 'rejected', 'cancelled'));
