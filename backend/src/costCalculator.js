const MONEY_PRECISION = 2

function round(value, decimals = MONEY_PRECISION) {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function asFiniteNumber(value, label, { min = 0, max = Number.POSITIVE_INFINITY, exclusiveMax = false } = {}) {
  const number = Number(value)
  const maxValid = exclusiveMax ? number < max : number <= max
  if (!Number.isFinite(number) || number < min || !maxValid) {
    const boundary = exclusiveMax ? `< ${max}` : `≤ ${max}`
    throw new Error(`${label} debe ser un número entre ${min} y ${boundary}.`)
  }
  return number
}

function normalizeLine(line, index) {
  const quantity = asFiniteNumber(line.quantity, `La cantidad de la línea ${index + 1}`, { min: 0 })
  const unitCostUyu = asFiniteNumber(line.unitCostUyu, `El costo unitario de la línea ${index + 1}`, { min: 0 })
  const wasteRate = asFiniteNumber(line.wasteRate ?? 0, `El desperdicio de la línea ${index + 1}`, { min: 0, max: 1, exclusiveMax: true })
  const subtotalUyu = round(quantity * unitCostUyu * (1 + wasteRate))

  return {
    code: String(line.code || `LINE-${index + 1}`),
    description: String(line.description || ''),
    quantity,
    unit: String(line.unit || 'un'),
    unitCostUyu,
    wasteRate,
    subtotalUyu,
  }
}

/**
 * Calcula una cotización comercial en USD a partir de costos internos en UYU.
 * El tipo de cambio esperado es UYU recibidos por cada USD (BROU Dólar / Compra).
 */
export function calculateQuote({
  lines,
  overheadRate,
  grossMarginRate,
  exchangeRateUyuPerUsd,
  taxRate,
}) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('La cotización debe incluir al menos una línea de costo.')
  }

  const normalizedLines = lines.map(normalizeLine)
  const normalizedOverheadRate = asFiniteNumber(overheadRate, 'Los gastos generales', { min: 0, max: 1, exclusiveMax: true })
  const normalizedGrossMarginRate = asFiniteNumber(grossMarginRate, 'El margen bruto', { min: 0, max: 1, exclusiveMax: true })
  const normalizedExchangeRate = asFiniteNumber(exchangeRateUyuPerUsd, 'La cotización UYU/USD', { min: Number.EPSILON })
  const normalizedTaxRate = asFiniteNumber(taxRate, 'El IVA', { min: 0, max: 1, exclusiveMax: true })

  const directCostUyu = round(normalizedLines.reduce((total, line) => total + line.subtotalUyu, 0))
  const overheadUyu = round(directCostUyu * normalizedOverheadRate)
  const completeCostUyu = round(directCostUyu + overheadUyu)
  const priceBeforeTaxUyu = round(completeCostUyu / (1 - normalizedGrossMarginRate))
  const priceBeforeTaxUsd = round(priceBeforeTaxUyu / normalizedExchangeRate)
  const taxUsd = round(priceBeforeTaxUsd * normalizedTaxRate)
  const priceFinalUsd = round(priceBeforeTaxUsd + taxUsd)

  return {
    currency: 'USD',
    exchangeRate: {
      baseCurrency: 'UYU',
      quoteCurrency: 'USD',
      uyuPerUsd: normalizedExchangeRate,
      rateType: 'compra',
    },
    lines: normalizedLines,
    rates: {
      overheadRate: normalizedOverheadRate,
      grossMarginRate: normalizedGrossMarginRate,
      taxRate: normalizedTaxRate,
    },
    totals: {
      directCostUyu,
      overheadUyu,
      completeCostUyu,
      priceBeforeTaxUyu,
      priceBeforeTaxUsd,
      taxUsd,
      priceFinalUsd,
    },
    trace: [
      'subtotal_linea_uyu = cantidad × costo_unitario_uyu × (1 + desperdicio)',
      'costo_completo_uyu = costo_directo_uyu + gastos_generales_uyu',
      'precio_sin_iva_uyu = costo_completo_uyu ÷ (1 - margen_bruto)',
      'precio_sin_iva_usd = precio_sin_iva_uyu ÷ cotizacion_uyu_por_usd',
      'precio_final_usd = precio_sin_iva_usd + iva_usd',
    ],
  }
}
