import test from 'node:test'
import assert from 'node:assert/strict'
import { isLargeBodyRoute } from './security.js'

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
