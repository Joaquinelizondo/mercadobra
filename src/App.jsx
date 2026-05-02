import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Wishlist from './pages/Wishlist'
import SupplierProfile from './pages/SupplierProfile'
import SupplierLogin from './pages/SupplierLogin'
import SupplierDashboard from './pages/SupplierDashboard'
import CustomerLogin from './pages/CustomerLogin'
import CustomerRegister from './pages/CustomerRegister'
import OrderTracking from './pages/OrderTracking'
import NotFound from './pages/NotFound'
import { useState } from 'react'
import heroImg from './assets/hero.png'
import logoImg from './assets/mercadobra.png'
import './App.css'

const CATALOG_CATEGORIES = ['Todos', 'Hormigón', 'Hierro', 'Terminaciones', 'Herramientas']
const UNIT_OPTIONS = ['bolsa', 'm²', 'm³', 'barra', 'paño', 'unidad', 'juego', 'rollo', 'kit', 'par', 'litro', 'balde']
const CATEGORY_OPTIONS = ['Hormigón', 'Hierro', 'Terminaciones', 'Herramientas']
const CARD_COLORS = ['#f59e0b','#d97706','#78716c','#6b7280','#9ca3af','#475569','#a8a29e','#0ea5e9','#22c55e','#f97316','#8b5cf6','#ec4899']

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: 'Cemento Portland 50 kg',
    company: 'Corralón La Obra',
    category: 'Hormigón',
    price: 8500,
    unit: 'bolsa',
    description: 'Cemento de alta resistencia, ideal para fundaciones y losas.',
    color: '#f59e0b',
  },
  {
    id: 2,
    name: 'Arena fina m³',
    company: 'Áridos del Sur',
    category: 'Hormigón',
    price: 12000,
    unit: 'm³',
    description: 'Arena seca y cribada para mezclas y hormigón elaborado.',
    color: '#d97706',
  },
  {
    id: 3,
    name: 'Piedra partida 6/20 m³',
    company: 'Áridos del Sur',
    category: 'Hormigón',
    price: 15500,
    unit: 'm³',
    description: 'Piedra triturada lista para hormigón estructural.',
    color: '#78716c',
  },
  {
    id: 4,
    name: 'Hierro nervado 12 mm × 12 m',
    company: 'Estructura Total',
    category: 'Hierro',
    price: 9800,
    unit: 'barra',
    description: 'Barra corrugada para vigas, columnas y losas.',
    color: '#6b7280',
  },
  {
    id: 5,
    name: 'Malla Q-188 2×1 m',
    company: 'Estructura Total',
    category: 'Hierro',
    price: 6300,
    unit: 'paño',
    description: 'Malla electrosoldada para contrapisos y muros.',
    color: '#9ca3af',
  },
  {
    id: 6,
    name: 'Perfil UPN 100 × 6 m',
    company: 'MetalWork BA',
    category: 'Hierro',
    price: 22000,
    unit: 'unidad',
    description: 'Perfil en U laminado en caliente para estructuras metálicas.',
    color: '#475569',
  },
  {
    id: 7,
    name: 'Porcelanato 60×60 gris',
    company: 'Revestimientos Pro',
    category: 'Terminaciones',
    price: 4900,
    unit: 'm²',
    description: 'Porcelanato rectificado, alto tránsito, acabado mate.',
    color: '#a8a29e',
  },
  {
    id: 8,
    name: 'Pintura látex interior 20 L',
    company: 'Pinturas Nord',
    category: 'Terminaciones',
    price: 18500,
    unit: 'balde',
    description: 'Látex premium lavable, cobertura en 2 manos.',
    color: '#fbbf24',
  },
  {
    id: 9,
    name: 'Grifería monocomando',
    company: 'Sanitarios Sur',
    category: 'Terminaciones',
    price: 14200,
    unit: 'juego',
    description: 'Monocomando con cartucho cerámico, acabado cromado.',
    color: '#a3e635',
  },
  {
    id: 10,
    name: 'Amoladora angular 115 mm',
    company: 'HerramientasXL',
    category: 'Herramientas',
    price: 32000,
    unit: 'unidad',
    description: 'Potencia 900W, disco incluido, mango anti-vibración.',
    color: '#f97316',
  },
  {
    id: 11,
    name: 'Taladro percutor 13 mm',
    company: 'HerramientasXL',
    category: 'Herramientas',
    price: 27500,
    unit: 'unidad',
    description: 'Reversible, 2 velocidades, mango lateral de apoyo.',
    color: '#0ea5e9',
  },
  {
    id: 12,
    name: 'Casco + Chaleco EPP Kit',
    company: 'SegurObra',
    category: 'Herramientas',
    price: 5800,
    unit: 'kit',
    description: 'Equipamiento personal básico: casco IRAM, chaleco reflectivo.',
    color: '#22c55e',
  },
]

function companyInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const categories = [
  {
    title: 'Hormigón y áridos',
    description: 'Publicá cemento, arena, piedra, bloques y soluciones para obra gruesa.',
  },
  {
    title: 'Hierro y estructuras',
    description: 'Conectá con constructoras que buscan perfiles, mallas, chapas y caños.',
  },
  {
    title: 'Terminaciones',
    description: 'Mostrá pisos, revestimientos, pinturas, sanitarios y grifería.',
  },
  {
    title: 'Herramientas y seguridad',
    description: 'Ofrecé maquinaria, elementos de protección y equipamiento profesional.',
  },
]

const benefits = [
  'Perfil profesional para empresas, barracas y distribuidores.',
  'Catálogo digital para exhibir productos con fotos, precios y stock.',
  'Consultas directas para generar ventas y relaciones comerciales.',
  'Mayor visibilidad en un portal pensado para el mundo de la construcción.',
]

const metrics = [
  { value: '+500', label: 'productos destacados' },
  { value: '24/7', label: 'vidriera online activa' },
  { value: 'B2B', label: 'enfoque comercial para obra y barraca' },
]

// Cuentas de proveedores registradas (demo — en producción esto viene de un backend)
const SUPPLIER_ACCOUNTS = [
  { email: 'corralonlaobra@mercadobra.com', password: 'demo123', company: 'Corralón La Obra' },
  { email: 'estructuratotal@mercadobra.com', password: 'demo123', company: 'Estructura Total' },
  { email: 'metalworkba@mercadobra.com',    password: 'demo123', company: 'MetalWork BA' },
  { email: 'herramientasxl@mercadobra.com', password: 'demo123', company: 'HerramientasXL' },
  { email: 'revestimientospro@mercadobra.com', password: 'demo123', company: 'Revestimientos Pro' },
]

const EMPTY_FORM = { name: '', category: 'Hormigón', price: '', unit: 'bolsa', description: '' }

