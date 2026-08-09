import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import OxidaWordmark from '../components/OxidaWordmark'
import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import ProductCard from '../components/ProductCard'
import { useProducts } from '../context/ProductContext'
import camaImg from '../assets/oxida/cama-hierro.jpeg'
import casaImg from '../assets/oxida/casa.jpeg'
import entradaImg from '../assets/oxida/entrada.jpeg'
import escaleraImg from '../assets/oxida/escalera.jpeg'
import estanteImg from '../assets/oxida/estante.jpeg'
import estanteriaImg from '../assets/oxida/estanteria.jpeg'
import './OxidaStudio.css'

const projects = [
  { image: escaleraImg, type: 'Arquitectura', title: 'Escaleras que ordenan el espacio', number: '01', wide: true },
  { image: camaImg, type: 'Mobiliario', title: 'Piezas esenciales, hechas para durar', number: '02' },
  { image: entradaImg, type: 'Fachadas', title: 'Privacidad con ritmo y textura', number: '03' },
  { image: casaImg, type: 'Estructuras', title: 'Amplitud sin perder carácter', number: '04' },
  { image: estanteImg, type: 'Interiorismo', title: 'Orden con identidad propia', number: '05' },
  { image: estanteriaImg, type: 'Colección', title: 'Metal, madera y proporción', number: '06', wide: true },
]

const capabilities = [
  {
    number: '01',
    name: 'Óxida Projects',
    description: 'Desarrollo integral de proyectos: diseño, coordinación y ejecución.',
    services: ['Diseño y ejecución de obras de arquitectura', 'Dirección de obra representando al cliente', 'Coordinación integral de proyecto'],
  },
  {
    number: '02',
    name: 'Óxida Pro',
    description: 'Soluciones técnicas para estudios de arquitectura, constructoras y desarrolladores.',
    services: ['Cálculo estructural', 'Memoria de estructura', 'Visitas técnicas a obra', 'Asesoramiento profesional'],
  },
  {
    number: '03',
    name: 'Óxida Custom Works',
    description: 'Fabricación especializada y soluciones completamente a medida.',
    services: ['Ejecución de estructuras', 'Fabricación de parrilleros', 'Piezas y soluciones especiales'],
  },
  {
    number: '04',
    name: 'Óxida Care',
    description: 'Mantenimiento, restauración y servicio de posventa.',
    services: ['Mantenimiento de estructuras', 'Mantenimiento de parrilleros', 'Restauración y puesta a punto', 'Servicio de posventa'],
  },
]

