import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool, isPostgresEnabled } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.join(__dirname, 'migrations')

async function run() {
  if (!isPostgresEnabled()) {
    console.log('DATABASE_URL no configurada. Se omiten migraciones PostgreSQL.')
    return
  }

  const pool = getPool()
  await pool.query('CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')

  const applied = await pool.query('SELECT name FROM migrations ORDER BY name ASC')
  const appliedNames = new Set(applied.rows.map((row) => row.name))
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort()

  for (const file of files) {
    if (appliedNames.has(file)) continue
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    await pool.query('BEGIN')
    try {
      await pool.query(sql)
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file])
      await pool.query('COMMIT')
      console.log(`Applied migration: ${file}`)
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }

  await pool.end()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
