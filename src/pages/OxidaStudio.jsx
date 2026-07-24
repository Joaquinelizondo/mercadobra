import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import OxidaWordmark from '../components/OxidaWordmark'
import ProductCard from '../components/ProductCard'
import { useProducts } from '../context/ProductContext'
import { createLead } from '../lib/api'
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

const categories = ['Mobiliario', 'Escaleras y barandas', 'Fachadas y divisores', 'Estructuras', 'Otro']

export default function OxidaStudio() {
  const { productList, loadingProducts } = useProducts()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const shopProducts = useMemo(() => {
    const oxidaProducts = productList.filter((product) =>
      String(product.company || '').toLowerCase().includes('oxida')
    )
    return (oxidaProducts.length ? oxidaProducts : productList).slice(0, 6)
  }, [productList])

  async function handleSubmit(event) {
    event.preventDefault()
    if (sending) return

    const form = event.currentTarget
    const data = new FormData(form)
    setSending(true)
    setSent(false)
    setFormError('')

    try {
      await createLead({
        name: String(data.get('name') || '').trim(),
        company: 'Consulta Oxida Studio',
        email: String(data.get('email') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        zone: '',
        plan: 'premium',
        source: 'oxida-studio-form',
        projectType: String(data.get('category') || 'Otro'),
        budgetRange: 'A definir',
        paymentPreference: 'A convenir',
        message: String(data.get('message') || '').trim(),
      })
      setSent(true)
      form.reset()
    } catch (error) {
      setFormError(error.message || 'No pudimos enviar la consulta. Intentá nuevamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="oxida-site">
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

      <section className="oxida-shop" id="tienda">
        <div className="oxida-shop-heading">
          <div>
            <p className="oxida-section-number">[ 02 — TIENDA ]</p>
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
            <p className="oxida-section-number">[ 03 — PROYECTOS ]</p>
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
            <p className="oxida-section-number">[ 04 — PROCESO ]</p>
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

      <section className="oxida-quote" id="cotizar">
        <div className="oxida-quote-copy">
          <p className="oxida-section-number">[ 05 — TU PROYECTO ]</p>
          <h2>Hagamos algo<br /><span>que dure.</span></h2>
          <p>Dejanos los datos básicos. Te contactamos para entender la idea y preparar el próximo paso.</p>
          <div className="oxida-response-time"><strong>48h</strong><span>respuesta inicial<br />estimada</span></div>
        </div>
        <form className="oxida-form" onSubmit={handleSubmit}>
          <label>
            <span>Nombre</span>
            <input name="name" type="text" placeholder="¿Cómo te llamás?" required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="tu@email.com" required />
          </label>
          <label>
            <span>WhatsApp</span>
            <input name="phone" type="tel" placeholder="+598 ..." required />
          </label>
          <label>
            <span>¿Qué querés hacer?</span>
            <select name="category" defaultValue="">
              <option value="" disabled>Elegí una categoría</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="is-full">
            <span>Contanos tu idea</span>
            <textarea name="message" rows="3" placeholder="Medidas aproximadas, ubicación y cualquier detalle que tengas..." />
          </label>
          <button type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Enviar proyecto'} <span>↗</span></button>
          {sent && <p className="oxida-form-success" role="status">Recibimos tu idea. Te contactaremos para darle forma.</p>}
          {formError && <p className="oxida-form-error" role="alert">{formError}</p>}
        </form>
      </section>

    </main>
  )
}
