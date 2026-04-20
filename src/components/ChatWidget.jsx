import { useEffect, useMemo, useState } from 'react'
import { pingBackend, sendChatMessage } from '../lib/api'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    'Hola, soy el asistente de MercadObra. Te ayudo a elegir materiales por categoría, precio y stock. ¿Qué necesitás para tu obra?',
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // keep-alive: pingea el backend cada 9 minutos para que Render no duerma
  useEffect(() => {
    pingBackend()
    const interval = setInterval(pingBackend, 9 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const history = useMemo(
    () =>
      messages
        .filter((item) => item.role === 'user' || item.role === 'assistant')
        .slice(-8)
        .map((item) => ({ role: item.role, content: item.content })),
    [messages]
  )

  async function handleSend(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError('')
    setLoading(true)

    try {
      const response = await sendChatMessage(text, history)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response?.reply || 'No pude generar una respuesta en este momento.',
        },
      ])
    } catch (requestError) {
      const msg = requestError.message || ''
      setError(
        msg.includes('tard') || msg.includes('AbortError')
          ? 'El servidor está despertando, intentá de nuevo en 20 segundos.'
          : 'No se pudo conectar con el chat. Intentá de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {isOpen ? (
        <section className="chat-widget" aria-label="Chat inteligente">
          <header className="chat-widget-header">
            <div>
              <h3>Asistente MercadObra</h3>
              <p>Recomendaciones con catálogo y stock</p>
            </div>
            <button
              type="button"
              className="chat-widget-close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              ×
            </button>
          </header>

          <div className="chat-widget-messages">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`chat-message chat-message--${message.role}`}
              >
                {message.content}
              </article>
            ))}
            {loading && <p className="chat-widget-loading">Escribiendo respuesta…</p>}
            {error && <p className="chat-widget-error">{error}</p>}
          </div>

          <form className="chat-widget-form" onSubmit={handleSend}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ej: necesito hierro para losa de 80 m²"
              rows={2}
              maxLength={1200}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Enviar
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="chat-widget-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="¿Necesitás ayuda? Abrir asistente"
      >
        ¿Necesitás ayuda?
      </button>
    </>
  )
}
