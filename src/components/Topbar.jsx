import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { companyInitials } from '../utils/format'
import OxidaWordmark from './OxidaWordmark'

export default function Topbar() {
  const { supplierUser, logout, customerUser, logoutCustomer, adminUser } = useAuth()
  const { cartCount, setCartOpen } = useCart()
  const { wishlist } = useWishlist()
  const homeHash = (sectionId) => `${import.meta.env.BASE_URL}#${sectionId}`

  return (
    <header className="topbar">
      <div className="brand-wrap">
        <Link to="/" className="store-nav-brand" aria-label="Oxida Studio, inicio">
          <OxidaWordmark />
        </Link>
      </div>

      <nav className="topbar-menu" aria-label="Navegación principal">
        <Link to="/explorar">Tienda</Link>
        <a href={homeHash('categorias')}>Colecciones</a>
        <Link to="/oxida">A medida</Link>
        <a href={homeHash('como-funciona')}>El estudio</a>
        {adminUser && <Link to="/admin/productos">Administrar tienda</Link>}
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
        ) : customerUser ? (
          <div className="supplier-session">
            <span className="supplier-session-avatar">
              {companyInitials(customerUser.company || 'Cliente')}
            </span>
            <span className="supplier-session-name">
              {customerUser.company || customerUser.email}
            </span>
            <button className="supplier-logout" onClick={logoutCustomer} aria-label="Cerrar sesión">
              Salir
            </button>
          </div>
        ) : (
          <>
            <Link to="/cliente/login" className="topbar-user-login-btn">
              Mi cuenta
            </Link>
            <Link to="/proveedor/login" className="topbar-login-btn">
              Soy proveedor
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
