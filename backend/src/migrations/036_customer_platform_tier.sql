ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'classic';

