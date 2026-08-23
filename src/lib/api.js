const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim()
const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:4000'
  : `${window.location.origin}/api`
const API_BASE_URL = ENV_API_BASE_URL || DEFAULT_API_BASE_URL

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '')
}

function getApiBaseCandidates() {
  const primary = normalizeBaseUrl(API_BASE_URL)
  const candidates = [primary]

  if (primary.endsWith('/api')) {
    candidates.push(primary.slice(0, -4))
  } else {
    candidates.push(`${primary}/api`)
  }

  return [...new Set(candidates.filter(Boolean))]
}

async function request(path, options = {}) {
  const token = options.token || ''
  const baseCandidates = getApiBaseCandidates()
  let response
  let requestUrl = `${baseCandidates[0]}${path}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)

  try {
    response = await fetch(requestUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    })

    if (!response.ok && response.status === 404 && baseCandidates.length > 1) {
      requestUrl = `${baseCandidates[1]}${path}`
      response = await fetch(requestUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        signal: controller.signal,
        ...options,
      })
    }
  } catch (fetchError) {
    if (fetchError?.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder. Intentá de nuevo en unos segundos.')
    }
    throw new Error(`No se pudo conectar con el servidor (${API_BASE_URL}). Verificá backend y VITE_API_BASE_URL.`)
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const data = await response.json()
      if (data?.message) {
        message = data.message
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function getProducts() {
  return request('/products')
}

export function uploadProductImage(payload, token) {
  return request('/product-images', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function createProduct(payload, token) {
  return request('/products', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function removeProduct(id, token) {
  return request(`/products/${id}`, {
    method: 'DELETE',
    token,
  })
}

export function updateProduct(id, payload, token) {
  return request(`/products/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}

export function getAdminCustomers(filters = {}, token) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  const query = params.toString()
  return request(`/admin/customers${query ? `?${query}` : ''}`, { token })
}

export function createAdminCustomer(payload, token) {
  return request('/admin/customers', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function updateAdminCustomer(id, payload, token) {
  return request(`/admin/customers/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}

export function getAdminCustomer(id, token) {
  return request(`/admin/customers/${id}`, { token })
}

export function getCustomerQuotes(customerId, token) {
  return request(`/admin/customers/${customerId}/quotes`, { token })
}
export function getAllCustomerQuotes(token) { return request('/admin/customer-quotes', { token }) }

export function createCustomerQuote(customerId, payload, token) {
  return request(`/admin/customers/${customerId}/quotes`, {
    method: 'POST', token, body: JSON.stringify(payload),
  })
}

export function updateCustomerQuoteStatus(quoteId, status, token) {
  return request(`/admin/quotes/${quoteId}/status`, {
    method: 'PATCH', token, body: JSON.stringify({ status }),
  })
}

export function getCustomerProfile(token) { return request('/customer/profile', { token }) }
export function updateCustomerProfile(payload, token) { return request('/customer/profile', { method: 'PATCH', token, body: JSON.stringify(payload) }) }
export function getMyQuotes(token) { return request('/customer/quotes', { token }) }
export function createMyQuote(payload, token) { return request('/customer/quotes', { method: 'POST', token, body: JSON.stringify(payload) }) }
export function getMyQuoteMessages(quoteId, token) { return request(`/customer/quotes/${quoteId}/messages`, { token }) }
export function sendMyQuoteMessage(quoteId, payload, token) { return request(`/customer/quotes/${quoteId}/messages`, { method: 'POST', token, body: JSON.stringify(payload) }) }
export function respondToMyQuote(quoteId, status, token) { return request(`/customer/quotes/${quoteId}/status`, { method: 'PATCH', token, body: JSON.stringify({ status }) }) }
export function updateAdminQuote(quoteId, payload, token) { return request(`/admin/quotes/${quoteId}`, { method: 'PATCH', token, body: JSON.stringify(payload) }) }
export function getAdminQuoteMessages(quoteId, token) { return request(`/admin/quotes/${quoteId}/messages`, { token }) }
export function sendAdminQuoteMessage(quoteId, payload, token) { return request(`/admin/quotes/${quoteId}/messages`, { method: 'POST', token, body: JSON.stringify(payload) }) }
export function startQuoteDepositCheckout(quoteId, token) { return request(`/customer/quotes/${quoteId}/deposit/mercadopago`, { method: 'POST', token, body: '{}' }) }
export function reportQuoteDepositTransfer(quoteId, receipt, token) { return request(`/customer/quotes/${quoteId}/deposit/transfer`, { method: 'POST', token, body: JSON.stringify({ receipt }) }) }
export function reviewQuoteDeposit(quoteId, status, token) { return request(`/admin/quotes/${quoteId}/deposit`, { method: 'PATCH', token, body: JSON.stringify({ status }) }) }

export function loginSupplier(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function loginCustomer(email, password) {
  return request('/auth/customer/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function loginAdmin(email, password) {
  return request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logoutSession(token) {
  if (!token) return Promise.resolve()
  return request('/auth/logout', {
    method: 'POST',
    token,
  })
}

export function registerCustomer(payload) {
  return request('/auth/customer/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
export function createCustomerInvitation(payload, token) { return request('/admin/customer-invitations', { method:'POST', token, body:JSON.stringify(payload) }) }
export function getCustomerInvitation(token) { return request(`/customer-invitations/${encodeURIComponent(token)}`) }
export function acceptCustomerInvitation(token, password) { return request(`/customer-invitations/${encodeURIComponent(token)}/accept`, { method:'POST', body:JSON.stringify({password}) }) }

export function sendChatMessage(message, history = []) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  })
}

export function createOrder(payload) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function startMercadoPagoCheckout(payload) {
  return request('/payments/mercadopago/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getMercadoPagoConfig() {
  return request('/payments/mercadopago/config', {
    method: 'GET',
  })
}

export function createLead(payload) {
  return request('/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createCustomRequest(payload) {
  return request('/custom-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdminCustomRequests(token) {
  return request('/admin/custom-requests', { token })
}

export function updateAdminCustomRequest(id, status, token) {
  return request(`/admin/custom-requests/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  })
}

export function createSearchContact(payload) {
  return request('/search-contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getOrders(token) {
  return request('/orders', {
    method: 'GET',
    token,
  })
}

export function createAdminOrder(payload, token) {
  return request('/admin/orders', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function getTrackedOrder(trackingToken, buyerPhone) {
  const params = new URLSearchParams({ phone: buyerPhone })
  return request(`/orders/track/${encodeURIComponent(trackingToken)}?${params.toString()}`)
}

export function updateOrderStatus(orderId, status, token) {
  return request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  })
}

export function getAdminQuoteConsultations(filters = {}, token) {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.source) params.set('source', filters.source)
  if (filters.eventType) params.set('eventType', filters.eventType)

  const query = params.toString()
  const path = query ? `/admin/quote-consultations?${query}` : '/admin/quote-consultations'

  return request(path, {
    method: 'GET',
    token,
  })
}

export function pingBackend() {
  return fetch(`${API_BASE_URL}/health`, { method: 'GET' }).catch(() => null)
}

export { API_BASE_URL }
