import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useCart } from '../context/CartContext'
import { formatPrice, companyInitials } from '../utils/format'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import '../styles/ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { productList } = useProducts()
  const { addToCart, setCartOpen } = useCart()
  const [selectedImage, setSelectedImage] = useState(0)

  const product = useMemo(() => {
    return productList.find((p) => p.id === Number(id))
  }, [productList, id])

  const relatedProducts = useMemo(() => {
    if (!product) return []
    return productList
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4)
  }, [product, productList])

  const activeVariant = product?.variants?.[0] || null
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

  function handleAddToCart() {
    if (isOutOfStock) {
      navigate(`/proveedor/${encodeURIComponent(product.company)}`)
      return
    }

    const configuredProduct = {
      ...product,
      price: effectivePrice,
      stock: effectiveStock,
      cartLineId: activeVariant ? `${product.id}:${activeVariant.id}` : String(product.id),
      selectedVariant: activeVariant,
    }
    addToCart(configuredProduct)
    setCartOpen(true)
  }

  return (
    <section className="section product-detail-section" id="product-detail">
      <div className="product-detail-container">
        <button className="product-detail-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <div className="product-detail-grid">
          {/* Gallery */}
          <div className="product-detail-gallery product-card">
            <div className="product-detail-main-image product-img product-img--photo">
              <img
                src={images[selectedImage].url}
                alt={images[selectedImage].alt || product.name}
                className="product-detail-img"
              />
              <div className="product-detail-badges product-tags-row">
                <span className="product-category-tag">{product.category}</span>
                <span className={`product-buy-tag${!isOutOfStock ? ' product-buy-tag--direct' : ''}`}>
                  {product.productType === 'custom_quote'
                    ? 'A cotizar'
                    : product.productType === 'made_to_order'
                      ? 'Por encargo'
                      : !isOutOfStock ? 'Compra directa' : 'Consultar proveedor'}
                </span>
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
          <div className="product-detail-info product-card product-body">
            <Link to={`/proveedor/${encodeURIComponent(product.company)}`} className="company-badge">
              <span className="company-avatar" style={{ '--company-color': product.color }}>
                {companyInitials(product.company)}
              </span>
              <div>
                <span className="company-name">{product.company}</span>
                {product.rating && <span className="product-rating">★ {product.rating}</span>}
              </div>
            </Link>

            <h1 className="product-detail-name product-name">{product.name}</h1>
            <p className="product-detail-description product-desc">{product.description}</p>

            <div className="product-footer product-detail-footer">
              <div className="product-price">
                <span className="price-amount">{formatPrice(effectivePrice, product.currency)}</span>
                <span className="price-unit">/ {product.unit}</span>
              </div>
              <div className="product-actions">
                <button
                  className={`add-to-cart-btn product-detail-buy-button${isOutOfStock ? ' add-to-cart-btn--consult' : ''}`}
                  onClick={handleAddToCart}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <circle cx="9" cy="21" r="1.5" fill="currentColor"/>
                    <circle cx="20" cy="21" r="1.5" fill="currentColor"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isOutOfStock
                    ? 'Consultar stock'
                    : product.productType === 'custom_quote'
                    ? 'Configurar y cotizar'
                    : product.productType === 'made_to_order' ? 'Encargar ahora' : 'Comprar ahora'}
                </button>
              </div>
            </div>
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
    </section>
  )
}
