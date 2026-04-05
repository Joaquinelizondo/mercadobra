import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroImg from '../assets/hero.png'
import logoImg from '../assets/mercadobra.png'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import { createLead } from '../lib/api'

const categories = [
  { title: 'Hormigón y áridos', description: 'Publicá cemento, arena, piedra, bloques y soluciones para obra gruesa.' },
  { title: 'Hierro y estructuras', description: 'Conectá con constructoras que buscan perfiles, mallas, chapas y caños.' },
  { title: 'Terminaciones', description: 'Mostrá pisos, revestimientos, pinturas, sanitarios y grifería.' },
  { title: 'Herramientas y seguridad', description: 'Ofrecé maquinaria, elementos de protección y equipamiento profesional.' },
]

const benefits = [
  'Perfil profesional para empresas, barracas y distribuidores.',
  'Catálogo digital para exhibir productos con fotos, precios y stock.',
  'Consultas directas para generar ventas y relaciones comerciales.',
  'Mayor visibilidad en un portal pensado para el mundo de la construcción.',
]

const metrics = [
  { value: '+500', label: 'productos destacados' },
  { value: '24/7', label: 'vidriera online activa' },
  { value: 'B2B', label: 'enfoque comercial para obra y barraca' },
]

const testimonios = [
  {
    name: 'Juan García',
    company: 'Corralón La Obra',
    text: 'Con MercadObra triplicamos nuestras consultas en los primeros 3 meses. Nuestros clientes habituales ahora nos encuentran fácilmente online.',
    rating: 5
  },
  {
    name: 'María López',
    company: 'Revestimientos Pro',
    text: 'Excelente plataforma para mostrar nuestro catálogo. El sistema de filtros por zona es muy útil para llegar a constructoras locales.',
    rating: 5
  },
  {
    name: 'Carlos Mendez',
    company: 'HerramientasXL',
    text: 'La integración con nuestro sistema es simple. Recibimos consultas de calidad y hemos cerrado varias ventas importantes.',
    rating: 4
  }
]

const RECENT_SEARCHES_KEY = 'mercadobra-recent-searches'

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
    message: '',
  })
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadError, setLeadError] = useState('')
  const [leadSuccess, setLeadSuccess] = useState('')
  const searchTimerRef = useRef(null)
  const featured = productList.slice(0, 6)
  const normalizedFeaturedInput = featuredSearchInput.trim().toLowerCase()

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
    }, 3000)
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

  function handleLeadInputChange(event) {
    const { name, value } = event.target
    setLeadForm((previous) => ({
      ...previous,
      [name]: value,
    }))
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
      await createLead(leadForm)
      setLeadSuccess('¡Gracias! Recibimos tu solicitud y te contactamos a la brevedad.')
      setLeadForm({
        name: '',
        company: '',
        email: '',
        phone: '',
        zone: '',
        plan: 'pro',
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
          <h2>Comprá los mejores materiales para tu construcción ahora.</h2>
          <p>Buscá productos para compra directa o consultá al proveedor en segundos.</p>
        </div>
        <div className="catalog-search-wrap">
          <label htmlFor="featured-search" className="catalog-search-label">
            Buscar en destacados
          </label>
          <form className="catalog-search-form" onSubmit={handleFeaturedSearchSubmit}>
            <div className="catalog-search-control">
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
      </section>

      <section className="section featured-section" id="featured-results">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Productos destacados</span>
            <h2>Empezá tu sueño hoy: comprá materiales para tu obra.</h2>
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
          <span className="eyebrow">Tu empresa, visible para toda la obra</span>
          <h1>La vitrina digital donde barracas y empresas venden materiales de construcción.</h1>
          <p className="hero-text">
            MercadObra conecta proveedores con clientes del rubro para que puedan
            descubrir, comparar y consultar productos de forma simple, rápida y profesional.
          </p>
          <div className="hero-actions">
            <a href="/#contacto" className="primary-link large-link">
              Quiero publicar mi catálogo
            </a>
            <a href="/#como-funciona" className="ghost-link large-link">
              Cómo funciona
            </a>
          </div>
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
            <p className="card-kicker">Pensado para el sector</p>
            <h2>Mostrá tus productos, generá contactos y hacé crecer tu presencia online.</h2>
            <p>Desde hierro y áridos hasta terminaciones y herramientas, todo en un solo lugar.</p>
          </div>
        </div>
      </section>

      <section className="info-strip">
        <p>MercadObra nace para impulsar la venta digital de materiales, herramientas y soluciones para la construcción.</p>
      </section>

      <section className="section" id="categorias">
        <div className="section-heading">
          <span className="eyebrow">Categorías destacadas</span>
          <h2>Todo lo que una obra necesita, organizado para vender mejor.</h2>
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
          <h2>Una presencia digital simple para empresas y barracas.</h2>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <span>01</span>
            <h3>Creá tu perfil</h3>
            <p>Presentá tu empresa, ubicación, rubro y datos de contacto profesionales.</p>
          </article>
          <article className="step-card">
            <span>02</span>
            <h3>Publicá productos</h3>
            <p>Subí fotos, precios, descripciones y destacá el stock o condiciones comerciales.</p>
          </article>
          <article className="step-card">
            <span>03</span>
            <h3>Recibí consultas</h3>
            <p>Conectá con clientes interesados en materiales para obra, reforma o mantenimiento.</p>
          </article>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="section-heading narrow-left">
          <span className="eyebrow">Por qué MercadObra</span>
          <h2>Una plataforma creada para tu empresa y para el ritmo del rubro.</h2>
        </div>
        <div className="benefits-panel">
          <ul className="benefits-list">
            {benefits.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <aside className="highlight-box">
            <p className="card-kicker">Ideal para</p>
            <h3>Barracas, corralones, importadores, fabricantes y distribuidores.</h3>
            <p>Si vendés productos para la construcción, MercadObra te ayuda a mostrar tu oferta de manera clara y profesional.</p>
          </aside>
        </div>
      </section>

      <section className="section testimonios-section" id="testimonios">
        <div className="section-heading">
          <span className="eyebrow">Lo que dicen nuestros proveedores</span>
          <h2>Historias de éxito en MercadObra</h2>
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

      <section className="section cta-section" id="contacto">
        <span className="eyebrow">Sumate desde el inicio</span>
        <h2>Activá tu plan Pro o Premium para publicar tu catálogo.</h2>
        <p>Completá este formulario y el equipo comercial te contacta para iniciar tu alta en MercadObra.</p>

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
              <span className="form-label">Empresa</span>
              <input
                id="lead-company"
                name="company"
                className="form-input"
                value={leadForm.company}
                onChange={handleLeadInputChange}
                required
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
              <span className="form-label">Plan</span>
              <select
                id="lead-plan"
                name="plan"
                className="form-input"
                value={leadForm.plan}
                onChange={handleLeadInputChange}
                required
              >
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
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
              placeholder="Contanos qué tipo de productos querés publicar"
            />
          </label>

          {leadError && <p className="input-error" role="alert">{leadError}</p>}
          {leadSuccess && <p className="input-success" role="status">{leadSuccess}</p>}

          <div className="hero-actions centered-actions">
            <button type="submit" className="primary-link large-link lead-submit-btn" disabled={leadSubmitting}>
              {leadSubmitting ? 'Enviando...' : 'Solicitar alta Pro/Premium'}
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
