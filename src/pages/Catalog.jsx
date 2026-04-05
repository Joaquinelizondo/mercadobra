import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { CATALOG_CATEGORIES } from '../data/constants'
import ProductCard from '../components/ProductCard'
import PublishModal from '../components/PublishModal'
import EmptyState from '../components/EmptyState'

const RECENT_SEARCHES_KEY = 'mercadobra-recent-searches'
const SUPPLIER_ZONE_MAP = {
  'Corralón La Obra': 'CABA',
  'Áridos del Sur': 'Zona Sur',
  'Estructura Total': 'Zona Norte',
  'MetalWork BA': 'CABA',
  'Revestimientos Pro': 'Zona Oeste',
  'Pinturas Nord': 'Zona Norte',
  'Sanitarios Sur': 'Zona Sur',
  HerramientasXL: 'CABA',
  SegurObra: 'Zona Oeste',
}

export default function Catalog() {
  const { supplierUser } = useAuth()
  const { productList } = useProducts()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const querySearch = searchParams.get('q') ?? ''
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [searchInput, setSearchInput] = useState(querySearch)
  const [searchTerm, setSearchTerm] = useState(querySearch)
  const [activeZone, setActiveZone] = useState('Todas')
  const [stockFilter, setStockFilter] = useState('Todos')
  const [priceSort, setPriceSort] = useState('none')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [publishOpen, setPublishOpen] = useState(false)

  useEffect(() => {
    setSearchInput(querySearch)
    setSearchTerm(querySearch)
  }, [querySearch])

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
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredByCategory =
    activeCategory === 'Todos'
      ? productList
      : productList.filter((p) => p.category === activeCategory)

  const ZONE_OPTIONS = useMemo(
    () => ['Todas', ...new Set(productList.map((product) => SUPPLIER_ZONE_MAP[product.company] ?? 'Sin zona'))],
    [productList]
  )

  const filteredByZone =
    activeZone === 'Todas'
      ? filteredByCategory
      : filteredByCategory.filter((product) => (SUPPLIER_ZONE_MAP[product.company] ?? 'Sin zona') === activeZone)

  const filteredByStock =
    stockFilter === 'Todos'
      ? filteredByZone
      : filteredByZone.filter((product) =>
          stockFilter === 'En stock'
            ? Number(product.stock ?? 0) > 0
            : Number(product.stock ?? 0) <= 0
        )

  const normalizedInput = searchInput.trim().toLowerCase()

  const searchSuggestionItems = useMemo(() => {
    const productNames = [...new Set(filteredByStock.map((product) => product.name))].map((value) => ({
      id: `product-${value}`,
      label: value,
      value,
      type: 'Producto',
    }))

    const companies = [...new Set(filteredByStock.map((product) => product.company))].map((value) => ({
      id: `company-${value}`,
      label: value,
      value,
      type: 'Proveedor',
    }))

    const categoriesList = [...new Set(filteredByStock.map((product) => product.category))].map((value) => ({
      id: `category-${value}`,
      label: value,
      value,
      type: 'Categoría',
    }))

    return [...productNames, ...companies, ...categoriesList]
  }, [filteredByStock])

  const searchSuggestions = useMemo(() => {
    if (!normalizedInput) {
      const recent = recentSearches.map((value) => ({
        id: `recent-${value}`,
        label: value,
        value,
        type: 'Reciente',
      }))
      const quickProducts = searchSuggestionItems.filter((item) => item.type === 'Producto').slice(0, 4)
      const quickCategories = searchSuggestionItems.filter((item) => item.type === 'Categoría').slice(0, 2)
      return [...recent, ...quickProducts, ...quickCategories].slice(0, 6)
    }

    const matches = searchSuggestionItems
      .filter((item) => item.label.toLowerCase().includes(normalizedInput))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(normalizedInput)
        const bStarts = b.label.toLowerCase().startsWith(normalizedInput)
        if (aStarts === bStarts) return a.label.localeCompare(b.label)
        return aStarts ? -1 : 1
      })
      .slice(0, 5)

    if (!matches.length && searchInput.trim()) {
      return [
        {
          id: `search-${searchInput}`,
          label: `Buscar “${searchInput.trim()}” en todo el catálogo`,
          value: searchInput.trim(),
          type: 'Buscar',
        },
      ]
    }

    return matches
  }, [searchSuggestionItems, normalizedInput, searchInput, recentSearches])

  const filtered = normalizedSearch
    ? filteredByStock.filter((product) =>
        [product.name, product.company, product.category, product.description]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : filteredByStock

  const minPriceValue = Number(minPrice)
  const maxPriceValue = Number(maxPrice)
  const hasMinPrice = minPrice !== '' && Number.isFinite(minPriceValue) && minPriceValue >= 0
  const hasMaxPrice = maxPrice !== '' && Number.isFinite(maxPriceValue) && maxPriceValue >= 0

  const filteredByPrice = filtered.filter((product) => {
    if (hasMinPrice && product.price < minPriceValue) {
      return false
    }

    if (hasMaxPrice && product.price > maxPriceValue) {
      return false
    }

    return true
  })

  const sortedProducts = [...filteredByPrice].sort((a, b) => {
    if (priceSort === 'asc') {
      return a.price - b.price
    }

    if (priceSort === 'desc') {
      return b.price - a.price
    }

    if (priceSort === 'name-asc') {
      return a.name.localeCompare(b.name)
    }

    if (priceSort === 'name-desc') {
      return b.name.localeCompare(a.name)
    }

    if (priceSort === 'company-asc') {
      return a.company.localeCompare(b.company)
    }

    if (priceSort === 'company-desc') {
      return b.company.localeCompare(a.company)
    }

    return 0
  })

  function handlePublishClick() {
    if (!supplierUser) {
      navigate('/proveedor/login?redirect=/explorar')
    } else {
      setPublishOpen(true)
    }
  }

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

  function handleSearchSubmit(event) {
    event.preventDefault()
    const nextTerm = searchInput.trim()
    setSearchTerm(nextTerm)
    setShowSearchSuggestions(false)
    saveRecentSearch(nextTerm)
    setSearchParams(nextTerm ? { q: nextTerm } : {})
    requestAnimationFrame(() => {
      document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function selectSearchSuggestion(suggestion) {
    const value = suggestion.value
    setSearchInput(value)
    setSearchTerm(value)
    setShowSearchSuggestions(false)
    saveRecentSearch(value)
    setSearchParams({ q: value })
    requestAnimationFrame(() => {
      document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function clearSearch() {
    setSearchInput('')
    setSearchTerm('')
    setShowSearchSuggestions(false)
    setSearchParams({})
  }

  function clearPriceRange() {
    setMinPrice('')
    setMaxPrice('')
  }

  return (
    <>
      <section className="section catalog-section" id="explorar">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Catálogo de productos</span>
            <h2>Explorá materiales, herramientas y mucho más.</h2>
          </div>
          <button className="publish-btn" onClick={handlePublishClick}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Publicar producto
          </button>
        </div>

        <div className="catalog-filters" role="tablist" aria-label="Filtros de categoría">
          {CATALOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`filter-tab${activeCategory === cat ? ' filter-tab--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="catalog-search-wrap">
          <label htmlFor="catalog-search" className="catalog-search-label">
            Buscar producto
          </label>
          <form className="catalog-search-form" onSubmit={handleSearchSubmit}>
            <div className="catalog-search-control">
              <input
                id="catalog-search"
                className="catalog-search-input"
                type="search"
                placeholder="Ej: Cemento, Pintura, Aceros Rivera..."
                value={searchInput}
                autoComplete="off"
                onFocus={() => setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 120)}
                onChange={(event) => {
                  setSearchInput(event.target.value)
                  setShowSearchSuggestions(true)
                }}
              />
              {searchInput && (
                <button
                  type="button"
                  className="catalog-search-clear"
                  onClick={clearSearch}
                  aria-label="Limpiar búsqueda"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <ul className="catalog-search-suggestions" role="listbox" aria-label="Sugerencias de búsqueda">
                  {searchSuggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        className="catalog-search-suggestion-btn"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectSearchSuggestion(suggestion)}
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
            <button type="submit" className="catalog-search-submit">
              Buscar
            </button>
          </form>
        </div>

        <div className="catalog-sort-wrap">
          <label htmlFor="catalog-zone" className="catalog-sort-label">Filtrar por zona</label>
          <select
            id="catalog-zone"
            className="catalog-sort-select"
            value={activeZone}
            onChange={(event) => setActiveZone(event.target.value)}
          >
            {ZONE_OPTIONS.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div className="catalog-sort-wrap">
          <label htmlFor="catalog-stock" className="catalog-sort-label">Filtrar por stock</label>
          <select
            id="catalog-stock"
            className="catalog-sort-select"
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="En stock">En stock</option>
            <option value="Sin stock">Sin stock</option>
          </select>
        </div>

        <div className="catalog-range-wrap">
          <label className="catalog-sort-label">Rango de precio (ARS)</label>
          <div className="catalog-range-controls">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              className="catalog-range-input"
              placeholder="Mínimo"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
            <span className="catalog-range-sep">—</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              className="catalog-range-input"
              placeholder="Máximo"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
            <button type="button" className="catalog-range-clear" onClick={clearPriceRange}>
              Limpiar
            </button>
          </div>
        </div>

        <div className="catalog-sort-wrap">
          <label htmlFor="catalog-sort" className="catalog-sort-label">Ordenar resultados</label>
          <select
            id="catalog-sort"
            className="catalog-sort-select"
            value={priceSort}
            onChange={(event) => setPriceSort(event.target.value)}
          >
            <option value="none">Sin ordenar</option>
            <option value="asc">Menor a mayor</option>
            <option value="desc">Mayor a menor</option>
            <option value="name-asc">Nombre A-Z</option>
            <option value="name-desc">Nombre Z-A</option>
            <option value="company-asc">Proveedor A-Z</option>
            <option value="company-desc">Proveedor Z-A</option>
          </select>
        </div>

        <div id="catalog-results">
          {sortedProducts.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={`No encontramos "${searchTerm}"`}
              message="Probá con otro término, cambiá los filtros o explorá nuestro catálogo completo."
              action={
                <button className="btn-primary" onClick={clearSearch}>
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <div className="products-grid">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {publishOpen && (
        <PublishModal
          onClose={() => setPublishOpen(false)}
          onPublished={(p) => setActiveCategory(p.category)}
        />
      )}
    </>
  )
}
