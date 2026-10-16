import { getPool, isPostgresEnabled } from './db.js'
import { calculateQuote } from './costCalculator.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const initialInventoryPath = path.resolve(__dirname, '../../docs/oxi-cotiza-variables-iniciales.json')

const TABLE_VARIABLE_CODES = [
  'PU_CHAPA_PARRILLERO', 'PU_TUBO40', 'PU_CONS_SOLDADURA',
  'PU_HH_OFICIAL', 'PU_HH_AYUDANTE', 'PU_FONDO', 'PU_ESMALTE_PU',
  'PU_FLETE_VIAJE', 'PU_GASTOS_GRALES', 'PU_BENEFICIO', 'PU_IVA',
]

function getInitialCostVariables() {
  const inventory = JSON.parse(fs.readFileSync(initialInventoryPath, 'utf8'))
  return (inventory.records || []).map((record) => ({
    code: record.code,
    description: record.description,
    category: record.category,
    variableType: record.variable_type,
    semanticKey: record.semantic_key || null,
    referenceUnit: record.reference_unit,
    reviewStatus: record.review_status,
    versionId: null,
    value: Number(record.initial_value),
    currency: ['precio_unitario', 'tarifa_mano_obra', 'costo_logistica'].includes(record.variable_type) ? record.currency : null,
    sourceLabel: 'Inventario inicial de referencia',
    isFallback: true,
  }))
}

export function completePilotCatalog(currentVariables) {
  const currentByCode = new Map(currentVariables.map((variable) => [variable.code, variable]))
  const initialByCode = new Map(getInitialCostVariables().map((variable) => [variable.code, variable]))
  return TABLE_VARIABLE_CODES.map((code) => currentByCode.get(code) || initialByCode.get(code)).filter(Boolean)
}

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

export function calculateOxiDivider(input, variables) {
  const widthM = Number(input.widthM)
  const heightM = Number(input.heightM)
  const quantity = Number(input.quantity)
  const exchangeRateUyuPerUsd = Number(input.exchangeRateUyuPerUsd)
  
  if (!Number.isFinite(widthM) || widthM < 0.3 || widthM > 5) throw new Error('El ancho debe estar entre 0,30 m y 5 m.')
  if (!Number.isFinite(heightM) || heightM < 0.5 || heightM > 3.5) throw new Error('La altura debe estar entre 0,50 m y 3,50 m.')
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new Error('La cantidad debe ser un entero entre 1 y 50.')

  const catalog = new Map(variables.map((variable) => [variable.code, variable]))
  
  const perimeterM = (widthM + heightM) * 2
  const internalDivisionsM = heightM * 3 + widthM * 2
  const tubeLengthPerDividerM = perimeterM + internalDivisionsM
  const tubeLengthM = tubeLengthPerDividerM * quantity
  
  const finishAreaM2 = (tubeLengthPerDividerM * 0.16) * quantity
  const workshopHours = (4 + tubeLengthPerDividerM * 0.3) * quantity
  const helperHours = workshopHours * 0.5
  const weldingKg = tubeLengthM * 0.05

  const lines = [
    line(catalog, 'PU_TUBO40', tubeLengthM, 0.1),
    line(catalog, 'PU_CONS_SOLDADURA', weldingKg, 0.1),
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
    template: { code: 'OXI_DIVIDER_D01', name: 'OXI Divider D01', version: 1 },
    inputs: { widthM, heightM, quantity, includeFreight: Boolean(input.includeFreight), freightTrips: input.includeFreight ? Number(input.freightTrips || 1) : 0 },
    derived: { tubeLengthM, finishAreaM2, workshopHours, helperHours, weldingKg },
    ...result,
    assumptions: [
      'Cálculo de hierro basado en TUBO 40x40. Vidrios no incluidos en esta versión del piloto.',
      'Horas y consumos son supuestos iniciales; validar contra un presupuesto manual antes de enviar.',
    ],
  }
}

export function calculateOxiRailing(input, variables) {
  const lengthM = Number(input.lengthM || input.widthM)
  const heightM = Number(input.heightM || 1.0)
  const quantity = Number(input.quantity || 1)
  const exchangeRateUyuPerUsd = Number(input.exchangeRateUyuPerUsd || 40)

  if (!Number.isFinite(lengthM) || lengthM < 0.5 || lengthM > 50) throw new Error('El largo debe estar entre 0,50 m y 50 m.')
  if (!Number.isFinite(heightM) || heightM < 0.5 || heightM > 2.5) throw new Error('La altura debe estar entre 0,50 m y 2,50 m.')
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('La cantidad debe ser un entero entre 1 y 100.')

  const catalog = new Map(variables.map((variable) => [variable.code, variable]))

  const postsCount = (Math.max(2, Math.ceil(lengthM) + 1)) * quantity
  const topAndBottomRailM = (lengthM * 2) * quantity
  const postsTubeM = postsCount * heightM
  const totalTubeM = topAndBottomRailM + postsTubeM
  const balusterCount = Math.floor(lengthM / 0.12) * quantity
  const balusterHeightM = Math.max(0.3, heightM - 0.15)
  const infillSteelKg = balusterCount * balusterHeightM * 1.5
  const finishAreaM2 = (totalTubeM * 0.16 + (balusterCount * balusterHeightM * 0.08)) * 1.1
  const workshopHours = (3 + lengthM * 1.4) * quantity
  const helperHours = workshopHours * 0.5
  const weldingKg = (postsCount * 0.06 + balusterCount * 0.02) * 1.1

  const lines = [
    line(catalog, 'PU_TUBO40', totalTubeM, 0.08),
    line(catalog, 'PU_CHAPA_PARRILLERO', infillSteelKg, 0.05),
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
    template: { code: 'OXI_RAILING_R01', name: 'Baranda Balcón / Escalera OXI', version: 1 },
    inputs: { lengthM, heightM, quantity, includeFreight: Boolean(input.includeFreight), freightTrips: input.includeFreight ? Number(input.freightTrips || 1) : 0 },
    derived: { totalLengthM: lengthM * quantity, postsCount, totalTubeM, infillSteelKg, finishAreaM2, workshopHours, helperHours, weldingKg },
    ...result,
    assumptions: [
      'Estructura principal en caño estructural 40×40×2 mm con parantes cada 1,0 m.',
      'Barrote vertical de seguridad cada 12 cm según normativa constructiva.',
      'Pintura electrostática / poliuretánica con fondo anticorrosivo sobre hierro desengrasado.',
    ],
  }
}

