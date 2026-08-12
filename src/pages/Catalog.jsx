import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import PublishModal from '../components/PublishModal'
import EmptyState from '../components/EmptyState'
import { SkeletonGrid } from '../components/Skeleton'
import { getTrackedOrder } from '../lib/api'
import {
  clearPendingMercadoPagoOrder,
  readPendingMercadoPagoOrder,
} from '../utils/paymentReturn'

const PAGE_SIZE = 12

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parsePageParam(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export default function Catalog() {
  const { supplierUser, adminUser, adminToken } = useAuth()
  const { clearCart, setCartOpen } = useCart()
  const { productList, loadingProducts, deleteProduct } = useProducts()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [publishOpen, setPublishOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [paymentReturn, setPaymentReturn] = useState(null)

  useEffect(() => {
    if (location.hash !== '#catalog-results') return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])

  const searchQuery = searchParams.get('q')?.trim() ?? ''
  const paymentStatus = searchParams.get('payment')?.trim().toLowerCase() || ''
  const paymentOrderId = searchParams.get('orderId') || ''

  const normalizedSearch = normalizeText(searchQuery)

  const filteredProducts = useMemo(() => {
    let result = productList.filter((product) => product.status === 'published' || product.status === 'out_of_stock')

    if (normalizedSearch) {
      result = result.filter((product) => {
        const haystack = [product.name, product.category, product.description, product.company]
          .filter(Boolean)
          .map(normalizeText)
          .join(' ')
        return haystack.includes(normalizedSearch)
      })
    }

    return result
  }, [productList, normalizedSearch])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const currentPage = Math.min(parsePageParam(searchParams.get('page')), totalPages)

  const visibleProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredProducts.slice(start, start + PAGE_SIZE)
  }, [filteredProducts, currentPage])

  const updateSearchParams = useCallback((updates, { resetPage = false, replace = false } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)

      if (resetPage) next.delete('page')

      Object.entries(updates).forEach(([key, value]) => {
        const shouldRemove =
          value === null ||
          value === undefined ||
          value === '' ||
          (key === 'page' && Number(value) <= 1)

        if (shouldRemove) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      })

      return next
    }, { replace })
  }, [setSearchParams])

  useEffect(() => {
    if (!['success', 'pending', 'failure'].includes(paymentStatus)) return

    const pendingOrder = readPendingMercadoPagoOrder()
    const orderId = paymentOrderId || pendingOrder?.orderId || ''
    let cancelled = false

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaymentReturn({
      status: paymentStatus,
      orderId,
      trackingToken: pendingOrder?.trackingToken || '',
      buyerPhone: pendingOrder?.buyerPhone || '',
    })

    if (pendingOrder?.trackingToken && pendingOrder?.buyerPhone) {
      getTrackedOrder(pendingOrder.trackingToken, pendingOrder.buyerPhone)
        .then((order) => {
          if (cancelled) return

          const backendPaymentStatus = String(order?.paymentStatus || '').toLowerCase()
          const resolvedStatus = ['approved', 'authorized'].includes(backendPaymentStatus)
            ? 'success'
            : ['rejected', 'cancelled', 'refunded', 'charged_back', 'checkout_error'].includes(backendPaymentStatus)
              ? 'failure'
              : 'pending'

          setPaymentReturn({
            status: resolvedStatus,
            orderId: order?.id || orderId,
            trackingToken: pendingOrder.trackingToken,
            buyerPhone: pendingOrder.buyerPhone,
          })

          if (resolvedStatus === 'success') clearCart()
          if (resolvedStatus !== 'pending') clearPendingMercadoPagoOrder()
        })
        .catch(() => {
          // Si el webhook todavía no actualizó la orden, conservamos el estado de retorno.
        })
    }

    return () => {
      cancelled = true
    }
  }, [paymentStatus, paymentOrderId, clearCart])

  function closePaymentReturn() {
    setPaymentReturn(null)
    updateSearchParams({ payment: null, orderId: null }, { replace: true })
  }

  function retryPayment() {
    closePaymentReturn()
    setCartOpen(true)
  }

  function handlePublishClick() {
    if (!supplierUser && !adminUser) {
      navigate('/proveedor/login?redirect=/explorar')
    } else {
      setPublishOpen(true)
    }
  }

  function handleAdminEdit(product) {
    setEditingProduct(product)
    setPublishOpen(true)
  }

  async function handleAdminDelete(productId) {
    const product = productList.find((item) => item.id === productId)
    if (!window.confirm(`¿Eliminar "${product?.name || 'este producto'}" del catálogo?`)) return
    try {
      await deleteProduct(productId, adminToken)
    } catch (error) {
      window.alert(error.message || 'No se pudo eliminar el producto.')
    }
  }

  function closePublishModal() {
    setPublishOpen(false)
    setEditingProduct(null)
  }

  return (
    <>
      <section className="section catalog-section" id="explorar">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Colección Oxida</span>
            <h2>Diseños base para comprar o adaptar.</h2>
            <p className="catalog-meta">
              {filteredProducts.length} resultado{filteredProducts.length === 1 ? '' : 's'}
              {searchQuery ? ` para "${searchQuery}"` : ''}
            </p>
          </div>
          <button className="publish-btn" onClick={handlePublishClick}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Publicar producto
          </button>
        </div>

        <div id="catalog-results">
          {loadingProducts ? (
            <SkeletonGrid count={6} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay productos publicados'}
              message={searchQuery ? 'Probá con otros términos de búsqueda.' : 'Todavía no hay productos disponibles en el catálogo.'}
            />
          ) : (
            <>
              <div className="products-grid products-grid--reveal">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={adminUser ? handleAdminEdit : undefined}
                    onDelete={adminUser ? handleAdminDelete : undefined}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="catalog-pagination" aria-label="Paginación de resultados">
                  <button
                    type="button"
                    className="catalog-page-btn"
                    onClick={() => updateSearchParams({ page: currentPage - 1 })}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  <span className="catalog-page-indicator">Página {currentPage} de {totalPages}</span>
                  <button
                    type="button"
                    className="catalog-page-btn"
                    onClick={() => updateSearchParams({ page: currentPage + 1 })}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {publishOpen && (
        <PublishModal
          key={editingProduct?.id || 'new-product'}
          initialFormData={editingProduct}
          onClose={closePublishModal}
          onPublished={closePublishModal}
        />
      )}

      {paymentReturn && (
        <div className="payment-return-backdrop" role="presentation" onMouseDown={closePaymentReturn}>
          <section
            className={`payment-return-card payment-return-card--${paymentReturn.status}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-return-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="payment-return-icon" aria-hidden="true">
              {paymentReturn.status === 'success' ? '✓' : paymentReturn.status === 'pending' ? '…' : '!'}
            </span>
            <h2 id="payment-return-title">
              {paymentReturn.status === 'success'
                ? 'Pago aprobado'
                : paymentReturn.status === 'pending' ? 'Pago pendiente' : 'No se completó el pago'}
            </h2>
            <p>
              {paymentReturn.status === 'success'
                ? 'Tu compra quedó confirmada correctamente.'
                : paymentReturn.status === 'pending'
                  ? 'Mercado Pago todavía está procesando la operación. Te avisaremos cuando se confirme.'
                  : 'No se realizó ningún cobro. Podés volver al carrito e intentarlo nuevamente.'}
            </p>
            {paymentReturn.orderId && <strong className="payment-return-order">Orden #{paymentReturn.orderId}</strong>}
            <div className="payment-return-actions">
              {paymentReturn.trackingToken && paymentReturn.buyerPhone && (
                <Link
                  to={`/seguimiento/${paymentReturn.trackingToken}?phone=${encodeURIComponent(paymentReturn.buyerPhone)}`}
                  className="payment-return-primary"
                >
                  Ver seguimiento
                </Link>
              )}
              {paymentReturn.status === 'failure' && (
                <button type="button" className="payment-return-primary" onClick={retryPayment}>
                  Volver al carrito
                </button>
              )}
              <button type="button" className="payment-return-secondary" onClick={closePaymentReturn}>
                Seguir explorando
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
