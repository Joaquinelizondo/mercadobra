/**
 * OxI Pro - AI Onboarding Engine
 * Genera automáticamente tareas Gantt, asignación de cuadrillas, costos de mano de obra,
 * leyes sociales (BPS) y rubros a partir de pliegos, memorias descriptivas o texto libre.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

const SUNCA_CATEGORIES = [
  { role: 'Capataz General', rate: 4200 },
  { role: 'Oficial Especializado', rate: 3400 },
  { role: 'Oficial', rate: 2800 },
  { role: 'Medio Oficial', rate: 2200 },
  { role: 'Peón Práctico', rate: 1800 }
]

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

/**
 * Motor heurístico experto en construcción si no hay API Key de OpenAI disponible
 */
export function generateHeuristicConstructionPlan(inputText = '', options = {}) {
  const lower = (inputText || '').toLowerCase()
  const baseStartDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() + 86400000 * 2)
  // Asegurar que empiece lunes si es fin de semana
  if (baseStartDate.getDay() === 0) baseStartDate.setDate(baseStartDate.getDate() + 1)
  if (baseStartDate.getDay() === 6) baseStartDate.setDate(baseStartDate.getDate() + 2)

  let isIndustrial = /nave|galp[oó]n|log[ií]stic|metalic|met[aá]lica|tinglado/.test(lower)
  let isCommercial = /local|comercial|oficina|reforma|ampliaci[oó]n/.test(lower)
  let isResidential = !isIndustrial && !isCommercial

  let tasksDef = []

  if (isIndustrial) {
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
    // Solapamiento realista de tareas sucesivas (25% a 40%)
    const startDate = new Date(currentDate)
    const endDate = addDays(startDate, def.duration)
    // Siguiente tarea arranca a mitad de la actual
    currentDate = addDays(startDate, Math.max(3, Math.round(def.duration * 0.6)))

    const workDays = Math.max(1, Math.round(def.duration * 0.72))
    const laborCost = Math.round(workDays * def.people * def.rate)
    const socialLawsCost = Math.round(laborCost * 0.65) // 65% Leyes sociales BPS
    const monthIndex = Math.floor(idx / 3) + 1

    const taskItem = {
      id: idx + 1,
      name: def.name,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      peopleCount: def.people,
      category: def.role,
      categoryRate: def.rate,
      assignedLaborCost: laborCost,
      socialLawsCost: socialLawsCost,
      materialCost: def.matCost,
      month: `Mes ${monthIndex}`,
      plannedPercent: idx === 0 ? 100 : idx === 1 ? 70 : idx === 2 ? 30 : 0,
      progressPercent: idx === 0 ? 95 : idx === 1 ? 60 : idx === 2 ? 25 : 0,
      certifications: []
    }
    tasks.push(taskItem)

    // Agrupar en rubros
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
    summary: `Plan de obra generado con éxito para proyecto tipo ${isIndustrial ? 'Industrial' : isCommercial ? 'Comercial' : 'Residencial'}. Cronograma con ${tasks.length} tareas técnicas, estimación de leyes sociales BPS (65%) y desglose en ${rubros.length} rubros presupuestarios. Duración total estimada: ${totalDurationDays} días.`,
    totalBudget,
    totalDurationDays,
    tasks,
    rubros
  }
}

/**
 * Genera el plan de obra usando OpenAI si está configurado, o fallback inteligente
 */
export async function generateOxiProPlanFromSpec(payload = {}) {
  const { prompt = '', text = '', projectName = 'Nueva Obra', startDate } = payload
  const combinedInput = `${projectName}\n${prompt}\n${text}`.trim()

  if (!OPENAI_API_KEY) {
    return generateHeuristicConstructionPlan(combinedInput, { startDate })
  }

  try {
    const systemPrompt = `Eres un Ingeniero Civil y Jefe de Costos experto en planificación de obras en Uruguay y el Cono Sur.
Debes analizar el pliego, memoria descriptiva o requerimiento de obra provisto y generar un JSON estrictamente válido con la siguiente estructura:
{
  "summary": "Resumen ejecutivo técnico del plan de obra, plazos y consideraciones clave de seguridad y BPS.",
  "tasks": [
    {
      "name": "Nombre claro de la tarea técnica de obra",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "peopleCount": 4,
      "category": "Capataz General" | "Oficial Especializado" | "Oficial" | "Medio Oficial" | "Peón Práctico",
      "categoryRate": 2800,
      "assignedLaborCost": 450000,
      "socialLawsCost": 292500,
      "materialCost": 600000,
      "month": "Mes 1",
      "plannedPercent": 0,
      "progressPercent": 0
    }
  ],
  "rubros": [
    {
      "id": "rubro_1",
      "name": "Nombre del rubro (ej. Estructuras, Albañilería, Herrería)",
      "laborCost": 450000,
      "socialLawsCost": 292500,
      "materialCost": 600000,
      "budgeted": 1342500,
      "executed": 0
    }
  ]
}
Reglas mandatorias:
- Las leyes sociales deben ser aproximadamente el 65% del costo de mano de obra (normativa BPS Uruguay Ley 14.411).
- Las fechas deben ser coherentes y secuenciales con solapamientos lógicos.
- Incluir obligatoriamente herrería y estructuras metálicas de fachada u obra si corresponde al rubro de OxI.
- Devuelve únicamente el objeto JSON sin texto markdown adicional ni explicaciones.`

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: combinedInput || 'Plan de obra para edificio residencial de 3 niveles con herrería integral.' }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      console.warn('[oxiProAiService] OpenAI response not ok, falling back to heuristic')
      return generateHeuristicConstructionPlan(combinedInput, { startDate })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return generateHeuristicConstructionPlan(combinedInput, { startDate })
    }

    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
      return generateHeuristicConstructionPlan(combinedInput, { startDate })
    }

    return {
      source: 'openai',
      summary: parsed.summary || 'Plan de obra optimizado por IA.',
      tasks: parsed.tasks.map((t, idx) => ({
        id: idx + 1,
        name: t.name || 'Tarea',
        startDate: t.startDate || formatDate(new Date()),
        endDate: t.endDate || formatDate(addDays(new Date(), 15)),
        peopleCount: Number(t.peopleCount) || 1,
        category: t.category || 'Oficial',
        categoryRate: Number(t.categoryRate) || 2800,
        assignedLaborCost: Number(t.assignedLaborCost) || 0,
        socialLawsCost: Number(t.socialLawsCost) || Math.round((Number(t.assignedLaborCost) || 0) * 0.65),
        materialCost: Number(t.materialCost) || 0,
        month: t.month || `Mes ${Math.floor(idx / 3) + 1}`,
        plannedPercent: Number(t.plannedPercent) || 0,
        progressPercent: Number(t.progressPercent) || 0,
        certifications: []
      })),
      rubros: Array.isArray(parsed.rubros) ? parsed.rubros.map((r, idx) => ({
        id: r.id || `rubro_${idx + 1}`,
        name: r.name || 'Rubro General',
        laborCost: Number(r.laborCost) || 0,
        socialLawsCost: Number(r.socialLawsCost) || 0,
        materialCost: Number(r.materialCost) || 0,
        budgeted: Number(r.budgeted) || ((Number(r.laborCost) || 0) + (Number(r.socialLawsCost) || 0) + (Number(r.materialCost) || 0)),
        executed: Number(r.executed) || 0
      })) : []
    }
  } catch (err) {
    console.warn('[oxiProAiService] Exception in OpenAI processing, using heuristic', err)
    return generateHeuristicConstructionPlan(combinedInput, { startDate })
  }
}

