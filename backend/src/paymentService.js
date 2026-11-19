import { createHmac, timingSafeEqual } from 'node:crypto'

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

export function isMercadoPagoSandbox() {
  return MERCADOPAGO_ACCESS_TOKEN.startsWith('TEST-')
}

export function isMercadoPagoWebhookSecretConfigured() {
  return Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET)
}

/**
 * Valida la firma `x-signature` de las notificaciones de Mercado Pago.
 * Manifest firmado: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (HMAC-SHA256 hex).
 * Doc: https://www.mercadopago.com.uy/developers/es/docs/your-integrations/notifications/webhooks
 *
 * @param {Object} params
 * @param {Object} params.headers - Headers de la request (claves en minúscula)
 * @param {string|number} params.dataId - ID del pago recibido en la notificación
 * @param {string} [params.secret] - Clave secreta (por defecto MERCADOPAGO_WEBHOOK_SECRET)
 * @param {number} [params.toleranceMs] - Antigüedad máxima aceptada del timestamp (default 10 min)
 * @param {number} [params.now] - Para tests
 * @returns {boolean}
 */
export function verifyMercadoPagoSignature({
  headers = {},
  dataId,
  secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
  toleranceMs = 10 * 60 * 1000,
  now = Date.now(),
}) {
  if (!secret) return false
  const signatureHeader = String(headers['x-signature'] || '')
  const requestId = String(headers['x-request-id'] || '')
  if (!signatureHeader || !dataId) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((chunk) => {
      const [key, ...rest] = chunk.trim().split('=')
      return [key, rest.join('=')]
    }),
  )
  const ts = parts.ts
  const received = parts.v1
  if (!ts || !received) return false

  const tsMs = Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > toleranceMs) return false

  const id = /^[a-z0-9]+$/i.test(String(dataId)) ? String(dataId).toLowerCase() : String(dataId)
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(received, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
