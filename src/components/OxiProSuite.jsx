import { useState, useEffect, useMemo } from 'react'
import {
  downloadOxiProReportPdf,
  downloadOxiProMonthlyCertificatePdf,
  getOxiProProjectData,
  saveOxiProTasks,
  saveOxiProRubros,
  saveOxiProState,
  createOxiProDelay,
  deleteOxiProDelay,
  generateOxiProAiPlan
} from '../lib/api'
import { generateHeuristicConstructionPlan } from '../utils/constructionAiEngine'
import {
  DEFAULT_LABOR_CATEGORIES,
  DEFAULT_SOCIAL_LAWS_RATE,
  DEFAULT_CREW_TEMPLATES,
  DEFAULT_INDIRECT_EXPENSES,
  calculateCrewDailyCost,
  calculateCrewTotalPeople,
  calculateTaskLaborAndSocial,
  calculateIndirectCostsTotals,
  calculateProjectCostBreakdown
} from '../utils/constructionLaborCategories'
import {
  calculateWorkingDays,
  distributeCostByMonths,
  addWorkingDays,
  calculateTaskEndDateFromDuration,
  calculateDependentTaskDates,
  recalculateScheduleDependencies
} from '../utils/constructionCalendar'
import { calculateTaskPlannedPercent, calculateProjectEVM, getTaskTotalBudget } from '../utils/constructionEVM'
import {
  DEFAULT_BUDGET_ITEMS,
  parseBudgetSpreadsheet,
  calculateTaskMaterialCostFromPartida,
  auditBudgetAssignments,
  syncBudgetItemsToRubros,
  generateScheduleFromBudgetItems
} from '../utils/constructionBudgetEngine'
import {
  DEFAULT_LABOR_REPORTS,
  DEFAULT_MATERIAL_INVOICES,
  DEFAULT_SUBCONTRACT_CERTIFICATES,
  DEFAULT_SUBCONTRACT_CONTRACTS,
  calculateLaborReportCost,
  calculateInvoiceAllocationTotals,
  getUnassignedInvoices,
  calculateRubroExpensesReport,
  calculateSubcontractContractStatus,
  validateSubcontractCertificate,
  calculateAllContractsSummary,
  calculateTaskActualCost
} from '../utils/constructionExpenseEngine'
import {
  generateBpsPayrollReport,
  exportBpsReportToCsv,
  DEFAULT_BPS_EMPLOYEES
} from '../utils/constructionBpsReportEngine'
import {
  generateCostControlReportData,
  exportCostControlToCsv
} from '../utils/constructionCostControlExport'
import {
  REGIONAL_PROFILES,
  getRegionalProfile,
  formatRegionalMoney
} from '../utils/constructionRegionalProfiles'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts'
import OxiProCopilot from './OxiProCopilot'
import './OxiProSuite.css'

function getAuthToken() {
  try {
    const cust = JSON.parse(localStorage.getItem('mercadobra-customer-session') || '{}')
    if (cust?.token) return cust.token
    const adm = JSON.parse(localStorage.getItem('mercadobra-admin-session') || '{}')
    if (adm?.token) return adm.token
    const sup = JSON.parse(localStorage.getItem('mercadobra-supplier-session') || '{}')
    if (sup?.token) return sup.token
  } catch {}
  return ''
}

const FILE_TYPES = [
  { id: 'todos', label: 'Todos los tipos', icon: '📁' },
  { id: 'planos', label: 'Planos', icon: '📐', desc: 'Arquitectura, Estructuras, Herrería, Instalaciones' },
  { id: 'certificaciones', label: 'Certificaciones', icon: '📜', desc: 'Avance físico, Ensayos de laboratorio, Homologaciones' },
  { id: 'no_conformidades', label: 'No Conformidades', icon: '⚠️', desc: 'Hallazgos de obra, Auditorías y correcciones' },
  { id: 'seguridad', label: 'Seguridad y Salud', icon: '🦺', desc: 'Planes de seguridad, EPP, Inducciones de personal' },
  { id: 'ambiental', label: 'Gestión Ambiental', icon: '🌿', desc: 'Permisos, Gestión de residuos y normativas' }
]

const LABOR_CATEGORIES = DEFAULT_LABOR_CATEGORIES

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
    crewLines: [
      { role: 'Oficial Especializado', count: 2, dailyRate: 3400 },
      { role: 'Peón Práctico', count: 4, dailyRate: 1800 }
    ],
    assignedLaborCost: 489600,
    socialLawsCost: 293760,
    materialCost: 585000,
    rubroId: 'fundaciones',
    linkedPartidaId: 'item_01_01',
    partidaCode: '01.01',
    partidaName: 'Excavación masiva y zanjas para cimentación',
    rubroName: '01. Movimiento de Suelos & Fundaciones',
    assignedPartidaPercent: 100,
    partidaDescription: '01. Movimiento de Suelos — [01.01] Excavación masiva (100% • 180 m³)',
    month: 'Oct. 2026',
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
    crewLines: [
      { role: 'Oficial Especializado', count: 2, dailyRate: 3400 },
      { role: 'Oficial', count: 3, dailyRate: 2800 },
      { role: 'Peón Común', count: 3, dailyRate: 1950 }
    ],
    assignedLaborCost: 806400,
    socialLawsCost: 483840,
    materialCost: 935000,
    rubroId: 'estructura',
    linkedPartidaId: 'item_02_01',
    partidaCode: '02.01',
    partidaName: 'Pilares y vigas de hormigón visto elaborado',
    rubroName: '02. Estructura de Hormigón Armado',
    assignedPartidaPercent: 100,
    partidaDescription: '02. Estructura — [02.01] Pilares y vigas (100% • 110 m³)',
    month: 'Oct. 2026 - Nov. 2026',
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
    crewLines: [
      { role: 'Oficial Especializado', count: 2, dailyRate: 3400 },
      { role: 'Medio Oficial', count: 2, dailyRate: 2200 }
    ],
    assignedLaborCost: 476000,
    socialLawsCost: 285600,
    materialCost: 684000,
    rubroId: 'herreria',
    linkedPartidaId: 'item_03_01',
    partidaCode: '03.01',
    partidaName: 'Estructura metálica tubular y perfiles UPN de fachada',
    rubroName: '03. Herrería de Obra & Estructuras (Óxida)',
    assignedPartidaPercent: 100,
    partidaDescription: '03. Herrería — [03.01] Estructura metálica (100% • 3.800 kg)',
    month: 'Nov. 2026 - Dic. 2026',
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
    crewLines: [
      { role: 'Oficial', count: 2, dailyRate: 2800 },
      { role: 'Medio Oficial', count: 1, dailyRate: 2200 }
    ],
    assignedLaborCost: 294000,
    socialLawsCost: 176400,
    materialCost: 247000,
    rubroId: 'madera',
    linkedPartidaId: 'item_04_01',
    partidaCode: '04.01',
    partidaName: 'Tableros fenólicos de 18mm y puntales de soporte',
    rubroName: '04. Carpintería en Madera & Encofrados',
    assignedPartidaPercent: 100,
    partidaDescription: '04. Carpintería — [04.01] Tableros fenólicos (100% • 260 m²)',
    month: 'Nov. 2026 - Dic. 2026',
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
    crewLines: [
      { role: 'Oficial', count: 2, dailyRate: 2800 },
      { role: 'Medio Oficial', count: 1, dailyRate: 2200 },
      { role: 'Peón Práctico', count: 2, dailyRate: 1800 }
    ],
    assignedLaborCost: 440000,
    socialLawsCost: 264000,
    materialCost: 189000,
    rubroId: 'albanileria',
    linkedPartidaId: 'item_05_01',
    partidaCode: '05.01',
    partidaName: 'Muro ticholo cerámico 17x25x20',
    rubroName: '05. Albañilería y Mampostería',
    assignedPartidaPercent: 100,
    partidaDescription: '05. Albañilería — [05.01] Muro ticholo (100% • 450 m²)',
    month: 'Nov. 2026 - Dic. 2026',
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
    crewLines: [
      { role: 'Oficial Especializado', count: 2, dailyRate: 3400 },
      { role: 'Medio Oficial', count: 2, dailyRate: 2200 }
    ],
    assignedLaborCost: 693600,
    socialLawsCost: 416160,
    materialCost: 380000,
    rubroId: 'instalaciones',
    linkedPartidaId: 'item_06_01',
    partidaCode: '06.01',
    partidaName: 'Canalizaciones corrugadas, tableros y cables',
    rubroName: '06. Instalaciones (Eléctrica, Sanitaria, HVAC)',
    assignedPartidaPercent: 100,
    partidaDescription: '06. Instalaciones — [06.01] Canalizaciones (100% • 1 gl)',
    month: 'Dic. 2026 - Ene. 2027',
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
    crewLines: [
      { role: 'Oficial', count: 2, dailyRate: 2800 },
      { role: 'Medio Oficial', count: 2, dailyRate: 2200 }
    ],
    assignedLaborCost: 548800,
    socialLawsCost: 329280,
    materialCost: 174800,
    rubroId: 'terminaciones',
    linkedPartidaId: 'item_07_01',
    partidaCode: '07.01',
    partidaName: 'Pintura látex acrílico lavable 3 manos',
    rubroName: '07. Terminaciones, Revestimientos y Pintura',
    assignedPartidaPercent: 100,
    partidaDescription: '07. Terminaciones — [07.01] Pintura látex (100% • 920 m²)',
    month: 'Ene. 2027 - Feb. 2027',
    plannedPercent: 0,
    progressPercent: 0
  }
]

const DEFAULT_MONTHLY_COMPARISON = [
  { month: 'Oct. 2026', certAdvancePercent: 20, certCost: 1240000, budgetedCost: 1200000 },
  { month: 'Nov. 2026', certAdvancePercent: 42, certCost: 2850000, budgetedCost: 2750000 },
  { month: 'Dic. 2026', certAdvancePercent: 65, certCost: 3950000, budgetedCost: 4100000 },
  { month: 'Ene. 2027', certAdvancePercent: 82, certCost: 5400000, budgetedCost: 5350000 },
  { month: 'Feb. 2027', certAdvancePercent: 100, certCost: 6750000, budgetedCost: 6600000 },
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
  { id: 'fundaciones', name: 'Movimiento de Suelos & Fundaciones', laborCost: 400000, socialLawsCost: 240000, materialCost: 610000, budgeted: 1250000, executed: 1240000 },
  { id: 'estructura', name: 'Estructura de Hormigón Armado', laborCost: 900000, socialLawsCost: 540000, materialCost: 1360000, budgeted: 2800000, executed: 2750000 },
  { id: 'herreria', name: 'Herrería de Obra & Estructuras (Óxida)', laborCost: 500000, socialLawsCost: 300000, materialCost: 800000, budgeted: 1600000, executed: 1840000 },
  { id: 'madera', name: 'Carpintería en Madera & Encofrados', laborCost: 280000, socialLawsCost: 168000, materialCost: 352000, budgeted: 800000, executed: 775000 },
  { id: 'albanileria', name: 'Albañilería y Mampostería', laborCost: 450000, socialLawsCost: 270000, materialCost: 380000, budgeted: 1100000, executed: 1060000 },
  { id: 'instalaciones', name: 'Instalaciones (Eléctrica, Sanitaria, HVAC)', laborCost: 550000, socialLawsCost: 330000, materialCost: 670000, budgeted: 1550000, executed: 1585000 },
  { id: 'terminaciones', name: 'Terminaciones, Revestimientos y Pintura', laborCost: 350000, socialLawsCost: 210000, materialCost: 390000, budgeted: 950000, executed: 420000 }
]

function getRubroLaborCost(rubro) {
  if (rubro && rubro.laborCost != null && rubro.laborCost !== '' && !Number.isNaN(Number(rubro.laborCost))) {
    return Number(rubro.laborCost)
  }
  return Math.round((Number(rubro?.budgeted) || 0) * 0.35)
}

function getRubroSocialLaws(rubro, rate = DEFAULT_SOCIAL_LAWS_RATE) {
  if (rubro && rubro.socialLawsCost != null && rubro.socialLawsCost !== '' && !Number.isNaN(Number(rubro.socialLawsCost))) {
    return Number(rubro.socialLawsCost)
  }
  const effectiveRate = typeof rate === 'number' && rate > 1 ? rate / 100 : (Number(rate) || DEFAULT_SOCIAL_LAWS_RATE)
  return Math.round(getRubroLaborCost(rubro) * effectiveRate)
}

function getRubroMaterialCost(rubro, rate = DEFAULT_SOCIAL_LAWS_RATE) {
  if (rubro && rubro.materialCost != null && rubro.materialCost !== '' && !Number.isNaN(Number(rubro.materialCost))) {
    return Number(rubro.materialCost)
  }
  const rem = (Number(rubro?.budgeted) || 0) - getRubroLaborCost(rubro) - getRubroSocialLaws(rubro, rate)
  return Math.max(0, rem)
}

function getRubroTotalBudget(rubro, rate = DEFAULT_SOCIAL_LAWS_RATE) {
  if (rubro && (rubro.laborCost != null || rubro.socialLawsCost != null || rubro.materialCost != null)) {
    return getRubroLaborCost(rubro) + getRubroSocialLaws(rubro, rate) + getRubroMaterialCost(rubro, rate)
  }
  return Number(rubro?.budgeted) || 0
}

function formatMoney(amount, countryCode = 'UY') {
  return formatRegionalMoney(amount, countryCode)
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

function parseDateLocal(dateStr) {
  if (!dateStr) return new Date()
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length === 3 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1]) && !Number.isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  return new Date(dateStr)
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

function getTaskSocialLaws(task, rate = DEFAULT_SOCIAL_LAWS_RATE, categories = []) {
  if (task && task.socialLawsCost != null && task.socialLawsCost !== '' && !Number.isNaN(Number(task.socialLawsCost))) {
    return Number(task.socialLawsCost)
  }
  let effectiveRate = typeof rate === 'number' && rate > 1 ? rate / 100 : (Number(rate) || DEFAULT_SOCIAL_LAWS_RATE)
  if (Array.isArray(categories) && task?.category) {
    const matched = categories.find(c => c.role === task.category || c.id === task.category)
    if (matched && matched.socialLawsRate != null && !Number.isNaN(Number(matched.socialLawsRate))) {
      effectiveRate = Number(matched.socialLawsRate) > 1 ? Number(matched.socialLawsRate) / 100 : Number(matched.socialLawsRate)
    }
  } else if (task?.categorySocialLawsRate != null && !Number.isNaN(Number(task.categorySocialLawsRate))) {
    effectiveRate = Number(task.categorySocialLawsRate) > 1 ? Number(task.categorySocialLawsRate) / 100 : Number(task.categorySocialLawsRate)
  }
  return Math.round((task?.assignedLaborCost || 0) * effectiveRate)
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

function getTaskBudget(task, rate = DEFAULT_SOCIAL_LAWS_RATE, categories = []) {
  return (task?.assignedLaborCost || 0) + getTaskSocialLaws(task, rate, categories) + (task?.materialCost || 0)
}

function getTaskExecutedCost(task, rate = DEFAULT_SOCIAL_LAWS_RATE, categories = [], context = {}) {
  const res = calculateTaskActualCost(task, {
    laborReports: context.laborReports || [],
    materialInvoices: context.materialInvoices || [],
    socialLawsRate: rate > 1 ? rate : rate * 100,
    laborCategories: categories
  })
  return res.actualCost
}

function getTaskBalance(task, rate = DEFAULT_SOCIAL_LAWS_RATE, categories = [], context = {}) {
  return Math.max(0, getTaskBudget(task, rate, categories) - getTaskExecutedCost(task, rate, categories, context))
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

function exportCurvaSCsv(weeklyProgress, monthlyComp, projectName) {
  const weeklyHeaders = [
    'Semana / Periodo', 'Rango Fechas', '% Programado (P0)', '% Real Certificado', 'Desvio (%)', 'Estado'
  ]
  const weeklyRows = (weeklyProgress || []).map(w => {
    const hasReal = w.realPercent != null
    const delta = hasReal ? (w.realPercent - w.budgetZeroPercent).toFixed(1) : null
    const status = !hasReal
      ? 'Pendiente a ejecutar'
      : Number(delta) > 0 ? 'Adelantada' : Number(delta) < 0 ? 'Atrasada' : 'En plazo'
    return [
      `"${w.week}"`,
      `"${w.dateRange || ''}"`,
      `${w.budgetZeroPercent}%`,
      hasReal ? `${w.realPercent}%` : '"—"',
      hasReal ? `${delta}%` : '"—"',
      `"${status}"`
    ]
  })

  const monthlyHeaders = [
    'Mes / Periodo', '% Avance Fisico Certificado', 'Costo Presupuestado ($)', 'Costo Devengado / Certificado ($)', 'Desvio ($)', 'Estado'
  ]
  const monthlyRows = (monthlyComp || []).map(m => {
    const diff = m.certCost - m.budgetedCost
    const isOver = diff > 0
    return [
      `"${m.month}"`,
      `${m.certAdvancePercent}%`,
      m.budgetedCost,
      m.certCost,
      diff,
      `"${isOver ? 'Exceso de costo' : 'En presupuesto'}"`
    ]
  })

  const csvContent = '\uFEFF' + [
    `CONTROL FISICO-FINANCIERO Y CURVA S - ${(projectName || 'OBRA').toUpperCase()}`,
    '',
    '--- CURVA S SEMANAL DE CONTROL FISICO (EN %) ---',
    weeklyHeaders.join(','),
    ...weeklyRows.map(r => r.join(',')),
    '',
    '--- CERTIFICACIONES & FLUJO FINANCIERO MENSUAL ($) ---',
    monthlyHeaders.join(','),
    ...monthlyRows.map(r => r.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Curva_S_${(projectName || 'Obra').replace(/\s+/g, '_')}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportSubcontractsCsv(contracts, certificates, projectName) {
  const headers = [
    'Tipo Registro',
    'Codigo',
    'Subcontratista',
    'Rubro',
    'Techo Base',
    'Adicionales Aprobados',
    'Techo Revisado',
    'Certificado Bruto',
    'Fondo Reparo 5%',
    'Neto a Pagar',
    'Saldo Disponible',
    'Fecha',
    'Observaciones'
  ]

  const rows = []

  // Contratos marco
  contracts.forEach(c => {
    const status = calculateSubcontractContractStatus(c, certificates)
    rows.push([
      'CONTRATO MARCO',
      `"${c.code || ''}"`,
      `"${c.contractorName || ''}"`,
      `"${c.rubroName || ''}"`,
      status.baseAmount,
      status.additionalsAmount,
      status.revisedCeiling,
      status.certifiedGross,
      status.retentionGuarantee,
      status.payableNet,
      status.availableBalance,
      `"${c.startDate || ''}"`,
      `"${(c.scope || '').replace(/"/g, '""')}"`
    ])
  })

  // Certificaciones emitidas
  certificates.forEach(sub => {
    const retention = sub.retentionAmount != null ? sub.retentionAmount : Math.round(sub.amount * 0.05)
    const net = sub.netPayable != null ? sub.netPayable : (sub.amount - retention)
    rows.push([
      'CERTIFICADO EMITIDO',
      `"${sub.certificateNumber || ''}"`,
      `"${sub.subcontractorName || ''}"`,
      `"${sub.rubroName || ''}"`,
      '',
      '',
      '',
      sub.amount,
      retention,
      net,
      '',
      `"${sub.date || ''}"`,
      `"${(sub.notes || '').replace(/"/g, '""')}"`
    ])
  })

  const csvContent = '\uFEFF' + [
    `GESTION CONTRACTUAL DE SUBCONTRATOS - ${(projectName || 'OBRA').toUpperCase()}`,
    `Fecha de emision: ${new Date().toISOString().slice(0, 10)}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Subcontratos_${(projectName || 'Obra').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function CurvaSTooltip({ active, payload, totalBudget }) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  const planVal = item.budgetZeroPercent != null ? Number(item.budgetZeroPercent) : null
  const realVal = item.realPercent != null ? Number(item.realPercent) : null
  const delta = item.delta != null ? Number(item.delta) : (realVal != null && planVal != null ? Number((realVal - planVal).toFixed(1)) : null)
  const isAhead = delta != null && delta >= 0

  const planMoney = totalBudget && planVal != null ? Math.round((planVal / 100) * totalBudget) : null
  const realMoney = totalBudget && realVal != null ? Math.round((realVal / 100) * totalBudget) : null

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      fontSize: '0.8rem',
      minWidth: '220px',
      color: '#0f172a'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
        <strong style={{ color: '#0f172a' }}>{item.week || item.weekShort}</strong>
        {item.isCurrent && (
          <span style={{ background: '#fef2f2', color: '#b91c1c', fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
            🔴 Semana Actual
          </span>
        )}
      </div>
      {item.dateRange && (
        <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '6px' }}>{item.dateRange}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '3px 0' }}>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>Plan (P0):</span>
        <span style={{ fontWeight: 700 }}>
          {planVal != null ? `${planVal}%` : '—'}
          {planMoney != null && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '4px' }}>(${planMoney.toLocaleString('es-UY')})</span>}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '3px 0' }}>
        <span style={{ color: '#10b981', fontWeight: 600 }}>Real Certificado:</span>
        <span style={{ fontWeight: 700, color: realVal != null ? '#0f172a' : '#94a3b8' }}>
          {realVal != null ? `${realVal}%` : '—'}
          {realMoney != null && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '4px' }}>(${realMoney.toLocaleString('es-UY')})</span>}
        </span>
      </div>
      {delta != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ color: '#64748b' }}>Desvío Acumulado:</span>
          <span style={{ fontWeight: 700, color: isAhead ? '#059669' : '#dc2626' }}>
            {delta > 0 ? `+${delta}%` : `${delta}%`} ({isAhead ? 'Adelantada' : 'Atrasada'})
          </span>
        </div>
      )}
    </div>
  )
}

export default function OxiProSuite({ project, projects = [], onSelectProject, onBackToClassic, onOpenMobileDrawer }) {
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

  const [laborCategories, setLaborCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_labor_cats`)
      return saved ? JSON.parse(saved) : DEFAULT_LABOR_CATEGORIES
    } catch {
      return DEFAULT_LABOR_CATEGORIES
    }
  })

  const [projectSocialLawsRate, setProjectSocialLawsRate] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_social_rate`)
      return saved != null && !Number.isNaN(Number(saved)) ? Number(saved) : 60
    } catch {
      return 60
    }
  })

  const [budgetItems, setBudgetItems] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_budget_items`)
      return saved ? JSON.parse(saved) : DEFAULT_BUDGET_ITEMS
    } catch {
      return DEFAULT_BUDGET_ITEMS
    }
  })

  // Trazabilidad de Gastos Reales en Obra (Punto 5)
  const [rubrosSubTab, setRubrosSubTab] = useState('balance') // 'balance' | 'traceability' | 'labor' | 'invoices' | 'subcontracts'

  const [laborReports, setLaborReports] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_labor_reports`)
      return saved ? JSON.parse(saved) : DEFAULT_LABOR_REPORTS
    } catch {
      return DEFAULT_LABOR_REPORTS
    }
  })

  const [materialInvoices, setMaterialInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_material_invoices`)
      return saved ? JSON.parse(saved) : DEFAULT_MATERIAL_INVOICES
    } catch {
      return DEFAULT_MATERIAL_INVOICES
    }
  })

  const [subcontractCertificates, setSubcontractCertificates] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_subcontracts`)
      return saved ? JSON.parse(saved) : DEFAULT_SUBCONTRACT_CERTIFICATES
    } catch {
      return DEFAULT_SUBCONTRACT_CERTIFICATES
    }
  })

  // Contratos Marco de Subcontratos (Punto 11: Techo contractual, adicionales y retenciones)
  const [subcontractContracts, setSubcontractContracts] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_subcontract_contracts`)
      return saved ? JSON.parse(saved) : DEFAULT_SUBCONTRACT_CONTRACTS
    } catch {
      return DEFAULT_SUBCONTRACT_CONTRACTS
    }
  })

  // Perfil Regional y Multi-País (Punto 3)
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => {
    try {
      return localStorage.getItem(`${storageKey}_country_code`) || 'UY'
    } catch {
      return 'UY'
    }
  })

  const [subcontractsViewMode, setSubcontractsViewMode] = useState('contracts') // 'contracts' | 'certificates'
  const [showAddContractModal, setShowAddContractModal] = useState(false)
  const [contractForm, setContractForm] = useState({
    code: '',
    contractorName: '',
    rubroId: 'fundaciones',
    scope: '',
    baseAmount: '',
    retentionRate: 5,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: ''
  })

  const [showAddAdditionalModal, setShowAddAdditionalModal] = useState(false)
  const [activeContractForAdditional, setActiveContractForAdditional] = useState(null)
  const [additionalForm, setAdditionalForm] = useState({
    code: '',
    description: '',
    amount: '',
    approvedDate: new Date().toISOString().slice(0, 10)
  })

  const [isExportingCertPdf, setIsExportingCertPdf] = useState(false)

  const currentRegionalProfile = useMemo(() => {
    return getRegionalProfile(selectedCountryCode)
  }, [selectedCountryCode])

  const formatMoney = (amount) => formatRegionalMoney(amount, selectedCountryCode)

  const contractsSummary = useMemo(() => {
    return calculateAllContractsSummary(subcontractContracts, subcontractCertificates)
  }, [subcontractContracts, subcontractCertificates])

  // Costos Indirectos / Gastos Generales de Obra (Punto 6)
  const [indirectExpenses, setIndirectExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_indirect_expenses`)
      return saved ? JSON.parse(saved) : DEFAULT_INDIRECT_EXPENSES
    } catch {
      return DEFAULT_INDIRECT_EXPENSES
    }
  })

  // Nómina de Personal y Aportes BPS (Ley 14.411)
  const [bpsEmployees, setBpsEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_bps_employees`)
      return saved ? JSON.parse(saved) : DEFAULT_BPS_EMPLOYEES
    } catch {
      return DEFAULT_BPS_EMPLOYEES
    }
  })

  const [bpsMeta, setBpsMeta] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_bps_meta`)
      return saved ? JSON.parse(saved) : {
        bpsWorkRegistry: project?.bpsWorkRegistry || 'BPS-OBRA-489104',
        companyRut: project?.companyRut || '21.849.201.0019',
        companyName: project?.companyName || 'Estudio & Constructora Óxida',
        clientName: project?.clientName || 'Comitente Principal'
      }
    } catch {
      return {
        bpsWorkRegistry: 'BPS-OBRA-489104',
        companyRut: '21.849.201.0019',
        companyName: 'Estudio & Constructora Óxida',
        clientName: 'Comitente Principal'
      }
    }
  })

  const [showBpsReportModal, setShowBpsReportModal] = useState(false)
  const [showCostControlReportModal, setShowCostControlReportModal] = useState(false)
  const [bpsFilterMonth, setBpsFilterMonth] = useState('all')
  const [bpsFilterQuincena, setBpsFilterQuincena] = useState('all')
  const [bpsModalTab, setBpsModalTab] = useState('roster') // 'roster' | 'categories' | 'print'
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false)
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    name: '',
    documentId: '',
    categoryId: 'oficial',
    phone: ''
  })

  const isNumericProject = Number(project?.id) > 0
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle') // 'idle' | 'saving' | 'synced' | 'error'
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false)

  // UX-4: Cierre con Escape de cualquier modal activo
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowAiModal(false)
        setShowAddDocModal(false)
        setShowAddIterationModal(false)
        setShowAddTaskModal(false)
        setShowRainModal(false)
        setShowCertModal(false)
        setShowWeeklyCloseModal(false)
        setShowMonthlyCertModal(false)
        setShowLaborReportModal(false)
        setShowCategoriesModal(false)
        setShowBudgetModal(false)
        setShowInvoiceModal(false)
        setShowAssignInvoiceModal(false)
        setShowSubcontractModal(false)
        setShowAddContractModal(false)
        setShowAddAdditionalModal(false)
        setShowAddIndirectModal(false)
        setShowAddRubroModal(false)
        setShowBpsReportModal(false)
        setShowCostControlReportModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reload state if project changes from localStorage
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

      const savedCats = localStorage.getItem(`${storageKey}_labor_cats`)
      setLaborCategories(savedCats ? JSON.parse(savedCats) : DEFAULT_LABOR_CATEGORIES)

      const savedSocial = localStorage.getItem(`${storageKey}_social_rate`)
      setProjectSocialLawsRate(savedSocial != null && !Number.isNaN(Number(savedSocial)) ? Number(savedSocial) : 60)

      const savedBudget = localStorage.getItem(`${storageKey}_budget_items`)
      setBudgetItems(savedBudget ? JSON.parse(savedBudget) : DEFAULT_BUDGET_ITEMS)

      const savedLaborReports = localStorage.getItem(`${storageKey}_labor_reports`)
      setLaborReports(savedLaborReports ? JSON.parse(savedLaborReports) : DEFAULT_LABOR_REPORTS)

      const savedInvoices = localStorage.getItem(`${storageKey}_material_invoices`)
      setMaterialInvoices(savedInvoices ? JSON.parse(savedInvoices) : DEFAULT_MATERIAL_INVOICES)

      const savedSubcontracts = localStorage.getItem(`${storageKey}_subcontracts`)
      setSubcontractCertificates(savedSubcontracts ? JSON.parse(savedSubcontracts) : DEFAULT_SUBCONTRACT_CERTIFICATES)

      const savedContracts = localStorage.getItem(`${storageKey}_subcontract_contracts`)
      setSubcontractContracts(savedContracts ? JSON.parse(savedContracts) : DEFAULT_SUBCONTRACT_CONTRACTS)

      const savedCountry = localStorage.getItem(`${storageKey}_country_code`)
      if (savedCountry) setSelectedCountryCode(savedCountry)

      const savedIndirect = localStorage.getItem(`${storageKey}_indirect_expenses`)
      setIndirectExpenses(savedIndirect ? JSON.parse(savedIndirect) : DEFAULT_INDIRECT_EXPENSES)

      const savedBpsEmployees = localStorage.getItem(`${storageKey}_bps_employees`)
      if (savedBpsEmployees) setBpsEmployees(JSON.parse(savedBpsEmployees))

      const savedBpsMeta = localStorage.getItem(`${storageKey}_bps_meta`)
      if (savedBpsMeta) setBpsMeta(JSON.parse(savedBpsMeta))
    } catch (e) {
      console.warn('Error reloading project state', e)
    }
  }, [projectId, storageKey])

  // Cloud initial fetch from PostgreSQL (Multi-user persistence)
  useEffect(() => {
    let isMounted = true
    const token = getAuthToken()
    if (!isNumericProject || !token) {
      setIsInitialLoadDone(true)
      return
    }

    setCloudSyncStatus('saving')
    getOxiProProjectData(token, project.id)
      .then(data => {
        if (!isMounted) return
        if (Array.isArray(data?.tasks) && data.tasks.length > 0) {
          setSchedule(data.tasks)
        }
        if (Array.isArray(data?.rubros) && data.rubros.length > 0) {
          setRubros(data.rubros)
        }
        if (Array.isArray(data?.delays) && data.delays.length > 0) {
          setRainLogs(data.delays)
        }
        if (data?.oxiproState && typeof data.oxiproState === 'object') {
          const s = data.oxiproState
          if (Array.isArray(s.subcontractContracts) && s.subcontractContracts.length > 0) {
            setSubcontractContracts(s.subcontractContracts)
          }
          if (Array.isArray(s.subcontractCertificates) && s.subcontractCertificates.length > 0) {
            setSubcontractCertificates(s.subcontractCertificates)
          }
          if (Array.isArray(s.materialInvoices) && s.materialInvoices.length > 0) {
            setMaterialInvoices(s.materialInvoices)
          }
          if (Array.isArray(s.laborReports) && s.laborReports.length > 0) {
            setLaborReports(s.laborReports)
          }
          if (Array.isArray(s.bpsEmployees) && s.bpsEmployees.length > 0) {
            setBpsEmployees(s.bpsEmployees)
          }
          if (s.bpsMeta && typeof s.bpsMeta === 'object') {
            setBpsMeta(prev => ({ ...prev, ...s.bpsMeta }))
          }
          if (Array.isArray(s.budgetItems) && s.budgetItems.length > 0) {
            setBudgetItems(s.budgetItems)
          }
          if (Array.isArray(s.indirectExpenses || s.indirectCostSettings) && (s.indirectExpenses || s.indirectCostSettings).length > 0) {
            setIndirectExpenses(s.indirectExpenses || s.indirectCostSettings)
          }
          if (s.projectSocialLawsRate != null) {
            setProjectSocialLawsRate(Number(s.projectSocialLawsRate))
          }
        }
        setCloudSyncStatus('synced')
        setIsInitialLoadDone(true)
      })
      .catch(err => {
        console.warn('Could not load OxI Pro data from cloud, using local cache', err)
        if (isMounted) {
          setCloudSyncStatus('idle')
          setIsInitialLoadDone(true)
        }
      })

    return () => { isMounted = false }
  }, [project?.id, isNumericProject])

  // Debounced auto-save tasks to PostgreSQL backend
  useEffect(() => {
    if (!isInitialLoadDone || !isNumericProject) return
    const token = getAuthToken()
    if (!token) return

    setCloudSyncStatus('saving')
    const timer = setTimeout(() => {
      saveOxiProTasks(token, project.id, schedule)
        .then(() => setCloudSyncStatus('synced'))
        .catch(err => {
          console.warn('Backend sync unavailable, retaining local persistence', err)
          setCloudSyncStatus('idle')
        })
    }, 1200)

    return () => clearTimeout(timer)
  }, [schedule, isInitialLoadDone, isNumericProject, project?.id])

  // Debounced auto-save rubros to PostgreSQL backend
  useEffect(() => {
    if (!isInitialLoadDone || !isNumericProject) return
    const token = getAuthToken()
    if (!token) return

    setCloudSyncStatus('saving')
    const timer = setTimeout(() => {
      saveOxiProRubros(token, project.id, rubros)
        .then(() => setCloudSyncStatus('synced'))
        .catch(err => {
          console.warn('Backend sync unavailable, retaining local persistence', err)
          setCloudSyncStatus('idle')
        })
    }, 1200)

    return () => clearTimeout(timer)
  }, [rubros, isInitialLoadDone, isNumericProject, project?.id])

  // Debounced auto-save full oxipro_state (subcontratos, facturas, partes diarios, BPS, partidas) to PostgreSQL
  useEffect(() => {
    if (!isInitialLoadDone || !isNumericProject) return
    const token = getAuthToken()
    if (!token) return

    setCloudSyncStatus('saving')
    const timer = setTimeout(() => {
      const stateToPersist = {
        subcontractContracts,
        subcontractCertificates,
        materialInvoices,
        laborReports,
        bpsEmployees,
        bpsMeta,
        budgetItems,
        indirectExpenses,
        projectSocialLawsRate
      }
      saveOxiProState(token, project.id, stateToPersist)
        .then(() => setCloudSyncStatus('synced'))
        .catch(err => {
          console.warn('Backend sync unavailable, retaining local persistence', err)
          setCloudSyncStatus('idle')
        })
    }, 1500)

    return () => clearTimeout(timer)
  }, [
    subcontractContracts,
    subcontractCertificates,
    materialInvoices,
    laborReports,
    bpsEmployees,
    bpsMeta,
    budgetItems,
    indirectExpenses,
    projectSocialLawsRate,
    isInitialLoadDone,
    isNumericProject,
    project?.id
  ])


  // Modals & form state
  const [showAddDocModal, setShowAddDocModal] = useState(false)
  const [newDoc, setNewDoc] = useState({ name: '', type: 'planos', version: 'v1.0', uploadedBy: '', notes: '', fileSize: '', fileData: null })
  const [selectedDocHistory, setSelectedDocHistory] = useState(null)
  
  // Iteration modal
  const [showAddIterationModal, setShowAddIterationModal] = useState(false)
  const [iterationDoc, setIterationDoc] = useState(null)
  const [iterationForm, setIterationForm] = useState({ version: '', notes: '', fileData: null, fileName: '' })

  // Budget audit (Punto 4: trazabilidad y control de asignación)
  const budgetAudit = useMemo(() => {
    return auditBudgetAssignments(budgetItems, schedule)
  }, [budgetItems, schedule])

  // Budget Modal state (Punto 4)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetModalTab, setBudgetModalTab] = useState('items') // 'items' | 'import' | 'audit'
  const [importPasteText, setImportPasteText] = useState('')
  const [importPreviewResult, setImportPreviewResult] = useState(null)
  const [importMode, setImportMode] = useState('append') // 'append' | 'replace'
  const [newBudgetItemForm, setNewBudgetItemForm] = useState({
    code: '',
    rubroName: '05. Albañilería y Mampostería',
    name: '',
    unit: 'm²',
    quantity: 100,
    unitMaterialCost: 500,
    totalLaborCost: 0
  })

  // Schedule modal
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [newTask, setNewTask] = useState({
    name: '',
    startDate: '2026-11-02',
    endDate: '2026-11-20',
    workDays: 15,
    schedulingMode: 'dates', // 'dates' (manual) | 'dependency' (enganchada a otra tarea)
    dependsOnTaskId: '',
    dependencyType: 'FS',    // 'FS' (Fin a Inicio) | 'SS' (Inicio a Inicio)
    lagDays: 0,              // Desfase en días hábiles
    crewMode: 'template', // 'template' | 'custom' | 'single' (Punto 6)
    selectedTemplateId: 'crew_albanileria',
    crewLines: [
      { role: 'Oficial', count: 1, dailyRate: 2800 },
      { role: 'Medio Oficial', count: 1, dailyRate: 2200 },
      { role: 'Peón Práctico', count: 1, dailyRate: 1800 }
    ],
    peopleCount: 3,
    category: 'Oficial',
    categoryRate: 2800,
    socialLawsCost: '',
    materialMode: 'partida', // 'partida' | 'manual'
    linkedPartidaId: 'item_05_02',
    partidaAssignMode: 'percent', // 'percent' | 'quantity'
    partidaAssignValue: 100,
    partidaDescription: '05. Albañilería — [05.02] Revoque grueso y fino (100% • 680 m²)',
    materialCost: 190400,
    month: 'Nov. 2026',
    initialProgressPercent: 0, // Punto 7: Avance ya ejecutado a la fecha de carga
    actualCostMode: 'auto', // 'auto' | 'imputed' | 'manual' | 'percent'
    actualIncurredCost: '' // Monto manual en pesos
  })

  // Costos Indirectos modal state (Punto 6)
  const [showAddIndirectModal, setShowAddIndirectModal] = useState(false)
  const [indirectForm, setIndirectForm] = useState({
    categoryId: 'obrador_banos',
    name: '',
    budgeted: 45000,
    executed: 0,
    period: 'Mensual prorrateado',
    notes: ''
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
    affectAll: true,
    selectedTaskIds: [],
    cascadeDependencies: true,
    notes: 'Suspensión de hormigonado y tareas exteriores por temporal con anegamiento.'
  })

  // Rubro modal
  const [showAddRubroModal, setShowAddRubroModal] = useState(false)
  const [newRubro, setNewRubro] = useState({
    name: '',
    laborCost: 200000,
    socialLawsCost: 120000,
    materialCost: 170000,
    executed: 0,
    customSocial: false
  })

  // Trazabilidad de Gastos Reales en Obra & Imputación (Punto 5)
  const unassignedInvoicesData = useMemo(() => {
    return getUnassignedInvoices(materialInvoices)
  }, [materialInvoices])

  const rubroExpensesReport = useMemo(() => {
    return calculateRubroExpensesReport(
      rubros,
      laborReports,
      materialInvoices,
      subcontractCertificates,
      { socialLawsRate: projectSocialLawsRate }
    )
  }, [rubros, laborReports, materialInvoices, subcontractCertificates, projectSocialLawsRate])

  // Modales de Gastos Reales (Punto 5)
  const [showLaborReportModal, setShowLaborReportModal] = useState(false)
  const [laborReportForm, setLaborReportForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    taskId: 1,
    crew: [
      { role: 'Oficial', quantity: 2, dailyRate: 3100 },
      { role: 'Peón Práctico', quantity: 1, dailyRate: 2350 }
    ],
    notes: ''
  })

  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    supplier: '',
    date: new Date().toISOString().slice(0, 10),
    totalAmount: '',
    currency: 'UYU',
    allocateNow: true,
    taskId: 1,
    assignMode: 'total', // 'total' | 'partial'
    assignedAmount: '',
    notes: ''
  })

  const [showAssignInvoiceModal, setShowAssignInvoiceModal] = useState(false)
  const [assignInvoiceForm, setAssignInvoiceForm] = useState({
    invoiceId: '',
    taskId: 1,
    amount: '',
    notes: ''
  })

  const [showSubcontractModal, setShowSubcontractModal] = useState(false)
  const [subcontractForm, setSubcontractForm] = useState({
    certificateNumber: '',
    subcontractorName: '',
    rubroId: 'fundaciones',
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    notes: ''
  })

  // Certification & inspection modal (Paso 4)
  const [showCertModal, setShowCertModal] = useState(false)
  const [certTask, setCertTask] = useState(null)
  const [certForm, setCertForm] = useState({
    certifiedPercent: 0,
    inspector: 'Director de Obra',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    photos: []
  })
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null)

  // Cierre Semanal de Producción en 1 minuto (Punto 9)
  const [showWeeklyCloseModal, setShowWeeklyCloseModal] = useState(false)
  const [latestWeeklyClosure, setLatestWeeklyClosure] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_latest_weekly_closure`)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [weeklyCloseForm, setWeeklyCloseForm] = useState({
    weekLabel: 'Semana 4',
    date: new Date().toISOString().slice(0, 10),
    responsible: 'Jefe de Obra / Residente',
    notes: 'Cierre semanal de producción física sin desvíos críticos.',
    taskProgressMap: {}
  })

  // Generación de Certificado del Mes con EVM (Punto 10)
  const [showMonthlyCertModal, setShowMonthlyCertModal] = useState(false)
  const [monthlyCertForm, setMonthlyCertForm] = useState({
    month: 'Nov. 2026',
    date: new Date().toISOString().slice(0, 10),
    inspector: 'Director de Obra',
    clientApprover: 'Comitente / Propietario',
    notes: 'Certificado de avance físico mensual correspondiente al período contractual.',
    certifiedAmount: 2850000,
    monthItem: null
  })

  // AI Onboarding modal (Paso 5)
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiStartDate, setAiStartDate] = useState(new Date().toISOString().split('T')[0])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState('')

  // Categories modal state (Punto 1)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [newCategoryForm, setNewCategoryForm] = useState({
    role: '',
    categoryCode: 'Cat. Personalizada',
    dailyRate: 2800,
    effectiveDate: '2026-07-01',
    socialLawsRate: '',
    description: ''
  })

  function handleSaveLaborCategories(updatedCategories) {
    setLaborCategories(updatedCategories)
    try {
      localStorage.setItem(`${storageKey}_labor_cats`, JSON.stringify(updatedCategories))
    } catch (e) {
      console.warn('Error saving categories', e)
    }
  }

  function handleAddCategory(e) {
    e.preventDefault()
    if (!newCategoryForm.role.trim()) return
    const newCat = {
      id: `cat_${Date.now()}`,
      role: newCategoryForm.role.trim(),
      categoryCode: newCategoryForm.categoryCode || 'Cat. Personalizada',
      dailyRate: Number(newCategoryForm.dailyRate) || 2800,
      effectiveDate: newCategoryForm.effectiveDate || '2026-07-01',
      socialLawsRate: newCategoryForm.socialLawsRate !== '' && newCategoryForm.socialLawsRate != null
        ? Number(newCategoryForm.socialLawsRate)
        : null,
      active: true,
      description: newCategoryForm.description || 'Categoría configurada por la empresa.'
    }
    const updated = [...laborCategories, newCat]
    handleSaveLaborCategories(updated)
    setNewCategoryForm({
      role: '',
      categoryCode: 'Cat. Personalizada',
      dailyRate: 2800,
      effectiveDate: '2026-07-01',
      socialLawsRate: '',
      description: ''
    })
  }

  function handleToggleCategoryActive(catId) {
    const updated = laborCategories.map(c => c.id === catId ? { ...c, active: !c.active } : c)
    handleSaveLaborCategories(updated)
  }

  function handleUpdateCategoryRate(catId, field, val) {
    const updated = laborCategories.map(c => {
      if (c.id !== catId) return c
      let newVal = val
      if (field === 'dailyRate') newVal = Number(val) || 0
      if (field === 'socialLawsRate') newVal = (val === '' || val == null) ? null : Number(val)
      return {
        ...c,
        [field]: newVal
      }
    })
    handleSaveLaborCategories(updated)
  }

  function handleRestoreDefaultCategories() {
    if (window.confirm('¿Deseas restaurar las categorías y laudos oficiales vigentes de la construcción en Uruguay (SUNCA Grupo 9)?')) {
      handleSaveLaborCategories(DEFAULT_LABOR_CATEGORIES)
    }
  }

  // Auto-save
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_docs`, JSON.stringify(documents))
      localStorage.setItem(`${storageKey}_sched`, JSON.stringify(schedule))
      localStorage.setItem(`${storageKey}_monthly`, JSON.stringify(monthlyComp))
      localStorage.setItem(`${storageKey}_weekly`, JSON.stringify(weeklyProgress))
      localStorage.setItem(`${storageKey}_rubros`, JSON.stringify(rubros))
      localStorage.setItem(`${storageKey}_rainLogs`, JSON.stringify(rainLogs))
      localStorage.setItem(`${storageKey}_labor_cats`, JSON.stringify(laborCategories))
      localStorage.setItem(`${storageKey}_social_rate`, String(projectSocialLawsRate))
      localStorage.setItem(`${storageKey}_budget_items`, JSON.stringify(budgetItems))
      localStorage.setItem(`${storageKey}_labor_reports`, JSON.stringify(laborReports))
      localStorage.setItem(`${storageKey}_material_invoices`, JSON.stringify(materialInvoices))
      localStorage.setItem(`${storageKey}_subcontracts`, JSON.stringify(subcontractCertificates))
      localStorage.setItem(`${storageKey}_subcontract_contracts`, JSON.stringify(subcontractContracts))
      localStorage.setItem(`${storageKey}_country_code`, selectedCountryCode)
      localStorage.setItem(`${storageKey}_indirect_expenses`, JSON.stringify(indirectExpenses))
      localStorage.setItem(`${storageKey}_bps_employees`, JSON.stringify(bpsEmployees))
      localStorage.setItem(`${storageKey}_bps_meta`, JSON.stringify(bpsMeta))
    } catch (e) {
      console.warn('Error saving Oxi Pro state', e)
    }
  }, [documents, schedule, monthlyComp, weeklyProgress, rubros, rainLogs, laborCategories, projectSocialLawsRate, budgetItems, laborReports, materialInvoices, subcontractCertificates, subcontractContracts, selectedCountryCode, indirectExpenses, bpsEmployees, bpsMeta, storageKey])

  // Rain calculations
  const totalRainDays = useMemo(() => {
    return rainLogs.reduce((sum, log) => sum + (Number(log.days) || 0), 0)
  }, [rainLogs])

  const previewShiftedTasks = useMemo(() => {
    if (!showRainModal) return []
    const delayDays = Math.max(1, Number(rainForm.days) || 1)
    const eventDate = rainForm.date
    if (!eventDate) return []

    const candidateTasks = schedule.filter(t => (Number(t.progressPercent) || 0) < 100 && t.endDate >= eventDate)

    const isDirectlySelected = (id) => {
      if (rainForm.affectAll) return true
      return Array.isArray(rainForm.selectedTaskIds) && rainForm.selectedTaskIds.includes(id)
    }

    // Paso 1: corrimiento directo a las tareas seleccionadas
    const directlyShifted = candidateTasks.map(t => {
      const selected = isDirectlySelected(t.id)
      let newStart = t.startDate
      let newEnd = t.endDate

      if (selected) {
        if (t.startDate <= eventDate && t.endDate >= eventDate) {
          newEnd = addWorkingDays(t.endDate, delayDays)
        } else if (t.startDate > eventDate) {
          newStart = addWorkingDays(t.startDate, delayDays)
          newEnd = addWorkingDays(t.endDate, delayDays)
        }
      }

      return {
        id: t.id,
        name: t.name,
        dependsOnTaskId: t.dependsOnTaskId || t.predecessorId,
        selected,
        isOngoing: t.startDate <= eventDate && t.endDate >= eventDate,
        oldStart: t.startDate,
        oldEnd: t.endDate,
        newStart,
        newEnd
      }
    })

    // Paso 2: si la cascada CPM está activa, recalcular dependencias para previsualizar sucesoras empujadas
    if (rainForm.cascadeDependencies !== false) {
      const simSchedule = schedule.map(t => {
        const found = directlyShifted.find(ds => ds.id === t.id)
        if (found) {
          return { ...t, startDate: found.newStart, endDate: found.newEnd }
        }
        return t
      })
      const recalced = recalculateScheduleDependencies(simSchedule)
      return directlyShifted.map(item => {
        const updated = recalced.find(t => t.id === item.id)
        const finalStart = updated ? updated.startDate : item.newStart
        const finalEnd = updated ? updated.endDate : item.newEnd
        const isCascaded = !item.selected && (finalStart !== item.oldStart || finalEnd !== item.oldEnd)
        return {
          ...item,
          newStart: finalStart,
          newEnd: finalEnd,
          isCascaded
        }
      })
    }

    return directlyShifted
  }, [showRainModal, rainForm.date, rainForm.days, rainForm.affectAll, rainForm.selectedTaskIds, rainForm.cascadeDependencies, schedule])

  // Gantt State & Calculations
  const [scheduleViewMode, setScheduleViewMode] = useState('combined')

  const ganttBounds = useMemo(() => {
    if (!schedule.length) {
      const now = new Date()
      const end = new Date(now.getTime() + 60 * 86400000)
      return {
        startDate: now,
        endDate: end,
        totalDays: 60,
        startMs: now.getTime(),
        endMs: end.getTime()
      }
    }

    let minMs = Infinity
    let maxMs = -Infinity

    schedule.forEach(t => {
      if (t.startDate) {
        const parts = t.startDate.split('-').map(Number)
        if (parts.length === 3) {
          const ms = new Date(parts[0], parts[1] - 1, parts[2]).getTime()
          if (!Number.isNaN(ms) && ms < minMs) minMs = ms
        }
      }
      if (t.endDate) {
        const parts = t.endDate.split('-').map(Number)
        if (parts.length === 3) {
          const ms = new Date(parts[0], parts[1] - 1, parts[2]).getTime()
          if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms
        }
      }
    })

    if (minMs === Infinity || maxMs === -Infinity) {
      minMs = new Date(2026, 9, 1).getTime()
      maxMs = new Date(2027, 2, 1).getTime()
    }

    const bufferedMinMs = minMs - (4 * 86400000)
    const bufferedMaxMs = maxMs + (10 * 86400000)
    const totalDays = Math.max(1, Math.round((bufferedMaxMs - bufferedMinMs) / 86400000))

    return {
      startDate: new Date(bufferedMinMs),
      endDate: new Date(bufferedMaxMs),
      totalDays,
      startMs: bufferedMinMs,
      endMs: bufferedMaxMs
    }
  }, [schedule])

  const ganttMonths = useMemo(() => {
    const { startMs, endMs } = ganttBounds
    const months = []
    const cur = new Date(startMs)
    cur.setDate(1)

    const end = new Date(endMs)
    while (cur <= end) {
      const y = cur.getFullYear()
      const m = cur.getMonth()
      const monthStart = Math.max(startMs, new Date(y, m, 1).getTime())
      const nextMonthStart = new Date(y, m + 1, 1).getTime()
      const monthEnd = Math.min(endMs, nextMonthStart)

      if (monthEnd > monthStart) {
        const widthPct = ((monthEnd - monthStart) / (endMs - startMs)) * 100
        const leftPct = ((monthStart - startMs) / (endMs - startMs)) * 100
        const label = cur.toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })
        months.push({
          key: `${y}-${m}`,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          leftPct,
          widthPct
        })
      }
      cur.setMonth(cur.getMonth() + 1)
    }

    return months
  }, [ganttBounds])

  const ganttWeeks = useMemo(() => {
    const { startMs, endMs } = ganttBounds
    const ticks = []
    const cur = new Date(startMs)
    const dayOfWeek = cur.getDay()
    const diffToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7
    cur.setDate(cur.getDate() + diffToMonday)

    while (cur.getTime() <= endMs) {
      const pct = ((cur.getTime() - startMs) / (endMs - startMs)) * 100
      const day = String(cur.getDate()).padStart(2, '0')
      const month = String(cur.getMonth() + 1).padStart(2, '0')
      ticks.push({
        pct,
        label: `${day}/${month}`,
        ms: cur.getTime()
      })
      cur.setDate(cur.getDate() + 7)
    }
    return ticks
  }, [ganttBounds])

  const todayGanttPositionPct = useMemo(() => {
    const { startMs, endMs } = ganttBounds
    const realNow = Date.now()
    if (realNow >= startMs && realNow <= endMs) {
      return ((realNow - startMs) / (endMs - startMs)) * 100
    }
    const refDateMs = new Date(2026, 9, 18).getTime()
    if (refDateMs >= startMs && refDateMs <= endMs) {
      return ((refDateMs - startMs) / (endMs - startMs)) * 100
    }
    return null
  }, [ganttBounds])

  const ganttRainZones = useMemo(() => {
    const { startMs, endMs } = ganttBounds
    const totalSpan = endMs - startMs
    if (totalSpan <= 0 || !Array.isArray(rainLogs) || !rainLogs.length) return []

    return rainLogs.map(log => {
      const parts = String(log.date || '').split('-').map(Number)
      if (parts.length !== 3) return null
      const logStartMs = new Date(parts[0], parts[1] - 1, parts[2]).getTime()
      const delayDays = Math.max(1, Number(log.days) || 1)
      const logEndMs = logStartMs + (delayDays * 86400000)

      const leftPct = Math.max(0, Math.min(100, ((logStartMs - startMs) / totalSpan) * 100))
      const widthPct = Math.max(1.8, Math.min(100 - leftPct, ((logEndMs - logStartMs) / totalSpan) * 100))

      return {
        id: log.id,
        date: log.date,
        days: delayDays,
        reason: log.reason,
        leftPct,
        widthPct
      }
    }).filter(Boolean)
  }, [rainLogs, ganttBounds])

  // Estado de interactividad y vínculos del Gantt
  const [hoveredGanttTaskId, setHoveredGanttTaskId] = useState(null)

  const taskGanttPositions = useMemo(() => {
    const map = new Map()
    const totalSpan = ganttBounds.endMs - ganttBounds.startMs
    schedule.forEach((task, index) => {
      const partsStart = String(task.startDate || '').split('-').map(Number)
      const partsEnd = String(task.endDate || '').split('-').map(Number)
      const startMs = partsStart.length === 3 ? new Date(partsStart[0], partsStart[1] - 1, partsStart[2]).getTime() : ganttBounds.startMs
      const endMs = partsEnd.length === 3 ? new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2]).getTime() : ganttBounds.endMs
      const leftPct = totalSpan > 0 ? Math.max(0, Math.min(100, ((startMs - ganttBounds.startMs) / totalSpan) * 100)) : 0
      const widthPct = totalSpan > 0 ? Math.max(2, Math.min(100 - leftPct, ((endMs - startMs) / totalSpan) * 100)) : 10
      map.set(String(task.id), {
        index,
        leftPct,
        widthPct,
        rightPct: leftPct + widthPct,
        yCenter: index * 68 + 34
      })
    })
    return map
  }, [schedule, ganttBounds])

  const ganttConnectors = useMemo(() => {
    const list = []
    schedule.forEach(task => {
      if (!task.dependsOnTaskId) return
      const predPos = taskGanttPositions.get(String(task.dependsOnTaskId))
      const taskPos = taskGanttPositions.get(String(task.id))
      const predTask = schedule.find(t => String(t.id) === String(task.dependsOnTaskId))
      if (!predPos || !taskPos || !predTask) return

      list.push({
        fromId: String(task.dependsOnTaskId),
        toId: String(task.id),
        predName: predTask.name,
        taskName: task.name,
        startX: predPos.rightPct,
        startY: predPos.yCenter,
        endX: taskPos.leftPct,
        endY: taskPos.yCenter,
        lagDays: Number(task.lagDays) || 0,
        dependencyType: task.dependencyType || 'FS'
      })
    })
    return list
  }, [schedule, taskGanttPositions])

  // Calculated global stats
  const totalLaborCost = useMemo(() => schedule.reduce((sum, t) => sum + (t.assignedLaborCost || 0), 0), [schedule])
  const totalSocialLawsCost = useMemo(() => schedule.reduce((sum, t) => sum + getTaskSocialLaws(t, projectSocialLawsRate / 100, laborCategories), 0), [schedule, projectSocialLawsRate, laborCategories])
  const totalMaterialCost = useMemo(() => schedule.reduce((sum, t) => sum + (t.materialCost || 0), 0), [schedule])
  const totalProjectBudget = totalLaborCost + totalSocialLawsCost + totalMaterialCost

  const totalExecutedCost = useMemo(() => {
    return schedule.reduce((sum, t) => sum + getTaskExecutedCost(t, projectSocialLawsRate / 100, laborCategories, { laborReports, materialInvoices }), 0)
  }, [schedule, projectSocialLawsRate, laborCategories, laborReports, materialInvoices])

  const totalBalanceCost = Math.max(0, totalProjectBudget - totalExecutedCost)

  const globalProgress = useMemo(() => {
    if (!schedule.length) return 0
    if (!totalProjectBudget) {
      return Math.round(schedule.reduce((sum, t) => sum + (Number(t.progressPercent) || 0), 0) / schedule.length)
    }
    const weightedSum = schedule.reduce((sum, t) => sum + ((Number(t.progressPercent) || 0) * getTaskBudget(t, projectSocialLawsRate / 100, laborCategories)), 0)
    return Math.round(weightedSum / totalProjectBudget)
  }, [schedule, totalProjectBudget, projectSocialLawsRate, laborCategories])

  const plannedGlobalProgress = useMemo(() => {
    if (!schedule.length) return 0
    if (!totalProjectBudget) {
      return Math.round(schedule.reduce((sum, t) => sum + getTaskPlannedPercent(t), 0) / schedule.length)
    }
    const weightedSum = schedule.reduce((sum, t) => sum + (getTaskPlannedPercent(t) * getTaskBudget(t, projectSocialLawsRate / 100, laborCategories)), 0)
    return Math.round(weightedSum / totalProjectBudget)
  }, [schedule, totalProjectBudget, projectSocialLawsRate, laborCategories])

  const globalDelta = globalProgress - plannedGlobalProgress

  const totalPlannedCost = useMemo(() => {
    return schedule.reduce((sum, t) => sum + Math.round(getTaskBudget(t, projectSocialLawsRate / 100, laborCategories) * (getTaskPlannedPercent(t) / 100)), 0)
  }, [schedule, projectSocialLawsRate, laborCategories])

  const spiIndex = useMemo(() => {
    if (!totalPlannedCost) return '1.00'
    return (totalExecutedCost / totalPlannedCost).toFixed(2)
  }, [totalExecutedCost, totalPlannedCost])

  const projectEVM = useMemo(() => {
    return calculateProjectEVM(schedule, { totalActualCost: totalExecutedCost })
  }, [schedule, totalExecutedCost])

  // Control de costos: presupuestado a la fecha de corte (según calendario) vs. ejecutado real
  const [costCutoffDate, setCostCutoffDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const costControl = useMemo(() => {
    const byTask = new Map()
    let totalPlannedToDate = 0
    let totalExecuted = 0
    schedule.forEach(t => {
      const budget = getTaskBudget(t, projectSocialLawsRate / 100, laborCategories)
      const plannedPct = calculateTaskPlannedPercent({ startDate: t.startDate, endDate: t.endDate }, costCutoffDate)
      const plannedToDate = Math.round(budget * (plannedPct / 100))
      const costDetails = calculateTaskActualCost(t, {
        laborReports,
        materialInvoices,
        socialLawsRate: projectSocialLawsRate,
        laborCategories
      })
      const executed = costDetails.actualCost
      byTask.set(String(t.id), {
        budget,
        plannedPct,
        plannedToDate,
        executed,
        variance: executed - plannedToDate,
        costDetails
      })
      totalPlannedToDate += plannedToDate
      totalExecuted += executed
    })
    const totalVariance = totalExecuted - totalPlannedToDate
    const pct = v => (totalProjectBudget > 0 ? Math.round((v / totalProjectBudget) * 100) : 0)
    return {
      byTask,
      totalPlannedToDate,
      totalExecuted,
      totalVariance,
      variancePct: totalPlannedToDate > 0 ? Math.round((totalVariance / totalPlannedToDate) * 100) : 0,
      plannedPctOfTotal: pct(totalPlannedToDate),
      executedPctOfTotal: pct(totalExecuted)
    }
  }, [schedule, costCutoffDate, projectSocialLawsRate, laborCategories, totalProjectBudget, laborReports, materialInvoices])

  const dynamicMonthlyComp = useMemo(() => {
    if (!schedule.length) return []

    let minMs = Infinity
    let maxMs = -Infinity
    schedule.forEach(t => {
      const s = parseDateLocal(t.startDate).getTime()
      const e = parseDateLocal(t.endDate).getTime()
      if (!Number.isNaN(s) && s < minMs) minMs = s
      if (!Number.isNaN(e) && e > maxMs) maxMs = e
    })

    if (minMs === Infinity || maxMs === -Infinity) return []

    const months = []
    const cur = new Date(minMs)
    cur.setDate(1)
    cur.setHours(0, 0, 0, 0)
    const end = new Date(maxMs)

    let monthIndex = 1
    let cumBudgeted = 0
    let cumExecuted = 0
    let cumPlanned = 0

    while (cur <= end) {
      const y = cur.getFullYear()
      const m = cur.getMonth()
      const monthStart = new Date(y, m, 1, 0, 0, 0, 0).getTime()
      const nextMonthStart = new Date(y, m + 1, 1, 0, 0, 0, 0).getTime()
      const monthEnd = nextMonthStart - 1

      let monthBudgeted = 0
      let monthExecuted = 0
      let monthPlanned = 0

      schedule.forEach(t => {
        const tStart = parseDateLocal(t.startDate).getTime()
        const tEnd = parseDateLocal(t.endDate).getTime()
        const tBudget = getTaskBudget(t)
        const tDays = Math.max(1, Math.round((tEnd - tStart) / 86400000) + 1)

        const oStart = Math.max(tStart, monthStart)
        const oEnd = Math.min(tEnd, monthEnd)

        if (oStart <= oEnd) {
          const oDays = Math.round((oEnd - oStart) / 86400000) + 1
          const ratio = Math.min(1, Math.max(0, oDays / tDays))
          const plannedPct = getTaskPlannedPercent(t)
          const realPct = Math.min(100, Math.max(0, Number(t.progressPercent) || 0))

          monthBudgeted += tBudget * ratio
          monthPlanned += tBudget * ratio
          monthExecuted += tBudget * (realPct / 100) * ratio
        }
      })

      cumBudgeted += monthBudgeted
      cumExecuted += monthExecuted
      cumPlanned += monthPlanned

      const rawMonthName = cur.toLocaleDateString('es-UY', { month: 'short', year: 'numeric' })
      const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)
      const certAdvancePercent = monthBudgeted > 0 ? Number(((monthExecuted / monthBudgeted) * 100).toFixed(1)) : 0
      const plannedPercent = monthBudgeted > 0 ? Number(((monthPlanned / monthBudgeted) * 100).toFixed(1)) : 0

      months.push({
        month: monthName,
        monthWithIndex: `${monthName} (Mes ${monthIndex})`,
        monthShort: monthName,
        monthIndex,
        certAdvancePercent,
        plannedPercent,
        certCost: Math.round(monthExecuted),
        budgetedCost: Math.round(monthBudgeted),
        plannedCost: Math.round(monthPlanned),
        cumBudgeted: Math.round(cumBudgeted),
        cumExecuted: Math.round(cumExecuted),
        cumPlanned: Math.round(cumPlanned),
        diff: Math.round(monthExecuted - monthBudgeted),
        isOver: (monthExecuted - monthBudgeted) > 0
      })

      monthIndex++
      cur.setMonth(cur.getMonth() + 1)
    }

    return months
  }, [schedule])

  const dynamicWeeklyProgress = useMemo(() => {
    if (!schedule.length) return []

    let minMs = Infinity
    let maxMs = -Infinity
    schedule.forEach(t => {
      const s = parseDateLocal(t.startDate).getTime()
      const e = parseDateLocal(t.endDate).getTime()
      if (!Number.isNaN(s) && s < minMs) minMs = s
      if (!Number.isNaN(e) && e > maxMs) maxMs = e
    })

    if (minMs === Infinity || maxMs === -Infinity) return []

    const totalDays = Math.max(7, Math.round((maxMs - minMs) / 86400000))
    const totalBudget = schedule.reduce((sum, t) => sum + getTaskBudget(t, projectSocialLawsRate / 100, laborCategories), 0)
    if (totalBudget <= 0) return []

    // Semanas calendario reales del proyecto (7 días por semana: S1, S2, ..., S_n)
    const weekCount = Math.max(1, Math.ceil(totalDays / 7))
    const oneWeekMs = 7 * 86400000

    const realNow = Date.now()
    const refDateMs = new Date(2026, 9, 18).getTime()
    let todayMs = realNow
    if (todayMs < minMs || todayMs > maxMs) {
      if (refDateMs >= minMs && refDateMs <= maxMs) {
        todayMs = refDateMs
      } else {
        todayMs = minMs + (maxMs - minMs) * 0.25
      }
    }

    // Calcular avance real certificado global de la obra al momento de hoy
    let totalCertifiedVal = 0
    schedule.forEach(t => {
      const pct = Math.min(100, Math.max(0, Number(t.progressPercent) || 0))
      totalCertifiedVal += getTaskBudget(t, projectSocialLawsRate / 100, laborCategories) * (pct / 100)
    })
    const totalCertifiedPct = Number(Math.min(100, Math.max(0, (totalCertifiedVal / totalBudget) * 100)).toFixed(1))

    // Identificar semana actual donde se ubica 'Hoy'
    let currentWeekIdx = 1
    for (let w = 1; w <= weekCount; w++) {
      const wStartMs = minMs + (w - 1) * oneWeekMs
      const wCutMs = Math.min(maxMs, minMs + w * oneWeekMs)
      if (todayMs >= wStartMs && todayMs <= wCutMs) {
        currentWeekIdx = w
        break
      }
      if (todayMs > wCutMs) {
        currentWeekIdx = w
      }
    }

    const weeks = []
    let prevReal = 0

    for (let w = 1; w <= weekCount; w++) {
      const wStartMs = minMs + (w - 1) * oneWeekMs
      const wCutMs = Math.min(maxMs, minMs + w * oneWeekMs)
      const startD = new Date(wStartMs).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })
      const endD = new Date(wCutMs).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })

      // Plan Contractual P0 (Línea Base S-curve completa 0% a 100%)
      let cumPlanVal = 0
      schedule.forEach(t => {
        const tStart = parseDateLocal(t.startDate).getTime()
        const tEnd = parseDateLocal(t.endDate).getTime()
        const tBudget = getTaskBudget(t, projectSocialLawsRate / 100, laborCategories)

        let planRatio = 0
        if (wCutMs >= tEnd) {
          planRatio = 1.0
        } else if (wCutMs <= tStart) {
          planRatio = 0
        } else {
          planRatio = (wCutMs - tStart) / Math.max(1, tEnd - tStart)
        }
        cumPlanVal += tBudget * planRatio
      })

      const budgetZeroPercent = w === weekCount
        ? 100.0
        : Number(Math.min(100, Math.max(0, (cumPlanVal / totalBudget) * 100)).toFixed(1))

      const isPastOrCurrent = wStartMs <= todayMs
      const isCurrent = w === currentWeekIdx

      let realPercent = null
      let delta = null
      let isAhead = true

      if (isPastOrCurrent) {
        if (wCutMs >= todayMs || isCurrent) {
          // Semana actual: coincide exactamente con el avance real certificado acumulado
          realPercent = totalCertifiedPct
        } else {
          // Semana histórica: avance proporcional según progreso físico real de tareas
          let histVal = 0
          schedule.forEach(t => {
            const tStart = parseDateLocal(t.startDate).getTime()
            const tEnd = parseDateLocal(t.endDate).getTime()
            const tBudget = getTaskBudget(t, projectSocialLawsRate / 100, laborCategories)
            const realPct = Math.min(100, Math.max(0, Number(t.progressPercent) || 0))
            if (wCutMs <= tStart) return
            const progressTime = Math.min(1, (wCutMs - tStart) / Math.max(1, Math.min(todayMs, tEnd) - tStart))
            histVal += tBudget * (realPct / 100) * progressTime
          })
          let valPct = Number(Math.min(totalCertifiedPct, Math.max(0, (histVal / totalBudget) * 100)).toFixed(1))
          if (valPct < prevReal) valPct = prevReal
          else prevReal = valPct
          realPercent = valPct
        }

        delta = Number((realPercent - budgetZeroPercent).toFixed(1))
        isAhead = delta >= 0
      }

      weeks.push({
        week: `Semana ${w}`,
        weekShort: `S${w}`,
        weekNumber: w,
        dateRange: `${startD} - ${endD}`,
        budgetZeroPercent,
        realPercent,
        delta,
        isAhead,
        isCurrent,
        isFuture: !isPastOrCurrent
      })
    }

    return weeks
  }, [schedule, projectSocialLawsRate, laborCategories])

  const curvaChartData = useMemo(() => {
    if (!dynamicWeeklyProgress || !dynamicWeeklyProgress.length) return []
    const origin = {
      week: 'Inicio de Obra',
      weekShort: 'Día 0',
      dateRange: 'Arranque del proyecto',
      budgetZeroPercent: 0,
      realPercent: 0,
      delta: 0,
      isOrigin: true
    }
    return [origin, ...dynamicWeeklyProgress]
  }, [dynamicWeeklyProgress])

  const currentWeekShort = useMemo(() => {
    return dynamicWeeklyProgress.find(w => w.isCurrent)?.weekShort || null
  }, [dynamicWeeklyProgress])

  // Alerts by rubro with detailed breakdown (MO + Leyes Sociales + Materiales)
  const rubroAlerts = useMemo(() => {
    return rubros.map(r => {
      const labor = getRubroLaborCost(r)
      const social = getRubroSocialLaws(r, projectSocialLawsRate / 100)
      const material = getRubroMaterialCost(r, projectSocialLawsRate / 100)
      const totalBudget = getRubroTotalBudget(r, projectSocialLawsRate / 100)
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
  }, [rubros, projectSocialLawsRate])

  const rubroTotals = useMemo(() => {
    const labor = rubroAlerts.reduce((acc, r) => acc + (r.laborCost || 0), 0)
    const social = rubroAlerts.reduce((acc, r) => acc + (r.socialLawsCost || 0), 0)
    const material = rubroAlerts.reduce((acc, r) => acc + (r.materialCost || 0), 0)
    const budgeted = rubroAlerts.reduce((acc, r) => acc + (r.budgeted || 0), 0)
    const executed = rubroAlerts.reduce((acc, r) => acc + (r.executed || 0), 0)
    const saldo = budgeted - executed
    return { labor, social, material, budgeted, executed, saldo }
  }, [rubroAlerts])

  // Totales de Gastos Generales / Costos Indirectos (Punto 6)
  const indirectCostsTotals = useMemo(() => {
    return calculateIndirectCostsTotals(indirectExpenses)
  }, [indirectExpenses])

  // Desglose consolidado: Costo Directo + Costo Indirecto = Costo Total de Obra (Punto 6)
  const projectCostConsolidated = useMemo(() => {
    return calculateProjectCostBreakdown(
      { budgeted: rubroTotals.budgeted, executed: rubroTotals.executed },
      indirectCostsTotals
    )
  }, [rubroTotals, indirectCostsTotals])

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
    let days = 1
    let monthLabel = 'Nov. 2026'
    let breakdown = []
    if (start && end) {
      days = calculateWorkingDays(start, end)
      const dist = distributeCostByMonths(start, end, 1000)
      monthLabel = dist.primaryMonthLabel || monthLabel
      breakdown = dist.breakdown || []
    }
    setNewTask(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      workDays: days,
      month: monthLabel,
      monthBreakdown: breakdown
    }))
  }

  function handleOpenEditTask(task) {
    setEditingTaskId(task.id)
    const isCrew = Array.isArray(task.crewLines) && task.crewLines.length > 0
    setNewTask({
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      workDays: task.workDays || calculateWorkingDays(task.startDate, task.endDate),
      schedulingMode: task.dependsOnTaskId ? 'dependency' : 'dates',
      dependsOnTaskId: task.dependsOnTaskId || '',
      dependencyType: task.dependencyType || 'FS',
      lagDays: task.lagDays != null ? task.lagDays : 0,
      crewMode: isCrew ? 'custom' : 'single',
      selectedTemplateId: 'crew_albanileria',
      crewLines: isCrew ? task.crewLines.map(l => ({ ...l })) : [
        { role: 'Oficial', count: 1, dailyRate: 2800 },
        { role: 'Medio Oficial', count: 1, dailyRate: 2200 },
        { role: 'Peón Práctico', count: 1, dailyRate: 1800 }
      ],
      peopleCount: task.peopleCount || (isCrew ? task.crewLines.reduce((s, l) => s + (Number(l.count) || 1), 0) : 1),
      category: task.category || 'Oficial',
      categoryRate: task.categoryRate || 2800,
      socialLawsCost: task.customSocialLaws ? task.socialLawsCost : '',
      materialMode: task.linkedPartidaId ? 'partida' : 'manual',
      linkedPartidaId: task.linkedPartidaId || '',
      partidaAssignMode: task.assignedPartidaQuantity ? 'quantity' : 'percent',
      partidaAssignValue: task.assignedPartidaQuantity || task.assignedPartidaPercent || 100,
      partidaDescription: task.partidaDescription || '',
      materialCost: task.materialCost || 0,
      month: task.month || 'Nov. 2026',
      initialProgressPercent: task.progressPercent || 0,
      actualCostMode: task.actualCostMode || 'auto',
      actualIncurredCost: task.actualIncurredCost != null ? task.actualIncurredCost : ''
    })
    setShowAddTaskModal(true)
  }

  function handleAddTask(e) {
    e.preventDefault()
    if (!newTask.name) return
    const days = Math.max(1, Number(newTask.workDays) || calculateWorkingDays(newTask.startDate, newTask.endDate))
    
    // Punto 6: soporte para cuadrillas mixtas
    const isCrewMode = newTask.crewMode === 'template' || newTask.crewMode === 'custom'
    const crewLinesToUse = isCrewMode && Array.isArray(newTask.crewLines) && newTask.crewLines.length > 0
      ? newTask.crewLines
      : null

    const laborCalc = calculateTaskLaborAndSocial({
      workDays: days,
      crewLines: crewLinesToUse,
      peopleCount: newTask.peopleCount,
      categoryRate: newTask.categoryRate,
      category: newTask.category,
      socialLawsCost: newTask.socialLawsCost,
      customSocialLaws: newTask.socialLawsCost !== '' && newTask.socialLawsCost != null
    }, { socialLawsRate: projectSocialLawsRate, laborCategories })

    const laborCost = laborCalc.laborCost
    const socialCost = laborCalc.socialLawsCost
    const totalPeople = isCrewMode ? laborCalc.peopleCount : (Number(newTask.peopleCount) || 1)
    const isCustom = laborCalc.isCustomSocial

    const selectedPartida = budgetItems.find(p => p.id === newTask.linkedPartidaId)
    const isManualMaterial = newTask.materialMode === 'manual' || !selectedPartida

    let finalMaterialCost = Number(newTask.materialCost) || 0
    let assignedPartidaPercent = 100
    let assignedPartidaQuantity = 0
    let partidaDescription = ''

    if (!isManualMaterial && selectedPartida) {
      const calc = calculateTaskMaterialCostFromPartida(selectedPartida, {
        mode: newTask.partidaAssignMode,
        value: newTask.partidaAssignValue
      })
      finalMaterialCost = calc.materialCost
      assignedPartidaPercent = calc.assignedPercent
      assignedPartidaQuantity = calc.assignedQuantity
      partidaDescription = calc.description
    } else {
      partidaDescription = 'Estimación manual'
    }

    const totalEst = laborCost + socialCost + finalMaterialCost
    const dist = distributeCostByMonths(newTask.startDate, newTask.endDate, totalEst)
    const taskMonth = dist.primaryMonthLabel || newTask.month || 'Nov. 2026'

    // Punto 7 y 8: avance programado automático desde calendario
    const autoPlanned = calculateTaskPlannedPercent({ startDate: newTask.startDate, endDate: newTask.endDate })
    const initialProgress = Math.min(100, Math.max(0, Number(newTask.initialProgressPercent) || 0))

    const matchedRubro = rubros.find(r => 
      (selectedPartida?.rubroName && r.name.toLowerCase().includes(selectedPartida.rubroName.toLowerCase())) ||
      (r.name.toLowerCase().includes(newTask.name.toLowerCase()))
    ) || rubros[0]

    const taskEntry = {
      id: editingTaskId || Date.now(),
      name: newTask.name,
      startDate: newTask.startDate || '2026-11-02',
      endDate: newTask.endDate || '2026-11-20',
      workDays: days,
      schedulingMode: newTask.schedulingMode || 'dates',
      dependsOnTaskId: newTask.schedulingMode === 'dependency' ? (newTask.dependsOnTaskId || null) : null,
      dependencyType: newTask.dependencyType || 'FS',
      lagDays: Number(newTask.lagDays) || 0,
      crewLines: crewLinesToUse,
      peopleCount: totalPeople,
      category: isCrewMode ? 'Cuadrilla Mixta' : newTask.category,
      categoryRate: isCrewMode ? Math.round(laborCalc.dailyCost / (totalPeople || 1)) : Number(newTask.categoryRate),
      assignedLaborCost: laborCost,
      socialLawsCost: socialCost,
      customSocialLaws: isCustom,
      materialCost: finalMaterialCost,
      materialEstimationMode: isManualMaterial ? 'manual' : 'presupuesto',
      linkedPartidaId: isManualMaterial ? null : selectedPartida.id,
      partidaCode: isManualMaterial ? null : selectedPartida.code,
      partidaName: isManualMaterial ? null : selectedPartida.name,
      rubroId: matchedRubro?.id || 'fundaciones',
      rubroName: isManualMaterial ? (matchedRubro?.name || 'Rubro') : selectedPartida.rubroName,
      assignedPartidaPercent: isManualMaterial ? null : assignedPartidaPercent,
      assignedPartidaQuantity: isManualMaterial ? null : assignedPartidaQuantity,
      partidaDescription: partidaDescription,
      month: taskMonth,
      monthBreakdown: dist.breakdown || [],
      plannedPercent: autoPlanned,
      progressPercent: initialProgress,
      actualCostMode: newTask.actualCostMode || 'auto',
      actualIncurredCost: newTask.actualCostMode === 'manual' && newTask.actualIncurredCost !== '' ? Number(newTask.actualIncurredCost) : null
    }

    let nextSchedule = []
    if (editingTaskId) {
      nextSchedule = schedule.map(t => t.id === editingTaskId ? { ...t, ...taskEntry } : t)
      setEditingTaskId(null)
    } else {
      nextSchedule = [...schedule, taskEntry]
    }
    const cascaded = recalculateScheduleDependencies(nextSchedule)
    setSchedule(cascaded)
    setShowAddTaskModal(false)

    const defaultStart = '2026-11-02'
    const defaultEnd = '2026-11-20'
    const defaultDays = calculateWorkingDays(defaultStart, defaultEnd)
    const defaultDist = distributeCostByMonths(defaultStart, defaultEnd, 1000)
    setNewTask({
      name: '',
      startDate: defaultStart,
      endDate: defaultEnd,
      workDays: defaultDays,
      schedulingMode: 'dates',
      dependsOnTaskId: '',
      dependencyType: 'FS',
      lagDays: 0,
      crewMode: 'template',
      selectedTemplateId: 'crew_albanileria',
      crewLines: [
        { role: 'Oficial', count: 1, dailyRate: 2800 },
        { role: 'Medio Oficial', count: 1, dailyRate: 2200 },
        { role: 'Peón Práctico', count: 1, dailyRate: 1800 }
      ],
      peopleCount: 3,
      category: 'Oficial',
      categoryRate: 2800,
      socialLawsCost: '',
      materialMode: 'partida',
      linkedPartidaId: '',
      partidaAssignMode: 'percent',
      partidaAssignValue: 100,
      partidaDescription: '',
      materialCost: 0,
      month: defaultDist.primaryMonthLabel || 'Nov. 2026',
      initialProgressPercent: 0,
      monthBreakdown: defaultDist.breakdown || [],
      plannedPercent: 0,
      progressPercent: 0
    })
  }

  function handleAddBudgetItem(e) {
    e.preventDefault()
    if (!newBudgetItemForm.name) return
    const qty = Number(newBudgetItemForm.quantity) || 1
    const unitCost = Number(newBudgetItemForm.unitMaterialCost) || 0
    const totalMat = Math.round(qty * unitCost)
    const labor = Number(newBudgetItemForm.totalLaborCost) || 0
    const newItem = {
      id: `item_${Date.now()}`,
      code: newBudgetItemForm.code || `0${budgetItems.length + 1}.01`,
      rubroName: newBudgetItemForm.rubroName || 'General',
      name: newBudgetItemForm.name,
      unit: newBudgetItemForm.unit || 'un',
      quantity: qty,
      unitMaterialCost: unitCost,
      totalMaterialCost: totalMat,
      totalLaborCost: labor,
      totalSubcontractCost: 0,
      totalBudget: totalMat + labor
    }
    const updated = [...budgetItems, newItem]
    setBudgetItems(updated)
    try {
      localStorage.setItem(`${storageKey}_budget_items`, JSON.stringify(updated))
    } catch {}
    setNewBudgetItemForm({
      code: '',
      rubroName: '05. Albañilería y Mampostería',
      name: '',
      unit: 'm²',
      quantity: 100,
      unitMaterialCost: 500,
      totalLaborCost: 0
    })
  }

  function handleDeleteBudgetItem(itemId) {
    if (window.confirm('¿Deseas eliminar esta partida del presupuesto de obra?')) {
      const updated = budgetItems.filter(i => i.id !== itemId)
      setBudgetItems(updated)
      try {
        localStorage.setItem(`${storageKey}_budget_items`, JSON.stringify(updated))
      } catch {}
    }
  }

  function handlePreviewSpreadsheet() {
    if (!importPasteText.trim()) return
    const result = parseBudgetSpreadsheet(importPasteText)
    setImportPreviewResult(result)
  }

  function handleConfirmImportBudget() {
    if (!importPreviewResult || !importPreviewResult.success || !importPreviewResult.items.length) return
    const newItems = importMode === 'replace'
      ? importPreviewResult.items
      : [...budgetItems, ...importPreviewResult.items]
    setBudgetItems(newItems)
    try {
      localStorage.setItem(`${storageKey}_budget_items`, JSON.stringify(newItems))
    } catch {}
    setImportPasteText('')
    setImportPreviewResult(null)
    setBudgetModalTab('items')
  }

  function handleImportAndGenerateGantt() {
    if (!importPreviewResult || !importPreviewResult.success || !importPreviewResult.items.length) return
    const newItems = importMode === 'replace'
      ? importPreviewResult.items
      : [...budgetItems, ...importPreviewResult.items]

    // 1. Sincronizar partidas a rubros
    const updatedRubros = syncBudgetItemsToRubros(newItems, rubros, projectSocialLawsRate)

    // 2. Generar cronograma Gantt secuencial
    const newSchedule = generateScheduleFromBudgetItems(newItems, {
      projectStartDate: project?.startDate,
      socialLawsRate: projectSocialLawsRate,
      existingSchedule: schedule,
      mode: importMode
    })

    setBudgetItems(newItems)
    setRubros(updatedRubros)
    setSchedule(newSchedule)

    try {
      localStorage.setItem(`${storageKey}_budget_items`, JSON.stringify(newItems))
      localStorage.setItem(`${storageKey}_rubros`, JSON.stringify(updatedRubros))
      localStorage.setItem(`${storageKey}_sched`, JSON.stringify(newSchedule))
    } catch {}

    setImportPasteText('')
    setImportPreviewResult(null)
    setShowBudgetModal(false)
    setActiveTab('cronograma')
  }

  function handleSpreadsheetFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result
      if (typeof text === 'string') {
        setImportPasteText(text)
        const result = parseBudgetSpreadsheet(text)
        setImportPreviewResult(result)
      }
    }
    reader.readAsText(file)
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
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    const delayDays = Math.max(1, Number(rainForm.days) || 1)
    const eventDate = rainForm.date
    if (!eventDate) return

    const isDirectlySelected = (id) => {
      if (rainForm.affectAll) return true
      return Array.isArray(rainForm.selectedTaskIds) && rainForm.selectedTaskIds.includes(id)
    }

    let affectedTasksCount = 0
    const updatedSchedule = schedule.map(t => {
      // Don't shift completed tasks
      if (Number(t.progressPercent) === 100) return t
      // Don't shift tasks that ended strictly before the rain event
      if (t.endDate < eventDate) return t

      const selected = isDirectlySelected(t.id)
      if (!selected) {
        return t
      }

      affectedTasksCount++
      let newStart = t.startDate
      let newEnd = t.endDate

      if (t.startDate <= eventDate && t.endDate >= eventDate) {
        // Ongoing task during rain: extend endDate by delayDays working days
        newEnd = addWorkingDays(t.endDate, delayDays)
      } else if (t.startDate > eventDate) {
        // Future task: push both start and end forward by delayDays working days
        newStart = addWorkingDays(t.startDate, delayDays)
        newEnd = addWorkingDays(t.endDate, delayDays)
      }

      const calculatedWorkDays = calculateWorkingDays(newStart, newEnd)

      return {
        ...t,
        startDate: newStart,
        endDate: newEnd,
        workDays: calculatedWorkDays,
        rainDelayedDays: (Number(t.rainDelayedDays) || 0) + delayDays,
        originalEndDate: t.originalEndDate || t.endDate,
        originalStartDate: t.originalStartDate || t.startDate
      }
    })

    if (affectedTasksCount === 0) {
      alert('Por favor selecciona al menos una tarea activa o futura para postergar.')
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
        notes: `Suspensión por ${rainForm.reason} (+${delayDays}d hábiles). Se postergaron ${affectedTasksCount} tareas seleccionadas${rainForm.cascadeDependencies !== false ? ' con ajuste en cascada' : ''}. ${rainForm.notes || ''}`,
        history: [
          {
            version: 'v1.0',
            date: eventDate,
            status: 'aprobado',
            notes: `Homologación técnica de suspensión climática (+${delayDays}d hábiles) para ${affectedTasksCount} tareas.`
          }
        ]
      }
      setDocuments(prev => [rainDoc, ...prev])
    }

    if (isNumericProject) {
      const token = getAuthToken()
      if (token) {
        createOxiProDelay(token, project.id, {
          eventDate,
          days: delayDays,
          cause: rainForm.reason,
          notes: rainForm.notes,
          tasksSnapshot: schedule
        }).then(created => {
          logEntry.backendId = created.id
        }).catch(err => console.warn('Could not persist rain delay to cloud', err))
      }
    }

    const finalSchedule = rainForm.cascadeDependencies !== false
      ? recalculateScheduleDependencies(updatedSchedule)
      : updatedSchedule
    const newRainLogs = [logEntry, ...rainLogs]
    setRainLogs(newRainLogs)
    setSchedule(finalSchedule)
    try {
      localStorage.setItem(`${storageKey}_sched`, JSON.stringify(finalSchedule))
      localStorage.setItem(`${storageKey}_rainLogs`, JSON.stringify(newRainLogs))
    } catch {}
    setShowRainModal(false)
  }

  function handleUndoRainDelay(logId) {
    const targetLog = rainLogs.find(l => l.id === logId)
    if (!targetLog) return
    if (!window.confirm(`¿Revertir el corrimiento del evento del ${targetLog.date} (+${targetLog.days} días)? Las fechas volverán a su estado previo.`)) return

    if (isNumericProject && (targetLog.backendId || targetLog.id)) {
      const token = getAuthToken()
      if (token) {
        deleteOxiProDelay(token, project.id, targetLog.backendId || targetLog.id)
          .catch(err => console.warn('Could not delete delay from cloud', err))
      }
    }

    if (targetLog.previousSchedule) {
      setSchedule(targetLog.previousSchedule)
      try {
        localStorage.setItem(`${storageKey}_sched`, JSON.stringify(targetLog.previousSchedule))
      } catch {}
    }
    const updatedRainLogs = rainLogs.filter(l => l.id !== logId)
    setRainLogs(updatedRainLogs)
    try {
      localStorage.setItem(`${storageKey}_rainLogs`, JSON.stringify(updatedRainLogs))
    } catch {}
  }

  // Handlers for Certifications with Photos (Paso 4)
  function handleOpenCertModal(task) {
    setCertTask(task)
    setCertForm({
      certifiedPercent: Number(task.progressPercent) || 0,
      inspector: 'Director de Obra',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      photos: []
    })
    setShowCertModal(true)
  }

  function handleAddCertPhotos(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCertForm(prev => ({
          ...prev,
          photos: [
            ...prev.photos,
            {
              id: Date.now() + Math.random(),
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              dataUrl: event.target.result
            }
          ]
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  function handleRemoveCertPhoto(photoId) {
    setCertForm(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photoId)
    }))
  }

  function handleSaveCertification(e) {
    e.preventDefault()
    if (!certTask) return

    const newPct = Math.min(100, Math.max(0, Number(certForm.certifiedPercent) || 0))
    const newCert = {
      id: Date.now(),
      date: certForm.date,
      certifiedPercent: newPct,
      inspector: certForm.inspector.trim() || 'Inspector Técnico',
      notes: certForm.notes.trim(),
      photos: certForm.photos || [],
      createdAt: new Date().toISOString()
    }

    const updatedTasks = schedule.map(t => {
      if (t.id !== certTask.id) return t
      const existingCerts = Array.isArray(t.certifications) ? t.certifications : []
      return {
        ...t,
        progressPercent: newPct,
        certifications: [newCert, ...existingCerts]
      }
    })

    setSchedule(updatedTasks)
    setShowCertModal(false)
    setCertTask(null)
  }

  // Handlers for AI Onboarding (Paso 5)
  async function handleGenerateAiPlan() {
    if (!aiPrompt.trim()) {
      setAiError('Por favor ingresá una descripción, pliego o memoria descriptiva de la obra.')
      return
    }
    setAiLoading(true)
    setAiError('')
    const token = getAuthToken()
    try {
      const res = await generateOxiProAiPlan(token, {
        prompt: aiPrompt,
        projectName: project?.name || 'Obra Óxida',
        startDate: aiStartDate
      })
      if (res && Array.isArray(res.tasks) && res.tasks.length > 0) {
        setAiResult(res)
        setAiError('')
        return
      }
    } catch (err) {
      console.warn('Backend AI onboarding unavailable, switching directly to client-side engine', err)
    }

    try {
      const fallback = generateHeuristicConstructionPlan(aiPrompt, { startDate: aiStartDate })
      if (fallback && Array.isArray(fallback.tasks) && fallback.tasks.length > 0) {
        setAiResult(fallback)
        setAiError('')
      } else {
        setAiError('No se pudieron extraer tareas del texto ingresado. Probá agregar más detalles o usar una plantilla rápida.')
      }
    } catch (fallbackErr) {
      console.error('Fallback engine error', fallbackErr)
      setAiError('Ocurrió un error al procesar la memoria. Por favor intentá de nuevo.')
    } finally {
      setAiLoading(false)
    }
  }

  function handleApplyAiPlan(mode = 'replace') {
    if (!aiResult) return

    if (mode === 'replace') {
      setSchedule(aiResult.tasks || [])
      if (Array.isArray(aiResult.rubros) && aiResult.rubros.length > 0) {
        setRubros(aiResult.rubros)
      }
    } else {
      const maxId = schedule.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0)
      const newTasks = (aiResult.tasks || []).map((t, i) => ({
        ...t,
        id: maxId + i + 1
      }))
      setSchedule([...schedule, ...newTasks])
    }

    setShowAiModal(false)
    setAiResult(null)
    setAiPrompt('')
    setActiveTab('cronograma')
  }


  // Handlers for Rubros
  function handleUpdateRubro(id, field, value) {
    const num = Number(value) || 0
    const effRate = projectSocialLawsRate / 100
    setRubros(rubros.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: num }
      if (field === 'laborCost') {
        const soc = r.customSocialLaws ? getRubroSocialLaws(r, effRate) : Math.round(num * effRate)
        const mat = getRubroMaterialCost(r, effRate)
        return { ...updated, laborCost: num, socialLawsCost: soc, materialCost: mat, budgeted: num + soc + mat }
      }
      if (field === 'socialLawsCost') {
        const labor = getRubroLaborCost(r)
        const mat = getRubroMaterialCost(r, effRate)
        return { ...updated, socialLawsCost: num, customSocialLaws: true, budgeted: labor + num + mat }
      }
      if (field === 'materialCost') {
        const labor = getRubroLaborCost(r)
        const soc = getRubroSocialLaws(r, effRate)
        return { ...updated, materialCost: num, budgeted: labor + soc + num }
      }
      return updated
    }))
  }

  function handleAddRubro(e) {
    e.preventDefault()
    if (!newRubro.name) return
    const labor = Number(newRubro.laborCost) || 0
    const effRate = projectSocialLawsRate / 100
    const social = newRubro.socialLawsCost !== '' && newRubro.socialLawsCost != null
      ? Number(newRubro.socialLawsCost)
      : Math.round(labor * effRate)
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
      socialLawsCost: Math.round(200000 * effRate),
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

  // ── Handlers Punto 5: Gastos Reales, Partes Diarios y Facturas ──
  function handleAddLaborReport(e) {
    e.preventDefault()
    const task = schedule.find(t => String(t.id) === String(laborReportForm.taskId)) || schedule[0]
    const rubro = rubros.find(r => r.id === task?.rubroId) || rubros.find(r => task?.rubroName && r.name.toLowerCase().includes(task.rubroName.toLowerCase())) || rubros[0]
    const costs = calculateLaborReportCost({ crew: laborReportForm.crew, socialLawsRate: projectSocialLawsRate }, projectSocialLawsRate)

    const newReport = {
      id: `lr_${Date.now()}`,
      date: laborReportForm.date || new Date().toISOString().slice(0, 10),
      taskId: task?.id || null,
      taskName: task?.name || 'Tarea sin especificar',
      rubroId: rubro?.id || 'fundaciones',
      rubroName: rubro?.name || 'Movimiento de Suelos & Fundaciones',
      crew: [...laborReportForm.crew],
      socialLawsRate: projectSocialLawsRate,
      totalJournals: costs.totalJournals,
      laborDirectCost: costs.laborDirectCost,
      socialLawsCost: costs.socialLawsCost,
      totalLaborCost: costs.totalLaborCost,
      notes: laborReportForm.notes || ''
    }

    setLaborReports([newReport, ...laborReports])
    setShowLaborReportModal(false)
    setLaborReportForm({
      date: new Date().toISOString().slice(0, 10),
      taskId: schedule[0]?.id || 1,
      crew: [
        { role: 'Oficial', quantity: 2, dailyRate: 3100 },
        { role: 'Peón Práctico', quantity: 1, dailyRate: 2350 }
      ],
      notes: ''
    })
  }

  function handleDeleteLaborReport(id) {
    if (window.confirm('¿Deseas eliminar este parte diario de mano de obra?')) {
      setLaborReports(laborReports.filter(lr => lr.id !== id))
    }
  }

  // Motor y cálculos de nómina de personal BPS (Ley 14.411)
  const bpsPayrollReport = useMemo(() => {
    return generateBpsPayrollReport({
      project: {
        id: project?.id,
        name: project?.name,
        location: project?.location,
        clientName: bpsMeta.clientName,
        companyName: bpsMeta.companyName,
        companyRut: bpsMeta.companyRut,
        bpsWorkRegistry: bpsMeta.bpsWorkRegistry
      },
      laborReports,
      employees: bpsEmployees,
      laborCategories,
      socialLawsRate: projectSocialLawsRate,
      filterMonth: bpsFilterMonth,
      filterQuincena: bpsFilterQuincena
    })
  }, [project, bpsMeta, laborReports, bpsEmployees, laborCategories, projectSocialLawsRate, bpsFilterMonth, bpsFilterQuincena])

  function handleDownloadBpsCsv() {
    const csvContent = exportBpsReportToCsv(bpsPayrollReport)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Nomina_BPS_Ley14411_${project?.name || 'Obra'}_${bpsFilterMonth !== 'all' ? bpsFilterMonth : 'Historico'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handlePrintBpsReport() {
    window.print()
  }

  function handleExportCostControlCsv() {
    const reportData = generateCostControlReportData(schedule, costControl, {
      projectName: project?.name || 'Obra',
      costCutoffDate,
      totalProjectBudget
    })
    const csvContent = exportCostControlToCsv(reportData)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Control_Costos_${(project?.name || 'Obra').replace(/\s+/g, '_')}_${costCutoffDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleSaveNewEmployee(e) {
    e.preventDefault()
    if (!newEmployeeForm.name.trim()) return
    const matchedCat = laborCategories.find(c => c.id === newEmployeeForm.categoryId) || laborCategories[0]
    const newEmp = {
      id: `emp-${Date.now()}`,
      name: newEmployeeForm.name.trim(),
      documentId: newEmployeeForm.documentId.trim() || 'S/D',
      categoryId: newEmployeeForm.categoryId,
      role: matchedCat ? matchedCat.role : 'Operario',
      phone: newEmployeeForm.phone.trim()
    }
    setBpsEmployees(prev => [...prev, newEmp])
    setNewEmployeeForm({ name: '', documentId: '', categoryId: 'oficial', phone: '' })
    setShowAddEmployeeModal(false)
  }

  function handleDeleteEmployee(id) {
    if (window.confirm('¿Deseas quitar a este operario de la nómina de la obra?')) {
      setBpsEmployees(prev => prev.filter(e => e.id !== id))
    }
  }

  function handleAddMaterialInvoice(e) {
    e.preventDefault()
    const totalAmount = Number(invoiceForm.totalAmount) || 0
    if (totalAmount <= 0) return

    let allocations = []
    let status = 'unassigned'

    if (invoiceForm.allocateNow) {
      const task = schedule.find(t => String(t.id) === String(invoiceForm.taskId)) || schedule[0]
      const rubro = rubros.find(r => r.id === task?.rubroId) || rubros.find(r => task?.rubroName && r.name.toLowerCase().includes(task.rubroName.toLowerCase())) || rubros[0]
      const allocAmount = invoiceForm.assignMode === 'partial' && Number(invoiceForm.assignedAmount) > 0
        ? Math.min(totalAmount, Number(invoiceForm.assignedAmount))
        : totalAmount

      const percent = totalAmount > 0 ? Math.round((allocAmount / totalAmount) * 1000) / 10 : 100

      allocations.push({
        taskId: task?.id || null,
        taskName: task?.name || 'Tarea de Obra',
        rubroId: rubro?.id || 'fundaciones',
        rubroName: rubro?.name || 'Rubro Asignado',
        amount: allocAmount,
        percentage: percent,
        notes: invoiceForm.notes || ''
      })

      status = allocAmount >= totalAmount ? 'assigned' : 'partially_assigned'
    }

    const newInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: invoiceForm.invoiceNumber || `FC-${Math.floor(100000 + Math.random() * 900000)}`,
      supplier: invoiceForm.supplier || 'Proveedor Local',
      date: invoiceForm.date || new Date().toISOString().slice(0, 10),
      totalAmount,
      currency: invoiceForm.currency || 'UYU',
      photoUrl: null,
      status,
      allocations
    }

    setMaterialInvoices([newInvoice, ...materialInvoices])
    setShowInvoiceModal(false)
    setInvoiceForm({
      invoiceNumber: '',
      supplier: '',
      date: new Date().toISOString().slice(0, 10),
      totalAmount: '',
      currency: 'UYU',
      allocateNow: true,
      taskId: schedule[0]?.id || 1,
      assignMode: 'total',
      assignedAmount: '',
      notes: ''
    })
  }

  function handleDeleteMaterialInvoice(id) {
    if (window.confirm('¿Deseas eliminar esta factura / comprobante?')) {
      setMaterialInvoices(materialInvoices.filter(inv => inv.id !== id))
    }
  }

  function handleConfirmAssignInvoice(e) {
    e.preventDefault()
    const invoice = materialInvoices.find(inv => inv.id === assignInvoiceForm.invoiceId)
    if (!invoice) return

    const task = schedule.find(t => String(t.id) === String(assignInvoiceForm.taskId)) || schedule[0]
    const rubro = rubros.find(r => r.id === task?.rubroId) || rubros.find(r => task?.rubroName && r.name.toLowerCase().includes(task.rubroName.toLowerCase())) || rubros[0]
    
    const invoiceTotals = calculateInvoiceAllocationTotals(invoice)
    const amountToAssign = Math.min(invoiceTotals.unassignedAmount, Number(assignInvoiceForm.amount) || invoiceTotals.unassignedAmount)
    if (amountToAssign <= 0) return

    const percent = invoice.totalAmount > 0 ? Math.round((amountToAssign / invoice.totalAmount) * 1000) / 10 : 100

    const newAlloc = {
      taskId: task?.id || null,
      taskName: task?.name || 'Tarea de Obra',
      rubroId: rubro?.id || 'fundaciones',
      rubroName: rubro?.name || 'Rubro Asignado',
      amount: amountToAssign,
      percentage: percent,
      notes: assignInvoiceForm.notes || ''
    }

    const updatedAllocations = [...(invoice.allocations || []), newAlloc]
    const newTotalAlloc = updatedAllocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
    const newStatus = newTotalAlloc >= invoice.totalAmount ? 'assigned' : 'partially_assigned'

    setMaterialInvoices(materialInvoices.map(inv => inv.id === invoice.id ? {
      ...inv,
      allocations: updatedAllocations,
      status: newStatus
    } : inv))

    setShowAssignInvoiceModal(false)
  }

  function handleCountryChange(code) {
    setSelectedCountryCode(code)
    localStorage.setItem(`${storageKey}_country_code`, code)
    const profile = getRegionalProfile(code)
    setProjectSocialLawsRate(profile.socialLawsRate)
  }

  function handleResetDemoData() {
    const ok = window.confirm(
      '¿Deseas restablecer todos los datos de esta obra al estado inicial de demostración?\n\n' +
      'Esto recargará el cronograma Gantt base ("Torre Libertador"), la Curva S planificada, los rubros presupuestales, cuadrillas SUNCA, contratos marco y eliminará ingresos o documentos accidentales cargados en la prueba.'
    )
    if (!ok) return

    try {
      localStorage.removeItem(`${storageKey}_docs`)
      localStorage.removeItem(`${storageKey}_sched`)
      localStorage.removeItem(`${storageKey}_monthly`)
      localStorage.removeItem(`${storageKey}_weekly`)
      localStorage.removeItem(`${storageKey}_rubros`)
      localStorage.removeItem(`${storageKey}_rainLogs`)
      localStorage.removeItem(`${storageKey}_labor_cats`)
      localStorage.removeItem(`${storageKey}_social_rate`)
      localStorage.removeItem(`${storageKey}_budget_items`)
      localStorage.removeItem(`${storageKey}_labor_reports`)
      localStorage.removeItem(`${storageKey}_material_invoices`)
      localStorage.removeItem(`${storageKey}_subcontracts`)
      localStorage.removeItem(`${storageKey}_subcontract_contracts`)
      localStorage.removeItem(`${storageKey}_country_code`)
      localStorage.removeItem(`${storageKey}_indirect_expenses`)
      localStorage.removeItem(`${storageKey}_bps_employees`)
      localStorage.removeItem(`${storageKey}_bps_meta`)
      localStorage.removeItem(`${storageKey}_latest_weekly_closure`)
    } catch (e) {
      console.warn('Error clearing localStorage for demo reset', e)
    }

    setDocuments(DEFAULT_DOCUMENTS)
    setSchedule(DEFAULT_SCHEDULE)
    setMonthlyComp(DEFAULT_MONTHLY_COMPARISON)
    setWeeklyProgress(DEFAULT_WEEKLY_PROGRESS)
    setRubros(DEFAULT_RUBROS)
    setRainLogs([])
    setLaborCategories(DEFAULT_LABOR_CATEGORIES)
    setProjectSocialLawsRate(DEFAULT_SOCIAL_LAWS_RATE)
    setBudgetItems(DEFAULT_BUDGET_ITEMS)
    setLaborReports(DEFAULT_LABOR_REPORTS)
    setMaterialInvoices(DEFAULT_MATERIAL_INVOICES)
    setSubcontractCertificates(DEFAULT_SUBCONTRACT_CERTIFICATES)
    setSubcontractContracts(DEFAULT_SUBCONTRACT_CONTRACTS)
    setSelectedCountryCode('UY')
    setIndirectExpenses(DEFAULT_INDIRECT_EXPENSES)
    setBpsEmployees(DEFAULT_BPS_EMPLOYEES)
    setBpsMeta({
      bpsWorkRegistry: project?.bpsWorkRegistry || 'BPS-OBRA-489104',
      companyRut: project?.companyRut || '21.849.201.0019',
      companyName: project?.companyName || 'Estudio & Constructora Óxida',
      clientName: project?.clientName || 'Comitente Principal'
    })

    alert('✓ La obra ha sido restablecida al estado inicial de demostración con datos limpios.')
  }

  function handleClearEntireProject() {
    const ok = window.confirm(
      '¿Deseas vaciar por completo esta obra y dejarla en cero (0%)?\n\n' +
      'Esta acción eliminará absolutamente todos los datos cargados:\n' +
      '• Planos y Documentación Técnica (0 archivos)\n' +
      '• Cronograma Gantt y Tareas (0 tareas)\n' +
      '• Curva S y Cronograma Valorizado (0%)\n' +
      '• Partidas Presupuestarias y Rubros (en $0)\n' +
      '• Partes Diarios, Facturas y Remitos (0 comprobantes)\n' +
      '• Contratos Marco, Subcontratos y Gastos Indirectos ($0)\n' +
      '• Nómina de Personal BPS\n\n' +
      'La obra quedará 100% en blanco para que puedas cargar tus propios planos, tu presupuesto desde Excel o auto-crear un nuevo plan con IA.\n\n' +
      '(Siempre podrás volver al modelo demo con el botón "Restablecer Demo")'
    )
    if (!ok) return

    const EMPTY_RUBROS = DEFAULT_RUBROS.map(r => ({
      id: r.id,
      name: r.name,
      laborCost: 0,
      socialLawsCost: 0,
      materialCost: 0,
      budgeted: 0,
      executed: 0
    }))

    const EMPTY_BPS_META = {
      bpsWorkRegistry: '',
      companyRut: '',
      companyName: '',
      clientName: ''
    }

    setDocuments([])
    setSchedule([])
    setMonthlyComp([])
    setWeeklyProgress([])
    setRubros(EMPTY_RUBROS)
    setRainLogs([])
    setBudgetItems([])
    setLaborReports([])
    setMaterialInvoices([])
    setSubcontractCertificates([])
    setSubcontractContracts([])
    setIndirectExpenses([])
    setBpsEmployees([])
    setBpsMeta(EMPTY_BPS_META)

    try {
      localStorage.setItem(`${storageKey}_docs`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_sched`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_monthly`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_weekly`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_rubros`, JSON.stringify(EMPTY_RUBROS))
      localStorage.setItem(`${storageKey}_rainLogs`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_budget_items`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_labor_reports`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_material_invoices`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_subcontracts`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_subcontract_contracts`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_indirect_expenses`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_bps_employees`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_bps_meta`, JSON.stringify(EMPTY_BPS_META))
      localStorage.removeItem(`${storageKey}_latest_weekly_closure`)
    } catch (e) {
      console.warn('Error saving cleared project to localStorage', e)
    }

    alert('✓ La obra ha sido vaciada por completo. Planos, tareas, presupuestos, gastos y Curva S quedaron en cero (0%).')
  }

  function handleClearAllSchedule() {
    const ok = window.confirm(
      '¿Deseas vaciar todas las tareas del cronograma actual?\n\n' +
      'Esta acción eliminará las tareas del cronograma y reiniciará la Curva S y valorizaciones a cero.\n\n' +
      '(Para vaciar también los planos, facturas y partidas presupuestarias, utiliza el botón "Vaciar Obra" en la barra superior)'
    )
    if (!ok) return

    setSchedule([])
    setRainLogs([])
    setWeeklyProgress([])
    setMonthlyComp([])
    try {
      localStorage.setItem(`${storageKey}_sched`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_rainLogs`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_weekly`, JSON.stringify([]))
      localStorage.setItem(`${storageKey}_monthly`, JSON.stringify([]))
    } catch {}
    alert('✓ Las tareas del cronograma han sido vaciadas. La Curva S y valorizaciones quedan en cero.')
  }

  function handleAddContract(e) {
    e.preventDefault()
    const baseAmount = Number(contractForm.baseAmount) || 0
    if (baseAmount <= 0) return
    const rubro = rubros.find(r => r.id === contractForm.rubroId) || rubros[0]

    const newContract = {
      id: `cont_${Date.now()}`,
      code: contractForm.code || `CONT-${Date.now().toString().slice(-4)}`,
      contractorName: contractForm.contractorName || 'Contratista',
      rubroId: rubro?.id || 'fundaciones',
      rubroName: rubro?.name || 'Rubro',
      scope: contractForm.scope || '',
      baseAmount,
      retentionRate: Number(contractForm.retentionRate) || 5,
      startDate: contractForm.startDate || new Date().toISOString().slice(0, 10),
      endDate: contractForm.endDate || '',
      additionals: []
    }

    setSubcontractContracts([newContract, ...subcontractContracts])
    setShowAddContractModal(false)
    setContractForm({
      code: '',
      contractorName: '',
      rubroId: rubros[0]?.id || 'fundaciones',
      scope: '',
      baseAmount: '',
      retentionRate: 5,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: ''
    })
  }

  function handleDeleteContract(id) {
    if (window.confirm('¿Deseas eliminar este contrato de subcontrato y desvincular sus certificaciones?')) {
      setSubcontractContracts(subcontractContracts.filter(c => c.id !== id))
    }
  }

  function handleOpenAddAdditional(contract) {
    setActiveContractForAdditional(contract)
    setAdditionalForm({
      code: `AD-0${(contract.additionals?.length || 0) + 1}`,
      description: '',
      amount: '',
      approvedDate: new Date().toISOString().slice(0, 10)
    })
    setShowAddAdditionalModal(true)
  }

  function handleSaveAdditional(e) {
    e.preventDefault()
    if (!activeContractForAdditional) return
    const amount = Number(additionalForm.amount) || 0
    if (amount <= 0) return

    const newAdditional = {
      id: `add_${Date.now()}`,
      code: additionalForm.code || `AD-${Date.now().toString().slice(-4)}`,
      description: additionalForm.description || 'Ampliación de contrato',
      amount,
      approvedDate: additionalForm.approvedDate || new Date().toISOString().slice(0, 10)
    }

    setSubcontractContracts(subcontractContracts.map(c => {
      if (c.id === activeContractForAdditional.id) {
        return {
          ...c,
          additionals: [...(c.additionals || []), newAdditional]
        }
      }
      return c
    }))

    setShowAddAdditionalModal(false)
    setActiveContractForAdditional(null)
  }

  function handleDeleteAdditional(contractId, additionalId) {
    if (window.confirm('¿Deseas dar de baja este adicional de obra?')) {
      setSubcontractContracts(subcontractContracts.map(c => {
        if (c.id === contractId) {
          return {
            ...c,
            additionals: (c.additionals || []).filter(a => a.id !== additionalId)
          }
        }
        return c
      }))
    }
  }

  function handleAddSubcontractCertificate(e) {
    e.preventDefault()
    const amount = Number(subcontractForm.amount) || 0
    if (amount <= 0) return

    const rubro = rubros.find(r => r.id === subcontractForm.rubroId) || rubros[0]
    const linkedContract = subcontractContracts.find(c => c.id === subcontractForm.contractId)

    if (linkedContract) {
      const validation = validateSubcontractCertificate(linkedContract, amount, subcontractCertificates)
      if (!validation.isValid) {
        const proceed = window.confirm(
          `⚠️ ADVERTENCIA DE CONTROL CONTRACTUAL:

${validation.message}

¿Deseas registrar este certificado a pesar de superar el saldo del contrato?`
        )
        if (!proceed) return
      }
    }

    const retentionRate = linkedContract ? (linkedContract.retentionRate ?? 5) : 5
    const retentionAmount = Math.round(amount * (retentionRate / 100))
    const netPayable = amount - retentionAmount

    const newCert = {
      id: `sub_${Date.now()}`,
      certificateNumber: subcontractForm.certificateNumber || `CERT-${Date.now().toString().slice(-4)}`,
      contractId: linkedContract ? linkedContract.id : null,
      subcontractorName: linkedContract ? linkedContract.contractorName : (subcontractForm.subcontractorName || 'Subcontratista'),
      rubroId: linkedContract ? linkedContract.rubroId : (rubro?.id || 'fundaciones'),
      rubroName: linkedContract ? linkedContract.rubroName : (rubro?.name || 'Rubro'),
      date: subcontractForm.date || new Date().toISOString().slice(0, 10),
      amount,
      retentionRate,
      retentionAmount,
      netPayable,
      currency: selectedCountryCode === 'INT' ? 'USD' : (getRegionalProfile(selectedCountryCode).currency || 'UYU'),
      notes: subcontractForm.notes || ''
    }

    setSubcontractCertificates([newCert, ...subcontractCertificates])
    setShowSubcontractModal(false)
    setSubcontractForm({
      contractId: '',
      certificateNumber: '',
      subcontractorName: '',
      rubroId: rubros[0]?.id || 'fundaciones',
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      notes: ''
    })
  }

  function handleDeleteSubcontract(id) {
    if (window.confirm('¿Deseas eliminar este certificado de subcontrato?')) {
      setSubcontractCertificates(subcontractCertificates.filter(sub => sub.id !== id))
    }
  }

  async function handleDownloadCertificatePdf(item) {
    setIsExportingCertPdf(true)
    const token = getAuthToken()
    try {
      await downloadOxiProMonthlyCertificatePdf({
        project: project || { name: 'Obra OxI Pro', location: 'Montevideo, Uruguay' },
        certificate: {
          month: item.month,
          date: monthlyCertForm.date || new Date().toISOString().slice(0, 10),
          inspector: monthlyCertForm.inspector || 'Director de Obra',
          clientApprover: monthlyCertForm.clientApprover || 'Comitente / Propietario',
          certifiedAmount: item.certCost || 0,
          notes: item.notes || monthlyCertForm.notes || `Certificación mensual del avance físico para el período ${item.month}. Homologado conforme a plan de obra y mediciones de avance.`
        },
        monthItem: item,
        evm: projectEVM,
        schedule
      }, token)
    } catch (err) {
      console.error('Error al descargar certificado mensual en PDF', err)
      alert('No se pudo generar el PDF del certificado: ' + (err.message || 'Error de conexión'))
    } finally {
      setIsExportingCertPdf(false)
    }
  }

  // ── Handlers Punto 6: Costos Indirectos / Gastos Generales ──
  function handleAddIndirectExpense(e) {
    e.preventDefault()
    if (!indirectForm.name) return
    const newExp = {
      id: `ind_${Date.now()}`,
      categoryId: indirectForm.categoryId,
      name: indirectForm.name,
      budgeted: Number(indirectForm.budgeted) || 0,
      executed: Number(indirectForm.executed) || 0,
      period: indirectForm.period || 'Mensual prorrateado',
      notes: indirectForm.notes || ''
    }
    setIndirectExpenses([...indirectExpenses, newExp])
    setShowAddIndirectModal(false)
    setIndirectForm({
      categoryId: 'obrador_banos',
      name: '',
      budgeted: 45000,
      executed: 0,
      period: 'Mensual prorrateado',
      notes: ''
    })
  }

  function handleDeleteIndirectExpense(id) {
    if (window.confirm('¿Deseas eliminar este gasto indirecto / general de obra?')) {
      setIndirectExpenses(indirectExpenses.filter(e => e.id !== id))
    }
  }

  // ── Handlers Punto 9: Cierre Semanal en 1 minuto ──
  function handleOpenWeeklyClose() {
    const curWeek = dynamicWeeklyProgress.find(w => w.isCurrent)?.week || dynamicWeeklyProgress[0]?.week || 'Semana 1'
    const progressMap = {}
    schedule.forEach(t => {
      progressMap[t.id] = Number(t.progressPercent) || 0
    })
    setWeeklyCloseForm({
      weekLabel: curWeek,
      date: new Date().toISOString().slice(0, 10),
      responsible: 'Jefe de Obra / Residente',
      notes: 'Cierre semanal de producción física sin desvíos críticos.',
      taskProgressMap: progressMap
    })
    setShowWeeklyCloseModal(true)
  }

  function handleSaveWeeklyClose(e) {
    e.preventDefault()
    const updatedSchedule = schedule.map(t => {
      if (weeklyCloseForm.taskProgressMap[t.id] != null) {
        return {
          ...t,
          progressPercent: Math.min(100, Math.max(0, Number(weeklyCloseForm.taskProgressMap[t.id])))
        }
      }
      return t
    })

    const closureRecord = {
      id: `closure_${Date.now()}`,
      weekLabel: weeklyCloseForm.weekLabel,
      date: weeklyCloseForm.date,
      responsible: weeklyCloseForm.responsible,
      notes: weeklyCloseForm.notes,
      timestamp: new Date().toISOString()
    }

    setSchedule(updatedSchedule)
    setLatestWeeklyClosure(closureRecord)
    try {
      localStorage.setItem(`${storageKey}_latest_weekly_closure`, JSON.stringify(closureRecord))
    } catch (err) {
      console.warn('Could not persist weekly closure', err)
    }
    setShowWeeklyCloseModal(false)
  }

  // ── Handlers Punto 10: Certificación Mensual con EVM ──
  function handleOpenMonthlyCert(selectedMonthItem = null) {
    const item = selectedMonthItem || (dynamicMonthlyComp.length > 0 ? dynamicMonthlyComp[0] : null)
    const month = item?.month || 'Nov. 2026'
    const certCost = item?.certCost || 2850000
    setMonthlyCertForm({
      month,
      date: new Date().toISOString().slice(0, 10),
      inspector: 'Director de Obra',
      clientApprover: 'Comitente / Propietario',
      notes: `Certificación técnica del período ${month}. Aprobado para facturación según avance físico de obra.`,
      certifiedAmount: certCost,
      monthItem: item
    })
    setShowMonthlyCertModal(true)
  }

  function handleSaveMonthlyCert(e) {
    e.preventDefault()
    const newDoc = {
      id: Date.now(),
      name: `Certificado Mensual de Obra - ${monthlyCertForm.month}`,
      code: `CERT-${monthlyCertForm.month.replace(/[^a-zA-Z0-9]/g, '')}`,
      type: 'certificaciones',
      version: 'v1.0 Final',
      date: monthlyCertForm.date,
      author: monthlyCertForm.inspector,
      status: 'aprobado',
      size: '1.4 MB',
      notes: monthlyCertForm.notes,
      certifiedAmount: Number(monthlyCertForm.certifiedAmount) || 0
    }
    setDocuments([newDoc, ...documents])
    setShowMonthlyCertModal(false)
    alert(`Certificado del mes "${monthlyCertForm.month}" generado exitosamente y archivado en Documentación Técnica.`)
  }

  const [isExportingPdf, setIsExportingPdf] = useState(false)

  async function handleDownloadExecutiveReportPdf() {
    setIsExportingPdf(true)
    try {
      await downloadOxiProReportPdf({
        project: project || { name: 'Obra OxI Pro', location: 'Montevideo, Uruguay' },
        schedule,
        rubros,
        rainLogs,
        metrics: {
          plannedGlobalProgress,
          globalProgress,
          globalDelta,
          spiIndex,
          totalProjectBudget,
          totalExecutedCost,
          totalBalanceCost,
          totalRainDays
        }
      })
    } catch (err) {
      console.warn('PDF service fallback:', err)
      window.print()
    } finally {
      setIsExportingPdf(false)
    }
  }

  const filteredDocs = docFilter === 'todos' ? documents : documents.filter(d => d.type === docFilter)

  return (
    <div className="oxi-pro-container">
      {/* ── TOP HEADER PRO EN 2 NIVELES (UX-1) ── */}
      <header className="oxi-pro-header">
        {/* NIVEL 1: BARRA DE CONTEXTO TÉCNICO Y ACCESOS */}
        <div className="oxi-pro-context-bar">
          <div className="oxi-pro-context-left">
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
            <div
              className="regional-profile-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '3px 10px',
                fontSize: '0.8rem'
              }}
            >
              <span style={{ fontWeight: 600, color: '#475569' }}>📍 Perfil:</span>
              <select
                value={selectedCountryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                title="Seleccionar perfil regional de obra: moneda oficial, sindicato laboral y tasa de leyes sociales"
              >
                {Object.values(REGIONAL_PROFILES).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.flag} {p.country} ({p.currency} · {p.laborUnion})
                  </option>
                ))}
              </select>
            </div>
            <span className={`cloud-sync-pill ${cloudSyncStatus}`}>
              {cloudSyncStatus === 'saving' && '⏳ Guardando en la nube...'}
              {cloudSyncStatus === 'synced' && '☁️ Guardado en la nube (PostgreSQL)'}
              {(cloudSyncStatus === 'idle' || cloudSyncStatus === 'error') && '📁 Guardado localmente'}
            </span>
          </div>

          <div className="oxi-pro-context-right">
            <button className="oxi-btn-back-classic" onClick={onBackToClassic} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              ← Volver a OxI Clásico
            </button>
          </div>
        </div>

        {/* NIVEL 2: BARRA DE MANDO Y ACCIONES PRINCIPALES */}
        <div className="oxi-pro-header-main">
          <div className="oxi-pro-header-title">
            <h2>Control de Ingeniería, Costos y Cronograma de Obra</h2>
            <p>Herramienta técnica y financiera para Constructoras y Estudios de Arquitectura.</p>
          </div>

          <div className="oxi-pro-actions-toolbar">
            <button
              type="button"
              className="oxi-btn-back-classic"
              onClick={handleResetDemoData}
              title="Restablecer todos los datos de la obra al estado inicial de demostración limpio (Torre Libertador)"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', borderColor: '#cbd5e1', color: '#475569', padding: '9px 14px', fontSize: '0.85rem' }}
            >
              🔄 Restablecer Demo
            </button>

            <button
              type="button"
              className="oxi-btn-back-classic"
              onClick={handleClearEntireProject}
              title="Vaciar por completo toda la obra: planos, cronograma, partidas presupuestarias, gastos y Curva S a cero (0%)"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2', padding: '9px 14px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              🗑️ Vaciar Obra
            </button>

            <button
              type="button"
              className="oxi-btn-ai"
              onClick={() => {
                setShowAiModal(true)
                setAiError('')
              }}
              title="Cargar pliego o memoria descriptiva y auto-generar cronograma y costos con Inteligencia Artificial"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '0.88rem' }}
            >
              ⚡ Auto-Crear Obra con IA
            </button>

            <button
              type="button"
              className="oxi-btn-primary"
              onClick={handleDownloadExecutiveReportPdf}
              disabled={isExportingPdf}
              title="Descargar informe ejecutivo oficial de obra de 4 páginas en PDF para comitentes e inversores"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700, boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)' }}
            >
              {isExportingPdf ? '⏳ Generando PDF...' : '📄 Exportar Informe de Obra (PDF)'}
            </button>
          </div>
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
          📊 Curva S & Control Físico-Financiero
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

          {documents.length === 0 ? (
            <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', margin: '20px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📐</div>
              <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>El gestor documental y planos están vacíos (0 archivos)</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '540px', margin: '0 auto 20px' }}>
                Has vaciado la obra. No hay planos, memorias descriptivas ni especificaciones técnicas cargadas actualmente. Puedes subir tus propios planos (DWG, PDF, IFC) o recargar los planos modelo de demostración.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={() => setShowAddDocModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ＋ Subir Primer Archivo / Plano
                </button>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={handleResetDemoData}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🔄 Recargar Planos Demo
                </button>
              </div>
            </div>
          ) : (
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
          )}
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="gantt-view-switch">
                <button
                  type="button"
                  className={`gantt-view-btn ${scheduleViewMode === 'combined' ? 'is-active' : ''}`}
                  onClick={() => setScheduleViewMode('combined')}
                  title="Vista Integrada: Diagrama de Gantt visual arriba y Planilla de tareas abajo"
                >
                  📊 Gantt + Planilla
                </button>
                <button
                  type="button"
                  className={`gantt-view-btn ${scheduleViewMode === 'gantt' ? 'is-active' : ''}`}
                  onClick={() => setScheduleViewMode('gantt')}
                  title="Vista Solo Diagrama de Gantt temporal interactivo"
                >
                  📈 Solo Gantt
                </button>
                <button
                  type="button"
                  className={`gantt-view-btn ${scheduleViewMode === 'tabla' ? 'is-active' : ''}`}
                  onClick={() => setScheduleViewMode('tabla')}
                  title="Vista Solo Planilla analítica detallada de costos y leyes sociales"
                >
                  📋 Solo Planilla
                </button>
              </div>

              <button
                type="button"
                className="oxi-btn-rain"
                onClick={() => {
                  const eventDate = '2026-10-18'
                  const candidateIds = schedule
                    .filter(t => (Number(t.progressPercent) || 0) < 100 && t.endDate >= eventDate)
                    .map(t => t.id)
                  setRainForm({
                    date: eventDate,
                    days: 2,
                    reason: 'Lluvias y precipitaciones copiosas',
                    recordDocument: true,
                    affectAll: true,
                    selectedTaskIds: candidateIds,
                    cascadeDependencies: true,
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
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => setShowCategoriesModal(true)}
                title="Configurar categorías laborales y laudos salariales SUNCA Grupo 9"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ⚙️ Categorías & Laudos
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => setShowBpsReportModal(true)}
                title="Generar planilla oficial de nómina de personal y aportes BPS Ley 14.411"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', borderColor: '#86efac', color: '#166534' }}
              >
                🏛️ Nómina & BPS (Ley 14.411)
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => { setBudgetModalTab('items'); setShowBudgetModal(true) }}
                title="Ver presupuesto de obra y catálogo de partidas de materiales"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📦 Partidas Presupuesto ({budgetItems.length})
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={handleResetDemoData}
                title="Restablecer el cronograma Gantt y rubros al estado inicial de demostración limpio (Torre Libertador)"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                🔄 Restablecer Demo
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={handleClearAllSchedule}
                title="Vaciar todas las tareas del cronograma para comenzar una obra propia en blanco desde cero"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2', fontWeight: 600 }}
              >
                🗑️ Vaciar Cronograma
              </button>
              <button className="oxi-btn-primary" onClick={() => { setEditingTaskId(null); setShowAddTaskModal(true) }}>
                ＋ Agregar Tarea al Cronograma
              </button>
            </div>
          </div>

          {/* Alerta de sobreasignación de presupuesto (Punto 4) */}
          {budgetAudit.hasOverallocations && (
            <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <div>
                  <strong style={{ color: '#c2410c', fontSize: '0.88rem' }}>Alerta de Presupuesto: Partidas asignadas a más del 100%</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#7c2d12' }}>
                    {budgetAudit.overallocatedItems.map(i => `[${i.code}] ${i.name} (${i.totalAssignedPercent}%)`).join(' • ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => { setBudgetModalTab('audit'); setShowBudgetModal(true) }}
                style={{ fontSize: '0.78rem', padding: '4px 10px', color: '#c2410c', borderColor: '#fdba74' }}
              >
                🔍 Ver Auditoría de Partidas
              </button>
            </div>
          )}

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

          {/* Estado vacío si no hay tareas en el cronograma */}
          {schedule.length === 0 && (
            <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', margin: '20px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📋</div>
              <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>El cronograma de obra está vacío</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '540px', margin: '0 auto 20px' }}>
                Has vaciado las tareas de la obra. Puedes recargar el cronograma modelo de demostración ("Torre Libertador"), importar tu propio presupuesto desde Excel o auto-crearlo con IA.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={handleResetDemoData}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🔄 Recargar Cronograma Demo
                </button>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={() => { setImportPasteText(''); setImportPreviewResult(null); setShowBudgetModal(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0369a1' }}
                >
                  📥 Importar desde Excel / CSV
                </button>
                <button
                  type="button"
                  className="oxi-btn-ai"
                  onClick={() => { setShowAiModal(true); setAiError('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ⚡ Auto-Crear con Copilot IA
                </button>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => { setEditingTaskId(null); setShowAddTaskModal(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ＋ Agregar Tarea Manual
                </button>
              </div>
            </div>
          )}

          {/* ── VISTA 1: DIAGRAMA DE GANTT INTERACTIVO ── */}
          {schedule.length > 0 && (scheduleViewMode === 'gantt' || scheduleViewMode === 'combined') && (
            <div className="gantt-card">
              {/* Top bar with legend and summary */}
              <div className="gantt-top-bar">
                <div className="gantt-legend">
                  <div className="gantt-legend-item">
                    <span className="gantt-legend-box" style={{ background: '#ea580c' }} />
                    <span>Avance Real Físico Certificado</span>
                  </div>
                  <div className="gantt-legend-item">
                    <span className="gantt-legend-box" style={{ background: 'rgba(2, 132, 199, 0.25)', border: '1px solid #0284c7' }} />
                    <span>Avance Programado (Plan)</span>
                  </div>
                  <div className="gantt-legend-item">
                    <span className="gantt-legend-box" style={{ background: '#e2e8f0', border: '1px solid #cbd5e1' }} />
                    <span>Plazo Contractual</span>
                  </div>
                  <div className="gantt-legend-item">
                    <span style={{ width: '14px', height: '2px', background: '#ef4444', display: 'inline-block' }} />
                    <span>Línea de Hoy (18/10)</span>
                  </div>
                  <div className="gantt-legend-item">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                      <span style={{ width: '14px', height: '0', borderTop: '2px dashed #059669', display: 'inline-block' }} />
                      <span>🔗➔ Predecesoras</span>
                    </span>
                  </div>
                  {totalRainDays > 0 && (
                    <div className="gantt-legend-item">
                      <span style={{
                        width: '14px',
                        height: '10px',
                        background: 'repeating-linear-gradient(45deg, rgba(186, 230, 253, 0.7), rgba(186, 230, 253, 0.7) 3px, rgba(125, 211, 252, 0.9) 3px, rgba(125, 211, 252, 0.9) 6px)',
                        border: '1px solid #0284c7',
                        borderRadius: '2px',
                        display: 'inline-block'
                      }} />
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>🌧️ Lluvia (+{totalRainDays}d)</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#737373' }}>
                  <span><strong>{schedule.length}</strong> tareas programadas</span>
                  <span>•</span>
                  <span>Escala temporal: <strong>{ganttBounds.totalDays}</strong> días totales</span>
                </div>
              </div>

              {/* Gantt Body with fixed left task info and scrollable timeline */}
              <div className="gantt-body-wrap">
                {/* Left Column: Tasks metadata */}
                <div className="gantt-tasks-col">
                  <div className="gantt-tasks-col-header">
                    <span>TAREA DE OBRA</span>
                    <span>ESTADO / REAL</span>
                  </div>
                  {schedule.map(task => {
                    const planned = getTaskPlannedPercent(task)
                    const real = Math.min(100, Math.max(0, Number(task.progressPercent) || 0))
                    const delta = real - planned
                    const isDone = real === 100
                    const predTask = task.dependsOnTaskId ? schedule.find(t => String(t.id) === String(task.dependsOnTaskId)) : null
                    const isHovered = hoveredGanttTaskId && String(hoveredGanttTaskId) === String(task.id)
                    const isPred = hoveredGanttTaskId && task.id && schedule.some(t => String(t.id) === String(hoveredGanttTaskId) && String(t.dependsOnTaskId) === String(task.id))
                    const isSucc = hoveredGanttTaskId && task.dependsOnTaskId && String(task.dependsOnTaskId) === String(hoveredGanttTaskId)

                    return (
                      <div
                        key={task.id}
                        className="gantt-task-meta-cell"
                        onMouseEnter={() => setHoveredGanttTaskId(task.id)}
                        onMouseLeave={() => setHoveredGanttTaskId(null)}
                        style={{
                          background: isHovered ? '#fff7ed' : isPred ? '#f0fdf4' : isSucc ? '#f0f9ff' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="gantt-task-title" title={task.name}>{task.name}</span>
                          <span className={`delta-badge ${delta > 0 ? 'ahead' : delta < 0 ? 'delayed' : 'ontrack'}`} style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                            {delta > 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#737373', fontSize: '0.74rem', marginTop: '2px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span>📅 {task.startDate} al {task.endDate} ({task.workDays || 1}d)</span>
                            {Number(task.rainDelayedDays) > 0 && (
                              <span
                                style={{
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  border: '1px solid #7dd3fc',
                                  borderRadius: '4px',
                                  padding: '0 4px',
                                  fontSize: '0.64rem',
                                  fontWeight: 800
                                }}
                                title={`Postergada +${task.rainDelayedDays}d hábiles por suspensión climática`}
                              >
                                🌧️ +{task.rainDelayedDays}d
                              </span>
                            )}
                          </span>
                          <div>
                            <strong style={{ color: isDone ? '#10b981' : '#ea580c' }}>{real}%</strong>
                            <span style={{ color: '#0284c7', marginLeft: '3px' }}>({planned}%)</span>
                          </div>
                        </div>
                        {predTask && (
                          <div style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <span>🔗</span>
                            <span title={`Depende de ${predTask.name} (${task.dependencyType || 'FS'} ${task.lagDays > 0 ? `+${task.lagDays}d` : ''})`}>
                              Tras: {predTask.name} {Number(task.lagDays) > 0 ? `(+${task.lagDays}d)` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Right Column: Timeline Canvas */}
                <div className="gantt-timeline-canvas">
                  {/* Timeline Header */}
                  <div className="gantt-timeline-header-wrap">
                    {/* Months Row */}
                    <div className="gantt-months-row">
                      {ganttMonths.map(m => (
                        <div
                          key={m.key}
                          className="gantt-month-cell"
                          style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }}
                        >
                          {m.label}
                        </div>
                      ))}
                    </div>

                    {/* Weeks Row */}
                    <div className="gantt-weeks-row">
                      {ganttWeeks.map((w, idx) => (
                        <div
                          key={idx}
                          className="gantt-week-tick"
                          style={{ left: `${w.pct}%` }}
                        >
                          {w.label}
                        </div>
                      ))}
                    </div>

                    {/* Today Badge on Header */}
                    {todayGanttPositionPct != null && (
                      <div
                        className="gantt-today-badge"
                        style={{ left: `${todayGanttPositionPct}%` }}
                      >
                        Hoy
                      </div>
                    )}

                    {/* Rain Delay Zone Markers on Header */}
                    {ganttRainZones.map(rz => (
                      <div
                        key={`rain-hdr-${rz.id}`}
                        style={{
                          position: 'absolute',
                          left: `${rz.leftPct}%`,
                          top: '2px',
                          background: '#0284c7',
                          color: '#ffffff',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          zIndex: 6,
                          pointerEvents: 'auto',
                          cursor: 'pointer'
                        }}
                        title={`🌧️ Suspensión por ${rz.reason || 'Lluvia'} (+${rz.days}d) iniciada el ${rz.date}`}
                      >
                        🌧️ +{rz.days}d
                      </div>
                    ))}
                  </div>

                  {/* Tasks Timeline Rows */}
                  <div style={{ position: 'relative' }}>
                    {/* Background Vertical Grid Lines for Weeks */}
                    {ganttWeeks.map((w, idx) => (
                      <div
                        key={idx}
                        className="gantt-grid-line"
                        style={{ left: `${w.pct}%` }}
                      />
                    ))}

                    {/* Red Vertical Line for Today */}
                    {todayGanttPositionPct != null && (
                      <div
                        className="gantt-today-line"
                        style={{ left: `${todayGanttPositionPct}%` }}
                      />
                    )}

                    {/* Rain Delay Shaded Vertical Columns across all rows */}
                    {ganttRainZones.map(rz => (
                      <div
                        key={`rain-col-${rz.id}`}
                        style={{
                          position: 'absolute',
                          left: `${rz.leftPct}%`,
                          width: `${rz.widthPct}%`,
                          top: 0,
                          bottom: 0,
                          background: 'repeating-linear-gradient(45deg, rgba(186, 230, 253, 0.35), rgba(186, 230, 253, 0.35) 6px, rgba(125, 211, 252, 0.5) 6px, rgba(125, 211, 252, 0.5) 12px)',
                          borderLeft: '1.5px dashed #0284c7',
                          borderRight: '1.5px dashed #0284c7',
                          pointerEvents: 'none',
                          zIndex: 2
                        }}
                        title={`🌧️ Suspensión por Lluvia (+${rz.days}d) - ${rz.date}: ${rz.reason || ''}`}
                      />
                    ))}

                    {/* SVG Dependency Connectors between tasks */}
                    {ganttConnectors.length > 0 && (
                      <svg
                        className="gantt-connectors-svg"
                        viewBox={`0 0 1000 ${schedule.length * 68}`}
                        preserveAspectRatio="none"
                        style={{ height: `${schedule.length * 68}px` }}
                      >
                        <defs>
                          <marker id="gantt-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 1 L 9 5 L 0 9 z" fill="#059669" />
                          </marker>
                          <marker id="gantt-arrow-active" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                            <path d="M 0 1 L 9 5 L 0 9 z" fill="#ea580c" />
                          </marker>
                        </defs>
                        {ganttConnectors.map((conn, idx) => {
                          const sx = conn.startX * 10
                          const sy = conn.startY
                          const ex = conn.endX * 10
                          const ey = conn.endY
                          const isActive = hoveredGanttTaskId && (String(hoveredGanttTaskId) === conn.fromId || String(hoveredGanttTaskId) === conn.toId)

                          let pathD = ''
                          if (ex >= sx) {
                            const midX = (sx + ex) / 2
                            pathD = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ey} L ${ex - 4} ${ey}`
                          } else {
                            const midY = (sy + ey) / 2
                            pathD = `M ${sx} ${sy} L ${sx + 8} ${sy} L ${sx + 8} ${midY} L ${ex - 8} ${midY} L ${ex - 8} ${ey} L ${ex - 4} ${ey}`
                          }

                          return (
                            <path
                              key={idx}
                              d={pathD}
                              stroke={isActive ? '#ea580c' : '#059669'}
                              strokeWidth={isActive ? 2.5 : 1.5}
                              strokeDasharray={conn.lagDays > 0 ? '4,3' : 'none'}
                              fill="none"
                              opacity={hoveredGanttTaskId ? (isActive ? 1 : 0.25) : 0.75}
                              markerEnd={isActive ? 'url(#gantt-arrow-active)' : 'url(#gantt-arrow)'}
                            />
                          )
                        })}
                      </svg>
                    )}

                    {/* Task Rows with Gantt Bars */}
                    {schedule.map(task => {
                      const pos = taskGanttPositions.get(String(task.id))
                      const leftPct = pos ? pos.leftPct : 0
                      const widthPct = pos ? pos.widthPct : 10

                      const planned = getTaskPlannedPercent(task)
                      const real = Math.min(100, Math.max(0, Number(task.progressPercent) || 0))
                      const isDone = real === 100
                      const totalTask = getTaskBudget(task)
                      const taskExecuted = getTaskExecutedCost(task, projectSocialLawsRate / 100, laborCategories, { laborReports, materialInvoices })

                      const predTask = task.dependsOnTaskId ? schedule.find(t => String(t.id) === String(task.dependsOnTaskId)) : null
                      const successorTasks = schedule.filter(t => String(t.dependsOnTaskId) === String(task.id))

                      const isHovered = hoveredGanttTaskId && String(hoveredGanttTaskId) === String(task.id)
                      const isPred = hoveredGanttTaskId && task.id && schedule.some(t => String(t.id) === String(hoveredGanttTaskId) && String(t.dependsOnTaskId) === String(task.id))
                      const isSucc = hoveredGanttTaskId && task.dependsOnTaskId && String(task.dependsOnTaskId) === String(hoveredGanttTaskId)

                      const tooltipText = `${task.name}\n• Plazo: ${task.startDate} al ${task.endDate} (${task.workDays || 1} días hábiles)${Number(task.rainDelayedDays) > 0 ? ` [🌧️ Postergada +${task.rainDelayedDays}d por suspensión climática]` : ''}\n• Avance Real Físico: ${real}%\n• Avance Programado: ${planned}%\n• Presupuesto: ${formatMoney(totalTask)}\n• Costo Real Devengado: ${formatMoney(taskExecuted)}${predTask ? `\n• Predecesora: 🔗 ${predTask.name} (${task.dependencyType || 'FS'} ${Number(task.lagDays) > 0 ? `+${task.lagDays}d hábiles de espera` : 'inmediata'})` : ''}${successorTasks.length > 0 ? `\n• Sucesoras vinculadas: ➔ ${successorTasks.map(s => s.name).join(', ')}` : ''}`

                      return (
                        <div key={task.id} className="gantt-row">
                          <div
                            className={`gantt-bar-box ${isHovered ? 'is-hovered' : ''} ${isPred ? 'is-predecessor' : ''} ${isSucc ? 'is-successor' : ''}`}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            onMouseEnter={() => setHoveredGanttTaskId(task.id)}
                            onMouseLeave={() => setHoveredGanttTaskId(null)}
                            title={tooltipText}
                          >
                            {/* Plan Progress Fill */}
                            <div
                              className="gantt-bar-plan-fill"
                              style={{ width: `${planned}%` }}
                            />

                            {/* Real Progress Fill */}
                            <div
                              className={`gantt-bar-real-fill ${isDone ? 'done' : ''}`}
                              style={{ width: `${real}%` }}
                            />

                            {/* Content with Badges */}
                            <div className="gantt-bar-content">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                                <span style={{ color: real > 40 ? '#fff' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {task.name}
                                </span>
                                <span style={{ fontSize: '0.66rem', color: real > 40 ? 'rgba(255,255,255,0.9)' : '#64748b', whiteSpace: 'nowrap' }}>
                                  ({task.startDate ? task.startDate.slice(5) : ''} al {task.endDate ? task.endDate.slice(5) : ''})
                                </span>
                                {Number(task.rainDelayedDays) > 0 && (
                                  <span
                                    className="gantt-dep-badge rain"
                                    style={{
                                      background: real > 40 ? '#0284c7' : '#e0f2fe',
                                      color: real > 40 ? '#ffffff' : '#0369a1',
                                      border: '1px solid #7dd3fc',
                                      fontWeight: 800,
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={`Postergada +${task.rainDelayedDays}d hábiles por lluvia`}
                                  >
                                    🌧️ +{task.rainDelayedDays}d
                                  </span>
                                )}
                                {predTask && (
                                  <span
                                    className="gantt-dep-badge pred"
                                    title={`Predecesora: ${predTask.name} (${task.dependencyType || 'FS'} ${Number(task.lagDays) > 0 ? `+${task.lagDays}d hábiles` : 'inmediata'})`}
                                  >
                                    ↳ {predTask.name.length > 12 ? `${predTask.name.slice(0, 10)}…` : predTask.name} {Number(task.lagDays) > 0 ? `+${task.lagDays}d` : ''}
                                  </span>
                                )}
                                {successorTasks.length > 0 && (
                                  <span
                                    className="gantt-dep-badge succ"
                                    title={`Empuja a: ${successorTasks.map(s => s.name).join(', ')}`}
                                  >
                                    ➔ {successorTasks.length > 1 ? `${successorTasks.length} suc.` : (successorTasks[0].name.length > 10 ? `${successorTasks[0].name.slice(0, 8)}…` : successorTasks[0].name)}
                                  </span>
                                )}
                              </div>
                              <span style={{ color: real > 60 ? '#fff' : '#334155', fontWeight: 800, marginLeft: '6px' }}>
                                {real}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA 2: PLANILLA ANALÍTICA & COSTOS ── */}
          {schedule.length > 0 && (scheduleViewMode === 'tabla' || scheduleViewMode === 'combined') && (
            <div style={{ marginTop: scheduleViewMode === 'combined' ? '28px' : '0' }}>
              {scheduleViewMode === 'combined' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📋</span>
                      <span>Planilla Detallada de Tareas ({schedule.length})</span>
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Seguimiento caso a caso: plazos de inicio y fin, vínculos de dependencia, cuadrilla asignada y control de costos.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="oxi-btn-primary"
                    onClick={() => { setEditingTaskId(null); setShowAddTaskModal(true) }}
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    ＋ Agregar Tarea
                  </button>
                </div>
              )}

              {/* ── DASHBOARD: COSTO PRESUPUESTADO A LA FECHA vs COSTO EJECUTADO ── */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>📊 Control de Costos al día de corte</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Lo que deberíamos haber gastado según el cronograma vs. lo realmente ejecutado, sumando todas las tareas.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                      Fecha de corte:
                      <input
                        type="date"
                        value={costCutoffDate}
                        onChange={e => setCostCutoffDate(e.target.value || costCutoffDate)}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                      />
                    </label>
                    <button
                      type="button"
                      className="oxi-btn oxi-btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                      onClick={handleExportCostControlCsv}
                      title="Descargar informe de costos a la fecha en formato CSV / Excel"
                    >
                      📥 Exportar CSV
                    </button>
                    <button
                      type="button"
                      className="oxi-btn oxi-btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: '#f8fafc', borderColor: '#cbd5e1' }}
                      onClick={() => setShowCostControlReportModal(true)}
                      title="Ver e imprimir informe ejecutivo formal para directorio y comitente"
                    >
                      📑 Informe Ejecutivo (PDF)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 700 }}>Presupuestado a la fecha</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0369a1' }}>{formatMoney(costControl.totalPlannedToDate)}</div>
                    <small style={{ color: '#64748b' }}>{costControl.plannedPctOfTotal}% del presupuesto total</small>
                  </div>
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#c2410c', textTransform: 'uppercase', fontWeight: 700 }}>Costo ejecutado real</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ea580c' }}>{formatMoney(costControl.totalExecuted)}</div>
                    <small style={{ color: '#64748b' }}>{costControl.executedPctOfTotal}% del presupuesto total</small>
                  </div>
                  <div style={{
                    background: costControl.totalVariance < 0 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${costControl.totalVariance < 0 ? '#fecaca' : '#bbf7d0'}`,
                    borderRadius: '8px',
                    padding: '10px 12px'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: costControl.totalVariance < 0 ? '#b91c1c' : '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>Desvío (real − plan)</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: costControl.totalVariance < 0 ? '#dc2626' : '#059669' }}>
                      {costControl.totalVariance > 0 ? '+' : ''}{formatMoney(costControl.totalVariance)}
                    </div>
                    <small style={{ color: '#64748b' }}>
                      {costControl.variancePct > 0 ? '+' : ''}{costControl.variancePct}% • {costControl.totalVariance === 0 ? 'en línea con el plan' : costControl.totalVariance < 0 ? 'ejecución por debajo del plan' : 'ejecución por encima del plan'}
                    </small>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Presupuesto total obra</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#262626' }}>{formatMoney(totalProjectBudget)}</div>
                    <small style={{ color: '#64748b' }}>Saldo por ejecutar: {formatMoney(totalBalanceCost)}</small>
                  </div>
                </div>

                {/* Barras comparativas */}
                <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
                  {[
                    { label: 'Plan a la fecha', value: costControl.plannedPctOfTotal, color: '#0284c7' },
                    { label: 'Ejecutado real', value: costControl.executedPctOfTotal, color: '#ea580c' }
                  ].map(bar => (
                    <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.76rem', color: '#475569' }}>
                      <span style={{ width: '100px', fontWeight: 600 }}>{bar.label}</span>
                      <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, bar.value)}%`, height: '100%', background: bar.color }} />
                      </div>
                      <span style={{ width: '40px', textAlign: 'right', fontWeight: 700 }}>{bar.value}%</span>
                    </div>
                  ))}
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
                    <th style={{ minWidth: '120px' }}>Presup. a la Fecha</th>
                    <th style={{ minWidth: '130px' }}>% Programado</th>
                    <th style={{ minWidth: '130px' }}>% Real Certificado</th>
                    <th>Desvío / Plazo</th>
                    <th style={{ minWidth: '140px' }}>Costo Real ($)</th>
                    <th style={{ minWidth: '140px' }}>Desvío Costo ($)</th>
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
                    const social = getTaskSocialLaws(task, projectSocialLawsRate / 100, laborCategories)
                    const material = task.materialCost || 0
                    const totalTask = labor + social + material
                    const rowCC = costControl.byTask.get(String(task.id)) || { plannedToDate: 0, executed: 0, variance: 0, plannedPct: 0 }
                    const costDetails = rowCC.costDetails || calculateTaskActualCost(task, { laborReports, materialInvoices, socialLawsRate: projectSocialLawsRate, laborCategories })
                    const taskExecuted = rowCC.executed
                    const taskBalance = Math.max(0, totalTask - taskExecuted)
                    const predTask = task.dependsOnTaskId ? schedule.find(t => String(t.id) === String(task.dependsOnTaskId)) : null

                    return (
                      <tr key={task.id}>
                        <td>
                          <strong>{task.name}</strong>
                          <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="month-pill">
                              {task.month && !task.month.startsWith('Mes ')
                                ? task.month
                                : (distributeCostByMonths(task.startDate, task.endDate).primaryMonthLabel || task.month)}
                            </span>
                            {predTask && (
                              <span style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#065f46',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <span>🔗</span>
                                <span>
                                  Tras: {predTask.name} {Number(task.lagDays) > 0 ? `(+${task.lagDays}d hábiles)` : '(inmediato)'}
                                </span>
                              </span>
                            )}
                            {(() => {
                              const dist = distributeCostByMonths(task.startDate, task.endDate, totalTask)
                              if (!dist.breakdown || dist.breakdown.length <= 1) return null
                              return (
                                <span
                                  title={dist.breakdown.map(b => `${b.monthLabel}: ${formatMoney(b.cost)} (${b.workDays}d / ${b.percent}%)`).join(' • ')}
                                  style={{
                                    fontSize: '0.72rem',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#1d4ed8',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    cursor: 'help',
                                    fontWeight: 600
                                  }}
                                >
                                  📊 {dist.breakdown.map(b => `${b.monthLabel.split(' ')[0]} ${b.percent}%`).join(' / ')}
                                </span>
                              )
                            })()}
                          </div>
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>
                            {task.startDate} al {task.endDate}
                          </strong>
                          <small style={{ color: '#059669', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                            ⏱️ {task.workDays || 1} días hábiles {task.dependsOnTaskId ? '• 🔗 Enganchada' : '• 📅 Fija'}
                          </small>
                        </td>
                      <td>
                        {Array.isArray(task.crewLines) && task.crewLines.length > 0 ? (
                          <span
                            className="people-badge"
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'help' }}
                            title={task.crewLines.map(l => `${l.count}x ${l.role} ($${Number(l.dailyRate).toLocaleString('es-UY')}/d)`).join(' • ')}
                          >
                            👥 {calculateCrewTotalPeople(task.crewLines)} personas
                          </span>
                        ) : (
                          <span className="people-badge">👷 {task.peopleCount} personas</span>
                        )}
                      </td>
                      <td>
                        {Array.isArray(task.crewLines) && task.crewLines.length > 0 ? (
                          <div>
                            <strong style={{ color: '#1e40af', fontSize: '0.84rem' }}>👥 Cuadrilla Mixta</strong>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                              {formatMoney(calculateCrewDailyCost(task.crewLines))} / día
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                              {task.crewLines.map((l, i) => (
                                <span key={i} style={{ fontSize: '0.68rem', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 4px', borderRadius: '3px', color: '#334155' }}>
                                  {l.count}x {l.role}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div><strong>{task.category}</strong></div>
                            <small>{formatMoney(task.categoryRate)} / día</small>
                          </div>
                        )}
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
                                const cat = laborCategories.find(c => c.role === t.category || c.id === t.category)
                                const effRate = (cat && cat.socialLawsRate != null && !Number.isNaN(Number(cat.socialLawsRate)))
                                  ? (Number(cat.socialLawsRate) > 1 ? Number(cat.socialLawsRate) / 100 : Number(cat.socialLawsRate))
                                  : (projectSocialLawsRate / 100)
                                const newSocial = t.customSocialLaws ? t.socialLawsCost : Math.round(val * effRate)
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
                            title="Editar Leyes Sociales (BPS / Aportes). Puedes sobrescribir con un monto manual."
                            style={{
                              width: '105px',
                              padding: '5px 8px',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              border: task.customSocialLaws ? '1px solid #f97316' : '1px solid #d4d4d4',
                              borderRadius: '4px',
                              background: task.customSocialLaws ? '#fff7ed' : '#fff'
                            }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <small style={{ color: '#737373' }}>{formatMoney(social)}</small>
                            {task.customSocialLaws ? (
                              <span
                                title="Sobrescrito manualmente. Clic para volver al cálculo automático"
                                onClick={() => {
                                  setSchedule(schedule.map(t => {
                                    if (t.id !== task.id) return t
                                    const cat = laborCategories.find(c => c.role === t.category || c.id === t.category)
                                    const effRate = (cat && cat.socialLawsRate != null && !Number.isNaN(Number(cat.socialLawsRate)))
                                      ? (Number(cat.socialLawsRate) > 1 ? Number(cat.socialLawsRate) / 100 : Number(cat.socialLawsRate))
                                      : (projectSocialLawsRate / 100)
                                    return { ...t, socialLawsCost: Math.round((t.assignedLaborCost || 0) * effRate), customSocialLaws: false }
                                  }))
                                }}
                                style={{ fontSize: '0.68rem', color: '#ea580c', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                ✍️ Manual (reset)
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', color: '#16a34a' }}>
                                ✓ Auto
                              </span>
                            )}
                          </div>
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
                              border: task.partidaCode ? '1px solid #bfdbfe' : '1px solid #d4d4d4',
                              borderRadius: '4px',
                              background: task.partidaCode ? '#eff6ff' : '#fff'
                            }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <small style={{ color: '#737373' }}>{formatMoney(material)}</small>
                            {task.partidaCode ? (
                              <span
                                title={`Toma de partida: [${task.partidaCode}] ${task.partidaName || ''} (${task.assignedPartidaPercent ? `${task.assignedPartidaPercent}%` : ''})`}
                                style={{
                                  fontSize: '0.68rem',
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  cursor: 'help',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🏷️ {task.partidaCode}
                              </span>
                            ) : (
                              <span title="Cargado a mano (estimación manual sin presupuesto)" style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                ✍️ Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#262626', fontSize: '0.92rem' }}>
                          {formatMoney(totalTask)}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: '#0369a1', fontSize: '0.9rem' }}>
                          {formatMoney(rowCC.plannedToDate)}
                        </strong>
                        <small style={{ color: '#737373', fontSize: '0.72rem', display: 'block' }}>
                          {rowCC.plannedPct}% del calendario
                        </small>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                          <button
                            type="button"
                            className={`btn-certify ${task.certifications?.length > 0 ? 'has-certs' : ''}`}
                            onClick={() => handleOpenCertModal(task)}
                            title="Registrar o ver inspección física con fotos de avance"
                          >
                            📸 {task.certifications?.length > 0 ? `${task.certifications.length} Insp.` : 'Certificar'}
                          </button>
                          {task.certifications?.length > 0 && (
                            <small style={{ color: '#047857', fontSize: '0.70rem', display: 'block', whiteSpace: 'nowrap' }}>
                              ✓ {task.certifications[0].date}
                            </small>
                          )}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <strong style={{ color: '#ea580c', fontSize: '0.92rem' }}>
                            {formatMoney(taskExecuted)}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {costDetails.mode === 'imputed' ? (
                              <span
                                style={{
                                  background: '#fef3c7',
                                  border: '1px solid #fde68a',
                                  color: '#92400e',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  cursor: 'help'
                                }}
                                title={`Costo real de comprobantes: MO $${Math.round(costDetails.imputedLabor).toLocaleString('es-UY')} (partes diarios) + Materiales $${Math.round(costDetails.imputedMaterials).toLocaleString('es-UY')} (facturas)`}
                              >
                                🧾 Imputado
                              </span>
                            ) : costDetails.mode === 'manual' ? (
                              <span
                                style={{
                                  background: '#ffedd5',
                                  border: '1px solid #fdba74',
                                  color: '#c2410c',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '3px'
                                }}
                                title="Costo fijado manualmente en la ficha de la tarea"
                              >
                                ✍️ Manual
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  color: '#64748b',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '3px'
                                }}
                                title={`Cálculo proporcional teórico: ${real}% × ${formatMoney(totalTask)}`}
                              >
                                ⚙️ Auto (%)
                              </span>
                            )}
                            <small style={{ color: '#737373', fontSize: '0.74rem' }}>
                              Saldo: {formatMoney(taskBalance)}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                          <span
                            className={`delta-badge ${rowCC.variance > 0 ? 'ahead' : rowCC.variance < 0 ? 'delayed' : 'ontrack'}`}
                            style={{ whiteSpace: 'nowrap' }}
                            title={`Real ${formatMoney(rowCC.executed)} vs presupuestado a la fecha ${formatMoney(rowCC.plannedToDate)}`}
                          >
                            {rowCC.variance > 0 ? '+' : ''}{formatMoney(rowCC.variance)}
                          </span>
                          <small style={{ color: '#737373', fontSize: '0.72rem' }}>
                            {rowCC.variance === 0 ? 'En línea con el plan' : rowCC.variance < 0 ? 'Por debajo del plan' : 'Por encima del plan'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-certify"
                            onClick={() => handleOpenEditTask(task)}
                            title="Editar tarea (plazos, dependencias, cuadrilla, metrado)"
                            style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="btn-certify"
                            onClick={() => handleOpenCertModal(task)}
                            title="Abrir acta de certificación e inspección con fotos"
                          >
                            📸
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteTask(task.id)}
                            title="Eliminar tarea"
                          >
                            ✕
                          </button>
                        </div>
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
                    <div>{formatMoney(costControl.totalPlannedToDate)}</div>
                    <small style={{ color: '#737373', fontWeight: 'normal', fontSize: '0.75rem', display: 'block' }}>a la fecha de corte</small>
                  </td>
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
                  <td style={{ padding: '12px', color: costControl.totalVariance < 0 ? '#dc2626' : '#059669' }}>
                    <div>{costControl.totalVariance > 0 ? '+' : ''}{formatMoney(costControl.totalVariance)}</div>
                    <small style={{ color: '#737373', fontWeight: 'normal', fontSize: '0.75rem', display: 'block' }}>
                      {costControl.variancePct > 0 ? '+' : ''}{costControl.variancePct}%
                    </small>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
        </section>
      )}

      {/* ── TAB 3: CONTROL SEMANAL & CURVA S DINÁMICA RECONSTRUIDA ── */}
      {activeTab === 'control' && (
        <section className="oxi-pro-section">
          {/* Toolbar */}
          <div className="section-toolbar">
            <div>
              <h3>Control Físico-Financiero & Curva S (Avance Real vs. Plan P0)</h3>
              <p>Seguimiento continuo de la Curva S conectada en tiempo real al Cronograma Gantt y partidas presupuestarias.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="live-sync-badge" title="Cálculo reactivo en tiempo real desde el Cronograma de obra">
                <span className="live-dot" /> Conectado en vivo al Gantt ({schedule.length} tareas)
              </span>
              <button
                type="button"
                className="oxi-btn-primary"
                onClick={handleOpenWeeklyClose}
                title="Abrir asistente de cierre de producción semanal para certificar avances"
                style={{ background: '#10b981', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <span>📋</span> Registrar Cierre Semanal (1 min)
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => exportCurvaSCsv(dynamicWeeklyProgress, dynamicMonthlyComp, project?.name || 'Obra')}
                title="Descargar datos de Curva S en CSV para Excel"
              >
                📥 Exportar Curva S (CSV)
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="curva-s-kpis-grid">
            <div className="curva-s-kpi-card">
              <span className="curva-s-kpi-label">Avance Programado (Plan P0 a Hoy)</span>
              <span className="curva-s-kpi-val plan">{schedule.length > 0 ? plannedGlobalProgress : 0}%</span>
              <span className="curva-s-kpi-sub">
                {formatMoney(Math.round(((schedule.length > 0 ? plannedGlobalProgress || 0 : 0) / 100) * totalProjectBudget))} previstos a la fecha
              </span>
            </div>

            <div className="curva-s-kpi-card">
              <span className="curva-s-kpi-label">Avance Real Certificado</span>
              <span className={`curva-s-kpi-val ${globalDelta >= 0 ? 'real' : 'delayed'}`}>
                {schedule.length > 0 ? globalProgress : 0}%
              </span>
              <span className="curva-s-kpi-sub">
                {formatMoney(Math.round(((schedule.length > 0 ? globalProgress || 0 : 0) / 100) * totalProjectBudget))} ejecutados efectivamente
              </span>
            </div>

            <div className="curva-s-kpi-card">
              <span className="curva-s-kpi-label">Desvío Físico-Financiero</span>
              <span className={`curva-s-kpi-val ${globalDelta >= 0 ? 'real' : 'delayed'}`}>
                {schedule.length > 0 ? (globalDelta > 0 ? `+${globalDelta}%` : `${globalDelta}%`) : '0%'}
              </span>
              <span className="curva-s-kpi-sub">
                {schedule.length === 0 ? 'Obra en blanco (0 tareas)' : globalDelta >= 0 ? '✓ Obra en plazo o adelantada' : '⚠️ Obra con atraso respecto al plan'}
              </span>
            </div>

            <div className="curva-s-kpi-card">
              <span className="curva-s-kpi-label">Presupuesto Total de Obra</span>
              <span className="curva-s-kpi-val neutral">{formatMoney(totalProjectBudget)}</span>
              <span className="curva-s-kpi-sub">{dynamicWeeklyProgress.length} semanas de cronograma</span>
            </div>
          </div>

          {dynamicWeeklyProgress.length === 0 ? (
            <div className="curva-s-chart-box" style={{ textAlign: 'center', padding: '48px 24px', margin: '20px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '1.2rem' }}>
                Cronograma y Curva S en Blanco (0%)
              </h3>
              <p style={{ margin: '0 auto 20px', maxWidth: '520px', color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                La obra no tiene tareas cargadas actualmente (Cronograma en 0%). Para visualizar la Curva S física-financiera y el cronograma valorizado semanal, agregá tus tareas, importá un presupuesto desde Excel o auto-creá el plan con Inteligencia Artificial.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={() => { setActiveTab('cronograma'); setShowAddTaskModal(true) }}
                >
                  ＋ Agregar Primera Tarea
                </button>
                <button
                  type="button"
                  className="oxi-btn-ai"
                  onClick={() => { setShowAiModal(true); setAiError('') }}
                >
                  ⚡ Auto-Crear con IA
                </button>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={handleResetDemoData}
                >
                  🔄 Cargar Modelo Demo
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Recharts Curva S Box */}
              <div className="curva-s-chart-box">
            <div className="curva-s-chart-header">
              <div>
                <span className="box-eyebrow">DIAGRAMA DE AVANCE ACUMULADO (S-CURVE)</span>
                <h3 style={{ margin: '4px 0', fontSize: '1.25rem', color: '#0f172a' }}>
                  Curva S Físico-Financiera (Plan P0 vs Real Certificado)
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Evolución acumulada semanal de las {dynamicWeeklyProgress.length} semanas reales del proyecto, vinculada a los avances y ponderación de costos del Gantt.
                </p>
              </div>

              <div className="curva-s-legend">
                <div className="curva-s-legend-item">
                  <span className="curva-s-legend-line" style={{ background: '#2563eb', borderTop: '2px dashed #1d4ed8' }} />
                  <span><strong>Plan Contractual (P0)</strong></span>
                </div>
                <div className="curva-s-legend-item">
                  <span className="curva-s-legend-line" style={{ background: globalDelta >= 0 ? '#10b981' : '#ea580c' }} />
                  <span><strong>Real Certificado</strong></span>
                </div>
                {currentWeekShort && (
                  <div className="curva-s-legend-item">
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    <span><strong>Semana Actual (Hoy)</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Recharts Responsive Container */}
            <div style={{ width: '100%', height: 350, marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curvaChartData} margin={{ top: 20, right: 25, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="planGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={globalDelta >= 0 ? '#10b981' : '#ea580c'} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={globalDelta >= 0 ? '#10b981' : '#ea580c'} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="weekShort"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    dy={6}
                    interval={dynamicWeeklyProgress.length > 15 ? 1 : 0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<CurvaSTooltip totalBudget={totalProjectBudget} />} />
                  <Area
                    type="monotone"
                    dataKey="budgetZeroPercent"
                    fill="url(#planGradient)"
                    stroke="none"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="realPercent"
                    fill="url(#realGradient)"
                    stroke="none"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="budgetZeroPercent"
                    name="Plan Contractual (P0)"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    strokeDasharray="5 4"
                    dot={{ r: 3, fill: '#ffffff', stroke: '#2563eb', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="realPercent"
                    name="Real Certificado"
                    stroke={globalDelta >= 0 ? '#10b981' : '#ea580c'}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    dot={{ r: 4, fill: globalDelta >= 0 ? '#10b981' : '#ea580c', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  {currentWeekShort && (
                    <ReferenceLine
                      x={currentWeekShort}
                      stroke="#ef4444"
                      strokeDasharray="4 3"
                      strokeWidth={2}
                      label={{
                        value: '🔴 Hoy',
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Cronograma Valorizado Semanal */}
          <div className="card-box" style={{ marginTop: '1.5rem' }}>
            <div className="section-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>
                  📊 Cronograma Valorizado Semanal ({dynamicWeeklyProgress.length} semanas)
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Detalle cuantitativo de avances programados y ejecutados para seguimiento de auditoría y certificaciones.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="oxi-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Rango Fechas</th>
                    <th>Plan Acumulado (%)</th>
                    <th>Plan Valorizado ($)</th>
                    <th>Real Certificado (%)</th>
                    <th>Real Devengado ($)</th>
                    <th>Desvío</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dynamicWeeklyProgress.map((w, idx) => {
                    const planVal = w.budgetZeroPercent
                    const realVal = w.realPercent
                    const delta = w.delta
                    const isAhead = w.isAhead
                    const isCurrent = w.isCurrent
                    const isFuture = w.isFuture

                    const planMoney = Math.round((planVal / 100) * totalProjectBudget)
                    const realMoney = realVal != null ? Math.round((realVal / 100) * totalProjectBudget) : null

                    return (
                      <tr key={`week-row-${idx}`} style={isCurrent ? { background: '#fef2f2', fontWeight: 600 } : {}}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{w.week}</span>
                            {isCurrent && (
                              <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                                HOY
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: '#64748b' }}>{w.dateRange}</td>
                        <td style={{ color: '#2563eb', fontWeight: 600 }}>{planVal}%</td>
                        <td style={{ color: '#475569' }}>{formatMoney(planMoney)}</td>
                        <td style={{ fontWeight: 600, color: realVal != null ? (isAhead ? '#059669' : '#dc2626') : '#94a3b8' }}>
                          {realVal != null ? `${realVal}%` : '—'}
                        </td>
                        <td style={{ color: realMoney != null ? '#0f172a' : '#94a3b8' }}>
                          {realMoney != null ? formatMoney(realMoney) : '—'}
                        </td>
                        <td>
                          {delta != null ? (
                            <span style={{ color: isAhead ? '#059669' : '#dc2626', fontWeight: 700 }}>
                              {delta > 0 ? `+${delta}%` : `${delta}%`}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          {isCurrent ? (
                            <span className="status-pill inprogress" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                              🔴 En Ejecución
                            </span>
                          ) : isFuture ? (
                            <span className="status-pill pending">
                              ⏳ A Ejecutar
                            </span>
                          ) : isAhead ? (
                            <span className="status-pill onbudget">
                              ✓ En Plazo (+{delta}%)
                            </span>
                          ) : (
                            <span className="status-pill delayed">
                              ⚠️ Con Atraso ({delta}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )}

      {/* ── TAB 4: PRESUPUESTOS VS EJECUTADOS POR RUBRO & ALERTAS ── */}
      {activeTab === 'rubros' && (
        <section className="oxi-pro-section">
          <div className="section-toolbar">
            <div>
              <h3>Control de Costos por Rubro & Trazabilidad de Gastos Reales</h3>
              <p>Comparación por especialidad de obra, partes diarios de mano de obra y control de comprobantes imputados.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem' }}>
                <span title="Tasa de leyes sociales configurable a nivel de obra / empresa">🏛️ Leyes Sociales:</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={projectSocialLawsRate}
                  onChange={e => {
                    const val = Number(e.target.value) || 0
                    setProjectSocialLawsRate(val)
                    try {
                      localStorage.setItem(`${storageKey}_social_rate`, String(val))
                    } catch {}
                  }}
                  style={{ width: '48px', padding: '2px 4px', fontSize: '0.82rem', fontWeight: 'bold', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  title="Tasa de leyes sociales de la obra (por defecto 60% BPS)"
                />
                <span style={{ fontWeight: 'bold', color: '#475569' }}>%</span>
              </div>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => setShowCategoriesModal(true)}
                title="Configurar categorías laborales, laudos y cargas sociales"
              >
                ⚙️ Categorías & Laudos
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => exportRubrosCsv(rubros, project?.name || 'Obra')}
                title="Descargar balance de rubros en CSV"
              >
                📥 Exportar Balance (CSV)
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => { setBudgetModalTab('import'); setShowBudgetModal(true) }}
                title="Importar presupuesto de obra desde Excel o CSV"
                style={{ borderColor: '#3b82f6', color: '#1d4ed8' }}
              >
                📥 Importar Excel / CSV
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => { setBudgetModalTab('items'); setShowBudgetModal(true) }}
                title="Ver catálogo de partidas presupuestadas y auditoría de trazabilidad"
              >
                📦 Partidas ({budgetItems.length})
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => setShowLaborReportModal(true)}
                title="Cargar parte diario de mano de obra en campo (formato ágil celular)"
                style={{ borderColor: '#10b981', color: '#047857', fontWeight: 'bold' }}
              >
                📱 + Parte Diario
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => setShowInvoiceModal(true)}
                title="Cargar factura o remito de materiales con imputación a tareas"
                style={{ borderColor: '#6366f1', color: '#4338ca', fontWeight: 'bold' }}
              >
                🧾 + Factura
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => setShowSubcontractModal(true)}
                title="Registrar certificado de subcontratista imputado a rubro"
                style={{ borderColor: '#f59e0b', color: '#b45309', fontWeight: 'bold' }}
              >
                🏗️ + Subcontrato
              </button>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => setShowAddIndirectModal(true)}
                title="Registrar gasto indirecto o general de obra (capataz, obrador, UTE, seguros)"
                style={{ borderColor: '#7c3aed', color: '#6d28d9', fontWeight: 'bold' }}
              >
                🏢 + Gasto Indirecto
              </button>
              <button className="oxi-btn-primary" onClick={() => setShowAddRubroModal(true)}>
                ＋ Agregar Rubro
              </button>
            </div>
          </div>

          {/* Sub-navegación segmentada de Rubros & Gastos Reales (UX-3) */}
          <div className="oxi-segmented-nav">
            <button
              type="button"
              className={`oxi-seg-tab ${rubrosSubTab === 'balance' ? 'active' : ''}`}
              onClick={() => setRubrosSubTab('balance')}
            >
              <span>📊</span>
              <span>Balance General</span>
              <span className="seg-badge">{rubros.length}</span>
            </button>
            <button
              type="button"
              className={`oxi-seg-tab ${rubrosSubTab === 'traceability' ? 'active' : ''}`}
              onClick={() => setRubrosSubTab('traceability')}
            >
              <span>🔍</span>
              <span>Trazabilidad & Desvíos</span>
            </button>
            <button
              type="button"
              className={`oxi-seg-tab ${rubrosSubTab === 'indirects' ? 'active' : ''}`}
              onClick={() => setRubrosSubTab('indirects')}
            >
              <span>🏢</span>
              <span>Costos Indirectos</span>
              <span className="seg-badge">{indirectExpenses.length}</span>
            </button>
            <button
              type="button"
              className={`oxi-seg-tab ${rubrosSubTab === 'labor' ? 'active' : ''}`}
              onClick={() => setRubrosSubTab('labor')}
            >
              <span>📱</span>
              <span>Partes Diarios MO</span>
              <span className="seg-badge">{laborReports.length}</span>
            </button>
            <button
              type="button"
              className={`oxi-seg-tab ${rubrosSubTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setRubrosSubTab('invoices')}
            >
              <span>🧾</span>
              <span>Facturas Materiales</span>
              <span className="seg-badge">{materialInvoices.length}</span>
            </button>
            <button
              type="button"
              className={`oxi-seg-tab ${rubrosSubTab === 'subcontracts' ? 'active' : ''}`}
              onClick={() => setRubrosSubTab('subcontracts')}
            >
              <span>🏗️</span>
              <span>Subcontratos</span>
              <span className="seg-badge">{subcontractContracts.length}</span>
            </button>
          </div>

          {/* Bandeja de Facturas de Materiales Sin Imputar (Punto 5) */}
          {unassignedInvoicesData.count > 0 && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>📥</span>
                <div>
                  <strong style={{ color: '#92400e', fontSize: '0.92rem' }}>
                    Bandeja de Gastos: {unassignedInvoicesData.count} factura(s) de materiales pendientes de imputar
                  </strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#b45309' }}>
                    Monto pendiente: <strong>{formatMoney(unassignedInvoicesData.totalPendingAmount)}</strong>. Imputá estos comprobantes a tareas de obra para que no se pierda la trazabilidad de costos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="oxi-btn-primary"
                onClick={() => {
                  if (unassignedInvoicesData.list[0]) {
                    setAssignInvoiceForm({
                      invoiceId: unassignedInvoicesData.list[0].id,
                      taskId: schedule[0]?.id || 1,
                      amount: unassignedInvoicesData.list[0].unassignedAmount,
                      notes: ''
                    })
                  }
                  setShowAssignInvoiceModal(true)
                }}
                style={{ fontSize: '0.84rem', padding: '6px 14px', background: '#d97706', borderColor: '#b45309' }}
              >
                🔗 Imputar Factura Pendiente
              </button>
            </div>
          )}

          {/* Alerta de sobreasignación de presupuesto (Punto 4) */}
          {budgetAudit.hasOverallocations && (
            <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <div>
                  <strong style={{ color: '#c2410c', fontSize: '0.88rem' }}>Alerta de Asignación de Presupuesto: Partidas asignadas a más del 100%</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#7c2d12' }}>
                    {budgetAudit.overallocatedItems.map(i => `[${i.code}] ${i.name} (${i.totalAssignedPercent}%)`).join(' • ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={() => { setBudgetModalTab('audit'); setShowBudgetModal(true) }}
                style={{ fontSize: '0.78rem', padding: '4px 10px', color: '#c2410c', borderColor: '#fdba74' }}
              >
                🔍 Ver Auditoría de Partidas
              </button>
            </div>
          )}

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

          {/* SUB-VISTA 1: BALANCE GENERAL (CLÁSICA) */}
          {rubrosSubTab === 'balance' && (
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
                  {rubroAlerts.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No hay rubros de obra definidos. Hacé clic en "＋ Agregar Rubro" o "⚡ Auto-Crear Obra con IA" para comenzar.
                      </td>
                    </tr>
                  ) : (
                    rubroAlerts.map(rubro => {
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
                  }))}
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
          )}

          {/* SUB-VISTA 2: TRAZABILIDAD & REPORTE DE DESVÍOS (PUNTO 5) */}
          {rubrosSubTab === 'traceability' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'bold', display: 'block' }}>MANO DE OBRA REAL DEVENGADA</span>
                  <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{formatMoney(rubroExpensesReport.totals.realMO)}</strong>
                  <span style={{ fontSize: '0.74rem', color: '#059669', display: 'block', marginTop: '2px' }}>
                    +{rubroExpensesReport.totals.realJournals} jornales en {laborReports.length} partes diarios
                  </span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'bold', display: 'block' }}>LEYES SOCIALES BPS ({projectSocialLawsRate}%)</span>
                  <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{formatMoney(rubroExpensesReport.totals.realLLSS)}</strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Calculadas sobre mano de obra directa
                  </span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'bold', display: 'block' }}>MATERIALES FACTURADOS REAL</span>
                  <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{formatMoney(rubroExpensesReport.totals.realMaterials)}</strong>
                  <span style={{ fontSize: '0.74rem', color: '#4f46e5', display: 'block', marginTop: '2px' }}>
                    {rubroExpensesReport.totals.invoiceCount} facturas imputadas a tareas
                  </span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'bold', display: 'block' }}>SUBCONTRATOS CERTIFICADOS</span>
                  <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{formatMoney(rubroExpensesReport.totals.realSubcontracts)}</strong>
                  <span style={{ fontSize: '0.74rem', color: '#d97706', display: 'block', marginTop: '2px' }}>
                    {subcontractCertificates.length} certificados homologados
                  </span>
                </div>
              </div>

              <div className="table-responsive">
                <table className="oxi-pro-table">
                  <thead>
                    <tr>
                      <th>Rubro de Obra</th>
                      <th>Mano de Obra (Pres. vs Real)</th>
                      <th>Materiales (Pres. vs Facturado)</th>
                      <th>Subcontratos (Certif.)</th>
                      <th>Presupuesto Total</th>
                      <th>Real Gastado</th>
                      <th>Desvío ($)</th>
                      <th>% Consumido</th>
                      <th>Causa del Desvío & Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubroExpensesReport.items.map(item => (
                      <tr key={item.id} className={`rubro-row-${item.status}`}>
                        <td>
                          <strong>{item.name}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            {item.realJournals > 0 && <span>👷 {item.realJournals} jornales · </span>}
                            {item.invoiceCount > 0 && <span>🧾 {item.invoiceCount} facturas · </span>}
                            {item.subcontractCount > 0 && <span>🏗️ {item.subcontractCount} subcontratos</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem' }}>
                            <div style={{ color: '#64748b' }}>Plan: {formatMoney(item.budgetedMO + item.budgetedLLSS)}</div>
                            <strong style={{ color: item.realMO + item.realLLSS > item.budgetedMO + item.budgetedLLSS ? '#dc2626' : '#0f172a' }}>
                              Real: {formatMoney(item.realMO + item.realLLSS)}
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: '#059669' }}>
                              (MO: {formatMoney(item.realMO)} + LLSS: {formatMoney(item.realLLSS)})
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem' }}>
                            <div style={{ color: '#64748b' }}>Plan: {formatMoney(item.budgetedMatSub)}</div>
                            <strong style={{ color: item.realMaterials > item.budgetedMatSub ? '#dc2626' : '#0f172a' }}>
                              Real: {formatMoney(item.realMaterials)}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: item.realSubcontracts > 0 ? '#d97706' : '#94a3b8' }}>
                            {formatMoney(item.realSubcontracts)}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>
                            {formatMoney(item.budgetedTotal)}
                          </strong>
                        </td>
                        <td>
                          <strong style={{ color: item.diff > 0 ? '#dc2626' : '#059669', fontSize: '0.9rem' }}>
                            {formatMoney(item.realTotal)}
                          </strong>
                        </td>
                        <td>
                          <strong style={{ color: item.diff > 0 ? '#dc2626' : '#059669', fontSize: '0.88rem' }}>
                            {item.diff > 0 ? `+${formatMoney(item.diff)}` : formatMoney(item.diff)}
                          </strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Saldo: {formatMoney(item.balance)}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="progress-bar-wrap" style={{ width: '60px' }}>
                              <div
                                className={`progress-fill ${item.status === 'critical' ? 'danger' : item.status === 'warning' ? 'warn' : ''}`}
                                style={{ width: `${Math.min(100, item.percentConsumed)}%` }}
                              />
                            </div>
                            <strong style={{ fontSize: '0.84rem' }}>{item.percentConsumed}%</strong>
                          </div>
                        </td>
                        <td>
                          {item.deviationType === 'labor' && (
                            <span className="alert-tag critical" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🔴 {item.deviationCause}
                            </span>
                          )}
                          {item.deviationType === 'material' && (
                            <span className="alert-tag critical" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🔴 {item.deviationCause}
                            </span>
                          )}
                          {item.deviationType === 'subcontract' && (
                            <span className="alert-tag critical" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🔴 {item.deviationCause}
                            </span>
                          )}
                          {item.deviationType === 'warning' && (
                            <span className="alert-tag warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🟡 {item.deviationCause}
                            </span>
                          )}
                          {item.deviationType === 'normal' && (
                            <span className="alert-tag normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🟢 {item.deviationCause}
                            </span>
                          )}
                          {item.deviationType === 'manual' && (
                            <span style={{ fontSize: '0.74rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                              ✍️ {item.deviationCause}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                      <td style={{ padding: '12px' }}>TOTALES DE OBRA:</td>
                      <td style={{ padding: '12px' }}>
                        <div>Plan: {formatMoney(rubroExpensesReport.totals.budgetedMO + rubroExpensesReport.totals.budgetedLLSS)}</div>
                        <div style={{ color: '#059669' }}>Real: {formatMoney(rubroExpensesReport.totals.realMO + rubroExpensesReport.totals.realLLSS)}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>Plan: {formatMoney(rubroExpensesReport.totals.budgetedMatSub)}</div>
                        <div style={{ color: '#4f46e5' }}>Real: {formatMoney(rubroExpensesReport.totals.realMaterials)}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#d97706' }}>
                        {formatMoney(rubroExpensesReport.totals.realSubcontracts)}
                      </td>
                      <td style={{ padding: '12px', color: '#ea580c' }}>
                        {formatMoney(rubroExpensesReport.totals.budgetedTotal)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {formatMoney(rubroExpensesReport.totals.realTotal)}
                      </td>
                      <td style={{ padding: '12px', color: rubroExpensesReport.totals.balance < 0 ? '#ef4444' : '#10b981' }}>
                        {formatMoney(rubroExpensesReport.totals.balance)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {rubroExpensesReport.totals.percentConsumed}%
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Trazabilidad consolidada</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VISTA 3: PARTES DIARIOS DE MANO DE OBRA (PUNTO 5) */}
          {rubrosSubTab === 'labor' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#0f172a' }}>📱 Partes Diarios de Mano de Obra en Obra</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Registro diario simple desde celular o tablet: imputación directa de operarios a tareas y conversión a jornales con BPS ({projectSocialLawsRate}%).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="oxi-btn-back-classic"
                    onClick={() => setShowBpsReportModal(true)}
                    style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#166534', fontWeight: 600 }}
                    title="Generar planilla oficial de nómina de personal y aportes BPS Ley 14.411"
                  >
                    🏛️ Nómina & BPS (Ley 14.411)
                  </button>
                  <button
                    type="button"
                    className="oxi-btn-primary"
                    onClick={() => setShowLaborReportModal(true)}
                    style={{ background: '#059669', borderColor: '#047857' }}
                  >
                    ＋ Cargar Parte Diario (MO)
                  </button>
                </div>
              </div>

              {laborReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>👷‍♂️</div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem', marginBottom: '4px' }}>Sin partes diarios de mano de obra</strong>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 14px' }}>Registrá los jornales de cuadrilla diarios para computar el costo directo y leyes sociales de la jornada.</p>
                  <button type="button" className="oxi-btn-primary" onClick={() => setShowLaborReportModal(true)} style={{ background: '#059669', borderColor: '#047857', fontSize: '0.82rem', padding: '6px 14px' }}>
                    ＋ Cargar Primer Parte Diario
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="oxi-pro-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tarea de Obra & Rubro Imputado</th>
                        <th>Cuadrilla de Personal</th>
                        <th>Jornales Totales</th>
                        <th>Mano de Obra Directa</th>
                        <th>Leyes Sociales ({projectSocialLawsRate}%)</th>
                        <th>Costo Total Devengado</th>
                        <th>Observaciones de Campo</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborReports.map(lr => (
                        <tr key={lr.id}>
                          <td>
                            <strong>{lr.date}</strong>
                          </td>
                          <td>
                            <strong>{lr.taskName}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                              🏷️ Rubro: {lr.rubroName}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {(lr.crew || []).map((w, idx) => (
                                <span key={idx} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                  <strong>{w.quantity}x</strong> {w.role} (${Number(w.dailyRate).toLocaleString('es-UY')}/d)
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                            {lr.totalJournals}
                          </td>
                          <td style={{ fontWeight: 'bold' }}>
                            {formatMoney(lr.laborDirectCost)}
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {formatMoney(lr.socialLawsCost)}
                          </td>
                          <td>
                            <strong style={{ color: '#059669', fontSize: '0.92rem' }}>
                              {formatMoney(lr.totalLaborCost)}
                            </strong>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '220px' }}>
                            {lr.notes || '—'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() => handleDeleteLaborReport(lr.id)}
                              title="Eliminar este parte diario"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-VISTA 4: FACTURAS & REMITOS DE MATERIALES (PUNTO 5) */}
          {rubrosSubTab === 'invoices' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#0f172a' }}>🧾 Facturas y Remitos de Materiales de Obra</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Carga de comprobantes comerciales con imputación fraccional a tareas de obra y control de comprobantes sin imputar.
                  </p>
                </div>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={() => setShowInvoiceModal(true)}
                  style={{ background: '#4f46e5', borderColor: '#4338ca' }}
                >
                  ＋ Cargar Factura / Remito
                </button>
              </div>

              {materialInvoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🧾</div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem', marginBottom: '4px' }}>Sin facturas ni remitos de materiales</strong>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 14px' }}>Cargá comprobantes de compras para imputar materiales a tareas y rubros de obra.</p>
                  <button type="button" className="oxi-btn-primary" onClick={() => setShowInvoiceModal(true)} style={{ background: '#4f46e5', borderColor: '#4338ca', fontSize: '0.82rem', padding: '6px 14px' }}>
                    ＋ Cargar Primera Factura
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="oxi-pro-table">
                    <thead>
                      <tr>
                        <th>N° Comprobante</th>
                        <th>Proveedor</th>
                        <th>Fecha</th>
                        <th>Monto Total</th>
                        <th>Estado de Imputación</th>
                        <th>Tareas & Rubros Imputados</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialInvoices.map(inv => {
                        const totals = calculateInvoiceAllocationTotals(inv)
                        return (
                          <tr key={inv.id}>
                            <td>
                              <strong>{inv.invoiceNumber}</strong>
                            </td>
                            <td>
                              <strong>{inv.supplier}</strong>
                            </td>
                            <td style={{ fontSize: '0.84rem' }}>
                              {inv.date}
                            </td>
                            <td>
                              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                                {formatMoney(inv.totalAmount)}
                              </strong>
                            </td>
                            <td>
                              {totals.isFullyAssigned && (
                                <span className="alert-tag normal">
                                  🟢 Imputada 100%
                                </span>
                              )}
                              {!totals.isFullyAssigned && totals.allocatedAmount > 0 && (
                                <span className="alert-tag warning">
                                  🟡 Saldo libre: {formatMoney(totals.unassignedAmount)} ({totals.allocatedPercent}%)
                                </span>
                              )}
                              {totals.isUnassigned && (
                                <span className="alert-tag critical">
                                  🔴 Sin imputar ({formatMoney(inv.totalAmount)})
                                </span>
                              )}
                            </td>
                            <td>
                              {(inv.allocations || []).length === 0 ? (
                                <span style={{ color: '#dc2626', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                  ⚠️ Factura pendiente en bandeja sin imputar
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {inv.allocations.map((a, idx) => (
                                    <div key={idx} style={{ fontSize: '0.78rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 6px', borderRadius: '4px' }}>
                                      <span><strong>{formatMoney(a.amount)}</strong> ({a.percentage}%) → </span>
                                      <span style={{ color: '#1e293b' }}>{a.taskName}</span>
                                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}> ({a.rubroName})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {totals.unassignedAmount > 0 && (
                                  <button
                                    type="button"
                                    className="oxi-btn-back-classic"
                                    onClick={() => {
                                      setAssignInvoiceForm({
                                        invoiceId: inv.id,
                                        taskId: schedule[0]?.id || 1,
                                        amount: totals.unassignedAmount,
                                        notes: ''
                                      })
                                      setShowAssignInvoiceModal(true)
                                    }}
                                    style={{ fontSize: '0.74rem', padding: '3px 8px', borderColor: '#d97706', color: '#b45309' }}
                                    title="Imputar saldo restante a una tarea"
                                  >
                                    🔗 Imputar Saldo
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-delete"
                                  onClick={() => handleDeleteMaterialInvoice(inv.id)}
                                  title="Eliminar esta factura"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-VISTA 5: GESTIÓN CONTRACTUAL Y CERTIFICADOS DE SUBCONTRATOS (PUNTOS 5 Y 11) */}
          {rubrosSubTab === 'subcontracts' && (
            <div>
              {/* Tarjetas KPI de Control Contractual Consolidado */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TECHO CONTRACTUAL TOTAL</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{formatMoney(contractsSummary.totalRevisedCeiling)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Base: {formatMoney(contractsSummary.totalBaseAmount)}</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>ADICIONALES APROBADOS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>+{formatMoney(contractsSummary.totalAdditionalsAmount)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Ampliaciones de contrato</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>CERTIFICADO BRUTO</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>{formatMoney(contractsSummary.totalCertifiedGross)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {contractsSummary.totalRevisedCeiling > 0 ? Math.round((contractsSummary.totalCertifiedGross / contractsSummary.totalRevisedCeiling) * 100) : 0}% consumido
                  </div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>FONDO DE REPARO (5%)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed' }}>{formatMoney(contractsSummary.totalRetentionGuarantee)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Garantía acumulada en retención</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>NETO LÍQUIDO A PAGAR</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>{formatMoney(contractsSummary.totalPayableNet)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Monto deducida la garantía</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>SALDO DISPONIBLE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: contractsSummary.totalAvailableBalance < 0 ? '#ef4444' : '#10b981' }}>
                    {formatMoney(contractsSummary.totalAvailableBalance)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Techo libre por certificar</div>
                </div>
              </div>

              {/* Barra de Acciones y Toggle de Vistas */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="oxi-btn-back-classic"
                    onClick={() => setSubcontractsViewMode('contracts')}
                    style={subcontractsViewMode === 'contracts' ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a', fontWeight: 'bold' } : {}}
                  >
                    📑 Contratos y Techos Presupuestales ({subcontractContracts.length})
                  </button>
                  <button
                    type="button"
                    className="oxi-btn-back-classic"
                    onClick={() => setSubcontractsViewMode('certificates')}
                    style={subcontractsViewMode === 'certificates' ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a', fontWeight: 'bold' } : {}}
                  >
                    📜 Certificados Emitidos ({subcontractCertificates.length})
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="oxi-btn-back-classic"
                    onClick={() => exportSubcontractsCsv(subcontractContracts, subcontractCertificates, project?.name || 'Obra')}
                    style={{ borderColor: '#cbd5e1', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Exportar contratos y certificaciones a planilla CSV compatible con Excel"
                  >
                    📥 Exportar CSV
                  </button>
                  <button
                    type="button"
                    className="oxi-btn-back-classic"
                    onClick={() => setShowAddContractModal(true)}
                    style={{ borderColor: '#0f172a', color: '#0f172a', fontWeight: 600 }}
                  >
                    ＋ Nuevo Contrato
                  </button>
                  <button
                    type="button"
                    className="oxi-btn-primary"
                    onClick={() => {
                      setSubcontractForm({
                        contractId: subcontractContracts[0]?.id || '',
                        certificateNumber: `CERT-${Date.now().toString().slice(-4)}`,
                        subcontractorName: subcontractContracts[0]?.contractorName || '',
                        rubroId: subcontractContracts[0]?.rubroId || rubros[0]?.id || 'fundaciones',
                        date: new Date().toISOString().slice(0, 10),
                        amount: '',
                        notes: ''
                      })
                      setShowSubcontractModal(true)
                    }}
                    style={{ background: '#d97706', borderColor: '#b45309' }}
                  >
                    ＋ Cargar Certificado Subcontrato
                  </button>
                </div>
              </div>

              {/* VISTA 1: TABLA DE CONTRATOS MARCO */}
              {subcontractsViewMode === 'contracts' && (
                subcontractContracts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>📑</div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem', marginBottom: '4px' }}>Sin contratos marco de subcontratos</strong>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 14px' }}>Definí contratos con techo presupuestal para controlar saldos, adicionales y retenciones del 5%.</p>
                    <button type="button" className="oxi-btn-primary" onClick={() => setShowAddContractModal(true)} style={{ background: '#0f172a', borderColor: '#0f172a', fontSize: '0.82rem', padding: '6px 14px' }}>
                      ＋ Crear Primer Contrato Marco
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="oxi-pro-table">
                      <thead>
                        <tr>
                          <th>Contrato / Empresa</th>
                          <th>Rubro / Alcance</th>
                          <th>Techo Base</th>
                          <th>Adicionales Aprobados</th>
                          <th>Techo Revisado</th>
                          <th>Certificado a la Fecha</th>
                          <th>Fondo Reparo (5%)</th>
                          <th>Saldo Disponible</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subcontractContracts.map(c => {
                          const status = calculateSubcontractContractStatus(c, subcontractCertificates)
                          return (
                            <tr key={c.id}>
                              <td>
                                <div><strong>{c.code}</strong></div>
                                <div style={{ fontSize: '0.85rem', color: '#334155' }}>{c.contractorName}</div>
                              </td>
                              <td>
                                <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                                  🏷️ {c.rubroName}
                                </span>
                                {c.scope && (
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                                    {c.scope}
                                  </div>
                                )}
                              </td>
                              <td style={{ fontSize: '0.88rem' }}>
                                {formatMoney(status.baseAmount)}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: status.additionalsAmount > 0 ? '#0284c7' : '#64748b' }}>
                                    +{formatMoney(status.additionalsAmount)}
                                  </strong>
                                  <button
                                    type="button"
                                    className="oxi-btn-back-classic"
                                    onClick={() => handleOpenAddAdditional(c)}
                                    style={{ fontSize: '0.7rem', padding: '1px 5px', borderColor: '#0284c7', color: '#0284c7' }}
                                    title="Registrar ampliación o adicional aprobado"
                                  >
                                    ＋ Adic
                                  </button>
                                </div>
                                {c.additionals && c.additionals.length > 0 && (
                                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {c.additionals.map(a => (
                                      <div key={a.id} style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>
                                        <span><strong>{a.code}</strong>: {a.description}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ fontWeight: 600, color: '#0284c7' }}>{formatMoney(a.amount)}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteAdditional(c.id, a.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                                            title="Eliminar adicional"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td>
                                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                                  {formatMoney(status.revisedCeiling)}
                                </strong>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div className="progress-bar-wrap" style={{ width: '70px' }}>
                                    <div
                                      className="progress-fill"
                                      style={{
                                        width: `${Math.min(100, status.consumedPercent)}%`,
                                        background: status.status === 'over_ceiling' ? '#ef4444' : status.status === 'warning_ceiling' ? '#f59e0b' : '#10b981'
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{status.consumedPercent}%</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>
                                  {formatMoney(status.certifiedGross)}
                                </div>
                                {status.status === 'over_ceiling' && (
                                  <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 'bold' }}>🚨 Techo Superado</span>
                                )}
                                {status.status === 'warning_ceiling' && (
                                  <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 'bold' }}>⚠️ Alerta 80% Techo</span>
                                )}
                              </td>
                              <td style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600 }}>
                                {formatMoney(status.retentionGuarantee)}
                              </td>
                              <td>
                                <strong style={{ fontSize: '0.9rem', color: status.availableBalance < 0 ? '#ef4444' : '#10b981' }}>
                                  {formatMoney(status.availableBalance)}
                                </strong>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    className="oxi-btn-back-classic"
                                    onClick={() => {
                                      setSubcontractForm({
                                        contractId: c.id,
                                        certificateNumber: `CERT-${Date.now().toString().slice(-4)}`,
                                        subcontractorName: c.contractorName,
                                        rubroId: c.rubroId,
                                        date: new Date().toISOString().slice(0, 10),
                                        amount: '',
                                        notes: ''
                                      })
                                      setShowSubcontractModal(true)
                                    }}
                                    style={{ fontSize: '0.75rem', padding: '3px 6px', borderColor: '#d97706', color: '#b45309' }}
                                    title="Emitir certificado contra este contrato"
                                  >
                                    📜 Certificar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-delete"
                                    onClick={() => handleDeleteContract(c.id)}
                                    title="Eliminar este contrato"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* VISTA 2: TABLA DE CERTIFICADOS EMITIDOS */}
              {subcontractsViewMode === 'certificates' && (
                subcontractCertificates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>📜</div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem', marginBottom: '4px' }}>Sin certificados de subcontratos emitidos</strong>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 14px' }}>Emití certificados contra contratos aprobados con retención del 5% de fondo de reparo.</p>
                    <button type="button" className="oxi-btn-primary" onClick={() => setShowSubcontractModal(true)} style={{ background: '#d97706', borderColor: '#b45309', fontSize: '0.82rem', padding: '6px 14px' }}>
                      ＋ Cargar Primer Certificado
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="oxi-pro-table">
                      <thead>
                        <tr>
                          <th>N° Certificado</th>
                          <th>Subcontratista / Contrato</th>
                          <th>Rubro Imputado</th>
                          <th>Fecha</th>
                          <th>Monto Bruto</th>
                          <th>Retención Garantía (5%)</th>
                          <th>Neto Líquido a Pagar</th>
                          <th>Observaciones</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subcontractCertificates.map(sub => {
                          const retention = sub.retentionAmount != null ? sub.retentionAmount : Math.round(sub.amount * 0.05)
                          const netPayable = sub.netPayable != null ? sub.netPayable : (sub.amount - retention)
                          const linkedContract = subcontractContracts.find(c => c.id === sub.contractId)
                          return (
                            <tr key={sub.id}>
                              <td>
                                <strong>{sub.certificateNumber}</strong>
                              </td>
                              <td>
                                <strong>{sub.subcontractorName}</strong>
                                {linkedContract && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    Contrato: {linkedContract.code}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                                  🏷️ {sub.rubroName}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.84rem' }}>
                                {sub.date}
                              </td>
                              <td>
                                <strong style={{ fontSize: '0.92rem', color: '#d97706' }}>
                                  {formatMoney(sub.amount)}
                                </strong>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600 }}>
                                -{formatMoney(retention)}
                              </td>
                              <td>
                                <strong style={{ fontSize: '0.92rem', color: '#059669' }}>
                                  {formatMoney(netPayable)}
                                </strong>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                                {sub.notes || '—'}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-delete"
                                  onClick={() => handleDeleteSubcontract(sub.id)}
                                  title="Eliminar este certificado"
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
                )
              )}
            </div>
          )}

          {/* SUB-VISTA 6: COSTOS INDIRECTOS / GASTOS GENERALES (PUNTO 6) */}
          {rubrosSubTab === 'indirects' && (
            <div>
              {/* Formula de Consolidacion Directo + Indirecto = Total */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '18px 24px',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600 }}>
                      CONSOLIDACIÓN TÉCNICO-FINANCIERA DE OBRA (PUNTO 6)
                    </span>
                    <h3 style={{ margin: '4px 0 0', color: '#38bdf8', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                      {projectCostConsolidated.formulaSummary}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Directo</div>
                      <strong style={{ fontSize: '1.05rem', color: '#38bdf8' }}>{projectCostConsolidated.directSharePercent}%</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Indirecto</div>
                      <strong style={{ fontSize: '1.05rem', color: '#f59e0b' }}>{projectCostConsolidated.indirectSharePercent}%</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Gastos Generales de Implantación y Conducción</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Partidas globales indispensables no imputadas a tareas físicas unitarias (obrador, jefatura, baños, suministros UTE/OSE, seguros, logística).
                  </p>
                </div>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={() => setShowAddIndirectModal(true)}
                  style={{ background: '#0284c7', borderColor: '#0369a1' }}
                >
                  ＋ Registrar Gasto Indirecto
                </button>
              </div>

              {/* Table of Indirect Costs */}
              <div className="table-responsive">
                <table className="oxi-pro-table">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Concepto / Detalle</th>
                      <th>Modalidad / Período</th>
                      <th style={{ textAlign: 'right' }}>Presupuestado</th>
                      <th style={{ textAlign: 'right' }}>Ejecutado</th>
                      <th style={{ textAlign: 'right' }}>Saldo Restante</th>
                      <th style={{ textAlign: 'center' }}>% Consumido</th>
                      <th>Notas</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indirectExpenses.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                          <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🏢</div>
                          <strong>No hay costos indirectos registrados aún</strong>
                          <p style={{ margin: '4px 0 10px', fontSize: '0.84rem' }}>Cargá gastos de obrador, suministros, seguros o logística de obra.</p>
                          <button type="button" className="oxi-btn-primary" onClick={() => setShowAddIndirectModal(true)} style={{ background: '#7c3aed', borderColor: '#6d28d9', fontSize: '0.8rem', padding: '5px 12px' }}>
                            ＋ Agregar Gasto General
                          </button>
                        </td>
                      </tr>
                    ) : (
                      indirectExpenses.map(exp => {
                      const bal = exp.budgeted - exp.executed
                      const pct = exp.budgeted > 0 ? Math.round((exp.executed / exp.budgeted) * 100) : 0
                      const isOver = bal < 0
                      return (
                        <tr key={exp.id}>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: '#e0f2fe',
                              color: '#0369a1'
                            }}>
                              {exp.categoryId === 'obrador_banos' && '🛖 Obrador y Baños'}
                              {exp.categoryId === 'jefatura_sereno' && '👷 Jefatura y Sereno'}
                              {exp.categoryId === 'suministros' && '⚡ Suministros (UTE/OSE)'}
                              {exp.categoryId === 'seguros_tasas' && '🛡️ Seguros & Tasas'}
                              {exp.categoryId === 'logistica' && '🚛 Logística y Andamios'}
                              {exp.categoryId === 'otro' && '📦 Otros Gastos'}
                            </span>
                          </td>
                          <td><strong>{exp.name}</strong></td>
                          <td style={{ fontSize: '0.82rem', color: '#475569' }}>{exp.period || 'Prorrateado'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(exp.budgeted)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#d97706' }}>{formatMoney(exp.executed)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: isOver ? '#ef4444' : '#10b981' }}>
                            {formatMoney(bal)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <div className="progress-bar-wrap" style={{ width: '60px', height: '6px' }}>
                                <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: isOver ? '#ef4444' : '#0284c7' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{exp.notes || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() => handleDeleteIndirectExpense(exp.id)}
                              title="Eliminar este gasto indirecto"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    }))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                      <td colSpan="3">TOTAL GASTOS GENERALES E INDIRECTOS</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(indirectCostsTotals.totalBudgeted)}</td>
                      <td style={{ textAlign: 'right', color: '#d97706' }}>{formatMoney(indirectCostsTotals.totalExecuted)}</td>
                      <td style={{ textAlign: 'right', color: indirectCostsTotals.totalBalance < 0 ? '#ef4444' : '#10b981' }}>
                        {formatMoney(indirectCostsTotals.totalBalance)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{indirectCostsTotals.percentConsumed}%</td>
                      <td colSpan="2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
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

      {/* ── MODAL: AGREGAR / EDITAR TAREA AL CRONOGRAMA ── */}
      {showAddTaskModal && (
        <div className="oxi-modal-backdrop" onClick={() => { setShowAddTaskModal(false); setEditingTaskId(null) }}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingTaskId ? 'Editar Tarea de Obra' : 'Agregar Tarea de Obra'}</h3>
            <p>{editingTaskId ? 'Modificá plazos, vínculos de precedencia o asignación de recursos.' : 'Define plazos, vínculos con otras tareas, dotación de personal y costos asociados.'}</p>

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

              {/* SECCIÓN MODO DE PROGRAMACIÓN TEMPORAL (Dependencias / Predecesoras) */}
              <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏱️</span>
                    <span>Modo de Programación Temporal</span>
                  </span>
                  <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, schedulingMode: 'dates', dependsOnTaskId: '' }))}
                      style={{
                        border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        background: newTask.schedulingMode !== 'dependency' ? '#2563eb' : 'transparent',
                        color: newTask.schedulingMode !== 'dependency' ? '#ffffff' : '#475569'
                      }}
                    >
                      📅 Fechas Directas (Manual)
                    </button>
                    <button
                      type="button"
                      disabled={schedule.filter(t => t.id !== editingTaskId).length === 0}
                      onClick={() => {
                        const available = schedule.filter(t => t.id !== editingTaskId)
                        const firstPred = available[0]
                        const lag = Number(newTask.lagDays) || 0
                        const duration = Math.max(1, Number(newTask.workDays) || 5)
                        const calc = firstPred ? calculateDependentTaskDates(firstPred, { dependencyType: 'FS', lagDays: lag, workDays: duration }) : null
                        setNewTask(prev => ({
                          ...prev,
                          schedulingMode: 'dependency',
                          dependsOnTaskId: firstPred ? firstPred.id : '',
                          dependencyType: 'FS',
                          lagDays: lag,
                          workDays: duration,
                          startDate: calc ? calc.startDate : prev.startDate,
                          endDate: calc ? calc.endDate : prev.endDate
                        }))
                      }}
                      title={schedule.filter(t => t.id !== editingTaskId).length === 0 ? 'No hay otras tareas previas en el cronograma para enganchar' : 'Enganchar esta tarea al fin o inicio de otra tarea'}
                      style={{
                        border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: schedule.filter(t => t.id !== editingTaskId).length === 0 ? 'not-allowed' : 'pointer',
                        background: newTask.schedulingMode === 'dependency' ? '#059669' : 'transparent',
                        color: newTask.schedulingMode === 'dependency' ? '#ffffff' : '#475569',
                        opacity: schedule.filter(t => t.id !== editingTaskId).length === 0 ? 0.5 : 1
                      }}
                    >
                      🔗 Enganchar a otra Tarea (Dependencia)
                    </button>
                  </div>
                </div>

                {newTask.schedulingMode === 'dependency' ? (
                  <div>
                    <div className="form-row" style={{ marginBottom: '8px' }}>
                      <label style={{ flex: 2 }}>
                        Tarea Predecesora (de la cual depende)
                        <select
                          required
                          value={newTask.dependsOnTaskId || ''}
                          onChange={e => {
                            const predId = e.target.value
                            const pred = schedule.find(t => String(t.id) === String(predId))
                            if (pred) {
                              const calc = calculateDependentTaskDates(pred, {
                                dependencyType: newTask.dependencyType || 'FS',
                                lagDays: Number(newTask.lagDays) || 0,
                                workDays: Number(newTask.workDays) || 5
                              })
                              setNewTask(prev => ({
                                ...prev,
                                dependsOnTaskId: pred.id,
                                startDate: calc.startDate,
                                endDate: calc.endDate,
                                workDays: calc.workDays
                              }))
                            } else {
                              setNewTask(prev => ({ ...prev, dependsOnTaskId: '' }))
                            }
                          }}
                          style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="">-- Seleccionar tarea predecesora --</option>
                          {schedule.filter(t => t.id !== editingTaskId).map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} (Fin: {t.endDate} • {t.workDays || 1}d)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ flex: 1.5 }}>
                        Tipo de Vínculo
                        <select
                          value={newTask.dependencyType || 'FS'}
                          onChange={e => {
                            const depType = e.target.value
                            const pred = schedule.find(t => String(t.id) === String(newTask.dependsOnTaskId))
                            if (pred) {
                              const calc = calculateDependentTaskDates(pred, {
                                dependencyType: depType,
                                lagDays: Number(newTask.lagDays) || 0,
                                workDays: Number(newTask.workDays) || 5
                              })
                              setNewTask(prev => ({
                                ...prev,
                                dependencyType: depType,
                                startDate: calc.startDate,
                                endDate: calc.endDate,
                                workDays: calc.workDays
                              }))
                            } else {
                              setNewTask(prev => ({ ...prev, dependencyType: depType }))
                            }
                          }}
                          style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="FS">Fin a Inicio (FS) — Al terminar la anterior</option>
                          <option value="SS">Inicio a Inicio (SS) — Al iniciar la anterior</option>
                        </select>
                      </label>
                    </div>

                    <div className="form-row">
                      <label>
                        Desfase de Espera (días hábiles)
                        <input
                          type="number"
                          min="0"
                          value={newTask.lagDays != null ? newTask.lagDays : 0}
                          onChange={e => {
                            const lag = Math.max(0, Number(e.target.value) || 0)
                            const pred = schedule.find(t => String(t.id) === String(newTask.dependsOnTaskId))
                            if (pred) {
                              const calc = calculateDependentTaskDates(pred, {
                                dependencyType: newTask.dependencyType || 'FS',
                                lagDays: lag,
                                workDays: Number(newTask.workDays) || 5
                              })
                              setNewTask(prev => ({
                                ...prev,
                                lagDays: lag,
                                startDate: calc.startDate,
                                endDate: calc.endDate,
                                workDays: calc.workDays
                              }))
                            } else {
                              setNewTask(prev => ({ ...prev, lagDays: lag }))
                            }
                          }}
                          placeholder="0 (inmediato)"
                        />
                        <small style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                          Ej: 3 = esperar 3 días hábiles (fraguado/curado) tras terminar la losa
                        </small>
                      </label>
                      <label>
                        Duración de esta Tarea (días hábiles)
                        <input
                          type="number"
                          min="1"
                          required
                          value={newTask.workDays}
                          onChange={e => {
                            const duration = Math.max(1, Number(e.target.value) || 1)
                            const pred = schedule.find(t => String(t.id) === String(newTask.dependsOnTaskId))
                            if (pred) {
                              const calc = calculateDependentTaskDates(pred, {
                                dependencyType: newTask.dependencyType || 'FS',
                                lagDays: Number(newTask.lagDays) || 0,
                                workDays: duration
                              })
                              setNewTask(prev => ({
                                ...prev,
                                workDays: duration,
                                startDate: calc.startDate,
                                endDate: calc.endDate
                              }))
                            } else {
                              const newEnd = calculateTaskEndDateFromDuration(newTask.startDate, duration)
                              setNewTask(prev => ({ ...prev, workDays: duration, endDate: newEnd }))
                            }
                          }}
                        />
                        <small style={{ color: '#059669', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                          ✓ Descuenta fines de semana y feriados
                        </small>
                      </label>
                    </div>

                    {newTask.dependsOnTaskId && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '10px 14px', marginTop: '8px', fontSize: '0.82rem', color: '#065f46' }}>
                        <div>
                          <strong>🔗 Vínculo Activo:</strong> Comienza el <strong>{newTask.startDate}</strong> y finaliza el <strong>{newTask.endDate}</strong> ({newTask.workDays} días hábiles).
                        </div>
                        <small style={{ color: '#047857', display: 'block', marginTop: '3px', lineHeight: 1.4 }}>
                          {newTask.dependencyType === 'FS'
                            ? `Inicia ${Number(newTask.lagDays) > 0 ? `${newTask.lagDays} días hábiles después de terminar` : 'inmediatamente al día hábil siguiente a la terminación de'} "${schedule.find(t => String(t.id) === String(newTask.dependsOnTaskId))?.name}".`
                            : `Inicia ${Number(newTask.lagDays) > 0 ? `${newTask.lagDays} días hábiles después del inicio de` : 'en simultáneo al iniciar'} "${schedule.find(t => String(t.id) === String(newTask.dependsOnTaskId))?.name}".`
                          } Si la predecesora se retrasa o corre por lluvia, esta tarea se actualizará automáticamente en cascada.
                        </small>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
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
                        Días Hábiles Estimados (Automático)
                        <input
                          type="number"
                          min="1"
                          value={newTask.workDays}
                          onChange={e => {
                            const days = Math.max(1, Number(e.target.value) || 1)
                            const newEnd = calculateTaskEndDateFromDuration(newTask.startDate, days)
                            handleTaskDatesChange(newTask.startDate, newEnd)
                          }}
                          title="Días hábiles calculados sin fines de semana ni feriados SUNCA"
                        />
                        <small style={{ color: '#059669', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                          ✓ Descuenta fines de semana y feriados de obra
                        </small>
                      </label>
                      <label>
                        Mes Asignado (Automático por fechas)
                        <div style={{
                          padding: '10px 12px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.92rem',
                          fontWeight: 'bold',
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>📅</span>
                          <span>{distributeCostByMonths(newTask.startDate, newTask.endDate).primaryMonthLabel || 'Calculando...'}</span>
                        </div>
                        <small style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                          Se calcula desde fecha de inicio y fin
                        </small>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN PUNTO 6: DOTACIÓN DE PERSONAL & CUADRILLAS MIXTAS */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👥 Cuadrilla & Personal de Tarea (Punto 6)
                  </strong>
                  <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const tmpl = DEFAULT_CREW_TEMPLATES[0]
                        setNewTask(prev => ({
                          ...prev,
                          crewMode: 'template',
                          selectedTemplateId: tmpl.id,
                          crewLines: tmpl.lines.map(l => ({ ...l }))
                        }))
                      }}
                      style={{
                        border: 'none', padding: '3px 10px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        background: newTask.crewMode === 'template' ? '#2563eb' : 'transparent',
                        color: newTask.crewMode === 'template' ? '#ffffff' : '#475569'
                      }}
                    >
                      📋 Plantilla de Cuadrilla
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, crewMode: 'custom' }))}
                      style={{
                        border: 'none', padding: '3px 10px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        background: newTask.crewMode === 'custom' ? '#059669' : 'transparent',
                        color: newTask.crewMode === 'custom' ? '#ffffff' : '#475569'
                      }}
                    >
                      🛠️ Cuadrilla Libre
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, crewMode: 'single' }))}
                      style={{
                        border: 'none', padding: '3px 10px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        background: newTask.crewMode === 'single' ? '#64748b' : 'transparent',
                        color: newTask.crewMode === 'single' ? '#ffffff' : '#475569'
                      }}
                    >
                      👤 Operario Simple
                    </button>
                  </div>
                </div>

                {newTask.crewMode === 'template' && (
                  <div>
                    <label style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                      Seleccionar Plantilla de Cuadrilla
                    </label>
                    <select
                      value={newTask.selectedTemplateId || 'crew_albanileria'}
                      onChange={e => {
                        const tmpl = DEFAULT_CREW_TEMPLATES.find(t => t.id === e.target.value) || DEFAULT_CREW_TEMPLATES[0]
                        setNewTask(prev => ({
                          ...prev,
                          selectedTemplateId: tmpl.id,
                          crewLines: tmpl.lines.map(l => ({ ...l }))
                        }))
                      }}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.84rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '8px' }}
                    >
                      {DEFAULT_CREW_TEMPLATES.map(tmpl => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name} — {tmpl.description}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(newTask.crewLines || []).map((line, idx) => (
                        <span key={idx} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', color: '#1e40af' }}>
                          <strong>{line.count}x</strong> {line.role} (${Number(line.dailyRate).toLocaleString('es-UY')}/d)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {newTask.crewMode === 'custom' && (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                      {(newTask.crewLines || []).map((line, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            value={line.role}
                            onChange={e => {
                              const cat = laborCategories.find(c => c.role === e.target.value)
                              const updated = [...newTask.crewLines]
                              updated[idx] = {
                                ...updated[idx],
                                role: e.target.value,
                                dailyRate: cat ? cat.dailyRate : updated[idx].dailyRate
                              }
                              setNewTask(prev => ({ ...prev, crewLines: updated }))
                            }}
                            style={{ flex: 2, padding: '4px 6px', fontSize: '0.82rem' }}
                          >
                            {laborCategories.filter(c => c.active !== false).map(c => (
                              <option key={c.id || c.role} value={c.role}>
                                {c.role} (${Number(c.dailyRate).toLocaleString('es-UY')}/d)
                              </option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1 }}>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Cant:</span>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={line.count}
                              onChange={e => {
                                const updated = [...newTask.crewLines]
                                updated[idx] = { ...updated[idx], count: Math.max(1, Number(e.target.value) || 1) }
                                setNewTask(prev => ({ ...prev, crewLines: updated }))
                              }}
                              style={{ width: '45px', padding: '3px', fontSize: '0.82rem', textAlign: 'center' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1.2 }}>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>$/d:</span>
                            <input
                              type="number"
                              min="0"
                              value={line.dailyRate}
                              onChange={e => {
                                const updated = [...newTask.crewLines]
                                updated[idx] = { ...updated[idx], dailyRate: Number(e.target.value) || 0 }
                                setNewTask(prev => ({ ...prev, crewLines: updated }))
                              }}
                              style={{ width: '65px', padding: '3px', fontSize: '0.82rem' }}
                            />
                          </div>
                          {newTask.crewLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewTask(prev => ({
                                  ...prev,
                                  crewLines: prev.crewLines.filter((_, i) => i !== idx)
                                }))
                              }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                              title="Quitar"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="oxi-btn-back-classic"
                      onClick={() => {
                        const firstCat = laborCategories[0] || { role: 'Oficial', dailyRate: 2800 }
                        setNewTask(prev => ({
                          ...prev,
                          crewLines: [
                            ...(prev.crewLines || []),
                            { role: firstCat.role, count: 1, dailyRate: firstCat.dailyRate }
                          ]
                        }))
                      }}
                      style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#059669', borderColor: '#10b981' }}
                    >
                      ＋ Agregar Operario a la Cuadrilla
                    </button>
                  </div>
                )}

                {newTask.crewMode === 'single' && (
                  <div className="form-row">
                    <label>
                      Categoría de Personal
                      <select
                        value={newTask.category}
                        onChange={e => {
                          const cat = laborCategories.find(c => c.role === e.target.value)
                          setNewTask({
                            ...newTask,
                            category: e.target.value,
                            categoryRate: cat ? cat.dailyRate : newTask.categoryRate
                          })
                        }}
                      >
                        {laborCategories.filter(c => c.active !== false).map(c => (
                          <option key={c.id || c.role} value={c.role}>
                            {c.role} {c.categoryCode ? `(${c.categoryCode})` : ''} - ${Number(c.dailyRate).toLocaleString('es-UY')}/d
                          </option>
                        ))}
                      </select>
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
                )}
              </div>

              {(() => {
                const isCrew = newTask.crewMode === 'template' || newTask.crewMode === 'custom'
                const crewToCalc = isCrew ? newTask.crewLines : null
                const laborCalcResult = calculateTaskLaborAndSocial({
                  workDays: Number(newTask.workDays) || 16,
                  crewLines: crewToCalc,
                  peopleCount: newTask.peopleCount,
                  categoryRate: newTask.categoryRate,
                  category: newTask.category,
                  socialLawsCost: newTask.socialLawsCost,
                  customSocialLaws: newTask.socialLawsCost !== '' && newTask.socialLawsCost != null
                }, { socialLawsRate: projectSocialLawsRate, laborCategories })

                const laborCalc = laborCalcResult.laborCost
                const socialCalc = laborCalcResult.socialLawsCost
                const isCustom = laborCalcResult.isCustomSocial
                const effSocialRate = laborCalcResult.effectiveSocialRate
                const effSocialPct = Math.round(effSocialRate * 100)
                const activeCat = laborCategories.find(c => c.role === newTask.category || c.id === newTask.category)
                const totalPeopleCount = isCrew ? laborCalcResult.peopleCount : (Number(newTask.peopleCount) || 1)
                const dailyCrewCost = laborCalcResult.dailyCost

                const selectedPartida = budgetItems.find(p => p.id === newTask.linkedPartidaId)
                const partidaAudit = selectedPartida ? budgetAudit.itemAudits.find(a => a.itemId === selectedPartida.id) : null
                const currentAssignedPct = partidaAudit ? partidaAudit.totalAssignedPercent : 0
                const willExceed = newTask.materialMode === 'partida' && selectedPartida && (currentAssignedPct + (newTask.partidaAssignMode === 'percent' ? Number(newTask.partidaAssignValue || 100) : ((Number(newTask.partidaAssignValue || 1) / (selectedPartida.quantity || 1)) * 100))) > 100

                const matCalc = Number(newTask.materialCost) || 0
                const totalTaskCalc = laborCalc + socialCalc + matCalc
                const dist = distributeCostByMonths(newTask.startDate, newTask.endDate, totalTaskCalc)

                return (
                  <>
                    {/* Sección Punto 4: Estimación y Vinculación de Materiales */}
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📦 Estimación de Materiales (Punto 4)
                        </strong>
                        <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const p = budgetItems[0]
                              setNewTask(prev => {
                                const calc = p ? calculateTaskMaterialCostFromPartida(p, { mode: 'percent', value: 100 }) : { materialCost: 0, description: '' }
                                return {
                                  ...prev,
                                  materialMode: 'partida',
                                  linkedPartidaId: p ? p.id : '',
                                  partidaAssignMode: 'percent',
                                  partidaAssignValue: 100,
                                  materialCost: calc.materialCost,
                                  partidaDescription: calc.description
                                }
                              })
                            }}
                            style={{
                              border: 'none',
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: newTask.materialMode === 'partida' ? '#2563eb' : 'transparent',
                              color: newTask.materialMode === 'partida' ? '#ffffff' : '#475569'
                            }}
                          >
                            🔗 Vincular a Partida
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewTask(prev => ({ ...prev, materialMode: 'manual' }))}
                            style={{
                              border: 'none',
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: newTask.materialMode === 'manual' ? '#ea580c' : 'transparent',
                              color: newTask.materialMode === 'manual' ? '#ffffff' : '#475569'
                            }}
                          >
                            ✍️ Carga Manual
                          </button>
                        </div>
                      </div>

                      {newTask.materialMode === 'partida' ? (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
                            <div>
                              <label style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>Partida del Presupuesto</label>
                              <select
                                value={newTask.linkedPartidaId || ''}
                                onChange={e => {
                                  const pId = e.target.value
                                  const p = budgetItems.find(item => item.id === pId)
                                  if (p) {
                                    const calc = calculateTaskMaterialCostFromPartida(p, { mode: newTask.partidaAssignMode, value: newTask.partidaAssignValue })
                                    setNewTask(prev => ({
                                      ...prev,
                                      linkedPartidaId: pId,
                                      materialCost: calc.materialCost,
                                      partidaDescription: calc.description
                                    }))
                                  } else {
                                    setNewTask(prev => ({ ...prev, linkedPartidaId: '', partidaDescription: '', materialCost: 0 }))
                                  }
                                }}
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              >
                                <option value="">-- Seleccionar partida del presupuesto --</option>
                                {budgetItems.map(item => (
                                  <option key={item.id} value={item.id}>
                                    [{item.code}] {item.rubroName ? `${item.rubroName.split('.')[1] || item.rubroName} • ` : ''}{item.name} ({formatMoney(item.totalMaterialCost)} • {item.quantity} {item.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>Asignar por</label>
                              <select
                                value={newTask.partidaAssignMode || 'percent'}
                                onChange={e => {
                                  const newMode = e.target.value
                                  const p = budgetItems.find(item => item.id === newTask.linkedPartidaId)
                                  const newVal = newMode === 'percent' ? 100 : (p ? p.quantity : 1)
                                  const calc = calculateTaskMaterialCostFromPartida(p, { mode: newMode, value: newVal })
                                  setNewTask(prev => ({
                                    ...prev,
                                    partidaAssignMode: newMode,
                                    partidaAssignValue: newVal,
                                    materialCost: calc.materialCost,
                                    partidaDescription: calc.description
                                  }))
                                }}
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              >
                                <option value="percent">% Porcentaje (0–100%)</option>
                                <option value="quantity">Metrado / Cantidad Física</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                                {newTask.partidaAssignMode === 'quantity' ? `Cantidad (${selectedPartida?.unit || 'un'})` : '% Asignado'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={newTask.partidaAssignMode === 'percent' ? 200 : undefined}
                                step={newTask.partidaAssignMode === 'percent' ? 5 : 1}
                                value={newTask.partidaAssignValue}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0
                                  const p = budgetItems.find(item => item.id === newTask.linkedPartidaId)
                                  const calc = calculateTaskMaterialCostFromPartida(p, { mode: newTask.partidaAssignMode, value: val })
                                  setNewTask(prev => ({
                                    ...prev,
                                    partidaAssignValue: val,
                                    materialCost: calc.materialCost,
                                    partidaDescription: calc.description
                                  }))
                                }}
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                          </div>

                          {selectedPartida && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px 12px', fontSize: '0.82rem', color: '#1e40af' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>
                                  <strong>✓ Esta tarea toma de:</strong> {selectedPartida.rubroName} — partida [{selectedPartida.code}] {selectedPartida.name}
                                </span>
                                <strong style={{ color: '#1d4ed8' }}>{formatMoney(newTask.materialCost)}</strong>
                              </div>
                              <small style={{ color: '#3b82f6', display: 'block', marginTop: '2px' }}>
                                Consumo asignado: {newTask.partidaAssignMode === 'percent' ? `${newTask.partidaAssignValue}%` : `${newTask.partidaAssignValue} ${selectedPartida.unit}`} del total presupuestado ({formatMoney(selectedPartida.totalMaterialCost)} • {selectedPartida.quantity} {selectedPartida.unit})
                              </small>
                            </div>
                          )}

                          {willExceed && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 10px', marginTop: '6px', fontSize: '0.78rem', color: '#b91c1c' }}>
                              ⚠️ <strong>Alerta de Sobreasignación:</strong> Esta partida ya tenía {currentAssignedPct}% asignado en otras tareas. Con esta asignación superará el 100% presupuestado.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px', alignItems: 'center' }}>
                            <div>
                              <label style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>Costo Estimado Materiales ($)</label>
                              <input
                                type="number"
                                min="0"
                                value={newTask.materialCost}
                                onChange={e => setNewTask(prev => ({ ...prev, materialCost: e.target.value }))}
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.88rem', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#9a3412', background: '#fff7ed', border: '1px solid #ffedd5', padding: '6px 10px', borderRadius: '6px' }}>
                              ⚠️ <strong>Estimación Manual:</strong> Marcado como costo sin presupuesto formal vinculado.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-row">
                      <label>
                        Leyes Sociales ($)
                        <input
                          type="number"
                          min="0"
                          value={newTask.socialLawsCost}
                          onChange={e => setNewTask({ ...newTask, socialLawsCost: e.target.value })}
                          placeholder={`Automático (${effSocialPct}%): $${Math.round(laborCalc * effSocialRate).toLocaleString('es-UY')}`}
                          title="Leyes sociales automáticas o monto manual para esta tarea"
                        />
                        <small style={{ color: isCustom ? '#ea580c' : '#059669', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                          {isCustom ? '✍️ Monto manual fijado por el usuario' : `✓ Calculado al ${effSocialPct}% ${activeCat?.socialLawsRate ? '(específico puesto)' : '(tasa obra)'}`}
                        </small>
                      </label>
                      <div style={{ flex: 1, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 'bold' }}>
                            Avance Programado (Automático)
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#15803d', cursor: 'help' }} title="Calculado linealmente según los días hábiles transcurridos respecto a la fecha actual">ⓘ</span>
                        </div>
                        <strong style={{ fontSize: '1rem', color: '#15803d', display: 'block', marginTop: '2px' }}>
                          {calculateTaskPlannedPercent({ startDate: newTask.startDate, endDate: newTask.endDate })}%
                        </strong>
                        <small style={{ fontSize: '0.72rem', color: '#16a34a' }}>
                          Derivado de calendario y días hábiles
                        </small>
                      </div>
                    </div>

                    <div className="form-row">
                      <label>
                        Avance ya ejecutado a la fecha de carga (%)
                        <span style={{ fontSize: '0.74rem', color: '#64748b', cursor: 'help', marginLeft: '4px' }} title="Si la obra ya está iniciada, ingresá el % físico completado. Si la tarea aún no arrancó en campo, dejalo en 0%">ⓘ</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newTask.initialProgressPercent}
                          onChange={e => setNewTask({ ...newTask, initialProgressPercent: Number(e.target.value) || 0 })}
                        />
                        <small style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px', display: 'block' }}>
                          Solo para obras en ejecución previa. Tareas nuevas inician en 0%.
                        </small>
                      </label>
                      <div />
                    </div>

                    <div style={{ background: '#f8f5ef', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '14px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#737373', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Desglose de Costos de la Tarea:</span>
                      <div style={{ display: 'grid', gap: '4px' }}>
                        <div>
                          <span style={{ color: '#525252' }}>• Mano de Obra: </span>
                          <strong>{formatMoney(laborCalc)}</strong>
                          <small style={{ color: '#737373', marginLeft: '6px' }}>({totalPeopleCount} operarios · {formatMoney(dailyCrewCost)}/d × {newTask.workDays} d hábiles)</small>
                        </div>
                        <div>
                          <span style={{ color: '#525252' }}>• Leyes Sociales (BPS): </span>
                          <strong>{formatMoney(socialCalc)}</strong>
                          <small style={{ color: '#737373', marginLeft: '6px' }}>
                            {isCustom ? '(personalizado manual)' : `(base ${effSocialPct}%${activeCat?.socialLawsRate ? ' del puesto' : ' de obra'})`}
                          </small>
                        </div>
                        <div>
                          <span style={{ color: '#525252' }}>• Costo Materiales: </span>
                          <strong>{formatMoney(matCalc)}</strong>
                        </div>
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #d4d4d4', color: '#ea580c', fontSize: '0.92rem' }}>
                          <span>Presupuesto Total Estimado Tarea: </span>
                          <strong>{formatMoney(totalTaskCalc)}</strong>
                        </div>

                        {dist.breakdown && dist.breakdown.length > 1 && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '0.82rem' }}>
                            <span style={{ color: '#1e40af', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              📊 Distribución Proporcional por Meses ({dist.totalWorkDays} días hábiles):
                            </span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {dist.breakdown.map(b => (
                                <span key={b.key} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', color: '#1e3a8a' }}>
                                  <strong>{b.monthLabel}:</strong> {formatMoney(b.cost)} <small style={{ color: '#64748b' }}>({b.workDays}d • {b.percent}%)</small>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {Number(newTask.progressPercent) > 0 && (
                          <div style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '3px' }}>
                            <span>Costo Ejecutado Inicial ({newTask.progressPercent}%): </span>
                            <strong>
                              {formatMoney(Math.round(totalTaskCalc * (Math.min(100, Math.max(0, Number(newTask.progressPercent))) / 100)))}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* SECCIÓN MODO DE COSTO REAL CONTABLE */}
              {(() => {
                const existingTask = editingTaskId ? schedule.find(t => t.id === editingTaskId) : null
                const taskDetails = existingTask ? calculateTaskActualCost(existingTask, {
                  laborReports,
                  materialInvoices,
                  socialLawsRate: projectSocialLawsRate,
                  laborCategories
                }) : null

                return (
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💰</span>
                        <span>Cómputo de Costo Real Devengado</span>
                      </span>
                      <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                        <button
                          type="button"
                          onClick={() => setNewTask(prev => ({ ...prev, actualCostMode: 'auto' }))}
                          style={{
                            border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                            background: newTask.actualCostMode === 'auto' || !newTask.actualCostMode ? '#0284c7' : 'transparent',
                            color: newTask.actualCostMode === 'auto' || !newTask.actualCostMode ? '#ffffff' : '#475569'
                          }}
                        >
                          Auto (Imputado o %)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTask(prev => ({ ...prev, actualCostMode: 'percent' }))}
                          style={{
                            border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                            background: newTask.actualCostMode === 'percent' ? '#2563eb' : 'transparent',
                            color: newTask.actualCostMode === 'percent' ? '#ffffff' : '#475569'
                          }}
                        >
                          % Avance
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTask(prev => ({ ...prev, actualCostMode: 'manual', actualIncurredCost: prev.actualIncurredCost || (taskDetails?.actualCost || 0) }))}
                          style={{
                            border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                            background: newTask.actualCostMode === 'manual' ? '#ea580c' : 'transparent',
                            color: newTask.actualCostMode === 'manual' ? '#ffffff' : '#475569'
                          }}
                        >
                          Manual ($)
                        </button>
                      </div>
                    </div>

                    {taskDetails && taskDetails.totalImputed > 0 && (
                      <div style={{ fontSize: '0.78rem', color: '#0369a1', background: '#e0f2fe', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px' }}>
                        <strong>Comprobantes vinculados a esta tarea:</strong> MO Partes diarios: <strong>{formatMoney(taskDetails.imputedLabor)}</strong> • Materiales facturas: <strong>{formatMoney(taskDetails.imputedMaterials)}</strong> (Total imputado: <strong>{formatMoney(taskDetails.totalImputed)}</strong>)
                      </div>
                    )}

                    {newTask.actualCostMode === 'manual' ? (
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155' }}>
                        Monto Real Devengado a la Fecha ($ UYU)
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="Ej: 380000"
                          value={newTask.actualIncurredCost}
                          onChange={e => setNewTask(prev => ({ ...prev, actualIncurredCost: e.target.value }))}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fdba74', background: '#fff7ed', fontWeight: 'bold', fontSize: '0.85rem' }}
                        />
                        <small style={{ color: '#c2410c', display: 'block', marginTop: '2px' }}>
                          Fija el costo real contable exacto con sobrecostos o ahorros sin depender del % de avance teórico.
                        </small>
                      </label>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                        {newTask.actualCostMode === 'percent'
                          ? 'El costo ejecutado se calculará estrictamente como el % de avance certificado multiplicado por el presupuesto de la tarea.'
                          : 'Toma la suma de partes diarios y facturas de materiales imputadas a esta tarea. Si aún no hay comprobantes, calcula automáticamente por % certificado.'}
                      </p>
                    )}
                  </div>
                )
              })()}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowAddTaskModal(false); setEditingTaskId(null) }}>
                  Cancelar
                </button>
                <button type="submit" className="oxi-btn-primary">
                  {editingTaskId ? 'Guardar Cambios de la Tarea' : 'Agregar Tarea al Cronograma'}
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

              {/* Selector de Alcance de la Postergación */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', margin: '8px 0' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  ¿Qué tareas deseas postergar por este evento?
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="radio"
                      name="rainScope"
                      checked={rainForm.affectAll === true}
                      onChange={() => {
                        const allIds = previewShiftedTasks.map(t => t.id)
                        setRainForm(prev => ({ ...prev, affectAll: true, selectedTaskIds: allIds }))
                      }}
                    />
                    <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0f172a' }}>
                      Todas las tareas activas y futuras
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="radio"
                      name="rainScope"
                      checked={rainForm.affectAll === false}
                      onChange={() => {
                        setRainForm(prev => ({ ...prev, affectAll: false }))
                      }}
                    />
                    <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0f172a' }}>
                      Seleccionar tareas específicas (ej. intemperie)
                    </span>
                  </label>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={rainForm.cascadeDependencies !== false}
                      onChange={e => setRainForm(prev => ({ ...prev, cascadeDependencies: e.target.checked }))}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                      🔗 <strong>Empujar sucesoras dependientes en cascada (CPM)</strong>: si una tarea postergada tiene sucesoras vinculadas, empujarlas para preservar la secuencia lógica de obra.
                    </span>
                  </label>
                </div>
              </div>

              {/* Live Preview & Selective Checklist */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#0369a1' }}>
                    Tareas del Cronograma ({previewShiftedTasks.filter(t => t.selected).length} seleccionadas de {previewShiftedTasks.length}):
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      onClick={() => {
                        const allIds = previewShiftedTasks.map(t => t.id)
                        setRainForm(prev => ({ ...prev, affectAll: true, selectedTaskIds: allIds }))
                      }}
                    >
                      Marcar todas
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      onClick={() => {
                        setRainForm(prev => ({ ...prev, affectAll: false, selectedTaskIds: [] }))
                      }}
                    >
                      Desmarcar todas
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#737373', marginLeft: '4px' }}>+{rainForm.days}d hábiles</span>
                  </div>
                </div>

                {previewShiftedTasks.length === 0 ? (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', color: '#737373', fontSize: '0.82rem', textAlign: 'center' }}>
                    No se encontraron tareas activas o posteriores a la fecha {rainForm.date}.
                  </div>
                ) : (
                  <div className="rain-preview-box" style={{ maxHeight: '230px', overflowY: 'auto' }}>
                    {previewShiftedTasks.map(t => {
                      const isChecked = Boolean(t.selected)
                      return (
                        <div
                          key={t.id}
                          className="rain-preview-item"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            background: isChecked ? '#f0f9ff' : '#f8fafc',
                            borderLeft: isChecked ? '3px solid #0284c7' : '3px solid #cbd5e1',
                            padding: '6px 10px',
                            marginBottom: '4px',
                            borderRadius: '4px'
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', flex: 1, minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const checked = e.target.checked
                                setRainForm(prev => {
                                  const curSelected = Array.isArray(prev.selectedTaskIds) && !prev.affectAll
                                    ? [...prev.selectedTaskIds]
                                    : previewShiftedTasks.map(x => x.id)
                                  let nextSelected
                                  if (checked) {
                                    nextSelected = Array.from(new Set([...curSelected, t.id]))
                                  } else {
                                    nextSelected = curSelected.filter(id => id !== t.id)
                                  }
                                  const allSelected = nextSelected.length === previewShiftedTasks.length
                                  return {
                                    ...prev,
                                    affectAll: allSelected,
                                    selectedTaskIds: nextSelected
                                  }
                                })
                              }}
                            />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <strong style={{ color: isChecked ? '#0f172a' : '#64748b', fontSize: '0.84rem' }}>{t.name}</strong>
                              {t.isOngoing && (
                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '4px' }}>
                                  En curso
                                </span>
                              )}
                              {t.isCascaded && (
                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '4px' }}>
                                  🔗 Cascada
                                </span>
                              )}
                            </div>
                          </label>

                          <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                            {isChecked || t.isCascaded ? (
                              <>
                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginRight: '6px' }}>
                                  {t.oldStart ? t.oldStart.slice(5) : ''} al {t.oldEnd ? t.oldEnd.slice(5) : ''}
                                </span>
                                <strong style={{ color: '#0284c7' }}>
                                  {t.newStart ? t.newStart.slice(5) : ''} al {t.newEnd ? t.newEnd.slice(5) : ''}
                                </strong>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>
                                {t.oldStart ? t.oldStart.slice(5) : ''} al {t.oldEnd ? t.oldEnd.slice(5) : ''} (Sin cambio)
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
                      const effRate = projectSocialLawsRate / 100
                      const soc = newRubro.customSocial ? newRubro.socialLawsCost : Math.round(val * effRate)
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
                    placeholder={`Base ${projectSocialLawsRate}% BPS`}
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
                      : Math.round((Number(newRubro.laborCost) || 0) * (projectSocialLawsRate / 100))) +
                    (Number(newRubro.materialCost) || 0)
                  )}
                </strong>
                <small style={{ color: '#737373', display: 'block', marginTop: '3px' }}>
                  (MO: {formatMoney(Number(newRubro.laborCost) || 0)} + Leyes Sociales: {formatMoney(newRubro.socialLawsCost !== '' && newRubro.socialLawsCost != null ? Number(newRubro.socialLawsCost) : Math.round((Number(newRubro.laborCost) || 0) * (projectSocialLawsRate / 100)))} + Materiales: {formatMoney(Number(newRubro.materialCost) || 0)})
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

      {/* ── MODAL: CERTIFICACIÓN DE AVANCE CON FOTOS E INSPECCIÓN (Paso 4) ── */}
      {showCertModal && certTask && (
        <div className="oxi-modal-backdrop" onClick={() => setShowCertModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.8rem' }}>📸</span>
              <div>
                <h3 style={{ margin: 0 }}>Certificación de Avance e Inspección Técnica</h3>
                <small style={{ color: '#737373' }}>
                  Tarea: <strong>{certTask.name}</strong> ({certTask.startDate} al {certTask.endDate})
                </small>
              </div>
            </div>

            <form onSubmit={handleSaveCertification}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <label>
                  % Avance Físico Certificado (0-100%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={certForm.certifiedPercent}
                    onChange={e => setCertForm({ ...certForm, certifiedPercent: Number(e.target.value) || 0 })}
                    style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#047857' }}
                  />
                </label>

                <label>
                  Fecha de Inspección en Obra
                  <input
                    type="date"
                    required
                    value={certForm.date}
                    onChange={e => setCertForm({ ...certForm, date: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label>
                  Inspector / Responsable Técnico
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Rodrigo Méndez (Director de Obra)"
                    value={certForm.inspector}
                    onChange={e => setCertForm({ ...certForm, inspector: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label>
                  Observaciones Técnicas y Ensayos de Calidad
                  <textarea
                    rows="3"
                    placeholder="Detalle de verificación: armaduras, recubrimientos, ensayos de laboratorio, estanqueidad o replanteo conforme..."
                    value={certForm.notes}
                    onChange={e => setCertForm({ ...certForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Fotos de Evidencia de Inspección ({certForm.photos.length})
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <label className="cert-photo-upload-zone" style={{ flex: '1 1 180px', cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleAddCertPhotos}
                    />
                    <span>📁 Elegir de la galería</span>
                  </label>
                  <label className="cert-photo-upload-zone" style={{ flex: '1 1 180px', cursor: 'pointer', background: 'rgba(234, 88, 12, 0.08)', borderColor: '#ea580c' }}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handleAddCertPhotos}
                    />
                    <span style={{ color: '#ea580c', fontWeight: 600 }}>📸 Tomar foto en obra (Cámara)</span>
                  </label>
                </div>

                {certForm.photos.length > 0 && (
                  <div className="cert-photo-grid">
                    {certForm.photos.map(p => (
                      <div key={p.id} className="cert-photo-thumb">
                        <img
                          src={p.dataUrl}
                          alt={p.name}
                          onClick={() => setSelectedPhotoPreview(p.dataUrl)}
                          title="Clic para ampliar foto"
                        />
                        <button
                          type="button"
                          className="cert-photo-remove"
                          onClick={() => handleRemoveCertPhoto(p.id)}
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historial previo si existe */}
              {Array.isArray(certTask.certifications) && certTask.certifications.length > 0 && (
                <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#475569' }}>
                    Historial de Inspecciones Previas ({certTask.certifications.length})
                  </h4>
                  <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                    {certTask.certifications.map(c => (
                      <div key={c.id} className="cert-history-item">
                        <div className="cert-history-header">
                          <strong style={{ color: '#047857' }}>{c.certifiedPercent}% Certificado</strong>
                          <small style={{ color: '#64748b' }}>{c.date} • {c.inspector}</small>
                        </div>
                        {c.notes && <p style={{ margin: '2px 0 6px', fontSize: '0.8rem', color: '#334155' }}>{c.notes}</p>}
                        {Array.isArray(c.photos) && c.photos.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {c.photos.map((ph, pi) => (
                              <img
                                key={pi}
                                src={ph.dataUrl}
                                alt="Evidencia"
                                onClick={() => setSelectedPhotoPreview(ph.dataUrl)}
                                style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                                title="Ver foto ampliada"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowCertModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="oxi-btn-primary">
                  ✓ Guardar Certificación & Actualizar Avance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AUTO-ONBOARDING DE OBRAS CON IA (Paso 5) ── */}
      {showAiModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2rem' }}>⚡</span>
              <div>
                <h3 style={{ margin: 0 }}>Auto-Onboarding de Obras con Inteligencia Artificial</h3>
                <small style={{ color: '#737373' }}>
                  Generá cronograma Gantt, cuadrillas, leyes sociales BPS (65%) y rubros a partir de pliegos o memorias descriptivas.
                </small>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Plantillas Rápidas:</span>
              <div className="ai-templates-grid">
                <button
                  type="button"
                  className="ai-template-card"
                  onClick={() => setAiPrompt('Edificio Residencial de 4 niveles en Montevideo. Estructura de hormigón armado, mampostería cerámica, instalaciones completas, terminaciones finas y fachada con herrería integral y barandas Óxida.')}
                >
                  <strong>🏢 Edificio Residencial</strong>
                  <small>4 niveles, hormigón, albañilería y herrería de fachada</small>
                </button>
                <button
                  type="button"
                  className="ai-template-card"
                  onClick={() => setAiPrompt('Nave Industrial Logística de 1.200 m² con piso de hormigón pulido, estructura metálica reticulada de acero Óxida, cerramientos de chapa termoacústica e instalación eléctrica trifásica.')}
                >
                  <strong>🏭 Nave Industrial Logística</strong>
                  <small>1.200 m², estructura metálica, pisos y cerramientos</small>
                </button>
                <button
                  type="button"
                  className="ai-template-card"
                  onClick={() => setAiPrompt('Reforma Integral y Ampliación de Local Comercial de 300 m². Demolición, tabiquería de yeso, herrería comercial de frente vidriado, climatización, pisos de porcelanato y pintura general.')}
                >
                  <strong>🏬 Reforma Comercial</strong>
                  <small>300 m², frente vidriado, yeso, pisos y climatización</small>
                </button>
              </div>
            </div>

            <div className="form-row">
              <label>
                Fecha Estimada de Inicio de Obra
                <input
                  type="date"
                  value={aiStartDate}
                  onChange={e => setAiStartDate(e.target.value)}
                />
              </label>
            </div>

            <label style={{ display: 'block', marginTop: '10px' }}>
              Pliego de Condiciones / Memoria Descriptiva / Requerimientos:
              <textarea
                rows="5"
                placeholder="Pegá aquí el texto del pliego, especificaciones de licitación o descripción de la obra a cotizar..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.86rem' }}
              />
            </label>

            {aiError && (
              <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', margin: '10px 0', fontSize: '0.85rem' }}>
                ⚠️ {aiError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="oxi-btn-ai"
                onClick={handleGenerateAiPlan}
                disabled={aiLoading}
                style={{ flex: 1, padding: '10px', fontSize: '0.95rem' }}
              >
                {aiLoading ? '⏳ Analizando Pliego y Generando Plan...' : '✨ Procesar Pliego y Generar Plan con IA'}
              </button>
            </div>

            {aiResult && (
              <div className="ai-preview-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#166534' }}>✓ Plan de Obra Generado</h4>
                  <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {aiResult.source === 'openai' ? '🧠 Modelo OpenAI' : '⚡ Heurística Experta'}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: '#14532d' }}>
                  {aiResult.summary}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <small style={{ color: '#4b5563', display: 'block' }}>Tareas</small>
                    <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{aiResult.tasks?.length || 0}</strong>
                  </div>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <small style={{ color: '#4b5563', display: 'block' }}>Rubros</small>
                    <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{aiResult.rubros?.length || 0}</strong>
                  </div>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <small style={{ color: '#4b5563', display: 'block' }}>Presupuesto Estimado</small>
                    <strong style={{ fontSize: '1.05rem', color: '#047857' }}>
                      {formatMoney(aiResult.tasks?.reduce((sum, t) => sum + (t.assignedLaborCost || 0) + (t.socialLawsCost || 0) + (t.materialCost || 0), 0) || 0)}
                    </strong>
                  </div>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Tarea</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Plazo</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Cuadrilla</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(aiResult.tasks || []).map((t, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px' }}><strong>{t.name}</strong></td>
                          <td style={{ padding: '6px 8px' }}>{t.startDate} al {t.endDate}</td>
                          <td style={{ padding: '6px 8px' }}>{t.peopleCount}x {t.category}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                            {formatMoney((t.assignedLaborCost || 0) + (t.socialLawsCost || 0) + (t.materialCost || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="oxi-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleApplyAiPlan('replace')}
                  >
                    🚀 Reemplazar y Cargar en Cronograma
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ flex: 1 }}
                    onClick={() => handleApplyAiPlan('append')}
                  >
                    ➕ Anexar a Tareas Actuales
                  </button>
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="btn-cancel" onClick={() => setShowAiModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIGURACIÓN DE CATEGORÍAS & LAUDOS SUNCA (Punto 1) ── */}
      {showCategoriesModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowCategoriesModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '840px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.28rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚙️</span> Configuración de Categorías Laborales & Laudos SUNCA
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  Administrá las categorías salariales de tu empresa u obra (Grupo 9 Construcción Uruguay) con jornales y vigencia temporal.
                </p>
              </div>
              <button
                type="button"
                className="btn-cancel"
                style={{ padding: '4px 10px', fontSize: '1.2rem', lineHeight: 1 }}
                onClick={() => setShowCategoriesModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Tasa General de Leyes Sociales (Obra / Empresa)</strong>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Porcentaje base sobre mano de obra directa (Uruguay Grupo 9 SUNCA / BPS ~60%, configurable según país/obra). Aplica a todas las tareas salvo excepción por puesto o sobreescritura manual.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Tasa General:</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={projectSocialLawsRate}
                  onChange={e => {
                    const val = Number(e.target.value) || 0
                    setProjectSocialLawsRate(val)
                    try {
                      localStorage.setItem(`${storageKey}_social_rate`, String(val))
                    } catch {}
                  }}
                  style={{ width: '58px', padding: '4px 6px', fontSize: '0.92rem', fontWeight: 'bold', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <strong style={{ color: '#0f172a' }}>%</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.83rem', color: '#334155', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <div>
                <strong>Vigencia Temporal de Laudos:</strong> Los ajustes de jornal aplican a partir de la fecha seleccionada. Las tareas finalizadas o certificadas en meses anteriores conservan su costo histórico para preservar la trazabilidad contable.
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table className="oxi-pro-table" style={{ fontSize: '0.86rem', margin: 0 }}>
                <thead>
                  <tr>
                    <th>Categoría / Puesto</th>
                    <th>Nivel SUNCA</th>
                    <th>Jornal Diario ($UYU)</th>
                    <th>% Leyes Soc.</th>
                    <th>Vigencia Desde</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {laborCategories.map(cat => (
                    <tr key={cat.id || cat.role} style={{ opacity: cat.active === false ? 0.55 : 1 }}>
                      <td>
                        <strong>{cat.role}</strong>
                        {cat.description && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{cat.description}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '3px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          {cat.categoryCode || 'Cat.'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>$</span>
                          <input
                            type="number"
                            min="500"
                            step="50"
                            value={cat.dailyRate}
                            onChange={e => handleUpdateCategoryRate(cat.id, 'dailyRate', e.target.value)}
                            title="Editar jornal diario"
                            style={{
                              width: '105px',
                              padding: '5px 8px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            placeholder={`${projectSocialLawsRate}%`}
                            value={cat.socialLawsRate != null ? cat.socialLawsRate : ''}
                            onChange={e => handleUpdateCategoryRate(cat.id, 'socialLawsRate', e.target.value)}
                            title="Porcentaje de leyes sociales específico para esta categoría (dejar vacío para usar el general de la obra)"
                            style={{
                              width: '60px',
                              padding: '4px 6px',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>%</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={cat.effectiveDate || '2026-07-01'}
                          onChange={e => handleUpdateCategoryRate(cat.id, 'effectiveDate', e.target.value)}
                          title="Fecha desde la cual entra en vigencia esta tarifa"
                          style={{ padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleCategoryActive(cat.id)}
                          title={cat.active !== false ? 'Desactivar puesto' : 'Activar puesto'}
                          style={{
                            border: 'none',
                            borderRadius: '12px',
                            padding: '3px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: cat.active !== false ? '#dcfce7' : '#fee2e2',
                            color: cat.active !== false ? '#15803d' : '#b91c1c'
                          }}
                        >
                          {cat.active !== false ? '✓ Activa' : '✕ Inactiva'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {cat.id?.startsWith('cat_') ? (
                          <button
                            type="button"
                            onClick={() => handleSaveLaborCategories(laborCategories.filter(c => c.id !== cat.id))}
                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                            title="Eliminar categoría personalizada"
                          >
                            🗑️
                          </button>
                        ) : (
                          <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Oficial</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formulario para agregar puesto personalizado */}
            <form onSubmit={handleAddCategory} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                ➕ Agregar Categoría o Puesto Personalizado:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.1fr 1fr 1.1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>Puesto / Denominación</label>
                  <input
                    required
                    placeholder="Ej. Herrero Especializado"
                    value={newCategoryForm.role}
                    onChange={e => setNewCategoryForm({ ...newCategoryForm, role: e.target.value })}
                    style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>Código SUNCA</label>
                  <input
                    placeholder="Cat. V"
                    value={newCategoryForm.categoryCode}
                    onChange={e => setNewCategoryForm({ ...newCategoryForm, categoryCode: e.target.value })}
                    style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>Jornal ($UYU)</label>
                  <input
                    type="number"
                    required
                    min="500"
                    value={newCategoryForm.dailyRate}
                    onChange={e => setNewCategoryForm({ ...newCategoryForm, dailyRate: e.target.value })}
                    style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>% LLSS (opcional)</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    placeholder={`${projectSocialLawsRate}%`}
                    value={newCategoryForm.socialLawsRate}
                    onChange={e => setNewCategoryForm({ ...newCategoryForm, socialLawsRate: e.target.value })}
                    title={`Porcentaje de leyes sociales específico para esta categoría. Si se omite, usa el ${projectSocialLawsRate}% de la obra.`}
                    style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>Vigencia Desde</label>
                  <input
                    type="date"
                    required
                    value={newCategoryForm.effectiveDate}
                    onChange={e => setNewCategoryForm({ ...newCategoryForm, effectiveDate: e.target.value })}
                    style={{ padding: '6px 8px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
                <button type="submit" className="oxi-btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  ＋ Agregar
                </button>
              </div>
            </form>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleRestoreDefaultCategories}
                style={{ color: '#ea580c', borderColor: '#fdba74', fontSize: '0.85rem' }}
                title="Restablece los laudos del Grupo 9 oficiales de la industria"
              >
                🔄 Restaurar Laudos Oficiales SUNCA
              </button>
              <button
                type="button"
                className="oxi-btn-primary"
                onClick={() => setShowCategoriesModal(false)}
              >
                ✓ Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PRESUPUESTO DE OBRA, PARTIDAS & IMPORTACIÓN EXCEL/CSV (PUNTO 4) ── */}
      {showBudgetModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowBudgetModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '920px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                  <span>📦</span> Presupuesto de Obra, Partidas & Estimación de Materiales
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Importá presupuestos desde Excel/CSV, auditá asignaciones entre tareas y vinculá consumos reales por metrado o porcentaje.
                </p>
              </div>
              <button
                type="button"
                className="btn-cancel"
                style={{ padding: '4px 10px', fontSize: '1.2rem', lineHeight: 1 }}
                onClick={() => setShowBudgetModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs inside modal */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #cbd5e1', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setBudgetModalTab('items')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: budgetModalTab === 'items' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                  color: budgetModalTab === 'items' ? '#1d4ed8' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                📋 Partidas del Presupuesto ({budgetItems.length})
              </button>
              <button
                type="button"
                onClick={() => setBudgetModalTab('import')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: budgetModalTab === 'import' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                  color: budgetModalTab === 'import' ? '#1d4ed8' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                📥 Importar Excel / CSV
              </button>
              <button
                type="button"
                onClick={() => setBudgetModalTab('audit')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: budgetModalTab === 'audit' ? '2px solid #ea580c' : '2px solid transparent',
                  background: 'transparent',
                  color: budgetModalTab === 'audit' ? '#c2410c' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔍 Auditoría de Asignación {budgetAudit.hasOverallocations && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: '0.72rem' }}>!</span>}
              </button>
            </div>

            {/* TAB 1: Items List */}
            {budgetModalTab === 'items' && (
              <>
                <div className="table-responsive" style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <table className="oxi-pro-table" style={{ fontSize: '0.84rem', margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Rubro & Partida</th>
                        <th>Cantidad / Un.</th>
                        <th>Costo Unit. Mat</th>
                        <th>Total Materiales</th>
                        <th>Total Partida</th>
                        <th>% Asignado</th>
                        <th style={{ textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetItems.map(item => {
                        const audit = budgetAudit.itemAudits.find(a => a.itemId === item.id)
                        const assignedPct = audit ? audit.totalAssignedPercent : 0
                        const isOver = assignedPct > 100
                        const isUnassigned = assignedPct === 0
                        return (
                          <tr key={item.id} style={{ background: isOver ? '#fff7ed' : 'transparent' }}>
                            <td>
                              <span style={{ fontWeight: 'bold', color: '#1e40af', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                                {item.code}
                              </span>
                            </td>
                            <td>
                              <strong>{item.name}</strong>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.rubroName}</div>
                            </td>
                            <td>{item.quantity} {item.unit}</td>
                            <td>{formatMoney(item.unitMaterialCost)}</td>
                            <td><strong>{formatMoney(item.totalMaterialCost)}</strong></td>
                            <td>{formatMoney(item.totalBudget)}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: isOver ? '#fee2e2' : isUnassigned ? '#f1f5f9' : '#dcfce7',
                                color: isOver ? '#b91c1c' : isUnassigned ? '#64748b' : '#15803d'
                              }}>
                                {isOver ? `⚠️ ${assignedPct}%` : isUnassigned ? '0% (Sin asignar)' : `${assignedPct}%`}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteBudgetItem(item.id)}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.95rem' }}
                                title="Eliminar partida del presupuesto"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Quick Add Partida */}
                <form onSubmit={handleAddBudgetItem} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.84rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    ➕ Agregar Partida Individual al Presupuesto:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1.2fr auto', gap: '8px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Código</label>
                      <input
                        placeholder="05.03"
                        value={newBudgetItemForm.code}
                        onChange={e => setNewBudgetItemForm({ ...newBudgetItemForm, code: e.target.value })}
                        style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Nombre de Partida</label>
                      <input
                        required
                        placeholder="Ej: Aislación hidrófuga doble capa"
                        value={newBudgetItemForm.name}
                        onChange={e => setNewBudgetItemForm({ ...newBudgetItemForm, name: e.target.value })}
                        style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Unidad</label>
                      <input
                        placeholder="m²"
                        value={newBudgetItemForm.unit}
                        onChange={e => setNewBudgetItemForm({ ...newBudgetItemForm, unit: e.target.value })}
                        style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Cantidad</label>
                      <input
                        type="number"
                        min="0"
                        value={newBudgetItemForm.quantity}
                        onChange={e => setNewBudgetItemForm({ ...newBudgetItemForm, quantity: e.target.value })}
                        style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Costo Unit. Mat ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={newBudgetItemForm.unitMaterialCost}
                        onChange={e => setNewBudgetItemForm({ ...newBudgetItemForm, unitMaterialCost: e.target.value })}
                        style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>
                    <button type="submit" className="oxi-btn-primary" style={{ padding: '7px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      ＋ Agregar
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* TAB 2: Import from Excel / CSV */}
            {budgetModalTab === 'import' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', fontSize: '0.82rem', color: '#334155' }}>
                  <strong>💡 ¿Cómo importar desde Excel o Google Sheets?</strong>
                  <p style={{ margin: '4px 0 0', lineHeight: 1.4 }}>
                    Podés seleccionar y copiar directamente las celdas de tu planilla (Ctrl+C / Cmd+C) y pegarlas en el recuadro inferior, o subir un archivo CSV / TSV. El motor detecta automáticamente columnas como: <em>Código, Rubro, Partida, Unidad, Cantidad, Costo Unitario y Total Materiales</em>.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                    📁 Subir archivo CSV / TSV:
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleSpreadsheetFileUpload}
                      style={{ marginLeft: '8px', fontSize: '0.8rem' }}
                    />
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    O pegá directamente el texto copiado de Excel / Google Sheets:
                  </label>
                  <textarea
                    rows={6}
                    value={importPasteText}
                    onChange={e => setImportPasteText(e.target.value)}
                    placeholder="Pegá aquí tus celdas de Excel... (ej. Código	Rubro	Partida	Unidad	Cantidad	Costo Unit	Total Mat)"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="oxi-btn-primary"
                      onClick={handlePreviewSpreadsheet}
                      style={{ fontSize: '0.84rem', padding: '6px 14px' }}
                    >
                      🔍 Previsualizar Partidas
                    </button>
                    {importPasteText && (
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => { setImportPasteText(''); setImportPreviewResult(null) }}
                        style={{ fontSize: '0.84rem' }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {/* Import Preview */}
                {importPreviewResult && (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                    {importPreviewResult.success ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <strong style={{ color: '#15803d', fontSize: '0.9rem' }}>
                            ✓ Se detectaron {importPreviewResult.items.length} partidas válidas para incorporar:
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#475569' }}>
                              <input
                                type="radio"
                                name="importMode"
                                value="append"
                                checked={importMode === 'append'}
                                onChange={() => setImportMode('append')}
                              /> Anexar a existentes
                            </label>
                            <label style={{ fontSize: '0.8rem', color: '#475569' }}>
                              <input
                                type="radio"
                                name="importMode"
                                value="replace"
                                checked={importMode === 'replace'}
                                onChange={() => setImportMode('replace')}
                              /> Reemplazar presupuesto
                            </label>
                          </div>
                        </div>

                        <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                          <table className="oxi-pro-table" style={{ fontSize: '0.78rem', margin: 0 }}>
                            <thead>
                              <tr>
                                <th>Cód.</th>
                                <th>Rubro</th>
                                <th>Partida</th>
                                <th>Unidad</th>
                                <th>Cantidad</th>
                                <th>Costo Unit.</th>
                                <th>Total Mat.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importPreviewResult.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td><strong>{item.code}</strong></td>
                                  <td>{item.rubroName}</td>
                                  <td>{item.name}</td>
                                  <td>{item.unit}</td>
                                  <td>{item.quantity}</td>
                                  <td>{formatMoney(item.unitMaterialCost)}</td>
                                  <td><strong>{formatMoney(item.totalMaterialCost)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                          <button
                            type="button"
                            className="oxi-btn-primary"
                            onClick={handleImportAndGenerateGantt}
                            style={{ fontSize: '0.88rem', padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            ⚡ Generar Cronograma Gantt + Rubros automáticamente
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleConfirmImportBudget}
                            style={{ fontSize: '0.88rem', padding: '8px 16px', border: '1px solid #cbd5e1' }}
                          >
                            ✓ Solo Incorporar Partidas
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
                        ⚠️ {importPreviewResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Allocation Audit */}
            {budgetModalTab === 'audit' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>Total Presupuesto Materiales</small>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{formatMoney(budgetAudit.totalBudgetMaterial)}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>Asignado a Tareas</small>
                    <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>{formatMoney(budgetAudit.totalAssignedMaterial)}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>En Estimación Manual</small>
                    <strong style={{ fontSize: '1.1rem', color: '#ea580c' }}>{formatMoney(budgetAudit.totalManualMaterial)}</strong>
                  </div>
                  <div style={{ background: budgetAudit.hasOverallocations ? '#fef2f2' : '#f0fdf4', border: `1px solid ${budgetAudit.hasOverallocations ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '12px' }}>
                    <small style={{ color: budgetAudit.hasOverallocations ? '#b91c1c' : '#15803d', display: 'block' }}>Sobreasignadas (&gt;100%)</small>
                    <strong style={{ fontSize: '1.1rem', color: budgetAudit.hasOverallocations ? '#b91c1c' : '#15803d' }}>
                      {budgetAudit.overallocatedItems.length}
                    </strong>
                  </div>
                </div>

                {budgetAudit.hasOverallocations ? (
                  <div style={{ marginBottom: '14px' }}>
                    <strong style={{ color: '#b91c1c', display: 'block', marginBottom: '6px' }}>🚨 Partidas Asignadas a más del 100%:</strong>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {budgetAudit.overallocatedItems.map(item => (
                        <div key={item.itemId} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', fontSize: '0.84rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#991b1b' }}>[{item.code}] {item.name}</strong>
                            <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                              {item.totalAssignedPercent}% asignado
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 0', color: '#7f1d1d', fontSize: '0.78rem' }}>
                            {item.warning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', color: '#15803d', fontSize: '0.85rem', marginBottom: '14px' }}>
                    ✓ No hay partidas sobreasignadas. Todas las asignaciones están dentro del 100% presupuestado.
                  </div>
                )}

                {budgetAudit.unassignedItems.length > 0 && (
                  <div>
                    <strong style={{ color: '#475569', display: 'block', marginBottom: '6px' }}>
                      ℹ️ Partidas sin Asignar a ninguna Tarea ({budgetAudit.unassignedItems.length}):
                    </strong>
                    <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      <table className="oxi-pro-table" style={{ fontSize: '0.78rem', margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Partida</th>
                            <th>Cantidad</th>
                            <th>Total Materiales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetAudit.unassignedItems.map(item => (
                            <tr key={item.itemId}>
                              <td><strong>{item.code}</strong></td>
                              <td>{item.name}</td>
                              <td>{item.quantity} {item.unit}</td>
                              <td>{formatMoney(item.budgetMaterialCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="oxi-btn-primary"
                onClick={() => setShowBudgetModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PARTE DIARIO DE MANO DE OBRA (MO - PUNTO 5) ── */}
      {showLaborReportModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowLaborReportModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '620px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📱</span>
                  <span>Parte Diario de Mano de Obra en Obra</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Carga rápida desde celular/tablet: imputación directa de operarios a tareas y conversión automática a jornales y leyes sociales ({projectSocialLawsRate}%).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLaborReportModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLaborReport}>
              <div className="form-row">
                <label>
                  Fecha del Parte
                  <input
                    type="date"
                    required
                    value={laborReportForm.date}
                    onChange={e => setLaborReportForm({ ...laborReportForm, date: e.target.value })}
                  />
                </label>
                <label>
                  Tarea de Obra Imputada
                  <select
                    value={laborReportForm.taskId}
                    onChange={e => setLaborReportForm({ ...laborReportForm, taskId: e.target.value })}
                  >
                    {schedule.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.rubroName || 'Rubro'})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0, fontWeight: 'bold', fontSize: '0.86rem', color: '#1e293b' }}>
                    Cuadrilla de Personal en Campo
                  </label>
                  <button
                    type="button"
                    className="oxi-btn-back-classic"
                    onClick={() => {
                      const firstCat = laborCategories[0] || { role: 'Oficial', dailyRate: 3100 }
                      setLaborReportForm({
                        ...laborReportForm,
                        crew: [
                          ...laborReportForm.crew,
                          { role: firstCat.role, quantity: 1, dailyRate: firstCat.dailyRate }
                        ]
                      })
                    }}
                    style={{ fontSize: '0.74rem', padding: '2px 8px', color: '#059669', borderColor: '#10b981' }}
                  >
                    ＋ Agregar Personal
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {laborReportForm.crew.map((member, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <select
                        value={member.role}
                        onChange={e => {
                          const cat = laborCategories.find(c => c.role === e.target.value)
                          const updated = [...laborReportForm.crew]
                          updated[idx] = {
                            ...updated[idx],
                            role: e.target.value,
                            dailyRate: cat ? cat.dailyRate : updated[idx].dailyRate
                          }
                          setLaborReportForm({ ...laborReportForm, crew: updated })
                        }}
                        style={{ flex: 2, padding: '4px 6px', fontSize: '0.82rem' }}
                      >
                        {laborCategories.filter(c => c.active !== false).map(c => (
                          <option key={c.id || c.role} value={c.role}>
                            {c.role} (${Number(c.dailyRate).toLocaleString('es-UY')}/d)
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Cant:</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={member.quantity}
                          onChange={e => {
                            const updated = [...laborReportForm.crew]
                            updated[idx] = { ...updated[idx], quantity: Math.max(1, Number(e.target.value) || 1) }
                            setLaborReportForm({ ...laborReportForm, crew: updated })
                          }}
                          style={{ width: '48px', padding: '4px', fontSize: '0.82rem', textAlign: 'center' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1.2 }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>$/d:</span>
                        <input
                          type="number"
                          min="0"
                          value={member.dailyRate}
                          onChange={e => {
                            const updated = [...laborReportForm.crew]
                            updated[idx] = { ...updated[idx], dailyRate: Number(e.target.value) || 0 }
                            setLaborReportForm({ ...laborReportForm, crew: updated })
                          }}
                          style={{ width: '70px', padding: '4px', fontSize: '0.82rem' }}
                        />
                      </div>

                      {laborReportForm.crew.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLaborReportForm({
                              ...laborReportForm,
                              crew: laborReportForm.crew.filter((_, i) => i !== idx)
                            })
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                          title="Quitar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vista previa matemática de costo diario */}
              {(() => {
                const costs = calculateLaborReportCost({ crew: laborReportForm.crew, socialLawsRate: projectSocialLawsRate }, projectSocialLawsRate)
                return (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 'bold', display: 'block' }}>CÁLCULO DEL DÍA</span>
                      <strong style={{ fontSize: '1.1rem', color: '#065f46' }}>{formatMoney(costs.totalLaborCost)}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#047857', textAlign: 'right' }}>
                      <div>Jornales: <strong>{costs.totalJournals}</strong> | Mano de Obra: <strong>{formatMoney(costs.laborDirectCost)}</strong></div>
                      <div>Leyes Sociales BPS ({projectSocialLawsRate}%): <strong>{formatMoney(costs.socialLawsCost)}</strong></div>
                    </div>
                  </div>
                )
              })()}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px', color: '#334155' }}>
                  Observaciones Técnicas de Campo
                </label>
                <textarea
                  rows="2"
                  placeholder="Ej. Avance en hormigonado de pilares P1 a P6, clima favorable sin lluvia..."
                  value={laborReportForm.notes}
                  onChange={e => setLaborReportForm({ ...laborReportForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowLaborReportModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#059669', borderColor: '#047857' }}
                >
                  ✓ Guardar Parte Diario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PLANILLA DE PERSONAL Y NÓMINA DE APORTES BPS (LEY 14.411) ── */}
      {showBpsReportModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowBpsReportModal(false)}>
          <div className="oxi-modal-content bps-report-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏛️</span>
                  <span>Planilla de Personal & Nómina de Aportes BPS</span>
                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    Ley 14.411 · SUNCA Grupo 9
                  </span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Cómputo formal de jornales, categorías de laudo, nómina de operarios y liquidación unificada de leyes sociales para auditoría y declaración de BPS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBpsReportModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Barra de metadatos de obra y filtros temporales */}
            <div className="bps-meta-bar">
              <div className="bps-meta-inputs">
                <div className="bps-meta-field">
                  <span>🏢 Registro Obra BPS:</span>
                  <input
                    type="text"
                    value={bpsMeta.bpsWorkRegistry}
                    onChange={e => setBpsMeta({ ...bpsMeta, bpsWorkRegistry: e.target.value })}
                    placeholder="BPS-OBRA-0000"
                    style={{ width: '130px' }}
                  />
                </div>
                <div className="bps-meta-field">
                  <span>📄 RUT Empresa:</span>
                  <input
                    type="text"
                    value={bpsMeta.companyRut}
                    onChange={e => setBpsMeta({ ...bpsMeta, companyRut: e.target.value })}
                    placeholder="21.000.000.0000"
                    style={{ width: '130px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📅 Mes:
                  <select
                    value={bpsFilterMonth}
                    onChange={e => setBpsFilterMonth(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #86efac', fontSize: '0.8rem', background: '#fff' }}
                  >
                    <option value="all">Todo el histórico</option>
                    <option value="2026-10">Octubre 2026</option>
                    <option value="2026-09">Septiembre 2026</option>
                    <option value="2026-08">Agosto 2026</option>
                  </select>
                </label>

                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⏱️ Quincena:
                  <select
                    value={bpsFilterQuincena}
                    onChange={e => setBpsFilterQuincena(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #86efac', fontSize: '0.8rem', background: '#fff' }}
                  >
                    <option value="all">Mes completo</option>
                    <option value="q1">1ª Quincena (1 al 15)</option>
                    <option value="q2">2ª Quincena (16 al 31)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Tarjetas KPI de liquidación */}
            <div className="bps-kpi-grid">
              <div className="bps-kpi-card">
                <span>Operarios en Obra</span>
                <strong>{bpsPayrollReport.totals.employeesCount}</strong>
              </div>
              <div className="bps-kpi-card">
                <span>Jornales Liquidados</span>
                <strong>{bpsPayrollReport.totals.totalJournals} d</strong>
              </div>
              <div className="bps-kpi-card">
                <span>Mano de Obra Imponible</span>
                <strong style={{ color: '#0369a1' }}>{formatMoney(bpsPayrollReport.totals.totalDirectLaborCost)}</strong>
              </div>
              <div className="bps-kpi-card">
                <span>Aporte BPS ({bpsPayrollReport.rates.bpsUnifiedRatePercent}%)</span>
                <strong style={{ color: '#15803d' }}>{formatMoney(bpsPayrollReport.totals.totalBpsUnified)}</strong>
              </div>
              <div className="bps-kpi-card">
                <span>FOCER (4%) + BSE (4.5%)</span>
                <strong style={{ color: '#64748b' }}>{formatMoney(bpsPayrollReport.totals.totalFocer + bpsPayrollReport.totals.totalBse)}</strong>
              </div>
              <div className="bps-kpi-card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <span style={{ color: '#166534' }}>Costo Total Cargas</span>
                <strong style={{ color: '#15803d' }}>{formatMoney(bpsPayrollReport.totals.totalSocialCharges)}</strong>
              </div>
            </div>

            {/* Pestañas internas del reporte */}
            <div className="bps-tabs-bar">
              <button
                type="button"
                className={`bps-tab-btn ${bpsModalTab === 'roster' ? 'is-active' : ''}`}
                onClick={() => setBpsModalTab('roster')}
              >
                👷 Nómina Nominal de Operarios ({bpsPayrollReport.employeeRoster.length})
              </button>
              <button
                type="button"
                className={`bps-tab-btn ${bpsModalTab === 'categories' ? 'is-active' : ''}`}
                onClick={() => setBpsModalTab('categories')}
              >
                📊 Resumen por Categoría SUNCA
              </button>
              <button
                type="button"
                className={`bps-tab-btn ${bpsModalTab === 'print' ? 'is-active' : ''}`}
                onClick={() => setBpsModalTab('print')}
              >
                📄 Hoja Oficial A4 para Imprimir / PDF
              </button>
            </div>

            {/* Tab 1: Nómina Nominal */}
            {bpsModalTab === 'roster' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Personal asignado a la obra para declaración ante BPS y auditorías laborales.
                  </span>
                  <button
                    type="button"
                    className="oxi-btn-primary"
                    onClick={() => setShowAddEmployeeModal(true)}
                    style={{ fontSize: '0.78rem', padding: '5px 12px', background: '#0284c7', borderColor: '#0369a1' }}
                  >
                    ＋ Agregar Operario a Nómina
                  </button>
                </div>

                <div className="table-responsive" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  <table className="oxi-pro-table">
                    <thead>
                      <tr>
                        <th>Cédula (C.I.)</th>
                        <th>Nombre y Apellido</th>
                        <th>Categoría SUNCA</th>
                        <th>Laudo Diario</th>
                        <th>Jornales</th>
                        <th>M.O. Imponible</th>
                        <th>BPS (60%)</th>
                        <th>FOCER (4%)</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bpsPayrollReport.employeeRoster.map(emp => (
                        <tr key={emp.id}>
                          <td><strong>{emp.documentId}</strong></td>
                          <td>
                            <strong>{emp.name}</strong>
                            {emp.phone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📞 {emp.phone}</div>}
                          </td>
                          <td>
                            <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.76rem', fontWeight: 600 }}>
                              {emp.categoryCode} · {emp.role}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatMoney(emp.dailyRate)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{emp.journalsWorked} d</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{formatMoney(emp.nominalTaxable)}</td>
                          <td style={{ textAlign: 'right', color: '#15803d' }}>{formatMoney(emp.bpsContribution)}</td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>{formatMoney(emp.focerContribution)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() => handleDeleteEmployee(emp.id)}
                              title="Quitar operario"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                        <td colSpan="4">TOTALES CONSOLIDADOS:</td>
                        <td style={{ textAlign: 'center' }}>{bpsPayrollReport.totals.totalJournals} d</td>
                        <td style={{ textAlign: 'right', color: '#0f172a' }}>{formatMoney(bpsPayrollReport.totals.totalDirectLaborCost)}</td>
                        <td style={{ textAlign: 'right', color: '#15803d' }}>{formatMoney(bpsPayrollReport.totals.totalBpsUnified)}</td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>{formatMoney(bpsPayrollReport.totals.totalFocer)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Resumen por Categoría */}
            {bpsModalTab === 'categories' && (
              <div className="table-responsive">
                <table className="oxi-pro-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Categoría Laboral SUNCA</th>
                      <th>Laudo Oficial Diario</th>
                      <th>Jornales Computados</th>
                      <th>Mano de Obra Imponible</th>
                      <th>Aporte Unificado BPS (60%)</th>
                      <th>FOCER (4%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bpsPayrollReport.categorySummary.map(cat => (
                      <tr key={cat.categoryId}>
                        <td><strong>{cat.categoryCode}</strong></td>
                        <td><strong>{cat.role}</strong></td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(cat.dailyRate)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{cat.journalsCount} d</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(cat.directLaborCost)}</td>
                        <td style={{ textAlign: 'right', color: '#15803d' }}>{formatMoney(cat.directLaborCost * (bpsPayrollReport.rates.bpsUnifiedRatePercent / 100))}</td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>{formatMoney(cat.directLaborCost * (bpsPayrollReport.rates.focerRatePercent / 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td colSpan="3">TOTALES GENERALES:</td>
                      <td style={{ textAlign: 'center' }}>{bpsPayrollReport.totals.totalJournals} d</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(bpsPayrollReport.totals.totalDirectLaborCost)}</td>
                      <td style={{ textAlign: 'right', color: '#15803d' }}>{formatMoney(bpsPayrollReport.totals.totalBpsUnified)}</td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{formatMoney(bpsPayrollReport.totals.totalFocer)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Tab 3: Hoja Oficial Imprimible A4 */}
            {bpsModalTab === 'print' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button
                    type="button"
                    className="oxi-btn-primary"
                    onClick={handlePrintBpsReport}
                    style={{ background: '#0f172a', borderColor: '#0f172a', fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    🖨️ Imprimir / Guardar en PDF
                  </button>
                </div>

                <div className="bps-print-sheet">
                  <div className="bps-print-header">
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px' }}>
                        ÓXIDA STUDIO · MERCADOBRA CONSTRUCTIONTECH
                      </div>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a' }}>
                        PLANILLA DE PERSONAL Y APORTES BPS (LEY 14.411)
                      </h2>
                      <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '2px' }}>
                        Aporte Unificado de la Construcción · Grupo 9 SUNCA Uruguay
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#475569' }}>
                      <div><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-UY')}</div>
                      <div><strong>Estado:</strong> Liquidación Preliminar</div>
                    </div>
                  </div>

                  {/* Ficha técnica */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                    <div><strong>Obra:</strong> {bpsPayrollReport.projectInfo.name}</div>
                    <div><strong>N° Registro Obra BPS:</strong> {bpsPayrollReport.projectInfo.bpsWorkRegistry}</div>
                    <div><strong>Ubicación:</strong> {bpsPayrollReport.projectInfo.location}</div>
                    <div><strong>Empresa / RUT:</strong> {bpsPayrollReport.projectInfo.companyName} ({bpsPayrollReport.projectInfo.companyRut})</div>
                    <div><strong>Período:</strong> {bpsPayrollReport.projectInfo.filterMonth === 'all' ? 'Histórico General' : bpsPayrollReport.projectInfo.filterMonth} (Quincena: {bpsPayrollReport.projectInfo.filterQuincena})</div>
                    <div><strong>Comitente:</strong> {bpsPayrollReport.projectInfo.clientName}</div>
                  </div>

                  {/* Liquidación resumen */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '0.88rem', color: '#0f172a' }}>1. LIQUIDACIÓN CONSOLIDADA DE CARGAS SOCIALES</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '6px' }}>Concepto</th>
                          <th style={{ padding: '6px', textAlign: 'center' }}>Alícuota</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Monto Liquidado ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px' }}><strong>Mano de Obra Nominal Imponible</strong></td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>—</td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(bpsPayrollReport.totals.totalDirectLaborCost)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px' }}>Aporte Unificado BPS (Ley 14.411)</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{bpsPayrollReport.rates.bpsUnifiedRatePercent}%</td>
                          <td style={{ padding: '6px', textAlign: 'right', color: '#15803d' }}>{formatMoney(bpsPayrollReport.totals.totalBpsUnified)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px' }}>Fondo de Cesantía y Retiro (FOCER)</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{bpsPayrollReport.rates.focerRatePercent}%</td>
                          <td style={{ padding: '6px', textAlign: 'right' }}>{formatMoney(bpsPayrollReport.totals.totalFocer)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px' }}>Seguro Accidentes Laborales (BSE)</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{bpsPayrollReport.rates.bseRatePercent}%</td>
                          <td style={{ padding: '6px', textAlign: 'right' }}>{formatMoney(bpsPayrollReport.totals.totalBse)}</td>
                        </tr>
                        <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                          <td style={{ padding: '6px' }}>TOTAL LEYES SOCIALES Y CARGAS</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{bpsPayrollReport.rates.totalSocialRatePercent.toFixed(1)}%</td>
                          <td style={{ padding: '6px', textAlign: 'right', color: '#15803d' }}>{formatMoney(bpsPayrollReport.totals.totalSocialCharges)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Tabla nominal resumida */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '0.88rem', color: '#0f172a' }}>2. DETALLE DE NÓMINA DE OPERARIOS</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '4px 6px' }}>C.I.</th>
                          <th style={{ padding: '4px 6px' }}>Operario</th>
                          <th style={{ padding: '4px 6px' }}>Categoría</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>Jornales</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>M.O. Imponible</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>BPS 60%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bpsPayrollReport.employeeRoster.map(emp => (
                          <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>{emp.documentId}</td>
                            <td style={{ padding: '4px 6px' }}><strong>{emp.name}</strong></td>
                            <td style={{ padding: '4px 6px' }}>{emp.role}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>{emp.journalsWorked} d</td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatMoney(emp.nominalTaxable)}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatMoney(emp.bpsContribution)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Firmas de ingeniería y RRHH */}
                  <div className="bps-print-signatures">
                    <div className="bps-signature-box">
                      <strong>DIRECTOR TÉCNICO DE OBRA</strong>
                      <div>Firma y C.I. de Arq. / Ing. Residente</div>
                    </div>
                    <div className="bps-signature-box">
                      <strong>RESPONSABLE DE RRHH / EMPRESA</strong>
                      <div>Firma del Delegado / Administrador</div>
                    </div>
                    <div className="bps-signature-box">
                      <strong>COMITENTE / PROPIETARIO</strong>
                      <div>Recepción y Conformidad de Declaración</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer con acciones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="oxi-btn-back-classic"
                onClick={handleDownloadBpsCsv}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                📥 Descargar Planilla CSV (Excel / BPS)
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={handlePrintBpsReport}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🖨️ Imprimir / Guardar PDF
                </button>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={() => setShowBpsReportModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: INFORME EJECUTIVO DE CONTROL DE COSTOS AL DÍA DE CORTE (PDF / PRINT) ── */}
      {showCostControlReportModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowCostControlReportModal(false)}>
          <div className="oxi-modal-content cost-control-report-modal" style={{ maxWidth: '980px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📑</span>
                  <span>Informe Ejecutivo de Control de Costos al Día de Corte</span>
                  <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    EVM & Control Presupuestario
                  </span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Comparativa formal de presupuesto planificado a la fecha vs. costo real devengado por comprobantes y desvíos para directorio y comitente.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn oxi-btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  onClick={handleExportCostControlCsv}
                  title="Exportar a CSV para Excel"
                >
                  📥 Exportar CSV
                </button>
                <button
                  type="button"
                  className="oxi-btn oxi-btn-primary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  onClick={() => window.print()}
                  title="Imprimir o guardar como PDF"
                >
                  🖨️ Imprimir / Guardar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowCostControlReportModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', marginLeft: '6px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Hoja Membretada Imprimible */}
            <div className="cost-control-print-sheet" style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {/* Encabezado Obra */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{project?.name || 'Obra en Ejecución'}</h2>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    <span>📍 Ubicación: {project?.location || 'Montevideo, Uruguay'}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>🏢 Empresa: {bpsMeta.companyName}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>Comitente: {bpsMeta.clientName}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Fecha de Corte</div>
                  <strong style={{ fontSize: '1.05rem', color: '#0369a1' }}>{costCutoffDate}</strong>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Emisión: {new Date().toLocaleDateString('es-UY')}</div>
                </div>
              </div>

              {/* KPIs de Control */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Presupuesto Total</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{formatMoney(totalProjectBudget)}</div>
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>100% contractual</small>
                </div>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '10px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 700 }}>Plan a la Fecha</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0369a1' }}>{formatMoney(costControl.totalPlannedToDate)}</div>
                  <small style={{ color: '#0369a1', fontSize: '0.72rem' }}>{costControl.plannedPctOfTotal}% previsto</small>
                </div>
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', padding: '10px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#c2410c', textTransform: 'uppercase', fontWeight: 700 }}>Ejecutado Real</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ea580c' }}>{formatMoney(costControl.totalExecuted)}</div>
                  <small style={{ color: '#ea580c', fontSize: '0.72rem' }}>{costControl.executedPctOfTotal}% devengado</small>
                </div>
                <div style={{
                  background: costControl.totalVariance > 0 ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${costControl.totalVariance > 0 ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '6px',
                  padding: '10px'
                }}>
                  <span style={{ fontSize: '0.7rem', color: costControl.totalVariance > 0 ? '#b91c1c' : '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>Desvío Neto</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: costControl.totalVariance > 0 ? '#dc2626' : '#059669' }}>
                    {costControl.totalVariance > 0 ? '+' : ''}{formatMoney(costControl.totalVariance)}
                  </div>
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>{costControl.variancePct > 0 ? '+' : ''}{costControl.variancePct}% vs. plan</small>
                </div>
                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '6px', padding: '10px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#7e22ce', textTransform: 'uppercase', fontWeight: 700 }}>Saldo por Devengar</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#7e22ce' }}>{formatMoney(Math.max(0, totalProjectBudget - costControl.totalExecuted))}</div>
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Remanente</small>
                </div>
              </div>

              {/* Tabla Detallada por Tarea */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#334155' }}>
                    <th style={{ padding: '8px 6px' }}>Tarea de Obra</th>
                    <th style={{ padding: '8px 6px' }}>Plazo</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Presupuesto</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Plan a Fecha</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>% Prog / Real</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Costo Real</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Modo</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Desvío ($)</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(t => {
                    const rowCC = costControl.byTask.get(String(t.id)) || { budget: 0, plannedPct: 0, plannedToDate: 0, executed: 0, variance: 0, costDetails: { mode: 'auto' } }
                    const real = Math.min(100, Math.max(0, Number(t.progressPercent) || 0))
                    const variance = rowCC.variance || 0
                    const variancePct = rowCC.plannedToDate > 0 ? Math.round((variance / rowCC.plannedToDate) * 100) : 0
                    const isOver = variance > 0
                    const isUnder = variance < 0

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 6px' }}>
                          <strong>{t.name}</strong>
                          {t.dependsOnTaskId && (
                            <div style={{ fontSize: '0.7rem', color: '#059669' }}>
                              ↳ Tras tarea #{t.dependsOnTaskId}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {t.startDate} al {t.endDate}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(rowCC.budget)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: '#0369a1', fontWeight: 600 }}>
                          {formatMoney(rowCC.plannedToDate)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <span style={{ color: '#0369a1', fontWeight: 700 }}>{rowCC.plannedPct}%</span>
                          <span style={{ color: '#94a3b8', margin: '0 3px' }}>/</span>
                          <span style={{ color: real >= rowCC.plannedPct ? '#166534' : '#b91c1c', fontWeight: 700 }}>{real}%</span>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: '#ea580c', fontWeight: 700 }}>
                          {formatMoney(rowCC.executed)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: rowCC.costDetails?.mode === 'actual' ? '#f0fdf4' : rowCC.costDetails?.mode === 'manual' ? '#fff7ed' : '#f8fafc',
                            color: rowCC.costDetails?.mode === 'actual' ? '#166534' : rowCC.costDetails?.mode === 'manual' ? '#c2410c' : '#475569',
                            fontWeight: 700
                          }}>
                            {rowCC.costDetails?.mode === 'actual' ? 'Imputado' : rowCC.costDetails?.mode === 'manual' ? 'Manual' : 'Auto (%)'}
                          </span>
                        </td>
                        <td style={{
                          padding: '8px 6px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isOver ? '#dc2626' : isUnder ? '#059669' : '#64748b'
                        }}>
                          {variance > 0 ? '+' : ''}{formatMoney(variance)}
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {variancePct > 0 ? '+' : ''}{variancePct}%
                          </div>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isOver ? '#fee2e2' : isUnder ? '#dcfce7' : '#f1f5f9',
                            color: isOver ? '#991b1b' : isUnder ? '#166534' : '#475569'
                          }}>
                            {isOver ? 'Sobrecosto' : isUnder ? 'Ahorro' : 'En Plan'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', fontWeight: 'bold' }}>
                    <td colSpan="2" style={{ padding: '8px 6px' }}>TOTALES CONSOLIDADOS:</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>{formatMoney(totalProjectBudget)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#0369a1' }}>{formatMoney(costControl.totalPlannedToDate)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {costControl.plannedPctOfTotal}% / {costControl.executedPctOfTotal}%
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#ea580c' }}>{formatMoney(costControl.totalExecuted)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>—</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: costControl.totalVariance > 0 ? '#dc2626' : '#059669' }}>
                      {costControl.totalVariance > 0 ? '+' : ''}{formatMoney(costControl.totalVariance)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: costControl.totalVariance > 0 ? '#fee2e2' : '#dcfce7',
                        color: costControl.totalVariance > 0 ? '#991b1b' : '#166534'
                      }}>
                        {costControl.totalVariance > 0 ? 'Sobrecosto' : 'En Margen'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Bloque de Firmas para Presentación Formal */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '45px', borderBottom: '1px solid #94a3b8', margin: '0 20px 8px' }}></div>
                  <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>Dirección Técnica de Obra</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Firma y Sello Profesional</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '45px', borderBottom: '1px solid #94a3b8', margin: '0 20px 8px' }}></div>
                  <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>Control de Gestión / Administración</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{bpsMeta.companyName}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '45px', borderBottom: '1px solid #94a3b8', margin: '0 20px 8px' }}></div>
                  <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>Comitente / Propietario</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Aprobación y Recibido</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                type="button"
                className="oxi-btn oxi-btn-secondary"
                onClick={() => setShowCostControlReportModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MINI-MODAL: AGREGAR OPERARIO A NÓMINA ── */}
      {showAddEmployeeModal && (
        <div className="oxi-modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowAddEmployeeModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '440px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>＋ Alta de Operario para Nómina BPS</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#64748b' }}>
              Registrá el personal que trabaja en la obra para asignar jornales y leyes sociales.
            </p>

            <form onSubmit={handleSaveNewEmployee}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Nombre y Apellido
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcelo Fagúndez"
                  value={newEmployeeForm.name}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Cédula de Identidad (C.I.)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 4.892.104-5"
                  value={newEmployeeForm.documentId}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, documentId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Categoría SUNCA Grupo 9
                </label>
                <select
                  value={newEmployeeForm.categoryId}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, categoryId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  {laborCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.categoryCode} · {cat.role} (${Number(cat.dailyRate).toLocaleString('es-UY')}/d)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Teléfono de Contacto (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="099 123 456"
                  value={newEmployeeForm.phone}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowAddEmployeeModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0369a1' }}
                >
                  ✓ Agregar a Nómina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CARGAR FACTURA / REMITO DE MATERIALES (PUNTO 5) ── */}
      {showInvoiceModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowInvoiceModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '600px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧾</span>
                  <span>Cargar Factura o Remito de Materiales</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Imputá el comprobante a tareas de obra o déjalo en la bandeja pendiente para no perder gastos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMaterialInvoice}>
              <div className="form-row">
                <label>
                  N° de Factura / Remito
                  <input
                    type="text"
                    required
                    placeholder="Ej. FC-A-049210"
                    value={invoiceForm.invoiceNumber}
                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                  />
                </label>
                <label>
                  Proveedor
                  <input
                    type="text"
                    required
                    placeholder="Ej. Barraca Central, Aceros S.A."
                    value={invoiceForm.supplier}
                    onChange={e => setInvoiceForm({ ...invoiceForm, supplier: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Fecha del Comprobante
                  <input
                    type="date"
                    required
                    value={invoiceForm.date}
                    onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                  />
                </label>
                <label>
                  Monto Total ($)
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej. 185000"
                    value={invoiceForm.totalAmount}
                    onChange={e => setInvoiceForm({ ...invoiceForm, totalAmount: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'bold', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={invoiceForm.allocateNow}
                    onChange={e => setInvoiceForm({ ...invoiceForm, allocateNow: e.target.checked })}
                  />
                  <span>🔗 Imputar inmediatamente a una tarea de obra</span>
                </label>

                {invoiceForm.allocateNow ? (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem' }}>
                      Tarea Destino:
                      <select
                        value={invoiceForm.taskId}
                        onChange={e => setInvoiceForm({ ...invoiceForm, taskId: e.target.value })}
                        style={{ marginTop: '3px' }}
                      >
                        {schedule.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.rubroName || 'Rubro'})
                          </option>
                        ))}
                      </select>
                    </label>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', margin: 0 }}>
                        <input
                          type="radio"
                          name="invMode"
                          checked={invoiceForm.assignMode === 'total'}
                          onChange={() => setInvoiceForm({ ...invoiceForm, assignMode: 'total' })}
                        />
                        100% del monto ({formatMoney(Number(invoiceForm.totalAmount) || 0)})
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', margin: 0 }}>
                        <input
                          type="radio"
                          name="invMode"
                          checked={invoiceForm.assignMode === 'partial'}
                          onChange={() => setInvoiceForm({ ...invoiceForm, assignMode: 'partial' })}
                        />
                        Monto parcial
                      </label>
                    </div>

                    {invoiceForm.assignMode === 'partial' && (
                      <label style={{ fontSize: '0.82rem' }}>
                        Monto a imputar a esta tarea ($):
                        <input
                          type="number"
                          min="1"
                          max={Number(invoiceForm.totalAmount) || undefined}
                          placeholder="Monto parcial"
                          value={invoiceForm.assignedAmount}
                          onChange={e => setInvoiceForm({ ...invoiceForm, assignedAmount: e.target.value })}
                          style={{ marginTop: '3px' }}
                        />
                        <small style={{ color: '#64748b', fontSize: '0.74rem' }}>
                          El saldo restante quedará en la bandeja de facturas pendientes sin imputar.
                        </small>
                      </label>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                    ⚠️ La factura se archivará en la <strong>Bandeja de Gastos Sin Imputar</strong> para que puedas imputarla más tarde.
                  </p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px', color: '#334155' }}>
                  Detalle de Materiales / Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Ej. Tablas de encofrado fenólico, estacas de replanteo y alambre"
                  value={invoiceForm.notes}
                  onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#4f46e5', borderColor: '#4338ca' }}
                >
                  ✓ Registrar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IMPUTAR FACTURA PENDIENTE (BANDEJA SIN IMPUTAR - PUNTO 5) ── */}
      {showAssignInvoiceModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAssignInvoiceModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '540px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔗</span>
                  <span>Imputar Factura de la Bandeja</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Asigná el saldo pendiente de este comprobante a una tarea o rubro de la obra.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignInvoiceModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAssignInvoice}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Seleccionar Factura Pendiente
                </label>
                <select
                  value={assignInvoiceForm.invoiceId}
                  onChange={e => {
                    const inv = materialInvoices.find(i => i.id === e.target.value)
                    const totals = calculateInvoiceAllocationTotals(inv)
                    setAssignInvoiceForm({
                      ...assignInvoiceForm,
                      invoiceId: e.target.value,
                      amount: totals.unassignedAmount
                    })
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {unassignedInvoicesData.list.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.supplier} (Saldo libre: {formatMoney(inv.unassignedAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Tarea Destino de la Obra
                </label>
                <select
                  value={assignInvoiceForm.taskId}
                  onChange={e => setAssignInvoiceForm({ ...assignInvoiceForm, taskId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {schedule.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.rubroName || 'Rubro'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Monto a Imputar ($)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={assignInvoiceForm.amount}
                  onChange={e => setAssignInvoiceForm({ ...assignInvoiceForm, amount: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Observaciones de Imputación
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cemento y arena para losa 1..."
                  value={assignInvoiceForm.notes}
                  onChange={e => setAssignInvoiceForm({ ...assignInvoiceForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowAssignInvoiceModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#d97706', borderColor: '#b45309' }}
                >
                  ✓ Confirmar Imputación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR CERTIFICADO DE SUBCONTRATISTA (PUNTO 5) ── */}
      {showSubcontractModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowSubcontractModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '540px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏗️</span>
                  <span>Registrar Certificado de Subcontratista</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Asigná el certificado al rubro correspondiente para comparar lo presupuestado contra lo gastado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubcontractModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubcontractCertificate}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Vincular a Contrato Marco (Opcional - habilita control de techo presupuestal)
                </label>
                <select
                  value={subcontractForm.contractId || ''}
                  onChange={e => {
                    const cId = e.target.value
                    const sel = subcontractContracts.find(c => c.id === cId)
                    if (sel) {
                      setSubcontractForm({
                        ...subcontractForm,
                        contractId: sel.id,
                        subcontractorName: sel.contractorName,
                        rubroId: sel.rubroId
                      })
                    } else {
                      setSubcontractForm({
                        ...subcontractForm,
                        contractId: ''
                      })
                    }
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="">-- Sin contrato vinculado (Certificado puntual libre) --</option>
                  {subcontractContracts.map(c => {
                    const status = calculateSubcontractContractStatus(c, subcontractCertificates)
                    return (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.contractorName} (Techo: {formatMoney(status.revisedCeiling)} | Saldo: {formatMoney(status.availableBalance)})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="form-row">
                <label>
                  N° de Certificado
                  <input
                    type="text"
                    required
                    placeholder="Ej. CERT-SUB-03"
                    value={subcontractForm.certificateNumber}
                    onChange={e => setSubcontractForm({ ...subcontractForm, certificateNumber: e.target.value })}
                  />
                </label>
                <label>
                  Subcontratista
                  <input
                    type="text"
                    required
                    placeholder="Ej. Schindler, Vidriería Sur"
                    value={subcontractForm.subcontractorName}
                    onChange={e => setSubcontractForm({ ...subcontractForm, subcontractorName: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Rubro de Obra Imputado
                  <select
                    value={subcontractForm.rubroId}
                    onChange={e => setSubcontractForm({ ...subcontractForm, rubroId: e.target.value })}
                  >
                    {rubros.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha de Emisión
                  <input
                    type="date"
                    required
                    value={subcontractForm.date}
                    onChange={e => setSubcontractForm({ ...subcontractForm, date: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Monto Bruto Certificado ($)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Ej. 350000"
                  value={subcontractForm.amount}
                  onChange={e => setSubcontractForm({ ...subcontractForm, amount: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              {/* Control de Techo y Liquidación con Fondo de Reparo */}
              {(() => {
                const amt = Number(subcontractForm.amount) || 0
                const linkedContract = subcontractContracts.find(c => c.id === subcontractForm.contractId)
                const retentionRate = linkedContract ? (linkedContract.retentionRate ?? 5) : 5
                const retAmt = Math.round(amt * (retentionRate / 100))
                const netAmt = amt - retAmt

                let alertBox = null
                if (linkedContract && amt > 0) {
                  const val = validateSubcontractCertificate(linkedContract, amt, subcontractCertificates)
                  if (!val.isValid) {
                    alertBox = (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '0.8rem', color: '#991b1b' }}>
                        <strong>⚠️ Alerta de Techo Presupuestal:</strong> {val.message}
                      </div>
                    )
                  }
                }

                return (
                  <>
                    {alertBox}
                    {amt > 0 && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>Monto Bruto:</span>
                          <strong>{formatMoney(amt)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#7c3aed' }}>
                          <span>Fondo de Reparo ({retentionRate}% garantía retenida):</span>
                          <strong>-{formatMoney(retAmt)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '4px', fontWeight: 'bold', color: '#059669', fontSize: '0.88rem' }}>
                          <span>Neto Líquido a Pagar:</span>
                          <span>{formatMoney(netAmt)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Notas / Hito Certificado
                </label>
                <input
                  type="text"
                  placeholder="Ej. Certificado N° 1: Anticipo y replanteo de guías de ascensor..."
                  value={subcontractForm.notes}
                  onChange={e => setSubcontractForm({ ...subcontractForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowSubcontractModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#d97706', borderColor: '#b45309' }}
                >
                  ✓ Registrar Certificado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR GASTO INDIRECTO / GENERAL (PUNTO 6) ── */}
      {showAddIndirectModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddIndirectModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '540px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏢</span>
                  <span>Registrar Costo Indirecto / Gasto General</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Partidas de implantación, supervisión o logística prorrateadas al costo total de la obra.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddIndirectModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddIndirectExpense}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Categoría de Gasto General
                </label>
                <select
                  value={indirectForm.categoryId}
                  onChange={e => setIndirectForm({ ...indirectForm, categoryId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="obrador_banos">🛖 Obrador y Baños Químicos</option>
                  <option value="jefatura_sereno">👷 Jefatura de Obra, Capataz y Sereno</option>
                  <option value="suministros">⚡ Suministros (Agua OSE, Energía UTE, Conectividad)</option>
                  <option value="seguros_tasas">🛡️ Seguros BSE, Pólizas Todo Riesgo y Tasas</option>
                  <option value="logistica">🚛 Logística, Andamios, Volquetas y Fletes</option>
                  <option value="otro">📦 Otros Gastos Generales</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Concepto / Detalle
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Alquiler de obrador modular y 2 baños químicos"
                  value={indirectForm.name}
                  onChange={e => setIndirectForm({ ...indirectForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-row">
                <label>
                  Monto Presupuestado ($)
                  <input
                    type="number"
                    min="1"
                    required
                    value={indirectForm.budgeted}
                    onChange={e => setIndirectForm({ ...indirectForm, budgeted: e.target.value })}
                  />
                </label>
                <label>
                  Monto Ya Ejecutado ($)
                  <input
                    type="number"
                    min="0"
                    value={indirectForm.executed}
                    onChange={e => setIndirectForm({ ...indirectForm, executed: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Modalidad / Período de Imputación
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mensual prorrateado (5 meses), Costo fijo implantación..."
                  value={indirectForm.period}
                  onChange={e => setIndirectForm({ ...indirectForm, period: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Observaciones Técnicas / Contrato
                </label>
                <input
                  type="text"
                  placeholder="Ej. Incluye desagote quincenal y limpieza de módulos..."
                  value={indirectForm.notes}
                  onChange={e => setIndirectForm({ ...indirectForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowAddIndirectModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0369a1' }}
                >
                  ✓ Registrar Gasto Indirecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO CONTRATO MARCO DE SUBCONTRATO (PUNTO 11) ── */}
      {showAddContractModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddContractModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>📑 Nuevo Contrato Marco de Subcontrato</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddContractModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddContract}>
              <div className="form-row">
                <label>
                  Código de Contrato
                  <input
                    type="text"
                    required
                    placeholder="Ej. CONT-ELEC-01"
                    value={contractForm.code}
                    onChange={e => setContractForm({ ...contractForm, code: e.target.value })}
                  />
                </label>
                <label>
                  Empresa Contratista
                  <input
                    type="text"
                    required
                    placeholder="Ej. Instalaciones Eléctricas del Este"
                    value={contractForm.contractorName}
                    onChange={e => setContractForm({ ...contractForm, contractorName: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Rubro de Obra
                  <select
                    value={contractForm.rubroId}
                    onChange={e => setContractForm({ ...contractForm, rubroId: e.target.value })}
                  >
                    {rubros.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fondo de Reparo / Retención (%)
                  <input
                    type="number"
                    min="0"
                    max="30"
                    required
                    value={contractForm.retentionRate}
                    onChange={e => setContractForm({ ...contractForm, retentionRate: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Objeto y Alcance de Contratación
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mano de obra y materiales para bandeja portacables y cableado general"
                  value={contractForm.scope}
                  onChange={e => setContractForm({ ...contractForm, scope: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-row">
                <label>
                  Techo Presupuestal Base ($)
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej. 1200000"
                    value={contractForm.baseAmount}
                    onChange={e => setContractForm({ ...contractForm, baseAmount: e.target.value })}
                  />
                </label>
                <label>
                  Fecha de Inicio
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowAddContractModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#0f172a', borderColor: '#0f172a', fontWeight: 600 }}
                >
                  ✓ Crear Contrato Marco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA AMPLIACIÓN / ADICIONAL DE SUBCONTRATO (PUNTO 11) ── */}
      {showAddAdditionalModal && activeContractForAdditional && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddAdditionalModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>➕ Registrar Adicional / Ampliación de Contrato</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddAdditionalModal(false)}>
                ✕
              </button>
            </div>
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
              <div>Contrato: <strong>{activeContractForAdditional.code}</strong></div>
              <div style={{ color: '#475569' }}>Contratista: <strong>{activeContractForAdditional.contractorName}</strong></div>
            </div>
            <form onSubmit={handleSaveAdditional}>
              <div className="form-row">
                <label>
                  Código de Adenda / Adicional
                  <input
                    type="text"
                    required
                    value={additionalForm.code}
                    onChange={e => setAdditionalForm({ ...additionalForm, code: e.target.value })}
                  />
                </label>
                <label>
                  Fecha de Aprobación
                  <input
                    type="date"
                    required
                    value={additionalForm.approvedDate}
                    onChange={e => setAdditionalForm({ ...additionalForm, approvedDate: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Descripción Técnica de la Ampliación
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Modificación de bandejas en piso 5 por nuevo requerimiento de IT"
                  value={additionalForm.description}
                  onChange={e => setAdditionalForm({ ...additionalForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Monto Adicional Aprobado ($)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Ej. 150000"
                  value={additionalForm.amount}
                  onChange={e => setAdditionalForm({ ...additionalForm, amount: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowAddAdditionalModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0369a1', fontWeight: 600 }}
                >
                  ✓ Aprobar e Incorporar al Techo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CIERRE SEMANAL EN 1 MINUTO (PUNTO 9) ── */}
      {showWeeklyCloseModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowWeeklyCloseModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '680px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span>
                  <span>Cierre Semanal de Producción en 1 Minuto</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Punto 9: El Jefe de Obra ajusta o confirma el avance de las tareas activas para asentar el hito en la Curva S.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWeeklyCloseModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWeeklyClose}>
              <div className="form-row">
                <label>
                  Semana de Cierre
                  <input
                    type="text"
                    required
                    value={weeklyCloseForm.weekLabel}
                    onChange={e => setWeeklyCloseForm({ ...weeklyCloseForm, weekLabel: e.target.value })}
                  />
                </label>
                <label>
                  Fecha del Cierre
                  <input
                    type="date"
                    required
                    value={weeklyCloseForm.date}
                    onChange={e => setWeeklyCloseForm({ ...weeklyCloseForm, date: e.target.value })}
                  />
                </label>
                <label>
                  Responsable
                  <input
                    type="text"
                    required
                    value={weeklyCloseForm.responsible}
                    onChange={e => setWeeklyCloseForm({ ...weeklyCloseForm, responsible: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: '12px', marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>
                  Avance Físico Real de Tareas Activas en Obra:
                </label>

                <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', background: '#f8fafc' }}>
                  {schedule.map(t => {
                    const currentPct = weeklyCloseForm.taskProgressMap[t.id] != null
                      ? weeklyCloseForm.taskProgressMap[t.id]
                      : (t.progressPercent || 0)

                    return (
                      <div
                        key={t.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{t.name}</strong>
                            <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>
                              {t.rubroName || 'Rubro'} · {t.startDate} a {t.endDate}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentPct}
                              onChange={e => {
                                const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                                setWeeklyCloseForm({
                                  ...weeklyCloseForm,
                                  taskProgressMap: {
                                    ...weeklyCloseForm.taskProgressMap,
                                    [t.id]: val
                                  }
                                })
                              }}
                              style={{ width: '60px', padding: '4px', textAlign: 'center', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #94a3b8' }}
                            />
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>%</span>
                          </div>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={currentPct}
                          onChange={e => {
                            const val = Number(e.target.value)
                            setWeeklyCloseForm({
                              ...weeklyCloseForm,
                              taskProgressMap: {
                                ...weeklyCloseForm.taskProgressMap,
                                [t.id]: val
                              }
                            })
                          }}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Bitácora / Observaciones de Cierre Semanal
                </label>
                <textarea
                  rows="2"
                  value={weeklyCloseForm.notes}
                  onChange={e => setWeeklyCloseForm({ ...weeklyCloseForm, notes: e.target.value })}
                  placeholder="Ej. Cumplimiento del 95% de la meta semanal sin inconvenientes climáticos..."
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-back-classic"
                  onClick={() => setShowWeeklyCloseModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="oxi-btn-primary"
                  style={{ background: '#059669', borderColor: '#047857', fontWeight: 600 }}
                >
                  ✓ Asentar Cierre Semanal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: GENERAR CERTIFICADO DEL MES CON EVM (PUNTO 10) ── */}
      {showMonthlyCertModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowMonthlyCertModal(false)}>
          <div className="oxi-modal-content" style={{ maxWidth: '640px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span>
                  <span>Generar Certificado Mensual de Obra (EVM)</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Punto 10: Emisión formal de certificado físico-financiero para homologación y facturación a clientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthlyCertModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMonthlyCert}>
              <div className="form-row">
                <label>
                  Período a Certificar
                  <select
                    value={monthlyCertForm.month}
                    onChange={e => {
                      const sel = dynamicMonthlyComp.find(m => m.month === e.target.value)
                      setMonthlyCertForm({
                        ...monthlyCertForm,
                        month: e.target.value,
                        certifiedAmount: sel ? sel.certCost : monthlyCertForm.certifiedAmount,
                        monthItem: sel
                      })
                    }}
                  >
                    {dynamicMonthlyComp.map((m, idx) => (
                      <option key={idx} value={m.month}>
                        {m.month} (Avance: {m.certAdvancePercent}%)
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha de Homologación
                  <input
                    type="date"
                    required
                    value={monthlyCertForm.date}
                    onChange={e => setMonthlyCertForm({ ...monthlyCertForm, date: e.target.value })}
                  />
                </label>
              </div>

              {/* Snapshot EVM Box */}
              {(() => {
                const cur = monthlyCertForm.monthItem || dynamicMonthlyComp[0] || {}
                const plannedPct = cur.plannedPercent != null ? cur.plannedPercent : cur.certAdvancePercent
                const realPct = cur.certAdvancePercent || 0
                const budget = cur.budgetedCost || 0
                const ac = cur.certCost || 0
                const pv = Math.round(budget * (plannedPct / 100))
                const ev = Math.round(budget * (realPct / 100))
                const sv = ev - pv
                const cv = ev - ac

                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      AUDITORÍA DE VALOR GANADO (EVM CONTRACTUAL)
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Valor Planificado (PV)</div>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{formatMoney(pv)}</strong>
                      </div>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Valor Ganado (EV)</div>
                        <strong style={{ fontSize: '0.92rem', color: '#0284c7' }}>{formatMoney(ev)}</strong>
                      </div>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Costo Real (AC)</div>
                        <strong style={{ fontSize: '0.92rem', color: '#ea580c' }}>{formatMoney(ac)}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8rem' }}>
                      <span>Desvío Cronograma (SV): <strong style={{ color: sv < 0 ? '#ea580c' : '#10b981' }}>{formatMoney(sv)}</strong></span>
                      <span>Desvío Costo (CV): <strong style={{ color: cv < 0 ? '#ef4444' : '#10b981' }}>{formatMoney(cv)}</strong></span>
                    </div>
                  </div>
                )
              })()}

              <div className="form-row">
                <label>
                  Director de Obra / Inspector
                  <input
                    type="text"
                    required
                    value={monthlyCertForm.inspector}
                    onChange={e => setMonthlyCertForm({ ...monthlyCertForm, inspector: e.target.value })}
                  />
                </label>
                <label>
                  Aprobador por Comitente
                  <input
                    type="text"
                    required
                    value={monthlyCertForm.clientApprover}
                    onChange={e => setMonthlyCertForm({ ...monthlyCertForm, clientApprover: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  Memoria Descriptiva & Observaciones de Certificación
                </label>
                <textarea
                  rows="2"
                  value={monthlyCertForm.notes}
                  onChange={e => setMonthlyCertForm({ ...monthlyCertForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="oxi-btn-primary"
                  onClick={() => handleDownloadCertificatePdf(monthlyCertForm.monthItem || { month: monthlyCertForm.month, certCost: monthlyCertForm.certifiedAmount, certAdvancePercent: 0 })}
                  disabled={isExportingCertPdf}
                  style={{ background: '#0284c7', borderColor: '#0369a1', fontWeight: 600 }}
                  title="Generar y descargar documento oficial en PDF con firmas y EVM"
                >
                  {isExportingCertPdf ? '⏳ Generando PDF...' : '📄 Descargar Certificado Oficial en PDF'}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="oxi-btn-back-classic"
                    onClick={() => setShowMonthlyCertModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="oxi-btn-primary"
                    style={{ background: '#d97706', borderColor: '#b45309', fontWeight: 600 }}
                  >
                    ✓ Emitir y Archivar Certificado
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedPhotoPreview && (
        <div
          className="oxi-modal-backdrop"
          style={{ background: 'rgba(0, 0, 0, 0.85)', zIndex: 99999 }}
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img
              src={selectedPhotoPreview}
              alt="Inspección Ampliada"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            />
            <button
              type="button"
              onClick={() => setSelectedPhotoPreview(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── COPILOT DE OBRA (ASISTENTE IA CONVERSACIONAL) ── */}
      <OxiProCopilot
        project={project}
        schedule={schedule}
        setSchedule={setSchedule}
        rubros={rubros}
        setRubros={setRubros}
        budgetItems={budgetItems}
        setBudgetItems={setBudgetItems}
        projectSocialLawsRate={projectSocialLawsRate}
        rainLogs={rainLogs}
        setRainLogs={setRainLogs}
        setActiveTab={setActiveTab}
        onApplyRainShift={(days, date, reason) => {
          const delayDays = Math.max(1, Number(days) || 1)
          const eventDate = date || new Date().toISOString().split('T')[0]
          let affectedTasksCount = 0
          const updatedSchedule = schedule.map(t => {
            if (Number(t.progressPercent) === 100) return t
            if (t.endDate < eventDate) return t
            affectedTasksCount++
            let newStart = t.startDate
            let newEnd = t.endDate
            if (t.startDate <= eventDate && t.endDate >= eventDate) {
              newEnd = addWorkingDays(t.endDate, delayDays)
            } else if (t.startDate > eventDate) {
              newStart = addWorkingDays(t.startDate, delayDays)
              newEnd = addWorkingDays(t.endDate, delayDays)
            }
            const calculatedWorkDays = calculateWorkingDays(newStart, newEnd)
            return {
              ...t,
              startDate: newStart,
              endDate: newEnd,
              workDays: calculatedWorkDays,
              rainDelayedDays: (Number(t.rainDelayedDays) || 0) + delayDays,
              originalEndDate: t.originalEndDate || t.endDate,
              originalStartDate: t.originalStartDate || t.startDate
            }
          })
          const finalSchedule = recalculateScheduleDependencies(updatedSchedule)
          setSchedule(finalSchedule)

          const newRainLog = {
            id: Date.now(),
            date: eventDate,
            days: delayDays,
            reason: reason || 'Lluvias vía Copilot',
            affectedCount: affectedTasksCount,
            previousSchedule: schedule,
            createdAt: new Date().toISOString()
          }
          const nextRainLogs = [newRainLog, ...rainLogs]
          setRainLogs(nextRainLogs)

          try {
            localStorage.setItem(`${storageKey}_sched`, JSON.stringify(finalSchedule))
            localStorage.setItem(`${storageKey}_rainLogs`, JSON.stringify(nextRainLogs))
          } catch {}

          const newDocEntry = {
            id: Date.now(),
            name: `Acta Técnica - Suspensión por Lluvia (${eventDate}).pdf`,
            type: 'certificaciones',
            version: 'v1.0',
            uploadedBy: 'OxI Copilot',
            date: new Date().toISOString().split('T')[0],
            fileSize: '320 KB',
            history: [{
              version: 'v1.0',
              date: new Date().toISOString().split('T')[0],
              responsible: 'OxI Copilot',
              notes: `Emisión de acta técnica por ${delayDays} días hábiles de lluvia. ${affectedTasksCount} tareas desplazadas en cascada.`
            }]
          }
          setDocuments(prev => [newDocEntry, ...prev])
        }}
      />

      {/* ── BARRA INFERIOR MÓVIL (BOTTOM TAB BAR TÁCTIL PARA PULGAR) ── */}
      <nav className="oxi-mobile-bottom-bar" aria-label="Navegación Móvil OxI Pro">
        <button
          type="button"
          className={`oxi-bottom-item ${activeTab === 'docs' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('docs')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span className="oxi-bottom-icon">📐</span>
          <span className="oxi-bottom-label">Planos</span>
          {documents.length > 0 && <span className="oxi-bottom-pill">{documents.length}</span>}
        </button>

        <button
          type="button"
          className={`oxi-bottom-item ${activeTab === 'cronograma' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('cronograma')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span className="oxi-bottom-icon">📅</span>
          <span className="oxi-bottom-label">Gantt</span>
          {schedule.length > 0 && <span className="oxi-bottom-pill">{schedule.length}</span>}
        </button>

        <button
          type="button"
          className={`oxi-bottom-item ${activeTab === 'control' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('control')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span className="oxi-bottom-icon">📊</span>
          <span className="oxi-bottom-label">Curva S</span>
        </button>

        <button
          type="button"
          className={`oxi-bottom-item ${activeTab === 'rubros' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('rubros')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span className="oxi-bottom-icon">🚨</span>
          <span className="oxi-bottom-label">Costos</span>
          {criticalAlertsCount > 0 && <span className="oxi-bottom-alert">!</span>}
        </button>

        <button
          type="button"
          className="oxi-bottom-item"
          onClick={() => onOpenMobileDrawer && onOpenMobileDrawer()}
        >
          <span className="oxi-bottom-icon">☰</span>
          <span className="oxi-bottom-label">Menú</span>
        </button>
      </nav>
    </div>
  )
}

