import { useState, useEffect, useMemo } from 'react'
import './OxiProSuite.css'

const FILE_TYPES = [
  { id: 'todos', label: 'Todos los tipos', icon: '📁' },
  { id: 'planos', label: 'Planos', icon: '📐', desc: 'Arquitectura, Estructuras, Herrería, Instalaciones' },
  { id: 'certificaciones', label: 'Certificaciones', icon: '📜', desc: 'Avance físico, Ensayos de laboratorio, Homologaciones' },
  { id: 'no_conformidades', label: 'No Conformidades', icon: '⚠️', desc: 'Hallazgos de obra, Auditorías y correcciones' },
  { id: 'seguridad', label: 'Seguridad y Salud', icon: '🦺', desc: 'Planes de seguridad, EPP, Inducciones de personal' },
  { id: 'ambiental', label: 'Gestión Ambiental', icon: '🌿', desc: 'Permisos, Gestión de residuos y normativas' }
]

const LABOR_CATEGORIES = [
  { role: 'Capataz General', dailyRate: 4200 },
  { role: 'Oficial Especializado', dailyRate: 3400 },
  { role: 'Oficial', dailyRate: 2800 },
  { role: 'Medio Oficial', dailyRate: 2200 },
  { role: 'Peón Práctico', dailyRate: 1800 }
]

const DEFAULT_DOCUMENTS = [
  {
    id: 1,
    name: 'PL-EST-01_Estructura_Vigas_y_Columnas.dwg',
    type: 'planos',
    version: 'v2.1',
    fileSize: '4.8 MB',
    uploadedAt: '2026-10-08',
    uploadedBy: 'Arq. Mariana Silva (Calculista)',
    status: 'aprobado',
    notes: 'Modificación de refuerzos en nudo V-102 según observación de cálculo.',
    history: [
      { version: 'v1.0', date: '2026-09-15', status: 'observado', notes: 'Primera emisión para revisión' },
      { version: 'v2.0', date: '2026-10-01', status: 'en_revision', notes: 'Incorpora cálculo de viento y sismo' },
      { version: 'v2.1', date: '2026-10-08', status: 'aprobado', notes: 'Aprobado por Dirección de Obra' }
    ]
  },
  {
    id: 2,
    name: 'CERT-AV-03_Certificado_Avance_Hormigonado.pdf',
    type: 'certificaciones',
    version: 'v1.0',
    fileSize: '1.2 MB',
    uploadedAt: '2026-10-05',
    uploadedBy: 'Ing. Rodrigo Méndez (Director de Obra)',
    status: 'aprobado',
    notes: 'Certificación de llenado de losa sobre PB y columnas nivel +3.20.',
    history: [
      { version: 'v1.0', date: '2026-10-05', status: 'aprobado', notes: 'Certificación validada por fiscalización' }
    ]
  },
  {
    id: 3,
    name: 'NC-04_Fisuracion_Paramento_Este.pdf',
    type: 'no_conformidades',
    version: 'v1.2',
    fileSize: '850 KB',
    uploadedAt: '2026-10-10',
    uploadedBy: 'Tec. Calidad Lucas Ferreyra',
    status: 'en_revision',
    notes: 'Tratamiento de juntas de dilatación en paramento exterior.',
    history: [
      { version: 'v1.0', date: '2026-09-28', status: 'observado', notes: 'Detección inicial de fisura superficial' },
      { version: 'v1.1', date: '2026-10-04', status: 'en_revision', notes: 'Propuesta de sellado con puente de adherencia' },
      { version: 'v1.2', date: '2026-10-10', status: 'en_revision', notes: 'Esperando fraguado para ensayo de estanqueidad' }
    ]
  },
  {
    id: 4,
    name: 'SST-08_Plan_Seguridad_Trabajos_En_Altura.pdf',
    type: 'seguridad',
    version: 'v2.0',
    fileSize: '2.1 MB',
    uploadedAt: '2026-10-02',
    uploadedBy: 'Lic. Prevencionista Daniela Ramos',
    status: 'aprobado',
    notes: 'Protocolo de líneas de vida para montaje de herrería y barandas Óxida.',
    history: [
      { version: 'v1.0', date: '2026-09-10', status: 'aprobado', notes: 'Plan base de seguridad' },
      { version: 'v2.0', date: '2026-10-02', status: 'aprobado', notes: 'Anexo de trabajo en altura y andamios' }
    ]
  },
  {
    id: 5,
    name: 'PGA-02_Plan_Gestion_Residuos_Obra.pdf',
    type: 'ambiental',
    version: 'v1.0',
    fileSize: '1.6 MB',
    uploadedAt: '2026-09-20',
    uploadedBy: 'Estudio Ambiental Verde Sur',
    status: 'aprobado',
    notes: 'Manifiesto de volquetas y disposición final clasificada de escombros y maderas.',
    history: [
      { version: 'v1.0', date: '2026-09-20', status: 'aprobado', notes: 'Aprobado ante intendencia municipal' }
    ]
  }
]

const DEFAULT_SCHEDULE = [
  {
    id: 1,
    name: 'Excavación, Nivelación y Fundaciones',
    startDate: '2026-10-01',
    endDate: '2026-10-24',
    peopleCount: 6,
    category: 'Oficial Especializado',
    categoryRate: 3400,
    assignedLaborCost: 489600,
    socialLawsCost: 318240,
    materialCost: 750000,
    month: 'Mes 1',
    plannedPercent: 100,
    progressPercent: 95
  },
  {
    id: 2,
    name: 'Estructura de Hormigón Armado (Losas y Columnas)',
    startDate: '2026-10-15',
    endDate: '2026-11-20',
    peopleCount: 8,
    category: 'Oficial',
    categoryRate: 2800,
    assignedLaborCost: 806400,
    socialLawsCost: 524160,
    materialCost: 1950000,
    month: 'Mes 2',
    plannedPercent: 75,
    progressPercent: 70
  },
  {
    id: 3,
    name: 'Herrería y Estructuras Metálicas de Fachada (Óxida)',
    startDate: '2026-11-01',
    endDate: '2026-12-05',
    peopleCount: 4,
    category: 'Oficial Especializado',
    categoryRate: 3400,
    assignedLaborCost: 476000,
    socialLawsCost: 309400,
    materialCost: 1150000,
    month: 'Mes 2',
    plannedPercent: 35,
    progressPercent: 45
  },
  {
    id: 4,
    name: 'Carpintería en Madera & Encofrados a Medida',
    startDate: '2026-11-10',
    endDate: '2026-12-15',
    peopleCount: 3,
    category: 'Oficial',
    categoryRate: 2800,
    assignedLaborCost: 294000,
    socialLawsCost: 191100,
    materialCost: 480000,
    month: 'Mes 3',
    plannedPercent: 20,
    progressPercent: 30
  },
  {
    id: 5,
    name: 'Mampostería, Tabiquería y Cerramientos',
    startDate: '2026-11-20',
    endDate: '2026-12-30',
    peopleCount: 5,
    category: 'Medio Oficial',
    categoryRate: 2200,
    assignedLaborCost: 440000,
    socialLawsCost: 286000,
    materialCost: 620000,
    month: 'Mes 3',
    plannedPercent: 10,
    progressPercent: 20
  },
  {
    id: 6,
    name: 'Instalaciones Eléctricas, Sanitarias y Climatización',
    startDate: '2026-12-01',
    endDate: '2027-01-20',
    peopleCount: 4,
    category: 'Oficial Especializado',
    categoryRate: 3400,
    assignedLaborCost: 693600,
    socialLawsCost: 450840,
    materialCost: 890000,
    month: 'Mes 4',
    plannedPercent: 0,
    progressPercent: 10
  },
  {
    id: 7,
    name: 'Terminaciones, Revestimientos Finos y Pintura',
    startDate: '2027-01-10',
    endDate: '2027-02-28',
    peopleCount: 4,
    category: 'Oficial',
    categoryRate: 2800,
    assignedLaborCost: 548800,
    socialLawsCost: 356720,
    materialCost: 420000,
    month: 'Mes 5',
    plannedPercent: 0,
    progressPercent: 0
  }
]

const DEFAULT_MONTHLY_COMPARISON = [
  { month: 'Mes 1', certAdvancePercent: 20, certCost: 1240000, budgetedCost: 1200000 },
  { month: 'Mes 2', certAdvancePercent: 42, certCost: 2850000, budgetedCost: 2750000 },
  { month: 'Mes 3', certAdvancePercent: 65, certCost: 3950000, budgetedCost: 4100000 },
  { month: 'Mes 4', certAdvancePercent: 82, certCost: 5400000, budgetedCost: 5350000 },
  { month: 'Mes 5', certAdvancePercent: 100, certCost: 6750000, budgetedCost: 6600000 },
]

const DEFAULT_WEEKLY_PROGRESS = [
  { week: 'Semana 1', budgetZeroPercent: 4, realPercent: 4.8 },
  { week: 'Semana 2', budgetZeroPercent: 10, realPercent: 11.2 },
  { week: 'Semana 3', budgetZeroPercent: 18, realPercent: 19.5 },
  { week: 'Semana 4', budgetZeroPercent: 26, realPercent: 25.0 },
  { week: 'Semana 5', budgetZeroPercent: 36, realPercent: 38.0 },
  { week: 'Semana 6', budgetZeroPercent: 48, realPercent: 46.5 },
  { week: 'Semana 7', budgetZeroPercent: 60, realPercent: 62.0 },
  { week: 'Semana 8', budgetZeroPercent: 72, realPercent: 70.0 },
  { week: 'Semana 9', budgetZeroPercent: 85, realPercent: 84.5 },
  { week: 'Semana 10', budgetZeroPercent: 96, realPercent: 97.0 },
]

const DEFAULT_RUBROS = [
  { id: 'fundaciones', name: 'Movimiento de Suelos & Fundaciones', laborCost: 400000, socialLawsCost: 260000, materialCost: 590000, budgeted: 1250000, executed: 1240000 },
  { id: 'estructura', name: 'Estructura de Hormigón Armado', laborCost: 900000, socialLawsCost: 585000, materialCost: 1315000, budgeted: 2800000, executed: 2750000 },
  { id: 'herreria', name: 'Herrería de Obra & Estructuras (Óxida)', laborCost: 500000, socialLawsCost: 325000, materialCost: 775000, budgeted: 1600000, executed: 1840000 },
  { id: 'madera', name: 'Carpintería en Madera & Encofrados', laborCost: 280000, socialLawsCost: 182000, materialCost: 338000, budgeted: 800000, executed: 775000 },
  { id: 'albanileria', name: 'Albañilería y Mampostería', laborCost: 450000, socialLawsCost: 292500, materialCost: 357500, budgeted: 1100000, executed: 1060000 },
  { id: 'instalaciones', name: 'Instalaciones (Eléctrica, Sanitaria, HVAC)', laborCost: 550000, socialLawsCost: 357500, materialCost: 642500, budgeted: 1550000, executed: 1585000 },
  { id: 'terminaciones', name: 'Terminaciones, Revestimientos y Pintura', laborCost: 350000, socialLawsCost: 227500, materialCost: 372500, budgeted: 950000, executed: 420000 }
]

