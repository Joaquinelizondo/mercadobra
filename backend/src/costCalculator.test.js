import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateQuote } from './costCalculator.js'

test('calcula costos en UYU y propuesta final en USD con margen bruto', () => {
  const quote = calculateQuote({
    lines: [
      { code: 'PERFIL', description: 'Perfil metálico', quantity: 2, unit: 'ml', unitCostUyu: 100, wasteRate: 0.05 },
      { code: 'TALLER', description: 'Trabajo de taller', quantity: 1.5, unit: 'h', unitCostUyu: 200 },
    ],
    overheadRate: 0.1,
    grossMarginRate: 0.35,
    exchangeRateUyuPerUsd: 40,
    taxRate: 0.22,
  })

  assert.equal(quote.totals.directCostUyu, 510)
  assert.equal(quote.totals.overheadUyu, 51)
  assert.equal(quote.totals.completeCostUyu, 561)
  assert.equal(quote.totals.priceBeforeTaxUyu, 863.08)
  assert.equal(quote.totals.priceBeforeTaxUsd, 21.58)
  assert.equal(quote.totals.taxUsd, 4.75)
  assert.equal(quote.totals.priceFinalUsd, 26.33)
  assert.equal(quote.exchangeRate.rateType, 'compra')
})

test('no interpreta el margen bruto como recargo sobre costo', () => {
  const quote = calculateQuote({
    lines: [{ quantity: 1, unitCostUyu: 100 }],
    overheadRate: 0,
    grossMarginRate: 0.35,
    exchangeRateUyuPerUsd: 1,
    taxRate: 0,
  })

  assert.equal(quote.totals.priceBeforeTaxUyu, 153.85)
})

test('rechaza una tasa que produciría división por cero o valores negativos', () => {
  assert.throws(
    () => calculateQuote({
      lines: [{ quantity: 1, unitCostUyu: 1 }],
      overheadRate: 0,
      grossMarginRate: 1,
      exchangeRateUyuPerUsd: 40,
      taxRate: 0.22,
    }),
    /margen bruto/
  )
})
