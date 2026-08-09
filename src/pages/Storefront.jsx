import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import OxidaWordmark from '../components/OxidaWordmark'
import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import heroImage from '../assets/oxida/escalera.jpeg'
import mercadoBraLogo from '../assets/mercadobra.png'
import './Storefront.css'

const categoryCopy = {
  Mobiliario: 'Piezas funcionales en hierro y madera.',
  'Escaleras y barandas': 'Soluciones seguras con carácter.',
  'Fachadas y divisores': 'Privacidad, ritmo y materialidad.',
  Estructuras: 'Sistemas firmes hechos para durar.',
}

export default function Storefront() {
  const { productList, loadingProducts } = useProducts()
  const featured = useMemo(
    () => productList.filter((product) => product.status === 'published').slice(0, 8),
    [productList]
  )
  const categories = useMemo(
    () => [...new Set(productList.map((product) => product.category).filter(Boolean))].slice(0, 4),
    [productList]
  )

  return (
    <div className="storefront">
      <MercadoQuoteFinder />

      <section className="store-hero" id="inicio">
        <div className="store-hero-copy">
          <div className="store-brand-context">
            <img src={mercadoBraLogo} alt="Mercadobra" />
            <span>presenta</span>
            <strong>Óxida Studio</strong>
          </div>
          <p className="store-kicker">Primera colección · Diseño · Fabricación · Envíos en Uruguay</p>
          <h1>Objetos firmes.<br /><em>Espacios propios.</em></h1>
          <p className="store-hero-text">
            Mercadobra abre su primera colección junto a Óxida Studio: piezas esenciales
            en hierro y madera, listas para comprar o adaptar a tu espacio.
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

      <section className="store-section" id="categorias">
        <div className="store-heading">
          <div><span>Comprar por categoría</span><h2>Encontrá la pieza para tu espacio.</h2></div>
          <Link to="/explorar">Ver todo ↗</Link>
        </div>
        <div className="store-categories">
          {categories.map((category, index) => (
            <Link key={category} to={`/explorar?category=${encodeURIComponent(category)}`} className="store-category">
              <span>0{index + 1}</span>
              <h3>{category}</h3>
              <p>{categoryCopy[category] || 'Diseño y fabricación con terminaciones a elección.'}</p>
              <b>Explorar →</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="store-mercadobra-note">
        <div>
          <span>Mercadobra</span>
          <h2>Todo para transformar tu espacio, en un solo lugar.</h2>
        </div>
        <p>
          Empezamos con la colección Óxida y seguimos ampliando el catálogo con
          productos, talleres y proveedores seleccionados.
        </p>
        <Link to="/explorar">Explorar Mercadobra ↗</Link>
      </section>

      <section className="store-section" id="coleccion">
        <div className="store-heading">
          <div><span>Selección Óxida</span><h2>Diseños listos para comprar.</h2></div>
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