function getRubroLaborCost(rubro) {
  if (rubro && rubro.laborCost != null && rubro.laborCost !== '' && !Number.isNaN(Number(rubro.laborCost))) {
    return Number(rubro.laborCost)
  }
  return Math.round((Number(rubro?.budgeted) || 0) * 0.35)
}

function getRubroSocialLaws(rubro) {
  if (rubro && rubro.socialLawsCost != null && rubro.socialLawsCost !== '' && !Number.isNaN(Number(rubro.socialLawsCost))) {
    return Number(rubro.socialLawsCost)
  }
  return Math.round(getRubroLaborCost(rubro) * 0.65)
}

function getRubroMaterialCost(rubro) {
  if (rubro && rubro.materialCost != null && rubro.materialCost !== '' && !Number.isNaN(Number(rubro.materialCost))) {
    return Number(rubro.materialCost)
  }
  const rem = (Number(rubro?.budgeted) || 0) - getRubroLaborCost(rubro) - getRubroSocialLaws(rubro)
  return Math.max(0, rem)
}

function getRubroTotalBudget(rubro) {
  if (rubro && (rubro.laborCost != null || rubro.socialLawsCost != null || rubro.materialCost != null)) {
    return getRubroLaborCost(rubro) + getRubroSocialLaws(rubro) + getRubroMaterialCost(rubro)
  }
  return Number(rubro?.budgeted) || 0
}

function formatMoney(amount) {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(amount)
}

