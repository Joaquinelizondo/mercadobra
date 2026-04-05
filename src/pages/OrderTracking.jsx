import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { getTrackedOrder } from '../lib/api'
import { formatPrice } from '../utils/format'

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  preparing: 'Preparando',
  shipped: 'Despachada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

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

export default function OrderTracking() {
  const { trackingToken = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const statusLabel = useMemo(
    () => STATUS_LABELS[order?.status] || order?.status || 'Pendiente',
    [order?.status]
  )

  useEffect(() => {
    const prefilled = searchParams.get('phone') || ''
    if (prefilled) {
      loadOrder(prefilled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingToken])

  async function loadOrder(forPhone = phone) {
    const normalizedPhone = String(forPhone || '').trim()
    if (!trackingToken || !normalizedPhone) {
      setError('Ingresá el teléfono de la compra para ver el estado')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await getTrackedOrder(trackingToken, normalizedPhone)
      setOrder(response)
      setSearchParams({ phone: normalizedPhone })
    } catch (requestError) {
      setOrder(null)
      setError(requestError.message || 'No se pudo consultar la orden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="tracking-page">
      <div className="tracking-card">
        <h1>Seguimiento de pedido</h1>
        <p className="tracking-subtitle">Token: {trackingToken}</p>

        <div className="tracking-form">
          <label className="form-label" htmlFor="tracking-phone">Teléfono usado en la compra</label>
          <input
            id="tracking-phone"
            className="form-input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Ej: +54 9 11 1234 5678"
          />
          <button className="cart-confirm-btn" onClick={() => loadOrder()} disabled={loading}>
            {loading ? 'Consultando…' : 'Ver estado'}
          </button>
        </div>

        {error && <p className="tracking-error">{error}</p>}

        {order && (
          <div className="tracking-result">
            <p><strong>Orden #{order.id}</strong></p>
            <p>Estado: <Badge variant={STATUS_VARIANTS[order.status] || 'default'}>{statusLabel}</Badge></p>
            <p>Pago: <strong>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || 'No informado'}</strong></p>
            <p>Fecha: {new Date(order.createdAt).toLocaleString('es-AR')}</p>

            <ul className="tracking-items">
              {(order.items || []).map((item, index) => (
                <li key={`${item.productId}-${index}`}>
                  <span>{item.name || `Producto #${item.productId}`}</span>
                  <span>
                    x{item.quantity}
                    {typeof item.price === 'number' ? ` · ${formatPrice(item.price * item.quantity)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link to="/" className="ghost-link tracking-back-link">Volver al inicio</Link>
      </div>
    </section>
  )
}
