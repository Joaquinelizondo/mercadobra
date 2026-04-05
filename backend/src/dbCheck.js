import 'dotenv/config'
import { getPool, isPostgresEnabled } from './db.js'

const REQUIRED_TABLES = [
  'providers',
  'users',
  'products',
  'orders',
  'order_items',
  'notification_logs',
  'leads',
  'migrations',
]

async function run() {
  if (!isPostgresEnabled()) {
    console.error('DATABASE_URL no configurada en backend/.env')
    process.exit(1)
  }

  const pool = getPool()

  try {
    const { rows } = await pool.query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'`
    )

    const found = new Set(rows.map((row) => row.tablename))
    const missing = REQUIRED_TABLES.filter((name) => !found.has(name))

    if (missing.length) {
      console.error(`Faltan tablas: ${missing.join(', ')}`)
      process.exit(1)
    }

    console.log(`DB OK. Tablas verificadas: ${REQUIRED_TABLES.join(', ')}`)
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
