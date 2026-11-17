import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import OxidaWordmark from '../components/OxidaWordmark'
import QuoteDocumentsAndTimeline from '../components/QuoteDocumentsAndTimeline'
import {
  getPublicQuote,
  sendPublicQuoteMessage,
  uploadPublicQuoteAttachments,
  respondToPublicQuote,
  reportPublicQuoteDepositTransfer,
  downloadPublicQuotePdf
} from '../lib/api'
import { formatPrice } from '../utils/format'
import './PublicQuoteView.css'

const STATUS_MAP = {
  in_progress: { label: 'En revisión / Requerimientos', color: '#b45309', bg: '#fef3c7' },
  sent: { label: 'Cotizada / Presupuesto emitido', color: '#0369a1', bg: '#e0f2fe' },
  accepted: { label: 'Presupuesto aprobado', color: '#166534', bg: '#dcfce7' },
  project_in_progress: { label: 'En fabricación / Obra activa', color: '#0f766e', bg: '#ccfbf1' },
  completed: { label: 'Finalizada / Entregada', color: '#374151', bg: '#f3f4f6' },
  rejected: { label: 'Rechazada / Ajuste solicitado', color: '#991b1b', bg: '#fee2e2' },
  cancelled: { label: 'Cancelada', color: '#4b5563', bg: '#e5e7eb' }
}

