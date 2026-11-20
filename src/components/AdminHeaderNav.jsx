import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from './OxidaWordmark'
import './AdminHeaderNav.css'

const ADMIN_LINKS = [
  { to: '/admin/cotizaciones-clientes', label: 'Cotizaciones', icon: '⚙️' },
  { to: '/admin/clientes', label: 'Clientes', icon: '👥' },
  { to: '/admin/analitica', label: 'Analítica', icon: '📈' },
  { to: '/admin/cotiza', label: 'Cotizador B2B', icon: '🧮' },
  { to: '/admin/modelador', label: 'Simulador 3D', icon: '📐' },
  { to: '/admin/productos', label: 'Tienda & Stock', icon: '📦' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '🛍️' },
  { to: '/admin/cotizaciones', label: 'Consultas web', icon: '📩' },
  { to: '/admin/personalizaciones', label: 'Personalizaciones', icon: '🎨' },
  { to: '/admin/plantillas', label: 'Plantillas', icon: '📋' },
]

export default function AdminHeaderNav() {
  const location = useLocation()
  const { adminUser, logoutAdmin } = useAuth()

  return (
    <header className="admin-unified-header">
      <div className="admin-unified-top">
        <div className="admin-unified-brand">
          <Link to="/admin/cotizaciones-clientes" className="admin-brand-link" title="Ir a Cotizaciones">
            <OxidaWordmark />
            <span className="admin-brand-badge">ADMIN</span>
          </Link>
        </div>

        <div className="admin-unified-actions">
          <Link to="/" className="admin-public-web-btn" title="Ir al sitio web público de Óxida Studio">
            <span>🌐</span>
            <span>Ver Web ↗</span>
          </Link>

          {adminUser && (
            <div className="admin-session-pill">
              <span className="admin-session-avatar">AD</span>
              <span className="admin-session-email">{adminUser.email || 'Admin'}</span>
              <button
                type="button"
                className="admin-logout-btn"
                onClick={logoutAdmin}
                title="Cerrar sesión de administrador"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="admin-unified-tabs" aria-label="Navegación del panel de administración">
        {ADMIN_LINKS.map((link) => {
          const isActive =
            location.pathname === link.to ||
            (link.to !== '/admin' && location.pathname.startsWith(`${link.to}/`))

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`admin-nav-tab ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="admin-tab-icon">{link.icon}</span>
              <span className="admin-tab-label">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
