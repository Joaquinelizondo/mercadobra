import OxidaQuoteBuilder from './OxidaQuoteBuilder'

export default function ProductCustomizer({ product, configuration, onClose }) {
  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="customizer-modal" role="dialog" aria-modal="true" aria-labelledby="customizer-title">
        <header>
          <div>
            <span>Personalización Oxida</span>
            <h2 id="customizer-title">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <OxidaQuoteBuilder product={product} initialConfiguration={configuration} />
      </div>
    </>
  )
}
