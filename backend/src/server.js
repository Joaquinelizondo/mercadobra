import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getRepository } from './repository.js'
import { isPostgresEnabled } from './db.js'
import { generateChatReply } from './chatService.js'
import { notifyLeadCreated, notifyOrderCreated, notifyOrderStatusChanged, notifySearchRecommendations } from './notificationService.js'
import {
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  isMercadoPagoConfigured,
  mapMercadoPagoStatus,
} from './paymentService.js'
import { config, validateEnvVars } from './config.js'
import {
  setupSecurityMiddleware,
  createCorsMiddleware,
  globalErrorHandler,
  validateJsonContentType,
  requestLogger,
} from './security.js'
import {
  requireField,
  validateEmail,
  validatePassword,
  validateNumber,
  validateQuantity,
  validatePhone,
  validateEnum,
  validateArray,
  validateRequiredFields,
  validateStringLength,
  validateOrderStatus,
  validatePaymentMethod,
  asyncHandler,
} from './validators.js'
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  ValidationError,
} from './errors.js'

// Validar env vars antes de iniciar la app
validateEnvVars()

const app = express()
const PORT = config.port
const FRONTEND_ORIGIN = config.frontendOrigin
const FRONTEND_PUBLIC_URL = config.frontendPublicUrl
const BACKEND_PUBLIC_URL = config.backendPublicUrl
const ALLOWED_PAYMENT_METHODS = new Set(['transferencia', 'mercadopago'])
const HAS_PUBLIC_HTTPS_FRONTEND = /^https:\/\//.test(FRONTEND_PUBLIC_URL)

const allowedOrigins = FRONTEND_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// ============================================================================
// SECURITY MIDDLEWARES (orden es importante)
// ============================================================================

// 1. Helmet - Headers de seguridad HTTP (debe ser primero)
setupSecurityMiddleware(app)

// 2. CORS
app.use(cors(createCorsMiddleware({ allowedOrigins, credentials: false })))

// 3. Body parser
app.use(express.json({ limit: '12mb' })) // Permite galerías de hasta cinco imágenes optimizadas

// 4. Validar Content-Type en mutaciones
app.use(validateJsonContentType)

// 5. Request logger (solo en desarrollo)
if (config.nodeEnv === 'development') {
  app.use(requestLogger)
}

// Compatibilidad: algunos entornos exponen el backend bajo /api/*.
app.use((req, _res, next) => {
  if (req.url === '/api' || req.url === '/api/') {
    req.url = '/'
    next()
    return
  }

  if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4)
  }

  next()
})

// ============================================================================
// ENDPOINTS
// ============================================================================

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token.startsWith('mock-token-')) {
    throw new AuthenticationError('Token inválido o ausente')
  }

  const userId = Number(token.replace('mock-token-', ''))
  const repo = await getRepository()
  const user = await repo.findUserById(userId)

  if (!user) {
    throw new AuthenticationError('Sesión inválida')
  }

  req.authUser = user
  next()
}


function requireRoleOrAdmin(role) {
  return function (req, _res, next) {
    if (req.authUser?.role !== role && req.authUser?.role !== 'admin') {
      throw new AuthorizationError(
        `Acceso solo para ${role === 'admin' ? 'administradores' : role + 'es'}`
      )
    }
    next()
  }
}

const providerOnly = requireRoleOrAdmin('provider')
const adminOnly = requireRoleOrAdmin('admin')

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mercadobra-backend',
    version: process.env.RENDER_GIT_COMMIT || process.env.APP_VERSION || 'local',
    storage: isPostgresEnabled() ? 'postgresql' : 'json',
    environment: config.nodeEnv,
  })
})

app.get('/payments/mercadopago/config', (_req, res) => {
  res.json({ enabled: isMercadoPagoConfigured() })
})

