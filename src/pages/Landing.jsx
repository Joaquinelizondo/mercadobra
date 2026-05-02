import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroImg from '../assets/hero.png'
import logoImg from '../assets/mercadobra.png'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import { createLead } from '../lib/api'

const categories = [
  { title: 'Hormigón y áridos', description: 'Encontrá cemento, arena, piedra, bloques y soluciones para obra gruesa en un solo lugar.' },
  { title: 'Hierro y estructuras', description: 'Compará perfiles, mallas, chapas y caños para avanzar tu proyecto con el mejor precio.' },
  { title: 'Terminaciones', description: 'Elegí pisos, revestimientos, pinturas, sanitarios y grifería para cada ambiente.' },
  { title: 'Herramientas y seguridad', description: 'Comprá herramientas, protección personal y equipamiento confiable para tu obra.' },
]

const benefits = [
  'Compará precios y productos por categoría en minutos.',
  'Contactá proveedores verificados sin salir de la plataforma.',
  'Guardá favoritos para decidir con calma antes de comprar.',
  'Seguimiento del pedido para tener control de cada etapa de tu compra.',
]

const metrics = [
  { value: '+500', label: 'productos para hogar y obra' },
  { value: '24/7', label: 'catálogo disponible para comprar' },
  { value: '1 clic', label: 'para contactar al proveedor' },
]

const testimonios = [
  {
    name: 'Lucía Martínez',
    company: 'Remodelación de cocina',
    text: 'Pude comparar materiales y resolver la compra completa para mi cocina desde casa. El contacto con proveedores fue rápido y claro.',
    rating: 5
  },
  {
    name: 'Nicolás Rojas',
    company: 'Ampliación familiar',
    text: 'Usé MercadObra para conseguir hierro, cemento y herramientas. Ahorré tiempo y pude elegir por precio y disponibilidad.',
    rating: 5
  },
  {
    name: 'Agustina Pérez',
    company: 'Refacción de baño',
    text: 'Me ayudó mucho tener seguimiento del pedido. Sentí más seguridad comprando materiales para una obra chica.',
    rating: 4
  }
]

const journeyTracks = [
  {
    id: 'express',
    title: 'Ruta Express 72h',
    subtitle: 'Para resolver compras urgentes sin perder control de precio.',
    audience: 'Ideal para arreglos rápidos y entregas inmediatas',
    plan: 'premium',
    checklist: [
      'Filtrado por stock disponible en el momento.',
      'Prioridad en proveedores con respuesta más rápida.',
      'Seguimiento activo desde compra hasta entrega.',
    ],
  },
  {
    id: 'smart',
    title: 'Ruta Ahorro Inteligente',
    subtitle: 'Para comparar opciones y optimizar cada peso de tu obra.',
    audience: 'Ideal para remodelaciones planificadas',
    plan: 'pro',
    checklist: [
      'Comparación por categoría y rango de precio.',
      'Selección de favoritos para decidir sin presión.',
      'Contacto directo con proveedores verificados.',
    ],
  },
  {
    id: 'proyecto',
    title: 'Ruta Proyecto Completo',
    subtitle: 'Para obras por etapas con compras ordenadas.',
    audience: 'Ideal para ampliaciones, obra nueva o cambios grandes',
    plan: 'premium',
    checklist: [
      'Planificación por etapa: obra gruesa, instalaciones y terminaciones.',
      'Recomendaciones de categorías según avance de obra.',
      'Soporte para seguimiento de pedidos en paralelo.',
    ],
  },
]

const projectTypeOptions = [
  'Remodelación de cocina/baño',
  'Ampliación de ambientes',
  'Construcción desde cero',
  'Mantenimiento y arreglos',
  'Equipamiento y terminaciones',
]

const timelineOptions = ['Lo necesito esta semana', 'Durante este mes', 'En 1 a 3 meses']

const budgetOptions = ['Hasta ARS 500.000', 'ARS 500.000 a 2.000.000', 'Más de ARS 2.000.000']
const paymentPreferenceOptions = ['A convenir', 'Transferencia bancaria', 'Tarjeta / MercadoPago', 'Efectivo contra entrega']

const paymentHighlights = [
  {
    title: 'Transferencia bancaria',
    detail: 'Confirmación rápida y comprobante digital para tu compra.',
  },
  {
    title: 'Tarjeta / MercadoPago',
    detail: 'Pagá con tarjeta, cuotas o saldo con validación online.',
  },
  {
    title: 'Efectivo contra entrega',
    detail: 'Disponible en zonas y proveedores habilitados.',
  },
]

