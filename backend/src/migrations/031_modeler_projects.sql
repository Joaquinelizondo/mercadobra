CREATE TABLE IF NOT EXISTS modeler_projects (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Proyecto sin nombre',
  model JSONB NOT NULL DEFAULT '{"walls":[]}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS modeler_projects_owner_unique_idx
  ON modeler_projects (owner_user_id);

CREATE INDEX IF NOT EXISTS modeler_projects_owner_updated_idx
  ON modeler_projects (owner_user_id, updated_at DESC);
