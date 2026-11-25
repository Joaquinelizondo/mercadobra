/**
 * Utilidades para manejo y descarga de archivos y adjuntos de cotizaciones.
 */

/**
 * Retorna una URL optimizada para descarga de archivos o adjuntos.
 * Si el archivo está alojado en Cloudinary, inserta la bandera `fl_attachment`
 * para forzar la cabecera Content-Disposition: attachment del CDN, asegurando
 * que el navegador descargue el archivo al dispositivo en vez de abrirlo
 * embebido o fallar por restricciones de descarga cross-origin.
 *
 * @param {string} url - URL del archivo o Data URL base64.
 * @returns {string} URL formateada para descarga directa.
 */
export function getAttachmentDownloadUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed

  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    if (!trimmed.includes('/fl_attachment')) {
      return trimmed.replace('/upload/', '/upload/fl_attachment/')
    }
  }

  return trimmed
}
