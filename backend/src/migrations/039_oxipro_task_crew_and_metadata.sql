-- 039_oxipro_task_crew_and_metadata.sql
-- Agrega columnas JSONB para persistencia de cuadrillas mixtas, asignación de metrados y estado de OxI Pro

ALTER TABLE b2b_project_tasks ADD COLUMN IF NOT EXISTS crew_lines JSONB DEFAULT '[]'::jsonb;
ALTER TABLE b2b_project_tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE b2b_projects ADD COLUMN IF NOT EXISTS oxipro_state JSONB DEFAULT '{}'::jsonb;

