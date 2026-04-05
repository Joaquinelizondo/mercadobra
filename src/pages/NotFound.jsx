import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <p className="not-found-code">404</p>
      <h1>Página no encontrada</h1>
      <p>El contenido que buscás no existe o fue movido.</p>
      <Link to="/" className="primary-link">Volver al inicio</Link>
    </div>
  )
}
