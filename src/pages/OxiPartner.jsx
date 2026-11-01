import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './OxiPartner.css'

export default function OxiPartner() {
  const { customerUser, loginCustomer, customerAuthLoading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('gantt')
  const [demoLoading, setDemoLoading] = useState(false)

  async function handleLaunchDemo() {
    if (customerUser) {
      navigate('/cliente')
      return
    }
    setDemoLoading(true)
    try {
      const user = await loginCustomer('pro@mercadobra.com', 'pro123')
      if (user) {
        navigate('/cliente')
      } else {
        navigate('/cliente/login')
      }
    } catch {
      navigate('/cliente/login')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="partner-page">
      {/* ── HERO SECTION ── */}
      <header className="partner-hero">
        <div className="partner-hero-content">
          <span className="partner-eyebrow">
            ⚡ OxI Pro · ConstructionTech OS para Arquitectura & Obra
          </span>
          <h1 className="partner-title">
            Control de Obra, Cronograma Cascada & Fabricación Industrial
          </h1>
          <p className="partner-subtitle">
            La plataforma operativa que integra la gestión física-financiera de tus obras: cronograma Gantt
            con dependencias dinámicas, Curva S con EVM (Earned Value Management), control climático de lluvia,
            liquidación de leyes sociales para BPS (Ley 14.411) y conexión directa con nuestra red de talleres de herrería y carpintería.
          </p>

          <div className="partner-actions">
            <button
              type="button"
              onClick={handleLaunchDemo}
              disabled={demoLoading || customerAuthLoading}
              className="partner-btn primary"
            >
              {demoLoading || customerAuthLoading ? 'Cargando Suite OxI Pro...' : '⚡ Probar Demo en Vivo de OxI Pro (1 Clic)'}
            </button>
            <Link to="/cliente/login" className="partner-btn secondary">
              Iniciar Sesión Corporativa
            </Link>
          </div>

          <div className="partner-trust-badges">
            <span className="trust-pill">✓ Cronograma Gantt Cascada & Lag</span>
            <span className="trust-pill">✓ Curva S & Valor Ganado (EVM)</span>
            <span className="trust-pill">✓ Ley 14.411 BPS / SUNCA Grupo 9</span>
            <span className="trust-pill">✓ Control de Lluvias & Corrimiento</span>
            <span className="trust-pill">✓ Imputación Contable Real</span>
          </div>
        </div>
      </header>

      {/* ── LIVE INTERACTIVE SHOWCASE ── */}
      <section className="partner-showcase-section">
        <div className="showcase-container">
          <div className="showcase-header">
            <span className="partner-eyebrow" style={{ color: '#ea580c' }}>SUITE EN PRODUCCIÓN</span>
            <h2>Explorá las Capacidades Reales de OxI Pro</h2>
            <p>
              Diseñado por arquitectos e ingenieros de obra para eliminar el desfasaje entre el plano, el presupuesto y la ejecución en el terreno.
            </p>
          </div>

          {/* Selector de módulos interactivo */}
          <div className="showcase-tabs">
            <button
              type="button"
              className={`showcase-tab ${activeTab === 'gantt' ? 'active' : ''}`}
              onClick={() => setActiveTab('gantt')}
            >
              📊 Diagrama de Gantt & Cascada
            </button>
            <button
              type="button"
              className={`showcase-tab ${activeTab === 'curva-s' ? 'active' : ''}`}
              onClick={() => setActiveTab('curva-s')}
            >
              📈 Curva S & Control EVM
            </button>
            <button
              type="button"
              className={`showcase-tab ${activeTab === 'bps' ? 'active' : ''}`}
              onClick={() => setActiveTab('bps')}
            >
              🏛️ Nómina & Aportes BPS (Ley 14.411)
            </button>
            <button
              type="button"
              className={`showcase-tab ${activeTab === 'costos' ? 'active' : ''}`}
              onClick={() => setActiveTab('costos')}
            >
              💰 Costo al Día de Corte
            </button>
            <button
              type="button"
              className={`showcase-tab ${activeTab === 'clima' ? 'active' : ''}`}
              onClick={() => setActiveTab('clima')}
            >
              🌦️ Control Climático & Lluvias
            </button>
          </div>

          {/* Visualizador interactivo simulado de la suite real */}
          <div className="showcase-canvas">
            {activeTab === 'gantt' && (
              <div className="showcase-preview-card">
                <div className="preview-top-bar">
                  <div className="preview-indicator">
                    <span className="status-dot"></span>
                    <strong>Gantt Dinámico: Edificio Torre del Parque</strong>
                  </div>
                  <div className="preview-actions">
                    <span className="preview-tag green">3 Tareas Vinculadas</span>
                    <span className="preview-tag orange">Plazo: 88 Días Hábiles</span>
                  </div>
                </div>

                <div className="mock-gantt-container">
                  <div className="mock-gantt-header-row">
                    <div className="col-name">Tarea de Obra</div>
                    <div className="col-progress">% Plan / Real</div>
                    <div className="col-timeline">Línea de Tiempo (Agosto - Octubre)</div>
                  </div>

                  <div className="mock-gantt-task-row">
                    <div className="col-name">
                      <strong>1. Implantación y Obrador</strong>
                      <span className="task-subtext">3 operarios · Cat. Oficial</span>
                    </div>
                    <div className="col-progress">
                      <span className="prog-pill done">30% plan / 20% real</span>
                    </div>
                    <div className="col-timeline-bar">
                      <div className="mock-bar bar-1">
                        <span>Implantación</span>
                        <span className="mock-badge-succ">➔ Excavación</span>
                      </div>
                    </div>
                  </div>

                  <div className="mock-gantt-task-row">
                    <div className="col-name">
                      <strong>2. Excavación y Fundaciones</strong>
                      <span className="task-subtext">2 operarios · Cat. Medio Oficial</span>
                    </div>
                    <div className="col-progress">
                      <span className="prog-pill ahead">+20% Adelantada</span>
                    </div>
                    <div className="col-timeline-bar">
                      <div className="mock-bar bar-2">
                        <span className="mock-badge-pred">↳ Tras Implantación</span>
                        <span>Excavación (40%)</span>
                        <span className="mock-badge-succ">➔ Losa</span>
                      </div>
                    </div>
                  </div>

                  <div className="mock-gantt-task-row">
                    <div className="col-name">
                      <strong>3. Estructura de Hormigón (Losa)</strong>
                      <span className="task-subtext">4 operarios · Cat. Especializado</span>
                    </div>
                    <div className="col-progress">
                      <span className="prog-pill warning">-40% Atrasada</span>
                    </div>
                    <div className="col-timeline-bar">
                      <div className="mock-bar bar-3">
                        <span className="mock-badge-pred">↳ Tras Excavación +2d</span>
                        <span>Losa (40%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="preview-footer-info">
                  <span>💡 <strong>Vínculos en Cascada:</strong> Al mover la fecha o registrar una lluvia en la tarea predecesora, las sucesoras se recalculan automáticamente sin desfasajes manuales.</span>
                </div>
              </div>
            )}

            {activeTab === 'curva-s' && (
              <div className="showcase-preview-card">
                <div className="preview-top-bar">
                  <div className="preview-indicator">
                    <span className="status-dot"></span>
                    <strong>Earned Value Management (EVM) & Control Físico-Financiero</strong>
                  </div>
                  <div className="preview-actions">
                    <span className="preview-tag blue">CPI: 1.03 (Bajo Presupuesto)</span>
                    <span className="preview-tag orange">SPI: 0.94 (Leve Atraso)</span>
                  </div>
                </div>

                <div className="mock-evm-grid">
                  <div className="evm-kpi-box">
                    <span className="kpi-label">PV · Valor Planificado</span>
                    <strong className="kpi-val text-blue">$ 950.000</strong>
                    <small>Costo esperado a la fecha</small>
                  </div>
                  <div className="evm-kpi-box">
                    <span className="kpi-label">EV · Valor Ganado</span>
                    <strong className="kpi-val text-green">$ 728.888</strong>
                    <small>Avance físico certificado</small>
                  </div>
                  <div className="evm-kpi-box">
                    <span className="kpi-label">AC · Costo Real Contable</span>
                    <strong className="kpi-val text-orange">$ 710.200</strong>
                    <small>Gastado por comprobantes</small>
                  </div>
                  <div className="evm-kpi-box">
                    <span className="kpi-label">EAC · Proyección al Cierre</span>
                    <strong className="kpi-val text-dark">$ 2.420.000</strong>
                    <small>Costo final estimado de obra</small>
                  </div>
                </div>

                <div className="mock-chart-visual">
                  <div className="chart-legend">
                    <span className="legend-item"><span className="dot dot-plan"></span> Curva Base (Plan)</span>
                    <span className="legend-item"><span className="dot dot-real"></span> Avance Real Físico</span>
                    <span className="legend-item"><span className="dot dot-cost"></span> Costo Devengado</span>
                  </div>
                  <div className="chart-bars-sim">
                    <div className="chart-bar-col">
                      <div className="bar-fill plan" style={{ height: '30%' }}></div>
                      <div className="bar-fill real" style={{ height: '28%' }}></div>
                      <span>Mes 1</span>
                    </div>
                    <div className="chart-bar-col">
                      <div className="bar-fill plan" style={{ height: '60%' }}></div>
                      <div className="bar-fill real" style={{ height: '52%' }}></div>
                      <span>Mes 2</span>
                    </div>
                    <div className="chart-bar-col">
                      <div className="bar-fill plan" style={{ height: '85%' }}></div>
                      <div className="bar-fill real" style={{ height: '70%' }}></div>
                      <span>Mes 3</span>
                    </div>
                    <div className="chart-bar-col">
                      <div className="bar-fill plan" style={{ height: '100%' }}></div>
                      <div className="bar-fill real" style={{ height: '89%' }}></div>
                      <span>Mes 4</span>
                    </div>
                  </div>
                </div>

                <div className="preview-footer-info">
                  <span>💡 <strong>Diagnóstico EVM Integrado:</strong> OxI Pro distingue matemáticamente entre un ahorro genuino de materiales y un retraso físico de obra.</span>
                </div>
              </div>
            )}

            {activeTab === 'bps' && (
              <div className="showcase-preview-card">
                <div className="preview-top-bar">
                  <div className="preview-indicator">
                    <span className="status-dot"></span>
                    <strong>Nómina de Personal & Leyes Sociales (Ley 14.411 · SUNCA Grupo 9)</strong>
                  </div>
                  <div className="preview-actions">
                    <span className="preview-tag green">60% Aporte BPS Unificado</span>
                    <span className="preview-tag blue">Exportable Excel CSV & A4</span>
                  </div>
                </div>

                <div className="mock-bps-summary">
                  <div className="bps-stat-card">
                    <span>Operarios Declarados</span>
                    <strong>7 Trabajadores</strong>
                  </div>
                  <div className="bps-stat-card">
                    <span>Jornales Liquidados</span>
                    <strong>120 Jornales</strong>
                  </div>
                  <div className="bps-stat-card">
                    <span>Mano de Obra Imponible</span>
                    <strong style={{ color: '#0284c7' }}>$ 348.000</strong>
                  </div>
                  <div className="bps-stat-card">
                    <span>Aporte BPS (60%)</span>
                    <strong style={{ color: '#16a34a' }}>$ 208.800</strong>
                  </div>
                  <div className="bps-stat-card">
                    <span>FOCER (4%) + BSE (4.5%)</span>
                    <strong style={{ color: '#64748b' }}>$ 29.580</strong>
                  </div>
                </div>

                <div className="mock-bps-table">
                  <div className="mock-bps-thead">
                    <span>Cédula de Identidad</span>
                    <span>Operario</span>
                    <span>Categoría Laudo</span>
                    <span>Jornales</span>
                    <span>M.O. Imponible</span>
                    <span>Aporte BPS 60%</span>
                  </div>
                  <div className="mock-bps-trow">
                    <strong>1.849.201-4</strong>
                    <span>Juan Carlos Silva</span>
                    <span className="cat-badge">Oficial Albañil</span>
                    <span className="text-center">22 d</span>
                    <span className="text-right">$ 61.600</span>
                    <span className="text-right text-green">$ 36.960</span>
                  </div>
                  <div className="mock-bps-trow">
                    <strong>2.910.445-8</strong>
                    <span>Martín Fagúndez</span>
                    <span className="cat-badge">Medio Oficial</span>
                    <span className="text-center">20 d</span>
                    <span className="text-right">$ 44.000</span>
                    <span className="text-right text-green">$ 26.400</span>
                  </div>
                  <div className="mock-bps-trow">
                    <strong>4.120.890-1</strong>
                    <span>Esteban Rodríguez</span>
                    <span className="cat-badge">Peón Práctico</span>
                    <span className="text-center">22 d</span>
                    <span className="text-right">$ 42.900</span>
                    <span className="text-right text-green">$ 25.740</span>
                  </div>
                </div>

                <div className="preview-footer-info">
                  <span>💡 <strong>Emisión Oficial en 1 Clic:</strong> Generá planillas oficiales listas para BPS con bloques de firma para Director de Obra, RRHH y Comitente.</span>
                </div>
              </div>
            )}

            {activeTab === 'costos' && (
              <div className="showcase-preview-card">
                <div className="preview-top-bar">
                  <div className="preview-indicator">
                    <span className="status-dot"></span>
                    <strong>Control de Costos al Día de Corte (Presupuesto a la Fecha vs. Costo Real)</strong>
                  </div>
                  <div className="preview-actions">
                    <span className="preview-tag blue">Presupuestado: $ 1.340.000</span>
                    <span className="preview-tag orange">Ejecutado: $ 1.285.000</span>
                  </div>
                </div>

                <div className="mock-cost-grid">
                  <div className="cost-card-kpi">
                    <span>Presupuesto Plan a la Fecha</span>
                    <strong>$ 1.340.000</strong>
                    <small>48% del presupuesto total</small>
                  </div>
                  <div className="cost-card-kpi">
                    <span>Costo Real Devengado</span>
                    <strong style={{ color: '#ea580c' }}>$ 1.285.000</strong>
                    <small>Imputado por partes y facturas</small>
                  </div>
                  <div className="cost-card-kpi" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <span style={{ color: '#166534' }}>Desvío Neto Acumulado</span>
                    <strong style={{ color: '#16a34a' }}>- $ 55.000</strong>
                    <small style={{ color: '#166534' }}>-4.1% (Ahorro / En Margen)</small>
                  </div>
                  <div className="cost-card-kpi">
                    <span>Saldo por Devengar</span>
                    <strong>$ 1.485.000</strong>
                    <small>Remanente contractual</small>
                  </div>
                </div>

                <div className="preview-footer-info">
                  <span>💡 <strong>Modo Imputación Flexible:</strong> Elegí por tarea si el costo devengado se computa por comprobantes reales imputados, por avance porcentual contractual o por monto manual directo.</span>
                </div>
              </div>
            )}

            {activeTab === 'clima' && (
              <div className="showcase-preview-card">
                <div className="preview-top-bar">
                  <div className="preview-indicator">
                    <span className="status-dot"></span>
                    <strong>Control Climático & Registro de Lluvia</strong>
                  </div>
                  <div className="preview-actions">
                    <span className="preview-tag blue">2 Días de Suspensión Computados</span>
                  </div>
                </div>

                <div className="mock-weather-box">
                  <div className="weather-event-alert">
                    <span className="weather-icon">🌧️</span>
                    <div>
                      <strong>Evento Climático Registrado: 2026-10-18 (+2 días hábiles)</strong>
                      <p>Lluvia copiosa imposibilitó tareas de hormigonado en platea. Se aplicó corrimiento en cascada.</p>
                    </div>
                  </div>

                  <div className="weather-effects-grid">
                    <div className="effect-card">
                      <span>Tareas Afectadas Directas</span>
                      <strong>2 Tareas de Hormigón</strong>
                    </div>
                    <div className="effect-card">
                      <span>Tareas Reagendadas en Cascada</span>
                      <strong>3 Tareas Sucesoras</strong>
                    </div>
                    <div className="effect-card">
                      <span>Nueva Fecha Fin Estimada</span>
                      <strong>24 de Noviembre de 2026</strong>
                    </div>
                  </div>
                </div>

                <div className="preview-footer-info">
                  <span>💡 <strong>Cálculo Automático de Días Hábiles:</strong> El motor descuenta fines de semana y feriados uruguayos oficiales (incluyendo el Día del Trabajador de la Construcción).</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CORE VALUE PILLARS ── */}
      <section className="partner-features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3>AI Quoting & Despiece Paramétrico</h3>
          <p>
            Subí planos, memorias técnicas o croquis. El motor <strong>OXI Quote</strong> extrae dimensiones, kilos de acero, perfiles normalizados y emite presupuestos transparentes en menos de 45 segundos.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h3>Catálogo Paramétrico OXI</h3>
          <p>
            El 70% de las partidas a medida ya están modeladas: barandas vidriadas (OXI Rail), pérgolas estructurales (OXI Pergola) y divisorias de diseño para adaptarlas con un clic a tu edificio.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3>Red de Fabricación Distribuida</h3>
          <p>
            Asignamos cada paquete de obra al taller homologado de la red según especialidad, capacidad productiva y proximidad geográfica. <strong>Capacidad industrial ilimitada para tu constructora.</strong>
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h3>Subcontratos & Fondo de Reparo</h3>
          <p>
            Controlá contratos marco de subcontratistas, aprobaciones de adicionales, retención de fondo de reparo al 5% y alertas de sobrecosto al superar el 80% del saldo contractual.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3>Copilot IA de Obra</h3>
          <p>
            Asistente conversacional de ingeniería que responde preguntas sobre plazos y tareas atrasadas, y ejecuta acciones en el cronograma con lenguaje natural.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <h3>Auditorías & Informes Ejecutivos</h3>
          <p>
            Emisión con un solo clic de reportes en PDF y CSV para directorio, comitentes y organismos de previsión social (BPS Ley 14.411) con bloques de firma técnica.
          </p>
        </div>
      </section>

      {/* ── FAST ACCESS / DEMO ONBOARDING BANNER ── */}
      <section className="partner-cta-banner">
        <div className="cta-banner-content">
          <h2>¿Listo para digitalizar la gestión de tus obras?</h2>
          <p>
            Comenzá hoy mismo probando la suite completa de OxI Pro con proyectos modelo cargados, sin tarjetas de crédito ni esperas.
          </p>
          <div className="cta-actions">
            <button
              type="button"
              onClick={handleLaunchDemo}
              disabled={demoLoading || customerAuthLoading}
              className="partner-btn primary"
              style={{ fontSize: '1.1rem', padding: '1rem 2.2rem' }}
            >
              {demoLoading || customerAuthLoading ? 'Iniciando sesión demo...' : '🚀 Lanzar Demo Interactiva de OxI Pro'}
            </button>
            <Link to="/cliente/registro" className="partner-btn secondary">
              Crear Cuenta para mi Empresa
            </Link>
          </div>
          <small className="cta-footnote">
            Credenciales de prueba inmediatas: <code>pro@mercadobra.com</code> · Perfil Constructor Pro
          </small>
        </div>
      </section>
    </div>
  )
}
