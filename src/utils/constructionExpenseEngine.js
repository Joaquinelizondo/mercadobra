/**
 * constructionExpenseEngine.js
 *
 * Motor de Trazabilidad de Gastos Reales e Imputación en Obra (Punto 5 del Relevamiento).
 * Permite registrar y auditar:
 * 1. Partes diarios de Mano de Obra (jornales convertidos a costo directo y leyes sociales).
 * 2. Facturas y remitos de Materiales con imputación por monto o % y bandeja "sin imputar".
 * 3. Certificados de Subcontratos imputados a rubro.
 * 4. Reporte comparativo por rubro: Presupuestado vs. Real (MO / Materiales / Subcontrato)
 *    con cálculo de desvío y análisis automático de causa (más horas, más materiales, etc.).
 *
 * Diseñado con arquitectura multi-país: sin monedas fijas ni alícuotas hardcodeadas.
 */

import { DEFAULT_SOCIAL_LAWS_RATE } from './constructionLaborCategories.js'

/**
 * Partes diarios iniciales de ejemplo (realistas para obra)
 */
export const DEFAULT_LABOR_REPORTS = [
  {
    id: 'lr-1',
    date: '2026-09-08',
    taskId: 1, // Replanteo y Movimiento de Suelos
    taskName: 'Replanteo y Movimiento de Suelos',
    rubroId: 'fundaciones',
    rubroName: 'Movimiento de Suelos & Fundaciones',
    crew: [
      { role: 'Capataz', quantity: 1, dailyRate: 4200 },
      { role: 'Oficial', quantity: 2, dailyRate: 3100 },
      { role: 'Peón Práctico', quantity: 2, dailyRate: 2350 }
    ],
    socialLawsRate: 60,
    totalJournals: 5,
    laborDirectCost: 15100,
    socialLawsCost: 9060,
    totalLaborCost: 24160,
    notes: 'Replanteo de ejes principales y nivelación topográfica con estación total.'
  },
  {
    id: 'lr-2',
    date: '2026-09-15',
    taskId: 2, // Excavación para Zapatas
    taskName: 'Excavación para Zapatas',
    rubroId: 'fundaciones',
    rubroName: 'Movimiento de Suelos & Fundaciones',
    crew: [
      { role: 'Oficial Especializado', quantity: 1, dailyRate: 3400 },
      { role: 'Oficial', quantity: 1, dailyRate: 3100 },
      { role: 'Peón Práctico', quantity: 3, dailyRate: 2350 }
    ],
    socialLawsRate: 60,
    totalJournals: 5,
    laborDirectCost: 13550,
    socialLawsCost: 8130,
    totalLaborCost: 21680,
    notes: 'Apertura de zanjas en sector sur y perfilado manual de zapatas.'
  },
  {
    id: 'lr-3',
    date: '2026-09-22',
    taskId: 3, // Encofrado y Armado de Columnas
    taskName: 'Encofrado y Armado de Columnas',
    rubroId: 'estructura',
    rubroName: 'Estructura de Hormigón Armado',
    crew: [
      { role: 'Oficial Especializado', quantity: 2, dailyRate: 3400 },
      { role: 'Oficial', quantity: 2, dailyRate: 3100 },
      { role: 'Medio Oficial', quantity: 2, dailyRate: 2650 },
      { role: 'Peón Práctico', quantity: 2, dailyRate: 2350 }
    ],
    socialLawsRate: 60,
    totalJournals: 8,
    laborDirectCost: 23000,
    socialLawsCost: 13800,
    totalLaborCost: 36800,
    notes: 'Armado de estribos y colocación de moldes metálicos de columnas C1 a C6.'
  }
]

/**
 * Facturas y remitos iniciales de materiales
 */
