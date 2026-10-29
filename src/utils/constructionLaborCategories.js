/**
 * constructionLaborCategories.js
 * Gestión de categorías laborales de la construcción en Uruguay (Grupo 9 SUNCA),
 * leyes sociales BPS (Ley 14.411) al 60% por defecto, cuadrillas mixtas y costos indirectos.
 */

export const DEFAULT_SOCIAL_LAWS_RATE = 0.60 // 60% Leyes Sociales BPS por defecto

export const DEFAULT_LABOR_CATEGORIES = [
  {
    id: 'peon_practico',
    role: 'Peón Práctico',
    categoryCode: 'Cat. I',
    dailyRate: 1800,
    effectiveDate: '2026-07-01',
    active: true,
    description: 'Tareas generales de apoyo, carga, acarreo y limpieza de obra.'
  },
  {
    id: 'peon_comun',
    role: 'Peón Común',
    categoryCode: 'Cat. II',
    dailyRate: 1950,
    effectiveDate: '2026-07-01',
    active: true,
    description: 'Preparación de mezclas, movimiento de materiales y tareas pesadas.'
  },
  {
    id: 'medio_oficial',
    role: 'Medio Oficial',
    categoryCode: 'Cat. III',
    dailyRate: 2200,
    effectiveDate: '2026-07-01',
    active: true,
    description: 'Albañilería secundaria, corte de varillas, ayuda en encofrados.'
  },
  {
    id: 'oficial',
    role: 'Oficial',
    categoryCode: 'Cat. IV',
    dailyRate: 2800,
    effectiveDate: '2026-07-01',
    active: true,
    description: 'Levantamiento de muros, revoques, encofrados de madera, herrería.'
  },
  {
    id: 'oficial_especializado',
    role: 'Oficial Especializado',
    categoryCode: 'Cat. V',
    dailyRate: 3400,
    effectiveDate: '2026-07-01',
    active: true,
    description: 'Fierrero calificado, sanitario, electricista matriculado, soldador calificado.'
  },
  {
    id: 'capataz',
    role: 'Capataz de Cuadrilla',
    categoryCode: 'Cat. VI',
    dailyRate: 4200,
    effectiveDate: '2026-07-01',
    active: true,
    description: 'Conducción directa de cuadrilla en frente de trabajo y control de calidad.'
  }
]

export const DEFAULT_CREW_TEMPLATES = [
  {
    id: 'crew_albanileria',
    name: 'Cuadrilla de Albañilería',
    description: '1 Oficial + 1 Medio Oficial + 1 Peón Práctico',
    lines: [
      { categoryId: 'oficial', role: 'Oficial', count: 1, dailyRate: 2800 },
      { categoryId: 'medio_oficial', role: 'Medio Oficial', count: 1, dailyRate: 2200 },
      { categoryId: 'peon_practico', role: 'Peón Práctico', count: 1, dailyRate: 1800 }
    ]
  },
  {
    id: 'crew_hormigon',
    name: 'Cuadrilla de Hormigón Armado',
    description: '1 Oficial Especializado + 2 Oficiales + 3 Peones',
    lines: [
      { categoryId: 'oficial_especializado', role: 'Oficial Especializado', count: 1, dailyRate: 3400 },
      { categoryId: 'oficial', role: 'Oficial', count: 2, dailyRate: 2800 },
      { categoryId: 'peon_comun', role: 'Peón Común', count: 3, dailyRate: 1950 }
    ]
  },
  {
    id: 'crew_herreria',
    name: 'Cuadrilla de Herrería y Montaje',
    description: '2 Oficiales Especializados + 1 Medio Oficial',
    lines: [
      { categoryId: 'oficial_especializado', role: 'Oficial Especializado', count: 2, dailyRate: 3400 },
      { categoryId: 'medio_oficial', role: 'Medio Oficial', count: 1, dailyRate: 2200 }
    ]
  },
  {
    id: 'crew_terminaciones',
    name: 'Cuadrilla de Terminaciones & Pintura',
    description: '2 Oficiales + 1 Medio Oficial',
    lines: [
      { categoryId: 'oficial', role: 'Oficial', count: 2, dailyRate: 2800 },
      { categoryId: 'medio_oficial', role: 'Medio Oficial', count: 1, dailyRate: 2200 }
    ]
  }
]

