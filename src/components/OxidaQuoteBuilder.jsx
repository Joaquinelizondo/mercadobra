import { useMemo, useState } from 'react'
import { createCustomRequest } from '../lib/api'
import '../styles/OxidaQuoteBuilder.css'

const PROJECT_TYPES = [
  { value: 'Mobiliario', label: 'Mobiliario', note: 'Mesas, camas, estantes y piezas especiales' },
  { value: 'Escaleras y barandas', label: 'Escaleras', note: 'Estructuras, barandas y pasamanos' },
  { value: 'Fachadas y divisores', label: 'Fachadas', note: 'Divisores, portones y cerramientos' },
  { value: 'Estructuras', label: 'Estructuras', note: 'Pérgolas, soportes y soluciones de obra' },
]

export default function OxidaQuoteBuilder({ product = null, initialConfiguration = null, onComplete }) {
  const [step, setStep] = useState(product ? 2 : 1)
  const [projectType, setProjectType] = useState(product?.category || '')
  const [details, setDetails] = useState({
    size: initialConfiguration?.size || '',
    color: initialConfiguration?.color || 'Negro mate',
    finish: initialConfiguration?.finish || 'Pintura al horno',
    budget: '',
    timeline: '',
    message: '',
  })
  const [contact, setContact] = useState({ name: '', email: '', phone: '', zone: '' })
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const progress = useMemo(() => (step / 4) * 100, [step])
  const colorOptions = [...new Set(['Negro mate', 'Blanco cálido', 'Óxido natural', details.color, 'A definir'].filter(Boolean))]
  const finishOptions = [...new Set(['Pintura al horno', 'Metal natural protegido', 'Texturada', details.finish, 'A definir'].filter(Boolean))]

  function updateDetails(event) {
    const { name, value } = event.target
    setDetails((previous) => ({ ...previous, [name]: value }))
  }

  function updateContact(event) {
    const { name, value } = event.target
    setContact((previous) => ({ ...previous, [name]: value }))
  }

  function handlePhotos(event) {
    const files = Array.from(event.target.files || []).slice(0, 4)
    if (files.some((file) => file.size > 2 * 1024 * 1024)) {
      setError('Cada imagen debe pesar menos de 2 MB.')
      return
    }
    setError('')
    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ url: reader.result, name: file.name })
      reader.onerror = reject
      reader.readAsDataURL(file)
    }))).then(setPhotos).catch(() => setError('No pudimos procesar una imagen.'))
  }

  function nextFromDetails(event) {
    event.preventDefault()
    if (!details.size.trim()) {
      setError('Indicá una medida aproximada para continuar.')
      return
    }
    setError('')
    setStep(3)
  }

  async function submit(event) {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      await createCustomRequest({
        productId: product?.id || 0,
        productName: product?.name || `Proyecto Oxida · ${projectType}`,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        zone: contact.zone,
        configuration: {
          size: details.size,
          color: details.color,
          finish: details.finish,
        },
        message: [
          details.message,
          details.budget ? `Presupuesto: ${details.budget}` : '',
          details.timeline ? `Plazo deseado: ${details.timeline}` : '',
        ].filter(Boolean).join('\n'),
        photos,
      })
      setStep(4)
      onComplete?.()
    } catch (requestError) {
      setError(requestError.message || 'No pudimos enviar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="oxida-builder">
      <div className="oxida-builder-top">
        <span>0{step} / 04</span>
        <div><i style={{ width: `${progress}%` }} /></div>
        <small>{product ? product.name : 'Cotizador Oxida'}</small>
      </div>

      {step === 1 && (
        <div className="oxida-builder-step">
          <p className="oxida-builder-kicker">Empecemos por la idea</p>
          <h3>¿Qué querés <em>crear?</em></h3>
          <div className="oxida-builder-types">
            {PROJECT_TYPES.map((type, index) => (
              <button
                key={type.value}
                type="button"
                className={projectType === type.value ? 'is-selected' : ''}
                onClick={() => setProjectType(type.value)}
              >
                <span>0{index + 1}</span><strong>{type.label}</strong><small>{type.note}</small><b>↗</b>
              </button>
            ))}
          </div>
          <button className="oxida-builder-next" type="button" disabled={!projectType} onClick={() => setStep(2)}>
            Continuar <span>→</span>
          </button>
        </div>
      )}

      {step === 2 && (
        <form className="oxida-builder-step" onSubmit={nextFromDetails}>
          <p className="oxida-builder-kicker">Forma y material</p>
          <h3>Dale forma a<br /><em>tu proyecto.</em></h3>
          <div className="oxida-builder-fields">
            <label className="is-wide"><span>Medida aproximada *</span><input name="size" value={details.size} onChange={updateDetails} placeholder="Ej: 180 × 90 × 75 cm" /></label>
            <label><span>Color</span><select name="color" value={details.color} onChange={updateDetails}>{colorOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>Terminación</span><select name="finish" value={details.finish} onChange={updateDetails}>{finishOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>Presupuesto</span><select name="budget" value={details.budget} onChange={updateDetails}><option value="">A definir</option><option>Hasta $20.000</option><option>$20.000–$50.000</option><option>Más de $50.000</option></select></label>
            <label><span>¿Para cuándo?</span><select name="timeline" value={details.timeline} onChange={updateDetails}><option value="">Sin fecha definida</option><option>Este mes</option><option>En 1–3 meses</option><option>Más adelante</option></select></label>
            <label className="is-wide"><span>Detalles</span><textarea name="message" value={details.message} onChange={updateDetails} rows="3" placeholder="Contanos cómo imaginás la pieza y dónde va a ir..." /></label>
          </div>
          {error && <p className="oxida-builder-error">{error}</p>}
          <div className="oxida-builder-nav"><button type="button" onClick={() => setStep(product ? 2 : 1)} disabled={Boolean(product)}>← Atrás</button><button className="oxida-builder-next" type="submit">Continuar <span>→</span></button></div>
        </form>
      )}

      {step === 3 && (
        <form className="oxida-builder-step" onSubmit={submit}>
          <p className="oxida-builder-kicker">Último paso</p>
          <h3>Hablemos de<br /><em>tu espacio.</em></h3>
          <div className="oxida-builder-fields">
            <label><span>Nombre *</span><input name="name" value={contact.name} onChange={updateContact} required /></label>
            <label><span>WhatsApp *</span><input name="phone" value={contact.phone} onChange={updateContact} required /></label>
            <label><span>Email *</span><input name="email" type="email" value={contact.email} onChange={updateContact} required /></label>
            <label><span>Zona *</span><input name="zone" value={contact.zone} onChange={updateContact} placeholder="Barrio / ciudad" required /></label>
          </div>
          <label className="oxida-builder-upload">
            <span>＋</span><strong>Subí fotos, croquis o referencias</strong><small>Hasta 4 imágenes · JPG, PNG o WEBP</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} />
          </label>
          {photos.length > 0 && <div className="oxida-builder-previews">{photos.map((photo) => <img key={photo.name} src={photo.url} alt={photo.name} />)}</div>}
          {error && <p className="oxida-builder-error">{error}</p>}
          <div className="oxida-builder-nav"><button type="button" onClick={() => setStep(2)}>← Atrás</button><button className="oxida-builder-next" type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar proyecto'} <span>↗</span></button></div>
        </form>
      )}

      {step === 4 && (
        <div className="oxida-builder-success">
          <span>✓</span><p>Proyecto recibido</p><h3>Ahora empieza<br /><em>lo interesante.</em></h3>
          <small>Revisaremos tu idea y te contactaremos para definir el próximo paso.</small>
          <button type="button" onClick={() => setStep(product ? 2 : 1)}>Crear otra solicitud</button>
        </div>
      )}
    </div>
  )
}
