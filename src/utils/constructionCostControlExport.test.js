import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateCostControlReportData,
  exportCostControlToCsv
} from './constructionCostControlExport.js'

test('generateCostControlReportData procesa tareas y calcula desvíos y saldos correctamente', () => {
  const schedule = [
    {
      id: 'task-1',
      name: 'Fundaciones y Excavación',
      startDate: '2026-10-01',
      endDate: '2026-10-15',
      progressPercent: 100
    },
    {
      id: 'task-2',
      name: 'Estructura de Hormigón',
      startDate: '2026-10-16',
      endDate: '2026-10-31',
      progressPercent: 50
    }
  ]

  const byTask = new Map()
  byTask.set('task-1', {
    budget: 100000,
    plannedPct: 100,
    plannedToDate: 100000,
    executed: 110000,
    variance: 10000,
    costDetails: { mode: 'actual' }
  })
  byTask.set('task-2', {
    budget: 200000,
    plannedPct: 100,
    plannedToDate: 200000,
    executed: 90000,
    variance: -110000,
    costDetails: { mode: 'auto' }
  })

  const costControl = {
    byTask,
    totalPlannedToDate: 300000,
    totalExecuted: 200000,
    totalVariance: -100000,
    variancePct: -33,
    plannedPctOfTotal: 100,
    executedPctOfTotal: 67
  }

  const report = generateCostControlReportData(schedule, costControl, {
    projectName: 'Torre del Parque',
    costCutoffDate: '2026-10-31',
    totalProjectBudget: 300000
  })

  assert.equal(report.projectName, 'Torre del Parque')
  assert.equal(report.costCutoffDate, '2026-10-31')
  assert.equal(report.totalProjectBudget, 300000)
  assert.equal(report.totalPlannedToDate, 300000)
  assert.equal(report.totalExecuted, 200000)
  assert.equal(report.totalVariance, -100000)
  assert.equal(report.variancePct, -33)
  assert.equal(report.rows.length, 2)

  const row1 = report.rows[0]
  assert.equal(row1.name, 'Fundaciones y Excavación')
  assert.equal(row1.budget, 100000)
  assert.equal(row1.executed, 110000)
  assert.equal(row1.costVariance, 10000)
  assert.equal(row1.costVariancePct, 10)
  assert.equal(row1.costStatus, 'Sobrecosto')
  assert.equal(row1.balance, 0)

  const row2 = report.rows[1]
  assert.equal(row2.name, 'Estructura de Hormigón')
  assert.equal(row2.budget, 200000)
  assert.equal(row2.executed, 90000)
  assert.equal(row2.costVariance, -110000)
  assert.equal(row2.costStatus, 'Ahorro / Menor Ejecución')
  assert.equal(row2.balance, 110000)
})

test('exportCostControlToCsv genera formato CSV con BOM y líneas de datos correctas', () => {
  const reportData = {
    projectName: 'Obra Modelo',
    costCutoffDate: '2026-10-20',
    totalProjectBudget: 150000,
    totalPlannedToDate: 100000,
    totalExecuted: 105000,
    totalVariance: 5000,
    variancePct: 5,
    rows: [
      {
        name: 'Mampostería',
        startDate: '2026-10-01',
        endDate: '2026-10-20',
        budget: 150000,
        plannedToDate: 100000,
        plannedPct: 67,
        realPct: 70,
        scheduleDelta: 3,
        executed: 105000,
        costMode: 'actual',
        costVariance: 5000,
        costVariancePct: 5,
        costStatus: 'Sobrecosto',
        balance: 45000
      }
    ]
  }

  const csv = exportCostControlToCsv(reportData)
  assert.ok(csv.startsWith('\uFEFF'), 'CSV debe comenzar con Byte Order Mark UTF-8 para Excel')
  assert.ok(csv.includes('INFORME EJECUTIVO: CONTROL DE COSTOS AL DÍA DE CORTE'))
  assert.ok(csv.includes('Obra Modelo'))
  assert.ok(csv.includes('Mampostería'))
  assert.ok(csv.includes('Sobrecosto'))
  assert.ok(csv.includes('TOTALES CONSOLIDADOS'))
})
