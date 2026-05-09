import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroImg from '../assets/hero.png'
import logoImg from '../assets/mercadobra.png'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import { createLead, createSearchContact } from '../lib/api'
import { useSpeechInput } from '../hooks/useSpeechInput'
import { createWhatsAppLink } from '../utils/whatsapp'

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
  const navigate = useNavigate()
  const { productList } = useProducts()
  const [featuredSearchInput, setFeaturedSearchInput] = useState('')
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
  const searchTimerRef = useRef(null)
  const leadSectionRef = useRef(null)
  const featured = productList.slice(0, 6)
  const normalizedFeaturedInput = featuredSearchInput.trim().toLowerCase()
  const {
    isSupported: isVoiceSupported,
    isListening: isVoiceListening,
    error: voiceError,
    startListening,
    stopListening,
    clearError: clearVoiceError,
  } = useSpeechInput({
    lang: 'es-AR',
    onResult: (transcript) => {
      setFeaturedSearchInput(transcript)
      setShowFeaturedSuggestions(false)
      startFeaturedSearch(transcript)
    },
  })
  const activeTrack = useMemo(
    () => journeyTracks.find((track) => track.id === activeTrackId) || journeyTracks[1],
    [activeTrackId]
  )

  const estimatorResult = useMemo(() => {
    const profile = ESTIMATOR_PROFILES[estimatorProject] || ESTIMATOR_PROFILES.pintar
    const area = Math.max(1, Number(estimatorArea) || 1)
    const factor = estimatorBudget === 'alto' ? 1.3 : estimatorBudget === 'bajo' ? 0.85 : 1
    const suggestedBudget = Math.round(area * 9500 * factor)

    return {
      title: profile.label,
      keywords: profile.keywords,
      items: profile.calc(area),
      suggestedBudget,
    }
  }, [estimatorProject, estimatorArea, estimatorBudget])

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
          label: `Cotizar "${featuredSearchInput.trim()}" en todo el catálogo`,
          value: featuredSearchInput.trim(),
          type: 'Cotizar',
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
    const term = featuredSearchInput.trim()
    if (!term) {
      startFeaturedSearch('')
      return
    }

    setPendingSearchTerm(term)
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

      if (normalizedEmail || normalizedPhone) {
        try {
          await createSearchContact({
            searchTerm: term,
            name: normalizedName,
            email: normalizedEmail,
            phone: normalizedPhone,
            source: 'featured-search',
          })
        } catch (error) {
          // Optional capture should never block the search flow.
          console.warn('search contact capture failed:', error?.message || error)
        }
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

  return (
    <>
      <section className="section featured-search-section" id="inicio">
        <h1 className="featured-search-title">Tu obra arranca aca</h1>
        <div className="featured-search-panel">
          <div className="catalog-search-wrap">
            <label htmlFor="featured-search" className="catalog-search-label">
              Escribi lo que necesitas
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
                  placeholder="Cemento, Taladro, Pintura..."
                  value={featuredSearchInput}
                  autoComplete="off"
                  onFocus={() => setShowFeaturedSuggestions(false)}
                  onBlur={() => setShowFeaturedSuggestions(false)}
                  onChange={(event) => {
                    setFeaturedSearchInput(event.target.value)
                    setShowFeaturedSuggestions(false)
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
                              suggestion.type === 'Cotizar'
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
              <button
                type="button"
                className={`catalog-search-voice-action${isVoiceListening ? ' catalog-search-voice-action--active' : ''}${!isVoiceSupported ? ' catalog-search-voice-action--unsupported' : ''}`}
                onClick={handleVoiceSearch}
                aria-label={isVoiceListening ? 'Detener búsqueda por voz' : 'Iniciar búsqueda por voz'}
                title={
                  !isVoiceSupported
                    ? 'La búsqueda por voz no está disponible en este navegador'
                    : isVoiceListening
                      ? 'Detener búsqueda por voz'
                      : 'Buscar por voz'
                }
                disabled={isSearching}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm0 0v16m-6-6a6 6 0 0 0 12 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Voz</span>
              </button>
              <button type="submit" className="catalog-search-submit" disabled={isSearching}>
                {isSearching ? 'Buscando...' : 'Ver opciones'}
              </button>
            </form>
            <p className="catalog-search-voice-status" aria-live="polite">
              {isVoiceListening
                ? 'Escuchando... hablá ahora'
                : voiceError || (isVoiceSupported
                  ? 'También podés buscar por voz'
                  : 'Este navegador no habilita búsqueda por voz. Probá Chrome/Edge en HTTPS o localhost.')}
            </p>
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
            <p>Buscando productos para tu obra...</p>
            <small>Te estamos armando resultados piola.</small>
          </div>
        )}

      </section>

      {searchCaptureOpen && (
        <div className="search-capture-modal-overlay" role="presentation" onClick={closeSearchCapture}>
          <div
            className="search-capture-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-capture-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="search-capture-title">¿Te damos una mano con esto?</h3>
            <p>Dejanos tu mail o telefono y te escribimos con opciones.</p>

            <div className="search-capture-fields">
              <label className="form-field" htmlFor="search-capture-name">
                <span className="form-label">Nombre (opcional)</span>
                <input
                  id="search-capture-name"
                  className="form-input"
                  value={searchContactForm.name}
                  onChange={(event) =>
                    setSearchContactForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  placeholder="Tu nombre"
                />
              </label>

              <label className="form-field" htmlFor="search-capture-email">
                <span className="form-label">Email (opcional)</span>
                <input
                  id="search-capture-email"
                  className="form-input"
                  type="email"
                  value={searchContactForm.email}
                  onChange={(event) =>
                    setSearchContactForm((previous) => ({ ...previous, email: event.target.value }))
                  }
                  placeholder="tuemail@gmail.com"
                />
              </label>

              <label className="form-field" htmlFor="search-capture-phone">
                <span className="form-label">Teléfono (opcional)</span>
                <input
                  id="search-capture-phone"
                  className="form-input"
                  value={searchContactForm.phone}
                  onChange={(event) =>
                    setSearchContactForm((previous) => ({ ...previous, phone: event.target.value }))
                  }
                  placeholder="+54 9 11 1234 5678"
                />
              </label>
            </div>

            {searchCaptureError && <p className="search-capture-error">{searchCaptureError}</p>}

            <div className="search-capture-actions">
              <button
                type="button"
                className="catalog-search-submit"
                onClick={handleSearchCaptureSubmit}
                disabled={searchCaptureSending}
              >
                {searchCaptureSending ? 'Cotizando...' : 'Cotizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section journey-studio-section" id="journey-studio">
        <div className="section-heading narrow-left">
          <span className="eyebrow">Modo Obra</span>
          <h2>Elegi una ruta segun el momento de tu proyecto.</h2>
          <p>Simple, clara y pensada para decidir bien.</p>
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
            <p className="card-kicker">Ruta activa</p>
            <h3>{activeTrack.title}</h3>
            <p>{activeTrack.subtitle}</p>
          </div>
          <ul>
            {activeTrack.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" className="primary-link large-link lead-submit-btn" onClick={startGuidedLeadCapture}>
            Activar esta ruta
          </button>
        </div>
      </section>

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

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Simple, claro y al grano</span>
          <h1>Tu obra, a tu manera.</h1>
          <p className="hero-text">
            Precios claros, proveedores reales y una experiencia comoda para comprar sin vueltas.
          </p>
          <div className="hero-actions">
            <Link to="/explorar" className="primary-link large-link">Explorar ahora</Link>
            <a href="#contacto" className="ghost-link large-link">Quiero ayuda para comprar</a>
          </div>
          <p className="hero-secondary-link">
            ¿Sos proveedor? <Link to="/proveedor/login">Entrá por acá</Link>.
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
            <p className="card-kicker">Pensado para personas reales</p>
            <h2>Busca, compara y compra con tranquilidad.</h2>
            <p>Desde la base hasta la terminacion, todo en un mismo lugar.</p>
          </div>
        </div>
      </section>

      <section className="info-strip">
        <p>Comprar materiales puede ser simple, rapido y con buen gusto.</p>
      </section>

      <section className="section estimator-section" id="estimador">
        <div className="estimator-head">
          <span className="eyebrow">Estimador rapido</span>
          <h2>Calcula una base para tu proyecto en menos de un minuto.</h2>
          <p>Elegi el tipo de trabajo, ajusta metros y mira una lista sugerida para arrancar.</p>
        </div>

        <div className="estimator-grid">
          <div className="estimator-controls">
            <label className="form-field" htmlFor="estimator-project">
              <span className="form-label">Que queres resolver</span>
              <select
                id="estimator-project"
                className="form-input"
                value={estimatorProject}
                onChange={(event) => setEstimatorProject(event.target.value)}
              >
                <option value="pintar">Pintar ambientes</option>
                <option value="bano">Refaccion de bano</option>
                <option value="base">Base para obra chica</option>
              </select>
            </label>

            <label className="form-field" htmlFor="estimator-area">
              <span className="form-label">Superficie estimada (m2)</span>
              <input
                id="estimator-area"
                type="range"
                min="10"
                max="180"
                step="5"
                value={estimatorArea}
                onChange={(event) => setEstimatorArea(Number(event.target.value))}
              />
              <small className="estimator-range-value">{estimatorArea} m2</small>
            </label>

            <label className="form-field" htmlFor="estimator-budget">
              <span className="form-label">Nivel de presupuesto</span>
              <select
                id="estimator-budget"
                className="form-input"
                value={estimatorBudget}
                onChange={(event) => setEstimatorBudget(event.target.value)}
              >
                <option value="bajo">Ajustado</option>
                <option value="medio">Equilibrado</option>
                <option value="alto">Premium</option>
              </select>
            </label>
          </div>

          <aside className="estimator-result" aria-live="polite">
            <p className="card-kicker">Resultado estimado</p>
            <h3>{estimatorResult.title}</h3>
            <ul>
              {estimatorResult.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="estimator-budget">Presupuesto orientativo: ARS {estimatorResult.suggestedBudget.toLocaleString('es-AR')}</p>
            <button type="button" className="primary-link large-link lead-submit-btn" onClick={openEstimatorResults}>
              Ver opciones para este plan
            </button>
          </aside>
        </div>
      </section>

      <section className="section" id="categorias">
        <div className="section-heading">
          <span className="eyebrow">Categorías destacadas</span>
          <h2>Todo lo que necesitas, ordenado para decidir facil.</h2>
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
          <h2>Comprar para la obra nunca fue tan facil.</h2>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <span>01</span>
            <h3>Buscá lo que necesitás</h3>
            <p>Filtrá por producto, categoría o proveedor y encontrá opciones al toque.</p>
          </article>
          <article className="step-card">
            <span>02</span>
            <h3>Compará y consultá</h3>
            <p>Revisá precios, disponibilidad y sacate dudas antes de cerrar la compra.</p>
          </article>
          <article className="step-card">
            <span>03</span>
            <h3>Comprá y hacé seguimiento</h3>
            <p>Elegí proveedor y seguí el pedido hasta que te llegue.</p>
          </article>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="section-heading narrow">
          <span className="eyebrow">Por qué MercadObra</span>
          <h2>Una experiencia cercana, moderna y bien hecha.</h2>
        </div>
        <div className="benefits-panel">
          <ul className="benefits-list">
            {benefits.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <aside className="highlight-box">
            <p className="card-kicker">Ideal para</p>
            <h3>Quienes construyen o reforman por primera vez.</h3>
            <p>Comprá con confianza, sin vueltas y con contacto directo.</p>
          </aside>
        </div>
      </section>

      <section className="section testimonios-section" id="testimonios">
        <div className="section-heading">
          <span className="eyebrow">Lo que cuenta la comunidad</span>
          <h2>Experiencias reales en MercadObra</h2>
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
          <span className="eyebrow">Te acompañamos de verdad</span>
          <h2>Contanos tu proyecto y te armamos un plan claro.</h2>
          <p>Sin vueltas: etapa, tiempos y presupuesto en una sola charla.</p>

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
