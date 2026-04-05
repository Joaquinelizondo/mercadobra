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

function fallbackReply(message, products) {
  const normalizedMessage = String(message || '').trim()
  const sorted = [...products]
    .map((product) => ({ product, score: scoreProduct(product, normalizedMessage) }))
    .sort((a, b) => b.score - a.score)

  const bestMatches = sorted.filter((entry) => entry.score > 0).slice(0, 3).map((entry) => entry.product)
  const featured = (bestMatches.length ? bestMatches : products.slice(0, 3)).slice(0, 3)

  const lines = featured.map((product) => {
    const stock = Number(product.stock)
    const stockText = stock > 0 ? `stock: ${stock}` : 'sin stock'
    return `- ${product.name} (${product.category}) · ${product.company} · $${Number(product.price).toLocaleString('es-AR')} / ${product.unit} · ${stockText}`
  })

  return [
    'Puedo ayudarte con materiales, precios orientativos y alternativas por categoría.',
    'Te recomiendo estos productos de MercadObra:',
    ...lines,
    'Si querés, decime presupuesto, rubro (hormigón, hierro, terminaciones o herramientas) y zona para afinar la recomendación.'
  ].join('\n')
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
