import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getRepository } from './repository.js'
import { isPostgresEnabled } from './db.js'
import { generateChatReply } from './chatService.js'
import { notifyAdminCustomerRegistered, notifyAdminCustomerReply, notifyAdminNewQuoteRequest, notifyAdminQuoteStale, notifyAdminTransferReported, notifyCustomerQuoteActivity, notifyCustomerQuoteReminder, notifyLeadCreated, notifyOrderCreated, notifyOrderStatusChanged, notifyQuoteDepositApproved, notifySearchRecommendations, sendCustomerInvitationEmail, sendCustomerInvitationWhatsapp } from './notificationService.js'
import {
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  isMercadoPagoConfigured,
  isMercadoPagoSandbox,
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
import {
  createSessionCredentials,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './authService.js'
import { isCloudinaryConfigured, uploadProductImage } from './cloudinaryService.js'
import { createQuotePdf } from './quotePdfService.js'

// Validar env vars antes de iniciar la app
validateEnvVars()

const app = express()

// Render terminates public traffic at its reverse proxy before forwarding it
// to this Express process. Trust only that nearest hop so req.ip and the rate
// limiters use the client address supplied by the platform.
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1)
}

const PORT = config.port
const FRONTEND_ORIGIN = config.frontendOrigin
const FRONTEND_PUBLIC_URL = config.frontendPublicUrl
const BACKEND_PUBLIC_URL = config.backendPublicUrl
const CUSTOMER_QUOTE_STATUSES = ['in_progress', 'sent', 'accepted', 'project_in_progress', 'completed', 'rejected', 'cancelled']
const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed']
const HAS_PUBLIC_HTTPS_FRONTEND = /^https:\/\//.test(FRONTEND_PUBLIC_URL)
const PRODUCT_IMAGE_DATA_PATTERN = /^data:(image\/(?:avif|gif|jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i
const QUOTE_REMINDER_CHECK_INTERVAL_MS = 60 * 60 * 1000

function embeddedImageVersion(url) {
  let hash = 0
  for (let index = 0; index < url.length; index += 1) {
    hash = ((hash << 5) - hash + url.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

function productImageUrl(productId, imageIndex, version) {
  return `${String(BACKEND_PUBLIC_URL).replace(/\/+$/, '')}/products/${productId}/images/${imageIndex}?v=${version}`
}

function publicProduct(product) {
  return {
    ...product,
    images: (Array.isArray(product.images) ? product.images : []).map((image, index) => {
      const url = String(image?.url || '')
      if (!url.startsWith('data:image/')) return image
      return {
        ...image,
        url: productImageUrl(product.id, index, embeddedImageVersion(url)),
        storage: 'embedded',
        index,
      }
    }),
  }
}

function validateMilestones(value) {
  if (value == null) return []
  if (!Array.isArray(value)) throw new ValidationError('Hitos debe ser un array')
  if (value.length > 30) throw new ValidationError('Se permiten hasta 30 hitos')
  const rows = value
  return rows.map((item, index) => {
    const milestone = item && typeof item === 'object' ? item : {}
    const status = validateEnum(milestone.status || 'pending', MILESTONE_STATUSES, `Estado del hito ${index + 1}`)
    return {
      id: validateStringLength(String(milestone.id || `milestone-${index + 1}`), 'ID del hito', 1, 80),
      title: validateStringLength(requireField(milestone.title, `Título del hito ${index + 1}`), 'Título del hito', 2, 120),
      description: validateStringLength(milestone.description || '', 'Nota del hito', 0, 500),
      status,
      plannedStartAt: milestone.plannedStartAt || null,
      plannedEndAt: milestone.plannedEndAt || null,
      completedAt: status === 'completed' ? (milestone.completedAt || new Date().toISOString()) : null,
    }
  })
}

function validateQuoteDocument(body) {
  const items=Array.isArray(body.documentItems)?body.documentItems.slice(0,10).map((item,index)=>({code:validateStringLength(item?.code||String(index+1).padStart(2,'0'),'Codigo',1,20),description:validateStringLength(requireField(item?.description,`Descripcion del item ${index+1}`),'Descripcion',2,240),subtotal:validateNumber(item?.subtotal??0,'Subtotal',0,999999999999)})):[]
  const source=body.documentTerms&&typeof body.documentTerms==='object'?body.documentTerms:{}
  return {documentItems:items,documentTerms:{validityDays:validateNumber(source.validityDays??30,'Validez',1,365),paymentTerms:validateStringLength(source.paymentTerms||'','Forma de pago',0,1200),executionTime:validateStringLength(source.executionTime||'','Plazo',0,800),warranty:validateStringLength(source.warranty||'','Garantia',0,1200),exclusions:validateStringLength(source.exclusions||'','Exclusiones',0,1800),notes:validateStringLength(source.notes||'','Notas',0,1200)},taxRate:validateNumber(body.taxRate??22,'IVA',0,100)}
}

function defaultProjectMilestones() {
  return ['Relevamiento y definición','Diseño y aprobación','Compra de materiales','Fabricación y terminaciones','Instalación y entrega'].map((title,index)=>({id:`default-${index+1}`,title,description:'',status:index===0?'in_progress':'pending',plannedStartAt:null,plannedEndAt:null,completedAt:null}))
}

async function activateQuoteProject(repo,quote,depositUpdates) {
  if(!(quote.milestones||[]).length)await repo.updateCustomerQuote(quote.id,{...quote,status:'project_in_progress',milestones:defaultProjectMilestones()})
  return repo.updateCustomerQuoteDeposit(quote.id,{...depositUpdates,status:'project_in_progress'})
}

async function processDueQuoteReminders() {
  const repo=await getRepository(); const due=await repo.getDueQuoteReminders()
  for(const item of due){try{if(item.reminderType==='client_day_7'){if(!item.customerEmail)throw new Error('El cliente no tiene email');await notifyCustomerQuoteReminder({email:item.customerEmail,customerName:item.customerName,quote:item})}else{await notifyAdminQuoteStale({customerName:item.customerName,quote:item})}await repo.recordQuoteReminder({quoteId:item.id,reminderType:item.reminderType,status:'sent'})}catch(error){await repo.recordQuoteReminder({quoteId:item.id,reminderType:item.reminderType,status:'failed',errorMessage:String(error?.message||error).slice(0,500)});console.error('[quote-reminder:error]',item.id,item.reminderType,error?.message||error)}}
}

function restoreEmbeddedImageReferences(images, existingImages) {
  if (!Array.isArray(images)) return images
  return images.map((image) => {
    if (image?.storage !== 'embedded') return image
    const index = Number(image.index)
    return Number.isInteger(index) && existingImages[index]
      ? existingImages[index]
      : image
  })
}

async function migrateEmbeddedProductImages() {
  if (!isCloudinaryConfigured()) return { migratedImages: 0, migratedProducts: 0, failedImages: [] }

  const repo = await getRepository()
  const products = await repo.getProducts({})
  let migratedImages = 0
  let migratedProducts = 0
  const failedImages = []

  for (const product of products) {
    let changed = false
    const images = []

    for (let imageIndex = 0; imageIndex < (product.images || []).length; imageIndex += 1) {
      const image = product.images[imageIndex]
      if (!String(image?.url || '').startsWith('data:image/')) {
        images.push(image)
        continue
      }

      try {
        let uploaded
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            uploaded = await uploadProductImage(image.url, { alt: image.alt || product.name })
            break
          } catch (error) {
            if (attempt === 3) throw error
            await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
          }
        }
        images.push(uploaded)
        migratedImages += 1
        changed = true
      } catch (error) {
        images.push(image)
        failedImages.push({ productId: product.id, imageIndex, reason: error.message })
      }
    }

    if (changed) {
      await repo.updateProduct(product.id, { images })
      migratedProducts += 1
    }
  }

  return { migratedImages, migratedProducts, failedImages }
}

const allowedOrigins = FRONTEND_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function validateCheckoutDetails(body = {}) {
  const buyerName = validateStringLength(requireField(body.buyerName, 'Nombre'), 'Nombre', 3, 120)
  const buyerPhone = validatePhone(body.buyerPhone)
  const buyerEmail = validateEmail(body.buyerEmail)
  const deliveryMethod = validateEnum(body.deliveryMethod || 'delivery', ['delivery', 'pickup'], 'Entrega')
  const deliveryAddress = deliveryMethod === 'delivery'
    ? validateStringLength(requireField(body.deliveryAddress, 'Dirección'), 'Dirección', 5, 180)
    : ''
  const deliveryCity = deliveryMethod === 'delivery'
    ? validateStringLength(requireField(body.deliveryCity, 'Localidad'), 'Localidad', 2, 100)
    : ''
  const buyerNotes = validateStringLength(body.buyerNotes || '', 'Notas', 0, 500)

  return {
    buyerName,
    buyerPhone,
    buyerEmail,
    deliveryMethod,
    deliveryAddress,
    deliveryCity,
    buyerNotes,
  }
}

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

  if (!token) {
    throw new AuthenticationError('Token inválido o ausente')
  }

  const repo = await getRepository()
  const tokenHash = hashSessionToken(token)
  const user = await repo.findUserBySessionTokenHash(tokenHash)

  if (!user) {
    throw new AuthenticationError('Sesión inválida')
  }

  req.authUser = user
  req.authTokenHash = tokenHash
  next()
}

async function authenticateUser(repo, email, password) {
  const user = await repo.findUserByEmail(email)
  if (!user) return null
  if (user.role === 'customer' && user.accountStatus !== 'active') return null

  const verification = verifyPassword(password, user.password)
  if (!verification.valid) return null
  if (verification.needsUpgrade) {
    await repo.updateUserPassword(user.id, hashPassword(password))
  }
  return user
}

async function issueSession(repo, userId) {
  const session = createSessionCredentials()
  await repo.createAuthSession({
    userId,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt,
  })
  return session.token
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
const customerOnly = requireRoleOrAdmin('customer')

function validateAttachments(value) {
  const items = Array.isArray(value) ? value.slice(0, 3) : []
  return items.map((item) => {
    const name = validateStringLength(item?.name || 'archivo', 'Nombre del archivo', 1, 160)
    const type = validateStringLength(item?.type || 'application/octet-stream', 'Tipo de archivo', 1, 100)
    const data = String(item?.data || '')
    if (!data.startsWith('data:') || data.length > 2800000) throw new ValidationError('Cada archivo debe pesar menos de 2 MB')
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new ValidationError('Solo se permiten PDF, JPG, PNG o WEBP')
    return { name, type, data }
  })
}

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
  res.json({
    enabled: isMercadoPagoConfigured(),
    sandbox: isMercadoPagoSandbox(),
  })
})

app.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}

  const normalizedEmail = validateEmail(email)
  validatePassword(password)

  const repo = await getRepository()
  const user = await authenticateUser(repo, normalizedEmail, password)

  if (!user) {
    throw new AuthenticationError('Credenciales inválidas')
  }

  if (user.role !== 'provider') {
    throw new AuthorizationError('Esta cuenta no pertenece a un proveedor')
  }

  const token = await issueSession(repo, user.id)

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
    password: hashPassword(normalizedPassword),
    role: 'customer',
    providerId: null,
    company: normalizedName,
  })

  const token = await issueSession(repo, created.id)

  void notifyAdminCustomerRegistered({customerName:created.company,email:created.email,customerId:created.id}).catch((error)=>console.error('[customer-registered-notification:error]',error.message))

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
  const user = await authenticateUser(repo, normalizedEmail, password)

  if (!user || user.role !== 'customer') {
    throw new AuthenticationError('Credenciales inválidas')
  }

  const token = await issueSession(repo, user.id)

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

