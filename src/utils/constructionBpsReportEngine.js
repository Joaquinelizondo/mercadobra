/**
 * constructionBpsReportEngine.js
 *
 * Motor de Generación de Reporte y Planilla de Nómina de Personal y Aportes BPS
 * según el régimen de Aporte Unificado de la Construcción de Uruguay (Ley 14.411 y SUNCA Grupo 9).
 *
 * Funcionalidades:
 * 1. Generación de nómina de operarios y jornales trabajados en quincenas o meses seleccionados.
 * 2. Cómputo de Mano de Obra Imponible por categoría oficial SUNCA (Laudos vigentes).
 * 3. Liquidación de Aportes Unificados BPS (alícuota oficial del 60-65% s/Mano de Obra).
 * 4. Discriminación de aportes complementarios de la construcción (FOCER, BSE Accidentes de Trabajo).
 * 5. Consolidación de ficha técnica de obra (Nº de Registro de Obra BPS, Comitente, Ubicación).
 * 6. Exportación en formato CSV compatible con software contable y planillas BPS.
 * 7. Arquitectura desacoplada y multi-país adaptable a otros convenios (FOCAT / UOCRA en Argentina, DT en Chile).
 */

import { DEFAULT_LABOR_CATEGORIES, DEFAULT_SOCIAL_LAWS_RATE } from './constructionLaborCategories.js'

export const DEFAULT_BPS_RATES = {
  bpsUnified: 0.60,      // 60% Ley 14.411 Aporte Unificado BPS sobre mano de obra
  focer: 0.04,           // 4% Fondo de Cesantía y Retiro de la Construcción (FOCER)
  bseInsurance: 0.045    // 4.5% Seguro de Accidentes de Trabajo y Enfermedades Profesionales (BSE)
}

export const DEFAULT_BPS_EMPLOYEES = [
  { id: 'emp-1', name: 'Washington Rodríguez', documentId: '3.412.890-5', categoryId: 'capataz', role: 'Capataz de Cuadrilla', phone: '099 123 456' },
  { id: 'emp-2', name: 'Carlos Mario Da Silva', documentId: '4.182.903-1', categoryId: 'oficial_especializado', role: 'Oficial Especializado', phone: '098 765 432' },
  { id: 'emp-3', name: 'Sebastián Pintos', documentId: '4.789.210-8', categoryId: 'oficial', role: 'Oficial', phone: '094 555 123' },
  { id: 'emp-4', name: 'Javier Benítez', documentId: '5.102.348-2', categoryId: 'medio_oficial', role: 'Medio Oficial', phone: '091 888 777' },
  { id: 'emp-5', name: 'Lucas Maximiliano Ferreyra', documentId: '5.431.092-7', categoryId: 'peon_comun', role: 'Peón Común', phone: '092 333 444' },
  { id: 'emp-6', name: 'Álvaro Nahuel Sosa', documentId: '4.910.321-4', categoryId: 'peon_practico', role: 'Peón Práctico', phone: '096 111 222' }
]

/**
 * Normaliza fechas en formato YYYY-MM-DD
 */
