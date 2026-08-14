import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import OxidaWordmark from '../components/OxidaWordmark'
import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import EditorialProductSlider from '../components/EditorialProductSlider'
import heroImage from '../assets/oxida/escalera.jpeg'
import mercadoBraLogo from '../assets/mercadobra.png'
import './Storefront.css'

export default function Storefront() {
  const { productList, loadingProducts } = useProducts()
  const publishedProducts = useMemo(
    () => productList.filter((product) => product.status === 'published' || product.status === 'out_of_stock'),
    [productList]
  )
  const featured = useMemo(
    () => {
      const groups = new Map()
      publishedProducts.forEach((product) => {
        const category = product.category || 'Otros'
        groups.set(category, [...(groups.get(category) || []), product])
      })

      const selection = []
      const categoryGroups = [...groups.values()]
      let row = 0
      while (selection.length < 8 && categoryGroups.some((group) => group[row])) {
        categoryGroups.forEach((group) => {
          if (selection.length < 8 && group[row]) selection.push(group[row])
        })
        row += 1
      }
      return selection
    },
    [publishedProducts]
  )
  return (
    <div className="storefront">
      <MercadoQuoteFinder />
      <EditorialProductSlider products={productList} />

      <section className="store-hero" id="inicio">
        <div className="store-hero-copy">
          <div className="store-brand-context">
            <img src={mercadoBraLogo} alt="Mercadobra" />
            <span>presenta</span>
            <strong>Óxida Studio</strong>
          </div>
          <p className="store-kicker">Óxida Collection · Diseño · Fabricación · Envíos en Uruguay</p>
          <h1>Objetos firmes.<br /><em>Espacios propios.</em></h1>
          <p className="store-hero-text">
            Mercadobra presenta Óxida Collection: muebles y objetos de diseño
            en hierro y madera, listos para comprar o adaptar a tu espacio.
          </p>
          <div className="store-hero-actions">
            <Link to="/explorar#catalog-results" className="store-button store-button--primary">Ver la colección</Link>
            <a href="#cotizar" className="store-button store-button--secondary">Hacer a medida</a>
          </div>
          <div className="store-trust">
            <span>Compra segura</span><span>Fabricación local</span><span>Atención directa</span>
          </div>
        </div>
        <div className="store-hero-media">
          <img src={heroImage} alt="Escalera de hierro y madera diseñada por Óxida Studio" />
          <div className="store-hero-mark"><OxidaWordmark showByline /></div>
          <span className="store-hero-note">Colección 01 — 2026</span>
        </div>
      </section>

      <section className="store-section" id="coleccion">
        <div className="store-heading">
          <div>
            <span>Productos destacados</span>
            <h2>Una selección de nuestro catálogo.</h2>
            {!loadingProducts && publishedProducts.length > 0 && (
              <p className="store-product-count">
                {publishedProducts.length} producto{publishedProducts.length === 1 ? '' : 's'} disponible{publishedProducts.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="store-heading-action">
            <p>Mostramos una selección variada para que el inicio siga siendo claro y rápido.</p>
            <Link to="/explorar#catalog-results">
              Ver catálogo completo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        {loadingProducts ? (
          <p className="store-loading">Cargando colección…</p>
        ) : featured.length === 0 ? (
          <div className="store-products-empty">
            <p>Todavía no hay productos publicados.</p>
            <Link to="/explorar">Ir al catálogo</Link>
          </div>
        ) : (
          <>
            <div className="products-grid store-products">
              {featured.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {publishedProducts.length > featured.length && (
              <div className="store-catalog-footer">
                <p>Estás viendo {featured.length} de {publishedProducts.length} productos.</p>
                <Link to="/explorar#catalog-results">Ver los {publishedProducts.length} productos</Link>
              </div>
            )}
          </>
        )}
      </section>

      <section className="store-custom" id="como-funciona">
        <p>¿No encontraste exactamente lo que buscabas?</p>
        <h2>Tomamos un diseño base<br />y lo hacemos tuyo.</h2>
        <Link to="/contacto#formulario-contacto">Contanos tu idea <span>↗</span></Link>
      </section>
    </div>
  )
}
