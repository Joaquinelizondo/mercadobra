const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request(path, options = {}) {
  const token = options.token || ''
  const requestUrl = `${API_BASE_URL}${path}`
  let response

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

export function loginSupplier(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

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

export function createLead(payload) {
  return request('/leads', {
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

export function pingBackend() {
  return fetch(`${API_BASE_URL}/health`, { method: 'GET' }).catch(() => null)
}

export { API_BASE_URL }
