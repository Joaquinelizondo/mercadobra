import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { companyInitials } from '../utils/format'
import logoImg from '../assets/mercadobra.png'
import './MobileMenuDrawer.css'

export default function MobileMenuDrawer({ isOpen, onClose }) {
  const { customerUser, adminUser, logoutCustomer, logoutAdmin } = useAuth()

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="mb-drawer-overlay" onClick={onClose}>
      <aside className="mb-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <header className="mb-drawer-header">
          <Link to="/" onClick={onClose} className="mb-drawer-brand">
            <img src={logoImg} alt="Mercadobra" className="mb-drawer-logo" />
            <span className="mb-drawer-brand-sub">Óxida Studio</span>
          </Link>
          <button
            type="button"
            className="mb-drawer-close"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </header>

        {/* USER PROFILE SNIPPET */}
        <div className="mb-drawer-user-card">
          {adminUser ? (
            <div className="mb-user-logged">
              <span className="mb-user-avatar mb-user-avatar--admin">AD</span>
              <div className="mb-user-info">
                <strong>Administrador</strong>
                <Link to="/admin/cotizaciones-clientes" onClick={onClose}>
                  Panel de Obras & Cotizaciones →
                </Link>
              </div>
              <button
                type="button"
                className="mb-user-logout"
                onClick={() => { logoutAdmin(); onClose(); }}
              >
                Salir
              </button>
            </div>
          ) : customerUser ? (
            <div className="mb-user-logged">
              <span className="mb-user-avatar">
                {companyInitials(customerUser.company || customerUser.name || 'Cliente')}
              </span>
              <div className="mb-user-info">
                <strong>{customerUser.company || customerUser.name}</strong>
                <Link to="/cliente" onClick={onClose}>
                  Mi Portal de Obras →
                </Link>
              </div>
              <button
                type="button"
                className="mb-user-logout"
                onClick={() => { logoutCustomer(); onClose(); }}
              >
                Salir
              </button>
            </div>
          ) : (
            <div className="mb-user-guest">
              <div>
                <strong>Portal de Obras & Clientes</strong>
                <p>Consultá tus cotizaciones, planos y seguimiento.</p>
              </div>
              <Link
                to="/cliente/login"
                className="mb-btn-login"
                onClick={onClose}
              >
                Iniciar Sesión
              </Link>
            </div>
          )}
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="mb-drawer-nav">
          <span className="mb-drawer-nav-heading">Navegación</span>

          <Link to="/" className="mb-drawer-link" onClick={onClose}>
            <span className="mb-dlink-icon">🏠</span>
            <span>Inicio</span>
          </Link>

          <Link to="/oxida" className="mb-drawer-link" onClick={onClose}>
            <span className="mb-dlink-icon">🏛️</span>
            <span>Óxida Studio · Proyectos</span>
          </Link>

          <Link to="/contacto#formulario-contacto" className="mb-drawer-link" onClick={onClose}>
            <span className="mb-dlink-icon">📐</span>
            <span>Cotizar Proyecto a Medida</span>
            <small className="mb-dlink-tag">Gratis</small>
          </Link>

          <Link to="/partner" className="mb-drawer-link" onClick={onClose}>
            <span className="mb-dlink-icon">🏗️</span>
            <span>Para Profesionales & Constructoras</span>
          </Link>

          <Link to="/quienes-somos" className="mb-drawer-link" onClick={onClose}>
            <span className="mb-dlink-icon">👥</span>
            <span>Quiénes somos & Fabricación</span>
          </Link>

          <Link to="/contacto" className="mb-drawer-link" onClick={onClose}>
            <span className="mb-dlink-icon">📩</span>
            <span>Contáctenos</span>
          </Link>

          {/* ADMIN LINK (SUBTLE) */}
          <span className="mb-drawer-nav-heading">Administración</span>
          <Link to="/admin/login" className="mb-drawer-link mb-drawer-link--subtle" onClick={onClose}>
            <span className="mb-dlink-icon">⚙️</span>
            <span>Acceso Administración</span>
          </Link>
        </nav>

        {/* FOOTER ACTIONS */}
        <footer className="mb-drawer-footer">
          <a
            href="https://wa.me/59899123456?text=Hola%20Óxida%20Studio,%20quisiera%20hacer%20una%20consulta%20técnica."
            target="_blank"
            rel="noreferrer"
            className="mb-drawer-wa-btn"
          >
            <span className="mb-wa-icon">💬</span>
            <span>Atención WhatsApp</span>
          </a>

          <p className="mb-drawer-copy">
            Óxida Studio by Mercadobra · Montevideo, Uruguay
          </p>
        </footer>
      </aside>
    </div>
  )
}
