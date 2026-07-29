import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import '../styles/ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { productList } = useProducts()

  const product = useMemo(
    () => productList.find((item) => item.id === Number(id)),
    [productList, id]
  )

  if (!product) {
    return (
      <section className="section product-detail-section">
        <div className="product-detail-container">
          <EmptyState
            icon="🚫"
            title="Producto no encontrado"
            message="Lo sentimos, el producto que buscas no está disponible o fue eliminado."
            action={
              <button onClick={() => navigate('/explorar')} className="btn-primary">
                Volver al catálogo
              </button>
            }
          />
        </div>
      </section>
    )
  }

  return (
    <section className="section product-detail-section" id="product-detail">
      <div className="product-detail-catalog-card">
        <ProductCard product={product} />
      </div>
    </section>
  )
}
