import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAdminCustomRequests, updateAdminCustomRequest } from '../lib/api'

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nueva' },
  { value: 'reviewing', label: 'En revisión' },
  { value: 'quoted', label: 'Cotizada' },
  { value: 'closed', label: 'Cerrada' },
]

export default function AdminCustomRequests() {
  const { adminUser, adminToken } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!adminToken) return
    getAdminCustomRequests(adminToken)
      .then((response) => setRequests(response.rows || []))
      .catch((requestError) => setError(requestError.message || 'No se pudieron cargar las solicitudes.'))
      .finally(() => setLoading(false))
  }, [adminToken])

  if (!adminUser || !adminToken) {
    return <Navigate to="/admin/login?redirect=/admin/personalizaciones" replace />
  }

  async function changeStatus(requestId, status) {
    setError('')
    try {
      const updated = await updateAdminCustomRequest(requestId, status, adminToken)
      setRequests((previous) => previous.map((item) => item.id === updated.id ? updated : item))
    } catch (requestError) {
      setError(requestError.message || 'No se pudo actualizar el estado.')
    }
  }

  return (
    <section className="admin-custom-page">
      <header>
        <div>
          <span>Oxida Studio · Mercadobra</span>
          <h1>Solicitudes personalizadas</h1>
          <p>{requests.length} consulta{requests.length === 1 ? '' : 's'} recibida{requests.length === 1 ? '' : 's'}</p>
        </div>
        <nav>
          <Link to="/admin/productos">Productos</Link>
          <Link to="/admin/cotizaciones">Consultas generales</Link>
          <Link to="/">Ver tienda ↗</Link>
        </nav>
      </header>

      {error && <p className="admin-custom-error" role="alert">{error}</p>}
      {loading ? (
        <p className="admin-custom-empty">Cargando solicitudes…</p>
      ) : requests.length === 0 ? (
        <div className="admin-custom-empty">
          <h2>Todavía no hay solicitudes.</h2>
          <p>Las personalizaciones enviadas desde una ficha de producto aparecerán acá.</p>
        </div>
      ) : (
        <div className="admin-custom-list">
          {requests.map((request) => (
            <article key={request.id}>
              <div className="admin-custom-card-head">
                <div>
                  <span>#{request.id} · {new Date(request.createdAt).toLocaleDateString('es-UY')}</span>
                  <h2>{request.productName}</h2>
                </div>
                <select value={request.status} onChange={(event) => changeStatus(request.id, event.target.value)}>
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="admin-custom-config">
                <span><small>Medida</small>{request.configuration?.size}</span>
                <span><small>Color</small>{request.configuration?.color}</span>
                <span><small>Terminación</small>{request.configuration?.finish}</span>
              </div>
              <div className="admin-custom-contact">
                <div><strong>{request.name}</strong><a href={`mailto:${request.email}`}>{request.email}</a><a href={`tel:${request.phone}`}>{request.phone}</a><span>{request.zone}</span></div>
                <p>{request.message || 'Sin comentarios adicionales.'}</p>
              </div>
              {request.photos?.length > 0 && (
                <div className="admin-custom-photos">
                  {request.photos.map((photo, index) => <a key={`${request.id}-${index}`} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.name || `Referencia ${index + 1}`} /></a>)}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
