-- S4: los magic links de cotizaciones solo se resuelven por access_token aleatorio.
-- Se elimina el token derivado de reference_number (predecible) y se asegura que toda cotización tenga uno.
UPDATE customer_quotes
  SET access_token = replace(gen_random_uuid()::text, '-', '')
  WHERE access_token IS NULL OR access_token = '';
