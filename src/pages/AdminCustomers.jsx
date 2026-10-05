import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createCustomerInvitation, getAdminCustomers, updateAdminCustomer, deleteAdminCustomer, importAdminCustomers } from '../lib/api'
import './AdminCustomers.css'

const EMPTY_FORM = {
  firstName: '', lastName: '', name: '', email: '', phone: '', companyName: '', address: '', city: '', department: '',
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
  const fileInputRef = useRef(null)

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
        await createCustomerInvitation(form, adminToken)
        const refreshed = await getAdminCustomers({}, adminToken)
        setCustomers(refreshed.rows || [])
        setSuccess(`Invitación enviada por email y WhatsApp. El enlace vence en 72 horas.`)
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

  function handleExport() {
    const header = ['ID', 'Nombre', 'Email', 'Telefono', 'Empresa', 'Localidad', 'Estado']
    const rows = filtered.map(c => [
      c.id, `"${c.name || ''}"`, c.email, `"${c.phone || ''}"`, `"${c.companyName || ''}"`, `"${c.city || ''}"`, c.status
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [header.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `clientes_oxi_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(l => l.trim())
      const customersToImport = []
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.replace(/"/g, '').trim())
        if (parts.length >= 2) {
          const [email, name, companyName, phone] = parts
          if (email && name) {
            customersToImport.push({ email, name, companyName, phone })
          }
        }
      }
      try {
        setLoading(true)
        const res = await importAdminCustomers(customersToImport, adminToken)
        setSuccess(`Se importaron ${res.imported} clientes correctamente.`)
        const refreshed = await getAdminCustomers({}, adminToken)
        setCustomers(refreshed.rows || [])
      } catch (err) {
        setError(err.message || 'Error al importar')
      } finally {
        setLoading(false)
        event.target.value = null
      }
    }
    reader.readAsText(file)
  }

  async function handleDelete(customer) {
    if (!window.confirm(`¿Estás seguro de que querés borrar a ${customer.name || customer.email}?`)) return
    try {
      setLoading(true)
      await deleteAdminCustomer(customer.id, adminToken)
      setCustomers(prev => prev.filter(c => c.id !== customer.id))
      setSuccess('Cliente eliminado.')
    } catch (err) {
      setError(err.message || 'No se pudo eliminar al cliente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="admin-customers-page">
      <header className="admin-customers-header">
        <div><span>Relaciones comerciales</span><h1>Clientes</h1><p>Perfiles, contacto y actividad en un solo lugar.</p></div>
        <nav><Link to="/admin/analitica">Analítica</Link><Link to="/admin/cotizaciones-clientes">Cotizaciones</Link><Link to="/admin/modelador">Simulador 3D</Link><Link to="/admin/productos">Productos</Link><Link to="/admin/pedidos">Pedidos</Link><Link to="/admin/cotizaciones">Consultas web</Link><Link to="/admin/personalizaciones">Personalizaciones</Link><Link to="/">Ver tienda ↗</Link></nav>
      </header>

      <div className="admin-customers-title-row">
        <div className="admin-customers-metrics" aria-label="Resumen de clientes">
          <div><strong>{metrics.total}</strong><span>Total</span></div>
          <div><strong>{metrics.active}</strong><span>Activos</span></div>
          <div><strong>{metrics.withOrders}</strong><span>Con pedidos</span></div>
          <div><strong>{metrics.blocked}</strong><span>Bloqueados</span></div>
        </div>
        <div className="admin-customers-actions">
          <input type="file" accept=".csv" ref={fileInputRef} style={{display: 'none'}} onChange={handleImport} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary">⇡ Importar CSV</button>
          <button type="button" onClick={handleExport} className="btn-secondary">⇣ Exportar CSV</button>
          <button type="button" onClick={openCreate}>✉ Invitar cliente</button>
        </div>
      </div>

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
              <div className="admin-customer-main"><div><h2>{customer.name || 'Cliente sin nombre'}</h2><span className={`admin-customer-status is-${customer.status}`}>{customer.invitationStatus==='sent'?'Invitación enviada':customer.invitationStatus==='accepted'?'Invitación aceptada':STATUS_LABELS[customer.status]}</span></div><a href={`mailto:${customer.email}`}>{customer.email}</a><p>{[customer.phone, customer.city, customer.department].filter(Boolean).join(' · ') || 'Contacto pendiente de completar'}</p></div>
              <div className="admin-customer-activity"><strong>{customer.orderCount || 0}</strong><span>pedido{Number(customer.orderCount) === 1 ? '' : 's'}</span>{customer.lastOrderAt && <small>Último: {new Date(customer.lastOrderAt).toLocaleDateString('es-UY')}</small>}</div>
              <div className="admin-customer-actions"><Link to={`/admin/clientes/${customer.id}`}>Abrir cliente</Link><button type="button" onClick={() => openEditor(customer)}>Editar datos</button><button type="button" className="btn-danger" onClick={() => handleDelete(customer)}>Eliminar</button></div>
            </article>
          ))}
        </div>
      )}

      {(editing || creating) && <><div className="modal-overlay" onClick={closeEditor} aria-hidden="true" /><aside className="admin-customer-editor" role="dialog" aria-modal="true" aria-labelledby="customer-editor-title"><header><div><span>{creating?'Óxida by Mercadobra':'Perfil de cliente'}</span><h2 id="customer-editor-title">{creating ? 'Enviar invitación' : 'Editar datos'}</h2></div><button type="button" onClick={closeEditor} aria-label="Cerrar">×</button></header><form onSubmit={handleSubmit}>
        <div className="admin-customer-form-grid">{creating?<><label><span>Nombre *</span><input name="firstName" value={form.firstName} onChange={handleChange} required /></label><label><span>Apellido *</span><input name="lastName" value={form.lastName} onChange={handleChange} required /></label><label><span>Email *</span><input type="email" name="email" value={form.email} onChange={handleChange} required /></label><label><span>WhatsApp *</span><input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Ej: 099 123 456" required /></label><label className="is-wide"><span>Empresa</span><input name="companyName" value={form.companyName} onChange={handleChange} /></label></>:<><label><span>Nombre completo *</span><input name="name" value={form.name} onChange={handleChange} required /></label><label><span>Email *</span><input type="email" name="email" value={form.email} onChange={handleChange} required /></label><label><span>Teléfono</span><input name="phone" value={form.phone} onChange={handleChange} /></label><label><span>Empresa</span><input name="companyName" value={form.companyName} onChange={handleChange} /></label><label className="is-wide"><span>Dirección</span><input name="address" value={form.address} onChange={handleChange} /></label><label><span>Localidad</span><input name="city" value={form.city} onChange={handleChange} /></label><label><span>Departamento</span><input name="department" value={form.department} onChange={handleChange} /></label><label><span>Estado</span><select name="status" value={form.status} onChange={handleChange}><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="blocked">Bloqueado</option></select></label><label className="is-wide"><span>Notas internas</span><textarea name="internalNotes" value={form.internalNotes} onChange={handleChange} rows="4" placeholder="Solo visibles para administración" /></label></>}</div>
        <p className="admin-customer-editor-note">{creating ? 'Recibirá la bienvenida por email y WhatsApp, con el mismo enlace personal para crear su contraseña. Funciona una vez y vence en 72 horas.' : 'Las contraseñas nunca son visibles desde este panel. Bloquear una cuenta cerrará sus sesiones activas.'}</p>
        <button className="admin-customer-save" type="submit" disabled={saving}>{saving ? 'Enviando…' : creating ? 'Enviar invitación' : 'Guardar cambios'}</button>
      </form></aside></>}
    </section>
  )
}
