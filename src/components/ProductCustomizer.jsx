import { useState } from 'react'
import { createCustomRequest } from '../lib/api'

const EMPTY_CONTACT = { name: '', email: '', phone: '', zone: '', message: '' }

export default function ProductCustomizer({ product, configuration, onClose }) {
  const [contact, setContact] = useState(EMPTY_CONTACT)
  const [photos, setPhotos] = useState([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function handleContact(event) {
    const { name, value } = event.target
    setContact((previous) => ({ ...previous, [name]: value }))
  }

  function handlePhotos(event) {
    const files = Array.from(event.target.files || []).slice(0, 4)
    if (files.some((file) => file.size > 2 * 1024 * 1024)) {
      setError('Cada foto debe pesar menos de 2 MB.')
      event.target.value = ''
      return
    }

    setError('')
    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ url: reader.result, name: file.name })
      reader.onerror = reject
      reader.readAsDataURL(file)
    }))).then(setPhotos).catch(() => setError('No pudimos leer una de las fotos.'))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      await createCustomRequest({
        productId: product.id,
        productName: product.name,
        configuration,
        photos,
        ...contact,
      })
      setSent(true)
    } catch (requestError) {
      setError(requestError.message || 'No pudimos enviar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="customizer-modal" role="dialog" aria-modal="true" aria-labelledby="customizer-title">
        <header>
          <div>
            <span>Personalización Oxida</span>
            <h2 id="customizer-title">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        {sent ? (
          <div className="customizer-success">
            <strong>Solicitud recibida.</strong>
            <p>Revisaremos la configuración y te contactaremos con precio y plazo.</p>
            <button type="button" onClick={onClose}>Volver al producto</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="customizer-summary">
              <span><small>Medida</small>{configuration.size}</span>
              <span><small>Color</small>{configuration.color}</span>
              <span><small>Terminación</small>{configuration.finish}</span>
            </div>

            <div className="customizer-fields">
              <label>Nombre<input name="name" value={contact.name} onChange={handleContact} required /></label>
              <label>Email<input name="email" type="email" value={contact.email} onChange={handleContact} required /></label>
              <label>WhatsApp<input name="phone" value={contact.phone} onChange={handleContact} required /></label>
              <label>Zona<input name="zone" value={contact.zone} onChange={handleContact} placeholder="Barrio / ciudad" required /></label>
              <label className="is-full">Detalles<textarea name="message" value={contact.message} onChange={handleContact} rows="3" placeholder="Medidas exactas, acceso, instalación o cualquier detalle..." /></label>
            </div>

            <label className="customizer-upload">
              <strong>Agregar fotos del espacio o referencias</strong>
              <span>Hasta 4 imágenes, máximo 2 MB cada una</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} />
            </label>

            {photos.length > 0 && (
              <div className="customizer-previews">
                {photos.map((photo) => <img key={photo.name} src={photo.url} alt={photo.name} />)}
              </div>
            )}

            {error && <p className="customizer-error" role="alert">{error}</p>}
            <button className="customizer-submit" type="submit" disabled={sending}>
              {sending ? 'Enviando…' : 'Solicitar cotización personalizada'} <span>↗</span>
            </button>
          </form>
        )}
      </div>
    </>
  )
}