app.get('/customer/profile', authMiddleware, customerOnly, asyncHandler(async (req, res) => {
  const repo = await getRepository()
  const profile = await repo.getAdminCustomerById(req.authUser.id)
  if (!profile) throw new NotFoundError('Perfil')
  return res.json(profile)
}))

app.patch('/customer/profile', authMiddleware, customerOnly, asyncHandler(async (req, res) => {
  const repo = await getRepository()
  const current = await repo.getAdminCustomerById(req.authUser.id)
  if (!current) throw new NotFoundError('Perfil')
  const body = req.body || {}
  const updated = await repo.updateAdminCustomer(req.authUser.id, {
    email: req.authUser.email,
    name: validateStringLength(body.name || current.name, 'Nombre', 2, 120),
    phone: validateStringLength(body.phone || '', 'Teléfono', 0, 40),
    companyName: validateStringLength(body.companyName || '', 'Empresa', 0, 120),
    address: validateStringLength(body.address || '', 'Dirección', 0, 180),
    city: validateStringLength(body.city || '', 'Localidad', 0, 100),
    department: validateStringLength(body.department || '', 'Departamento', 0, 100),
    status: current.status || 'active', internalNotes: current.internalNotes || '',
  })
  return res.json(updated)
}))

app.get('/customer/quotes', authMiddleware, customerOnly, asyncHandler(async (req, res) => {
  const repo = await getRepository(); const rows = await repo.getCustomerQuotes(req.authUser.id)
  return res.json({ rows, total: rows.length })
}))

