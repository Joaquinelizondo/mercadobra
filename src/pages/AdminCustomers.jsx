import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createAdminCustomer, getAdminCustomers, updateAdminCustomer } from '../lib/api'
import './AdminCustomers.css'

const EMPTY_FORM = {
  name: '', email: '', phone: '', companyName: '', address: '', city: '', department: '',
  status: 'active', internalNotes: '',
}

const STATUS_LABELS = { active: 'Activo', inactive: 'Inactivo', blocked: 'Bloqueado' }

export default function AdminCustomers() {
  const { adminUser, adminToken } = useAuth()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!adminToken) return
    setLoading(true)
    getAdminCustomers({}, adminToken)
      .then((response) => setCustomers(response.rows || []))
      .catch((requestError) => setError(requestError.message || 'No se pudieron cargar los clientes.'))
      .finally(() => setLoading(false))
  }, [adminToken])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return customers.filter((customer) => {
      const matchesTerm = !term || [customer.name, customer.email, customer.phone, customer.companyName, customer.city, customer.department]
        .some((value) => String(value || '').toLowerCase().includes(term))
      return matchesTerm && (status === 'all' || customer.status === status)
    })
  }, [customers, search, status])

  const metrics = useMemo(() => ({
    total: customers.length,
    active: customers.filter((customer) => customer.status === 'active').length,
    withOrders: customers.filter((customer) => Number(customer.orderCount) > 0).length,
    blocked: customers.filter((customer) => customer.status === 'blocked').length,
  }), [customers])

  if (!adminUser || !adminToken) return <Navigate to="/admin/login?redirect=/admin/clientes" replace />

  function openEditor(customer) {
    setEditing(customer)
    setForm({ ...EMPTY_FORM, ...customer })
    setError('')
    setSuccess('')
  }

  function openCreate() {
    setCreating(true)
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
  }

  function closeEditor() {
    setEditing(null)
    setCreating(false)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (creating) {
        const created = await createAdminCustomer(form, adminToken)
        setCustomers((previous) => [created, ...previous])
        setSuccess('Cliente agregado como perfil inactivo.')
      } else {
        const updated = await updateAdminCustomer(editing.id, form, adminToken)
        setCustomers((previous) => previous.map((customer) => customer.id === updated.id ? { ...customer, ...updated } : customer))
        setSuccess('Datos del cliente actualizados.')
      }
      closeEditor()
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-customers-page">
      <header className="admin-customers-header">
        <div><span>Relaciones comerciales</span><h1>Clientes</h1><p>Perfiles, contacto y actividad en un solo lugar.</p></div>
        <nav><Link to="/admin/productos">Productos</Link><Link to="/admin/pedidos">Pedidos</Link><Link to="/admin/cotizaciones">Consultas</Link><Link to="/admin/personalizaciones">Personalizaciones</Link><Link to="/">Ver tienda ↗</Link></nav>
      </header>

      <div className="admin-customers-title-row"><div className="admin-customers-metrics" aria-label="Resumen de clientes">
        <div><strong>{metrics.total}</strong><span>Total</span></div>
        <div><strong>{metrics.active}</strong><span>Activos</span></div>
        <div><strong>{metrics.withOrders}</strong><span>Con pedidos</span></div>
        <div><strong>{metrics.blocked}</strong><span>Bloqueados</span></div>
      </div><button type="button" onClick={openCreate}>＋ Nuevo cliente</button></div>

      <div className="admin-customers-toolbar">
        <label><span>Buscar clientes</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, email, teléfono, localidad…" /></label>
        <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="blocked">Bloqueados</option></select></label>
      </div>

      {error && <p className="admin-customers-message is-error" role="alert">{error}</p>}
      {success && <p className="admin-customers-message is-success" role="status">{success}</p>}

      {loading ? <p className="admin-customers-empty">Cargando clientes…</p> : filtered.length === 0 ? (
        <div className="admin-customers-empty"><h2>No hay clientes para mostrar.</h2><p>Las cuentas registradas aparecerán automáticamente en esta sección.</p></div>
      ) : (
        <div className="admin-customers-list">
          {filtered.map((customer) => (
            <article key={customer.id}>
              <div className="admin-customer-avatar" aria-hidden="true">{String(customer.name || customer.email || 'C').trim().charAt(0).toUpperCase()}</div>
              <div className="admin-customer-main"><div><h2>{customer.name || 'Cliente sin nombre'}</h2><span className={`admin-customer-status is-${customer.status}`}>{STATUS_LABELS[customer.status]}</span></div><a href={`mailto:${customer.email}`}>{customer.email}</a><p>{[customer.phone, customer.city, customer.department].filter(Boolean).join(' · ') || 'Contacto pendiente de completar'}</p></div>
              <div className="admin-customer-activity"><strong>{customer.orderCount || 0}</strong><span>pedido{Number(customer.orderCount) === 1 ? '' : 's'}</span>{customer.lastOrderAt && <small>Último: {new Date(customer.lastOrderAt).toLocaleDateString('es-UY')}</small>}</div>
              <div className="admin-customer-actions"><Link to={`/admin/clientes/${customer.id}`}>Abrir cliente</Link><button type="button" onClick={() => openEditor(customer)}>Editar datos</button></div>
            </article>
          ))}
        </div>
      )}

      {(editing || creating) && <><div className="modal-overlay" onClick={closeEditor} aria-hidden="true" /><aside className="admin-customer-editor" role="dialog" aria-modal="true" aria-labelledby="customer-editor-title"><header><div><span>Perfil de cliente</span><h2 id="customer-editor-title">{creating ? 'Nuevo cliente' : 'Editar datos'}</h2></div><button type="button" onClick={closeEditor} aria-label="Cerrar">×</button></header><form onSubmit={handleSubmit}>
        <div className="admin-customer-form-grid"><label><span>Nombre completo *</span><input name="name" value={form.name} onChange={handleChange} required /></label><label><span>Email *</span><input type="email" name="email" value={form.email} onChange={handleChange} required /></label><label><span>Teléfono</span><input name="phone" value={form.phone} onChange={handleChange} /></label><label><span>Empresa</span><input name="companyName" value={form.companyName} onChange={handleChange} /></label><label className="is-wide"><span>Dirección</span><input name="address" value={form.address} onChange={handleChange} /></label><label><span>Localidad</span><input name="city" value={form.city} onChange={handleChange} /></label><label><span>Departamento</span><input name="department" value={form.department} onChange={handleChange} /></label><label><span>Estado</span><select name="status" value={form.status} onChange={handleChange}><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="blocked">Bloqueado</option></select></label><label className="is-wide"><span>Notas internas</span><textarea name="internalNotes" value={form.internalNotes} onChange={handleChange} rows="4" placeholder="Solo visibles para administración" /></label></div>
        <p className="admin-customer-editor-note">{creating ? 'El perfil se crea inactivo y sin acceso hasta implementar la invitación segura. Sus datos ya podrán usarse para la gestión comercial.' : 'Las contraseñas nunca son visibles desde este panel. Bloquear una cuenta cerrará sus sesiones activas.'}</p>
        <button className="admin-customer-save" type="submit" disabled={saving}>{saving ? 'Guardando…' : creating ? 'Agregar cliente' : 'Guardar cambios'}</button>
      </form></aside></>}
    </section>
  )
}
