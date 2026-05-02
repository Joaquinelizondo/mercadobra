import nodemailer from 'nodemailer'

const FRONTEND_PUBLIC_URL = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173'
const WHATSAPP_PROVIDER = (process.env.WHATSAPP_PROVIDER || 'webhook').toLowerCase()
const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL || ''
const META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || ''
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || ''
const META_WHATSAPP_API_VERSION = process.env.META_WHATSAPP_API_VERSION || 'v22.0'
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || ''
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const RESEND_FROM = process.env.RESEND_FROM || SMTP_FROM || ''
const EMAIL_SEND_TIMEOUT_MS = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 12000)
const WHATSAPP_SEND_TIMEOUT_MS = Number(process.env.WHATSAPP_SEND_TIMEOUT_MS || 12000)

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  preparing: 'Preparando',
  shipped: 'Despachada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function formatMessage(order) {
  const statusLabel = STATUS_LABELS[order.status] || order.status || 'Actualizada'
  const trackingUrl = order.trackingToken
    ? `${FRONTEND_PUBLIC_URL}/seguimiento/${order.trackingToken}?phone=${encodeURIComponent(order.buyerPhone || '')}`
    : ''

  const lines = [`MercadObra · Orden #${order.id}`, `Nuevo estado: ${statusLabel}`]

  if (trackingUrl) {
    lines.push(`Seguimiento: ${trackingUrl}`)
  }

  return lines.join('\n')
}

async function sendViaWebhook(payload) {
  const response = await fetch(WHATSAPP_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Webhook notification failed (${response.status}): ${text.slice(0, 160)}`)
  }
}

function normalizePhoneNumber(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function formatWhatsappAddress(phone) {
  const input = String(phone || '').trim()
  if (input.toLowerCase().startsWith('whatsapp:')) {
    return input
  }

  const normalizedTo = normalizePhoneNumber(input)
  if (!normalizedTo) {
    return ''
  }

  return `whatsapp:+${normalizedTo}`
}

async function sendViaMetaCloud(payload) {
  if (!META_WHATSAPP_PHONE_NUMBER_ID || !META_WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Meta WhatsApp provider is not configured')
  }

  const normalizedTo = normalizePhoneNumber(payload.to)
  if (!normalizedTo) {
    throw new Error('invalid destination phone')
  }

  const response = await fetch(
    `https://graph.facebook.com/${META_WHATSAPP_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: {
          preview_url: false,
          body: payload.message,
        },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Meta WhatsApp notification failed (${response.status}): ${text.slice(0, 160)}`)
  }
}

async function sendViaTwilio(payload) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio WhatsApp provider is not configured')
  }

  const toAddress = formatWhatsappAddress(payload.to)
  if (!toAddress) {
    throw new Error('invalid destination phone')
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_WHATSAPP_FROM,
        To: toAddress,
        Body: payload.message,
      }).toString(),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Twilio WhatsApp notification failed (${response.status}): ${text.slice(0, 160)}`)
  }
}

async function sendViaWhatsappProvider(payload) {
  if (WHATSAPP_PROVIDER === 'meta') {
    await sendViaMetaCloud(payload)
    return 'whatsapp-meta'
  }

  if (WHATSAPP_PROVIDER === 'twilio') {
    await sendViaTwilio(payload)
    return 'whatsapp-twilio'
  }

  if (WHATSAPP_WEBHOOK_URL) {
    await sendViaWebhook(payload)
    return 'whatsapp-webhook'
  }

  console.log('[notification:mock]', payload)
  return 'whatsapp-mock'
}

let transporter = null

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      family: 4,
      connectionTimeout: EMAIL_SEND_TIMEOUT_MS,
      greetingTimeout: EMAIL_SEND_TIMEOUT_MS,
      socketTimeout: EMAIL_SEND_TIMEOUT_MS,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  return transporter
}

