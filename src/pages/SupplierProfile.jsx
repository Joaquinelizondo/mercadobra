import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { formatPrice, companyInitials } from '../utils/format'
import ProductCard from '../components/ProductCard'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { VerifiedBadge, TopRatedBadge, FastShippingBadge } from '../components/Badges'
import '../styles/SupplierProfile.css'

const SUPPLIER_INFO = {
  'Corralón La Obra': {
    phone: '(011) 4123-4567',
    zone: 'CABA',
    rating: 4.8,
    reviews: 156,
    since: '2015',
    about: 'Proveedor mayorista de materiales de construcción con más de 15 años de experiencia en CABA.'
  },
  'Áridos del Sur': {
    phone: '(011) 4234-5678',
    zone: 'Zona Sur',
    rating: 4.6,
    reviews: 89,
    since: '2018',
    about: 'Especializados en áridos, hormigones premezclados y granulometría personalizada.'
  },
  'Estructura Total': {
    phone: '(011) 4345-6789',
    zone: 'Zona Norte',
    rating: 4.9,
    reviews: 203,
    since: '2012',
    about: 'Distribuidor oficial de hierro y estructuras metálicas de primera calidad.'
  },
  'MetalWork BA': {
    phone: '(011) 4456-7890',
    zone: 'CABA',
    rating: 4.7,
    reviews: 142,
    since: '2014',
    about: 'Perfiles, ángulos y chapas de acero para proyectos constructivos.'
  },
  'Revestimientos Pro': {
    phone: '(011) 4567-8901',
    zone: 'Zona Oeste',
    rating: 4.5,
    reviews: 67,
    since: '2016',
    about: 'Cerámicos, porcelanatos y revestimientos importados y nacionales.'
  },
  'Pinturas Nord': {
    phone: '(011) 4678-9012',
    zone: 'Zona Norte',
    rating: 4.4,
    reviews: 98,
    since: '2013',
    about: 'Pinturas, barnices y esmaltes para interiores y exteriores.'
  },
  'Sanitarios Sur': {
    phone: '(011) 4789-0123',
    zone: 'Zona Sur',
    rating: 4.6,
    reviews: 112,
    since: '2017',
    about: 'Sanitarios, grifería y accesorios de baño para todos los presupuestos.'
  },
  'HerramientasXL': {
    phone: '(011) 4890-1234',
    zone: 'CABA',
    rating: 4.8,
    reviews: 289,
    since: '2010',
    about: 'Herramientas profesionales y equipos de construcción de todas marcas.'
  },
  'SegurObra': {
    phone: '(011) 4901-2345',
    zone: 'Zona Oeste',
    rating: 4.3,
    reviews: 54,
    since: '2019',
    about: 'Equipos de protección personal y seguridad en obra.'
  }
}

export default function SupplierProfile() {
  const { company } = useParams()
  const navigate = useNavigate()
  const { productList } = useProducts()
  const decodedCompany = company ? decodeURIComponent(company) : null

  const supplier = SUPPLIER_INFO[decodedCompany]
  const products = useMemo(() => {
    return productList.filter((p) => p.company === decodedCompany)
  }, [productList, decodedCompany])

  if (!supplier || !decodedCompany) {
    return (
      <section className="section supplier-profile-section">
        <div className="supplier-profile-container">
          <EmptyState
            icon="🏢"
            title="Proveedor no encontrado"
            message="Lo sentimos, el proveedor que buscas no está disponible."
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
    <section className="section supplier-profile-section" id="supplier-profile">
      <div className="supplier-profile-container">
        <Breadcrumb items={[
          { href: '/explorar', label: 'Catálogo' },
          { href: null, label: decodedCompany }
        ]} />
        <button className="product-detail-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        {/* Header */}
        <div className="supplier-header">
          <div className="supplier-avatar">
            {companyInitials(decodedCompany)}
          </div>
          <div className="supplier-main-info">
            <div className="supplier-header-top">
              <h1 className="supplier-name">{decodedCompany}</h1>
              <div className="supplier-badges">
                {supplier.rating >= 4.7 && <VerifiedBadge />}
                {supplier.rating >= 4.5 && <TopRatedBadge />}
                {supplier.since && parseInt(supplier.since) <= 2016 && <FastShippingBadge />}
              </div>
            </div>
            <div className="supplier-meta">
              <span className="supplier-zone">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                {supplier.zone}
              </span>
              <span className="supplier-since">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Desde {supplier.since}
              </span>
            </div>
            <div className="supplier-rating">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`star${i < Math.floor(supplier.rating) ? ' star--filled' : i < supplier.rating ? ' star--half' : ''}`}>
                    ★
                  </span>
                ))}
              </div>
              <span className="rating-value">{supplier.rating} ({supplier.reviews} opiniones)</span>
            </div>
          </div>
          <div className="supplier-contact">
            <a href={`tel:${supplier.phone}`} className="btn-primary">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Llamar
            </a>
          </div>
        </div>

        {/* About */}
        <div className="supplier-about">
          <h2>Sobre {decodedCompany}</h2>
          <p>{supplier.about}</p>
        </div>

        {/* Products */}
        <div className="supplier-products">
          <h2>Productos disponibles ({products.length})</h2>
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="📦"
              title="Sin productos disponibles"
              message={`${decodedCompany} aún no tiene productos publicados en nuestro catálogo.`}
              action={
                <button className="btn-primary" onClick={() => navigate('/explorar')}>
                  Explorar otros proveedores
                </button>
              }
            />
          )}
        </div>
      </div>
    </section>
  )
}
