import { useState } from 'react'
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
          <button type="button" className="admin-store-link" onClick={logoutAdmin}>Cerrar sesión</button>
        </div>
      </header>

      <div className="admin-store-title">
        <div>
          <p>Catálogo comercial</p>
          <h1>Productos</h1>
          <span>{productList.length} publicación{productList.length === 1 ? '' : 'es'} en la tienda</span>
        </div>
        <button type="button" className="admin-store-create" onClick={openCreate}>
          <span>＋</span> Nuevo producto
        </button>
      </div>

      {actionError && <p className="admin-store-error" role="alert">{actionError}</p>}

      {loadingProducts ? (
        <p className="admin-store-empty">Cargando productos…</p>
      ) : productList.length === 0 ? (
        <div className="admin-store-empty">
          <h2>La tienda todavía está vacía.</h2>
          <p>Cargá el primer producto con sus fotos, precio y disponibilidad.</p>
          <button type="button" className="admin-store-create" onClick={openCreate}>Crear producto</button>
        </div>
      ) : (
        <div className="products-grid admin-store-grid">
          {productList.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
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
