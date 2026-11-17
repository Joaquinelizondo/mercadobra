import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './MobileBottomNav.css'

export default function MobileBottomNav({ onOpenDrawer }) {
  const location = useLocation()
  const { customerUser, adminUser } = useAuth()

  const currentPath = location.pathname

  const isHome = currentPath === '/' || currentPath === '/mercadobra'
  const isProjects = currentPath === '/oxida'
  const isPortal = currentPath.startsWith('/cliente')
  const isAdmin = currentPath.startsWith('/admin')

  // Target for portal icon
  const portalTarget = adminUser
    ? '/admin/cotizaciones-clientes'
    : customerUser
    ? '/cliente'
    : '/cliente/login'

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil inferior">
      {/* 1. INICIO */}
      <Link
        to="/"
        className={`mb-nav-item ${isHome ? 'is-active' : ''}`}
        aria-current={isHome ? 'page' : undefined}
      >
        <span className="mb-nav-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span className="mb-nav-label">Inicio</span>
      </Link>

      {/* 2. PROYECTOS */}
      <Link
        to="/oxida"
        className={`mb-nav-item ${isProjects ? 'is-active' : ''}`}
        aria-current={isProjects ? 'page' : undefined}
      >
        <span className="mb-nav-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </span>
        <span className="mb-nav-label">Proyectos</span>
      </Link>

      {/* 3. COTIZAR (ELEVATED HERO BUTTON) */}
      <Link
        to="/contacto#formulario-contacto"
        className="mb-nav-item mb-nav-item--cotizar"
        title="Cotizar proyecto a medida"
      >
        <span className="mb-cotizar-bubble">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className="mb-nav-label mb-nav-label--bold">Cotizar</span>
      </Link>

      {/* 4. MI PORTAL / OBRAS */}
      <Link
        to={portalTarget}
        className={`mb-nav-item ${isPortal || isAdmin ? 'is-active' : ''}`}
      >
        <span className="mb-nav-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="mb-nav-label">
          {adminUser ? 'Admin' : customerUser ? 'Mi Obra' : 'Ingresar'}
        </span>
      </Link>

      {/* 5. MENU DRAWER */}
      <button
        type="button"
        className="mb-nav-item mb-nav-btn"
        onClick={onOpenDrawer}
        aria-label="Abrir menú"
      >
        <span className="mb-nav-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </span>
        <span className="mb-nav-label">Menú</span>
      </button>
    </nav>
  )
}
