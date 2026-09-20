import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import Footer from './Footer'
import Cart from './Cart'
import ChatWidget from './ChatWidget'
import WhatsAppButton from './WhatsAppButton'

const AI_CHAT_ENABLED = import.meta.env.VITE_AI_CHAT_ENABLED === 'true'

export default function Layout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  const isOxiPlatform = location.pathname.startsWith('/cliente') || location.pathname.startsWith('/proveedor') || location.pathname.startsWith('/admin')

  return (
    <main className="page" style={isOxiPlatform ? { padding: 0, width: '100%', maxWidth: '100%' } : {}}>
      {!isOxiPlatform && <Topbar />}
      <Outlet />
      {!isOxiPlatform && (
        <>
          <Footer />
          <Cart />
          {AI_CHAT_ENABLED && <ChatWidget />}
          <WhatsAppButton />
        </>
      )}
    </main>
  )
}
