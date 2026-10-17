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
  { id: 'fundaciones', name: 'Movimiento de Suelos & Fundaciones', budgeted: 1250000, executed: 1240000 },
  { id: 'estructura', name: 'Estructura de Hormigón Armado', budgeted: 2800000, executed: 2750000 },
  { id: 'herreria', name: 'Herrería de Obra & Estructuras (Óxida)', budgeted: 1600000, executed: 1840000 },
  { id: 'madera', name: 'Carpintería en Madera & Encofrados', budgeted: 800000, executed: 775000 },
  { id: 'albanileria', name: 'Albañilería y Mampostería', budgeted: 1100000, executed: 1060000 },
  { id: 'instalaciones', name: 'Instalaciones (Eléctrica, Sanitaria, HVAC)', budgeted: 1550000, executed: 1585000 },
  { id: 'terminaciones', name: 'Terminaciones, Revestimientos y Pintura', budgeted: 950000, executed: 420000 }
]

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

function getTaskSocialLaws(task) {
  if (task && task.socialLawsCost != null && task.socialLawsCost !== '' && !Number.isNaN(Number(task.socialLawsCost))) {
    return Number(task.socialLawsCost)
  }
  return Math.round((task?.assignedLaborCost || 0) * 0.65)
}

function exportScheduleCsv(schedule, projectName) {
  const headers = [
    'Tarea', 'Fecha Inicio', 'Fecha Fin', 'Personas', 'Categoria Personal',
    'Tarifa Diaria ($)', 'Costo Mano de Obra ($)', 'Leyes Sociales ($)',
    'Costo Materiales ($)', 'Costo Total Tarea ($)', 'Mes', 'Avance (%)'
  ]
  const rows = schedule.map(t => {
    const labor = t.assignedLaborCost || 0
    const social = getTaskSocialLaws(t)
    const material = t.materialCost || 0
    const total = labor + social + material
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
      `${t.progressPercent}%`
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
  const headers = ['Rubro de Obra', 'Presupuesto Base ($)', 'Ejecutado a la Fecha ($)', 'Saldo ($)', 'Porcentaje Consumido (%)', 'Estado']
  const rows = rubros.map(r => {
    const diff = r.budgeted - r.executed
    const percent = Math.round((r.executed / (r.budgeted || 1)) * 100)
    const status = percent > 100 ? 'SOBRECOSTO CRITICO' : percent >= 85 ? 'LIMITE PROXIMO' : 'NORMAL'
    return [
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.budgeted,
      r.executed,
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
    progressPercent: 0
  })

  // Rubro modal
  const [showAddRubroModal, setShowAddRubroModal] = useState(false)
  const [newRubro, setNewRubro] = useState({ name: '', budgeted: 500000, executed: 0 })

  // Auto-save
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_docs`, JSON.stringify(documents))
      localStorage.setItem(`${storageKey}_sched`, JSON.stringify(schedule))
      localStorage.setItem(`${storageKey}_monthly`, JSON.stringify(monthlyComp))
      localStorage.setItem(`${storageKey}_weekly`, JSON.stringify(weeklyProgress))
      localStorage.setItem(`${storageKey}_rubros`, JSON.stringify(rubros))
    } catch (e) {
      console.warn('Error saving Oxi Pro state', e)
    }
  }, [documents, schedule, monthlyComp, weeklyProgress, rubros, storageKey])

  // Calculated global stats
  const totalLaborCost = useMemo(() => schedule.reduce((sum, t) => sum + (t.assignedLaborCost || 0), 0), [schedule])
  const totalSocialLawsCost = useMemo(() => schedule.reduce((sum, t) => sum + getTaskSocialLaws(t), 0), [schedule])
  const totalMaterialCost = useMemo(() => schedule.reduce((sum, t) => sum + (t.materialCost || 0), 0), [schedule])
  const totalProjectBudget = totalLaborCost + totalSocialLawsCost + totalMaterialCost

  const globalProgress = useMemo(() => {
    if (!schedule.length) return 0
    const totalWeight = schedule.reduce((sum, t) => sum + ((t.assignedLaborCost || 0) + getTaskSocialLaws(t) + (t.materialCost || 0)), 0)
    if (!totalWeight) {
      return Math.round(schedule.reduce((sum, t) => sum + (t.progressPercent || 0), 0) / schedule.length)
    }
    const weightedSum = schedule.reduce((sum, t) => sum + ((t.progressPercent || 0) * ((t.assignedLaborCost || 0) + getTaskSocialLaws(t) + (t.materialCost || 0))), 0)
    return Math.round(weightedSum / totalWeight)
  }, [schedule])

  // Alerts by rubro
  const rubroAlerts = useMemo(() => {
    return rubros.map(r => {
      const diff = r.executed - r.budgeted
      const percent = Math.round((r.executed / (r.budgeted || 1)) * 100)
      let status = 'normal'
      if (percent > 100) status = 'critical'
      else if (percent >= 85) status = 'warning'
      return { ...r, diff, percent, status }
    })
  }, [rubros])

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
      progressPercent: Number(newTask.progressPercent) || 0
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
      progressPercent: 0
    })
  }

  function handleUpdateTaskProgress(taskId, progress) {
    setSchedule(schedule.map(t => t.id === taskId ? { ...t, progressPercent: Math.min(100, Math.max(0, Number(progress))) } : t))
  }

  function handleDeleteTask(taskId) {
    if (window.confirm('¿Seguro que deseas eliminar esta tarea del cronograma?')) {
      setSchedule(schedule.filter(t => t.id !== taskId))
    }
  }

  // Handlers for Rubros
  function handleUpdateRubro(id, field, value) {
    setRubros(rubros.map(r => r.id === id ? { ...r, [field]: Number(value) || 0 } : r))
  }

  function handleAddRubro(e) {
    e.preventDefault()
    if (!newRubro.name) return
    const entry = {
      id: `rubro_${Date.now()}`,
      name: newRubro.name,
      budgeted: Number(newRubro.budgeted) || 0,
      executed: Number(newRubro.executed) || 0
    }
    setRubros([...rubros, entry])
    setShowAddRubroModal(false)
    setNewRubro({ name: '', budgeted: 500000, executed: 0 })
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
          <span className="kpi-label">Avance Físico Global</span>
          <div className="kpi-value-row">
            <strong>{globalProgress}%</strong>
            <span className="kpi-sub">Ponderado por recursos</span>
          </div>
          <div className="kpi-progress-bar">
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

        <div className={`oxi-pro-kpi-card ${criticalAlertsCount > 0 ? 'alert' : ''}`}>
          <span className="kpi-label">Alertas de Sobrecosto</span>
          <strong style={{ color: criticalAlertsCount > 0 ? '#ef4444' : '#10b981' }}>
            {criticalAlertsCount > 0 ? `${criticalAlertsCount} Rubros excedidos` : '0 desvíos críticos'}
          </strong>
          <span className="kpi-sub">Presupuesto total: {formatMoney(totalProjectBudget)}</span>
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
              <p>Modificá los avances en tiempo real, asigná operarios por categoría y costos de materiales.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
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

          <div className="table-responsive">
            <table className="oxi-pro-table schedule-table">
              <thead>
                <tr>
                  <th>Tarea de Obra</th>
                  <th>Plazo (Inicio - Fin)</th>
                  <th>Personal</th>
                  <th>Categoría & Tarifa</th>
                  <th>Costo Mano Obra</th>
                  <th>Leyes Sociales (BPS)</th>
                  <th>Costo Materiales</th>
                  <th>Costo Total Tarea</th>
                  <th>Mes Asignado</th>
                  <th style={{ minWidth: '180px' }}>% Avance de Obra</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(task => {
                  const isDone = task.progressPercent === 100
                  const isProgress = task.progressPercent > 0 && task.progressPercent < 100
                  const labor = task.assignedLaborCost || 0
                  const social = getTaskSocialLaws(task)
                  const material = task.materialCost || 0
                  const totalTask = labor + social + material

                  return (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.name}</strong>
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
                        <strong style={{ color: '#ea580c', fontSize: '0.92rem' }}>
                          {formatMoney(totalTask)}
                        </strong>
                      </td>
                      <td>
                        <span className="month-pill">{task.month}</span>
                      </td>
                      <td>
                        <div className="progress-control">
                          <div className="progress-bar-wrap">
                            <div
                              className={`progress-fill ${isDone ? 'done' : ''}`}
                              style={{ width: `${task.progressPercent}%` }}
                            />
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={task.progressPercent}
                            onChange={(e) => handleUpdateTaskProgress(task.id, e.target.value)}
                            className="progress-input"
                          />
                          <span className="unit-label">%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`task-status-pill ${isDone ? 'done' : isProgress ? 'progress' : 'pending'}`}>
                          {isDone ? '✓ Terminado' : isProgress ? '⚡ En curso' : '⏳ Pendiente'}
                        </span>
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
                  <td style={{ padding: '12px' }}>
                    <strong>{formatMoney(totalLaborCost)}</strong>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <strong>{formatMoney(totalSocialLawsCost)}</strong>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <strong>{formatMoney(totalMaterialCost)}</strong>
                  </td>
                  <td style={{ padding: '12px', color: '#ea580c' }}>
                    <strong>{formatMoney(totalProjectBudget)}</strong>
                  </td>
                  <td colSpan="4"></td>
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
                  <th>Presupuesto Base ($)</th>
                  <th>Ejecutado a la Fecha ($)</th>
                  <th>Saldo Disponible ($)</th>
                  <th>% Consumido</th>
                  <th>Semáforo & Alerta</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rubroAlerts.map(rubro => {
                  return (
                    <tr key={rubro.id} className={`rubro-row-${rubro.status}`}>
                      <td>
                        <strong>{rubro.name}</strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={rubro.budgeted}
                          onChange={(e) => handleUpdateRubro(rubro.id, 'budgeted', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={rubro.executed}
                          onChange={(e) => handleUpdateRubro(rubro.id, 'executed', e.target.value)}
                        />
                      </td>
                      <td style={{ color: rubro.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                        {formatMoney(rubro.budgeted - rubro.executed)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar-wrap" style={{ width: '80px' }}>
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
                  % Avance Inicial
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTask.progressPercent}
                    onChange={e => setNewTask({ ...newTask, progressPercent: e.target.value })}
                  />
                </label>
                <div></div>
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
                    <span>Costo Total Estimado Tarea: </span>
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
                  Presupuesto Base Autorizado ($)
                  <input
                    type="number"
                    min="0"
                    required
                    value={newRubro.budgeted}
                    onChange={e => setNewRubro({ ...newRubro, budgeted: e.target.value })}
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