app.post('/customer/quotes', authMiddleware, customerOnly, asyncHandler(async (req, res) => {
  const body = req.body || {}; const repo = await getRepository()
  const created = await repo.createCustomerQuote({
    customerId: req.authUser.id, referenceNumber: `SOL-${Date.now().toString(36).toUpperCase()}`,
    title: validateStringLength(requireField(body.title, 'Título'), 'Título', 2, 160),
    description: validateStringLength(requireField(body.description, 'Descripción'), 'Descripción', 10, 4000),
    status: 'in_progress', totalAmount: 0,
    currency: validateEnum(body.currency || 'UYU', ['uyu', 'usd'], 'Moneda').toUpperCase(),
    desiredDate: body.desiredDate || null,
    budget: body.budget === '' || body.budget == null ? null : validateNumber(body.budget, 'Presupuesto', 0, 999999999999),
    attachments: validateAttachments(body.attachments), internalNotes: '', createdBy: req.authUser.id,
  })
  void notifyAdminNewQuoteRequest({customerName:req.authUser.company,quote:created}).catch((error)=>console.error('[new-quote-notification:error]',error.message))
  return res.status(201).json(created)
}))

app.get('/customer/quotes/:quoteId/messages', authMiddleware, customerOnly, asyncHandler(async (req, res) => {
  const quoteId = validateNumber(req.params.quoteId, 'Cotización ID', 1); const repo = await getRepository()
  const quote = (await repo.getCustomerQuotes(req.authUser.id)).find((item) => item.id === quoteId)
  if (!quote) throw new NotFoundError('Cotización')
  return res.json({ quote, rows: await repo.getQuoteMessages(quoteId) })
}))

app.post('/customer/quotes/:quoteId/messages', authMiddleware, customerOnly, asyncHandler(async (req, res) => {
  const quoteId = validateNumber(req.params.quoteId, 'Cotización ID', 1); const repo = await getRepository()
  const quote = (await repo.getCustomerQuotes(req.authUser.id)).find((item) => item.id === quoteId)
  if (!quote) throw new NotFoundError('Cotización')
  const created = await repo.createQuoteMessage({ quoteId, authorUserId: req.authUser.id, authorRole: 'customer',
    message: validateStringLength(requireField(req.body?.message, 'Mensaje'), 'Mensaje', 1, 3000), attachments: validateAttachments(req.body?.attachments) })
  await notifyAdminCustomerReply({ customerName:req.authUser.company, quote }).catch((error)=>console.error('[quote-notification:error]',error.message))
  return res.status(201).json(created)
}))

app.patch('/customer/quotes/:quoteId/status', authMiddleware, customerOnly, asyncHandler(async (req, res) => {
  const quoteId = validateNumber(req.params.quoteId, 'Cotización ID', 1); const repo = await getRepository()
  const quote = (await repo.getCustomerQuotes(req.authUser.id)).find((item) => item.id === quoteId)
  if (!quote) throw new NotFoundError('Cotización')
  const status = validateEnum(req.body?.status, ['accepted', 'rejected'], 'Estado')
  return res.json(await repo.updateCustomerQuoteStatus(quoteId, status))
}))

app.post('/auth/admin/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}

  const normalizedEmail = validateEmail(email)
  validatePassword(password)

  const repo = await getRepository()
  const user = await authenticateUser(repo, normalizedEmail, password)

  if (!user || user.role !== 'admin') {
    throw new AuthenticationError('Credenciales de administrador inválidas')
  }

  const token = await issueSession(repo, user.id)

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

app.get('/admin/customers', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const status = req.query.status
    ? validateEnum(req.query.status, ['active', 'inactive', 'blocked'], 'Estado')
    : ''
  const repo = await getRepository()
  const rows = await repo.getAdminCustomers({ q: req.query.q || '', status })
  return res.json({ rows, total: rows.length })
}))

app.get('/admin/modeler/project', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const repo = await getRepository()
  return res.json({ project: await repo.getModelerProject(req.authUser.id) })
}))

app.put('/admin/modeler/project', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const name = validateStringLength(req.body?.name || 'Proyecto sin nombre', 'Nombre del proyecto', 1, 120)
  const walls = req.body?.model?.walls
  if (!Array.isArray(walls) || walls.length > 2000) throw new ValidationError('El modelo debe contener entre 0 y 2000 muros')
  const normalizedWalls = walls.map((wall, index) => {
    const label = `Muro ${index + 1}`
    return {
      id: validateStringLength(wall?.id, `ID de ${label}`, 1, 100),
      start: { x: validateNumber(wall?.start?.x, `Inicio X de ${label}`, -10000, 10000), y: validateNumber(wall?.start?.y, `Inicio Y de ${label}`, -10000, 10000) },
      end: { x: validateNumber(wall?.end?.x, `Fin X de ${label}`, -10000, 10000), y: validateNumber(wall?.end?.y, `Fin Y de ${label}`, -10000, 10000) },
      height: validateNumber(wall?.height, `Altura de ${label}`, 0.1, 100),
      thickness: validateNumber(wall?.thickness, `Espesor de ${label}`, 0.01, 10),
    }
  })
  const wallIds = new Set(normalizedWalls.map((wall) => wall.id))
  const openings = req.body?.model?.openings ?? []
  if (!Array.isArray(openings) || openings.length > 4000) throw new ValidationError('El modelo puede contener hasta 4000 aberturas')
  const normalizedOpenings = openings.map((opening, index) => {
    const label = `Abertura ${index + 1}`
    const wallId = validateStringLength(opening?.wallId, `Muro de ${label}`, 1, 100)
    if (!wallIds.has(wallId)) throw new ValidationError(`${label} referencia un muro inexistente`)
    return {
      id: validateStringLength(opening?.id, `ID de ${label}`, 1, 100),
      type: validateEnum(opening?.type, ['door', 'window'], `Tipo de ${label}`),
      wallId,
      t: validateNumber(opening?.t, `Posición de ${label}`, 0, 1),
      width: validateNumber(opening?.width, `Ancho de ${label}`, 0.2, 20),
      height: validateNumber(opening?.height, `Alto de ${label}`, 0.2, 20),
      sill: validateNumber(opening?.sill ?? 0, `Antepecho de ${label}`, 0, 20),
    }
  })
  const furniture = req.body?.model?.furniture ?? []
  if (!Array.isArray(furniture) || furniture.length > 4000) throw new ValidationError('El modelo puede contener hasta 4000 muebles')
  const furnitureTypes = ['bed', 'sofa', 'table', 'chair', 'wardrobe', 'toilet']
  const normalizedFurniture = furniture.map((item, index) => {
    const label = `Mueble ${index + 1}`
    return {
      id: validateStringLength(item?.id, `ID de ${label}`, 1, 100),
      type: validateEnum(item?.type, furnitureTypes, `Tipo de ${label}`),
      x: validateNumber(item?.x, `Posición X de ${label}`, -10000, 10000),
      y: validateNumber(item?.y, `Posición Y de ${label}`, -10000, 10000),
      width: validateNumber(item?.width, `Ancho de ${label}`, 0.1, 100),
      depth: validateNumber(item?.depth, `Profundidad de ${label}`, 0.1, 100),
      height: validateNumber(item?.height, `Alto de ${label}`, 0.1, 100),
      rotation: validateNumber(item?.rotation ?? 0, `Rotación de ${label}`, -1000, 1000),
    }
  })
  const repo = await getRepository()
  return res.json({ project: await repo.saveModelerProject(req.authUser.id, { name, model: { walls: normalizedWalls, openings: normalizedOpenings, furniture: normalizedFurniture } }) })
}))

