import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { createAdminOrder, getOrders, updateOrderStatus } from '../lib/api'
import { formatPrice } from '../utils/format'
import './AdminOrders.css'

const STATUS_OPTIONS = [
  ['pending', 'Pendiente'], ['confirmed', 'Confirmado'], ['preparing', 'Preparando'],
  ['shipped', 'Despachado'], ['delivered', 'Entregado'], ['cancelled', 'Cancelado'],
]
const SOURCE_LABELS = { web: 'Web', whatsapp: 'WhatsApp', phone: 'Teléfono', instagram: 'Instagram', presencial: 'Presencial', other: 'Otro' }
const EMPTY_FORM = {
  source: 'whatsapp', buyerName: '', buyerPhone: '', buyerEmail: '', deliveryMethod: 'pickup',
  deliveryAddress: '', deliveryCity: '', buyerNotes: '', paymentMethod: 'transferencia',
  sendNotification: false, items: [{ productId: '', quantity: 1 }],
}

export default function AdminOrders() {
  const { adminUser, adminToken } = useAuth()
  const { productList, refreshProducts } = useProducts()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [manualOpen, setManualOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!adminToken) return
    getOrders(adminToken)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((requestError) => setError(requestError.message || 'No se pudieron cargar los pedidos.'))
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

  const metrics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === 'pending').length,
    active: orders.filter((order) => ['confirmed', 'preparing', 'shipped'].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === 'delivered').length,
  }), [orders])

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
        <div><span>Operación comercial</span><h1>Pedidos</h1><p>Ventas web y pedidos recibidos por otros canales.</p></div>
        <nav><Link to="/admin/productos">Productos</Link><Link to="/admin/clientes">Clientes</Link><Link to="/admin/modelador">Simulador 3D</Link><Link to="/admin/cotizaciones">Consultas</Link><Link to="/admin/personalizaciones">Personalizaciones</Link><Link to="/">Ver tienda ↗</Link></nav>
      </header>

      <div className="admin-orders-title-row">
        <div className="admin-orders-metrics"><div><strong>{metrics.total}</strong><span>Total</span></div><div><strong>{metrics.pending}</strong><span>Pendientes</span></div><div><strong>{metrics.active}</strong><span>En proceso</span></div><div><strong>{metrics.delivered}</strong><span>Entregados</span></div></div>
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

      {manualOpen && <><div className="modal-overlay" onClick={() => setManualOpen(false)} aria-hidden="true" /><div className="admin-order-modal" role="dialog" aria-modal="true" aria-labelledby="manual-order-title"><header><div><span>Alta administrativa</span><h2 id="manual-order-title">Nuevo pedido manual</h2></div><button type="button" onClick={() => setManualOpen(false)} aria-label="Cerrar">×</button></header><form onSubmit={submitManualOrder}>
        <div className="admin-order-form-grid"><label><span>Origen</span><select name="source" value={form.source} onChange={updateForm}>{Object.entries(SOURCE_LABELS).filter(([value]) => value !== 'web').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Nombre *</span><input name="buyerName" value={form.buyerName} onChange={updateForm} required /></label><label><span>WhatsApp *</span><input name="buyerPhone" value={form.buyerPhone} onChange={updateForm} required /></label><label><span>Email</span><input type="email" name="buyerEmail" value={form.buyerEmail} onChange={updateForm} /></label></div>
        <fieldset className="admin-order-products"><legend>Productos</legend>{form.items.map((item, index) => <div key={index}><select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)} required><option value="">Seleccionar producto</option>{productList.filter((product) => product.status === 'published' && Number(product.stock) > 0).map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock} · {formatPrice(product.price, product.currency)}</option>)}</select><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /><button type="button" onClick={() => setForm((previous) => ({ ...previous, items: previous.items.filter((_, itemIndex) => itemIndex !== index) }))} disabled={form.items.length === 1}>×</button></div>)}<button type="button" onClick={() => setForm((previous) => ({ ...previous, items: [...previous.items, { productId: '', quantity: 1 }] }))}>＋ Agregar producto</button></fieldset>
        <div className="admin-order-form-grid"><label><span>Entrega</span><select name="deliveryMethod" value={form.deliveryMethod} onChange={updateForm}><option value="pickup">Retiro acordado</option><option value="delivery">Entrega coordinada</option></select></label>{form.deliveryMethod === 'delivery' && <><label><span>Dirección *</span><input name="deliveryAddress" value={form.deliveryAddress} onChange={updateForm} required /></label><label><span>Localidad *</span><input name="deliveryCity" value={form.deliveryCity} onChange={updateForm} required /></label></>}<label className="is-wide"><span>Notas</span><textarea name="buyerNotes" value={form.buyerNotes} onChange={updateForm} rows="2" /></label></div>
        <label className="admin-order-notify"><input type="checkbox" name="sendNotification" checked={form.sendNotification} onChange={updateForm} /><span>Enviar confirmación del pedido por WhatsApp</span></label><button className="admin-order-submit" type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar pedido y descontar stock'}</button>
      </form></div></>}
    </section>
  )
}
