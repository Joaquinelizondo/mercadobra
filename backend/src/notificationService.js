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
const TRANSFER_ACCOUNT_NAME = process.env.TRANSFER_ACCOUNT_NAME || ''
const TRANSFER_ACCOUNT_NUMBER = process.env.TRANSFER_ACCOUNT_NUMBER || ''
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const CONFIGURED_RESEND_FROM = process.env.RESEND_FROM || SMTP_FROM || ''
const RESEND_FROM = CONFIGURED_RESEND_FROM && !/@resend\.dev\b/i.test(CONFIGURED_RESEND_FROM)
  ? CONFIGURED_RESEND_FROM
  : 'Óxida Studio <formularios@send.mercadobra.com>'
const EMAIL_SEND_TIMEOUT_MS = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 12000)
const LEADS_NOTIFICATION_EMAIL = process.env.LEADS_NOTIFICATION_EMAIL || 'contacto@mercadobra.com'
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

  const lines = [`Mercadobra · Orden #${order.id}`, `Nuevo estado: ${statusLabel}`]

  if (trackingUrl) {
    lines.push(`Seguimiento: ${trackingUrl}`)
  }

  return lines.join('\n')
}

function formatOrderConfirmationMessage(order, items = []) {
  const paymentKey = String(order.paymentMethod || '').trim().toLowerCase()
  const paymentLabels = {
    transferencia: 'Transferencia bancaria',
    mercadopago: 'MercadoPago',
    pago_al_coordinar: 'Pago después de confirmar el envío',
    tarjeta_credito: 'Tarjeta de crédito',
    tarjeta_debito: 'Tarjeta de débito',
  }
  const paymentLabel = paymentLabels[paymentKey] || String(order.paymentMethod || '').trim() || 'No informado'

  const lines = [
    '*Mercadobra*',
    `*Pedido recibido #${order.id}*`,
    '',
    'Tu pedido fue realizado correctamente ✅',
    'A la brevedad te llega la confirmación final.',
    `*Medio de pago:* ${paymentLabel}`,
  ]

  lines.push(`*Entrega:* ${order.deliveryMethod === 'pickup' ? 'Retiro acordado' : 'Entrega coordinada'}`)
  if (order.deliveryMethod !== 'pickup' && (order.deliveryAddress || order.deliveryCity)) {
    lines.push(`*Dirección:* ${[order.deliveryAddress, order.deliveryCity].filter(Boolean).join(', ')}`)
  }
  if (order.buyerEmail) {
    lines.push(`*Email:* ${order.buyerEmail}`)
  }
  if (order.buyerNotes) {
    lines.push(`*Notas:* ${order.buyerNotes}`)
  }

  if (paymentLabel === 'Transferencia bancaria') {
    if (TRANSFER_ACCOUNT_NAME) {
      lines.push(`*Titular:* ${TRANSFER_ACCOUNT_NAME}`)
    }

    if (TRANSFER_ACCOUNT_NUMBER) {
      lines.push(`*Cuenta:* ${TRANSFER_ACCOUNT_NUMBER}`)
    }
  }

  if (Array.isArray(items) && items.length > 0) {
    lines.push('')
    lines.push('*Detalle:*')
    items.slice(0, 8).forEach((item, index) => {
      const quantity = Number(item.quantity || 1)
      const name = item.name || `Producto ${item.productId || index + 1}`
      const company = item.company ? ` · ${item.company}` : ''
      const amount = Number(item.subtotal ?? (Number(item.price || 0) * quantity))
      const price = Number.isFinite(amount) && amount > 0
        ? ` · ${new Intl.NumberFormat('es-UY', { style: 'currency', currency: item.currency || order.currency || 'UYU', maximumFractionDigits: 0 }).format(amount)}`
        : ''
      lines.push(`• ${name}${company} x${quantity}${price}`)
    })
    if (Number(order.total) > 0) {
      lines.push(`*Total:* ${new Intl.NumberFormat('es-UY', { style: 'currency', currency: order.currency || 'UYU', maximumFractionDigits: 0 }).format(Number(order.total))}`)
    }
  }

  if (order.trackingToken && order.buyerPhone) {
    lines.push('')
    lines.push(`*Seguimiento:* ${FRONTEND_PUBLIC_URL}/seguimiento/${order.trackingToken}?phone=${encodeURIComponent(order.buyerPhone)}`)
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
    const publicBaseUrl = FRONTEND_PUBLIC_URL.replace(/\/+$/, '')
    const detailUrl = `${publicBaseUrl}/producto/${encodeURIComponent(product.id)}`
    const rawImage = Array.isArray(product.images) ? product.images[0] : null
    const rawImageUrl = typeof rawImage === 'string' ? rawImage : rawImage?.url
    let imageUrl = ''
    if (rawImageUrl) {
      try {
        imageUrl = new URL(rawImageUrl, `${publicBaseUrl}/`).href
      } catch {
        imageUrl = ''
      }
    }
    return {
      name: product.name,
      company: product.company,
      priceLabel: `$${Number(product.price || 0).toLocaleString('es-AR')}`,
      detailUrl,
      imageUrl,
      description: String(product.description || '').trim(),
      unit: String(product.unit || '').trim(),
      actionLabel: product.productType === 'custom_quote'
        ? 'Ver y solicitar a medida'
        : Number(product.stock || 0) > 0
          ? 'Comprar ahora'
          : 'Ver producto',
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
  textLines.push('Equipo Mercadobra')

  const htmlItems = hasMatches
    ? items
        .map(
          (item) => `
            <tr>
              <td style="padding:0 0 12px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e5e7eb;">
                  <tr>
                    ${item.imageUrl ? `<td width="180" valign="top" style="width:180px;padding:14px 0 14px 14px;"><a href="${item.detailUrl}"><img src="${item.imageUrl}" alt="${item.name}" width="166" style="display:block;width:166px;height:125px;object-fit:cover;border:0;" /></a></td>` : ''}
                    <td style="padding:14px;font-family:Arial,sans-serif;color:#111827;">
                      <div style="font-size:16px;font-weight:700;line-height:1.3;">${item.name}</div>
                      <div style="font-size:13px;color:#6b7280;line-height:1.4;padding-top:4px;">Proveedor: ${item.company}</div>
                      ${item.description ? `<div style="font-size:13px;color:#374151;line-height:1.45;padding-top:7px;">${item.description}</div>` : ''}
                      <div style="font-size:15px;font-weight:700;color:#ea580c;line-height:1.4;padding-top:7px;">${item.priceLabel}${item.unit ? ` <span style="font-size:12px;font-weight:400;color:#6b7280;">/ ${item.unit}</span>` : ''}</div>
                      <div style="padding-top:10px;">
                        <a href="${item.detailUrl}" style="font-size:13px;font-weight:700;color:#ffffff;background:#111827;text-decoration:none;padding:8px 12px;display:inline-block;">${item.actionLabel}</a>
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
                <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Mercadobra</div>
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
                      <a href="${exploreUrl}" style="font-size:14px;font-weight:700;color:#ffffff;background:#ea580c;text-decoration:none;padding:10px 14px;display:inline-block;">Ver más opciones en Mercadobra</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px;max-width:620px;">
            <tr>
              <td style="padding:10px 0 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.4;color:#6b7280;">
                Recibiste este mail porque solicitaste recomendaciones desde Mercadobra.
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

async function sendRecommendationEmailViaResend({ email, subject, html, replyTo = '' }) {
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
        ...(replyTo ? { reply_to: replyTo } : {}),
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

function escapeEmailHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function notifyLeadCreated(lead) {
  const destination = LEADS_NOTIFICATION_EMAIL
  const subject = `Óxida Studio · Nueva consulta de ${lead.name}`
  const fields = [
    ['Nombre', lead.name],
    ['Email', lead.email],
    ['WhatsApp', lead.phone],
    ['Empresa', lead.company],
    ['Zona', lead.zone],
    ['Tipo de proyecto', lead.projectType],
    ['Presupuesto', lead.budgetRange],
    ['Origen', lead.source],
  ].filter(([, value]) => value)

  const text = [
    'Nueva consulta desde Óxida Studio',
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
    '',
    'Mensaje:',
    lead.message || 'Sin mensaje',
  ].join('\n')

  const rows = fields.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;color:#78716c;font-size:13px;vertical-align:top;">${escapeEmailHtml(label)}</td>
      <td style="padding:8px 12px;color:#1c1917;font-size:14px;font-weight:600;">${escapeEmailHtml(value)}</td>
    </tr>
  `).join('')
  const html = `
    <div style="max-width:620px;margin:auto;background:#f4f1e9;font-family:Arial,sans-serif;color:#1c1917;">
      <div style="background:#1c1c19;padding:24px;color:#fff;border-top:6px solid #ae552e;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d47b50;">Óxida Studio · by Mercadobra</div>
        <h1 style="font-size:26px;margin:10px 0 0;">Nueva consulta de proyecto</h1>
      </div>
      <div style="padding:20px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #ded8cc;">${rows}</table>
        <div style="margin-top:18px;padding:18px;background:#fff;border-left:4px solid #ae552e;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#78716c;margin-bottom:8px;">Mensaje</div>
          <div style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeEmailHtml(lead.message || 'Sin mensaje')}</div>
        </div>
      </div>
    </div>
  `

  if (RESEND_API_KEY && RESEND_FROM) {
    await sendRecommendationEmailViaResend({ email: destination, subject, html, replyTo: lead.email })
    return { sent: true, channel: 'email-resend', to: destination }
  }

  const emailTransporter = getTransporter()
  if (!emailTransporter) {
    console.log('[lead:email:mock]', { to: destination, subject, lead })
    return { sent: false, channel: 'email-mock', to: destination, reason: 'email provider not configured' }
  }

  await withTimeout(
    emailTransporter.sendMail({ from: SMTP_FROM, to: destination, replyTo: lead.email, subject, text, html }),
    EMAIL_SEND_TIMEOUT_MS,
    'lead email send'
  )
  return { sent: true, channel: 'email-smtp', to: destination }
}

export async function sendCustomerInvitationEmail({ email, firstName, inviteUrl }) {
  const safeName = escapeEmailHtml(firstName)
  const safeUrl = escapeEmailHtml(inviteUrl)
  const subject = `${firstName}, te damos la bienvenida a Óxida by Mercadobra`
  const html = `
    <div style="margin:0;background:#ece8df;padding:28px 12px;font-family:Arial,sans-serif;color:#20201d;">
      <div style="max-width:640px;margin:auto;background:#f8f5ee;border:1px solid #d6cec1;">
        <div style="padding:34px 38px;background:#20201d;border-top:7px solid #b55c35;color:#f7f2e9;">
          <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#d27b52;">ÓXIDA STUDIO · by Mercadobra</div>
          <h1 style="margin:18px 0 0;font-size:38px;line-height:1.05;font-weight:700;">Tu próximo proyecto<br>empieza acá.</h1>
        </div>
        <div style="padding:38px;">
          <p style="margin:0 0 18px;font-size:20px;font-weight:700;">Hola ${safeName},</p>
          <p style="margin:0;color:#625f58;font-size:16px;line-height:1.7;">Creamos un acceso privado para que puedas solicitar cotizaciones, adjuntar fotos o planos y conversar con nuestro equipo sobre cada proyecto.</p>
          <div style="margin:28px 0;padding:20px;border-left:4px solid #b55c35;background:#fff;">
            <div style="margin-bottom:9px;font-weight:700;">Todo en un solo lugar</div>
            <div style="color:#6f6a62;font-size:14px;line-height:1.8;">Solicitudes claras · Archivos organizados · Respuestas y seguimiento</div>
          </div>
          <a href="${safeUrl}" style="display:inline-block;padding:15px 24px;background:#b55c35;color:#fff;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:.5px;">CREAR MI CONTRASEÑA →</a>
          <p style="margin:22px 0 0;color:#817b72;font-size:12px;line-height:1.6;">Este enlace es personal, funciona una sola vez y vence en 72 horas.</p>
        </div>
        <div style="padding:20px 38px;border-top:1px solid #d6cec1;color:#817b72;font-size:12px;">Óxida Studio · diseño y fabricación · powered by Mercadobra</div>
      </div>
    </div>`
  if (RESEND_API_KEY && RESEND_FROM) {
    await sendRecommendationEmailViaResend({ email, subject, html })
    return { sent: true, channel: 'email-resend' }
  }
  const emailTransporter = getTransporter()
  if (!emailTransporter) return { sent: false, channel: 'email-mock', reason: 'email provider not configured' }
  await withTimeout(emailTransporter.sendMail({ from: SMTP_FROM, to: email, subject, html }), EMAIL_SEND_TIMEOUT_MS, 'invitation email send')
  return { sent: true, channel: 'email-smtp' }
}

async function sendPortalEmail({ email, subject, title, intro, actionUrl, actionLabel }) {
  const html=`<div style="margin:0;background:#ece8df;padding:28px 12px;font-family:Arial,sans-serif;color:#20201d"><div style="max-width:620px;margin:auto;background:#f8f5ee;border:1px solid #d6cec1"><div style="padding:28px 34px;background:#20201d;border-top:6px solid #b55c35;color:#fff"><div style="color:#d27b52;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase">ÓXIDA STUDIO · by Mercadobra</div><h1 style="margin:14px 0 0;font-size:30px">${escapeEmailHtml(title)}</h1></div><div style="padding:34px"><p style="margin:0 0 24px;color:#625f58;font-size:16px;line-height:1.7">${escapeEmailHtml(intro)}</p><a href="${escapeEmailHtml(actionUrl)}" style="display:inline-block;padding:14px 22px;background:#b55c35;color:#fff;text-decoration:none;font-size:13px;font-weight:800">${escapeEmailHtml(actionLabel)} →</a><p style="margin:22px 0 0;color:#817b72;font-size:12px">Podés responder y consultar todo el historial desde tu área privada.</p></div></div></div>`
  if(RESEND_API_KEY&&RESEND_FROM){await sendRecommendationEmailViaResend({email,subject,html,replyTo:LEADS_NOTIFICATION_EMAIL});return {sent:true,channel:'email-resend'}}
  const emailTransporter=getTransporter(); if(!emailTransporter)return {sent:false,channel:'email-mock',reason:'email provider not configured'}
  await withTimeout(emailTransporter.sendMail({from:SMTP_FROM,to:email,replyTo:LEADS_NOTIFICATION_EMAIL,subject,html}),EMAIL_SEND_TIMEOUT_MS,'portal email send'); return {sent:true,channel:'email-smtp'}
}

export function notifyCustomerQuoteActivity({ email, customerName, quote, kind='message' }) {
  return sendPortalEmail({email,subject:kind==='quote'?'Tu cotización está lista · Óxida by Mercadobra':'Tenés una nueva respuesta · Óxida by Mercadobra',title:kind==='quote'?'Tu cotización está lista':'Hay una nueva respuesta',intro:`Hola ${customerName||''}. ${kind==='quote'?`Preparamos la propuesta para “${quote.title}”.`:`Respondimos en la solicitud “${quote.title}”.`}`,actionUrl:`${FRONTEND_PUBLIC_URL}/cliente`,actionLabel:'VER COTIZACIÓN'})
}

export function notifyAdminCustomerReply({ customerName, quote }) {
  return sendPortalEmail({email:LEADS_NOTIFICATION_EMAIL,subject:`Nueva respuesta de ${customerName||'un cliente'} · ${quote.referenceNumber}`,title:'Un cliente respondió',intro:`${customerName||'Un cliente'} envió un mensaje en “${quote.title}”.`,actionUrl:`${FRONTEND_PUBLIC_URL}/admin/clientes/${quote.customerId}/cotizaciones/${quote.id}`,actionLabel:'ABRIR CONVERSACIÓN'})
}

async function sendRecommendationEmail(email, searchTerm, products) {
  if (!email) {
    return { sent: false, channel: 'email', reason: 'email missing' }
  }

  const items = formatRecommendationItems(products)
  const subject = `Mercadobra: opciones para "${searchTerm}"`
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
    `Mercadobra · opciones para "${searchTerm}"`,
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

export async function notifyOrderCreated(order, items = []) {
  if (!order?.buyerPhone) {
    return {
      sent: false,
      reason: 'buyer phone missing',
      channel: 'none',
    }
  }

  const message = formatOrderConfirmationMessage(order, items)
  const payload = {
    channel: 'whatsapp',
    to: order.buyerPhone,
    message,
    orderId: order.id,
    paymentMethod: order.paymentMethod,
    trackingToken: order.trackingToken,
  }

  try {
    const channel = await withTimeout(sendViaWhatsappProvider(payload), WHATSAPP_SEND_TIMEOUT_MS, 'order confirmation whatsapp send')
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