function toDateString(d) {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

/**
 * Genera el reporte de nómina y liquidación BPS
 *
 * @param {Object} params
 * @param {Object} params.project Datos de la obra (name, location, bpsNumber, clientName, companyName, rut)
 * @param {Array} params.laborReports Partes diarios registrados
 * @param {Array} params.employees Lista de operarios registrados
 * @param {Array} params.laborCategories Tabla de laudos y categorías SUNCA
 * @param {number} params.socialLawsRate Alícuota BPS en % (ej 60)
 * @param {string} params.filterMonth Mes a filtrar (YYYY-MM) o 'all'
 * @param {string} params.filterQuincena Quincena 'all' | 'q1' (días 1-15) | 'q2' (días 16-fin)
 * @returns {Object} Reporte consolidado
 */
export function generateBpsPayrollReport({
  project = {},
  laborReports = [],
  employees = DEFAULT_BPS_EMPLOYEES,
  laborCategories = DEFAULT_LABOR_CATEGORIES,
  socialLawsRate = 60,
  filterMonth = 'all',
  filterQuincena = 'all'
} = {}) {
  const bpsRateDecimal = (Number(socialLawsRate) || 60) / 100
  const focerRateDecimal = DEFAULT_BPS_RATES.focer
  const bseRateDecimal = DEFAULT_BPS_RATES.bseInsurance

  // 1. Filtrar partes diarios por rango de fechas
  const filteredReports = laborReports.filter(report => {
    const dateStr = toDateString(report.date)
    if (!dateStr) return false

    if (filterMonth && filterMonth !== 'all') {
      if (!dateStr.startsWith(filterMonth)) return false
    }

    if (filterQuincena === 'q1') {
      const day = parseInt(dateStr.slice(8, 10), 10)
      if (day > 15) return false
    } else if (filterQuincena === 'q2') {
      const day = parseInt(dateStr.slice(8, 10), 10)
      if (day <= 15) return false
    }

    return true
  })

  // 2. Mapear categorías disponibles
  const categoryMap = new Map()
  laborCategories.forEach(cat => {
    categoryMap.set(cat.id, cat)
    categoryMap.set(cat.role.toLowerCase(), cat)
  })

  // 3. Acumular jornales y costos por categoría a partir de los partes diarios
  const categoryAccumulators = {}
  laborCategories.forEach(cat => {
    categoryAccumulators[cat.id] = {
      categoryId: cat.id,
      categoryCode: cat.categoryCode,
      role: cat.role,
      dailyRate: cat.dailyRate,
      journalsCount: 0,
      directLaborCost: 0
    }
  })

  filteredReports.forEach(report => {
    const crew = Array.isArray(report.crew) ? report.crew : []
    crew.forEach(worker => {
      const roleName = worker.role || ''
      const count = Number(worker.quantity) || 0
      const matchedCat = categoryMap.get(roleName.toLowerCase()) || 
        laborCategories.find(c => c.role.toLowerCase() === roleName.toLowerCase()) ||
        laborCategories[0]

      const catId = matchedCat ? matchedCat.id : 'peon_comun'
      const rate = Number(worker.dailyRate) || (matchedCat ? matchedCat.dailyRate : 2000)

      if (!categoryAccumulators[catId]) {
        categoryAccumulators[catId] = {
          categoryId: catId,
          categoryCode: matchedCat?.categoryCode || 'Cat. Gral',
          role: roleName || matchedCat?.role || 'Operario',
          dailyRate: rate,
          journalsCount: 0,
          directLaborCost: 0
        }
      }

      categoryAccumulators[catId].journalsCount += count
      categoryAccumulators[catId].directLaborCost += count * rate
    })
  })

  // 4. Distribuir jornales entre los operarios registrados según su categoría
  const employeeRoster = employees.map(emp => {
    const empCat = categoryMap.get(emp.categoryId) || 
      categoryMap.get((emp.role || '').toLowerCase()) || 
      laborCategories.find(c => c.id === emp.categoryId) ||
      laborCategories[0]

    const catId = empCat ? empCat.id : emp.categoryId
    const catData = categoryAccumulators[catId]

    // Cantidad de operarios con la misma categoría para prorratear jornales
    const peersInCat = employees.filter(e => {
      const c = categoryMap.get(e.categoryId) || categoryMap.get((e.role || '').toLowerCase())
      return (c ? c.id : e.categoryId) === catId
    }).length || 1

    const assignedJournals = catData ? Math.round((catData.journalsCount / peersInCat) * 10) / 10 : 0
    const dailyRate = empCat ? empCat.dailyRate : 2200
    const nominalTaxable = assignedJournals * dailyRate

    return {
      id: emp.id,
      name: emp.name,
      documentId: emp.documentId || 'S/D',
      categoryId: catId,
      categoryCode: empCat?.categoryCode || 'Cat.',
      role: emp.role || empCat?.role || 'Operario',
      phone: emp.phone || '',
      dailyRate,
      journalsWorked: assignedJournals,
      nominalTaxable,
      bpsContribution: nominalTaxable * bpsRateDecimal,
      focerContribution: nominalTaxable * focerRateDecimal,
      bseInsurance: nominalTaxable * bseRateDecimal
    }
  })

  // 5. Totales generales
  const totalJournals = Object.values(categoryAccumulators).reduce((acc, c) => acc + c.journalsCount, 0)
  const totalDirectLaborCost = Object.values(categoryAccumulators).reduce((acc, c) => acc + c.directLaborCost, 0)
  const totalBpsUnified = totalDirectLaborCost * bpsRateDecimal
  const totalFocer = totalDirectLaborCost * focerRateDecimal
  const totalBse = totalDirectLaborCost * bseRateDecimal
  const totalSocialCharges = totalBpsUnified + totalFocer + totalBse
  const grandTotalLaborAndSocial = totalDirectLaborCost + totalSocialCharges

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      countryCode: 'UY',
      lawName: 'Ley 14.411 - Aporte Unificado de la Construcción',
      laborUnion: 'SUNCA - Grupo 9 Construcción e Instalaciones'
    },
    projectInfo: {
      id: project.id || null,
      name: project.name || 'Obra Sin Nombre',
      location: project.location || 'Montevideo, Uruguay',
      clientName: project.clientName || 'Comitente Principal',
      companyName: project.companyName || 'Estudio / Constructora Óxida',
      companyRut: project.companyRut || '21.849.201.0019',
      bpsWorkRegistry: project.bpsWorkRegistry || 'BPS-OBRA-489104',
      filterMonth,
      filterQuincena
    },
    rates: {
      bpsUnifiedRatePercent: socialLawsRate,
      focerRatePercent: focerRateDecimal * 100,
      bseRatePercent: bseRateDecimal * 100,
      totalSocialRatePercent: (bpsRateDecimal + focerRateDecimal + bseRateDecimal) * 100
    },
    categorySummary: Object.values(categoryAccumulators),
    employeeRoster,
    totals: {
      reportsCount: filteredReports.length,
      employeesCount: employees.length,
      totalJournals,
      totalDirectLaborCost,
      totalBpsUnified,
      totalFocer,
      totalBse,
      totalSocialCharges,
      grandTotalLaborAndSocial
    }
  }
}