app.post('/admin/customers', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const body = req.body || {}
  const email = validateEmail(body.email)
  const name = validateStringLength(requireField(body.name, 'Nombre'), 'Nombre', 2, 120)
  const repo = await getRepository()
  if (await repo.findUserByEmail(email)) throw new ConflictError('Ya existe una cuenta con ese correo')
  const generatedSecret = createSessionCredentials().token
  const created = await repo.createAdminCustomer({
    email,
    name,
    password: hashPassword(generatedSecret),
    phone: validateStringLength(body.phone || '', 'Teléfono', 0, 40),
    companyName: validateStringLength(body.companyName || '', 'Empresa', 0, 120),
    address: validateStringLength(body.address || '', 'Dirección', 0, 180),
    city: validateStringLength(body.city || '', 'Localidad', 0, 100),
    department: validateStringLength(body.department || '', 'Departamento', 0, 100),
    internalNotes: validateStringLength(body.internalNotes || '', 'Notas internas', 0, 1000),
  })
  return res.status(201).json(created)
}))

app.post('/admin/customer-invitations', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const body=req.body||{}; const firstName=validateStringLength(requireField(body.firstName,'Nombre'),'Nombre',2,60); const lastName=validateStringLength(requireField(body.lastName,'Apellido'),'Apellido',2,60); const email=validateEmail(body.email); const validatedPhone=body.phone?validatePhone(body.phone):''; const phone=validatedPhone.startsWith('0')?`598${validatedPhone.slice(1)}`:validatedPhone; const repo=await getRepository()
  let user=await repo.findUserByEmail(email)
  if(user&&user.role!=='customer')throw new ConflictError('Ese correo pertenece a otro tipo de cuenta')
  if(!user){user=await repo.createAdminCustomer({email,name:`${firstName} ${lastName}`,password:hashPassword(createSessionCredentials().token),phone,companyName:validateStringLength(body.companyName||'','Empresa',0,120),address:'',city:'',department:'',internalNotes:''})}
  const credentials=createSessionCredentials(); const expiresAt=new Date(Date.now()+72*60*60*1000).toISOString()
  const invitation=await repo.createCustomerInvitation({userId:user.id,email,tokenHash:credentials.tokenHash,expiresAt,createdBy:req.authUser.id})
  const inviteUrl=`${FRONTEND_PUBLIC_URL}/cliente/invitacion/${encodeURIComponent(credentials.token)}`
  const [emailDelivery,whatsappDelivery]=await Promise.all([sendCustomerInvitationEmail({email,firstName,inviteUrl}),sendCustomerInvitationWhatsapp({phone,firstName,inviteUrl})])
  if(!emailDelivery.sent&&!whatsappDelivery.sent)throw new ServiceUnavailableError('No se pudo enviar la invitación')
  return res.status(201).json({id:Number(invitation.id),email,phone,status:'sent',expiresAt,delivery:{email:emailDelivery.channel,whatsapp:whatsappDelivery.channel}})
}))

app.get('/customer-invitations/:token', asyncHandler(async (req,res)=>{
  const repo=await getRepository(); const invitation=await repo.findCustomerInvitation(hashSessionToken(req.params.token))
  if(!invitation||invitation.status!=='sent'||new Date(invitation.expires_at??invitation.expiresAt).getTime()<=Date.now())throw new ValidationError('La invitación no es válida o ya venció')
  return res.json({email:invitation.email,firstName:String(invitation.user?.company||'').split(' ')[0],expiresAt:invitation.expires_at??invitation.expiresAt})
}))

app.post('/customer-invitations/:token/accept', asyncHandler(async (req,res)=>{
  const password=validatePassword(req.body?.password); const repo=await getRepository(); const invitation=await repo.findCustomerInvitation(hashSessionToken(req.params.token)); const expiresAt=invitation?.expires_at??invitation?.expiresAt
  if(!invitation||invitation.status!=='sent'||new Date(expiresAt).getTime()<=Date.now())throw new ValidationError('La invitación no es válida o ya venció')
  const userId=Number(invitation.user_id??invitation.userId); await repo.updateUserPassword(userId,hashPassword(password)); await repo.acceptCustomerInvitation(invitation.id)
  const token=await issueSession(repo,userId); const user=await repo.findUserById(userId)
  void notifyAdminCustomerRegistered({customerName:user.company,email:user.email,customerId:user.id}).catch((error)=>console.error('[customer-registered-notification:error]',error.message))
  return res.json({token,user:{id:user.id,email:user.email,role:user.role,company:user.company}})
}))

app.patch('/admin/customers/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const id = validateNumber(req.params.id, 'Cliente ID', 1)
  const body = req.body || {}
  const email = validateEmail(body.email)
  const name = validateStringLength(requireField(body.name, 'Nombre'), 'Nombre', 2, 120)
  const status = validateEnum(body.status || 'active', ['active', 'inactive', 'blocked'], 'Estado')
  const repo = await getRepository()
  const emailOwner = await repo.findUserByEmail(email)
  if (emailOwner && Number(emailOwner.id) !== Number(id)) {
    throw new ConflictError('Ya existe una cuenta con ese correo')
  }
  const updated = await repo.updateAdminCustomer(id, {
    email,
    name,
    status,
    phone: validateStringLength(body.phone || '', 'Teléfono', 0, 40),
    companyName: validateStringLength(body.companyName || '', 'Empresa', 0, 120),
    address: validateStringLength(body.address || '', 'Dirección', 0, 180),
    city: validateStringLength(body.city || '', 'Localidad', 0, 100),
    department: validateStringLength(body.department || '', 'Departamento', 0, 100),
    internalNotes: validateStringLength(body.internalNotes || '', 'Notas internas', 0, 1000),
  })
  if (!updated) throw new NotFoundError('Cliente')
  return res.json(updated)
}))

app.get('/admin/customers/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const id = validateNumber(req.params.id, 'Cliente ID', 1)
  const repo = await getRepository()
  const customer = await repo.getAdminCustomerById(id)
  if (!customer) throw new NotFoundError('Cliente')
  return res.json(customer)
}))

app.get('/admin/customers/:customerId/quotes', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const customerId = validateNumber(req.params.customerId, 'Cliente ID', 1)
  const repo = await getRepository()
  if (!await repo.getAdminCustomerById(customerId)) throw new NotFoundError('Cliente')
  const rows = await repo.getCustomerQuotes(customerId)
  return res.json({ rows, total: rows.length })
}))

