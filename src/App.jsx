import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Storefront from './pages/Storefront'
import About from './pages/About'
import Contact from './pages/Contact'
import OxidaStudio from './pages/OxidaStudio'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Wishlist from './pages/Wishlist'
import SupplierProfile from './pages/SupplierProfile'
import SupplierLogin from './pages/SupplierLogin'
import SupplierDashboard from './pages/SupplierDashboard'
import CustomerLogin from './pages/CustomerLogin'
import CustomerRegister from './pages/CustomerRegister'
import CustomerPortal from './pages/CustomerPortal'
import CustomerInvitation from './pages/CustomerInvitation'
import AdminLogin from './pages/AdminLogin'
import AdminProducts from './pages/AdminProducts'
import AdminCustomers from './pages/AdminCustomers'
import AdminCustomerDetail from './pages/AdminCustomerDetail'
import AdminQuoteWorkspace from './pages/AdminQuoteWorkspace'
import AdminCustomerQuotes from './pages/AdminCustomerQuotes'
import AdminOrders from './pages/AdminOrders'
import AdminCustomRequests from './pages/AdminCustomRequests'
import AdminModeler from './pages/AdminModeler'
import AdminCosting from './pages/AdminCosting'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminTemplates from './pages/AdminTemplates'
import OrderTracking from './pages/OrderTracking'
import AdminQuoteConsultations from './pages/AdminQuoteConsultations'
import OxiPartner from './pages/OxiPartner'
import NotFound from './pages/NotFound'
import './pages/AdminCustomRequests.css'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/mercadobra" element={<Storefront />} />
        <Route path="/quienes-somos" element={<About />} />
        <Route path="/contacto" element={<Contact />} />
        <Route path="/oxida" element={<OxidaStudio />} />
        <Route path="/explorar" element={<Catalog />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
        <Route path="/favoritos" element={<Wishlist />} />
        <Route path="/proveedor/:company" element={<SupplierProfile />} />
        <Route path="/cliente/login" element={<CustomerLogin />} />
        <Route path="/cliente/registro" element={<CustomerRegister />} />
        <Route path="/cliente" element={<CustomerPortal />} />
        <Route path="/cliente/modelador" element={<AdminModeler />} />
        <Route path="/cliente/invitacion/:token" element={<CustomerInvitation />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/productos" element={<AdminProducts />} />
        <Route path="/admin/clientes" element={<AdminCustomers />} />
        <Route path="/admin/clientes/:id" element={<AdminCustomerDetail />} />
        <Route path="/admin/clientes/:id/cotizaciones/:quoteId" element={<AdminQuoteWorkspace />} />
        <Route path="/admin/cotizaciones-clientes" element={<AdminCustomerQuotes />} />
        <Route path="/admin/pedidos" element={<AdminOrders />} />
        <Route path="/admin/personalizaciones" element={<AdminCustomRequests />} />
        <Route path="/admin/modelador" element={<AdminModeler />} />
        <Route path="/admin/cotiza" element={<AdminCosting />} />
        <Route path="/admin/plantillas" element={<AdminTemplates />} />
        <Route path="/admin/analitica" element={<AdminAnalytics />} />
        <Route path="/proveedor/login" element={<SupplierLogin />} />
        <Route path="/proveedor" element={<SupplierDashboard />} />
        <Route path="/seguimiento/:trackingToken" element={<OrderTracking />} />
        <Route path="/admin/cotizaciones" element={<AdminQuoteConsultations />} />
        <Route path="/partner" element={<OxiPartner />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
