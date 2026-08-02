ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web';

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_source_check,
  ADD CONSTRAINT orders_source_check
  CHECK (source IN ('web', 'whatsapp', 'phone', 'instagram', 'presencial', 'other'));