export const DEFAULT_MATERIAL_INVOICES = [
  {
    id: 'inv-1',
    invoiceNumber: 'FC-A-004812',
    supplier: 'Barraca Central S.A.',
    date: '2026-09-10',
    totalAmount: 185000,
    currency: 'UYU',
    photoUrl: null,
    status: 'assigned', // 'assigned' | 'partially_assigned' | 'unassigned'
    allocations: [
      {
        taskId: 1,
        taskName: 'Replanteo y Movimiento de Suelos',
        rubroId: 'fundaciones',
        rubroName: 'Movimiento de Suelos & Fundaciones',
        amount: 185000,
        percentage: 100,
        notes: 'Tablas de encofrado, estacas de replanteo y alambre'
      }
    ]
  },
  {
    id: 'inv-2',
    invoiceNumber: 'FC-B-109204',
    supplier: 'Aceros & Perfiles del Plata',
    date: '2026-09-18',
    totalAmount: 420000,
    currency: 'UYU',
    photoUrl: null,
    status: 'assigned',
    allocations: [
      {
        taskId: 3,
        taskName: 'Encofrado y Armado de Columnas',
        rubroId: 'estructura',
        rubroName: 'Estructura de Hormigón Armado',
        amount: 320000,
        percentage: 76.19,
        notes: 'Hierro conformado de 12mm y 8mm para columnas'
      },
      {
        taskId: 4,
        taskName: 'Vigas y Losas de Hormigón',
        rubroId: 'estructura',
        rubroName: 'Estructura de Hormigón Armado',
        amount: 100000,
        percentage: 23.81,
        notes: 'Hierro para vigas de encadenado'
      }
    ]
  },
  {
    id: 'inv-3',
    invoiceNumber: 'FC-A-099231',
    supplier: 'Hormigones & Canteras del Este',
    date: '2026-09-24',
    totalAmount: 125000,
    currency: 'UYU',
    photoUrl: null,
    status: 'unassigned', // Factura pendiente en bandeja sin imputar
    allocations: []
  }
]

/**
 * Certificados iniciales de subcontratos
 */
export const DEFAULT_SUBCONTRACT_CERTIFICATES = [
  {
    id: 'sub-1',
    certificateNumber: 'CERT-SUB-01',
    contractId: 'contract-1',
    subcontractorName: 'Geoperforaciones & Pilotajes Uruguay',
    rubroId: 'fundaciones',
    rubroName: 'Movimiento de Suelos & Fundaciones',
    date: '2026-09-12',
    amount: 350000,
    currency: 'UYU',
    notes: 'Certificado N° 1: Ensayos de suelo y perforación de pozos de cateo'
  },
  {
    id: 'sub-2',
    certificateNumber: 'CERT-SUB-02',
    contractId: 'contract-2',
    subcontractorName: 'Óxida Herrería Estructural & Metalúrgica',
    rubroId: 'herreria',
    rubroName: 'Herrería de Obra & Estructuras (Óxida)',
    date: '2026-09-25',
    amount: 450000,
    currency: 'UYU',
    notes: 'Anticipo 30% fabricación de pilares IPN y anclajes metálicos'
  }
]

/**
 * Contratos iniciales de subcontrato con techo presupuestal y adicionales (Punto 11)
 */
export const DEFAULT_SUBCONTRACT_CONTRACTS = [
  {
    id: 'contract-1',
    contractNumber: 'CTR-GEO-2026',
    subcontractorName: 'Geoperforaciones & Pilotajes Uruguay',
    rubroId: 'fundaciones',
    rubroName: 'Movimiento de Suelos & Fundaciones',
    baseAmount: 800000,
    retentionRate: 5, // 5% de fondo de reparo / garantía
    status: 'active', // 'active' | 'completed' | 'terminated'
    startDate: '2026-09-01',
    endDate: '2026-10-30',
    notes: 'Contrato de perforaciones, cateos y zapatas profundas.',
    additionals: [
      {
        id: 'add-1-1',
        code: 'AD-01',
        description: 'Ampliación de pozos de cateo sector norte por roca dura',
        amount: 150000,
        approvedDate: '2026-09-18',
        approvedBy: 'Ing. Residente',
        notes: 'Aprobado por acta técnica N° 04'
      }
    ]
  },
  {
    id: 'contract-2',
    contractNumber: 'CTR-OXI-2026',
    subcontractorName: 'Óxida Herrería Estructural & Metalúrgica',
    rubroId: 'herreria',
    rubroName: 'Herrería de Obra & Estructuras (Óxida)',
    baseAmount: 1200000,
    retentionRate: 5,
    status: 'active',
    startDate: '2026-09-15',
    endDate: '2026-12-15',
    notes: 'Fabricación y montaje de estructuras de hierro y perfiles IPN.',
    additionals: []
  }
]

