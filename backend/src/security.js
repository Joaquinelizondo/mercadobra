import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { AppError } from './errors.js'

/**
 * Configura los middlewares de seguridad HTTP.
 *
 * @param {Express.Application} app - Instancia de Express
 */
export function setupSecurityMiddleware(app) {
  // 1. HELMET: Agrega headers de seguridad HTTP
  // Protege contra ataques comunes: XSS, clickjacking, MIME-type sniffing, etc.
  app.use(helmet())

  // 2. GLOBAL RATE LIMITER
  // Limita 100 requests por 15 minutos por IP
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por ventana
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.',
    standardHeaders: true, // Retorna info en `RateLimit-*` headers
    legacyHeaders: true, // Deshabilita `X-RateLimit-*` headers
    skip: (req) => {
      // No limitamos /health (healthcheck es frecuente)
      return req.path === '/health'
    },
  })
  app.use(globalLimiter)

  // 3. RATE LIMITER ESTRICTO para auth
  // Limita login/register a 5 intentos por 15 minutos por IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
    skip: (req) => {
      // Solo aplica a endpoints de auth
      return !['/auth/login', '/auth/customer/login', '/auth/customer/register', '/auth/admin/login'].includes(req.path)
    },
  })
  app.use(authLimiter)

  // 4. RATE LIMITER para operaciones costosas (API publicas)
  // Limita POST/operaciones a 50 por 15 minutos por IP
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Demasiados requests. Intenta más tarde.',
    skip: (req) => {
      // Solo aplica a POST/PATCH/DELETE
      return !['POST', 'PATCH', 'DELETE'].includes(req.method)
    },
  })
  app.use(apiLimiter)
}

/**
 * Configura CORS con opciones apropiadas para producción.
 *
 * @param {Object} options
 * @param {string[]} options.allowedOrigins - Array de orígenes permitidos
 * @param {boolean} options.credentials - Si se permiten credenciales
 * @returns {Function} Middleware de CORS
 */
export function createCorsMiddleware({ allowedOrigins, credentials = false }) {
  return {
    origin(origin, callback) {
      // Sin origin = request no browserr (ej: curl, API calls)
      if (!origin) {
        callback(null, true)
        return
      }

      // Localhost (desarrollo)
      const isLocalhost = /^https?:\/\/localhost(?::\d+)?$/.test(origin)
      if (isLocalhost || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      // No permitido
      callback(new Error('CORS: Origin no permitido'))
    },
    credentials: credentials, // Allow cookies if matching origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // Pre-flight cache 24hs
  }
}

/**
 * Middleware de error global para seguridad.
 * Captura errores y retorna respuestas seguras (sin detalles internos en producción).
 */
export function globalErrorHandler(err, req, res, _next) {
  const isProduction = process.env.NODE_ENV === 'production'

  // Errores de la aplicación (AppError y subclases)
  if (err instanceof AppError) {
    logErrorIfNeeded(err, req, isProduction)
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
    })
  }

  // Rate limit errors (express-rate-limit)
  if (err.status === 429) {
    return res.status(429).json({
      message: err.message || 'Demasiadas solicitudes',
      retryAfter: Math.ceil(err.resetTime / 1000),
    })
  }

  // CORS error
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      message: 'CORS: Solicitud no permitida',
      code: 'CORS_ERROR',
    })
  }

  // SyntaxError en JSON (express.json())
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      message: 'JSON inválido en el body del request',
      code: 'INVALID_JSON',
    })
  }

  // Errores de base de datos (PostgreSQL)
  if (err.code && err.code.startsWith('23')) {
    // Integrity constraint violations
    logErrorIfNeeded(err, req, isProduction)
    const constraintMessages = {
      products_sku_unique: 'Ese SKU ya está asignado a otro producto. Ingresá un SKU diferente.',
      products_provider_id_fkey: 'El proveedor seleccionado no existe. Dejá el ID vacío o elegí un proveedor válido.',
      products_currency_check: 'La moneda del producto debe ser UYU o USD.',
      products_status_check: 'El estado seleccionado no es válido.',
      products_type_check: 'El tipo de venta seleccionado no es válido.',
    }
    return res.status(409).json({
      message: constraintMessages[err.constraint] || 'Los datos violan restricciones de la base de datos',
      code: 'DB_CONSTRAINT_VIOLATION',
      field: err.constraint === 'products_sku_unique'
        ? 'sku'
        : err.constraint === 'products_provider_id_fkey'
          ? 'providerId'
          : undefined,
    })
  }

  // Timeout de base de datos
  if (err.message && err.message.includes('timeout')) {
    logErrorIfNeeded(err, req, isProduction)
    return res.status(503).json({
      message: 'La base de datos tardó demasiado en responder',
      code: 'DB_TIMEOUT',
    })
  }

  // Otros errores desconocidos (500)
  logErrorIfNeeded(err, req, isProduction)
  const statusCode = err.statusCode || 500

  return res.status(statusCode).json({
    message: isProduction ? 'Error interno del servidor' : err.message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(isProduction === false && { stack: err.stack }),
  })
}

/**
 * Loguea errores con contexto útil
 */
function logErrorIfNeeded(err, req, isProduction) {
  const timestamp = new Date().toISOString()
  const logLevel = err.statusCode >= 500 ? 'ERROR' : 'WARN'

  console.error(`[${timestamp}] [${logLevel}]`, {
    name: err.name,
    message: err.message,
    code: err.code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode: err.statusCode || 500,
    ...(isProduction === false && { stack: err.stack }),
  })
}

/**
 * Middleware para validar JSON Content-Type en POST/PATCH/PUT
 */
export function validateJsonContentType(req, res, next) {
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    const contentType = req.headers['content-type'] || ''
    if (!contentType.includes('application/json')) {
      return res.status(413).json({
        message: 'Content-Type debe ser application/json',
      })
    }
  }
  next()
}

/**
 * Middleware para loguear requests (opcional, en desarrollo)
 */
export function requestLogger(req, res, next) {
  const start = Date.now()
  const originalSend = res.send

  res.send = function (data) {
    const duration = Date.now() - start
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`)
    return originalSend.call(this, data)
  }

  next()
}
