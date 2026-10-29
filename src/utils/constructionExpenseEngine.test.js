import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateLaborReportCost,
  calculateInvoiceAllocationTotals,
  getUnassignedInvoices,
  calculateRubroExpensesReport,
  calculateSubcontractContractStatus,
  validateSubcontractCertificate,
  calculateAllContractsSummary,
  DEFAULT_LABOR_REPORTS,
  DEFAULT_MATERIAL_INVOICES,
  DEFAULT_SUBCONTRACT_CERTIFICATES,
  DEFAULT_SUBCONTRACT_CONTRACTS
} from './constructionExpenseEngine.js'

test('calculateLaborReportCost convierte cuadrilla en jornales, costo MO y leyes sociales al 60%', () => {
  const report = {
    date: '2026-09-08',
    crew: [
      { role: 'Oficial', quantity: 2, dailyRate: 3100 },
      { role: 'Peón Práctico', quantity: 1, dailyRate: 2350 }
    ],
    socialLawsRate: 60
  }

  const result = calculateLaborReportCost(report)
  assert.equal(result.totalJournals, 3)
  // Direct MO: (2 * 3100) + (1 * 2350) = 6200 + 2350 = 8550
  assert.equal(result.laborDirectCost, 8550)
  // LLSS: 8550 * 0.60 = 5130
  assert.equal(result.socialLawsCost, 5130)
  // Total: 8550 + 5130 = 13680
  assert.equal(result.totalLaborCost, 13680)
})

test('calculateInvoiceAllocationTotals calcula saldo sin imputar y porcentaje asignado', () => {
  const invoice = {
    totalAmount: 100000,
    allocations: [
      { taskId: 1, amount: 60000 },
      { taskId: 2, amount: 25000 }
    ]
  }

  const totals = calculateInvoiceAllocationTotals(invoice)
  assert.equal(totals.allocatedAmount, 85000)
  assert.equal(totals.unassignedAmount, 15000)
  assert.equal(totals.allocatedPercent, 85)
  assert.equal(totals.isFullyAssigned, false)
  assert.equal(totals.isUnassigned, false)
})

test('getUnassignedInvoices detecta facturas pendientes en bandeja sin imputar', () => {
  const invoices = [
    { id: '1', totalAmount: 50000, allocations: [{ amount: 50000 }] }, // 100% asignada
    { id: '2', totalAmount: 80000, allocations: [{ amount: 30000 }] }, // remanente 50.000
    { id: '3', totalAmount: 125000, allocations: [] } // sin imputar 125.000
  ]

  const unassigned = getUnassignedInvoices(invoices)
  assert.equal(unassigned.count, 2)
  assert.equal(unassigned.totalPendingAmount, 175000)
  assert.equal(unassigned.list[0].id, '2')
  assert.equal(unassigned.list[0].unassignedAmount, 50000)
  assert.equal(unassigned.list[1].id, '3')
  assert.equal(unassigned.list[1].unassignedAmount, 125000)
})

test('calculateRubroExpensesReport compara Presupuestado vs Real (MO, LLSS, Materiales, Subcontratos)', () => {
  const rubros = [
    { id: 'fundaciones', name: 'Fundaciones', laborCost: 100000, socialLawsCost: 60000, materialCost: 200000, budgeted: 360000 },
    { id: 'estructura', name: 'Estructura', laborCost: 200000, socialLawsCost: 120000, materialCost: 300000, budgeted: 620000 }
  ]

  const laborReports = [
    {
      rubroId: 'fundaciones',
      crew: [{ role: 'Oficial', quantity: 2, dailyRate: 3000 }],
      socialLawsRate: 60
    } // MO = 6000, LLSS = 3600
  ]

  const materialInvoices = [
    {
      allocations: [
        { rubroId: 'fundaciones', amount: 50000 }
      ]
    }
  ]

  const subcontractCertificates = [
    { rubroId: 'fundaciones', amount: 120000 }
  ]

  const report = calculateRubroExpensesReport(rubros, laborReports, materialInvoices, subcontractCertificates)
  assert.equal(report.items.length, 2)

  const fundaciones = report.items[0]
  assert.equal(fundaciones.budgetedTotal, 360000)
  assert.equal(fundaciones.realMO, 6000)
  assert.equal(fundaciones.realLLSS, 3600)
  assert.equal(fundaciones.realMaterials, 50000)
  assert.equal(fundaciones.realSubcontracts, 120000)
  assert.equal(fundaciones.realTotal, 179600)
  assert.equal(fundaciones.balance, 180400) // 360.000 - 179.600
  assert.equal(fundaciones.status, 'normal')
})

