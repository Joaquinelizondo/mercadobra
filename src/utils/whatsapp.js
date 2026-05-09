const WHATSAPP_NUMBER = String(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '')

function fallback(value, fallbackValue = 'No informado') {
  const normalized = String(value ?? '').trim()
  return normalized || fallbackValue
}

export function getWhatsAppEndpoint() {
  return WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : 'https://wa.me/'
}

export function buildWhatsAppMessage({ intent = 'consulta', source = 'site', data = {} } = {}) {
  const lines = ['Hola MercadObra, vengo desde la web.']

  if (intent === 'cotizar') {
    lines.push('Quiero cotizar productos para mi obra.')
  } else if (intent === 'stock') {
    lines.push('Quiero consultar stock y tiempos de entrega.')
  } else if (intent === 'seguimiento') {
    lines.push('Necesito ayuda con seguimiento de pedido.')
  } else if (intent === 'soporte') {
    lines.push('Necesito ayuda con una consulta general.')
  } else {
    lines.push('Quiero recibir asesoria para comprar.')
  }

  lines.push('')
  lines.push(`Origen: ${source}`)

  if (data.route) lines.push(`Ruta: ${data.route}`)
  if (data.projectType) lines.push(`Proyecto: ${data.projectType}`)
  if (data.timeline) lines.push(`Plazo: ${data.timeline}`)
  if (data.budget) lines.push(`Presupuesto: ${data.budget}`)
  if (data.paymentPreference) lines.push(`Pago preferido: ${data.paymentPreference}`)

  if (data.name || data.company || data.phone || data.email || data.zone) {
    lines.push('')
    lines.push(`Nombre: ${fallback(data.name)}`)
    lines.push(`Empresa/Particular: ${fallback(data.company, 'Cliente particular')}`)
    lines.push(`Telefono: ${fallback(data.phone)}`)
    lines.push(`Email: ${fallback(data.email)}`)
    lines.push(`Zona: ${fallback(data.zone)}`)
  }

  if (data.message) {
    lines.push('')
    lines.push(`Detalle: ${fallback(data.message, '-')}`)
  }

  lines.push('')
  lines.push('Me podrian ayudar con esto?')

  return lines.join('\n')
}

export function createWhatsAppLink(options = {}) {
  const endpoint = getWhatsAppEndpoint()
  const message = buildWhatsAppMessage(options)
  return `${endpoint}?text=${encodeURIComponent(message)}`
}
