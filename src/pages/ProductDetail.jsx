import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatPrice, companyInitials } from '../utils/format'
import ProductCard from '../components/ProductCard'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import ProductCustomizer from '../components/ProductCustomizer'
import '../styles/ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { productList } = useProducts()
  const { supplierUser } = useAuth()
  const { addToCart, setCartOpen } = useCart()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [configuration, setConfiguration] = useState({
    size: 'Estándar',
    color: 'Negro mate',
    finish: 'Pintura al horno',
  })
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState('')

  const product = useMemo(() => {
    return productList.find((p) => p.id === Number(id))
  }, [productList, id])

  const relatedProducts = useMemo(() => {
    if (!product) return []
    return productList
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4)
  }, [product, productList])

  const activeVariant = product?.variants?.find((variant) => variant.id === selectedVariantId)
    || product?.variants?.[0]
    || null
  const effectiveStock = activeVariant ? Number(activeVariant.stock || 0) : Number(product?.stock ?? 0)
  const effectivePrice = activeVariant ? Number(activeVariant.price || product?.price || 0) : Number(product?.price || 0)
  const isOutOfStock = effectiveStock <= 0 || product?.status === 'out_of_stock'

  if (!product) {
    return (
      <section className="section product-detail-section">
        <div className="product-detail-container">
          <EmptyState
            icon="🚫"
            title="Producto no encontrado"
            message="Lo sentimos, el producto que buscas no está disponible o fue eliminado."
            action={
              <button onClick={() => navigate('/explorar')} className="btn-primary">
                Volver al catálogo
              </button>
            }
          />
        </div>
      </section>
    )
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [
        { url: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='${encodeURIComponent(product.color || '#f59e0b')}' width='400' height='300'/%3E%3Ctext x='50%' y='50%' font-size='20' fill='white' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(product.name)}'%3C/text%3E%3C/svg%3E`, alt: product.name }
      ]

  const specs = product.specs || [
    { label: 'Categoría', value: product.category },
    { label: 'Unidad', value: product.unit },
    { label: 'Proveedor', value: product.company },
  ]

  const delivery = product.deliveryDays || 3

  function handleAddToCart() {
    const configuredProduct = {
      ...product,
      price: effectivePrice,
      stock: effectiveStock,
      cartLineId: activeVariant ? `${product.id}:${activeVariant.id}` : String(product.id),
      selectedVariant: activeVariant,
    }
    for (let i = 0; i < quantity; i++) {
      addToCart(configuredProduct)
    }
    setCartOpen(true)
    setQuantity(1)
  }

  function handleInquiry() {
    if (!supplierUser) {
      navigate('/proveedor/login?redirect=/explorar')
      return
    }

    setInquiryOpen(false)
    setInquiryMessage('')
    // TODO: Send inquiry to backend
    alert(`Consulta enviada sobre: ${product.name}`)
  }

  function incrementQuantity() {
    setQuantity(prev => prev + 1)
  }

  function decrementQuantity() {
    setQuantity(prev => Math.max(1, prev - 1))
  }

  return (
    <section className="section product-detail-section" id="product-detail">
      <div className="product-detail-container">
        <Breadcrumb items={[
          { href: '/explorar', label: 'Catálogo' },
          { href: null, label: product.category },
          { href: null, label: product.name }
        ]} />
        <button className="product-detail-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <div className="product-detail-grid">
          {/* Gallery */}
          <div className="product-detail-gallery">
            <div className="product-detail-main-image">
              <img
                src={images[selectedImage].url}
                alt={images[selectedImage].alt || product.name}
                className="product-detail-img"
              />
              <div className="product-detail-badges">
                <span className="product-category-tag">{product.category}</span>
                {isOutOfStock && <span className="product-badge-stock">Sin stock</span>}
                {!isOutOfStock && <span className="product-badge-available">En stock</span>}
              </div>
            </div>

            {images.length > 1 && (
              <div className="product-detail-thumbnails">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`product-detail-thumbnail${selectedImage === idx ? ' product-detail-thumbnail--active' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                    aria-label={`Imagen ${idx + 1}`}
                  >
                    <img src={img.url} alt={img.alt || `Imagen ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="product-detail-info">
            <div className="company-badge">
              <span className="company-avatar" style={{ '--company-color': product.color }}>
                {companyInitials(product.company)}
              </span>
              <div>
                <span className="company-name">{product.company}</span>
                {product.rating && <span className="product-rating">★ {product.rating}</span>}
              </div>
            </div>

            <h1 className="product-detail-name">{product.name}</h1>
            <p className="product-detail-description">{product.description}</p>

            <div className="product-detail-price-section">
              <div className="product-detail-price">
                <span className="price-amount">{formatPrice(effectivePrice, product.currency)}</span>
                <span className="price-unit">/ {product.unit}</span>
              </div>
            </div>

            <div className="product-configuration">
              <div className="product-configuration-heading">
                <h3>Configurá tu pieza</h3>
                <span>El precio final puede variar según las opciones.</span>
              </div>
              <div className="product-option-grid">
                {product.variants?.length > 0 && (
                  <label>
                    <span>Variante</span>
                    <select
                      value={activeVariant?.id || ''}
                      onChange={(event) => {
                        const variant = product.variants.find((item) => item.id === event.target.value)
                        setSelectedVariantId(event.target.value)
                        if (variant?.attributes) {
                          setConfiguration((previous) => ({
                            ...previous,
                            size: variant.attributes.medida || previous.size,
                            color: variant.attributes.color || previous.color,
                            finish: variant.attributes.terminacion || previous.finish,
                          }))
                        }
                      }}
                    >
                      {product.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} · {formatPrice(variant.price, product.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  <span>Medida</span>
                  <select value={configuration.size} onChange={(event) => setConfiguration((previous) => ({ ...previous, size: event.target.value }))}>
                    <option>Estándar</option>
                    <option>Compacta</option>
                    <option>Grande</option>
                    <option>A medida</option>
                  </select>
                </label>
                <label>
                  <span>Color</span>
                  <select value={configuration.color} onChange={(event) => setConfiguration((previous) => ({ ...previous, color: event.target.value }))}>
                    <option>Negro mate</option>
                    <option>Blanco cálido</option>
                    <option>Óxido natural</option>
                    <option>Personalizado</option>
                  </select>
                </label>
                <label>
                  <span>Terminación</span>
                  <select value={configuration.finish} onChange={(event) => setConfiguration((previous) => ({ ...previous, finish: event.target.value }))}>
                    <option>Pintura al horno</option>
                    <option>Metal natural protegido</option>
                    <option>Texturada</option>
                    <option>A definir</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Specs */}
            <div className="product-detail-specs">
              <h3 className="specs-title">Especificaciones</h3>
              <div className="specs-grid">
                {specs.map((spec, idx) => (
                  <div key={idx} className="spec-item">
                    <span className="spec-label">{spec.label}</span>
                    <span className="spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div className="product-detail-delivery">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
              </svg>
              <span>
                {product.productType === 'ready' ? 'Entrega' : 'Fabricación'} estimada en {product.leadTimeDays || delivery} día{Number(product.leadTimeDays || delivery) !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="product-detail-quantity">
                <label htmlFor="product-quantity" className="quantity-label">Cantidad</label>
                <div className="quantity-control">
                  <button 
                    className="quantity-btn"
                    onClick={decrementQuantity}
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>
                  <input 
                    id="product-quantity"
                    type="number" 
                    min="1" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="quantity-input"
                  />
                  <button 
                    className="quantity-btn"
                    onClick={incrementQuantity}
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="product-detail-actions">
              {!isOutOfStock && (
                <button
                  className="btn-primary"
                  onClick={handleAddToCart}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <circle cx="9" cy="21" r="1.5" fill="currentColor"/>
                    <circle cx="20" cy="21" r="1.5" fill="currentColor"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Agregar al carrito
                </button>
              )}
              <button
                className="btn-secondary product-customize-button"
                onClick={() => setCustomizerOpen(true)}
              >
                Personalizar este producto
              </button>
              <button className="product-simple-inquiry" onClick={() => setInquiryOpen(!inquiryOpen)}>
                {isOutOfStock ? 'Consultar disponibilidad' : 'Tengo una consulta'}
              </button>
            </div>

            {/* Inquiry Form */}
            {inquiryOpen && (
              <div className="product-detail-inquiry">
                <label htmlFor="inquiry-message" className="inquiry-label">
                  Mensaje (opcional)
                </label>
                <textarea
                  id="inquiry-message"
                  className="inquiry-textarea"
                  placeholder="Cuéntanos qué necesitas..."
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  rows="4"
                />
                <div className="inquiry-actions">
                  <button className="btn-secondary" onClick={() => setInquiryOpen(false)}>
                    Cancelar
                  </button>
                  <button className="btn-primary" onClick={handleInquiry}>
                    Enviar consulta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="product-detail-related">
            <h2 className="related-title">Productos relacionados</h2>
            <div className="products-grid">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
      {customizerOpen && (
        <ProductCustomizer
          product={product}
          configuration={configuration}
          onClose={() => setCustomizerOpen(false)}
        />
      )}
    </section>
  )
}
