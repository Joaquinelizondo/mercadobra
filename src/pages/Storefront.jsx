import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useProducts } from '../context/ProductContext'
import ProductCard from '../components/ProductCard'
import OxidaWordmark from '../components/OxidaWordmark'
import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import EditorialProductSlider from '../components/EditorialProductSlider'
import { FEATURES } from '../config/features'
import heroImage from '../assets/oxida/escalera.jpeg'
import casaImg from '../assets/oxida/casa.jpeg'
import entradaImg from '../assets/oxida/entrada.jpeg'
import estanteriaImg from '../assets/oxida/estanteria.jpeg'
import mercadoBraLogo from '../assets/mercadobra.png'
import './Storefront.css'

const EXECUTED_PROJECTS = [
  {
    id: 'p1',
    title: 'Escaleras suspendidas y estructuras helicoidales',
    category: 'Arquitectura & Acero',
    location: 'Carrasco, Montevideo',
    description: 'Estructura central en perfiles tubulares de acero al carbono, peldaños volados de madera maciza y baranda continua.',
    image: heroImage,
    tag: 'Diseño e Instalación'
  },
  {
    id: 'p2',
    title: 'Galerías, pérgolas y quinchos bioclimáticos',
    category: 'Estructuras & Exteriores',
    location: 'La Barra, Punta del Este',
    description: 'Pórticos de hierro estructural tratados contra intemperie, cerramientos herméticos y cubierta de madera técnica.',
    image: casaImg,
    tag: 'Construcción Integral'
  },
  {
    id: 'p3',
    title: 'Fachadas, portones y cerramientos de seguridad',
    category: 'Fachadas & Herrería',
    location: 'Pocitos, Montevideo',
    description: 'Diseño rítmico contemporáneo en perfiles de alta resistencia, pintura microtexturada electrostática y automatización.',
    image: entradaImg,
    tag: 'Fabricación a Medida'
  },
  {
    id: 'p4',
    title: 'Divisiones interiores tipo loft y cerramientos vidriados',
    category: 'Interiorismo & Vidrio',
    location: 'Ciudad Vieja, Montevideo',
    description: 'Estructuras ligeras en perfiles T y L con vidrios laminados repartidos, puertas pivotantes y alta atenuación acústica.',
    image: estanteriaImg,
    tag: 'Alineación de Obra'
  }
]

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
      {/* 1. Hero Principal de Alto Impacto */}
      <section className="store-hero" id="inicio">
        <div className="store-hero-copy">
          <div className="store-brand-context">
            <img src={mercadoBraLogo} alt="Mercadobra" />
            <span>presenta</span>
            <strong>Óxida Studio</strong>
          </div>
          <p className="store-kicker">Construcción · Diseño en Hierro y Madera · Fabricación</p>
          <h1 style={{fontSize: 'clamp(2.5rem, 5vw, 4.5rem)'}}>Lo que imaginás,<br /><em>en hierro y madera.</em></h1>
          <p className="store-hero-text">
            <strong>Tu idea. Una cotización a medida.</strong> Proyectos de construcción integrales de todo tipo: planos, anteproyectos, asesoramiento y ejecución.
          </p>
          <div className="store-hero-actions">
            <a href="#cotizar" className="store-button store-button--primary">Empezar proyecto a medida</a>
            {FEATURES.SHOW_ECOMMERCE_PRODUCTS ? (
              <Link to="/explorar#catalog-results" className="store-button store-button--secondary">Ver catálogo</Link>
            ) : (
              <a href="#proyectos-destacados" className="store-button store-button--secondary">Ver proyectos ejecutados</a>
            )}
          </div>
          <div className="store-trust">
            <span>Presupuesto exacto</span><span>Fabricación local</span><span>Atención técnica directa</span>
          </div>
        </div>
        <div className="store-hero-media">
          <img src={heroImage} alt="Escalera de hierro y madera diseñada por Óxida Studio" />
          <div className="store-hero-mark"><OxidaWordmark showByline /></div>
          <span className="store-hero-note">Proyectos & Obras — 2026</span>
        </div>
      </section>

      {/* 2. Cotizador Rápido Inteligente */}
      <MercadoQuoteFinder />
      {FEATURES.SHOW_ECOMMERCE_PRODUCTS && <EditorialProductSlider products={productList} />}

      {/* 3. Showcase Visual de Proyectos Ejecutados */}
      <section className="store-showcase" id="proyectos-destacados">
        <div className="store-heading">
          <div>
            <span>Obras & Soluciones a Medida</span>
            <h2>Hecho para durar.<br />Diseño y ejecución técnica.</h2>
            <p className="store-showcase-subtitle">
              Soluciones integrales de herrería pesada, liviana y mixta con madera noble para residencias, edificios y locales comerciales.
            </p>
          </div>
          <div className="store-heading-action">
            <p>Cada pieza se fabrica bajo planos técnicos de precisión y dirección técnica.</p>
            <Link to="/oxida#proyectos">
              Ver más proyectos <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="store-showcase-grid">
          {EXECUTED_PROJECTS.map((project) => (
            <article key={project.id} className="store-project-card">
              <div className="store-project-image">
                <img src={project.image} alt={project.title} loading="lazy" />
                <span className="store-project-tag">{project.tag}</span>
              </div>
              <div className="store-project-body">
                <div className="store-project-meta">
                  <span className="store-project-category">{project.category}</span>
                  <span className="store-project-location">📍 {project.location}</span>
                </div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <a href="#cotizar" className="store-project-quote-btn">
                  Cotizar proyecto similar <span>↘</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Teaser del Simulador 3D & OxI Pro */}
      <section className="store-modeler-teaser">
        <div className="store-modeler-teaser-content">
          <span className="store-modeler-badge">Tecnología ConstructionTech</span>
          <h2>Visualizá tu espacio en 3D antes de fabricar.</h2>
          <p>
            Estimá costos, calculá muros, aberturas y estructuras metálicas con nuestro simulador paramétrico conectado al motor de ingeniería OXI Quote.
          </p>
          <div className="store-modeler-actions">
            <Link to="/cliente/login" className="store-button store-button--primary">
              Acceder al Portal de Obra
            </Link>
            <Link to="/partner" className="store-button store-button--secondary" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
              Para Constructoras & Estudios
            </Link>
          </div>
        </div>
      </section>

      {/* E-commerce grid condicional (invisibilizado por defecto) */}
      {FEATURES.SHOW_ECOMMERCE_PRODUCTS && (
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
      )}

      {/* 5. Cierre y Llamado a la Acción */}
      <section className="store-custom" id="como-funciona">
        <p>¿Tenés un plano, croquis o requerimiento especial?</p>
        <h2>Hagámoslo realidad juntos.<br />De la idea a la instalación.</h2>
        <Link to="/contacto#formulario-contacto">Escribinos y coordinemos una visita <span>↗</span></Link>
      </section>
    </div>
  )
}
