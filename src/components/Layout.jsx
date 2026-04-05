import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Footer from './Footer'
import Cart from './Cart'
import ChatWidget from './ChatWidget'

export default function Layout() {
  return (
    <main className="page">
      <Topbar />
      <Outlet />
      <Footer />
      <Cart />
      <ChatWidget />
    </main>
  )
}
