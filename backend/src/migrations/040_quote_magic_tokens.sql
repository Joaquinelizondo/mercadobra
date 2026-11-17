ALTER TABLE customer_quotes
  ADD COLUMN IF NOT EXISTS access_token TEXT;

UPDATE customer_quotes
  SET access_token = md5(random()::text || clock_timestamp()::text || id::text)
  WHERE access_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_quotes_access_token_idx
  ON customer_quotes(access_token)
  WHERE access_token IS NOT NULL;
