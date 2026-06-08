ALTER TABLE products
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UYU';

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_currency_check;

ALTER TABLE products
ADD CONSTRAINT products_currency_check CHECK (currency IN ('UYU', 'USD'));
