ALTER TABLE cost_variable_versions
  ALTER COLUMN currency DROP NOT NULL;

UPDATE cost_variable_versions AS version
SET currency = NULL
FROM cost_variables AS variable
WHERE variable.id = version.variable_id
  AND variable.variable_type IN ('rendimiento', 'regla_comercial_porcentaje');