export default function PublicQuoteView() {
  const { token } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [messages, setMessages] = useState([])

  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')
  const [processingAction, setProcessingAction] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Deposit receipt upload
  const [depositReceipt, setDepositReceipt] = useState(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    getPublicQuote(token)
      .then((data) => {
        setQuote(data.quote)
        setCustomer(data.customer)
        setMessages(data.messages || [])
      })
      .catch((err) => {
        setError(err.message || 'No se pudo cargar la cotización. El enlace puede haber caducado o ser inválido.')
      })
      .finally(() => setLoading(false))
  }, [token])

  async function handlePublicSendMessage({ message, attachments, category, stage, status }) {
    if (!token) return
    const createdMsg = await sendPublicQuoteMessage(token, { message, attachments, category, stage, status })
    setMessages((prev) => [...prev, createdMsg])
    if (attachments && attachments.length > 0) {
      setQuote((prev) => ({
        ...prev,
        attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), ...attachments]
      }))
    }
  }

  async function handlePublicUploadDocument({ attachments, category, stage, note }) {
    if (!token) return
    const res = await uploadPublicQuoteAttachments(token, { attachments, category, stage, note })
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

  async function handleDecision(decision) {
    const isApprove = decision === 'accepted'
    const confirmPrompt = isApprove
      ? '¿Confirmás la aprobación de esta propuesta comercial para iniciar la coordinación técnica?'
      : '¿Deseás solicitar una revisión o modificaciones sobre esta propuesta?'
    if (!window.confirm(confirmPrompt)) return

    setProcessingAction(true)
    setActionError('')
    try {
      const updated = await respondToPublicQuote(token, decision)
      setQuote(updated)
      setActionSuccess(
        isApprove
          ? '¡Excelente! Presupuesto aprobado. El equipo técnico se pondrá en contacto para coordinar la fabricación y entrega.'
          : 'Solicitud de ajuste enviada. Un ingeniero revisará las observaciones para enviarte una nueva versión.'
      )
      // Refresh messages
      const refreshed = await getPublicQuote(token)
      setMessages(refreshed.messages || [])
    } catch (err) {
      setActionError(err.message || 'No se pudo procesar la respuesta.')
    } finally {
      setProcessingAction(false)
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      await downloadPublicQuotePdf(token)
    } catch (err) {
      window.alert(err.message || 'No se pudo descargar el PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleReportTransfer(e) {
    e.preventDefault()
    if (!depositReceipt) return
    setUploadingReceipt(true)
    try {
      const updated = await reportPublicQuoteDepositTransfer(token, depositReceipt)
      setQuote(updated)
      setDepositReceipt(null)
      setActionSuccess('¡Comprobante recibido con éxito! En breve validaremos la transferencia.')
      const refreshed = await getPublicQuote(token)
      setMessages(refreshed.messages || [])
    } catch (err) {
      setActionError(err.message || 'Error al subir el comprobante.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      return window.alert('El archivo no puede superar 15 MB.')
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDepositReceipt({
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result
      })
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="public-quote-page public-quote-loading">
        <div className="pq-spinner">⏳</div>
        <h2>Cargando expediente de cotización…</h2>
        <p>Conectando con el servidor de Óxida Studio</p>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="public-quote-page public-quote-error">
        <div className="pq-error-card">
          <span>⚠️ Enlace no disponible</span>
          <h2>No pudimos encontrar la cotización solicitada</h2>
          <p>{error || 'El enlace puede haber vencido o la referencia no existe.'}</p>
          <Link to="/" className="pq-btn-primary">
            Ir al inicio de Óxida Studio
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_MAP[quote.status] || { label: quote.status, color: '#171816', bg: '#f4efe8' }
  const customerName = customer?.name || customer?.company || 'Comitente'

  return (
    <div className="public-quote-page">
      {/* TOP BRAND HEADER */}
      <header className="pq-top-bar">
        <div className="pq-brand-left">
          <Link to="/" className="pq-brand-link">
            <OxidaWordmark />
          </Link>
          <span className="pq-top-divider">|</span>
          <span className="pq-expediente-badge">Expediente Técnico de Obra</span>
        </div>
        <div className="pq-top-right">
          <span className="pq-ref-tag">Ref: {quote.referenceNumber}</span>
          <span
            className="pq-status-pill"
            style={{ color: statusInfo.color, background: statusInfo.bg }}
          >
            {statusInfo.label}
          </span>
        </div>
      </header>

      {/* FEEDBACK BANNERS */}
      {actionSuccess && (
        <div className="pq-alert-success">
          <strong>✅ {actionSuccess}</strong>
          <button type="button" onClick={() => setActionSuccess('')}>×</button>
        </div>
      )}
      {actionError && (
        <div className="pq-alert-error">
          <strong>⚠️ {actionError}</strong>
          <button type="button" onClick={() => setActionError('')}>×</button>
        </div>
      )}

      {/* MAIN HERO CARD */}
      <section className="pq-hero-card">
        <div className="pq-hero-main">
          <span className="pq-client-greeting">Para: {customerName}</span>
          <h1 className="pq-quote-title">{quote.title}</h1>
          {quote.description && <p className="pq-quote-desc">{quote.description}</p>}
        </div>

        <div className="pq-hero-commercial">
          <span className="pq-price-eyebrow">Presupuesto Formal</span>
          <div className="pq-price-row">
            <strong className="pq-price-val">
              {quote.totalAmount > 0 ? formatPrice(quote.totalAmount, quote.currency) : 'A determinar'}
            </strong>
          </div>
          <small className="pq-price-meta">
            {quote.taxRate ? `Incluye IVA (${quote.taxRate}%)` : 'Impuestos incluidos según pliego'}
          </small>

          <button
            type="button"
            className="pq-btn-pdf"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? 'Generando PDF…' : '📄 Descargar Propuesta Comercial (PDF)'}
          </button>
        </div>
      </section>

      {/* DECISION BANNER (IF STATUS === 'sent') */}
      {quote.status === 'sent' && (
        <section className="pq-decision-box">
          <div className="pq-decision-text">
            <h3>¿Cómo deseás avanzar con esta propuesta?</h3>
            <p>
              Podés aprobar el presupuesto formal para reservar cupo de taller o solicitar ajustes sobre medidas y materiales.
            </p>
          </div>
          <div className="pq-decision-actions">
            <button
              type="button"
              className="pq-btn-approve"
              disabled={processingAction}
              onClick={() => handleDecision('accepted')}
            >
              ✓ Aceptar y Aprobar Presupuesto
            </button>
            <button
              type="button"
              className="pq-btn-modify"
              disabled={processingAction}
              onClick={() => handleDecision('rejected')}
            >
              Solicitar Ajuste / Modificación
            </button>
          </div>
        </section>
      )}

      {/* DEPOSIT RESERVATION CARD */}
      {quote.status === 'accepted' && quote.depositAmount > 0 && (
        <section className="pq-deposit-card">
          <div className="pq-deposit-info">
            <span className="pq-deposit-eyebrow">Reserva de Fabricación</span>
            <h3>Seña requerida: {formatPrice(quote.depositAmount, quote.currency)}</h3>
            <p>
              Para iniciar el acopio de acero, madera y ordenar corte en taller, por favor realizá la transferencia y adjuntá el comprobante.
            </p>
            <div className="pq-bank-details">
              <strong>Datos Bancarios:</strong>
              <span>Banco: Banco República (BROU) · Caja de Ahorro USD / UYU</span>
              <span>Beneficiario: Óxida Studio / Mercadobra</span>
            </div>
          </div>

          <div className="pq-deposit-action">
            {quote.depositStatus === 'reported' ? (
              <div className="pq-deposit-reported">
                <span className="pq-check-icon">⏳</span>
                <strong>Comprobante en revisión</strong>
                <p>Recibimos tu comprobante. Nuestro equipo confirmará la acreditación en breve.</p>
              </div>
            ) : quote.depositStatus === 'approved' ? (
              <div className="pq-deposit-approved">
                <span className="pq-check-icon">✅</span>
                <strong>¡Seña confirmada!</strong>
                <p>Tu proyecto ya está en cola de taller y fabricación activa.</p>
              </div>
            ) : (
              <form onSubmit={handleReportTransfer} className="pq-transfer-form">
                <label className="pq-file-label">
                  <span>Adjuntar comprobante de transferencia (PDF o foto):</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    required
                  />
                </label>
                {depositReceipt && (
                  <p className="pq-selected-file">
                    📎 {depositReceipt.name} ({(depositReceipt.size / 1024).toFixed(0)} KB)
                  </p>
                )}
                <button
                  type="submit"
                  disabled={uploadingReceipt || !depositReceipt}
                  className="pq-btn-submit-deposit"
                >
                  {uploadingReceipt ? 'Enviando…' : 'Informar Transferencia'}
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* FULL TECHNICAL DOSSIER & TIMELINE */}
      <QuoteDocumentsAndTimeline
        quote={quote}
        messages={messages}
        onSendMessage={handlePublicSendMessage}
        onUploadDocument={handlePublicUploadDocument}
        isAdmin={false}
      />

      {/* DIRECT WHATSAPP SUPPORT BAR */}
      <footer className="pq-footer-contact">
        <div>
          <strong>¿Preguntas técnicas o asesoramiento sobre este proyecto?</strong>
          <p>Hablá directamente con nuestro equipo de ingeniería y dirección de obra.</p>
        </div>
        <a
          href={`https://wa.me/59899123456?text=${encodeURIComponent(`Hola Óxida Studio, tengo una consulta sobre la cotización ${quote.referenceNumber} (${quote.title}).`)}`}
          target="_blank"
          rel="noreferrer"
          className="pq-btn-wa"
        >
          💬 Consultar por WhatsApp
        </a>
      </footer>
    </div>
  )
}
