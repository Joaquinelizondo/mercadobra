import { Link } from 'react-router-dom'
import '../styles/Breadcrumb.css'

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="breadcrumb" aria-label="Rutas de navegación">
      <ol className="breadcrumb-list">
        <li>
          <Link to="/">Inicio</Link>
        </li>
        {items.map((item, idx) => (
          <li key={idx}>
            {item.href ? (
              <Link to={item.href}>{item.label}</Link>
            ) : (
              <span className="breadcrumb-current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
