import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { createAdminOrder, getOrders, getAllCustomerQuotes, updateOrderStatus } from '../lib/api'
import { formatPrice } from '../utils/format'
import './AdminOrders.css'

const STATUS_OPTIONS = [
  ['pending', 'Pendiente'], ['confirmed', 'Confirmado'], ['preparing', 'Preparando'],
  ['shipped', 'Despachado'], ['delivered', 'Entregado'], ['cancelled', 'Cancelado'],
]
const SOURCE_LABELS = { web: 'Web', whatsapp: 'WhatsApp', phone: 'Teléfono', instagram: 'Instagram', presencial: 'Presencial', other: 'Otro' }
const QUOTE_STATUS_OPTIONS = [
  ['all', 'Todos los estados'],
  ['in_progress', 'En revisión / Nueva'],
  ['sent', 'Cotizada'],
  ['accepted', 'Presupuesto aprobado'],
  ['project_in_progress', 'Obra en proceso'],
  ['completed', 'Finalizada'],
  ['rejected', 'Rechazada'],
  ['cancelled', 'Cancelada'],
]
const QUOTE_STATUS_LABELS = {
  in_progress: 'En revisión',
  sent: 'Cotizada',
  accepted: 'Presupuesto aprobado',
  project_in_progress: 'Obra en proceso',
  completed: 'Finalizada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
}

function formatRequestedDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('es-UY')
}

const EMPTY_FORM = {
  source: 'whatsapp', buyerName: '', buyerPhone: '', buyerEmail: '', deliveryMethod: 'pickup',
  deliveryAddress: '', deliveryCity: '', buyerNotes: '', paymentMethod: 'transferencia',
  sendNotification: false, items: [{ productId: '', quantity: 1 }],
}