export function calculateOxiPergola(input, variables) {
  const lengthM = Number(input.lengthM || input.widthM || 3.0)
  const widthM = Number(input.widthM || 3.0)
  const heightM = Number(input.heightM || 2.6)
  const quantity = Number(input.quantity || 1)
  const exchangeRateUyuPerUsd = Number(input.exchangeRateUyuPerUsd || 40)

  if (!Number.isFinite(lengthM) || lengthM < 1.0 || lengthM > 15.0) throw new Error('El largo debe estar entre 1,0 m y 15,0 m.')
  if (!Number.isFinite(widthM) || widthM < 1.0 || widthM > 12.0) throw new Error('El ancho debe estar entre 1,0 m y 12,0 m.')
  if (!Number.isFinite(heightM) || heightM < 1.8 || heightM > 4.5) throw new Error('La altura debe estar entre 1,80 m y 4,50 m.')
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new Error('La cantidad debe ser un entero entre 1 y 50.')

  const catalog = new Map(variables.map((variable) => [variable.code, variable]))

  const areaM2 = lengthM * widthM * quantity
  const columnsCount = (lengthM > 4.5 ? 6 : 4) * quantity
  const columnsTubeM = columnsCount * heightM
  const perimeterBeamsM = (lengthM * 2 + widthM * 2) * quantity
  const rafterCount = Math.floor(lengthM / 0.6) * quantity
  const rafterTubeM = rafterCount * widthM
  const totalTubeM = perimeterBeamsM + columnsTubeM + rafterTubeM
  const basePlatesKg = columnsCount * 3.5
  const finishAreaM2 = totalTubeM * 0.16 * 1.15
  const workshopHours = (8 + areaM2 * 0.8) * quantity
  const helperHours = workshopHours * 0.65
  const weldingKg = totalTubeM * 0.045

  const lines = [
    line(catalog, 'PU_TUBO40', totalTubeM, 0.08),
    line(catalog, 'PU_CHAPA_PARRILLERO', basePlatesKg, 0.05),
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
    template: { code: 'OXI_PERGOLA_P01', name: 'Pérgola Metálica Exterior OXI', version: 1 },
    inputs: { lengthM, widthM, heightM, quantity, includeFreight: Boolean(input.includeFreight), freightTrips: input.includeFreight ? Number(input.freightTrips || 1) : 0 },
    derived: { areaM2, columnsCount, totalTubeM, basePlatesKg, finishAreaM2, workshopHours, helperHours, weldingKg },
    ...result,
    assumptions: [
      'Pilares y vigas perimetrales con anclajes químicos en base.',
      'Correas intermedias cada 60 cm preparadas para policarbonato, chapa o lamas.',
      'Tratamiento anticorrosivo para intemperie y flete de transporte pesado considerado.',
    ],
  }
}

export async function calculateCircularTableWithCurrentVariables(input) {
  const variables = await getCurrentCostVariables()
  const selected = completePilotCatalog(variables)
  const result = calculateCircularTable(input, selected)
  const fallbackVariables = selected.filter((variable) => variable.isFallback).map((variable) => variable.code)
  return {
    ...result,
    fallbackVariables,
    assumptions: fallbackVariables.length
      ? [`Se usaron valores iniciales de referencia para: ${fallbackVariables.join(', ')}. Confirmarlos antes de enviar.`, ...result.assumptions]
      : result.assumptions,
  }
}

export async function calculateTemplateWithCurrentVariables(templateCode, input) {
  const variables = await getCurrentCostVariables()
  const selected = completePilotCatalog(variables)
  
  let result
  if (templateCode === 'MESA_CIRCULAR_001') {
    result = calculateCircularTable(input, selected)
  } else if (templateCode === 'OXI_DIVIDER_D01') {
    result = calculateOxiDivider(input, selected)
  } else if (templateCode === 'OXI_RAILING_R01') {
    result = calculateOxiRailing(input, selected)
  } else if (templateCode === 'OXI_PERGOLA_P01') {
    result = calculateOxiPergola(input, selected)
  } else {
    throw new Error(`Plantilla no reconocida: ${templateCode}`)
  }
  
  const fallbackVariables = selected.filter((variable) => variable.isFallback).map((variable) => variable.code)
  return {
    ...result,
    fallbackVariables,
    assumptions: fallbackVariables.length
      ? [`Se usaron valores iniciales de referencia para: ${fallbackVariables.join(', ')}. Confirmarlos antes de enviar.`, ...result.assumptions]
      : result.assumptions,
  }
}
