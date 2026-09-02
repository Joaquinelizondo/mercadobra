CREATE TABLE IF NOT EXISTS cost_variables (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  variable_type TEXT NOT NULL CHECK (variable_type IN (
    'precio_unitario',
    'tarifa_mano_obra',
    'rendimiento',
    'regla_comercial_porcentaje',
    'costo_logistica'
  )),
  semantic_key TEXT UNIQUE,
  reference_unit TEXT NOT NULL,
  consumption_per_reference_unit NUMERIC(16, 6),
  scope TEXT NOT NULL DEFAULT 'reutilizable' CHECK (scope IN ('reutilizable', 'plantilla', 'cotizacion')),
  review_status TEXT NOT NULL DEFAULT 'referencia_importada' CHECK (review_status IN (
    'referencia_importada',
    'requiere_revision',
    'confirmada',
    'inactiva'
  )),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_variable_versions (
  id BIGSERIAL PRIMARY KEY,
  variable_id BIGINT NOT NULL REFERENCES cost_variables(id) ON DELETE CASCADE,
  value NUMERIC(16, 6) NOT NULL,
  currency CHAR(3) CHECK (currency IS NULL OR currency IN ('UYU', 'USD')),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_label TEXT NOT NULL DEFAULT '',
  source_formula TEXT NOT NULL DEFAULT '',
  source_key TEXT UNIQUE,
  change_reason TEXT NOT NULL DEFAULT '',
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cost_variable_versions_variable_effective_idx
  ON cost_variable_versions (variable_id, effective_at DESC);

CREATE TABLE IF NOT EXISTS exchange_rate_versions (
  id BIGSERIAL PRIMARY KEY,
  base_currency CHAR(3) NOT NULL CHECK (base_currency IN ('UYU', 'USD')),
  quote_currency CHAR(3) NOT NULL CHECK (quote_currency IN ('UYU', 'USD')),
  rate NUMERIC(16, 6) NOT NULL CHECK (rate > 0),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('compra', 'venta', 'manual')),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  source_captured_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  manually_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  change_reason TEXT NOT NULL DEFAULT '',
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (base_currency <> quote_currency)
);

CREATE INDEX IF NOT EXISTS exchange_rate_versions_pair_effective_idx
  ON exchange_rate_versions (base_currency, quote_currency, effective_at DESC);

CREATE TABLE IF NOT EXISTS cost_audit_events (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('cost_variable', 'cost_variable_version', 'exchange_rate', 'quote_template', 'quote_calculation')),
  entity_id BIGINT,
  action TEXT NOT NULL,
  before_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL DEFAULT '',
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cost_audit_events_entity_created_idx
  ON cost_audit_events (entity_type, entity_id, created_at DESC);
