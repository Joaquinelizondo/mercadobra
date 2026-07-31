import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import Footer from './Footer'
import Cart from './Cart'
import ChatWidget from './ChatWidget'
import WhatsAppButton from './WhatsAppButton'

export default function Layout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <main className="page">
      <Topbar />
      <Outlet />
      <Footer />
      <Cart />
      <ChatWidget />
      <WhatsAppButton />
    </main>
  )
}
