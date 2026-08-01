ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE order_items oi
SET product_name = COALESCE(oi.product_name, p.name),
    company = COALESCE(oi.company, p.company),
    sku = COALESCE(oi.sku, p.sku),
    unit = COALESCE(oi.unit, p.unit),
    unit_price = COALESCE(oi.unit_price, p.price),
    currency = COALESCE(oi.currency, p.currency, 'UYU'),
    lead_time_days = COALESCE(oi.lead_time_days, p.lead_time_days)
FROM products p
WHERE p.id = oi.product_id;

UPDATE orders o
SET subtotal = totals.subtotal,
    total = totals.subtotal,
    currency = totals.currency
FROM (
  SELECT order_id,
         SUM(COALESCE(unit_price, 0) * quantity) AS subtotal,
         MIN(COALESCE(currency, 'UYU')) AS currency
  FROM order_items
  GROUP BY order_id
) totals
WHERE totals.order_id = o.id AND o.subtotal IS NULL;