export const DEFAULT_INDIRECT_COST_CATEGORIES = [
  { id: 'capataz_jefe', name: 'Jefatura de Obra, Capataz General & Sereno', defaultMonthly: 120000 },
  { id: 'obrador_banos', name: 'Alquiler de Obrador, Vestuarios & Baños Químicos', defaultMonthly: 45000 },
  { id: 'servicios_luz_agua', name: 'Energía Eléctrica Provisoria (UTE) & Agua (OSE)', defaultMonthly: 28000 },
  { id: 'seguros_bse', name: 'Seguros BSE Accidentes del Trabajo & Responsabilidad Civil', defaultMonthly: 38000 },
  { id: 'andamios_equipos', name: 'Alquiler de Andamios Certificados, Puntales & Equipos', defaultMonthly: 55000 },
  { id: 'volquetas_fletes', name: 'Retiro de Escombros (Volquetas) & Fletes', defaultMonthly: 32000 }
]

/**
 * Calcula el costo diario de una cuadrilla mixta o de una sola categoría
 */
export function calculateCrewDailyCost(crewLines = []) {
  if (!Array.isArray(crewLines) || crewLines.length === 0) return 0
  return crewLines.reduce((sum, line) => {
    const count = Number(line.count) || 0
    const rate = Number(line.dailyRate) || 0
    return sum + (count * rate)
  }, 0)
}

/**
 * Calcula la cantidad total de operarios de una cuadrilla
 */
export function calculateCrewTotalPeople(crewLines = []) {
  if (!Array.isArray(crewLines) || crewLines.length === 0) return 0
  return crewLines.reduce((sum, line) => sum + (Number(line.count) || 0), 0)
}

/**
 * Calcula el costo de mano de obra y leyes sociales de una tarea considerando:
 * - Si tiene cuadrilla mixta (`crewLines`) o simple (`peopleCount`, `categoryRate`)
 * - Cantidad de días hábiles (`workDays`)
 * - Tasa de leyes sociales configurable a nivel de obra/empresa (por defecto 60%)
 * - Tasa específica por categoría si está definida en la categoría
 * - Sobreescritura manual directa en la tarea (`socialLawsCost` / `customSocialLaws`)
 */
export function calculateTaskLaborAndSocial(task, options = {}) {
  let socialRate = options.socialLawsRate != null ? options.socialLawsRate : DEFAULT_SOCIAL_LAWS_RATE
  if (socialRate > 1) socialRate = socialRate / 100

  // Si la categoría tiene tasa de leyes sociales específica configurada, la aplicamos
  if (options.laborCategories && task?.category) {
    const matched = options.laborCategories.find(c => c.role === task.category || c.id === task.category)
    if (matched && matched.socialLawsRate != null && !Number.isNaN(Number(matched.socialLawsRate))) {
      socialRate = Number(matched.socialLawsRate) > 1 ? Number(matched.socialLawsRate) / 100 : Number(matched.socialLawsRate)
    }
  } else if (task?.categorySocialLawsRate != null && !Number.isNaN(Number(task.categorySocialLawsRate))) {
    socialRate = Number(task.categorySocialLawsRate) > 1 ? Number(task.categorySocialLawsRate) / 100 : Number(task.categorySocialLawsRate)
  }

  const workDays = Math.max(1, Number(task?.workDays) || 1)

  let dailyCost = 0
  let peopleCount = 0

  if (Array.isArray(task?.crewLines) && task.crewLines.length > 0) {
    dailyCost = calculateCrewDailyCost(task.crewLines)
    peopleCount = calculateCrewTotalPeople(task.crewLines)
  } else {
    peopleCount = Number(task?.peopleCount) || 1
    const rate = Number(task?.categoryRate) || 2800
    dailyCost = peopleCount * rate
  }

  const laborCost = Math.round(dailyCost * workDays)
  
  // Si la tarea tiene un valor manual de leyes sociales sobrescrito
  const isCustom = task?.customSocialLaws || (task?.socialLawsCost !== '' && task?.socialLawsCost != null && !Number.isNaN(Number(task?.socialLawsCost)))
  const socialLawsCost = isCustom
    ? Number(task.socialLawsCost)
    : Math.round(laborCost * socialRate)

  return {
    dailyCost,
    peopleCount,
    workDays,
    laborCost,
    socialLawsCost,
    effectiveSocialRate: socialRate,
    isCustomSocial: Boolean(isCustom),
    totalLaborPlusSocial: laborCost + socialLawsCost
  }
}

/**
 * Gastos Generales / Costos Indirectos iniciales de obra
 */
