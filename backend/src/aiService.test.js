import test from 'node:test'
import assert from 'node:assert/strict'
import { parseConstructionRequirement } from './aiService.js'
import { generateConstructionProposal } from './aiProposalService.js'
import { auditQuoteBreakdown } from './aiAuditorService.js'

test('parseConstructionRequirement extrae baranda reglamentaria con medidas y plantilla OXI', async () => {
  const result = await parseConstructionRequirement('Necesito 2 barandas de balcón de 4 metros de largo por 1 metro de alto en caño estructural negro con pintura electrostática')
  assert.ok(result.detected_items?.length >= 1)
  const item = result.detected_items[0]
  assert.equal(item.quantity, 2)
  assert.equal(item.suggested_template, 'OXI_RAILING_R01')
  assert.equal(item.dimensions.length_m, 4)
  assert.equal(item.dimensions.height_m, 1)
})

test('parseConstructionRequirement extrae pérgola y detecta advertencia de terminación faltante', async () => {
  const result = await parseConstructionRequirement('Presupuesto para pérgola de 5x3 metros de 2.6m de alto para terraza')
  assert.ok(result.detected_items?.length >= 1)
  const item = result.detected_items[0]
  assert.equal(item.suggested_template, 'OXI_PERGOLA_P01')
  assert.equal(item.dimensions.length_m, 5)
  assert.equal(item.dimensions.height_m, 2.6)
  assert.ok(result.missing_critical_info.length > 0)
})

test('generateConstructionProposal redacta texto persuasivo con monto exacto', async () => {
  const quote = {
    title: 'Barandas de Balcón Edificio Plaza',
    description: '4 barandas de 3m x 1m en hierro negro',
    totalAmount: 1850,
    currency: 'USD'
  }
  const text = await generateConstructionProposal(quote)
  assert.ok(text.includes('1.850 USD') || text.includes('1850'))
  assert.ok(text.includes('Barandas de Balcón'))
})

test('auditQuoteBreakdown evalúa la salud del margen de la cotización', async () => {
  const breakdownSano = {
    totals: { directCostUyu: 30000, priceBeforeTaxUsd: 1200 },
    rates: { grossMarginRate: 0.35, overheadRate: 0.15 }
  }
  const audit = await auditQuoteBreakdown(breakdownSano)
  assert.equal(audit.status, 'VERDE')
  assert.ok(audit.summary.length > 10)
})
