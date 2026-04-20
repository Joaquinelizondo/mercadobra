import { getRepository } from './repository.js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return []

  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 1200) }))
    .filter((item) => item.content.length > 0)
}

function scoreProduct(product, text) {
  const haystack = [product.name, product.description, product.category, product.company].join(' ').toLowerCase()
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3)

  let score = 0
  for (const word of words) {
    if (haystack.includes(word)) score += 1
  }
  if (Number(product.stock) > 0) score += 0.6
  return score
}

function detectCategoryHint(text = '') {
  const value = text.toLowerCase()
  if (/cement|arena|hormigon|hormig[oó]n|ladrill|cal/.test(value)) return 'Materiales'
  if (/hierro|acero|perfil|malla|adn/.test(value)) return 'Estructura'
  if (/pintura|porcelanato|grifer|sanitari|revest/.test(value)) return 'Terminaciones'
  if (/amoladora|taladro|herramienta|casco|epp/.test(value)) return 'Herramientas'
  return null
}

function extractBudget(text = '') {
  const lower = text.toLowerCase()
  const match = lower.match(/(\d[\d\.,]*)\s*(pesos|ars|\$|usd|u\$s|dolares|dólares)?/)
  if (!match) return null

  const amountRaw = match[1].replace(/\./g, '').replace(',', '.')
  const amount = Number(amountRaw)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const currencyRaw = match[2] || ''
  const currency = /usd|u\$s|dolares|dólares/.test(currencyRaw) ? 'USD' : 'ARS'
  return { amount, currency }
}

function needsUnitClarification(text = '') {
  const lower = text.toLowerCase()
  const asksKg = /\b(kilo|kilos|kg)\b/.test(lower)
  const asksCement = /cement/.test(lower)
  return asksKg && asksCement
}

function formatProductLine(product) {
  const stock = Number(product.stock)
  const stockText = stock > 0 ? `stock: ${stock}` : 'sin stock'
  return `- ${product.name} (${product.category}) · ${product.company} · $${Number(product.price).toLocaleString('es-AR')} / ${product.unit} · ${stockText}`
}

function fallbackReply(message, products) {
  const normalizedMessage = String(message || '').trim()
  const lowerMessage = normalizedMessage.toLowerCase()
  const sortedByRelevance = [...products]
    .map((product) => ({ product, score: scoreProduct(product, normalizedMessage) }))
    .sort((a, b) => b.score - a.score)

  const categoryHint = detectCategoryHint(normalizedMessage)
  const budget = extractBudget(normalizedMessage)
  const categoryFiltered = categoryHint
    ? products.filter((item) => String(item.category || '').toLowerCase() === categoryHint.toLowerCase())
    : products

  const relevantMatches = sortedByRelevance
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.product)

  let candidates = relevantMatches.length ? relevantMatches : categoryFiltered

  if (budget?.currency === 'ARS') {
    const affordable = candidates.filter((item) => Number(item.price) <= budget.amount)
    if (affordable.length) {
      candidates = affordable
    }
  }

  const featured = candidates.slice(0, 3)
  const lines = (featured.length ? featured : products.slice(0, 3)).map(formatProductLine)
  const response = []

  if (/^hola\b|buenas|buen d[ií]a|buenas tardes|buenas noches/.test(lowerMessage)) {
    response.push('Genial, te ayudo a elegir materiales para que compres mejor.')
  } else {
    response.push('Perfecto, revisé tu consulta y te paso opciones concretas del catálogo.')
  }

  if (needsUnitClarification(normalizedMessage)) {
    response.push('Dato clave: en este momento el cemento se publica por bolsa, no por kilo. Igual te paso opciones para que compares costo final.')
  }

  if (budget?.currency === 'ARS') {
    response.push(`Tomé como referencia un presupuesto de $${budget.amount.toLocaleString('es-AR')} ARS.`)
  } else if (budget?.currency === 'USD') {
    response.push('Veo que pasaste presupuesto en USD. Si querés, lo convierto a ARS con tu tipo de cambio objetivo y te armo una selección más precisa.')
  }

  if (categoryHint) {
    response.push(`Enfoco la búsqueda en ${categoryHint.toLowerCase()} para que sea más útil.`)
  }

  response.push('Opciones recomendadas:')
  response.push(...lines)

  if (budget?.currency === 'ARS' && !candidates.length) {
    const cheapest = [...products].sort((a, b) => Number(a.price) - Number(b.price))[0]
    if (cheapest) {
      response.push(
        `Con ese presupuesto hoy no hay opciones directas cargadas. La alternativa más accesible es ${cheapest.name} a $${Number(cheapest.price).toLocaleString('es-AR')} / ${cheapest.unit}.`
      )
    }
  }

  response.push('Si me pasás zona de entrega y si priorizás precio o rapidez, te devuelvo una recomendación más fina.')

  return response.join('\n')
}

async function callOpenAI(messages) {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Error de proveedor IA (${response.status}): ${text.slice(0, 180)}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Respuesta inválida del proveedor IA')
  }

  return content.trim()
}

export async function generateChatReply({ message, history = [] }) {
  const repo = await getRepository()
  const products = await repo.getProducts({})

  const cleanedMessage = String(message || '').trim().slice(0, 1200)
  if (!cleanedMessage) {
    throw new Error('Mensaje vacío')
  }

  const catalogSnapshot = products.slice(0, 80).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    company: item.company,
    price: item.price,
    unit: item.unit,
    stock: item.stock,
    description: item.description,
  }))

  const systemPrompt = [
    'Sos el asistente comercial de MercadObra.',
    'Objetivo: ayudar a elegir materiales de construcción usando SOLO datos del catálogo entregado.',
    'Reglas:',
    '- Respondé en español rioplatense, breve y útil.',
    '- Nunca inventes productos, stock ni precios.',
    '- Si no hay stock o no hay dato, decilo explícitamente.',
    '- Ofrecé hasta 3 opciones con precio, unidad y empresa.',
    '- Si falta contexto, pedí presupuesto, categoría y zona.',
    `Catálogo actual: ${JSON.stringify(catalogSnapshot)}`,
  ].join('\n')

  const normalizedHistory = normalizeHistory(history)

  if (!OPENAI_API_KEY) {
    return {
      reply: fallbackReply(cleanedMessage, products),
      provider: 'local-fallback',
      fallbackReason: 'OPENAI_API_KEY ausente',
    }
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...normalizedHistory,
      { role: 'user', content: cleanedMessage },
    ]

    const reply = await callOpenAI(messages)
    return {
      reply,
      provider: OPENAI_MODEL,
    }
  } catch (error) {
    return {
      reply: fallbackReply(cleanedMessage, products),
      provider: 'local-fallback',
      fallbackReason: error.message || 'Error de proveedor IA',
    }
  }
}
