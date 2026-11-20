import { useState, useMemo } from 'react'
import { formatPrice } from '../utils/format'
import './ShareQuoteWhatsAppModal.css'

function cleanPhoneNumber(phone = '') {
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  // If starts with 09... in Uruguay, convert to 5989...
  if (digits.startsWith('09') && digits.length === 9) {
    return `598${digits.slice(1)}`
  }
  // If starts with 9... (8 digits)
  if (digits.startsWith('9') && digits.length === 8) {
    return `598${digits}`
  }
  // If already starts with 598
  if (digits.startsWith('598')) {
    return digits
  }
  return digits
}

export default function ShareQuoteWhatsAppModal({ quote, customer, onClose }) {
  const [phone, setPhone] = useState(customer?.phone || '')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

  // El enlace público solo usa el token aleatorio del backend (nunca derivado de la referencia o el id)
  const token = quote?.accessToken || ''
  const publicUrl = token ? `${window.location.origin}/cotizacion/${token}` : ''
  const customerName = customer?.name || customer?.company || 'Comitente'

  const messageText = useMemo(() => {
    const priceText = quote?.totalAmount > 0 ? formatPrice(quote.totalAmount, quote.currency) : 'A definir'
    return `Hola ${customerName}, te compartimos la propuesta técnica y cotización oficial de Óxida Studio:

📌 Obra: ${quote?.title || 'Proyecto a medida'}
💰 Presupuesto: ${priceText}
📋 Ref: ${quote?.referenceNumber || quote?.id}

Podés revisar el legajo técnico, planos por etapa, descargar el PDF y aprobar la propuesta directamente desde este enlace:
${publicUrl}

Quedamos a las órdenes ante cualquier consulta o ajuste técnico.
— Equipo de Ingeniería · Óxida Studio`
  }, [customerName, quote, publicUrl])

  const cleanPhone = cleanPhoneNumber(phone)
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch { void 0 }
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopiedMessage(true)
      setTimeout(() => setCopiedMessage(false), 2500)
    } catch { void 0 }
  }

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-modal-box" onClick={(e) => e.stopPropagation()}>
        <header className="wa-modal-header">
          <div className="wa-modal-title-group">
            <span className="wa-modal-badge">WhatsApp Direct · Óxida Studio</span>
            <h3>Enviar Cotización al Comitente</h3>
          </div>
          <button type="button" className="wa-modal-close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="wa-modal-body">
          {/* PHONE NUMBER INPUT */}
          <div className="wa-field">
            <label>
              <span>Teléfono / WhatsApp de destino:</span>
              <div className="wa-phone-input-wrap">
                <span className="wa-phone-flag">🇺🇾</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 099 123 456 o +598 99 123 456"
                  className="wa-input"
                />
              </div>
            </label>
            <small className="wa-hint">
              {cleanPhone ? `Destinatario normalizado: +${cleanPhone}` : 'Podés dejarlo vacío para seleccionar el contacto directamente en WhatsApp.'}
            </small>
          </div>

          {/* MESSAGE PREVIEW */}
          <div className="wa-field">
            <label>
              <span>Mensaje pre-formateado con Enlace Seguro:</span>
              <textarea
                readOnly
                value={messageText}
                rows="7"
                className="wa-textarea-preview"
              />
            </label>
          </div>

          {/* MAGIC LINK PREVIEW */}
          <div className="wa-link-preview-card">
            <div className="wa-link-info">
              <span className="wa-link-label">Enlace Seguro de Cotización (Magic Link):</span>
              <code className="wa-link-url">{publicUrl}</code>
            </div>
            <button
              type="button"
              className="wa-btn-copy-link"
              onClick={handleCopyLink}
            >
              {copiedLink ? '✓ ¡Copiado!' : '📋 Copiar Enlace'}
            </button>
          </div>
        </div>

        {/* MODAL ACTIONS */}
        <footer className="wa-modal-footer">
          <button
            type="button"
            className="wa-btn-copy-msg"
            onClick={handleCopyMessage}
          >
            {copiedMessage ? '✓ ¡Mensaje Copiado!' : '📋 Copiar Mensaje Completo'}
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="wa-btn-send"
          >
            <span className="wa-icon">💬</span>
            Abrir en WhatsApp Web / App ↗
          </a>
        </footer>
      </div>
    </div>
  )
}
