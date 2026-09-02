import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool, isPostgresEnabled } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const inventoryPath = path.resolve(__dirname, '../../docs/oxi-cotiza-variables-iniciales.json')

const CANONICAL_UNITS = new Map([
  ['un', 'un'],
  ['kg', 'kg'],
  ['ml', 'ml'],
  ['m²', 'm²'],
  ['m3', 'm³'],
  ['m³', 'm³'],
  ['hs', 'h'],
  ['hs sold.', 'h'],
  ['%', '%'],
  ['viaje', 'viaje'],
])

function normalizeUnit(value) {
  const key = String(value || '').trim().toLowerCase()
  return CANONICAL_UNITS.get(key) || key || 'un'
}

function numericOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function versionCurrency(record) {
  return ['precio_unitario', 'tarifa_mano_obra', 'costo_logistica'].includes(record.variable_type)
    ? record.currency
    : null
}

async function run() {
  if (!isPostgresEnabled()) {
    console.log('DATABASE_URL no configurada. Se omite la carga inicial de variables.')
    return
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'))
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    let insertedVariables = 0
    let insertedVersions = 0

    for (const record of inventory.records || []) {
      const sourceMetadata = {
        sourceFile: record.source_file,
        sourceSheet: record.source_sheet,
        sourceRow: record.source_row,
        sourcePriceValue: numericOrNull(record.source_price_value),
        sourcePriceFormula: record.source_price_formula || '',
        sourceReferenceFormula: record.source_reference_formula || '',
        sourceIsFormulaDerived: Boolean(record.source_is_formula_derived),
      }
      const variableResult = await client.query(
        `INSERT INTO cost_variables (
           code, description, category, variable_type, semantic_key, reference_unit,
           consumption_per_reference_unit, scope, review_status, source_metadata
         ) VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8, $9, $10::jsonb)
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [
          record.code,
          record.description,
          record.category,
          record.variable_type,
          record.semantic_key || '',
          normalizeUnit(record.reference_unit),
          numericOrNull(record.consumption_per_reference_unit),
          record.scope,
          record.review_status,
          JSON.stringify(sourceMetadata),
        ]
      )
      let variable = variableResult.rows[0]
      if (variable) insertedVariables += 1
      if (!variable) {
        const existing = await client.query('SELECT id FROM cost_variables WHERE code = $1', [record.code])
        variable = existing.rows[0]
      }

      const sourceKey = `${record.source_file}:${record.source_sheet}:${record.source_row}`
      const initialValue = numericOrNull(record.initial_value)
      if (initialValue === null) {
        throw new Error(`La variable ${record.code} no tiene un valor inicial numérico.`)
      }
      const versionResult = await client.query(
        `INSERT INTO cost_variable_versions (
           variable_id, value, currency, source_label, source_formula, source_key, change_reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (source_key) DO NOTHING
         RETURNING id`,
        [
          variable.id,
          initialValue,
          versionCurrency(record),
          `${record.source_file} · ${record.source_sheet} · fila ${record.source_row}`,
          record.source_reference_formula || record.source_price_formula || '',
          sourceKey,
          'Carga inicial normalizada desde Variables.xlsx',
        ]
      )
      if (versionResult.rowCount) insertedVersions += 1
    }

    await client.query('COMMIT')
    console.log(`Carga inicial completada: ${insertedVariables} variables nuevas y ${insertedVersions} versiones nuevas.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
