import { config } from './config.js'

const DATA_IMAGE_PATTERN = /^data:(image\/(?:avif|jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

export function isCloudinaryConfigured() {
  return Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret)
}

export function validateProductImageDataUrl(dataUrl) {
  const normalized = String(dataUrl || '')
  const match = normalized.match(DATA_IMAGE_PATTERN)
  if (!match) throw new Error('La imagen debe ser JPG, PNG, WEBP o AVIF.')

  const bytes = Buffer.from(match[2], 'base64').byteLength
  if (!bytes || bytes > MAX_IMAGE_BYTES) throw new Error('La imagen optimizada no puede superar los 3 MB.')
  return normalized
}

export async function uploadProductImage(dataUrl, { alt = '' } = {}) {
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary no está configurado en el servidor.')

  const form = new FormData()
  form.set('file', validateProductImageDataUrl(dataUrl))
  form.set('folder', config.cloudinaryFolder)
  if (alt) form.set('context', `alt=${String(alt).replace(/[|=]/g, ' ').slice(0, 180)}`)

  const credentials = Buffer.from(`${config.cloudinaryApiKey}:${config.cloudinaryApiSecret}`).toString('base64')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudinaryCloudName)}/image/upload`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}` },
        body: form,
        signal: controller.signal,
      }
    )
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload?.error?.message || `Cloudinary rechazó la imagen (${response.status}).`)
    }

    return {
      url: payload.secure_url,
      publicId: payload.public_id,
      width: Number(payload.width) || null,
      height: Number(payload.height) || null,
      bytes: Number(payload.bytes) || null,
      format: payload.format || '',
      storage: 'cloudinary',
      alt: String(alt || ''),
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Cloudinary tardó demasiado en responder.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
