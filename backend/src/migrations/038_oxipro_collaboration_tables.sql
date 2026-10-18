CREATE TABLE IF NOT EXISTS b2b_project_tasks (
  id SERIAL PRIMARY KEY,
  b2b_project_id INTEGER NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  people_count INTEGER DEFAULT 1,
  category TEXT DEFAULT 'Oficial',
  category_rate NUMERIC DEFAULT 2800,
  assigned_labor_cost NUMERIC DEFAULT 0,
  social_laws_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  month TEXT DEFAULT 'Mes 1',
  planned_percent NUMERIC DEFAULT 0,
  progress_percent NUMERIC DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  certifications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_b2b_project_tasks_project_id ON b2b_project_tasks(b2b_project_id);

CREATE TABLE IF NOT EXISTS b2b_project_rubros (
  id SERIAL PRIMARY KEY,
  b2b_project_id INTEGER NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  rubro_key TEXT NOT NULL,
  name TEXT NOT NULL,
  labor_cost NUMERIC DEFAULT 0,
  social_laws_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  budgeted NUMERIC DEFAULT 0,
  executed NUMERIC DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_b2b_project_rubros_project_id ON b2b_project_rubros(b2b_project_id);

CREATE TABLE IF NOT EXISTS b2b_project_delays (
  id SERIAL PRIMARY KEY,
  b2b_project_id INTEGER NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  cause TEXT NOT NULL DEFAULT 'Lluvia intensa y precipitaciones',
  notes TEXT DEFAULT '',
  tasks_snapshot JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_b2b_project_delays_project_id ON b2b_project_delays(b2b_project_id);
