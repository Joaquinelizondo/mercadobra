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
  const { customerUser, customerToken } = useAuth()
  const [profile,setProfile] = useState(null); const [quotes,setQuotes] = useState([]); const [selected,setSelected] = useState(null)
  const [b2bProjects, setB2bProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null) // null means "All" or "Unassigned"
  const [isCreatingProject, setIsCreatingProject] = useState(false)
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

  async function openQuote(quote) { setSelected(quote); const data = await getMyQuoteMessages(quote.id,customerToken); setMessages(data.rows || []) }
  async function saveProfile(e) { e.preventDefault(); setSaving(true); try { setProfile(await updateCustomerProfile(profile,customerToken)) } catch(e){setError(e.message)} finally{setSaving(false)} }
  
  async function submitNewProject(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const created = await createB2bProject({ name: newProjectName, location: newProjectLocation }, customerToken)
      setB2bProjects(p => [created, ...p])
      setActiveProjectId(created.id)
      setIsCreatingProject(false)
      setNewProjectName('')
      setNewProjectLocation('')
    } catch(e) { setError(e.message) } finally { setSaving(false) }
  }

  async function submitRequest(e) { 
    e.preventDefault(); setSaving(true); setError(''); 
    try { 
      const q = await createMyQuote(request, customerToken); 
      // If we are under an active project, assign it automatically
      if (activeProjectId) {
        await assignQuoteToB2bProject(q.id, activeProjectId, customerToken)
        q.b2bProjectId = activeProjectId
      }
      setQuotes(p=>[q,...p]); 
      setRequest(EMPTY_REQUEST); 
      await openQuote(q) 
    } catch(e){setError(e.message)} finally{setSaving(false)} 
  }
  
  async function sendMessage(e) { e.preventDefault(); if(!message.trim()) return; const created=await sendMyQuoteMessage(selected.id,{message},customerToken); setMessages(p=>[...p,created]); setMessage('') }
  async function respond(status) { const q=await respondToMyQuote(selected.id,status,customerToken); setSelected(q); setQuotes(p=>p.map(x=>x.id===q.id?q:x)) }
  async function payDeposit(){setSaving(true);setError('');try{const checkout=await startQuoteDepositCheckout(selected.id,customerToken);window.location.assign(checkout.sandbox?checkout.sandboxInitPoint:checkout.initPoint)}catch(e){setError(e.message);setSaving(false)}}
  async function reportTransfer(){if(!depositReceipt){setError('Adjuntá el comprobante de transferencia.');return}setSaving(true);setError('');try{const updated=await reportQuoteDepositTransfer(selected.id,depositReceipt,customerToken);setSelected(updated);setQuotes(p=>p.map(x=>x.id===updated.id?updated:x));setDepositReceipt(null)}catch(e){setError(e.message)}finally{setSaving(false)}}
  
  if (!customerUser || !customerToken) return <Navigate to="/cliente/login?redirect=/cliente" replace />
  if (loading) return <section className="customer-portal"><p>Cargando tu espacio…</p></section>

  const filteredQuotes = activeProjectId 
    ? quotes.filter(q => q.b2bProjectId === activeProjectId) 
    : quotes;

  return <section className="customer-portal">
    <header>
      <div>
        <span>Área de clientes · OXI OS</span>
        <h1>Hola, {profile?.name || customerUser.company}.</h1>
        <p>Gestioná tus obras, cotizaciones y proyectos desde un solo lugar.</p>
      </div>
      <div style={{display:'flex', gap:'1rem'}}>
        <Link to="/cliente/modelador" className="outline-btn" style={{textDecoration: 'none', display: 'flex', alignItems: 'center'}}>Simulador 3D</Link>
        <button onClick={()=>setIsCreatingProject(true)} className="outline-btn">＋ Nueva Obra</button>
        <button onClick={()=>{setSelected(null); setIsCreatingProject(false)}}>＋ Nueva Cotización</button>
      </div>
    </header>
    {error && <p className="customer-portal-error">{error}</p>}
    <div className="customer-portal-layout">
      <aside>
        {b2bProjects.length > 0 && (
          <div className="b2b-projects-selector" style={{marginBottom: '2rem'}}>
            <h2>Mis Obras</h2>
            <select 
              value={activeProjectId || ''} 
              onChange={e => setActiveProjectId(e.target.value ? Number(e.target.value) : null)}
              style={{width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', marginTop: '0.5rem'}}
            >
              <option value="">Todas las cotizaciones</option>
              {b2bProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <h2>{activeProjectId ? 'Cotizaciones de la Obra' : 'Mis cotizaciones'}</h2>
        {filteredQuotes.length===0?<p>Aún no tenés solicitudes aquí.</p>:filteredQuotes.map(q=><button key={q.id} className={selected?.id===q.id?'is-active':''} onClick={()=>{setSelected(q); setIsCreatingProject(false)}}><span>{q.referenceNumber}</span><strong>{q.title}</strong><small>{STATUS[q.status] || q.status}</small></button>)}
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
          <div className="quote-workspace"><button className="quote-back" onClick={()=>setSelected(null)}>← Nueva solicitud</button><div className="quote-workspace-head"><div><span>{selected.referenceNumber} · {STATUS[selected.status]}</span><h2>{selected.title}</h2><p>{selected.description}</p></div>{selected.totalAmount>0&&<strong>{formatPrice(selected.totalAmount,selected.currency)}</strong>}</div>
          {selected.proposalDescription&&<div className="quote-proposal-copy"><strong>Propuesta de Mercadobra</strong><p>{selected.proposalDescription}</p></div>}{selected.attachments?.length>0&&<div className="quote-files">{selected.attachments.map((f,i)=><a key={i} href={f.data} download={f.name}>📎 {f.name}</a>)}</div>}
          <section className="project-tracker"><div className="project-tracker-heading"><span>Seguimiento</span><h3>Estado de tu proyecto</h3></div><ol>{TRACK_STAGES.map((stage,index)=>{const current=TRACK_INDEX[selected.status]??0;const state=index<current?'is-complete':index===current?'is-current':'';return <li key={stage.status} className={state}><i aria-hidden="true">{index<current?'✓':index+1}</i><span>{stage.label}</span></li>})}</ol>{['rejected','cancelled'].includes(selected.status)&&<p className="project-tracker-alert">Esta cotización está {STATUS[selected.status].toLowerCase()}.</p>}{(selected.milestones||[]).length>0&&<div className="project-milestones"><h4>Etapas de la obra</h4>{selected.milestones.map((item,index)=><article key={item.id||index} className={`is-${item.status}`}><i>{item.status==='completed'?'✓':index+1}</i><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}<small>{item.status==='completed'&&item.completedAt?`Terminado el ${shortDate(item.completedAt)}`:[item.plannedStartAt,item.plannedEndAt].filter(Boolean).map(shortDate).join(' — ')||'Fecha a confirmar'}</small></div><span>{item.status==='completed'?'Terminado':item.status==='in_progress'?'En proceso':'Pendiente'}</span></article>)}</div>}</section>
          {selected.status==='sent'&&<div className="quote-decision"><p>¿Cómo querés continuar con esta propuesta?</p><button onClick={()=>respond('accepted')}>Aceptar cotización</button><button onClick={()=>respond('rejected')}>Solicitar nueva propuesta</button></div>}
          {selected.status==='accepted'&&selected.depositAmount>0&&<section className="quote-deposit"><span>Reserva del proyecto</span><h3>Confirmá la seña de {formatPrice(selected.depositAmount,selected.currency)}</h3>{selected.depositStatus==='reported'?<p>Recibimos tu comprobante. Mercadobra confirmará la transferencia.</p>:selected.depositStatus==='approved'?<p>Pago confirmado. Tu proyecto ya está activo.</p>:<><button type="button" onClick={payDeposit} disabled={saving}>Pagar con Mercado Pago</button><div className="quote-transfer"><strong>¿Pagaste por transferencia?</strong><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={async e=>{try{setDepositReceipt((await readFiles(e.target.files))[0]||null)}catch(err){setError(err.message)}}}/><button type="button" onClick={reportTransfer} disabled={saving||!depositReceipt}>Informar transferencia</button></div></>}</section>}
          <div className="quote-thread">{messages.length===0?<p className="quote-thread-empty">Todavía no hay mensajes. Podés escribir tu primera consulta.</p>:messages.map(m=><article key={m.id} className={m.authorRole==='customer'?'is-customer':'is-admin'}><small>{m.authorRole==='customer'?'Vos':'Mercadobra'}</small><p>{m.message}</p><time>{new Date(m.createdAt).toLocaleString('es-UY')}</time></article>)}</div>
          <form className="quote-message-form" onSubmit={sendMessage}><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escribí un mensaje sobre esta cotización…"/><button>Enviar</button></form></div>
        ) : (
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
