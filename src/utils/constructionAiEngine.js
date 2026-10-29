/**
 * Motor heurístico experto de ConstructionTech para OxI Pro (Frontend fallback)
 * Genera tareas Gantt, cuadrillas SUNCA, leyes sociales BPS (60% configurable) y rubros
 * instantáneamente incluso si el backend está en frío, offline o en despliegue.
 */

import { calculateWorkingDays, distributeCostByMonths } from './constructionCalendar.js'

function formatDate(date) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function addDays(date, days) {
  const res = new Date(date)
  res.setDate(res.getDate() + days)
  return res
}

export function generateHeuristicConstructionPlan(inputText = '', options = {}) {
  const lower = (inputText || '').toLowerCase()
  const baseStartDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() + 86400000 * 2)
  if (baseStartDate.getDay() === 0) baseStartDate.setDate(baseStartDate.getDate() + 1)
  if (baseStartDate.getDay() === 6) baseStartDate.setDate(baseStartDate.getDate() + 2)

  const isPergolaOrRailing = /p[eé]rgola|baranda|reja|herrer[ií]a|escalera|alero|port[oó]n|hierro/.test(lower)
  const isIndustrial = !isPergolaOrRailing && /nave|galp[oó]n|log[ií]stic|metalic|met[aá]lica|tinglado/.test(lower)
  const isCommercial = !isPergolaOrRailing && !isIndustrial && /local|comercial|oficina|reforma|ampliaci[oó]n/.test(lower)

  let tasksDef = []
  let projectTypeLabel = 'Residencial'

  if (isPergolaOrRailing) {
    projectTypeLabel = 'Herrería y Estructura Metálica Óxida'
    tasksDef = [
      { name: 'Relevamiento en Sitio, Replanteo y Cálculo de Anclajes', duration: 4, people: 2, role: 'Oficial Especializado', rate: 3400, matCost: 45000, rubro: 'Ingeniería y Replanteo' },
      { name: 'Fabricación en Taller Óxida: Corte, Conformado y Soldadura MIG/MAG', duration: 12, people: 3, role: 'Oficial Especializado', rate: 3400, matCost: 280000, rubro: 'Fabricación en Taller' },
      { name: 'Tratamiento Superficial: Desengrase, Fondo Anticorrosivo y Pintura Epoxi', duration: 6, people: 2, role: 'Oficial', rate: 2800, matCost: 95000, rubro: 'Pintura y Acabado' },
      { name: 'Montaje en Obra: Izaje, Fijación con Anclajes Químicos y Soldadura de Unión', duration: 8, people: 4, role: 'Oficial Especializado', rate: 3400, matCost: 110000, rubro: 'Montaje en Obra' },
      { name: 'Colocación de Cubierta / Cerramiento (Vidrio Laminado o Policarbonato)', duration: 6, people: 3, role: 'Oficial', rate: 2800, matCost: 190000, rubro: 'Cubierta y Cerramiento' },
      { name: 'Sellado Poliuretánico, Control de Calidad y Entrega de Obra', duration: 3, people: 2, role: 'Medio Oficial', rate: 2200, matCost: 35000, rubro: 'Final de Obra' }
    ]
  } else if (isIndustrial) {
    projectTypeLabel = 'Nave Industrial / Logística'
    tasksDef = [
      { name: 'Replanteo, Movimiento de Suelos y Nivelación', duration: 15, people: 4, role: 'Peón Práctico', rate: 1800, matCost: 350000, rubro: 'Movimiento de Suelos' },
      { name: 'Fundaciones, Dados de Hormigón y Anclajes', duration: 25, people: 6, role: 'Oficial', rate: 2800, matCost: 1200000, rubro: 'Fundaciones' },
      { name: 'Fabricación y Montaje de Estructura Metálica Óxida', duration: 35, people: 5, role: 'Oficial Especializado', rate: 3400, matCost: 2800000, rubro: 'Estructuras Metálicas' },
      { name: 'Cerramientos Laterales y Cubierta de Chapa Termoacústica', duration: 20, people: 4, role: 'Oficial', rate: 2800, matCost: 1450000, rubro: 'Cubiertas y Cerramientos' },
      { name: 'Piso Industrial de Hormigón Pulido de Alta Resistencia', duration: 18, people: 5, role: 'Oficial', rate: 2800, matCost: 1100000, rubro: 'Pavimentos' },
      { name: 'Instalación Eléctrica Trifásica, Iluminación LED y Red', duration: 22, people: 3, role: 'Oficial Especializado', rate: 3400, matCost: 780000, rubro: 'Instalaciones Eléctricas' },
      { name: 'Herrería de Portones Corredizos, Accesos y Limpieza Final', duration: 12, people: 3, role: 'Medio Oficial', rate: 2200, matCost: 420000, rubro: 'Herrería y Final de Obra' }
    ]
  } else if (isCommercial) {
    projectTypeLabel = 'Reforma Comercial'
    tasksDef = [
      { name: 'Demoliciones, Retiro de Carpinterías y Desmontes', duration: 12, people: 4, role: 'Peón Práctico', rate: 1800, matCost: 120000, rubro: 'Demoliciones' },
      { name: 'Mampostería, Tabiquería de Placas de Yeso / Durlock', duration: 18, people: 4, role: 'Oficial', rate: 2800, matCost: 480000, rubro: 'Albañilería y Tabiquería' },
      { name: 'Instalación Eléctrica, Climatización y Datos', duration: 20, people: 3, role: 'Oficial Especializado', rate: 3400, matCost: 650000, rubro: 'Instalaciones Comerciales' },
      { name: 'Herrería Comercial Óxida (Frente Vidriado y Estructura)', duration: 15, people: 3, role: 'Oficial Especializado', rate: 3400, matCost: 920000, rubro: 'Herrería Comercial' },
      { name: 'Revestimientos de Piso, Zócalos y Porcelanatos', duration: 16, people: 3, role: 'Oficial', rate: 2800, matCost: 540000, rubro: 'Terminaciones' },
      { name: 'Pintura Epoxi, Látex Satinado y Detalles Decorativos', duration: 14, people: 3, role: 'Medio Oficial', rate: 2200, matCost: 280000, rubro: 'Pintura y Acabados' },
      { name: 'Limpieza Final, Puesta en Marcha y Entrega de Llaves', duration: 6, people: 2, role: 'Peón Práctico', rate: 1800, matCost: 60000, rubro: 'Final de Obra' }
    ]
  } else {
    // Residencial
    tasksDef = [
      { name: 'Replanteo, Nivelación y Excavación para Cimientos', duration: 14, people: 4, role: 'Peón Práctico', rate: 1800, matCost: 280000, rubro: 'Movimiento de Suelos' },
      { name: 'Cimentaciones y Viga de Fundación Hormigón Armado', duration: 20, people: 5, role: 'Oficial', rate: 2800, matCost: 850000, rubro: 'Estructura Hormigón' },
      { name: 'Estructura de Hormigón Armado (Pilares, Vigas y Losa)', duration: 32, people: 6, role: 'Oficial Especializado', rate: 3400, matCost: 1950000, rubro: 'Estructura Hormigón' },
      { name: 'Mampostería de Elevación y Cerramientos Cerámicos', duration: 25, people: 5, role: 'Oficial', rate: 2800, matCost: 650000, rubro: 'Albañilería' },
      { name: 'Instalaciones Sanitarias, Desagües y Pluviales', duration: 18, people: 3, role: 'Oficial Especializado', rate: 3400, matCost: 520000, rubro: 'Instalación Sanitaria' },
      { name: 'Instalaciones Eléctricas, Canalizaciones y Tableros', duration: 20, people: 3, role: 'Oficial Especializado', rate: 3400, matCost: 480000, rubro: 'Instalación Eléctrica' },
      { name: 'Revoques Gruesos, Finos e Impermeabilizaciones', duration: 22, people: 4, role: 'Oficial', rate: 2800, matCost: 390000, rubro: 'Revoques y Aislaciones' },
      { name: 'Herrería de Fachada, Barandas y Pérgolas Óxida', duration: 16, people: 3, role: 'Oficial Especializado', rate: 3400, matCost: 880000, rubro: 'Herrería de Obra' },
      { name: 'Colocación de Pisos, Azulejos y Revestimientos', duration: 20, people: 3, role: 'Oficial', rate: 2800, matCost: 720000, rubro: 'Terminaciones' },
      { name: 'Pintura General, Aberturas y Limpieza de Entrega', duration: 15, people: 4, role: 'Medio Oficial', rate: 2200, matCost: 350000, rubro: 'Pintura y Final' }
    ]
  }

  let currentDate = new Date(baseStartDate)
  const tasks = []
  const rubroTotals = {}

  tasksDef.forEach((def, idx) => {
    const startDate = new Date(currentDate)
    const endDate = addDays(startDate, def.duration)
    currentDate = addDays(startDate, Math.max(2, Math.round(def.duration * 0.6)))

    const startDateStr = formatDate(startDate)
    const endDateStr = formatDate(endDate)
    const workDays = calculateWorkingDays(startDateStr, endDateStr)
    const socialLawsRate = options.socialLawsRate != null ? Number(options.socialLawsRate) : 0.60
    const laborCost = Math.round(workDays * def.people * def.rate)
    const socialLawsCost = Math.round(laborCost * socialLawsRate) // 60% Leyes sociales BPS por defecto

    const monthDistribution = distributeCostByMonths(startDateStr, endDateStr, laborCost + socialLawsCost + def.matCost)
    const monthLabel = monthDistribution.primaryMonthLabel || `Mes ${Math.floor(idx / 3) + 1}`

    const taskItem = {
      id: idx + 1,
      name: def.name,
      startDate: startDateStr,
      endDate: endDateStr,
      workDays,
      peopleCount: def.people,
      category: def.role,
      categoryRate: def.rate,
      assignedLaborCost: laborCost,
      socialLawsCost: socialLawsCost,
      materialCost: def.matCost,
      month: monthLabel,
      monthBreakdown: monthDistribution.breakdown,
      plannedPercent: idx === 0 ? 100 : idx === 1 ? 70 : idx === 2 ? 30 : 0,
      progressPercent: idx === 0 ? 95 : idx === 1 ? 60 : idx === 2 ? 25 : 0,
      certifications: []
    }
    tasks.push(taskItem)

    if (!rubroTotals[def.rubro]) {
      rubroTotals[def.rubro] = {
        name: def.rubro,
        laborCost: 0,
        socialLawsCost: 0,
        materialCost: 0,
        budgeted: 0,
        executed: 0
      }
    }
    rubroTotals[def.rubro].laborCost += laborCost
    rubroTotals[def.rubro].socialLawsCost += socialLawsCost
    rubroTotals[def.rubro].materialCost += def.matCost
    const subtotal = laborCost + socialLawsCost + def.matCost
    rubroTotals[def.rubro].budgeted += subtotal
    rubroTotals[def.rubro].executed += Math.round(subtotal * (taskItem.progressPercent / 100))
  })

  const rubros = Object.entries(rubroTotals).map(([name, data], idx) => ({
    id: `rubro_${idx + 1}`,
    name,
    laborCost: data.laborCost,
    socialLawsCost: data.socialLawsCost,
    materialCost: data.materialCost,
    budgeted: data.budgeted,
    executed: data.executed
  }))

  const totalBudget = rubros.reduce((acc, r) => acc + r.budgeted, 0)
  const totalDurationDays = Math.round((new Date(tasks[tasks.length - 1].endDate) - new Date(tasks[0].startDate)) / 86400000)

  return {
    source: 'heuristic',
    summary: `Plan de obra generado con éxito para ${projectTypeLabel}. Cronograma con ${tasks.length} tareas técnicas, estimación de leyes sociales BPS (65%) y desglose en ${rubros.length} rubros presupuestarios. Duración total estimada: ${totalDurationDays} días.`,
    totalBudget,
    totalDurationDays,
    tasks,
    rubros
  }
}