function formatRecommendationItems(products = []) {
  return products.slice(0, 5).map((product, index) => {
    const detailUrl = `${FRONTEND_PUBLIC_URL}/producto/${product.id}`
    return {
      name: product.name,
      company: product.company,
      priceLabel: `$${Number(product.price || 0).toLocaleString('es-AR')}`,
      detailUrl,
      text: `${index + 1}. ${product.name} · ${product.company} · $${Number(product.price || 0).toLocaleString('es-AR')} · ${detailUrl}`,
      html: `
        <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin:0 0 10px;background:#ffffff;">
          <div style="font-size:16px;font-weight:700;color:#111827;margin:0 0 6px;">${product.name}</div>
          <div style="font-size:13px;color:#6b7280;margin:0 0 4px;">Proveedor: ${product.company}</div>
          <div style="font-size:15px;font-weight:700;color:#1d4ed8;margin:0 0 10px;">$${Number(product.price || 0).toLocaleString('es-AR')}</div>
          <a href="${detailUrl}" style="display:inline-block;padding:8px 12px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">Ver producto</a>
        </div>
      `,
    }
  })
}

function buildRecommendationEmailContent(searchTerm, items) {
  const exploreUrl = `${FRONTEND_PUBLIC_URL}/explorar?q=${encodeURIComponent(searchTerm)}`
  const safeSearchTerm = searchTerm || 'tu búsqueda'
  const hasMatches = items.length > 0

  const textLines = [
    'Hola,',
    '',
    `Buscaste: ${safeSearchTerm}`,
    '',
  ]

  if (hasMatches) {
    textLines.push('Estas son algunas opciones recomendadas:')
    textLines.push('')
    textLines.push(...items.map((item) => item.text))
  } else {
    textLines.push('No encontramos coincidencias exactas en este momento.')
    textLines.push('Te recomendamos ver resultados relacionados en el catalogo.')
  }

  textLines.push('')
  textLines.push(`Ver resultados: ${exploreUrl}`)
  textLines.push('Equipo MercadObra')

  const htmlItems = hasMatches
    ? items
        .map(
          (item) => `
            <tr>
              <td style="padding:0 0 12px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e5e7eb;">
                  <tr>
                    <td style="padding:14px;font-family:Arial,sans-serif;color:#111827;">
                      <div style="font-size:16px;font-weight:700;line-height:1.3;">${item.name}</div>
                      <div style="font-size:13px;color:#6b7280;line-height:1.4;padding-top:4px;">Proveedor: ${item.company}</div>
                      <div style="font-size:15px;font-weight:700;color:#ea580c;line-height:1.4;padding-top:6px;">${item.priceLabel}</div>
                      <div style="padding-top:10px;">
                        <a href="${item.detailUrl}" style="font-size:13px;font-weight:700;color:#ffffff;background:#111827;text-decoration:none;padding:8px 12px;display:inline-block;">Ver producto</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `
        )
        .join('')
    : `
      <tr>
        <td style="padding:12px 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#334155;">
          No encontramos coincidencias exactas en este momento. Te recomendamos ver resultados relacionados en el catalogo.
        </td>
      </tr>
    `

  const html = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:20px 8px;">
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px;max-width:620px;background:#ffffff;border:1px solid #111827;">
            <tr>
              <td style="background:#ea580c;height:6px;line-height:6px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:#111827;padding:20px;font-family:Arial,sans-serif;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">MercadObra</div>
                <div style="font-size:26px;font-weight:700;line-height:1.2;padding-top:8px;">Estas son las mejores opciones para ti</div>
                <div style="font-size:14px;line-height:1.4;padding-top:8px;">Busqueda: <strong>${safeSearchTerm}</strong></div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${htmlItems}
                  <tr>
                    <td style="padding-top:8px;font-family:Arial,sans-serif;">
                      <a href="${exploreUrl}" style="font-size:14px;font-weight:700;color:#ffffff;background:#ea580c;text-decoration:none;padding:10px 14px;display:inline-block;">Ver mas opciones en MercadObra</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px;max-width:620px;">
            <tr>
              <td style="padding:10px 0 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.4;color:#6b7280;">
                Recibiste este mail porque solicitaste recomendaciones desde MercadObra.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `

  return {
    text: textLines.join('\n'),
    html,
  }
}

async function sendRecommendationEmailViaResend({ email, subject, html }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EMAIL_SEND_TIMEOUT_MS)
  const htmlDocument = `<!doctype html><html><body style="margin:0;padding:0;">${html}</body></html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject,
        html: htmlDocument,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(`Resend notification failed (${response.status}): ${responseText.slice(0, 160)}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function sendRecommendationEmail(email, searchTerm, products) {
  if (!email) {
    return { sent: false, channel: 'email', reason: 'email missing' }
  }

  const items = formatRecommendationItems(products)
  const subject = `MercadObra: opciones para "${searchTerm}"`
  const { text, html } = buildRecommendationEmailContent(searchTerm, items)

  if (RESEND_API_KEY && RESEND_FROM) {
    await sendRecommendationEmailViaResend({ email, subject, html })
    return { sent: true, channel: 'email-resend' }
  }

  const emailTransporter = getTransporter()
  if (!emailTransporter) {
    console.log('[recommendation:email:mock]', { email, searchTerm, items })
    return { sent: true, channel: 'email-mock' }
  }

  await withTimeout(
    emailTransporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      text,
      html,
    }),
    EMAIL_SEND_TIMEOUT_MS,
    'email send'
  )

  return { sent: true, channel: 'email-smtp' }
}

async function sendRecommendationWhatsapp(phone, searchTerm, products) {
  if (!phone) {
    return { sent: false, channel: 'whatsapp', reason: 'phone missing' }
  }

  const items = formatRecommendationItems(products)
  const message = [
    `MercadObra · opciones para "${searchTerm}"`,
    '',
    ...items.map((item) => item.text),
    '',
    `Ver más: ${FRONTEND_PUBLIC_URL}/explorar?q=${encodeURIComponent(searchTerm)}`,
  ].join('\n')

  const payload = {
    channel: 'whatsapp',
    to: phone,
    message,
    searchTerm,
  }

  const channel = await withTimeout(sendViaWhatsappProvider(payload), WHATSAPP_SEND_TIMEOUT_MS, 'whatsapp send')
  return { sent: true, channel }
}

export async function notifyOrderStatusChanged(order) {
  const message = formatMessage(order)
  const payload = {
    channel: 'whatsapp',
    to: order.buyerPhone,
    message,
    orderId: order.id,
    status: order.status,
    trackingToken: order.trackingToken,
  }

  if (!order.buyerPhone) {
    return {
      sent: false,
      reason: 'buyer phone missing',
      channel: 'none',
    }
  }

  try {
    const channel = await withTimeout(sendViaWhatsappProvider(payload), WHATSAPP_SEND_TIMEOUT_MS, 'order whatsapp send')
    return {
      sent: true,
      channel,
    }
  } catch (error) {
    console.error('[notification:error]', error)
    return {
      sent: false,
      reason: error.message,
      channel: 'whatsapp-webhook',
    }
  }
}

export async function notifySearchRecommendations({ email, phone, searchTerm, products }) {
  const limitedProducts = Array.isArray(products) ? products.slice(0, 5) : []

  const [emailResult, whatsappResult] = await Promise.all([
    sendRecommendationEmail(email, searchTerm, limitedProducts).catch((error) => ({
      sent: false,
      channel: 'email',
      reason: error.message,
    })),
    sendRecommendationWhatsapp(phone, searchTerm, limitedProducts).catch((error) => ({
      sent: false,
      channel: 'whatsapp',
      reason: error.message,
    })),
  ])

  return {
    email: emailResult,
    whatsapp: whatsappResult,
  }
}
