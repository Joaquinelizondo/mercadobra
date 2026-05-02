import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useProducts } from '../context/ProductContext'
import { createOrder, getMercadoPagoConfig, startMercadoPagoCheckout } from '../lib/api'
import { formatPrice } from '../utils/format'

const PAYMENT_METHODS = [
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    detail: 'Acreditación en 1-2 horas hábiles. Te enviamos el CBU por email.',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'mercadopago',
    label: 'MercadoPago',
    detail: 'Pagá con Visa, Mastercard, cuotas o saldo. Acreditación inmediata.',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
]

// steps: 'cart' | 'payment' | 'done'
export default function Cart() {
  const { cartItems, cartCount, cartTotal, cartOpen, setCartOpen, changeQty, clearCart } = useCart()
  const { refreshProducts } = useProducts()
  const [step, setStep] = useState('cart')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [checkoutForm, setCheckoutForm] = useState({ buyerName: '', buyerPhone: '' })
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [createdOrder, setCreatedOrder] = useState(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [mercadoPagoEnabled, setMercadoPagoEnabled] = useState(true)

  useEffect(() => {
    let mounted = true

    getMercadoPagoConfig()
      .then((config) => {
        if (!mounted) return
        setMercadoPagoEnabled(Boolean(config?.enabled))
      })
      .catch(() => {
        if (!mounted) return
        setMercadoPagoEnabled(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  function handleClose() {
    setCartOpen(false)
    // reset after close animation
    setTimeout(() => {
      setStep('cart')
      setSelectedPayment(null)
      setCheckoutForm({ buyerName: '', buyerPhone: '' })
      setOrderLoading(false)
      setOrderError('')
      setCreatedOrder(null)
      setCopyMessage('')
    }, 300)
  }

  async function handleCopyTrackingLink() {
    if (!createdOrder?.trackingToken || !checkoutForm.buyerPhone) return

    const url = `${window.location.origin}/seguimiento/${createdOrder.trackingToken}?phone=${encodeURIComponent(checkoutForm.buyerPhone)}`

    try {
      await navigator.clipboard.writeText(url)
      setCopyMessage('Link copiado al portapapeles')
    } catch {
      setCopyMessage('No se pudo copiar automáticamente')
    }
  }

  async function handleConfirm() {
    if (!selectedPayment) return

    setOrderLoading(true)
    setOrderError('')

    try {
      if (selectedPayment === 'mercadopago' && !mercadoPagoEnabled) {
        throw new Error('Mercado Pago no está disponible en este entorno. Usá Transferencia bancaria.')
      }

      if (selectedPayment === 'mercadopago') {
        const checkout = await startMercadoPagoCheckout({
          buyerName: checkoutForm.buyerName.trim(),
          buyerPhone: checkoutForm.buyerPhone.trim(),
          paymentMethod: selectedPayment,
          items: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        })

        const targetUrl = checkout.initPoint || checkout.sandboxInitPoint
        if (!targetUrl) {
          throw new Error('No se recibió un enlace de pago válido para Mercado Pago')
        }

        window.location.assign(targetUrl)
        return
      }

      const order = await createOrder({
        buyerName: checkoutForm.buyerName.trim(),
        buyerPhone: checkoutForm.buyerPhone.trim(),
        paymentMethod: selectedPayment,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      })

      setCreatedOrder(order)
      clearCart()
      setStep('done')
      refreshProducts()
    } catch (error) {
      setOrderError(error.message || 'No se pudo enviar el pedido')
    } finally {
      setOrderLoading(false)
    }
  }

  const stepLabel = step === 'payment' ? 'Medio de pago' : step === 'done' ? 'Pedido enviado' : 'Mi pedido'
  const availablePaymentMethods = PAYMENT_METHODS.filter(
    (method) => method.id !== 'mercadopago' || mercadoPagoEnabled
  )

  return (
    <>
      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button
          className="cart-fab"
          onClick={() => setCartOpen(true)}
          aria-label={`Ver carrito (${cartCount} productos)`}
        >
          <svg viewBox="0 0 24 24" className="cart-fab-icon" aria-hidden="true">
            <path
              d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
          </svg>
          <span className="cart-fab-count">{cartCount}</span>
        </button>
      )}

      {/* Overlay */}
      {cartOpen && (
        <div className="cart-overlay" onClick={handleClose} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={`cart-sidebar${cartOpen ? ' cart-sidebar--open' : ''}`}
        aria-label="Carrito de compras"
      >
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step === 'payment' && (
              <button className="cart-back-btn" onClick={() => setStep('cart')} aria-label="Volver al carrito">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M19 12H5m7-7-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <h2>
              {stepLabel}
              {step === 'cart' && cartCount > 0 && <span className="cart-header-count"> ({cartCount})</span>}
            </h2>
          </div>
          <button className="cart-close" onClick={handleClose} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'done' && (
          <div className="cart-steps">
            <div className={`cart-step${step === 'cart' ? ' cart-step--active' : ' cart-step--done'}`}>
              <span>1</span> Productos
            </div>
            <div className="cart-step-line" />
            <div className={`cart-step${step === 'payment' ? ' cart-step--active' : step === 'done' ? ' cart-step--done' : ''}`}>
              <span>2</span> Pago
            </div>
            <div className="cart-step-line" />
            <div className={`cart-step${step === 'done' ? ' cart-step--active' : ''}`}>
              <span>3</span> Listo
            </div>
          </div>
        )}

        {/* ── STEP: CART ── */}
        {step === 'cart' && (
          <>
            {cartItems.length === 0 ? (
              <div className="cart-empty">
                <p>Tu carrito está vacío.</p>
                <p>Explorá el catálogo y agregá productos.</p>
              </div>
            ) : (
              <>
                <ul className="cart-list">
                  {cartItems.map((item) => (
                    <li key={item.id} className="cart-item">
                      <div className="cart-item-dot" style={{ '--product-color': item.color }} />
                      <div className="cart-item-info">
                        <p className="cart-item-name">{item.name}</p>
                        <p className="cart-item-company">{item.company}</p>
                      </div>
                      <div className="cart-item-controls">
                        <button className="qty-btn" onClick={() => changeQty(item.id, -1)} aria-label="Quitar uno">−</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => changeQty(item.id, 1)} aria-label="Agregar uno">+</button>
                      </div>
                      <p className="cart-item-subtotal">{formatPrice(item.price * item.quantity)}</p>
                    </li>
                  ))}
                </ul>
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Total estimado</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>
                  <button className="cart-confirm-btn" onClick={() => setStep('payment')}>
                    Elegir medio de pago →
                  </button>
                  <button className="cart-clear-btn" onClick={() => { clearCart(); handleClose() }}>
                    Vaciar carrito
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── STEP: PAYMENT ── */}
        {step === 'payment' && (
          <>
            <div className="cart-checkout-form">
              <div className="form-row">
                <label className="form-label" htmlFor="cart-buyer-name">Nombre o empresa</label>
                <input
                  id="cart-buyer-name"
                  className="form-input"
                  value={checkoutForm.buyerName}
                  onChange={(event) => setCheckoutForm((prev) => ({ ...prev, buyerName: event.target.value }))}
                  placeholder="Ej: Constructora Norte"
                />
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="cart-buyer-phone">Teléfono de contacto</label>
                <input
                  id="cart-buyer-phone"
                  className="form-input"
                  value={checkoutForm.buyerPhone}
                  onChange={(event) => setCheckoutForm((prev) => ({ ...prev, buyerPhone: event.target.value }))}
                  placeholder="Ej: +54 9 11 1234 5678"
                />
              </div>
            </div>

            {!mercadoPagoEnabled && (
              <p className="cart-order-error">
                Mercado Pago no está disponible por el momento. Podés continuar con Transferencia bancaria.
              </p>
            )}

            <ul className="payment-list">
              {availablePaymentMethods.map((method) => (
                <li key={method.id}>
                  <button
                    className={`payment-option${selectedPayment === method.id ? ' payment-option--selected' : ''}`}
                    onClick={() => setSelectedPayment(method.id)}
                    aria-pressed={selectedPayment === method.id}
                  >
                    <span className="payment-option-icon">{method.icon}</span>
                    <span className="payment-option-info">
                      <span className="payment-option-label">{method.label}</span>
                      <span className="payment-option-detail">{method.detail}</span>
                    </span>
                    <span className="payment-option-check" aria-hidden="true">
                      {selectedPayment === method.id && (
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              {orderError && <p className="cart-order-error">{orderError}</p>}
              <button
                className="cart-confirm-btn"
                disabled={!selectedPayment || orderLoading}
                onClick={handleConfirm}
              >
                {orderLoading ? 'Enviando pedido…' : 'Confirmar pedido'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: DONE ── */}
        {step === 'done' && (
          <div className="cart-done">
            <div className="cart-done-icon" aria-hidden="true">✓</div>
            <h3>¡Pedido recibido!</h3>
            <p>
              Elegiste pagar con{' '}
              <strong>{PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.label}</strong>.
            </p>
            {createdOrder?.id && <p>Número de orden: <strong>#{createdOrder.id}</strong></p>}
            {createdOrder?.trackingToken && checkoutForm.buyerPhone && (
              <div className="cart-tracking-actions">
                <Link
                  to={`/seguimiento/${createdOrder.trackingToken}?phone=${encodeURIComponent(checkoutForm.buyerPhone)}`}
                  className="cart-tracking-link"
                >
                  Ver seguimiento de pedido
                </Link>
                <button type="button" className="cart-copy-link-btn" onClick={handleCopyTrackingLink}>
                  Copiar link
                </button>
              </div>
            )}
            {copyMessage && <p className="cart-copy-message">{copyMessage}</p>}
            <p>Te contactaremos pronto para coordinar la entrega y el pago.</p>
            <button className="cart-confirm-btn" onClick={handleClose}>
              Cerrar
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

