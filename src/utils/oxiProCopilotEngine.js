/**
 * OxI Pro Copilot Engine (NLP Construction Assistant)
 * Interprets natural language prompts for construction project management:
 * - Adding and scheduling tasks with SUNCA rates & BPS social laws (65%)
 * - Updating physical progress & certifications
 * - Cascading rain delay schedule shifts
 * - Creating and adjusting budget rubros
 * - Executive Q&A on project status, delays, SPI/SV, and devengamiento
 */

const LABOR_CATEGORIES = {
  'capataz': { role: 'Capataz General', rate: 4200 },
  'capataz general': { role: 'Capataz General', rate: 4200 },
  'oficial especializado': { role: 'Oficial Especializado', rate: 3400 },
  'especializado': { role: 'Oficial Especializado', rate: 3400 },
  'oficial': { role: 'Oficial', rate: 2800 },
  'medio oficial': { role: 'Medio Oficial', rate: 2200 },
  'peon': { role: 'Peón Práctico', rate: 1800 },
  'peón': { role: 'Peón Práctico', rate: 1800 },
  'peon practico': { role: 'Peón Práctico', rate: 1800 },
  'peón práctico': { role: 'Peón Práctico', rate: 1800 }
}

const MONTH_NAMES = {
  'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
  'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
  'setiembre': '09', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
}

function formatDateStr(date) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function addDaysToDate(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + Number(days))
  return formatDateStr(d)
}

function countWorkingDays(startStr, endStr) {
  const start = new Date(startStr)
  const end = new Date(endStr)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return Math.max(1, count)
}

function parseDatesFromText(text) {
  const lower = text.toLowerCase()
  const currentYear = new Date().getFullYear()

  // Match: "del 5 al 15 de noviembre" or "desde el 1 hasta el 20 de diciembre"
  const rangeMatch = lower.match(/(?:del?|desde el?)\s+(\d{1,2})\s+(?:al?|hasta el?)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/)
  if (rangeMatch) {
    const startDay = rangeMatch[1].padStart(2, '0')
    const endDay = rangeMatch[2].padStart(2, '0')
    const monthWord = rangeMatch[3]
    const year = rangeMatch[4] || String(currentYear)
    const monthNum = MONTH_NAMES[monthWord]
    if (monthNum) {
      return {
        startDate: `${year}-${monthNum}-${startDay}`,
        endDate: `${year}-${monthNum}-${endDay}`
      }
    }
  }

  // Match: "primera quincena de [mes]"
  const quincena1Match = lower.match(/primera\s+quincena\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/)
  if (quincena1Match) {
    const monthNum = MONTH_NAMES[quincena1Match[1]]
    const year = quincena1Match[2] || String(currentYear)
    if (monthNum) {
      return {
        startDate: `${year}-${monthNum}-01`,
        endDate: `${year}-${monthNum}-15`
      }
    }
  }

  // Match: "segunda quincena de [mes]"
  const quincena2Match = lower.match(/segunda\s+quincena\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/)
  if (quincena2Match) {
    const monthNum = MONTH_NAMES[quincena2Match[1]]
    const year = quincena2Match[2] || String(currentYear)
    if (monthNum) {
      return {
        startDate: `${year}-${monthNum}-16`,
        endDate: `${year}-${monthNum}-28`
      }
    }
  }

  // Match: "en [mes]" o "durante [mes]"
  const monthOnlyMatch = lower.match(/(?:en|durante)\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/)
  if (monthOnlyMatch) {
    const monthNum = MONTH_NAMES[monthOnlyMatch[1]]
    const year = monthOnlyMatch[2] || String(currentYear)
    if (monthNum) {
      return {
        startDate: `${year}-${monthNum}-01`,
        endDate: `${year}-${monthNum}-25`
      }
    }
  }

  // Match: "por X días" o "durante X semanas"
  const durationMatch = lower.match(/por\s+(\d+)\s*(d[ií]as?|semanas?|mes(?:es)?)/)
  if (durationMatch) {
    const num = Number(durationMatch[1])
    const unit = durationMatch[2]
    const days = unit.startsWith('semana') ? num * 7 : unit.startsWith('mes') ? num * 30 : num
    const today = new Date()
    const startStr = formatDateStr(today)
    const endStr = addDaysToDate(startStr, days)
    return { startDate: startStr, endDate: endStr }
  }

  // Default fallback: starts 2 days from now
  const today = new Date()
  const d = new Date(today.getTime() + 86400000 * 2)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  if (d.getDay() === 6) d.setDate(d.getDate() + 2)
  const startStr = formatDateStr(d)
  const endStr = addDaysToDate(startStr, 12)
  return { startDate: startStr, endDate: endStr }
}

