import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateTaskPlannedPercent,
  calculateProjectEVM,
  getTaskTotalBudget
} from './constructionEVM.js'

test('calculateTaskPlannedPercent calcula el avance esperado según calendario y días hábiles', () => {
  const task = {
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    workDays: 20
  }

  // Antes de empezar
  assert.equal(calculateTaskPlannedPercent(task, '2026-09-20'), 0)

  // Luego de finalizar
  assert.equal(calculateTaskPlannedPercent(task, '2026-11-05'), 100)

  // En la mitad (aprox 15 oct)
  const mid = calculateTaskPlannedPercent(task, '2026-10-15')
  assert.ok(mid >= 40 && mid <= 60, `Avance calculado a mitad de mes: ${mid}%`)
})

test('calculateProjectEVM distingue correctamente un atraso de un ahorro de costos (Ítem 10)', () => {
  // Caso del documento: La tarea debería estar al 50% ($500.000 planificados)
  // pero solo avanzó un 10% (Valor Ganado = $100.000) y se gastaron $120.000 reales.
  // En el sistema anterior, como gastó $120.000 vs $500.000 presupuestados, decía falsamente "En presupuesto".
  // Con EVM:
  // EV = $100.000
  // PV = $500.000
  // AC = $120.000
  // SV = EV - PV = -$400.000 (Atraso crítico!)
  // CV = EV - AC = -$20.000 (Sobrecosto real respecto a lo producido!)
  // CPI = 100000 / 120000 = 0.83 (Crítico < 0.90)
  // SPI = 100000 / 500000 = 0.20 (Crítico < 0.90)

  const tasks = [
    {
      id: 1,
      name: 'Fundaciones',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      assignedLaborCost: 400000,
      socialLawsCost: 240000,
      materialCost: 360000, // Total = 1.000.000
      progressPercent: 10
    }
  ]

  // En la mitad del mes (corte 16 oct, plan ~50%)
  const evm = calculateProjectEVM(tasks, { totalActualCost: 120000 }, '2026-10-16')

  assert.equal(evm.bac, 1000000)
  assert.equal(evm.ev, 100000) // 10% de 1.000.000
  assert.ok(evm.pv >= 450000, `PV esperado ~500k, dio ${evm.pv}`)
  assert.equal(evm.ac, 120000)

  // CV debe ser negativo (-20.000)
  assert.equal(evm.cv, -20000)
  assert.ok(evm.sv < -300000, `SV debe ser fuertemente negativo por atraso: ${evm.sv}`)
  assert.equal(evm.cpi, 0.83)
  assert.ok(evm.spi <= 0.25)
  assert.equal(evm.statusCost, 'critical')
  assert.equal(evm.statusSchedule, 'critical')
})
