INSERT INTO providers (id, name, zone, phone, rating, reviews)
VALUES (10, 'Oxida Studio', 'Montevideo', '', 5, 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, zone = EXCLUDED.zone;

INSERT INTO products
  (id, name, description, category, company, provider_id, price, currency, unit, stock, color,
   sku, status, product_type, lead_time_days, configurable, variants)
VALUES
  (1001, 'Escalera Línea Nexo', 'Escalera de estructura metálica y peldaños de madera. Adaptable a tu espacio.',
   'Escaleras y barandas', 'Oxida Studio', 10, 2850, 'USD', 'proyecto', 4, '#23231f',
   'OX-ESC-NEXO', 'published', 'custom_quote', 30, TRUE,
   '[{"id":"esc-standard","name":"Estándar","sku":"OX-ESC-NEXO-STD","price":2850,"stock":4,"attributes":{"medida":"Estándar","color":"Negro mate","terminacion":"Pintura al horno"}}]'::jsonb),
  (1002, 'Cama Hierro Serena', 'Estructura liviana de hierro con terminación mate. Disponible en tres medidas.',
   'Mobiliario', 'Oxida Studio', 10, 10000, 'UYU', 'unidad', 6, '#a8522e',
   'OX-CAM-SERENA', 'published', 'made_to_order', 18, TRUE,
   '[{"id":"cama-1p","name":"1 plaza","sku":"OX-CAM-SERENA-1P","price":10000,"stock":2,"attributes":{"medida":"1 plaza","color":"Negro mate","terminacion":"Pintura al horno"}},{"id":"cama-2p","name":"2 plazas","sku":"OX-CAM-SERENA-2P","price":10000,"stock":2,"attributes":{"medida":"2 plazas","color":"Negro mate","terminacion":"Pintura al horno"}},{"id":"cama-queen","name":"Queen","sku":"OX-CAM-SERENA-Q","price":10000,"stock":2,"attributes":{"medida":"Queen","color":"Negro mate","terminacion":"Pintura al horno"}}]'::jsonb),
  (1003, 'Divisor Trama', 'Panel metálico modular para dividir y dar privacidad sin perder luz.',
   'Fachadas y divisores', 'Oxida Studio', 10, 640, 'USD', 'm²', 3, '#75675c',
   'OX-DIV-TRAMA', 'published', 'made_to_order', 25, TRUE, '[]'::jsonb),
  (1004, 'Pérgola Umbral', 'Estructura exterior en acero, diseñada y fabricada según cada espacio.',
   'Estructuras', 'Oxida Studio', 10, 3200, 'USD', 'proyecto', 2, '#47443e',
   'OX-PER-UMBRAL', 'published', 'custom_quote', 35, TRUE, '[]'::jsonb),
  (1005, 'Perchero Estante Nexo', 'Perchero recibidor de hierro y madera con estantes, banco y espacio de colgado.',
   'Mobiliario', 'Oxida Studio', 10, 10000, 'UYU', 'unidad', 12, '#b96a43',
   'OX-PER-NEXO', 'published', 'ready', 12, TRUE,
   '[{"id":"perchero-natural","name":"Madera natural","sku":"OX-PER-NEXO-NAT","price":10000,"stock":6,"attributes":{"medida":"Estándar","color":"Negro mate","terminacion":"Madera natural"}},{"id":"perchero-oscuro","name":"Madera oscura","sku":"OX-PER-NEXO-OSC","price":10000,"stock":6,"attributes":{"medida":"Estándar","color":"Negro mate","terminacion":"Madera oscura"}}]'::jsonb),
  (1006, 'Estantería Sistema 01', 'Estantería baja de hierro y madera con tres niveles de guardado.',
   'Mobiliario', 'Oxida Studio', 10, 10000, 'UYU', 'unidad', 5, '#c2a17e',
   'OX-EST-S01', 'published', 'ready', 22, TRUE,
   '[{"id":"estanteria-natural","name":"Natural","sku":"OX-EST-S01-NAT","price":10000,"stock":3,"attributes":{"medida":"120 cm","color":"Negro mate","terminacion":"Madera natural"}},{"id":"estanteria-oscura","name":"Oscura","sku":"OX-EST-S01-OSC","price":10000,"stock":2,"attributes":{"medida":"120 cm","color":"Negro mate","terminacion":"Madera oscura"}}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  company = EXCLUDED.company,
  provider_id = EXCLUDED.provider_id,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  unit = EXCLUDED.unit,
  stock = EXCLUDED.stock,
  color = EXCLUDED.color,
  sku = EXCLUDED.sku,
  status = EXCLUDED.status,
  product_type = EXCLUDED.product_type,
  lead_time_days = EXCLUDED.lead_time_days,
  configurable = EXCLUDED.configurable,
  variants = EXCLUDED.variants;

SELECT setval(pg_get_serial_sequence('providers', 'id'), GREATEST((SELECT MAX(id) FROM providers), 1), true);
SELECT setval(pg_get_serial_sequence('products', 'id'), GREATEST((SELECT MAX(id) FROM products), 1), true);
