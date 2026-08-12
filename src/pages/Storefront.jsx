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
  const featured = useMemo(
    () => productList.filter((product) => product.status === 'published').slice(0, 8),
    [productList]
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
            <Link to="/explorar" className="store-button store-button--primary">Ver la colección</Link>
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
          <div><span>Óxida Collection</span><h2>Diseños listos para comprar.</h2></div>
          <p>Elegí un modelo base. Después definimos contigo medidas, color y terminación.</p>
        </div>
        {loadingProducts ? (
          <p className="store-loading">Cargando colección…</p>
        ) : (
          <div className="products-grid store-products">
            {featured.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>

      <section className="store-custom" id="como-funciona">
        <p>¿No encontraste exactamente lo que buscabas?</p>
        <h2>Tomamos un diseño base<br />y lo hacemos tuyo.</h2>
        <Link to="/oxida#cotizar">Contanos tu idea <span>↗</span></Link>
      </section>
    </div>
  )
}
