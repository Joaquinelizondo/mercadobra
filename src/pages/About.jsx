import MercadoQuoteFinder from '../components/MercadoQuoteFinder'
import './InfoPage.css'

export default function About() {
  return (
    <div className="info-page">
      <MercadoQuoteFinder />
      <section className="info-page-card">
        <p className="info-page-kicker">Quiénes somos</p>
        <h1>Un lugar para encontrar, cotizar y comprar lo que tu proyecto necesita.</h1>
        <p>
          MercadoBra conecta personas, profesionales y proveedores en una experiencia
          simple. Podés describir lo que buscás, comparar opciones y avanzar con tu
          compra desde un mismo lugar.
        </p>
        <p>
          Junto a Oxida Studio sumamos diseño y fabricación a medida, para convertir
          una idea en una solución concreta para tu espacio.
        </p>
      </section>
    </div>
  )
}
