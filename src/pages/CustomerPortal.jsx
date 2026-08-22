import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createMyQuote, getCustomerProfile, getMyQuoteMessages, getMyQuotes, respondToMyQuote, sendMyQuoteMessage, updateCustomerProfile } from '../lib/api'
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
const EMPTY_REQUEST = { title:'', description:'', budget:'', currency:'UYU', desiredDate:'', attachments:[] }

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
  const [messages,setMessages] = useState([]); const [request,setRequest] = useState(EMPTY_REQUEST); const [message,setMessage] = useState('')
  const [error,setError] = useState(''); const [loading,setLoading] = useState(true); const [saving,setSaving] = useState(false)

  useEffect(() => { if (!customerToken) return; Promise.all([getCustomerProfile(customerToken),getMyQuotes(customerToken)])
    .then(([p,q]) => { setProfile(p); setQuotes(q.rows || []) }).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [customerToken])
  async function openQuote(quote) { setSelected(quote); const data = await getMyQuoteMessages(quote.id,customerToken); setMessages(data.rows || []) }
  async function saveProfile(e) { e.preventDefault(); setSaving(true); try { setProfile(await updateCustomerProfile(profile,customerToken)) } catch(e){setError(e.message)} finally{setSaving(false)} }
  async function submitRequest(e) { e.preventDefault(); setSaving(true); setError(''); try { const q=await createMyQuote(request,customerToken); setQuotes(p=>[q,...p]); setRequest(EMPTY_REQUEST); await openQuote(q) } catch(e){setError(e.message)} finally{setSaving(false)} }
  async function sendMessage(e) { e.preventDefault(); if(!message.trim()) return; const created=await sendMyQuoteMessage(selected.id,{message},customerToken); setMessages(p=>[...p,created]); setMessage('') }
  async function respond(status) { const q=await respondToMyQuote(selected.id,status,customerToken); setSelected(q); setQuotes(p=>p.map(x=>x.id===q.id?q:x)) }
  if (!customerUser || !customerToken) return <Navigate to="/cliente/login?redirect=/cliente" replace />
  if (loading) return <section className="customer-portal"><p>Cargando tu espacio…</p></section>
  return <section className="customer-portal">
    <header><div><span>Área de clientes</span><h1>Hola, {profile?.name || customerUser.company}.</h1><p>Solicitá, conversá y decidí sobre tus cotizaciones desde un solo lugar.</p></div><button onClick={()=>setSelected(null)}>＋ Nueva solicitud</button></header>
    {error && <p className="customer-portal-error">{error}</p>}
    <div className="customer-portal-layout"><aside><h2>Mis cotizaciones</h2>{quotes.length===0?<p>Aún no tenés solicitudes.</p>:quotes.map(q=><button key={q.id} className={selected?.id===q.id?'is-active':''} onClick={()=>openQuote(q)}><span>{q.referenceNumber}</span><strong>{q.title}</strong><small>{STATUS[q.status] || q.status}</small></button>)}</aside>
    <main>{selected ? <div className="quote-workspace"><button className="quote-back" onClick={()=>setSelected(null)}>← Nueva solicitud</button><div className="quote-workspace-head"><div><span>{selected.referenceNumber} · {STATUS[selected.status]}</span><h2>{selected.title}</h2><p>{selected.description}</p></div>{selected.totalAmount>0&&<strong>{formatPrice(selected.totalAmount,selected.currency)}</strong>}</div>
      {selected.proposalDescription&&<div className="quote-proposal-copy"><strong>Propuesta de Mercadobra</strong><p>{selected.proposalDescription}</p></div>}{selected.attachments?.length>0&&<div className="quote-files">{selected.attachments.map((f,i)=><a key={i} href={f.data} download={f.name}>📎 {f.name}</a>)}</div>}
      <section className="project-tracker"><div className="project-tracker-heading"><span>Seguimiento</span><h3>Estado de tu proyecto</h3></div><ol>{TRACK_STAGES.map((stage,index)=>{const current=TRACK_INDEX[selected.status]??0;const state=index<current?'is-complete':index===current?'is-current':'';return <li key={stage.status} className={state}><i aria-hidden="true">{index<current?'✓':index+1}</i><span>{stage.label}</span></li>})}</ol>{['rejected','cancelled'].includes(selected.status)&&<p className="project-tracker-alert">Esta cotización está {STATUS[selected.status].toLowerCase()}.</p>}{(selected.milestones||[]).length>0&&<div className="project-milestones"><h4>Etapas de la obra</h4>{selected.milestones.map((item,index)=><article key={item.id||index} className={`is-${item.status}`}><i>{item.status==='completed'?'✓':index+1}</i><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}<small>{item.status==='completed'&&item.completedAt?`Terminado el ${shortDate(item.completedAt)}`:[item.plannedStartAt,item.plannedEndAt].filter(Boolean).map(shortDate).join(' — ')||'Fecha a confirmar'}</small></div><span>{item.status==='completed'?'Terminado':item.status==='in_progress'?'En proceso':'Pendiente'}</span></article>)}</div>}</section>
      {selected.status==='sent'&&<div className="quote-decision"><p>¿Cómo querés continuar con esta propuesta?</p><button onClick={()=>respond('accepted')}>Aceptar cotización</button><button onClick={()=>respond('rejected')}>Solicitar nueva propuesta</button></div>}
      <div className="quote-thread">{messages.length===0?<p className="quote-thread-empty">Todavía no hay mensajes. Podés escribir tu primera consulta.</p>:messages.map(m=><article key={m.id} className={m.authorRole==='customer'?'is-customer':'is-admin'}><small>{m.authorRole==='customer'?'Vos':'Mercadobra'}</small><p>{m.message}</p><time>{new Date(m.createdAt).toLocaleString('es-UY')}</time></article>)}</div>
      <form className="quote-message-form" onSubmit={sendMessage}><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escribí un mensaje sobre esta cotización…"/><button>Enviar</button></form></div>
    : <div className="customer-request"><div><span>Nueva cotización</span><h2>Contanos qué necesitás.</h2><p>Podés adjuntar hasta 3 imágenes o PDF de 2 MB cada uno.</p></div><form onSubmit={submitRequest}><label>Título del proyecto<input value={request.title} onChange={e=>setRequest({...request,title:e.target.value})} required/></label><label>Detalles<textarea rows="5" value={request.description} onChange={e=>setRequest({...request,description:e.target.value})} required/></label><div><label>Presupuesto estimado<input type="number" min="0" value={request.budget} onChange={e=>setRequest({...request,budget:e.target.value})}/></label><label>Moneda<select value={request.currency} onChange={e=>setRequest({...request,currency:e.target.value})}><option>UYU</option><option>USD</option></select></label><label>Fecha deseada<input type="date" value={request.desiredDate} onChange={e=>setRequest({...request,desiredDate:e.target.value})}/></label></div><label>Fotos o planos<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={async e=>{try{setRequest({...request,attachments:await readFiles(e.target.files)})}catch(err){setError(err.message)}}}/></label>{request.attachments.length>0&&<small>{request.attachments.map(f=>f.name).join(' · ')}</small>}<button disabled={saving}>{saving?'Enviando…':'Enviar solicitud'}</button></form></div>}</main></div>
    <form className="customer-profile" onSubmit={saveProfile}><div><span>Mi perfil</span><h2>Datos de contacto</h2></div><input value={profile?.name||''} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Nombre"/><input value={profile?.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="Teléfono"/><input value={profile?.companyName||''} onChange={e=>setProfile({...profile,companyName:e.target.value})} placeholder="Empresa (opcional)"/><input value={profile?.city||''} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="Localidad"/><input value={profile?.department||''} onChange={e=>setProfile({...profile,department:e.target.value})} placeholder="Departamento"/><button disabled={saving}>Guardar perfil</button></form>
  </section>
}