app.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}

  const normalizedEmail = validateEmail(email)
  validatePassword(password)

  const repo = await getRepository()
  const user = await repo.findUserByCredentials(normalizedEmail, password)

  if (!user) {
    throw new AuthenticationError('Credenciales inválidas')
  }

  if (user.role !== 'provider') {
    throw new AuthorizationError('Esta cuenta no pertenece a un proveedor')
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
}))

app.post('/auth/customer/register', asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body || {}

  const normalizedName = requireField(fullName, 'Nombre completo')
  const normalizedEmail = validateEmail(email)
  const normalizedPassword = validatePassword(password)

  const repo = await getRepository()
  const existing = await repo.findUserByEmail(normalizedEmail)

  if (existing) {
    throw new ConflictError('Ya existe una cuenta con ese correo')
  }

  const created = await repo.createUser({
    email: normalizedEmail,
    password: normalizedPassword,
    role: 'customer',
    providerId: null,
    company: normalizedName,
  })

  const token = `mock-token-${created.id}`

  return res.status(201).json({
    token,
    user: {
      id: created.id,
      email: created.email,
      role: created.role,
      providerId: created.providerId,
      company: created.company,
    },
  })
}))

app.post('/auth/customer/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}

  const normalizedEmail = validateEmail(email)
  validatePassword(password)

  const repo = await getRepository()
  const user = await repo.findUserByCredentials(normalizedEmail, password)

  if (!user || user.role !== 'customer') {
    throw new AuthenticationError('Credenciales inválidas')
  }

  const token = `mock-token-${user.id}`

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      providerId: user.providerId,
      company: user.company,
    },
  })
}))

app.post('/auth/admin/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}

  const normalizedEmail = validateEmail(email)
  validatePassword(password)

  const repo = await getRepository()
  const user = await repo.findUserByCredentials(normalizedEmail, password)

  if (!user || user.role !== 'admin') {
    throw new AuthenticationError('Credenciales de administrador inválidas')
  }

  const token = `mock-token-${user.id}`

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      company: user.company,
    },
  })
}))

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

app.get('/products/:id', asyncHandler(async (req, res) => {
  const id = validateNumber(req.params.id, 'Product ID', 1)
  const repo = await getRepository()
  const product = await repo.getProductById(id)

  if (!product) {
    throw new NotFoundError('Producto')
  }

  return res.json(product)
}))

app.post('/products', authMiddleware, (req, res, next) => {
  // Permitir tanto admin como provider
  if (req.authUser?.role !== 'provider' && req.authUser?.role !== 'admin') {
    return next(new AuthorizationError('Acceso solo para proveedores o administradores'))
  }
  next()
}, async (req, res) => {
  const body = req.body || {}
  const required = ['name', 'description', 'category', 'company', 'providerId', 'price', 'unit']
  const missing = required.filter((field) => body[field] === undefined || body[field] === '')

  if (missing.length) {
    return res.status(400).json({ message: `Faltan campos: ${missing.join(', ')}` })
  }

  // Si es provider, solo puede publicar productos para su propio providerId
  if (req.authUser.role === 'provider') {
    if (Number(body.providerId) !== Number(req.authUser.providerId)) {
      return res.status(403).json({ message: 'No podés publicar productos para otro proveedor' })
    }
  }
  // Si es admin, puede publicar productos con cualquier providerId (incluso null)

  const repo = await getRepository()
  const normalizedCurrency = validateEnum(body.currency ?? 'UYU', ['uyu', 'usd'], 'Moneda').toUpperCase()
  const created = await repo.createProduct({
    name: body.name,
    description: body.description,
    category: body.category,
    company: body.company,
    providerId: body.providerId === null || body.providerId === undefined || body.providerId === '' ? null : Number(body.providerId),
    price: Number(body.price),
    currency: normalizedCurrency,
    unit: body.unit,
    stock: Number(body.stock ?? 0),
    color: body.color || '#ea580c',
    images: Array.isArray(body.images) ? body.images.slice(0, 5) : [],
    sku: String(body.sku || '').trim(),
    status: validateEnum(body.status ?? 'published', ['draft', 'published', 'out_of_stock', 'archived'], 'Estado'),
    productType: validateEnum(body.productType ?? 'ready', ['ready', 'made_to_order', 'custom_quote'], 'Tipo de producto'),
    leadTimeDays: validateNumber(body.leadTimeDays ?? 3, 'Plazo', 0, 365),
    weightKg: body.weightKg === '' || body.weightKg == null ? null : validateNumber(body.weightKg, 'Peso', 0),
    dimensions: body.dimensions && typeof body.dimensions === 'object' ? body.dimensions : {},
    configurable: Boolean(body.configurable),
    variants: Array.isArray(body.variants) ? body.variants.slice(0, 30) : [],
  })

  return res.status(201).json({
    message: 'Producto guardado correctamente',
    product: created
  })
})

