import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool, isPostgresEnabled } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const seedPath = path.join(__dirname, 'data', 'seed.json')

async function setSequence(pool, tableName) {
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE((SELECT MAX(id) FROM ${tableName}), 1), true)`
  )
}

async function run() {
  if (!isPostgresEnabled()) {
    console.log('DATABASE_URL no configurada. Se omite seed PostgreSQL.')
    return
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const provider of seed.providers || []) {
      await client.query(
        `INSERT INTO providers (id, name, zone, phone, rating, reviews)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             zone = EXCLUDED.zone,
             phone = EXCLUDED.phone,
             rating = EXCLUDED.rating,
             reviews = EXCLUDED.reviews`,
        [provider.id, provider.name, provider.zone, provider.phone, provider.rating, provider.reviews]
      )
    }

    for (const user of seed.users || []) {
      await client.query(
        `INSERT INTO users (id, email, password, role, provider_id, company)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email,
             password = EXCLUDED.password,
             role = EXCLUDED.role,
             provider_id = EXCLUDED.provider_id,
             company = EXCLUDED.company`,
        [user.id, user.email, user.password, user.role, user.providerId, user.company]
      )
    }

    for (const product of seed.products || []) {
      await client.query(
        `INSERT INTO products (id, name, description, category, company, provider_id, price, unit, stock, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             category = EXCLUDED.category,
             company = EXCLUDED.company,
             provider_id = EXCLUDED.provider_id,
             price = EXCLUDED.price,
             unit = EXCLUDED.unit,
             stock = EXCLUDED.stock,
             color = EXCLUDED.color`,
        [
          product.id,
          product.name,
          product.description,
          product.category,
          product.company,
          product.providerId,
          product.price,
          product.unit,
          product.stock,
          product.color,
        ]
      )
    }

    await setSequence(client, 'providers')
    await setSequence(client, 'users')
    await setSequence(client, 'products')
    await setSequence(client, 'orders')
    await setSequence(client, 'order_items')
    await setSequence(client, 'notification_logs')

    await client.query('COMMIT')
    console.log('Seed PostgreSQL aplicado correctamente.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
