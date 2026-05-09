import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAdminQuoteConsultations } from '../lib/api'

const EVENT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'lead', label: 'Leads' },
  { value: 'search_contact', label: 'Busquedas guardadas' },
]

export default function AdminQuoteConsultations() {
  const { adminUser, adminToken, logoutAdmin } = useAuth()
  const adminAccessPath = `${import.meta.env.BASE_URL}#admin-access`
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    source: '',
    eventType: '',
  })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!adminUser || !adminToken) {
      window.location.assign(adminAccessPath)
    }
  }, [adminUser, adminToken, adminAccessPath])

  async function loadData(nextFilters = filters) {
    setLoading(true)
    setError('')

    try {
      const response = await getAdminQuoteConsultations(nextFilters, adminToken)
      setRows(response.rows || [])
      setTotal(Number(response.total || 0))
    } catch (requestError) {
      setError(requestError.message || 'No se pudo cargar la data de cotizaciones')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (adminToken) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  const uniqueSources = useMemo(() => {
    const values = [...new Set(rows.map((row) => String(row.source || '').trim()).filter(Boolean))]
    return values.sort((a, b) => a.localeCompare(b))
  }, [rows])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((previous) => ({ ...previous, [name]: value }))
  }

  async function handleApplyFilters(event) {
    event.preventDefault()
    await loadData(filters)
  }

  return (
    <section className="section admin-quotes-page">
      <div className="admin-quotes-head">
        <div>
          <h1>Panel de cotizaciones</h1>
          <p>{total} registro{total === 1 ? '' : 's'} para consulta rapida</p>
        </div>
        <div className="admin-quotes-actions">
          <button
            type="button"
            className="catalog-page-btn"
            onClick={() => {
              logoutAdmin()
              window.location.assign(adminAccessPath)
            }}
          >
            Cerrar sesion admin
          </button>
          <Link to="/" className="ghost-link">Volver home</Link>
        </div>
      </div>

      <form className="admin-quotes-filters" onSubmit={handleApplyFilters}>
        <label>
          Desde
          <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="form-input" />
        </label>

        <label>
          Hasta
          <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="form-input" />
        </label>

        <label>
          Tipo
          <select name="eventType" value={filters.eventType} onChange={handleFilterChange} className="form-input">
            {EVENT_TYPES.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          Origen
          <select name="source" value={filters.source} onChange={handleFilterChange} className="form-input">
            <option value="">Todos</option>
            {uniqueSources.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="publish-btn" disabled={loading}>
          {loading ? 'Filtrando...' : 'Aplicar filtros'}
        </button>
      </form>

      {error && <p className="tracking-error">{error}</p>}

      <div className="admin-quotes-table-wrap">
        <table className="admin-quotes-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Origen</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Proyecto/Busqueda</th>
              <th>Presupuesto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-quotes-empty">Sin resultados para esos filtros.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString('es-AR')}</td>
                  <td>{row.eventType === 'lead' ? 'Lead' : 'Busqueda'}</td>
                  <td>{row.source || '-'}</td>
                  <td>{row.name || '-'}</td>
                  <td>{row.email || '-'}</td>
                  <td>{row.phone || '-'}</td>
                  <td>{row.projectType || row.searchTerm || '-'}</td>
                  <td>{row.budgetRange || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