app.patch('/products/:id', authMiddleware, providerOnly, async (req, res) => {
  const id = Number(req.params.id)
  const updates = req.body || {}
  if (updates.currency !== undefined) {
    updates.currency = validateEnum(updates.currency, ['uyu', 'usd'], 'Moneda').toUpperCase()
  }
  if (updates.status !== undefined) {
    updates.status = validateEnum(updates.status, ['draft', 'published', 'out_of_stock', 'archived'], 'Estado')
  }
  if (updates.productType !== undefined) {
    updates.productType = validateEnum(updates.productType, ['ready', 'made_to_order', 'custom_quote'], 'Tipo de producto')
  }
  const repo = await getRepository()
  const existing = await repo.getProductById(id)

  if (!existing) {
    return res.status(404).json({ message: 'Producto no encontrado' })
  }

  if (
    req.authUser.role === 'provider' &&
    Number(existing.providerId) !== Number(req.authUser.providerId)
  ) {
    return res.status(403).json({ message: 'No podés editar productos de otro proveedor' })
  }

  const updated = await repo.updateProduct(id, updates)
  return res.json(updated)
})

app.delete('/products/:id', authMiddleware, providerOnly, async (req, res) => {
  const id = Number(req.params.id)
  const repo = await getRepository()
  const existing = await repo.getProductById(id)

  if (!existing) {
    return res.status(404).json({ message: 'Producto no encontrado' })
  }

  if (
    req.authUser.role === 'provider' &&
    Number(existing.providerId) !== Number(req.authUser.providerId)
  ) {
    return res.status(403).json({ message: 'No podés eliminar productos de otro proveedor' })
  }

  await repo.deleteProduct(id)

  return res.status(204).send()
})

app.post('/orders', asyncHandler(async (req, res) => {
  const { items = [], buyerName = '', buyerPhone = '', paymentMethod = '' } = req.body || {}

  // Validar items
  validateArray(items, 'Carrito')
  const normalizedItems = items.map((item) => ({
    productId: validateNumber(item.productId || item.id, 'Producto ID', 1),
    quantity: validateQuantity(item.quantity),
  }))

  // Validar buyer info
  requireField(buyerName, 'Nombre')
  const normalizedPhone = validatePhone(buyerPhone)

  // Validar método de pago
  const normalizedPaymentMethod = validatePaymentMethod(paymentMethod)

  const repo = await getRepository()
  const order = await repo.createOrder({
    items: normalizedItems,
    buyerName,
    buyerPhone: normalizedPhone,
    paymentMethod: normalizedPaymentMethod,
  })

  void notifyOrderCreated(order, normalizedItems)
    .then(async (notification) => {
      const storedRepo = await getRepository()
      await storedRepo.recordOrderNotification(order.id, notification)
    })
    .catch((error) => {
      console.error('[order-created:notification:error]', error)
    })

  return res.status(201).json(order)
}))

