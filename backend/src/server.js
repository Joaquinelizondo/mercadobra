import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getRepository } from './repository.js'
import { generateChatReply } from './chatService.js'
import { notifyOrderStatusChanged } from './notificationService.js'

const app = express()
const PORT = Number(process.env.PORT || 4000)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:4173'

const allowedOrigins = FRONTEND_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }

      const isLocalhost = /^https?:\/\/localhost(?::\d+)?$/.test(origin)
      if (isLocalhost || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin no permitido por CORS'))
    },
  })
)
app.use(express.json())

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token.startsWith('mock-token-')) {
    return res.status(401).json({ message: 'Token inválido o ausente' })
  }

  const userId = Number(token.replace('mock-token-', ''))
  const repo = await getRepository()
  const user = await repo.findUserById(userId)

  if (!user) {
    return res.status(401).json({ message: 'Sesión inválida' })
  }

  req.authUser = user
  next()
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mercadobra-backend' })
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const repo = await getRepository()
  const user = await repo.findUserByCredentials(email, password)

  if (!user) {
    return res.status(401).json({ message: 'Credenciales inválidas' })
  }

  const token = `mock-token-${user.id}`

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      providerId: user.providerId,
      company: user.company
    }
  })
})

app.get('/providers', async (_req, res) => {
  const repo = await getRepository()
  res.json(await repo.getProviders())
})

app.get('/providers/:id/products', async (req, res) => {
  const providerId = Number(req.params.id)
  const repo = await getRepository()
  res.json(await repo.getProviderProducts(providerId))
})

app.get('/products', async (req, res) => {
  const repo = await getRepository()
  const { q, category, providerId, stock } = req.query
  res.json(await repo.getProducts({ q, category, providerId, stock }))
})

app.get('/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  const repo = await getRepository()
  const product = await repo.getProductById(id)

  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' })
  }

  return res.json(product)
})

app.post('/products', authMiddleware, async (req, res) => {
  const body = req.body || {}
  const required = ['name', 'description', 'category', 'company', 'providerId', 'price', 'unit']
  const missing = required.filter((field) => body[field] === undefined || body[field] === '')

  if (missing.length) {
    return res.status(400).json({ message: `Faltan campos: ${missing.join(', ')}` })
  }

  if (Number(body.providerId) !== Number(req.authUser.providerId)) {
    return res.status(403).json({ message: 'No podés publicar productos para otro proveedor' })
  }

  const repo = await getRepository()
  const created = await repo.createProduct({
    name: body.name,
    description: body.description,
    category: body.category,
    company: body.company,
    providerId: Number(body.providerId),
    price: Number(body.price),
    unit: body.unit,
    stock: Number(body.stock ?? 0),
    color: body.color || '#ea580c'
  })

  return res.status(201).json(created)
})

app.patch('/products/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  const updates = req.body || {}
  const repo = await getRepository()
  const existing = await repo.getProductById(id)

  if (!existing) {
    return res.status(404).json({ message: 'Producto no encontrado' })
  }

  if (Number(existing.providerId) !== Number(req.authUser.providerId)) {
    return res.status(403).json({ message: 'No podés editar productos de otro proveedor' })
  }

  const updated = await repo.updateProduct(id, updates)
  return res.json(updated)
})

app.delete('/products/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  const repo = await getRepository()
  const existing = await repo.getProductById(id)

  if (!existing) {
    return res.status(404).json({ message: 'Producto no encontrado' })
  }

  if (Number(existing.providerId) !== Number(req.authUser.providerId)) {
    return res.status(403).json({ message: 'No podés eliminar productos de otro proveedor' })
  }

  await repo.deleteProduct(id)

  return res.status(204).send()
})

app.post('/orders', async (req, res) => {
  const { items = [], buyerName = '', buyerPhone = '', paymentMethod = '' } = req.body || {}

  if (!items.length) {
    return res.status(400).json({ message: 'La orden requiere al menos un producto' })
  }

  const normalizedItems = items.map((item) => ({
    productId: Number(item.productId || item.id),
    quantity: Number(item.quantity || 1),
  }))

  if (normalizedItems.some((item) => item.quantity <= 0)) {
    return res.status(400).json({ message: 'Hay cantidades inválidas en la orden' })
  }

  try {
    const repo = await getRepository()
    const order = await repo.createOrder({ items: normalizedItems, buyerName, buyerPhone, paymentMethod })
    return res.status(201).json(order)
  } catch (error) {
    return res.status(400).json({ message: error.message || 'No se pudo crear la orden' })
  }
})