/**
 * Exporta el reporte de nómina y BPS a CSV compatible con Excel
 */
export function exportBpsReportToCsv(report) {
  const { projectInfo, rates, totals, employeeRoster, categorySummary } = report
  const lines = []

  // Encabezado institucional
  lines.push(`PLANILLA DE PERSONAL Y NÓMINA DE APORTES BPS - LEY 14.411`)
  lines.push(`Grupo 9 SUNCA - Construcción e Instalaciones`)
  lines.push(`Obra:;${projectInfo.name}`)
  lines.push(`Ubicación:;${projectInfo.location}`)
  lines.push(`Empresa / Razón Social:;${projectInfo.companyName}`)
  lines.push(`RUT Empresa:;${projectInfo.companyRut}`)
  lines.push(`N° Registro Obra BPS:;${projectInfo.bpsWorkRegistry}`)
  lines.push(`Período / Mes:;${projectInfo.filterMonth === 'all' ? 'Histórico acumulado' : projectInfo.filterMonth} (Quincena: ${projectInfo.filterQuincena})`)
  lines.push(`Fecha de Emisión:;${new Date().toLocaleDateString('es-UY')}`)
  lines.push(``)

  // Resumen tributario de cargas sociales
  lines.push(`RESUMEN DE LIQUIDACIÓN DE APORTES`)
  lines.push(`Concepto;Alícuota;Monto Liquidado ($ UYU)`)
  lines.push(`Mano de Obra Nominal Imponible;;${Math.round(totals.totalDirectLaborCost)}`)
  lines.push(`Aporte Unificado BPS (Ley 14.411);${rates.bpsUnifiedRatePercent}%;${Math.round(totals.totalBpsUnified)}`)
  lines.push(`Fondo de Cesantía y Retiro (FOCER);${rates.focerRatePercent}%;${Math.round(totals.totalFocer)}`)
  lines.push(`Seguro Accidentes Laborales (BSE);${rates.bseRatePercent}%;${Math.round(totals.totalBse)}`)
  lines.push(`TOTAL APORTES Y LEYES SOCIALES;${rates.totalSocialRatePercent.toFixed(1)}%;${Math.round(totals.totalSocialCharges)}`)
  lines.push(`COSTO TOTAL EMPRESA (Mano de Obra + Cargas);;${Math.round(totals.grandTotalLaborAndSocial)}`)
  lines.push(``)

  // Resumen por categoría laboral SUNCA
  lines.push(`RESUMEN POR CATEGORÍA SUNCA`)
  lines.push(`Código;Categoría / Rol;Laudo Diario ($);Jornales Liquidados;Total Imponible ($)`)
  categorySummary.forEach(c => {
    lines.push(`${c.categoryCode};${c.role};${c.dailyRate};${c.journalsCount};${Math.round(c.directLaborCost)}`)
  })
  lines.push(``)

  // Detalle nominal de operarios
  lines.push(`NÓMINA NOMINAL DE OPERARIOS EN OBRA`)
  lines.push(`Cédula de Identidad;Nombre y Apellido;Categoría;Laudo ($);Jornales;Monto Imponible ($);Aporte BPS 60% ($);FOCER 4% ($)`)
  employeeRoster.forEach(emp => {
    lines.push(`${emp.documentId};${emp.name};${emp.role};${emp.dailyRate};${emp.journalsWorked};${Math.round(emp.nominalTaxable)};${Math.round(emp.bpsContribution)};${Math.round(emp.focerContribution)}`)
  })

  return lines.join('\n')
}

