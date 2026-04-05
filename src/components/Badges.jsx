export function VerifiedBadge() {
  return (
    <span className="verified-badge" title="Proveedor verificado">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
      </svg>
      Verificado
    </span>
  )
}

export function TopRatedBadge() {
  return (
    <span className="top-rated-badge" title="Proveedor de alto rating">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
      </svg>
      Top Rated
    </span>
  )
}

export function FastShippingBadge() {
  return (
    <span className="fast-shipping-badge" title="Envío rápido">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-..9-2-2zm0-9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-9C5.9 0 5 .9 5 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-17C11.9 0 11 .9 11 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
      </svg>
      Envío rápido
    </span>
  )
}
