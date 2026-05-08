/**
 * Clase base para errores de aplicación.
 * Todos los errores heredan de esta para mantener consistencia.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    }
  }
}

/**
 * Error de validación (400)
 */
export class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, 400, code)
  }
}

/**
 * Error de autenticación (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Autenticación requerida', code = 'AUTH_REQUIRED') {
    super(message, 401, code)
  }
}

/**
 * Error de autorización (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Acceso denegado', code = 'ACCESS_DENIED') {
    super(message, 403, code)
  }
}

/**
 * Error de recurso no encontrado (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Recurso', code = 'NOT_FOUND') {
    super(`${resource} no encontrado`, 404, code)
  }
}

/**
 * Error de conflicto (409) - ej: email ya existe
 */
export class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(message, 409, code)
  }
}

/**
 * Error de servicio no disponible (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service = 'Servicio', code = 'SERVICE_UNAVAILABLE') {
    super(`${service} no disponible`, 503, code)
  }
}

/**
 * Error de rate limit (429)
 */
export class RateLimitError extends AppError {
  constructor(message = 'Demasiadas solicitudes', code = 'RATE_LIMITED') {
    super(message, 429, code)
  }
}

/**
 * Error de payload inválido (413)
 */
export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload demasiado grande', code = 'PAYLOAD_TOO_LARGE') {
    super(message, 413, code)
  }
}
