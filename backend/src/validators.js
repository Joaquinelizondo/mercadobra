/**
 * Funciones de validación reutilizables.
 * Todas lanzan AppError si la validación falla.
 */
import { ValidationError } from './errors.js'

/**
 * Valida que un valor no esté vacío
 */
export function requireField(value, fieldName) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    throw new ValidationError(`${fieldName} es requerido`)
  }
  return trimmed
}

/**
 * Valida un email
 */
export function validateEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(normalized)) {
    throw new ValidationError(`Email inválido: ${email}`)
  }

  return normalized
}

/**
 * Valida una contraseña (mín 6 caracteres)
 */
export function validatePassword(password, minLength = 6) {
  const pwd = String(password ?? '')

  if (pwd.length < minLength) {
    throw new ValidationError(
      `La contraseña debe tener al menos ${minLength} caracteres. Tienes ${pwd.length}.`
    )
  }

  return pwd
}

/**
 * Valida y parsea un número
 */
export function validateNumber(value, fieldName, min = null, max = null) {
  const num = Number(value)

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} debe ser un número válido`)
  }

  if (min !== null && num < min) {
    throw new ValidationError(`${fieldName} debe ser >= ${min}`)
  }

  if (max !== null && num > max) {
    throw new ValidationError(`${fieldName} debe ser <= ${max}`)
  }

  return num
}

/**
 * Valida que una cantidad sea positiva
 */
export function validateQuantity(quantity, fieldName = 'Cantidad') {
  const num = validateNumber(quantity, fieldName, 1)
  return num
}

/**
 * Valida un teléfono (al menos 10 dígitos)
 */
export function validatePhone(phone) {
  const normalized = String(phone ?? '').trim()
  const digitsOnly = normalized.replace(/\D/g, '')

  if (digitsOnly.length < 10) {
    throw new ValidationError(
      `Teléfono inválido: debe tener al menos 10 dígitos. Tienes ${digitsOnly.length}.`
    )
  }

  return normalized
}

/**
 * Valida una URL
 */
export function validateUrl(url) {
  try {
    new URL(url)
    return url
  } catch {
    throw new ValidationError(`URL inválida: ${url}`)
  }
}

/**
 * Valida que un valor esté en una lista de opciones permitidas
 */
export function validateEnum(value, allowedValues, fieldName) {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (!allowedValues.includes(normalized)) {
    throw new ValidationError(
      `${fieldName} inválido. Opciones: ${allowedValues.join(', ')}`
    )
  }

  return normalized
}

/**
 * Valida una lista de items (no vacía)
 */
export function validateArray(items, fieldName = 'Lista') {
  if (!Array.isArray(items)) {
    throw new ValidationError(`${fieldName} debe ser un array`)
  }

  if (items.length === 0) {
    throw new ValidationError(`${fieldName} no puede estar vacía`)
  }

  return items
}

/**
 * Valida que un objeto tenga todos los campos requeridos
 */
export function validateRequiredFields(obj, fieldNames) {
  const missing = fieldNames.filter((field) => !obj[field])

  if (missing.length > 0) {
    throw new ValidationError(`Campos requeridos faltantes: ${missing.join(', ')}`)
  }
}

/**
 * Valida rango de longitud de string
 */
export function validateStringLength(value, fieldName, min = 0, max = null) {
  const str = String(value ?? '').trim()

  if (str.length < min) {
    throw new ValidationError(`${fieldName} debe tener al menos ${min} caracteres`)
  }

  if (max !== null && str.length > max) {
    throw new ValidationError(`${fieldName} no puede exceder ${max} caracteres`)
  }

  return str
}

/**
 * Valida un estado de orden
 */
export function validateOrderStatus(status) {
  const validStatuses = new Set(['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])
  return validateEnum(status, Array.from(validStatuses), 'Estado de orden')
}

/**
 * Valida un método de pago
 */
export function validatePaymentMethod(method) {
  const validMethods = new Set(['transferencia', 'mercadopago', 'efectivo', 'cheque'])
  return validateEnum(method, Array.from(validMethods), 'Método de pago')
}

/**
 * Valida un rol de usuario
 */
export function validateUserRole(role) {
  const validRoles = new Set(['provider', 'customer', 'admin'])
  return validateEnum(role, Array.from(validRoles), 'Rol de usuario')
}

/**
 * Middleware que envuelve un handler de ruta con try/catch
 * Captura errores y los pasa al siguiente middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
