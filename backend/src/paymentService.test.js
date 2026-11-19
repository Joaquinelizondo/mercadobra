import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifyMercadoPagoSignature } from './paymentService.js'

const secret = 'test-secret'
const now = Date.now()

function sign({ id, requestId, ts, key = secret }) {
  const manifest = `id:${String(id).toLowerCase()};request-id:${requestId};ts:${ts};`
  return createHmac('sha256', key).update(manifest).digest('hex')
}

test('verifyMercadoPagoSignature acepta una firma válida', () => {
  const ts = String(now)
  const v1 = sign({ id: '123456', requestId: 'req-1', ts })
  const ok = verifyMercadoPagoSignature({
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1' },
    dataId: '123456',
    secret,
    now,
  })
  assert.equal(ok, true)
})

test('verifyMercadoPagoSignature rechaza firma con otra clave, otro id o sin header', () => {
  const ts = String(now)
  const bad = sign({ id: '123456', requestId: 'req-1', ts, key: 'otra-clave' })
  const headers = { 'x-signature': `ts=${ts},v1=${bad}`, 'x-request-id': 'req-1' }
  assert.equal(verifyMercadoPagoSignature({ headers, dataId: '123456', secret, now }), false)

  const good = sign({ id: '123456', requestId: 'req-1', ts })
  const goodHeaders = { 'x-signature': `ts=${ts},v1=${good}`, 'x-request-id': 'req-1' }
  assert.equal(verifyMercadoPagoSignature({ headers: goodHeaders, dataId: '999', secret, now }), false)
  assert.equal(verifyMercadoPagoSignature({ headers: {}, dataId: '123456', secret, now }), false)
  assert.equal(verifyMercadoPagoSignature({ headers: goodHeaders, dataId: '123456', secret: '', now }), false)
})

test('verifyMercadoPagoSignature rechaza timestamps viejos (replay)', () => {
  const ts = String(now - 60 * 60 * 1000)
  const v1 = sign({ id: '1', requestId: 'r', ts })
  const ok = verifyMercadoPagoSignature({
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'r' },
    dataId: '1',
    secret,
    now,
  })
  assert.equal(ok, false)
})
