import { getPool, isPostgresEnabled } from './db.js'
import { calculateQuote } from './costCalculator.js'

const TABLE_VARIABLE_CODES = [
  'PU_CHAPA_PARRILLERO', 'PU_TUBO40', 'PU_CONS_SOLDADURA',
  'PU_HH_OFICIAL', 'PU_HH_AYUDANTE', 'PU_FONDO', 'PU_ESMALTE_PU',
  'PU_FLETE_VIAJE', 'PU_GASTOS_GRALES', 'PU_BENEFICIO', 'PU_IVA',
]

export async function getCurrentCostVariables() {
  if (!isPostgresEnabled()) throw new Error('OXI Cotiza requiere PostgreSQL.')
  const result = await getPool().query(`
    SELECT DISTINCT ON (variable.id)
      variable.id, variable.code, variable.description, variable.category,
      variable.variable_type AS "variableType", variable.semantic_key AS "semanticKey",
      variable.reference_unit AS "referenceUnit", variable.review_status AS "reviewStatus",
      version.id AS "versionId", version.value::float8 AS value, version.currency,
      version.effective_at AS "effectiveAt", version.source_label AS "sourceLabel"
    FROM cost_variables AS variable
    JOIN cost_variable_versions AS version ON version.variable_id = variable.id
    WHERE variable.active = TRUE
    ORDER BY variable.id, version.effective_at DESC, version.id DESC
  `)
  return result.rows
}

function requireVariable(catalog, code) {
  const variable = catalog.get(code)
  if (!variable) throw new Error(`Falta la variable de costo ${code}.`)
  return variable
}

function line(catalog, code, quantity, wasteRate = 0) {
  const variable = requireVariable(catalog, code)
  return {
    code,
    description: variable.description,
    quantity,
    unit: variable.referenceUnit,
    unitCostUyu: variable.value,
    wasteRate,
    variableVersionId: variable.versionId,
  }
}

export function calculateCircularTable(input, variables) {
  const diameterM = Number(input.diameterM)
  const heightM = Number(input.heightM)
  const quantity = Number(input.quantity)
  const exchangeRateUyuPerUsd = Number(input.exchangeRateUyuPerUsd)
  if (!Number.isFinite(diameterM) || diameterM < 0.5 || diameterM > 3) throw new Error('El diámetro debe estar entre 0,50 m y 3 m.')
  if (!Number.isFinite(heightM) || heightM < 0.4 || heightM > 1.2) throw new Error('La altura debe estar entre 0,40 m y 1,20 m.')
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new Error('La cantidad debe ser un entero entre 1 y 50.')

  const catalog = new Map(variables.map((variable) => [variable.code, variable]))
  const areaTopM2 = Math.PI * (diameterM / 2) ** 2
  const perimeterM = Math.PI * diameterM
  const tubeLengthPerTableM = perimeterM + (heightM * 4)
  const tubeLengthM = tubeLengthPerTableM * quantity
  const finishAreaM2 = (areaTopM2 * 2 + tubeLengthPerTableM * 0.16) * quantity
  const workshopHours = (4 + areaTopM2 * 2.5 + tubeLengthPerTableM * 0.18) * quantity
  const helperHours = workshopHours * 0.55
  const weldingKg = tubeLengthM * 0.06

  const lines = [
    line(catalog, 'PU_CHAPA_PARRILLERO', areaTopM2 * quantity, 0.1),
    line(catalog, 'PU_TUBO40', tubeLengthM, 0.08),
    line(catalog, 'PU_CONS_SOLDADURA', weldingKg, 0.08),
    line(catalog, 'PU_HH_OFICIAL', workshopHours),
    line(catalog, 'PU_HH_AYUDANTE', helperHours),
    line(catalog, 'PU_FONDO', finishAreaM2, 0.1),
    line(catalog, 'PU_ESMALTE_PU', finishAreaM2, 0.1),
  ]
  if (input.includeFreight) lines.push(line(catalog, 'PU_FLETE_VIAJE', Number(input.freightTrips || 1)))

  const result = calculateQuote({
    lines,
    overheadRate: requireVariable(catalog, 'PU_GASTOS_GRALES').value,
    grossMarginRate: requireVariable(catalog, 'PU_BENEFICIO').value,
    exchangeRateUyuPerUsd,
    taxRate: requireVariable(catalog, 'PU_IVA').value,
  })

  return {
    template: { code: 'MESA_CIRCULAR_001', name: 'Mesa circular', version: 1 },
    inputs: { diameterM, heightM, quantity, includeFreight: Boolean(input.includeFreight), freightTrips: input.includeFreight ? Number(input.freightTrips || 1) : 0 },
    derived: { areaTopM2, perimeterM, tubeLengthM, finishAreaM2, workshopHours, helperHours, weldingKg },
    ...result,
    assumptions: [
      'Tapa piloto calculada con PU_CHAPA_PARRILLERO; espesor y terminación deben confirmarse.',
      'Base estimada con cuatro patas y aro perimetral en tubo 40×40×2 mm.',
      'Horas y consumos son supuestos iniciales; validar contra un presupuesto manual antes de enviar.',
    ],
  }
}

export async function calculateCircularTableWithCurrentVariables(input) {
  const variables = await getCurrentCostVariables()
  const selected = variables.filter((variable) => TABLE_VARIABLE_CODES.includes(variable.code))
  return calculateCircularTable(input, selected)
}
