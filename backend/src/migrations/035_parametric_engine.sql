CREATE TABLE IF NOT EXISTS parametric_templates (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parametric_inputs (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES parametric_templates(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  input_type VARCHAR(50) NOT NULL DEFAULT 'number', -- 'number', 'boolean'
  min_value FLOAT8,
  max_value FLOAT8,
  step_value FLOAT8,
  default_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, code)
);

CREATE TABLE IF NOT EXISTS parametric_lines (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES parametric_templates(id) ON DELETE CASCADE,
  variable_code VARCHAR(100) NOT NULL, -- references cost_variables(code)
  quantity_formula TEXT NOT NULL,
  waste_formula TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial test template just for UI
INSERT INTO parametric_templates (code, name, description)
VALUES ('OXI_DEMO_01', 'Producto Dinámico Demo', 'Plantilla creada desde el constructor visual para demostración.');
