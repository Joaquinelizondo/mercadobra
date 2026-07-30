UPDATE products
SET
  price = 1,
  currency = 'UYU',
  variants = CASE
    WHEN jsonb_typeof(variants) = 'array' THEN (
      SELECT COALESCE(
        jsonb_agg(jsonb_set(variant, '{price}', '1'::jsonb, true)),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(variants) AS variant
    )
    ELSE variants
  END;
