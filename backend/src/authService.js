import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const PASSWORD_PREFIX = 'scrypt'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `${PASSWORD_PREFIX}$${salt}$${hash}`
}

export function verifyPassword(password, storedPassword) {
  const stored = String(storedPassword || '')
  if (!stored.startsWith(`${PASSWORD_PREFIX}$`)) {
    return { valid: timingSafeStringEqual(String(password), stored), needsUpgrade: true }
  }

  const [, salt, expectedHex] = stored.split('$')
  if (!salt || !expectedHex) return { valid: false, needsUpgrade: false }

  const actual = scryptSync(String(password), salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return {
    valid: actual.length === expected.length && timingSafeEqual(actual, expected),
    needsUpgrade: false,
  }
}

function timingSafeStringEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function createSessionCredentials() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
}

export function hashSessionToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex')
}
