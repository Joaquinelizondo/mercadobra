import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || ''

let pool = null

export function isPostgresEnabled() {
  return Boolean(DATABASE_URL)
}

export function getPool() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL no configurada')
  }

  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL })
  }

  return pool
}
