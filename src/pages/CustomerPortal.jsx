import { useEffect, useState, useMemo } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from '../components/OxidaWordmark'
import OxiProSuite from '../components/OxiProSuite'
import { 
  createMyQuote, getCustomerProfile, getMyQuoteMessages, getMyQuotes, 
  reportQuoteDepositTransfer, respondToMyQuote, sendMyQuoteMessage, 
  startQuoteDepositCheckout, updateCustomerProfile, getB2bProjects, 
  createB2bProject, assignQuoteToB2bProject
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

  async function submitNewProject(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await createB2bProject({ name: newProjectName, location: newProjectLocation }, customerToken)
      setB2bProjects([...b2bProjects, res])
      setActiveProjectId(res.id)
      setIsCreatingProject(false)
      setNewProjectName(''); setNewProjectLocation('')
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
            onClick={() => { setIsCreatingQuote(true); setIsCreatingProject(false); setSelected(null); setIsEditingProfile(false); setPlatformMode('classic'); }}
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
                  <span>Plataforma OxI Clásico</span>
                  <h2>Solicitar Cotización de Obra</h2>
                  <p>
                    Cargá planos (CAD, PDF), memorias descriptivas, fotos de referencia o archivos técnicos.
                    Analizamos las piezas y te enviamos la propuesta detallada.
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
                    Memoria y detalles técnicos
                    <textarea 
                      rows="4" 
                      value={request.description} 
                      onChange={e => setRequest({...request, description: e.target.value})} 
                      placeholder="Medidas aproximadas, especificaciones de perfiles, tipos de madera, tratamiento de pintura..."
                      required
                    />
                  </label>

                  <div>
                    <label>
                      Presupuesto estimado
                      <input type="number" min="0" value={request.budget} onChange={e => setRequest({...request, budget: e.target.value})} placeholder="Opcional" />
                    </label>
                    <label>
                      Moneda
                      <select value={request.currency} onChange={e => setRequest({...request, currency: e.target.value})}>
                        <option>UYU</option>
                        <option>USD</option>
                      </select>
                    </label>
                    <label>
                      Fecha deseada
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
                    <button disabled={saving}>{saving ? 'Enviando solicitud…' : 'Enviar Solicitud a Cotizar'}</button>
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
          <div className="oxi-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <span style={{ fontSize: '2rem' }}>🔒</span>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Acceso Exclusivo a Plataforma OxI Pro</h3>
            </div>
            
            <p style={{ lineHeight: 1.5, color: '#525252', fontSize: '0.95rem' }}>
              Tu usuario tiene actualmente asignado el nivel <strong>Plataforma OxI Clásico</strong> para solicitar y seguir cotizaciones.
            </p>

            <div style={{ background: '#fffaf6', border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px', marginBottom: '1.25rem' }}>
              <strong style={{ color: '#c2410c', display: 'block', marginBottom: '6px', fontSize: '0.88rem' }}>
                La Suite OxI Pro incluye para Constructoras:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#431407', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <li>📁 Gestor de planos técnicos con control de versiones e iteraciones</li>
                <li>📅 Cronograma de obra editable con asignación de recursos y mano de obra</li>
                <li>📊 Curva S semanal (% Avance Real vs Presupuesto Cero)</li>
                <li>🚨 Control presupuestario por rubro con alertas automáticas de sobrecosto</li>
              </ul>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#737373', margin: '0 0 1.5rem' }}>
              Para habilitar OxI Pro en tu cuenta o tus obras, comunicate con la administración de Mercadobra / Óxida o enviá una solicitud directa.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowUpgradeModal(false)}>
                Continuar en OxI Clásico
              </button>
              <button 
                type="button" 
                className="oxi-btn-primary" 
                onClick={() => {
                  setShowUpgradeModal(false)
                  setIsCreatingQuote(true)
                  setRequest(prev => ({
                    ...prev,
                    title: 'Solicitud de Habilitación a Suite OxI Pro',
                    description: 'Solicito la habilitación de mi cuenta de constructora / estudio al nivel OxI Pro para control técnico de obra y costos.'
                  }))
                }}
              >
                ✉ Solicitar Habilitación de OxI Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
