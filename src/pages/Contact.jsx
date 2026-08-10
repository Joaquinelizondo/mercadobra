import { useState } from 'react'
import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import { createLead } from '../lib/api'
import { createWhatsAppLink } from '../utils/whatsapp'
import './InfoPage.css'

export default function Contact() {
  const whatsappLink = createWhatsAppLink({ intent: 'consulta', source: 'pagina-contacto' })
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', subject: 'Producto o compra', message: '' })
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setFeedback({ type: '', message: '' })
    try {
      await createLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim() || 'Cliente particular',
        zone: 'Uruguay',
        plan: 'pro',
        source: 'pagina-contacto',
        projectType: form.subject,
        message: `Motivo: ${form.subject}\n\n${form.message.trim()}`,
      })
      setForm({ name: '', email: '', phone: '', company: '', subject: 'Producto o compra', message: '' })
      setFeedback({ type: 'success', message: 'Gracias. Recibimos tu consulta y te responderemos a la brevedad.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'No pudimos enviar la consulta. Intentá nuevamente.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="info-page">
      <MercadoQuoteFinder />
      <section className="info-page-card contact-card">
        <div className="contact-intro">
          <p className="info-page-kicker">Contáctenos</p>
          <h1>Hablemos de lo que querés hacer en hierro.</h1>
          <p>Escribinos para consultar por productos, cotizaciones, estructuras, fabricación a medida o acompañamiento técnico para tu proyecto.</p>
          <div className="info-page-actions">
            <a href="mailto:contacto@mercadobra.com">contacto@mercadobra.com</a>
            <a href={whatsappLink} target="_blank" rel="noreferrer">+598 99 213 300 · Uruguay</a>
          </div>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-heading"><span>Tu consulta</span><h2>Contanos sobre tu proyecto.</h2></div>
          <div className="contact-form-grid">
            <label><span>Nombre *</span><input name="name" value={form.name} onChange={handleChange} required autoComplete="name" /></label>
            <label><span>Email *</span><input type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" /></label>
            <label><span>Teléfono / WhatsApp *</span><input type="tel" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" /></label>
            <label><span>Empresa <small>(opcional)</small></span><input name="company" value={form.company} onChange={handleChange} autoComplete="organization" /></label>
            <label className="is-wide"><span>Motivo</span><select name="subject" value={form.subject} onChange={handleChange}><option>Producto o compra</option><option>Cotización</option><option>Estructura</option><option>Fabricación a medida</option><option>Asesoramiento técnico</option><option>Otro</option></select></label>
            <label className="is-wide"><span>Comentarios *</span><textarea name="message" value={form.message} onChange={handleChange} required rows="6" placeholder="Contanos qué necesitás, medidas aproximadas, ubicación o cualquier detalle útil…" /></label>
          </div>
          {feedback.message && <p className={`contact-form-feedback is-${feedback.type}`} role="status">{feedback.message}</p>}
          <button type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar consulta'}</button>
        </form>
      </section>
    </div>
  )
}