app.get('/admin/customer-quotes', authMiddleware, adminOnly, asyncHandler(async (_req,res)=>{const repo=await getRepository();const rows=await repo.getAllCustomerQuotes();return res.json({rows,total:rows.length})}))

app.post('/admin/customers/:customerId/quotes', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const customerId = validateNumber(req.params.customerId, 'Cliente ID', 1)
  const body = req.body || {}
  const repo = await getRepository()
  if (!await repo.getAdminCustomerById(customerId)) throw new NotFoundError('Cliente')
  const created = await repo.createCustomerQuote({
    customerId,
    referenceNumber: `COT-${Date.now().toString(36).toUpperCase()}`,
    title: validateStringLength(requireField(body.title, 'Título'), 'Título', 2, 160),
    description: validateStringLength(body.description || '', 'Descripción', 0, 2000),
    status: validateEnum(body.status || 'in_progress', CUSTOMER_QUOTE_STATUSES, 'Estado'),
    totalAmount: validateNumber(body.totalAmount ?? 0, 'Monto total', 0, 999999999999),
    currency: validateEnum(body.currency || 'UYU', ['uyu', 'usd'], 'Moneda').toUpperCase(),
    estimatedStartAt: body.estimatedStartAt || null,
    estimatedEndAt: body.estimatedEndAt || null,
    internalNotes: validateStringLength(body.internalNotes || '', 'Notas internas', 0, 1000),
    createdBy: req.authUser.id,
  })
  return res.status(201).json(created)
}))

app.patch('/admin/quotes/:quoteId/status', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const quoteId = validateNumber(req.params.quoteId, 'Cotización ID', 1)
  const status = validateEnum(req.body?.status, CUSTOMER_QUOTE_STATUSES, 'Estado')
  const repo = await getRepository()
  const updated = await repo.updateCustomerQuoteStatus(quoteId, status)
  if (!updated) throw new NotFoundError('Cotización')
  if(status==='sent'){const customer=await repo.findUserById(updated.customerId);if(customer?.email)await notifyCustomerQuoteActivity({email:customer.email,customerName:customer.company,quote:updated,kind:'quote'}).catch((error)=>console.error('[quote-notification:error]',error.message))}
  return res.json(updated)
}))

app.patch('/admin/quotes/:quoteId', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const quoteId = validateNumber(req.params.quoteId, 'Cotización ID', 1); const repo = await getRepository()
  const body = req.body || {}
  const quoteDocument=validateQuoteDocument(body)
  const depositMode=validateEnum(body.depositMode||'none',['none','percentage','fixed'],'Tipo de seña')
  const depositValue=depositMode==='none'?0:validateNumber(body.depositValue??0,'Valor de seña',0,999999999999)
  const totalAmount=validateNumber(body.totalAmount??0,'Monto total',0,999999999999)
  if(depositMode==='percentage'&&depositValue>100)throw new ValidationError('El porcentaje de seña no puede superar 100%')
  const depositAmount=depositMode==='percentage'?Math.round(totalAmount*depositValue)/100:depositMode==='fixed'?depositValue:0
  if(depositAmount>totalAmount&&totalAmount>0)throw new ValidationError('La seña no puede superar el total de la cotización')
  let updated = await repo.updateCustomerQuote(quoteId, {
    title: validateStringLength(requireField(body.title, 'Título'), 'Título', 2, 160),
    description: validateStringLength(body.description || '', 'Descripción', 0, 4000),
    proposalDescription: validateStringLength(body.proposalDescription || '', 'Detalle de propuesta', 0, 4000),
    status: validateEnum(body.status || 'sent', CUSTOMER_QUOTE_STATUSES, 'Estado'),
    totalAmount,
    currency: validateEnum(body.currency || 'UYU', ['uyu', 'usd'], 'Moneda').toUpperCase(),
    estimatedStartAt: body.estimatedStartAt || null, estimatedEndAt: body.estimatedEndAt || null,
    milestones: validateMilestones(body.milestones),
    depositMode, depositValue, depositAmount,
    ...quoteDocument,
  })
  if (!updated) throw new NotFoundError('Cotización')
  if(depositAmount>0&&updated.depositStatus==='not_required')updated=await repo.updateCustomerQuoteDeposit(quoteId,{depositStatus:'pending'})
  if(depositAmount===0&&updated.depositStatus!=='approved')updated=await repo.updateCustomerQuoteDeposit(quoteId,{depositStatus:'not_required',depositMethod:'',depositReceipt:null,depositReportedAt:null})
  const customer=await repo.findUserById(updated.customerId)
  if(body.notifyCustomer!==false&&customer?.email)await notifyCustomerQuoteActivity({email:customer.email,customerName:customer.company,quote:updated,kind:'quote'}).catch((error)=>console.error('[quote-notification:error]',error.message))
  return res.json(updated)
}))

app.get('/admin/quotes/:quoteId/pdf',authMiddleware,adminOnly,asyncHandler(async(req,res)=>{
  const quoteId=validateNumber(req.params.quoteId,'Cotizacion ID',1);const repo=await getRepository();const quote=await repo.getCustomerQuoteById(quoteId);if(!quote)throw new NotFoundError('Cotizacion');const customer=await repo.getAdminCustomerById(quote.customerId);const pdf=await createQuotePdf({quote,customer});const filename=`Cotizacion-${String(quote.referenceNumber||quote.id).replace(/[^a-z0-9-]/gi,'_')}.pdf`;res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${filename}"`,'Content-Length':String(pdf.length)});return res.send(pdf)
}))

