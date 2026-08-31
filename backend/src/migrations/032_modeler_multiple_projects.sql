DROP INDEX IF EXISTS modeler_projects_owner_unique_idx;

CREATE INDEX IF NOT EXISTS modeler_projects_owner_name_idx
  ON modeler_projects (owner_user_id, name);