test('calculateRubroExpensesReport diagnostica causas de desvío automático (MO vs Materiales)', () => {
  const rubros = [
    { id: 'r1', name: 'Pintura', laborCost: 50000, socialLawsCost: 30000, materialCost: 20000, budgeted: 100000 }
  ]

  // Caso: sobrecosto por exceso de jornales de mano de obra
  const laborOverrun = [
    {
      rubroId: 'r1',
      crew: [{ role: 'Oficial', quantity: 20, dailyRate: 5000 }], // 100.000 MO + 60.000 LLSS = 160.000
      socialLawsRate: 60
    }
  ]

  const reportLabor = calculateRubroExpensesReport(rubros, laborOverrun, [], [])
  const itemLabor = reportLabor.items[0]
  assert.equal(itemLabor.status, 'critical')
  assert.equal(itemLabor.diff > 0, true)
  assert.equal(itemLabor.deviationType, 'labor')
  assert.match(itemLabor.deviationCause, /Mayor consumo de jornales/)

  // Caso: sobrecosto por materiales
  const matOverrunInvoices = [
    { allocations: [{ rubroId: 'r1', amount: 150000 }] }
  ]
  const reportMat = calculateRubroExpensesReport(rubros, [], matOverrunInvoices, [])
  const itemMat = reportMat.items[0]
  assert.equal(itemMat.status, 'critical')
  assert.equal(itemMat.deviationType, 'material')
  assert.match(itemMat.deviationCause, /Sobrecosto en materiales/)
})

test('calculateRubroExpensesReport mantiene fallback para rubros con ejecutado histórico manual', () => {
  const legacyRubros = [
    { id: 'terminaciones', name: 'Terminaciones', budgeted: 500000, executed: 300000 }
  ]

  const report = calculateRubroExpensesReport(legacyRubros, [], [], [])
  const item = report.items[0]
  assert.equal(item.realTotal, 300000)
  assert.equal(item.balance, 200000)
  assert.equal(item.hasDetailedReal, false)
  assert.equal(item.deviationType, 'manual')
})

test('Punto 11: calculateSubcontractContractStatus calcula techo revisado sumando contrato base + adicionales aprobados', () => {
  const contract = {
    id: 'c-1',
    contractNumber: 'CTR-01',
    subcontractorName: 'Vidriería Sur',
    baseAmount: 500000,
    retentionRate: 5,
    additionals: [
      { id: 'ad-1', code: 'AD-01', amount: 80000 }
    ]
  }

  const certificates = [
    { contractId: 'c-1', amount: 200000 }
  ]

  const status = calculateSubcontractContractStatus(contract, certificates)
  assert.equal(status.baseAmount, 500000)
  assert.equal(status.additionalsAmount, 80000)
  assert.equal(status.revisedCeiling, 580000)
  assert.equal(status.totalCertifiedGross, 200000)
  assert.equal(status.availableBalance, 380000)
  assert.equal(status.percentConsumed, 34.5)
  assert.equal(status.status, 'normal')
})