function parseMoneyAmount(text) {
  const match = text.match(/(?:\$|pesos\s*|monto\s*)?\s*(\d[\d\.]*)/i)
  if (!match) return 0
  const raw = match[1].replace(/\./g, '')
  let num = Number(raw) || 0
  if (/mil\b/i.test(text) && num < 1000) num *= 1000
  return num
}

/**
 * Main parser entrypoint
 */
export function interpretCopilotPrompt(promptText = '', context = {}) {
  const text = (promptText || '').trim()
  const lower = text.toLowerCase()
  const { schedule = [], rubros = [], rainLogs = [], project = {} } = context

  // 1. ACTION: Desplazamiento por lluvias / demoras climáticas
  const isRainAction = /(?:tuvimos|hubo|registr[aá]|desplaz[aá]|correr?|agreg[aá])\s+(?:\w+\s+)?\d+\s+d[ií]as?\s+de\s+lluvia/i.test(lower)
    || /(?:\d+\s+d[ií]as?\s+de\s+lluvia|llovi[oó]|temporal\s+de\s+lluvia|suspensi[oó]n\s+por\s+lluvia)/i.test(lower)
    && !/cu[aá]ntos?\s+d[ií]as|historial/i.test(lower)

  if (isRainAction) {
    return handleRainShiftAction(lower, text, context)
  }

  // 2. ACTION: Crear o agregar Rubro / Partida
  if (/(?:cre[aá]r?|agreg[aá]r?|nuev[ao]|incorpor[aá]r?|sum[aá]r?)(?:\s+un|\s+el|\s+la)?\s+(?:rubro|partida)/i.test(lower)) {
    return handleCreateRubroAction(lower, text, context)
  }

  // 3. ACTION: Actualizar avance / Certificar tarea
  if (/(?:actualiz[aá]r?|marc[aá]r?|certific[aá]r?|complet[aá]r?|termin[aá]r?|avanz[aá]r?)(?:\s+|$)/i.test(lower)
    && /(?:tarea|partida|avance|%|porcentaje|complet|termin|fundaci|estruct|herrer|pintur|techo)/i.test(lower)) {
    return handleUpdateProgressAction(lower, text, context)
  }

  // 4. ACTION: Crear o agregar tarea
  if (/(?:agreg[aá]r?|cre[aá]r?|incorpor[aá]r?|sum[aá]r?|nuev[ao]\s+tarea|program[aá]r?)(?:\s+|$)/i.test(lower)) {
    return handleCreateTaskAction(lower, text, context)
  }

  // 5. QUERY: Estado general / Resumen / Atrasos / Presupuesto / Consultas
  const isQuery = /c[oó]mo\s+viene|qu[eé]\s+tareas?|estado|atrasad|resumen|cu[aá]nto|presupuesto|saldo|spi|sv|lluvias?|informe/i.test(lower)
  if (isQuery) {
    return handleQuery(lower, context)
  }

  // 6. Fallback general con sugerencias interactivas
  return {
    reply: `Entendí tu mensaje: "${text}".\n\nPodés pedirme acciones concretas sobre esta obra, como por ejemplo:`,
    suggestions: [
      '➕ Agregá colocación de barandas del 1 al 10 de noviembre con 3 oficiales',
      '⚡ Marcá la tarea de estructura al 90%',
      '🌧️ Tuvimos 3 días de lluvia por temporal',
      '💰 Creá un rubro de Aberturas de PVC con $400.000',
      '📊 ¿Qué tareas están atrasadas respecto al plan?'
    ],
    action: null
  }
}

/**
 * Handle Queries (Read-only Q&A)
 */