// eslint-disable-next-line no-unused-vars
function AppLegacy() {
  const year = new Date().getFullYear()
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [productList, setProductList] = useState(INITIAL_PRODUCTS)
  const [publishOpen, setPublishOpen] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formSuccess, setFormSuccess] = useState(false)
  const [supplierUser, setSupplierUser] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')

  const filteredProducts =
    activeCategory === 'Todos'
      ? productList
      : productList.filter((p) => p.category === activeCategory)

  function openPublish() {
    if (!supplierUser) {
      setLoginError('')
      setLoginOpen(true)
    } else {
      setFormSuccess(false)
      setPublishOpen(true)
    }
  }

  function handleLoginChange(e) {
    const { name, value } = e.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
    setLoginError('')
  }

  function handleLogin(e) {
    e.preventDefault()
    const account = SUPPLIER_ACCOUNTS.find(
      (a) => a.email === loginForm.email.trim().toLowerCase() && a.password === loginForm.password
    )
    if (!account) {
      setLoginError('Usuario o contraseña incorrectos.')
      return
    }
    setSupplierUser(account)
    setLoginOpen(false)
    setLoginForm({ email: '', password: '' })
    setFormSuccess(false)
    setPublishOpen(true)
  }

  function handleLogout() {
    setSupplierUser(null)
    setPublishOpen(false)
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handlePublish(e) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price) return
    const newProduct = {
      id: Date.now(),
      name: formData.name.trim(),
      company: supplierUser.company,
      category: formData.category,
      price: parseFloat(formData.price),
      unit: formData.unit,
      description: formData.description.trim(),
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
    }
    setProductList((prev) => [newProduct, ...prev])
    setFormSuccess(true)
    setTimeout(() => {
      setFormSuccess(false)
      setPublishOpen(false)
      setFormData(EMPTY_FORM)
      setActiveCategory(newProduct.category)
    }, 1800)
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function addToCart(product) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCartItems((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    )
  }

  function formatPrice(n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <main className="page" id="inicio">
      <header className="topbar">
        <div className="brand-wrap">
          <img src={logoImg} className="brand-logo" alt="MercadObra" />
        </div>
        <nav className="topbar-menu" aria-label="Navegación principal">
          <a href="#inicio">Inicio</a>
          <a href="#categorias">Categorías</a>
          <a href="#explorar">Explorar</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#contacto">Contacto</a>
        </nav>
        {supplierUser ? (
          <div className="supplier-session">
            <span className="supplier-session-avatar">{companyInitials(supplierUser.company)}</span>
            <span className="supplier-session-name">{supplierUser.company}</span>
            <button className="supplier-logout" onClick={handleLogout} aria-label="Cerrar sesión">
              Salir
            </button>
          </div>
        ) : (
          <button className="topbar-login-btn" onClick={() => { setLoginError(''); setLoginOpen(true) }}>
            Ingresar como proveedor
          </button>
        )}
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Tu empresa, visible para toda la obra</span>
          <h1>La vitrina digital donde barracas y empresas venden materiales de construcción.</h1>
          <p className="hero-text">
            MercadObra conecta proveedores con clientes del rubro para que puedan
            descubrir, comparar y consultar productos de forma simple, rápida y profesional.
          </p>

          <div className="hero-actions">
            <a href="#contacto" className="primary-link large-link">
              Quiero publicar mi catálogo
            </a>
            <a href="#como-funciona" className="ghost-link large-link">
              Cómo funciona
            </a>
          </div>

          <ul className="metrics" aria-label="Indicadores principales">
            {metrics.map((item) => (
              <li key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-card">
          <div className="hero-card-badge">Nueva plataforma</div>
          <img src={logoImg} className="hero-logo" alt="Logo MercadObra" />
          <img src={heroImg} alt="Ilustración de materiales y herramientas de obra" />
          <div className="hero-card-content">
            <p className="card-kicker">Pensado para el sector</p>
            <h2>Mostrá tus productos, generá contactos y hacé crecer tu presencia online.</h2>
            <p>
              Desde hierro y áridos hasta terminaciones y herramientas, todo en un solo lugar.
            </p>
          </div>
        </div>
      </section>

      <section className="info-strip">
        <p>
          MercadObra nace para impulsar la venta digital de materiales, herramientas y soluciones para la construcción.
        </p>
      </section>

      <section className="section" id="categorias">
        <div className="section-heading">
          <span className="eyebrow">Categorías destacadas</span>
          <h2>Todo lo que una obra necesita, organizado para vender mejor.</h2>
        </div>

        <div className="categories-grid">
          {categories.map((category) => (
            <article key={category.title} className="category-card">
              <h3>{category.title}</h3>
              <p>{category.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-alt" id="como-funciona">
        <div className="section-heading narrow">
          <span className="eyebrow">Cómo funciona</span>
          <h2>Una presencia digital simple para empresas y barracas.</h2>
        </div>

        <div className="steps-grid">
          <article className="step-card">
            <span>01</span>
            <h3>Creá tu perfil</h3>
            <p>Presentá tu empresa, ubicación, rubro y datos de contacto profesionales.</p>
          </article>
          <article className="step-card">
            <span>02</span>
            <h3>Publicá productos</h3>
            <p>Subí fotos, precios, descripciones y destacá el stock o condiciones comerciales.</p>
          </article>
          <article className="step-card">
            <span>03</span>
            <h3>Recibí consultas</h3>
            <p>Conectá con clientes interesados en materiales para obra, reforma o mantenimiento.</p>
          </article>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="section-heading narrow-left">
          <span className="eyebrow">Por qué MercadObra</span>
          <h2>Una plataforma creada para tu empresa y para el ritmo del rubro.</h2>
        </div>

        <div className="benefits-panel">
          <ul className="benefits-list">
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>

          <aside className="highlight-box">
            <p className="card-kicker">Ideal para</p>
            <h3>Barracas, corralones, importadores, fabricantes y distribuidores.</h3>
            <p>
              Si vendés productos para la construcción, MercadObra te ayuda a mostrar tu oferta de manera clara y profesional.
            </p>
          </aside>
        </div>
      </section>

      {/* ── CATALOG SECTION ── */}
      <section className="section catalog-section" id="explorar">
        <div className="catalog-section-heading">
          <div className="section-heading" style={{ flex: 1 }}>
            <span className="eyebrow">Catálogo de productos</span>
            <h2>Explorá materiales, herramientas y mucho más.</h2>
          </div>
          <button className="publish-btn" onClick={openPublish}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
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

        <div className="products-grid">
          {filteredProducts.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-img" style={{ '--product-color': product.color }} aria-hidden="true">
                <span className="product-category-tag">{product.category}</span>
              </div>
              <div className="product-body">
                <div className="company-badge">
                  <span className="company-avatar" style={{ '--company-color': product.color }}>
                    {companyInitials(product.company)}
                  </span>
                  <span className="company-name">{product.company}</span>
                </div>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-desc">{product.description}</p>
                <div className="product-footer">
                  <div className="product-price">
                    <span className="price-amount">{formatPrice(product.price)}</span>
                    <span className="price-unit">/ {product.unit}</span>
                  </div>
                  <button
                    className="add-to-cart-btn"
                    onClick={() => { addToCart(product); setCartOpen(true) }}
                    aria-label={`Agregar ${product.name} al carrito`}
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section cta-section" id="contacto">
        <span className="eyebrow">Sumate desde el inicio</span>
        <h2>Hacé que MercadObra sea la cara digital de tu empresa.</h2>
        <p>
          Empezá a construir tu catálogo online y prepará tu negocio para recibir nuevas oportunidades comerciales.
        </p>
        <div className="hero-actions centered-actions">
          <a href="mailto:hola@mercadobra.com" className="primary-link large-link">
            Contactar a MercadObra
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
          <section>
            <h3>MercadObra</h3>
            <p>
              Marketplace para empresas, barracas y distribuidores de productos para construcción.
            </p>
          </section>

          <section>
            <h3>Enlaces</h3>
            <ul>
              <li>
                <a href="#inicio">Inicio</a>
              </li>
              <li>
                <a href="#categorias">Categorías</a>
              </li>
              <li>
                <a href="#como-funciona">Cómo funciona</a>
              </li>
              <li>
                <a href="#contacto">Publicar productos</a>
              </li>
            </ul>
          </section>

          <section>
            <h3>Redes sociales</h3>
            <ul className="social-links-list">
              <li>
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="social-link"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.85 1.35a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" fill="currentColor"/>
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="social-link"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                >
                  <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                    <path d="M5.1 3A2.1 2.1 0 1 1 3 5.1 2.1 2.1 0 0 1 5.1 3ZM3.3 8.1h3.6V21H3.3V8.1Zm6 0h3.45v1.77h.05A3.78 3.78 0 0 1 16.2 7.8c3.56 0 4.2 2.34 4.2 5.37V21h-3.6v-6.95c0-1.66-.03-3.8-2.32-3.8-2.33 0-2.69 1.82-2.69 3.68V21H9.3V8.1Z" fill="currentColor"/>
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="social-link"
                  aria-label="Facebook"
                  title="Facebook"
                >
                  <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                    <path d="M13.5 22v-8.1h2.73l.41-3.17H13.5V8.7c0-.92.25-1.55 1.57-1.55h1.67V4.31A22 22 0 0 0 14.3 4c-2.42 0-4.08 1.48-4.08 4.2v2.52H7.5v3.17h2.72V22h3.28Z" fill="currentColor"/>
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5491100000000"
                  target="_blank"
                  rel="noreferrer"
                  className="social-link"
                  aria-label="WhatsApp"
                  title="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                    <path d="M20.5 3.5A11.3 11.3 0 0 0 2.8 17.2L1.5 22.5l5.4-1.3A11.3 11.3 0 1 0 20.5 3.5Zm-8.2 17.1a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.2.77.76-3.12-.22-.36a9.46 9.46 0 1 1 7.98 4.22Zm5.2-7.1c-.28-.14-1.65-.81-1.9-.9-.25-.1-.43-.14-.61.14-.18.27-.7.9-.86 1.08-.16.18-.31.2-.59.07-.27-.14-1.14-.42-2.17-1.35-.8-.71-1.34-1.59-1.5-1.86-.16-.28-.02-.42.12-.56.13-.12.28-.32.41-.48.14-.16.18-.28.28-.46.09-.18.04-.35-.02-.49-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.46.07-.71.35-.25.27-.95.93-.95 2.27 0 1.34.97 2.63 1.1 2.81.14.18 1.9 2.9 4.6 4.07.64.28 1.14.45 1.52.58.64.2 1.23.17 1.7.1.52-.08 1.65-.67 1.88-1.33.23-.66.23-1.22.16-1.33-.07-.11-.25-.17-.53-.31Z" fill="currentColor"/>
                  </svg>
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h3>Contacto</h3>
            <ul>
              <li>
                <a href="mailto:hola@mercadobra.com">hola@mercadobra.com</a>
              </li>
              <li>
                <a href="tel:+5491100000000">+54 9 11 0000 0000</a>
              </li>
              <li>Buenos Aires, Argentina</li>
            </ul>
          </section>
        </div>

        <div className="footer-bottom">
          <p>© {year} MercadObra. Todos los derechos reservados.</p>
        </div>
      </footer>
      {/* ── LOGIN MODAL ── */}
      {loginOpen && (
        <div className="modal-overlay" onClick={() => setLoginOpen(false)} aria-hidden="true" />
      )}
      {loginOpen && (
        <div className="publish-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <div className="modal-header">
            <h2 id="login-title">Acceso proveedores</h2>
            <button className="cart-close" onClick={() => setLoginOpen(false)} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <form className="publish-form" onSubmit={handleLogin} noValidate>
            <p className="login-intro">Esta sección es exclusiva para empresas con cuenta en MercadObra. Ingresá con tus credenciales para publicar productos.</p>
            {loginError && <p className="login-error" role="alert">{loginError}</p>}
            <div className="form-row">
              <label className="form-label" htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                className="form-input"
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                placeholder="empresa@mercadobra.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                className="form-input"
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="cart-confirm-btn">Ingresar</button>
            <p className="login-signup-hint">¿Tu empresa todavía no tiene cuenta? <a href="#contacto" onClick={() => setLoginOpen(false)}>Contactanos</a> para sumarte.</p>
          </form>
        </div>
      )}

      {/* ── PUBLISH MODAL ── */}
      {publishOpen && (
        <div className="modal-overlay" onClick={() => setPublishOpen(false)} aria-hidden="true" />
      )}
      {publishOpen && (
        <div className="publish-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-header">
            <h2 id="modal-title">Publicar producto</h2>
            <button className="cart-close" onClick={() => setPublishOpen(false)} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {formSuccess ? (
            <div className="publish-success">
              <div className="success-icon" aria-hidden="true">✓</div>
              <p>¡Producto publicado con éxito!</p>
              <p className="success-sub">Ya aparece en el catálogo.</p>
            </div>
          ) : (
            <form className="publish-form" onSubmit={handlePublish} noValidate>
              <div className="form-row">
                <label className="form-label">Empresa proveedora</label>
                <div className="form-locked">
                  <span className="form-locked-avatar">{supplierUser && companyInitials(supplierUser.company)}</span>
                  <span className="form-locked-name">{supplierUser?.company}</span>
                  <span className="form-locked-tag">Tu cuenta</span>
                </div>
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="pub-name">Nombre del producto *</label>
                <input
                  id="pub-name"
                  className="form-input"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Ej: Cemento Portland 50 kg"
                  required
                />
              </div>
              <div className="form-row form-row--2col">
                <div>
                  <label className="form-label" htmlFor="pub-category">Categoría</label>
                  <select id="pub-category" className="form-input" name="category" value={formData.category} onChange={handleFormChange}>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="pub-unit">Unidad de venta</label>
                  <select id="pub-unit" className="form-input" name="unit" value={formData.unit} onChange={handleFormChange}>
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="pub-price">Precio (ARS) *</label>
                <input
                  id="pub-price"
                  className="form-input"
                  name="price"
                  type="number"
                  min="1"
                  value={formData.price}
                  onChange={handleFormChange}
                  placeholder="Ej: 8500"
                  required
                />
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="pub-description">Descripción breve</label>
                <textarea
                  id="pub-description"
                  className="form-input form-textarea"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Describí el producto, condiciones, stock disponible..."
                  rows={3}
                />
              </div>
              <button type="submit" className="cart-confirm-btn">Publicar en el catálogo</button>
            </form>
          )}
        </div>
      )}

      {/* ── FLOATING CART BUTTON ── */}
      {cartCount > 0 && (
        <button
          className="cart-fab"
          onClick={() => setCartOpen(true)}
          aria-label={`Ver carrito (${cartCount} productos)`}
        >
          <svg viewBox="0 0 24 24" className="cart-fab-icon" aria-hidden="true">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span className="cart-fab-count">{cartCount}</span>
        </button>
      )}

      {/* ── CART SIDEBAR ── */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)} aria-hidden="true" />
      )}
      <aside className={`cart-sidebar${cartOpen ? ' cart-sidebar--open' : ''}`} aria-label="Carrito de compras">
        <div className="cart-header">
          <h2>
            Mi pedido
            {cartCount > 0 && <span className="cart-header-count"> ({cartCount})</span>}
          </h2>
          <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <p>Tu carrito está vacío.</p>
            <p>Explorá el catálogo y agregá productos.</p>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item-dot" style={{ '--product-color': item.color }} />
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.name}</p>
                    <p className="cart-item-company">{item.company}</p>
                  </div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)} aria-label="Quitar uno">−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)} aria-label="Agregar uno">+</button>
                  </div>
                  <p className="cart-item-subtotal">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total estimado</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <button className="cart-confirm-btn" onClick={() => alert('¡Pedido enviado! Te contactaremos pronto.')}>
                Confirmar pedido
              </button>
              <button className="cart-clear-btn" onClick={() => { setCartItems([]); setCartOpen(false) }}>
                Vaciar carrito
              </button>
            </div>
          </>
        )}
      </aside>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/explorar" element={<Catalog />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
        <Route path="/favoritos" element={<Wishlist />} />
        <Route path="/proveedor/:company" element={<SupplierProfile />} />
        <Route path="/cliente/login" element={<CustomerLogin />} />
        <Route path="/cliente/registro" element={<CustomerRegister />} />
        <Route path="/proveedor/login" element={<SupplierLogin />} />
        <Route path="/proveedor" element={<SupplierDashboard />} />
        <Route path="/seguimiento/:trackingToken" element={<OrderTracking />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
