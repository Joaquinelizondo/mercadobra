import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, createSessionCredentials, hashSessionToken } from './authService.js'

test('hashPassword genera hashes scrypt con prefijo, sal y digest', () => {
  const hash = hashPassword('miPasswordSeguro123')
  assert.ok(hash.startsWith('scrypt$'), 'Debe tener prefijo scrypt$')
  const parts = hash.split('$')
  assert.equal(parts.length, 3, 'Debe componerse de prefijo, sal y digest')
  assert.equal(parts[1].length, 32, 'La sal debe ser hex de 16 bytes (32 chars)')
  assert.equal(parts[2].length, 128, 'El hash scrypt con digest de 64 bytes debe ser hex de 128 chars')
})

test('hashPassword produce diferentes sales para la misma contraseña', () => {
  const hash1 = hashPassword('mismaContraseña')
  const hash2 = hashPassword('mismaContraseña')
  assert.notEqual(hash1, hash2, 'Dos hashes de la misma contraseña deben diferir por sal aleatoria')
})

test('verifyPassword valida correctamente contraseñas válidas e inválidas con scrypt', () => {
  const hash = hashPassword('secretoValido')
  const okResult = verifyPassword('secretoValido', hash)
  assert.equal(okResult.valid, true)
  assert.equal(okResult.needsUpgrade, false)

  const badResult = verifyPassword('secretoErroneo', hash)
  assert.equal(badResult.valid, false)
  assert.equal(badResult.needsUpgrade, false)
})

test('S5: verifyPassword rechaza taxativamente contraseñas en texto plano heredadas', () => {
  // Simular un usuario antiguo con contraseña en texto plano en la BD
  const plaintextStored = 'admin123'
  const result = verifyPassword('admin123', plaintextStored)
  assert.equal(result.valid, false, 'No debe permitir login con contraseña en texto plano sin hash scrypt')
  assert.equal(result.needsUpgrade, false)

  // Probando con otros valores heredados o prefijos falsos
  assert.equal(verifyPassword('123456', '123456').valid, false)
  assert.equal(verifyPassword('test', 'md5$1234').valid, false)
  assert.equal(verifyPassword('test', 'sha256$1234').valid, false)
  assert.equal(verifyPassword('', '').valid, false)
  assert.equal(verifyPassword('test', null).valid, false)
  assert.equal(verifyPassword('test', undefined).valid, false)
  assert.equal(verifyPassword('test', 'scrypt$incompleto').valid, false)
})

test('createSessionCredentials genera tokens aleatorios y hash coherente', () => {
  const session = createSessionCredentials()
  assert.ok(session.token && session.token.length >= 32)
  assert.equal(session.tokenHash, hashSessionToken(session.token))
  assert.ok(new Date(session.expiresAt).getTime() > Date.now())
})