export default function OxidaStudio() {
  const { productList, loadingProducts } = useProducts()
  const shopProducts = useMemo(() => {
    const oxidaProducts = productList.filter((product) =>
      product.status === 'published' && String(product.company || '').toLowerCase().includes('oxida')
    )
    return (oxidaProducts.length ? oxidaProducts : productList).slice(0, 6)
  }, [productList])

  return (
    <main className="oxida-site">
      <MercadoQuoteFinder />

      <section className="oxida-hero">
        <div className="oxida-hero-media">
          <img src={escaleraImg} alt="Escalera contemporánea de hierro y madera" />
          <span className="oxida-hero-count">01 / 06</span>
        </div>
        <div className="oxida-hero-copy">
          <OxidaWordmark className="oxida-hero-brand-lockup" showByline />
          <p className="oxida-label">Diseño · Cotización · Fabricación</p>
          <h1>Ideas firmes.<br /><em>Espacios únicos.</em></h1>
          <p className="oxida-hero-intro">
            Transformamos hierro y madera en soluciones que pertenecen a tu espacio.
            Del primer trazo a la instalación, en un solo lugar.
          </p>
          <div className="oxida-hero-actions">
            <a href="#tienda" className="oxida-arrow-link">Comprar colección <span>↓</span></a>
            <a href="#cotizar" className="oxida-hero-custom-link">Hacer a medida ↘</a>
          </div>
        </div>
        <div className="oxida-scroll-note">DESLIZÁ PARA EXPLORAR</div>
      </section>

      <section className="oxida-manifesto">
        <p className="oxida-section-number">[ 01 — ENFOQUE ]</p>
        <h2>No fabricamos objetos.<br />Construimos <span>parte del lugar.</span></h2>
        <p>
          Cada proyecto parte de una necesidad real y termina en una pieza precisa.
          Diseño honesto, materiales nobles y una red de fabricación coordinada por Oxida.
        </p>
      </section>

      <section className="oxida-capabilities" aria-labelledby="oxida-capabilities-title">
        <div className="oxida-capabilities-heading">
          <p className="oxida-section-number">[ 02 — CAPACIDADES ]</p>
          <h2 id="oxida-capabilities-title">Una empresa.<br /><span>Cuatro formas de hacer.</span></h2>
          <p>Distintas escalas y necesidades, bajo una misma dirección de diseño, fabricación y ejecución.</p>
        </div>
        <div className="oxida-capabilities-list">
          {capabilities.map((capability) => (
            <article key={capability.number}>
              <span>{capability.number}</span>
              <h3>{capability.name}</h3>
              <div className="oxida-capability-copy">
                <p>{capability.description}</p>
                <ul>
                  {capability.services.map((service) => <li key={service}>{service}</li>)}
                </ul>
              </div>
              <i aria-hidden="true">↗</i>
            </article>
          ))}
        </div>
      </section>

      <section className="oxida-shop" id="tienda">
        <div className="oxida-shop-heading">
          <div>
            <p className="oxida-section-number">[ 03 — TIENDA ]</p>
            <h2>Diseños para<br /><span>hacerlos tuyos.</span></h2>
          </div>
          <div>
            <p>
              Modelos base listos para comprar. Elegí una pieza y después definimos
              contigo medida, color y terminación.
            </p>
            <Link to="/explorar">Ver toda la colección ↗</Link>
          </div>
        </div>

        {loadingProducts ? (
          <p className="oxida-shop-loading">Cargando colección…</p>
        ) : (
          <div className="products-grid oxida-shop-grid">
            {shopProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>

      <section className="oxida-projects" id="proyectos">
        <div className="oxida-section-heading">
          <div>
            <p className="oxida-section-number">[ 04 — PROYECTOS ]</p>
            <h2>Hecho para<br /><span>quedarse.</span></h2>
          </div>
          <p>Una selección de posibilidades para imaginar qué podemos construir juntos.</p>
        </div>
        <div className="oxida-project-grid">
          {projects.map((project) => (
            <article className={`oxida-project-card${project.wide ? ' is-wide' : ''}`} key={project.number}>
              <div className="oxida-project-image">
                <img src={project.image} alt={project.title} />
                <span>{project.number}</span>
              </div>
              <div className="oxida-project-meta">
                <p>{project.type}</p>
                <h3>{project.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="oxida-process" id="proceso">
        <div className="oxida-section-heading oxida-process-heading">
          <div>
            <p className="oxida-section-number">[ 05 — PROCESO ]</p>
            <h2>De tu idea<br />a la <span>realidad.</span></h2>
          </div>
          <p>Un método simple para que diseñar a medida deje de ser complicado.</p>
        </div>
        <div className="oxida-process-list">
          <article><span>01</span><h3>Contanos</h3><p>Compartí una foto, plano, croquis o simplemente la idea.</p></article>
          <article><span>02</span><h3>Diseñamos</h3><p>Definimos medidas, materiales, terminaciones y una propuesta visual.</p></article>
          <article><span>03</span><h3>Cotizamos</h3><p>Recibís un alcance claro, precio estimado y plazo de ejecución.</p></article>
          <article><span>04</span><h3>Fabricamos</h3><p>Coordinamos producción, control de calidad e instalación.</p></article>
        </div>
      </section>

    </main>
  )
}
