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
    <div className="oxi-os-dashboard">
      <aside className="oxi-os-sidebar">
        <div className="oxi-os-brand">
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
              onClick={() => { setPlatformMode('classic'); setSelected(null); }}
            >
              🛠️ OxI Clásico
            </button>
            <button
              type="button"
              className={`platform-toggle-btn ${platformMode === 'pro' ? 'is-active' : ''}`}
              onClick={() => {
                if (isProUser) {
                  setPlatformMode('pro'); setSelected(null); setIsCreatingQuote(false); setIsEditingProfile(false); setIsCreatingProject(false);
                } else {
                  setShowUpgradeModal(true)
                }
              }}
            >
              ⚡ OxI Pro {!isProUser && '🔒'}
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
            onClick={() => { setIsCreatingProject(true); setSelected(null); setIsCreatingQuote(false); setIsEditingProfile(false); setPlatformMode('classic'); }}
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
            }}
          >
            <span className="oxi-btn-icon">＋</span> Nueva Cotización
          </button>

          <Link to="/cliente/modelador" className="oxi-os-btn simulator">
            <span className="oxi-btn-icon">📐</span> Simulador 3D Óxida
          </Link>
        </div>

        <div className="oxi-os-footer-actions">
          <button 
            type="button"
            className="oxi-os-btn dark" 
            onClick={() => { setIsEditingProfile(true); setIsCreatingProject(false); setIsCreatingQuote(false); setSelected(null); }}
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
            onSelectProject={(id) => setActiveProjectId(id)}
            onBackToClassic={() => setPlatformMode('classic')} 
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
          </>
        )}
      </main>

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
