import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import { createWhatsAppLink } from '../utils/whatsapp'
import './InfoPage.css'

export default function Contact() {
  const whatsappLink = createWhatsAppLink({ intent: 'consulta', source: 'pagina-contacto' })

  return (
    <div className="info-page">
      <MercadoQuoteFinder />
      <section className="info-page-card">
        <p className="info-page-kicker">Contáctenos</p>
        <h1>Estamos para ayudarte con tu compra o proyecto.</h1>
        <p>
          Escribinos para consultar por productos, cotizaciones, pedidos especiales
          o para publicar tu catálogo como proveedor.
        </p>
        <div className="info-page-actions">
          <a href="mailto:contacto@mercadobra.com">contacto@mercadobra.com</a>
          <a href={whatsappLink} target="_blank" rel="noreferrer">+598 99 213 300 · Uruguay</a>
        </div>
      </section>
    </div>
  )
}
