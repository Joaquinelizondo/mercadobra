import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateBpsPayrollReport,
  exportBpsReportToCsv,
  DEFAULT_BPS_EMPLOYEES,
  DEFAULT_BPS_RATES
} from './constructionBpsReportEngine.js'
import { DEFAULT_LABOR_CATEGORIES } from './constructionLaborCategories.js'

const mockLaborReports = [
  {
    id: 'lr-1',
    date: '2026-10-05',
    taskName: 'Fundaciones y Excavación',
    rubroName: 'Fundaciones',
    crew: [
      { role: 'Capataz de Cuadrilla', quantity: 1, dailyRate: 4200 },
      { role: 'Oficial', quantity: 2, dailyRate: 2800 },
      { role: 'Peón Común', quantity: 3, dailyRate: 1950 }
    ]
  },
  {
    id: 'lr-2',
    date: '2026-10-20',
    taskName: 'Encofrado de Vigas',
    rubroName: 'Estructura',
    crew: [
      { role: 'Oficial', quantity: 2, dailyRate: 2800 },
      { role: 'Peón Común', quantity: 2, dailyRate: 1950 }
    ]
  }
]

test('calculates total journals and taxable nominal labor accurately', () => {
  const report = generateBpsPayrollReport({
    project: { name: 'Edificio Carrasco Park', bpsWorkRegistry: 'BPS-OBRA-9988' },
    laborReports: mockLaborReports,
    employees: DEFAULT_BPS_EMPLOYEES,
    laborCategories: DEFAULT_LABOR_CATEGORIES,
    socialLawsRate: 60
  })

  assert.equal(report.totals.reportsCount, 2)
  // Report 1: 1 capataz + 2 oficiales + 3 peones = 6
  // Report 2: 2 oficiales + 2 peones = 4
  // Total journals = 10
  assert.equal(report.totals.totalJournals, 10)

  // Cost:
  // Report 1: (1 * 4200) + (2 * 2800) + (3 * 1950) = 4200 + 5600 + 5850 = 15650
  // Report 2: (2 * 2800) + (2 * 1950) = 5600 + 3900 = 9500
  // Total = 25150
  assert.equal(report.totals.totalDirectLaborCost, 25150)

  // BPS 60%: 25150 * 0.60 = 15090
  assert.equal(report.totals.totalBpsUnified, 15090)

  // FOCER 4%: 25150 * 0.04 = 1006
  assert.equal(report.totals.totalFocer, 1006)

  // BSE 4.5%: 25150 * 0.045 = 1131.75
  assert.equal(report.totals.totalBse, 1131.75)
})

test('filters correctly by quincena', () => {
  // Quincena 1 (days 1-15) -> only lr-1 (2026-10-05)
  const reportQ1 = generateBpsPayrollReport({
    laborReports: mockLaborReports,
    filterMonth: '2026-10',
    filterQuincena: 'q1'
  })

  assert.equal(reportQ1.totals.reportsCount, 1)
  assert.equal(reportQ1.totals.totalJournals, 6)
  assert.equal(reportQ1.totals.totalDirectLaborCost, 15650)

  // Quincena 2 (days 16-end) -> only lr-2 (2026-10-20)
  const reportQ2 = generateBpsPayrollReport({
    laborReports: mockLaborReports,
    filterMonth: '2026-10',
    filterQuincena: 'q2'
  })

  assert.equal(reportQ2.totals.reportsCount, 1)
  assert.equal(reportQ2.totals.totalJournals, 4)
  assert.equal(reportQ2.totals.totalDirectLaborCost, 9500)
})

test('exports valid CSV with required BPS header and employee nominal lines', () => {
  const report = generateBpsPayrollReport({
    project: { name: 'Residencia Pocitos', companyName: 'Óxida Construcciones', bpsWorkRegistry: 'BPS-8877' },
    laborReports: mockLaborReports,
    employees: DEFAULT_BPS_EMPLOYEES
  })

  const csv = exportBpsReportToCsv(report)
  assert.ok(csv.includes('PLANILLA DE PERSONAL Y NÓMINA DE APORTES BPS - LEY 14.411'))
  assert.ok(csv.includes('Residencia Pocitos'))
  assert.ok(csv.includes('BPS-8877'))
  assert.ok(csv.includes('Mano de Obra Nominal Imponible'))
  assert.ok(csv.includes('Aporte Unificado BPS (Ley 14.411)'))
  assert.ok(csv.includes('Washington Rodríguez'))
})
