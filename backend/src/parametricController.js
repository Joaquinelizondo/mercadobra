import { getPool } from './db.js';
import { getParametricTemplate, calculateDynamicTemplate } from './parametricEngine.js';

export const listTemplates = async (req, res) => {
  const pool = getPool();
  try {
    const templates = await pool.query('SELECT * FROM parametric_templates ORDER BY name ASC');
    res.json({ success: true, templates: templates.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTemplate = async (req, res) => {
  try {
    const data = await getParametricTemplate(req.params.code);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

export const saveTemplate = async (req, res) => {
  const pool = getPool();
  const { code, name, description, inputs, lines } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Upsert template
    let templateRes = await client.query('SELECT id FROM parametric_templates WHERE code = $1', [code]);
    let templateId;
    
    if (templateRes.rowCount > 0) {
      templateId = templateRes.rows[0].id;
      await client.query('UPDATE parametric_templates SET name = $1, description = $2, updated_at = NOW() WHERE id = $3', [name, description, templateId]);
    } else {
      const inserted = await client.query('INSERT INTO parametric_templates (code, name, description) VALUES ($1, $2, $3) RETURNING id', [code, name, description]);
      templateId = inserted.rows[0].id;
    }

    // Replace inputs
    await client.query('DELETE FROM parametric_inputs WHERE template_id = $1', [templateId]);
    for (const input of inputs) {
      await client.query(`
        INSERT INTO parametric_inputs (template_id, code, label, input_type, min_value, max_value, step_value, default_value)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [templateId, input.code, input.label, input.input_type || 'number', input.min_value, input.max_value, input.step_value, input.default_value]);
    }

    // Replace lines
    await client.query('DELETE FROM parametric_lines WHERE template_id = $1', [templateId]);
    for (const line of lines) {
      await client.query(`
        INSERT INTO parametric_lines (template_id, variable_code, quantity_formula, waste_formula)
        VALUES ($1, $2, $3, $4)
      `, [templateId, line.variable_code, line.quantity_formula, line.waste_formula]);
    }

    await client.query('COMMIT');
    res.json({ success: true, templateId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const calculateTemplate = async (req, res) => {
  try {
    const { code } = req.params;
    const inputs = req.body;
    const result = await calculateDynamicTemplate(code, inputs);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
