/**
 * constructionEVM.js
 * Metodología de Valor Ganado (Earned Value Management - EVM) aplicada a obras.
 * Permite distinguir si un menor gasto se debe a un atraso o a un ahorro genuino.
 */

import { calculateWorkingDays, parseLocalDate } from './constructionCalendar.js'

/**
 * Calcula el avance programado automático de una tarea en base a sus fechas y la fecha de corte.
 * Resuelve los Ítems 7 y 8: elimina la edición manual del avance programado.
 */
export function calculateTaskPlannedPercent(task, cutoffDate = new Date()) {
  if (!task.startDate || !task.endDate) return 0

  const dCutoff = typeof cutoffDate === 'string' ? parseLocalDate(cutoffDate) : new Date(cutoffDate)
  const dStart = parseLocalDate(task.startDate)
  const dEnd = parseLocalDate(task.endDate)

  dCutoff.setHours(12, 0, 0, 0)
  dStart.setHours(12, 0, 0, 0)
  dEnd.setHours(12, 0, 0, 0)

  // Si aún no comenzó según el calendario
  if (dCutoff < dStart) return 0
  // Si ya superó la fecha de fin
  if (dCutoff >= dEnd) return 100

  // Si está en curso, calcular días hábiles transcurridos vs días hábiles totales
  const totalDays = calculateWorkingDays(task.startDate, task.endDate)
  const cutoffStr = dCutoff.toISOString().slice(0, 10)
  const elapsedDays = calculateWorkingDays(task.startDate, cutoffStr)

  const pct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
  return pct
}

/**
 * Obtiene el presupuesto total de una tarea (Mano de obra + Leyes sociales + Materiales)
 */
export function getTaskTotalBudget(task) {
  const labor = Number(task.assignedLaborCost) || 0
  const social = Number(task.socialLawsCost) || Math.round(labor * 0.60)
  const material = Number(task.materialCost) || 0
  return labor + social + material
}

/**
 * Calcula las métricas completas de Valor Ganado (EVM) para un conjunto de tareas y costos reales
 */
export function calculateProjectEVM(tasks = [], actualCosts = {}, cutoffDate = new Date()) {
  if (!tasks.length) {
    return {
      bac: 0,
      pv: 0,
      ev: 0,
      ac: 0,
      cv: 0,
      sv: 0,
      cpi: 1.0,
      spi: 1.0,
      eac: 0,
      plannedProgress: 0,
      realProgress: 0,
      statusCost: 'ontrack',
      statusSchedule: 'ontrack'
    }
  }

  let bac = 0 // Budget at Completion (Presupuesto total contractual)
  let pv = 0  // Planned Value (Valor Planificado a la fecha)
  let ev = 0  // Earned Value (Valor Ganado = avance real × presupuesto)
  let weightedReal = 0
  let weightedPlan = 0

  tasks.forEach(task => {
    const budget = getTaskTotalBudget(task)
    bac += budget

    const planPct = calculateTaskPlannedPercent(task, cutoffDate)
    const realPct = Math.min(100, Math.max(0, Number(task.progressPercent) || 0))

    pv += budget * (planPct / 100)
    ev += budget * (realPct / 100)

    weightedReal += realPct * budget
    weightedPlan += planPct * budget
  })

  // AC: Actual Cost (Costo real devengado). Si no se pasa un valor explícito en actualCosts,
  // se utiliza la suma de costos ejecutados registrados o el valor ganado
  const ac = actualCosts.totalActualCost != null
    ? Number(actualCosts.totalActualCost)
    : tasks.reduce((sum, t) => {
        if (t.actualIncurredCost != null) return sum + Number(t.actualIncurredCost)
        // Estimación por defecto: si no hay partes diarios ni facturas cargadas, toma costo proporcional al avance real
        const b = getTaskTotalBudget(t)
        return sum + (b * (Math.min(100, Math.max(0, Number(t.progressPercent) || 0)) / 100))
      }, 0)

  // Variaciones
  const cv = Math.round(ev - ac) // Desvío de costo (positivo = ahorro, negativo = sobrecosto)
  const sv = Math.round(ev - pv) // Desvío de plazo (positivo = adelantado, negativo = atrasado)

  // Índices de desempeño
  const cpi = ac > 0 ? Number((ev / ac).toFixed(2)) : 1.0
  const spi = pv > 0 ? Number((ev / pv).toFixed(2)) : 1.0

  // Proyección final de costo (EAC = BAC / CPI)
  const eac = cpi > 0 ? Math.round(bac / cpi) : bac

  const plannedProgress = bac > 0 ? Math.round(weightedPlan / bac) : 0
  const realProgress = bac > 0 ? Math.round(weightedReal / bac) : 0

  // Estados tipo semáforo
  let statusCost = 'good' // ahorro o dentro de costo
  if (cpi < 0.90) statusCost = 'critical'
  else if (cpi < 1.0) statusCost = 'warning'

  let statusSchedule = 'good' // en plazo o adelantado
  if (spi < 0.90) statusSchedule = 'critical'
  else if (spi < 1.0) statusSchedule = 'warning'

  return {
    bac: Math.round(bac),
    pv: Math.round(pv),
    ev: Math.round(ev),
    ac: Math.round(ac),
    cv,
    sv,
    cpi,
    spi,
    eac,
    plannedProgress,
    realProgress,
    statusCost,
    statusSchedule,
    costSummaryText: cv >= 0
      ? `Ahorro real de $${Math.abs(cv).toLocaleString('es-UY')} (CPI: ${cpi})`
      : `Sobrecosto real de $${Math.abs(cv).toLocaleString('es-UY')} (CPI: ${cpi})`,
    scheduleSummaryText: sv >= 0
      ? `En plazo / Adelantado +$${Math.abs(sv).toLocaleString('es-UY')} (SPI: ${spi})`
      : `Atrasado -$${Math.abs(sv).toLocaleString('es-UY')} en valor de obra (SPI: ${spi})`
  }
}