function handleQuery(lower, context) {
  const { schedule = [], rubros = [], rainLogs = [], project = {} } = context

  // A. Atrasos
  if (/atrasad|demorad|desv[ií]o/i.test(lower)) {
    const delayed = schedule.filter(t => (t.plannedPercent || 0) > (t.progressPercent || 0) && (t.progressPercent || 0) < 100)
    if (delayed.length === 0) {
      return {
        reply: `🎉 **¡Buenas noticias!** Ninguna tarea se encuentra atrasada en **${project.name || 'la obra'}**. Todas las partidas activas están al día o adelantadas respecto al Plan contractual.`,
        action: null
      }
    }
    const list = delayed.map(t => {
      const diff = (t.plannedPercent || 0) - (t.progressPercent || 0)
      return `• **${t.name}**: Plan ${t.plannedPercent}% vs. Real ${t.progressPercent}% (*-${diff}% de desvío*)`
    }).join('\n')

    return {
      reply: `⚠️ Se detectaron **${delayed.length} tareas con desvío de plazo** respecto al cronograma contractual:\n\n${list}\n\n💡 *Tip:* Podés pedirme *"Actualizá el avance de [tarea] al X%"* o registrar demoras climáticas si correspondiera.`,
      action: null
    }
  }

  // B. Presupuesto y Gastos
  if (/presupuesto|saldo|gast|costo|plata|dinero/i.test(lower)) {
    const totalBudget = rubros.reduce((sum, r) => sum + (Number(r.budgeted) || 0), 0)
    const totalExecuted = rubros.reduce((sum, r) => sum + (Number(r.executed) || 0), 0)
    const remaining = totalBudget - totalExecuted
    const pct = totalBudget > 0 ? Math.round((totalExecuted / totalBudget) * 100) : 0

    return {
      reply: `📊 **Balance Económico de la Obra:**\n\n` +
        `• **Presupuesto Total Autorizado:** $${totalBudget.toLocaleString()}\n` +
        `• **Costo Devengado / Ejecutado:** $${totalExecuted.toLocaleString()} (${pct}% consumido)\n` +
        `• **Saldo Disponible por Devengar:** $${remaining.toLocaleString()}\n\n` +
        `💡 Podés revisar el desglose de Leyes Sociales BPS (65%) y materiales en la **Pestaña 4 (Presupuestos & Costos)**.`,
      action: null
    }
  }

  // C. Lluvias (Consulta)
  if (/lluvia|temporal|d[ií]as?\s+de\s+lluvia/i.test(lower)) {
    const totalDays = rainLogs.reduce((sum, l) => sum + (Number(l.days) || 0), 0)
    return {
      reply: `🌧️ **Historial de Contingencias Climáticas:**\n\n` +
        `• Se han registrado **${totalDays} días hábiles de lluvia acumulados** en ${rainLogs.length} actas técnicas.\n` +
        `• Todas las fechas del Gantt y de entrega final ya contemplan este corrimiento en cascada.`,
      action: null
    }
  }

  // D. Estado General
  const totalTasks = schedule.length
  const completed = schedule.filter(t => (t.progressPercent || 0) >= 100).length
  const avgProgress = totalTasks > 0 ? Math.round(schedule.reduce((sum, t) => sum + (t.progressPercent || 0), 0) / totalTasks) : 0
  const avgPlanned = totalTasks > 0 ? Math.round(schedule.reduce((sum, t) => sum + (t.plannedPercent || 0), 0) / totalTasks) : 0

  return {
    reply: `📋 **Estado General de ${project.name || 'la Obra'}:**\n\n` +
      `• **Avance Físico Real Ponderado:** ${avgProgress}% (Plan: ${avgPlanned}%)\n` +
      `• **Tareas Completadas:** ${completed} de ${totalTasks} partidas (${Math.round((completed / Math.max(1, totalTasks)) * 100)}%)\n` +
      `• **Lluvias Acumuladas:** ${rainLogs.reduce((sum, l) => sum + (Number(l.days) || 0), 0)} días registrados\n` +
      `• **Partidas Presupuestarias:** ${rubros.length} rubros con BPS (65%)\n\n` +
      `¿Querés agregar alguna tarea, actualizar porcentajes o cargar una demora?`,
    action: null
  }
}

/**
 * Handle Rain Shift Action
 */
function handleRainShiftAction(lower, text, context) {
  const daysMatch = lower.match(/(\d+)\s*d[ií]as?/)
  const days = daysMatch ? Math.max(1, Number(daysMatch[1])) : 2

  const todayStr = formatDateStr(new Date())
  const reason = text.length > 15 ? text : 'Suspensión climática por lluvias torrenciales'

  return {
    reply: `Entendido. Detecté un registro de **${days} días de lluvia** a partir de hoy. Preparé la acción de desplazamiento automático en cascada:`,
    action: {
      type: 'SHIFT_SCHEDULE_RAIN',
      title: 'Desplazar Cronograma por Lluvias en Cascada',
      badge: '🌧️ Lluvias / Demora',
      color: 'amber',
      summary: `Correr ${days} días hábiles todas las tareas activas y futuras`,
      details: [
        `Días de suspensión: ${days} días hábiles`,
        `Fecha de inicio del evento: ${todayStr}`,
        `Motivo: "${reason}"`,
        `Efecto: Preserva las duraciones originales de cada tarea y genera el Acta Técnica en Documentos.`
      ],
      payload: {
        days,
        date: todayStr,
        reason
      }
    }
  }
}

