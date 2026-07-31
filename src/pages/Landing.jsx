import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroImg from '../assets/hero.png'
import logoImg from '../assets/mercadobra.png'
import { useProducts } from '../context/ProductContext'
import { useAuth } from '../context/AuthContext'
import { createProduct } from '../lib/api'
import ProductCard from '../components/ProductCard'
import { createLead, createSearchContact } from '../lib/api'
import { useSpeechInput } from '../hooks/useSpeechInput'
import { createWhatsAppLink } from '../utils/whatsapp'
import GroupQuoteWidget from '../components/GroupQuoteWidget'

const categories = [
  { title: 'Hormigón y áridos', description: 'Cemento, arena, piedra y bloques en un solo lugar.' },
  { title: 'Hierro y estructuras', description: 'Perfiles, mallas, chapas y caños sin perder tiempo.' },
  { title: 'Terminaciones', description: 'Pisos, revestimientos, pinturas y grifería para cerrar bien la obra.' },
  { title: 'Herramientas y seguridad', description: 'Herramientas y protección confiable para trabajar tranquilo.' },
]

const benefits = [
  'Compará precios en minutos.',
  'Contactá proveedores verificados al toque.',
  'Guardá favoritos y decidí tranquilo.',
  'Seguí tu pedido paso a paso.',
]

const metrics = [
  { value: '+500', label: 'productos para tu obra' },
  { value: '24/7', label: 'catálogo siempre abierto' },
  { value: '1 clic', label: 'para hablar con proveedores' },
]

const testimonios = [
  {
    name: 'Lucía Martínez',
    company: 'Remodelación de cocina',
    text: 'Comparé materiales y cerré toda la compra de la cocina desde casa. El contacto con proveedores fue rapidísimo y re claro.',
    rating: 5
  },
  {
    name: 'Nicolás Rojas',
    company: 'Ampliación familiar',
    text: 'Conseguí hierro, cemento y herramientas en un toque. Ahorré tiempo y elegí por precio y disponibilidad sin marearme.',
    rating: 5
  },
  {
    name: 'Agustina Pérez',
    company: 'Refacción de baño',
    text: 'El seguimiento del pedido me dio mucha tranquilidad. Para una obra chica, te cambia todo comprar así de claro.',
    rating: 4
  }
]

