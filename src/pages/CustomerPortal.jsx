import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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

  if (!customerUser || !customerToken) return <Navigate to="/cliente/login?redirect=/cliente" replace />
  if (loading && !profile) return <section className="customer-portal"><p>Cargando OXI OS…</p></section>

  return <section className="customer-portal">
    <header>
      <div><span>OXI OS para Constructoras</span><h1>Mis Obras</h1><p>Gestioná tus proyectos, cotizaciones y seguimientos.</p></div>
      <button onClick={logoutCustomer}>Cerrar sesión</button>
    </header>
    {error && <p className="customer-portal-error">{error}</p>}
    <div className="customer-portal-layout">
      <aside>
        <div className="customer-profile-head">
          <div className="customer-avatar" aria-hidden="true">{profile?.name?.[0]||'C'}</div>
          <div><strong>{profile?.name||'Cliente'}</strong><span>{profile?.companyName||'Constructora'}</span></div>
        </div>
        
        {b2bProjects.length > 0 && (
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', background: '#e8dfd1', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a8522e', margin: '0 0 10px' }}>Obra Seleccionada</h3>
            <select 
              value={activeProjectId || ''} 
              onChange={(e) => {
                setActiveProjectId(e.target.value ? Number(e.target.value) : null);
                setSelected(null);
                setIsCreatingProject(false);
                setIsCreatingQuote(false);
              }}
              style={{width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', marginTop: '0.5rem'}}
            >
              <option value="">Todas las obras</option>
              {b2bProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <button 
          className={isCreatingProject ? 'is-active' : ''} 
          onClick={() => { setIsCreatingProject(true); setSelected(null); setIsCreatingQuote(false); }}
          style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #a8522e', color: '#a8522e', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold' }}
        >
          ＋ Nueva Obra
        </button>

        <button 
          className={isCreatingQuote ? 'is-active' : ''} 
          onClick={() => { setIsCreatingQuote(true); setIsCreatingProject(false); setSelected(null); }}
          style={{ width: '100%', padding: '12px', background: '#a8522e', border: '1px solid #a8522e', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px' }}
        >
          ＋ Nueva Cotización
        </button>

        <Link to="/cliente/modelador" style={{ display: 'block', textAlign: 'center', marginTop: '10px', textDecoration: 'none', color: '#13212f', fontWeight: '600', padding: '12px', border: '1px solid #d2cabc', borderRadius: '6px' }}>
          📐 Abrir Simulador 3D
        </Link>
      </aside>
      
      <main>
        {isCreatingProject ? (
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
              <label>Detalles<textarea rows="5" value={request.description} onChange={e=>setRequest({...request,description:e.target.value})} required/></label>
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
    
    <form className="customer-profile" onSubmit={saveProfile}>
      <div><span>Mi perfil</span><h2>Datos de contacto</h2></div>
      <input value={profile?.name||''} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Nombre"/>
      <input value={profile?.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="Teléfono"/>
      <input value={profile?.companyName||''} onChange={e=>setProfile({...profile,companyName:e.target.value})} placeholder="Empresa (opcional)"/>
      <input value={profile?.city||''} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="Localidad"/>
      <input value={profile?.department||''} onChange={e=>setProfile({...profile,department:e.target.value})} placeholder="Departamento"/>
      <button disabled={saving}>Guardar perfil</button>
    </form>
  </section>
}
