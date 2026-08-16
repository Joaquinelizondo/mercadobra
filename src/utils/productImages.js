const MAX_IMAGE_DIMENSION = 1800
const WEBP_QUALITY = 0.82

function canvasToDataUrl(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo optimizar la imagen.'))
        return
      }

      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('No se pudo leer la imagen optimizada.'))
      reader.readAsDataURL(blob)
    }, 'image/webp', WEBP_QUALITY)
  })
}

export async function optimizeProductImage(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { alpha: true })
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return {
    url: await canvasToDataUrl(canvas),
    width,
    height,
    format: 'webp',
  }
}

function cloudinaryVariant(url, width) {
  const marker = '/image/upload/'
  if (!String(url || '').includes(marker)) return ''
  return url.replace(marker, `${marker}f_auto,q_auto,c_limit,w_${width}/`)
}

export function responsiveImageProps(image, sizes) {
  const url = String(image?.url || '')
  const widths = [360, 720, 1200, 1800]
  const variants = widths.map((width) => {
    const variant = cloudinaryVariant(url, width)
    return variant ? `${variant} ${width}w` : ''
  }).filter(Boolean)

  return variants.length ? { srcSet: variants.join(', '), sizes } : {}
}
