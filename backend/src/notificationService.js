const FRONTEND_PUBLIC_URL = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173'
const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL || ''

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  preparing: 'Preparando',
  shipped: 'Despachada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

function formatMessage(order) {
  const statusLabel = STATUS_LABELS[order.status] || order.status || 'Actualizada'
  const trackingUrl = order.trackingToken
    ? `${FRONTEND_PUBLIC_URL}/seguimiento/${order.trackingToken}?phone=${encodeURIComponent(order.buyerPhone || '')}`
    : ''

  const lines = [
    `MercadObra · Orden #${order.id}`,
    `Nuevo estado: ${statusLabel}`,
  ]

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

  if (!WHATSAPP_WEBHOOK_URL) {
    console.log('[notification:mock]', payload)
    return {
      sent: true,
      channel: 'mock-console',
    }
  }

  try {
    await sendViaWebhook(payload)
    return {
      sent: true,
      channel: 'whatsapp-webhook',
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
