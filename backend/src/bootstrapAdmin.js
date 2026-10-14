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

    // 3. Garantizar proveedor: proveedor@mercadobra.com / 123456
    await pool.query(
      `INSERT INTO providers (id, name, zone, phone, rating, reviews)
       VALUES (1, 'Corralón La Obra', 'Montevideo', '+598 99 123 456', 4.8, 156)
       ON CONFLICT (id) DO NOTHING`
    )
    await pool.query(
      `INSERT INTO users (email, password, role, provider_id, company)
       VALUES ($1, $2, 'provider', 1, $3)
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role = 'provider',
           provider_id = 1,
           company = EXCLUDED.company`,
      ['proveedor@mercadobra.com', hashPassword('123456'), 'Corralón La Obra']
    )
    console.log('Usuario proveedor@mercadobra.com asegurado con éxito.')

    // 4. Garantizar cliente OxI Clásico: cliente@mercadobra.com / cliente123
    const resClassic = await pool.query(
      `INSERT INTO users (email, password, role, provider_id, company)
       VALUES ($1, $2, 'customer', NULL, $3)
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role = 'customer',
           company = EXCLUDED.company
       RETURNING id`,
      ['cliente@mercadobra.com', hashPassword('cliente123'), 'Constructora Horizonte']
    )
    const classicId = resClassic.rows[0].id
    await pool.query(
      `INSERT INTO customer_profiles (user_id, phone, company_name, address, city, department, status, tier)
       VALUES ($1, '+598 99 222 333', 'Constructora Horizonte', 'Av. Italia 1234', 'Montevideo', 'Montevideo', 'active', 'classic')
       ON CONFLICT (user_id) DO UPDATE
       SET tier = 'classic', status = 'active'`,
      [classicId]
    )
    console.log('Usuario cliente@mercadobra.com (OxI Clásico) asegurado con éxito.')

    // 5. Garantizar cliente OxI Pro: pro@mercadobra.com / pro123
    const resPro = await pool.query(
      `INSERT INTO users (email, password, role, provider_id, company)
       VALUES ($1, $2, 'customer', NULL, $3)
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role = 'customer',
           company = EXCLUDED.company
       RETURNING id`,
      ['pro@mercadobra.com', hashPassword('pro123'), 'Estudio Arq & Proyectos']
    )
    const proId = resPro.rows[0].id
    await pool.query(
      `INSERT INTO customer_profiles (user_id, phone, company_name, address, city, department, status, tier)
       VALUES ($1, '+598 99 444 555', 'Estudio Arq & Proyectos', 'Bvar. Artigas 567', 'Montevideo', 'Montevideo', 'active', 'pro')
       ON CONFLICT (user_id) DO UPDATE
       SET tier = 'pro', status = 'active'`,
      [proId]
    )
    console.log('Usuario pro@mercadobra.com (OxI Pro) asegurado con éxito.')
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error('Error en bootstrapAdmin:', error.message)
  process.exit(1)
})
