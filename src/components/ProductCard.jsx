import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice, companyInitials } from '../utils/format'

export default function ProductCard({ product, onDelete }) {
  const navigate = useNavigate()
  const { addToCart, setCartOpen } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const inWishlist = isInWishlist(product.id)

  function handleCardClick() {
    navigate(`/producto/${product.id}`)
  }

  return (
    <article className="product-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="product-img" style={{ '--product-color': product.color }} aria-hidden="true">
        <div className="product-tags-row">
          <span className="product-category-tag">{product.category}</span>
          <span className={`product-buy-tag${Number(product.stock) > 0 ? ' product-buy-tag--direct' : ''}`}>
            {Number(product.stock) > 0 ? 'Compra directa' : 'Consultar proveedor'}
          </span>
        </div>
        <button
          className={`product-wishlist-btn${inWishlist ? ' product-wishlist-btn--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            toggleWishlist(product.id)
          }}
          aria-label={inWishlist ? 'Sacar de favoritos' : 'Agregar a favoritos'}
          title={inWishlist ? 'Sacar de favoritos' : 'Agregar a favoritos'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={inWishlist ? 'currentColor' : 'none'}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="product-body">
        <a href={`/proveedor/${encodeURIComponent(product.company)}`} className="company-badge" onClick={(e) => e.stopPropagation()}>
          <span className="company-avatar" style={{ '--company-color': product.color }}>
            {companyInitials(product.company)}
          </span>
          <span className="company-name">{product.company}</span>
        </a>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-footer">
          <div className="product-price">
            <span className="price-amount">{formatPrice(product.price)}</span>
            <span className="price-unit">/ {product.unit}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onDelete && (
              <button
                className="product-delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(product.id)
                }}
                aria-label={`Eliminar ${product.name}`}
                title="Eliminar producto"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            )}
            <button
              className={`add-to-cart-btn${Number(product.stock) > 0 ? '' : ' add-to-cart-btn--consult'}`}
              onClick={(e) => {
                e.stopPropagation()
                if (Number(product.stock) > 0) {
                  addToCart(product)
                  setCartOpen(true)
                  return
                }

                navigate(`/proveedor/${encodeURIComponent(product.company)}`)
              }}
              aria-label={
                Number(product.stock) > 0
                  ? `Comprar ${product.name} ahora`
                  : `Consultar a ${product.company} por ${product.name}`
              }
            >
              {Number(product.stock) > 0 ? 'Comprar ahora' : 'Consultar stock'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
