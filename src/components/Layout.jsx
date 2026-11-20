import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import Footer from './Footer'
import Cart from './Cart'
import ChatWidget from './ChatWidget'
import WhatsAppButton from './WhatsAppButton'
import PwaInstallBanner from './PwaInstallBanner'
import MobileBottomNav from './MobileBottomNav'
import MobileMenuDrawer from './MobileMenuDrawer'
import AdminHeaderNav from './AdminHeaderNav'
import { FEATURES } from '../config/features'

const AI_CHAT_ENABLED = import.meta.env.VITE_AI_CHAT_ENABLED === 'true'

export default function Layout() {
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  const isAdminPlatform =
    location.pathname.startsWith('/admin') &&
    location.pathname !== '/admin/login' &&
    location.pathname !== '/admin/modelador'

  const isOxiPlatform =
    location.pathname.startsWith('/cliente') ||
    location.pathname.startsWith('/proveedor') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/cotizacion') ||
    location.pathname.startsWith('/expediente')

  return (
    <main
      className="page"
      style={isOxiPlatform ? { padding: 0, width: '100%', maxWidth: '100%', margin: 0, gap: 0, flex: 1, minHeight: '100vh' } : {}}
    >
      {!isOxiPlatform && <Topbar onOpenDrawer={() => setMobileDrawerOpen(true)} />}
      {isAdminPlatform && <AdminHeaderNav />}
      <Outlet />
      {!isOxiPlatform && (
        <>
          <PwaInstallBanner />
          <Footer />
          {FEATURES.SHOW_ECOMMERCE_PRODUCTS && <Cart />}
          {AI_CHAT_ENABLED && <ChatWidget />}
          <WhatsAppButton />
          <MobileBottomNav onOpenDrawer={() => setMobileDrawerOpen(true)} />
          <MobileMenuDrawer
            isOpen={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
          />
        </>
      )}
    </main>
  )
}