app.post('/customer/quotes/:quoteId/deposit/mercadopago',authMiddleware,customerOnly,asyncHandler(async(req,res)=>{
  if(!isMercadoPagoConfigured())throw new ServiceUnavailableError('Mercado Pago no está configurado')
  const quoteId=validateNumber(req.params.quoteId,'Cotización ID',1);const repo=await getRepository();const quote=(await repo.getCustomerQuotes(req.authUser.id)).find(item=>item.id===quoteId)
  if(!quote)throw new NotFoundError('Cotización');if(quote.status!=='accepted')throw new ValidationError('Primero debés aprobar la cotización');if(quote.depositAmount<=0)throw new ValidationError('Esta cotización no requiere seña');if(quote.depositStatus==='approved')throw new ConflictError('La seña ya fue confirmada')
  const preference=await createMercadoPagoPreference({external_reference:`quote-deposit:${quote.id}`,items:[{id:`quote-${quote.id}`,title:`Seña · ${quote.title}`,quantity:1,currency_id:quote.currency,unit_price:quote.depositAmount}],payer:{name:req.authUser.company,email:req.authUser.email},metadata:{payment_kind:'quote_deposit',quote_id:quote.id},notification_url:`${BACKEND_PUBLIC_URL}/payments/mercadopago/webhook`,back_urls:{success:`${FRONTEND_PUBLIC_URL}/cliente?deposit=success&quoteId=${quote.id}`,failure:`${FRONTEND_PUBLIC_URL}/cliente?deposit=failure&quoteId=${quote.id}`,pending:`${FRONTEND_PUBLIC_URL}/cliente?deposit=pending&quoteId=${quote.id}`},...(HAS_PUBLIC_HTTPS_FRONTEND?{auto_return:'approved'}:{}),statement_descriptor:'MERCADOBRA',expires:true,expiration_date_from:new Date().toISOString(),expiration_date_to:new Date(Date.now()+72*60*60*1000).toISOString()})
  const updated=await repo.updateCustomerQuoteDeposit(quote.id,{depositStatus:'pending',depositMethod:'mercadopago',depositPreferenceId:String(preference.id||'')})
  return res.status(201).json({quote:updated,initPoint:preference.init_point,sandboxInitPoint:preference.sandbox_init_point,sandbox:isMercadoPagoSandbox()})
}))

app.post('/customer/quotes/:quoteId/deposit/transfer',authMiddleware,customerOnly,asyncHandler(async(req,res)=>{
  const quoteId=validateNumber(req.params.quoteId,'Cotización ID',1);const repo=await getRepository();const quote=(await repo.getCustomerQuotes(req.authUser.id)).find(item=>item.id===quoteId)
  if(!quote)throw new NotFoundError('Cotización');if(quote.status!=='accepted')throw new ValidationError('Primero debés aprobar la cotización');if(quote.depositAmount<=0)throw new ValidationError('Esta cotización no requiere seña');if(quote.depositStatus==='approved')throw new ConflictError('La seña ya fue confirmada')
  const receipt=validateAttachments([req.body?.receipt])[0];const updated=await repo.updateCustomerQuoteDeposit(quote.id,{depositStatus:'reported',depositMethod:'transfer',depositReceipt:receipt,depositReportedAt:new Date().toISOString()})
  await notifyAdminTransferReported({customerName:req.authUser.company,quote:updated}).catch(error=>console.error('[transfer-notification:error]',error.message))
  return res.json(updated)
}))

app.patch('/admin/quotes/:quoteId/deposit',authMiddleware,adminOnly,asyncHandler(async(req,res)=>{
  const quoteId=validateNumber(req.params.quoteId,'Cotización ID',1);const status=validateEnum(req.body?.status,['approved','rejected'],'Estado de seña');const repo=await getRepository();const quote=await repo.getCustomerQuoteById(quoteId);if(!quote)throw new NotFoundError('Cotización')
  const updated=status==='approved'?await activateQuoteProject(repo,quote,{depositStatus:'approved',depositPaidAt:new Date().toISOString()}):await repo.updateCustomerQuoteDeposit(quoteId,{depositStatus:'rejected',status:quote.status,depositPaidAt:null})
  if(status==='approved'){const customer=await repo.findUserById(updated.customerId);if(customer?.email)void notifyQuoteDepositApproved({email:customer.email,customerName:customer.company,quote:updated}).catch(error=>console.error('[deposit-approved-notification:error]',error.message))}
  return res.json(updated)
}))

app.get('/admin/quotes/:quoteId/messages', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const quoteId = validateNumber(req.params.quoteId, 'Cotización ID', 1); const repo = await getRepository()
  return res.json({ rows: await repo.getQuoteMessages(quoteId) })
}))

app.post('/admin/quotes/:quoteId/messages', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const quoteId = validateNumber(req.params.quoteId, 'Cotización ID', 1); const repo = await getRepository()
  const quote=await repo.getCustomerQuoteById(quoteId); if(!quote)throw new NotFoundError('Cotización')
  const created = await repo.createQuoteMessage({ quoteId, authorUserId: req.authUser.id, authorRole: 'admin',
    message: validateStringLength(requireField(req.body?.message, 'Mensaje'), 'Mensaje', 1, 3000), attachments: validateAttachments(req.body?.attachments) })
  const customer=await repo.findUserById(quote.customerId)
  if(customer?.email)await notifyCustomerQuoteActivity({email:customer.email,customerName:customer.company,quote,kind:'message'}).catch((error)=>console.error('[quote-notification:error]',error.message))
  return res.status(201).json(created)
}))

app.post('/auth/logout', authMiddleware, asyncHandler(async (req, res) => {
  const repo = await getRepository()
  await repo.deleteAuthSession(req.authTokenHash)
  return res.status(204).send()
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
  const products = await repo.getProducts({ q, category, providerId, stock })
  res.json(products.map(publicProduct))
})

app.get('/products/:id/images/:index', asyncHandler(async (req, res) => {
  const id = validateNumber(req.params.id, 'Product ID', 1)
  const index = validateNumber(req.params.index, 'Índice de imagen', 0)
  const repo = await getRepository()
  const product = await repo.getProductById(id)

  if (!product || product.status === 'archived') throw new NotFoundError('Imagen')

  const image = Array.isArray(product.images) ? product.images[index] : null
  const imageUrl = String(image?.url || '')
  const embeddedImage = imageUrl.match(PRODUCT_IMAGE_DATA_PATTERN)

  if (embeddedImage) {
    res.set('Content-Type', embeddedImage[1].toLowerCase())
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.set('Cross-Origin-Resource-Policy', 'cross-origin')
    return res.send(Buffer.from(embeddedImage[2], 'base64'))
  }

  if (/^https?:\/\//i.test(imageUrl)) return res.redirect(302, imageUrl)
  throw new NotFoundError('Imagen')
}))

app.get('/products/:id', asyncHandler(async (req, res) => {
  const id = validateNumber(req.params.id, 'Product ID', 1)
  const repo = await getRepository()
  const product = await repo.getProductById(id)

  if (!product || product.status === 'archived') {
    throw new NotFoundError('Producto')
  }

  return res.json(publicProduct(product))
}))

app.post('/product-images', authMiddleware, providerOnly, asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured()) throw new ServiceUnavailableError('Cloudinary todavía no está configurado')
  const image = await uploadProductImage(req.body?.dataUrl, {
    alt: validateStringLength(req.body?.alt || '', 'Texto alternativo', 0, 180),
  })
  return res.status(201).json({ image })
}))