/**
 * Handle Update Progress Action
 */
function handleUpdateProgressAction(lower, text, context) {
  const { schedule = [] } = context

  // Extract percentage
  const pctMatch = lower.match(/(\d{1,3})\s*%/i) || lower.match(/al\s+(\d{1,3})(?:\s+|$)/i)
  let newProgress = pctMatch ? Number(pctMatch[1]) : null

  if (/terminad|completad|finalizad|100/i.test(lower)) {
    newProgress = 100
  }

  if (newProgress == null) newProgress = 100
  newProgress = Math.min(100, Math.max(0, newProgress))

  // Find target task
  let matchedTask = null

  // By ID (e.g. "tarea 3", "partida 2")
  const idMatch = lower.match(/(?:tarea|id|partida)\s*#?\s*(\d+)/i)
  if (idMatch) {
    const id = Number(idMatch[1])
    matchedTask = schedule.find(t => t.id === id)
  }

  // Fuzzy match by keywords
  if (!matchedTask) {
    for (const t of schedule) {
      const taskWords = t.name.toLowerCase().split(/\s+/)
      const matches = taskWords.filter(w => w.length > 3 && lower.includes(w))
      if (matches.length > 0) {
        matchedTask = t
        break
      }
    }
  }

  // Default to first active incomplete task if none matched
  if (!matchedTask) {
    matchedTask = schedule.find(t => (t.progressPercent || 0) < 100) || schedule[0]
  }

  if (!matchedTask) {
    return {
      reply: 'No encontré ninguna tarea para actualizar. Podés especificar el nombre o número de tarea (ej: *"Marcá la tarea 2 al 80%"*).',
      action: null
    }
  }

  return {
    reply: `Entendido. Preparé la actualización de avance para la tarea **"${matchedTask.name}"**:`,
    action: {
      type: 'UPDATE_TASK_PROGRESS',
      title: 'Certificar Avance Físico de Tarea',
      badge: '⚡ Avance Físico',
      color: 'green',
      summary: `Actualizar "${matchedTask.name}" a ${newProgress}%`,
      details: [
        `Tarea seleccionada: #${matchedTask.id} - ${matchedTask.name}`,
        `Avance anterior: ${matchedTask.progressPercent || 0}%`,
        `Nuevo avance: ${newProgress}%`,
        `Impacto: Se recalcula en tiempo real el devengamiento económico y la Curva S (EVM).`
      ],
      payload: {
        taskId: matchedTask.id,
        newProgress
      }
    }
  }
}

/**
 * Handle Create Task Action
 */
function handleCreateTaskAction(lower, text, context) {
  const { schedule = [], rubros = [] } = context

  // 1. Task Name extraction
  let taskName = ''
  
  // Try pattern: "agregá colocación de barandas del ... al ..."
  const taskPrefixMatch = text.match(/(?:agreg(?:ar?|[aá])|cre(?:ar?|[aá])|incorporar?|sumar?)\s+(?:la\s+tarea\s+(?:de\s+)?|una\s+tarea\s+(?:de\s+)?|tarea\s+)?(["']?)(.+?)\1(?=\s+(?:del?\s+\d|desde\s+\d|con\s+\d|por\s+\d|en\s+(?:el\s+mes|[a-záéíóú]+))|$)/i)
  if (taskPrefixMatch && taskPrefixMatch[2].trim().length > 3) {
    taskName = taskPrefixMatch[2].trim()
    taskName = taskName.charAt(0).toUpperCase() + taskName.slice(1)
  }

  if (!taskName) {
    if (/baranda/i.test(lower)) taskName = 'Colocación de Barandas Metálicas (Óxida)'
    else if (/p[eé]rgola/i.test(lower)) taskName = 'Montaje de Pérgola en Hierro y Cubierta'
    else if (/pintura/i.test(lower)) taskName = 'Pintura Epoxi y Terminaciones'
    else if (/port[oó]n/i.test(lower)) taskName = 'Fabricación e Instalación de Portón Corredizo'
    else if (/abertura/i.test(lower)) taskName = 'Colocación de Aberturas y Vidrios'
    else if (/hormig[oó]n|fundaci/i.test(lower)) taskName = 'Losa de Hormigón Armado'
    else taskName = 'Nueva Tarea de Obra'
  }

  // 2. Dates
  const { startDate, endDate } = parseDatesFromText(text)
  const workingDays = countWorkingDays(startDate, endDate)

  // 3. People & Role
  const peopleMatch = lower.match(/(\d+)\s*(?:personas?|operarios?|obreros?|oficiales?|peones?)/)
  const peopleCount = peopleMatch ? Math.max(1, Number(peopleMatch[1])) : 3

  let category = 'Oficial'
  let categoryRate = 2800

  for (const [key, val] of Object.entries(LABOR_CATEGORIES)) {
    if (lower.includes(key)) {
      category = val.role
      categoryRate = val.rate
      break
    }
  }

  if (/herrer|met[aá]lic|solda|hierro|estruct/i.test(lower)) {
    category = 'Oficial Especializado'
    categoryRate = 3400
  }

  // 4. Materials Cost
  let matCost = 0
  const matMatch = text.match(/(?:materiales?|material)\s*(?:de\s*)?(?:\$\s*)?(\d[\d\.]*)|(\d[\d\.]*)\s*(?:de\s*)?(?:materiales?|material)/i)
  if (matMatch) {
    const rawMat = (matMatch[1] || matMatch[2]).replace(/\./g, '')
    matCost = Number(rawMat) || 0
  } else {
    matCost = Math.round(workingDays * peopleCount * 1200)
  }

  const assignedLaborCost = workingDays * peopleCount * categoryRate
  const socialLawsCost = Math.round(assignedLaborCost * 0.65) // BPS 65%

  const maxId = schedule.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0)
  const newTask = {
    id: maxId + 1,
    name: taskName,
    startDate,
    endDate,
    peopleCount,
    category,
    categoryRate,
    assignedLaborCost,
    socialLawsCost,
    materialCost: matCost,
    month: `Mes ${Math.max(1, Math.ceil(workingDays / 20))}`,
    plannedPercent: 0,
    progressPercent: 0,
    certifications: []
  }

  const totalCost = assignedLaborCost + socialLawsCost + matCost

  return {
    reply: `Entendido. Calculé la cuadrilla, leyes sociales BPS y plazos para **"${taskName}"**:`,
    action: {
      type: 'CREATE_TASK',
      title: 'Crear Nueva Tarea en Cronograma Gantt',
      badge: '➕ Nueva Tarea',
      color: 'blue',
      summary: `Agregar "${taskName}" (${startDate} al ${endDate})`,
      details: [
        `Plazo de ejecución: ${startDate} al ${endDate} (${workingDays} días hábiles)`,
        `Cuadrilla asignada: ${peopleCount} × ${category} ($${categoryRate.toLocaleString()}/día)`,
        `Mano de Obra directa: $${assignedLaborCost.toLocaleString()}`,
        `Aportes BPS Leyes Sociales (65%): $${socialLawsCost.toLocaleString()}`,
        `Costo estimado de Materiales: $${matCost.toLocaleString()}`,
        `Presupuesto Total de Partida: $${totalCost.toLocaleString()}`
      ],
      payload: newTask
    }
  }
}

/**
 * Handle Create Rubro Action
 */
function handleCreateRubroAction(lower, text, context) {
  const { rubros = [] } = context

  let rubroName = 'Nueva Partida Presupuestaria'
  const nameMatch = text.match(/(?:rubro|partida)\s+(?:de\s+)?(["']?)(.+?)\1(?=\s+(?:con|por|\$)(?:\s+|$)|$)/i)
  if (nameMatch && nameMatch[2].trim().length > 3) {
    rubroName = nameMatch[2].trim()
    rubroName = rubroName.charAt(0).toUpperCase() + rubroName.slice(1)
  }

  const amount = parseMoneyAmount(text) || 350000
  const laborCost = Math.round(amount * 0.35)
  const socialLawsCost = Math.round(laborCost * 0.65)
  const materialCost = Math.max(0, amount - laborCost - socialLawsCost)

  const newRubro = {
    id: `rubro_${Date.now()}`,
    name: rubroName,
    laborCost,
    socialLawsCost,
    materialCost,
    budgeted: amount,
    executed: 0
  }

  return {
    reply: `Entendido. Preparé la nueva partida presupuestaria con desglose de Leyes Sociales:`,
    action: {
      type: 'CREATE_RUBRO',
      title: 'Agregar Partida Presupuestaria',
      badge: '💰 Nuevo Rubro',
      color: 'purple',
      summary: `Crear rubro "${rubroName}" con presupuesto de $${amount.toLocaleString()}`,
      details: [
        `Partida: ${rubroName}`,
        `Mano de Obra estimada: $${laborCost.toLocaleString()}`,
        `Leyes Sociales BPS (65%): $${socialLawsCost.toLocaleString()}`,
        `Materiales / Subcontratos: $${materialCost.toLocaleString()}`,
        `Presupuesto Total Autorizado: $${amount.toLocaleString()}`
      ],
      payload: newRubro
    }
  }
}
