import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { downloadQuotePdf, getAdminCustomer, getAdminQuoteMessages, getCustomerQuotes, reviewQuoteDeposit, sendAdminQuoteMessage, updateAdminQuote, parseRequirementsWithAI, generateProposalWithAI, getFabricationSuppliers, getAdminFabricationOrders, createFabricationOrder } from '../lib/api'
import { formatPrice } from '../utils/format'
import { Badge } from '../components/Badge'
import './CustomerPortal.css'
import './CustomerPortalMobile.css'
import './AdminQuoteWorkspace.css'

const MILESTONE_STATUS = { pending:'Pendiente', in_progress:'En proceso', completed:'Terminado' }

function formatRequestedDate(value) {
  if (!value) return ''
  const text = String(value)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-UY')
}

export default function AdminQuoteWorkspace(){
  const {id,quoteId}=useParams(); const {adminUser,adminToken}=useAuth(); const [customer,setCustomer]=useState(null); const [quote,setQuote]=useState(null); const [messages,setMessages]=useState([]); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [saving,setSaving]=useState(false)
  const [isParsingAI, setIsParsingAI] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)

  const [suppliers, setSuppliers] = useState([])
  const [fabOrders, setFabOrders] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({ supplierId: '', targetPrice: '', currency: 'USD', deadline: '', title: '', description: '' })
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  
  useEffect(()=>{
    if(!adminToken)return;
    Promise.all([
      getAdminCustomer(id,adminToken),
      getCustomerQuotes(id,adminToken),
      getAdminQuoteMessages(quoteId,adminToken),
      getFabricationSuppliers(adminToken),
      getAdminFabricationOrders(adminToken, { quoteId })
    ]).then(([c,q,m,supps,fabs])=>{
      setCustomer(c);
      const currentQuote = (q.rows||[]).find(x=>x.id===Number(quoteId));
      setQuote(currentQuote);
      setMessages(m.rows||[]);
      setSuppliers(supps?.rows || []);
      setFabOrders(fabs?.rows || []);
      if (currentQuote) {
        setAssignForm({
          supplierId: supps?.rows?.[0]?.id || '',
          targetPrice: currentQuote.totalAmount ? Math.round(Number(currentQuote.totalAmount) * 0.6) : '',
          currency: currentQuote.currency || 'USD',
          deadline: currentQuote.estimatedEndAt ? String(currentQuote.estimatedEndAt).slice(0, 10) : '',
          title: currentQuote.title || '',
          description: currentQuote.proposalDescription || currentQuote.description || ''
        })
      }
    }).catch(e=>setError(e.message))
  },[id,quoteId,adminToken])
  if(!adminUser||!adminToken)return <Navigate to={`/admin/login?redirect=/admin/clientes/${id}/cotizaciones/${quoteId}`} replace/>
  
  async function saveProposal(e){e.preventDefault();setSaving(true);try{setQuote(await updateAdminQuote(quote.id,{...quote,status:quote.status==='in_progress'?'sent':quote.status},adminToken))}catch(e){setError(e.message)}finally{setSaving(false)}}
  async function send(e){e.preventDefault();if(!message.trim())return;try{const m=await sendAdminQuoteMessage(quote.id,{message},adminToken);setMessages(p=>[...p,m]);setMessage('')}catch(e){setError(e.message)}}
  function addMilestone(){setQuote({...quote,milestones:[...(quote.milestones||[]),{id:`milestone-${Date.now()}`,title:'',description:'',status:'pending',plannedStartAt:'',plannedEndAt:'',completedAt:null}]})}
  function updateMilestone(index,updates){setQuote({...quote,milestones:(quote.milestones||[]).map((item,itemIndex)=>itemIndex===index?{...item,...updates}:item)})}
  function removeMilestone(index){setQuote({...quote,milestones:(quote.milestones||[]).filter((_,itemIndex)=>itemIndex!==index)})}
  async function reviewDeposit(status){setSaving(true);setError('');try{setQuote(await reviewQuoteDeposit(quote.id,status,adminToken))}catch(e){setError(e.message)}finally{setSaving(false)}}
  function addDocumentItem(){setQuote({...quote,documentItems:[...(quote.documentItems||[]),{code:String((quote.documentItems||[]).length+1).padStart(2,'0'),description:'',subtotal:''}]})}
  function updateDocumentItem(index,updates){const items=(quote.documentItems||[]).map((item,itemIndex)=>itemIndex===index?{...item,...updates}:item);const subtotal=items.reduce((sum,item)=>sum+Number(item.subtotal||0),0);setQuote({...quote,documentItems:items,totalAmount:Math.round(subtotal*(1+Number(quote.taxRate??22)/100)*100)/100})}
  function removeDocumentItem(index){const items=(quote.documentItems||[]).filter((_,itemIndex)=>itemIndex!==index);const subtotal=items.reduce((sum,item)=>sum+Number(item.subtotal||0),0);setQuote({...quote,documentItems:items,totalAmount:Math.round(subtotal*(1+Number(quote.taxRate??22)/100)*100)/100})}
  function updateTaxRate(value){const subtotal=(quote.documentItems||[]).reduce((sum,item)=>sum+Number(item.subtotal||0),0);setQuote({...quote,taxRate:value,totalAmount:Math.round(subtotal*(1+Number(value||0)/100)*100)/100})}
  async function saveAndDownloadPdf(e){e.preventDefault();setSaving(true);setError('');try{const updated=await updateAdminQuote(quote.id,{...quote,notifyCustomer:false},adminToken);setQuote(updated);await downloadQuotePdf(updated.id,adminToken)}catch(err){setError(err.message)}finally{setSaving(false)}}

  async function parseWithAI() {
    setIsParsingAI(true)
    setError('')
    setAiSuggestion(null)
    try {
      const res = await parseRequirementsWithAI(quote.description, adminToken)
      setAiSuggestion(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsParsingAI(false)
    }
  }

  async function generateProposal() {
    if (!quote.totalAmount || quote.totalAmount <= 0) {
      return setError('Debes ingresar el Monto total (monto a cobrar) antes de redactar la propuesta.')
    }
    setIsGeneratingProposal(true)
    setError('')
    try {
      const res = await generateProposalWithAI(quote, adminToken)
      setQuote({...quote, proposalDescription: res.text})
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGeneratingProposal(false)
    }
  }

  async function handleAssignSubmit(e) {
    e.preventDefault()
    if (!assignForm.supplierId) {
      setAssignError('Debés seleccionar un taller fabricante.')
      return
    }
    setAssigning(true)
    setAssignError('')
    try {
      const created = await createFabricationOrder({
        supplierId: Number(assignForm.supplierId),
        quoteId: Number(quote.id),
        projectName: customer?.name ? `${customer.name} · ${quote.referenceNumber}` : (quote.referenceNumber || 'Proyecto Óxida'),
        title: assignForm.title || quote.title,
        description: assignForm.description || quote.description,
        targetPrice: Number(assignForm.targetPrice || 0),
        currency: assignForm.currency || 'USD',
        deadline: assignForm.deadline || null
      }, adminToken)
      setFabOrders((prev) => [created, ...prev])
      setShowAssignModal(false)
    } catch (err) {
      setAssignError(err.message || 'No se pudo asignar al taller.')
    } finally {
      setAssigning(false)
    }
  }

  if(!quote)return <section className="customer-portal"><p>{error||'Cargando cotización…'}</p></section>
  return <section className="customer-portal"><header><div><Link to={`/admin/clientes/${id}`}>← Volver al cliente</Link><span>Respuesta comercial</span><h1>{quote.title}</h1><p>{customer?.name} · {quote.referenceNumber}</p></div>{quote.totalAmount>0&&<strong>{formatPrice(quote.totalAmount,quote.currency)}</strong>}</header>{error&&<p className="customer-portal-error">{error}</p>}
    <div className="admin-quote-workspace"><div className="quote-workspace"><div className="quote-workspace-head"><div><span>Solicitud del cliente</span><p>{quote.description}</p>
      <div style={{ marginTop: '10px' }}><button type="button" onClick={parseWithAI} disabled={isParsingAI} style={{ background: '#f8f5ef', color: '#ea580c', border: '1px solid #ea580c', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer' }}>{isParsingAI ? '⏳ Analizando requerimientos...' : '✨ Extraer datos técnicos con IA'}</button></div>
      {aiSuggestion && (<div style={{ background: '#f8f5ef', border: '1px solid #dcd4c9', padding: '1rem', borderRadius: '8px', marginTop: '10px' }}><h4 style={{ margin: '0 0 10px', color: '#ea580c', fontSize: '1rem' }}>🤖 OXI AI extrajo:</h4><ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: '#1a1a1a', lineHeight: '1.5' }}>{aiSuggestion.detected_items?.map((item, idx) => (<li key={idx}><strong>{item.quantity}x {item.product_type}</strong> — {item.material}{item.dimensions?.length_m ? ` (${item.dimensions.length_m}m x ${item.dimensions.height_m || '?'}m)` : ''}{item.finish ? ` — ${item.finish}` : ''}</li>))}</ul>{aiSuggestion.missing_critical_info?.length > 0 && (<div style={{ marginTop: '12px', color: '#b91c1c', fontSize: '0.85rem', background: '#fee2e2', padding: '8px', borderRadius: '4px' }}><strong>Faltan datos clave:</strong> {aiSuggestion.missing_critical_info.join(', ')}</div>)}</div>)}
      {quote.budget!=null&&<p style={{marginTop: '1rem'}}>Presupuesto indicado: {formatPrice(quote.budget,quote.currency)}</p>}{formatRequestedDate(quote.desiredDate)&&<p>Fecha deseada: {formatRequestedDate(quote.desiredDate)}</p>}</div></div>{quote.attachments?.length>0&&<div className="quote-files">{quote.attachments.map((f,i)=><a key={i} href={f.url || f.data} target="_blank" rel="noreferrer" download={!f.url ? f.name : undefined}>📎 {f.name}</a>)}</div>}
      <div className="quote-thread">{messages.length===0?<p className="quote-thread-empty">Todavía no hay mensajes.</p>:messages.map(m=><article key={m.id} className={m.authorRole==='admin'?'is-customer':'is-admin'}><small>{m.authorRole==='admin'?'Mercadobra':customer?.name||'Cliente'}</small><p>{m.message}</p><time>{new Date(m.createdAt).toLocaleString('es-UY')}</time></article>)}</div><form className="quote-message-form" onSubmit={send}><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Responder al cliente…"/><button>Enviar mensaje</button></form></div>
      <form className="admin-proposal-form" onSubmit={saveProposal}><span>Propuesta económica</span><h2>Preparar cotización</h2><label>Título<input value={quote.title} onChange={e=>setQuote({...quote,title:e.target.value})}/></label>
      <label>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Descripción para el cliente</span>
          <button type="button" onClick={generateProposal} disabled={isGeneratingProposal} style={{ background: 'transparent', color: '#ea580c', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>{isGeneratingProposal ? '⏳ Escribiendo...' : '✨ Redactar con IA'}</button>
        </div>
        <textarea rows="8" value={quote.proposalDescription||''} onChange={e=>setQuote({...quote,proposalDescription:e.target.value})}/>
      </label>
      <div><label>Monto a cobrar<input type="number" min="0" value={quote.totalAmount} onChange={e=>setQuote({...quote,totalAmount:e.target.value})}/></label><label>Moneda<select value={quote.currency} onChange={e=>setQuote({...quote,currency:e.target.value})}><option>UYU</option><option>USD</option></select></label></div><label>Estado general<select value={quote.status} onChange={e=>setQuote({...quote,status:e.target.value})}><option value="in_progress">Solicitud recibida</option><option value="sent">Cotización enviada</option><option value="accepted">Presupuesto aprobado</option><option value="project_in_progress">Obra en proceso</option><option value="completed">Trabajo terminado</option><option value="cancelled">Cancelada</option></select></label><label>Inicio estimado<input type="date" value={quote.estimatedStartAt||''} onChange={e=>setQuote({...quote,estimatedStartAt:e.target.value})}/></label><label>Fin estimado<input type="date" value={quote.estimatedEndAt||''} onChange={e=>setQuote({...quote,estimatedEndAt:e.target.value})}/></label><section className="admin-milestones"><header><div><span>Seguimiento de obra</span><h3>Hitos del proyecto</h3></div><button type="button" onClick={addMilestone}>＋ Agregar hito</button></header>{(quote.milestones||[]).length===0?<p>Todavía no hay hitos. Podés agregarlos cuando el presupuesto sea aprobado.</p>:(quote.milestones||[]).map((item,index)=><article key={item.id||index}><label>Etapa<input value={item.title} onChange={e=>updateMilestone(index,{title:e.target.value})} placeholder="Ej: Fabricación" required/></label><label>Nota visible<textarea rows="2" value={item.description||''} onChange={e=>updateMilestone(index,{description:e.target.value})}/></label><div><label>Estado<select value={item.status} onChange={e=>updateMilestone(index,{status:e.target.value,completedAt:e.target.value==='completed'?(item.completedAt||new Date().toISOString()):null})}>{Object.entries(MILESTONE_STATUS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Desde<input type="date" value={item.plannedStartAt||''} onChange={e=>updateMilestone(index,{plannedStartAt:e.target.value})}/></label><label>Hasta<input type="date" value={item.plannedEndAt||''} onChange={e=>updateMilestone(index,{plannedEndAt:e.target.value})}/></label></div><button type="button" onClick={()=>removeMilestone(index)}>Eliminar hito</button></article>)}</section><button disabled={saving}>{saving?'Guardando…':'Guardar y notificar al cliente'}</button></form></div>

      {/* OXI NETWORK · ASIGNACIÓN Y AVANCE EN TALLER */}
      <section className="admin-deposit-config" style={{ borderTop: '2px solid #ea580c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span>OXI Network · Fabricación Distribuida</span>
            <h2>Asignación a Taller</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            style={{
              background: '#131313',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔨 {fabOrders.length > 0 ? 'Asignar Otra Pieza' : 'Asignar a Taller (OXI)'}
          </button>
        </div>

        {fabOrders.length === 0 ? (
          <div style={{ padding: '1.25rem', background: 'white', border: '1px dashed #dcd4c9', borderRadius: '6px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Esta cotización aún no ha sido asignada a ningún taller en la red de proveedores OXI Network.
            </p>
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              style={{ marginTop: '10px', background: 'transparent', color: '#ea580c', border: '1px solid #ea580c', padding: '6px 14px', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              ＋ Despachar orden de trabajo
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {fabOrders.map((order) => {
              const statusVariant = {
                pending: 'warning',
                accepted: 'info',
                in_progress: 'preparing',
                ready: 'success',
                delivered: 'default',
                rejected: 'danger'
              }[order.status] || 'default'

              const statusText = {
                pending: 'Pendiente de aceptación',
                accepted: 'Aceptado por taller',
                in_progress: 'En fabricación',
                ready: 'Listo para retiro / entrega',
                delivered: 'Entregado y completado',
                rejected: 'Rechazado'
              }[order.status] || order.status

              return (
                <div key={order.id} style={{ background: 'white', border: '1px solid #e7ded2', borderRadius: '6px', padding: '1rem', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 700 }}>ORDEN #{order.id} · {order.supplierCompany}</span>
                      <h4 style={{ margin: '2px 0 0', fontSize: '1.05rem', color: '#171816' }}>{order.title}</h4>
                    </div>
                    <Badge variant={statusVariant}>{statusText}</Badge>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', background: '#f9f8f6', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', margin: '8px 0' }}>
                    <div>
                      <span style={{ color: '#888', display: 'block', fontSize: '0.72rem' }}>COSTO TALLER</span>
                      <strong>{formatPrice(order.targetPrice, order.currency)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#888', display: 'block', fontSize: '0.72rem' }}>FECHA LÍMITE</span>
                      <span>{order.deadline ? new Date(order.deadline + 'T00:00:00').toLocaleDateString('es-UY') : 'A coordinar'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#888', display: 'block', fontSize: '0.72rem' }}>AVANCE EN TALLER</span>
                      <strong style={{ color: '#ea580c' }}>{order.progressPercent}%</strong>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: '#e5e0d8', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 10px' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, order.progressPercent))}%`, height: '100%', background: '#ea580c', transition: 'width 0.3s ease' }} />
                  </div>

                  {order.workshopNotes && (
                    <div style={{ background: '#fcfbf9', borderLeft: '3px solid #131313', padding: '6px 10px', fontSize: '0.82rem', color: '#444' }}>
                      <strong>Nota del taller:</strong> {order.workshopNotes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* MODAL DE ASIGNACIÓN A TALLER */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '10px', maxWidth: '520px', width: '100%', padding: '1.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>OXI NETWORK</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#131313' }}>Asignar Trabajo a Taller</h3>
              </div>
              <button type="button" onClick={() => setShowAssignModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            {assignError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '10px' }}>{assignError}</p>}

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>Taller Fabricante</span>
                <select
                  value={assignForm.supplierId}
                  onChange={(e) => setAssignForm({ ...assignForm, supplierId: e.target.value })}
                  required
                  style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Seleccioná un taller...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company || s.email}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>Título de la pieza o trabajo</span>
                <input
                  type="text"
                  value={assignForm.title}
                  onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                  required
                  style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600 }}>Presupuesto / Costo</span>
                  <input
                    type="number"
                    min="0"
                    value={assignForm.targetPrice}
                    onChange={(e) => setAssignForm({ ...assignForm, targetPrice: e.target.value })}
                    required
                    style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600 }}>Moneda</span>
                  <select
                    value={assignForm.currency}
                    onChange={(e) => setAssignForm({ ...assignForm, currency: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="USD">USD</option>
                    <option value="UYU">UYU</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>Fecha límite de entrega</span>
                <input
                  type="date"
                  value={assignForm.deadline}
                  onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })}
                  style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>Instrucciones y especificaciones técnicas</span>
                <textarea
                  rows="4"
                  value={assignForm.description}
                  onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                  placeholder="Detalles sobre perfiles, cortes, soldaduras y pintura..."
                  style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  style={{ padding: '8px 14px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  style={{ padding: '8px 16px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {assigning ? 'Despachando...' : 'Despachar a Taller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form className="admin-deposit-config" onSubmit={saveProposal}><span>Cobro de seña</span><h2>Reserva del proyecto</h2><div><label>Modalidad<select value={quote.depositMode||'none'} onChange={e=>setQuote({...quote,depositMode:e.target.value,depositValue:e.target.value==='none'?0:quote.depositValue})}><option value="none">Sin seña</option><option value="percentage">Porcentaje</option><option value="fixed">Monto fijo</option></select></label>{quote.depositMode!=='none'&&<label>{quote.depositMode==='percentage'?'Porcentaje (%)':'Monto fijo'}<input type="number" min="0" max={quote.depositMode==='percentage'?100:undefined} value={quote.depositValue||''} onChange={e=>setQuote({...quote,depositValue:e.target.value})}/></label>}</div>{quote.depositAmount>0&&<p>Seña calculada: <strong>{formatPrice(quote.depositAmount,quote.currency)}</strong> · Estado: {quote.depositStatus}</p>}{quote.depositStatus==='reported'&&<div className="admin-deposit-review"><a href={quote.depositReceipt?.url || quote.depositReceipt?.data} target="_blank" rel="noreferrer" download={!quote.depositReceipt?.url ? (quote.depositReceipt?.name||'comprobante') : undefined}>Ver comprobante</a><button type="button" onClick={()=>reviewDeposit('approved')} disabled={saving}>Confirmar transferencia</button><button type="button" onClick={()=>reviewDeposit('rejected')} disabled={saving}>Rechazar</button></div>}<button disabled={saving}>{saving?'Guardando…':'Guardar configuración de seña'}</button></form>
    <form className="admin-document-builder" onSubmit={saveAndDownloadPdf}><span>Documento comercial</span><header><div><h2>Cotización PDF</h2><p>Documento corto con detalle económico y condiciones esenciales.</p></div><button type="button" onClick={addDocumentItem}>＋ Agregar ítem</button></header><div className="admin-document-items">{(quote.documentItems||[]).map((item,index)=><article key={`${item.code}-${index}`}><input value={item.code||''} onChange={e=>updateDocumentItem(index,{code:e.target.value})} placeholder="Código"/><input value={item.description||''} onChange={e=>updateDocumentItem(index,{description:e.target.value})} placeholder="Descripción del ítem" required/><input type="number" min="0" value={item.subtotal??''} onChange={e=>updateDocumentItem(index,{subtotal:e.target.value})} placeholder="Subtotal sin IVA" required/><button type="button" onClick={()=>removeDocumentItem(index)} aria-label="Eliminar ítem">×</button></article>)}</div><div className="admin-document-grid"><label>IVA (%)<input type="number" min="0" max="100" value={quote.taxRate??22} onChange={e=>updateTaxRate(e.target.value)}/></label><label>Validez (días)<input type="number" min="1" value={quote.documentTerms?.validityDays||30} onChange={e=>setQuote({...quote,documentTerms:{...(quote.documentTerms||{}),validityDays:e.target.value}})}/></label><label className="is-wide">Forma de pago<textarea rows="3" value={quote.documentTerms?.paymentTerms||''} onChange={e=>setQuote({...quote,documentTerms:{...(quote.documentTerms||{}),paymentTerms:e.target.value}})}/></label><label className="is-wide">Plazo de ejecución<textarea rows="2" value={quote.documentTerms?.executionTime||''} onChange={e=>setQuote({...quote,documentTerms:{...(quote.documentTerms||{}),executionTime:e.target.value}})}/></label><label className="is-wide">Garantía<textarea rows="3" value={quote.documentTerms?.warranty||''} onChange={e=>setQuote({...quote,documentTerms:{...(quote.documentTerms||{}),warranty:e.target.value}})}/></label><label className="is-wide">Exclusiones<textarea rows="4" value={quote.documentTerms?.exclusions||''} onChange={e=>setQuote({...quote,documentTerms:{...(quote.documentTerms||{}),exclusions:e.target.value}})}/></label><label className="is-wide">Notas adicionales<textarea rows="3" value={quote.documentTerms?.notes||''} onChange={e=>setQuote({...quote,documentTerms:{...(quote.documentTerms||{}),notes:e.target.value}})}/></label></div><button disabled={saving||!(quote.documentItems||[]).length}>{saving?'Generando…':'Guardar y descargar PDF'}</button></form>
  </section>
}
