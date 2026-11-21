import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAdminCustomer,
  getAdminQuoteMessages,
  getCustomerQuotes,
  getAdminQuote,
  sendAdminQuoteMessage,
  updateAdminQuote,
  parseRequirementsWithAI,
  generateProposalWithAI,
  uploadQuoteAttachments,
} from '../lib/api'
import { formatPrice } from '../utils/format'
import QuoteDocumentsAndTimeline from '../components/QuoteDocumentsAndTimeline'
import ShareQuoteWhatsAppModal from '../components/ShareQuoteWhatsAppModal'
import './CustomerPortal.css'
import './CustomerPortalMobile.css'
import './AdminQuoteWorkspace.css'

function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString('es-UY')} a las ${d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} hs`
}

function formatRequestedDate(value) {
  if (!value) return ''
  const text = String(value)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-UY')
}

export default function AdminQuoteWorkspace() {
  const { id, quoteId } = useParams()
  const { adminUser, adminToken } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [quote, setQuote] = useState(null)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [isParsingAI, setIsParsingAI] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [quoteProposalFile, setQuoteProposalFile] = useState(null)

  useEffect(() => {
    if (!adminToken || !quoteId) return
    let isCancelled = false

    async function fetchData() {
      setError('')
      let resolvedQuote = null
      let resolvedCustomer = null

      try {
        const quoteRes = await getAdminQuote(quoteId, adminToken)
        if (quoteRes?.quote) {
          resolvedQuote = quoteRes.quote
          resolvedCustomer = quoteRes.customer
        }
      } catch {
        if (id && Number(id) > 0) {
          try {
            const [c, q] = await Promise.all([
              getAdminCustomer(id, adminToken).catch(() => null),
              getCustomerQuotes(id, adminToken).catch(() => ({ rows: [] }))
            ])
            resolvedCustomer = c
            resolvedQuote = (q?.rows || []).find((x) => Number(x.id) === Number(quoteId))
          } catch {
            // ignore fallback error
          }
        }
      }

      if (isCancelled) return

      if (!resolvedQuote) {
        setError('No se pudo encontrar la cotización solicitada.')
        return
      }

      setQuote(resolvedQuote)
      if (resolvedCustomer) setCustomer(resolvedCustomer)

      const messagesRes = await getAdminQuoteMessages(quoteId, adminToken).catch(() => ({ rows: [] }))

      if (isCancelled) return
      setMessages(messagesRes?.rows || [])
    }

    fetchData()
    return () => { isCancelled = true }
  }, [adminToken, quoteId, id])

  if (!adminUser || !adminToken) return <Navigate to={`/admin/login?redirect=/admin/clientes/${id}/cotizaciones/${quoteId}`} replace />

  async function saveProposal(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const currentAttachments = Array.isArray(quote.attachments) ? [...quote.attachments] : []
      if (quoteProposalFile) {
        currentAttachments.push(quoteProposalFile)
      }
      const willBeSent = quote.status === 'in_progress' && Number(quote.totalAmount) > 0
      const nextStatus = willBeSent ? 'sent' : (quote.status || 'sent')
      const updated = await updateAdminQuote(
        quote.id,
        {
          ...quote,
          attachments: currentAttachments,
          status: nextStatus
        },
        adminToken
      )
      setQuote(updated)
      setQuoteProposalFile(null)
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendMessage({ message: msgText, attachments, category, stage, status }) {
    if (!adminToken || !quote?.id) return
    const res = await sendAdminQuoteMessage(quote.id, { message: msgText, attachments, category, stage, status }, adminToken)
    setMessages((prev) => [...prev, res])
    if (attachments && attachments.length > 0) {
      setQuote((prev) => ({
        ...prev,
        attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), ...attachments]
      }))
    }
  }

  async function handleUploadDocument({ attachments, category, stage, note }) {
    if (!adminToken || !quote?.id) return
    const res = await uploadQuoteAttachments(quote.id, { attachments, category, stage, note }, adminToken, true)
    if (res?.quote) {
      setQuote(res.quote)
    } else {
      setQuote((prev) => ({
        ...prev,
        attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), ...attachments]
      }))
    }
    if (res?.message) {
      setMessages((prev) => [...prev, res.message])
    }
  }

  async function parseWithAI() {
    setIsParsingAI(true)
    setError('')
    setAiSuggestion(null)
    try {
      const res = await parseRequirementsWithAI(quote.description, adminToken)
      setAiSuggestion(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsParsingAI(false)
    }
  }

  async function generateProposal() {
    if (!quote.totalAmount || quote.totalAmount <= 0) {
      return setError('Debés ingresar el monto a cotizar antes de redactar la propuesta.')
    }
    setIsGeneratingProposal(true)
    setError('')
    try {
      const res = await generateProposalWithAI(quote, adminToken)
      setQuote({ ...quote, proposalDescription: res.text })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGeneratingProposal(false)
    }
  }

  if (!quote) return <section className="customer-portal"><p>{error || 'Cargando cotización…'}</p></section>
  const customerRouteId = customer?.id || (id && Number(id) > 0 ? id : '')

  return (
    <section className="customer-portal">
      <header>
        <div>
          {customerRouteId ? <Link to={`/admin/clientes/${customerRouteId}`}>← Volver al cliente</Link> : <Link to="/admin/cotizaciones-clientes">← Volver a cotizaciones</Link>}
          <span>Respuesta comercial</span>
          <h1>{quote.title}</h1>
          <p>{customer?.name || 'Cliente corporativo'} · {quote.referenceNumber}</p>
        </div>
        {quote.totalAmount > 0 && <strong>{formatPrice(quote.totalAmount, quote.currency)}</strong>}
      </header>
      {error && <p className="customer-portal-error">{error}</p>}

      <div className="admin-quote-workspace">
        <div className="quote-workspace">
          <div className="quote-workspace-head">
            <div>
              <span>Solicitud del cliente</span>
              <p>{quote.description}</p>

              {/* VISTA RÁPIDA DE ADJUNTOS ENVIADOS POR EL CLIENTE (VIDEOS, PLANOS, MEMORIAS, FOTOS) */}
              {Array.isArray(quote.attachments) && quote.attachments.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📎 Material y Archivos Enviados por el Cliente ({quote.attachments.length})
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Archivos originales de la cotización</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    {quote.attachments.map((att, idx) => {
                      const isVid = att.type?.startsWith('video/') || att.category === 'video' || Boolean(att.name?.match(/\.(mp4|mov|webm|m4v|avi)$/i))
                      const isImg = !isVid && (att.type?.startsWith('image/') || att.category === 'foto' || Boolean(att.name?.match(/\.(png|jpe?g|webp|gif)$/i)))
                      const src = att.url || att.data

                      return (
                        <div key={idx} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '1.1rem' }}>{isVid ? '🎥' : isImg ? '📷' : '📐'}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={att.name}>
                              {att.name}
                            </span>
                          </div>

                          {isVid && src && (
                            <video
                              src={src}
                              controls
                              preload="metadata"
                              playsInline
                              style={{ width: '100%', maxHeight: '160px', borderRadius: '4px', background: '#0f172a', display: 'block' }}
                            />
                          )}

                          {isImg && src && (
                            <img
                              src={src}
                              alt={att.name}
                              style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            />
                          )}

                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            download={!att.url || att.url.startsWith('data:') ? att.name : undefined}
                            style={{ fontSize: '0.76rem', color: '#ea580c', textDecoration: 'none', fontWeight: 700, marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isVid ? 'Ver / Descargar Video ⬇' : 'Abrir / Descargar ⬇'}
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={parseWithAI} disabled={isParsingAI} style={{ background: '#f8f5ef', color: '#ea580c', border: '1px solid #ea580c', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                  {isParsingAI ? '⏳ Analizando requerimientos...' : '✨ Extraer datos técnicos con IA'}
                </button>
                <Link
                  to={`/admin/cotiza?quoteId=${quote.id}&customerId=${customerRouteId}&title=${encodeURIComponent(quote.title)}`}
                  style={{ background: '#131313', color: 'white', textDecoration: 'none', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  ⚡ Abrir en OXI Quote
                </Link>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  style={{ background: '#25d366', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  💬 Compartir por WhatsApp
                </button>
                {quote.accessToken && (
                  <Link
                    to={`/cotizacion/${quote.accessToken}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ background: '#f5f0e8', color: '#171816', border: '1px solid #dcd4c8', textDecoration: 'none', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    🔗 Vista del Comitente ↗
                  </Link>
                )}
              </div>

              {/* COSTEO VINCULADO BANNER */}
              {quote.documentItems?.length > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem 1rem', borderRadius: '8px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#166534', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>📐 Costeo Paramétrico OXI Quote Vinculado</span>
                    <strong style={{ color: '#15803d', fontSize: '1.05rem' }}>{formatPrice(quote.totalAmount, quote.currency)}</strong>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#14532d' }}>
                    Esta cotización cuenta con un desglose técnico generado desde OXI Quote ({quote.documentItems.length} partidas de materiales y mano de obra).
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/admin/cotiza?quoteId=${quote.id}&customerId=${id}&title=${encodeURIComponent(quote.title)}`}
                      style={{ fontSize: '0.78rem', background: 'white', border: '1px solid #86efac', color: '#166534', padding: '3px 8px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      🔄 Recalcular / Modificar medidas en OXI Quote
                    </Link>
                  </div>
                </div>
              )}

              {aiSuggestion && (
                <div style={{ background: '#f8f5ef', border: '1px solid #dcd4c9', padding: '1rem', borderRadius: '8px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, color: '#ea580c', fontSize: '1rem' }}>🤖 OXI AI extrajo:</h4>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>Variables paramétricas normalizadas</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {aiSuggestion.detected_items?.map((item, idx) => {
                      const targetTemplate = item.suggested_template || 'OXI_DIVIDER_D01'
                      const lengthParam = item.dimensions?.length_m || ''
                      const heightParam = item.dimensions?.height_m || ''
                      const qtyParam = item.quantity || 1
                      const titleParam = encodeURIComponent(item.product_type || quote.title)
                      const cotizaUrl = `/admin/cotiza?quoteId=${quote.id}&customerId=${id}&templateCode=${targetTemplate}&lengthM=${lengthParam}&widthM=${lengthParam}&heightM=${heightParam}&quantity=${qtyParam}&title=${titleParam}`

                      return (
                        <div key={idx} style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#131313' }}>{item.quantity}x {item.product_type}</strong>
                            <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '2px' }}>
                              {item.material} · {item.dimensions?.length_m ? `${item.dimensions.length_m}m largo × ${item.dimensions.height_m || '?'}m alto` : 'Medidas a definir'}
                              {item.finish ? ` · ${item.finish}` : ''}
                            </div>
                          </div>
                          <Link
                            to={cotizaUrl}
                            style={{
                              background: '#ea580c',
                              color: 'white',
                              textDecoration: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ⚡ Cotizar en OXI Quote con 1 clic
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                  {aiSuggestion.missing_critical_info?.length > 0 && (
                    <div style={{ marginTop: '12px', color: '#b91c1c', fontSize: '0.85rem', background: '#fee2e2', padding: '8px', borderRadius: '4px' }}>
                      <strong>Faltan datos clave para costeo exacto:</strong> {aiSuggestion.missing_critical_info.join(', ')}
                    </div>
                  )}
                </div>
              )}
              {formatRequestedDate(quote.desiredDate) && <p style={{ marginTop: '0.75rem' }}>Fecha deseada: {formatRequestedDate(quote.desiredDate)}</p>}
            </div>
          </div>
          <QuoteDocumentsAndTimeline
            quote={quote}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUploadDocument={handleUploadDocument}
            isAdmin={true}
          />
        </div>

        {/* FORMULARIO DE CARGA DE COTIZACIÓN Y COMENTARIOS */}
        <form className="admin-proposal-form" onSubmit={saveProposal}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span>GESTIÓN COMERCIAL · COTIZACIÓN</span>
            {quote.sentAt ? (
              <span style={{ fontSize: '0.74rem', color: '#86efac', background: '#052e16', padding: '2px 8px', borderRadius: '4px', border: '1px solid #166534', fontWeight: 600 }}>
                ✓ Cotizada {formatDateTime(quote.sentAt)}
              </span>
            ) : (
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Recibida: {formatDateTime(quote.createdAt)}
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '1.25rem', margin: '4px 0 10px', color: '#fff' }}>
            Cargar Cotización & Comentarios
          </h2>

          {/* Monto y Moneda */}
          <div>
            <label>
              Monto a cotizar *
              <input
                type="number"
                min="0"
                value={quote.totalAmount || ''}
                onChange={(e) => setQuote({ ...quote, totalAmount: e.target.value })}
                placeholder="Ej: 1850"
                required
              />
            </label>
            <label>
              Moneda
              <select
                value={quote.currency || 'USD'}
                onChange={(e) => setQuote({ ...quote, currency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="UYU">UYU ($U)</option>
              </select>
            </label>
          </div>

          {/* Estado de la cotización */}
          <label>
            Estado de la cotización
            <select
              value={quote.status || 'in_progress'}
              onChange={(e) => setQuote({ ...quote, status: e.target.value })}
            >
              <option value="in_progress">Solicitud recibida (En análisis)</option>
              <option value="sent">Cotización enviada (Para aprobación del cliente)</option>
              <option value="accepted">Presupuesto aprobado por el cliente</option>
              <option value="project_in_progress">Obra / Fabricación en proceso</option>
              <option value="completed">Trabajo terminado</option>
              <option value="cancelled">Cancelada / Rechazada</option>
            </select>
          </label>

          {/* Título de la cotización */}
          <label>
            Título del proyecto / pieza
            <input
              value={quote.title || ''}
              onChange={(e) => setQuote({ ...quote, title: e.target.value })}
              required
            />
          </label>

          {/* Breves comentarios / Observaciones técnicas */}
          <label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Breves comentarios / observaciones para el cliente</span>
              <button
                type="button"
                onClick={generateProposal}
                disabled={isGeneratingProposal}
                style={{ background: 'transparent', color: '#ea580c', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                {isGeneratingProposal ? '⏳ Escribiendo...' : '✨ Redactar con IA'}
              </button>
            </div>
            <textarea
              rows="6"
              value={quote.proposalDescription || ''}
              onChange={(e) => setQuote({ ...quote, proposalDescription: e.target.value })}
              placeholder="Escribí los detalles de la propuesta, materiales (perfiles de hierro, pintura en polvo, madera), plazos de entrega y aclaraciones de montaje para el comitente..."
            />
          </label>

          {/* Fechas estimadas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
            <label>
              Inicio estimado
              <input
                type="date"
                value={quote.estimatedStartAt || ''}
                onChange={(e) => setQuote({ ...quote, estimatedStartAt: e.target.value })}
              />
            </label>
            <label>
              Fin estimado
              <input
                type="date"
                value={quote.estimatedEndAt || ''}
                onChange={(e) => setQuote({ ...quote, estimatedEndAt: e.target.value })}
              />
            </label>
          </div>

          {/* Adjuntar archivo formal de cotización si existe */}
          <div style={{ background: '#0a0c10', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700 }}>
                📄 Adjuntar Presupuesto Formal (PDF / Excel / Imagen)
              </span>
              {quoteProposalFile && (
                <button
                  type="button"
                  onClick={() => setQuoteProposalFile(null)}
                  style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  ✕ Quitar
                </button>
              )}
            </div>
            {quoteProposalFile ? (
              <div style={{ fontSize: '0.8rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✓</span> <strong>{quoteProposalFile.name}</strong> ({(quoteProposalFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#ea580c', cursor: 'pointer', fontWeight: 600 }}>
                📎 Cargar archivo de cotización
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.doc,.docx,image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      setQuoteProposalFile({
                        name: file.name,
                        type: file.type || 'application/pdf',
                        category: 'cotizacion',
                        data: reader.result,
                        size: file.size,
                        uploadedAt: new Date().toISOString()
                      })
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
            )}
          </div>

          {/* Botón guardar y notificar */}
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '14px',
              border: 0,
              borderRadius: '8px',
              background: '#ea580c',
              color: '#fff',
              fontWeight: 900,
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            {saving ? 'Guardando cotización…' : '💾 Guardar y Enviar Cotización al Cliente'}
          </button>

          {savedNotice && (
            <div style={{ background: '#052e16', color: '#86efac', border: '1px solid #166534', padding: '10px 12px', borderRadius: '6px', fontSize: '0.82rem', textAlign: 'center' }}>
              ✓ ¡Cotización guardada! El comitente ya puede verla y aceptarla desde su panel.
            </div>
          )}
        </form>
      </div>

      {showWhatsAppModal && (
        <ShareQuoteWhatsAppModal
          quote={quote}
          customer={customer}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
    </section>
  )
}