/**
 * Punto 11: Calcula el balance y estado contractual de un subcontratista
 * (Techo contractual, adicionales en líneas separadas, fondo de reparo 5% y saldo disponible).
 */
export function calculateSubcontractContractStatus(contract, certificates = []) {
  if (!contract) {
    return {
      baseAmount: 0,
      additionalsAmount: 0,
      revisedCeiling: 0,
      totalCertifiedGross: 0,
      retentionRate: 5,
      totalRetentionAmount: 0,
      totalPayableNet: 0,
      availableBalance: 0,
      percentConsumed: 0,
      status: 'normal',
      alertMessage: ''
    }
  }

  const baseAmount = Math.max(0, Number(contract.baseAmount) || 0)
  const additionals = Array.isArray(contract.additionals) ? contract.additionals : []
  const additionalsAmount = additionals.reduce((sum, a) => sum + (Math.max(0, Number(a.amount) || 0)), 0)
  const revisedCeiling = baseAmount + additionalsAmount

  // Filtrar certificados vinculados por ID de contrato o nombre de subcontratista
  const matchedCertificates = (certificates || []).filter(c => {
    if (c.contractId && contract.id) return c.contractId === contract.id
    if (c.subcontractorName && contract.subcontractorName) {
      return c.subcontractorName.trim().toLowerCase() === contract.subcontractorName.trim().toLowerCase()
    }
    return false
  })

  const totalCertifiedGross = matchedCertificates.reduce((sum, c) => sum + (Math.max(0, Number(c.amount) || 0)), 0)
  const retentionRate = contract.retentionRate != null && !Number.isNaN(Number(contract.retentionRate))
    ? Number(contract.retentionRate)
    : 5

  const totalRetentionAmount = Math.round(totalCertifiedGross * (retentionRate / 100))
  const totalPayableNet = totalCertifiedGross - totalRetentionAmount
  const availableBalance = revisedCeiling - totalCertifiedGross
  const percentConsumed = revisedCeiling > 0
    ? Math.round((totalCertifiedGross / revisedCeiling) * 1000) / 10
    : 0

  let status = 'normal'
  let alertMessage = '🟢 En saldo contractual disponible'

  if (availableBalance < 0) {
    status = 'over_ceiling'
    alertMessage = `🚨 Exceso de contrato: Supera el techo vigente por $${Math.abs(availableBalance).toLocaleString('es-UY')}`
  } else if (percentConsumed >= 80) {
    status = 'warning_ceiling'
    alertMessage = `⚠️ Atención: Consumido el ${percentConsumed}% del techo contractual ($${availableBalance.toLocaleString('es-UY')} disponible)`
  }

  return {
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    subcontractorName: contract.subcontractorName,
    rubroId: contract.rubroId,
    rubroName: contract.rubroName,
    baseAmount,
    additionalsCount: additionals.length,
    additionalsAmount,
    revisedCeiling,
    certificatesCount: matchedCertificates.length,
    totalCertifiedGross,
    retentionRate,
    totalRetentionAmount,
    totalPayableNet,
    availableBalance,
    percentConsumed,
    status,
    alertMessage,
    isOverCeiling: availableBalance < 0,
    isNearCeiling: percentConsumed >= 80 && availableBalance >= 0
  }
}

/**
 * Punto 11: Valida si la emisión de un nuevo certificado excedería el techo contractual.
 */
export function validateSubcontractCertificate(contract, newAmount, existingCertificates = []) {
  const currentStatus = calculateSubcontractContractStatus(contract, existingCertificates)
  const certAmount = Math.max(0, Number(newAmount) || 0)
  const remainingAfter = currentStatus.availableBalance - certAmount
  const willExceed = remainingAfter < 0

  return {
    isValid: !willExceed,
    currentAvailable: currentStatus.availableBalance,
    newAmount: certAmount,
    remainingAfter,
    willExceed,
    excessAmount: willExceed ? Math.abs(remainingAfter) : 0,
    warning: willExceed
      ? `El certificado ($${certAmount.toLocaleString('es-UY')}) supera el saldo contractual disponible ($${currentStatus.availableBalance.toLocaleString('es-UY')}) por $${Math.abs(remainingAfter).toLocaleString('es-UY')}. Se requiere aprobar un Adicional o adenda de contrato.`
      : undefined
  }
}