app.post('/leads', async (req, res) => {
  const body = req.body || {}
  const payload = {
    name: String(body.name || '').trim(),
    company: String(body.company || '').trim(),
    email: String(body.email || '').trim(),
    phone: String(body.phone || '').trim(),
    zone: String(body.zone || '').trim(),
    plan: String(body.plan || '').trim().toLowerCase(),
    message: String(body.message || '').trim(),
  }

  const required = ['name', 'company', 'email', 'phone', 'plan']
  const missing = required.filter((field) => !payload[field])

  if (missing.length) {
    return res.status(400).json({ message: `Faltan campos: ${missing.join(', ')}` })
  }

  if (!['pro', 'premium'].includes(payload.plan)) {
    return res.status(400).json({ message: 'Plan inválido. Elegí Pro o Premium.' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(payload.email)) {
    return res.status(400).json({ message: 'Email inválido' })
  }

  const repo = await getRepository()
  const created = await repo.createLead(payload)
  return res.status(201).json(created)
})

app.get('/orders/track/:trackingToken', async (req, res) => {
  const trackingToken = String(req.params.trackingToken || '').trim()
  const buyerPhone = String(req.query.phone || '').trim()

  if (!trackingToken) {
    return res.status(400).json({ message: 'Tracking token inválido' })
  }

  if (!buyerPhone) {
    return res.status(400).json({ message: 'Ingresá el teléfono asociado a la compra' })
  }

  const repo = await getRepository()
  const order = await repo.getOrderByTracking(trackingToken, buyerPhone)

  if (!order) {
    return res.status(404).json({ message: 'No encontramos una orden con esos datos' })
  }

  return res.json(order)
})

app.patch('/orders/:id/status', authMiddleware, async (req, res) => {
  const orderId = Number(req.params.id)
  const nextStatus = String(req.body?.status || '').trim().toLowerCase()
  const validStatuses = new Set(['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])

  if (!validStatuses.has(nextStatus)) {
    return res.status(400).json({ message: 'Estado de orden inválido' })
  }

  const repo = await getRepository()
  const [orders, providerProducts] = await Promise.all([
    repo.getOrders(),
    repo.getProviderProducts(req.authUser.providerId),
  ])

  const order = orders.find((current) => Number(current.id) === orderId)
  if (!order) {
    return res.status(404).json({ message: 'Orden no encontrada' })
  }

  const providerProductIds = new Set(providerProducts.map((product) => Number(product.id)))
  const canManageOrder = (order.items || []).some((item) => providerProductIds.has(Number(item.productId)))

  if (!canManageOrder) {
    return res.status(403).json({ message: 'No podés cambiar el estado de esta orden' })
  }

  const updated = await repo.updateOrderStatus(orderId, nextStatus)
  if (!updated) {
    return res.status(404).json({ message: 'Orden no encontrada' })
  }

  const notification = await notifyOrderStatusChanged(updated)
  const notificationLog = await repo.recordOrderNotification(orderId, notification)

  return res.json({
    ...updated,
    notification,
    notificationLog,
  })
})

app.get('/orders/:id/notifications', authMiddleware, async (req, res) => {
  const orderId = Number(req.params.id)
  const repo = await getRepository()

  const [orders, providerProducts] = await Promise.all([
    repo.getOrders(),
    repo.getProviderProducts(req.authUser.providerId),
  ])

  const order = orders.find((current) => Number(current.id) === orderId)
  if (!order) {
    return res.status(404).json({ message: 'Orden no encontrada' })
  }

  const providerProductIds = new Set(providerProducts.map((product) => Number(product.id)))
  const canManageOrder = (order.items || []).some((item) => providerProductIds.has(Number(item.productId)))

  if (!canManageOrder) {
    return res.status(403).json({ message: 'No podés ver notificaciones de esta orden' })
  }

  const logs = await repo.getOrderNotificationLogs(orderId)
  return res.json(logs)
})

app.get('/orders', authMiddleware, async (req, res) => {
  const repo = await getRepository()
  const orders = await repo.getOrders()
  res.json(orders)
})

app.post('/chat', async (req, res) => {
  const { message = '', history = [] } = req.body || {}
  const normalizedMessage = String(message).trim()

  if (!normalizedMessage) {
    return res.status(400).json({ message: 'El mensaje no puede estar vacío' })
  }

  if (normalizedMessage.length > 1200) {
    return res.status(400).json({ message: 'El mensaje es demasiado largo (máx 1200 caracteres)' })
  }

  try {
    const response = await generateChatReply({ message: normalizedMessage, history })
    return res.json(response)
  } catch (error) {
    return res.status(500).json({ message: error.message || 'No se pudo generar la respuesta del chat' })
  }
})

app.listen(PORT, () => {
  console.log(`MercadObra backend listening on http://localhost:${PORT}`)
})