app.post('/payments/mercadopago/checkout', async (req, res) => {
  const { items = [], buyerName = '', buyerPhone = '', paymentMethod = '' } = req.body || {}
  const normalizedPaymentMethod = String(paymentMethod || '').trim().toLowerCase()

  if (normalizedPaymentMethod !== 'mercadopago') {
    return res.status(400).json({ message: 'Este endpoint solo permite checkout con Mercado Pago' })
  }

  if (!isMercadoPagoConfigured()) {
    return res.status(503).json({
      message: 'Mercado Pago no está configurado en el backend (falta MERCADOPAGO_ACCESS_TOKEN).',
    })
  }

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

  const repo = await getRepository()
  let createdOrder = null

  try {
    const productSnapshots = await Promise.all(
      normalizedItems.map(async (item) => {
        const product = await repo.getProductById(item.productId)
        if (!product) {
          throw new Error(`Producto inexistente: ${item.productId}`)
        }

        return {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          currency: String(product.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
          quantity: Number(item.quantity),
        }
      })
    )

    const currencies = [...new Set(productSnapshots.map((item) => item.currency))]
    if (currencies.length > 1) {
      return res.status(400).json({
        message: 'No se puede pagar en un solo checkout productos en monedas diferentes (UYU y USD).',
      })
    }

    const checkoutCurrency = currencies[0] || 'UYU'

    createdOrder = await repo.createOrder({
      items: normalizedItems,
      buyerName,
      buyerPhone,
      paymentMethod: 'mercadopago',
    })

    const preference = await createMercadoPagoPreference({
      external_reference: String(createdOrder.id),
      items: productSnapshots.map((item) => ({
        id: String(item.productId),
        title: item.name,
        quantity: item.quantity,
        currency_id: checkoutCurrency,
        unit_price: item.price,
      })),
      payer: {
        name: String(buyerName || '').trim() || 'Cliente MercadObra',
      },
      metadata: {
        order_id: createdOrder.id,
        buyer_phone: String(buyerPhone || '').trim(),
      },
      notification_url: `${BACKEND_PUBLIC_URL}/payments/mercadopago/webhook`,
      back_urls: {
        success: `${FRONTEND_PUBLIC_URL}/explorar?payment=success&orderId=${createdOrder.id}`,
        failure: `${FRONTEND_PUBLIC_URL}/explorar?payment=failure&orderId=${createdOrder.id}`,
        pending: `${FRONTEND_PUBLIC_URL}/explorar?payment=pending&orderId=${createdOrder.id}`,
      },
      ...(HAS_PUBLIC_HTTPS_FRONTEND ? { auto_return: 'approved' } : {}),
      statement_descriptor: 'MERCADOBRA',
    })

    await repo.updateOrderPayment(createdOrder.id, {
      paymentStatus: 'pending',
      paymentProvider: 'mercadopago',
      paymentPreferenceId: String(preference.id || ''),
    })

    return res.status(201).json({
      orderId: createdOrder.id,
      trackingToken: createdOrder.trackingToken,
      preferenceId: String(preference.id || ''),
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    })
  } catch (error) {
    if (createdOrder?.id) {
      await repo.updateOrderPayment(createdOrder.id, {
        paymentStatus: 'checkout_error',
        paymentProvider: 'mercadopago',
      })
    }

    return res.status(400).json({ message: error.message || 'No se pudo iniciar el checkout de Mercado Pago' })
  }
})

app.post('/payments/mercadopago/webhook', async (req, res) => {
  const queryType = String(req.query.type || req.query.topic || '').trim().toLowerCase()
  const bodyType = String(req.body?.type || req.body?.topic || '').trim().toLowerCase()
  const eventType = queryType || bodyType

  if (eventType && eventType !== 'payment') {
    return res.status(200).json({ ok: true, ignored: true })
  }

  const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id
  if (!paymentId) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  try {
    const payment = await getMercadoPagoPayment(paymentId)
    const externalReference = String(payment.external_reference || payment.metadata?.order_id || '').trim()
    const orderId = Number(externalReference)

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: true })
    }

    const paymentStatus = mapMercadoPagoStatus(payment.status)
    const repo = await getRepository()

    await repo.updateOrderPayment(orderId, {
      paymentStatus,
      paymentProvider: 'mercadopago',
      paymentExternalId: String(payment.id || ''),
    })

    if (paymentStatus === 'approved' || paymentStatus === 'authorized') {
      const currentOrder = await repo.getOrderById(orderId)
      if (currentOrder?.status === 'pending') {
        await repo.updateOrderStatus(orderId, 'confirmed')
      }
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Webhook Mercado Pago error:', error)
    return res.status(500).json({ message: 'No se pudo procesar webhook de Mercado Pago' })
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
    source: String(body.source || 'landing-lead').trim(),
    projectType: String(body.projectType || '').trim(),
    budgetRange: String(body.budgetRange || '').trim(),
    paymentPreference: String(body.paymentPreference || '').trim(),
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
  const notification = await notifyLeadCreated({ ...payload, ...created }).catch((error) => {
    console.error('[lead:notification:error]', error)
    return { sent: false, channel: 'email', reason: error.message }
  })
  return res.status(201).json({ ...created, notification })
})

