import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from '../components/OxidaWordmark'
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
const EMPTY_REQUEST = { title:'', description:'', budget:'', currency:'UYU', desiredDate:'', attachments:[], b2bProjectId: null }

function readFiles(files) {
  return Promise.all(Array.from(files || []).slice(0, 3).map((file) => new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) return reject(new Error('Cada archivo debe pesar menos de 2 MB.'))
    const reader = new FileReader(); reader.onload = () => resolve({ name:file.name, type:file.type, data:reader.result }); reader.onerror = reject; reader.readAsDataURL(file)
  })))
}

function shortDate(value) {
  if (!value) return ''
  const text=String(value); const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(text)?`${text}T00:00:00`:text)
  return Number.isNaN(date.getTime())?'':date.toLocaleDateString('es-UY')
}

export default function CustomerPortal() {
  const { customerUser, customerToken, logoutCustomer } = useAuth()
  const [profile,setProfile] = useState(null); const [quotes,setQuotes] = useState([]); const [selected,setSelected] = useState(null)
  const [b2bProjects, setB2bProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null) // null means "All" or "Unassigned"
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectLocation, setNewProjectLocation] = useState('')

  const [messages,setMessages] = useState([]); const [request,setRequest] = useState(EMPTY_REQUEST); const [message,setMessage] = useState('')
  const [error,setError] = useState(''); const [loading,setLoading] = useState(true); const [saving,setSaving] = useState(false)
  const [depositReceipt,setDepositReceipt] = useState(null)

  useEffect(() => { 
    if (!customerToken) return; 
    Promise.all([getCustomerProfile(customerToken), getMyQuotes(customerToken), getB2bProjects(customerToken)])
      .then(([p,q, b2b]) => { 
        setProfile(p); 
        setQuotes(q.rows || []);
        setB2bProjects(b2b.rows || []);
        if (b2b.rows && b2b.rows.length > 0) setActiveProjectId(b2b.rows[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false)) 
  }, [customerToken])

  const filteredQuotes = activeProjectId 
    ? quotes.filter(q => q.b2bProjectId === activeProjectId)
    : quotes;

  // Kanban groupings
  const requestedQuotes = filteredQuotes.filter(q => ['in_progress', 'reviewing'].includes(q.status))
  const inProgressQuotes = filteredQuotes.filter(q => ['sent', 'accepted', 'project_in_progress'].includes(q.status))
  const completedQuotes = filteredQuotes.filter(q => ['completed', 'cancelled', 'rejected'].includes(q.status))

  useEffect(() => { 
    if (selected) getQuoteMessages(selected.id, customerToken).then(r => setMessages(r.rows || [])).catch(()=>{}) 
  }, [selected, customerToken])

  async function submitRequest(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...request, b2bProjectId: activeProjectId }
      const res = await createCustomerQuote(payload, customerToken)
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
      const res = await sendQuoteMessage(selected.id, { message }, customerToken)
      setMessages([...messages, res]); setMessage('')
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function respond(decision) {
    if(!window.confirm('¿Confirmar esta decisión?')) return; setSaving(true); setError('')
    try {
      const res = await updateCustomerQuoteStatus(selected.id, decision, customerToken)
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

  const [isParsingAI, setIsParsingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const parseWithAI = async () => {
    if (!request.description) { setError('Escribí los detalles primero para que la IA los analice.'); return; }
    setIsParsingAI(true); setError(''); setAiSuggestion(null);
    try {
      const res = await parseRequirementsWithAI(request.description, customerToken);
      setAiSuggestion(res.data);
    } catch(err) { setError(err.message); }
    finally { setIsParsingAI(false); }
  };

  if (!customerUser || !customerToken) return <Navigate to="/cliente/login?redirect=/cliente" replace />
  if (loading && !profile) return <div className="oxi-os-dashboard"><p style={{padding:'2rem'}}>Cargando OXI OS…</p></div>

  return <div className="oxi-os-dashboard">
    <aside className="oxi-os-sidebar">
      <div className="oxi-os-brand" style={{ marginBottom: '1.5rem' }}>
        <OxidaWordmark />
      </div>
      
      <div className="oxi-os-user" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#262626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>
          {profile?.name?.[0] || 'A'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{profile?.name || 'Arquitecto'}</strong>
          <span>{profile?.companyName || 'Constructora'}</span>
        </div>
      </div>
      
      {b2bProjects.length > 0 && (
        <div className="oxi-os-project-select" style={{ marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Obra seleccionada
          </label>
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

      <div className="oxi-os-menu" style={{ marginTop: '2rem' }}>
        <button 
          className={`oxi-os-btn ${isCreatingProject ? 'secondary' : 'secondary'}`} 
          onClick={() => { setIsCreatingProject(true); setSelected(null); setIsCreatingQuote(false); setIsEditingProfile(false); }}
        >
          <span style={{marginRight: '8px', fontWeight: 'bold'}}>＋</span> Nueva Obra
        </button>

        <button 
          className={`oxi-os-btn ${isCreatingQuote ? 'primary' : 'primary'}`} 
          onClick={() => { setIsCreatingQuote(true); setIsCreatingProject(false); setSelected(null); setIsEditingProfile(false); }}
        >
          <span style={{marginRight: '8px', fontWeight: 'bold'}}>＋</span> Nueva Cotización
        </button>

        <Link to="/cliente/modelador" className="oxi-os-btn" style={{ border: '1px solid #404040', textAlign: 'center', marginTop: '1rem', display: 'block', textDecoration: 'none' }}>
          <span style={{marginRight: '8px'}}>📐</span> Abrir Simulador 3D
        </Link>
      </div>

      <button className="oxi-os-btn dark" onClick={() => { setIsEditingProfile(true); setIsCreatingProject(false); setIsCreatingQuote(false); setSelected(null); }} style={{ marginBottom: '10px' }}>
        ⚙️ Configuración de Perfil
      </button>

      <button className="oxi-os-btn dark" onClick={logoutCustomer}>
        Cerrar sesión
      </button>
    </aside>

    <main className="oxi-os-main">
      <header className="oxi-os-main-header">
        <div>
          <span>OXI OS PARA CONSTRUCTORAS</span>
          <h1>Mis Obras</h1>
          <p>Gestioná tus proyectos, cotizaciones y seguimientos.</p>
        </div>
      </header>
      {error && <p className="customer-portal-error" style={{color: 'red', marginBottom: '1rem'}}>{error}</p>}
        {isEditingProfile ? (
          <form className="oxi-os-profile-form" onSubmit={saveProfile} style={{maxWidth: '600px', background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e5e5e5', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'}}>
            <h2 style={{margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#1a1a1a'}}>Datos de contacto</h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                Nombre completo
                <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'}} value={profile?.name||''} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Tu nombre" />
              </label>
              <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                Teléfono de contacto
                <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'}} value={profile?.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+598 99 123 456" />
              </label>
              <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                Empresa Constructora / Estudio (Opcional)
                <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'}} value={profile?.companyName||''} onChange={e=>setProfile({...profile,companyName:e.target.value})} placeholder="Estudio Arquitectura SRL" />
              </label>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                  Localidad
                  <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'}} value={profile?.city||''} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="Ciudad o Barrio" />
                </label>
                <label style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#525252'}}>
                  Departamento / Estado
                  <input style={{padding: '12px 16px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'}} value={profile?.department||''} onChange={e=>setProfile({...profile,department:e.target.value})} placeholder="Montevideo" />
                </label>
              </div>
              <button disabled={saving} style={{marginTop: '1rem', padding: '14px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s'}}>
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </form>
        ) : isCreatingProject ? (
          <div className="customer-request">
            <div>
              <span>Nueva Obra</span>
              <h2>Dar de alta un nuevo proyecto</h2>
              <p>Creá una obra para agrupar todas las cotizaciones y pedidos correspondientes.</p>
            </div>
            <form onSubmit={submitNewProject}>
              <label>Nombre de la Obra (Ej: Torre Libertador)<input value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} required/></label>
              <label>Ubicación / Dirección<input value={newProjectLocation} onChange={e=>setNewProjectLocation(e.target.value)}/></label>
              <button disabled={saving}>{saving?'Creando...':'Crear Obra'}</button>
            </form>
          </div>
        ) : selected ? (
          <div className="quote-workspace"><button className="quote-back" onClick={()=>setSelected(null)}>← Volver al tablero</button><div className="quote-workspace-head"><div><span>{selected.referenceNumber} · {STATUS[selected.status]}</span><h2>{selected.title}</h2><p>{selected.description}</p></div>{selected.totalAmount>0&&<strong>{formatPrice(selected.totalAmount,selected.currency)}</strong>}</div>
          {selected.proposalDescription&&<div className="quote-proposal-copy"><strong>Propuesta de Mercadobra</strong><p>{selected.proposalDescription}</p></div>}{selected.attachments?.length>0&&<div className="quote-files">{selected.attachments.map((f,i)=><a key={i} href={f.url || f.data} target="_blank" rel="noreferrer" download={!f.url ? f.name : undefined}>📎 {f.name}</a>)}</div>}
          <section className="project-tracker"><div className="project-tracker-heading"><span>Seguimiento</span><h3>Estado de tu proyecto</h3></div><ol>{TRACK_STAGES.map((stage,index)=>{const current=TRACK_INDEX[selected.status]??0;const state=index<current?'is-complete':index===current?'is-current':'';return <li key={stage.status} className={state}><i aria-hidden="true">{index<current?'✓':index+1}</i><span>{stage.label}</span></li>})}</ol>{['rejected','cancelled'].includes(selected.status)&&<p className="project-tracker-alert">Esta cotización está {STATUS[selected.status].toLowerCase()}.</p>}{(selected.milestones||[]).length>0&&<div className="project-milestones"><h4>Etapas de la obra</h4>{selected.milestones.map((item,index)=><article key={item.id||index} className={`is-${item.status}`}><i>{item.status==='completed'?'✓':index+1}</i><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}<small>{item.status==='completed'&&item.completedAt?`Terminado el ${shortDate(item.completedAt)}`:[item.plannedStartAt,item.plannedEndAt].filter(Boolean).map(shortDate).join(' — ')||'Fecha a confirmar'}</small></div><span>{item.status==='completed'?'Terminado':item.status==='in_progress'?'En proceso':'Pendiente'}</span></article>)}</div>}</section>
          {selected.status==='sent'&&<div className="quote-decision"><p>¿Cómo querés continuar con esta propuesta?</p><button onClick={()=>respond('accepted')}>Aceptar cotización</button><button onClick={()=>respond('rejected')}>Solicitar nueva propuesta</button></div>}
          {selected.status==='accepted'&&selected.depositAmount>0&&<section className="quote-deposit"><span>Reserva del proyecto</span><h3>Confirmá la seña de {formatPrice(selected.depositAmount,selected.currency)}</h3>{selected.depositStatus==='reported'?<p>Recibimos tu comprobante. Mercadobra confirmará la transferencia.</p>:selected.depositStatus==='approved'?<p>Pago confirmado. Tu proyecto ya está activo.</p>:<><button type="button" onClick={payDeposit} disabled={saving}>Pagar con Mercado Pago</button><div className="quote-transfer"><strong>¿Pagaste por transferencia?</strong><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={async e=>{try{setDepositReceipt((await readFiles(e.target.files))[0]||null)}catch(err){setError(err.message)}}}/><button type="button" onClick={reportTransfer} disabled={saving||!depositReceipt}>Informar transferencia</button></div></>}</section>}
          <div className="quote-thread">{messages.length===0?<p className="quote-thread-empty">Todavía no hay mensajes. Podés escribir tu primera consulta.</p>:messages.map(m=><article key={m.id} className={m.authorRole==='customer'?'is-customer':'is-admin'}><small>{m.authorRole==='customer'?'Vos':'Mercadobra'}</small><p>{m.message}</p><time>{new Date(m.createdAt).toLocaleString('es-UY')}</time></article>)}</div>
          <form className="quote-message-form" onSubmit={sendMessage}><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escribí un mensaje sobre esta cotización…"/><button>Enviar</button></form></div>
        ) : isCreatingQuote ? (
          <div className="customer-request">
            <div>
              <span>Nueva cotización {activeProjectId ? `para la obra seleccionada` : ''}</span>
              <h2>Contanos qué necesitás.</h2>
              <p>Podés adjuntar hasta 3 imágenes o PDF de 2 MB cada uno.</p>
            </div>
            <form onSubmit={submitRequest}>
              <label>Título del proyecto<input value={request.title} onChange={e=>setRequest({...request,title:e.target.value})} required/></label>
              <label>
                Detalles
                <textarea rows="5" value={request.description} onChange={e=>setRequest({...request,description:e.target.value})} required/>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <small style={{ color: '#77736a', fontWeight: 'normal' }}>¿Tenés un texto largo o desordenado?</small>
                  <button type="button" onClick={parseWithAI} disabled={isParsingAI} style={{ background: '#f8f5ef', color: '#ea580c', border: '1px solid #ea580c', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer' }}>
                    {isParsingAI ? '⏳ Analizando...' : '✨ Extraer datos con IA'}
                  </button>
                </div>
              </label>

              {aiSuggestion && (
                <div style={{ background: '#f8f5ef', border: '1px solid #dcd4c9', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#ea580c', fontSize: '1rem' }}>🤖 OXI AI encontró:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: '#1a1a1a', lineHeight: '1.5' }}>
                    {aiSuggestion.detected_items?.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.quantity}x {item.product_type}</strong> — {item.material} 
                        {item.dimensions?.length_m ? ` (${item.dimensions.length_m}m x ${item.dimensions.height_m || '?'}m)` : ''}
                        {item.finish ? ` — ${item.finish}` : ''}
                      </li>
                    ))}
                  </ul>
                  {aiSuggestion.missing_critical_info?.length > 0 && (
                    <div style={{ marginTop: '12px', color: '#b91c1c', fontSize: '0.85rem', background: '#fee2e2', padding: '8px', borderRadius: '4px' }}>
                      <strong>Faltan datos clave:</strong> {aiSuggestion.missing_critical_info.join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label>Presupuesto estimado<input type="number" min="0" value={request.budget} onChange={e=>setRequest({...request,budget:e.target.value})}/></label>
                <label>Moneda<select value={request.currency} onChange={e=>setRequest({...request,currency:e.target.value})}><option>UYU</option><option>USD</option></select></label>
                <label>Fecha deseada<input type="date" value={request.desiredDate} onChange={e=>setRequest({...request,desiredDate:e.target.value})}/></label>
              </div>
              <label>Fotos o planos<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={async e=>{try{setRequest({...request,attachments:await readFiles(e.target.files)})}catch(err){setError(err.message)}}}/></label>
              {request.attachments.length>0&&<small>{request.attachments.map(f=>f.name).join(' · ')}</small>}
              <button disabled={saving}>{saving?'Enviando…':'Enviar solicitud'}</button>
            </form>
          </div>
        ) : (
          <div className="kanban-board">
            <div className="kanban-column">
              <h3>Solicitadas</h3>
              {requestedQuotes.length === 0 ? <p className="kanban-empty">No hay solicitudes en espera.</p> : requestedQuotes.map(q => (
                <button key={q.id} className="kanban-card" onClick={() => setSelected(q)}>
                  <span>{q.referenceNumber}</span>
                  <strong>{q.title}</strong>
                  <small>{STATUS[q.status]}</small>
                </button>
              ))}
            </div>
            <div className="kanban-column">
              <h3>En Proceso</h3>
              {inProgressQuotes.length === 0 ? <p className="kanban-empty">No hay cotizaciones aprobadas.</p> : inProgressQuotes.map(q => (
                <button key={q.id} className="kanban-card" onClick={() => setSelected(q)}>
                  <span>{q.referenceNumber}</span>
                  <strong>{q.title}</strong>
                  <small>{STATUS[q.status]}</small>
                </button>
              ))}
            </div>
            <div className="kanban-column">
              <h3>Finalizadas</h3>
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
    </main>
  </div>
}
