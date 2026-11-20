import { useState, useEffect } from 'react'
import './PwaInstallBanner.css'

function shouldShowIosBanner() {
  if (typeof window === 'undefined') return false
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  if (isStandalone) return false
  if (
    window.location.pathname.startsWith('/cliente') || 
    window.location.pathname.startsWith('/proveedor') || 
    window.location.pathname.startsWith('/admin')
  ) {
    return false
  }
  const dismissedAt = localStorage.getItem('mb_pwa_dismissed_at')
  if (dismissedAt && Date.now() - Number(dismissedAt) < 48 * 3600 * 1000) return false
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isSafari = isIos && /WebKit/i.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS/i.test(navigator.userAgent)
  const isMobileScreen = window.innerWidth <= 768
  return isSafari && isMobileScreen
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(shouldShowIosBanner)
  const [isIosPrompt] = useState(shouldShowIosBanner)

  useEffect(() => {
    // Si ya está corriendo como app instalada (standalone), no mostrar nada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isStandalone) return

    // Si estamos en cualquier ruta interna de la plataforma, no mostrar
    if (
      window.location.pathname.startsWith('/cliente') || 
      window.location.pathname.startsWith('/proveedor') || 
      window.location.pathname.startsWith('/admin')
    ) {
      return
    }

    // Si el usuario lo descartó en las últimas 48 horas
    const dismissedAt = localStorage.getItem('mb_pwa_dismissed_at')
    if (dismissedAt && Date.now() - Number(dismissedAt) < 48 * 3600 * 1000) return

    // Detección de Android / Chrome PWA install event
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false)
      }
      setDeferredPrompt(null)
    })
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem('mb_pwa_dismissed_at', String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <aside className="pwa-smart-banner" aria-label="Instalación de la aplicación">
      <div className="pwa-banner-content">
        <div className="pwa-banner-icon" aria-hidden="true">
          <span>OXI</span>
        </div>
        <div className="pwa-banner-text">
          <strong>Óxida Studio</strong>
          <p>
            {isIosPrompt 
              ? 'Instalá la app: tocá Compartir ⎋ y "Añadir a pantalla de inicio" ⊞' 
              : 'Instalá la app para acceder a proyectos, cotizaciones y obras sin conexión.'}
          </p>
        </div>
      </div>
      <div className="pwa-banner-actions">
        {!isIosPrompt && deferredPrompt && (
          <button type="button" className="pwa-btn-install" onClick={handleInstallClick}>
            Instalar App
          </button>
        )}
        <button type="button" className="pwa-btn-dismiss" onClick={handleDismiss} aria-label="Cerrar aviso de instalación">
          ✕
        </button>
      </div>
    </aside>
  )
}