export default function AdminOrders() {
  const { adminUser, adminToken } = useAuth()
  const { productList, refreshProducts } = useProducts()
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [manualOpen, setManualOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!adminToken) return
    setLoading(true)
    Promise.all([
      getOrders(adminToken).catch(() => []),
      getAllCustomerQuotes(adminToken).catch(() => ({ rows: [] }))
    ])
      .then(([ordersData, quotesData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setQuotes(Array.isArray(quotesData?.rows) ? quotesData.rows : [])
      })
      .catch((requestError) => setError(requestError.message || 'No se pudieron cargar los pedidos ni cotizaciones.'))
      .finally(() => setLoading(false))
  }, [adminToken])

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesSearch = !term || [order.id, order.buyerName, order.buyerPhone, order.buyerEmail]
        .some((value) => String(value || '').toLowerCase().includes(term))
      return matchesSearch
        && (statusFilter === 'all' || order.status === statusFilter)
        && (sourceFilter === 'all' || (order.source || 'web') === sourceFilter)
    })
  }, [orders, search, statusFilter, sourceFilter])

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase()
    return quotes.filter((q) => {
      const matchesSearch = !term || [q.referenceNumber, q.title, q.customerName, q.customerEmail, q.description]
        .some((val) => String(val || '').toLowerCase().includes(term))
      return matchesSearch && (quoteStatusFilter === 'all' || q.status === quoteStatusFilter)
    })
  }, [quotes, search, quoteStatusFilter])

  const metrics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === 'pending').length,
    active: orders.filter((order) => ['confirmed', 'preparing', 'shipped'].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === 'delivered').length,
  }), [orders])

  const quoteMetrics = useMemo(() => ({
    total: quotes.length,
    inProgress: quotes.filter((q) => q.status === 'in_progress').length,
    sent: quotes.filter((q) => q.status === 'sent').length,
    activeProjects: quotes.filter((q) => ['accepted', 'project_in_progress'].includes(q.status)).length,
  }), [quotes])

  if (!adminUser || !adminToken) return <Navigate to="/admin/login?redirect=/admin/pedidos" replace />

  function updateForm(event) {
    const { name, value, type, checked } = event.target
    setForm((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }))
  }

  function updateItem(index, field, value) {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }))
  }

  async function submitManualOrder(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const created = await createAdminOrder({
        ...form,
        items: form.items.filter((item) => item.productId).map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) })),
      }, adminToken)
      setOrders((previous) => [created, ...previous])
      setForm(EMPTY_FORM)
      setManualOpen(false)
      refreshProducts()
    } catch (requestError) {
      setError(requestError.message || 'No se pudo registrar el pedido manual.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(orderId, status) {
    setUpdatingId(orderId)
    setError('')
    try {
      const updated = await updateOrderStatus(orderId, status, adminToken)
      setOrders((previous) => previous.map((order) => Number(order.id) === Number(orderId) ? { ...order, status: updated.status } : order))
      if (status === 'cancelled') refreshProducts()
    } catch (requestError) {
      setError(requestError.message || 'No se pudo actualizar el pedido.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="admin-orders-page">
      <header className="admin-orders-header">
        <div><span>Operación comercial</span><h1>Pedidos & Solicitudes</h1><p>Ventas de tienda online y solicitudes de cotización B2B OxI.</p></div>
        <nav>
          <Link to="/admin/productos">Productos</Link>
          <Link to="/admin/clientes">Clientes</Link>
          <Link to="/admin/cotizaciones-clientes">Cotizaciones B2B</Link>
          <Link to="/admin/modelador">Simulador 3D</Link>
          <Link to="/admin/cotizaciones">Consultas</Link>
          <Link to="/admin/personalizaciones">Personalizaciones</Link>
          <Link to="/">Ver tienda ↗</Link>
        </nav>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 22px',
            border: activeTab === 'orders' ? '2px solid #292823' : '1px solid #c8beaf',
            background: activeTab === 'orders' ? '#292823' : '#faf8f3',
            color: activeTab === 'orders' ? '#ffffff' : '#292823',
            fontWeight: '800',
            cursor: 'pointer',
            fontSize: '0.88rem',
            borderRadius: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          🛒 Pedidos de Tienda ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quotes')}
          style={{
            padding: '12px 22px',
            border: activeTab === 'quotes' ? '2px solid #a8522e' : '1px solid #c8beaf',
            background: activeTab === 'quotes' ? '#a8522e' : '#faf8f3',
            color: activeTab === 'quotes' ? '#ffffff' : '#292823',
            fontWeight: '800',
            cursor: 'pointer',
            fontSize: '0.88rem',
            borderRadius: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          ⚡ Solicitudes & Cotizaciones B2B OxI ({quotes.length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          <div className="admin-orders-title-row">
            <div className="admin-orders-metrics">
              <div><strong>{metrics.total}</strong><span>Total</span></div>
              <div><strong>{metrics.pending}</strong><span>Pendientes</span></div>
              <div><strong>{metrics.active}</strong><span>En proceso</span></div>
              <div><strong>{metrics.delivered}</strong><span>Entregados</span></div>
            </div>
            <button type="button" onClick={() => setManualOpen(true)}>＋ Nuevo pedido manual</button>
          </div>

          {error && <p className="admin-orders-error" role="alert">{error}</p>}

          <div className="admin-orders-filters">
            <label><span>Buscar</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Número, cliente, teléfono…" /></label>
            <label><span>Estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>Origen</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">Todos</option>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>

          {loading ? <p className="admin-orders-empty">Cargando pedidos…</p> : filteredOrders.length === 0 ? <p className="admin-orders-empty">No hay pedidos para estos filtros.</p> : (
            <div className="admin-orders-list">
              {filteredOrders.map((order) => (
                <article key={order.id}>
                  <div className="admin-order-top"><div><span>Pedido #{order.id} · {SOURCE_LABELS[order.source || 'web']}</span><h2>{order.buyerName || 'Cliente sin nombre'}</h2><p>{new Date(order.createdAt).toLocaleString('es-UY')}</p></div><select value={order.status} disabled={updatingId === order.id} onChange={(event) => changeStatus(order.id, event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                  <div className="admin-order-body">
                    <div className="admin-order-contact"><a href={`tel:${order.buyerPhone}`}>{order.buyerPhone}</a>{order.buyerEmail && <a href={`mailto:${order.buyerEmail}`}>{order.buyerEmail}</a>}<span>{order.deliveryMethod === 'pickup' ? 'Retiro acordado' : [order.deliveryAddress, order.deliveryCity].filter(Boolean).join(', ')}</span>{order.buyerNotes && <p>{order.buyerNotes}</p>}</div>
                    <ul>{(order.items || []).map((item, index) => <li key={`${order.id}-${item.productId}-${index}`}><span>{item.name || `Producto #${item.productId}`} × {item.quantity}</span><strong>{formatPrice(item.subtotal ?? item.price * item.quantity, item.currency)}</strong></li>)}</ul>
                  </div>
                  <footer><span>Pago: {order.paymentMethod === 'mercadopago' ? 'Mercado Pago' : order.paymentMethod === 'pago_al_coordinar' ? 'Después de cotizar envío' : 'Transferencia'}</span><strong>{order.paymentMethod === 'pago_al_coordinar' ? 'Subtotal' : 'Total'}: {formatPrice(order.total || 0, order.currency)}</strong>{order.trackingToken && <Link to={`/seguimiento/${order.trackingToken}?phone=${encodeURIComponent(order.buyerPhone || '')}`}>Ver seguimiento ↗</Link>}</footer>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="admin-orders-title-row">
            <div className="admin-orders-metrics">
              <div><strong>{quoteMetrics.total}</strong><span>Total Solicitudes</span></div>
              <div><strong>{quoteMetrics.inProgress}</strong><span>En revisión</span></div>
              <div><strong>{quoteMetrics.sent}</strong><span>Cotizadas</span></div>
              <div><strong>{quoteMetrics.activeProjects}</strong><span>En Obra / Aprobadas</span></div>
            </div>
            <Link
              to="/admin/cotizaciones-clientes"
              style={{
                padding: '15px 20px',
                background: '#a8522e',
                color: '#ffffff',
                fontWeight: 900,
                textDecoration: 'none',
                display: 'inline-block',
                fontSize: '0.85rem'
              }}
            >
              Tablero B2B Completo ↗
            </Link>
          </div>

          {error && <p className="admin-orders-error" role="alert">{error}</p>}

          <div className="admin-orders-filters" style={{ gridTemplateColumns: '1fr 240px' }}>
            <label>
              <span>Buscar cotizaciones</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nº SOL, cliente, pieza o requerimiento…"
              />
            </label>
            <label>
              <span>Estado B2B</span>
              <select value={quoteStatusFilter} onChange={(event) => setQuoteStatusFilter(event.target.value)}>
                {QUOTE_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="admin-orders-empty">Cargando solicitudes B2B…</p>
          ) : filteredQuotes.length === 0 ? (
            <p className="admin-orders-empty">No hay solicitudes para estos filtros.</p>
          ) : (
            <div className="admin-orders-list">
              {filteredQuotes.map((q) => (
                <article key={q.id}>
                  <div className="admin-order-top">
                    <div>
                      <span style={{ color: '#a8522e', fontWeight: 800 }}>
                        Solicitud {q.referenceNumber || `#${q.id}`} · OxI B2B
                      </span>
                      <h2>{q.customerName || q.customerEmail || 'Cliente corporativo'}</h2>
                      <p>{new Date(q.createdAt || q.updatedAt).toLocaleString('es-UY')}</p>
                    </div>
                    <span
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        alignSelf: 'flex-start',
                        background:
                          q.status === 'in_progress' ? '#fef3c7' :
                          q.status === 'sent' ? '#e0f2fe' :
                          ['accepted', 'project_in_progress'].includes(q.status) ? '#dcfce7' : '#f3f4f6',
                        color:
                          q.status === 'in_progress' ? '#92400e' :
                          q.status === 'sent' ? '#0369a1' :
                          ['accepted', 'project_in_progress'].includes(q.status) ? '#166534' : '#374151',
                      }}
                    >
                      {QUOTE_STATUS_LABELS[q.status] || q.status}
                    </span>
                  </div>
                  <div className="admin-order-body" style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#292823' }}>{q.title}</h3>
                      <p style={{ color: '#514b43', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: '0' }}>{q.description}</p>
                      {q.desiredDate && (
                        <p style={{ marginTop: '10px', color: '#766e63', fontSize: '0.85rem' }}>
                          📅 <strong>Fecha deseada en obra:</strong> {formatRequestedDate(q.desiredDate)}
                        </p>
                      )}
                      {q.attachments?.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {q.attachments.map((f, i) => (
                            <a
                              key={i}
                              href={f.url || f.data}
                              target="_blank"
                              rel="noreferrer"
                              download={!f.url ? f.name : undefined}
                              style={{
                                fontSize: '0.8rem',
                                color: '#a8522e',
                                background: '#e9e3d8',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                fontWeight: 600
                              }}
                            >
                              📎 {f.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <footer>
                    <span>
                      {q.totalAmount > 0
                        ? `Presupuesto asignado: ${formatPrice(q.totalAmount, q.currency)}`
                        : 'Sin cotización emitida'}
                    </span>
                    <Link
                      to={`/admin/clientes/${q.customerId}/cotizaciones/${q.id}`}
                      style={{
                        marginLeft: 'auto',
                        color: '#ffffff',
                        background: '#a8522e',
                        padding: '9px 18px',
                        fontWeight: 800,
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        borderRadius: '2px',
                      }}
                    >
                      Abrir y Cotizar en OxI →
                    </Link>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {manualOpen && <><div className="modal-overlay" onClick={() => setManualOpen(false)} aria-hidden="true" /><div className="admin-order-modal" role="dialog" aria-modal="true" aria-labelledby="manual-order-title"><header><div><span>Alta administrativa</span><h2 id="manual-order-title">Nuevo pedido manual</h2></div><button type="button" onClick={() => setManualOpen(false)} aria-label="Cerrar">×</button></header><form onSubmit={submitManualOrder}>
        <div className="admin-order-form-grid"><label><span>Origen</span><select name="source" value={form.source} onChange={updateForm}>{Object.entries(SOURCE_LABELS).filter(([value]) => value !== 'web').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Nombre *</span><input name="buyerName" value={form.buyerName} onChange={updateForm} required /></label><label><span>WhatsApp *</span><input name="buyerPhone" value={form.buyerPhone} onChange={updateForm} required /></label><label><span>Email</span><input type="email" name="buyerEmail" value={form.buyerEmail} onChange={updateForm} /></label></div>
        <fieldset className="admin-order-products"><legend>Productos</legend>{form.items.map((item, index) => <div key={index}><select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)} required><option value="">Seleccionar producto</option>{productList.filter((product) => product.status === 'published' && Number(product.stock) > 0).map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock} · {formatPrice(product.price, product.currency)}</option>)}</select><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /><button type="button" onClick={() => setForm((previous) => ({ ...previous, items: previous.items.filter((_, itemIndex) => itemIndex !== index) }))} disabled={form.items.length === 1}>×</button></div>)}<button type="button" onClick={() => setForm((previous) => ({ ...previous, items: [...previous.items, { productId: '', quantity: 1 }] }))}>＋ Agregar producto</button></fieldset>
        <div className="admin-order-form-grid"><label><span>Entrega</span><select name="deliveryMethod" value={form.deliveryMethod} onChange={updateForm}><option value="pickup">Retiro acordado</option><option value="delivery">Entrega coordinada</option></select></label>{form.deliveryMethod === 'delivery' && <><label><span>Dirección *</span><input name="deliveryAddress" value={form.deliveryAddress} onChange={updateForm} required /></label><label><span>Localidad *</span><input name="deliveryCity" value={form.deliveryCity} onChange={updateForm} required /></label></>}<label className="is-wide"><span>Notas</span><textarea name="buyerNotes" value={form.buyerNotes} onChange={updateForm} rows="2" /></label></div>
        <label className="admin-order-notify"><input type="checkbox" name="sendNotification" checked={form.sendNotification} onChange={updateForm} /><span>Enviar confirmación del pedido por WhatsApp</span></label><button className="admin-order-submit" type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar pedido y descontar stock'}</button>
      </form></div></>}
    </section>
  )
}
