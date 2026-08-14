ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_discount_percent_check;

ALTER TABLE products
  ADD CONSTRAINT products_discount_percent_check
  CHECK (discount_percent >= 0 AND discount_percent < 100);
