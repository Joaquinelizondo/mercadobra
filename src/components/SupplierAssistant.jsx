import { useEffect, useMemo, useRef, useState } from 'react'
import { sendChatMessage } from '../lib/api'
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from '../data/constants'

const REQUEST_TIMEOUT_MS = 20000

function extractJsonObject(text) {
  const cleaned = String(text || '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // continue
  }

  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim())
    } catch {
      // continue
    }
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch?.[0]) {
    try {
      return JSON.parse(objectMatch[0])
    } catch {
      return null
    }
  }

  return null
}

function normalizeDraft(raw) {
  if (!raw || typeof raw !== 'object') return null

  const category = CATEGORY_OPTIONS.includes(raw.category)
    ? raw.category
    : 'Hormigón'
  const unit = UNIT_OPTIONS.includes(raw.unit) ? raw.unit : 'bolsa'
  const price = Number(raw.price)
  const stock = Number(raw.stock)

  return {
    name: String(raw.name || '').trim(),
    category,
    price: Number.isFinite(price) && price > 0 ? String(Math.round(price)) : '',
    unit,
    stock: Number.isFinite(stock) && stock >= 0 ? String(Math.round(stock)) : '0',
    description: String(raw.description || '').trim(),
  }
}

function buildCompactCatalogSummary(products) {
  return products
    .slice(0, 6)
    .map((product) => `${product.name} (${product.category}) $${product.price}/${product.unit} stock:${product.stock}`)
    .join(' | ')
}

function trimToMaxLength(text, maxLength) {
  const normalized = String(text || '').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

export default function SupplierAssistant({ supplierUser, myProducts = [], onApplyDraft }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Soy tu asistente de ventas para proveedores. Puedo ayudarte a mejorar publicaciones, precios y stock de tu catálogo.',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestedDraft, setSuggestedDraft] = useState(null)
  const [providerInfo, setProviderInfo] = useState('')
  const messagesEndRef = useRef(null)

  const quickPrompts = useMemo(
    () => [
      'Sugerime 3 mejoras para mis descripciones de productos.',
      '¿Qué productos debería priorizar para vender más este mes?',
      'Dame ideas para títulos más comerciales en mi catálogo.',
    ],
    []
  )

  const history = useMemo(
    () =>
      messages
        .filter((item) => item.role === 'user' || item.role === 'assistant')
        .slice(-8)
        .map((item) => ({ role: item.role, content: item.content })),
    [messages]
  )

  const compactCatalogSummary = useMemo(() => buildCompactCatalogSummary(myProducts), [myProducts])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  async function sendWithTimeout(message, historyList) {
    return Promise.race([
      sendChatMessage(message, historyList),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('El asistente tardó demasiado en responder. Probá de nuevo.')), REQUEST_TIMEOUT_MS)
      }),
    ])
  }

  async function submitMessage(rawText) {
    const text = String(rawText || '').trim()
    if (!text || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setError('')
    setLoading(true)

    const enrichedMessage = [
      `Empresa proveedora: ${supplierUser?.company || 'Sin empresa'}`,
      `Email proveedor: ${supplierUser?.email || 'Sin email'}`,
      `Resumen de catálogo del proveedor: ${compactCatalogSummary || 'Sin productos cargados todavía'}`,
      `Consulta: ${text}`,
    ].join('\n')

    const safeMessage = trimToMaxLength(enrichedMessage, 1100)

    try {
      const response = await sendWithTimeout(safeMessage, history)
      const replyText = response?.reply || 'No pude generar una recomendación en este momento.'
      const provider = response?.provider || 'desconocido'
      const reason = response?.fallbackReason ? ` · ${response.fallbackReason}` : ''
      setProviderInfo(`Motor del asistente: ${provider}${reason}`)

      tryCaptureDraftFromMessage(replyText)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: replyText,
        },
      ])
    } catch (requestError) {
      const message = requestError.message || 'No se pudo consultar al asistente'
      setError(message)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'No pude responder en este momento por un problema de conexión con la API. Verificá que el backend esté activo y volvé a intentar.',
        },
      ])
      setProviderInfo('Motor del asistente: sin conexión con backend')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateDraft() {
    const draftRequest = [
      'Generá un borrador de producto para publicar en MercadObra.',
      'Respondé solo JSON válido con este formato exacto:',
      '{"name":"","category":"Hormigón|Hierro|Terminaciones|Herramientas","price":0,"unit":"","stock":0,"description":""}',
      'No agregues explicación, solo el JSON.',
    ].join('\n')

    setSuggestedDraft(null)
    await submitMessage(draftRequest)
  }

  function tryCaptureDraftFromMessage(text) {
    const parsed = extractJsonObject(text)
    const normalized = normalizeDraft(parsed)
    if (normalized?.name) {
      setSuggestedDraft(normalized)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await submitMessage(input)
  }

  return (
    <section className="supplier-assistant" aria-label="Asistente de ventas para proveedores">
      <div className="supplier-assistant-header">
        <div>
          <h2>Asistente de ventas del proveedor</h2>
          <p>Recibí recomendaciones para mejorar tus publicaciones y ventas.</p>
        </div>
      </div>

      <div className="supplier-assistant-prompts">
        {quickPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => submitMessage(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
        <button type="button" onClick={handleGenerateDraft} disabled={loading}>
          Generar borrador publicable
        </button>
      </div>

      {suggestedDraft?.name && (
        <p className="supplier-assistant-status">Borrador detectado: {suggestedDraft.name}</p>
      )}
      {providerInfo && <p className="supplier-assistant-status">{providerInfo}</p>}

      <div className="supplier-assistant-messages">
        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            className={`supplier-assistant-message supplier-assistant-message--${message.role}`}
          >
            {message.content}
          </article>
        ))}
        {loading && <p className="supplier-assistant-status">Generando recomendación…</p>}
        {error && <p className="supplier-assistant-error">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && (
        <div className="supplier-assistant-actions">
          <button
            type="button"
            disabled={!suggestedDraft || !onApplyDraft}
            onClick={() => {
              if (suggestedDraft && onApplyDraft) {
                onApplyDraft(suggestedDraft)
              }
            }}
          >
            Aplicar al formulario
          </button>
        </div>
      )}

      <form className="supplier-assistant-form" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Preguntá por mejoras de precios, títulos, stock o ventas"
          rows={2}
          maxLength={1200}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Consultar asistente de ventas
        </button>
      </form>
    </section>
  )
}
