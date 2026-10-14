import 'dotenv/config'
import { getPool, isPostgresEnabled } from './db.js'
import { hashPassword } from './authService.js'

async function run() {
  if (!isPostgresEnabled()) {
    console.log('DATABASE_URL no configurada. Se omite bootstrap admin.')
    return
  }

  const pool = getPool()
  try {
    // 1. Garantizar admin principal: admin@mercadobra.com / admin123
    await pool.query(
      `INSERT INTO users (email, password, role, provider_id, company)
       VALUES ($1, $2, 'admin', NULL, $3)
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role = 'admin',
           provider_id = NULL,
           company = EXCLUDED.company`,
      ['admin@mercadobra.com', hashPassword('admin123'), 'Mercadobra Admin']
    )
    console.log('Usuario admin@mercadobra.com asegurado con éxito.')

    // 2. Garantizar contacto@mercadobra.com (también con admin123 o ADMIN_PASSWORD si está definido)
    const envPassword = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 6
      ? process.env.ADMIN_PASSWORD
      : 'admin123'

    await pool.query(
      `INSERT INTO users (email, password, role, provider_id, company)
       VALUES ($1, $2, 'admin', NULL, $3)
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role = 'admin',
           provider_id = NULL,
           company = EXCLUDED.company`,
      ['contacto@mercadobra.com', hashPassword(envPassword), 'Mercadobra Oficial']
    )
    console.log('Usuario contacto@mercadobra.com asegurado con éxito.')
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error('Error en bootstrapAdmin:', error.message)
  process.exit(1)
})