app.post('/custom-requests', asyncHandler(async (req, res) => {
  const body = req.body || {}
  const configuration = body.configuration || {}
  const payload = {
    productId: Number(body.productId || 0),
    productName: requireField(body.productName, 'Producto'),
    name: requireField(body.name, 'Nombre'),
    email: validateEmail(body.email),
    phone: requireField(body.phone, 'WhatsApp'),
    zone: requireField(body.zone, 'Zona'),
    configuration: {
      size: requireField(configuration.size, 'Medida'),
      color: requireField(configuration.color, 'Color'),
      finish: requireField(configuration.finish, 'Terminación'),
    },
    message: String(body.message || '').trim().slice(0, 2000),
    photos: Array.isArray(body.photos) ? body.photos.slice(0, 4) : [],
  }
  const repo = await getRepository()
  const created = await repo.createCustomRequest(payload)
  return res.status(201).json(created)
}))

app.get('/admin/custom-requests', authMiddleware, adminOnly, asyncHandler(async (_req, res) => {
  const repo = await getRepository()
  const rows = await repo.getCustomRequests()
  return res.json({ total: rows.length, rows })
}))

app.patch('/admin/custom-requests/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const allowedStatuses = ['new', 'reviewing', 'quoted', 'closed']
  const status = validateEnum(req.body?.status, allowedStatuses, 'Estado')
  const repo = await getRepository()
  const updated = await repo.updateCustomRequestStatus(req.params.id, status)
  if (!updated) throw new NotFoundError('Solicitud')
  return res.json(updated)
}))

app.post('/search-contacts', async (req, res) => {
  const body = req.body || {}
  const payload = {
    searchTerm: String(body.searchTerm || '').trim(),
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim(),
    phone: String(body.phone || '').trim(),
    source: String(body.source || 'featured-search').trim(),
  }

  if (!payload.searchTerm) {
    return res.status(400).json({ message: 'La búsqueda no puede estar vacía' })
  }

  if (payload.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(payload.email)) {
      return res.status(400).json({ message: 'Email inválido' })
    }
  }

  const repo = await getRepository()
  const created = await repo.createSearchContact(payload)
  const matchedProducts = await repo.getProducts({ q: payload.searchTerm, stock: 'in' })

  // Respond quickly so search UX never waits on external providers (SMTP/WhatsApp).
  void notifySearchRecommendations({
    email: payload.email,
    phone: payload.phone,
    searchTerm: payload.searchTerm,
    products: matchedProducts,
  })
    .then((notifications) => {
      console.log('[search-contacts:notifications]', {
        searchTerm: payload.searchTerm,
        emailChannel: notifications?.email?.channel,
        emailSent: notifications?.email?.sent,
        whatsappChannel: notifications?.whatsapp?.channel,
        whatsappSent: notifications?.whatsapp?.sent,
      })
    })
    .catch((error) => {
      console.error('[search-contacts:notifications:error]', error)
    })

  return res.status(201).json({
    ...created,
    notifications: {
      email: payload.email
        ? { sent: false, channel: 'email-pending', reason: 'processing' }
        : { sent: false, channel: 'email', reason: 'email missing' },
      whatsapp: payload.phone
        ? { sent: false, channel: 'whatsapp-pending', reason: 'processing' }
        : { sent: false, channel: 'whatsapp', reason: 'phone missing' },
    },
    matches: matchedProducts.slice(0, 5).map((product) => ({
      id: product.id,
      name: product.name,
      company: product.company,
      price: product.price,
    })),
  })
})

