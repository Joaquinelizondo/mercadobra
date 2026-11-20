import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllCustomerQuotes, getAdminCustomers, createAdminCustomer, createCustomerQuote } from '../lib/api'
import { formatPrice } from '../utils/format'
import ShareQuoteWhatsAppModal from '../components/ShareQuoteWhatsAppModal'
import './AdminCustomerQuotes.css'

const STATUS = {
  in_progress: 'En revisión',
  sent: 'Enviada',
  accepted: 'Aceptada',
  project_in_progress: 'En ejecución',
  completed: 'Finalizada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada'
}

export default function AdminCustomerQuotes() {
  const { adminUser, adminToken } = useAuth()

  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal & Creation state
  const [showModal, setShowModal] = useState(false)
  const [sharingQuote, setSharingQuote] = useState(null)
  const [clientMode, setClientMode] = useState('existing') // 'existing' | 'new'
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerFilter, setCustomerFilter] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    tier: 'classic'
  })

  // Quote Form State
  const [quoteForm, setQuoteForm] = useState({
    title: '',
    description: '',
    totalAmount: '',
    currency: 'USD',
    status: 'in_progress',
    estimatedStartAt: '',
    estimatedEndAt: '',
    internalNotes: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [successNotice, setSuccessNotice] = useState(null)

  useEffect(() => {
    if (!adminToken) return
    getAllCustomerQuotes(adminToken)
      .then((r) => setRows(r.rows || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [adminToken])

  // Load customer directory when modal is triggered
  useEffect(() => {
    if (showModal && adminToken && customers.length === 0) {
      setCustomersLoading(true)
      getAdminCustomers({}, adminToken)
        .then((res) => {
          const list = res.rows || []
          setCustomers(list)
          if (list.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(String(list[0].id))
          }
        })
        .catch(() => {})
        .finally(() => setCustomersLoading(false))
    }
  }, [showModal, adminToken, customers.length, selectedCustomerId])

  const filtered = useMemo(
    () =>
      rows.filter(
        (q) =>
          (status === 'all' || q.status === status) &&
          (!search.trim() ||
            [q.title, q.referenceNumber, q.customerName, q.customerEmail].some((v) =>
              String(v || '').toLowerCase().includes(search.toLowerCase())
            ))
      ),
    [rows, status, search]
  )

  const totals = useMemo(
    () => ({
      new: rows.filter((q) => q.status === 'in_progress').length,
      sent: rows.filter((q) => q.status === 'sent').length,
      accepted: rows.filter((q) => ['accepted', 'project_in_progress'].includes(q.status)).length
    }),
    [rows]
  )

  const filteredCustomers = useMemo(() => {
    const q = customerFilter.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      [c.name, c.companyName, c.email, c.phone].some((val) =>
        String(val || '').toLowerCase().includes(q)
      )
    )
  }, [customers, customerFilter])

  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => String(c.id) === String(selectedCustomerId))
  }, [customers, selectedCustomerId])

  async function handleCreateQuote(e) {
    e.preventDefault()
    setSubmitting(true)
    setModalError('')

    try {
      let targetCustomerId = selectedCustomerId

      // 1. If registering new customer
      if (clientMode === 'new') {
        const trimmedName = newCustomer.name?.trim()
        const trimmedEmail = newCustomer.email?.trim().toLowerCase()
        if (!trimmedName) throw new Error('Ingresá el nombre completo del cliente.')
        if (!trimmedEmail) throw new Error('Ingresá el correo electrónico del cliente.')

        // Check if customer email already exists in loaded customers
        const existing = customers.find((c) => c.email?.toLowerCase() === trimmedEmail)
        if (existing) {
          targetCustomerId = existing.id
        } else {
          const createdCustomer = await createAdminCustomer(
            {
              name: trimmedName,
              email: trimmedEmail,
              companyName: newCustomer.companyName?.trim() || '',
              phone: newCustomer.phone?.trim() || '',
              tier: newCustomer.tier || 'classic'
            },
            adminToken
          )
          targetCustomerId = createdCustomer.id
          setCustomers((prev) => [createdCustomer, ...prev])
        }
      } else {
        if (!targetCustomerId) throw new Error('Debés seleccionar un cliente existente.')
      }

      // 2. Validate quote fields
      const trimmedTitle = quoteForm.title?.trim()
      if (!trimmedTitle) throw new Error('Ingresá el título de la cotización.')

      const payload = {
        title: trimmedTitle,
        description: quoteForm.description?.trim() || '',
        totalAmount: quoteForm.totalAmount ? Number(quoteForm.totalAmount) : 0,
        currency: quoteForm.currency || 'USD',
        status: quoteForm.status || 'in_progress',
        estimatedStartAt: quoteForm.estimatedStartAt || null,
        estimatedEndAt: quoteForm.estimatedEndAt || null,
        internalNotes: quoteForm.internalNotes?.trim() || ''
      }

      const created = await createCustomerQuote(targetCustomerId, payload, adminToken)

      // Refresh rows list
      const refreshed = await getAllCustomerQuotes(adminToken)
      setRows(refreshed.rows || [])

      setSuccessNotice({
        quoteId: created.id,
        customerId: targetCustomerId,
        referenceNumber: created.referenceNumber,
        title: created.title
      })

      setShowModal(false)

      // Reset forms
      setQuoteForm({
        title: '',
        description: '',
        totalAmount: '',
        currency: 'USD',
        status: 'in_progress',
        estimatedStartAt: '',
        estimatedEndAt: '',
        internalNotes: ''
      })
      setNewCustomer({
        name: '',
        email: '',
        companyName: '',
        phone: '',
        tier: 'classic'
      })
    } catch (err) {
      setModalError(err.message || 'No se pudo crear la cotización.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!adminUser || !adminToken) {
    return <Navigate to="/admin/login?redirect=/admin/cotizaciones-clientes" replace />
  }

  return (
    <section className="admin-customer-quotes">
      {/* HEADER */}
      <header>
        <div>
          <span>Gestión comercial</span>
          <h1>Cotizaciones</h1>
          <p>Solicitudes, propuestas y conversaciones de clientes registrados.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-quote-new-btn"
            onClick={() => setShowModal(true)}
          >
            ＋ Nueva Cotización
          </button>
          <nav>
            <Link to="/admin/analitica">Analítica</Link>
            <Link to="/admin/cotiza">Cotizador B2B</Link>
            <Link to="/admin/clientes">Clientes</Link>
            <Link to="/admin/productos">Productos</Link>
          </nav>
        </div>
      </header>

      {/* SUCCESS NOTICE */}
      {successNotice && (
        <div className="admin-quote-success-banner">
          <div>
            <strong>¡Cotización creada con éxito!</strong>
            <p>
              Referencia: <span>{successNotice.referenceNumber}</span> · {successNotice.title}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link
              to={`/admin/clientes/${successNotice.customerId}/cotizaciones/${successNotice.quoteId}`}
              className="admin-quote-banner-btn"
            >
              Abrir Expediente & Planos →
            </Link>
            <button
              type="button"
              className="admin-quote-banner-close"
              onClick={() => setSuccessNotice(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* METRICS */}
      <div className="admin-quote-metrics">
        <div>
          <strong>{rows.length}</strong>
          <span>Total</span>
        </div>
        <div>
          <strong>{totals.new}</strong>
          <span>En revisión</span>
        </div>
        <div>
          <strong>{totals.sent}</strong>
          <span>Esperando respuesta</span>
        </div>
        <div>
          <strong>{totals.accepted}</strong>
          <span>Aceptadas</span>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="admin-quote-toolbar">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente, empresa o cotización…"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="admin-quote-error">{error}</p>}

      {/* LIST OR EMPTY */}
      {loading ? (
        <p>Cargando cotizaciones…</p>
      ) : filtered.length === 0 ? (
        <div className="admin-quote-empty">
          <h2>No hay cotizaciones para mostrar.</h2>
          <button
            type="button"
            className="admin-quote-new-btn"
            style={{ marginTop: '12px' }}
            onClick={() => setShowModal(true)}
          >
            ＋ Crear la primera cotización
          </button>
        </div>
      ) : (
        <div className="admin-quote-board">
          {filtered.map((q) => (
            <article key={q.id}>
              <div className="admin-quote-id">
                <span>{q.referenceNumber}</span>
                <small>{q.updatedAt ? new Date(q.updatedAt).toLocaleDateString('es-UY') : ''}</small>
              </div>
              <div>
                <h2>{q.title}</h2>
                <Link to={`/admin/clientes/${q.customerId || 0}`}>
                  {q.customerName || q.customerEmail || 'Cliente B2B'}
                </Link>
                <p>{q.description}</p>
              </div>
              <div className="admin-quote-commercial">
                {q.totalAmount > 0 && <strong>{formatPrice(q.totalAmount, q.currency)}</strong>}
                <span className={`is-${q.status}`}>{STATUS[q.status] || q.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setSharingQuote(q)}
                  title="Compartir cotización por WhatsApp"
                  style={{
                    background: '#25d366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  💬 WhatsApp
                </button>
                <Link
                  className="admin-quote-open"
                  to={`/admin/clientes/${q.customerId || 0}/cotizaciones/${q.id}`}
                >
                  Abrir y responder →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* MODAL CREAR Y ASIGNAR COTIZACIÓN */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="admin-modal-header">
              <div>
                <span className="admin-modal-eyebrow">Gestión Comercial</span>
                <h3>Nueva Cotización de Proyecto</h3>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </header>

            {modalError && <p className="admin-quote-error">{modalError}</p>}

            <form onSubmit={handleCreateQuote} className="admin-modal-form">
              {/* ASIGNACIÓN DE CLIENTE: TABS */}
              <div className="admin-client-picker">
                <span className="admin-form-section-title">1. Asignación del Cliente</span>
                <div className="admin-client-tabs">
                  <button
                    type="button"
                    className={`admin-client-tab-btn ${clientMode === 'existing' ? 'is-active' : ''}`}
                    onClick={() => setClientMode('existing')}
                  >
                    🏢 Asignar a Cliente Existente
                  </button>
                  <button
                    type="button"
                    className={`admin-client-tab-btn ${clientMode === 'new' ? 'is-active' : ''}`}
                    onClick={() => setClientMode('new')}
                  >
                    👤 Registrar Nuevo Cliente
                  </button>
                </div>

                {/* OPCIÓN A: CLIENTE EXISTENTE */}
                {clientMode === 'existing' && (
                  <div className="admin-existing-client-pane">
                    {customersLoading ? (
                      <p style={{ fontSize: '0.85rem', color: '#666' }}>Cargando directorio de clientes…</p>
                    ) : customers.length === 0 ? (
                      <div className="admin-no-clients-alert">
                        <span>Aún no hay clientes registrados.</span>
                        <button
                          type="button"
                          className="admin-switch-btn"
                          onClick={() => setClientMode('new')}
                        >
                          Crear nuevo cliente ahora
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="admin-form-group">
                          <label>
                            <span>Buscar o filtrar cliente:</span>
                            <input
                              type="search"
                              value={customerFilter}
                              onChange={(e) => setCustomerFilter(e.target.value)}
                              placeholder="Filtrar por nombre, estudio, email o teléfono…"
                              className="admin-input"
                            />
                          </label>
                        </div>

                        <div className="admin-form-group">
                          <label>
                            <span>Seleccionar Cliente *:</span>
                            <select
                              value={selectedCustomerId}
                              onChange={(e) => setSelectedCustomerId(e.target.value)}
                              className="admin-select"
                              required
                            >
                              <option value="">-- Seleccionar cliente ({filteredCustomers.length}) --</option>
                              {filteredCustomers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name || 'Sin nombre'} {c.companyName ? `· ${c.companyName}` : ''} ({c.email})
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {selectedCustomerObj && (
                          <div className="admin-selected-client-card">
                            <div className="admin-client-avatar">👤</div>
                            <div className="admin-client-meta">
                              <strong>{selectedCustomerObj.name}</strong>
                              <span>{selectedCustomerObj.companyName || 'Cliente particular'} · {selectedCustomerObj.email}</span>
                              {selectedCustomerObj.phone && <small>📞 {selectedCustomerObj.phone}</small>}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* OPCIÓN B: REGISTRAR NUEVO CLIENTE */}
                {clientMode === 'new' && (
                  <div className="admin-new-client-pane">
                    <div className="admin-form-grid-2">
                      <label className="admin-form-group">
                        <span>Nombre y Apellido / Contacto *</span>
                        <input
                          type="text"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          placeholder="Ej: Arq. Ignacio Silva"
                          required
                          className="admin-input"
                        />
                      </label>
                      <label className="admin-form-group">
                        <span>Correo Electrónico *</span>
                        <input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          placeholder="ejemplo@estudio.com"
                          required
                          className="admin-input"
                        />
                      </label>
                    </div>

                    <div className="admin-form-grid-3">
                      <label className="admin-form-group">
                        <span>Empresa / Estudio / Constructora</span>
                        <input
                          type="text"
                          value={newCustomer.companyName}
                          onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                          placeholder="Ej: Estudio Silva Arquitectura"
                          className="admin-input"
                        />
                      </label>
                      <label className="admin-form-group">
                        <span>Teléfono / WhatsApp</span>
                        <input
                          type="tel"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          placeholder="Ej: 099 123 456"
                          className="admin-input"
                        />
                      </label>
                      <label className="admin-form-group">
                        <span>Nivel de Plataforma</span>
                        <select
                          value={newCustomer.tier}
                          onChange={(e) => setNewCustomer({ ...newCustomer, tier: e.target.value })}
                          className="admin-select"
                        >
                          <option value="classic">OxI Clásico</option>
                          <option value="pro">OxI Pro (Grandes Obras)</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* DATOS DE LA COTIZACIÓN */}
              <div className="admin-quote-fields">
                <span className="admin-form-section-title">2. Datos de la Cotización</span>

                <div className="admin-form-group">
                  <label>
                    <span>Título de la Obra o Pieza *</span>
                    <input
                      type="text"
                      value={quoteForm.title}
                      onChange={(e) => setQuoteForm({ ...quoteForm, title: e.target.value })}
                      placeholder="Ej: Barandas de balcones, pérgola de azotea y escalera marinera"
                      required
                      className="admin-input"
                    />
                  </label>
                </div>

                <div className="admin-form-group">
                  <label>
                    <span>Descripción y Especificaciones Técnicas Iniciales</span>
                    <textarea
                      rows="3"
                      value={quoteForm.description}
                      onChange={(e) => setQuoteForm({ ...quoteForm, description: e.target.value })}
                      placeholder="Detalles de perfilería, medidas preliminares, maderas, acabados o indicaciones del cliente…"
                      className="admin-textarea"
                    />
                  </label>
                </div>

                <div className="admin-form-grid-3">
                  <label className="admin-form-group">
                    <span>Monto Presupuestado (Opcional)</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={quoteForm.totalAmount}
                      onChange={(e) => setQuoteForm({ ...quoteForm, totalAmount: e.target.value })}
                      placeholder="0"
                      className="admin-input"
                    />
                  </label>
                  <label className="admin-form-group">
                    <span>Moneda</span>
                    <select
                      value={quoteForm.currency}
                      onChange={(e) => setQuoteForm({ ...quoteForm, currency: e.target.value })}
                      className="admin-select"
                    >
                      <option value="USD">USD (Dólares)</option>
                      <option value="UYU">UYU (Pesos Uruguayos)</option>
                    </select>
                  </label>
                  <label className="admin-form-group">
                    <span>Estado Inicial</span>
                    <select
                      value={quoteForm.status}
                      onChange={(e) => setQuoteForm({ ...quoteForm, status: e.target.value })}
                      className="admin-select"
                    >
                      <option value="in_progress">En revisión / Solicitud</option>
                      <option value="sent">Cotizada / Emitida</option>
                      <option value="accepted">Presupuesto Aprobado</option>
                      <option value="project_in_progress">En Fabricación / Obra</option>
                    </select>
                  </label>
                </div>

                <div className="admin-form-grid-2">
                  <label className="admin-form-group">
                    <span>Fecha Inicio Estimada</span>
                    <input
                      type="date"
                      value={quoteForm.estimatedStartAt}
                      onChange={(e) => setQuoteForm({ ...quoteForm, estimatedStartAt: e.target.value })}
                      className="admin-input"
                    />
                  </label>
                  <label className="admin-form-group">
                    <span>Fecha Fin Estimada / Entrega</span>
                    <input
                      type="date"
                      value={quoteForm.estimatedEndAt}
                      onChange={(e) => setQuoteForm({ ...quoteForm, estimatedEndAt: e.target.value })}
                      className="admin-input"
                    />
                  </label>
                </div>

                <div className="admin-form-group">
                  <label>
                    <span>Notas Internas del Taller / Equipo Comercial (No visibles para el cliente)</span>
                    <input
                      type="text"
                      value={quoteForm.internalNotes}
                      onChange={(e) => setQuoteForm({ ...quoteForm, internalNotes: e.target.value })}
                      placeholder="Ej: Requiere visita técnica para verificar replanteo de anclajes..."
                      className="admin-input"
                    />
                  </label>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="admin-btn-submit"
                >
                  {submitting ? 'Creando cotización…' : '✓ Crear y Asignar Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sharingQuote && (
        <ShareQuoteWhatsAppModal
          quote={sharingQuote}
          customer={{
            name: sharingQuote.customerName,
            email: sharingQuote.customerEmail,
            company: sharingQuote.customerName,
          }}
          onClose={() => setSharingQuote(null)}
        />
      )}
    </section>
  )
}