app.post('/admin/product-images/migrate', authMiddleware, adminOnly, asyncHandler(async (_req, res) => {
  if (!isCloudinaryConfigured()) throw new ServiceUnavailableError('Cloudinary todavía no está configurado')
  return res.json(await migrateEmbeddedProductImages())
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
    discountPercent: validateNumber(body.discountPercent ?? 0, 'Descuento', 0, 99),
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
    ribbonEnabled: Boolean(body.ribbonEnabled),
    ribbonText: String(body.ribbonText || '').trim().slice(0, 24),
    slideEnabled: Boolean(body.slideEnabled),
    slideTitle: String(body.slideTitle || '').trim().slice(0, 80),
    slideSubtitle: String(body.slideSubtitle || '').trim().slice(0, 180),
    slideOrder: Number(body.slideOrder || 0),
    variants: Array.isArray(body.variants) ? body.variants.slice(0, 30) : [],
  })

  return res.status(201).json({
    message: 'Producto guardado correctamente',
    product: publicProduct(created)
  })
})

app.patch('/products/:id', authMiddleware, providerOnly, async (req, res) => {
  const id = Number(req.params.id)
  const updates = req.body || {}
  if (updates.currency !== undefined) {
    updates.currency = validateEnum(updates.currency, ['uyu', 'usd'], 'Moneda').toUpperCase()
  }
  if (updates.discountPercent !== undefined) {
    updates.discountPercent = validateNumber(updates.discountPercent || 0, 'Descuento', 0, 99)
  }
  if (updates.status !== undefined) {
    updates.status = validateEnum(updates.status, ['draft', 'published', 'out_of_stock', 'archived'], 'Estado')
  }
  if (updates.productType !== undefined) {
    updates.productType = validateEnum(updates.productType, ['ready', 'made_to_order', 'custom_quote'], 'Tipo de producto')
  }
  if (updates.ribbonEnabled !== undefined) updates.ribbonEnabled = Boolean(updates.ribbonEnabled)
  if (updates.ribbonText !== undefined) updates.ribbonText = String(updates.ribbonText || '').trim().slice(0, 24)
  if (updates.slideEnabled !== undefined) updates.slideEnabled = Boolean(updates.slideEnabled)
  if (updates.slideTitle !== undefined) updates.slideTitle = String(updates.slideTitle || '').trim().slice(0, 80)
  if (updates.slideSubtitle !== undefined) updates.slideSubtitle = String(updates.slideSubtitle || '').trim().slice(0, 180)
  if (updates.slideOrder !== undefined) updates.slideOrder = validateNumber(updates.slideOrder || 0, 'Orden de diapositiva', 0, 999)
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

  if (updates.images !== undefined) {
    updates.images = restoreEmbeddedImageReferences(updates.images, existing.images || [])
  }

  const updated = await repo.updateProduct(id, updates)
  return res.json(publicProduct(updated))
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

  const removed = await repo.deleteProduct(id)
  if (!removed) {
    return res.status(409).json({ message: 'El producto ya fue quitado del catálogo' })
  }

  return res.status(204).send()
})

app.post('/orders', asyncHandler(async (req, res) => {
  const { items = [], paymentMethod = '' } = req.body || {}

  // Validar items
  validateArray(items, 'Carrito')
  const normalizedItems = items.map((item) => ({
    productId: validateNumber(item.productId || item.id, 'Producto ID', 1),
    quantity: validateQuantity(item.quantity),
  }))

  const checkoutDetails = validateCheckoutDetails(req.body)

  // Validar método de pago
  const normalizedPaymentMethod = validatePaymentMethod(paymentMethod)
  if (checkoutDetails.deliveryMethod === 'delivery' && normalizedPaymentMethod !== 'pago_al_coordinar') {
    throw new ValidationError('La entrega a domicilio se confirma y cobra después de cotizar el envío')
  }
  if (checkoutDetails.deliveryMethod === 'pickup' && normalizedPaymentMethod === 'pago_al_coordinar') {
    throw new ValidationError('Para retiro elegí transferencia o Mercado Pago')
  }

  const repo = await getRepository()
  const order = await repo.createOrder({
    items: normalizedItems,
    ...checkoutDetails,
    paymentMethod: normalizedPaymentMethod,
  })

  void notifyOrderCreated(order, order.items)
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
  const { items = [], paymentMethod = '' } = req.body || {}
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
    const checkoutDetails = validateCheckoutDetails(req.body)
    if (checkoutDetails.deliveryMethod !== 'pickup') {
      return res.status(400).json({
        message: 'Mercado Pago está disponible solo para retiro hasta definir la tarifa de entrega.',
      })
    }
    const productSnapshots = await Promise.all(
      normalizedItems.map(async (item) => {
        const product = await repo.getProductById(item.productId)
        if (!product) {
          throw new Error(`Producto inexistente: ${item.productId}`)
        }

        return {
          productId: product.id,
          name: product.name,
          price: Math.round(Number(product.price) * (1 - Math.min(99, Math.max(0, Number(product.discountPercent) || 0)) / 100) * 100) / 100,
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
      ...checkoutDetails,
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
        name: checkoutDetails.buyerName,
        email: checkoutDetails.buyerEmail,
      },
      metadata: {
        order_id: createdOrder.id,
        buyer_phone: checkoutDetails.buyerPhone,
        delivery_method: checkoutDetails.deliveryMethod,
        delivery_city: checkoutDetails.deliveryCity,
      },
      notification_url: `${BACKEND_PUBLIC_URL}/payments/mercadopago/webhook`,
      back_urls: {
        success: `${FRONTEND_PUBLIC_URL}/explorar?payment=success&orderId=${createdOrder.id}`,
        failure: `${FRONTEND_PUBLIC_URL}/explorar?payment=failure&orderId=${createdOrder.id}`,
        pending: `${FRONTEND_PUBLIC_URL}/explorar?payment=pending&orderId=${createdOrder.id}`,
      },
      ...(HAS_PUBLIC_HTTPS_FRONTEND ? { auto_return: 'approved' } : {}),
      statement_descriptor: 'MERCADOBRA',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
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
      sandbox: isMercadoPagoSandbox(),
    })
  } catch (error) {
    if (createdOrder?.id) {
      await repo.updateOrderPayment(createdOrder.id, {
        paymentStatus: 'checkout_error',
        paymentProvider: 'mercadopago',
      })
      await repo.restoreOrderStock(createdOrder.id)
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
    const quoteId=Number(payment.metadata?.quote_id||(/^quote-deposit:(\d+)$/.exec(externalReference)?.[1]))
    const paymentStatus = mapMercadoPagoStatus(payment.status)
    const repo = await getRepository()
    if(quoteId){const quote=await repo.getCustomerQuoteById(quoteId);if(!quote)return res.status(200).json({ok:true,ignored:true});const approved=['approved','authorized'].includes(paymentStatus);const depositUpdates={depositStatus:approved?'approved':paymentStatus==='pending'?'pending':paymentStatus==='rejected'?'rejected':'cancelled',depositMethod:'mercadopago',depositExternalId:String(payment.id||''),depositPaidAt:approved?new Date().toISOString():null};const updated=approved?await activateQuoteProject(repo,quote,depositUpdates):await repo.updateCustomerQuoteDeposit(quoteId,{...depositUpdates,status:quote.status});if(approved&&quote.depositStatus!=='approved'){const customer=await repo.findUserById(updated.customerId);if(customer?.email)void notifyQuoteDepositApproved({email:customer.email,customerName:customer.company,quote:updated}).catch(error=>console.error('[deposit-approved-notification:error]',error.message))}return res.status(200).json({ok:true,kind:'quote_deposit'})}
    const orderId = Number(externalReference)

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: true })
    }

    await repo.updateOrderPayment(orderId, {
      paymentStatus,
      paymentProvider: 'mercadopago',
      paymentExternalId: String(payment.id || ''),
    })

    if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentStatus)) {
      await repo.restoreOrderStock(orderId)
    }

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
    selectedProductIds: Array.isArray(body.selectedProductIds)
      ? body.selectedProductIds.map(Number).filter(Number.isFinite).slice(0, 5)
      : [],
    selectedProducts: Array.isArray(body.selectedProducts)
      ? body.selectedProducts.slice(0, 5).map((product) => ({
          id: Number(product?.id),
          imageUrl: String(product?.imageUrl || '').trim(),
        }))
      : [],
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
  const searchedProducts = await repo.getProducts({ q: payload.searchTerm, stock: 'in' })
  let matchedProducts = payload.selectedProductIds.length
    ? (await repo.getProducts({}))
        .filter((product) => payload.selectedProductIds.includes(Number(product.id)))
    : searchedProducts

  // The frontend can enrich database products with bundled catalog images. Preserve
  // that exact image when emailing the products selected by the customer.
  const selectedImages = new Map(
    payload.selectedProducts
      .filter((product) => Number.isFinite(product.id) && product.imageUrl)
      .map((product) => [product.id, product.imageUrl])
  )
  matchedProducts = matchedProducts.map((product) => {
    const selectedImage = selectedImages.get(Number(product.id))
    return selectedImage ? { ...product, images: [{ url: selectedImage, alt: product.name }] } : product
  })

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