const journeyTracks = [
  {
    id: 'express',
    title: 'Ruta Express 72h',
    subtitle: 'Para resolver compras urgentes sin perder el control del precio.',
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
    subtitle: 'Para comparar opciones y estirar cada peso de tu obra.',
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
    subtitle: 'Para obras por etapas con compras bien ordenadas.',
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

const quickSearchTerms = ['Cemento', 'Hierro', 'Arena', 'Pintura', 'Taladro']

const ESTIMATOR_PROFILES = {
  pintar: {
    label: 'Pintar ambientes',
    keywords: ['Pintura', 'Rodillo', 'Sellador'],
    calc(area) {
      const paintBuckets = Math.max(1, Math.ceil(area / 40))
      return [
        `${paintBuckets} balde(s) de latex interior`,
        `${Math.max(1, Math.ceil(area / 25))} sellador(es)`,
        'Kit rodillo + bandeja',
      ]
    },
  },
  bano: {
    label: 'Refaccion de bano',
    keywords: ['Griferia', 'Porcelanato', 'Sanitarios'],
    calc(area) {
      const porcelanato = Math.max(4, Math.ceil(area * 1.2))
      return [
        `${porcelanato} m2 de porcelanato`,
        `${Math.max(2, Math.ceil(area / 8))} bolsa(s) de adhesivo`,
        'Set griferia + accesorios',
      ]
    },
  },
  base: {
    label: 'Base para obra chica',
    keywords: ['Cemento', 'Arena', 'Piedra'],
    calc(area) {
      const cementBags = Math.max(4, Math.ceil(area / 6))
      return [
        `${cementBags} bolsa(s) de cemento`,
        `${Math.max(1, Math.ceil(area / 20))} m3 de arena`,
        `${Math.max(1, Math.ceil(area / 24))} m3 de piedra`,
      ]
    },
  },
}

const RECENT_SEARCHES_KEY = 'mercadobra-recent-searches'

export default function Landing() {
  const { adminUser, adminToken } = useAuth()
  const [addProductForm, setAddProductForm] = useState({
    name: '',
    price: '',
    company: '',
    unit: '',
    category: '',
    stock: '',
    image: '',
    description: '',
  })
  const [addProductLoading, setAddProductLoading] = useState(false)
  const [addProductError, setAddProductError] = useState('')
  const [addProductSuccess, setAddProductSuccess] = useState('')
  const navigate = useNavigate()
  const { productList, addProduct } = useProducts()
  const [featuredSearchInput, setFeaturedSearchInput] = useState('')
  const [featuredChips, setFeaturedChips] = useState([])
  const [showFeaturedSuggestions, setShowFeaturedSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchCaptureOpen, setSearchCaptureOpen] = useState(false)
  const [searchCaptureSending, setSearchCaptureSending] = useState(false)
  const [searchCaptureError, setSearchCaptureError] = useState('')
  const [pendingSearchTerm, setPendingSearchTerm] = useState('')
  const [searchContactForm, setSearchContactForm] = useState({ name: '', email: '', phone: '' })
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
  const [estimatorProject, setEstimatorProject] = useState('pintar')
  const [estimatorArea, setEstimatorArea] = useState(30)
  const [estimatorBudget, setEstimatorBudget] = useState('medio')
  const [quotedProducts, setQuotedProducts] = useState(() => {
    try {
      const stored = localStorage.getItem('quotedProducts')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const searchTimerRef = useRef(null)
  // ...resto del código...
  // Definir variables derivadas necesarias para el render
  const featured = useMemo(() => productList.slice(0, 8), [productList])

  // Cruzar productos cotizados con el catálogo
  const quotedMatches = useMemo(() => {
    if (!Array.isArray(quotedProducts) || quotedProducts.length === 0) return { found: [], notFound: [] };
    const found = [];
    const notFound = [];
    quotedProducts.forEach(q => {
      // Búsqueda simple: incluye si el nombre del producto del catálogo contiene el texto cotizado (case-insensitive)
      const match = productList.find(p => p.name.toLowerCase().includes(q.toLowerCase()));
      if (match) found.push(match);
      else notFound.push(q);
    });
    return { found, notFound };
  }, [quotedProducts, productList]);
  const activeTrack = useMemo(() => journeyTracks.find((t) => t.id === activeTrackId) || journeyTracks[0], [activeTrackId])
  const estimatorResult = useMemo(() => {
    const profile = ESTIMATOR_PROFILES[estimatorProject] || ESTIMATOR_PROFILES.pintar
    return {
      title: profile.label,
      keywords: profile.keywords,
      items: profile.calc(estimatorArea),
      suggestedBudget: estimatorArea * (estimatorBudget === 'bajo' ? 2500 : estimatorBudget === 'alto' ? 6000 : 4000),
    }
  }, [estimatorProject, estimatorArea, estimatorBudget])
  const leadSectionRef = useRef(null)

  async function handleAddProductSubmit(e) {
    e.preventDefault()
    setAddProductError('')
    setAddProductSuccess('')
    setAddProductLoading(true)
    try {
      // Siempre pasar providerId: null si es admin
      const payload = {
        ...addProductForm,
        providerId: null,
      }
      const { message } = await addProduct(payload, null, adminToken)
      setAddProductSuccess(message || 'Artículo guardado correctamente y visible en el catálogo.')
      setAddProductForm({ name: '', price: '', company: '', unit: '', category: '', stock: '', image: '', description: '' })
    } catch (err) {
      setAddProductError(err.message || 'Error al agregar producto')
    } finally {
      setAddProductLoading(false)
    }
  }

  function handleAddProductInput(e) {
    setAddProductForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  return (
    <>
      {/* Sección solo visible para admin */}
      {adminUser && (
        <section className="section admin-add-product" style={{maxWidth: 820, margin: '2.5rem auto 2rem auto', background: '#f1f5f9', borderRadius: 18, border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px 0 rgba(30,144,255,0.04)', padding: '1.5rem 2rem'}}>
          <h3 style={{color: '#22223b', fontWeight: 800, fontSize: '1.2rem', marginBottom: 12}}>Agregar producto de proveedor</h3>
          <form onSubmit={handleAddProductSubmit} style={{display: 'flex', flexWrap: 'wrap', gap: 16}}>
            <input name="name" value={addProductForm.name} onChange={handleAddProductInput} placeholder="Nombre" required style={{flex: '1 1 180px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <input name="price" value={addProductForm.price} onChange={handleAddProductInput} placeholder="Precio" type="number" min="0" required style={{flex: '1 1 120px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <input name="company" value={addProductForm.company} onChange={handleAddProductInput} placeholder="Proveedor" required style={{flex: '1 1 140px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <input name="unit" value={addProductForm.unit} onChange={handleAddProductInput} placeholder="Unidad (ej: bolsa, m³)" required style={{flex: '1 1 100px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <input name="category" value={addProductForm.category} onChange={handleAddProductInput} placeholder="Categoría" required style={{flex: '1 1 120px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <input name="stock" value={addProductForm.stock} onChange={handleAddProductInput} placeholder="Stock" type="number" min="0" required style={{flex: '1 1 80px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <input name="image" value={addProductForm.image} onChange={handleAddProductInput} placeholder="URL imagen (opcional)" style={{flex: '2 1 220px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <input name="description" value={addProductForm.description} onChange={handleAddProductInput} placeholder="Descripción" style={{flex: '2 1 220px', padding: 8, borderRadius: 8, border: '1px solid #ccc'}} />
            <button type="submit" disabled={addProductLoading} style={{padding: '10px 24px', borderRadius: 8, background: '#fb923c', color: '#fff', fontWeight: 700, border: 'none', marginTop: 8}}>
              {addProductLoading ? 'Agregando...' : 'Agregar producto'}
            </button>
          </form>
          {addProductError && <div style={{color: '#e74c3c', marginTop: 8}}>{addProductError}</div>}
          {addProductSuccess && (
            <div style={{
              background: '#d1fae5',
              color: '#065f46',
              border: '1.5px solid #10b981',
              borderRadius: 10,
              padding: '10px 18px',
              marginTop: 12,
              fontWeight: 700,
              fontSize: '1.08em',
              boxShadow: '0 2px 8px 0 rgba(16,185,129,0.07)'
            }}>
              <span style={{marginRight: 8}}>✅</span>Artículo guardado correctamente y visible en el catálogo.
            </div>
          )}
        </section>
      )}
        {/*
          Los productos agregados por admin se integran al catálogo principal automáticamente,
          ya que el contexto de productos se actualiza desde el backend.
          Si quieres forzar el refresco tras agregar, puedes llamar a getProducts() tras éxito.
        */}
        {/* Refrescar productos tras agregar uno nuevo */}
        {addProductSuccess && typeof getProducts === 'function' && getProducts()}
      {/* Cotizador grupal premium (primer bloque visible) */}

      <section className="section group-quote-section" id="cotizador-grupal">
        <GroupQuoteWidget onSuccess={prods => {
          if (prods && prods.length > 0) {
            setQuotedProducts(prods)
            try {
              localStorage.setItem('quotedProducts', JSON.stringify(prods))
            } catch {}
          }
        }} />
      </section>

      {/* Productos cotizados arriba de los destacados */}
      <section className="section quoted-results-section" id="productos-cotizados" style={{maxWidth: 820, margin: '0 auto 2.5rem auto', background: '#fff7ed', borderRadius: 18, border: '1.5px solid #fb923c', boxShadow: '0 2px 8px 0 rgba(251,146,60,0.07)', padding: '1.5rem 2rem'}}>
        <header className="quoted-results-heading">
          <span>Selección para tu obra</span>
          <h2>Estos son los mejores artículos para tu búsqueda</h2>
          <p>Elegimos las opciones del catálogo que mejor coinciden con tu cotización.</p>
        </header>
        {quotedProducts.length === 0 ? (
          <div style={{color: '#b45309', fontWeight: 500, fontSize: '1.08em', padding: '0.7rem 0'}}>No hay productos similares en el catálogo. Te avisaremos cuando haya novedades.</div>
        ) : (
          <>
            {quotedMatches.found.length > 0 && (
              <div className="products-grid" style={{marginBottom: 16}}>
                {quotedMatches.found.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
            {quotedMatches.notFound.length > 0 && (
              <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                {quotedMatches.notFound.map((prod, idx) => (
                  <li key={prod + idx} style={{background: '#fff', borderRadius: 8, marginBottom: 8, padding: '0.7rem 1.1rem', color: '#b45309', fontWeight: 700, fontSize: '1.08em', boxShadow: '0 1px 4px 0 rgba(251,146,60,0.04)'}}>
                    {prod} <span style={{color:'#e74c3c', fontWeight:400, fontSize:'0.97em'}}>(no disponible en catálogo)</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Productos destacados */}
      <section className="section featured-section" id="featured-results">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Productos destacados</span>
            <h2>Materiales y herramientas para avanzar hoy mismo.</h2>
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
            Ver todo el catalogo
          </Link>
        </div>
      </section>

      {/* Campos de obra destacados debajo del cotizador */}
      <section className="section cta-section" id="contacto" ref={leadSectionRef}>
        <span className="eyebrow">Te acompañamos de verdad</span>
        <h2>Contanos tu proyecto y te armamos un plan claro.</h2>
        <p>Sin vueltas: etapa, tiempos y presupuesto en una sola charla.</p>
        <form className="lead-form" onSubmit={handleLeadSubmit}>
          <div className="lead-form-grid">
            {/* ...existing code for form fields... */}
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
              {leadSubmitting ? 'Enviando...' : 'Quiero mi plan'}
            </button>
            <button type="button" className="whatsapp-direct-btn" onClick={openLeadWhatsapp}>
              Hablar por WhatsApp
            </button>
          </div>
          <p className="whatsapp-direct-hint">Te respondemos rapido por WhatsApp.</p>
        </form>
      </section>
    </>
  )
}

  function handleFeaturedSearchSubmit(event) {
    event.preventDefault()
    let terms = [...featuredChips]
    if (featuredSearchInput.trim()) {
      terms.push(featuredSearchInput.trim())
    }
    const query = terms.join(' ')
    if (!query) {
      startFeaturedSearch('')
      return
    }
    setPendingSearchTerm(query)
    setSearchCaptureError('')
    setSearchCaptureOpen(true)
  }

  function selectFeaturedSuggestion(suggestion) {
    setFeaturedSearchInput(suggestion.value)
    startFeaturedSearch(suggestion.value)
  }

  function clearFeaturedSearch() {
    setFeaturedSearchInput('')
    setShowFeaturedSuggestions(false)
    clearVoiceError()
  }

  function handleVoiceSearch() {
    if (isVoiceListening) {
      stopListening()
      return
    }

    clearVoiceError()
    startListening()
  }

  function handleQuickSearch(term) {
    setFeaturedSearchInput(term)
    startFeaturedSearch(term)
  }

  function closeSearchCapture() {
    setSearchCaptureOpen(false)
    setSearchCaptureError('')
    setPendingSearchTerm('')
    setSearchContactForm({ name: '', email: '', phone: '' })
  }

  async function handleSearchCaptureSubmit() {
    const term = pendingSearchTerm.trim()

    if (!term) {
      closeSearchCapture()
      return
    }

    setSearchCaptureSending(true)
    setSearchCaptureError('')

    try {
      const normalizedName = searchContactForm.name.trim()
      const normalizedEmail = searchContactForm.email.trim()
      const normalizedPhone = searchContactForm.phone.trim()

      if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        closeSearchCapture()
        startFeaturedSearch(term)
        return
      }

      try {
        await createSearchContact({
          searchTerm: term,
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          source: 'featured-search',
        })
      } catch (error) {
        // Search should continue even if optional capture fails.
        console.warn('search contact capture failed:', error?.message || error)
      }

      closeSearchCapture()
      startFeaturedSearch(term)
    } finally {
      setSearchCaptureSending(false)
    }
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
    const href = createWhatsAppLink({
      intent: 'cotizar',
      source: 'landing-lead-form',
      data: {
        route: activeTrack.title,
        name: leadForm.name,
        company: leadForm.company,
        phone: leadForm.phone,
        email: leadForm.email,
        zone: leadForm.zone,
        projectType: leadForm.projectType,
        timeline: leadForm.timeline,
        budget: leadForm.budgetRange,
        paymentPreference: leadForm.paymentPreference,
        message: leadForm.message,
      },
    })

    window.open(href, '_blank', 'noopener,noreferrer')
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
        source: 'landing-lead-form',
        company: fallbackCompany,
        message: [leadForm.message.trim(), brief].filter(Boolean).join('\n\n'),
      })
      setLeadSuccess('Listo, ya recibimos tu solicitud. Te escribimos en breve.')
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

  function openEstimatorResults() {
    const query = estimatorResult.keywords.join(' ')
    navigate(`/explorar?q=${encodeURIComponent(query)}`)
  }

  // No debe haber un return vacío ni un cierre de bloque extra aquí.
