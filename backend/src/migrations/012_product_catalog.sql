ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS configurable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique
ON products (sku)
WHERE sku IS NOT NULL AND sku <> '';

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_status_check,
  ADD CONSTRAINT products_status_check CHECK (status IN ('draft', 'published', 'out_of_stock', 'archived')),
  DROP CONSTRAINT IF EXISTS products_type_check,
  ADD CONSTRAINT products_type_check CHECK (product_type IN ('ready', 'made_to_order', 'custom_quote'));
