import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import GroupQuoteWidget from '../components/GroupQuoteWidget'
import PublishModal from '../components/PublishModal'
import EmptyState from '../components/EmptyState'
import { SkeletonGrid } from '../components/Skeleton'
import { formatPrice } from '../utils/format'

const PAGE_SIZE = 12
const MAX_COMPARE = 3
const ALLOWED_SORTS = new Set(['relevance', 'stock-first', 'price-asc', 'price-desc', 'name-asc'])
const COMBO_TEMPLATES = [
  {
    id: 'inicio-obra',
    title: 'Combo Inicio de Obra',
    description: 'Base rapida para arrancar: cemento, arena y piedra.',
    terms: ['cemento', 'arena', 'piedra'],
  },
  {
    id: 'estructura',
    title: 'Combo Estructura',
    description: 'Para avanzar firme: hierro, malla y perfil.',
    terms: ['hierro', 'malla', 'perfil'],
  },
  {
    id: 'terminacion',
    title: 'Combo Terminacion',
    description: 'Cierre final: pintura, porcelanato y griferia.',
    terms: ['pintura', 'porcelanato', 'griferia'],
  },
]

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parsePageParam(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export default function Catalog() {
  const { supplierUser, adminUser } = useAuth()
  const { addToCart, setCartOpen, cartItems, clearCart } = useCart()
  const { productList, loadingProducts } = useProducts()
    // Handler para enviar la cotización grupal (simulado)
    const handleGroupQuoteSubmit = async (items) => {
      // Aquí deberías enviar la cotización al backend o mostrar un modal de éxito
      alert(`Cotización grupal enviada por ${items.length} productos. Pronto te contactaremos.`)
      clearCart()
    }
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [publishOpen, setPublishOpen] = useState(false)
  const [compareIds, setCompareIds] = useState([])
  const [comboFeedback, setComboFeedback] = useState('')
  const infiniteSentinelRef = useRef(null)

  const searchQuery = searchParams.get('q')?.trim() ?? ''

  const categories = useMemo(
    () => ['todos', ...new Set(productList.map((product) => String(product.category || '').trim()).filter(Boolean))],
    [productList]
  )

  const categoryFromUrl = searchParams.get('category') || 'todos'
  const categoryFilter = categories.includes(categoryFromUrl) ? categoryFromUrl : 'todos'

  const sortFromUrl = searchParams.get('sort') || 'relevance'
  const sortBy = ALLOWED_SORTS.has(sortFromUrl) ? sortFromUrl : 'relevance'

  const viewMode = searchParams.get('view') === 'infinite' ? 'infinite' : 'pages'
  const normalizedSearch = normalizeText(searchQuery)

  const filteredProducts = useMemo(() => {
    let result = productList.filter((product) => product.status === 'published' || product.status === 'out_of_stock')

    if (normalizedSearch) {
      result = result.filter((product) => {
        const haystack = [product.name, product.category, product.description, product.company]
          .filter(Boolean)
          .map(normalizeText)
          .join(' ')
        return haystack.includes(normalizedSearch)
      })
    }

    if (categoryFilter !== 'todos') {
      result = result.filter((product) => String(product.category || '') === categoryFilter)
    }

    const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''))
    if (sortBy === 'price-asc') result.sort((a, b) => Number(a.price) - Number(b.price) || byName(a, b))
    if (sortBy === 'price-desc') result.sort((a, b) => Number(b.price) - Number(a.price) || byName(a, b))
    if (sortBy === 'name-asc') result.sort(byName)
    if (sortBy === 'stock-first') result.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || byName(a, b))

    return result
  }, [productList, normalizedSearch, categoryFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const currentPage = Math.min(parsePageParam(searchParams.get('page')), totalPages)

  const visibleProducts = useMemo(() => {
    if (viewMode === 'infinite') {
      return filteredProducts.slice(0, PAGE_SIZE * currentPage)
    }

    const start = (currentPage - 1) * PAGE_SIZE
    return filteredProducts.slice(start, start + PAGE_SIZE)
  }, [filteredProducts, viewMode, currentPage])

  const hasMoreInInfinite = viewMode === 'infinite' && currentPage < totalPages

  const comparedProducts = useMemo(
    () => compareIds
      .map((id) => productList.find((product) => product.id === id))
      .filter(Boolean),
    [compareIds, productList]
  )

  const comboCards = useMemo(
    () => COMBO_TEMPLATES.map((template) => {
      const products = template.terms
        .map((term) => productList.find((product) => {
          const haystack = normalizeText([product.name, product.category, product.description].join(' '))
          return haystack.includes(normalizeText(term))
        }))
        .filter(Boolean)

      const uniqueProducts = [...new Map(products.map((product) => [product.id, product])).values()]
      const total = uniqueProducts.reduce((sum, product) => sum + Number(product.price || 0), 0)

      return {
        ...template,
        products: uniqueProducts,
        total,
      }
    }),
    [productList]
  )

  const updateSearchParams = useCallback((updates, { resetPage = false, replace = false } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)

      if (resetPage) next.delete('page')

      Object.entries(updates).forEach(([key, value]) => {
        const shouldRemove =
          value === null ||
          value === undefined ||
          value === '' ||
          (key === 'category' && value === 'todos') ||
          (key === 'sort' && value === 'relevance') ||
          (key === 'view' && value === 'pages') ||
          (key === 'page' && Number(value) <= 1)

        if (shouldRemove) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      })

      return next
    }, { replace })
  }, [setSearchParams])

  useEffect(() => {
    if (!hasMoreInInfinite || !infiniteSentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return

        updateSearchParams({ page: currentPage + 1 }, { replace: true })
      },
      { rootMargin: '280px 0px 280px 0px' }
    )

    observer.observe(infiniteSentinelRef.current)
    return () => observer.disconnect()
  }, [hasMoreInInfinite, currentPage, updateSearchParams])

  function handlePublishClick() {
    if (!supplierUser && !adminUser) {
      navigate('/proveedor/login?redirect=/explorar')
    } else {
      setPublishOpen(true)
    }
  }

  function toggleCompare(productId) {
    setCompareIds((previous) => {
      if (previous.includes(productId)) {
        return previous.filter((id) => id !== productId)
      }
      if (previous.length >= MAX_COMPARE) {
        return previous
      }
      return [...previous, productId]
    })
  }

  function clearCompare() {
    setCompareIds([])
  }

  function addComboToCart(combo) {
    if (!combo.products.length) {
      setComboFeedback('No encontramos productos para ese combo todavia.')
      window.setTimeout(() => setComboFeedback(''), 2200)
      return
    }

    combo.products.forEach((product) => addToCart(product))
    setCartOpen(true)
    setComboFeedback(`${combo.title} agregado al carrito.`)
    window.setTimeout(() => setComboFeedback(''), 2200)
  }

  return (
    <>
      {/* Cotizador libre premium (único) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <GroupQuoteWidget />
      </div>
      <section className="section catalog-section" id="explorar">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Colección Oxida</span>
            <h2>Diseños base para comprar o adaptar.</h2>
            <p className="catalog-meta">
              {filteredProducts.length} resultado{filteredProducts.length === 1 ? '' : 's'}
              {searchQuery ? ` para "${searchQuery}"` : ''}
            </p>
          </div>
          <button className="publish-btn" onClick={handlePublishClick}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Publicar producto
          </button>
        </div>

        <div className="catalog-controls" aria-label="Controles de catálogo">
          <div className="catalog-filter-tabs" role="tablist" aria-label="Filtrar por categoría">
            {categories.map((category) => (
              <button
                key={category}
                role="tab"
                aria-selected={categoryFilter === category}
                className={`filter-tab${categoryFilter === category ? ' filter-tab--active' : ''}`}
                onClick={() => updateSearchParams({ category }, { resetPage: true })}
                type="button"
              >
                {category === 'todos' ? 'Todos' : category}
              </button>
            ))}
          </div>
          <label className="catalog-sort-wrap">
            <span>Ordenar</span>
            <select
              className="catalog-sort"
              value={sortBy}
              onChange={(event) => updateSearchParams({ sort: event.target.value }, { resetPage: true })}
            >
              <option value="relevance">Relevancia</option>
              <option value="stock-first">Con stock primero</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name-asc">Nombre A-Z</option>
            </select>
          </label>
          <label className="catalog-view-toggle" htmlFor="catalog-infinite-mode">
            <input
              id="catalog-infinite-mode"
              type="checkbox"
              checked={viewMode === 'infinite'}
              onChange={(event) =>
                updateSearchParams({ view: event.target.checked ? 'infinite' : 'pages' }, { resetPage: true })
              }
            />
            <span>Infinite scroll</span>
          </label>
        </div>

        <section className="catalog-combos" aria-label="Combos sugeridos para obra">
          <div className="catalog-combos-head">
            <h3>Combos de obra</h3>
            <p>Elegi un combo y sumalo completo en un click.</p>
          </div>
          <div className="catalog-combos-grid">
            {comboCards.map((combo) => (
              <article key={combo.id} className="catalog-combo-card">
                <h4>{combo.title}</h4>
                <p>{combo.description}</p>
                <small>
                  {combo.products.length ? `${combo.products.length} productos · ${formatPrice(combo.total)}` : 'Proximamente'}
                </small>
                <button
                  type="button"
                  className="catalog-combo-btn"
                  onClick={() => addComboToCart(combo)}
                  disabled={!combo.products.length}
                >
                  Agregar combo
                </button>
              </article>
            ))}
          </div>
          {comboFeedback && <p className="catalog-combo-feedback">{comboFeedback}</p>}
        </section>

        <section className="catalog-compare" aria-label="Comparador de productos">
          <div className="catalog-compare-head">
            <h3>Comparador rapido</h3>
            <p>Selecciona hasta 3 productos para compararlos.</p>
          </div>
          {comparedProducts.length === 0 ? (
            <div className="catalog-compare-empty">Todavia no seleccionaste productos para comparar.</div>
          ) : (
            <>
              <div className="catalog-compare-grid">
                {comparedProducts.map((product) => (
                  <article key={product.id} className="catalog-compare-card">
                    <h4>{product.name}</h4>
                    <p>{product.company}</p>
                    <ul>
                      <li>{formatPrice(product.price, product.currency)} / {product.unit}</li>
                      <li>{Number(product.stock) > 0 ? 'Con stock' : 'Sin stock'}</li>
                      <li>{product.category}</li>
                    </ul>
                    <button
                      type="button"
                      className="catalog-compare-remove"
                      onClick={() => toggleCompare(product.id)}
                    >
                      Quitar
                    </button>
                  </article>
                ))}
              </div>
              <button type="button" className="catalog-compare-clear" onClick={clearCompare}>
                Limpiar comparador
              </button>
            </>
          )}
        </section>

        <div id="catalog-results">
          {loadingProducts ? (
            <SkeletonGrid count={6} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay productos publicados'}
              message={searchQuery ? 'Probá con otros términos de búsqueda.' : 'Todavía no hay productos disponibles en el catálogo.'}
            />
          ) : (
            <>
              <div className="products-grid products-grid--reveal">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onToggleCompare={toggleCompare}
                    isCompared={compareIds.includes(product.id)}
                    compareDisabled={!compareIds.includes(product.id) && compareIds.length >= MAX_COMPARE}
                  />
                ))}
              </div>
              {viewMode === 'pages' && totalPages > 1 && (
                <div className="catalog-pagination" aria-label="Paginación de resultados">
                  <button
                    type="button"
                    className="catalog-page-btn"
                    onClick={() => updateSearchParams({ page: currentPage - 1 })}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  <span className="catalog-page-indicator">Página {currentPage} de {totalPages}</span>
                  <button
                    type="button"
                    className="catalog-page-btn"
                    onClick={() => updateSearchParams({ page: currentPage + 1 })}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
              {viewMode === 'infinite' && hasMoreInInfinite && (
                <div className="catalog-infinite-footer" ref={infiniteSentinelRef} aria-hidden="true">
                  Cargando más productos...
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {publishOpen && (
        <PublishModal
          onClose={() => setPublishOpen(false)}
          onPublished={() => setPublishOpen(false)}
        />
      )}
    </>
  )
}