test('Punto 11: calculateSubcontractContractStatus calcula retención de fondo de reparo al 5% y neto a pagar', () => {
  const contract = {
    id: 'c-1',
    baseAmount: 1000000,
    retentionRate: 5,
    additionals: []
  }

  const certificates = [
    { contractId: 'c-1', amount: 400000 }
  ]

  const status = calculateSubcontractContractStatus(contract, certificates)
  // Fondo de reparo al 5%: 400.000 * 0.05 = 20.000
  assert.equal(status.totalRetentionAmount, 200000 * 0.05 * 2)
  assert.equal(status.totalRetentionAmount, 20000)
  // Neto a liquidar: 400.000 - 20.000 = 380.000
  assert.equal(status.totalPayableNet, 380000)
})

test('Punto 11: calculateSubcontractContractStatus emite alerta al 80% y detecta sobrecosto al superar el techo', () => {
  const contract = {
    id: 'c-1',
    baseAmount: 100000,
    retentionRate: 5,
    additionals: []
  }

  // 1. Al 85% consumido: Alerta de aproximación
  const certsWarning = [{ contractId: 'c-1', amount: 85000 }]
  const statusWarning = calculateSubcontractContractStatus(contract, certsWarning)
  assert.equal(statusWarning.status, 'warning_ceiling')
  assert.equal(statusWarning.isNearCeiling, true)
  assert.equal(statusWarning.isOverCeiling, false)

  // 2. Al 110% consumido: Alerta crítica de sobrepaso del techo contractual
  const certsOver = [{ contractId: 'c-1', amount: 110000 }]
  const statusOver = calculateSubcontractContractStatus(contract, certsOver)
  assert.equal(statusOver.status, 'over_ceiling')
  assert.equal(statusOver.isOverCeiling, true)
  assert.equal(statusOver.availableBalance, -10000)
})

test('Punto 11: validateSubcontractCertificate previene exceder el saldo contractual disponible', () => {
  const contract = {
    id: 'c-1',
    baseAmount: 200000,
    retentionRate: 5,
    additionals: []
  }

  const existingCerts = [{ contractId: 'c-1', amount: 150000 }]

  // Certificado válido dentro del saldo restante ($50.000 disponible)
  const valValid = validateSubcontractCertificate(contract, 40000, existingCerts)
  assert.equal(valValid.isValid, true)
  assert.equal(valValid.willExceed, false)
  assert.equal(valValid.remainingAfter, 10000)

  // Certificado que sobrepasa el techo ($70.000 cuando quedan $50.000)
  const valInvalid = validateSubcontractCertificate(contract, 70000, existingCerts)
  assert.equal(valInvalid.isValid, false)
  assert.equal(valInvalid.willExceed, true)
  assert.equal(valInvalid.excessAmount, 20000)
  assert.match(valInvalid.warning, /supera el saldo contractual disponible/)
})

test('Punto 11: calculateAllContractsSummary consolida garantías retenidas y saldo disponible global', () => {
  const summary = calculateAllContractsSummary(DEFAULT_SUBCONTRACT_CONTRACTS, DEFAULT_SUBCONTRACT_CERTIFICATES)
  assert.equal(summary.totalContracts, 2)
  // Contrato 1: 800k base + 150k add = 950k techo. Cert: 350k. Ret: 17.5k. Saldo: 600k
  // Contrato 2: 1200k base + 0 add = 1200k techo. Cert: 450k. Ret: 22.5k. Saldo: 750k
  assert.equal(summary.totalBaseContracts, 2000000)
  assert.equal(summary.totalApprovedAdditionals, 150000)
  assert.equal(summary.totalRevisedCeiling, 2150000)
  assert.equal(summary.totalCertifiedGross, 800000)
  assert.equal(summary.totalRetentionGuarantee, 40000) // 17.500 + 22.500
  assert.equal(summary.totalPayableNet, 760000)
  assert.equal(summary.totalRemainingBalance, 1350000)
  assert.equal(summary.contractsOverCeilingCount, 0)
})