app.post('/admin/orders', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const body = req.body || {}
  validateArray(body.items, 'Productos')
  const itemQuantities = new Map()
  body.items.forEach((item) => {
    const productId = validateNumber(item.productId, 'Producto ID', 1)
    const quantity = validateQuantity(item.quantity)
    itemQuantities.set(productId, Number(itemQuantities.get(productId) || 0) + quantity)
  })
  const items = [...itemQuantities.entries()].map(([productId, quantity]) => ({ productId, quantity }))
  const buyerName = validateStringLength(requireField(body.buyerName, 'Nombre'), 'Nombre', 3, 120)
  const buyerPhone = validatePhone(body.buyerPhone)
  const buyerEmail = String(body.buyerEmail || '').trim()
    ? validateEmail(body.buyerEmail)
    : ''
  const deliveryMethod = validateEnum(body.deliveryMethod || 'pickup', ['delivery', 'pickup'], 'Entrega')
  const deliveryAddress = deliveryMethod === 'delivery'
    ? validateStringLength(requireField(body.deliveryAddress, 'Dirección'), 'Dirección', 5, 180)
    : ''
  const deliveryCity = deliveryMethod === 'delivery'
    ? validateStringLength(requireField(body.deliveryCity, 'Localidad'), 'Localidad', 2, 100)
    : ''
  const source = validateEnum(body.source || 'whatsapp', ['whatsapp', 'phone', 'instagram', 'presencial', 'other'], 'Origen')
  const paymentMethod = validateEnum(body.paymentMethod || 'transferencia', ['transferencia'], 'Método de pago manual')
  const buyerNotes = validateStringLength(body.buyerNotes || '', 'Notas', 0, 500)

  const repo = await getRepository()
  const order = await repo.createOrder({
    items,
    buyerName,
    buyerPhone,
    buyerEmail,
    deliveryMethod,
    deliveryAddress,
    deliveryCity,
    buyerNotes,
    paymentMethod,
    source,
  })

  let notification = null
  if (body.sendNotification === true) {
    notification = await notifyOrderCreated(order, order.items)
    await repo.recordOrderNotification(order.id, notification)
  }

  return res.status(201).json({ ...order, notification })
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

  const normalizedBuyerPhone = validatePhone(buyerPhone)
  const repo = await getRepository()
  const order = await repo.getOrderByTracking(trackingToken, normalizedBuyerPhone)

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
    req.authUser.role === 'admin' ? Promise.resolve([]) : repo.getProviderProducts(req.authUser.providerId),
  ])

  const order = orders.find((current) => Number(current.id) === orderId)
  if (!order) {
    throw new NotFoundError('Orden')
  }

  const providerProductIds = new Set(providerProducts.map((product) => Number(product.id)))
  const canManageOrder = req.authUser.role === 'admin'
    || (order.items || []).some((item) => providerProductIds.has(Number(item.productId)))

  if (!canManageOrder) {
    throw new AuthorizationError('No podés cambiar el estado de esta orden')
  }

  const updated = await repo.updateOrderStatus(orderId, nextStatus)
  if (!updated) {
    throw new NotFoundError('Orden')
  }

  if (nextStatus === 'cancelled') {
    await repo.restoreOrderStock(orderId)
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
    req.authUser.role === 'admin' ? Promise.resolve([]) : repo.getProviderProducts(req.authUser.providerId),
  ])

  const order = orders.find((current) => Number(current.id) === orderId)
  if (!order) {
    return res.status(404).json({ message: 'Orden no encontrada' })
  }

  const providerProductIds = new Set(providerProducts.map((product) => Number(product.id)))
  const canManageOrder = req.authUser.role === 'admin'
    || (order.items || []).some((item) => providerProductIds.has(Number(item.productId)))

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
  console.log(`✅ Mercadobra backend listening on http://localhost:${PORT}`)
  migrateEmbeddedProductImages()
    .then(({ migratedImages, migratedProducts, failedImages }) => {
      if (migratedImages > 0) console.log(`✅ Cloudinary: ${migratedImages} imágenes de ${migratedProducts} productos migradas`)
      if (failedImages.length > 0) console.error(`⚠️ Cloudinary: ${failedImages.length} imágenes pendientes de migración`)
    })
    .catch((error) => console.error('⚠️ No se pudieron migrar imágenes a Cloudinary:', error.message))
  const reminderTimer=setInterval(()=>{void processDueQuoteReminders().catch((error)=>console.error('[quote-reminder-sweep:error]',error.message))},QUOTE_REMINDER_CHECK_INTERVAL_MS)
  reminderTimer.unref()
  setTimeout(()=>{void processDueQuoteReminders().catch((error)=>console.error('[quote-reminder-sweep:error]',error.message))},15000).unref()
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
