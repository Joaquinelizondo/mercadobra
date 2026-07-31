import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useProducts } from '../context/ProductContext'
import { createOrder, getMercadoPagoConfig, getProducts, startMercadoPagoCheckout } from '../lib/api'
import { formatPrice } from '../utils/format'
import { savePendingMercadoPagoOrder } from '../utils/paymentReturn'

const PAYMENT_METHODS = [
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    detail: 'Te enviamos CBU y alias por WhatsApp.',
    tag: '1-2 hs',
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
    detail: 'Tarjeta, cuotas o saldo con confirmación instantánea.',
    tag: 'Inmediato',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
]

const EMPTY_CHECKOUT_FORM = {
  buyerName: '',
  buyerEmail: '',
  buyerPhone: '',
  deliveryMethod: 'delivery',
  deliveryAddress: '',
  deliveryCity: '',
  buyerNotes: '',
}

// steps: 'cart' | 'payment' | 'done'
export default function Cart() {
  const { cartItems, cartCount, cartTotal, cartOpen, setCartOpen, changeQty, syncCartInventory, clearCart } = useCart()
  const { refreshProducts } = useProducts()
  const [step, setStep] = useState('cart')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT_FORM)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [createdOrder, setCreatedOrder] = useState(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [mercadoPagoEnabled, setMercadoPagoEnabled] = useState(true)

  const normalizedBuyerName = checkoutForm.buyerName.trim()
  const normalizedBuyerEmail = checkoutForm.buyerEmail.trim().toLowerCase()
  const normalizedBuyerPhone = checkoutForm.buyerPhone.trim()
  const buyerPhoneDigits = normalizedBuyerPhone.replace(/\D/g, '')
  const normalizedDeliveryAddress = checkoutForm.deliveryAddress.trim()
  const normalizedDeliveryCity = checkoutForm.deliveryCity.trim()
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedBuyerEmail)
  const hasValidDelivery = checkoutForm.deliveryMethod === 'pickup'
    || (normalizedDeliveryAddress.length >= 5 && normalizedDeliveryCity.length >= 2)
  const isCheckoutFormValid = normalizedBuyerName.length >= 3
    && hasValidEmail
    && buyerPhoneDigits.length >= 8
    && buyerPhoneDigits.length <= 15
    && hasValidDelivery
  const cartCurrency = String(cartItems[0]?.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU'

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
      setCheckoutForm(EMPTY_CHECKOUT_FORM)
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
    if (!isCheckoutFormValid) {
      setOrderError('Revisá tus datos de contacto y entrega antes de continuar.')
      return
    }

    setOrderLoading(true)
    setOrderError('')

    try {
      const latestProducts = await getProducts()
      const latestById = new Map(latestProducts.map((product) => [Number(product.id), product]))
      const unavailableItem = cartItems.find((item) => {
        const latest = latestById.get(Number(item.id))
        return !latest || latest.status !== 'published' || Number(latest.stock) < Number(item.quantity)
      })
      syncCartInventory(latestProducts)
      if (unavailableItem) {
        const latestStock = Math.max(0, Number(latestById.get(Number(unavailableItem.id))?.stock) || 0)
        throw new Error(
          latestStock === 0
            ? `“${unavailableItem.name}” se agotó antes de confirmar. Actualizamos tu carrito.`
            : `El stock de “${unavailableItem.name}” cambió: quedan ${latestStock}. Actualizamos tu carrito.`
        )
      }

      if (selectedPayment === 'mercadopago' && !mercadoPagoEnabled) {
        throw new Error('Mercado Pago no está disponible en este entorno. Usá Transferencia bancaria.')
      }

      if (selectedPayment === 'mercadopago') {
        const checkout = await startMercadoPagoCheckout({
          buyerName: checkoutForm.buyerName.trim(),
          buyerEmail: normalizedBuyerEmail,
          buyerPhone: checkoutForm.buyerPhone.trim(),
          deliveryMethod: checkoutForm.deliveryMethod,
          deliveryAddress: normalizedDeliveryAddress,
          deliveryCity: normalizedDeliveryCity,
          buyerNotes: checkoutForm.buyerNotes.trim(),
          paymentMethod: selectedPayment,
          items: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        })

        const targetUrl = checkout.sandbox
          ? checkout.sandboxInitPoint || checkout.initPoint
          : checkout.initPoint || checkout.sandboxInitPoint
        if (!targetUrl) {
          throw new Error('No se recibió un enlace de pago válido para Mercado Pago')
        }

        savePendingMercadoPagoOrder({
          orderId: checkout.orderId,
          trackingToken: checkout.trackingToken,
          buyerPhone: normalizedBuyerPhone,
        })
        window.location.assign(targetUrl)
        return
      }

      const order = await createOrder({
        buyerName: normalizedBuyerName,
        buyerEmail: normalizedBuyerEmail,
        buyerPhone: normalizedBuyerPhone,
        deliveryMethod: checkoutForm.deliveryMethod,
        deliveryAddress: normalizedDeliveryAddress,
        deliveryCity: normalizedDeliveryCity,
        buyerNotes: checkoutForm.buyerNotes.trim(),
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

  const stepLabel = step === 'payment' ? 'Pago y datos' : step === 'done' ? 'Pedido enviado' : 'Mi pedido'
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
                        {Number(item.stock) <= 3 && <p className="cart-item-stock">Quedan {Number(item.stock)}</p>}
                      </div>
                      <div className="cart-item-controls">
                        <button className="qty-btn" onClick={() => changeQty(item.id, -1)} aria-label="Quitar uno">−</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => changeQty(item.id, 1)} disabled={item.quantity >= Number(item.stock)} aria-label="Agregar uno">+</button>
                      </div>
                      <p className="cart-item-subtotal">{formatPrice(item.price * item.quantity, item.currency)}</p>
                    </li>
                  ))}
                </ul>
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Total estimado</span>
                    <strong>{formatPrice(cartTotal, cartCurrency)}</strong>
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
            <div className="cart-payment-header">
              <p>Completá tus datos, elegí la entrega y confirmá el pago.</p>
            </div>

            <div className="cart-checkout-form">
              <div className="form-row">
                <label className="form-label" htmlFor="cart-buyer-name">Nombre</label>
                <input
                  id="cart-buyer-name"
                  className="form-input"
                  value={checkoutForm.buyerName}
                  onChange={(event) => setCheckoutForm((prev) => ({ ...prev, buyerName: event.target.value }))}
                  placeholder="Ej: Juan Perez"
                  autoComplete="name"
                />
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="cart-buyer-email">Email</label>
                <input
                  id="cart-buyer-email"
                  className="form-input"
                  type="email"
                  value={checkoutForm.buyerEmail}
                  onChange={(event) => setCheckoutForm((prev) => ({ ...prev, buyerEmail: event.target.value }))}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="cart-buyer-phone">WhatsApp</label>
                <input
                  id="cart-buyer-phone"
                  className="form-input"
                  type="tel"
                  value={checkoutForm.buyerPhone}
                  onChange={(event) => setCheckoutForm((prev) => ({ ...prev, buyerPhone: event.target.value }))}
                  placeholder="Ej: +598 99 123 456"
                  autoComplete="tel"
                />
              </div>
              <fieldset className="checkout-delivery-options">
                <legend>¿Cómo querés recibirlo?</legend>
                <label className={checkoutForm.deliveryMethod === 'delivery' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="delivery-method"
                    value="delivery"
                    checked={checkoutForm.deliveryMethod === 'delivery'}
                    onChange={(event) => setCheckoutForm((prev) => ({ ...prev, deliveryMethod: event.target.value }))}
                  />
                  <span><strong>Entrega coordinada</strong><small>Costo y horario a confirmar con el proveedor</small></span>
                </label>
                <label className={checkoutForm.deliveryMethod === 'pickup' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="delivery-method"
                    value="pickup"
                    checked={checkoutForm.deliveryMethod === 'pickup'}
                    onChange={(event) => setCheckoutForm((prev) => ({ ...prev, deliveryMethod: event.target.value }))}
                  />
                  <span><strong>Retiro acordado</strong><small>Sin costo de envío</small></span>
                </label>
              </fieldset>
              {checkoutForm.deliveryMethod === 'delivery' && (
                <div className="checkout-address-grid">
                  <div className="form-row">
                    <label className="form-label" htmlFor="cart-delivery-address">Dirección</label>
                    <input
                      id="cart-delivery-address"
                      className="form-input"
                      value={checkoutForm.deliveryAddress}
                      onChange={(event) => setCheckoutForm((prev) => ({ ...prev, deliveryAddress: event.target.value }))}
                      placeholder="Calle, número y apartamento"
                      autoComplete="street-address"
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label" htmlFor="cart-delivery-city">Localidad</label>
                    <input
                      id="cart-delivery-city"
                      className="form-input"
                      value={checkoutForm.deliveryCity}
                      onChange={(event) => setCheckoutForm((prev) => ({ ...prev, deliveryCity: event.target.value }))}
                      placeholder="Ciudad / departamento"
                      autoComplete="address-level2"
                    />
                  </div>
                </div>
              )}
              <div className="form-row">
                <label className="form-label" htmlFor="cart-buyer-notes">Notas <span>(opcional)</span></label>
                <textarea
                  id="cart-buyer-notes"
                  className="form-input checkout-notes"
                  value={checkoutForm.buyerNotes}
                  onChange={(event) => setCheckoutForm((prev) => ({ ...prev, buyerNotes: event.target.value.slice(0, 500) }))}
                  placeholder="Indicaciones de acceso, horarios u otra información"
                  rows="2"
                />
              </div>
            </div>

            {!isCheckoutFormValid && (checkoutForm.buyerName || checkoutForm.buyerPhone) && (
              <p className="cart-order-error">Completá nombre, email, WhatsApp y los datos de entrega.</p>
            )}

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
                      <span className="payment-option-tag">{method.tag}</span>
                      {selectedPayment === method.id && (
                        <span className="payment-option-detail">{method.detail}</span>
                      )}
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
              <div className="checkout-summary">
                <div><span>Productos</span><strong>{formatPrice(cartTotal, cartCurrency)}</strong></div>
                <div>
                  <span>{checkoutForm.deliveryMethod === 'pickup' ? 'Retiro acordado' : 'Entrega coordinada'}</span>
                  <strong>{checkoutForm.deliveryMethod === 'pickup' ? 'Sin costo' : 'A confirmar'}</strong>
                </div>
                <div className="checkout-summary-total"><span>Total a pagar ahora</span><strong>{formatPrice(cartTotal, cartCurrency)}</strong></div>
              </div>
              {orderError && <p className="cart-order-error">{orderError}</p>}
              <button
                className="cart-confirm-btn"
                disabled={!selectedPayment || orderLoading || !isCheckoutFormValid}
                onClick={handleConfirm}
              >
                {orderLoading ? 'Enviando…' : 'Confirmar y enviar'}
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