/**
 * Punto 11: Calcula el resumen consolidado de todos los subcontratos de la obra.
 */
export function calculateAllContractsSummary(contracts = [], certificates = []) {
  let totalBaseContracts = 0
  let totalApprovedAdditionals = 0
  let totalRevisedCeiling = 0
  let totalCertifiedGross = 0
  let totalRetentionGuarantee = 0
  let totalPayableNet = 0
  let totalRemainingBalance = 0
  let contractsOverCeilingCount = 0
  let contractsNearCeilingCount = 0

  const items = (contracts || []).map(contract => {
    const status = calculateSubcontractContractStatus(contract, certificates)
    totalBaseContracts += status.baseAmount
    totalApprovedAdditionals += status.additionalsAmount
    totalRevisedCeiling += status.revisedCeiling
    totalCertifiedGross += status.totalCertifiedGross
    totalRetentionGuarantee += status.totalRetentionAmount
    totalPayableNet += status.totalPayableNet
    totalRemainingBalance += status.availableBalance

    if (status.isOverCeiling) contractsOverCeilingCount++
    if (status.isNearCeiling) contractsNearCeilingCount++

    return status
  })

  return {
    totalContracts: contracts.length,
    totalBaseContracts,
    totalApprovedAdditionals,
    totalRevisedCeiling,
    totalCertifiedGross,
    totalRetentionGuarantee,
    totalPayableNet,
    totalRemainingBalance,
    contractsOverCeilingCount,
    contractsNearCeilingCount,
    items
  }
}

/**
 * Calcula los totales de costo de mano de obra y leyes sociales de un parte diario.
 * Soporta alícuotas configurables y plantillas de cuadrillas mixtas.
 */
export function calculateLaborReportCost(report, defaultSocialRate = DEFAULT_SOCIAL_LAWS_RATE) {
  if (!report || !Array.isArray(report.crew)) {
    return {
      totalJournals: 0,
      laborDirectCost: 0,
      socialLawsCost: 0,
      totalLaborCost: 0
    }
  }

  const effectiveSocialRate = report.socialLawsRate != null && !Number.isNaN(Number(report.socialLawsRate))
    ? (Number(report.socialLawsRate) > 1 ? Number(report.socialLawsRate) / 100 : Number(report.socialLawsRate))
    : (defaultSocialRate > 1 ? defaultSocialRate / 100 : defaultSocialRate)

  let totalJournals = 0
  let laborDirectCost = 0

  for (const worker of report.crew) {
    const qty = Math.max(0, Number(worker.quantity) || 0)
    const rate = Math.max(0, Number(worker.dailyRate) || 0)
    totalJournals += qty
    laborDirectCost += qty * rate
  }

  const socialLawsCost = Math.round(laborDirectCost * effectiveSocialRate)
  const totalLaborCost = laborDirectCost + socialLawsCost

  return {
    totalJournals,
    laborDirectCost: Math.round(laborDirectCost),
    socialLawsCost,
    totalLaborCost
  }
}

/**
 * Calcula la suma de montos imputados y el remanente disponible de una factura.
 */
export function calculateInvoiceAllocationTotals(invoice) {
  if (!invoice) {
    return {
      totalAmount: 0,
      allocatedAmount: 0,
      unassignedAmount: 0,
      allocatedPercent: 0,
      isFullyAssigned: false,
      isUnassigned: true
    }
  }

  const totalAmount = Math.max(0, Number(invoice.totalAmount) || 0)
  const allocations = Array.isArray(invoice.allocations) ? invoice.allocations : []

  const allocatedAmount = allocations.reduce((sum, alloc) => sum + (Number(alloc.amount) || 0), 0)
  const unassignedAmount = Math.max(0, totalAmount - allocatedAmount)
  const allocatedPercent = totalAmount > 0 ? Math.min(100, Math.round((allocatedAmount / totalAmount) * 1000) / 10) : 0

  return {
    totalAmount,
    allocatedAmount: Math.round(allocatedAmount),
    unassignedAmount: Math.round(unassignedAmount),
    allocatedPercent,
    isFullyAssigned: unassignedAmount <= 0.01 && totalAmount > 0,
    isUnassigned: allocatedAmount <= 0.01
  }
}

