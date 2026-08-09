import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useProducts } from '../context/ProductContext'
import { createSearchContact } from '../lib/api'
import ProductCard from './ProductCard'
import '../styles/MercadoQuoteFinder.css'

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

function findMatchingProducts(products, query) {
  const normalizedQuery = normalize(query).trim()
  if (normalizedQuery.length < 2) return []

  const words = normalizedQuery.split(/\s+/).filter((word) => word.length > 2)
  const expandedTerms = [...words]

  Object.entries(INTENT_TERMS).forEach(([intent, terms]) => {
    if (normalizedQuery.includes(intent)) expandedTerms.push(...terms.map(normalize))
  })

  return products
    .filter((product) => product.status === 'published')
    .map((product) => {
      const haystack = productSearchText(product)
      const name = normalize(product.name)
      const category = normalize(product.category)
      const score = expandedTerms.reduce((total, term) => {
        if (name.includes(term)) return total + 5
        if (category.includes(term)) return total + 3
        return total + (haystack.includes(term) ? 1 : 0)
      }, 0)
      return { product, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ product }) => product)
}

export default function MercadoQuoteFinder() {
  const { productList, loadingProducts } = useProducts()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [contact, setContact] = useState({ name: '', lastName: '', email: '', phone: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [resultsVisible, setResultsVisible] = useState(false)

  const results = useMemo(
    () => findMatchingProducts(productList, query),
    [productList, query]
  )

  function prepareQuote(event) {
    event?.preventDefault()
    setError('')
    setModalOpen(true)
  }

  function updateQuery(event) {
    setQuery(event.target.value)
    setResultsVisible(false)
    setModalOpen(false)
    setError('')
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
        searchTerm: query.trim(),
        name: [contact.name.trim(), contact.lastName.trim()].filter(Boolean).join(' '),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        source: 'mercadobra-quote-finder',
        selectedProductIds: results.map((product) => product.id),
      })
      setResultsVisible(true)
      setModalOpen(false)
    } catch (requestError) {
      setError(requestError.message || 'No pudimos enviar el email. Intentá nuevamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mqf" id="cotizar">
      <div className="mqf-heading">
        <h2>Lo que imaginás, en hierro.</h2>
      </div>

      <form className="mqf-search" onSubmit={prepareQuote}>
        <label htmlFor="mercado-quote-query">Describí tu proyecto y encontrá opciones</label>
        <div className="mqf-search-box">
          <textarea
            id="mercado-quote-query"
            value={query}
            onChange={updateQuery}
            placeholder="Ej: escalera, parrillero, estructura o pieza a medida…"
            rows="1"
          />
          <button type="submit" disabled={loadingProducts || results.length === 0}>
            <span aria-hidden="true">⌕</span>
            {loadingProducts ? 'Cargando…' : 'Buscar opciones'}
          </button>
        </div>
      </form>

      {resultsVisible && query.trim().length >= 2 && (
        <div className="mqf-results">
          <div className="mqf-results-heading">
            <div>
              <span className="mqf-results-kicker">Selección personalizada</span>
              <h3>Estos son los mejores artículos para tu búsqueda</h3>
              <p>
                Encontramos {results.length} {results.length === 1 ? 'opción' : 'opciones'} para “{query.trim()}”.
              </p>
            </div>
            {results.length > 0 && <button type="button" onClick={() => setModalOpen(true)}>Enviar nuevamente</button>}
          </div>
          {results.length > 0 ? (
            <div className="products-grid mqf-product-grid">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="mqf-empty">Todavía no encontramos productos que coincidan. Probá describiéndolo con otras palabras.</p>
          )}
        </div>
      )}

      {modalOpen && createPortal(
        <div className="mqf-modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <div className="mqf-modal" role="dialog" aria-modal="true" aria-labelledby="mqf-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="mqf-modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar">×</button>
            <span className="mqf-modal-kicker">Encontramos {results.length} opciones para vos</span>
            <h2 id="mqf-modal-title">Completá tus datos para ver la selección</h2>
            <p>También enviaremos los productos a tu email. No necesitás crear una cuenta.</p>
            <form onSubmit={sendQuote}>
              <div className="mqf-modal-grid">
                <label><span>Nombre <i>opcional</i></span><input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} autoComplete="given-name" /></label>
                <label><span>Apellido <i>opcional</i></span><input value={contact.lastName} onChange={(event) => setContact({ ...contact, lastName: event.target.value })} autoComplete="family-name" /></label>
                <label className="is-wide"><span>Email *</span><input type="email" required value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="tu@email.com" autoComplete="email" /></label>
                <label className="is-wide"><span>Teléfono <i>opcional</i></span><input type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder="099 123 456" autoComplete="tel" /></label>
              </div>
              {error && <p className="mqf-error" role="alert">{error}</p>}
              <button className="mqf-send" type="submit" disabled={sending}>{sending ? 'Preparando selección…' : 'Ver productos recomendados'} <span>→</span></button>
              <small className="mqf-privacy">Solo usaremos tus datos para enviarte esta cotización.</small>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