const quickSearchTerms = ['Cemento', 'Hierro', 'Arena', 'Pintura', 'Taladro']

const RECENT_SEARCHES_KEY = 'mercadobra-recent-searches'
const WHATSAPP_NUMBER = String(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '')

export default function Landing() {
  const navigate = useNavigate()
  const { productList } = useProducts()
  const [featuredSearchInput, setFeaturedSearchInput] = useState('')
  const [showFeaturedSuggestions, setShowFeaturedSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [leadForm, setLeadForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    zone: '',
    plan: 'pro',
    projectType: projectTypeOptions[0],
    timeline: timelineOptions[1],
    budgetRange: budgetOptions[0],
    paymentPreference: paymentPreferenceOptions[0],
    message: '',
  })
  const [activeTrackId, setActiveTrackId] = useState('smart')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadError, setLeadError] = useState('')
  const [leadSuccess, setLeadSuccess] = useState('')
  const searchTimerRef = useRef(null)
  const leadSectionRef = useRef(null)
  const featured = productList.slice(0, 6)
  const normalizedFeaturedInput = featuredSearchInput.trim().toLowerCase()
  const activeTrack = useMemo(
    () => journeyTracks.find((track) => track.id === activeTrackId) || journeyTracks[1],
    [activeTrackId]
  )

  const featuredSuggestionItems = useMemo(() => {
    const productNames = [...new Set(productList.map((product) => product.name))].map((value) => ({
      id: `product-${value}`,
      label: value,
      value,
      type: 'Producto',
    }))

    const companies = [...new Set(productList.map((product) => product.company))].map((value) => ({
      id: `company-${value}`,
      label: value,
      value,
      type: 'Proveedor',
    }))

    const categoriesList = [...new Set(productList.map((product) => product.category))].map((value) => ({
      id: `category-${value}`,
      label: value,
      value,
      type: 'Categoría',
    }))

    return [...productNames, ...companies, ...categoriesList]
  }, [productList])

  const featuredSuggestions = useMemo(() => {
    if (!normalizedFeaturedInput) {
      const recent = recentSearches.map((value) => ({
        id: `recent-${value}`,
        label: value,
        value,
        type: 'Reciente',
      }))
      const quickProducts = featuredSuggestionItems.filter((item) => item.type === 'Producto').slice(0, 4)
      const quickCategories = featuredSuggestionItems.filter((item) => item.type === 'Categoría').slice(0, 2)
      return [...recent, ...quickProducts, ...quickCategories].slice(0, 6)
    }

    const matches = featuredSuggestionItems
      .filter((item) => item.label.toLowerCase().includes(normalizedFeaturedInput))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(normalizedFeaturedInput)
        const bStarts = b.label.toLowerCase().startsWith(normalizedFeaturedInput)
        if (aStarts === bStarts) return a.label.localeCompare(b.label)
        return aStarts ? -1 : 1
      })
      .slice(0, 5)

    if (!matches.length && featuredSearchInput.trim()) {
      return [
        {
          id: `search-${featuredSearchInput}`,
          label: `Buscar “${featuredSearchInput.trim()}” en todo el catálogo`,
          value: featuredSearchInput.trim(),
          type: 'Buscar',
        },
      ]
    }

    return matches
  }, [featuredSuggestionItems, normalizedFeaturedInput, featuredSearchInput, recentSearches])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter(Boolean).slice(0, 5))
        }
      }
    } catch {
      setRecentSearches([])
    }

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [])

  function saveRecentSearch(term) {
    const nextTerm = term.trim()
    if (!nextTerm) {
      return
    }

    setRecentSearches((previous) => {
      const next = [nextTerm, ...previous.filter((item) => item.toLowerCase() !== nextTerm.toLowerCase())].slice(0, 5)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      return next
    })
  }

  function startFeaturedSearch(term) {
    const nextTerm = term.trim()
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    setShowFeaturedSuggestions(false)
    saveRecentSearch(nextTerm)
    setIsSearching(true)
    searchTimerRef.current = setTimeout(() => {
      setIsSearching(false)
      navigate(nextTerm ? `/explorar?q=${encodeURIComponent(nextTerm)}` : '/explorar')
    }, 700)
  }

  function handleFeaturedSearchSubmit(event) {
    event.preventDefault()
    startFeaturedSearch(featuredSearchInput)
  }

  function selectFeaturedSuggestion(suggestion) {
    setFeaturedSearchInput(suggestion.value)
    startFeaturedSearch(suggestion.value)
  }

  function clearFeaturedSearch() {
    setFeaturedSearchInput('')
    setShowFeaturedSuggestions(false)
  }

  function handleQuickSearch(term) {
    setFeaturedSearchInput(term)
    startFeaturedSearch(term)
  }

  function handleLeadInputChange(event) {
    const { name, value } = event.target
    setLeadForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function activateTrack(track) {
    setActiveTrackId(track.id)
    setLeadForm((previous) => ({
      ...previous,
      plan: track.plan,
      message: previous.message || `Quiero activar la ${track.title} para mi proyecto.`,
    }))
  }

  function startGuidedLeadCapture() {
    setLeadForm((previous) => ({
      ...previous,
      plan: activeTrack.plan,
      message: previous.message || `Necesito asesoría para ${previous.projectType.toLowerCase()} con foco en ${activeTrack.title}.`,
    }))
    leadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function buildLeadBrief(formValues) {
    return [
      `Ruta seleccionada: ${activeTrack.title}`,
      `Tipo de proyecto: ${formValues.projectType}`,
      `Plazo estimado: ${formValues.timeline}`,
      `Presupuesto estimado: ${formValues.budgetRange}`,
      `Medio de pago preferido: ${formValues.paymentPreference}`,
    ].join('\n')
  }

  function openLeadWhatsapp() {
    const fallbackCompany = leadForm.company.trim() || 'Cliente particular'
    const lines = [
      'Hola MercadObra, quiero asesoría comercial para mi obra.',
      '',
      `Ruta: ${activeTrack.title}`,
      `Nombre: ${leadForm.name.trim() || 'No informado'}`,
      `Empresa/Particular: ${fallbackCompany}`,
      `Telefono: ${leadForm.phone.trim() || 'No informado'}`,
      `Email: ${leadForm.email.trim() || 'No informado'}`,
      `Zona: ${leadForm.zone.trim() || 'No informada'}`,
      `Proyecto: ${leadForm.projectType}`,
      `Plazo: ${leadForm.timeline}`,
      `Presupuesto: ${leadForm.budgetRange}`,
      `Pago preferido: ${leadForm.paymentPreference}`,
    ]

    if (leadForm.message.trim()) {
      lines.push('', `Detalle: ${leadForm.message.trim()}`)
    }

    const message = encodeURIComponent(lines.join('\n'))
    const endpoint = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : 'https://wa.me/'
    window.open(`${endpoint}?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  async function handleLeadSubmit(event) {
    event.preventDefault()
    if (leadSubmitting) {
      return
    }

    setLeadSubmitting(true)
    setLeadError('')
    setLeadSuccess('')

    try {
      const fallbackCompany = leadForm.company.trim() || 'Cliente particular'
      const brief = buildLeadBrief(leadForm)

      await createLead({
        ...leadForm,
        company: fallbackCompany,
        message: [leadForm.message.trim(), brief].filter(Boolean).join('\n\n'),
      })
      setLeadSuccess('¡Gracias! Recibimos tu solicitud y te contactamos a la brevedad.')
      setLeadForm({
        name: '',
        company: '',
        email: '',
        phone: '',
        zone: '',
        plan: 'pro',
        projectType: projectTypeOptions[0],
        timeline: timelineOptions[1],
        budgetRange: budgetOptions[0],
        paymentPreference: paymentPreferenceOptions[0],
        message: '',
      })
    } catch (error) {
      setLeadError(error.message || 'No se pudo enviar tu solicitud')
    } finally {
      setLeadSubmitting(false)
    }
  }

  return (
    <>
      <section className="section featured-search-section" id="inicio">
        <div className="section-heading narrow">
          <h2>Diseñá tu compra ideal para la obra, no solo una búsqueda más.</h2>
          <p>Buscá productos para compra directa o creá una ruta personalizada para comprar con más claridad.</p>
        </div>
        <div className="featured-search-panel">
          <div className="featured-search-panel-head">
            <span className="featured-search-panel-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="featured-search-panel-title">Buscador inteligente de productos</p>
              <small>Compará en segundos por nombre, categoría o marca.</small>
            </div>
          </div>

          <div className="catalog-search-wrap">
            <label htmlFor="featured-search" className="catalog-search-label">
              Buscar en destacados
            </label>
            <form className="catalog-search-form" onSubmit={handleFeaturedSearchSubmit}>
              <div className="catalog-search-control">
                <span className="catalog-search-leading-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M11 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  id="featured-search"
                  className="catalog-search-input"
                  type="search"
                  placeholder="Ej: Cemento, Taladro, Pintura..."
                  value={featuredSearchInput}
                  autoComplete="off"
                  onFocus={() => setShowFeaturedSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFeaturedSuggestions(false), 120)}
                  onChange={(event) => {
                    setFeaturedSearchInput(event.target.value)
                    setShowFeaturedSuggestions(true)
                  }}
                  disabled={isSearching}
                />
                {featuredSearchInput && (
                  <button
                    type="button"
                    className="catalog-search-clear"
                    onClick={clearFeaturedSearch}
                    aria-label="Limpiar búsqueda"
                    disabled={isSearching}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}

                {showFeaturedSuggestions && !isSearching && featuredSuggestions.length > 0 && (
                  <ul className="catalog-search-suggestions" role="listbox" aria-label="Sugerencias de búsqueda">
                    {featuredSuggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          className="catalog-search-suggestion-btn"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectFeaturedSuggestion(suggestion)}
                        >
                          <span className="catalog-search-suggestion-text">{suggestion.label}</span>
                          <span
                            className={`catalog-search-suggestion-tag${
                              suggestion.type === 'Buscar'
                                ? ' catalog-search-suggestion-tag--search'
                                : suggestion.type === 'Reciente'
                                  ? ' catalog-search-suggestion-tag--recent'
                                  : ''
                            }`}
                          >
                            {suggestion.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" className="catalog-search-submit" disabled={isSearching}>
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </form>
          </div>

          <div className="featured-search-chips" aria-label="Búsquedas rápidas">
            {quickSearchTerms.map((term) => (
              <button
                key={term}
                type="button"
                className="featured-search-chip"
                onClick={() => handleQuickSearch(term)}
                disabled={isSearching}
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {isSearching && (
          <div className="search-loading-card" role="status" aria-live="polite">
            <div className="search-loading-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="36" height="36">
                <path d="M3 11 12 4l9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-9Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p>Buscando productos en construcción...</p>
            <small>Estamos preparando resultados para vos.</small>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link to="/explorar" className="ghost-link" style={{ display: 'inline-flex' }}>
            Ir al catálogo completo →
          </Link>
        </div>

        <div className="search-trust-row" aria-label="Beneficios de compra">
          <span className="verified-badge">Compra directa</span>
          <span className="top-rated-badge">Proveedores verificados</span>
          <span className="fast-shipping-badge">Seguimiento de pedido</span>
        </div>

        <div className="payment-confidence-panel" aria-label="Opciones de pago disponibles">
          <p className="payment-confidence-title">Pagá como te quede mejor</p>
          <div className="payment-confidence-grid">
            {paymentHighlights.map((payment) => (
              <article key={payment.title} className="payment-confidence-card">
                <h3>{payment.title}</h3>
                <p>{payment.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section journey-studio-section" id="journey-studio">
        <div className="section-heading narrow-left">
          <span className="eyebrow">Journey Studio</span>
          <h2>Una experiencia de compra que se adapta al momento real de tu obra.</h2>
          <p>Elegí una ruta y activá una guía personalizada para convertir visitas en decisiones de compra.</p>
        </div>

        <div className="journey-track-grid" role="tablist" aria-label="Rutas de compra">
          {journeyTracks.map((track) => (
            <button
              key={track.id}
              type="button"
              className={`journey-track-card${activeTrackId === track.id ? ' journey-track-card--active' : ''}`}
              onClick={() => activateTrack(track)}
            >
              <span className="journey-track-pill">{track.plan === 'premium' ? 'Atención Premium' : 'Atención Pro'}</span>
              <h3>{track.title}</h3>
              <p>{track.subtitle}</p>
              <small>{track.audience}</small>
            </button>
          ))}
        </div>

        <div className="journey-playbook" aria-live="polite">
          <div>
            <p className="card-kicker">Playbook activo</p>
            <h3>{activeTrack.title}</h3>
            <p>{activeTrack.subtitle}</p>
          </div>
          <ul>
            {activeTrack.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" className="primary-link large-link lead-submit-btn" onClick={startGuidedLeadCapture}>
            Activar esta ruta para mi proyecto
          </button>
        </div>
      </section>

      <section className="section featured-section" id="featured-results">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Productos destacados</span>
            <h2>Elegí materiales y herramientas para avanzar tu obra hoy mismo.</h2>
          </div>
          <Link to="/explorar" className="ghost-link">
            Ver catálogo completo →
          </Link>
        </div>

        <div className="products-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/explorar" className="primary-link large-link" style={{ display: 'inline-flex' }}>
            Explorar todos los productos
          </Link>
        </div>
      </section>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Comprá simple, rápido y con respaldo</span>
          <h1>Tu obra, tu ritmo: una experiencia pensada para decidir mejor.</h1>
          <p className="hero-text">
            MercadObra combina catálogo, comparación y asesoría en un mismo flujo para que cada visita
            avance hacia una compra real, sin fricción y con contexto.
          </p>
          <div className="hero-actions">
            <Link to="/explorar" className="primary-link large-link">Explorar productos</Link>
            <a href="#contacto" className="ghost-link large-link">Quiero cotizar mi proyecto</a>
          </div>
          <p className="hero-secondary-link">
            ¿Sos proveedor? <Link to="/proveedor/login">Ingresá acá</Link>.
          </p>
          <ul className="metrics" aria-label="Indicadores principales">
            {metrics.map((item) => (
              <li key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-card">
          <div className="hero-card-badge">Nueva plataforma</div>
          <img src={logoImg} className="hero-logo" alt="Logo MercadObra" />
          <img src={heroImg} alt="Ilustración de materiales y herramientas de obra" />
          <div className="hero-card-content">
            <p className="card-kicker">Pensado para particulares</p>
            <h2>Buscá, compará y comprá con tranquilidad para cada etapa de tu proyecto.</h2>
            <p>Desde obra gruesa hasta terminaciones, encontrá todo en un solo lugar con proveedores reales.</p>
          </div>
        </div>
      </section>

      <section className="info-strip">
        <p>MercadObra está diseñado para que clientes particulares compren materiales de construcción con más claridad, confianza y velocidad.</p>
      </section>

      <section className="section" id="categorias">
        <div className="section-heading">
          <span className="eyebrow">Categorías destacadas</span>
          <h2>Todo lo que tu obra necesita, organizado para decidir mejor.</h2>
        </div>
        <div className="categories-grid">
          {categories.map((cat) => (
            <article key={cat.title} className="category-card">
              <h3>{cat.title}</h3>
              <p>{cat.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-alt" id="como-funciona">
        <div className="section-heading narrow">
          <span className="eyebrow">Cómo funciona</span>
          <h2>Comprar materiales online nunca fue tan simple.</h2>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <span>01</span>
            <h3>Buscá lo que necesitás</h3>
            <p>Filtrá por producto, categoría o proveedor y encontrá opciones rápido.</p>
          </article>
          <article className="step-card">
            <span>02</span>
            <h3>Compará y consultá</h3>
            <p>Revisá precios, disponibilidad y resolvé dudas antes de concretar la compra.</p>
          </article>
          <article className="step-card">
            <span>03</span>
            <h3>Comprá y hacé seguimiento</h3>
            <p>Elegí tu proveedor y seguí el estado del pedido hasta la entrega.</p>
          </article>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="section-heading narrow">
          <span className="eyebrow">Por qué MercadObra</span>
          <h2>Una experiencia de compra pensada para clientes particulares.</h2>
        </div>
        <div className="benefits-panel">
          <ul className="benefits-list">
            {benefits.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <aside className="highlight-box">
            <p className="card-kicker">Ideal para</p>
            <h3>Quienes construyen, reforman o equipan su hogar por primera vez.</h3>
            <p>MercadObra te da contexto para comprar con confianza, sin tecnicismos innecesarios y con acceso directo a proveedores.</p>
          </aside>
        </div>
      </section>

      <section className="section testimonios-section" id="testimonios">
        <div className="section-heading">
          <span className="eyebrow">Lo que dicen nuestros clientes</span>
          <h2>Experiencias reales de compra en MercadObra</h2>
        </div>

        <div className="testimonios-grid">
          {testimonios.map((test, idx) => (
            <div key={idx} className="testimonio-card">
              <div className="testimonio-rating">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`star${i < test.rating ? ' star--filled' : ''}`}>★</span>
                ))}
              </div>
              <p className="testimonio-text">"{test.text}"</p>
              <div className="testimonio-author">
                <div>
                  <p className="author-name">{test.name}</p>
                  <p className="author-company">{test.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section cta-section" id="contacto" ref={leadSectionRef}>
        <span className="eyebrow">Lead Concierge</span>
        <h2>Convertí tu interés en un plan de compra accionable.</h2>
        <p>Dejanos tus datos y recibí una guía inicial según etapa, plazo y presupuesto de tu proyecto.</p>

        <form className="lead-form" onSubmit={handleLeadSubmit}>
          <div className="lead-form-grid">
            <label className="form-field" htmlFor="lead-name">
              <span className="form-label">Nombre y apellido</span>
              <input
                id="lead-name"
                name="name"
                className="form-input"
                value={leadForm.name}
                onChange={handleLeadInputChange}
                required
              />
            </label>

            <label className="form-field" htmlFor="lead-company">
              <span className="form-label">Empresa o particular</span>
              <input
                id="lead-company"
                name="company"
                className="form-input"
                value={leadForm.company}
                onChange={handleLeadInputChange}
                placeholder="Ej: Cliente particular"
              />
            </label>

            <label className="form-field" htmlFor="lead-email">
              <span className="form-label">Email</span>
              <input
                id="lead-email"
                name="email"
                type="email"
                className="form-input"
                value={leadForm.email}
                onChange={handleLeadInputChange}
                required
              />
            </label>

            <label className="form-field" htmlFor="lead-phone">
              <span className="form-label">Teléfono</span>
              <input
                id="lead-phone"
                name="phone"
                className="form-input"
                value={leadForm.phone}
                onChange={handleLeadInputChange}
                required
              />
            </label>

            <label className="form-field" htmlFor="lead-zone">
              <span className="form-label">Zona</span>
              <input
                id="lead-zone"
                name="zone"
                className="form-input"
                value={leadForm.zone}
                onChange={handleLeadInputChange}
                placeholder="Ej: CABA, Zona Norte"
              />
            </label>

            <label className="form-field" htmlFor="lead-plan">
              <span className="form-label">Nivel de acompañamiento</span>
              <select
                id="lead-plan"
                name="plan"
                className="form-input"
                value={leadForm.plan}
                onChange={handleLeadInputChange}
                required
              >
                <option value="pro">Pro · guía y comparación</option>
                <option value="premium">Premium · respuesta prioritaria</option>
              </select>
            </label>

            <label className="form-field" htmlFor="lead-project-type">
              <span className="form-label">Tipo de proyecto</span>
              <select
                id="lead-project-type"
                name="projectType"
                className="form-input"
                value={leadForm.projectType}
                onChange={handleLeadInputChange}
              >
                {projectTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="form-field" htmlFor="lead-timeline">
              <span className="form-label">Plazo estimado</span>
              <select
                id="lead-timeline"
                name="timeline"
                className="form-input"
                value={leadForm.timeline}
                onChange={handleLeadInputChange}
              >
                {timelineOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="form-field" htmlFor="lead-budget-range">
              <span className="form-label">Presupuesto aproximado</span>
              <select
                id="lead-budget-range"
                name="budgetRange"
                className="form-input"
                value={leadForm.budgetRange}
                onChange={handleLeadInputChange}
              >
                {budgetOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="form-field" htmlFor="lead-payment-preference">
              <span className="form-label">Medio de pago preferido</span>
              <select
                id="lead-payment-preference"
                name="paymentPreference"
                className="form-input"
                value={leadForm.paymentPreference}
                onChange={handleLeadInputChange}
              >
                {paymentPreferenceOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field" htmlFor="lead-message">
            <span className="form-label">Mensaje (opcional)</span>
            <textarea
              id="lead-message"
              name="message"
              className="form-input lead-form-textarea"
              value={leadForm.message}
              onChange={handleLeadInputChange}
              rows={4}
              placeholder="Contanos qué querés resolver primero en tu obra"
            />
          </label>

          {leadError && <p className="input-error" role="alert">{leadError}</p>}
          {leadSuccess && <p className="input-success" role="status">{leadSuccess}</p>}

          <div className="hero-actions centered-actions">
            <button type="submit" className="primary-link large-link lead-submit-btn" disabled={leadSubmitting}>
              {leadSubmitting ? 'Enviando...' : 'Quiero mi plan de compra personalizado'}
            </button>
            <button type="button" className="whatsapp-direct-btn" onClick={openLeadWhatsapp}>
              Hablar por WhatsApp ahora
            </button>
          </div>

          <p className="whatsapp-direct-hint">Canal comercial directo para respuesta rápida por WhatsApp.</p>
        </form>
      </section>
    </>
  )
}
