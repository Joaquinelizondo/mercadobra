import 'dotenv/config'
import { getPool, isPostgresEnabled } from './db.js'

async function run() {
  if (!isPostgresEnabled()) {
    throw new Error('DATABASE_URL no configurada')
  }

  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = String(process.env.ADMIN_PASSWORD || '')
  const company = String(process.env.ADMIN_COMPANY || 'Mercadobra').trim()

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL no configurado o inválido')
  }

  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres')
  }

  const pool = getPool()
  try {
    await pool.query(
      `INSERT INTO users (email, password, role, provider_id, company)
       VALUES ($1, $2, 'admin', NULL, $3)
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role = 'admin',
           provider_id = NULL,
           company = EXCLUDED.company`,
      [email, password, company]
    )
    console.log('Usuario administrador verificado.')
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
