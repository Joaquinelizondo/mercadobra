import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePublicQuoteToken } from './validators.js'
import { mapCustomerQuoteRow } from './repository.js'

test('parsePublicQuoteToken acepta tokens aleatorios hex/base64url', () => {
  assert.equal(parsePublicQuoteToken('a'.repeat(32)), 'a'.repeat(32))
  assert.equal(parsePublicQuoteToken('Ab_-9'.repeat(8)), 'Ab_-9'.repeat(8))
})

test('parsePublicQuoteToken rechaza ids, referencias y valores cortos o con símbolos', () => {
  for (const bad of ['1', '42', 'COT-MJ3K9X', 'ab', '', undefined, 'a'.repeat(200), '../../etc/passwd', 'abc def ghi jkl mno pqr', 'x'.repeat(16) + '%00']) {
    assert.throws(() => parsePublicQuoteToken(bad), (err) => err.statusCode === 404, String(bad))
  }
})

test('mapCustomerQuoteRow no deriva el token de la referencia (era predecible)', () => {
  const mapped = mapCustomerQuoteRow({ id: 1, reference_number: 'COT-MJ3K9X' })
  assert.equal(mapped.accessToken, null)
  const withToken = mapCustomerQuoteRow({ id: 1, reference_number: 'COT-MJ3K9X', access_token: 'f'.repeat(32) })
  assert.equal(withToken.accessToken, 'f'.repeat(32))
})
