import logoImg from '../assets/mercadobra.png'
import { siMercadopago, siVisa } from 'simple-icons'

function PaymentBrandLogo({ icon, label }) {
  return (
    <span className="payment-logo payment-logo--brand" title={label} aria-label={label}>
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d={icon.path} fill={`#${icon.hex}`} />
      </svg>
    </span>
  )
}

function MastercardLogo() {
  return (
    <span className="payment-logo payment-logo--brand payment-logo--mastercard" title="Mastercard" aria-label="Mastercard">
      <svg viewBox="0 0 48 32" role="img" aria-hidden="true">
        <rect x="0.5" y="0.5" width="47" height="31" rx="6" fill="#ffffff" stroke="#e5e7eb" />
        <circle cx="21" cy="16" r="8" fill="#EB001B" />
        <circle cx="27" cy="16" r="8" fill="#F79E1B" />
        <path d="M24.8 8.4a8 8 0 0 0 0 15.2 8 8 0 0 0 0-15.2Z" fill="#FF5F00" />
      </svg>
    </span>
  )
}

function PaymentLogosRow() {
  return (
    <div className="payment-methods-logos payment-methods-logos--bottom" aria-label="Medios de pago aceptados">
      <span className="payment-logo" title="Transferencia Bancaria">🏦</span>
      <PaymentBrandLogo icon={siVisa} label="Visa" />
      <MastercardLogo />
      <PaymentBrandLogo icon={siMercadopago} label="Mercado Pago" />
    </div>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-grid">
        <section>
          <a href="/#inicio" className="footer-brand-link" aria-label="Ir al inicio">
            <img src={logoImg} className="footer-logo" alt="MercadObra" />
          </a>
          <p>
            Marketplace para empresas, barracas y distribuidores de productos para construcción.
          </p>
        </section>

        <section>
          <h3>Enlaces</h3>
          <ul>
            <li><a href="/#inicio">Inicio</a></li>
            <li><a href="/#categorias">Categorías</a></li>
            <li><a href="/#como-funciona">Cómo funciona</a></li>
            <li><a href="/#contacto">Contacto</a></li>
          </ul>
        </section>

        <section>
          <h3>Redes sociales</h3>
          <ul className="social-links-list">
            <li>
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer"
                className="social-link" aria-label="Instagram" title="Instagram">
                <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.85 1.35a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" fill="currentColor"/>
                </svg>
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer"
                className="social-link" aria-label="LinkedIn" title="LinkedIn">
                <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                  <path d="M5.1 3A2.1 2.1 0 1 1 3 5.1 2.1 2.1 0 0 1 5.1 3ZM3.3 8.1h3.6V21H3.3V8.1Zm6 0h3.45v1.77h.05A3.78 3.78 0 0 1 16.2 7.8c3.56 0 4.2 2.34 4.2 5.37V21h-3.6v-6.95c0-1.66-.03-3.8-2.32-3.8-2.33 0-2.69 1.82-2.69 3.68V21H9.3V8.1Z" fill="currentColor"/>
                </svg>
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer"
                className="social-link" aria-label="Facebook" title="Facebook">
                <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                  <path d="M13.5 22v-8.1h2.73l.41-3.17H13.5V8.7c0-.92.25-1.55 1.57-1.55h1.67V4.31A22 22 0 0 0 14.3 4c-2.42 0-4.08 1.48-4.08 4.2v2.52H7.5v3.17h2.72V22h3.28Z" fill="currentColor"/>
                </svg>
              </a>
            </li>
            <li>
              <a href="https://wa.me/5491100000000" target="_blank" rel="noreferrer"
                className="social-link" aria-label="WhatsApp" title="WhatsApp">
                <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                  <path d="M20.5 3.5A11.3 11.3 0 0 0 2.8 17.2L1.5 22.5l5.4-1.3A11.3 11.3 0 1 0 20.5 3.5Zm-8.2 17.1a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.2.77.76-3.12-.22-.36a9.46 9.46 0 1 1 7.98 4.22Zm5.2-7.1c-.28-.14-1.65-.81-1.9-.9-.25-.1-.43-.14-.61.14-.18.27-.7.9-.86 1.08-.16.18-.31.2-.59.07-.27-.14-1.14-.42-2.17-1.35-.8-.71-1.34-1.59-1.5-1.86-.16-.28-.02-.42.12-.56.13-.12.28-.32.41-.48.14-.16.18-.28.28-.46.09-.18.04-.35-.02-.49-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.46.07-.71.35-.25.27-.95.93-.95 2.27 0 1.34.97 2.63 1.1 2.81.14.18 1.9 2.9 4.6 4.07.64.28 1.14.45 1.52.58.64.2 1.23.17 1.7.1.52-.08 1.65-.67 1.88-1.33.23-.66.23-1.22.16-1.33-.07-.11-.25-.17-.53-.31Z" fill="currentColor"/>
                </svg>
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h3>Contacto</h3>
          <ul>
            <li><a href="mailto:hola@mercadobra.com">hola@mercadobra.com</a></li>
            <li><a href="tel:+5491100000000">+54 9 11 0000 0000</a></li>
            <li>Buenos Aires, Argentina</li>
          </ul>
        </section>

      </div>

      <div className="footer-bottom">
        <p className="footer-bottom-payment-title">Medios de pago</p>
        <PaymentLogosRow />
        <p>© {year} MercadObra. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
