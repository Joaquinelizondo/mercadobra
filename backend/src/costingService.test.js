import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCircularTable } from './costingService.js'

const values = {
  PU_CHAPA_PARRILLERO: 1200, PU_TUBO40: 200, PU_CONS_SOLDADURA: 350,
  PU_HH_OFICIAL: 700, PU_HH_AYUDANTE: 500, PU_FONDO: 17,
  PU_ESMALTE_PU: 17, PU_FLETE_VIAJE: 25000, PU_GASTOS_GRALES: 0.1,
  PU_BENEFICIO: 0.35, PU_IVA: 0.22,
}
const variables = Object.entries(values).map(([code, value], index) => ({ code, value, description: code, referenceUnit: 'un', versionId: index + 1 }))

test('calcula una mesa circular con variables versionadas', () => {
  const result = calculateCircularTable({ diameterM: 1.2, heightM: 0.75, quantity: 1, exchangeRateUyuPerUsd: 40, includeFreight: false }, variables)
  assert.equal(result.template.code, 'MESA_CIRCULAR_001')
  assert.equal(result.lines.length, 7)
  assert.ok(result.totals.priceFinalUsd > 0)
  assert.ok(result.derived.areaTopM2 > 1.13 && result.derived.areaTopM2 < 1.14)
})

test('agrega el flete solo cuando se solicita', () => {
  const result = calculateCircularTable({ diameterM: 1, heightM: 0.75, quantity: 2, exchangeRateUyuPerUsd: 40, includeFreight: true, freightTrips: 2 }, variables)
  assert.equal(result.lines.at(-1).code, 'PU_FLETE_VIAJE')
  assert.equal(result.lines.at(-1).quantity, 2)
})
