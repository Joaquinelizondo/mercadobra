import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useProducts } from '../context/ProductContext'
import { createSearchContact } from '../lib/api'
import ProductCard from './ProductCard'
import { FEATURES } from '../config/features'
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
        selectedProducts: results.map((product) => ({
          id: product.id,
          imageUrl: product.images?.[0]?.url || '',
        })),
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
        <h2>Lo que imaginás, construido a medida.</h2>
      </div>

      <form className="mqf-search" onSubmit={prepareQuote}>
        <label htmlFor="mercado-quote-query">
          {FEATURES.SHOW_ECOMMERCE_PRODUCTS 
            ? 'Tu idea en hierro, madera o construcción integral. Una cotización precisa.' 
            : 'Contanos tu idea: obra, reforma, estructura, planos o diseño a medida.'}
        </label>
        <div className="mqf-search-box">
          <textarea
            id="mercado-quote-query"
            value={query}
            onChange={updateQuery}
            placeholder={FEATURES.SHOW_ECOMMERCE_PRODUCTS 
              ? 'Ej: planos y obra, asesoramiento de costos, escalera de hierro y madera, parrillero…'
              : 'Ej: Pérgola de hierro y madera 5x3m, escalera suspendida, cálculo de planos, reforma integral…'}
            rows="1"
          />
          <button type="submit" disabled={!query.trim() || query.trim().length < 2}>
            <span aria-hidden="true">⌕</span>
            {FEATURES.SHOW_ECOMMERCE_PRODUCTS ? 'Cotizar ahora' : 'Cotizar proyecto'}
          </button>
        </div>
      </form>

      {resultsVisible && query.trim().length >= 2 && (
        <div className="mqf-results">
          {FEATURES.SHOW_ECOMMERCE_PRODUCTS && results.length > 0 ? (
            <>
              <div className="mqf-results-heading">
                <div>
                  <span className="mqf-results-kicker">Selección personalizada</span>
                  <h3>Estos son los mejores artículos para tu búsqueda</h3>
                  <p>
                    Encontramos {results.length} {results.length === 1 ? 'opción' : 'opciones'} para “{query.trim()}”.
                  </p>
                </div>
                <button type="button" onClick={() => setModalOpen(true)}>Enviar nuevamente</button>
              </div>
              <div className="products-grid mqf-product-grid">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="mqf-custom-confirmation" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <div style={{ width: '58px', height: '58px', margin: '0 auto 16px', borderRadius: '50%', background: '#d87549', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.8rem', fontWeight: 'bold' }}>✓</div>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.45rem', color: '#211f1b', letterSpacing: '-0.02em' }}>¡Solicitud recibida con éxito!</h3>
              <p style={{ margin: '0 auto 22px', maxWidth: '620px', color: '#6d5140', fontSize: '0.98rem', lineHeight: 1.6 }}>
                Recibimos tu solicitud para <strong>“{query.trim()}”</strong>. Un especialista técnico de Óxida / Mercadobra revisará los requerimientos para preparar la cotización estimada y coordinar contigo.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#proyectos-destacados" style={{ padding: '11px 20px', background: '#211f1b', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem' }}>Ver proyectos ejecutados</a>
                <button type="button" onClick={() => { setResultsVisible(false); setQuery(''); }} style={{ padding: '11px 20px', background: 'transparent', border: '1px solid #c5beb2', color: '#211f1b', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Nueva consulta</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && createPortal(
        <div className="mqf-modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <div className="mqf-modal" role="dialog" aria-modal="true" aria-labelledby="mqf-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="mqf-modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar">×</button>
            <span className="mqf-modal-kicker">
              {FEATURES.SHOW_ECOMMERCE_PRODUCTS ? `Encontramos ${results.length} opciones para vos` : 'Cotización de Proyecto a Medida'}
            </span>
            <h2 id="mqf-modal-title">
              {FEATURES.SHOW_ECOMMERCE_PRODUCTS ? 'Completá tus datos para ver la selección' : '¿A dónde enviamos tu propuesta?'}
            </h2>
            <p>
              {FEATURES.SHOW_ECOMMERCE_PRODUCTS 
                ? 'También enviaremos los productos a tu email. No necesitás crear una cuenta.'
                : `Ingresá tus datos de contacto para que el equipo técnico elabore la propuesta para “${query.trim()}”.`}
            </p>
            <form onSubmit={sendQuote}>
              <div className="mqf-modal-grid">
                <label><span>Nombre *</span><input required value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} autoComplete="given-name" placeholder="Tu nombre" /></label>
                <label><span>Apellido <i>opcional</i></span><input value={contact.lastName} onChange={(event) => setContact({ ...contact, lastName: event.target.value })} autoComplete="family-name" placeholder="Tu apellido" /></label>
                <label className="is-wide"><span>Email *</span><input type="email" required value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="tu@email.com" autoComplete="email" /></label>
                <label className="is-wide"><span>Teléfono / WhatsApp <i>opcional</i></span><input type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder="099 123 456" autoComplete="tel" /></label>
              </div>
              {error && <p className="mqf-error" role="alert">{error}</p>}
              <button className="mqf-send" type="submit" disabled={sending}>
                {sending 
                  ? 'Enviando solicitud…' 
                  : (FEATURES.SHOW_ECOMMERCE_PRODUCTS ? 'Ver productos recomendados' : 'Solicitar cotización de proyecto')} 
                <span>→</span>
              </button>
              <small className="mqf-privacy">Tus datos están protegidos y solo los usaremos para comunicarnos sobre este proyecto.</small>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