function downloadFile(doc) {
  if (doc.fileData) {
    const link = document.createElement('a')
    link.href = doc.fileData
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    link.remove()
  } else {
    // Generate technical fiche download
    const content = `FICHA TÉCNICA DE ARCHIVO - ÓXIDA OXI PRO\n========================================\n` +
      `Archivo: ${doc.name}\n` +
      `Categoría: ${doc.type}\n` +
      `Versión: ${doc.version}\n` +
      `Estado: ${doc.status.toUpperCase()}\n` +
      `Tamaño: ${doc.fileSize || 'N/A'}\n` +
      `Fecha de Registro: ${doc.uploadedAt}\n` +
      `Responsable / Estudio: ${doc.uploadedBy}\n` +
      `Notas Técnicas: ${doc.notes || 'Sin observaciones registradas'}\n\n` +
      `Historial de Versiones:\n` +
      (doc.history || []).map(h => `- [${h.version}] (${h.date}) [${h.status}]: ${h.notes}`).join('\n') +
      `\n\nEmitido por Suite OxI Pro - Control de Ingeniería y Obra Mercadobra / Óxida`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = doc.name.endsWith('.txt') ? doc.name : `${doc.name}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }
}

function addDays(dateStr, days) {
  if (!dateStr) return dateStr
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length !== 3 || Number.isNaN(parts[0]) || Number.isNaN(parts[1]) || Number.isNaN(parts[2])) {
    return dateStr
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  d.setDate(d.getDate() + Number(days))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getTaskSocialLaws(task) {
  if (task && task.socialLawsCost != null && task.socialLawsCost !== '' && !Number.isNaN(Number(task.socialLawsCost))) {
    return Number(task.socialLawsCost)
  }
  return Math.round((task?.assignedLaborCost || 0) * 0.65)
}

function getTaskPlannedPercent(task) {
  if (task && task.plannedPercent != null && task.plannedPercent !== '' && !Number.isNaN(Number(task.plannedPercent))) {
    return Math.min(100, Math.max(0, Number(task.plannedPercent)))
  }
  if (task?.startDate && task?.endDate) {
    const start = new Date(task.startDate).getTime()
    const end = new Date(task.endDate).getTime()
    const now = new Date('2026-10-17').getTime()
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      if (now <= start) return 0
      if (now >= end) return 100
      return Math.round(((now - start) / (end - start)) * 100)
    }
  }
  return 0
}

function getTaskBudget(task) {
  return (task?.assignedLaborCost || 0) + getTaskSocialLaws(task) + (task?.materialCost || 0)
}

function getTaskExecutedCost(task) {
  const budget = getTaskBudget(task)
  const real = Math.min(100, Math.max(0, Number(task?.progressPercent) || 0))
  return Math.round(budget * (real / 100))
}

function getTaskBalance(task) {
  return Math.max(0, getTaskBudget(task) - getTaskExecutedCost(task))
}

function exportScheduleCsv(schedule, projectName) {
  const headers = [
    'Tarea', 'Fecha Inicio', 'Fecha Fin', 'Personas', 'Categoria Personal',
    'Tarifa Diaria ($)', 'Costo Mano de Obra ($)', 'Leyes Sociales ($)',
    'Costo Materiales ($)', 'Presupuesto Total Tarea ($)', 'Mes',
    'Avance Programado (%)', 'Avance Real Certificado (%)', 'Desvio (%)',
    'Estado Plazo', 'Costo Ejecutado ($)', 'Saldo Restante ($)'
  ]
  const rows = schedule.map(t => {
    const labor = t.assignedLaborCost || 0
    const social = getTaskSocialLaws(t)
    const material = t.materialCost || 0
    const total = labor + social + material
    const planned = getTaskPlannedPercent(t)
    const real = Math.min(100, Math.max(0, Number(t.progressPercent) || 0))
    const delta = real - planned
    const status = delta > 0 ? 'Adelantada' : delta < 0 ? 'Atrasada' : 'En plazo'
    const executed = Math.round(total * (real / 100))
    const balance = Math.max(0, total - executed)
    return [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      t.startDate,
      t.endDate,
      t.peopleCount,
      `"${t.category}"`,
      t.categoryRate,
      labor,
      social,
      material,
      total,
      `"${t.month}"`,
      `${planned}%`,
      `${real}%`,
      `${delta}%`,
      `"${status}"`,
      executed,
      balance
    ]
  })
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Cronograma_${(projectName || 'Obra').replace(/\s+/g, '_')}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportRubrosCsv(rubros, projectName) {
  const headers = [
    'Rubro de Obra', 'Mano de Obra ($)', 'Leyes Sociales ($)', 'Materiales / Subcontratos ($)',
    'Presupuesto Total ($)', 'Ejecutado a la Fecha ($)', 'Saldo Disponible ($)', 'Porcentaje Consumido (%)', 'Estado'
  ]
  const rows = rubros.map(r => {
    const labor = getRubroLaborCost(r)
    const social = getRubroSocialLaws(r)
    const material = getRubroMaterialCost(r)
    const totalBudget = getRubroTotalBudget(r)
    const executed = Number(r.executed) || 0
    const diff = totalBudget - executed
    const percent = Math.round((executed / (totalBudget || 1)) * 100)
    const status = percent > 100 ? 'SOBRECOSTO CRITICO' : percent >= 85 ? 'LIMITE PROXIMO' : 'NORMAL'
    return [
      `"${(r.name || '').replace(/"/g, '""')}"`,
      labor,
      social,
      material,
      totalBudget,
      executed,
      diff,
      `${percent}%`,
      status
    ]
  })
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Balance_Rubros_${(projectName || 'Obra').replace(/\s+/g, '_')}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function OxiProSuite({ project, projects = [], onSelectProject, onBackToClassic }) {
  const projectId = project?.id || 'demo'
  const storageKey = `oxi_pro_state_${projectId}`

  const [activeTab, setActiveTab] = useState('docs') // 'docs' | 'cronograma' | 'control' | 'rubros'
  const [docFilter, setDocFilter] = useState('todos')
  
  // Stored state
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_docs`)
      return saved ? JSON.parse(saved) : DEFAULT_DOCUMENTS
    } catch {
      return DEFAULT_DOCUMENTS
    }
  })

  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_sched`)
      return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE
    } catch {
      return DEFAULT_SCHEDULE
    }
  })

  const [monthlyComp, setMonthlyComp] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_monthly`)
      return saved ? JSON.parse(saved) : DEFAULT_MONTHLY_COMPARISON
    } catch {
      return DEFAULT_MONTHLY_COMPARISON
    }
  })

  const [weeklyProgress, setWeeklyProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_weekly`)
      return saved ? JSON.parse(saved) : DEFAULT_WEEKLY_PROGRESS
    } catch {
      return DEFAULT_WEEKLY_PROGRESS
    }
  })

  const [rubros, setRubros] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_rubros`)
      return saved ? JSON.parse(saved) : DEFAULT_RUBROS
    } catch {
      return DEFAULT_RUBROS
    }
  })

  // Reload state if project changes
  useEffect(() => {
    try {
      const savedDocs = localStorage.getItem(`${storageKey}_docs`)
      setDocuments(savedDocs ? JSON.parse(savedDocs) : DEFAULT_DOCUMENTS)

      const savedSched = localStorage.getItem(`${storageKey}_sched`)
      setSchedule(savedSched ? JSON.parse(savedSched) : DEFAULT_SCHEDULE)

      const savedMonthly = localStorage.getItem(`${storageKey}_monthly`)
      setMonthlyComp(savedMonthly ? JSON.parse(savedMonthly) : DEFAULT_MONTHLY_COMPARISON)

      const savedWeekly = localStorage.getItem(`${storageKey}_weekly`)
      setWeeklyProgress(savedWeekly ? JSON.parse(savedWeekly) : DEFAULT_WEEKLY_PROGRESS)

      const savedRubros = localStorage.getItem(`${storageKey}_rubros`)
      setRubros(savedRubros ? JSON.parse(savedRubros) : DEFAULT_RUBROS)

      const savedRainLogs = localStorage.getItem(`${storageKey}_rainLogs`)
      setRainLogs(savedRainLogs ? JSON.parse(savedRainLogs) : [])
    } catch (e) {
      console.warn('Error reloading project state', e)
    }
  }, [projectId, storageKey])

  // Modals & form state
  const [showAddDocModal, setShowAddDocModal] = useState(false)
  const [newDoc, setNewDoc] = useState({ name: '', type: 'planos', version: 'v1.0', uploadedBy: '', notes: '', fileSize: '', fileData: null })
  const [selectedDocHistory, setSelectedDocHistory] = useState(null)
  
  // Iteration modal
  const [showAddIterationModal, setShowAddIterationModal] = useState(false)
  const [iterationDoc, setIterationDoc] = useState(null)
  const [iterationForm, setIterationForm] = useState({ version: '', notes: '', fileData: null, fileName: '' })

  // Schedule modal
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    startDate: '2026-11-01',
    endDate: '2026-11-20',
    workDays: 16,
    peopleCount: 4,
    category: 'Oficial Especializado',
    categoryRate: 3400,
    socialLawsCost: '',
    materialCost: 500000,
    month: 'Mes 1',
    plannedPercent: 0,
    progressPercent: 0
  })

  // Rain delay modal & logs
  const [showRainModal, setShowRainModal] = useState(false)
  const [rainLogs, setRainLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_rainLogs`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [rainForm, setRainForm] = useState({
    date: '2026-10-18',
    days: 2,
    reason: 'Lluvias y precipitaciones copiosas',
    recordDocument: true,
    notes: 'Suspensión de hormigonado y tareas exteriores por temporal con anegamiento.'
  })

  // Rubro modal
  const [showAddRubroModal, setShowAddRubroModal] = useState(false)
  const [newRubro, setNewRubro] = useState({
    name: '',
    laborCost: 200000,
    socialLawsCost: 130000,
    materialCost: 170000,
    executed: 0,
    customSocial: false
  })

  // Auto-save
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_docs`, JSON.stringify(documents))
      localStorage.setItem(`${storageKey}_sched`, JSON.stringify(schedule))
      localStorage.setItem(`${storageKey}_monthly`, JSON.stringify(monthlyComp))
      localStorage.setItem(`${storageKey}_weekly`, JSON.stringify(weeklyProgress))
      localStorage.setItem(`${storageKey}_rubros`, JSON.stringify(rubros))
      localStorage.setItem(`${storageKey}_rainLogs`, JSON.stringify(rainLogs))
    } catch (e) {
      console.warn('Error saving Oxi Pro state', e)
    }
  }, [documents, schedule, monthlyComp, weeklyProgress, rubros, rainLogs, storageKey])

  // Rain calculations
  const totalRainDays = useMemo(() => {
    return rainLogs.reduce((sum, log) => sum + (Number(log.days) || 0), 0)
  }, [rainLogs])

  const previewShiftedTasks = useMemo(() => {
    if (!showRainModal) return []
    const delayDays = Math.max(1, Number(rainForm.days) || 1)
    const eventDate = rainForm.date
    if (!eventDate) return []

    return schedule
      .filter(t => (t.progressPercent || 0) < 100 && t.endDate >= eventDate)
      .map(t => {
        let newStart = t.startDate
        let newEnd = t.endDate
        if (t.startDate <= eventDate && t.endDate >= eventDate) {
          newEnd = addDays(t.endDate, delayDays)
        } else if (t.startDate > eventDate) {
          newStart = addDays(t.startDate, delayDays)
          newEnd = addDays(t.endDate, delayDays)
        }
        return {
          id: t.id,
          name: t.name,
          oldStart: t.startDate,
          oldEnd: t.endDate,
          newStart,
          newEnd,
          isOngoing: t.startDate <= eventDate && t.endDate >= eventDate
        }
      })
  }, [showRainModal, rainForm.date, rainForm.days, schedule])

  // Calculated global stats
  const totalLaborCost = useMemo(() => schedule.reduce((sum, t) => sum + (t.assignedLaborCost || 0), 0), [schedule])
  const totalSocialLawsCost = useMemo(() => schedule.reduce((sum, t) => sum + getTaskSocialLaws(t), 0), [schedule])
  const totalMaterialCost = useMemo(() => schedule.reduce((sum, t) => sum + (t.materialCost || 0), 0), [schedule])
  const totalProjectBudget = totalLaborCost + totalSocialLawsCost + totalMaterialCost

  const totalExecutedCost = useMemo(() => {
    return schedule.reduce((sum, t) => sum + getTaskExecutedCost(t), 0)
  }, [schedule])

  const totalBalanceCost = Math.max(0, totalProjectBudget - totalExecutedCost)

  const globalProgress = useMemo(() => {
    if (!schedule.length) return 0
    if (!totalProjectBudget) {
      return Math.round(schedule.reduce((sum, t) => sum + (Number(t.progressPercent) || 0), 0) / schedule.length)
    }
    const weightedSum = schedule.reduce((sum, t) => sum + ((Number(t.progressPercent) || 0) * getTaskBudget(t)), 0)
    return Math.round(weightedSum / totalProjectBudget)
  }, [schedule, totalProjectBudget])

  const plannedGlobalProgress = useMemo(() => {
    if (!schedule.length) return 0
    if (!totalProjectBudget) {
      return Math.round(schedule.reduce((sum, t) => sum + getTaskPlannedPercent(t), 0) / schedule.length)
    }
    const weightedSum = schedule.reduce((sum, t) => sum + (getTaskPlannedPercent(t) * getTaskBudget(t)), 0)
    return Math.round(weightedSum / totalProjectBudget)
  }, [schedule, totalProjectBudget])

  const globalDelta = globalProgress - plannedGlobalProgress

  // Alerts by rubro with detailed breakdown (MO + Leyes Sociales + Materiales)
  const rubroAlerts = useMemo(() => {
    return rubros.map(r => {
      const labor = getRubroLaborCost(r)
      const social = getRubroSocialLaws(r)
      const material = getRubroMaterialCost(r)
      const totalBudget = getRubroTotalBudget(r)
      const executed = Number(r.executed) || 0
      const diff = executed - totalBudget
      const percent = Math.round((executed / (totalBudget || 1)) * 100)
      let status = 'normal'
      if (percent > 100) status = 'critical'
      else if (percent >= 85) status = 'warning'
      return {
        ...r,
        laborCost: labor,
        socialLawsCost: social,
        materialCost: material,
        budgeted: totalBudget,
        executed,
        diff,
        percent,
        status
      }
    })
  }, [rubros])

  const rubroTotals = useMemo(() => {
    const labor = rubroAlerts.reduce((acc, r) => acc + (r.laborCost || 0), 0)
    const social = rubroAlerts.reduce((acc, r) => acc + (r.socialLawsCost || 0), 0)
    const material = rubroAlerts.reduce((acc, r) => acc + (r.materialCost || 0), 0)
    const budgeted = rubroAlerts.reduce((acc, r) => acc + (r.budgeted || 0), 0)
    const executed = rubroAlerts.reduce((acc, r) => acc + (r.executed || 0), 0)
    const saldo = budgeted - executed
    return { labor, social, material, budgeted, executed, saldo }
  }, [rubroAlerts])

  const criticalAlertsCount = rubroAlerts.filter(a => a.status === 'critical').length

  // Handlers for Documents
  function handleDocFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2)
    const reader = new FileReader()
    reader.onload = () => {
      let guessedType = newDoc.type
      const ext = file.name.split('.').pop().toLowerCase()
      if (['dwg', 'dxf', 'cad', 'rvt', 'ifc'].includes(ext)) guessedType = 'planos'
      else if (['doc', 'docx', 'txt'].includes(ext)) guessedType = 'certificaciones'
      
      setNewDoc(prev => ({
        ...prev,
        name: file.name,
        type: guessedType,
        fileSize: `${fileSizeMb} MB`,
        fileData: reader.result
      }))
    }
    reader.readAsDataURL(file)
  }

  function handleAddDocument(e) {
    e.preventDefault()
    if (!newDoc.name) return
    const docEntry = {
      id: Date.now(),
      name: newDoc.name,
      type: newDoc.type,
      version: newDoc.version || 'v1.0',
      fileSize: newDoc.fileSize || '1.5 MB',
      fileData: newDoc.fileData || null,
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: newDoc.uploadedBy || 'Dirección de Obra',
      status: 'en_revision',
      notes: newDoc.notes || '',
      history: [
        {
          version: newDoc.version || 'v1.0',
          date: new Date().toISOString().split('T')[0],
          status: 'en_revision',
          notes: newDoc.notes || 'Subida inicial de archivo'
        }
      ]
    }
    setDocuments([docEntry, ...documents])
    setShowAddDocModal(false)
    setNewDoc({ name: '', type: 'planos', version: 'v1.0', uploadedBy: '', notes: '', fileSize: '', fileData: null })
  }

  function openIterationModal(doc) {
    setIterationDoc(doc)
    const currentNum = parseFloat(doc.version.replace(/[^0-9.]/g, '')) || 1.0
    const nextVer = `v${(currentNum + 0.1).toFixed(1)}`
    setIterationForm({
      version: nextVer,
      notes: '',
      fileData: null,
      fileName: ''
    })
    setShowAddIterationModal(true)
  }

  function handleIterationFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setIterationForm(prev => ({
        ...prev,
        fileName: file.name,
        fileData: reader.result
      }))
    }
    reader.readAsDataURL(file)
  }

  function handleIterationSubmit(e) {
    e.preventDefault()
    if (!iterationDoc) return
    const newVer = iterationForm.version || 'v2.0'
    const newNotes = iterationForm.notes || 'Actualización de archivo técnico'
    
    setDocuments(documents.map(d => {
      if (d.id !== iterationDoc.id) return d
      const verEntry = {
        version: newVer,
        date: new Date().toISOString().split('T')[0],
        status: 'en_revision',
        notes: newNotes
      }
      return {
        ...d,
        name: iterationForm.fileName || d.name,
        version: newVer,
        fileData: iterationForm.fileData || d.fileData,
        status: 'en_revision',
        notes: newNotes,
        uploadedAt: new Date().toISOString().split('T')[0],
        history: [...d.history, verEntry]
      }
    }))
    setShowAddIterationModal(false)
    setIterationDoc(null)
  }

  function handleUpdateDocStatus(docId, newStatus) {
    setDocuments(documents.map(d => d.id === docId ? { ...d, status: newStatus } : d))
  }

  function handleDeleteDoc(docId) {
    if (window.confirm('¿Seguro que deseas eliminar este documento del repositorio?')) {
      setDocuments(documents.filter(d => d.id !== docId))
    }
  }

  // Handlers for Schedule
  function handleTaskDatesChange(start, end) {
    let days = 20
    if (start && end) {
      const d1 = new Date(start)
      const d2 = new Date(end)
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
      if (diff > 0) days = diff
    }
    setNewTask(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      workDays: days
    }))
  }

  function handleAddTask(e) {
    e.preventDefault()
    if (!newTask.name) return
    const days = Math.max(1, Number(newTask.workDays) || 20)
    const laborCost = newTask.peopleCount * newTask.categoryRate * days
    const socialCost = newTask.socialLawsCost !== '' && newTask.socialLawsCost != null
      ? Number(newTask.socialLawsCost)
      : Math.round(laborCost * 0.65)
    const taskEntry = {
      id: Date.now(),
      name: newTask.name,
      startDate: newTask.startDate || '2026-11-01',
      endDate: newTask.endDate || '2026-11-20',
      peopleCount: Number(newTask.peopleCount),
      category: newTask.category,
      categoryRate: Number(newTask.categoryRate),
      assignedLaborCost: laborCost,
      socialLawsCost: socialCost,
      customSocialLaws: newTask.socialLawsCost !== '' && newTask.socialLawsCost != null,
      materialCost: Number(newTask.materialCost) || 0,
      month: newTask.month,
      plannedPercent: Math.min(100, Math.max(0, Number(newTask.plannedPercent) || 0)),
      progressPercent: Math.min(100, Math.max(0, Number(newTask.progressPercent) || 0))
    }
    setSchedule([...schedule, taskEntry])
    setShowAddTaskModal(false)
    setNewTask({
      name: '',
      startDate: '2026-11-01',
      endDate: '2026-11-20',
      workDays: 16,
      peopleCount: 4,
      category: 'Oficial Especializado',
      categoryRate: 3400,
      socialLawsCost: '',
      materialCost: 500000,
      month: 'Mes 1',
      plannedPercent: 0,
      progressPercent: 0
    })
  }

  function handleUpdateTaskPlanned(taskId, planned) {
    setSchedule(schedule.map(t => t.id === taskId ? { ...t, plannedPercent: Math.min(100, Math.max(0, Number(planned))) } : t))
  }

  function handleUpdateTaskProgress(taskId, progress) {
    setSchedule(schedule.map(t => t.id === taskId ? { ...t, progressPercent: Math.min(100, Math.max(0, Number(progress))) } : t))
  }

  function handleDeleteTask(taskId) {
    if (window.confirm('¿Seguro que deseas eliminar esta tarea del cronograma?')) {
      setSchedule(schedule.filter(t => t.id !== taskId))
    }
  }

  function handleApplyRainDelay(e) {
    e.preventDefault()
    const delayDays = Math.max(1, Number(rainForm.days) || 1)
    const eventDate = rainForm.date
    if (!eventDate) return

    let affectedTasksCount = 0
    const updatedSchedule = schedule.map(t => {
      // Don't shift completed tasks
      if (Number(t.progressPercent) === 100) return t
      // Don't shift tasks that ended strictly before the rain event
      if (t.endDate < eventDate) return t

      affectedTasksCount++
      let newStart = t.startDate
      let newEnd = t.endDate

      if (t.startDate <= eventDate && t.endDate >= eventDate) {
        // Ongoing task during rain: extend endDate by delayDays
        newEnd = addDays(t.endDate, delayDays)
      } else if (t.startDate > eventDate) {
        // Future task: push both start and end forward by delayDays
        newStart = addDays(t.startDate, delayDays)
        newEnd = addDays(t.endDate, delayDays)
      }

      return {
        ...t,
        startDate: newStart,
        endDate: newEnd
      }
    })

    if (affectedTasksCount === 0) {
      alert('No se encontraron tareas activas o futuras a partir de la fecha seleccionada.')
      return
    }

    const logEntry = {
      id: Date.now(),
      date: eventDate,
      days: delayDays,
      reason: rainForm.reason,
      notes: rainForm.notes,
      affectedCount: affectedTasksCount,
      timestamp: new Date().toISOString(),
      previousSchedule: schedule
    }

    if (rainForm.recordDocument) {
      const rainDoc = {
        id: Date.now(),
        name: `Acta_Suspension_Lluvia_${eventDate}.pdf`,
        type: 'no_conformidades',
        version: 'v1.0',
        fileSize: '0.8 MB',
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: 'Dirección de Obra',
        status: 'aprobado',
        notes: `Suspensión por ${rainForm.reason} (+${delayDays}d). Se corrieron ${affectedTasksCount} tareas en cascada. ${rainForm.notes || ''}`,
        history: [
          {
            version: 'v1.0',
            date: eventDate,
            status: 'aprobado',
            notes: `Homologación técnica de suspensión climática (+${delayDays}d)`
          }
        ]
      }
      setDocuments(prev => [rainDoc, ...prev])
    }

    setRainLogs(prev => [logEntry, ...prev])
    setSchedule(updatedSchedule)
    setShowRainModal(false)
  }

  function handleUndoRainDelay(logId) {
    const targetLog = rainLogs.find(l => l.id === logId)
    if (!targetLog) return
    if (!window.confirm(`¿Revertir el corrimiento del evento del ${targetLog.date} (+${targetLog.days} días)? Las fechas volverán a su estado previo.`)) return

    if (targetLog.previousSchedule) {
      setSchedule(targetLog.previousSchedule)
    }
    setRainLogs(prev => prev.filter(l => l.id !== logId))
  }

  // Handlers for Rubros
  function handleUpdateRubro(id, field, value) {
    const num = Number(value) || 0
    setRubros(rubros.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: num }
      if (field === 'laborCost') {
        const soc = r.customSocialLaws ? getRubroSocialLaws(r) : Math.round(num * 0.65)
        const mat = getRubroMaterialCost(r)
        return { ...updated, laborCost: num, socialLawsCost: soc, materialCost: mat, budgeted: num + soc + mat }
      }
      if (field === 'socialLawsCost') {
        const labor = getRubroLaborCost(r)
        const mat = getRubroMaterialCost(r)
        return { ...updated, socialLawsCost: num, customSocialLaws: true, budgeted: labor + num + mat }
      }
      if (field === 'materialCost') {
        const labor = getRubroLaborCost(r)
        const soc = getRubroSocialLaws(r)
        return { ...updated, materialCost: num, budgeted: labor + soc + num }
      }
      return updated
    }))
  }

  function handleAddRubro(e) {
    e.preventDefault()
    if (!newRubro.name) return
    const labor = Number(newRubro.laborCost) || 0
    const social = newRubro.socialLawsCost !== '' && newRubro.socialLawsCost != null
      ? Number(newRubro.socialLawsCost)
      : Math.round(labor * 0.65)
    const material = Number(newRubro.materialCost) || 0
    const totalBudget = labor + social + material

    const entry = {
      id: `rubro_${Date.now()}`,
      name: newRubro.name,
      laborCost: labor,
      socialLawsCost: social,
      customSocialLaws: newRubro.customSocial,
      materialCost: material,
      budgeted: totalBudget,
      executed: Number(newRubro.executed) || 0
    }
    setRubros([...rubros, entry])
    setShowAddRubroModal(false)
    setNewRubro({
      name: '',
      laborCost: 200000,
      socialLawsCost: 130000,
      materialCost: 170000,
      executed: 0,
      customSocial: false
    })
  }

  function handleDeleteRubro(rubroId) {
    if (window.confirm('¿Eliminar esta partida presupuestaria?')) {
      setRubros(rubros.filter(r => r.id !== rubroId))
    }
  }

  const filteredDocs = docFilter === 'todos' ? documents : documents.filter(d => d.type === docFilter)

  return (
    <div className="oxi-pro-container">
      {/* ── TOP HEADER PRO ── */}
      <header className="oxi-pro-header">
        <div className="oxi-pro-header-left">
          <div className="oxi-pro-badge-row">
            <span className="oxi-pro-badge">PLATAFORMA OXI PRO</span>
            <span className="oxi-pro-obra-tag">
              Obra: {project?.name || 'Torre Libertador (Edificio Residencial)'}
              {project?.location ? ` · ${project.location}` : ''}
            </span>
            {projects && projects.length > 1 && onSelectProject && (
              <select
                className="oxi-pro-project-select"
                value={projectId}
                onChange={(e) => onSelectProject(Number(e.target.value))}
                title="Cambiar de Obra"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          <h2>Control de Ingeniería, Costos y Cronograma de Obra</h2>
          <p>Herramienta técnica y financiera para Constructoras y Estudios de Arquitectura.</p>
        </div>
        <div className="oxi-pro-header-actions">
          <button className="oxi-btn-back-classic" onClick={onBackToClassic}>
            ← Volver a OxI Clásico
          </button>
        </div>
      </header>

      {/* ── METRICS STRIP ── */}
      <div className="oxi-pro-kpi-grid">
        <div className="oxi-pro-kpi-card highlight">
          <span className="kpi-label">Avance Físico: Real vs. Plan</span>
          <div className="kpi-value-row">
            <strong>{globalProgress}%</strong>
            <span className="kpi-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Plan: <strong>{plannedGlobalProgress}%</strong></span>
              <span className={`delta-badge ${globalDelta > 0 ? 'ahead' : globalDelta < 0 ? 'delayed' : 'ontrack'}`}>
                {globalDelta > 0 ? `+${globalDelta}%` : `${globalDelta}%`}
              </span>
            </span>
          </div>
          <div className="kpi-progress-bar" title={`Avance Real: ${globalProgress}% | Avance Programado: ${plannedGlobalProgress}%`}>
            <div className="kpi-progress-fill" style={{ width: `${globalProgress}%` }} />
          </div>
        </div>

        <div className="oxi-pro-kpi-card">
          <span className="kpi-label">Costo Mano de Obra</span>
          <strong>{formatMoney(totalLaborCost)}</strong>
          <span className="kpi-sub">{schedule.reduce((acc, t) => acc + (t.peopleCount || 0), 0)} operarios activos</span>
        </div>

        <div className="oxi-pro-kpi-card">
          <span className="kpi-label">Leyes Sociales (BPS / Aportes)</span>
          <strong>{formatMoney(totalSocialLawsCost)}</strong>
          <span className="kpi-sub">Cargas sociales sobre mano de obra</span>
        </div>

        <div className="oxi-pro-kpi-card">
          <span className="kpi-label">Costo Materiales Asignado</span>
          <strong>{formatMoney(totalMaterialCost)}</strong>
          <span className="kpi-sub">{schedule.length} partidas presupuestarias</span>
        </div>

        <div className="oxi-pro-kpi-card">
          <span className="kpi-label">Costo Ejecutado / Devengado</span>
          <strong style={{ color: '#ea580c' }}>{formatMoney(totalExecutedCost)}</strong>
          <span className="kpi-sub">de {formatMoney(totalProjectBudget)} (Saldo: {formatMoney(totalBalanceCost)})</span>
        </div>

        <div className={`oxi-pro-kpi-card ${criticalAlertsCount > 0 ? 'alert' : ''}`}>
          <span className="kpi-label">Alertas de Sobrecosto</span>
          <strong style={{ color: criticalAlertsCount > 0 ? '#ef4444' : '#10b981' }}>
            {criticalAlertsCount > 0 ? `${criticalAlertsCount} Rubros excedidos` : '0 desvíos críticos'}
          </strong>
          <span className="kpi-sub">Saldo por ejecutar: {formatMoney(totalBalanceCost)}</span>
        </div>
      </div>

      {/* ── SUB-TABS NAVIGATION ── */}
      <nav className="oxi-pro-subnav">
        <button
          className={`subnav-btn ${activeTab === 'docs' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          📁 Carga de Planos & Iteraciones
          <span className="subnav-count">{documents.length}</span>
        </button>
        <button
          className={`subnav-btn ${activeTab === 'cronograma' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('cronograma')}
        >
          📅 Cronograma Editable & Recursos
          <span className="subnav-count">{schedule.length}</span>
        </button>
        <button
          className={`subnav-btn ${activeTab === 'control' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          📊 Avance Real vs Presup. Cero (%)
        </button>
        <button
          className={`subnav-btn ${activeTab === 'rubros' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('rubros')}
        >
          🚨 Presupuestos vs Ejecutados & Alertas
          {criticalAlertsCount > 0 && <span className="subnav-alert-dot">!</span>}
        </button>
      </nav>

      {/* ── TAB 1: GESTOR DOCUMENTAL & ITERACIONES ── */}
      {activeTab === 'docs' && (
        <section className="oxi-pro-section">
          <div className="section-toolbar">
            <div className="doc-filter-pills">
              {FILE_TYPES.map(ft => (
                <button
                  key={ft.id}
                  className={`pill-btn ${docFilter === ft.id ? 'is-active' : ''}`}
                  onClick={() => setDocFilter(ft.id)}
                >
                  <span>{ft.icon}</span> {ft.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="oxi-btn-primary" onClick={() => setShowAddDocModal(true)}>
                ＋ Subir Archivo / Plano
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="oxi-pro-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Archivo / Plano</th>
                  <th>Versión Actual</th>
                  <th>Fecha</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Notas / Iteración</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#666' }}>
                      No hay archivos registrados en esta categoría. Hacé clic en "＋ Subir Archivo / Plano" para cargar documentación técnica.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => {
                    const typeObj = FILE_TYPES.find(t => t.id === doc.type) || { icon: '📄', label: doc.type }
                    return (
                      <tr key={doc.id}>
                        <td>
                          <span className={`file-type-tag type-${doc.type}`}>
                            {typeObj.icon} {typeObj.label}
                          </span>
                        </td>
                        <td>
                          <strong>{doc.name}</strong>
                          {doc.fileSize && <small style={{ display: 'block', color: '#888' }}>{doc.fileSize}</small>}
                        </td>
                        <td>
                          <span className="version-pill">{doc.version}</span>
                          {doc.history && doc.history.length > 1 && (
                            <small className="history-link" onClick={() => setSelectedDocHistory(doc)}>
                              ({doc.history.length} iteraciones)
                            </small>
                          )}
                        </td>
                        <td>{doc.uploadedAt}</td>
                        <td><small>{doc.uploadedBy}</small></td>
                        <td>
                          <select
                            className={`status-select status-${doc.status}`}
                            value={doc.status}
                            onChange={(e) => handleUpdateDocStatus(doc.id, e.target.value)}
                          >
                            <option value="aprobado">✓ Aprobado</option>
                            <option value="en_revision">⏳ En Revisión</option>
                            <option value="observado">⚠️ Observado</option>
                          </select>
                        </td>
                        <td>
                          <span className="doc-note">{doc.notes || '—'}</span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="oxi-btn-small"
                              title="Descargar archivo"
                              onClick={() => downloadFile(doc)}
                            >
                              ⬇ Descargar
                            </button>
                            <button
                              className="oxi-btn-small outline"
                              title="Subir nueva iteración o corrección"
                              onClick={() => openIterationModal(doc)}
                            >
                              + Iteración
                            </button>
                            <button
                              className="oxi-btn-small outline"
                              title="Ver historial de cambios"
                              onClick={() => setSelectedDocHistory(doc)}
                            >
                              Historial
                            </button>
                            <button
                              className="btn-delete"
                              title="Eliminar archivo"
                              onClick={() => handleDeleteDoc(doc.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── TAB 2: CRONOGRAMA DE OBRA EDITABLE ── */}
      {activeTab === 'cronograma' && (
        <section className="oxi-pro-section">
          <div className="section-toolbar">
            <div>
              <h3>Cronograma de Obra & Asignación de Recursos</h3>
              <p>Control de avance físico (Programado vs. Real Certificado) y costo ejecutado con devengamiento en tiempo real.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="oxi-btn-rain"
                onClick={() => {
                  setRainForm({
                    date: '2026-10-18',
                    days: 2,
                    reason: 'Lluvias y precipitaciones copiosas',
                    recordDocument: true,
                    notes: 'Suspensión preventiva de hormigonado y trabajos en altura por temporal.'
                  })
                  setShowRainModal(true)
                }}
                title="Desplazar automáticamente las tareas en cascada por días de lluvia o demoras"
              >
                🌧️ Registrar Lluvia / Demora
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => exportScheduleCsv(schedule, project?.name || 'Obra')}
                title="Descargar tabla en formato Excel CSV"
              >
                📥 Exportar Cronograma (CSV)
              </button>
              <button className="oxi-btn-primary" onClick={() => setShowAddTaskModal(true)}>
                ＋ Agregar Tarea al Cronograma
              </button>
            </div>
          </div>

          {/* Banner de Lluvia y Clima si existen registros */}
          {rainLogs.length > 0 && (
            <div className="rain-banner">
              <div className="rain-banner-content">
                <span style={{ fontSize: '1.4rem' }}>🌧️</span>
                <div>
                  <strong>Control Climático & Demoras:</strong>{' '}
                  <span>
                    Se han computado <strong>{totalRainDays} días acumulados de suspensión</strong> ({rainLogs.length} eventos).{' '}
                    Último corrimiento: <strong>{rainLogs[0].date}</strong> (+{rainLogs[0].days} días por {rainLogs[0].reason}).
                  </span>
                </div>
              </div>
              <div className="rain-banner-actions">
                <button
                  type="button"
                  className="oxi-btn-small outline"
                  onClick={() => handleUndoRainDelay(rainLogs[0].id)}
                  title="Revertir el último corrimiento de fechas aplicado"
                >
                  ↺ Deshacer último corrimiento
                </button>
              </div>
            </div>
          )}

          {/* Quick executive summary bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            background: '#fafafa',
            border: '1px solid #e5e5e5',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '1.25rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', fontWeight: 'bold' }}>Avance Programado (Plan)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0369a1' }}>{plannedGlobalProgress}%</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', fontWeight: 'bold' }}>Avance Real Certificado</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#15803d' }}>{globalProgress}%</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', fontWeight: 'bold' }}>Desvío de Plazo</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                <span className={`delta-badge ${globalDelta > 0 ? 'ahead' : globalDelta < 0 ? 'delayed' : 'ontrack'}`} style={{ fontSize: '0.85rem' }}>
                  {globalDelta > 0 ? `+${globalDelta}% Adelantado` : globalDelta < 0 ? `${globalDelta}% Atrasado` : '0% En Plazo'}
                </span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', fontWeight: 'bold' }}>Costo Total Ejecutado</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ea580c' }}>{formatMoney(totalExecutedCost)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', fontWeight: 'bold' }}>Saldo por Devengar</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#262626' }}>{formatMoney(totalBalanceCost)}</div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="oxi-pro-table schedule-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Tarea de Obra</th>
                  <th style={{ minWidth: '130px' }}>Plazo (Inicio - Fin)</th>
                  <th>Personal</th>
                  <th>Categoría & Tarifa</th>
                  <th>Costo Mano Obra</th>
                  <th>Leyes Sociales (BPS)</th>
                  <th>Costo Materiales</th>
                  <th>Presupuesto Tarea</th>
                  <th style={{ minWidth: '130px' }}>% Programado</th>
                  <th style={{ minWidth: '130px' }}>% Real Certificado</th>
                  <th>Desvío / Plazo</th>
                  <th style={{ minWidth: '140px' }}>Costo Ejecutado ($)</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(task => {
                  const planned = getTaskPlannedPercent(task)
                  const real = Math.min(100, Math.max(0, Number(task.progressPercent) || 0))
                  const delta = real - planned
                  const isDone = real === 100
                  const isProgress = real > 0 && real < 100
                  const labor = task.assignedLaborCost || 0
                  const social = getTaskSocialLaws(task)
                  const material = task.materialCost || 0
                  const totalTask = labor + social + material
                  const taskExecuted = Math.round(totalTask * (real / 100))
                  const taskBalance = Math.max(0, totalTask - taskExecuted)

                  return (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.name}</strong>
                        <div>
                          <span className="month-pill" style={{ marginTop: '4px', display: 'inline-block' }}>{task.month}</span>
                        </div>
                      </td>
                      <td>
                        <small>{task.startDate} al {task.endDate}</small>
                      </td>
                      <td>
                        <span className="people-badge">👷 {task.peopleCount} personas</span>
                      </td>
                      <td>
                        <div><strong>{task.category}</strong></div>
                        <small>{formatMoney(task.categoryRate)} / día</small>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={labor}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0
                              setSchedule(schedule.map(t => {
                                if (t.id !== task.id) return t
                                const newSocial = t.customSocialLaws ? t.socialLawsCost : Math.round(val * 0.65)
                                return { ...t, assignedLaborCost: val, socialLawsCost: newSocial }
                              }))
                            }}
                            title="Editar Costo Mano de Obra"
                            style={{
                              width: '105px',
                              padding: '5px 8px',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              border: '1px solid #d4d4d4',
                              borderRadius: '4px',
                              background: '#fff'
                            }}
                          />
                          <small style={{ color: '#737373' }}>{formatMoney(labor)}</small>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={social}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0
                              setSchedule(schedule.map(t => t.id === task.id ? { ...t, socialLawsCost: val, customSocialLaws: true } : t))
                            }}
                            title="Editar Leyes Sociales (BPS / Aportes)"
                            style={{
                              width: '105px',
                              padding: '5px 8px',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              border: '1px solid #d4d4d4',
                              borderRadius: '4px',
                              background: '#fff'
                            }}
                          />
                          <small style={{ color: '#737373' }}>{formatMoney(social)}</small>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={material}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0
                              setSchedule(schedule.map(t => t.id === task.id ? { ...t, materialCost: val } : t))
                            }}
                            title="Editar Costo Materiales"
                            style={{
                              width: '105px',
                              padding: '5px 8px',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              border: '1px solid #d4d4d4',
                              borderRadius: '4px',
                              background: '#fff'
                            }}
                          />
                          <small style={{ color: '#737373' }}>{formatMoney(material)}</small>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#262626', fontSize: '0.92rem' }}>
                          {formatMoney(totalTask)}
                        </strong>
                      </td>
                      <td>
                        <div className="progress-control">
                          <div className="progress-bar-wrap" style={{ background: '#e0f2fe', width: '55px' }}>
                            <div
                              className="progress-fill"
                              style={{ width: `${planned}%`, background: '#0284c7' }}
                            />
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={planned}
                            onChange={(e) => handleUpdateTaskPlanned(task.id, e.target.value)}
                            className="progress-input"
                            title="Modificar % Avance Programado (Plan)"
                            style={{ borderColor: '#bae6fd', color: '#0369a1', width: '45px' }}
                          />
                          <span className="unit-label">%</span>
                        </div>
                      </td>
                      <td>
                        <div className="progress-control">
                          <div className="progress-bar-wrap" style={{ width: '55px' }}>
                            <div
                              className={`progress-fill ${isDone ? 'done' : ''}`}
                              style={{ width: `${real}%` }}
                            />
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={real}
                            onChange={(e) => handleUpdateTaskProgress(task.id, e.target.value)}
                            className="progress-input"
                            title="Modificar % Avance Real Físico Certificado"
                            style={{ width: '45px' }}
                          />
                          <span className="unit-label">%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`delta-badge ${delta > 0 ? 'ahead' : delta < 0 ? 'delayed' : 'ontrack'}`} style={{ whiteSpace: 'nowrap' }}>
                            {delta > 0 ? `+${delta}% Adelantada` : delta < 0 ? `${delta}% Atrasada` : '0% En plazo'}
                          </span>
                          <span className={`task-status-pill ${isDone ? 'done' : isProgress ? 'progress' : 'pending'}`} style={{ fontSize: '0.72rem' }}>
                            {isDone ? '✓ Terminado' : isProgress ? '⚡ En curso' : '⏳ Pendiente'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ color: '#ea580c', fontSize: '0.92rem' }}>
                            {formatMoney(taskExecuted)}
                          </strong>
                          <small style={{ color: '#737373', fontSize: '0.75rem' }}>
                            Saldo: {formatMoney(taskBalance)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Eliminar tarea"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f5f5f4', fontWeight: 'bold', borderTop: '2px solid #d4d4d4' }}>
                  <td colSpan="4" style={{ textAlign: 'right', padding: '12px' }}>
                    TOTALES CRONOGRAMA:
                  </td>
                  <td style={{ padding: '12px' }}>{formatMoney(totalLaborCost)}</td>
                  <td style={{ padding: '12px' }}>{formatMoney(totalSocialLawsCost)}</td>
                  <td style={{ padding: '12px' }}>{formatMoney(totalMaterialCost)}</td>
                  <td style={{ padding: '12px', color: '#262626' }}>{formatMoney(totalProjectBudget)}</td>
                  <td style={{ padding: '12px', color: '#0369a1' }}>
                    <div>{plannedGlobalProgress}%</div>
                    <small style={{ color: '#737373', fontWeight: 'normal', fontSize: '0.75rem' }}>prom. plan</small>
                  </td>
                  <td style={{ padding: '12px', color: '#15803d' }}>
                    <div>{globalProgress}%</div>
                    <small style={{ color: '#737373', fontWeight: 'normal', fontSize: '0.75rem' }}>prom. real</small>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`delta-badge ${globalDelta > 0 ? 'ahead' : globalDelta < 0 ? 'delayed' : 'ontrack'}`}>
                      {globalDelta > 0 ? `+${globalDelta}%` : `${globalDelta}%`}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#ea580c' }}>
                    <div>{formatMoney(totalExecutedCost)}</div>
                    <small style={{ color: '#737373', fontWeight: 'normal', fontSize: '0.75rem', display: 'block' }}>
                      Saldo: {formatMoney(totalBalanceCost)}
                    </small>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* ── TAB 3: CONTROL SEMANAL & MENSUAL ── */}
      {activeTab === 'control' && (
        <section className="oxi-pro-section">
          {/* Submódulo A: Avance Real vs Presupuesto Cero Semanal */}
          <div className="card-box" style={{ marginBottom: '2.5rem' }}>
            <div className="card-box-header">
              <div>
                <span className="box-eyebrow">CURVA S SEMANAL DE CONTROL FÍSICO</span>
                <h3>Avance Real vs Presupuesto Cero Semanal (en %)</h3>
                <p>Compara el avance programado base ("Presupuesto Cero") con la ejecución real en sitio.</p>
              </div>
            </div>

            <div className="weekly-grid">
              {weeklyProgress.map((w, idx) => {
                const delta = (w.realPercent - w.budgetZeroPercent).toFixed(1)
                const isAhead = Number(delta) >= 0
                return (
                  <div key={idx} className="weekly-card">
                    <span className="weekly-title">{w.week}</span>
                    
                    <div className="weekly-bars">
                      <div className="bar-row">
                        <span className="bar-tag">Plan (P0):</span>
                        <div className="bar-bg">
                          <div className="bar-fill plan" style={{ width: `${Math.min(100, w.budgetZeroPercent)}%` }} />
                        </div>
                        <span className="bar-val">{w.budgetZeroPercent}%</span>
                      </div>
                      <div className="bar-row">
                        <span className="bar-tag">Real:</span>
                        <div className="bar-bg">
                          <div className={`bar-fill real ${isAhead ? 'ahead' : 'delayed'}`} style={{ width: `${Math.min(100, w.realPercent)}%` }} />
                        </div>
                        <span className="bar-val font-bold">{w.realPercent}%</span>
                      </div>
                    </div>

                    <div className="weekly-delta">
                      <span className={`delta-badge ${isAhead ? 'ahead' : 'delayed'}`}>
                        {isAhead ? `+${delta}% en plazo` : `${delta}% atraso`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submódulo B: Compara avance con certificado con costos mensual */}
          <div className="card-box">
            <div className="card-box-header">
              <div>
                <span className="box-eyebrow">CERTIFICACIONES & FLUJO FINANCIERO</span>
                <h3>Avance Físico Certificado vs Costos Mensuales</h3>
                <p>Auditoría entre el % de avance físico efectivamente homologado y los costos devengados mes a mes.</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="oxi-pro-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>% Avance Físico Certificado</th>
                    <th>Costo Devengado / Certificado</th>
                    <th>Costo Presupuestado</th>
                    <th>Desvío en Costos ($)</th>
                    <th>Estado de Desvío</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyComp.map((item, idx) => {
                    const diff = item.certCost - item.budgetedCost
                    const isOver = diff > 0
                    return (
                      <tr key={idx}>
                        <td><strong>{item.month}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="progress-bar-wrap" style={{ width: '120px' }}>
                              <div className="progress-fill" style={{ width: `${item.certAdvancePercent}%` }} />
                            </div>
                            <strong>{item.certAdvancePercent}%</strong>
                          </div>
                        </td>
                        <td><strong>{formatMoney(item.certCost)}</strong></td>
                        <td>{formatMoney(item.budgetedCost)}</td>
                        <td style={{ color: isOver ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                          {isOver ? `+${formatMoney(diff)}` : formatMoney(diff)}
                        </td>
                        <td>
                          <span className={`status-pill ${isOver ? 'overbudget' : 'onbudget'}`}>
                            {isOver ? '⚠️ Exceso de costo' : '✓ En presupuesto'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 4: PRESUPUESTOS VS EJECUTADOS POR RUBRO & ALERTAS ── */}
      {activeTab === 'rubros' && (
        <section className="oxi-pro-section">
          <div className="section-toolbar">
            <div>
              <h3>Presupuestos vs Ejecutados por Rubro & Alertas de Costos</h3>
              <p>Control financiero por especialidad de obra con disparadores automáticos de sobrecosto.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => exportRubrosCsv(rubros, project?.name || 'Obra')}
                title="Descargar balance de rubros en CSV"
              >
                📥 Exportar Balance (CSV)
              </button>
              <button className="oxi-btn-primary" onClick={() => setShowAddRubroModal(true)}>
                ＋ Agregar Rubro / Partida
              </button>
            </div>
          </div>

          {criticalAlertsCount > 0 && (
            <div className="critical-alert-banner">
              <div className="alert-icon">🚨</div>
              <div className="alert-content">
                <strong>¡Alerta crítica de sobrecosto detectada!</strong>
                <p>
                  Hay {criticalAlertsCount} rubro(s) con costos ejecutados que superan el 100% de la partida autorizada.
                  Revisar inmediatamente desviaciones en herrería, instalaciones o materiales.
                </p>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table className="oxi-pro-table rubros-table">
              <thead>
                <tr>
                  <th>Rubro de Obra</th>
                  <th>Mano de Obra ($)</th>
                  <th>Leyes Sociales (BPS)</th>
                  <th>Materiales / Subcontrato ($)</th>
                  <th>Presupuesto Total ($)</th>
                  <th>Ejecutado a la Fecha ($)</th>
                  <th>Saldo Disponible ($)</th>
                  <th>% Consumido</th>
                  <th>Semáforo & Alerta</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rubroAlerts.map(rubro => {
                  const saldo = rubro.budgeted - rubro.executed
                  return (
                    <tr key={rubro.id} className={`rubro-row-${rubro.status}`}>
                      <td>
                        <strong>{rubro.name}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <input
                            type="number"
                            className="table-input"
                            value={rubro.laborCost}
                            onChange={(e) => handleUpdateRubro(rubro.id, 'laborCost', e.target.value)}
                            title="Modificar Mano de Obra"
                            style={{ width: '95px', fontWeight: 'bold' }}
                          />
                          <small style={{ color: '#737373' }}>{formatMoney(rubro.laborCost)}</small>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <input
                            type="number"
                            className="table-input"
                            value={rubro.socialLawsCost}
                            onChange={(e) => handleUpdateRubro(rubro.id, 'socialLawsCost', e.target.value)}
                            title="Modificar Leyes Sociales (BPS)"
                            style={{ width: '95px', fontWeight: 'bold' }}
                          />
                          <small style={{ color: '#737373' }}>{formatMoney(rubro.socialLawsCost)}</small>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <input
                            type="number"
                            className="table-input"
                            value={rubro.materialCost}
                            onChange={(e) => handleUpdateRubro(rubro.id, 'materialCost', e.target.value)}
                            title="Modificar Materiales / Subcontrato"
                            style={{ width: '95px', fontWeight: 'bold' }}
                          />
                          <small style={{ color: '#737373' }}>{formatMoney(rubro.materialCost)}</small>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#262626', fontSize: '0.92rem' }}>
                          {formatMoney(rubro.budgeted)}
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <input
                            type="number"
                            className="table-input"
                            value={rubro.executed}
                            onChange={(e) => handleUpdateRubro(rubro.id, 'executed', e.target.value)}
                            title="Modificar Ejecutado a la Fecha"
                            style={{ width: '95px', fontWeight: 'bold' }}
                          />
                          <small style={{ color: '#737373' }}>{formatMoney(rubro.executed)}</small>
                        </div>
                      </td>
                      <td style={{ color: saldo < 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                        {formatMoney(saldo)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar-wrap" style={{ width: '70px' }}>
                            <div
                              className={`progress-fill ${rubro.status === 'critical' ? 'danger' : rubro.status === 'warning' ? 'warn' : ''}`}
                              style={{ width: `${Math.min(100, rubro.percent)}%` }}
                            />
                          </div>
                          <strong>{rubro.percent}%</strong>
                        </div>
                      </td>
                      <td>
                        {rubro.status === 'critical' && (
                          <span className="alert-tag critical">
                            🔴 Sobrecosto: +{formatMoney(rubro.diff)}
                          </span>
                        )}
                        {rubro.status === 'warning' && (
                          <span className="alert-tag warning">
                            🟡 Límite próximo ({rubro.percent}%)
                          </span>
                        )}
                        {rubro.status === 'normal' && (
                          <span className="alert-tag normal">
                            🟢 Normal ({rubro.percent}%)
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDeleteRubro(rubro.id)}
                          title="Eliminar partida"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f5f5f4', fontWeight: 'bold', borderTop: '2px solid #d4d4d4' }}>
                  <td style={{ textAlign: 'right', padding: '12px' }}>TOTALES DE OBRA:</td>
                  <td style={{ padding: '12px' }}>{formatMoney(rubroTotals.labor)}</td>
                  <td style={{ padding: '12px' }}>{formatMoney(rubroTotals.social)}</td>
                  <td style={{ padding: '12px' }}>{formatMoney(rubroTotals.material)}</td>
                  <td style={{ padding: '12px', color: '#ea580c' }}>{formatMoney(rubroTotals.budgeted)}</td>
                  <td style={{ padding: '12px' }}>{formatMoney(rubroTotals.executed)}</td>
                  <td style={{ padding: '12px', color: rubroTotals.saldo < 0 ? '#ef4444' : '#10b981' }}>
                    {formatMoney(rubroTotals.saldo)}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL: SUBIR DOCUMENTO (REAL FILE SELECTOR) ── */}
      {showAddDocModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddDocModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Subir Documentación Técnica a OxI Pro</h3>
            <p>Adjuntá planos (CAD, DWG, PDF), certificaciones o especificaciones técnicas de obra.</p>
            
            <form onSubmit={handleAddDocument}>
              {/* File Dropzone */}
              <label className="file-dropzone-label">
                <div className={`file-dropzone ${newDoc.fileData ? 'has-file' : ''}`}>
                  <span className="dropzone-icon">{newDoc.fileData ? '✅' : '📁'}</span>
                  <div className="dropzone-text">
                    {newDoc.name ? newDoc.name : 'Arrastrá o hacé clic para seleccionar archivo'}
                  </div>
                  <div className="dropzone-sub">
                    {newDoc.fileSize ? `Tamaño: ${newDoc.fileSize}` : 'Admite planos DWG, DXF, PDF, CAD, XLSX, DOCX e imágenes'}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.dwg,.dxf,.cad,.xlsx,.docx,image/*"
                  onChange={handleDocFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              <label>
                Nombre del archivo / plano
                <input
                  required
                  placeholder="Ej: PL-ARQ-03_Fachadas_Barandas_Oxida.dwg"
                  value={newDoc.name}
                  onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label>
                  Tipo de Documento
                  <select
                    value={newDoc.type}
                    onChange={e => setNewDoc({ ...newDoc, type: e.target.value })}
                  >
                    <option value="planos">📐 Planos (DWG / CAD / PDF)</option>
                    <option value="certificaciones">📜 Certificaciones</option>
                    <option value="no_conformidades">⚠️ No Conformidades</option>
                    <option value="seguridad">🦺 Seguridad y Salud</option>
                    <option value="ambiental">🌿 Gestión Ambiental</option>
                  </select>
                </label>

                <label>
                  Versión Inicial
                  <input
                    placeholder="v1.0"
                    value={newDoc.version}
                    onChange={e => setNewDoc({ ...newDoc, version: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Responsable / Estudio
                <input
                  placeholder="Ej: Arq. Responsable / Constructora"
                  value={newDoc.uploadedBy}
                  onChange={e => setNewDoc({ ...newDoc, uploadedBy: e.target.value })}
                />
              </label>

              <label>
                Notas técnicas de la iteración
                <textarea
                  rows="3"
                  placeholder="Detalles de la versión, especificaciones o motivo de la subida..."
                  value={newDoc.notes}
                  onChange={e => setNewDoc({ ...newDoc, notes: e.target.value })}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddDocModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="oxi-btn-primary">
                  Registrar en el Gestor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SUBIR NUEVA ITERACIÓN (VERSIONADO) ── */}
      {showAddIterationModal && iterationDoc && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddIterationModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Subir Nueva Iteración de Archivo</h3>
            <p>Actualizar versión de: <strong>{iterationDoc.name}</strong> (versión actual: {iterationDoc.version})</p>

            <form onSubmit={handleIterationSubmit}>
              <label className="file-dropzone-label">
                <div className={`file-dropzone ${iterationForm.fileData ? 'has-file' : ''}`}>
                  <span className="dropzone-icon">{iterationForm.fileData ? '✅' : '📐'}</span>
                  <div className="dropzone-text">
                    {iterationForm.fileName ? iterationForm.fileName : 'Seleccionar nuevo archivo corregido (opcional)'}
                  </div>
                  <div className="dropzone-sub">
                    Si adjuntás un nuevo DWG / PDF, reemplazará el archivo de descarga de esta versión
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.dwg,.dxf,.cad,.xlsx,.docx,image/*"
                  onChange={handleIterationFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="form-row">
                <label>
                  Nueva Versión
                  <input
                    required
                    placeholder="Ej: v2.0"
                    value={iterationForm.version}
                    onChange={e => setIterationForm({ ...iterationForm, version: e.target.value })}
                  />
                </label>
                <label>
                  Fecha de Revisión
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    disabled
                  />
                </label>
              </div>

              <label>
                Motivo del cambio / Notas técnicas
                <textarea
                  required
                  rows="3"
                  placeholder="Ej: Ajuste de espesores en pletinas según cálculo estructural de viento..."
                  value={iterationForm.notes}
                  onChange={e => setIterationForm({ ...iterationForm, notes: e.target.value })}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddIterationModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="oxi-btn-primary">
                  Guardar Iteración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGREGAR TAREA AL CRONOGRAMA ── */}
      {showAddTaskModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddTaskModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Agregar Tarea de Obra</h3>
            <p>Define plazos, dotación de personal por categoría y costos asociados.</p>

            <form onSubmit={handleAddTask}>
              <label>
                Nombre de la Tarea / Hito
                <input
                  required
                  placeholder="Ej: Montaje de Pérgola y Herrería Óxida"
                  value={newTask.name}
                  onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label>
                  Fecha de Inicio
                  <input
                    type="date"
                    required
                    value={newTask.startDate}
                    onChange={e => handleTaskDatesChange(e.target.value, newTask.endDate)}
                  />
                </label>
                <label>
                  Fecha de Fin
                  <input
                    type="date"
                    required
                    value={newTask.endDate}
                    onChange={e => handleTaskDatesChange(newTask.startDate, e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Días Hábiles Estimados
                  <input
                    type="number"
                    min="1"
                    value={newTask.workDays}
                    onChange={e => setNewTask({ ...newTask, workDays: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Cantidad de Operarios
                  <input
                    type="number"
                    min="1"
                    value={newTask.peopleCount}
                    onChange={e => setNewTask({ ...newTask, peopleCount: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Categoría de Personal
                  <select
                    value={newTask.category}
                    onChange={e => {
                      const cat = LABOR_CATEGORIES.find(c => c.role === e.target.value)
                      setNewTask({
                        ...newTask,
                        category: e.target.value,
                        categoryRate: cat ? cat.dailyRate : newTask.categoryRate
                      })
                    }}
                  >
                    {LABOR_CATEGORIES.map(c => (
                      <option key={c.role} value={c.role}>{c.role} (${c.dailyRate}/d)</option>
                    ))}
                  </select>
                </label>
                <label>
                  Mes Asignado
                  <select
                    value={newTask.month}
                    onChange={e => setNewTask({ ...newTask, month: e.target.value })}
                  >
                    <option value="Mes 1">Mes 1</option>
                    <option value="Mes 2">Mes 2</option>
                    <option value="Mes 3">Mes 3</option>
                    <option value="Mes 4">Mes 4</option>
                    <option value="Mes 5">Mes 5</option>
                    <option value="Mes 6">Mes 6</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Costo Estimado Materiales ($)
                  <input
                    type="number"
                    min="0"
                    value={newTask.materialCost}
                    onChange={e => setNewTask({ ...newTask, materialCost: e.target.value })}
                  />
                </label>
                <label>
                  Leyes Sociales ($)
                  <input
                    type="number"
                    min="0"
                    value={newTask.socialLawsCost}
                    onChange={e => setNewTask({ ...newTask, socialLawsCost: e.target.value })}
                    placeholder={`Automático 65%: $${Math.round((newTask.peopleCount * newTask.categoryRate * (Number(newTask.workDays) || 16)) * 0.65).toLocaleString('es-UY')}`}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  % Avance Programado (Plan Inicial)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTask.plannedPercent}
                    onChange={e => setNewTask({ ...newTask, plannedPercent: e.target.value })}
                  />
                </label>
                <label>
                  % Avance Real Inicial (Certificado)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTask.progressPercent}
                    onChange={e => setNewTask({ ...newTask, progressPercent: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ background: '#f8f5ef', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '14px', fontSize: '0.85rem' }}>
                <span style={{ color: '#737373', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Desglose de Costos de la Tarea:</span>
                <div style={{ display: 'grid', gap: '4px' }}>
                  <div>
                    <span style={{ color: '#525252' }}>• Mano de Obra: </span>
                    <strong>{formatMoney(newTask.peopleCount * newTask.categoryRate * (Number(newTask.workDays) || 16))}</strong>
                    <small style={{ color: '#737373', marginLeft: '6px' }}>({newTask.peopleCount} operarios × {formatMoney(newTask.categoryRate)}/d × {newTask.workDays} d)</small>
                  </div>
                  <div>
                    <span style={{ color: '#525252' }}>• Leyes Sociales (BPS): </span>
                    <strong>{formatMoney(newTask.socialLawsCost !== '' && newTask.socialLawsCost != null
                      ? Number(newTask.socialLawsCost)
                      : Math.round((newTask.peopleCount * newTask.categoryRate * (Number(newTask.workDays) || 16)) * 0.65))}</strong>
                    <small style={{ color: '#737373', marginLeft: '6px' }}>{newTask.socialLawsCost !== '' && newTask.socialLawsCost != null ? '(personalizado)' : '(base 65%)'}</small>
                  </div>
                  <div>
                    <span style={{ color: '#525252' }}>• Costo Materiales: </span>
                    <strong>{formatMoney(Number(newTask.materialCost) || 0)}</strong>
                  </div>
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #d4d4d4', color: '#ea580c', fontSize: '0.92rem' }}>
                    <span>Presupuesto Total Estimado Tarea: </span>
                    <strong>
                      {formatMoney(
                        (newTask.peopleCount * newTask.categoryRate * (Number(newTask.workDays) || 16)) +
                        (newTask.socialLawsCost !== '' && newTask.socialLawsCost != null
                          ? Number(newTask.socialLawsCost)
                          : Math.round((newTask.peopleCount * newTask.categoryRate * (Number(newTask.workDays) || 16)) * 0.65)) +
                        (Number(newTask.materialCost) || 0)
                      )}
                    </strong>
                  </div>
                  {Number(newTask.progressPercent) > 0 && (
                    <div style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '3px' }}>
                      <span>Costo Ejecutado Inicial ({newTask.progressPercent}%): </span>
                      <strong>
                        {formatMoney(
                          Math.round(
                            ((newTask.peopleCount * newTask.categoryRate * (Number(newTask.workDays) || 16)) +
                            (newTask.socialLawsCost !== '' && newTask.socialLawsCost != null
                              ? Number(newTask.socialLawsCost)
                              : Math.round((newTask.peopleCount * newTask.categoryRate * (Number(newTask.workDays) || 16)) * 0.65)) +
                            (Number(newTask.materialCost) || 0)) *
                            (Math.min(100, Math.max(0, Number(newTask.progressPercent))) / 100)
                          )
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddTaskModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="oxi-btn-primary">
                  Agregar Tarea al Cronograma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR LLUVIA / DEMORA EN CASCADA ── */}
      {showRainModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowRainModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.8rem' }}>🌧️</span>
              <div>
                <h3 style={{ margin: 0 }}>Registrar Días de Lluvia / Demora</h3>
                <small style={{ color: '#737373' }}>Desplaza automáticamente en cascada las tareas activas y futuras.</small>
              </div>
            </div>

            <form onSubmit={handleApplyRainDelay}>
              <div className="form-row">
                <label>
                  Fecha del Evento Climático
                  <input
                    type="date"
                    required
                    value={rainForm.date}
                    onChange={e => setRainForm({ ...rainForm, date: e.target.value })}
                  />
                </label>
                <label>
                  Jornadas de Suspensión (Días)
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={rainForm.days}
                    onChange={e => setRainForm({ ...rainForm, days: Number(e.target.value) || 1 })}
                  />
                </label>
              </div>

              <label>
                Causa o Motivo de la Demora
                <select
                  value={rainForm.reason}
                  onChange={e => setRainForm({ ...rainForm, reason: e.target.value })}
                >
                  <option value="Lluvias y precipitaciones copiosas">🌧️ Lluvias y precipitaciones copiosas</option>
                  <option value="Alerta meteorológica / Vientos fuertes">💨 Alerta meteorológica / Vientos fuertes</option>
                  <option value="Inclemencia climática / Suelo anegado">🚜 Inclemencia climática / Suelo anegado</option>
                  <option value="Demora justificada en entrega de materiales">🚛 Demora justificada en entrega de materiales</option>
                  <option value="Paro gremial o fuerza mayor homologada">⚠️ Paro gremial o fuerza mayor homologada</option>
                </select>
              </label>

              <label>
                Notas u Observaciones del Libro de Obra
                <textarea
                  rows="2"
                  value={rainForm.notes}
                  onChange={e => setRainForm({ ...rainForm, notes: e.target.value })}
                  placeholder="Detalles técnicos, mediciones pluviométricas o justificación..."
                  style={{ resize: 'vertical' }}
                />
              </label>

              <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={rainForm.recordDocument}
                  onChange={e => setRainForm({ ...rainForm, recordDocument: e.target.checked })}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#404040' }}>
                  Generar automáticamente Acta Técnica de Lluvia en el Gestor Documental (Pestaña 1)
                </span>
              </label>

              {/* Live Preview of Affected Tasks */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#0369a1' }}>
                    Vista Previa del Corrimiento en Cascada ({previewShiftedTasks.length} tareas afectadas):
                  </span>
                  <small style={{ color: '#737373' }}>+{rainForm.days} día(s)</small>
                </div>
                {previewShiftedTasks.length === 0 ? (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', color: '#737373', fontSize: '0.82rem', textAlign: 'center' }}>
                    No se encontraron tareas activas o posteriores a la fecha {rainForm.date}.
                  </div>
                ) : (
                  <div className="rain-preview-box">
                    {previewShiftedTasks.map(t => (
                      <div key={t.id} className="rain-preview-item">
                        <div>
                          <strong>{t.name}</strong>
                          <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: t.isOngoing ? '#d97706' : '#2563eb' }}>
                            {t.isOngoing ? '(En curso: extiende fin)' : '(Futura: desplaza inicio y fin)'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ textDecoration: 'line-through', color: '#a3a3a3', fontSize: '0.75rem', marginRight: '6px' }}>
                            {t.oldStart} al {t.oldEnd}
                          </span>
                          <strong style={{ color: '#15803d' }}>
                            {t.newStart} al {t.newEnd}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowRainModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#0284c7' }}
                  disabled={previewShiftedTasks.length === 0}
                >
                  🌧️ Aplicar Corrimiento en Cascada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGREGAR RUBRO / PARTIDA ── */}
      {showAddRubroModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddRubroModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Agregar Partida o Rubro de Obra</h3>
            <p>Incorporá una especialidad para el control presupuestario y alertas de sobrecosto.</p>

            <form onSubmit={handleAddRubro}>
              <label>
                Nombre del Rubro / Especialidad
                <input
                  required
                  placeholder="Ej: Carpintería de Aluminio & DVH, Ascensor, Aislación Térmica"
                  value={newRubro.name}
                  onChange={e => setNewRubro({ ...newRubro, name: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label>
                  Mano de Obra Estimada ($)
                  <input
                    type="number"
                    min="0"
                    value={newRubro.laborCost}
                    onChange={e => {
                      const val = Number(e.target.value) || 0
                      const soc = newRubro.customSocial ? newRubro.socialLawsCost : Math.round(val * 0.65)
                      setNewRubro({ ...newRubro, laborCost: e.target.value, socialLawsCost: soc })
                    }}
                  />
                </label>
                <label>
                  Leyes Sociales ($)
                  <input
                    type="number"
                    min="0"
                    value={newRubro.socialLawsCost}
                    onChange={e => setNewRubro({ ...newRubro, socialLawsCost: e.target.value, customSocial: true })}
                    placeholder="Base 65% BPS"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Materiales / Subcontrato ($)
                  <input
                    type="number"
                    min="0"
                    value={newRubro.materialCost}
                    onChange={e => setNewRubro({ ...newRubro, materialCost: e.target.value })}
                  />
                </label>
                <label>
                  Ejecutado Inicial ($)
                  <input
                    type="number"
                    min="0"
                    value={newRubro.executed}
                    onChange={e => setNewRubro({ ...newRubro, executed: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ background: '#f8f5ef', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '12px', fontSize: '0.85rem' }}>
                <span style={{ color: '#737373', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Presupuesto Total Autorizado del Rubro:</span>
                <strong style={{ color: '#ea580c', fontSize: '1.05rem' }}>
                  {formatMoney(
                    (Number(newRubro.laborCost) || 0) +
                    (newRubro.socialLawsCost !== '' && newRubro.socialLawsCost != null
                      ? Number(newRubro.socialLawsCost)
                      : Math.round((Number(newRubro.laborCost) || 0) * 0.65)) +
                    (Number(newRubro.materialCost) || 0)
                  )}
                </strong>
                <small style={{ color: '#737373', display: 'block', marginTop: '3px' }}>
                  (MO: {formatMoney(Number(newRubro.laborCost) || 0)} + Leyes Sociales: {formatMoney(newRubro.socialLawsCost !== '' && newRubro.socialLawsCost != null ? Number(newRubro.socialLawsCost) : Math.round((Number(newRubro.laborCost) || 0) * 0.65))} + Materiales: {formatMoney(Number(newRubro.materialCost) || 0)})
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddRubroModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="oxi-btn-primary">
                  Incorporar Partida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: HISTORIAL DE VERSIONES ── */}
      {selectedDocHistory && (
        <div className="oxi-modal-backdrop" onClick={() => setSelectedDocHistory(null)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Historial de Iteraciones: {selectedDocHistory.name}</h3>
            <p>Registro cronológico de versiones y aprobaciones de este archivo técnico.</p>

            <div className="history-timeline">
              {(selectedDocHistory.history || []).map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-head">
                    <span className="version-pill">{h.version}</span>
                    <span className="history-date">{h.date}</span>
                    <span className={`status-pill status-${h.status}`}>{h.status}</span>
                  </div>
                  <p className="history-notes">{h.notes || 'Sin observaciones registradas.'}</p>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => downloadFile(selectedDocHistory)}
              >
                ⬇ Descargar Archivo
              </button>
              <button type="button" className="oxi-btn-primary" onClick={() => setSelectedDocHistory(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
