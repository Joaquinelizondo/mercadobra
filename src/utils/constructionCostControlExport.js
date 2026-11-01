/**
 * constructionCostControlExport.js
 * Generador de informe ejecutivo y exportación en CSV / Excel del
 * Control de Costos al Día de Corte (Presupuesto planificado a la fecha vs. Costo real ejecutado y desvíos).
 */

export function generateCostControlReportData(schedule = [], costControl = {}, options = {}) {
  const {
    projectName = 'Obra',
    costCutoffDate = new Date().toISOString().slice(0, 10),
    totalProjectBudget = 0
  } = options

  const rows = schedule.map(t => {
    const rowCC = costControl.byTask?.get?.(String(t.id)) || {
      budget: 0,
      plannedPct: 0,
      plannedToDate: 0,
      executed: 0,
      variance: 0,
      costDetails: { mode: 'auto' }
    }
    const realPct = Math.min(100, Math.max(0, Number(t.progressPercent) || 0))
    const scheduleDelta = realPct - (rowCC.plannedPct || 0)
    const costVariance = rowCC.variance || 0
    const costVariancePct = rowCC.plannedToDate > 0
      ? Math.round((costVariance / rowCC.plannedToDate) * 100)
      : 0
    const costStatus = costVariance > 0
      ? 'Sobrecosto'
      : costVariance < 0
        ? 'Ahorro / Menor Ejecución'
        : 'En Plan'
    const balance = Math.max(0, (rowCC.budget || 0) - (rowCC.executed || 0))

    return {
      id: t.id,
      name: t.name || 'Sin nombre',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      month: t.month || '',
      dependsOnTaskId: t.dependsOnTaskId || null,
      plannedPct: rowCC.plannedPct || 0,
      realPct,
      scheduleDelta,
      budget: rowCC.budget || 0,
      plannedToDate: rowCC.plannedToDate || 0,
      executed: rowCC.executed || 0,
      costMode: rowCC.costDetails?.mode || 'auto',
      costVariance,
      costVariancePct,
      costStatus,
      balance
    }
  })

  const totalPlannedToDate = costControl.totalPlannedToDate || 0
  const totalExecuted = costControl.totalExecuted || 0
  const totalVariance = costControl.totalVariance || (totalExecuted - totalPlannedToDate)
  const variancePct = totalPlannedToDate > 0
    ? Math.round((totalVariance / totalPlannedToDate) * 100)
    : 0

  return {
    projectName,
    costCutoffDate,
    totalProjectBudget,
    totalPlannedToDate,
    totalExecuted,
    totalVariance,
    variancePct,
    plannedPctOfTotal: costControl.plannedPctOfTotal || (totalProjectBudget > 0 ? Math.round((totalPlannedToDate / totalProjectBudget) * 100) : 0),
    executedPctOfTotal: costControl.executedPctOfTotal || (totalProjectBudget > 0 ? Math.round((totalExecuted / totalProjectBudget) * 100) : 0),
    rows
  }
}

export function exportCostControlToCsv(reportData) {
  const {
    projectName,
    costCutoffDate,
    totalProjectBudget,
    totalPlannedToDate,
    totalExecuted,
    totalVariance,
    variancePct,
    rows = []
  } = reportData

  const escapeCsv = val => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const lines = []

  // Encabezado Corporativo
  lines.push(`"INFORME EJECUTIVO: CONTROL DE COSTOS AL DÍA DE CORTE - OXIPRO / MERCADOBRA"`)
  lines.push(`"Proyecto / Obra:",${escapeCsv(projectName)},"Fecha de Corte:",${escapeCsv(costCutoffDate)},"Fecha de Emisión:",${escapeCsv(new Date().toISOString().slice(0, 10))}`)
  lines.push(`"Presupuesto Total Obra:",${totalProjectBudget},"Presupuestado a la Fecha:",${totalPlannedToDate},"Costo Real Ejecutado:",${totalExecuted},"Desvío Consolidado ($):",${totalVariance},"Desvío (%):","${variancePct > 0 ? '+' : ''}${variancePct}%"`)
  lines.push('')

  // Columnas Detalladas
  const headers = [
    'Tarea de Obra',
    'Fecha Inicio',
    'Fecha Fin',
    'Presupuesto Tarea ($)',
    'Presupuestado a la Fecha ($)',
    '% Programado',
    '% Real Certificado',
    'Desvío Plazo (%)',
    'Costo Real Ejecutado ($)',
    'Modo Imputación',
    'Desvío Costo ($)',
    'Desvío Costo (%)',
    'Diagnóstico Costo',
    'Saldo por Ejecutar ($)'
  ]
  lines.push(headers.map(escapeCsv).join(','))

  rows.forEach(r => {
    const rowValues = [
      r.name,
      r.startDate,
      r.endDate,
      r.budget,
      r.plannedToDate,
      `${r.plannedPct}%`,
      `${r.realPct}%`,
      `${r.scheduleDelta > 0 ? '+' : ''}${r.scheduleDelta}%`,
      r.executed,
      r.costMode === 'actual' ? 'Imputado Facturas/Partes' : r.costMode === 'manual' ? 'Manual Fijo' : 'Auto (% / Imputado)',
      r.costVariance,
      `${r.costVariancePct > 0 ? '+' : ''}${r.costVariancePct}%`,
      r.costStatus,
      r.balance
    ]
    lines.push(rowValues.map(escapeCsv).join(','))
  })

  lines.push('')
  lines.push(`"TOTALES CONSOLIDADOS",,"",${totalProjectBudget},${totalPlannedToDate},"","","",${totalExecuted},"","${totalVariance}","${variancePct > 0 ? '+' : ''}${variancePct}%","${totalVariance > 0 ? 'SOBRECOSTO GLOBAL' : totalVariance < 0 ? 'MENOR COSTO GLOBAL' : 'EN PRESUPUESTO'}",${Math.max(0, totalProjectBudget - totalExecuted)}`)

  return '\uFEFF' + lines.join('\n')
}