export const DEFAULT_INDIRECT_EXPENSES = [
  {
    id: 'ind-1',
    categoryId: 'capataz_jefe',
    name: 'Jefatura de Obra, Capataz General & Sereno',
    budgeted: 480000,
    executed: 460000,
    period: 'Mensual prorrateado (4 meses)',
    notes: 'Dirección de obra en terreno y sereno de guardia nocturna'
  },
  {
    id: 'ind-2',
    categoryId: 'obrador_banos',
    name: 'Alquiler de Obrador, Vestuarios & Baños Químicos',
    budgeted: 180000,
    executed: 175000,
    period: 'Mensual prorrateado',
    notes: 'Módulo de vestuarios y 2 baños químicos (limpieza semanal)'
  },
  {
    id: 'ind-3',
    categoryId: 'servicios_luz_agua',
    name: 'Energía Eléctrica Provisoria (UTE) & Agua de Obra (OSE)',
    budgeted: 112000,
    executed: 98000,
    period: 'Mensual por consumo medido',
    notes: 'Bajada trifásica provisoria y conexión provisoria de agua'
  },
  {
    id: 'ind-4',
    categoryId: 'seguros_bse',
    name: 'Seguros BSE Accidentes de Trabajo & Responsabilidad Civil',
    budgeted: 152000,
    executed: 152000,
    period: 'Póliza integral de obra',
    notes: 'Póliza obligatoria Banco de Seguros del Estado (Ley 16.074)'
  },
  {
    id: 'ind-5',
    categoryId: 'andamios_equipos',
    name: 'Alquiler de Andamios Tubulares Certificados & Puntales',
    budgeted: 220000,
    executed: 210000,
    period: 'Por período de estructura y fachada',
    notes: 'Andamios multidireccionales homologados para fachada y encofrados'
  },
  {
    id: 'ind-6',
    categoryId: 'volquetas_fletes',
    name: 'Retiro de Escombros (Volquetas) & Fletes Internos',
    budgeted: 128000,
    executed: 135000,
    period: 'Por retiro solicitado',
    notes: 'Servicio de volquetas habilitadas por intendencia municipal'
  }
]

/**
 * Calcula los totales consolidados de Costos Indirectos / Gastos Generales
 */
export function calculateIndirectCostsTotals(expenses = []) {
  if (!Array.isArray(expenses)) {
    return { budgeted: 0, executed: 0, balance: 0, percentConsumed: 0 }
  }
  const budgeted = expenses.reduce((sum, item) => sum + (Number(item.budgeted) || 0), 0)
  const executed = expenses.reduce((sum, item) => sum + (Number(item.executed) || 0), 0)
  const balance = budgeted - executed
  const percentConsumed = budgeted > 0 ? Math.round((executed / budgeted) * 1000) / 10 : 0
  return {
    budgeted: Math.round(budgeted),
    executed: Math.round(executed),
    balance: Math.round(balance),
    percentConsumed
  }
}

/**
 * Consolida Costo Directo + Costo Indirecto = Costo Total de Obra
 */
export function calculateProjectCostBreakdown(directCosts = {}, indirectCosts = {}) {
  const directBudget = Number(directCosts.budgeted) || 0
  const directExecuted = Number(directCosts.executed) || 0
  const indirectBudget = Number(indirectCosts.budgeted) || 0
  const indirectExecuted = Number(indirectCosts.executed) || 0

  const totalBudget = directBudget + indirectBudget
  const totalExecuted = directExecuted + indirectExecuted
  const totalBalance = totalBudget - totalExecuted
  const totalPercentConsumed = totalBudget > 0 ? Math.round((totalExecuted / totalBudget) * 1000) / 10 : 0

  const directPercentOfTotal = totalBudget > 0 ? Math.round((directBudget / totalBudget) * 1000) / 10 : 0
  const indirectPercentOfTotal = totalBudget > 0 ? Math.round((indirectBudget / totalBudget) * 1000) / 10 : 0

  return {
    directBudget,
    directExecuted,
    indirectBudget,
    indirectExecuted,
    totalBudget,
    totalExecuted,
    totalBalance,
    totalPercentConsumed,
    directPercentOfTotal,
    indirectPercentOfTotal,
    formulaSummary: `Costo Directo ($${directBudget.toLocaleString('es-UY')}) + Costo Indirecto ($${indirectBudget.toLocaleString('es-UY')}) = Costo Total ($${totalBudget.toLocaleString('es-UY')})`
  }
}

