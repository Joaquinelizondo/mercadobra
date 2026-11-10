import { useEffect, useState, useMemo } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from '../components/OxidaWordmark'
import OxiProSuite from '../components/OxiProSuite'
import { 
  createMyQuote, getCustomerProfile, getMyQuoteMessages, getMyQuotes, 
  reportQuoteDepositTransfer, respondToMyQuote, sendMyQuoteMessage, 
  startQuoteDepositCheckout, updateCustomerProfile, getB2bProjects, 
  createB2bProject, assignQuoteToB2bProject, parseRequirementsWithAI
} from '../lib/api'
import { formatPrice } from '../utils/format'
import './CustomerPortal.css'
import './CustomerPortalMobile.css'

const STATUS = { in_progress:'En revisión', sent:'Cotizada', accepted:'Aceptada', project_in_progress:'En ejecución', completed:'Finalizada', rejected:'Rechazada', cancelled:'Cancelada' }
const TRACK_STAGES = [
  { status:'in_progress', label:'Solicitud recibida' },
  { status:'sent', label:'Cotización enviada' },
  { status:'accepted', label:'Presupuesto aprobado' },
  { status:'project_in_progress', label:'Obra en proceso' },
  { status:'completed', label:'Trabajo terminado' },
]
const TRACK_INDEX = Object.fromEntries(TRACK_STAGES.map((stage,index)=>[stage.status,index]))

const BUDGET_DOC_CATEGORIES = [
  { id: 'plano', label: 'Plano de Cotización (PDF / CAD)', icon: '📐', color: '#0284c7', accept: '.pdf,.dwg,.dxf,image/*' },
  { id: 'computo', label: 'Cómputo Métrico & Planilla (Excel / CSV)', icon: '📊', color: '#16a34a', accept: '.xlsx,.xls,.csv' },
  { id: 'pliego', label: 'Pliego Técnico & Memoria (PDF / Word)', icon: '📄', color: '#8b5cf6', accept: '.pdf,.doc,.docx,.txt' },
  { id: 'aprobacion', label: 'Presupuesto Firmado / Aprobación', icon: '✍️', color: '#ea580c', accept: '.pdf,image/*' }
]

const DEFAULT_CLASSIC_BUDGETS = [
  {
    id: 'bud_1',
    b2bProjectId: 1,
    title: 'Herrerías de Fachada, Barandas & Pérgolas Metálicas',
    referenceNumber: 'COT-2026-089',
    currentVersion: 'v2.1',
    status: 'accepted',
    currency: 'USD',
    totalAmount: 14850,
    validUntil: '2026-12-15',
    responsible: 'Ing. Lucas Ferrando (Óxida Herrerías)',
    clientNotes: 'Aprobado con la modificación de pasamanos en lapacho y acabado en pintura microtexturada negra.',
    versions: [
      {
        version: 'v2.1',
        date: '2026-11-06',
        status: 'accepted',
        totalAmount: 14850,
        author: 'Ing. Lucas Ferrando (Óxida)',
        notes: 'Aprobación final de comitente. Se unificaron espesores de perfiles tubulares a 2mm y anclajes químicos Hilti.',
        delta: '-4.8%'
      },
      {
        version: 'v2.0',
        date: '2026-11-02',
        status: 'reviewing',
        totalAmount: 15600,
        author: 'Arq. Juan Pérez (Constructora)',
        notes: 'Revisión por cambio de baranda de vidrio templado a baranda de perfiles verticales continuos.',
        delta: '-7.7%'
      },
      {
        version: 'v1.0',
        date: '2026-10-24',
        status: 'sent',
        totalAmount: 16900,
        author: 'Ing. Lucas Ferrando (Óxida)',
        notes: 'Propuesta comercial y cómputo preliminar según plano de arquitectura Rev A.',
        delta: 'Base'
      }
    ],
    items: [
      { id: 'it_1', code: '01.01', name: 'Barandas de balcones en acero al carbono con pasamanos madera', unit: 'ml', qty: 48, unitPrice: 160, total: 7680 },
      { id: 'it_2', code: '01.02', name: 'Escalera marinera de servicio para azotea con jaula crinolina', unit: 'un', qty: 1, unitPrice: 1450, total: 1450 },
      { id: 'it_3', code: '01.03', name: 'Pérgola metálica tubular 100x50x2mm con tratamiento electroestático', unit: 'm²', qty: 32, unitPrice: 120, total: 3840 },
      { id: 'it_4', code: '01.04', name: 'Portón corredizo automatizado para acceso vehicular en chapa calada', unit: 'un', qty: 1, unitPrice: 1880, total: 1880 }
    ],
    documents: [
      { id: 'doc_1', name: 'Plano_Herreria_Fachada_RevB.pdf', category: 'plano', categoryLabel: 'Plano de Cotización', size: '2.4 MB', date: '2026-11-05', url: '#' },
      { id: 'doc_2', name: 'Computo_Metrico_Oficial_v2.xlsx', category: 'computo', categoryLabel: 'Cómputo Métrico', size: '480 KB', date: '2026-11-04', url: '#' },
      { id: 'doc_3', name: 'Pliego_Especificaciones_Tecnicas.pdf', category: 'pliego', categoryLabel: 'Pliego Técnico', size: '1.2 MB', date: '2026-11-01', url: '#' },
      { id: 'doc_4', name: 'Presupuesto_Comercial_Oxida_Firmado.pdf', category: 'aprobacion', categoryLabel: 'Presupuesto Formal Firmado', size: '890 KB', date: '2026-11-06', url: '#' }
    ]
  }
]
const EMPTY_REQUEST = { 
  title: '', 
  description: '', 
  budget: '', 
  currency: 'UYU', 
  desiredDate: '', 
  attachments: [], 
  b2bProjectId: null 
}

function readFiles(files, category = 'archivo') {
  return Promise.all(Array.from(files || []).slice(0, 10).map((file) => new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Cada archivo debe pesar menos de 10 MB.'))
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, type: file.type, category, data: reader.result })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })))
}

function shortDate(value) {
  if (!value) return ''
  const text = String(value)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-UY')
}

