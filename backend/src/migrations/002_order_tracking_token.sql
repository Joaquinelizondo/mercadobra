ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_token TEXT;

UPDATE orders
SET tracking_token = md5(random()::text || clock_timestamp()::text)
WHERE tracking_token IS NULL;

ALTER TABLE orders
  ALTER COLUMN tracking_token SET DEFAULT md5(random()::text || clock_timestamp()::text);

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_idx
  ON orders(tracking_token);
