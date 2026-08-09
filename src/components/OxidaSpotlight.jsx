import { Link } from 'react-router-dom'
import oxidaFeature from '../assets/oxida/escalera.jpeg'
import OxidaWordmark from './OxidaWordmark'

export default function OxidaSpotlight() {
  return (
    <section className="oxida-spotlight" aria-labelledby="oxida-spotlight-title">
      <div className="oxida-spotlight-copy">
        <span className="oxida-spotlight-kicker">Una marca de Mercadobra</span>
        <OxidaWordmark className="oxida-spotlight-logo" />
        <h2 id="oxida-spotlight-title">El metal también puede sentirse hecho a medida.</h2>
        <p>
          Diseñamos, cotizamos y coordinamos soluciones metálicas para hogares,
          estudios y proyectos que buscan una terminación distinta.
        </p>
        <div className="oxida-spotlight-actions">
          <Link to="/oxida" className="oxida-spotlight-primary">Conocé Oxida</Link>
          <Link to="/oxida#cotizar" className="oxida-spotlight-secondary">Cotizá tu idea →</Link>
        </div>
      </div>
      <Link to="/oxida" className="oxida-spotlight-visual" aria-label="Descubrir Óxida Studio">
        <img src={oxidaFeature} alt="Escalera de hierro y madera diseñada a medida" />
        <span className="oxida-spotlight-index">01 — Diseño & fabricación</span>
      </Link>
    </section>
  )
}
