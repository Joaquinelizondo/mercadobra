import 'dotenv/config'
import { getPool, isPostgresEnabled } from './db.js'
import { isCloudinaryConfigured, uploadProductImage } from './cloudinaryService.js'

if (!isPostgresEnabled()) throw new Error('DATABASE_URL no configurada')
if (!isCloudinaryConfigured()) throw new Error('Cloudinary no está configurado')

const pool = getPool()

try {
  const { rows } = await pool.query(
    `SELECT id, name, images
     FROM products
     WHERE images IS NOT NULL AND jsonb_array_length(images) > 0
     ORDER BY id ASC`
  )

  let migratedImages = 0
  for (const product of rows) {
    let changed = false
    const images = []

    for (const image of product.images) {
      if (!String(image?.url || '').startsWith('data:image/')) {
        images.push(image)
        continue
      }

      const uploaded = await uploadProductImage(image.url, { alt: image.alt || product.name })
      images.push(uploaded)
      migratedImages += 1
      changed = true
    }

    if (changed) {
      await pool.query('UPDATE products SET images = $1 WHERE id = $2', [JSON.stringify(images), product.id])
      console.log(`Producto ${product.id}: imágenes migradas`)
    }
  }

  console.log(`Migración terminada: ${migratedImages} imágenes movidas a Cloudinary.`)
} finally {
  await pool.end()
}
