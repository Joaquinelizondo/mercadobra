import { Link } from 'react-router-dom'
import './OxiPartner.css'

export default function OxiPartner() {
  return (
    <div className="partner-page">
      <header className="partner-hero">
        <div className="partner-hero-content">
          <span className="partner-eyebrow">Para Constructoras y Estudios de Arquitectura</span>
          <h1 className="partner-title">Metal & Madera Solutions as a Service</h1>
          <p className="partner-subtitle">
            OXI Partner es la plataforma que centraliza todas las soluciones en metal y madera de tu obra.
            Desde la detección de planos y cotización inteligente, hasta la adjudicación en nuestra
            red de fabricación y la gestión de la instalación.
          </p>
          <div className="partner-actions">
            <Link to="/cliente/login" className="partner-btn primary">
              Iniciar Sesión en OXI OS
            </Link>
          </div>
        </div>
      </header>

      <section className="partner-features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3>Cotización Inmediata</h3>
          <p>Sube tu planilla de herrajes o plano y nuestro motor <strong>OXI Quote</strong> analiza, detecta elementos y te devuelve un presupuesto transparente y al instante.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h3>Catálogo Paramétrico</h3>
          <p>El 70% de las necesidades a medida ya están modeladas. Barandas, divisores y puertas (OXI Doors, OXI Rail) con dimensiones adaptables a tu edificio.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3>Red de Fabricación Distribuida</h3>
          <p>Asignamos cada paquete de tu obra al taller homologado ideal según capacidad, precio y zona. <strong>Capacidad industrial ilimitada para tu proyecto.</strong></p>
        </div>
      </section>

      <section className="partner-dashboard-preview">
        <div className="preview-text">
          <span className="partner-eyebrow">Próximamente: OXI OS</span>
          <h2>El Panel de Control de tus Edificios</h2>
          <p>
            Olvida los correos y mensajes perdidos. Como usuario <strong>OXI Partner</strong> tendrás acceso a un dashboard corporativo donde podrás ver el estado en tiempo real de toda tu herrería: Ingeniería, Producción, Pintura e Instalación.
          </p>
        </div>
        <div className="preview-image-placeholder">
          <div className="mock-dashboard">
            <div className="mock-header"></div>
            <div className="mock-body">
              <div className="mock-sidebar"></div>
              <div className="mock-content">
                <div className="mock-card"></div>
                <div className="mock-card"></div>
                <div className="mock-card"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

