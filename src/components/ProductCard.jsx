import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice, companyInitials } from '../utils/format'

const ADD_FEEDBACK = ['Listo, al carrito', 'Sumado', 'Buenisimo, agregado']

export default function ProductCard({
  product,
  onDelete,
  onEdit,
  onToggleCompare,
  isCompared = false,
  compareDisabled = false,
}) {
  const navigate = useNavigate()
  const { addToCart, setCartOpen } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const inWishlist = isInWishlist(product.id)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [addFeedback, setAddFeedback] = useState('')
  const coverImage = product.images?.[0]?.url || product.image || ''

  function handleCardClick() {
    navigate(`/producto/${product.id}`)
  }

  function handleCardKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  function handleAddToCart(event) {
    event.stopPropagation()
    if (isAddingToCart) return

    if (Number(product.stock) > 0) {
      setIsAddingToCart(true)
      const feedbackIndex = Math.floor(Math.random() * ADD_FEEDBACK.length)
      setAddFeedback(ADD_FEEDBACK[feedbackIndex])
      addToCart(product)
      setCartOpen(true)
      window.setTimeout(() => {
        setIsAddingToCart(false)
        setAddFeedback('')
      }, 900)
      return
    }

    navigate(`/proveedor/${encodeURIComponent(product.company)}`)
  }

  return (
    <article
      className="product-card"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      aria-label={`Ver detalle de ${product.name}`}
    >
      <div className={`product-img${coverImage ? ' product-img--photo' : ''}`} style={{ '--product-color': product.color }}>
        {coverImage && <img src={coverImage} alt={product.images?.[0]?.alt || product.name} />}
        {onToggleCompare && (
          <button
            type="button"
            className={`product-compare-toggle${isCompared ? ' product-compare-toggle--active' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onToggleCompare(product.id)
            }}
            disabled={!isCompared && compareDisabled}
            aria-label={isCompared ? 'Quitar de comparacion' : 'Agregar a comparacion'}
            title={isCompared ? 'Quitar de comparacion' : 'Comparar'}
          >
            {isCompared ? 'Comparando' : 'Comparar'}
          </button>
        )}
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
        <Link
          to={`/proveedor/${encodeURIComponent(product.company)}`}
          className="company-badge"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="company-avatar" style={{ '--company-color': product.color }}>
            {companyInitials(product.company)}
          </span>
          <span className="company-name">{product.company}</span>
        </Link>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-footer">
          <div className="product-price">
            <span className="price-amount">{formatPrice(product.price, product.currency)}</span>
            <span className="price-unit">/ {product.unit}</span>
          </div>
          <div className="product-actions">
            {onEdit && (
              <button
                className="product-delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(product)
                }}
                aria-label={`Editar ${product.name}`}
                title="Editar producto"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            )}
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
              className={`add-to-cart-btn${Number(product.stock) > 0 ? '' : ' add-to-cart-btn--consult'}${isAddingToCart && Number(product.stock) > 0 ? ' add-to-cart-btn--success' : ''}`}
              onClick={handleAddToCart}
              disabled={isAddingToCart && Number(product.stock) > 0}
              aria-label={
                Number(product.stock) > 0
                  ? `Comprar ${product.name} ahora`
                  : `Consultar a ${product.company} por ${product.name}`
              }
            >
              {Number(product.stock) > 0 ? (isAddingToCart ? 'Agregado' : 'Comprar ahora') : 'Consultar stock'}
            </button>
          </div>
        </div>
        {addFeedback && <p className="product-action-feedback">{addFeedback}</p>}
      </div>
    </article>
  )
}
