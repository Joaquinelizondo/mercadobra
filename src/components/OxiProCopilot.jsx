import { useState, useRef, useEffect } from 'react'
import { interpretCopilotPrompt } from '../utils/oxiProCopilotEngine.js'
import './OxiProCopilot.css'

export default function OxiProCopilot({
  project,
  schedule = [],
  setSchedule,
  rubros = [],
  setRubros,
  rainLogs = [],
  setRainLogs,
  onApplyRainShift,
  setActiveTab
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef(null)

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `👋 ¡Hola! Soy tu **Copilot de Obra**.

Puedo ayudarte a cargar tareas en el Gantt, certificar avances reales, registrar días de lluvia en cascada o consultar el balance presupuestario con BPS (65%).

¿Qué cambio o consulta querés hacer sobre **${project?.name || 'esta obra'}**?`,
      suggestions: [
        '➕ Agregá colocación de barandas del 1 al 10 de noviembre con 3 oficiales',
        '⚡ Marcá fundaciones al 100%',
        '🌧️ Tuvimos 2 días de lluvia',
        '📊 ¿Qué tareas están atrasadas?',
        '💰 ¿Cuánto presupuesto nos queda?'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  function handleSend(promptText) {
    const textToSend = (promptText || input).trim()
    if (!textToSend || isThinking) return

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsThinking(true)

    setTimeout(() => {
      const context = {
        schedule,
        rubros,
        rainLogs,
        project
      }

      const res = interpretCopilotPrompt(textToSend, context)

      const assistantMsg = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        action: res.action,
        suggestions: res.suggestions,
        actionApplied: false,
        actionDiscarded: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, assistantMsg])
      setIsThinking(false)
    }, 400)
  }

  function handleApplyAction(msgId, action) {
    if (!action) return

    if (action.type === 'CREATE_TASK') {
      const task = action.payload
      setSchedule(prev => [...prev, task])
      if (typeof setActiveTab === 'function') setActiveTab('cronograma')
    } else if (action.type === 'UPDATE_TASK_PROGRESS') {
      const { taskId, newProgress } = action.payload
      setSchedule(prev => prev.map(t => t.id === taskId ? { ...t, progressPercent: newProgress } : t))
      if (typeof setActiveTab === 'function') setActiveTab('cronograma')
    } else if (action.type === 'SHIFT_SCHEDULE_RAIN') {
      const { days, date, reason } = action.payload
      if (typeof onApplyRainShift === 'function') {
        onApplyRainShift(days, date, reason)
      } else {
        // Fallback rain shift
        const eventDate = date || new Date().toISOString().split('T')[0]
        const delayDays = Number(days) || 1
        setSchedule(prev => prev.map(t => {
          if (Number(t.progressPercent) >= 100 || t.endDate < eventDate) return t
          const addD = (dStr, n) => {
            const d = new Date(dStr)
            d.setDate(d.getDate() + n)
            return d.toISOString().split('T')[0]
          }
          let newStart = t.startDate
          let newEnd = t.endDate
          if (t.startDate <= eventDate && t.endDate >= eventDate) {
            newEnd = addD(t.endDate, delayDays)
          } else if (t.startDate > eventDate) {
            newStart = addD(t.startDate, delayDays)
            newEnd = addD(t.endDate, delayDays)
          }
          return { ...t, startDate: newStart, endDate: newEnd }
        }))
        setRainLogs(prev => [
          {
            id: `rain_${Date.now()}`,
            date: eventDate,
            days: delayDays,
            reason: reason || 'Lluvias vía Copilot',
            affectedCount: schedule.filter(t => (t.progressPercent || 0) < 100).length,
            createdAt: new Date().toISOString()
          },
          ...prev
        ])
      }
      if (typeof setActiveTab === 'function') setActiveTab('cronograma')
    } else if (action.type === 'CREATE_RUBRO') {
      const newRubro = action.payload
      setRubros(prev => [...prev, newRubro])
      if (typeof setActiveTab === 'function') setActiveTab('rubros')
    }

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionApplied: true } : m))
  }

  function handleDiscardAction(msgId) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionDiscarded: true } : m))
  }

  return (
    <>
      {/* Floating launcher pill / button */}
      <button
        type="button"
        className={`copilot-floating-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        title="Copilot de Obra (IA) - Gestionar tareas, costos y avances por prompts"
      >
        <span className="copilot-trigger-icon">🤖</span>
        <span className="copilot-trigger-label">Copilot de Obra</span>
        <span className="copilot-trigger-badge">IA</span>
      </button>

      {/* Copilot Drawer / Popover Window */}
      {isOpen && (
        <div className="copilot-window animate-slide-up">
          {/* Header */}
          <div className="copilot-header">
            <div className="copilot-header-info">
              <span className="copilot-avatar">🤖</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  OxI Copilot
                  <span className="copilot-status-dot" title="Activo y listo para comandos"></span>
                </h4>
                <small style={{ color: '#a1a1aa', fontSize: '0.74rem' }}>
                  {project?.name || 'Obra Óxida'} · Asistente ConstructionTech
                </small>
              </div>
            </div>
            <div className="copilot-header-actions">
              <button
                type="button"
                className="copilot-icon-btn"
                onClick={() => setMessages([
                  {
                    id: 'welcome_reset',
                    sender: 'assistant',
                    text: 'Conversación reiniciada. ¿Qué cambio o consulta querés realizar?',
                    suggestions: [
                      '➕ Agregar tarea de herrería',
                      '⚡ Actualizar avance de estructura al 80%',
                      '🌧️ Hubo 2 días de lluvia',
                      '📊 ¿Qué tareas están atrasadas?'
                    ],
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ])}
                title="Limpiar chat"
              >
                🔄
              </button>
              <button
                type="button"
                className="copilot-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Cerrar Copilot"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="copilot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`copilot-msg-row ${msg.sender}`}>
                {msg.sender === 'assistant' && (
                  <span className="copilot-bubble-avatar">🤖</span>
                )}
                <div className={`copilot-bubble ${msg.sender}`}>
                  <div className="copilot-msg-text" style={{ whiteSpace: 'pre-line' }}>
                    {msg.text}
                  </div>

                  {/* Proposed Action Card with Human-In-The-Loop confirmation */}
                  {msg.action && !msg.actionApplied && !msg.actionDiscarded && (
                    <div className={`copilot-action-card ${msg.action.color || 'blue'}`}>
                      <div className="action-card-header">
                        <span className="action-badge">{msg.action.badge || '⚡ Acción'}</span>
                        <strong>{msg.action.title}</strong>
                      </div>
                      <div className="action-summary">{msg.action.summary}</div>
                      {Array.isArray(msg.action.details) && (
                        <ul className="action-details-list">
                          {msg.action.details.map((d, idx) => (
                            <li key={idx}>{d}</li>
                          ))}
                        </ul>
                      )}
                      <div className="action-buttons-row">
                        <button
                          type="button"
                          className="copilot-apply-btn"
                          onClick={() => handleApplyAction(msg.id, msg.action)}
                        >
                          ✓ Aplicar cambios a la obra
                        </button>
                        <button
                          type="button"
                          className="copilot-discard-btn"
                          onClick={() => handleDiscardAction(msg.id)}
                        >
                          ✕ Descartar
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.actionApplied && (
                    <div className="copilot-action-applied-pill">
                      ✓ Cambio aplicado exitosamente a la obra
                    </div>
                  )}

                  {msg.actionDiscarded && (
                    <div className="copilot-action-discarded-pill">
                      ✕ Acción descartada
                    </div>
                  )}

                  {/* Suggestions pills if any */}
                  {Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && !msg.action && (
                    <div className="copilot-suggestions-container">
                      <small style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 600 }}>Sugerencias rápidas:</small>
                      <div className="copilot-pills-row">
                        {msg.suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="copilot-suggestion-pill"
                            onClick={() => handleSend(sug)}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="copilot-msg-time">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="copilot-msg-row assistant">
                <span className="copilot-bubble-avatar">🤖</span>
                <div className="copilot-bubble assistant thinking">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="copilot-quick-bar">
            <button
              type="button"
              className="quick-bar-btn"
              onClick={() => handleSend('¿Qué tareas están atrasadas?')}
              title="Consultar desvíos de cronograma"
            >
              ⚠️ Atrasos
            </button>
            <button
              type="button"
              className="quick-bar-btn"
              onClick={() => handleSend('¿Cuánto presupuesto nos queda?')}
              title="Consultar balance financiero"
            >
              💰 Presupuesto
            </button>
            <button
              type="button"
              className="quick-bar-btn"
              onClick={() => handleSend('Tuvimos 2 días de lluvia')}
              title="Registrar días de lluvia"
            >
              🌧️ Lluvia (+2d)
            </button>
            <button
              type="button"
              className="quick-bar-btn"
              onClick={() => handleSend('¿Cómo viene la obra en general?')}
              title="Informe ejecutivo global"
            >
              📋 Resumen
            </button>
          </div>

          {/* Input Box */}
          <form
            className="copilot-input-form"
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
          >
            <input
              type="text"
              className="copilot-input"
              placeholder="Ej: Agregá pintura para diciembre con 2 oficiales..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isThinking}
            />
            <button
              type="submit"
              className="copilot-send-btn"
              disabled={!input.trim() || isThinking}
              title="Enviar prompt al Copilot"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
