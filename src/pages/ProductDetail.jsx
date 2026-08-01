import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useCart } from '../context/CartContext'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import ProductCard from '../components/ProductCard'
import ProductCustomizer from '../components/ProductCustomizer'
import { companyInitials, formatPrice } from '../utils/format'
import { createWhatsAppLink } from '../utils/whatsapp'
import '../styles/ProductDetail.css'

const PRODUCT_TYPE_LABELS = {
  ready: 'Disponible para comprar',
  made_to_order: 'Fabricación por encargo',
  custom_quote: 'Proyecto a medida',
}

function dimensionEntries(dimensions = {}) {
  return Object.entries(dimensions).filter(([, value]) => value !== '' && value != null)
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { productList, loadingProducts } = useProducts()
  const { addToCart, setCartOpen } = useCart()
  const [activeImage, setActiveImage] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  const product = useMemo(
    () => productList.find((item) => item.id === Number(id)),
    [productList, id]
  )

  const relatedProducts = useMemo(() => {
    if (!product) return []
    return productList
      .filter((item) => item.id !== product.id && item.status === 'published' && item.category === product.category)
      .slice(0, 3)
  }, [product, productList])

  const variants = product?.variants || []
  const selectedVariant = variants.find((variant) => String(variant.id) === selectedVariantId) || variants[0] || null
  const displayPrice = Number(selectedVariant?.price ?? product?.price ?? 0)
  const displayStock = Number(selectedVariant?.stock ?? product?.stock ?? 0)
  const images = product?.images?.length ? product.images : []
  const visibleImageIndex = Math.min(activeImage, Math.max(0, images.length - 1))
  const dimensions = dimensionEntries(product?.dimensions)
  const isCustomQuote = product?.productType === 'custom_quote'
  const canBuy = !isCustomQuote && displayStock > 0

  useEffect(() => {
    if (!product) return
    document.title = `${product.name} | MercadoBra`
    return () => { document.title = 'MercadoBra' }
  }, [product])

  function handlePrimaryAction() {
    if (isCustomQuote || product.configurable) {
      setCustomizerOpen(true)
      return
    }

    if (!canBuy) return
    const cartProduct = selectedVariant
      ? {
          ...product,
          price: displayPrice,
          stock: displayStock,
          selectedVariant,
          name: `${product.name} · ${selectedVariant.name}`,
        }
      : product
    const added = addToCart(cartProduct)
    setFeedback(added ? 'Producto agregado al carrito.' : 'Ya agregaste todo el stock disponible.')
    if (added) setCartOpen(true)
    window.setTimeout(() => setFeedback(''), 2200)
  }

  if (loadingProducts && !product) {
    return <section className="product-detail-page"><p className="product-detail-loading">Cargando producto…</p></section>
  }

  if (!product) {
    return (
      <section className="product-detail-page">
        <div className="product-detail-container">
          <EmptyState
            icon="🚫"
            title="Producto no encontrado"
            message="El producto que buscás no está disponible o fue retirado."
            action={<button onClick={() => navigate('/explorar')} className="btn-primary">Volver al catálogo</button>}
          />
        </div>
      </section>
    )
  }

  const whatsappLink = createWhatsAppLink({
    intent: displayStock > 0 ? 'consulta' : 'stock',
    source: 'ficha-producto',
    data: {
      route: `/producto/${product.id}`,
      message: `Quiero consultar por ${product.name}${selectedVariant ? `, variante ${selectedVariant.name}` : ''}.`,
    },
  })

  return (
    <div className="product-detail-page">
      <Breadcrumb items={[
        { label: 'Productos', href: '/explorar' },
        { label: product.category, href: `/explorar?category=${encodeURIComponent(product.category)}` },
        { label: product.name },
      ]} />

      <main className="product-detail-shell">
        <section className="product-gallery" aria-label={`Imágenes de ${product.name}`}>
          <div className={`product-gallery-main${images.length ? '' : ' is-placeholder'}`} style={{ '--product-color': product.color }}>
            {images.length ? (
              <img src={images[visibleImageIndex]?.url} alt={images[visibleImageIndex]?.alt || product.name} />
            ) : (
              <span>{companyInitials(product.company)}</span>
            )}
            <span className="product-gallery-count">{images.length ? `${visibleImageIndex + 1} / ${images.length}` : 'Imagen próximamente'}</span>
          </div>
          {images.length > 1 && (
            <div className="product-gallery-thumbs">
              {images.map((image, index) => (
                <button key={`${image.url}-${index}`} type="button" className={index === visibleImageIndex ? 'is-active' : ''} onClick={() => setActiveImage(index)} aria-label={`Ver imagen ${index + 1}`}>
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="product-buy-panel">
          <div className="product-detail-flags">
            <span>{product.category}</span>
            <span className={displayStock > 0 ? 'is-available' : 'is-unavailable'}>{displayStock > 0 ? 'Disponible' : 'Consultar stock'}</span>
          </div>
          <p className="product-detail-company">{product.company}</p>
          <h1>{product.name}</h1>
          <p className="product-detail-description">{product.description}</p>

          <div className="product-detail-price">
            <strong>{formatPrice(displayPrice, product.currency)}</strong>
            <span>por {product.unit}</span>
          </div>

          {variants.length > 0 && (
            <fieldset className="product-variant-picker">
              <legend>Elegí una variante</legend>
              <div>
                {variants.map((variant) => (
                  <label key={variant.id} className={String(variant.id) === String(selectedVariant?.id) ? 'is-selected' : ''}>
                    <input type="radio" name="product-variant" value={variant.id} checked={String(variant.id) === String(selectedVariant?.id)} onChange={(event) => setSelectedVariantId(event.target.value)} />
                    <span><b>{variant.name}</b><small>{Number(variant.stock) > 0 ? `${variant.stock} disponibles` : 'Sin stock'}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="product-purchase-actions">
            <button type="button" onClick={handlePrimaryAction} disabled={!canBuy && !isCustomQuote && !product.configurable}>
              {isCustomQuote || product.configurable ? 'Configurar y cotizar' : canBuy ? 'Agregar al carrito' : 'Sin stock'}
            </button>
            <a href={whatsappLink} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>
          </div>
          {feedback && <p className="product-detail-feedback" role="status">{feedback}</p>}

          <div className="product-purchase-assurances">
            <div><span>01</span><p><b>{PRODUCT_TYPE_LABELS[product.productType] || 'Producto disponible'}</b><small>Modalidad informada antes de confirmar.</small></p></div>
            <div><span>02</span><p><b>{product.leadTimeDays > 0 ? `${product.leadTimeDays} días estimados` : 'Entrega a coordinar'}</b><small>Confirmamos fecha y disponibilidad contigo.</small></p></div>
            <div><span>03</span><p><b>Atención directa</b><small>Acompañamiento de MercadoBra y el proveedor.</small></p></div>
          </div>
        </section>
      </main>

      <section className="product-specification-section">
        <div className="product-specification-heading">
          <span>Detalles del producto</span>
          <h2>Todo lo importante,<br />antes de decidir.</h2>
        </div>
        <div className="product-specification-grid">
          <article><small>SKU</small><strong>{selectedVariant?.sku || product.sku || 'A definir'}</strong></article>
          <article><small>Disponibilidad</small><strong>{displayStock > 0 ? `${displayStock} ${displayStock === 1 ? 'unidad' : 'unidades'}` : 'A consultar'}</strong></article>
          <article><small>Plazo estimado</small><strong>{product.leadTimeDays > 0 ? `${product.leadTimeDays} días` : 'A coordinar'}</strong></article>
          <article><small>Tipo</small><strong>{PRODUCT_TYPE_LABELS[product.productType] || 'Producto'}</strong></article>
          {product.weightKg && <article><small>Peso</small><strong>{product.weightKg} kg</strong></article>}
          {dimensions.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}
        </div>
        <div className="product-detail-note">
          <p>¿Necesitás otra medida, color o terminación?</p>
          <button type="button" onClick={() => setCustomizerOpen(true)}>Solicitar una versión a medida →</button>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="product-related-section">
          <div className="product-related-heading"><div><span>También te puede interesar</span><h2>Más piezas de esta colección.</h2></div><Link to="/explorar">Ver todo ↗</Link></div>
          <div className="products-grid">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </section>
      )}

      {customizerOpen && (
        <ProductCustomizer
          product={product}
          configuration={{
            size: selectedVariant?.attributes?.medida || '',
            color: selectedVariant?.attributes?.color || '',
            finish: selectedVariant?.attributes?.terminacion || '',
          }}
          onClose={() => setCustomizerOpen(false)}
        />
      )}
    </div>
  )
}
