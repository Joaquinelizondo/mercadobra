import test from 'node:test'
import assert from 'node:assert/strict'
import { isLargeBodyRoute, LARGE_JSON_LIMIT } from './security.js'
import { validateAttachments } from './validators.js'

test('LARGE_JSON_LIMIT permite videos de obra de hasta 25-35mb', () => {
  assert.equal(LARGE_JSON_LIMIT, '35mb')
})

test('validateAttachments admite videos cortos, planos técnicos, imágenes y memorias', () => {
  const input = [
    { name: 'recorrido-obra.mp4', type: 'video/mp4', category: 'video', data: 'data:video/mp4;base64,AAAA' },
    { name: 'acceso-porton.mov', type: 'video/quicktime', category: 'video', data: 'data:video/quicktime;base64,BBBB' },
    { name: 'plano-barandas.dwg', type: 'application/octet-stream', category: 'plano', data: 'data:application/octet-stream;base64,CCCC' },
    { name: 'corte-escalera.pdf', type: 'application/pdf', category: 'plano', data: 'data:application/pdf;base64,DDDD' },
    { name: 'foto-sitio.jpg', type: 'image/jpeg', category: 'foto', data: 'data:image/jpeg;base64,EEEE' },
  ]
  const result = validateAttachments(input)
  assert.equal(result.length, 5)
  assert.equal(result[0].category, 'video')
  assert.equal(result[0].name, 'recorrido-obra.mp4')
  assert.equal(result[1].name, 'acceso-porton.mov')
})

test('validateAttachments rechaza formatos ejecutables o no permitidos', () => {
  assert.throws(
    () => validateAttachments([{ name: 'malware.exe', type: 'application/x-msdownload', data: 'data:...' }]),
    /Formato de archivo no soportado/
  )
  assert.throws(
    () => validateAttachments([{ name: 'script.sh', type: 'text/x-shellscript', data: 'data:...' }]),
    /Formato de archivo no soportado/
  )
})

test('validateAttachments rechaza archivos base64 que superen el límite de 25 MB', () => {
  const hugeData = 'data:video/mp4;base64,' + 'x'.repeat(35000001)
  assert.throws(
    () => validateAttachments([{ name: 'video-pesado.mp4', type: 'video/mp4', data: hugeData }]),
    /Cada archivo debe pesar menos de 25 MB/
  )
})

test('isLargeBodyRoute permite body grande solo en rutas con archivos', () => {
  const large = [
    '/customer/quotes',
    '/customer/quotes/12/attachments',
    '/admin/quotes/3/attachments',
    '/public/quotes/abc123/attachments',
    '/public/quotes/abc123/messages',
    '/customer/quotes/9/deposit/transfer',
    '/product-images',
    '/products',
    '/products/15',
    '/oxipro/report/pdf',
    '/customer/b2b-projects/7/oxipro/state',
    '/api/products/15',
    '/api/customer/quotes/1/attachments',
  ]
  for (const path of large) assert.equal(isLargeBodyRoute(path), true, path)
})

test('isLargeBodyRoute mantiene el límite chico en el resto de la API', () => {
  const small = [
    '/auth/login',
    '/auth/customer/register',
    '/leads',
    '/orders',
    '/chat',
    '/search-contacts',
    '/custom-requests',
    '/payments/mercadopago/webhook',
    '/public/quotes/abc123/status',
    '/admin/quotes/3/status',
    '/api/auth/login',
  ]
  for (const path of small) assert.equal(isLargeBodyRoute(path), false, path)
})
