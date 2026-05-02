import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { companyInitials } from '../utils/format'
import logoImg from '../assets/mercadobra.png'

export default function Topbar() {
  const { supplierUser, logout } = useAuth()
  const { cartCount, setCartOpen } = useCart()
  const { wishlist } = useWishlist()

  return (
    <header className="topbar">
      <div className="brand-wrap">
        <Link to="/">
          <img src={logoImg} className="brand-logo" alt="MercadObra" />
        </Link>
      </div>

      <nav className="topbar-menu" aria-label="Navegación principal">
        <a href="/#inicio">Inicio</a>
        <a href="/#categorias">Categorías</a>
        <Link to="/explorar">Explorar</Link>
        <a href="/#como-funciona">Cómo funciona</a>
        <a href="/#contacto">Contacto</a>
      </nav>

      <div className="topbar-actions">
        <Link to="/favoritos" className="topbar-wishlist-btn" title="Ver favoritos">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {wishlist.length > 0 && <span className="wishlist-badge">{wishlist.length}</span>}
        </Link>

        <button
          type="button"
          className="topbar-cart-btn"
          onClick={() => setCartOpen(true)}
          title="Ver carrito"
          aria-label={`Ver carrito (${cartCount} productos)`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {cartCount > 0 && <span className="wishlist-badge">{cartCount}</span>}
        </button>

        {supplierUser ? (
          <div className="supplier-session">
            <span className="supplier-session-avatar">
              {companyInitials(supplierUser.company)}
            </span>
            <Link to="/proveedor" className="supplier-session-name">
              {supplierUser.company}
            </Link>
            <button className="supplier-logout" onClick={logout} aria-label="Cerrar sesión">
              Salir
            </button>
          </div>
        ) : (
          <>
            <Link to="/proveedor/login" className="topbar-user-login-btn">
              Iniciar sesión
            </Link>
            <Link to="/proveedor/login" className="topbar-login-btn">
              Ingresar como proveedor
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