app.get('/admin/quote-consultations', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { from = '', to = '', source = '', eventType = '' } = req.query || {}

  const filters = {
    from: String(from || '').trim() || null,
    to: String(to || '').trim() || null,
    source: String(source || '').trim() || null,
    eventType: String(eventType || '').trim() || null,
  }

  const repo = await getRepository()
  const rows = await repo.getQuoteConsultations(filters)

  return res.json({
    total: rows.length,
    rows,
  })
}))

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

app.patch('/orders/:id/status', authMiddleware, providerOnly, asyncHandler(async (req, res) => {
  const orderId = validateNumber(req.params.id, 'Order ID', 1)
  const nextStatus = validateOrderStatus(req.body?.status)

  const repo = await getRepository()
  const [orders, providerProducts] = await Promise.all([
    repo.getOrders(),
    repo.getProviderProducts(req.authUser.providerId),
  ])

  const order = orders.find((current) => Number(current.id) === orderId)
  if (!order) {
    throw new NotFoundError('Orden')
  }

  const providerProductIds = new Set(providerProducts.map((product) => Number(product.id)))
  const canManageOrder = (order.items || []).some((item) => providerProductIds.has(Number(item.productId)))

  if (!canManageOrder) {
    throw new AuthorizationError('No podés cambiar el estado de esta orden')
  }

  const updated = await repo.updateOrderStatus(orderId, nextStatus)
  if (!updated) {
    throw new NotFoundError('Orden')
  }

  const notification = await notifyOrderStatusChanged(updated)
  const notificationLog = await repo.recordOrderNotification(orderId, notification)

  return res.json({
    ...updated,
    notification,
    notificationLog,
  })
}))

app.get('/orders/:id/notifications', authMiddleware, providerOnly, async (req, res) => {
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

app.get('/orders', authMiddleware, providerOnly, async (req, res) => {
  const repo = await getRepository()
  const orders = await repo.getOrders()
  res.json(orders)
})

app.post('/chat', asyncHandler(async (req, res) => {
  const { message = '', history = [] } = req.body || {}

  const normalizedMessage = validateStringLength(message, 'Mensaje', 1, 1200)

  const response = await generateChatReply({ message: normalizedMessage, history })
  return res.json(response)
}))

// ============================================================================
// GLOBAL ERROR HANDLER (debe ser el último middleware, antes de listen)
// ============================================================================
app.use(globalErrorHandler)

const server = app.listen(PORT, () => {
  console.log(`✅ MercadObra backend listening on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso. Intenta con otro puerto (PORT=XXXX).`)
  } else if (err.code === 'EACCES') {
    console.error(`❌ Error: No tenés permisos para usar el puerto ${PORT}. Intenta con un puerto > 1024.`)
  } else {
    console.error(`❌ Error del servidor:`, err.message)
  }
  process.exit(1)
})

// ============================================================================
// GLOBAL ERROR HANDLER (debe ser el último middleware)
// ============================================================================
app.use(globalErrorHandler)