export default function CustomerPortal() {
  const { customerUser, customerToken, logoutCustomer } = useAuth()
  const [profile, setProfile] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [b2bProjects, setB2bProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null) // null means "All" or "Unassigned"
  
  // Platform tier mode: 'classic' | 'pro'
  const [platformMode, setPlatformMode] = useState('classic')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [proNotes, setProNotes] = useState('')
  const [proRequestSuccess, setProRequestSuccess] = useState(false)
  const [savingProRequest, setSavingProRequest] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectLocation, setNewProjectLocation] = useState('')

  const [messages, setMessages] = useState([])
  const [request, setRequest] = useState(EMPTY_REQUEST)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [depositReceipt, setDepositReceipt] = useState(null)
  const [isCustomerAiAnalyzing, setIsCustomerAiAnalyzing] = useState(false)
  const [customerAiResult, setCustomerAiResult] = useState(null)

  async function handleCustomerAiAnalyze() {
    if (!request.description?.trim()) return
    setIsCustomerAiAnalyzing(true)
    setError('')
    try {
      const res = await parseRequirementsWithAI(request.description, customerToken)
      setCustomerAiResult(res.data)
    } catch (err) {
      setError(err.message || 'No se pudo analizar la especificación.')
    } finally {
      setIsCustomerAiAnalyzing(false)
    }
  }

  useEffect(() => { 
    if (!customerToken) return; 
    Promise.all([getCustomerProfile(customerToken), getMyQuotes(customerToken), getB2bProjects(customerToken)])
      .then(([p, q, b2b]) => { 
        setProfile(p); 
        if (p?.tier === 'pro') setPlatformMode('pro');
        setQuotes(q.rows || []);
        setB2bProjects(b2b.rows || []);
        if (b2b.rows && b2b.rows.length > 0) setActiveProjectId(b2b.rows[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false)) 
  }, [customerToken])

  const isProUser = profile?.tier === 'pro'

  const activeProject = useMemo(() => {
    return b2bProjects.find(p => p.id === activeProjectId) || b2bProjects[0] || { id: 1, name: 'Obra Principal (Sede)' }
  }, [b2bProjects, activeProjectId])

  const filteredQuotes = activeProjectId 
    ? quotes.filter(q => q.b2bProjectId === activeProjectId)
    : quotes

  // Kanban groupings
  const requestedQuotes = filteredQuotes.filter(q => ['in_progress', 'reviewing'].includes(q.status))
  const inProgressQuotes = filteredQuotes.filter(q => ['sent', 'accepted', 'project_in_progress'].includes(q.status))
  const completedQuotes = filteredQuotes.filter(q => ['completed', 'cancelled', 'rejected'].includes(q.status))

  // ── MÓDULO EXCLUSIVO OXI CLÁSICO: PRESUPUESTOS, HISTORIAL & DOCUMENTACIÓN ──
  const [classicTab, setClassicTab] = useState('budgets') // 'budgets' | 'kanban'
  const [classicBudgets, setClassicBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem(`oxi_classic_budgets_${activeProjectId || 'global'}`)
      return saved ? JSON.parse(saved) : DEFAULT_CLASSIC_BUDGETS
    } catch {
      return DEFAULT_CLASSIC_BUDGETS
    }
  })
  const [activeBudgetId, setActiveBudgetId] = useState(() => DEFAULT_CLASSIC_BUDGETS[0]?.id || null)
  const [showNewVersionModal, setShowNewVersionModal] = useState(false)
  const [newVersionNotes, setNewVersionNotes] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustNotes, setAdjustNotes] = useState('')
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemForm, setNewItemForm] = useState({ code: '', name: '', unit: 'ml', qty: 1, unitPrice: 0 })

  const activeBudget = useMemo(() => {
    return classicBudgets.find(b => b.id === activeBudgetId) || classicBudgets[0] || null
  }, [classicBudgets, activeBudgetId])

  useEffect(() => {
    try {
      localStorage.setItem(`oxi_classic_budgets_${activeProjectId || 'global'}`, JSON.stringify(classicBudgets))
    } catch (e) {
      console.warn('Error saving classic budgets', e)
    }
  }, [classicBudgets, activeProjectId])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`oxi_classic_budgets_${activeProjectId || 'global'}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setClassicBudgets(parsed)
        if (parsed.length > 0) setActiveBudgetId(parsed[0].id)
      } else {
        setClassicBudgets(DEFAULT_CLASSIC_BUDGETS)
        setActiveBudgetId(DEFAULT_CLASSIC_BUDGETS[0]?.id || null)
      }
    } catch {
      setClassicBudgets(DEFAULT_CLASSIC_BUDGETS)
    }
  }, [activeProjectId])

  async function handleBudgetFileUpload(e, category = 'computo') {
    const files = e.target.files
    if (!files || !files.length) return
    try {
      const newDocs = await readFiles(files, category)
      const catDef = BUDGET_DOC_CATEGORIES.find(c => c.id === category) || { label: 'Documento Técnico' }
      const formattedDocs = newDocs.map(d => ({
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: d.name,
        category: d.category || category,
        categoryLabel: catDef.label,
        size: `${Math.max(1, Math.round((d.data?.length || 1024) * 0.75 / 1024))} KB`,
        date: new Date().toISOString().split('T')[0],
        url: d.data
      }))
      setClassicBudgets(prev => prev.map(b => {
        if (b.id === activeBudget?.id) {
          return {
            ...b,
            documents: [...(b.documents || []), ...formattedDocs]
          }
        }
        return b
      }))
    } catch (err) {
      setError(err.message || 'Error al cargar documento')
    }
    e.target.value = ''
  }

  function handleDeleteBudgetDoc(docId) {
    if (!window.confirm('¿Deseas eliminar este documento del presupuesto?')) return
    setClassicBudgets(prev => prev.map(b => {
      if (b.id === activeBudget?.id) {
        return {
          ...b,
          documents: (b.documents || []).filter(d => d.id !== docId)
        }
      }
      return b
    }))
  }

  function handleCreateNewVersion(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!newVersionNotes.trim() || !activeBudget) return
    const currentVerNum = parseFloat(activeBudget.currentVersion.replace('v', '')) || 2.1
    const nextVer = `v${(currentVerNum + 0.1).toFixed(1)}`
    const newVerEntry = {
      version: nextVer,
      date: new Date().toISOString().split('T')[0],
      status: 'reviewing',
      totalAmount: activeBudget.totalAmount,
      author: profile?.name || 'Cliente / Constructora',
      notes: newVersionNotes.trim(),
      delta: 'Revisión'
    }
    setClassicBudgets(prev => prev.map(b => {
      if (b.id === activeBudget.id) {
        return {
          ...b,
          currentVersion: nextVer,
          status: 'reviewing',
          versions: [newVerEntry, ...(b.versions || [])]
        }
      }
      return b
    }))
    setShowNewVersionModal(false)
    setNewVersionNotes('')
  }

  function handleApproveBudget() {
    if (!activeBudget) return
    if (!window.confirm(`¿Aprobar formalmente el presupuesto "${activeBudget.title}" por ${activeBudget.currency} $${activeBudget.totalAmount.toLocaleString()}?\n\nEsta acción confirma la cotización y la habilita para la ejecución en obra.`)) return
    const newVerEntry = {
      version: `${activeBudget.currentVersion} (Aprobado)`,
      date: new Date().toISOString().split('T')[0],
      status: 'accepted',
      totalAmount: activeBudget.totalAmount,
      author: profile?.name || 'Comitente / Cliente',
      notes: 'Presupuesto formalmente aceptado por el cliente. Aprobado para emisión de orden de fabricación y obra.',
      delta: 'Aprobado'
    }
    setClassicBudgets(prev => prev.map(b => {
      if (b.id === activeBudget.id) {
        return {
          ...b,
          status: 'accepted',
          versions: [newVerEntry, ...(b.versions || [])]
        }
      }
      return b
    }))
    alert('✓ Presupuesto comercial aprobado con éxito.')
  }

  function handleRequestAdjustment(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!adjustNotes.trim() || !activeBudget) return
    const currentVerNum = parseFloat(activeBudget.currentVersion.replace('v', '')) || 2.1
    const nextVer = `v${(currentVerNum + 0.1).toFixed(1)}`
    const newVerEntry = {
      version: nextVer,
      date: new Date().toISOString().split('T')[0],
      status: 'reviewing',
      totalAmount: activeBudget.totalAmount,
      author: profile?.name || 'Cliente / Constructora',
      notes: `Ajuste solicitado: ${adjustNotes.trim()}`,
      delta: 'Ajuste solicitado'
    }
    setClassicBudgets(prev => prev.map(b => {
      if (b.id === activeBudget.id) {
        return {
          ...b,
          currentVersion: nextVer,
          status: 'reviewing',
          versions: [newVerEntry, ...(b.versions || [])]
        }
      }
      return b
    }))
    setShowAdjustModal(false)
    setAdjustNotes('')
    alert('✓ Solicitud de ajuste enviada al equipo de cotizaciones de Óxida.')
  }

  function handleAddLineItem(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!newItemForm.name.trim() || !activeBudget) return
    const qty = Number(newItemForm.qty) || 1
    const unitPrice = Number(newItemForm.unitPrice) || 0
    const total = qty * unitPrice
    const nextCode = newItemForm.code.trim() || `01.0${(activeBudget.items?.length || 0) + 1}`
    const newItem = {
      id: `it_${Date.now()}`,
      code: nextCode,
      name: newItemForm.name.trim(),
      unit: newItemForm.unit,
      qty,
      unitPrice,
      total
    }
    setClassicBudgets(prev => prev.map(b => {
      if (b.id === activeBudget.id) {
        const updatedItems = [...(b.items || []), newItem]
        const updatedTotal = updatedItems.reduce((acc, curr) => acc + (curr.total || 0), 0)
        return {
          ...b,
          items: updatedItems,
          totalAmount: updatedTotal
        }
      }
      return b
    }))
    setShowAddItemModal(false)
    setNewItemForm({ code: '', name: '', unit: 'ml', qty: 1, unitPrice: 0 })
  }

  function handleDeleteLineItem(itemId) {
    if (!activeBudget) return
    if (!window.confirm('¿Deseas eliminar esta partida del presupuesto?')) return
    setClassicBudgets(prev => prev.map(b => {
      if (b.id === activeBudget.id) {
        const updatedItems = (b.items || []).filter(it => it.id !== itemId)
        const updatedTotal = updatedItems.reduce((acc, curr) => acc + (curr.total || 0), 0)
        return {
          ...b,
          items: updatedItems,
          totalAmount: updatedTotal
        }
      }
      return b
    }))
  }

  useEffect(() => { 
    if (selected && customerToken) {
      getMyQuoteMessages(selected.id, customerToken)
        .then(r => setMessages(r.rows || []))
        .catch(() => {})
    }
  }, [selected, customerToken])

  async function submitRequest(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...request, b2bProjectId: activeProjectId }
      const res = await createMyQuote(payload, customerToken)
      setQuotes([res, ...quotes]); setRequest(EMPTY_REQUEST); setIsCreatingQuote(false)
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function submitProUpgradeRequest(e) {
    if (e) e.preventDefault()
    setSavingProRequest(true)
    setError('')
    try {
      const notes = proNotes.trim()
        ? `Solicitud de habilitación OxI Pro: ${proNotes.trim()}`
        : 'Solicito la habilitación de mi cuenta de constructora / estudio al nivel OxI Pro para control técnico de obra y costos.'
      
      const payload = {
        title: 'Solicitud de Habilitación a Suite OxI Pro',
        description: notes,
        currency: 'UYU',
        b2bProjectId: activeProjectId
      }
      const res = await createMyQuote(payload, customerToken)
      setQuotes([res, ...quotes])
      setProNotes('')
      setShowUpgradeModal(false)
      setProRequestSuccess(true)
    } catch(err) {
      setError(err.message)
    } finally {
      setSavingProRequest(false)
    }
  }

  async function submitNewProject(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await createB2bProject({ name: newProjectName, location: newProjectLocation }, customerToken)
      setB2bProjects([...b2bProjects, res])
      setActiveProjectId(res.id)
      setIsCreatingProject(false)
      setNewProjectName(''); setNewProjectLocation('')
      if (isProUser) setPlatformMode('pro')
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function sendMessage(e) {
    e.preventDefault(); if(!message.trim()) return; setSaving(true); setError('')
    try {
      const res = await sendMyQuoteMessage(selected.id, { message }, customerToken)
      setMessages([...messages, res]); setMessage('')
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function respond(decision) {
    if(!window.confirm('¿Confirmar esta decisión?')) return; setSaving(true); setError('')
    try {
      const res = await respondToMyQuote(selected.id, decision, customerToken)
      setQuotes(quotes.map(q => q.id === selected.id ? res : q)); setSelected(res)
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function payDeposit() { window.alert('Integración de Mercado Pago pendiente.') }

  async function reportTransfer() {
    setSaving(true); setError('')
    try {
      const res = await reportQuoteDepositTransfer(selected.id, depositReceipt, customerToken)
      setQuotes(quotes.map(q => q.id === selected.id ? res : q)); setSelected(res)
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true); setError('')
    try { await updateCustomerProfile(profile, customerToken) }
    catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (!customerUser || !customerToken) return <Navigate to="/cliente/login?redirect=/cliente" replace />
  if (loading && !profile) return <div className="oxi-os-dashboard"><p style={{padding:'2rem'}}>Cargando OXI OS…</p></div>

  return (
    <div className={`oxi-os-dashboard ${platformMode === 'pro' && !isEditingProfile && !isCreatingProject ? 'is-pro-mode' : ''}`}>
      {/* ── TELÓN DE FONDO (BACKDROP) DEL DRAWER MÓVIL ── */}
      {mobileMenuOpen && (
        <div 
          className="oxi-drawer-backdrop" 
          onClick={() => setMobileMenuOpen(false)} 
          aria-hidden="true"
        />
      )}

      {/* ── TOP APP HEADER MÓVIL (PWA & SMARTPHONE) ── */}
      <header className="oxi-mobile-app-header">
        <button 
          type="button" 
          className="oxi-mobile-menu-trigger" 
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir Menú de Obra"
        >
          ☰
        </button>
        <div className="oxi-mobile-header-center" onClick={() => setMobileMenuOpen(true)}>
          <span className="oxi-mobile-header-label">{activeProject?.name || 'Mercadobra'}</span>
          <span className="oxi-mobile-header-arrow">▾</span>
        </div>
        <button
          type="button"
          className="oxi-mobile-camera-btn"
          onClick={() => {
            if (platformMode !== 'pro') {
              setPlatformMode('pro')
            }
            window.dispatchEvent(new CustomEvent('oxi-open-site-event-modal'))
          }}
          title="Tomar foto de obra / Registrar evento"
          aria-label="Sacar foto de obra"
        >
          📷
        </button>
        <button
          type="button"
          className={`oxi-mobile-mode-pill ${platformMode === 'pro' ? 'is-pro' : 'is-classic'}`}
          onClick={() => {
            setPlatformMode(prev => prev === 'pro' ? 'classic' : 'pro')
          }}
          title="Cambiar entre OxI Pro y OxI Clásico"
        >
          {platformMode === 'pro' ? '⚡ PRO' : '🛠️ CLÁSICO'}
        </button>
      </header>

      <aside className={`oxi-os-sidebar ${mobileMenuOpen ? 'is-mobile-open' : ''}`}>
        <div className="oxi-sidebar-mobile-bar">
          <div className="oxi-sidebar-brand-mobile">
            <OxidaWordmark />
          </div>
          <button 
            type="button" 
            className="oxi-sidebar-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar Menú"
          >
            ✕
          </button>
        </div>

        <div className="oxi-os-brand desktop-only-brand">
          <OxidaWordmark />
        </div>
        
        <div className="oxi-os-user">
          <div className="oxi-os-avatar">
            {profile?.name?.[0] || 'C'}
          </div>
          <div className="oxi-os-user-info">
            <strong className="oxi-os-user-name">{profile?.name || 'Constructora / Estudio'}</strong>
            <span className="oxi-os-user-company">{profile?.companyName || 'Arquitectura & Obra'}</span>
            <div className="oxi-os-badge-wrap">
              <span className={`oxi-os-badge ${isProUser ? 'is-pro' : 'is-classic'}`}>
                {isProUser ? '⚡ PLAN OXI PRO' : '🛠️ PLAN OXI CLÁSICO'}
              </span>
            </div>
          </div>
        </div>

        {/* ── PLATFORM SWITCHER SIDEBAR ── */}
        <div className="oxi-sidebar-platform-switch">
          <label>Nivel de Plataforma</label>
          <div className="platform-toggle-group">
            <button
              type="button"
              className={`platform-toggle-btn ${platformMode === 'classic' ? 'is-active' : ''}`}
              onClick={() => { setPlatformMode('classic'); setSelected(null); setMobileMenuOpen(false); }}
            >
              🛠️ OxI Clásico
            </button>
            <button
              type="button"
              className={`platform-toggle-btn ${platformMode === 'pro' ? 'is-active' : ''}`}
              onClick={() => {
                setPlatformMode('pro'); 
                setSelected(null); 
                setIsCreatingQuote(false); 
                setIsEditingProfile(false); 
                setIsCreatingProject(false); 
                setMobileMenuOpen(false);
              }}
            >
              ⚡ OxI Pro
            </button>
          </div>
        </div>
        
        {b2bProjects.length > 0 && (
          <div className="oxi-os-project-select">
            <label>Obra seleccionada</label>
            <select 
              value={activeProjectId || ''} 
              onChange={(e) => {
                setActiveProjectId(e.target.value ? Number(e.target.value) : null);
                setSelected(null);
                setIsCreatingProject(false);
                setIsCreatingQuote(false);
                setIsEditingProfile(false);
                setMobileMenuOpen(false);
              }}
            >
              <option value="">Todas las obras</option>
              {b2bProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="oxi-os-menu">
          <button 
            type="button"
            className="oxi-os-btn secondary"
            onClick={() => { setIsCreatingProject(true); setSelected(null); setIsCreatingQuote(false); setIsEditingProfile(false); setPlatformMode('classic'); setMobileMenuOpen(false); }}
          >
            <span className="oxi-btn-icon">＋</span> Nueva Obra
          </button>

          <button 
            type="button"
            className="oxi-os-btn primary"
            onClick={() => { 
              setIsCreatingQuote(true); 
              setIsCreatingProject(false); 
              setSelected(null); 
              setIsEditingProfile(false); 
              setPlatformMode('classic');
              setRequest(EMPTY_REQUEST);
              setMobileMenuOpen(false);
            }}
          >
            <span className="oxi-btn-icon">＋</span> Nueva Cotización
          </button>

          <Link to="/cliente/modelador" className="oxi-os-btn simulator" onClick={() => setMobileMenuOpen(false)}>
            <span className="oxi-btn-icon">📐</span> Simulador 3D Óxida
          </Link>
        </div>

        <div className="oxi-os-footer-actions">
          <button 
            type="button"
            className="oxi-os-btn dark" 
            onClick={() => { setIsEditingProfile(true); setIsCreatingProject(false); setIsCreatingQuote(false); setSelected(null); setMobileMenuOpen(false); }}
          >
            ⚙️ Perfil de Constructora
          </button>

          <button 
            type="button"
            className="oxi-os-btn dark" 
            onClick={logoutCustomer}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="oxi-os-main">
        {/* If in PRO mode and not editing profile or project, render OxiProSuite */}
        {platformMode === 'pro' && !isEditingProfile && !isCreatingProject ? (
          <OxiProSuite 
            project={activeProject} 
            projects={b2bProjects}
            onSelectProject={(id) => { setActiveProjectId(id); setMobileMenuOpen(false); }}
            onBackToClassic={() => { setPlatformMode('classic'); setMobileMenuOpen(false); }} 
            onOpenMobileDrawer={() => setMobileMenuOpen(true)}
          />
        ) : (
          /* PLATAFORMA OXI CLÁSICO */
          <>
            <header className="oxi-os-main-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span>PLATAFORMA OXI CLÁSICO</span>
                  <span className="classic-tag">OPERATIVA CONSTRUCTORAS & ESTUDIOS</span>
                </div>
                <h1>Gestión de Obras & Cotizaciones</h1>
                <p>Carga de planos, memorias, fotos, archivos y seguimiento en tiempo real de cotizaciones.</p>
              </div>

              <div className="header-platform-toggle">
                <button 
                  className="switch-to-pro-btn"
                  onClick={() => {
                    if (isProUser) {
                      setPlatformMode('pro')
                    } else {
                      setShowUpgradeModal(true)
                    }
                  }}
                >
                  {isProUser ? '⚡ Abrir Suite OxI Pro (Ingeniería & Costos) →' : '🔒 Solicitar Suite OxI Pro (Constructoras) →'}
                </button>
              </div>
            </header>

            {error && <p className="customer-portal-error" style={{color: 'red', marginBottom: '1rem'}}>{error}</p>}

            {proRequestSuccess && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div>
                  <strong style={{ color: '#166534', display: 'block', fontSize: '1rem', marginBottom: '2px' }}>
                    ✅ Solicitud de Suite OxI Pro enviada con éxito
                  </strong>
                  <p style={{ margin: 0, color: '#15803d', fontSize: '0.88rem' }}>
                    Recibimos tu solicitud. El equipo técnico y de administración de Óxida / Mercadobra activará las herramientas de control de obra en tu cuenta en breve.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setProRequestSuccess(false)}
                  style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* SUB-NAVEGACIÓN OXI CLÁSICO: PRESUPUESTOS vs TABLERO vs NUEVA */}
            {!isEditingProfile && !isCreatingProject && !selected && !isCreatingQuote && (
              <div className="oxi-classic-subnav" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`oxi-subnav-pill ${classicTab === 'budgets' ? 'is-active' : ''}`}
                  onClick={() => setClassicTab('budgets')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: classicTab === 'budgets' ? 700 : 500,
                    background: classicTab === 'budgets' ? '#0f172a' : '#ffffff',
                    color: classicTab === 'budgets' ? '#ffffff' : '#334155',
                    border: classicTab === 'budgets' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>📑</span> Presupuestos & Historial Documental
                </button>
                <button
                  type="button"
                  className={`oxi-subnav-pill ${classicTab === 'kanban' ? 'is-active' : ''}`}
                  onClick={() => setClassicTab('kanban')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: classicTab === 'kanban' ? 700 : 500,
                    background: classicTab === 'kanban' ? '#0f172a' : '#ffffff',
                    color: classicTab === 'kanban' ? '#ffffff' : '#334155',
                    border: classicTab === 'kanban' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>📊</span> Tablero Kanban ({filteredQuotes.length})
                </button>
                <button
                  type="button"
                  className="oxi-subnav-pill"
                  onClick={() => {
                    setIsCreatingQuote(true);
                    setRequest(EMPTY_REQUEST);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    background: '#f8fafc',
                    color: '#ea580c',
                    border: '1px solid #fed7aa',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    marginLeft: 'auto'
                  }}
                >
                  <span>＋</span> Solicitar Nueva Cotización
                </button>
              </div>
            )}

            {isEditingProfile ? (
              <form className="oxi-os-profile-form" onSubmit={saveProfile} style={{maxWidth: '640px', background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e5e5e5', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{margin: 0, fontSize: '1.5rem', color: '#1a1a1a'}}>Perfil de Cliente / Constructora</h2>
                  <button type="button" onClick={() => setIsEditingProfile(false)} style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer', fontSize: '1rem' }}>✕ Cerrar</button>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                    Nombre del Responsable / Contacto
                    <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none'}} value={profile?.name||''} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Ej: Arq. Juan Pérez" />
                  </label>
                  <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                    Empresa Constructora / Estudio de Arquitectura
                    <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none'}} value={profile?.companyName||''} onChange={e=>setProfile({...profile,companyName:e.target.value})} placeholder="Constructora del Plata SRL" />
                  </label>
                  <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                    Teléfono directo de obra
                    <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none'}} value={profile?.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+598 99 123 456" />
                  </label>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                    <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                      Localidad / Barrio
                      <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none'}} value={profile?.city||''} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="Pocitos / Carrasco" />
                    </label>
                    <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                      Departamento
                      <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none'}} value={profile?.department||''} onChange={e=>setProfile({...profile,department:e.target.value})} placeholder="Montevideo" />
                    </label>
                  </div>
                  <button disabled={saving} style={{marginTop: '1rem', padding: '14px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer'}}>
                    {saving ? 'Guardando...' : 'Guardar Perfil'}
                  </button>
                </div>
              </form>
            ) : isCreatingProject ? (
              <div className="customer-request">
                <div>
                  <span>Nueva Obra</span>
                  <h2>Dar de alta un nuevo proyecto</h2>
                  <p>Creá una obra para organizar sus planos, memorias, cronograma y pedidos.</p>
                </div>
                <form onSubmit={submitNewProject}>
                  <label>Nombre de la Obra (Ej: Torre Libertador, Complejo Solís)<input value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} required/></label>
                  <label>Ubicación / Dirección exacta<input value={newProjectLocation} onChange={e=>setNewProjectLocation(e.target.value)} placeholder="Ej: Av. Brasil 2450, Montevideo"/></label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setIsCreatingProject(false)}>Cancelar</button>
                    <button disabled={saving}>{saving?'Creando...':'Crear Obra'}</button>
                  </div>
                </form>
              </div>
            ) : selected ? (
              <div className="quote-workspace">
                <button className="quote-back" onClick={()=>setSelected(null)}>← Volver al tablero</button>
                <div className="quote-workspace-head">
                  <div>
                    <span>{selected.referenceNumber} · {STATUS[selected.status]}</span>
                    <h2>{selected.title}</h2>
                    <p>{selected.description}</p>
                  </div>
                  {selected.totalAmount>0 && <strong>{formatPrice(selected.totalAmount, selected.currency)}</strong>}
                </div>

                {selected.proposalDescription && (
                  <div className="quote-proposal-copy">
                    <strong>Propuesta de Mercadobra / Óxida</strong>
                    <p>{selected.proposalDescription}</p>
                  </div>
                )}

                {/* Attachments categorizados */}
                {selected.attachments?.length > 0 && (
                  <div className="quote-files">
                    <strong>Archivos adjuntos:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {selected.attachments.map((f, i) => (
                        <a key={i} href={f.url || f.data} target="_blank" rel="noreferrer" download={!f.url ? f.name : undefined} className="attachment-badge">
                          {f.category === 'plano' ? '📐' : f.category === 'memoria' ? '📄' : f.category === 'foto' ? '📷' : '📎'} {f.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tracker de 5 etapas */}
                <section className="project-tracker">
                  <div className="project-tracker-heading">
                    <span>Seguimiento en Vivo</span>
                    <h3>Estado de tu proyecto</h3>
                  </div>
                  <ol>
                    {TRACK_STAGES.map((stage, index) => {
                      const current = TRACK_INDEX[selected.status] ?? 0;
                      const state = index < current ? 'is-complete' : index === current ? 'is-current' : '';
                      return (
                        <li key={stage.status} className={state}>
                          <i aria-hidden="true">{index < current ? '✓' : index + 1}</i>
                          <span>{stage.label}</span>
                        </li>
                      )
                    })}
                  </ol>
                  {['rejected','cancelled'].includes(selected.status) && (
                    <p className="project-tracker-alert">Esta cotización está {STATUS[selected.status].toLowerCase()}.</p>
                  )}
                  {(selected.milestones || []).length > 0 && (
                    <div className="project-milestones">
                      <h4>Etapas del proyecto</h4>
                      {selected.milestones.map((item, index) => (
                        <article key={item.id || index} className={`is-${item.status}`}>
                          <i>{item.status === 'completed' ? '✓' : index + 1}</i>
                          <div>
                            <strong>{item.title}</strong>
                            {item.description && <p>{item.description}</p>}
                            <small>{item.status === 'completed' && item.completedAt ? `Terminado el ${shortDate(item.completedAt)}` : [item.plannedStartAt, item.plannedEndAt].filter(Boolean).map(shortDate).join(' — ') || 'Fecha a confirmar'}</small>
                          </div>
                          <span>{item.status === 'completed' ? 'Terminado' : item.status === 'in_progress' ? 'En proceso' : 'Pendiente'}</span>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                {selected.status === 'sent' && (
                  <div className="quote-decision">
                    <p>¿Cómo deseás continuar con esta propuesta comercial?</p>
                    <button onClick={() => respond('accepted')}>✓ Aceptar cotización</button>
                    <button onClick={() => respond('rejected')}>Solicitar ajuste / nueva propuesta</button>
                  </div>
                )}

                {selected.status === 'accepted' && selected.depositAmount > 0 && (
                  <section className="quote-deposit">
                    <span>Reserva del proyecto</span>
                    <h3>Confirmá la seña de {formatPrice(selected.depositAmount, selected.currency)}</h3>
                    {selected.depositStatus === 'reported' ? (
                      <p>Recibimos tu comprobante de transferencia. El equipo confirmará en breve.</p>
                    ) : selected.depositStatus === 'approved' ? (
                      <p>Pago confirmado. Tu proyecto ya pasó a producción / obra.</p>
                    ) : (
                      <>
                        <button type="button" onClick={payDeposit} disabled={saving}>Pagar con Mercado Pago</button>
                        <div className="quote-transfer">
                          <strong>¿Pagaste por transferencia bancaria?</strong>
                          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={async e => {
                            try { setDepositReceipt((await readFiles(e.target.files))[0] || null) } catch(err) { setError(err.message) }
                          }} />
                          <button type="button" onClick={reportTransfer} disabled={saving || !depositReceipt}>Informar transferencia</button>
                        </div>
                      </>
                    )}
                  </section>
                )}

                <div className="quote-thread">
                  <h4>Mensajes y consultas con el equipo técnico</h4>
                  {messages.length === 0 ? (
                    <p className="quote-thread-empty">Todavía no hay mensajes. Podés escribir tu primera consulta sobre esta cotización.</p>
                  ) : (
                    messages.map(m => (
                      <article key={m.id} className={m.authorRole === 'customer' ? 'is-customer' : 'is-admin'}>
                        <small>{m.authorRole === 'customer' ? 'Tu Estudio / Constructora' : 'Ingeniería Óxida'}</small>
                        <p>{m.message}</p>
                        <time>{new Date(m.createdAt).toLocaleString('es-UY')}</time>
                      </article>
                    ))
                  )}
                </div>

                <form className="quote-message-form" onSubmit={sendMessage}>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Escribí una consulta sobre esta cotización o modificaciones al diseño…" />
                  <button>Enviar mensaje</button>
                </form>
              </div>
            ) : isCreatingQuote ? (
              /* ENRICHED QUOTE REQUEST: PLANOS, MEMORIAS, FOTOS, ARCHIVOS */
              <div className="customer-request">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: '#ea580c', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Plataforma OxI Clásico
                    </span>
                    <span className="classic-tag">COTIZACIÓN DE FABRICACIÓN</span>
                  </div>
                  <h2>Solicitar Cotización de Herrería & Piezas</h2>
                  <p>
                    Cargá planos (CAD, PDF), memorias descriptivas o fotos de referencia para cotizar barandas, escaleras, pérgolas, aberturas o piezas especiales de tu obra.
                  </p>
                </div>

                <form onSubmit={submitRequest}>
                  <label>
                    Título del proyecto o pieza
                    <input 
                      value={request.title} 
                      onChange={e => setRequest({...request, title: e.target.value})} 
                      placeholder="Ej: Barandas de balcones, Escalera caracol, Pérgola de hierro y madera"
                      required
                    />
                  </label>

                  <label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Memoria y detalles técnicos</span>
                      {request.description?.trim().length > 10 && (
                        <button
                          type="button"
                          onClick={handleCustomerAiAnalyze}
                          disabled={isCustomerAiAnalyzing}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ea580c',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isCustomerAiAnalyzing ? '⏳ Analizando...' : '✨ Validar memoria técnica con IA'}
                        </button>
                      )}
                    </div>
                    <textarea 
                      rows="4" 
                      value={request.description} 
                      onChange={e => setRequest({...request, description: e.target.value})} 
                      placeholder="Medidas aproximadas, especificaciones de perfiles, tipos de madera, tratamiento de pintura..."
                      required
                    />
                  </label>

                  {customerAiResult && (
                    <div style={{ background: '#f8f5ef', border: '1px solid #dcd4c9', padding: '0.85rem 1rem', borderRadius: '6px', margin: '-4px 0 12px 0', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ color: '#ea580c', fontSize: '0.88rem' }}>🤖 OXI AI identificó en tu solicitud:</strong>
                        <button type="button" onClick={() => setCustomerAiResult(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.8rem' }}>✕ cerrar</button>
                      </div>
                      <ul style={{ margin: '0 0 6px 0', paddingLeft: '18px', color: '#333', lineHeight: '1.4' }}>
                        {customerAiResult.detected_items?.map((item, idx) => (
                          <li key={idx}>
                            <strong>{item.quantity}x {item.product_type}</strong>
                            {item.dimensions?.length_m ? ` (${item.dimensions.length_m}m × ${item.dimensions.height_m || '?'}m)` : ''}
                            {item.material ? ` · ${item.material}` : ''}
                            {item.finish ? ` · ${item.finish}` : ''}
                          </li>
                        ))}
                      </ul>
                      {customerAiResult.missing_critical_info?.length > 0 && (
                        <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '6px 10px', borderRadius: '4px', fontSize: '0.8rem', marginTop: '6px' }}>
                          <strong>💡 Consejo para acelerar tu cotización:</strong> Sugerimos aclarar: {customerAiResult.missing_critical_info.join(', ')}.
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '4px' }}>
                    <label>
                      Moneda de referencia
                      <select value={request.currency} onChange={e => setRequest({...request, currency: e.target.value})}>
                        <option>USD</option>
                        <option>UYU</option>
                      </select>
                    </label>
                    <label>
                      Fecha estimada de entrega en obra
                      <input type="date" value={request.desiredDate} onChange={e => setRequest({...request, desiredDate: e.target.value})} />
                    </label>
                  </div>

                  {/* Carga diferenciada de archivos */}
                  <div className="upload-sections-box">
                    <strong>📁 Carga de Documentación:</strong>
                    
                    <div className="upload-grid-row">
                      <div className="upload-col">
                        <label className="upload-btn-label">
                          📐 Cargar Planos (PDF / CAD)
                          <input 
                            type="file" 
                            accept=".pdf,.dwg,.dxf,image/*" 
                            multiple 
                            style={{ display: 'none' }}
                            onChange={async e => {
                              try {
                                const newFiles = await readFiles(e.target.files, 'plano')
                                setRequest(prev => ({ ...prev, attachments: [...prev.attachments, ...newFiles] }))
                              } catch(err) { setError(err.message) }
                            }}
                          />
                        </label>
                      </div>

                      <div className="upload-col">
                        <label className="upload-btn-label">
                          📄 Cargar Memoria Descriptiva
                          <input 
                            type="file" 
                            accept=".pdf,.doc,.docx,.txt" 
                            multiple 
                            style={{ display: 'none' }}
                            onChange={async e => {
                              try {
                                const newFiles = await readFiles(e.target.files, 'memoria')
                                setRequest(prev => ({ ...prev, attachments: [...prev.attachments, ...newFiles] }))
                              } catch(err) { setError(err.message) }
                            }}
                          />
                        </label>
                      </div>

                      <div className="upload-col">
                        <label className="upload-btn-label">
                          📷 Cargar Fotos de Obra / Sitio
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            style={{ display: 'none' }}
                            onChange={async e => {
                              try {
                                const newFiles = await readFiles(e.target.files, 'foto')
                                setRequest(prev => ({ ...prev, attachments: [...prev.attachments, ...newFiles] }))
                              } catch(err) { setError(err.message) }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {request.attachments.length > 0 && (
                      <div className="uploaded-list">
                        <small>Archivos listos para enviar ({request.attachments.length}):</small>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {request.attachments.map((f, idx) => (
                            <span key={idx} className="file-chip">
                              {f.category === 'plano' ? '📐' : f.category === 'memoria' ? '📄' : f.category === 'foto' ? '📷' : '📎'} {f.name}
                              <button 
                                type="button" 
                                onClick={() => setRequest(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                                style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: 0 }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => setIsCreatingQuote(false)}>Cancelar</button>
                    <button disabled={saving}>{saving ? 'Enviando solicitud…' : 'Enviar Solicitud de Cotización'}</button>
                  </div>
                </form>
              </div>
            ) : classicTab === 'budgets' && activeBudget ? (
              /* MÓDULO EXCLUSIVO: CENTRO DE PRESUPUESTOS, HISTORIAL & DOCUMENTACIÓN */
              <div className="classic-budget-hub" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* 1. HEADER DEL PRESUPUESTO & SELECTOR */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ea580c', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {activeBudget.referenceNumber}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: activeBudget.status === 'accepted' ? '#ecfdf5' : activeBudget.status === 'reviewing' ? '#fef3c7' : '#eff6ff',
                        color: activeBudget.status === 'accepted' ? '#047857' : activeBudget.status === 'reviewing' ? '#b45309' : '#1d4ed8'
                      }}>
                        {activeBudget.status === 'accepted' ? '✓ Presupuesto Aprobado' : activeBudget.status === 'reviewing' ? '⚠️ En Negociación / Revisión' : '📋 Cotización Vigente'}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Obra: <strong>{activeProject?.name || 'Obra Principal'}</strong>
                      </span>
                    </div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>
                      {activeBudget.title}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                      Responsable Técnico: <strong>{activeBudget.responsible}</strong> · {activeBudget.clientNotes}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {classicBudgets.length > 1 && (
                      <select
                        value={activeBudgetId}
                        onChange={e => setActiveBudgetId(e.target.value)}
                        style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
                      >
                        {classicBudgets.map(b => (
                          <option key={b.id} value={b.id}>{b.referenceNumber} · {b.title}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAdjustModal(true)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>💬</span> Solicitar Ajuste
                    </button>
                    {activeBudget.status !== 'accepted' && (
                      <button
                        type="button"
                        onClick={handleApproveBudget}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          background: '#15803d',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
                        }}
                      >
                        <span>✓</span> Aprobar Presupuesto
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. STRIP DE MÉTRICAS & KPIS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', borderLeft: '4px solid #ea580c' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Presupuesto Vigente</span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                      {formatPrice(activeBudget.totalAmount, activeBudget.currency)}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>Cómputo formal cerrado</span>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', borderLeft: '4px solid #0284c7' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Versión de Oferta</span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                      {activeBudget.currentVersion}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{activeBudget.versions?.length || 1} revisiones registradas</span>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Validez de la Oferta</span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px' }}>
                      {shortDate(activeBudget.validUntil) || '15/12/2026'}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#8b5cf6', fontWeight: 600 }}>Precio congelado</span>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', borderLeft: '4px solid #10b981' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pliegos & Docs Adjuntos</span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                      {activeBudget.documents?.length || 0}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Planos, cómputos y memorias</span>
                  </div>
                </div>

                {/* 3. HISTORIAL DE VERSIONES & TIMELINE */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📜</span> Historial de Revisiones & Negociación
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        Línea de tiempo de iteraciones del presupuesto con registro de cambios técnicos y económicos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewVersionModal(true)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>＋</span> Registrar Nueva Versión
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeBudget.versions?.map((v, i) => (
                      <div
                        key={v.version || i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '14px 16px',
                          borderRadius: '8px',
                          background: i === 0 ? '#f8fafc' : '#ffffff',
                          border: i === 0 ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                          borderLeft: i === 0 ? '4px solid #ea580c' : '4px solid #94a3b8'
                        }}
                      >
                        <div style={{ minWidth: '70px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: i === 0 ? '#ea580c' : '#e2e8f0',
                            color: i === 0 ? '#ffffff' : '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 800
                          }}>
                            {v.version}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                              {formatPrice(v.totalAmount, activeBudget.currency)}
                            </strong>
                            {v.delta && (
                              <span style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: v.delta.startsWith('-') ? '#ecfdf5' : '#f1f5f9',
                                color: v.delta.startsWith('-') ? '#047857' : '#475569'
                              }}>
                                {v.delta}
                              </span>
                            )}
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              📅 {shortDate(v.date) || v.date} · 👤 {v.author}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.45 }}>
                            {v.notes}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. CÓMPUTO MÉTRICO & DESGLOSE DE PARTIDAS (LINE ITEMS) */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> Cómputo Métrico & Desglose de Partidas
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        Detalle analítico de piezas cotizadas, unidades métricas y precios unitarios.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddItemModal(true)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          background: '#0f172a',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>＋</span> Agregar Partida
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Ítem</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Descripción Técnica & Material</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Unidad</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Cantidad</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Precio Unit.</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Subtotal</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeBudget.items?.map(it => (
                          <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{it.code}</td>
                            <td style={{ padding: '12px', color: '#334155' }}>{it.name}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{it.unit}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{it.qty}</td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>
                              {formatPrice(it.unitPrice, activeBudget.currency)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                              {formatPrice(it.total, activeBudget.currency)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteLineItem(it.id)}
                                title="Eliminar partida"
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                          <td colSpan="5" style={{ padding: '14px 12px', fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                            TOTAL PRESUPUESTO COMERCIAL ({activeBudget.currency})
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, fontSize: '1.15rem', color: '#ea580c' }}>
                            {formatPrice(activeBudget.totalAmount, activeBudget.currency)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 5. BANDEJA DE DOCUMENTOS, PLIEGOS & PLANOS (CARGA DE ARCHIVOS) */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📁</span> Documentación, Pliegos & Planos de Cotización ({activeBudget.documents?.length || 0})
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      Subí planos en PDF o CAD, memorias descriptivas, cómputos en Excel y actas de cotización firmadas.
                    </p>
                  </div>

                  {/* Botonera de subida rápida por categoría */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                    {BUDGET_DOC_CATEGORIES.map(cat => (
                      <label
                        key={cat.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '11px 14px',
                          borderRadius: '8px',
                          border: '1px dashed #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <input
                          type="file"
                          accept={cat.accept}
                          multiple
                          onChange={e => handleBudgetFileUpload(e, cat.id)}
                          style={{ display: 'none' }}
                        />
                      </label>
                    ))}
                  </div>

                  {/* Grilla de documentos cargados */}
                  {(!activeBudget.documents || activeBudget.documents.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', color: '#64748b' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay documentos técnicos adjuntos a este presupuesto todavía.</p>
                      <small style={{ color: '#94a3b8' }}>Usá los botones de arriba para subir planos, pliegos o cómputos en Excel.</small>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {activeBudget.documents.map(d => (
                        <div
                          key={d.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', minWidth: 0 }}>
                            <span style={{ fontSize: '1.4rem' }}>
                              {d.category === 'plano' ? '📐' : d.category === 'computo' ? '📊' : d.category === 'aprobacion' ? '✍️' : '📄'}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.name}>
                                {d.name}
                              </strong>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.72rem', background: '#ffffff', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                                  {d.categoryLabel || d.category}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{d.size} · {shortDate(d.date) || d.date}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {d.url && d.url !== '#' ? (
                              <a
                                href={d.url}
                                download={d.name}
                                target="_blank"
                                rel="noreferrer"
                                style={{ padding: '4px 8px', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}
                              >
                                Abrir
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => alert(`Visualizando documento técnico: ${d.name}`)}
                                style={{ padding: '4px 8px', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Ver
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteBudgetDoc(d.id)}
                              title="Eliminar archivo"
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TABLERO KANBAN DE COTIZACIONES */
              <div className="kanban-board">
                <div className="kanban-column">
                  <h3>Solicitadas ({requestedQuotes.length})</h3>
                  {requestedQuotes.length === 0 ? <p className="kanban-empty">No hay solicitudes en espera.</p> : requestedQuotes.map(q => (
                    <button key={q.id} className="kanban-card" onClick={() => setSelected(q)}>
                      <span>{q.referenceNumber}</span>
                      <strong>{q.title}</strong>
                      <small>{STATUS[q.status]}</small>
                    </button>
                  ))}
                </div>
                <div className="kanban-column">
                  <h3>En Proceso ({inProgressQuotes.length})</h3>
                  {inProgressQuotes.length === 0 ? <p className="kanban-empty">No hay cotizaciones aprobadas.</p> : inProgressQuotes.map(q => (
                    <button key={q.id} className="kanban-card" onClick={() => setSelected(q)}>
                      <span>{q.referenceNumber}</span>
                      <strong>{q.title}</strong>
                      <small>{STATUS[q.status]}</small>
                    </button>
                  ))}
                </div>
                <div className="kanban-column">
                  <h3>Finalizadas ({completedQuotes.length})</h3>
                  {completedQuotes.length === 0 ? <p className="kanban-empty">No hay trabajos terminados.</p> : completedQuotes.map(q => (
                    <button key={q.id} className="kanban-card" onClick={() => setSelected(q)}>
                      <span>{q.referenceNumber}</span>
                      <strong>{q.title}</strong>
                      <small>{STATUS[q.status]}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── BARRA INFERIOR MÓVIL PARA OXÍ CLÁSICO ── */}
            <nav className="oxi-mobile-bottom-bar classic-bar" aria-label="Navegación Móvil Clásico">
              <button
                type="button"
                className={`oxi-bottom-item ${classicTab === 'budgets' && !isCreatingQuote && !isCreatingProject && !isEditingProfile && !selected ? 'is-active' : ''}`}
                onClick={() => { setClassicTab('budgets'); setSelected(null); setIsCreatingQuote(false); setIsCreatingProject(false); setIsEditingProfile(false); }}
              >
                <span className="oxi-bottom-icon">📑</span>
                <span className="oxi-bottom-label">Presupuesto</span>
              </button>
              <button
                type="button"
                className={`oxi-bottom-item ${classicTab === 'kanban' && !isCreatingQuote && !isCreatingProject && !isEditingProfile && !selected ? 'is-active' : ''}`}
                onClick={() => { setClassicTab('kanban'); setSelected(null); setIsCreatingQuote(false); setIsCreatingProject(false); setIsEditingProfile(false); }}
              >
                <span className="oxi-bottom-icon">📊</span>
                <span className="oxi-bottom-label">Tablero</span>
              </button>
              <button
                type="button"
                className={`oxi-bottom-item ${isCreatingQuote ? 'is-active' : ''}`}
                onClick={() => { setIsCreatingQuote(true); setIsCreatingProject(false); setSelected(null); setIsEditingProfile(false); setRequest(EMPTY_REQUEST); }}
              >
                <span className="oxi-bottom-icon">＋</span>
                <span className="oxi-bottom-label">Nueva</span>
              </button>
              <Link to="/cliente/modelador" className="oxi-bottom-item">
                <span className="oxi-bottom-icon">📐</span>
                <span className="oxi-bottom-label">3D Óxida</span>
              </Link>
              <button
                type="button"
                className="oxi-bottom-item pro-highlight"
                onClick={() => {
                  setPlatformMode('pro')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <span className="oxi-bottom-icon">⚡</span>
                <span className="oxi-bottom-label">OxI Pro</span>
              </button>
              <button
                type="button"
                className="oxi-bottom-item"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="oxi-bottom-icon">☰</span>
                <span className="oxi-bottom-label">Menú</span>
              </button>
            </nav>
          </>
        )}
      </main>

      {/* ── MODAL: REGISTRAR NUEVA VERSIÓN DE PRESUPUESTO ── */}
      {showNewVersionModal && activeBudget && (
        <div className="oxi-modal-backdrop" onClick={() => setShowNewVersionModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                📜 Registrar Nueva Versión de Presupuesto
              </h3>
              <button
                type="button"
                onClick={() => setShowNewVersionModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              Generá una nueva iteración formal del presupuesto con las modificaciones técnicas o de diseño acordadas.
            </p>
            <form onSubmit={handleCreateNewVersion}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Notas de la versión / Modificaciones realizadas *
              </label>
              <textarea
                required
                rows="4"
                value={newVersionNotes}
                onChange={e => setNewVersionNotes(e.target.value)}
                placeholder="Ej: Se ajustaron dimensiones de perfiles tubulares a 50x30 y se reemplazó pasamanos por lapacho seco de primera..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowNewVersionModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#ea580c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Guardar Versión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SOLICITAR AJUSTE DE PRESUPUESTO ── */}
      {showAdjustModal && activeBudget && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAdjustModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                💬 Solicitar Ajuste Técnico o Comercial
              </h3>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              Indicá los cambios de material, dimensiones o ajustes que necesitás para que el equipo técnico emita una propuesta actualizada.
            </p>
            <form onSubmit={handleRequestAdjustment}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Detalle del ajuste solicitado *
              </label>
              <textarea
                required
                rows="4"
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
                placeholder="Ej: Necesitamos cotizar una alternativa sin madera en pasamanos para abaratar costos, o extender la pérgola 2 metros más..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAdjustModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGREGAR PARTIDA A LA COTIZACIÓN ── */}
      {showAddItemModal && activeBudget && (
        <div className="oxi-modal-backdrop" onClick={() => setShowAddItemModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                ＋ Agregar Partida al Presupuesto
              </h3>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddLineItem}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Código Ítem
                    <input
                      type="text"
                      value={newItemForm.code}
                      onChange={e => setNewItemForm({ ...newItemForm, code: e.target.value })}
                      placeholder="01.05"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </label>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Unidad Métrica
                    <select
                      value={newItemForm.unit}
                      onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    >
                      <option value="ml">ml (Metros lineales)</option>
                      <option value="m²">m² (Metros cuadrados)</option>
                      <option value="un">un (Unidades)</option>
                      <option value="kg">kg (Kilogramos)</option>
                      <option value="gl">gl (Global)</option>
                    </select>
                  </label>
                </div>

                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Descripción Técnica & Especificación *
                  <input
                    type="text"
                    required
                    value={newItemForm.name}
                    onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    placeholder="Ej: Pasamanos de acero inoxidable AISI 304 ø 50mm"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Cantidad
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={newItemForm.qty}
                      onChange={e => setNewItemForm({ ...newItemForm, qty: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </label>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Precio Unitario ({activeBudget.currency})
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={newItemForm.unitPrice}
                      onChange={e => setNewItemForm({ ...newItemForm, unitPrice: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddItemModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Guardar Partida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ACCESO EXCLUSIVO OXI PRO ── */}
      {showUpgradeModal && (
        <div className="oxi-modal-backdrop" onClick={() => setShowUpgradeModal(false)}>
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2rem' }}>🔒</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#1a1a1a' }}>Solicitud de Habilitación a Suite OxI Pro</h3>
                <span style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: '800', letterSpacing: '0.06em' }}>
                  CONTROL TÉCNICO, CRONOGRAMA & CURVA S
                </span>
              </div>
            </div>
            
            <p style={{ lineHeight: 1.5, color: '#525252', fontSize: '0.92rem', margin: '0.6rem 0 1rem' }}>
              Tu cuenta tiene actualmente el nivel <strong>OxI Clásico</strong> (solicitud y seguimiento de cotizaciones). Para activar las herramientas de ingeniería en tu constructora o estudio, enviá tu solicitud:
            </p>

            <div style={{ background: '#fffaf6', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 14px', marginBottom: '1.25rem' }}>
              <strong style={{ color: '#c2410c', display: 'block', marginBottom: '6px', fontSize: '0.86rem' }}>
                La Suite OxI Pro incluye:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: '#431407', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>📁 <strong>Gestor de Planos & Docs</strong> con iteraciones y control de versiones</li>
                <li>📅 <strong>Cronograma de Obra Gantt</strong> con asignación de cuadrillas y recursos</li>
                <li>📊 <strong>Curva S semanal</strong> (% Avance Real vs Presupuesto Cero P0)</li>
                <li>🚨 <strong>Alertas de Sobrecosto</strong> y desvíos financieros por rubro</li>
              </ul>
            </div>

            <form onSubmit={submitProUpgradeRequest}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#333', marginBottom: '6px' }}>
                Obras o detalles para la habilitación (opcional):
              </label>
              <textarea
                rows="2"
                value={proNotes}
                onChange={e => setProNotes(e.target.value)}
                placeholder="Ej: Deseamos habilitar OxI Pro para el control de la obra Torre Libertador..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d4d4d4',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  marginBottom: '1.25rem',
                  outline: 'none'
                }}
              />

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={savingProRequest}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="oxi-btn-primary" 
                  disabled={savingProRequest}
                  style={{
                    background: '#ea580c',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {savingProRequest ? 'Enviando solicitud…' : '✉ Enviar Solicitud de OxI Pro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
