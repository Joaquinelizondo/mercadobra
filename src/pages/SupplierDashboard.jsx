import { useEffect, useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { formatPrice, companyInitials } from '../utils/format'
import PublishModal from '../components/PublishModal'
import ProductCard from '../components/ProductCard'
import SupplierAssistant from '../components/SupplierAssistant'
import { Badge } from '../components/Badge'
import { getOrders, updateOrderStatus } from '../lib/api'

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
  efectivo: 'Efectivo',
  cheque: 'Cheque diferido',
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
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)

  if (!supplierUser) return <Navigate to="/proveedor/login" replace />

  const myProducts = productList.filter((p) => p.company === supplierUser.company)
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

  useEffect(() => {
    let active = true

    async function loadOrders() {
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

    loadOrders()
    return () => {
      active = false
    }
  }, [token, myProducts.length])

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

  return (
    <>
      <div className="dashboard-page">
        {/* Welcome hero */}
        <div className="dashboard-welcome">
          <div className="dashboard-welcome-left">
            <div className="dashboard-avatar">
              {companyInitials(supplierUser.company)}
            </div>
            <div>
              <p className="dashboard-eyebrow">Panel de proveedor</p>
              <h1 className="dashboard-company">{supplierUser.company}</h1>
              <p className="dashboard-email">{supplierUser.email}</p>
            </div>
          </div>
          <div className="dashboard-welcome-actions">
            <button className="publish-btn" onClick={() => setPublishOpen(true)}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Nuevo producto
            </button>
            <button className="dashboard-logout-btn" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
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
                  onDelete={(id) => deleteProduct(id, token)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {publishOpen && (
        <PublishModal
          onClose={() => {
            setPublishOpen(false)
            setPublishDraft(null)
          }}
          initialFormData={publishDraft}
        />
      )}
    </>
  )
}