/**
 * Obtiene la bandeja de facturas pendientes de imputación (saldo sin asignar > 0).
 */
export function getUnassignedInvoices(invoices = []) {
  if (!Array.isArray(invoices)) return { list: [], count: 0, totalPendingAmount: 0 }

  const pending = []
  let totalPendingAmount = 0

  for (const inv of invoices) {
    const totals = calculateInvoiceAllocationTotals(inv)
    if (totals.unassignedAmount > 0) {
      pending.push({
        ...inv,
        allocatedAmount: totals.allocatedAmount,
        unassignedAmount: totals.unassignedAmount,
        allocatedPercent: totals.allocatedPercent
      })
      totalPendingAmount += totals.unassignedAmount
    }
  }

  return {
    list: pending,
    count: pending.length,
    totalPendingAmount: Math.round(totalPendingAmount)
  }
}

/**
 * Genera el reporte comparativo por Rubro: Presupuestado vs. Real
 * Desglosando Mano de Obra, Leyes Sociales, Materiales y Subcontratos,
 * con cálculo de desvío y análisis automático de causa.
 */
export function calculateRubroExpensesReport(
  rubros = [],
  laborReports = [],
  materialInvoices = [],
  subcontractCertificates = [],
  options = {}
) {
  const socialRate = options.socialLawsRate != null ? options.socialLawsRate : DEFAULT_SOCIAL_LAWS_RATE

  const reportItems = rubros.map(rubro => {
    const rubroId = rubro.id

    // Presupuestado
    const budgetedMO = Number(rubro.laborCost) || 0
    const budgetedLLSS = Number(rubro.socialLawsCost) || Math.round(budgetedMO * (socialRate > 1 ? socialRate / 100 : socialRate))
    const budgetedMatSub = Number(rubro.materialCost) || 0
    const budgetedTotal = budgetedMO + budgetedLLSS + budgetedMatSub || Number(rubro.budgeted) || 0

    // 1. Real Mano de Obra & Leyes Sociales de partes diarios imputados
    const matchingLabor = laborReports.filter(lr => lr.rubroId === rubroId)
    let realMO = 0
    let realLLSS = 0
    let realJournals = 0

    for (const lr of matchingLabor) {
      const costs = calculateLaborReportCost(lr, socialRate)
      realMO += costs.laborDirectCost
      realLLSS += costs.socialLawsCost
      realJournals += costs.totalJournals
    }

    // 2. Real Materiales imputados desde facturas
    let realMaterials = 0
    let invoiceCount = 0

    for (const inv of materialInvoices) {
      if (Array.isArray(inv.allocations)) {
        for (const alloc of inv.allocations) {
          if (alloc.rubroId === rubroId) {
            realMaterials += Number(alloc.amount) || 0
            invoiceCount++
          }
        }
      }
    }

    // 3. Real Subcontratos imputados desde certificados
    const matchingSubcontracts = subcontractCertificates.filter(sub => sub.rubroId === rubroId)
    let realSubcontracts = 0
    for (const sub of matchingSubcontracts) {
      realSubcontracts += Number(sub.amount) || 0
    }

    // Si no hay gastos detallados imputados pero el rubro tiene un ejecutado manual histórico,
    // se mantiene como fallback de retrocompatibilidad.
    const hasDetailedReal = realMO > 0 || realLLSS > 0 || realMaterials > 0 || realSubcontracts > 0
    const realTotal = hasDetailedReal
      ? (realMO + realLLSS + realMaterials + realSubcontracts)
      : (Number(rubro.executed) || 0)

    const diff = realTotal - budgetedTotal // Positivo = sobrecosto, Negativo = bajo presupuesto
    const balance = budgetedTotal - realTotal // Positivo = saldo disponible, Negativo = déficit
    const percentConsumed = budgetedTotal > 0 ? Math.round((realTotal / budgetedTotal) * 1000) / 10 : 0

    // Diagnóstico de Causa de Desvío
    let deviationCause = 'Dentro del presupuesto previsto'
    let deviationType = 'normal' // 'normal' | 'labor' | 'material' | 'subcontract' | 'critical'

    if (diff > 0) {
      // Analizar cuál componente provocó el exceso
      const moDiff = (realMO + realLLSS) - (budgetedMO + budgetedLLSS)
      const matDiff = realMaterials - budgetedMatSub
      const subDiff = realSubcontracts - budgetedMatSub

      if (moDiff > 0 && moDiff >= matDiff && moDiff >= subDiff) {
        deviationCause = `Mayor consumo de jornales en obra (+${realJournals} jornales registrados)`
        deviationType = 'labor'
      } else if (matDiff > 0 && matDiff >= moDiff && matDiff >= subDiff) {
        deviationCause = `Sobrecosto en materiales de obra (+${invoiceCount} facturas imputadas)`
        deviationType = 'material'
      } else if (subDiff > 0) {
        deviationCause = `Exceso en certificados de subcontratista (+${matchingSubcontracts.length} certs)`
        deviationType = 'subcontract'
      } else {
        deviationCause = 'Sobrecosto acumulado distribuido en múltiples componentes'
        deviationType = 'critical'
      }
    } else if (percentConsumed >= 85) {
      deviationCause = 'Próximo al límite presupuestario (>= 85%)'
      deviationType = 'warning'
    } else if (!hasDetailedReal && (Number(rubro.executed) || 0) > 0) {
      deviationCause = 'Carga manual histórica sin imputación detallada'
      deviationType = 'manual'
    }

    return {
      id: rubroId,
      name: rubro.name,
      // Presupuesto
      budgetedMO: Math.round(budgetedMO),
      budgetedLLSS: Math.round(budgetedLLSS),
      budgetedMatSub: Math.round(budgetedMatSub),
      budgetedTotal: Math.round(budgetedTotal),
      // Real
      realMO: Math.round(realMO),
      realLLSS: Math.round(realLLSS),
      realMaterials: Math.round(realMaterials),
      realSubcontracts: Math.round(realSubcontracts),
      realTotal: Math.round(realTotal),
      hasDetailedReal,
      // Desvíos y Balance
      diff: Math.round(diff),
      balance: Math.round(balance),
      percentConsumed,
      realJournals,
      invoiceCount,
      subcontractCount: matchingSubcontracts.length,
      deviationCause,
      deviationType,
      status: percentConsumed > 100 ? 'critical' : percentConsumed >= 85 ? 'warning' : 'normal'
    }
  })

  // Totales consolidados de la obra
  const totals = reportItems.reduce((acc, item) => {
    acc.budgetedMO += item.budgetedMO
    acc.budgetedLLSS += item.budgetedLLSS
    acc.budgetedMatSub += item.budgetedMatSub
    acc.budgetedTotal += item.budgetedTotal
    acc.realMO += item.realMO
    acc.realLLSS += item.realLLSS
    acc.realMaterials += item.realMaterials
    acc.realSubcontracts += item.realSubcontracts
    acc.realTotal += item.realTotal
    acc.balance += item.balance
    acc.realJournals += item.realJournals
    acc.invoiceCount += item.invoiceCount
    return acc
  }, {
    budgetedMO: 0,
    budgetedLLSS: 0,
    budgetedMatSub: 0,
    budgetedTotal: 0,
    realMO: 0,
    realLLSS: 0,
    realMaterials: 0,
    realSubcontracts: 0,
    realTotal: 0,
    balance: 0,
    realJournals: 0,
    invoiceCount: 0
  })

  totals.percentConsumed = totals.budgetedTotal > 0
    ? Math.round((totals.realTotal / totals.budgetedTotal) * 1000) / 10
    : 0

  return {
    items: reportItems,
    totals,
    criticalRubrosCount: reportItems.filter(r => r.status === 'critical').length,
    warningRubrosCount: reportItems.filter(r => r.status === 'warning').length
  }
}

