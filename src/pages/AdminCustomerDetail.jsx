import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createCustomerQuote, getAdminCustomer, getCustomerQuotes, updateCustomerQuoteStatus } from '../lib/api'
import { formatPrice } from '../utils/format'
import './AdminCustomerDetail.css'

const STATUS_OPTIONS = [
  ['in_progress', 'En proceso'], ['sent', 'Enviada'], ['accepted', 'Aceptada'],
  ['project_in_progress', 'Proyecto en desarrollo'], ['completed', 'Terminado'],
  ['rejected', 'Rechazada'], ['cancelled', 'Cancelada'],
]
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS)
const EMPTY_QUOTE = { title: '', description: '', status: 'in_progress', totalAmount: '', currency: 'UYU', estimatedStartAt: '', estimatedEndAt: '', internalNotes: '' }

export default function AdminCustomerDetail() {
  const { id } = useParams()
  const { adminUser, adminToken } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_QUOTE)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!adminToken) return
    setLoading(true)
    Promise.all([getAdminCustomer(id, adminToken), getCustomerQuotes(id, adminToken)])
      .then(([customerData, quoteData]) => { setCustomer(customerData); setQuotes(quoteData.rows || []) })
      .catch((requestError) => setError(requestError.message || 'No se pudo cargar el cliente.'))
      .finally(() => setLoading(false))
  }, [id, adminToken])

  const summary = useMemo(() => ({
    total: quotes.length,
    active: quotes.filter((quote) => ['accepted', 'project_in_progress'].includes(quote.status)).length,
    acceptedUyu: quotes.filter((quote) => quote.currency === 'UYU' && ['accepted', 'project_in_progress', 'completed'].includes(quote.status)).reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0),
    acceptedUsd: quotes.filter((quote) => quote.currency === 'USD' && ['accepted', 'project_in_progress', 'completed'].includes(quote.status)).reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0),
  }), [quotes])

  if (!adminUser || !adminToken) return <Navigate to={`/admin/login?redirect=/admin/clientes/${id}`} replace />

  function handleChange(event) { const { name, value } = event.target; setForm((previous) => ({ ...previous, [name]: value })) }

  async function submitQuote(event) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const created = await createCustomerQuote(id, { ...form, totalAmount: Number(form.totalAmount || 0) }, adminToken)
      setQuotes((previous) => [created, ...previous]); setForm(EMPTY_QUOTE); setModalOpen(false)
    } catch (requestError) { setError(requestError.message || 'No se pudo crear la cotización.') }
    finally { setSaving(false) }
  }

  async function changeStatus(quoteId, status) {
    setUpdatingId(quoteId); setError('')
    try {
      const updated = await updateCustomerQuoteStatus(quoteId, status, adminToken)
      setQuotes((previous) => previous.map((quote) => quote.id === updated.id ? updated : quote))
    } catch (requestError) { setError(requestError.message || 'No se pudo cambiar el estado.') }
    finally { setUpdatingId(null) }
  }

  return (
    <section className="admin-client-detail">
      <header><div><Link to="/admin/clientes">← Clientes</Link><span>Ficha comercial</span><h1>{customer?.name || 'Cliente'}</h1><p>{customer?.email}{customer?.phone ? ` · ${customer.phone}` : ''}</p></div><nav><Link to="/admin/cotizaciones-clientes">Cotizaciones</Link><Link to="/admin/productos">Productos</Link><Link to="/admin/pedidos">Pedidos</Link><Link to="/">Ver tienda ↗</Link></nav></header>

      {error && <p className="admin-client-detail-error" role="alert">{error}</p>}
      {loading ? <p className="admin-client-detail-empty">Cargando ficha comercial…</p> : <>
        <div className="admin-client-summary"><div><strong>{summary.total}</strong><span>Cotizaciones</span></div><div><strong>{summary.active}</strong><span>Trabajos activos</span></div><div><strong>{formatPrice(summary.acceptedUyu, 'UYU')}</strong><span>Aceptado UYU</span></div><div><strong>{formatPrice(summary.acceptedUsd, 'USD')}</strong><span>Aceptado USD</span></div><div><strong>{customer?.orderCount || 0}</strong><span>Pedidos</span></div></div>
        <div className="admin-client-section-head"><div><span>Historial comercial</span><h2>Cotizaciones y trabajos</h2></div><button type="button" onClick={() => setModalOpen(true)}>＋ Nueva cotización</button></div>

        {quotes.length === 0 ? <div className="admin-client-detail-empty"><h2>Todavía no hay cotizaciones.</h2><p>Creá la primera para comenzar el historial de este cliente.</p></div> : <div className="admin-client-quotes">{quotes.map((quote) => <article key={quote.id}>
          <div className="admin-quote-reference"><span>{quote.referenceNumber}</span><small>{quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-UY') : ''}</small></div>
          <div className="admin-quote-copy"><h3>{quote.title}</h3><p>{quote.description || 'Sin descripción adicional.'}</p><div>{quote.estimatedStartAt && <span>Inicio: {new Date(`${quote.estimatedStartAt}T00:00:00`).toLocaleDateString('es-UY')}</span>}{quote.estimatedEndAt && <span>Fin: {new Date(`${quote.estimatedEndAt}T00:00:00`).toLocaleDateString('es-UY')}</span>}<Link to={`/admin/clientes/${id}/cotizaciones/${quote.id}`}>Abrir conversación y cotizar →</Link></div></div>
          <strong className="admin-quote-amount">{formatPrice(quote.totalAmount, quote.currency)}</strong>
          <label className={`admin-quote-status is-${quote.status}`}><span>{STATUS_LABELS[quote.status]}</span><select aria-label={`Estado de ${quote.title}`} value={quote.status} disabled={updatingId === quote.id} onChange={(event) => changeStatus(quote.id, event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </article>)}</div>}
      </>}

      {modalOpen && <><div className="modal-overlay" onClick={() => setModalOpen(false)} aria-hidden="true" /><aside className="admin-quote-modal" role="dialog" aria-modal="true" aria-labelledby="new-quote-title"><header><div><span>Nueva oportunidad</span><h2 id="new-quote-title">Crear cotización</h2></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar">×</button></header><form onSubmit={submitQuote}><div className="admin-quote-form-grid"><label className="is-wide"><span>Título del trabajo *</span><input name="title" value={form.title} onChange={handleChange} required placeholder="Ej: Escalera metálica para vivienda" /></label><label className="is-wide"><span>Descripción</span><textarea name="description" value={form.description} onChange={handleChange} rows="3" /></label><label><span>Monto total *</span><input type="number" name="totalAmount" min="0" step="0.01" value={form.totalAmount} onChange={handleChange} required /></label><label><span>Moneda</span><select name="currency" value={form.currency} onChange={handleChange}><option value="UYU">UYU</option><option value="USD">USD</option></select></label><label><span>Estado inicial</span><select name="status" value={form.status} onChange={handleChange}>{STATUS_OPTIONS.slice(0, 3).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Inicio estimado</span><input type="date" name="estimatedStartAt" value={form.estimatedStartAt} onChange={handleChange} /></label><label><span>Fin estimado</span><input type="date" name="estimatedEndAt" value={form.estimatedEndAt} onChange={handleChange} /></label><label className="is-wide"><span>Notas internas</span><textarea name="internalNotes" value={form.internalNotes} onChange={handleChange} rows="3" /></label></div><button type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear cotización'}</button></form></aside></>}
    </section>
  )
}
