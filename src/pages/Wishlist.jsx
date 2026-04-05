import { useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useWishlist } from '../context/WishlistContext'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import '../styles/Wishlist.css'

export default function Wishlist() {
  const navigate = useNavigate()
  const { productList } = useProducts()
  const { wishlist } = useWishlist()

  const wishlistProducts = productList.filter((p) => wishlist.includes(p.id))

  return (
    <section className="section wishlist-section" id="wishlist">
      <div className="wishlist-container">
        <div className="wishlist-header">
          <div>
            <h1 className="wishlist-title">Mis Favoritos</h1>
            <p className="wishlist-subtitle">{wishlist.length} producto{wishlist.length !== 1 ? 's' : ''} guardado{wishlist.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn-secondary" onClick={() => navigate('/explorar')}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 5L2 12m0 0l7 7m-7-7h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            Seguir explorando
          </button>
        </div>

        {wishlistProducts.length === 0 ? (
          <EmptyState
            icon="♡"
            title="Sin favoritos aún"
            message="Agrega productos a tus favoritos para guardarlos aquí y acceder rápidamente a ellos."
            action={
              <button className="btn-primary" onClick={() => navigate('/explorar')}>
                Explorar productos
              </button>
            }
          />
        ) : (
          <div className="products-grid">
            {wishlistProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
