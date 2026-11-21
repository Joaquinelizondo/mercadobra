import { useEffect } from 'react'
import './SpinningHouseLoader.css'

export function SpinningHouseIcon({ size = 52, spinning = true, isSuccess = false }) {
  return (
    <div
      className={`oxi-house-icon-wrapper ${isSuccess ? 'is-success' : spinning ? 'is-spinning' : ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      {!isSuccess && <div className="oxi-house-ring-pulse" />}

      {/* SVG Casita Arquitectónica OXI */}
      <svg
        viewBox="0 0 64 64"
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Techo a dos aguas con alero */}
        <path
          d="M32 8L6 30h8v24a2 2 0 002 2h32a2 2 0 002-2V30h8L32 8z"
          fill={isSuccess ? 'rgba(22, 163, 74, 0.12)' : 'rgba(234, 88, 12, 0.14)'}
          stroke={isSuccess ? '#16a34a' : '#ea580c'}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Chimenea */}
        <path
          d="M44 16v-6h6v11"
          stroke={isSuccess ? '#16a34a' : '#ea580c'}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Puerta principal con dintel */}
        <path
          d="M26 56V37h12v19"
          stroke={isSuccess ? '#16a34a' : '#ea580c'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Ventana circular en entrepiso / ático */}
        <circle
          cx="32"
          cy="23"
          r="4.5"
          stroke={isSuccess ? '#16a34a' : '#ea580c'}
          strokeWidth="2.4"
        />
        <path
          d="M32 18.5v9M27.5 23h9"
          stroke={isSuccess ? '#16a34a' : '#ea580c'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      {/* Check de confirmación cuando tiene éxito */}
      {isSuccess && (
        <div className="oxi-house-badge-check" title="Completado">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  )
}

export default function SpinningHouseLoader({
  isOpen = false,
  status = 'loading', // 'loading' | 'success' | 'error'
  title = 'Enviando cotización...',
  message = 'Procesando planos, memorias descriptivas y archivos de obra...',
  steps = ['Planos y archivos', 'Memoria técnica', 'Revisión técnica'],
  currentStep = 1,
  onClose,
  autoCloseMs = 0,
  actionLabel = 'Continuar al panel'
}) {
  useEffect(() => {
    if (!isOpen) return
    if (status === 'success' && autoCloseMs > 0 && typeof onClose === 'function') {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseMs)
      return () => clearTimeout(timer)
    }
  }, [isOpen, status, autoCloseMs, onClose])

  if (!isOpen) return null

  const isSuccess = status === 'success'

  return (
    <div className="oxi-house-loader-backdrop" role="dialog" aria-modal="true">
      <div className="oxi-house-loader-modal">
        {/* Casita dando vueltas en 3D */}
        <div className="oxi-house-3d-box">
          <SpinningHouseIcon size={86} spinning={!isSuccess} isSuccess={isSuccess} />
        </div>

        <h3 className="oxi-house-title">
          {isSuccess ? '¡Cotización enviada!' : title}
        </h3>

        <p className="oxi-house-desc">
          {isSuccess
            ? 'Tu cotización ha sido cargada con éxito. Nuestro equipo técnico la está revisando para enviarte la propuesta formal.'
            : message}
        </p>

        {/* Pasos visuales del proceso */}
        {steps && steps.length > 0 && (
          <div className="oxi-house-steps">
            {steps.map((step, idx) => {
              const isDone = isSuccess || idx < currentStep
              const isActive = !isSuccess && idx === currentStep
              return (
                <span
                  key={idx}
                  className={`oxi-house-step-chip ${isDone ? 'is-done' : isActive ? 'is-active' : ''}`}
                >
                  {isDone ? '✓' : isActive ? '⏳' : '○'} {step}
                </span>
              )
            })}
          </div>
        )}

        {/* Botón de acción */}
        {isSuccess && typeof onClose === 'function' && (
          <button type="button" className="oxi-house-action-btn" onClick={onClose}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export function StatusToast({ notification, onClose }) {
  useEffect(() => {
    if (!notification) return
    if (notification.duration !== 0) {
      const timer = setTimeout(() => {
        if (typeof onClose === 'function') onClose()
      }, notification.duration || 3200)
      return () => clearTimeout(timer)
    }
  }, [notification, onClose])

  if (!notification || !notification.message) return null

  const isSuccess = notification.type === 'success'
  const isLoading = notification.type === 'loading'

  return (
    <div className="oxi-status-toast-container">
      <div className={`oxi-status-toast oxi-status-toast--${notification.type || 'info'}`} role="status">
        {isLoading && (
          <span className="mini-house-spin">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
        )}
        {isSuccess && (
          <span style={{ color: '#16a34a', fontSize: '1.1rem', fontWeight: 800 }}>✓</span>
        )}
        <div>
          <span>{notification.message}</span>
          {notification.subtext && (
            <div style={{ fontSize: '0.78rem', opacity: 0.82, marginTop: '2px' }}>
              {notification.subtext}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
