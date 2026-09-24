import * as math from 'mathjs';
import { getPool } from './db.js';
import { getCurrentCostVariables, completePilotCatalog } from './costingService.js';
import { calculateQuote } from './costCalculator.js';

export async function getParametricTemplate(templateCode) {
  const pool = getPool();
  
  const templateRes = await pool.query('SELECT * FROM parametric_templates WHERE code = $1', [templateCode]);
  if (templateRes.rowCount === 0) throw new Error(`Plantilla no encontrada: ${templateCode}`);
  const template = templateRes.rows[0];

  const inputsRes = await pool.query('SELECT * FROM parametric_inputs WHERE template_id = $1 ORDER BY id ASC', [template.id]);
  const linesRes = await pool.query('SELECT * FROM parametric_lines WHERE template_id = $1 ORDER BY id ASC', [template.id]);

  return { template, inputs: inputsRes.rows, lines: linesRes.rows };
}

export async function calculateDynamicTemplate(templateCode, userInputs) {
  const { template, inputs, lines } = await getParametricTemplate(templateCode);
  
  // 1. Prepare evaluation context
  const scope = {};
  inputs.forEach(input => {
    let val = userInputs[input.code];
    if (val === undefined || val === null) {
      val = input.default_value;
    }
    scope[input.code] = input.input_type === 'number' ? Number(val) : Boolean(val);
  });
  // Add some constants if needed
  scope['PI'] = Math.PI;

  // 2. Fetch current variables
  const variables = await getCurrentCostVariables();
  const selected = completePilotCatalog(variables);
  const catalog = new Map(selected.map((variable) => [variable.code, variable]));

  // Helper to get variable
  function requireVariable(code) {
    const v = catalog.get(code);
    if (!v) throw new Error(`Falta la variable de costo ${code}.`);
    return v;
  }

  // 3. Evaluate lines
  const calculatedLines = lines.map(line => {
    const v = requireVariable(line.variable_code);
    let quantity = 0;
    let wasteRate = 0;
    
    try {
      quantity = math.evaluate(line.quantity_formula, scope);
    } catch (e) {
      throw new Error(`Error en fórmula de cantidad para ${line.variable_code}: ${e.message}`);
    }

    if (line.waste_formula) {
      try {
        wasteRate = math.evaluate(line.waste_formula, scope);
      } catch (e) {
        throw new Error(`Error en fórmula de desperdicio para ${line.variable_code}: ${e.message}`);
      }
    }

    return {
      code: line.variable_code,
      description: v.description,
      quantity,
      unit: v.referenceUnit,
      unitCostUyu: v.value,
      wasteRate,
      variableVersionId: v.versionId,
    };
  }).filter(l => l.quantity > 0);

  // Commercial / Exchange rates from inputs if they exist, else defaults
  const exchangeRate = scope.exchangeRateUyuPerUsd || userInputs.exchangeRateUyuPerUsd || 40;
  
  const result = calculateQuote({
    lines: calculatedLines,
    overheadRate: requireVariable('PU_GASTOS_GRALES').value,
    grossMarginRate: requireVariable('PU_BENEFICIO').value,
    exchangeRateUyuPerUsd: exchangeRate,
    taxRate: requireVariable('PU_IVA').value,
  });

  const fallbackVariables = selected.filter((variable) => variable.isFallback).map((variable) => variable.code);

  return {
    template: { code: template.code, name: template.name, version: 1, dynamic: true },
    inputs: scope,
    derived: {}, // We don't have hardcoded derived in dynamic
    ...result,
    fallbackVariables,
    assumptions: fallbackVariables.length
      ? [`Se usaron valores iniciales para: ${fallbackVariables.join(', ')}.`, `Cálculo generado por el Motor Universal Paramétrico.`]
      : [`Cálculo generado por el Motor Universal Paramétrico.`]
  };
}
