import { Link } from 'react-router-dom'
import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import './InfoPage.css'

export default function About() {
  return (
    <div className="info-page">
      <MercadoQuoteFinder />
      <section className="info-page-card">
        <p className="info-page-kicker">Quiénes somos</p>
        <h1>Conectamos proyecto, producto y ejecución en un mismo lugar.</h1>
        <p>
          Mercadobra es una plataforma que conecta clientes, profesionales y empresas
          para resolver necesidades reales de obra. Permite descubrir productos,
          solicitar cotizaciones, comparar alternativas y acompañar cada proyecto desde
          la primera idea hasta su concreción.
        </p>
        <p>
          La construimos de forma incremental: catálogo, clientes, proveedores,
          cotizaciones, proyectos y seguimiento comercial se integran en un sistema
          preparado para crecer junto con el negocio.
        </p>
        <p>
          Óxida Studio aporta la capacidad técnica y productiva. Sus unidades{' '}
          <span className="info-page-oxida-unit">Projects</span>,{' '}
          <span className="info-page-oxida-unit">Pro</span>,{' '}
          <span className="info-page-oxida-unit">Custom Works</span> y{' '}
          <span className="info-page-oxida-unit">Care</span> reúnen diseño, ingeniería,
          fabricación, ejecución y mantenimiento para transformar cada necesidad en
          una solución concreta y sostenible en el tiempo.
        </p>
        <div className="info-page-actions">
          <Link to="/explorar">Explorar productos</Link>
          <Link to="/oxida">Conocer Óxida Studio</Link>
        </div>
      </section>
    </div>
  )
}
