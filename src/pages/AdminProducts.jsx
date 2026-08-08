import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import PublishModal from '../components/PublishModal'
import OxidaWordmark from '../components/OxidaWordmark'
import './AdminProducts.css'

export default function AdminProducts() {
  const { adminUser, adminToken, logoutAdmin } = useAuth()
  const { productList, deleteProduct, loadingProducts } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [actionError, setActionError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = useMemo(
    () => [...new Set(productList.map((product) => product.category).filter(Boolean))].sort(),
    [productList]
  )
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return productList.filter((product) => {
      const matchesSearch = !normalizedSearch || [
        product.name, product.sku, product.company, product.category,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
      return matchesSearch
        && (statusFilter === 'all' || product.status === statusFilter)
        && (categoryFilter === 'all' || product.category === categoryFilter)
    })
  }, [productList, search, statusFilter, categoryFilter])
  const publishedCount = productList.filter((product) => product.status === 'published').length
  const lowStockCount = productList.filter((product) => Number(product.stock) <= 3).length

  if (!adminUser || !adminToken) {
    return <Navigate to="/admin/login?redirect=/admin/productos" replace />
  }

  function openCreate() {
    setEditingProduct(null)
    setActionError('')
    setModalOpen(true)
  }

  function openEdit(product) {
    setEditingProduct(product)
    setActionError('')
    setModalOpen(true)
  }

  async function handleDelete(productId) {
    const product = productList.find((item) => item.id === productId)
    if (!window.confirm(`¿Quitar "${product?.name || 'este producto'}" de la tienda?`)) return

    setActionError('')
    try {
      await deleteProduct(productId, adminToken)
    } catch (error) {
      setActionError(error.message || 'No se pudo quitar el producto.')
    }
  }

  function closeModal() {
    setModalOpen(false)
    setEditingProduct(null)
  }

  return (
    <section className="admin-store">
      <header className="admin-store-header">
        <div className="admin-store-brand">
          <OxidaWordmark />
          <span>Administración de tienda</span>
        </div>
        <div className="admin-store-actions">
          <Link to="/" className="admin-store-link">Ver tienda ↗</Link>
          <Link to="/admin/cotizaciones" className="admin-store-link">Consultas</Link>
          <Link to="/admin/pedidos" className="admin-store-link">Pedidos</Link>
          <Link to="/admin/clientes" className="admin-store-link">Clientes</Link>
          <Link to="/admin/personalizaciones" className="admin-store-link">Personalizaciones</Link>
          <button type="button" className="admin-store-link" onClick={logoutAdmin}>Cerrar sesión</button>
        </div>
      </header>

      <div className="admin-store-title">
        <div>
          <p>Catálogo comercial</p>
          <h1>Productos</h1>
          <span>{productList.length} {productList.length === 1 ? 'publicación' : 'publicaciones'} en la tienda</span>
        </div>
        <button type="button" className="admin-store-create" onClick={openCreate}>
          <span>＋</span> Nuevo producto
        </button>
      </div>

      {actionError && <p className="admin-store-error" role="alert">{actionError}</p>}

      <div className="admin-store-metrics" aria-label="Resumen del catálogo">
        <div><strong>{productList.length}</strong><span>Total</span></div>
        <div><strong>{publishedCount}</strong><span>Publicados</span></div>
        <div><strong>{lowStockCount}</strong><span>Stock bajo</span></div>
        <div><strong>{categories.length}</strong><span>Categorías</span></div>
      </div>

      <div className="admin-store-toolbar">
        <label className="admin-store-search">
          <span>Buscar productos</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, SKU, proveedor…" />
        </label>
        <label>
          <span>Estado</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Borradores</option>
            <option value="out_of_stock">Sin stock</option>
            <option value="archived">Archivados</option>
          </select>
        </label>
        <label>
          <span>Categoría</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">Todas</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>

      {loadingProducts ? (
        <p className="admin-store-empty">Cargando productos…</p>
      ) : productList.length === 0 ? (
        <div className="admin-store-empty">
          <h2>La tienda todavía está vacía.</h2>
          <p>Cargá el primer producto con sus fotos, precio y disponibilidad.</p>
          <button type="button" className="admin-store-create" onClick={openCreate}>Crear producto</button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-store-empty">
          <h2>No encontramos productos.</h2>
          <p>Probá cambiar la búsqueda o los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="products-grid admin-store-grid">
          {filteredProducts.map((product) => (
            <div className="admin-product-entry" key={product.id}>
              <div className="admin-product-meta">
                <span className={`admin-product-status admin-product-status--${product.status}`}>
                  {product.status === 'published' ? 'Publicado'
                    : product.status === 'draft' ? 'Borrador'
                      : product.status === 'out_of_stock' ? 'Sin stock' : 'Archivado'}
                </span>
                <span>Stock: {Number(product.stock) || 0}</span>
                {product.sku && <span>SKU: {product.sku}</span>}
              </div>
              <ProductCard
                product={product}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PublishModal
          key={editingProduct?.id || 'new-product'}
          initialFormData={editingProduct}
          onClose={closeModal}
        />
      )}
    </section>
  )
}
