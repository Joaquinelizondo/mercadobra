import { useEffect, useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { formatPrice, companyInitials } from '../utils/format'
import PublishModal from '../components/PublishModal'
import ProductCard from '../components/ProductCard'
import SupplierAssistant from '../components/SupplierAssistant'
import { Badge } from '../components/Badge'
import OxidaWordmark from '../components/OxidaWordmark'
import { getOrders, updateOrderStatus, getSupplierFabricationOrders, updateSupplierFabricationOrder } from '../lib/api'
import './CustomerPortal.css'
import './CustomerPortalMobile.css'

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Despachada' },
  { value: 'delivered', label: 'Entregada' },
  { value: 'cancelled', label: 'Cancelada' },
]

const PAYMENT_LABELS = {
  transferencia: 'Transferencia bancaria',
  mercadopago: 'MercadoPago',
  tarjeta_credito: 'Tarjeta de crédito',
  tarjeta_debito: 'Tarjeta de débito',
}

const STATUS_VARIANTS = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'preparing',
  shipped: 'shipped',
  delivered: 'success',
  cancelled: 'danger',
}

function statusLabel(status) {
  return ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label || status || 'Pendiente'
}

export default function SupplierDashboard() {
  const { supplierUser, logout, token } = useAuth()
  const { productList, deleteProduct } = useProducts()
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishDraft, setPublishDraft] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)

  const [fabOrders, setFabOrders] = useState([])
  const [fabLoading, setFabLoading] = useState(false)
  const [fabError, setFabError] = useState('')
  const [updatingFabId, setUpdatingFabId] = useState(null)
  const [notesDrafts, setNotesDrafts] = useState({})

  const supplierCompany = supplierUser?.company || ''
  const myProducts = useMemo(
    () => productList.filter((product) => product.company === supplierCompany),
    [productList, supplierCompany]
  )
  const totalValue = myProducts.reduce((sum, p) => sum + p.price, 0)
  const categories = [...new Set(myProducts.map((p) => p.category))]
  const myProductIdSet = useMemo(
    () => new Set(myProducts.map((product) => Number(product.id))),
    [myProducts]
  )

  const providerOrders = useMemo(
    () =>
      orders
        .map((order) => {
          const relevantItems = (order.items || []).filter((item) => myProductIdSet.has(Number(item.productId)))
          const units = relevantItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
          if (!relevantItems.length) return null
          return {
            ...order,
            relevantItems,
            units,
          }
        })
        .filter(Boolean),
    [orders, myProductIdSet]
  )

  const activeFabOrders = useMemo(
    () => fabOrders.filter((o) => ['pending', 'accepted', 'in_progress', 'ready'].includes(o.status)),
    [fabOrders]
  )

  useEffect(() => {
    let active = true

    async function loadOrders() {
      if (!supplierUser || !token) return
      setOrdersLoading(true)
      setOrdersError('')
      try {
        const data = await getOrders(token)
        if (!active) return
        setOrders(Array.isArray(data) ? data : [])
      } catch (error) {
        if (!active) return
        setOrdersError(error.message || 'No se pudieron cargar las órdenes')
      } finally {
        if (active) setOrdersLoading(false)
      }
    }

    async function loadFabOrders() {
      if (!supplierUser || !token) return
      setFabLoading(true)
      setFabError('')
      try {
        const data = await getSupplierFabricationOrders(token)
        if (!active) return
        setFabOrders(Array.isArray(data?.rows) ? data.rows : [])
      } catch (error) {
        if (!active) return
        setFabError(error.message || 'No se pudieron cargar las órdenes de taller')
      } finally {
        if (active) setFabLoading(false)
      }
    }

    loadOrders()
    loadFabOrders()
    return () => {
      active = false
    }
  }, [token, supplierUser])

  if (!supplierUser) return <Navigate to="/proveedor/login" replace />

  async function handleOrderStatusChange(orderId, status) {
    setUpdatingOrderId(orderId)
    setOrdersError('')

    try {
      const updated = await updateOrderStatus(orderId, status, token)
      setOrders((prev) =>
        prev.map((order) =>
          Number(order.id) === Number(orderId)
            ? { ...order, status: updated.status }
            : order
        )
      )
    } catch (error) {
      setOrdersError(error.message || 'No se pudo actualizar el estado')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function handleFabStatusChange(orderId, status) {
    setUpdatingFabId(orderId)
    setFabError('')
    try {
      const updated = await updateSupplierFabricationOrder(orderId, { status }, token)
      setFabOrders((prev) =>
        prev.map((order) =>
          Number(order.id) === Number(orderId)
            ? { ...order, status: updated.status }
            : order
        )
      )
    } catch (error) {
      setFabError(error.message || 'No se pudo actualizar el estado de la orden')
    } finally {
      setUpdatingFabId(null)
    }
  }

  async function handleFabProgressChange(orderId, progressPercent) {
    setUpdatingFabId(orderId)
    setFabError('')
    try {
      const updated = await updateSupplierFabricationOrder(orderId, { progressPercent }, token)
      setFabOrders((prev) =>
        prev.map((order) =>
          Number(order.id) === Number(orderId)
            ? { ...order, progressPercent: updated.progressPercent }
            : order
        )
      )
    } catch (error) {
      setFabError(error.message || 'No se pudo actualizar el avance')
    } finally {
      setUpdatingFabId(null)
    }
  }

  async function handleSaveFabNotes(orderId) {
    const workshopNotes = notesDrafts[orderId]
    if (workshopNotes === undefined) return
    setUpdatingFabId(orderId)
    setFabError('')
    try {
      const updated = await updateSupplierFabricationOrder(orderId, { workshopNotes }, token)
      setFabOrders((prev) =>
        prev.map((order) =>
          Number(order.id) === Number(orderId)
            ? { ...order, workshopNotes: updated.workshopNotes }
            : order
        )
      )
    } catch (error) {
      setFabError(error.message || 'No se pudo guardar la nota de taller')
    } finally {
      setUpdatingFabId(null)
    }
  }

  return (
    <>
      <div className="oxi-os-dashboard">
        <aside className="oxi-os-sidebar">
          <div className="oxi-os-brand">
            <OxidaWordmark />
            <span>NETWORK</span>
          </div>

          <div className="oxi-os-user">
            <strong>{supplierUser.company}</strong>
            <span>{supplierUser.email}</span>
          </div>

          <div className="oxi-os-menu">
            <button
              className="oxi-os-btn primary"
              onClick={() => {
                setEditingProduct(null)
                setPublishDraft(null)
                setPublishOpen(true)
              }}
            >
              ＋ Nuevo producto
            </button>
            <Link to="/explorar" className="oxi-os-btn secondary" style={{display: 'block', textDecoration: 'none'}}>
              Ver catálogo público
            </Link>
          </div>

          <button className="oxi-os-btn dark" onClick={logout}>
            Cerrar sesión
          </button>
        </aside>

        <main className="oxi-os-main">
          <header className="oxi-os-main-header">
            <div>
              <span>OXI NETWORK PARA TALLERES</span>
              <h1>Panel de fabricante</h1>
              <p>Gestioná tus productos publicados y recibí órdenes de trabajo.</p>
            </div>
          </header>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="dashboard-stat" style={{ borderLeft: '3px solid #ea580c' }}>
            <strong style={{ color: '#ea580c' }}>{activeFabOrders.length}</strong>
            <span>fabricación activa OXI</span>
          </div>
          <div className="dashboard-stat">
            <strong>{myProducts.length}</strong>
            <span>productos publicados</span>
          </div>
          <div className="dashboard-stat">
            <strong>{categories.length}</strong>
            <span>{categories.length === 1 ? 'categoría activa' : 'categorías activas'}</span>
          </div>
          <div className="dashboard-stat">
            <strong>{formatPrice(totalValue)}</strong>
            <span>valor total del catálogo</span>
          </div>
          <div className="dashboard-stat dashboard-stat--link">
            <Link to="/explorar">Ver catálogo público →</Link>
          </div>
        </div>

        <SupplierAssistant
          supplierUser={supplierUser}
          myProducts={myProducts}
          onApplyDraft={(draft) => {
            setPublishDraft(draft)
            setPublishOpen(true)
          }}
        />

        {/* OXI NETWORK · ÓRDENES DE FABRICACIÓN EN TALLER */}
        <div className="dashboard-products-section" style={{ border: '1px solid #dcd4c9', borderRadius: '12px', background: '#faf8f5', padding: '1.5rem', marginBottom: '2rem' }}>
          <div className="dashboard-section-header" style={{ borderBottom: '1px solid #e7ded2', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ea580c' }}>
                  MARKETPLACE DISTRIBUIDO
                </span>
                <Badge variant="warning">OXI NETWORK</Badge>
              </div>
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#131313' }}>🛠️ Órdenes de Fabricación en Taller</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#666' }}>
                Encargos de manufactura, estructuras y piezas asignadas directamente por Óxida Studio.
              </p>
            </div>
            {!fabLoading && fabOrders.length > 0 && (
              <span className="dashboard-count" style={{ background: '#ea580c', color: 'white' }}>{fabOrders.length}</span>
            )}
          </div>

          {fabLoading ? (
            <div className="dashboard-empty"><p>Cargando órdenes de taller…</p></div>
          ) : fabError ? (
            <div className="dashboard-empty"><p style={{ color: '#dc2626' }}>{fabError}</p></div>
          ) : fabOrders.length === 0 ? (
            <div className="dashboard-empty" style={{ background: 'white', border: '1px dashed #dcd4c9', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#666' }}>
                Todavía no tenés órdenes de fabricación asignadas en OXI Network. Te notificaremos cuando Óxida Studio te envíe un nuevo trabajo.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {fabOrders.map((order) => {
                const statusMeta = {
                  pending: { label: 'Encargo Nuevo (Pendiente)', variant: 'warning' },
                  accepted: { label: 'Aceptado · En Taller', variant: 'info' },
                  in_progress: { label: 'Fabricación en Curso', variant: 'preparing' },
                  ready: { label: 'Listo para Entrega', variant: 'success' },
                  delivered: { label: 'Entregado y Finalizado', variant: 'default' },
                  rejected: { label: 'Rechazado', variant: 'danger' },
                }[order.status] || { label: order.status, variant: 'default' }

                const isUpdating = updatingFabId === order.id
                const currentDraftNote = notesDrafts[order.id] !== undefined ? notesDrafts[order.id] : (order.workshopNotes || '')

                return (
                  <div
                    key={order.id}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e0d8',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>ORDEN #{order.id}</span>
                          {order.quoteId && (
                            <span style={{ fontSize: '0.75rem', background: '#f3efe7', padding: '2px 6px', borderRadius: '4px', color: '#555' }}>
                              Cotización #{order.quoteId}
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', color: '#171816', fontWeight: 700 }}>
                          {order.title}
                        </h3>
                        {order.projectName && (
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                            Proyecto: <strong>{order.projectName}</strong>
                          </p>
                        )}
                      </div>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f9f8f6', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: '#888', display: 'block', fontSize: '0.75rem' }}>PRESUPUESTO ASIGNADO</span>
                        <strong style={{ fontSize: '1.05rem', color: '#131313' }}>{formatPrice(order.targetPrice, order.currency)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#888', display: 'block', fontSize: '0.75rem' }}>PLAZO ACORDADO</span>
                        <strong>{order.deadline ? new Date(order.deadline + 'T00:00:00').toLocaleDateString('es-UY') : 'A coordinar'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#888', display: 'block', fontSize: '0.75rem' }}>FECHA ASIGNACIÓN</span>
                        <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-UY') : '-'}</span>
                      </div>
                    </div>

                    {order.description && (
                      <div style={{ marginBottom: '14px', fontSize: '0.88rem', color: '#333', background: '#fff', borderLeft: '3px solid #ea580c', paddingLeft: '10px' }}>
                        <p style={{ margin: 0 }}>{order.description}</p>
                      </div>
                    )}

                    {/* Progress slider & quick presets */}
                    <div style={{ margin: '14px 0', padding: '12px', background: '#fcfbf9', border: '1px solid #eee', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#333' }}>
                          Avance en Taller: <strong style={{ color: '#ea580c' }}>{order.progressPercent}%</strong>
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[0, 25, 50, 75, 100].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleFabProgressChange(order.id, pct)}
                              style={{
                                padding: '2px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid #dcd4c9',
                                background: order.progressPercent === pct ? '#ea580c' : 'white',
                                color: order.progressPercent === pct ? 'white' : '#333',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e5e0d8', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, order.progressPercent))}%`,
                            height: '100%',
                            background: '#ea580c',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={order.progressPercent}
                        disabled={isUpdating}
                        onChange={(e) => handleFabProgressChange(order.id, Number(e.target.value))}
                        style={{ width: '100%', marginTop: '6px', cursor: 'pointer', accentColor: '#ea580c' }}
                      />
                    </div>

                    {/* Workshop Notes */}
                    <div style={{ marginTop: '12px', marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
                        NOTAS TÉCNICAS DEL TALLER (Reporte a Óxida)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={currentDraftNote}
                          placeholder="Ej: Perfiles cortados, entrando a cámara de pintura electrostática..."
                          onChange={(e) => setNotesDrafts({ ...notesDrafts, [order.id]: e.target.value })}
                          style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: '6px' }}
                        />
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleSaveFabNotes(order.id)}
                          style={{ padding: '8px 14px', background: '#171816', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Guardar nota
                        </button>
                      </div>
                    </div>

                    {/* Workflow status action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                      {order.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleFabStatusChange(order.id, 'accepted')}
                            style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            ✓ Aceptar Encargo de Fabricación
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleFabStatusChange(order.id, 'rejected')}
                            style={{ padding: '8px 16px', background: 'transparent', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            ✗ Rechazar
                          </button>
                        </>
                      )}
                      {order.status === 'accepted' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleFabStatusChange(order.id, 'in_progress')}
                          style={{ padding: '8px 16px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          ▶ Iniciar Fabricación en Taller
                        </button>
                      )}
                      {order.status === 'in_progress' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleFabStatusChange(order.id, 'ready')}
                          style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          🏁 Marcar Listo para Entrega
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleFabStatusChange(order.id, 'delivered')}
                          style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          📦 Confirmar Entrega Realizada
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ✓ Fabricación completada y entregada
                        </span>
                      )}
                      {order.status === 'rejected' && (
                        <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
                          Encargo rechazado por el taller
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dashboard-products-section">
          <div className="dashboard-section-header">
            <h2>Órdenes de tus productos</h2>
            {!ordersLoading && providerOrders.length > 0 && (
              <span className="dashboard-count">{providerOrders.length}</span>
            )}
          </div>

          {ordersLoading ? (
            <div className="dashboard-empty">
              <p>Cargando órdenes…</p>
            </div>
          ) : ordersError ? (
            <div className="dashboard-empty">
              <p>{ordersError}</p>
            </div>
          ) : providerOrders.length === 0 ? (
            <div className="dashboard-empty">
              <p>Todavía no tenés órdenes asociadas a tus productos.</p>
            </div>
          ) : (
            <ul className="supplier-orders-list">
              {providerOrders.slice(0, 10).map((order) => (
                <li key={order.id} className="supplier-order-item">
                  <div className="supplier-order-item-top">
                    <p><strong>Orden #{order.id}</strong></p>
                    <span>{new Date(order.createdAt).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="supplier-order-status">
                    <Badge variant={STATUS_VARIANTS[order.status] || 'default'}>
                      {statusLabel(order.status)}
                    </Badge>
                  </div>
                  <p className="supplier-order-meta">
                    {order.buyerName ? `Comprador: ${order.buyerName}` : 'Comprador sin nombre'}
                    {order.buyerPhone ? ` · ${order.buyerPhone}` : ''}
                  </p>
                  {order.buyerEmail && (
                    <p className="supplier-order-meta">Email: {order.buyerEmail}</p>
                  )}
                  <p className="supplier-order-meta">
                    Entrega: {order.deliveryMethod === 'pickup'
                      ? 'Retiro acordado'
                      : [order.deliveryAddress, order.deliveryCity].filter(Boolean).join(', ') || 'A coordinar'}
                  </p>
                  {order.buyerNotes && (
                    <p className="supplier-order-meta">Notas: {order.buyerNotes}</p>
                  )}
                  <p className="supplier-order-meta">
                    Pago: {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || 'No informado'}
                  </p>
                  <p className="supplier-order-meta">
                    Notificación: {order.latestNotification
                      ? order.latestNotification.sent
                        ? `enviada (${order.latestNotification.channel})`
                        : `falló (${order.latestNotification.channel})`
                      : 'sin envíos todavía'}
                  </p>
                  {order.latestNotification?.reason && (
                    <p className="supplier-order-meta supplier-order-meta--warn">
                      Motivo: {order.latestNotification.reason}
                    </p>
                  )}
                  <p className="supplier-order-meta">
                    {order.relevantItems.length} ítem(s) tuyos · {order.units} unidad(es)
                  </p>
                  <div className="supplier-order-controls">
                    <label className="form-label" htmlFor={`order-status-${order.id}`}>Estado</label>
                    <select
                      id={`order-status-${order.id}`}
                      className="form-input"
                      value={order.status || 'pending'}
                      disabled={updatingOrderId === order.id}
                      onChange={(event) => handleOrderStatusChange(order.id, event.target.value)}
                    >
                      {ORDER_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Products */}
        <div className="dashboard-products-section">
          <div className="dashboard-section-header">
            <h2>Tus productos</h2>
            {myProducts.length > 0 && (
              <span className="dashboard-count">{myProducts.length}</span>
            )}
          </div>

          {myProducts.length === 0 ? (
            <div className="dashboard-empty">
              <p>Todavía no publicaste ningún producto.</p>
              <button className="cart-confirm-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => setPublishOpen(true)}>
                Publicar primer producto
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {myProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={(selectedProduct) => {
                    setPublishDraft(null)
                    setEditingProduct({
                      id: selectedProduct.id,
                      name: selectedProduct.name,
                      category: selectedProduct.category,
                      price: String(selectedProduct.price),
                      unit: selectedProduct.unit,
                      stock: String(selectedProduct.stock ?? 0),
                      description: selectedProduct.description || '',
                    })
                    setPublishOpen(true)
                  }}
                  onDelete={(id) => deleteProduct(id, token)}
                />
              ))}
            </div>
          )}
        </div>
        </main>
      </div>

      {publishOpen && (
        <PublishModal
          onClose={() => {
            setPublishOpen(false)
            setPublishDraft(null)
            setEditingProduct(null)
          }}
          initialFormData={editingProduct || publishDraft}
        />
      )}
    </>
  )
}
