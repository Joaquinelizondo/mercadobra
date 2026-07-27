import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { createSearchContact } from '../lib/api'
import { formatPrice } from '../utils/format'
import '../styles/MercadoQuoteFinder.css'

const QUICK_IDEAS = [
  'Estoy haciendo un baño',
  'Necesito materiales para pintar',
  'Quiero construir una pared',
  'Busco herramientas para obra',
]

const INTENT_TERMS = {
  baño: ['baño', 'sanitario', 'grifería', 'porcelanato', 'revestimiento'],
  pintar: ['pintura', 'rodillo', 'pincel', 'terminaciones'],
  pared: ['cemento', 'arena', 'bloque', 'ladrillo', 'hormigón'],
  techo: ['chapa', 'perfil', 'hierro', 'estructura'],
  herramientas: ['herramienta', 'taladro', 'amoladora', 'seguridad', 'epp'],
  piso: ['piso', 'porcelanato', 'revestimiento', 'adhesivo'],
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function productSearchText(product) {
  return normalize([
    product.name,
    product.category,
    product.description,
    product.company,
    product.unit,
  ].join(' '))
}

export default function MercadoQuoteFinder() {
  const { productList, loadingProducts } = useProducts()
  const [query, setQuery] = useState('')
  const [activeCategories, setActiveCategories] = useState([])
  const [results, setResults] = useState([])
  const [hasQuoted, setHasQuoted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [contact, setContact] = useState({ name: '', lastName: '', email: '', phone: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const categories = useMemo(
    () => [...new Set(productList.map((product) => product.category).filter(Boolean))].slice(0, 6),
    [productList]
  )

  function toggleCategory(category) {
    setActiveCategories((current) => (
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    ))
  }

  function prepareQuote(event) {
    event?.preventDefault()
    const normalizedQuery = normalize(query)
    const words = normalizedQuery.split(/\s+/).filter((word) => word.length > 2)
    const expandedTerms = [...words]

    Object.entries(INTENT_TERMS).forEach(([intent, terms]) => {
      if (normalizedQuery.includes(intent)) expandedTerms.push(...terms.map(normalize))
    })

    const ranked = productList
      .filter((product) => product.status === 'published')
      .map((product) => {
        const haystack = productSearchText(product)
        const categoryMatch = activeCategories.includes(product.category)
        const termScore = expandedTerms.reduce(
          (score, term) => score + (haystack.includes(term) ? 2 : 0),
          0
        )
        return { product, score: termScore + (categoryMatch ? 6 : 0) }
      })
      .filter(({ score }) => score > 0 || (!normalizedQuery && activeCategories.length === 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ product }) => product)

    const fallback = productList
      .filter((product) => product.status === 'published')
      .slice(0, 5)
    setResults(ranked.length ? ranked : fallback)
    setHasQuoted(true)
    setError('')
    setSent(false)
    setModalOpen(true)
  }

  async function sendQuote(event) {
    event.preventDefault()
    if (!contact.email.trim()) {
      setError('Ingresá tu email para recibir los productos.')
      return
    }

    setSending(true)
    setError('')
    try {
      await createSearchContact({
        searchTerm: query.trim() || activeCategories.join(', ') || 'Productos para mi obra',
        name: [contact.name.trim(), contact.lastName.trim()].filter(Boolean).join(' '),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        source: 'mercadobra-quote-finder',
        selectedProductIds: results.map((product) => product.id),
      })
      setSent(true)
    } catch (requestError) {
      setError(requestError.message || 'No pudimos enviar el email. Intentá nuevamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mqf" id="cotizar">
      <div className="mqf-heading">
        <span className="mqf-kicker">Cotizador MercadoBra</span>
        <h1>Decinos qué necesitás.<br /><em>Nosotros buscamos.</em></h1>
        <p>Escribilo como te salga. Te mostramos opciones concretas para avanzar con tu obra.</p>
      </div>

      <form className="mqf-search" onSubmit={prepareQuote}>
        <label htmlFor="mercado-quote-query">¿Qué estás haciendo?</label>
        <div className="mqf-search-box">
          <textarea
            id="mercado-quote-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Estoy renovando un baño de 4 m² y necesito revestimientos, grifería y materiales..."
            rows="3"
          />
          <button type="submit" disabled={loadingProducts}>
            {loadingProducts ? 'Cargando…' : 'Cotizar'} <span>→</span>
          </button>
        </div>

        <div className="mqf-options">
          <span>O elegí opciones</span>
          <div>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={activeCategories.includes(category) ? 'is-active' : ''}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mqf-ideas">
          <span>Ideas rápidas:</span>
          {QUICK_IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => setQuery(idea)}>{idea}</button>
          ))}
        </div>
      </form>

      {hasQuoted && (
        <div className="mqf-results">
          <div className="mqf-results-heading">
            <div><span>Selección sugerida</span><h2>{results.length} opciones para tu proyecto</h2></div>
            <button type="button" onClick={() => setModalOpen(true)}>Enviar a mi email ↗</button>
          </div>
          <div className="mqf-result-list">
            {results.map((product, index) => (
              <Link to={`/producto/${product.id}`} className="mqf-result" key={product.id}>
                <span>0{index + 1}</span>
                <div>
                  <small>{product.category} · {product.company}</small>
                  <strong>{product.name}</strong>
                </div>
                <b>{formatPrice(product.price, product.currency)} <i>/ {product.unit}</i></b>
                <em>↗</em>
              </Link>
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="mqf-modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <div className="mqf-modal" role="dialog" aria-modal="true" aria-labelledby="mqf-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="mqf-modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar">×</button>
            {sent ? (
              <div className="mqf-success">
                <span>✓</span>
                <h2 id="mqf-modal-title">¡Listo! Revisá tu correo.</h2>
                <p>Te enviamos los productos recomendados y los enlaces para ver cada opción.</p>
                <button type="button" onClick={() => setModalOpen(false)}>Seguir explorando</button>
              </div>
            ) : (
              <>
                <span className="mqf-modal-kicker">Tu selección está pronta</span>
                <h2 id="mqf-modal-title">¿Dónde te la enviamos?</h2>
                <p>Recibí las opciones en tu email. No necesitás crear una cuenta.</p>
                <form onSubmit={sendQuote}>
                  <div className="mqf-modal-grid">
                    <label><span>Nombre <i>opcional</i></span><input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} autoComplete="given-name" /></label>
                    <label><span>Apellido <i>opcional</i></span><input value={contact.lastName} onChange={(event) => setContact({ ...contact, lastName: event.target.value })} autoComplete="family-name" /></label>
                    <label className="is-wide"><span>Email *</span><input type="email" required value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="tu@email.com" autoComplete="email" /></label>
                    <label className="is-wide"><span>Teléfono <i>opcional</i></span><input type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder="099 123 456" autoComplete="tel" /></label>
                  </div>
                  {error && <p className="mqf-error" role="alert">{error}</p>}
                  <button className="mqf-send" type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Recibir productos por email'} <span>→</span></button>
                  <small className="mqf-privacy">Solo usaremos tus datos para enviarte esta cotización.</small>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
