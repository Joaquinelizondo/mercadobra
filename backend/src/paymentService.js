const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ''

function assertMercadoPagoConfigured() {
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('Mercado Pago no está configurado. Definí MERCADOPAGO_ACCESS_TOKEN en backend/.env.')
  }
}

async function mercadoPagoRequest(path, options = {}) {
  assertMercadoPagoConfigured()

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const contentType = response.headers.get('content-type') || ''
  const hasJson = contentType.includes('application/json')
  const body = hasJson ? await response.json() : await response.text()

  if (!response.ok) {
    const detail = hasJson ? JSON.stringify(body) : String(body)
    throw new Error(`Mercado Pago error (${response.status}): ${detail.slice(0, 260)}`)
  }

  return body
}

export async function createMercadoPagoPreference(payload) {
  return mercadoPagoRequest('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getMercadoPagoPayment(paymentId) {
  return mercadoPagoRequest(`/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    method: 'GET',
  })
}

export function mapMercadoPagoStatus(status) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'approved') return 'approved'
  if (normalized === 'authorized') return 'authorized'
  if (normalized === 'in_process') return 'pending'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'rejected') return 'rejected'
  if (normalized === 'cancelled') return 'cancelled'
  if (normalized === 'refunded') return 'refunded'
  if (normalized === 'charged_back') return 'charged_back'

  return 'pending'
}

export function isMercadoPagoConfigured() {
  return Boolean(MERCADOPAGO_ACCESS_TOKEN)
}
