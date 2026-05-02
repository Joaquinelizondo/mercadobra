import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import PublishModal from '../components/PublishModal'
import EmptyState from '../components/EmptyState'

export default function Catalog() {
  const { supplierUser } = useAuth()
  const { productList } = useProducts()
  const navigate = useNavigate()
  const [publishOpen, setPublishOpen] = useState(false)

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
          </div>
          <button className="publish-btn" onClick={handlePublishClick}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Publicar producto
          </button>
        </div>

        <div id="catalog-results">
          {productList.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No hay productos publicados"
              message="Todavía no hay productos disponibles en el catálogo."
            />
          ) : (
            <div className="products-grid">
              {productList.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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
