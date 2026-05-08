import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import PublishModal from '../components/PublishModal'
import EmptyState from '../components/EmptyState'
import { SkeletonGrid } from '../components/Skeleton'

const PAGE_SIZE = 12
const ALLOWED_SORTS = new Set(['relevance', 'stock-first', 'price-asc', 'price-desc', 'name-asc'])

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
  const { supplierUser } = useAuth()
  const { productList, loadingProducts } = useProducts()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [publishOpen, setPublishOpen] = useState(false)
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
    let result = [...productList]

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
    if (!supplierUser) {
      navigate('/proveedor/login?redirect=/explorar')
    } else {
      setPublishOpen(true)
    }
  }

  return (
    <>
      <section className="section catalog-section" id="explorar">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Catálogo de productos</span>
            <h2>Explorá materiales, herramientas y mucho más.</h2>
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
                  <ProductCard key={product.id} product={product} />
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
